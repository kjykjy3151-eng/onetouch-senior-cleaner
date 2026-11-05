// 2026-11-05 23:41 KST
// 배포 서버(Vercel)용 사례 저장소. Vercel 함수는 파일을 계속 보관할 수 없어서 Upstash Redis 에 저장한다.
// Vercel 에서 Upstash Redis 를 연결하면 들어오는 환경 변수(KV_REST_API_URL, KV_REST_API_TOKEN 또는
// UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN)를 Redis.fromEnv() 가 자동으로 읽는다.
// 사진은 저장하지 않는다 (caseStore.js 와 같은 기록 형식).
import { Redis } from '@upstash/redis'
import { learningExamplesFrom, makeCaseRecord, makeFeedbackRecord, summarizeCases } from './caseStore.js'

const ID_LIST = 'cases'
const MAX_CASES = 2000
const caseKey = (id) => `case:${id}`

export function hasRedisEnv() {
  return Boolean(process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL)
}

let client = null
export function getRedis() {
  if (!hasRedisEnv()) return null
  client ??= Redis.fromEnv()
  return client
}

export function createRedisCaseStore() {
  const redis = getRedis()
  if (!redis) return null

  // 최근 사례 n개 (오래된 것부터)
  const loadRecent = async (n) => {
    const ids = await redis.lrange(ID_LIST, 0, n - 1)
    if (!ids.length) return []
    const recs = await redis.mget(...ids.map(caseKey))
    return recs.filter(Boolean).reverse()
  }

  return {
    async addCase(input) {
      const rec = { ...makeCaseRecord(input), feedback: null }
      await redis.set(caseKey(rec.id), rec)
      await redis.lpush(ID_LIST, rec.id)
      await redis.ltrim(ID_LIST, 0, MAX_CASES - 1)
      return rec.id
    },
    async addFeedback(id, answer) {
      if (typeof id !== 'string') return false
      const c = await redis.get(caseKey(id))
      if (!c) return false
      await redis.set(caseKey(id), { ...c, feedback: makeFeedbackRecord(c, answer) })
      return true
    },
    async stats() {
      return summarizeCases(await loadRecent(MAX_CASES))
    },
    async learningExamples(limit) {
      return learningExamplesFrom(await loadRecent(300), limit)
    },
  }
}

// 무료 사용량 보호: 모든 사용자를 합쳐 1분, 하루 요청 수를 센다. 넘으면 false.
export async function takeQuota({ perMinute, perDay }) {
  const redis = getRedis()
  if (!redis) return true
  const now = new Date()
  const minuteKey = `quota:m:${now.toISOString().slice(0, 16)}`
  const dayKey = `quota:d:${now.toISOString().slice(0, 10)}`
  const [m, d] = await Promise.all([redis.incr(minuteKey), redis.incr(dayKey)])
  if (m === 1) await redis.expire(minuteKey, 120)
  if (d === 1) await redis.expire(dayKey, 60 * 60 * 48)
  return m <= perMinute && d <= perDay
}
