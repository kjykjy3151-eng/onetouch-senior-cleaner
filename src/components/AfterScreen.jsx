// 2026-11-05 14:32 KST
import { useEffect, useRef, useState } from 'react'
import confetti from 'canvas-confetti'
import {
  BadgeCheck,
  BellOff,
  Check,
  ChevronRight,
  Flag,
  RotateCcw,
  ScanSearch,
  ShieldCheck,
  Smartphone,
  Sparkles,
  TriangleAlert,
  Volume2,
  VolumeX,
} from 'lucide-react'
import UninstallGuide from './UninstallGuide'
import ReportModal from './ReportModal'
import AiCheckModal from './AiCheckModal'
import InstallModal from './InstallModal'
import NotificationGuide from './NotificationGuide'
import RemoveGuide from './RemoveGuide'
import PromiseSheet from './PromiseSheet'
import { openedFromInstallLink } from '../lib/install'
import { SUSPICIOUS_APPS, TOTAL_APPS, formatTime } from '../data'

const SCAN_MS = 2000

const PHASE_SPEECH = {
  safe: '현재 휴대폰은 안전합니다. 청소를 시작하려면 아래 초록색 버튼을 눌러 주세요.',
  scanning: '검사를 시작합니다. 잠시만 기다려 주세요.',
  found: `확인이 필요한 앱 ${SUSPICIOUS_APPS.length}개를 찾았어요. 걱정하지 마세요. 아래 버튼을 누르면 하나씩 안내해 드릴게요.`,
  done: '청소가 끝났어요. 휴대폰이 최신 보안 상태로 보호되고 있어요.',
}

// 개선 후 화면: 안심 패널, 원터치 청소, 단계별 삭제 가이드, 신고
export default function AfterScreen({ speech, fontLevel, fontLevels, onCycleFont }) {
  const [phase, setPhase] = useState('safe') // safe | scanning | found | done
  const [selected, setSelected] = useState(() => SUSPICIOUS_APPS.map((a) => a.id))
  const [guideOpen, setGuideOpen] = useState(false)
  const [reportOpen, setReportOpen] = useState(false)
  const [reportType, setReportType] = useState(null)
  const [reportStart, setReportStart] = useState('form')
  const [aiOpen, setAiOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const [promiseOpen, setPromiseOpen] = useState(false)
  // AI가 가짜로 판정한 뒤 '신고하고 없애기'를 누르면 신고 유형이 담긴다.
  const [removeType, setRemoveType] = useState(null)
  // 가족 공유 링크(?install=1)로 들어오면 '홈 화면에 추가' 안내부터 보여 준다.
  const [installPage, setInstallPage] = useState(() => (openedFromInstallLink() ? 'pwa' : null))
  const [lastCleaned, setLastCleaned] = useState(null)
  const { speak } = speech
  const mainRef = useRef(null)

  useEffect(() => {
    if (!guideOpen && !reportOpen && !aiOpen && !installPage && !notifOpen && !removeType && !promiseOpen) {
      speak(PHASE_SPEECH[phase])
    }
  }, [phase, guideOpen, reportOpen, aiOpen, installPage, notifOpen, removeType, promiseOpen, speak])

  useEffect(() => {
    mainRef.current?.scrollTo({ top: 0 })
  }, [phase])

  const selectedApps = SUSPICIOUS_APPS.filter((a) => selected.includes(a.id))

  const toggleApp = (id) =>
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))

  const finishCleaning = () => {
    setGuideOpen(false)
    setLastCleaned(new Date())
    setPhase('done')
  }

  const openReport = (type = null, start = 'form') => {
    setReportType(type)
    setReportStart(start)
    setReportOpen(true)
  }

  const reset = () => {
    setSelected(SUSPICIOUS_APPS.map((a) => a.id))
    setPhase('safe')
  }

  return (
    <div className="relative flex h-full flex-col bg-[#FFF9F0] text-stone-900">
      <Header onPromise={() => setPromiseOpen(true)} />

      <main ref={mainRef} className="flex-1 overflow-y-auto px-4 py-5 [scrollbar-width:thin]">
        {phase === 'safe' && (
          <SafePanel
            lastCleaned={lastCleaned}
            onStart={() => setPhase('scanning')}
            onAiCheck={() => setAiOpen(true)}
            onInstall={() => setInstallPage('menu')}
            onReport={() => openReport(null, 'rank')}
          />
        )}
        {phase === 'scanning' && <ScanPanel onDone={() => setPhase('found')} />}
        {phase === 'found' && (
          <FoundPanel
            selected={selected}
            onToggle={toggleApp}
            onClean={() => setGuideOpen(true)}
            onCancel={reset}
          />
        )}
        {phase === 'done' && (
          <DonePanel
            cleanedCount={selectedApps.length}
            lastCleaned={lastCleaned}
            onReport={() => openReport()}
            onNotif={() => setNotifOpen(true)}
            onHome={reset}
          />
        )}
      </main>

      <AccessBar speech={speech} fontLevel={fontLevel} fontLevels={fontLevels} onCycleFont={onCycleFont} />

      {guideOpen && (
        <UninstallGuide
          apps={selectedApps}
          speak={speak}
          onComplete={finishCleaning}
          onClose={() => setGuideOpen(false)}
        />
      )}
      {reportOpen && (
        <ReportModal
          apps={SUSPICIOUS_APPS}
          initialType={reportType}
          startPage={reportStart}
          speak={speak}
          onClose={() => setReportOpen(false)}
        />
      )}
      {promiseOpen && <PromiseSheet speak={speak} onClose={() => setPromiseOpen(false)} />}
      {notifOpen && <NotificationGuide speak={speak} onClose={() => setNotifOpen(false)} />}
      {removeType && (
        <RemoveGuide
          reportType={removeType}
          speak={speak}
          onClose={() => setRemoveType(null)}
          onStartScan={() => {
            setRemoveType(null)
            setPhase('scanning')
          }}
        />
      )}
      {installPage && (
        <InstallModal speak={speak} initialPage={installPage} onClose={() => setInstallPage(null)} />
      )}
      {aiOpen && (
        <AiCheckModal
          speak={speak}
          onClose={() => setAiOpen(false)}
          onRemove={(type) => {
            setAiOpen(false)
            setRemoveType(type === 'none' ? 'link' : type)
          }}
        />
      )}
    </div>
  )
}

