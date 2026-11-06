// 2026-11-05 14:41 KST
import { useEffect, useMemo, useState } from 'react'
import {
  CircleHelp,
  Info,
  Flag,
  ImageUp,
  Loader2,
  Megaphone,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  TriangleAlert,
  X,
} from 'lucide-react'
import {
  DEMO_FALLBACK_CODES,
  SAMPLE_POPUPS,
  fetchAiInfo,
  sendFeedback,
  readFileAsDataUrl,
  renderSample,
  requestAnalysis,
} from '../lib/popupCheck'

const VERDICT_STYLE = {
  fake: {
    icon: TriangleAlert,
    label: '가짜 경고',
    box: 'bg-amber-50 ring-amber-400',
    iconBox: 'bg-amber-400 text-stone-900',
    tone: 'text-amber-800',
  },
  real: {
    icon: ShieldCheck,
    label: '진짜 알림',
    box: 'bg-emerald-50 ring-emerald-600',
    iconBox: 'bg-emerald-700 text-white',
    tone: 'text-emerald-800',
  },
  ad: {
    icon: Megaphone,
    label: '평범한 광고',
    box: 'bg-sky-50 ring-sky-400',
    iconBox: 'bg-sky-700 text-white',
    tone: 'text-sky-800',
  },
  unsure: {
    icon: CircleHelp,
    label: '판단 어려움',
    box: 'bg-stone-100 ring-stone-300',
    iconBox: 'bg-stone-600 text-white',
    tone: 'text-stone-700',
  },
}

