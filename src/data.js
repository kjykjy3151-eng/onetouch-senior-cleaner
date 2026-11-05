// 2026-11-05 14:32 KST
import { BatteryCharging, BatteryWarning, Gift, Link, ShieldAlert, Sparkles } from 'lucide-react'

// 시연용 가상 데이터: 스캔에서 감지되는 의심 앱
export const SUSPICIOUS_APPS = [
  {
    id: 'booster',
    name: '슈퍼 배터리 부스터',
    installed: '3일 전 설치',
    reason: '다른 앱 위에 광고를 계속 띄우고 있어요.',
    pattern: '광고 도배 패턴',
    icon: BatteryCharging,
  },
  {
    id: 'cleaner',
    name: '무료 폰 청소 PRO',
    installed: '어제 설치',
    reason: '"바이러스 감염" 가짜 경고 창을 띄우고 있어요.',
    pattern: '가짜 경고 팝업 패턴',
    icon: Sparkles,
  },
]

export const TOTAL_APPS = 42

export const REPORT_TYPES = [
  {
    id: 'virus',
    title: '가짜 바이러스 경고',
    desc: '"바이러스에 감염됐어요" 하며 겁을 주는 창',
    icon: ShieldAlert,
  },
  {
    id: 'battery',
    title: '가짜 배터리 경고',
    desc: '"배터리가 망가져요" 하며 설치를 권하는 창',
    icon: BatteryWarning,
  },
  {
    id: 'prize',
    title: '당첨, 경품 사기',
    desc: '"축하합니다! 당첨됐어요" 하는 창',
    icon: Gift,
  },
  {
    id: 'link',
    title: '이상한 링크, 설치 유도',
    desc: '모르는 앱을 깔라는 문자나 창',
    icon: Link,
  },
]

export const formatTime = (date) =>
  new Intl.DateTimeFormat('ko-KR', { hour: 'numeric', minute: '2-digit' }).format(date)

export const formatDateTime = (date) =>
  new Intl.DateTimeFormat('ko-KR', {
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date)
