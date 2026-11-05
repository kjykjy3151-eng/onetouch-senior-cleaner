// 2026-11-05 14:32 KST
import { useEffect, useMemo, useState } from 'react'
import {
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronUp,
  Flag,
  Loader2,
  Lock,
  Phone,
  Send,
  Trophy,
  X,
} from 'lucide-react'
import { REPORT_TYPES, formatDateTime } from '../data'
import { addMyReport, getMonthlyRanking } from '../lib/reportStats'

const UNKNOWN = '잘 모르겠어요'
const TOP = 5

// 가짜 팝업, 악성 앱 신고 시뮬레이션 (KISA 신고 양식 형태로 자동 작성)
// startPage: 'rank' 면 이번 달 신고 순위부터, 'form' 이면 신고 양식부터 보여 준다.
export default function ReportModal({ apps, initialType = null, startPage = 'form', speak, onClose }) {
  const [page, setPage] = useState(startPage) // rank | form
  const [typeId, setTypeId] = useState(initialType)
  const [appName, setAppName] = useState(UNKNOWN)
  const [status, setStatus] = useState('form') // form | sending | sent
  const [receipt, setReceipt] = useState('')
  const [lastReported, setLastReported] = useState(null)
  const [now] = useState(() => new Date())
  const type = REPORT_TYPES.find((t) => t.id === typeId)

  useEffect(() => {
    if (status === 'sent') speak('신고가 접수되었어요. 알려 주셔서 고맙습니다.')
    else if (page === 'form') speak('어떤 화면을 보셨나요? 비슷한 것을 하나 눌러 주세요.')
  }, [page, status, speak])

  useEffect(() => {
    if (status !== 'sending') return
    const timer = setTimeout(() => {
      const pad = (n) => String(n).padStart(2, '0')
      const ymd = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}`
      setReceipt(`KISA-${ymd}-${Math.floor(1000 + Math.random() * 9000)}`)
      if (appName !== UNKNOWN) {
        addMyReport(appName, typeId)
        setLastReported(appName)
      }
      setStatus('sent')
    }, 1000)
    return () => clearTimeout(timer)
  }, [status, now, appName, typeId])

  const chooseType = (t) => {
    setTypeId(t.id)
    speak(`${t.title}를 고르셨어요. 아래 신고 보내기 버튼을 눌러 주세요.`)
  }

  const showRanking = () => {
    setStatus('form')
    setPage('rank')
  }

  return (
    <div
      className="absolute inset-0 z-30 flex items-end bg-stone-900/50 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="이상한 팝업 신고"
    >
      <div className="animate-rise max-h-full w-full overflow-y-auto rounded-t-3xl bg-white p-5 ring-1 ring-stone-200">
        <div className="flex items-center justify-between gap-5">
          {page === 'form' && startPage === 'rank' && status !== 'sent' ? (
            <button
              type="button"
              onClick={() => setPage('rank')}
              className="flex min-h-14 items-center gap-1 rounded-xl bg-stone-100 pr-4 pl-2 text-lg font-bold hover:bg-stone-200"
            >
              <ChevronLeft className="size-6" />
              순위 보기
            </button>
          ) : (
            <h2 className="text-xl font-extrabold">{page === 'rank' && status !== 'sent' ? '신고 많은 앱 순위' : '이상한 팝업 신고'}</h2>
          )}
          <button
            type="button"
            onClick={onClose}
            aria-label="신고 창 닫기"
            className="grid size-14 shrink-0 place-items-center rounded-xl bg-stone-100 hover:bg-stone-200"
          >
            <X className="size-6" />
          </button>
        </div>

        {status === 'sent' ? (
          <SentView receipt={receipt} reported={lastReported} onRank={showRanking} onClose={onClose} />
        ) : page === 'rank' ? (
          <RankView speak={speak} highlight={lastReported} onReport={() => setPage('form')} />
        ) : (
          <>
            <p className="mt-2 text-lg text-stone-700">어떤 화면을 보셨나요? 비슷한 것을 눌러 주세요.</p>

            <div className="mt-4 grid grid-cols-2 gap-5 big:grid-cols-1">
              {REPORT_TYPES.map((t) => {
                const Icon = t.icon
                const isOn = t.id === typeId
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => chooseType(t)}
                    aria-pressed={isOn}
                    className={`flex min-h-32 flex-col items-start gap-1.5 rounded-2xl p-3 text-left ring-2 transition ${
                      isOn ? 'bg-emerald-100 ring-emerald-600' : 'bg-stone-100 ring-transparent hover:ring-stone-400'
                    }`}
                  >
                    <Icon className={`size-7 ${isOn ? 'text-emerald-700' : 'text-amber-700'}`} />
                    <span className="text-lg leading-tight font-bold">{t.title}</span>
                    <span className="text-lg leading-snug text-stone-700">{t.desc}</span>
                  </button>
                )
              })}
            </div>

            {type && (
              <section className="animate-rise mt-5 rounded-2xl bg-stone-100 p-4">
                <p className="text-base font-bold text-stone-600">보낼 내용 (KISA 신고 양식으로 자동 작성)</p>
                <dl className="mt-3 space-y-2 text-lg">
                  <Row label="신고 유형" value={type.title} />
                  <div>
                    <dt className="text-stone-600">의심 앱</dt>
                    <dd className="mt-2 flex flex-wrap gap-5">
                      {[...apps.map((a) => a.name), UNKNOWN].map((name) => (
                        <button
                          key={name}
                          type="button"
                          onClick={() => setAppName(name)}
                          aria-pressed={appName === name}
                          className={`min-h-14 rounded-xl px-4 text-lg font-semibold ${
                            appName === name
                              ? 'bg-emerald-700 text-white'
                              : 'bg-stone-200 text-stone-800 hover:bg-stone-300'
                          }`}
                        >
                          {name}
                        </button>
                      ))}
                    </dd>
                  </div>
                  <Row label="본 시각" value={formatDateTime(now)} />
                  <Row label="기기 정보" value="자동 첨부" />
                  <Row label="받는 곳" value="한국인터넷진흥원(KISA)" />
                </dl>
                <p className="mt-3 flex items-center gap-2 text-base text-emerald-800">
                  <Lock className="size-4 shrink-0" />
                  이름, 전화번호 같은 개인정보는 보내지 않아요.
                </p>
              </section>
            )}

            <button
              type="button"
              disabled={!type || status === 'sending'}
              onClick={() => setStatus('sending')}
              className="mt-5 flex min-h-18 w-full items-center justify-center gap-2 rounded-2xl bg-emerald-700 px-4 text-2xl font-extrabold text-white transition hover:bg-emerald-800 disabled:bg-stone-200 disabled:text-stone-600"
            >
              {status === 'sending' ? (
                <>
                  <Loader2 className="size-7 animate-spin" /> 보내는 중
                </>
              ) : type ? (
                <>
                  <Send className="size-7" /> 신고 보내기
                </>
              ) : (
                '위에서 하나를 골라 주세요'
              )}
            </button>
          </>
        )}
      </div>
    </div>
  )
}

const TREND = {
  up: { text: '▲ 늘었어요', className: 'text-amber-800' },
  down: { text: '▼ 줄었어요', className: 'text-stone-600' },
  new: { text: '새로 등장', className: 'text-sky-700' },
  same: null,
}

const MEDAL = ['bg-amber-400 text-stone-900', 'bg-stone-300 text-stone-900', 'bg-orange-300 text-stone-900']

// 이번 달 신고 많은 앱 TOP 5, 더보기로 10위까지
function RankView({ speak, highlight, onReport }) {
  const [expanded, setExpanded] = useState(false)
  const ranking = useMemo(() => getMonthlyRanking().slice(0, 10), [])
  const [month] = useState(() => new Date().getMonth() + 1)
  const shown = expanded ? ranking : ranking.slice(0, TOP)
  const typeTitle = (id) => REPORT_TYPES.find((t) => t.id === id)?.title ?? '기타'

  useEffect(() => {
    const top3 = ranking.slice(0, 3).map((r) => `${r.rank}위 ${r.name}`).join(', ')
    speak(`${month}월에 신고가 많은 앱이에요. ${top3}. 이런 앱이 휴대폰에 있다면 조심하세요.`)
  }, [ranking, month, speak])

  return (
    <div className="mt-3 space-y-5">
      <div className="flex items-center gap-3 rounded-2xl bg-amber-50 p-4 ring-1 ring-amber-300">
        <Trophy className="size-8 shrink-0 text-amber-700" />
        <p className="text-lg">
          <b>{month}월</b>에 같은 앱을 쓰는 분들이 <b>가장 많이 신고한 앱</b>이에요.
        </p>
      </div>

      <ol className="space-y-3" aria-label={`${month}월 신고 많은 앱 순위`}>
        {shown.map((r) => {
          const trend = TREND[r.trend]
          return (
            <li
              key={r.name}
              className={`flex items-center gap-3 rounded-2xl bg-white p-3 shadow-sm ring-1 ${
                r.name === highlight ? 'ring-2 ring-emerald-600' : 'ring-stone-200'
              }`}
            >
              <span
                className={`grid size-12 shrink-0 place-items-center rounded-full text-xl font-extrabold ${
                  MEDAL[r.rank - 1] ?? 'bg-stone-100 text-stone-800'
                }`}
                aria-label={`${r.rank}위`}
              >
                {r.rank}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-lg leading-snug font-bold">{r.name}</p>
                <p className="text-base text-stone-600">주로 {typeTitle(r.type)}</p>
                <p className="flex flex-wrap items-center gap-x-3 text-base">
                  <span className="font-bold text-stone-900">{r.count.toLocaleString('ko-KR')}건</span>
                  {trend && <span className={`font-semibold ${trend.className}`}>{trend.text}</span>}
                  {r.mine > 0 && <span className="font-semibold text-emerald-800">내 신고 {r.mine}건 포함</span>}
                </p>
              </div>
            </li>
          )
        })}
      </ol>

      {ranking.length > TOP && (
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          aria-expanded={expanded}
          className="flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-stone-100 px-4 text-lg font-bold text-stone-900 hover:bg-stone-200"
        >
          {expanded ? (
            <>
              접기 <ChevronUp className="size-6" />
            </>
          ) : (
            <>
              더보기 ({TOP + 1}~{ranking.length}위) <ChevronDown className="size-6" />
            </>
          )}
        </button>
      )}

      <button
        type="button"
        onClick={onReport}
        className="flex min-h-18 w-full items-center justify-center gap-2 rounded-2xl bg-emerald-700 px-4 text-2xl font-extrabold text-white hover:bg-emerald-800"
      >
        <Flag className="size-7" />
        나도 신고하기
      </button>
      <p className="text-base text-stone-600">
        시연용 예시 데이터에 이 휴대폰에서 보낸 신고를 더한 순위예요. 실제 서비스에서는 모든 사용자의 신고를 모아 매일 새로 고쳐요.
      </p>
    </div>
  )
}

function Row({ label, value }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="shrink-0 text-stone-600">{label}</dt>
      <dd className="text-right font-semibold">{value}</dd>
    </div>
  )
}

function SentView({ receipt, reported, onRank, onClose }) {
  return (
    <div className="py-6 text-center" role="status">
      <div className="animate-pop mx-auto grid size-20 place-items-center rounded-full bg-emerald-700 text-white">
        <Check className="size-12" strokeWidth={3} />
      </div>
      <p className="mt-4 text-2xl font-extrabold">신고가 접수되었어요.</p>
      <p className="mt-2 text-lg text-stone-700">알려 주셔서 고맙습니다. 다른 분들의 피해를 막는 데 도움이 돼요.</p>
      <p className="mt-4 rounded-xl bg-stone-100 py-3 text-lg">
        접수 번호 <span className="font-mono font-bold text-emerald-800">{receipt}</span>
      </p>
      <p className="mt-4 flex items-center justify-center gap-2 text-lg text-stone-800">
        <Phone className="size-5 text-amber-700" />
        더 도움이 필요하면 국번 없이 118
      </p>
      <p className="mt-1 text-base text-stone-600">시연용 화면이라 실제로 접수되지는 않아요.</p>
      <div className="mt-5 space-y-5">
        {reported && (
          <button
            type="button"
            onClick={onRank}
            className="flex min-h-16 w-full items-center justify-center gap-2 rounded-2xl bg-amber-400 px-4 text-xl font-bold text-stone-900 hover:bg-amber-300"
          >
            <Trophy className="size-6" />
            신고 순위에서 확인하기
          </button>
        )}
        <button
          type="button"
          onClick={onClose}
          className="min-h-16 w-full rounded-2xl bg-stone-100 text-xl font-bold hover:bg-stone-200"
        >
          닫기
        </button>
      </div>
    </div>
  )
}
