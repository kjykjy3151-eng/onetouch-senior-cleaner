// 2026-11-05 14:41 KST
// 팝업 캡처를 AI(Claude 또는 Gemini)에게 보내 진짜 시스템 알림인지 가짜 경고인지 판별한다.
// Vite 개발 서버 안에서만 실행되므로 API 키가 브라우저로 나가지 않는다.
// 판별 기능(createAnalyzer)은 서버 종류와 분리해 두어 측정 스크립트나 다른 배포 환경에서도 쓸 수 있다.
// AI는 판별할 때마다 판별 지식집(knowledge.js)과 사용자가 확인해 준 최근 사례(caseStore.js)를 참고한다.
import { createHash } from 'node:crypto'
import { join } from 'node:path'
import Anthropic from '@anthropic-ai/sdk'
import { ApiError as GeminiApiError, GoogleGenAI } from '@google/genai'
import { PATTERN_IDS, VERIFY_TIPS, knowledgePrompt, patternName } from './knowledge.js'
import { createCaseStore } from './caseStore.js'

const MODEL = 'claude-opus-5-5'
const OPENROUTER_MODEL = 'anthropic/claude-opus-5.5'
const OPENROUTER_BASE_URL = 'https://openrouter.ai/api'
// Gemini API 무료 등급 모델. 앞 모델이 붐비거나(503), 한도에 걸리거나(429), 시간 안에 답이 없으면 다음 모델로 다시 시도한다.
// gemini-3.8-flash 는 무료 등급에서 자주 붐벼 응답이 40초 넘게 걸려 빠른 lite 모델을 쓴다.
const GEMINI_MODELS = ['gemini-3.1-flash-lite', 'gemini-3.5-flash-lite']
const GEMINI_TIMEOUT_MS = 20_000
const MAX_BODY_BYTES = 8 * 1024 * 1024
const MEDIA_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']

// 무료 사용량 보호: 같은 사진은 다시 묻지 않고, 1분에 보낼 수 있는 요청 수를 제한한다.
const CACHE_LIMIT = 100
const RATE_LIMIT_PER_MINUTE = 12

const BASE_PROMPT = `당신은 스마트폰이 익숙하지 않은 40대 이상 중장년층과 어르신을 돕는 휴대폰 보안 도우미입니다.
사용자가 휴대폰 화면 캡처를 보내면, 그 화면이 진짜 휴대폰(안드로이드, 아이폰) 시스템 알림인지, 아니면 광고나 수상한 앱이 띄운 가짜 경고인지 판별합니다.

가짜 경고를 가려낼 때 볼 단서:
- 느낌표, 빨간색, 카운트다운으로 겁을 주거나 서두르게 하는지
- "바이러스 3개 발견"처럼 휴대폰 운영체제가 실제로는 하지 않는 말을 하는지
- 낯선 앱 설치, 링크 클릭, 개인정보 입력을 요구하는지
- 광고 표시, 브라우저 주소창, 낯선 앱 이름 같은 흔적이 있는지
- 진짜 시스템 화면(설정 앱, 권한 요청 창, 정식 앱 이름)과 모양이 일치하는지

판정 규칙 (가짜를 진짜로 잘못 알려 주는 것이 가장 위험합니다):
- 결제, 비밀번호나 인증번호 같은 개인정보 입력, 앱 설치, 링크 이동을 요구하는 화면은 진짜처럼 보여도 "real"로 판정하지 않습니다.
- "real"은 진짜 시스템 화면이라는 확실한 근거가 있을 때만 고릅니다. 조금이라도 의심되면 "unsure"를 고릅니다.
- confidence에는 판정에 대한 확신 정도를 솔직하게 적습니다.
- pattern에는 아래 지식집에서 가장 가까운 항목의 id를 적고, 맞는 것이 없으면 "none"을 적습니다.

쓰기 규칙:
- 어르신이 바로 이해하도록 쉬운 말과 존댓말("~해요")로 씁니다. 영어나 전문 용어는 쓰지 않거나 쉬운 말로 풀어 씁니다.
- 겁주지 말고 차분하게 안심시키는 말투로 씁니다.
- 휴대폰 화면이 아니거나 판단 근거가 부족하면 verdict를 "unsure"로 정하고 솔직하게 말합니다.`

