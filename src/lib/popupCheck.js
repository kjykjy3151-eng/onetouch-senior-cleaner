// 2026-11-05 14:41 KST
// AI 팝업 판별: 이미지 준비, 서버 호출, 시연용 예시 팝업과 예시 결과

const MAX_SIDE = 1280

// 사진을 적당한 크기의 JPEG(base64)로 줄인다. 요청 크기와 응답 시간을 줄이기 위함.
export async function toJpegBase64(src) {
  // decode()는 화면이 가려진 탭에서 멈출 수 있어 onload를 쓴다.
  const img = await new Promise((resolve, reject) => {
    const el = new Image()
    el.onload = () => resolve(el)
    el.onerror = () => reject(new Error('이미지를 읽지 못했습니다.'))
    el.src = src
  })
  const scale = Math.min(1, MAX_SIDE / Math.max(img.naturalWidth, img.naturalHeight))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(img.naturalWidth * scale)
  canvas.height = Math.round(img.naturalHeight * scale)
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = '#fff'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
  return canvas.toDataURL('image/jpeg', 0.85).split(',')[1]
}

export function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

// 예시 팝업은 AI 연결이 없거나 불안정할 때도 시연할 수 있도록 준비한 결과로 대신한다.
export const DEMO_FALLBACK_CODES = ['no_key', 'no_server', 'rate_limit', 'network', 'api']

// 사용자 피드백 보내기. actual: 틀렸을 때 실제로는 무엇이었는지 (fake | real | unknown)
export async function sendFeedback(caseId, correct, actual = null) {
  try {
    const res = await fetch('/api/analyze-popup/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ caseId, correct, actual }),
    })
    return res.ok
  } catch {
    return false
  }
}

// 쌓인 판별 사례 현황 (발표 패널용)
export async function fetchAiStats() {
  try {
    const res = await fetch('/api/analyze-popup/stats')
    if (res.ok) return await res.json()
  } catch {
    // 서버가 없으면 현황을 보여 주지 않는다.
  }
  return null
}

// 서버가 어떤 AI에 연결됐는지 묻는다. 정적 배포처럼 서버가 없으면 연결 없음으로 본다.
export async function fetchAiInfo() {
  try {
    const res = await fetch('/api/analyze-popup/info')
    if (res.ok) return await res.json()
  } catch {
    // 연결 실패는 아래 기본값으로 처리한다.
  }
  return { provider: null, model: null, freeTier: false }
}

const ERROR_MESSAGES = {
  no_key: 'AI 연결 설정(API 키)이 아직 없어요.',
  no_server: '이 시연 주소에서는 AI 판별이 꺼져 있어요. 처음으로 돌아가 예시 팝업으로 체험해 보세요.',
  auth: 'AI 연결 키가 올바르지 않아요.',
  rate_limit: '지금 요청이 많아요. 잠시 뒤에 다시 해 주세요.',
  network: 'AI 서버에 연결하지 못했어요. 인터넷을 확인해 주세요.',
  too_large: '사진이 너무 커요. 다른 사진으로 해 주세요.',
  credits: 'AI 사용 크레딧이 부족해요.',
}

// 반환: { ok: true, result } 또는 { ok: false, code, message }
export async function requestAnalysis(dataUrl) {
  try {
    const data = await toJpegBase64(dataUrl)
    const res = await fetch('/api/analyze-popup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mediaType: 'image/jpeg', data }),
    })
    if (res.ok) return { ok: true, result: await res.json() }
    // 404, 405: 정적 배포(GitHub Pages 등)라서 AI 서버가 없는 경우 (Pages 는 POST 에 405 로 답한다)
    const code = [404, 405].includes(res.status) ? 'no_server' : (await res.json().catch(() => ({}))).error
    return { ok: false, code, message: ERROR_MESSAGES[code] ?? 'AI 분석 중 문제가 생겼어요.' }
  } catch {
    return { ok: false, code: 'network', message: ERROR_MESSAGES.network }
  }
}

// ---- 시연용 예시 팝업 (캔버스로 그려서 실제 이미지처럼 AI에 보낸다) ----

function roundRect(ctx, x, y, w, h, r, fill) {
  ctx.beginPath()
  ctx.roundRect(x, y, w, h, r)
  ctx.fillStyle = fill
  ctx.fill()
}

function text(ctx, str, x, y, { size = 28, color = '#111', weight = 400, align = 'center' } = {}) {
  ctx.font = `${weight} ${size}px "Malgun Gothic", "Apple SD Gothic Neo", sans-serif`
  ctx.fillStyle = color
  ctx.textAlign = align
  ctx.fillText(str, x, y)
}

