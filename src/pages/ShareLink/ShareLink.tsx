import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getMeeting } from '../../lib/store'
import { shareOrCopy, copyText } from '../../lib/share'
import { Logo } from '../../components/Logo/Logo'
import { Icon } from '../../components/Icon/Icon'
import styles from './ShareLink.module.css'

const DAYS = ['일', '월', '화', '수', '목', '금', '토']
function formatDate(s: string) {
  const d = new Date(s + 'T00:00:00')
  return `${d.getMonth() + 1}월 ${d.getDate()}일 (${DAYS[d.getDay()]})`
}

function formatDeadline(deadline: string): string {
  const d = new Date(deadline + 'T00:00:00')
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const diff = Math.round((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  const label = `${d.getMonth() + 1}월 ${d.getDate()}일 (${DAYS[d.getDay()]})`
  if (diff < 0) return `${label} 마감`
  if (diff === 0) return `오늘 자정까지`
  return `${label}까지 · D-${diff}`
}


export function ShareLink() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const meeting = id ? getMeeting(id) : null
  const [copied, setCopied] = useState(false)
  const [shareResult, setShareResult] = useState<'shared' | 'copied' | null>(null)
  const canShare = typeof (navigator as Navigator & { share?: unknown }).share === 'function'

  if (!meeting) return <div className={styles.error}>회의를 찾을 수 없어요</div>

  const respondUrl = `${window.location.origin}/meeting/${id}/respond`

  function buildInviteMessage() {
    const m = meeting!
    const lines = [
      `📅 *${m.title}* 시간을 맞춰요!`,
      `🗓 ${formatDate(m.dateRange.start)} ~ ${formatDate(m.dateRange.end)} · ${m.durationMinutes}분`,
    ]
    if (m.responseDeadline) lines.push(`⏰ 응답 마감: ${formatDeadline(m.responseDeadline)}`)
    lines.push('', '아래 링크에서 가능한 시간을 표시해주세요 👇', respondUrl)
    return lines.join('\n')
  }

  function copyLink() {
    copyText(respondUrl).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  function shareInvite() {
    shareOrCopy(buildInviteMessage(), respondUrl).then(res => {
      if (res === 'cancelled') return
      setShareResult(res)
      setTimeout(() => setShareResult(null), 2000)
    })
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <Logo size="md" />
      </header>

      <div className={styles.card}>
        <img src="/bifinal.png" alt="" className={styles.heroImg} />

        <div className={styles.textBlock}>
          <h2 className={styles.title}>링크가 만들어졌어요</h2>
          <p className={styles.meetingTitle}>{meeting.title}</p>
          <p className={styles.meta}>
            {formatDate(meeting.dateRange.start)} ~ {formatDate(meeting.dateRange.end)} · {meeting.durationMinutes}분
          </p>
          {meeting.responseDeadline && (
            <div className={styles.deadlineBadge}>
              ⏰ 응답 마감: {formatDeadline(meeting.responseDeadline)}
            </div>
          )}
        </div>

        <div className={styles.linkBox}>
          <span className={styles.linkText}>{respondUrl}</span>
          <button className={`${styles.copyBtn} ${copied ? styles.copyBtnDone : ''}`} onClick={copyLink}>
            {copied ? <><Icon name="check" size={13} /> 복사됨</> : '복사'}
          </button>
        </div>

        <button className={styles.slackBtn} onClick={shareInvite}>
          {shareResult === 'copied' ? <><Icon name="check" size={16} /> 메시지가 복사됐어요!</>
            : shareResult === 'shared' ? <><Icon name="check" size={16} /> 공유했어요!</>
            : <><Icon name="message" size={16} /> {canShare ? '슬랙·카톡으로 공유하기' : '슬랙 초대 메시지 복사'}</>}
        </button>

        <p className={styles.hint}>
          {canShare ? '공유 앱을 고르면 메시지가 채워진 채로 열려요.' : '슬랙이나 카카오톡에 붙여넣으면 끝!'}
          <br />링크를 받은 사람이 직접 시간을 입력해요.
        </p>
      </div>

      <button className={styles.dashboardBtn} onClick={() => navigate(`/meeting/${id}/dashboard`)}>
        응답 현황 보기
      </button>
    </div>
  )
}
