// 2026-11-05 16:00 KST
import { useEffect, useState } from 'react'
import { BellOff, Check, ChevronLeft, ChevronRight, CircleHelp, Globe, Info, X } from 'lucide-react'
import { TapHere } from './UninstallGuide'

// 앱을 지워도 광고가 계속 뜨는 흔한 원인: 인터넷 사이트의 '알림'을 허용해 둔 경우.
// 경로 근거: 크롬은 Google 공식 도움말, 삼성 인터넷은 삼성 공식 커뮤니티(2025) 안내.
const BROWSERS = [
  { id: 'samsung', title: '삼성 인터넷', hint: '보라색 행성 모양 아이콘' },
  { id: 'chrome', title: '크롬', hint: '빨강, 노랑, 초록 동그라미 아이콘' },
  { id: 'quick', title: '잘 모르겠어요', hint: '광고 알림에서 바로 끄기' },
]

// mock.type: bar(아이콘 줄), list(메뉴 목록), toggle(스위치), notice(알림 창)
const STEPS = {
  samsung: [
    {
      text: '삼성 인터넷을 열고 화면 아래 오른쪽의 메뉴(줄 3개)를 눌러요.',
      mock: { type: 'bar', items: ['◀', '▶', '⌂', '☆', '≡'], target: '≡' },
    },
    {
      text: '"설정"을 눌러요.',
      mock: { type: 'list', items: ['북마크', '방문 기록', '다운로드', '설정'], target: '설정' },
    },
    {
      text: '아래로 내려서 "사이트 및 다운로드"를 눌러요.',
      mock: { type: 'list', items: ['홈페이지', '개인정보 보호', '사이트 및 다운로드', '화면 및 글자'], target: '사이트 및 다운로드' },
    },
    {
      text: '"사이트 알림"을 눌러요.',
      mock: { type: 'list', items: ['팝업 차단', '사이트 알림', '다운로드 위치'], target: '사이트 알림' },
    },
    {
      text: '맨 위 스위치를 눌러서 꺼요.',
      mock: { type: 'toggle', label: '사이트 알림' },
    },
  ],
  chrome: [
    {
      text: '크롬을 열고 오른쪽 위의 점 3개(⋮)를 눌러요.',
      mock: { type: 'bar', items: ['⌂', '주소', '⋮'], target: '⋮' },
    },
    {
      text: '"설정"을 눌러요.',
      mock: { type: 'list', items: ['새 탭', '방문 기록', '다운로드', '설정'], target: '설정' },
    },
    {
      text: '"사이트 설정"을 눌러요.',
      mock: { type: 'list', items: ['개인 정보 보호 및 보안', '사이트 설정', '언어'], target: '사이트 설정' },
    },
    {
      text: '"알림"을 눌러요.',
      mock: { type: 'list', items: ['위치', '카메라', '알림', '팝업 및 리디렉션'], target: '알림' },
    },
    {
      text: '맨 위 스위치를 눌러서 꺼요.',
      mock: { type: 'toggle', label: '알림' },
    },
  ],
  quick: [
    {
      text: '광고 알림이 오면 화면 맨 위에서 아래로 손가락을 쓸어내려 알림을 찾아요.',
      mock: { type: 'notice', button: null },
    },
    {
      text: '알림 아래 "수신 거부"가 보이면 눌러요. 안 보이면 알림을 꾹 길게 누르면 끄는 메뉴가 나와요.',
      mock: { type: 'notice', button: '수신 거부' },
    },
  ],
}

const NO_STEPS = []

// 브라우저 고르기 → 단계 안내 → 완료. 알림 끄기 창과 없애기 가이드(RemoveGuide) 양쪽에서 쓴다.
// onExit 이 있으면 첫 화면에 '이전 단계로' 버튼을 보여 준다 (다른 가이드 안에 들어갈 때).
export function NotificationFlow({ speak, onFinish, finishLabel = '닫기', onExit }) {
  const [browser, setBrowser] = useState(null)
  const [step, setStep] = useState(0)
  const [done, setDone] = useState(false)
  const steps = browser ? STEPS[browser] : NO_STEPS

  useEffect(() => {
    if (done) speak('잘하셨어요. 앞으로 인터넷에서 알림을 허용할지 물어보면 차단을 눌러 주세요.')
    else if (browser) speak(`${step + 1}단계. ${steps[step].text}`)
    else speak('앱을 지웠는데도 광고가 뜬다면, 인터넷 사이트 알림 때문일 수 있어요. 어떤 인터넷 앱을 쓰시는지 골라 주세요.')
  }, [browser, step, done, steps, speak])

  const next = () => (step < steps.length - 1 ? setStep(step + 1) : setDone(true))
  const back = () => {
    if (step > 0) setStep(step - 1)
    else setBrowser(null)
  }

  if (done) return <DoneView onFinish={onFinish} finishLabel={finishLabel} />
  if (browser) {
    return <StepView step={step} total={steps.length} data={steps[step]} onNext={next} onBack={back} />
  }
  return (
    <PickView
      onExit={onExit}
      onPick={(id) => {
        setBrowser(id)
        setStep(0)
      }}
    />
  )
}

