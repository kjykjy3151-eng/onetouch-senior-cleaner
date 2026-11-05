// 2026-11-05 15:27 KST
import { useEffect, useMemo, useState } from 'react'
import {
  Check,
  ChevronLeft,
  ChevronRight,
  House,
  ShieldCheck,
  Share2,
  X,
} from 'lucide-react'
import {
  canPromptInstall,
  getInstallUrl,
  getShareText,
  getPlatform,
  isStandalone,
  onInstallChange,
  promptInstall,
  shareInstallLink,
} from '../lib/install'

const METHODS = [
  {
    id: 'pwa',
    icon: House,
    title: '홈 화면에 추가',
    desc: '앱스토어 없이 바탕화면에 아이콘 만들기',
  },
  {
    id: 'share',
    icon: Share2,
    title: '자녀가 링크 보내기',
    desc: '카카오톡으로 받은 링크를 한 번 누르기',
  },
]

const PAGE_SPEECH = {
  menu: '앱스토어에서 찾지 않아도 돼요. 편한 방법을 하나 골라 주세요.',
  pwa: '홈 화면에 추가하면 바탕화면에 앱 아이콘이 생겨요.',
  share: '부모님께 설치 링크를 보낼 수 있어요.',
}

// 앱스토어 검색 없이 설치하는 2가지 방법. 한 화면에 한 가지만 보여 준다.
export default function InstallModal({ speak, onClose, initialPage = 'menu' }) {
  const [page, setPage] = useState(initialPage)
  const installUrl = useMemo(() => getInstallUrl(), [])

  useEffect(() => {
    speak(PAGE_SPEECH[page])
  }, [page, speak])

  return (
    <div
      className="absolute inset-0 z-30 flex items-end bg-stone-900/50 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="쉽게 설치하기"
    >
      <div className="animate-rise max-h-full w-full overflow-y-auto rounded-t-3xl bg-white p-5 ring-1 ring-stone-200">
        <div className="flex items-center justify-between gap-5">
          {page === 'menu' ? (
            <h2 className="text-xl font-extrabold">쉽게 설치하는 2가지 방법</h2>
          ) : (
            <button
              type="button"
              onClick={() => setPage('menu')}
              className="flex min-h-14 items-center gap-1 rounded-xl bg-stone-100 pr-4 pl-2 text-lg font-bold hover:bg-stone-200"
            >
              <ChevronLeft className="size-6" />
              뒤로
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            aria-label="설치 안내 닫기"
            className="grid size-14 shrink-0 place-items-center rounded-xl bg-stone-100 hover:bg-stone-200"
          >
            <X className="size-6" />
          </button>
        </div>

        <div className="mt-4">
          {page === 'menu' && <MenuPage onPick={setPage} />}
          {page === 'pwa' && <PwaPage speak={speak} />}
          {page === 'share' && <SharePage url={installUrl} speak={speak} />}
        </div>
      </div>
    </div>
  )
}

// 링크 설치와 "공식 스토어에서만 설치하세요" 수칙이 부딪히지 않도록 차이를 분명히 알린다.
function SafeInstallNote() {
  return (
    <div className="flex gap-2 rounded-2xl bg-sky-50 p-4 text-lg ring-1 ring-sky-300">
      <ShieldCheck className="mt-1 size-6 shrink-0 text-sky-700" />
      <p>
        이 앱은 <b>앱 파일(APK)을 내려받지 않아요.</b> 홈 화면에 바로가기를 만드는 방식이라, 다른 앱을 지우거나
        휴대폰 설정을 바꾸는 권한이 없어요. 링크가 <b>"APK 설치"나 "출처를 알 수 없는 앱 허용"</b>을 요구하면 가짜예요.
      </p>
    </div>
  )
}

function MenuPage({ onPick }) {
  return (
    <div className="space-y-5">
      <p className="text-lg text-stone-700">앱스토어에서 찾지 않아도 돼요. 편한 방법을 하나 골라 주세요.</p>
      <SafeInstallNote />
      <ul className="space-y-5">
        {METHODS.map(({ id, icon: Icon, title, desc }) => (
          <li key={id}>
            <button
              type="button"
              onClick={() => onPick(id)}
              className="flex min-h-20 w-full items-center gap-4 rounded-2xl bg-stone-100 px-4 py-3 text-left transition hover:bg-stone-200"
            >
              <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-emerald-100 text-emerald-700">
                <Icon className="size-8" />
              </span>
              <span className="flex-1">
                <span className="block text-xl font-bold">{title}</span>
                <span className="block text-lg text-stone-700">{desc}</span>
              </span>
              <ChevronRight className="size-6 text-stone-600" />
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}

const PWA_GUIDE = {
  ios: [
    '화면 아래 가운데 공유 버튼(네모에 위쪽 화살표)을 눌러요.',
    '목록을 올려서 "홈 화면에 추가"를 눌러요.',
    '오른쪽 위 "추가"를 누르면 끝이에요.',
  ],
  android: [
    '오른쪽 위 점 3개(⋮) 메뉴를 눌러요.',
    '"홈 화면에 추가" 또는 "앱 설치"를 눌러요.',
    '"설치"를 누르면 바탕화면에 아이콘이 생겨요.',
  ],
  desktop: ['주소창 오른쪽의 설치 아이콘을 눌러요.', '"설치"를 누르면 끝이에요.'],
}

function PwaPage({ speak }) {
  const [canPrompt, setCanPrompt] = useState(canPromptInstall)
  const [result, setResult] = useState(isStandalone() ? 'installed' : null)
  const platform = getPlatform()

  useEffect(() => onInstallChange(() => setCanPrompt(canPromptInstall())), [])

  const install = async () => {
    const outcome = await promptInstall()
    if (outcome === 'accepted') {
      setResult('installed')
      speak('바탕화면에 앱 아이콘이 생겼어요.')
    }
  }

  return (
    <div className="space-y-5">
      <h3 className="text-center text-2xl font-extrabold">홈 화면에 추가</h3>
      <p className="text-center text-lg text-stone-700">
        앱스토어에서 내려받지 않아도 바탕화면에 앱 아이콘이 생겨요.
      </p>

      {result === 'installed' ? (
        <div className="space-y-3 py-4 text-center" role="status">
          <div className="animate-pop mx-auto grid size-20 place-items-center rounded-full bg-emerald-700 text-white">
            <Check className="size-12" strokeWidth={3} />
          </div>
          <p className="text-2xl font-extrabold">홈 화면에 추가됐어요!</p>
          <p className="text-lg text-stone-700">바탕화면의 원터치 클리너 아이콘을 누르면 바로 열려요.</p>
        </div>
      ) : canPrompt ? (
        <button
          type="button"
          onClick={install}
          className="flex min-h-20 w-full items-center justify-center gap-3 rounded-2xl bg-emerald-700 px-4 text-2xl font-extrabold text-white hover:bg-emerald-800"
        >
          <House className="size-8" />
          홈 화면에 추가하기
        </button>
      ) : (
        <ol className="space-y-3" aria-label="홈 화면에 추가하는 방법">
          {PWA_GUIDE[platform].map((step, i) => (
            <li key={step} className="flex items-start gap-3 rounded-xl bg-stone-100 px-4 py-3 text-lg">
              <span className="grid size-8 shrink-0 place-items-center rounded-full bg-emerald-700 font-extrabold text-white">
                {i + 1}
              </span>
              {step}
            </li>
          ))}
        </ol>
      )}
      {!canPrompt && result !== 'installed' && platform === 'ios' && (
        <p className="text-base text-stone-600">아이폰은 사파리(Safari)에서 열어야 이 메뉴가 보여요.</p>
      )}
    </div>
  )
}

const SHARE_RESULT = {
  shared: '링크를 보냈어요.',
  copied: '링크를 복사했어요. 카카오톡 대화창에 붙여 넣어 주세요.',
  failed: '보내지 못했어요. 위 메시지 속 주소를 직접 알려 주세요.',
}

function SharePage({ url, speak }) {
  const [result, setResult] = useState(null)

  const share = async () => {
    const outcome = await shareInstallLink()
    if (outcome === 'cancelled') return
    setResult(outcome)
    speak(SHARE_RESULT[outcome])
  }

  return (
    <div className="space-y-5">
      <h3 className="text-center text-2xl font-extrabold">부모님께 링크 보내기</h3>
      <p className="text-center text-lg text-stone-700">
        자녀가 보내 준 링크를 부모님이 한 번 누르면 바로 설치 화면이 열려요.
      </p>

      <section className="rounded-2xl bg-stone-100 p-4">
        <p className="text-base font-bold text-stone-600">보낼 메시지</p>
        <p className="mt-2 rounded-2xl rounded-tl-sm bg-white p-3 text-lg text-stone-900 ring-1 ring-stone-200">
          {getShareText()}
          <span className="mt-1 block text-base break-all text-blue-800 underline">{url}</span>
        </p>
      </section>

      <button
        type="button"
        onClick={share}
        className="flex min-h-20 w-full items-center justify-center gap-3 rounded-2xl bg-emerald-700 px-4 text-2xl font-extrabold text-white hover:bg-emerald-800"
      >
        <Share2 className="size-8" />
        카카오톡 등으로 보내기
      </button>
      {result && (
        <p
          className={`text-center text-lg font-semibold ${result === 'failed' ? 'text-amber-800' : 'text-emerald-800'}`}
          role="status"
        >
          {SHARE_RESULT[result]}
        </p>
      )}
    </div>
  )
}
