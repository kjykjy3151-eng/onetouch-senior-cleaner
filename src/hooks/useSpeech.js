// 2026-11-05 14:32 KST
import { useCallback, useRef, useState } from 'react'

// 브라우저 내장 음성 합성(TTS)으로 화면 안내를 읽어 준다.
export function useSpeech() {
  const [enabled, setEnabled] = useState(false)
  const enabledRef = useRef(false)

  const speak = useCallback((text, force = false) => {
    if (!text || !('speechSynthesis' in window)) return
    if (!enabledRef.current && !force) return
    const synth = window.speechSynthesis
    synth.cancel()
    const utter = new SpeechSynthesisUtterance(text)
    utter.lang = 'ko-KR'
    utter.rate = 0.9
    const koVoice = synth.getVoices().find((v) => v.lang.startsWith('ko'))
    if (koVoice) utter.voice = koVoice
    synth.speak(utter)
  }, [])

  const toggle = useCallback(() => {
    const next = !enabledRef.current
    enabledRef.current = next
    setEnabled(next)
    if (next) speak('음성 안내를 켰습니다.', true)
    else window.speechSynthesis?.cancel()
  }, [speak])

  return { enabled, toggle, speak }
}