const RESULT_SCHEMA = {
  type: 'object',
  properties: {
    verdict: {
      type: 'string',
      enum: ['fake', 'real', 'unsure'],
      description: 'fake: 가짜 경고나 사기 화면, real: 진짜 휴대폰 시스템 알림, unsure: 판단하기 어려움',
    },
    confidence: {
      type: 'string',
      enum: ['high', 'medium', 'low'],
      description: '판정에 대한 확신 정도',
    },
    pattern: {
      type: 'string',
      enum: [...PATTERN_IDS, 'none'],
      description: '판별 지식집에서 가장 가까운 수법이나 진짜 경고의 id. 없으면 none',
    },
    headline: {
      type: 'string',
      description: '한 줄 결론. 예: "가짜 경고예요. 누르지 마세요."',
    },
    explanation: {
      type: 'string',
      description: '왜 그렇게 판단했는지 쉬운 말로 1~2문장',
    },
    clues: {
      type: 'array',
      items: { type: 'string' },
      description: '화면에서 찾은 단서 2~4개. 각각 짧은 한 문장',
    },
    action: {
      type: 'string',
      description: '지금 어떻게 하면 되는지 한 문장',
    },
    verify_tip: {
      type: 'string',
      description: '사용자가 진짜인지 직접 확인할 수 있는 방법 한 문장 (지식집의 확인하는 법 중 화면에 맞는 것)',
    },
    report_type: {
      type: 'string',
      enum: ['virus', 'battery', 'prize', 'link', 'none'],
      description:
        '가짜라면 가장 가까운 신고 유형(virus: 가짜 바이러스 경고, battery: 가짜 배터리 경고, prize: 당첨 사기, link: 설치나 링크 유도). 가짜가 아니면 none',
    },
  },
  required: ['verdict', 'confidence', 'pattern', 'headline', 'explanation', 'clues', 'action', 'verify_tip', 'report_type'],
  additionalProperties: false,
}

const DEFAULT_VERIFY_TIP = VERIFY_TIPS.at(-1)

const REFUSED_RESULT = {
  verdict: 'unsure',
  confidence: 'low',
  pattern: 'none',
  headline: '이 화면은 판단하기 어려워요.',
  explanation: 'AI가 이 사진을 분석하지 못했어요.',
  clues: [],
  action: '잘 모르겠으면 누르지 말고 가족이나 118번에 물어보세요.',
  verify_tip: DEFAULT_VERIFY_TIP,
  report_type: 'none',
  safetyNote: null,
}

// OpenRouter 경유 시에는 JSON 형식 강제 기능을 쓰지 않으므로 프롬프트로 형식을 요청한다.
const JSON_INSTRUCTION = `

답변은 다른 말 없이 아래 JSON 스키마를 따르는 JSON 객체 하나만 출력합니다.
${JSON.stringify(RESULT_SCHEMA)}`

const QUESTION = '이 화면이 진짜 휴대폰 알림인지, 가짜 경고인지 알려 주세요.'

const userMessage = (mediaType, data) => ({
  role: 'user',
  content: [
    { type: 'image', source: { type: 'base64', media_type: mediaType, data } },
    { type: 'text', text: QUESTION },
  ],
})

