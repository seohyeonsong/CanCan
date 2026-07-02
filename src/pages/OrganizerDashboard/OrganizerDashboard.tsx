import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getMeeting, confirmMeeting, submitResponse, addParticipant, removeParticipant } from '../../lib/store'
import { getUser, clearUser } from '../../lib/auth'
import { getRecommendations, getDateRange } from '../../lib/algorithm'
import { RecommendationCard } from '../../components/RecommendationCard/RecommendationCard'
import { CanIcon } from '../../components/CanIcon/CanIcon'
import { Logo } from '../../components/Logo/Logo'
import { TimeGrid } from '../../components/TimeGrid/TimeGrid'
import type { Meeting, Recommendation, Preference, MeetingFormat } from '../../types'
import styles from './OrganizerDashboard.module.css'

const DAYS = ['일', '월', '화', '수', '목', '금', '토']
function formatDate(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00')
  return `${d.getMonth() + 1}월 ${d.getDate()}일 (${DAYS[d.getDay()]})`
}


type Tab = 'dashboard' | 'respond'

function formatDeadline(deadline: string): string {
  const d = new Date(deadline + 'T00:00:00')
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const diff = Math.round((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  const label = `${d.getMonth() + 1}월 ${d.getDate()}일 (${DAYS[d.getDay()]})`
  if (diff < 0) return `${label} 마감됨`
  if (diff === 0) return `오늘 자정까지`
  return `${label}까지 · D-${diff}`
}

export function OrganizerDashboard() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [meeting, setMeeting] = useState<Meeting | null>(null)
  const [recommendations, setRecommendations] = useState<Recommendation[]>([])
  const [tab, setTab] = useState<Tab>('dashboard')
  const [preferences, setPreferences] = useState<Record<string, Preference>>({})
  const [submitted, setSubmitted] = useState(false)
  const [hoveredParticipant, setHoveredParticipant] = useState<string | null>(null)
  const [pendingRec, setPendingRec] = useState<Recommendation | null>(null)
  const [confirmFormat, setConfirmFormat] = useState<MeetingFormat>('online')
  const [confirmLocation, setConfirmLocation] = useState('')

  function refresh() {
    if (!id) return
    const m = getMeeting(id)
    setMeeting(m)
    if (m) setRecommendations(getRecommendations(m))
  }

  useEffect(() => { refresh() }, [id])
  useEffect(() => {
    const interval = setInterval(refresh, 5000)
    return () => clearInterval(interval)
  }, [id])

  // 타임그리드 초기값 세팅 — 회의 id가 바뀔 때 1회만 (드래그 입력이 새로고침에 지워지지 않도록)
  useEffect(() => {
    if (!meeting) return
    const existing = meeting.participants.find(p => p.name === meeting.organizerName)
    if (existing && existing.preferences && Object.keys(existing.preferences).length > 0) {
      setPreferences(existing.preferences as Record<string, Preference>)
      setSubmitted(true)
    } else {
      setPreferences({})
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  if (!meeting) return <div className={styles.error}>회의를 찾을 수 없어요</div>

  const responded = meeting.participants.filter(p => p.submittedAt !== null)
  const pending = meeting.participants.filter(p => p.submittedAt === null)
  const respondUrl = `${window.location.origin}/meeting/${id}/respond`
  const dates = getDateRange(meeting.dateRange.start, meeting.dateRange.end)

  function handleConfirm(rec: Recommendation) {
    setConfirmFormat(meeting?.format ?? 'online')
    setConfirmLocation(meeting?.location ?? '')
    setPendingRec(rec)
  }

  function handleFinalConfirm() {
    if (!id || !pendingRec) return
    confirmMeeting(id, pendingRec.slot, confirmFormat, confirmLocation.trim() || undefined)
    navigate(`/meeting/${id}/confirmed`)
  }

  function copyLink() {
    navigator.clipboard.writeText(respondUrl).then(() => alert('링크가 복사됐어요'))
  }

  function handleOrganizerSubmit() {
    if (!id || !meeting) return
    addParticipant(id, meeting.organizerName, true)
    submitResponse(id, meeting.organizerName, preferences)
    setSubmitted(true)
    refresh()
    setTab('dashboard')
  }

  return (
    <div className={styles.container}>
      {/* 상단 네비 */}
      <nav className={styles.topbar}>
        <button className={styles.topbarLogo} onClick={() => navigate('/meetings')} aria-label="내 회의로">
          <Logo size="sm" />
        </button>
        <div className={styles.topbarRight}>
          {getUser() && <span className={styles.topbarUser}>{getUser()?.name}</span>}
          <button className={styles.topbarLogout} onClick={() => { clearUser(); navigate('/login') }}>로그아웃</button>
        </div>
      </nav>

      {/* 헤더 */}
      <header className={styles.header}>
        <div className={styles.meetingMeta}>
          <h2 className={styles.meetingTitle}>
            {meeting.title}
            {id === 'demo-kickoff' && <span className={styles.titleDemoBadge}>데모</span>}
          </h2>
          <p className={styles.meta}>
            {formatDate(meeting.dateRange.start)} ~ {formatDate(meeting.dateRange.end)} · {meeting.durationMinutes}분
            {meeting.format && (
              <span style={{ marginLeft: 6 }}>
                · {meeting.format === 'online' ? '💻 온라인' : meeting.format === 'offline' ? '📍 오프라인' : '🔀 온·오프라인'}
                {meeting.location && ` (${meeting.location})`}
              </span>
            )}
          </p>
          {meeting.responseDeadline && (
            <div className={styles.deadlineBadge}>
              ⏰ {formatDeadline(meeting.responseDeadline)}
            </div>
          )}
        </div>
      </header>

      {/* 데모 안내 배너 — 심사자가 역할과 반대편 흐름을 이해하도록 */}
      {id === 'demo-kickoff' && (
        <div className={styles.demoGuide}>
          <div className={styles.demoGuideText}>
            <span className={styles.demoGuideBadge}>주최자 화면</span>
            <p>참여자들의 응답이 모여 <b>AI가 시간을 추천</b>한 상태예요. 참여자는 어떻게 응답할까요?</p>
          </div>
          <button className={styles.demoGuideBtn} onClick={() => navigate(`/meeting/${id}/respond`)}>
            참여자로 응답해보기 →
          </button>
        </div>
      )}

      {/* 탭 토글 — 모바일에서만 표시 */}
      <div className={styles.tabRow}>
        <button
          className={`${styles.tab} ${tab === 'dashboard' ? styles.tabActive : ''}`}
          onClick={() => setTab('dashboard')}
        >
          응답 현황
        </button>
        <button
          className={`${styles.tab} ${tab === 'respond' ? styles.tabActive : ''}`}
          onClick={() => setTab('respond')}
        >
          내 응답하기
          {submitted && <span className={styles.tabCheck}>✓</span>}
        </button>
      </div>

      {/* 2열 레이아웃 (데스크탑) / 탭 레이아웃 (모바일) */}
      <div className={styles.mainLayout}>

      {/* ===== 왼쪽: 응답 현황 ===== */}
      <div className={`${styles.dashColumn} ${tab !== 'dashboard' ? styles.mobileHide : ''}`}>

          {/* 자판기 (2D 가로 패널) */}
          <section className={styles.machine}>
            {/* 그라데이션 헤더 */}
            <div className={styles.machineTopPanel}>
              <div className={styles.machineLogoArea}>
                <span className={styles.machineLogoText}>CANCAN</span>
                <span className={styles.machineTagline}>TIME SELECTOR</span>
              </div>
              <div className={styles.machineStatusPanel}>
                <span className={styles.statusLed} />
                <span className={styles.statusReadout}>{responded.length}/{meeting.participants.length} READY</span>
              </div>
            </div>

            {/* 캔 진열 */}
            <div className={styles.machineDisplay}>
              {meeting.participants.length === 0 ? (
                <div className={styles.emptyDisplay}><p>링크를 공유해 참여자를 모아보세요</p></div>
              ) : (
                <div className={styles.canRow}>
                  {meeting.participants.map((p, i) => (
                    <div
                      key={p.name}
                      className={styles.canSlot}
                      onMouseEnter={() => setHoveredParticipant(p.name)}
                      onMouseLeave={() => setHoveredParticipant(null)}
                      onClick={() => setHoveredParticipant(prev => prev === p.name ? null : p.name)}
                    >
                      <CanIcon name={p.name} size={64} pending={!p.submittedAt} colorIndex={i} />
                      {hoveredParticipant === p.name && (
                        <div className={styles.participantPopup}>
                          <span className={styles.popupName}>{p.name}</span>
                          {p.contact && <span className={styles.popupContact}>{p.contact}</span>}
                          <span className={styles.popupStatus}>{p.submittedAt ? '✓ 응답 완료' : '응답 대기'}</span>
                          <button
                            className={styles.popupRemove}
                            onClick={(e) => {
                              e.stopPropagation()
                              if (id && confirm(`${p.name}님을 이 회의에서 제외할까요?`)) {
                                removeParticipant(id, p.name)
                                setHoveredParticipant(null)
                                refresh()
                              }
                            }}
                          >참여자 제외</button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 상태 푸터 */}
            <div className={styles.machineMessagePanel}>
              {pending.length === 0 ? (
                <span className={styles.messageText}>● 참여자 모두 응답했어요</span>
              ) : (
                <>
                  <span className={styles.messageText}>● {pending.length}명 응답 대기 중</span>
                  <button className={styles.resendBtn} onClick={copyLink}>링크 재발송</button>
                </>
              )}
            </div>
          </section>

          {/* 추천 시간 */}
          <section className={styles.recommendSection}>
            <h3 className={styles.sectionTitle}>추천 시간</h3>
            {responded.length === 0 ? (
              <p className={styles.emptyNote}>응답이 모이면 최적 시간을 추천해드려요</p>
            ) : recommendations.length > 0 ? (
              <div className={styles.recommendations}>
                {recommendations.map((rec, i) => {
                  const isSelected = pendingRec?.slot.date === rec.slot.date && pendingRec?.slot.hour === rec.slot.hour && pendingRec?.slot.minute === rec.slot.minute
                  const confirmPanel = isSelected ? (
                    <div className={styles.confirmPanel}>
                      <div className={styles.confirmField}>
                        <label className={styles.confirmLabel}>진행 방식</label>
                        <div className={styles.confirmSegmented}>
                          {([
                            { value: 'online', label: '💻 온라인' },
                            { value: 'offline', label: '🏢 오프라인' },
                            { value: 'both', label: '🔀 온·오프라인' },
                          ] as { value: MeetingFormat; label: string }[]).map(opt => (
                            <button
                              key={opt.value}
                              type="button"
                              className={`${styles.confirmSegBtn} ${confirmFormat === opt.value ? styles.confirmSegActive : ''}`}
                              onClick={() => setConfirmFormat(opt.value)}
                            >
                              {opt.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {confirmFormat === 'online' && (
                        <div className={styles.confirmField}>
                          <label className={styles.confirmLabel}>
                            미팅 링크 <span style={{ fontWeight: 400, color: '#94a3b8' }}>(선택)</span>
                          </label>
                          <input
                            className={styles.confirmInput}
                            type="text"
                            placeholder="Zoom / Google Meet / Teams 링크"
                            value={confirmLocation}
                            onChange={e => setConfirmLocation(e.target.value)}
                          />
                        </div>
                      )}

                      {(confirmFormat === 'offline' || confirmFormat === 'both') && (
                        <div className={styles.confirmField}>
                          <label className={styles.confirmLabel}>
                            장소 <span style={{ fontWeight: 400, color: '#94a3b8' }}>(선택)</span>
                          </label>
                          <input
                            className={styles.confirmInput}
                            type="text"
                            placeholder="예: 토스 본사 3F 회의실 A"
                            value={confirmLocation}
                            onChange={e => setConfirmLocation(e.target.value)}
                          />
                        </div>
                      )}

                      <div className={styles.confirmBtns}>
                        <button className={styles.confirmCancelBtn} onClick={() => setPendingRec(null)}>취소</button>
                        <button className={styles.confirmFinalBtn} onClick={handleFinalConfirm}>이 시간으로 확정</button>
                      </div>
                    </div>
                  ) : undefined

                  return (
                    <RecommendationCard
                      key={`${rec.slot.date}-${rec.slot.hour}-${rec.slot.minute}`}
                      recommendation={rec}
                      rank={i + 1}
                      onConfirm={() => handleConfirm(rec)}
                      isSelected={isSelected}
                      confirmContent={confirmPanel}
                    />
                  )
                })}
              </div>
            ) : (
              <div className={styles.noResult}>
                <p className={styles.noResultTitle}>조건에 맞는 시간이 없어요</p>
                <p className={styles.noResultSub}>필수 참석자의 "안 돼요" 시간을 제외하면 겹치는 시간이 없어요.</p>
              </div>
            )}
          </section>


      </div>{/* end dashColumn */}

      {/* ===== 오른쪽: 내 응답하기 ===== */}
      <div className={`${styles.respondColumn} ${tab !== 'respond' ? styles.mobileHide : ''}`}>
        <div className={styles.respondSection}>
          <div className={styles.respondHeader}>
            <p className={styles.respondName}>{meeting.organizerName}님의 가능 시간</p>
            <p className={styles.respondHint}>드래그해서 선호도를 입력해주세요</p>
          </div>

          <TimeGrid
            dates={dates}
            preferences={preferences}
            onChange={(key, pref) => setPreferences(prev => ({ ...prev, [key]: pref }))}
          />

          <button
            className={styles.submitBtn}
            onClick={handleOrganizerSubmit}
          >
            {submitted ? '응답 수정 완료' : '내 응답 제출하기'}
          </button>
        </div>
      </div>{/* end respondColumn */}

      </div>{/* end mainLayout */}
    </div>
  )
}
