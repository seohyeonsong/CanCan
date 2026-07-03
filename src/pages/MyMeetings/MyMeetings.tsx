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

const FLOW_STEPS = [
  { icon: '🔗', title: '링크 만들기', desc: '회의 정보를 입력하면 공유 링크가 생겨요' },
  { icon: '🗓️', title: '참여자 응답', desc: '캘린더 연동 또는 직접 선택 · 로그인 불필요' },
  { icon: '✨', title: 'AI 자동 추천', desc: '모두의 응답을 분석해 최적 시간을 추천해요' },
  { icon: '📤', title: '확정 & 공유', desc: '시간을 확정하고 슬랙으로 바로 공유해요' },
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

        {/* 온보딩 */}
        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>이렇게 작동해요</h3>
          <ol className={styles.flowSteps}>
            {FLOW_STEPS.map((s, i) => (
              <li key={i} className={styles.flowStep}>
                <span className={styles.flowIcon}>{s.icon}</span>
                <div className={styles.flowText}>
                  <span className={styles.flowStepTitle}>{s.title}</span>
                  <span className={styles.flowStepDesc}>{s.desc}</span>
                </div>
              </li>
            ))}
          </ol>
        </section>

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
