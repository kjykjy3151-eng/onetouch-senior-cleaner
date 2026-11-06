// 2026-11-05 17:19 KST
// AI 팝업 판별 정답률 측정.
// test-images 의 fake_* 는 가짜, real_* 는 진짜, ad_* 는 평범한 광고로 보고, 사진마다 여러 번 판별해 결과를 센다.
// 실행: npm run eval:ai                       (사진마다 2번, 판별 지식집 사용)
//       npm run eval:ai -- 3                  (사진마다 3번)
//       npm run eval:ai -- 3 --no-knowledge   (지식집 없이, 비교용)
// .env 의 AI 키를 그대로 쓴다. 무료 사용량을 아끼려고 요청 사이에 잠시 쉰다.
import { readdirSync, readFileSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createAnalyzer } from '../server/popupAnalyzer.js'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const args = process.argv.slice(2)
const RUNS = Number(args.find((a) => /^\d+$/.test(a))) || 2
const USE_KNOWLEDGE = !args.includes('--no-knowledge')
const PAUSE_MS = 4000

function loadEnv() {
  const path = join(root, '.env')
  if (!existsSync(path)) return {}
  const env = {}
  for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^([A-Z_]+)=(.*)$/)
    if (m && m[2].trim()) env[m[1]] = m[2].trim()
  }
  return env
}

const env = loadEnv()
const keys = {
  anthropicKey: env.ANTHROPIC_API_KEY,
  openrouterKey: env.OPENROUTER_API_KEY,
  geminiKey: env.GEMINI_API_KEY,
}
if (!Object.values(keys).some(Boolean)) {
  console.error('.env 에 AI 키가 없어 측정할 수 없습니다.')
  process.exit(1)
}

const dir = join(root, 'test-images')
const cases = readdirSync(dir)
  .filter((f) => /^(fake|real|ad)_.*\.(png|jpe?g)$/.test(f))
  .map((f) => ({ file: f, expected: f.split('_')[0], mediaType: f.endsWith('.png') ? 'image/png' : 'image/jpeg' }))

const info = createAnalyzer(keys).info
console.log(
  `AI: ${info.provider} (${info.model}), 판별 지식집 ${USE_KNOWLEDGE ? '사용' : '안 씀'}, 사진 ${cases.length}장 x ${RUNS}번\n`,
)

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const rows = []
for (const c of cases) {
  const data = readFileSync(join(dir, c.file)).toString('base64')
  for (let i = 0; i < RUNS; i++) {
    // 캐시를 피하려고 매번 새 판별기를 만든다.
    const analyzer = createAnalyzer(keys, { useKnowledge: USE_KNOWLEDGE })
    const t0 = Date.now()
    let verdict
    let confidence = '-'
    let pattern = '-'
    try {
      const r = await analyzer.analyze(c.mediaType, data)
      verdict = r.verdict
      confidence = r.confidence
      pattern = r.pattern
    } catch (err) {
      verdict = `오류(${err.code ?? err.status ?? err.name})`
    }
    const sec = ((Date.now() - t0) / 1000).toFixed(1)
    rows.push({ ...c, verdict, sec: Number(sec) })
    const mark = verdict === c.expected ? 'O' : verdict === 'unsure' ? '△' : 'X'
    console.log(`${mark} ${c.file.padEnd(32)} 기대 ${c.expected.padEnd(5)} 결과 ${verdict.padEnd(7)} 확신 ${confidence.padEnd(6)} ${sec}초  수법 ${pattern}`)
    await sleep(PAUSE_MS)
  }
}

const done = rows.filter((r) => !r.verdict.startsWith('오류'))
const correct = done.filter((r) => r.verdict === r.expected).length
const unsure = done.filter((r) => r.verdict === 'unsure').length
// 가짜를 진짜나 평범한 광고로 넘기면 사용자가 그대로 누를 수 있어 가장 위험하다.
const dangerous = done.filter((r) => r.expected === 'fake' && ['real', 'ad'].includes(r.verdict)).length
const falseAlarm = done.filter((r) => r.expected !== 'fake' && r.verdict === 'fake').length
const avg = done.length ? (done.reduce((s, r) => s + r.sec, 0) / done.length).toFixed(1) : '-'
const pct = (n) => (done.length ? `${((n / done.length) * 100).toFixed(0)}%` : '-')

console.log('\n===== 요약 =====')
console.log(`판별 ${done.length}회 (오류 ${rows.length - done.length}회)`)
console.log(`정답 ${correct}회 (${pct(correct)}), 판단 어려움 ${unsure}회 (${pct(unsure)})`)
console.log(`가장 위험한 오류 (가짜를 진짜나 광고로): ${dangerous}회`)
console.log(`지나친 경고 (진짜나 광고를 가짜로): ${falseAlarm}회`)
console.log(`평균 응답 시간: ${avg}초`)
