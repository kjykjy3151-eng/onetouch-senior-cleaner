// 2026-11-05 14:32 KST
import { useEffect, useState } from 'react'
import AfterScreen from './components/AfterScreen'
import ComparePanel from './components/ComparePanel'
import { useSpeech } from './hooks/useSpeech'

// 글자만 키우는 배율 (기본 18px 기준 약 21px, 24px)
const FONT_LEVELS = [
  { scale: 1, label: '보통' },
  { scale: 1.17, label: '크게' },
  { scale: 1.33, label: '아주 크게' },
]

export default function App() {
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

  return (
    <div className="flex h-dvh flex-col items-center bg-[#EFE7DA] text-stone-900 sm:h-auto sm:min-h-dvh sm:justify-center sm:py-6">
      <div className="flex min-h-0 w-full flex-1 items-start justify-center gap-10 sm:flex-none">
        <div className="relative flex h-full w-full flex-col overflow-hidden bg-[#FFF9F0] sm:h-[min(860px,calc(100dvh-3rem))] sm:w-[412px] sm:rounded-[3rem] sm:border-[10px] sm:border-stone-800 sm:shadow-2xl">
          <AfterScreen
            speech={speech}
            fontLevel={fontLevel}
            fontLevels={FONT_LEVELS.length}
            onCycleFont={cycleFont}
          />
        </div>
        <ComparePanel />
      </div>
    </div>
  )
}