function drawFakeVirus(ctx, w, h) {
  ctx.fillStyle = '#e5e5e5'
  ctx.fillRect(0, 0, w, h)
  roundRect(ctx, 20, 20, w - 40, 56, 28, '#fff')
  text(ctx, '⚠ free-phone-cleaner.xyz', 50, 57, { size: 22, color: '#666', align: 'left' })
  roundRect(ctx, 40, 140, w - 80, 620, 24, '#FF4B3A')
  text(ctx, '⚠', w / 2, 270, { size: 110, color: '#fff' })
  text(ctx, '경고!! 바이러스 감염!!', w / 2, 360, { size: 44, color: '#fff', weight: 800 })
  text(ctx, '휴대폰에서 바이러스 3개가', w / 2, 430, { size: 30, color: '#fff' })
  text(ctx, '발견되었습니다!', w / 2, 472, { size: 30, color: '#fff' })
  text(ctx, '00:59 안에 청소하지 않으면', w / 2, 540, { size: 28, color: '#fff', weight: 700 })
  text(ctx, '사진과 연락처가 삭제됩니다', w / 2, 580, { size: 28, color: '#fff', weight: 700 })
  roundRect(ctx, 90, 630, w - 180, 90, 16, '#FFE14D')
  text(ctx, '지금 바로 청소 앱 설치 ▶', w / 2, 688, { size: 32, color: '#B00', weight: 800 })
  text(ctx, 'AD', w - 60, h - 30, { size: 20, color: '#999' })
}

function drawRealPermission(ctx, w, h) {
  ctx.fillStyle = '#5f6368'
  ctx.fillRect(0, 0, w, h)
  roundRect(ctx, 40, 260, w - 80, 400, 36, '#F3F1F8')
  text(ctx, '🔔', w / 2, 345, { size: 50 })
  text(ctx, "'날씨' 앱에서 알림을", w / 2, 420, { size: 32, color: '#1d1b20', weight: 600 })
  text(ctx, '보내도록 허용하시겠습니까?', w / 2, 465, { size: 32, color: '#1d1b20', weight: 600 })
  roundRect(ctx, 80, 510, w - 160, 60, 30, '#D9D2F0')
  text(ctx, '허용', w / 2, 550, { size: 28, color: '#4F378B', weight: 600 })
  roundRect(ctx, 80, 585, w - 160, 60, 30, '#D9D2F0')
  text(ctx, '허용 안함', w / 2, 625, { size: 28, color: '#4F378B', weight: 600 })
}

export const SAMPLE_POPUPS = [
  {
    id: 'fake',
    label: '가짜 바이러스 경고 예시',
    draw: drawFakeVirus,
    demoResult: {
      verdict: 'fake',
      confidence: 'high',
      safetyNote: null,
      pattern: 'fake_virus',
      patternName: '가짜 바이러스, 보안 경고',
      verify_tip: '인터넷 주소를 확인하세요. 낯선 주소에서 뜬 경고 창은 휴대폰이 보낸 것이 아니에요.',
      caseId: null,
      headline: '가짜 경고예요. 누르지 마세요.',
      explanation:
        '휴대폰은 이렇게 빨간 창으로 "바이러스 3개"를 알려 주지 않아요. 겁을 줘서 다른 앱을 깔게 하려는 광고예요.',
      clues: [
        '느낌표와 빨간색, 카운트다운으로 서두르게 해요.',
        '"청소 앱 설치"를 누르라고 해요.',
        '휴대폰 화면이 아니라 낯선 인터넷 주소 안에 떠 있어요.',
      ],
      action: '아무 버튼도 누르지 말고 뒤로 가기를 눌러 창을 닫으세요.',
      report_type: 'virus',
    },
  },
  {
    id: 'real',
    label: '진짜 휴대폰 알림 예시',
    draw: drawRealPermission,
    demoResult: {
      verdict: 'real',
      confidence: 'high',
      safetyNote: null,
      pattern: 'permission_dialog',
      patternName: '권한 요청 창',
      verify_tip: '휴대폰 기본 모양의 창이고 고를 수 있는 버튼이 있는지 확인하세요.',
      caseId: null,
      headline: '진짜 휴대폰 알림이에요.',
      explanation:
        '휴대폰이 직접 띄우는 알림 허용 창이에요. 겁을 주거나 앱 설치를 요구하지 않아요.',
      clues: [
        '휴대폰 기본 창 모양과 똑같아요.',
        '"허용", "허용 안함" 중에서 고를 수 있어요.',
        '서두르게 하는 말이나 광고 표시가 없어요.',
      ],
      action: '날씨 알림을 받고 싶으면 "허용", 아니면 "허용 안함"을 누르면 돼요.',
      report_type: 'none',
    },
  },
]

export function renderSample(sample) {
  const canvas = document.createElement('canvas')
  canvas.width = 540
  canvas.height = 900
  sample.draw(canvas.getContext('2d'), canvas.width, canvas.height)
  return canvas.toDataURL('image/png')
}
