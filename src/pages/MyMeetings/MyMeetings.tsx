import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getUser, clearUser } from '../../lib/auth'
import { getMyMeetings } from '../../lib/store'
import { Logo } from '../../components/Logo/Logo'
import type { Meeting } from '../../types'
import styles from './MyMeetings.module.css'

function formatDateRange(start: string, end: string) {
  const s = new Date(start + 'T00:00:00')
  const e = new Date(end + 'T00:00:00')
  return `${s.getMonth()+1}/${s.getDate()} ~ ${e.getMonth()+1}/${e.getDate()}`
}

function formatDeadline(deadline: string) {
  const today = new Date()
  today.setHours(0,0,0,0)
  const d = new Date(deadline + 'T00:00:00')
  const diff = Math.ceil((d.getTime() - today.getTime()) / 86400000)
  if (diff < 0) return '마감됨'
  if (diff === 0) return 'D-day'
  return `D-${diff}`
}

const DAYS = ['일', '월', '화', '수', '목', '금', '토']
function formatConfirmed(slot: { date: string; hour: number; minute: number }) {
  const d = new Date(slot.date + 'T00:00:00')
  const ampm = slot.hour < 12 ? '오전' : '오후'
  const h = slot.hour > 12 ? slot.hour - 12 : slot.hour
  const min = slot.minute === 30 ? ' 30분' : ''
  return `${d.getMonth()+1}/${d.getDate()}(${DAYS[d.getDay()]}) ${ampm} ${h}시${min}`
}

const FLOW_STEPS = [
  { icon: '🔗', title: '링크 생성' },
  { icon: '🗓️', title: '시간 응답' },
  { icon: '✨', title: 'AI 추천' },
  { icon: '📤', title: '확정·공유' },
]

export function MyMeetings() {
  const navigate = useNavigate()
  const user = getUser()
  const [meetings, setMeetings] = useState<Meeting[]>([])
  const [joinOpen, setJoinOpen] = useState(false)
  const [joinValue, setJoinValue] = useState('')

  useEffect(() => {
    if (!user) { navigate('/login'); return }
    setMeetings(getMyMeetings(user.email))
  }, [navigate, user?.email])

  function handleLogout() {
    clearUser()
    navigate('/login')
  }

  function handleJoin() {
    const v = joinValue.trim()
    if (!v) return
    const m = v.match(/meeting\/([^/?#]+)/)
    const id = m ? m[1] : v
    navigate(`/meeting/${id}/respond`)
  }

  const myMeetings = meetings.filter(m => m.ownerEmail === user?.email)
  const invitedMeetings = meetings.filter(m => m.ownerEmail !== user?.email)

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <Logo size="sm" />
        <div className={styles.userRow}>
          {user?.picture && <img src={user.picture} className={styles.avatar} alt="" />}
          <span className={styles.userName}>{user?.name}</span>
          <button className={styles.logoutBtn} onClick={handleLogout}>로그아웃</button>
        </div>
      </header>

      <div className={styles.content}>
        {/* 프로세스 안내 — 맨 위 */}
        <section className={styles.flowSection}>
          <h3 className={styles.flowHeading}>CanCan은 이렇게 진행돼요</h3>
          <ol className={styles.flowStrip}>
            {FLOW_STEPS.map((s, i) => (
              <li key={i} className={styles.flowStep}>
                <span className={styles.flowStepIcon}>{s.icon}</span>
                <span className={styles.flowStepLabel}>{s.title}</span>
                {i < FLOW_STEPS.length - 1 && <span className={styles.flowArrow}>›</span>}
              </li>
            ))}
          </ol>
        </section>

        {/* 진입 카드 */}
        <div className={styles.entryRow}>
          <button className={`${styles.entryCard} ${styles.entryCreate}`} onClick={() => navigate('/create')}>
            <span className={styles.entryIcon}>🔗</span>
            <span className={styles.entryTitle}>회의 만들기</span>
            <span className={styles.entryDesc}>새 회의 링크를 만들어요</span>
          </button>
          <button className={styles.entryCard} onClick={() => setJoinOpen(o => !o)}>
            <span className={styles.entryIcon}>✋</span>
            <span className={styles.entryTitle}>링크로 참여하기</span>
            <span className={styles.entryDesc}>받은 링크로 시간 응답</span>
          </button>
        </div>

        {joinOpen && (
          <div className={styles.joinBox}>
            <input
              className={styles.joinInput}
              placeholder="받은 회의 링크를 붙여넣으세요"
              value={joinValue}
              onChange={e => setJoinValue(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleJoin() }}
              autoFocus
            />
            <button className={styles.joinBtn} onClick={handleJoin}>참여</button>
          </div>
        )}

        {myMeetings.length > 0 && (
          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>내가 만든 회의</h3>
            <div className={styles.list}>
              {myMeetings.map(m => (
                <MeetingCard key={m.id} meeting={m} isOwner onClick={() => navigate(`/meeting/${m.id}/dashboard`)} />
              ))}
            </div>
          </section>
        )}

        {invitedMeetings.length > 0 && (
          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>초대받은 회의</h3>
            <div className={styles.list}>
              {invitedMeetings.map(m => {
                const myResponse = m.participants.find(p => p.email === user?.email)
                const responded = !!myResponse?.submittedAt
                return (
                  <MeetingCard
                    key={m.id}
                    meeting={m}
                    isOwner={false}
                    responded={responded}
                    onClick={() => navigate(`/meeting/${m.id}/respond`)}
                  />
                )
              })}
            </div>
          </section>
        )}
      </div>
    </div>
  )
}

function MeetingCard({ meeting: m, isOwner, responded, onClick }: {
  meeting: Meeting
  isOwner: boolean
  responded?: boolean
  onClick: () => void
}) {
  const respondedCount = m.participants.filter(p => p.submittedAt).length
  const total = m.participants.length
  const allIn = total > 0 && respondedCount === total
  const pct = total > 0 ? Math.round((respondedCount / total) * 100) : 0

  return (
    <button className={styles.card} onClick={onClick}>
      <div className={styles.cardHead}>
        <span className={styles.cardTitle}>{m.title}</span>
        {m.id === 'demo-kickoff' && <span className={styles.badgeDemo}>데모</span>}
        {m.confirmedSlot ? (
          <span className={styles.chipConfirmed}>확정 완료</span>
        ) : !isOwner && !responded ? (
          <span className={styles.chipPending}>응답 필요</span>
        ) : null}
      </div>

      <p className={styles.cardDate}>
        {formatDateRange(m.dateRange.start, m.dateRange.end)} · {m.durationMinutes}분
        {m.responseDeadline && !m.confirmedSlot && <span className={styles.deadline}> · {formatDeadline(m.responseDeadline)}</span>}
      </p>

      {m.confirmedSlot ? (
        <p className={styles.confirmedLine}>🗓️ {formatConfirmed(m.confirmedSlot)}</p>
      ) : total > 0 ? (
        <div className={styles.progressWrap}>
          <div className={styles.progressTrack}>
            <div className={styles.progressFill} style={{ width: `${pct}%` }} />
          </div>
          <span className={styles.progressText}>
            {allIn ? '전원 응답' : `${respondedCount}/${total}`}
          </span>
        </div>
      ) : (
        <p className={styles.emptyText}>링크를 공유해 참여자를 모아보세요</p>
      )}
    </button>
  )
}