// 상단은 한 줄로 작게: 앱 이름과 '안전 약속' 버튼만 둔다 (약속 내용은 안전 약속 화면에 있다)
function Header({ onPromise }) {
  return (
    <header className="fixed-text flex shrink-0 items-center justify-between gap-4 border-b border-stone-200 bg-white px-4 py-2 shadow-sm">
      <div className="flex min-w-0 items-center gap-2">
        <img
          src={`${import.meta.env.BASE_URL}logo.png`}
          alt=""
          className="size-9 shrink-0 rounded-xl shadow-sm shadow-emerald-700/30 max-[359px]:hidden"
        />
        <h1 className="text-lg leading-tight font-extrabold whitespace-nowrap">원터치 클리너</h1>
      </div>

      <button
        type="button"
        onClick={onPromise}
        aria-label="이 앱의 안전 약속 보기"
        className="inline-flex min-h-12 shrink-0 items-center gap-1 rounded-full bg-emerald-100 px-3 text-base font-bold whitespace-nowrap text-emerald-800 ring-1 ring-emerald-300 hover:bg-emerald-200"
      >
        <BadgeCheck className="size-5 max-[379px]:hidden" />
        안전 약속
        <ChevronRight className="size-4" />
      </button>
    </header>
  )
}

// 화면 아래 고정: 음성 안내, 글자 크기 (시니어가 언제든 같은 자리에서 찾을 수 있게)
// 글자 크기와 상관없이 같은 크기로 두고, 지금 몇 단계인지 점으로 보여 준다.
function AccessBar({ speech, fontLevel, fontLevels, onCycleFont }) {
  const isMax = fontLevel === fontLevels - 1
  return (
    <nav
      aria-label="보기 도움"
      className="fixed-text grid shrink-0 grid-cols-2 gap-5 border-t border-stone-200 bg-white px-4 py-3"
    >
      <button
        type="button"
        onClick={speech.toggle}
        aria-pressed={speech.enabled}
        className={`flex min-h-14 items-center justify-center gap-2 rounded-2xl px-2 text-lg font-bold whitespace-nowrap transition ${
          speech.enabled ? 'bg-emerald-700 text-white' : 'bg-stone-100 text-stone-900 hover:bg-stone-200'
        }`}
      >
        {speech.enabled ? <Volume2 className="size-6" /> : <VolumeX className="size-6" />}
        {speech.enabled ? '음성 안내 켜짐' : '음성 안내'}
      </button>
      <button
        type="button"
        onClick={onCycleFont}
        aria-label={isMax ? '글자 원래 크기로' : `글자 크게, 지금은 ${fontLevel + 1}단계`}
        className="flex min-h-14 flex-col items-center justify-center rounded-2xl bg-stone-100 px-2 font-bold text-stone-900 hover:bg-stone-200"
      >
        <span className="flex items-center gap-1.5 text-lg whitespace-nowrap">
          <span className="text-xl font-extrabold">{isMax ? '가' : '가+'}</span>
          {isMax ? '원래 크기로' : '글자 크게'}
        </span>
        <span className="mt-1 flex gap-1.5" aria-hidden="true">
          {Array.from({ length: fontLevels }, (_, i) => (
            <span key={i} className={`size-2 rounded-full ${i <= fontLevel ? 'bg-emerald-700' : 'bg-stone-300'}`} />
          ))}
        </span>
      </button>
    </nav>
  )
}

