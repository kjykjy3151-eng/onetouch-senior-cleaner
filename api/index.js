// 2026-11-05 23:41 KST
// Vercel 서버 함수: GitHub Pages 에 배포한 화면이 AI 판별을 쓸 수 있게 해 주는 배포용 AI 서버.
// 노트북 개발 서버(server/popupAnalyzer.js 의 popupAnalyzerPlugin)와 같은 판별 코드와 주소를 쓴다.
//   POST /api/analyze-popup           판별
//   POST /api/analyze-popup/feedback  사용자 피드백
//   GET  /api/analyze-popup/info      연결된 AI 정보
//   GET  /api/analyze-popup/stats     쌓인 사례 현황
// 키(GEMINI_API_KEY 등)는 Vercel 환경 변수에만 두며, 화면이나 저장소에는 넣지 않는다.
import { createAnalyzer, toErrorResponse } from '../server/popupAnalyzer.js'
import { createRedisCaseStore, takeQuota } from '../server/redisCaseStore.js'

// 이 서버를 부를 수 있는 화면 주소 (쉼표로 여러 개). 기본은 GitHub Pages 주소.
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || 'https://kjykjy3151-eng.github.io')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean)

// 무료 사용량 보호 (모든 사용자 합계)
const PER_MINUTE = Number(process.env.QUOTA_PER_MINUTE) || 20
const PER_DAY = Number(process.env.QUOTA_PER_DAY) || 300

const store = createRedisCaseStore()
const analyzer = createAnalyzer(
  {
    anthropicKey: process.env.ANTHROPIC_API_KEY,
    openrouterKey: process.env.OPENROUTER_API_KEY,
    geminiKey: process.env.GEMINI_API_KEY,
  },
  { store },
)

const EMPTY_STATS = { total: 0, fake: 0, real: 0, unsure: 0, feedback: 0, feedbackCorrect: 0, missedFakes: 0, byPattern: {} }

function corsHeaders(origin, selfOrigin) {
  const allowed = origin && (ALLOWED_ORIGINS.includes(origin) || origin === selfOrigin)
  return {
    ...(allowed ? { 'Access-Control-Allow-Origin': origin } : {}),
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  }
}

export default {
  async fetch(request) {
    const url = new URL(request.url)
    // vercel.json 이 /api/어떤주소 를 /api?path=어떤주소 로 보낸다.
    const route = (url.searchParams.get('path') ?? url.pathname.replace(/^\/api\/?/, '')).replace(/\/+$/, '')
    const origin = request.headers.get('origin')
    const headers = corsHeaders(origin, url.origin)
    const json = (status, body) => Response.json(body, { status, headers })

    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers })
    // 브라우저에서 허용하지 않은 다른 사이트가 부르면 막는다.
    if (origin && !headers['Access-Control-Allow-Origin']) return json(403, { error: 'forbidden_origin' })

    try {
      if (route === 'analyze-popup/info' && request.method === 'GET') {
        return json(200, { ...analyzer.info, store: Boolean(store) })
      }

      if (route === 'analyze-popup/stats' && request.method === 'GET') {
        return json(200, store ? await store.stats() : EMPTY_STATS)
      }

      if (route === 'analyze-popup/feedback' && request.method === 'POST') {
        const { caseId, correct, actual } = await request.json()
        const ok = store ? await store.addFeedback(caseId, { correct, actual }) : false
        return json(ok ? 200 : 404, { ok })
      }

      if (route === 'analyze-popup' && request.method === 'POST') {
        const { mediaType, data } = await request.json()
        if (!(await takeQuota({ perMinute: PER_MINUTE, perDay: PER_DAY }))) {
          return json(429, { error: 'rate_limit' })
        }
        return json(200, await analyzer.analyze(mediaType, data))
      }

      return json(404, { error: 'not_found' })
    } catch (err) {
      if (err instanceof SyntaxError) return json(400, { error: 'bad_request' })
      if (!err.code) console.error('[api]', err)
      const [status, body] = toErrorResponse(err)
      return json(status, body)
    }
  },
}
