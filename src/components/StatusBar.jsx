// 2026-11-05 14:32 KST
import { useEffect, useState } from 'react'
import { formatTime } from '../data'

// 휴대폰 상단 상태 표시줄 모형
export default function StatusBar({ light = false }) {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30_000)
    return () => clearInterval(timer)
  }, [])

  return (
    <div
      className={`fixed-text flex shrink-0 items-center justify-between px-6 pt-3 pb-1 text-base font-semibold ${
        light ? 'bg-neutral-300 text-neutral-700' : 'text-stone-700'
      }`}
      aria-hidden="true"
    >
      <span>{formatTime(now)}</span>
      <span className="flex items-center gap-1.5">
        <span className="tracking-tighter">LTE</span>
        <span className="relative h-3.5 w-7 rounded-sm border-2 border-current">
          <span className="absolute inset-0.5 right-2 rounded-[1px] bg-current" />
        </span>
      </span>
    </div>
  )
}
