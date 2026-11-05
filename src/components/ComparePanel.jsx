// 2026-11-05 14:32 KST
import { useEffect, useState } from 'react'
import { BrainCircuit, CircleCheck, CircleX } from 'lucide-react'
import { fetchAiStats } from '../lib/popupCheck'

const CONTENT = {
  before: {
    title: '개선 전: 겁주는 화면',
    tone: 'text-rose-700',
    icon: CircleX,
    items: [
      '코랄, 빨간 경고 카드가 크게 떠서 불안을 자극해요.',
      '가짜 백신 광고와 레이아웃이 비슷해 사기 앱처럼 보여요.',
      '이 앱이 믿을 만하다는 증거(인증 마크, 보호 문구)가 없어요.',
      '아이콘이 무채색이고 광고가 많아 광고 앱처럼 느껴져요.',
      '글자가 작고 버튼이 좁아 시니어가 누르기 어려워요.',
    ],
  },
  after: {
    title: '개선 후: 안심시키는 화면',
    tone: 'text-emerald-800',
    icon: CircleCheck,
    items: [
      '받지 않은 인증 표시 대신, 이 앱이 하지 않는 일을 "안전 약속"으로 사실대로 보여 줘요.',
      '따뜻한 아이보리 바탕에 진한 글씨로, 노안에도 읽기 쉽고 편안해요.',
      '"현재 휴대폰은 안전합니다" 안심 패널에서 시작해요.',
      'AI가 수상한 팝업 사진을 보고 진짜인지 쉬운 말로 알려 줘요.',
      'OS 보안 정책에 맞춘 3단계 삭제 가이드로 끝까지 안내해요.',
      '가짜 팝업을 바로 신고하는 능동적인 앱으로 확장했어요.',
      '음성 안내와 글자 크기 확대로 접근성을 높였어요.',
    ],
  },
}

// 발표용 설명 패널 (넓은 화면에서만 표시)
export default function ComparePanel({ mode }) {
  const { title, tone, icon: Icon, items } = CONTENT[mode]

  return (
    <aside className="fixed-text hidden w-96 shrink-0 self-center rounded-3xl bg-white p-7 shadow-sm ring-1 ring-stone-200 lg:block">
      <p className="text-base font-semibold text-stone-600">케이스 스터디 02</p>
      <h2 className={`mt-1 text-2xl font-extrabold ${tone}`}>{title}</h2>
      <ul className="mt-5 space-y-3">
        {items.map((item) => (
          <li key={item} className="flex gap-2 text-base leading-relaxed text-stone-800">
            <Icon className={`mt-1 size-5 shrink-0 ${tone}`} />
            <span>{item}</span>
          </li>
        ))}
      </ul>
      {mode === 'after' && <LearningStats />}
      <p className="mt-6 border-t border-stone-200 pt-4 text-base text-stone-600">
        해커톤 시연용 프로토타입입니다. 실제 기기를 검사하지 않아요.
      </p>
    </aside>
  )
}

// AI 학습 현황: 판별 사례와 사용자 확인 결과가 쌓이는 모습을 발표 중에 보여 준다.
// 배포 서버의 무료 데이터베이스 한도(월 50만 명령)를 아끼려고 30초마다, 화면을 보고 있을 때만 새로 고친다.
const STATS_REFRESH_MS = 30_000

function LearningStats() {
  const [stats, setStats] = useState(null)

  useEffect(() => {
    let alive = true
    const load = () => {
      if (document.visibilityState === 'visible') fetchAiStats().then((s) => alive && setStats(s))
    }
    load()
    const timer = setInterval(load, STATS_REFRESH_MS)
    document.addEventListener('visibilitychange', load)
    return () => {
      alive = false
      clearInterval(timer)
      document.removeEventListener('visibilitychange', load)
    }
  }, [])

  if (!stats) return null
  const rate = stats.feedback ? Math.round((stats.feedbackCorrect / stats.feedback) * 100) : null

  return (
    <section className="mt-5 rounded-2xl bg-emerald-50 p-4 ring-1 ring-emerald-200">
      <p className="flex items-center gap-2 text-base font-bold text-emerald-900">
        <BrainCircuit className="size-5" /> AI 학습 현황 (실시간)
      </p>
      <dl className="mt-2 space-y-1 text-base text-stone-800">
        <div className="flex justify-between">
          <dt>쌓인 판별 사례</dt>
          <dd className="font-bold">{stats.total}건</dd>
        </div>
        <div className="flex justify-between">
          <dt>가짜, 진짜, 어려움</dt>
          <dd className="font-bold">
            {stats.fake}, {stats.real}, {stats.unsure}
          </dd>
        </div>
        <div className="flex justify-between">
          <dt>사용자 확인 정답률</dt>
          <dd className="font-bold">{rate === null ? '아직 없음' : `${rate}% (${stats.feedback}건)`}</dd>
        </div>
        <div className="flex justify-between">
          <dt>놓친 가짜 (위험 오류)</dt>
          <dd className="font-bold">{stats.missedFakes}건</dd>
        </div>
      </dl>
      <p className="mt-2 text-base text-stone-600">판별 지식집: 가짜 수법 7가지, 진짜 경고 4가지</p>
    </section>
  )
}
