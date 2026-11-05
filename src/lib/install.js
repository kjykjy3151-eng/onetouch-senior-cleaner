// 2026-11-05 15:27 KST
// 앱스토어 없이 설치하기: 설치 주소, 홈 화면에 추가(PWA), 공유 링크

// 가족 공유 링크가 가리킬 주소. 배포했다면 .env 의 VITE_PUBLIC_URL 에 실제 주소를 넣는다.
// 링크에 ?install=1 이 붙어 있으면 앱이 열리자마자 '홈 화면에 추가' 안내를 띄운다.
export function getInstallUrl() {
  const base = import.meta.env.VITE_PUBLIC_URL || `${location.origin}${location.pathname}`
  const url = new URL(base)
  url.searchParams.set('install', '1')
  return url.toString()
}

export function openedFromInstallLink() {
  return new URLSearchParams(location.search).get('install') === '1'
}

export const isStandalone = () =>
  window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true

export function getPlatform() {
  const ua = navigator.userAgent
  if (/iPhone|iPad|iPod/i.test(ua)) return 'ios'
  if (/Android/i.test(ua)) return 'android'
  return 'desktop'
}

// 크롬 계열 브라우저는 설치 가능할 때 beforeinstallprompt 를 보낸다.
// 앱이 뜨자마자 올 수 있으므로 모듈을 불러오는 시점에 바로 받아 둔다.
let deferredPrompt = null
const listeners = new Set()
const notify = () => listeners.forEach((fn) => fn())

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault()
  deferredPrompt = e
  notify()
})
window.addEventListener('appinstalled', () => {
  deferredPrompt = null
  notify()
})

export const canPromptInstall = () => deferredPrompt !== null

export function onInstallChange(fn) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

// 반환: 'accepted' | 'dismissed' | 'unavailable'
export async function promptInstall() {
  if (!deferredPrompt) return 'unavailable'
  const prompt = deferredPrompt
  deferredPrompt = null
  await prompt.prompt()
  const { outcome } = await prompt.userChoice
  notify()
  return outcome
}

export const getInstallHost = () => new URL(getInstallUrl()).host

// 공유 메시지: 받는 분이 주소를 직접 확인하도록 공식 주소를 함께 적는다.
export const getShareText = () =>
  `부모님 휴대폰을 지켜 주는 원터치 클리너예요. 아래 링크를 누르고 "홈 화면에 추가"만 눌러 주세요. 주소가 ${getInstallHost()} 인지 꼭 확인하시고, 앱 파일(APK)을 깔라고 하면 누르지 마세요.`

// 반환: 'shared' | 'copied' | 'cancelled' | 'failed'
export async function shareInstallLink() {
  const url = getInstallUrl()
  if (navigator.share) {
    try {
      await navigator.share({ title: '원터치 클리너', text: getShareText(), url })
      return 'shared'
    } catch (err) {
      if (err.name === 'AbortError') return 'cancelled'
    }
  }
  try {
    await navigator.clipboard.writeText(`${getShareText()}\n${url}`)
    return 'copied'
  } catch {
    return 'failed'
  }
}
