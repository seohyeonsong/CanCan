import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getMeeting, unconfirmMeeting } from '../../lib/store'
import { shareOrCopy } from '../../lib/share'
import { buildGoogleCalendarUrl } from '../../lib/calendarLink'
import { Logo } from '../../components/Logo/Logo'
import { Icon, formatMeta } from '../../components/Icon/Icon'
import styles from './Confirmation.module.css'

const DAYS = ['일', '월', '화', '수', '목', '금', '토']

export function Confirmation() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [shareResult, setShareResult] = useState<'shared' | 'copied' | null>(null)
  const canShare = typeof (navigator as Navigator & { share?: unknown }).share === 'function'
  const [showCancelConfirm, setShowCancelConfirm] = useState(false)
  const meeting = id ? getMeeting(id) : null

  if (!meeting || !meeting.confirmedSlot) {
    return <div className={styles.error}>확정된 회의가 없어요</div>
  }

  const { date, hour, minute } = meeting.confirmedSlot
  const d = new Date(date + 'T00:00:00')
  const dayName = DAYS[d.getDay()]
  const month = d.getMonth() + 1
  const day = d.getDate()
  const ampm = hour < 12 ? '오전' : '오후'
  const displayHour = hour > 12 ? hour - 12 : hour
  const minStr = minute === 30 ? ' 30분' : ''
  const totalMinutes = hour * 60 + minute + meeting.durationMinutes
  const endH = Math.floor(totalMinutes / 60)
  const endM = totalMinutes % 60
  const endAmpm = endH < 12 ? '오전' : '오후'
  const displayEndHour = endH > 12 ? endH - 12 : endH
  const endMinStr = endM === 30 ? ' 30분' : ''

  const formatStr = meeting.format === 'online' ? '💻 온라인'
    : meeting.format === 'offline' ? `🏢 오프라인${meeting.location ? ` (${meeting.location})` : ''}`
    : meeting.format === 'both' ? `🔀 온·오프라인${meeting.location ? ` (${meeting.location})` : ''}`
    : ''

  const respondedNames = meeting.participants.filter(p => p.submittedAt).map(p => p.name)

  function buildSlackMessage() {
    const lines = [
      `📅 *${meeting!.title}* 회의가 확정됐어요!`,
      ``,
      `🗓 ${month}월 ${day}일 (${dayName}) ${ampm} ${displayHour}시${minStr} — ${endAmpm} ${displayEndHour}시${endMinStr} (${meeting!.durationMinutes}분)`,
    ]
    if (formatStr) lines.push(`${formatStr}`)
    if (respondedNames.length > 0) lines.push(`👥 참석: ${respondedNames.join(', ')}`)
    lines.push(``, `🔗 ${window.location.origin}/meeting/${id}/respond`)
    return lines.join('\n')
  }

  function handleShare() {
    shareOrCopy(buildSlackMessage(), `${window.location.origin}/meeting/${id}/respond`).then(res => {
      if (res === 'cancelled') return
      setShareResult(res)
      setTimeout(() => setShareResult(null), 2000)
    })
  }

  function handleCancel() {
    if (!id) return
    unconfirmMeeting(id)
    navigate(`/meeting/${id}/dashboard`)
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <Logo size="sm" />
      </header>

      <div className={styles.card}>
        <img src="/og.png" alt="" className={styles.heroGrip} />

        <h2 className={styles.title}>회의가 확정됐어요</h2>
        <p className={styles.meetingName}>{meeting.title}</p>

        <div className={styles.timeBlock}>
          <p className={styles.timeDate}>{month}월 {day}일 ({dayName})</p>
          <p className={styles.timeRange}>
            {ampm} {displayHour}시{minStr} — {endAmpm} {displayEndHour}시{endMinStr}
          </p>
          <p className={styles.duration}>
            {meeting.durationMinutes}분
            {formatMeta(meeting.format) && <> · <Icon name={formatMeta(meeting.format)!.icon} size={13} /> {formatMeta(meeting.format)!.label}{meeting.location ? ` (${meeting.location})` : ''}</>}
          </p>
        </div>

        {meeting.participants.length > 0 && (
          <div className={styles.participants}>
            {meeting.participants.map(p => (
              <div key={p.name} className={styles.chip}>
                {p.name}
                {p.isRequired && <span className={styles.dot} />}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 슬랙 공유 버튼 */}
      <button className={styles.slackBtn} onClick={handleShare}>
        {shareResult === 'copied' ? <><Icon name="check" size={16} /> 복사됐어요!</>
          : shareResult === 'shared' ? <><Icon name="check" size={16} /> 공유했어요!</>
          : <><Icon name={canShare ? 'message' : 'clipboard'} size={16} /> {canShare ? '결과 공유하기' : '슬랙에 공유할 메시지 복사'}</>}
      </button>

      <button
        className={styles.calBtn}
        onClick={() => { const u = buildGoogleCalendarUrl(meeting); if (u) window.open(u, '_blank') }}
      >
        <Icon name="calendarPlus" size={16} /> 캘린더에 추가하기
      </button>

      <button className={styles.newBtn} onClick={() => navigate('/meetings')}>
        내 회의 목록으로
      </button>

      {/* 확정 취소 */}
      {!showCancelConfirm ? (
        <button className={styles.cancelLink} onClick={() => setShowCancelConfirm(true)}>
          시간 변경이 필요하다면 확정 취소
        </button>
      ) : (
        <div className={styles.cancelConfirm}>
          <p>확정을 취소하면 다시 추천 화면으로 돌아가요. 계속할까요?</p>
          <div className={styles.cancelBtns}>
            <button className={styles.cancelNo} onClick={() => setShowCancelConfirm(false)}>아니요</button>
            <button className={styles.cancelYes} onClick={handleCancel}>확정 취소할게요</button>
          </div>
        </div>
      )}
    </div>
  )
}
