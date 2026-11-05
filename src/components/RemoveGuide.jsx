// 2026-11-05 16:55 KST
import { useEffect, useState } from 'react'
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Info,
  Loader2,
  Phone,
  ScanSearch,
  ShieldCheck,
  Smartphone,
  Trash2,
  X,
} from 'lucide-react'
import { Mock, NotificationFlow } from './NotificationGuide'
import { REPORT_TYPES } from '../data'
import { getPlatform } from '../lib/install'

// AI가 가짜 경고로 판정한 뒤: 신고를 바로 접수하고, 이 광고를 다시 안 보게 없애는 방법을 단계별로 안내한다.
// 휴대폰 보안 규칙상 앱이 다른 앱을 대신 지울 수 없으므로, 사용자가 따라 하는 가이드 형식이다.
// 경로 근거: 안드로이드는 삼성 갤럭시 기준(블로그, 삼성 커뮤니티), 아이폰은 Apple 공식 도움말(iOS 18 메뉴 기준).
const FLOWS = {
  android: ['close', 'find', 'delete', 'notif', 'finish'],
  iphone: ['ios-close', 'ios-popup', 'ios-history', 'ios-calendar', 'ios-finish'],
}

const DEVICES = [
  { id: 'galaxy', title: '갤럭시 (삼성)', flow: 'android' },
  { id: 'android', title: '다른 안드로이드 (LG 등)', flow: 'android' },
  { id: 'iphone', title: '아이폰', flow: 'iphone' },
]

const SPEECH = {
  device: '어떤 휴대폰을 쓰시는지 골라 주세요.',
  close: '1단계. 광고 창 안의 버튼은 누르지 말고, 뒤로 가기를 눌러 창을 닫아요.',
  find: '2단계. 설정의 애플리케이션에서 최근에 설치한 낯선 앱이 있는지 살펴봐요.',
  delete: '3단계. 찾은 앱을 눌러 삭제를 누르고, 확인을 누르면 지워져요.',
  notif: '4단계. 광고가 인터넷 알림으로 온다면, 사이트 알림을 꺼야 다시 안 와요.',
  finish: '마지막 단계예요. 휴대폰 검사를 한 번 하고, 예방 수칙을 기억해 주세요.',
  'ios-close': '1단계. 광고 창의 닫기 버튼도 가짜일 수 있어요. 사파리 탭 자체를 닫아요.',
  'ios-popup': '2단계. 설정, 앱, 사파리에서 팝업 차단을 켜요.',
  'ios-history': '3단계. 사파리의 방문 기록 및 웹사이트 데이터를 지워요.',
  'ios-calendar': '4단계. 캘린더에 이상한 일정이 생겼다면 그 캘린더의 구독을 취소해요.',
  'ios-finish': '마지막 단계예요. 예방 수칙을 기억해 주세요.',
  done: '잘하셨어요. 이제 휴대폰이 훨씬 안전해졌어요.',
}

const PREVENT = {
  android: [
    '앱은 Play 스토어 같은 공식 스토어에서만 받아요.',
    '문자나 광고 속 링크로 앱을 깔지 않아요.',
    '"알림을 허용할까요?" 창이 뜨면 "차단"을 눌러요.',
    '광고 창은 안의 버튼 대신 뒤로 가기로 닫아요.',
  ],
  iphone: [
    '앱은 App Store에서만 받아요.',
    '진짜인지 모르는 팝업에는 대답하지 않아요.',
    '"닫기"처럼 보이는 버튼도 가짜일 수 있어요. 탭 자체를 닫아요.',
    '문자나 광고 속 링크를 누르지 않아요.',
  ],
}

