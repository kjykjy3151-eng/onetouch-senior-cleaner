// 2026-11-05 14:32 KST
import { CircleCheck, CircleX } from 'lucide-react'

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
    <aside className="hidden w-96 shrink-0 self-center rounded-3xl bg-white p-7 shadow-sm ring-1 ring-stone-200 lg:block">
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
      <p className="mt-6 border-t border-stone-200 pt-4 text-base text-stone-600">
        해커톤 시연용 프로토타입입니다. 실제 기기를 검사하지 않아요.
      </p>
    </aside>
  )
}