export default function NotificationGuide({ speak, onClose }) {
  return (
    <div
      className="absolute inset-0 z-30 flex items-end bg-stone-900/50 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="인터넷 알림 광고 끄기"
    >
      <div className="animate-rise max-h-full w-full overflow-y-auto rounded-t-3xl bg-white p-5 ring-1 ring-stone-200">
        <div className="flex items-center justify-between gap-5">
          <h2 className="flex items-center gap-2 text-xl font-extrabold">
            <BellOff className="size-6 text-amber-700" />
            인터넷 알림 광고 끄기
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="알림 끄기 안내 닫기"
            className="grid size-14 shrink-0 place-items-center rounded-xl bg-stone-100 hover:bg-stone-200"
          >
            <X className="size-6" />
          </button>
        </div>
        <div className="mt-4">
          <NotificationFlow speak={speak} onFinish={onClose} />
        </div>
      </div>
    </div>
  )
}

function PickView({ onPick, onExit }) {
  return (
    <div className="space-y-5">
      <p className="text-lg text-stone-800">
        앱을 지웠는데도 광고가 뜬다면, 인터넷 사이트의 "알림"을 허용해 두었기 때문일 수 있어요.
        사이트 알림을 끄면 멈춰요.
      </p>
      <p className="text-xl font-extrabold">어떤 인터넷 앱을 쓰세요?</p>
      <ul className="space-y-5">
        {BROWSERS.map(({ id, title, hint }) => (
          <li key={id}>
            <button
              type="button"
              onClick={() => onPick(id)}
              className="flex min-h-20 w-full items-center gap-4 rounded-2xl bg-stone-100 px-4 py-3 text-left transition hover:bg-stone-200"
            >
              <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-sky-100 text-sky-700">
                {id === 'quick' ? <CircleHelp className="size-8" /> : <Globe className="size-8" />}
              </span>
              <span className="flex-1">
                <span className="block text-xl font-bold">{title}</span>
                <span className="block text-lg text-stone-700">{hint}</span>
              </span>
              <ChevronRight className="size-6 text-stone-600" />
            </button>
          </li>
        ))}
      </ul>
      {onExit && (
        <button
          type="button"
          onClick={onExit}
          className="flex min-h-16 w-full items-center justify-center gap-1 rounded-2xl bg-stone-100 px-4 text-xl font-bold hover:bg-stone-200"
        >
          <ChevronLeft className="size-6" />
          이전 단계로
        </button>
      )}
    </div>
  )
}

function StepView({ step, total, data, onNext, onBack }) {
  const isLast = step === total - 1

  return (
    <div className="space-y-5">
      <ol className="flex gap-2" aria-label={`전체 ${total}단계 중 ${step + 1}단계`}>
        {Array.from({ length: total }, (_, i) => (
          <li
            key={i}
            className={`h-2 flex-1 rounded-full ${i < step ? 'bg-emerald-700' : i === step ? 'bg-amber-400' : 'bg-stone-200'}`}
          />
        ))}
      </ol>
      <p className="text-xl leading-snug font-extrabold" aria-live="polite">
        {step + 1}단계. {data.text}
      </p>

      <div className="fixed-text">
        <p className="mb-2 text-base text-stone-600">휴대폰 화면 (예시)</p>
        <Mock mock={data.mock} onTarget={onNext} />
      </div>

      <div className="grid grid-cols-2 gap-5">
        <button
          type="button"
          onClick={onBack}
          className="flex min-h-16 items-center justify-center gap-1 rounded-2xl bg-stone-100 px-3 text-xl font-bold hover:bg-stone-200"
        >
          <ChevronLeft className="size-6" />
          이전
        </button>
        <button
          type="button"
          onClick={onNext}
          className="flex min-h-16 items-center justify-center gap-1 rounded-2xl bg-emerald-700 px-3 text-xl font-extrabold text-white hover:bg-emerald-800"
        >
          {isLast ? '다 했어요' : '다음'}
          {!isLast && <ChevronRight className="size-6" />}
        </button>
      </div>
      <p className="flex gap-2 text-base text-stone-600">
        <Info className="mt-0.5 size-5 shrink-0" />
        휴대폰과 앱 버전에 따라 메뉴 이름이나 위치가 조금 다를 수 있어요.
      </p>
    </div>
  )
}

const TARGET = 'ring-4 ring-amber-500 ring-offset-2 ring-offset-white animate-pulse'

