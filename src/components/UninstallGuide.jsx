// 2026-11-05 14:32 KST
import { useEffect, useState } from 'react'
import { Check, Hand, Info, X } from 'lucide-react'

// 안드로이드는 다른 앱을 몰래 지우는 것(Silent Uninstall)을 막는다.
// 그래서 시스템 삭제 화면으로 연결하고, 사용자가 눌러야 할 버튼 3개를 차례로 짚어 준다.
const STEPS = [
  { short: '삭제 이동', guide: '노란 테두리가 있는 [삭제 이동] 버튼을 눌러 주세요.' },
  { short: '삭제', guide: '휴대폰 설정 화면이 열렸어요. [삭제] 버튼을 눌러 주세요.' },
  { short: '확인', guide: '마지막이에요. [확인] 버튼을 눌러 주세요.' },
]

const REMOVED_MS = 1400

export default function UninstallGuide({ apps, speak, onComplete, onClose }) {
  const [appIdx, setAppIdx] = useState(0)
  const [step, setStep] = useState(0)
  const [hint, setHint] = useState(false)
  const [removed, setRemoved] = useState(false)
  const app = apps[appIdx]
  const isLastApp = appIdx === apps.length - 1

  useEffect(() => {
    if (removed) speak(`${app.name} 삭제가 끝났어요.${isLastApp ? '' : ' 다음 앱으로 넘어갈게요.'}`)
    else speak(`${appIdx + 1}번째 앱, ${step + 1}단계. ${STEPS[step].guide}`)
  }, [appIdx, step, removed, app.name, isLastApp, speak])

  useEffect(() => {
    if (!removed) return
    const timer = setTimeout(() => {
      if (isLastApp) {
        onComplete()
        return
      }
      setRemoved(false)
      setAppIdx((i) => i + 1)
      setStep(0)
    }, REMOVED_MS)
    return () => clearTimeout(timer)
  }, [removed, isLastApp, onComplete])

  const next = () => {
    setHint(false)
    if (step < STEPS.length - 1) setStep(step + 1)
    else setRemoved(true)
  }

  const wrong = () => {
    setHint(true)
    speak('괜찮아요. 노란 테두리가 있는 버튼을 눌러 주세요.')
  }

  return (
    <div
      className="absolute inset-0 z-30 flex items-end bg-stone-900/50 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="앱 삭제 안내"
    >
      <div className="animate-rise max-h-full w-full overflow-y-auto rounded-t-3xl bg-white p-5 ring-1 ring-stone-200">
        <div className="flex items-center justify-between">
          <p className="text-lg font-bold text-stone-700">
            앱 {appIdx + 1} / {apps.length} 정리 중
          </p>
          <button
            type="button"
            onClick={onClose}
            aria-label="안내 닫기"
            className="grid size-12 place-items-center rounded-xl bg-stone-100 hover:bg-stone-200"
          >
            <X className="size-6" />
          </button>
        </div>

        <div className="mt-3 flex gap-2 rounded-2xl bg-stone-100 p-3 text-base text-stone-700">
          <Info className="mt-0.5 size-5 shrink-0 text-sky-700" />
          <p>휴대폰 보안 규칙상 앱이 대신 지울 수는 없어요. 버튼 3번만 눌러 주시면 안전하게 지워져요.</p>
        </div>

        <ol className="mt-4 grid grid-cols-3 items-start gap-5" aria-label="진행 단계">
          {STEPS.map((s, i) => {
            const done = removed || i < step
            const active = !removed && i === step
            return (
              <li key={s.short} className="text-center" aria-current={active ? 'step' : undefined}>
                <div
                  className={`h-2 rounded-full ${
                    done ? 'bg-emerald-700' : active ? 'bg-amber-400' : 'bg-stone-200'
                  }`}
                />
                <p
                  className={`mt-1.5 text-base font-bold ${
                    done ? 'text-emerald-700' : active ? 'text-amber-800' : 'text-stone-600'
                  }`}
                >
                  {i + 1}. {s.short}
                </p>
              </li>
            )
          })}
        </ol>

        {removed ? (
          <div className="py-8 text-center" role="status">
            <div className="animate-pop mx-auto grid size-20 place-items-center rounded-full bg-emerald-700 text-white">
              <Check className="size-12" strokeWidth={3} />
            </div>
            <p className="mt-4 text-2xl font-extrabold">삭제 완료!</p>
            <p className="mt-1 text-lg text-stone-700">'{app.name}' 앱을 지웠어요.</p>
          </div>
        ) : (
          <>
            <p className="mt-4 text-xl leading-snug font-extrabold" aria-live="polite">
              {step + 1}단계. {STEPS[step].guide}
            </p>
            {hint && (
              <p className="mt-2 text-lg font-semibold text-amber-800" role="alert">
                괜찮아요. 노란 테두리가 있는 버튼을 눌러 주세요.
              </p>
            )}
            <div className="mt-4">
              {step === 0 && <StepGoToDelete app={app} onNext={next} onWrong={wrong} />}
              {step === 1 && <StepAppInfo app={app} onNext={next} onWrong={wrong} />}
              {step === 2 && <StepConfirm app={app} onNext={next} onWrong={wrong} />}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

const HIGHLIGHT = 'ring-4 ring-amber-400 ring-offset-2 animate-pulse'

// light: 흰 바탕(휴대폰 설정 화면 예시) 위에서는 진한 색으로 명암비를 확보한다.
export function TapHere({ light = false }) {
  return (
    <span
      className={`pointer-events-none mt-2 flex items-center justify-center gap-1 text-base font-bold whitespace-nowrap ${
        light ? 'text-amber-800' : 'text-amber-700'
      }`}
    >
      <Hand className="size-5 shrink-0 animate-bounce" /> 여기를 눌러 주세요
    </span>
  )
}

// 1단계: 이 앱 안에서 [삭제 이동]
function StepGoToDelete({ app, onNext, onWrong }) {
  const Icon = app.icon
  return (
    <div className="fixed-text rounded-2xl bg-stone-100 p-4">
      <div className="flex items-center gap-3">
        <span className="grid size-12 place-items-center rounded-xl bg-stone-200 text-stone-700">
          <Icon className="size-7" />
        </span>
        <div>
          <p className="text-lg font-bold">{app.name}</p>
          <p className="text-base text-stone-600">{app.reason}</p>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-2 items-start gap-5">
        <button
          type="button"
          onClick={onWrong}
          className="min-h-14 rounded-xl bg-stone-200 text-lg font-bold text-stone-700"
        >
          그대로 두기
        </button>
        <div>
          <button
            type="button"
            onClick={onNext}
            className={`min-h-14 w-full rounded-xl bg-amber-400 text-lg font-extrabold text-stone-900 ring-offset-stone-100 ${HIGHLIGHT}`}
          >
            삭제 이동
          </button>
          <TapHere />
        </div>
      </div>
    </div>
  )
}

// 2단계: 휴대폰 설정의 '앱 정보' 화면에서 [삭제]
function StepAppInfo({ app, onNext, onWrong }) {
  const Icon = app.icon
  return (
    <div>
      <p className="mb-2 text-base text-stone-600">휴대폰 설정 화면 (예시)</p>
      <div className="fixed-text rounded-2xl bg-white p-4 text-neutral-900 shadow-sm ring-1 ring-stone-300">
        <p className="text-lg font-bold">앱 정보</p>
        <div className="mt-3 flex flex-col items-center">
          <span className="grid size-16 place-items-center rounded-2xl bg-neutral-200 text-neutral-600">
            <Icon className="size-9" />
          </span>
          <p className="mt-2 text-lg font-bold">{app.name}</p>
          <p className="text-base text-neutral-500">버전 2.4.1</p>
        </div>
        <div className="mt-4 grid grid-cols-3 items-start gap-5">
          <button
            type="button"
            onClick={onWrong}
            className="min-h-14 rounded-xl bg-neutral-100 text-lg font-semibold text-neutral-700"
          >
            열기
          </button>
          <div>
            <button
              type="button"
              onClick={onNext}
              className={`min-h-14 w-full rounded-xl bg-neutral-100 text-lg font-extrabold text-blue-700 ring-offset-white ${HIGHLIGHT}`}
            >
              삭제
            </button>
            <TapHere light />
          </div>
          <button
            type="button"
            onClick={onWrong}
            className="min-h-14 rounded-xl bg-neutral-100 text-lg font-semibold text-neutral-700"
          >
            강제 중지
          </button>
        </div>
      </div>
    </div>
  )
}

// 3단계: 시스템 확인 창에서 [확인]
function StepConfirm({ app, onNext, onWrong }) {
  const Icon = app.icon
  return (
    <div>
      <p className="mb-2 text-base text-stone-600">휴대폰 확인 창 (예시)</p>
      <div className="fixed-text rounded-3xl bg-white p-5 text-neutral-900 shadow-xl ring-1 ring-stone-300">
        <div className="flex items-center gap-2">
          <Icon className="size-6 text-neutral-600" />
          <p className="text-lg font-bold">{app.name}</p>
        </div>
        <p className="mt-3 text-lg">이 앱을 삭제하시겠습니까?</p>
        <div className="mt-5 grid grid-cols-2 items-start gap-5">
          <button
            type="button"
            onClick={onWrong}
            className="min-h-14 rounded-xl bg-neutral-100 text-lg font-semibold text-neutral-700"
          >
            취소
          </button>
          <div>
            <button
              type="button"
              onClick={onNext}
              className={`min-h-14 w-full rounded-xl bg-blue-600 text-lg font-extrabold text-white ring-offset-white ${HIGHLIGHT}`}
            >
              확인
            </button>
            <TapHere light />
          </div>
        </div>
      </div>
    </div>
  )
}
