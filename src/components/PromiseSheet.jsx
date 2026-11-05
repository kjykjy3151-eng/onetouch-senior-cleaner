// 2026-11-05 17:14 KST
import { useEffect } from 'react'
import { BadgeCheck, Check, Info, TriangleAlert, X } from 'lucide-react'

// 받은 적 없는 "공식 인증" 표시 대신, 이 앱이 하지 않는 일을 사실대로 약속한다.
// 가짜 보안 앱을 구별하는 법도 함께 알려 주어 신뢰 표시 자체를 교육 도구로 쓴다.
const PROMISES = [
  '광고를 보여 주지 않아요.',
  '돈을 내라고 하지 않아요.',
  '겁주는 빨간 경고나 카운트다운을 쓰지 않아요.',
  '다른 앱을 설치하라고 하지 않아요.',
  '이름, 전화번호, 비밀번호를 묻지 않아요.',
  '무엇을 지울지 항상 먼저 보여 주고, 결정은 직접 하세요.',
]

const FAKE_SIGNS = [
  '빨간 화면과 카운트다운으로 서두르게 한다',
  '"바이러스 3개 발견"처럼 겁부터 준다',
  '다른 앱을 깔거나 돈을 내라고 한다',
  '광고가 계속 뜬다',
]

export default function PromiseSheet({ speak, onClose }) {
  useEffect(() => {
    speak('원터치 클리너는 광고를 보여 주지 않고, 돈을 요구하지 않고, 다른 앱 설치를 요구하지 않아요.')
  }, [speak])

  return (
    <div
      className="absolute inset-0 z-30 flex items-end bg-stone-900/50 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="이 앱의 안전 약속"
    >
      <div className="animate-rise max-h-full w-full overflow-y-auto rounded-t-3xl bg-white p-5 ring-1 ring-stone-200">
        <div className="flex items-center justify-between gap-5">
          <h2 className="flex items-center gap-2 text-xl font-extrabold">
            <BadgeCheck className="size-6 text-emerald-700" />
            이 앱의 안전 약속
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="안전 약속 닫기"
            className="grid size-14 shrink-0 place-items-center rounded-xl bg-stone-100 hover:bg-stone-200"
          >
            <X className="size-6" />
          </button>
        </div>

        <div className="mt-4 space-y-5">
          <section className="rounded-2xl bg-emerald-50 p-4 ring-1 ring-emerald-200">
            <p className="text-lg font-extrabold text-emerald-800">원터치 클리너는 이렇게 약속해요</p>
            <ul className="mt-2 space-y-2">
              {PROMISES.map((p) => (
                <li key={p} className="flex gap-2 text-lg">
                  <Check className="mt-1 size-5 shrink-0 text-emerald-700" strokeWidth={3} />
                  {p}
                </li>
              ))}
            </ul>
          </section>

          <section className="rounded-2xl bg-amber-50 p-4 ring-1 ring-amber-300">
            <p className="flex items-center gap-2 text-lg font-extrabold text-amber-900">
              <TriangleAlert className="size-6" />
              이런 보안 앱은 가짜예요
            </p>
            <ul className="mt-2 space-y-2">
              {FAKE_SIGNS.map((s) => (
                <li key={s} className="flex gap-2 text-lg">
                  <span className="font-black text-amber-800">•</span>
                  {s}
                </li>
              ))}
            </ul>
            <p className="mt-2 text-lg">
              "공식 인증", "1위" 같은 표시만 보고 믿지 마세요. 진짜 앱도 가짜 앱도 이런 말은 쓸 수 있어요.
            </p>
          </section>

          <p className="flex gap-2 text-base text-stone-600">
            <Info className="mt-0.5 size-5 shrink-0" />
            이 앱은 해커톤 시제품이라 아직 공인 기관의 인증을 받지 않았어요. 실제 서비스에서는 인증을 받은 뒤에만 인증 표시를 달 계획이에요.
          </p>

          <button
            type="button"
            onClick={onClose}
            className="min-h-16 w-full rounded-2xl bg-stone-100 px-4 text-xl font-bold hover:bg-stone-200"
          >
            확인했어요
          </button>
        </div>
      </div>
    </div>
  )
}