// 수상한 팝업 캡처를 AI에게 보여 주고 진짜인지 가짜인지 쉬운 말로 알려 주는 화면
export default function AiCheckModal({ speak, onClose, onRemove }) {
  const [status, setStatus] = useState('pick') // pick | analyzing | result | error
  const [image, setImage] = useState(null)
  const [result, setResult] = useState(null)
  const [demoReason, setDemoReason] = useState(null) // null | no_key | unstable
  const [aiInfo, setAiInfo] = useState(null)
  const [error, setError] = useState(null)
  const samples = useMemo(() => SAMPLE_POPUPS.map((s) => ({ ...s, src: renderSample(s) })), [])

  useEffect(() => {
    fetchAiInfo().then(setAiInfo)
  }, [])

  useEffect(() => {
    if (status === 'pick') speak('수상한 화면을 찍은 사진을 골라 주세요. AI가 진짜인지 알려 드려요.')
    if (status === 'analyzing') speak('AI가 화면을 살펴보고 있어요. 잠시만 기다려 주세요.')
    if (status === 'error') speak(error?.message)
    if (status === 'result') speak(`${result.headline} ${result.explanation} ${result.action}`)
  }, [status, result, error, speak])

  const analyze = async (src, sample = null) => {
    setImage(src)
    setStatus('analyzing')
    setDemoReason(null)
    const res = await requestAnalysis(src)
    if (res.ok) {
      setResult(res.result)
      setStatus('result')
    } else if (sample && DEMO_FALLBACK_CODES.includes(res.code)) {
      // AI 연결이 없거나 불안정할 때는 예시 팝업에 한해 미리 준비한 결과를 보여 준다.
      setResult(sample.demoResult)
      setDemoReason(['no_key', 'no_server'].includes(res.code) ? 'no_key' : 'unstable')
      setStatus('result')
    } else {
      setError(res)
      setStatus('error')
    }
  }

  const onFile = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (file) analyze(await readFileAsDataUrl(file))
  }

  const reset = () => {
    setStatus('pick')
    setImage(null)
    setResult(null)
    setError(null)
  }

  return (
    <div
      className="absolute inset-0 z-30 flex items-end bg-stone-900/50 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="AI 팝업 판별"
    >
      <div className="animate-rise max-h-full w-full overflow-y-auto rounded-t-3xl bg-white p-5 ring-1 ring-stone-200">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-xl font-extrabold">
            <Sparkles className="size-6 text-emerald-700" />
            이 팝업, 진짜일까요?
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="AI 판별 닫기"
            className="grid size-12 place-items-center rounded-xl bg-stone-100 hover:bg-stone-200"
          >
            <X className="size-6" />
          </button>
        </div>

        {status === 'pick' && (
          <div className="mt-3 space-y-4">
            <p className="text-lg text-stone-700">
              수상한 화면을 캡처해서 올리면 AI가 진짜인지 가짜인지 쉬운 말로 알려 드려요.
            </p>
            <label className="flex min-h-20 w-full cursor-pointer items-center justify-center gap-3 rounded-2xl bg-emerald-700 px-4 text-xl font-extrabold text-white transition hover:bg-emerald-800 focus-within:ring-4 focus-within:ring-emerald-300">
              <ImageUp className="size-7" />
              화면 캡처 사진 고르기
              <input type="file" accept="image/*" onChange={onFile} className="sr-only" />
            </label>

            <div>
              <p className="text-base font-bold text-stone-600">사진이 없으면 예시로 해 보세요</p>
              <div className="mt-2 grid grid-cols-2 gap-5 big:grid-cols-1">
                {samples.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => analyze(s.src, s)}
                    className="overflow-hidden rounded-2xl bg-stone-100 text-left ring-2 ring-transparent transition hover:ring-stone-400"
                  >
                    <img src={s.src} alt="" className="h-36 w-full object-cover object-top big:object-center" />
                    <span className="block px-3 py-2 text-lg leading-snug font-bold">{s.label}</span>
                  </button>
                ))}
              </div>
            </div>
            <PrivacyNotice aiInfo={aiInfo} />
          </div>
        )}

        {status === 'analyzing' && (
          <div className="py-6 text-center" role="status" aria-live="polite">
            <div className="relative mx-auto w-32">
              <img src={image} alt="올린 화면" className="h-48 w-32 rounded-xl object-cover object-top opacity-60" />
              <div className="absolute inset-0 grid place-items-center">
                <Loader2 className="size-14 animate-spin text-emerald-700" />
              </div>
            </div>
            <p className="mt-5 text-xl font-extrabold">AI가 화면을 살펴보고 있어요</p>
            <p className="mt-1 text-lg text-stone-600">잠시만 기다려 주세요.</p>
          </div>
        )}

        {status === 'result' && (
          <ResultView
            image={image}
            result={result}
            demoReason={demoReason}
            onRemove={() => onRemove(result.report_type)}
            onAgain={reset}
          />
        )}

        {status === 'error' && (
          <div className="py-6 text-center" role="alert">
            <CircleHelp className="mx-auto size-14 text-stone-600" />
            <p className="mt-3 text-xl font-extrabold">{error.message}</p>
            {error.code === 'no_key' && (
              <p className="mt-2 text-base text-stone-600">
                프로젝트 폴더의 .env 파일에 AI 키(GEMINI_API_KEY 등)를 넣고 서버를 다시 켜 주세요.
              </p>
            )}
            <button
              type="button"
              onClick={reset}
              className="mt-5 flex min-h-16 w-full items-center justify-center gap-2 rounded-2xl bg-stone-100 text-xl font-bold hover:bg-stone-200"
            >
              <RotateCcw className="size-6" />
              처음으로
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// 사진을 보내기 전 개인정보 안내. 무료 AI일 때는 더 분명하게 알린다.
// AI 서버가 없는 배포(GitHub Pages 등)에서는 예시 팝업으로만 체험할 수 있다고 먼저 알린다.
function PrivacyNotice({ aiInfo }) {
  if (aiInfo && !aiInfo.provider) {
    return (
      <div className="flex gap-2 rounded-2xl bg-sky-50 p-4 text-lg ring-1 ring-sky-300">
        <Info className="mt-1 size-5 shrink-0 text-sky-700" />
        <p>
          이 시연 주소에서는 AI 연결이 없어서, <b>아래 예시 팝업으로만 체험</b>할 수 있어요.
        </p>
      </div>
    )
  }
  const freeTier = aiInfo?.freeTier
  return (
    <div className="flex gap-2 rounded-2xl bg-amber-50 p-4 text-lg ring-1 ring-amber-300">
      <Info className="mt-1 size-5 shrink-0 text-amber-800" />
      <p>
        {freeTier
          ? '무료 AI를 쓰고 있어서, 보낸 사진이 AI 회사(Google)의 서비스 개선에 쓰일 수 있어요.'
          : '사진은 판별을 위해 AI 서비스로 보내져요.'}{' '}
        <b>이름, 전화번호, 문자 내용이 보이는 화면은 올리지 마세요.</b>
      </p>
    </div>
  )
}

const CONFIDENCE = { high: '높음', medium: '보통', low: '낮음' }

function ResultView({ image, result, demoReason, onRemove, onAgain }) {
  const style = VERDICT_STYLE[result.verdict] ?? VERDICT_STYLE.unsure
  const Icon = style.icon

  return (
    <div className="mt-4 space-y-4">
      <section className={`animate-pop rounded-3xl p-5 ring-2 ${style.box}`} aria-live="polite">
        <div className="flex items-start gap-3">
          <img src={image} alt="올린 화면" className="h-24 w-16 shrink-0 rounded-lg object-cover object-top" />
          <div className="min-w-0">
            <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-bold ${style.iconBox}`}>
              <Icon className="size-5" />
              {style.label}
            </span>
            <p className="mt-2 text-xl leading-snug font-extrabold">{result.headline}</p>
          </div>
        </div>
        <p className="mt-3 text-lg leading-relaxed text-stone-800">{result.explanation}</p>
        {result.patternName && ['fake', 'real'].includes(result.verdict) && (
          <p className="mt-2 text-lg font-bold text-stone-800">
            {result.verdict === 'fake' ? '알려진 수법: ' : '알려진 진짜 화면: '}
            {result.patternName}
          </p>
        )}
        {result.confidence && (
          <p className="mt-1 text-base text-stone-700">AI 확신 정도: {CONFIDENCE[result.confidence]}</p>
        )}
      </section>

      {result.safetyNote && (
        <p className="flex gap-2 rounded-2xl bg-amber-50 p-4 text-lg ring-1 ring-amber-300">
          <Info className="mt-1 size-5 shrink-0 text-amber-800" />
          {result.safetyNote}
        </p>
      )}

      {result.clues.length > 0 && (
        <section>
          <p className="text-base font-bold text-stone-600">AI가 찾은 단서</p>
          <ul className="mt-2 space-y-2">
            {result.clues.map((clue) => (
              <li key={clue} className="flex gap-2 rounded-xl bg-stone-100 px-4 py-3 text-lg">
                <span className={`font-black ${style.tone}`}>•</span>
                {clue}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="rounded-2xl bg-stone-100 p-4">
        <p className="text-base font-bold text-stone-600">이렇게 하세요</p>
        <p className="mt-1 text-lg font-semibold">{result.action}</p>
      </section>

      {result.verify_tip && (
        <section className="rounded-2xl bg-emerald-50 p-4 ring-1 ring-emerald-200">
          <p className="flex items-center gap-2 text-base font-bold text-emerald-900">
            <ShieldCheck className="size-5" /> 직접 확인하는 법
          </p>
          <p className="mt-1 text-lg">{result.verify_tip}</p>
        </section>
      )}

      {result.verdict === 'real' && (
        <p className="flex gap-2 rounded-2xl bg-sky-50 p-4 text-lg ring-1 ring-sky-300">
          <ShieldCheck className="mt-1 size-5 shrink-0 text-sky-700" />
          <span>
            진짜 알림이어도 <b>결제, 비밀번호, 인증번호 입력, 앱 설치</b>를 요구하면 멈추고 가족에게 물어보세요.
          </span>
        </p>
      )}

      {result.verdict === 'ad' && (
        <p className="flex gap-2 rounded-2xl bg-sky-50 p-4 text-lg ring-1 ring-sky-300">
          <Megaphone className="mt-1 size-5 shrink-0 text-sky-700" />
          <span>
            앱을 지울 필요는 없어요. 다만 광고가 <b>설치, 전화, 결제, 개인정보 입력</b>을 하라고 하면 그때는 가짜일 수
            있으니 그 화면을 다시 찍어 확인해 주세요.
          </span>
        </p>
      )}

      {demoReason && (
        <p className="text-base text-stone-600">
          {demoReason === 'no_key'
            ? 'AI 연결이 없어 미리 준비한 예시 결과를 보여 드렸어요.'
            : 'AI 연결이 불안정해 미리 준비한 예시 결과를 보여 드렸어요.'}
        </p>
      )}
      <p className="text-base text-stone-600">AI도 틀릴 수 있어요. 애매하면 누르지 말고 가족이나 118번에 물어보세요.</p>

      {result.caseId && <FeedbackBox caseId={result.caseId} />}

      <div className="space-y-5">
        {result.verdict === 'fake' && (
          <div>
            <button
              type="button"
              onClick={onRemove}
              className="animate-glow flex min-h-18 w-full items-center justify-center gap-2 rounded-2xl bg-emerald-700 px-4 text-2xl font-extrabold text-white hover:bg-emerald-800"
            >
              <Flag className="size-7" />
              신고하고 없애기
            </button>
            <p className="mt-2 text-center text-base text-stone-600">
              신고는 바로 접수되고, 이 광고를 없애는 방법을 차례로 알려 드려요.
            </p>
          </div>
        )}
        <button
          type="button"
          onClick={onAgain}
          className="flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-stone-100 px-4 text-lg font-bold hover:bg-stone-200"
        >
          <RotateCcw className="size-5" />
          다른 화면 확인하기
        </button>
      </div>
    </div>
  )
}

// AI 판정이 맞았는지 사용자에게 묻는다. 답은 사례 저장소에 쌓여 다음 판별의 참고 자료와 정답률 측정에 쓰인다.
function FeedbackBox({ caseId }) {
  const [step, setStep] = useState('ask') // ask | which | done
  const [message, setMessage] = useState('')

  const send = async (correct, actual = null) => {
    await sendFeedback(caseId, correct, actual)
    setMessage(
      actual === 'real'
        ? '알려 주셔서 고마워요. 사람이 한 번 더 확인한 뒤 반영할게요.'
        : '알려 주셔서 고마워요. 다음 판별에 참고할게요.',
    )
    setStep('done')
  }

  const btn = 'min-h-14 flex-1 rounded-2xl bg-white px-3 text-lg font-bold ring-1 ring-stone-300 hover:bg-stone-100'

  return (
    <section className="rounded-2xl bg-stone-100 p-4" aria-live="polite">
      {step === 'ask' && (
        <>
          <p className="text-lg font-bold">AI 판정이 맞았나요?</p>
          <div className="mt-3 flex gap-5">
            <button type="button" className={btn} onClick={() => send(true)}>
              맞았어요
            </button>
            <button type="button" className={btn} onClick={() => setStep('which')}>
              틀렸어요
            </button>
          </div>
        </>
      )}
      {step === 'which' && (
        <>
          <p className="text-lg font-bold">실제로는 어땠나요?</p>
          <div className="mt-3 space-y-5">
            <button type="button" className={`${btn} w-full`} onClick={() => send(false, 'fake')}>
              가짜였어요
            </button>
            <button type="button" className={`${btn} w-full`} onClick={() => send(false, 'real')}>
              진짜였어요
            </button>
            <button type="button" className={`${btn} w-full`} onClick={() => send(false, 'unknown')}>
              잘 모르겠어요
            </button>
          </div>
        </>
      )}
      {step === 'done' && <p className="text-lg font-semibold text-emerald-800">{message}</p>}
    </section>
  )
}