// .env 에 있는 키에 따라 연결 방식을 고른다. 여러 개면 Anthropic, OpenRouter, Gemini 순으로 쓴다.
function createProvider({ anthropicKey, openrouterKey, geminiKey }) {
  if (anthropicKey) {
    return { name: 'anthropic', model: MODEL, client: new Anthropic({ apiKey: anthropicKey }) }
  }
  if (openrouterKey) {
    return {
      name: 'openrouter',
      model: OPENROUTER_MODEL,
      client: new Anthropic({ apiKey: null, authToken: openrouterKey, baseURL: OPENROUTER_BASE_URL }),
    }
  }
  if (geminiKey) {
    return { name: 'gemini', model: GEMINI_MODELS[0], client: new GoogleGenAI({ apiKey: geminiKey }) }
  }
  return null
}

async function analyzeWithAnthropic(client, system, mediaType, data) {
  const response = await client.beta.messages.create({
    model: MODEL,
    max_tokens: 8000,
    // 안전 필터가 요청을 거절하면 서버에서 자동으로 다른 모델로 다시 시도한다.
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    // 시연 중 기다리는 시간을 줄이려고 effort를 low로 둔다.
    output_config: { effort: 'low', format: { type: 'json_schema', schema: RESULT_SCHEMA } },
    system,
    messages: [userMessage(mediaType, data)],
  })
  return parseResult(response)
}

async function analyzeWithOpenRouter(client, system, mediaType, data) {
  const response = await client.messages.create({
    model: OPENROUTER_MODEL,
    max_tokens: 8000,
    system: system + JSON_INSTRUCTION,
    messages: [userMessage(mediaType, data)],
  })
  return parseResult(response)
}

async function analyzeWithGemini(client, system, mediaType, data) {
  for (const [i, model] of GEMINI_MODELS.entries()) {
    try {
      return await generateWithGemini(client, model, system, mediaType, data)
    } catch (err) {
      const retryable =
        err.name === 'AbortError' ||
        (err instanceof GeminiApiError && (err.status === 503 || err.status === 429))
      if (!retryable || i === GEMINI_MODELS.length - 1) throw err
      console.warn(`[popup-analyzer] ${model} 응답 실패(${err.status ?? err.name}), 다음 모델로 다시 시도`)
    }
  }
}

async function generateWithGemini(client, model, system, mediaType, data) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), GEMINI_TIMEOUT_MS)
  let response
  try {
    response = await client.models.generateContent({
      model,
      contents: [{ role: 'user', parts: [{ inlineData: { mimeType: mediaType, data } }, { text: QUESTION }] }],
      config: {
        systemInstruction: system,
        responseMimeType: 'application/json',
        responseJsonSchema: RESULT_SCHEMA,
        abortSignal: controller.signal,
      },
    })
  } finally {
    clearTimeout(timer)
  }
  // 안전 필터에 막히면 텍스트가 비어 있다.
  if (!response.text) return REFUSED_RESULT
  return parseJsonText(response.text)
}

function parseResult(response) {
  if (response.stop_reason === 'refusal') return REFUSED_RESULT
  const text = response.content
    .filter((b) => b.type === 'text')
    .map((b) => b.text)
    .join('')
  return parseJsonText(text)
}

function parseJsonText(text) {
  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  if (start === -1 || end <= start) {
    throw new Error(`응답에서 JSON을 찾지 못했습니다: ${text.slice(0, 200)}`)
  }
  return applySafetyRules(normalize(JSON.parse(text.slice(start, end + 1))))
}

// 화면이 깨지지 않도록 값의 형태를 맞춘다.
function normalize(raw) {
  const pick = (value, allowed, fallback) => (allowed.includes(value) ? value : fallback)
  return {
    verdict: pick(raw.verdict, RESULT_SCHEMA.properties.verdict.enum, 'unsure'),
    confidence: pick(raw.confidence, RESULT_SCHEMA.properties.confidence.enum, 'low'),
    pattern: pick(raw.pattern, RESULT_SCHEMA.properties.pattern.enum, 'none'),
    headline: String(raw.headline || REFUSED_RESULT.headline),
    explanation: String(raw.explanation || ''),
    clues: Array.isArray(raw.clues) ? raw.clues.map(String).slice(0, 4) : [],
    action: String(raw.action || REFUSED_RESULT.action),
    verify_tip: String(raw.verify_tip || DEFAULT_VERIFY_TIP),
    report_type: pick(raw.report_type, RESULT_SCHEMA.properties.report_type.enum, 'none'),
    safetyNote: null,
  }
}

