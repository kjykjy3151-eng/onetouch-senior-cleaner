// 2026-11-05 14:32 KST
import { useEffect, useState } from 'react'
import AfterScreen from './components/AfterScreen'
import BeforeScreen from './components/BeforeScreen'
import ComparePanel from './components/ComparePanel'
import { useSpeech } from './hooks/useSpeech'

// 글자만 키우는 배율 (기본 18px 기준 약 21px, 24px)
const FONT_LEVELS = [
  { scale: 1, label: '보통' },
  { scale: 1.17, label: '크게' },
  { scale: 1.33, label: '아주 크게' },
]

export default function App() {
  const [mode, setMode] = useState('after') // before | after
  const [fontLevel, setFontLevel] = useState(0)
  const speech = useSpeech()

  useEffect(() => {
    document.documentElement.style.setProperty('--font-scale', FONT_LEVELS[fontLevel].scale)
    document.documentElement.dataset.font = fontLevel
  }, [fontLevel])

  const cycleFont = () => {
    const next = (fontLevel + 1) % FONT_LEVELS.length
    setFontLevel(next)
    speech.speak(`글자 크기를 ${FONT_LEVELS[next].label}로 바꿨습니다.`)
  }

  const changeMode = (next) => {
    window.speechSynthesis?.cancel()
    setMode(next)
  }

  return (
    <div className="flex h-dvh flex-col items-center gap-3 bg-[#EFE7DA] text-stone-900 sm:h-auto sm:min-h-dvh sm:justify-center sm:gap-5 sm:py-6">
      <ModeToggle mode={mode} onChange={changeMode} />

      <div className="flex min-h-0 w-full flex-1 items-start justify-center gap-10 sm:flex-none">
        <div className="relative flex h-full w-full flex-col overflow-hidden bg-[#FFF9F0] sm:h-[min(860px,calc(100dvh-7rem))] sm:w-[412px] sm:rounded-[3rem] sm:border-[10px] sm:border-stone-800 sm:shadow-2xl">
          {mode === 'before' ? (
            <BeforeScreen />
          ) : (
            <AfterScreen
              speech={speech}
              fontLevel={fontLevel}
              fontLevels={FONT_LEVELS.length}
              onCycleFont={cycleFont}
            />
          )}
        </div>
        <ComparePanel mode={mode} />
      </div>
    </div>
  )
}

// 해커톤 발표용 Before / After 비교 토글
function ModeToggle({ mode, onChange }) {
  const options = [
    { id: 'before', label: 'Before', sub: '개선 전 불안 화면', active: 'bg-rose-600 text-white' },
    { id: 'after', label: 'After', sub: '개선 후 안심 화면', active: 'bg-emerald-700 text-white' },
  ]

  return (
    <div
      role="tablist"
      aria-label="개선 전후 화면 비교"
      className="fixed-text mt-2 flex shrink-0 items-center gap-1 rounded-full bg-white p-1 shadow-sm ring-1 ring-stone-200 sm:mt-0"
    >
      {options.map((o, i) => (
        <div key={o.id} className="flex items-center gap-1">
          {i === 1 && <span className="px-1 text-base font-black text-stone-600">VS</span>}
          <button
            type="button"
            role="tab"
            aria-selected={mode === o.id}
            onClick={() => onChange(o.id)}
            className={`min-h-12 rounded-full px-4 text-lg font-bold transition sm:px-5 ${
              mode === o.id ? o.active : 'text-stone-700 hover:text-stone-900'
            }`}
          >
            {o.label}
            <span className="ml-1.5 hidden font-medium opacity-80 sm:inline">{o.sub}</span>
          </button>
        </div>
      ))}
    </div>
  )
}
