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

function Icon({ name }: { name: string }) {
  const common = {
    width: 22, height: 22, viewBox: '0 0 24 24', fill: 'none',
    stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const,
  }
  switch (name) {
    case 'link': return <svg {...common}><path d="M9.5 14.5l5-5"/><path d="M11 6.5l1-1a3.5 3.5 0 015 5l-1 1"/><path d="M13 17.5l-1 1a3.5 3.5 0 01-5-5l1-1"/></svg>
    case 'calendar': return <svg {...common}><rect x="3.5" y="5" width="17" height="15" rx="2.5"/><path d="M3.5 9.5h17M8 3.5v3M16 3.5v3"/><path d="M8.5 14l2 2 3.5-3.5"/></svg>
    case 'sparkle': return <svg width={22} height={22} viewBox="0 0 24 24" fill="currentColor"><path d="M12 3l1.6 5.2a2 2 0 001.2 1.2L20 11l-5.2 1.6a2 2 0 00-1.2 1.2L12 19l-1.6-5.2a2 2 0 00-1.2-1.2L4 11l5.2-1.6a2 2 0 001.2-1.2z"/></svg>
    case 'send': return <svg {...common}><path d="M20 4L10.5 13.5"/><path d="M20 4l-6 16-3.5-7.5L3 9z"/></svg>
    case 'plus': return <svg {...common}><path d="M12 5v14M5 12h14"/></svg>
    case 'enter': return <svg {...common}><path d="M14 4h4a2 2 0 012 2v12a2 2 0 01-2 2h-4"/><path d="M10 16l4-4-4-4"/><path d="M14 12H4"/></svg>
    default: return null
  }
}

const FLOW_STEPS = [
  { icon: 'link', title: '링크 생성' },
  { icon: 'calendar', title: '시간 응답' },
  { icon: 'sparkle', title: 'AI 추천' },
  { icon: 'send', title: '확정·공유' },
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
                <span className={styles.flowStepIcon}><Icon name={s.icon} /></span>
                <span className={styles.flowStepLabel}>{s.title}</span>
                {i < FLOW_STEPS.length - 1 && <span className={styles.flowArrow}>›</span>}
              </li>
            ))}
          </ol>
        </section>

        {/* 진입 카드 */}
        <div className={styles.entryRow}>
          <button className={`${styles.entryCard} ${styles.entryCreate}`} onClick={() => navigate('/create')}>
            <span className={styles.entryIcon}><Icon name="plus" /></span>
            <span className={styles.entryTitle}>회의 만들기</span>
            <span className={styles.entryDesc}>새 회의 링크를 만들어요</span>
          </button>
          <button className={styles.entryCard} onClick={() => setJoinOpen(o => !o)}>
            <span className={styles.entryIcon}><Icon name="enter" /></span>
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