// 안전장치: 가짜를 진짜로 알려 주는 실수가 가장 위험하므로,
// 확신이 높지 않은 "진짜" 판정은 "판단 어려움"으로 낮춰서 보여 준다.
export function applySafetyRules(result) {
  if (result.verdict === 'real' && result.confidence !== 'high') {
    return {
      ...result,
      verdict: 'unsure',
      headline: '진짜 알림 같지만 확실하지 않아요.',
      action: '버튼을 누르기 전에 가족에게 보여 주거나 118번에 물어보세요.',
      report_type: 'none',
      safetyNote: 'AI가 확신하지 못해 "판단 어려움"으로 알려 드려요.',
    }
  }
  if (result.verdict === 'fake' && result.report_type === 'none') {
    return { ...result, report_type: 'link' }
  }
  return result
}

// 판별할 때 쓸 시스템 프롬프트: 기본 규칙 + 판별 지식집 + 사용자가 확인해 준 최근 가짜 사례
// 저장소는 파일(노트북) 또는 Redis(배포 서버)라서 결과를 기다린다(await).
async function buildSystemPrompt({ useKnowledge, store }) {
  let prompt = BASE_PROMPT
  if (useKnowledge) prompt += `\n${knowledgePrompt()}`
  const examples = (await store?.learningExamples()) ?? []
  if (examples.length) {
    prompt += `\n\n[사용자가 확인해 준 최근 가짜 사례 (참고용, 화면 자체의 근거가 우선)]\n${examples.join('\n')}`
  }
  return prompt
}

// 서버 종류와 상관없이 쓰는 판별기. 캐시, 요청 수 제한, 사례 저장을 함께 담당한다.
// options.useKnowledge: 판별 지식집 사용 여부 (측정 비교용, 기본 사용)
// options.store: 사례 저장소 (없으면 기록하지 않음)
export function createAnalyzer(keys, { useKnowledge = true, store = null } = {}) {
  const provider = createProvider(keys)
  const cache = new Map()
  const recent = []

  const analyze = async (mediaType, data) => {
    if (!provider) throw Object.assign(new Error('no_key'), { code: 'no_key' })
    if (!MEDIA_TYPES.includes(mediaType) || typeof data !== 'string' || !data) {
      throw Object.assign(new Error('bad_image'), { code: 'bad_image' })
    }
    const imageHash = createHash('sha256').update(mediaType).update(data).digest('hex')
    if (cache.has(imageHash)) return cache.get(imageHash)

    const now = Date.now()
    while (recent.length && now - recent[0] > 60_000) recent.shift()
    if (recent.length >= RATE_LIMIT_PER_MINUTE) {
      throw Object.assign(new Error('rate_limit'), { code: 'rate_limit' })
    }
    recent.push(now)

    const run = { anthropic: analyzeWithAnthropic, openrouter: analyzeWithOpenRouter, gemini: analyzeWithGemini }[
      provider.name
    ]
    const result = await run(provider.client, await buildSystemPrompt({ useKnowledge, store }), mediaType, data)
    const caseId = (await store?.addCase({ imageHash, model: provider.model, result })) ?? null
    const withId = { ...result, caseId, patternName: patternName(result.pattern) }
    cache.set(imageHash, withId)
    if (cache.size > CACHE_LIMIT) cache.delete(cache.keys().next().value)
    return withId
  }

  const info = {
    provider: provider?.name ?? null,
    model: provider?.model ?? null,
    // 무료 등급 Gemini 는 보낸 내용이 Google 제품 개선에 쓰일 수 있다 (Gemini API 가격표 기준).
    freeTier: provider?.name === 'gemini',
    knowledge: useKnowledge,
  }

  return { info, analyze }
}

