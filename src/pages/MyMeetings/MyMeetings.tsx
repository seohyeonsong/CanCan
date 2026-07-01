import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getUser, clearUser } from '../../lib/auth'
import { getMyMeetings } from '../../lib/store'
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

export function MyMeetings() {
  const navigate = useNavigate()
  const user = getUser()
  const [meetings, setMeetings] = useState<Meeting[]>([])

  useEffect(() => {
    if (!user) { navigate('/login'); return }
    setMeetings(getMyMeetings(user.email))
  }, [navigate, user?.email])

  function handleLogout() {
    clearUser()
    navigate('/login')
  }

  const myMeetings = meetings.filter(m => m.ownerEmail === user?.email)
  const invitedMeetings = meetings.filter(m => m.ownerEmail !== user?.email)

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.logo}>CANCAN</h1>
        <div className={styles.userRow}>
          {user?.picture && <img src={user.picture} className={styles.avatar} alt="" />}
          <span className={styles.userName}>{user?.name}</span>
          <button className={styles.logoutBtn} onClick={handleLogout}>로그아웃</button>
        </div>
      </header>

      <div className={styles.content}>
        <div className={styles.titleRow}>
          <h2 className={styles.pageTitle}>내 회의</h2>
          <button className={styles.newBtn} onClick={() => navigate('/create')}>+ 새 회의</button>
        </div>

        {meetings.length === 0 && (
          <div className={styles.empty}>
            <p className={styles.emptyText}>아직 회의가 없어요</p>
            <button className={styles.emptyBtn} onClick={() => navigate('/create')}>첫 회의 만들기</button>
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

  return (
    <button className={styles.card} onClick={onClick}>
      <div className={styles.cardMain}>
        <div className={styles.cardLeft}>
          {m.confirmedSlot ? (
            <span className={styles.badgeConfirmed}>확정</span>
          ) : isOwner ? (
            <span className={styles.badgeOwner}>주최</span>
          ) : responded ? (
            <span className={styles.badgeDone}>응답완료</span>
          ) : (
            <span className={styles.badgePending}>미응답</span>
          )}
          <span className={styles.cardTitle}>{m.title}</span>
          {m.id === 'demo-kickoff' && <span className={styles.badgeDemo}>데모</span>}
        </div>
        <span className={styles.cardArrow}>›</span>
      </div>
      <div className={styles.cardMeta}>
        <span>{formatDateRange(m.dateRange.start, m.dateRange.end)}</span>
        <span>·</span>
        <span>{m.durationMinutes}분</span>
        {isOwner && <><span>·</span><span>응답 {respondedCount}/{total}명</span></>}
        {m.responseDeadline && (
          <><span>·</span><span className={styles.deadline}>{formatDeadline(m.responseDeadline)}</span></>
        )}
      </div>
    </button>
  )
}
