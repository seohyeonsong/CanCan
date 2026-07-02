import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getMeeting } from '../../lib/store'
import { Logo } from '../../components/Logo/Logo'
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

  if (!meeting) return <div className={styles.error}>회의를 찾을 수 없어요</div>

  const respondUrl = `${window.location.origin}/meeting/${id}/respond`

  function copyLink() {
    navigator.clipboard.writeText(respondUrl).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
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
            {copied ? '복사됨 ✓' : '복사'}
          </button>
        </div>

        <p className={styles.hint}>슬랙이나 카카오톡으로 공유해주세요.<br />링크를 받은 사람이 직접 시간을 입력해요.</p>
      </div>

      <button className={styles.dashboardBtn} onClick={() => navigate(`/meeting/${id}/dashboard`)}>
        응답 현황 보기
      </button>
    </div>
  )
}
