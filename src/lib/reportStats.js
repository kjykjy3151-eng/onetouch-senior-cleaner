// 2026-11-05 16:35 KST
// 이번 달 신고 많은 앱 순위.
// 서버가 없는 프로토타입이라 다른 사용자 신고는 시연용 예시 데이터로 채우고,
// 이 휴대폰에서 보낸 신고만 localStorage 에 쌓아 순위에 더한다.
// 앱 이름은 실제 앱과 겹치지 않도록 지어낸 이름이다.

const DEMO_RANKING = [
  { name: '무료 폰 청소 PRO', type: 'virus', count: 1284, trend: 'up' },
  { name: '슈퍼 배터리 부스터', type: 'battery', count: 1027, trend: 'up' },
  { name: '행운 룰렛 당첨왕', type: 'prize', count: 856, trend: 'new' },
  { name: '초고속 폰 쿨러', type: 'battery', count: 642, trend: 'same' },
  { name: '만능 바이러스 킬러 무료', type: 'virus', count: 598, trend: 'down' },
  { name: '정부 지원금 바로 조회', type: 'link', count: 433, trend: 'up' },
  { name: '메가 와이파이 부스터', type: 'link', count: 371, trend: 'same' },
  { name: '오늘의 무료 운세', type: 'prize', count: 302, trend: 'down' },
  { name: '큰글씨 손전등 플러스', type: 'link', count: 247, trend: 'new' },
  { name: '스마트 택배 알림', type: 'link', count: 189, trend: 'same' },
]

const storageKey = (date = new Date()) =>
  `onetouch.reports.${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`

function loadMine() {
  try {
    return JSON.parse(localStorage.getItem(storageKey())) ?? {}
  } catch {
    return {}
  }
}

// 반환: [{ rank, name, type, count, trend, mine }] (건수 많은 순)
export function getMonthlyRanking() {
  const mine = loadMine()
  const rows = DEMO_RANKING.map((row) => ({ ...row, mine: mine[row.name]?.count ?? 0 }))
  for (const [name, { count, type }] of Object.entries(mine)) {
    if (!rows.some((r) => r.name === name)) rows.push({ name, type, count: 0, trend: 'new', mine: count })
  }
  return rows
    .map((r) => ({ ...r, count: r.count + r.mine }))
    .sort((a, b) => b.count - a.count)
    .map((r, i) => ({ ...r, rank: i + 1 }))
}

export function addMyReport(name, type) {
  const mine = loadMine()
  mine[name] = { count: (mine[name]?.count ?? 0) + 1, type }
  try {
    localStorage.setItem(storageKey(), JSON.stringify(mine))
  } catch {
    // 저장 공간을 쓸 수 없어도 신고 화면은 그대로 진행한다.
  }
}
