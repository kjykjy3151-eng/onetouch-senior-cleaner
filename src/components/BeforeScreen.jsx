// 2026-11-05 14:32 KST
import { useEffect, useState } from 'react'
import { AlertTriangle, BatteryCharging, Cpu, Trash2, Zap } from 'lucide-react'
import StatusBar from './StatusBar'

// 개선 전 화면: 가짜 백신 광고와 닮아 불안을 자극하던 기존 디자인 재현
export default function BeforeScreen() {
  const [sec, setSec] = useState(59)
  const [shake, setShake] = useState(false)

  useEffect(() => {
    const timer = setInterval(() => setSec((s) => (s > 0 ? s - 1 : 59)), 1000)
    return () => clearInterval(timer)
  }, [])

  const tools = [
    { label: '부스터', icon: Zap },
    { label: '배터리', icon: BatteryCharging },
    { label: '정크 삭제', icon: Trash2 },
    { label: 'CPU 냉각', icon: Cpu },
  ]

  return (
    <div className="flex h-full flex-col bg-neutral-100 text-neutral-800">
      <StatusBar light />
      <header className="flex items-center justify-between bg-neutral-300 px-4 py-2">
        <div className="flex items-center gap-2">
          <div className="size-7 rounded bg-neutral-400" />
          <span className="font-bold text-neutral-600">폰 클리너 마스터</span>
        </div>
        <span className="text-xs text-neutral-500">v1.0.3</span>
      </header>

      <div className="flex-1 space-y-3 overflow-y-auto px-3 py-3">
        <div className="rounded bg-neutral-300 py-3 text-center text-xs text-neutral-500">
          AD 광고 배너 영역
        </div>

        <section className="animate-pulse rounded-xl bg-[#FF6B5B] p-5 text-white shadow-lg">
          <AlertTriangle className="size-14" strokeWidth={2.5} />
          <p className="mt-2 text-2xl font-black">경고!! 바이러스 감염!!</p>
          <p className="mt-1 font-bold">휴대폰에서 위험한 바이러스 3개가 발견되었습니다!</p>
          <p className="mt-3 text-sm">
            <span className="font-mono text-xl font-black">00:{String(sec).padStart(2, '0')}</span> 안에
            청소하지 않으면 사진과 연락처가 삭제될 수 있습니다
          </p>
        </section>

        <button
          type="button"
          onClick={() => {
            setShake(true)
            setTimeout(() => setShake(false), 1200)
          }}
          className={`w-full rounded-lg bg-red-600 py-4 text-xl font-black text-white shadow-md ${
            shake ? 'animate-shake' : ''
          }`}
        >
          지금 즉시 청소하기 ▶▶
        </button>
        {shake && (
          <p className="text-center text-xs text-red-600">권한을 허용해야 청소할 수 있습니다!!</p>
        )}

        <div className="grid grid-cols-4 gap-2 grayscale">
          {tools.map(({ label, icon: Icon }) => (
            <div key={label} className="flex flex-col items-center gap-1 rounded bg-white p-2">
              <Icon className="size-6 text-neutral-500" />
              <span className="text-xs text-neutral-500">{label}</span>
            </div>
          ))}
        </div>

        <div className="rounded border-2 border-dashed border-yellow-500 bg-yellow-100 p-3 text-center text-sm font-bold text-yellow-800">
          ★ 축하합니다 ★ 경품 당첨 여부 확인하기 &gt;
        </div>
        <div className="rounded bg-neutral-300 py-6 text-center text-xs text-neutral-500">
          AD 광고 배너 영역
        </div>
      </div>
    </div>
  )
}