export default function RemoveGuide({ reportType, speak, onClose, onStartScan }) {
  const [report, setReport] = useState({ status: 'sending', receipt: '' })
  const [page, setPage] = useState('reported')
  const [history, setHistory] = useState([])
  const [device, setDevice] = useState(null)
  const [notifFlow, setNotifFlow] = useState(false)
  const typeTitle = REPORT_TYPES.find((t) => t.id === reportType)?.title ?? '이상한 링크, 설치 유도'
  const flow = FLOWS[DEVICES.find((d) => d.id === device)?.flow ?? 'android']

  // 신고는 버튼을 누르는 순간 바로 접수한다 (시연용 시뮬레이션).
  useEffect(() => {
    const timer = setTimeout(() => {
      const now = new Date()
      const pad = (n) => String(n).padStart(2, '0')
      const ymd = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}`
      setReport({ status: 'sent', receipt: `KISA-${ymd}-${Math.floor(1000 + Math.random() * 9000)}` })
    }, 1000)
    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    if (page === 'reported') {
      if (report.status === 'sent') speak('신고가 접수됐어요. 이제 이 광고가 다시 안 나오게 할까요?')
    } else if (!notifFlow) {
      speak(SPEECH[page])
    }
  }, [page, report.status, notifFlow, speak])

  const go = (next) => {
    setHistory((h) => [...h, page])
    setPage(next)
  }
  const back = () => {
    setNotifFlow(false)
    setPage(history.at(-1) ?? 'reported')
    setHistory(history.slice(0, -1))
  }

  // 단계 화면 공통 속성: 진행 표시, 기종별 안내 문구
  const step = (id, search) => ({ index: flow.indexOf(id), total: flow.length, device, search })

  return (
    <div
      className="absolute inset-0 z-30 flex items-end bg-stone-900/50 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="신고하고 없애기"
    >
      <div className="animate-rise max-h-full w-full overflow-y-auto rounded-t-3xl bg-white p-5 ring-1 ring-stone-200">
        <div className="flex items-center justify-between gap-5">
          <h2 className="flex items-center gap-2 text-xl font-extrabold">
            <Trash2 className="size-6 text-amber-700" />
            신고하고 없애기
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="없애기 안내 닫기"
            className="grid size-14 shrink-0 place-items-center rounded-xl bg-stone-100 hover:bg-stone-200"
          >
            <X className="size-6" />
          </button>
        </div>

        <div className="mt-4">
          {page === 'reported' && (
            <ReportedPage report={report} typeTitle={typeTitle} onStart={() => go('device')} onStop={onClose} />
          )}

          {page === 'device' && (
            <DevicePage
              onBack={back}
              onPick={(id) => {
                setDevice(id)
                go(FLOWS[DEVICES.find((d) => d.id === id).flow][0])
              }}
            />
          )}

          {/* ---------- 안드로이드 ---------- */}
          {page === 'close' && (
            <StepPage
              {...step('close')}
              title="광고 창 닫기"
              text={'창 안의 "설치", "확인" 같은 버튼은 누르지 마세요. 휴대폰 아래쪽의 뒤로 가기(◀)를 누르거나 인터넷 창을 닫아요.'}
              mock={{ type: 'bar', items: ['|||', '○', '◀'], target: '◀', targetLabel: '뒤로 가기' }}
              onTarget={() => go('find')}
            >
              <NavButtons onBack={back} onNext={() => go('find')} />
            </StepPage>
          )}

          {page === 'find' && (
            <StepPage
              {...step('find', '애플리케이션')}
              title="광고를 띄운 앱 찾기"
              text={'설정 → 애플리케이션으로 들어가 정렬을 "최근 설치" 순으로 바꿔요. 광고가 시작될 무렵 깐 낯선 앱이 있는지 살펴봐요.'}
              mock={{
                type: 'list',
                items: ['무료 정리 앱 (3일 전 설치)', '날씨 (2주 전 설치)', '카카오톡 (2년 전 설치)'],
                target: '무료 정리 앱 (3일 전 설치)',
              }}
              onTarget={() => go('delete')}
            >
              <p className="text-xl font-extrabold">낯선 앱이 있나요?</p>
              <ChoiceButton primary onClick={() => go('delete')}>
                <Trash2 className="size-6" /> 있어요, 지울래요
              </ChoiceButton>
              <ChoiceButton onClick={() => go('notif')}>없어요, 건너뛸래요</ChoiceButton>
              <ChoiceButton accent onClick={onStartScan}>
                <ScanSearch className="size-6" /> 앱이 대신 찾아 주기
              </ChoiceButton>
              <BackButton onClick={back} />
            </StepPage>
          )}

          {page === 'delete' && (
            <StepPage
              {...step('delete', '기기 관리자')}
              title="낯선 앱 지우기"
              text={'찾은 앱을 누른 뒤 "삭제"를 누르고, 확인 창에서 "확인"을 누르면 지워져요.'}
              mock={{ type: 'list', items: ['열기', '삭제', '강제 중지'], target: '삭제' }}
              onTarget={() => go('notif')}
            >
              <div className="flex gap-2 rounded-2xl bg-amber-50 p-4 text-lg ring-1 ring-amber-300">
                <Info className="mt-1 size-5 shrink-0 text-amber-800" />
                <p>
                  <b>"삭제" 버튼이 회색이라 안 눌리나요?</b> 설정 → 보안 및 개인정보 보호 → 기타 보안 설정 →
                  기기(디바이스) 관리자 앱에서 그 앱의 스위치를 끈 뒤 다시 삭제해 보세요.
                </p>
              </div>
              <NavButtons onBack={back} onNext={() => go('notif')} />
            </StepPage>
          )}

          {page === 'notif' &&
            (notifFlow ? (
              <NotificationFlow
                speak={speak}
                finishLabel="다음 단계로"
                onExit={() => setNotifFlow(false)}
                onFinish={() => {
                  setNotifFlow(false)
                  go('finish')
                }}
              />
            ) : (
              <StepPage
                {...step('notif')}
                title="인터넷 알림 광고 끄기"
                text="앱을 지워도 광고가 인터넷 알림으로 온다면, 사이트 알림을 꺼야 다시 안 와요."
                mock={{ type: 'notice', button: null }}
              >
                <p className="text-xl font-extrabold">이런 광고 알림이 온 적 있나요?</p>
                <ChoiceButton primary onClick={() => setNotifFlow(true)}>
                  알림 끄는 법 보기
                </ChoiceButton>
                <ChoiceButton onClick={() => go('finish')}>없어요, 건너뛸래요</ChoiceButton>
                <BackButton onClick={back} />
              </StepPage>
            ))}

          {page === 'finish' && (
            <FinishPage
              {...step('finish', device === 'galaxy' ? '디바이스 케어' : '보안')}
              text={
                device === 'galaxy'
                  ? '설정 → 디바이스 케어에서 디바이스 보호 검사를 한 번 해 주세요.'
                  : '설정의 보안 메뉴나 휴대폰에 들어 있는 보안 검사를 한 번 해 주세요.'
              }
              tips={PREVENT.android}
              onDone={() => go('done')}
              onStartScan={onStartScan}
              onBack={back}
            />
          )}

          {/* ---------- 아이폰 ---------- */}
          {page === 'ios-close' && (
            <StepPage
              {...step('ios-close')}
              title="광고 창 닫기"
              text={'"닫기"처럼 보이는 버튼도 가짜일 수 있어요. 화면 아래 탭 버튼(네모 두 개)을 누른 뒤 그 탭을 닫아요.'}
              mock={{ type: 'bar', items: ['＜', '＞', '⬆', '📖', '⧉'], target: '⧉', targetLabel: '탭 보기' }}
              onTarget={() => go('ios-popup')}
            >
              <NavButtons onBack={back} onNext={() => go('ios-popup')} />
            </StepPage>
          )}

          {page === 'ios-popup' && (
            <StepPage
              {...step('ios-popup')}
              title="팝업 차단 켜기"
              text={'설정 → 앱 → Safari로 들어가 "팝업 차단"을 켜요. 바로 아래 "위조된 웹사이트 경고"도 켜 두면 좋아요.'}
              mock={{ type: 'toggle', label: '팝업 차단', turnOn: true }}
              onTarget={() => go('ios-history')}
            >
              <NavButtons onBack={back} onNext={() => go('ios-history')} />
            </StepPage>
          )}

          {page === 'ios-history' && (
            <StepPage
              {...step('ios-history')}
              title="방문 기록 지우기"
              text={'설정 → 앱 → Safari에서 아래로 내려 "방문 기록 및 웹사이트 데이터 지우기"를 눌러요. 광고를 띄우던 사이트 정보가 지워져요.'}
              mock={{
                type: 'list',
                items: ['팝업 차단', '방문 기록 및 웹사이트 데이터 지우기', '고급'],
                target: '방문 기록 및 웹사이트 데이터 지우기',
              }}
              onTarget={() => go('ios-calendar')}
            >
              <NavButtons onBack={back} onNext={() => go('ios-calendar')} />
            </StepPage>
          )}

          {page === 'ios-calendar' && (
            <StepPage
              {...step('ios-calendar')}
              title="캘린더 스팸 정리"
              text={'캘린더에 모르는 광고 일정이 생겼다면, 그 일정을 누르고 맨 아래 "이 캘린더의 구독 취소"를 눌러요.'}
              mock={{
                type: 'list',
                items: ['⚠ 바이러스 감염! 지금 확인하세요', '이 캘린더의 구독 취소'],
                target: '이 캘린더의 구독 취소',
              }}
              onTarget={() => go('ios-finish')}
            >
              <p className="text-xl font-extrabold">이런 이상한 일정이 있나요?</p>
              <ChoiceButton primary onClick={() => go('ios-finish')}>
                구독 취소했어요
              </ChoiceButton>
              <ChoiceButton onClick={() => go('ios-finish')}>없어요, 건너뛸래요</ChoiceButton>
              <BackButton onClick={back} />
            </StepPage>
          )}

          {page === 'ios-finish' && (
            <FinishPage
              {...step('ios-finish')}
              text="앱을 지울 필요가 없는 경우가 많아요. 이제 같은 광고가 나오지 않게 아래 수칙만 기억해 주세요."
              tips={PREVENT.iphone}
              onDone={() => go('done')}
              onBack={back}
            />
          )}

          {page === 'done' && <DonePage onClose={onClose} />}
        </div>
      </div>
    </div>
  )
}

function ReportedPage({ report, typeTitle, onStart, onStop }) {
  const sent = report.status === 'sent'
  return (
    <div className="space-y-5">
      <section className="rounded-2xl bg-stone-50 p-4 text-center ring-1 ring-stone-200" role="status">
        {sent ? (
          <>
            <div className="animate-pop mx-auto grid size-16 place-items-center rounded-full bg-emerald-700 text-white">
              <Check className="size-10" strokeWidth={3} />
            </div>
            <p className="mt-3 text-2xl font-extrabold">신고가 접수됐어요</p>
            <p className="mt-1 text-lg text-stone-700">신고 유형: {typeTitle}</p>
            <p className="mt-1 text-lg">
              접수 번호 <span className="font-mono font-bold text-emerald-800">{report.receipt}</span>
            </p>
          </>
        ) : (
          <p className="flex items-center justify-center gap-2 py-6 text-xl font-bold">
            <Loader2 className="size-7 animate-spin text-emerald-700" /> 신고를 보내는 중이에요
          </p>
        )}
      </section>

      <p className="text-xl font-extrabold">이제 이 광고가 다시 안 나오게 할까요?</p>
      <p className="text-lg text-stone-700">
        휴대폰 보안 규칙상 앱이 대신 지울 수는 없어요. 대신 하나씩 따라 하면 되도록 차례로 알려 드릴게요.
      </p>
      <ChoiceButton primary onClick={onStart}>
        <ShieldCheck className="size-7" /> 이 광고 또 안 나오게 하기
      </ChoiceButton>
      <ChoiceButton onClick={onStop}>여기까지만 할게요</ChoiceButton>
      <p className="text-base text-stone-600">시연용 화면이라 신고가 실제로 접수되지는 않아요.</p>
    </div>
  )
}

// 휴대폰 종류 고르기. 지금 쓰는 휴대폰을 알아내 "이 휴대폰" 표시를 붙인다.
function DevicePage({ onPick, onBack }) {
  const platform = getPlatform()
  const guess = platform === 'ios' ? 'iphone' : platform === 'android' ? 'galaxy' : null

  return (
    <div className="space-y-5">
      <p className="text-xl font-extrabold">어떤 휴대폰을 쓰세요?</p>
      <p className="text-lg text-stone-700">휴대폰마다 메뉴가 달라서, 맞는 방법으로 알려 드릴게요.</p>
      <ul className="space-y-5">
        {DEVICES.map((d) => (
          <li key={d.id}>
            <button
              type="button"
              onClick={() => onPick(d.id)}
              className={`flex min-h-20 w-full items-center gap-4 rounded-2xl px-4 py-3 text-left transition ${
                d.id === guess ? 'bg-emerald-50 ring-2 ring-emerald-600' : 'bg-stone-100 hover:bg-stone-200'
              }`}
            >
              <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-white text-stone-700 ring-1 ring-stone-200">
                <Smartphone className="size-8" />
              </span>
              <span className="flex-1">
                <span className="block text-xl font-bold">{d.title}</span>
                {d.id === guess && <span className="block text-lg text-emerald-800">지금 쓰는 휴대폰 같아요</span>}
              </span>
              <ChevronRight className="size-6 text-stone-600" />
            </button>
          </li>
        ))}
      </ul>
      <BackButton onClick={onBack} />
    </div>
  )
}

// 받침이 있으면 '을', 없으면 '를'
const objectParticle = (word) => ((word.charCodeAt(word.length - 1) - 0xac00) % 28 ? '을' : '를')

// 기종별 안내 문구: 메뉴를 못 찾을 때 설정 검색을 쓰도록 알려 준다.
function footnoteFor(device, search) {
  if (device === 'iphone') return '아이폰 iOS 18 기준이에요. 예전 버전은 설정 → Safari에 바로 있어요.'
  const searchTip = search
    ? ` 메뉴가 안 보이면 설정 맨 위 돋보기(검색)에 "${search}"${objectParticle(search)} 입력해 보세요.`
    : ''
  if (device === 'galaxy') return `삼성 갤럭시 기준이에요.${searchTip}`
  return `휴대폰마다 메뉴 이름이 조금 달라요.${searchTip || ' 메뉴 이름이 다르면 비슷한 이름을 찾아 주세요.'}`
}

function StepPage({ index, total, device, search, title, text, mock, onTarget, children }) {
  return (
    <div className="space-y-5">
      <ol className="flex gap-2" aria-label={`전체 ${total}단계 중 ${index + 1}단계`}>
        {Array.from({ length: total }, (_, i) => (
          <li
            key={i}
            className={`h-2 flex-1 rounded-full ${i < index ? 'bg-emerald-600' : i === index ? 'bg-amber-400' : 'bg-stone-300'}`}
          />
        ))}
      </ol>
      <div>
        <p className="text-base font-bold text-stone-600">
          없애기 {index + 1} / {total}
        </p>
        <h3 className="text-2xl font-extrabold">
          {index + 1}단계. {title}
        </h3>
      </div>
      <p className="text-xl leading-snug" aria-live="polite">
        {text}
      </p>
      {mock && (
        <div className="fixed-text">
          <p className="mb-2 text-base text-stone-600">휴대폰 화면 (예시)</p>
          <Mock mock={mock} onTarget={onTarget ?? (() => {})} />
        </div>
      )}
      {children}
      <p className="flex gap-2 text-base text-stone-600">
        <Info className="mt-0.5 size-5 shrink-0" />
        {footnoteFor(device, search)}
      </p>
    </div>
  )
}

function FinishPage({ text, tips, onDone, onStartScan, onBack, ...stepProps }) {
  return (
    <StepPage {...stepProps} title="마지막 점검과 예방" text={text}>
      <section className="rounded-2xl bg-emerald-50 p-4 ring-1 ring-emerald-200">
        <p className="flex items-center gap-2 text-lg font-extrabold text-emerald-800">
          <ShieldCheck className="size-6" /> 이 광고 또 안 나오게 하는 법
        </p>
        <ul className="mt-2 space-y-2">
          {tips.map((tip) => (
            <li key={tip} className="flex gap-2 text-lg">
              <Check className="mt-1 size-5 shrink-0 text-emerald-700" strokeWidth={3} />
              {tip}
            </li>
          ))}
        </ul>
      </section>
      <ChoiceButton primary onClick={onDone}>
        <Check className="size-6" strokeWidth={3} /> 다 했어요
      </ChoiceButton>
      {onStartScan && (
        <ChoiceButton accent onClick={onStartScan}>
          <ScanSearch className="size-6" /> 싹쓸이 청소로 한 번 더 확인
        </ChoiceButton>
      )}
      <BackButton onClick={onBack} />
    </StepPage>
  )
}

function ChoiceButton({ primary = false, accent = false, onClick, children }) {
  const style = primary
    ? 'bg-emerald-700 text-white hover:bg-emerald-800 font-extrabold'
    : accent
      ? 'bg-white text-sky-800 ring-2 ring-sky-400 hover:bg-sky-50 font-bold'
      : 'bg-stone-100 text-stone-900 hover:bg-stone-200 font-bold'
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex min-h-16 w-full items-center justify-center gap-2 rounded-2xl px-4 text-xl ${style}`}
    >
      {children}
    </button>
  )
}

function BackButton({ onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-h-14 w-full items-center justify-center gap-1 rounded-2xl px-4 text-lg font-bold text-stone-700 hover:bg-stone-100"
    >
      <ChevronLeft className="size-6" /> 이전 단계로
    </button>
  )
}

function NavButtons({ onBack, onNext }) {
  return (
    <div className="grid grid-cols-2 gap-5">
      <button
        type="button"
        onClick={onBack}
        className="flex min-h-16 items-center justify-center gap-1 rounded-2xl bg-stone-100 px-3 text-xl font-bold hover:bg-stone-200"
      >
        <ChevronLeft className="size-6" /> 이전
      </button>
      <button
        type="button"
        onClick={onNext}
        className="flex min-h-16 items-center justify-center gap-1 rounded-2xl bg-emerald-700 px-3 text-xl font-extrabold text-white hover:bg-emerald-800"
      >
        다음 <ChevronRight className="size-6" />
      </button>
    </div>
  )
}

function DonePage({ onClose }) {
  return (
    <div className="space-y-5 text-center" role="status">
      <div className="animate-pop mx-auto grid size-20 place-items-center rounded-full bg-emerald-700 text-white">
        <Check className="size-12" strokeWidth={3} />
      </div>
      <p className="text-2xl font-extrabold">잘하셨어요!</p>
      <p className="text-lg text-stone-800">신고도 하고 광고도 정리했어요. 이제 휴대폰이 훨씬 안전해졌어요.</p>
      <p className="flex items-center justify-center gap-2 text-lg text-stone-800">
        <Phone className="size-5 text-amber-700" /> 그래도 광고가 뜨면 국번 없이 118
      </p>
      <button
        type="button"
        onClick={onClose}
        className="min-h-16 w-full rounded-2xl bg-stone-100 px-4 text-xl font-bold hover:bg-stone-200"
      >
        닫기
      </button>
    </div>
  )
}