function SafePanel({ lastCleaned, onStart, onAiCheck, onReport, onInstall }) {
  return (
    <div className="animate-rise space-y-5">
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-50 via-white to-sky-50 p-5 text-center shadow-lg shadow-emerald-900/5 ring-1 ring-emerald-200">
        <Sparkles className="absolute top-4 left-5 size-7 text-amber-400" aria-hidden="true" />
        <Sparkles className="absolute top-10 right-6 size-5 text-sky-400" aria-hidden="true" />
        <div className="relative mx-auto grid size-28 place-items-center">
          <span className="absolute inset-0 animate-ping rounded-full bg-emerald-300/40 [animation-duration:2.5s]" />
          <span className="relative grid size-28 place-items-center rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 shadow-lg shadow-emerald-600/30">
            <ShieldCheck className="size-16 text-white" strokeWidth={2.2} />
          </span>
        </div>
        <h2 className="mt-4 text-[calc(1.4rem*var(--font-scale,1))] font-extrabold">현재 휴대폰은 안전합니다</h2>
        <p className="mt-2 text-lg text-stone-700">
          {lastCleaned
            ? `마지막 청소: 오늘 ${formatTime(lastCleaned)}`
            : '궁금하면 언제든 직접 검사해 볼 수 있어요.'}
        </p>
      </section>

      <button
        type="button"
        onClick={onStart}
        className="flex min-h-20 w-full items-center justify-center gap-2 rounded-2xl bg-emerald-700 px-3 text-2xl font-extrabold text-white animate-glow shadow-lg shadow-emerald-700/25 transition hover:bg-emerald-800 active:scale-[0.98]"
      >
        <Sparkles className="size-7" />
        싹쓸이 청소 시작하기
      </button>
      <p className="text-center text-base text-stone-600">
        무엇을 지울지 항상 먼저 보여 드려요. 직접 확인하고 고를 수 있어요.
      </p>

      <button
        type="button"
        onClick={onAiCheck}
        className="flex min-h-16 w-full items-center gap-3 rounded-2xl bg-white px-4 py-3 text-left shadow-sm ring-2 ring-sky-300 transition hover:bg-sky-50"
      >
        <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-sky-100 text-sky-700">
          <ScanSearch className="size-7" />
        </span>
        <span className="flex-1">
          <span className="block text-lg font-bold">
            <span className="mr-1.5 rounded-md bg-sky-700 px-1.5 text-lg font-extrabold text-white">AI</span>
            이 팝업, 진짜일까요?
          </span>
          <span className="block text-lg text-stone-700">화면 사진을 올리면 AI가 알려 드려요</span>
        </span>
        <ChevronRight className="size-6 text-stone-600" />
      </button>

      <button
        type="button"
        onClick={onReport}
        className="flex min-h-16 w-full items-center gap-3 rounded-2xl bg-white px-4 py-3 text-left shadow-sm ring-1 ring-stone-200 transition hover:bg-orange-50"
      >
        <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-orange-100 text-orange-700">
          <Flag className="size-7" />
        </span>
        <span className="flex-1">
          <span className="block text-lg font-bold">이상한 팝업을 봤어요</span>
          <span className="block text-lg text-stone-700">신고 많은 앱 순위 보고 신고하기</span>
        </span>
        <ChevronRight className="size-6 text-stone-600" />
      </button>

      <button
        type="button"
        onClick={onInstall}
        className="flex min-h-16 w-full items-center gap-3 rounded-2xl bg-white px-4 py-3 text-left shadow-sm ring-1 ring-stone-200 transition hover:bg-violet-50"
      >
        <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-violet-100 text-violet-700">
          <Smartphone className="size-7" />
        </span>
        <span className="flex-1">
          <span className="block text-lg font-bold">쉽게 설치하고 알려 주기</span>
          <span className="block text-lg text-stone-700">홈 화면 추가, 가족 링크</span>
        </span>
        <ChevronRight className="size-6 text-stone-600" />
      </button>
    </div>
  )
}

const SCAN_STEPS = ['설치된 앱 목록 확인', '광고 팝업 패턴 분석', '가짜 경고 창 패턴 비교']