// 노란 테두리 항목을 누르면 다음 단계로 넘어간다 (삭제 가이드와 같은 방식).
export function Mock({ mock, onTarget }) {
  if (mock.type === 'bar') {
    return (
      <div className="rounded-2xl bg-white p-4 text-neutral-800 shadow-sm ring-1 ring-stone-300">
        <div className="flex items-start justify-between gap-2">
          {mock.items.map((item) =>
            item === mock.target ? (
              <div key={item} className="flex flex-col items-center">
                <button
                  type="button"
                  onClick={onTarget}
                  aria-label={mock.targetLabel ?? '메뉴'}
                  className={`grid size-14 place-items-center rounded-xl bg-neutral-100 text-2xl font-bold ${TARGET}`}
                >
                  {item}
                </button>
                <TapHere light />
              </div>
            ) : (
              <span key={item} className="grid h-14 min-w-10 place-items-center text-xl text-neutral-500" aria-hidden="true">
                {item}
              </span>
            ),
          )}
        </div>
      </div>
    )
  }

  if (mock.type === 'list') {
    return (
      <ul className="space-y-1 rounded-2xl bg-white p-3 text-neutral-900 shadow-sm ring-1 ring-stone-300">
        {mock.items.map((item) =>
          item === mock.target ? (
            <li key={item} className="py-2">
              <button
                type="button"
                onClick={onTarget}
                className={`flex min-h-14 w-full items-center rounded-xl bg-neutral-100 px-4 text-left text-lg font-bold ${TARGET}`}
              >
                {item}
              </button>
              <TapHere light />
            </li>
          ) : (
            <li key={item} className="px-4 py-3 text-lg text-neutral-600" aria-hidden="true">
              {item}
            </li>
          ),
        )}
      </ul>
    )
  }

  if (mock.type === 'toggle') {
    return (
      <div className="rounded-2xl bg-white p-4 text-neutral-900 shadow-sm ring-1 ring-stone-300">
        <div className="flex items-center justify-between gap-5">
          <span className="text-lg font-bold">{mock.label}</span>
          <div className="flex flex-col items-center">
            <button
              type="button"
              onClick={onTarget}
              role="switch"
              aria-checked={!mock.turnOn}
              aria-label={`${mock.label} ${mock.turnOn ? '켜기' : '끄기'}`}
              className={`flex h-14 w-24 items-center rounded-full px-2 ${
                mock.turnOn ? 'justify-start bg-stone-300' : 'justify-end bg-blue-600'
              } ${TARGET}`}
            >
              <span className="size-10 rounded-full bg-white shadow" />
            </button>
            <TapHere light />
          </div>
        </div>
        <p className="mt-2 text-base text-neutral-600">
          {mock.turnOn
            ? '꺼짐 상태예요. 눌러서 초록색이 되면 켜진 거예요.'
            : '켜짐 상태예요. 눌러서 회색이 되면 꺼진 거예요.'}
        </p>
      </div>
    )
  }

  // notice: 알림 창
  return (
    <div className="rounded-2xl bg-white p-4 text-neutral-900 shadow-sm ring-1 ring-stone-300">
      <p className="text-base text-neutral-600">○○사이트 • 방금</p>
      <p className="mt-1 text-lg font-bold">🎁 축하합니다! 경품에 당첨됐어요</p>
      <p className="text-base text-neutral-700">지금 눌러서 확인하세요</p>
      {mock.button && (
        <div className="mt-3">
          <button
            type="button"
            onClick={onTarget}
            className={`min-h-14 rounded-xl bg-neutral-100 px-5 text-lg font-bold text-blue-800 ${TARGET}`}
          >
            {mock.button}
          </button>
          <TapHere light />
        </div>
      )}
    </div>
  )
}

function DoneView({ onFinish, finishLabel }) {
  return (
    <div className="space-y-5 text-center" role="status">
      <div className="animate-pop mx-auto grid size-20 place-items-center rounded-full bg-emerald-700 text-white">
        <Check className="size-12" strokeWidth={3} />
      </div>
      <p className="text-2xl font-extrabold">잘하셨어요!</p>
      <p className="text-lg text-stone-800">이제 인터넷 사이트에서 보내는 광고 알림이 오지 않아요.</p>
      <section className="rounded-2xl bg-stone-100 p-4 text-left">
        <p className="text-base font-bold text-stone-600">앞으로 이것만 기억하세요</p>
        <p className="mt-1 text-lg">
          인터넷에서 "알림을 허용할까요?" 창이 뜨면 <b className="text-amber-800">"차단"</b> 또는{' '}
          <b className="text-amber-800">"허용 안 함"</b>을 눌러 주세요.
        </p>
      </section>
      <p className="text-lg text-stone-700">그래도 광고가 계속 뜨면 118번(한국인터넷진흥원 상담)으로 전화해 주세요.</p>
      <button
        type="button"
        onClick={onFinish}
        className="min-h-16 w-full rounded-2xl bg-stone-100 px-4 text-xl font-bold hover:bg-stone-200"
      >
        {finishLabel}
      </button>
    </div>
  )
}