// 오류를 앱의 오류 코드와 HTTP 상태로 바꾼다.
export function toErrorResponse(err) {
  if (err.code === 'no_key') return [503, { error: 'no_key' }]
  if (err.code === 'bad_image') return [400, { error: 'bad_image' }]
  if (err.code === 'rate_limit') return [429, { error: 'rate_limit' }]
  if (err.status === 413) return [413, { error: 'too_large' }]
  if (err instanceof Anthropic.AuthenticationError) return [401, { error: 'auth' }]
  if (err instanceof Anthropic.APIError && err.status === 402) return [402, { error: 'credits' }]
  if (err instanceof GeminiApiError || err.name === 'AbortError') {
    // 잘못된 Gemini 키는 400으로 오고 메시지에 "API key"가 들어 있다.
    if (err.name === 'AbortError' || err.status === 429 || err.status === 503) return [429, { error: 'rate_limit' }]
    if (err.status === 401 || err.status === 403 || /API key/i.test(err.message)) return [401, { error: 'auth' }]
    return [502, { error: 'api' }]
  }
  if (err instanceof Anthropic.RateLimitError) return [429, { error: 'rate_limit' }]
  if (err instanceof Anthropic.APIConnectionError) return [502, { error: 'network' }]
  if (err instanceof Anthropic.APIError) return [502, { error: 'api' }]
  return [500, { error: 'server' }]
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0
    const chunks = []
    req.on('data', (chunk) => {
      size += chunk.length
      if (size > MAX_BODY_BYTES) {
        reject(Object.assign(new Error('too_large'), { status: 413 }))
        req.destroy()
        return
      }
      chunks.push(chunk)
    })
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
    req.on('error', reject)
  })
}

function send(res, status, body) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.end(JSON.stringify(body))
}

// POST /api/analyze-popup           { mediaType, data(base64) } → 판별 결과 JSON (caseId 포함)
// POST /api/analyze-popup/feedback  { caseId, correct, actual } → 사용자 피드백 저장
// GET  /api/analyze-popup/info      → 어떤 AI에 연결됐는지 (키는 보내지 않음)
// GET  /api/analyze-popup/stats     → 쌓인 사례 현황
export function popupAnalyzerPlugin(keys) {
  const store = createCaseStore(join(process.cwd(), 'server', 'data'))
  const analyzer = createAnalyzer(keys, { store })
  console.log(`[popup-analyzer] AI 연결: ${analyzer.info.provider ?? '없음 (.env 에 키 필요)'}`)

  const handler = async (req, res, next) => {
    if (req.url === '/api/analyze-popup/info') return send(res, 200, analyzer.info)
    if (req.url === '/api/analyze-popup/stats') return send(res, 200, await store.stats())
    if (req.url === '/api/analyze-popup/feedback' && req.method === 'POST') {
      try {
        const { caseId, correct, actual } = JSON.parse(await readBody(req))
        return send(res, (await store.addFeedback(caseId, { correct, actual })) ? 200 : 404, { ok: true })
      } catch {
        return send(res, 400, { error: 'bad_feedback' })
      }
    }
    if (req.url !== '/api/analyze-popup') return next()
    if (req.method !== 'POST') return send(res, 405, { error: 'method_not_allowed' })

    try {
      const { mediaType, data } = JSON.parse(await readBody(req))
      send(res, 200, await analyzer.analyze(mediaType, data))
    } catch (err) {
      if (!err.code) console.error('[popup-analyzer]', err)
      send(res, ...toErrorResponse(err))
    }
  }

  return {
    name: 'popup-analyzer',
    configureServer(server) {
      server.middlewares.use(handler)
    },
    configurePreviewServer(server) {
      server.middlewares.use(handler)
    },
  }
}