function ScanPanel({ onDone }) {
  const [progress, setProgress] = useState(0)
  const onDoneRef = useRef(onDone)

  useEffect(() => {
    onDoneRef.current = onDone
  })

  useEffect(() => {
    const start = performance.now()
    const timer = setInterval(() => {
      const p = Math.min((performance.now() - start) / SCAN_MS, 1)
      setProgress(p)
      if (p === 1) {
        clearInterval(timer)
        onDoneRef.current()
      }
    }, 40)
    return () => clearInterval(timer)
  }, [])

  const activeStep = Math.min(Math.floor(progress * SCAN_STEPS.length), SCAN_STEPS.length - 1)

  return (
    <div className="animate-rise space-y-6 pt-2 text-center" role="status" aria-live="polite">
      <div className="relative mx-auto grid size-44 place-items-center">
        <span className="absolute inset-0 rounded-full border-[6px] border-emerald-100" />
        <span className="absolute inset-0 animate-spin rounded-full border-[6px] border-transparent border-t-emerald-600 [animation-duration:0.9s]" />
        <div>
          <ScanSearch className="mx-auto size-12 text-emerald-700" />
          <p className="mt-1 text-3xl font-extrabold tabular-nums">{Math.round(progress * 100)}%</p>
        </div>
      </div>

      <div>
        <p className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 font-bold text-emerald-800">
          <Sparkles className="size-4" /> AI 실시간 패턴 분석 중
        </p>
        <p className="mt-3 text-lg text-stone-700 tabular-nums">
          앱 {Math.round(progress * TOTAL_APPS)} / {TOTAL_APPS}개 확인
        </p>
      </div>

      <ul className="space-y-2 text-left">
        {SCAN_STEPS.map((step, i) => {
          const done = i < activeStep || progress === 1
          const active = i === activeStep && !done
          return (
            <li
              key={step}
              className={`flex items-center gap-3 rounded-xl px-4 py-3 text-lg ${
                active ? 'bg-stone-100 text-stone-900' : done ? 'text-stone-700' : 'text-stone-600'
              }`}
            >
              <span
                className={`grid size-7 place-items-center rounded-full ${
                  done ? 'bg-emerald-700 text-white' : 'border-2 border-stone-300'
                }`}
              >
                {done && <Check className="size-4" strokeWidth={3} />}
              </span>
              {step}
            </li>
          )
        })}
      </ul>
    </div>
  )
}

function FoundPanel({ selected, onToggle, onClean, onCancel }) {
  const count = selected.length

  return (
    <div className="animate-rise space-y-5">
      <section className="rounded-3xl bg-amber-50 p-5 ring-1 ring-amber-300">
        <div className="flex items-center gap-3">
          <span className="grid size-12 shrink-0 place-items-center rounded-full bg-amber-100 text-amber-700">
            <TriangleAlert className="size-7" />
          </span>
          <h2 className="text-xl font-extrabold">
            확인이 필요한 앱 {SUSPICIOUS_APPS.length}개를 찾았어요
          </h2>
        </div>
        <p className="mt-3 text-lg text-stone-800">
          걱정하지 마세요. 휴대폰은 고장 나지 않았어요. 지우고 싶은 앱만 골라 주세요.
        </p>
      </section>

      <ul className="space-y-5">
        {SUSPICIOUS_APPS.map((app) => {
          const isOn = selected.includes(app.id)
          const Icon = app.icon
          return (
            <li key={app.id}>
              <button
                type="button"
                role="checkbox"
                aria-checked={isOn}
                onClick={() => onToggle(app.id)}
                className={`flex w-full items-start gap-3 rounded-2xl p-4 text-left ring-2 transition ${
                  isOn ? 'bg-white shadow-md ring-amber-400' : 'bg-stone-50 ring-stone-200'
                }`}
              >
                <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-stone-200 text-stone-700">
                  <Icon className="size-7" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-lg font-bold">{app.name}</span>
                  <span className="block text-lg text-stone-600">{app.installed}</span>
                  <span className="mt-1 block text-lg text-stone-800">{app.reason}</span>
                  <span className="mt-2 inline-block rounded-md bg-amber-100 px-2 py-0.5 text-lg font-semibold text-amber-800">
                    AI 판단: {app.pattern}
                  </span>
                </span>
                <span
                  className={`grid size-8 shrink-0 place-items-center rounded-lg border-2 ${
                    isOn ? 'border-amber-400 bg-amber-400 text-stone-900' : 'border-stone-400'
                  }`}
                  aria-hidden="true"
                >
                  {isOn && <Check className="size-5" strokeWidth={3} />}
                </span>
              </button>
            </li>
          )
        })}
      </ul>

      <button
        type="button"
        onClick={onClean}
        disabled={count === 0}
        className="min-h-18 w-full rounded-2xl bg-emerald-700 px-4 text-2xl font-extrabold text-white transition hover:bg-emerald-800 active:scale-[0.98] disabled:bg-stone-200 disabled:text-stone-600"
      >
        {count === 0 ? '지울 앱을 골라 주세요' : `선택한 앱 ${count}개 정리하기`}
      </button>
      <button
        type="button"
        onClick={onCancel}
        className="min-h-12 w-full rounded-xl text-lg font-semibold text-stone-600 hover:text-stone-900"
      >
        지금은 그대로 둘게요
      </button>
    </div>
  )
}

