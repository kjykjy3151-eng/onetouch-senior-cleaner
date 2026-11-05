// 2026-11-05 23:09 KST
// 판별 사례 저장소: 판별할 때마다 결과를 쌓고, 사용자 피드백("맞았어요", "틀렸어요")을 덧붙인다.
// 개인정보 보호를 위해 사진은 저장하지 않는다. 같은 사진인지 알아보는 해시값(되돌릴 수 없음)만 남긴다.
// 저장 형식: server/data/cases.jsonl (한 줄에 기록 하나, 사례와 피드백을 차례로 덧붙임)
import { appendFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs'
import { randomUUID } from 'node:crypto'
import { join } from 'node:path'
import { patternName } from './knowledge.js'

export function createCaseStore(dir) {
  const file = join(dir, 'cases.jsonl')
  const cases = new Map()

  if (existsSync(file)) {
    for (const line of readFileSync(file, 'utf8').split('\n')) {
      if (!line.trim()) continue
      try {
        const rec = JSON.parse(line)
        if (rec.type === 'case') cases.set(rec.id, { ...rec, feedback: null })
        if (rec.type === 'feedback' && cases.has(rec.id)) cases.get(rec.id).feedback = rec
      } catch {
        // 깨진 줄은 건너뛴다.
      }
    }
  }

  const append = (rec) => {
    mkdirSync(dir, { recursive: true })
    appendFileSync(file, `${JSON.stringify(rec)}\n`)
  }

  const addCase = ({ imageHash, model, result }) => {
    const rec = {
      type: 'case',
      id: randomUUID(),
      time: new Date().toISOString(),
      imageHash,
      model,
      verdict: result.verdict,
      confidence: result.confidence,
      pattern: result.pattern,
      report_type: result.report_type,
      headline: result.headline,
      clues: result.clues,
    }
    append(rec)
    cases.set(rec.id, { ...rec, feedback: null })
    return rec.id
  }

  // correct: AI 판정이 맞았는지, actual: 틀렸다면 실제로는 무엇이었는지 (fake | real | unknown)
  const addFeedback = (id, { correct, actual }) => {
    const c = cases.get(id)
    if (!c) return false
    const told = ['fake', 'real'].includes(actual) ? actual : 'unknown'
    // "틀렸어요"를 눌렀지만 실제 답이 AI 판정과 같다면 맞은 것으로 바로잡는다.
    const isCorrect = Boolean(correct) || told === c.verdict
    const rec = {
      type: 'feedback',
      id,
      time: new Date().toISOString(),
      correct: isCorrect,
      actual: isCorrect ? c.verdict : told,
    }
    append(rec)
    c.feedback = rec
    return true
  }

  const stats = () => {
    const all = [...cases.values()]
    const withFeedback = all.filter((c) => c.feedback)
    const correct = withFeedback.filter((c) => c.feedback.correct).length
    const count = (key, value) => all.filter((c) => c[key] === value).length
    const byPattern = {}
    for (const c of all) if (c.pattern && c.pattern !== 'none') byPattern[c.pattern] = (byPattern[c.pattern] ?? 0) + 1
    return {
      total: all.length,
      fake: count('verdict', 'fake'),
      real: count('verdict', 'real'),
      unsure: count('verdict', 'unsure'),
      feedback: withFeedback.length,
      feedbackCorrect: correct,
      // 가장 위험한 오류: AI는 진짜(또는 판단 어려움)라고 했는데 사용자가 실제로는 가짜였다고 알려 준 경우
      missedFakes: withFeedback.filter((c) => !c.feedback.correct && c.feedback.actual === 'fake' && c.verdict !== 'fake').length,
      byPattern,
    }
  }

  // AI가 다음 판별 때 참고할 사례.
  // 안전을 위해 "가짜였다"는 사례만 넣는다. "사실은 진짜였다"는 피드백은 잘못되거나 악의적일 때
  // AI가 가짜를 진짜로 판정하게 만들 수 있어서, 자동으로 넣지 않고 사람이 검토할 수 있게 보관만 한다.
  const learningExamples = (limit = 6) =>
    [...cases.values()]
      .filter((c) => c.feedback && c.feedback.actual === 'fake')
      .slice(-limit)
      .reverse()
      .map((c) => {
        const name = patternName(c.pattern)
        const head =
          c.verdict === 'fake'
            ? `실제로 가짜였던 화면${name ? `, 수법: ${name}` : ''}`
            : `AI가 진짜${name ? ` "${name}"` : ''}(으)로 착각했지만 사용자가 가짜라고 알려 준 화면 (비슷하게 생긴 가짜에 주의)`
        return `- ${head}. AI가 본 단서: ${c.clues.join(' / ')}`
      })

  return { addCase, addFeedback, stats, learningExamples }
}