function DonePanel({ cleanedCount, lastCleaned, onReport, onNotif, onHome }) {
  const fired = useRef(false)

  useEffect(() => {
    if (fired.current) return
    fired.current = true
    const colors = ['#10B981', '#34D399', '#F59E0B', '#FFFFFF', '#38BDF8']
    const opts = { colors, disableForReducedMotion: true, zIndex: 9999 }
    confetti({ ...opts, particleCount: 120, spread: 90, origin: { y: 0.55 } })
    setTimeout(() => {
      confetti({ ...opts, particleCount: 60, angle: 60, spread: 60, origin: { x: 0.2, y: 0.7 } })
      confetti({ ...opts, particleCount: 60, angle: 120, spread: 60, origin: { x: 0.8, y: 0.7 } })
    }, 300)
  }, [])

  return (
    <div className="space-y-5 text-center">
      <div className="animate-pop mx-auto grid size-32 place-items-center rounded-full bg-emerald-700 text-white shadow-xl shadow-emerald-700/25">
        <Check className="size-20" strokeWidth={3} />
      </div>
      <div className="animate-rise">
        <h2 className="text-3xl font-extrabold">청소가 끝났어요!</h2>
        <p className="mt-3 inline-flex items-center gap-2 rounded-full bg-emerald-100 px-4 py-1.5 text-lg font-bold text-emerald-800">
          <span className="relative flex size-3">
            <span className="absolute inset-0 animate-ping rounded-full bg-emerald-400" />
            <span className="relative size-3 rounded-full bg-emerald-400" />
          </span>
          최신 보안 상태 유지 중
        </p>
      </div>

      <dl className="animate-rise divide-y divide-stone-200 rounded-2xl bg-white px-5 text-left text-lg shadow-sm ring-1 ring-stone-200">
        <div className="flex flex-wrap justify-between gap-x-4 py-3">
          <dt className="whitespace-nowrap text-stone-600">정리한 앱</dt>
          <dd className="font-bold">{cleanedCount}개</dd>
        </div>
        <div className="flex flex-wrap justify-between gap-x-4 py-3">
          <dt className="whitespace-nowrap text-stone-600">검사 시각</dt>
          <dd className="font-bold">오늘 {formatTime(lastCleaned)}</dd>
        </div>
        <div className="flex flex-wrap justify-between gap-x-4 py-3">
          <dt className="whitespace-nowrap text-stone-600">실시간 보호</dt>
          <dd className="font-bold text-emerald-700">켜짐</dd>
        </div>
      </dl>

      <div className="animate-rise space-y-5">
        <button
          type="button"
          onClick={onNotif}
          className="flex min-h-16 w-full items-center gap-3 rounded-2xl bg-white px-4 py-3 text-left shadow-sm ring-1 ring-stone-200 transition hover:bg-teal-50"
        >
          <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-teal-100 text-teal-700">
            <BellOff className="size-7" />
          </span>
          <span className="flex-1">
            <span className="block text-lg font-bold">그래도 광고가 뜨나요?</span>
            <span className="block text-lg text-stone-700">인터넷 알림 광고 끄는 법</span>
          </span>
          <ChevronRight className="size-6 text-stone-600" />
        </button>
        <button
          type="button"
          onClick={onReport}
          className="flex min-h-16 w-full items-center justify-center gap-2 rounded-2xl px-4 text-xl font-bold text-amber-800 ring-2 ring-amber-500 hover:bg-amber-50"
        >
          <Flag className="size-6" />
          이상한 팝업 신고하기
        </button>
        <button
          type="button"
          onClick={onHome}
          className="flex min-h-16 w-full items-center justify-center gap-2 rounded-2xl bg-stone-100 px-4 text-xl font-bold hover:bg-stone-200"
        >
          <RotateCcw className="size-6" />
          처음 화면으로
        </button>
      </div>
    </div>
  )
}
