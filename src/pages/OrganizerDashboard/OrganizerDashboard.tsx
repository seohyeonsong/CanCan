import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getMeeting, confirmMeeting, submitResponse, addParticipant, removeParticipant, setOrganizerAttending } from '../../lib/store'
import { shareOrCopy } from '../../lib/share'
import { buildRespondUrl } from '../../lib/meetingLink'
import { getUser, clearUser } from '../../lib/auth'
import { getRecommendations, getDateRange } from '../../lib/algorithm'
import { RecommendationCard } from '../../components/RecommendationCard/RecommendationCard'
import { CanIcon } from '../../components/CanIcon/CanIcon'
import { Logo } from '../../components/Logo/Logo'
import { Icon, formatMeta, type IconName } from '../../components/Icon/Icon'
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
  const [showAdd, setShowAdd] = useState(false)
  const [newName, setNewName] = useState('')
  const [newRequired, setNewRequired] = useState(true)
  const [addError, setAddError] = useState('')
  const [shareToast, setShareToast] = useState<string | null>(null)

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
  const requiredNames = meeting.participants.filter(p => p.isRequired).map(p => p.name)
  const pending = meeting.participants.filter(p => p.submittedAt === null)

  // 주최자도 참석자 — 응답 전이라 participants에 없어도 자판기/카운트엔 항상 표시.
  // 단, 주최자가 '참석 안 함'을 선택했으면 목록에서 제외한다.
  const organizerInList = meeting.participants.some(p => p.name === meeting.organizerName)
  const organizerSkipped = meeting.organizerAttending === false
  const roster = (organizerInList || organizerSkipped)
    ? meeting.participants
    : [{ name: meeting.organizerName, isRequired: true, preferences: {}, submittedAt: null }, ...meeting.participants]
  const rosterResponded = roster.filter(p => p.submittedAt !== null).length
  const rosterPending = roster.length - rosterResponded
  // 회의 스냅샷을 링크에 담아, 받은 사람이 다른 기기에서 열어도 복원되게 한다
  const respondUrl = buildRespondUrl(meeting)
  const dates = getDateRange(meeting.dateRange.start, meeting.dateRange.end)

  // 주최자 응답 그리드에도 다른 참여자 가능 시간을 히트맵으로 겹쳐 보여준다
  const orgOthers = meeting.participants.filter(p => p.submittedAt && p.name !== meeting.organizerName)
  const orgOthersTotal = orgOthers.length
  const orgOthersCount: Record<string, number> = {}
  for (const p of orgOthers) {
    for (const [key, pref] of Object.entries(p.preferences)) {
      if (pref !== 'no') orgOthersCount[key] = (orgOthersCount[key] ?? 0) + 1
    }
  }

  function handleAddParticipant() {
    if (!id || !meeting || !newName.trim()) return
    const nm = newName.trim()
    // 같은 이름(주최자 포함)이 이미 있으면 막고 안내 — 동명이인은 구분 표시 유도
    if (nm === meeting.organizerName || meeting.participants.some(p => p.name === nm)) {
      setAddError(`이미 '${nm}'이(가) 있어요. 구분해서 적어주세요 (예: ${nm} B)`)
      return
    }
    addParticipant(id, nm, newRequired)
    setNewName('')
    setAddError('')
    setShowAdd(false)
    refresh()
  }

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

  // 참여 링크 공유 (언제든)
  function shareLink() {
    const msg = [
      `📅 *${meeting!.title}* 회의 시간을 맞춰요!`,
      '아래 링크에서 가능한 시간을 표시해주세요 🙏',
      '',
      respondUrl,
    ].join('\n')
    shareOrCopy(msg, respondUrl).then(res => flash(res))
  }

  // 응답 안 한 사람 재촉 메시지
  function shareNudge() {
    const names = pending.map(p => p.name).join(', ')
    const msg = [
      `⏰ *${meeting!.title}* 회의 시간, 아직 안 정해졌어요!`,
      names ? `${names} 님, 가능한 시간을 표시해주세요 🙏` : '가능한 시간을 표시해주세요 🙏',
      '',
      respondUrl,
    ].join('\n')
    shareOrCopy(msg, respondUrl).then(res => flash(res))
  }

  // 겹치는 시간이 없을 때 재조율 요청 메시지
  function shareRecoordinate() {
    const msg = [
      `😥 *${meeting!.title}* 다들 가능한 시간이 겹치질 않아요.`,
      '가능한 시간을 조금만 더 표시해주실 수 있을까요?',
      '',
      respondUrl,
    ].join('\n')
    shareOrCopy(msg, respondUrl).then(res => flash(res))
  }

  // 특정 시간에 불가한 사람에게 조율 요청
  function shareCoordinate(rec: Recommendation) {
    const d = new Date(rec.slot.date + 'T00:00:00')
    const ampm = rec.slot.hour < 12 ? '오전' : '오후'
    const h = rec.slot.hour > 12 ? rec.slot.hour - 12 : rec.slot.hour
    const min = rec.slot.minute === 30 ? ' 30분' : ''
    const when = `${d.getMonth() + 1}월 ${d.getDate()}일 (${DAYS[d.getDay()]}) ${ampm} ${h}시${min}`
    const who = rec.blockedNames.join(', ')
    const msg = [
      `🗓 *${meeting!.title}* 회의를 ${when}에 잡으려고 해요.`,
      `${who}님이 그 시간이 어려우신데, 혹시 조정 가능하실까요?`,
      '가능하면 아래에서 시간을 업데이트해 주세요 🙏',
      '',
      respondUrl,
    ].join('\n')
    shareOrCopy(msg, respondUrl).then(res => flash(res))
  }

  function flash(res: 'shared' | 'copied' | 'cancelled') {
    if (res === 'cancelled') return
    setShareToast(res === 'copied' ? '메시지가 복사됐어요' : '공유했어요')
    setTimeout(() => setShareToast(null), 2000)
  }

  // 주최자는 필수 참석자라 빈 응답이 추천을 전멸시킴 → 가능 시간 0개면 제출 차단
  const organizerMarkedCount = Object.values(preferences).filter(p => p !== 'no').length

  function handleOrganizerSubmit() {
    if (!id || !meeting || organizerMarkedCount === 0) return
    addParticipant(id, meeting.organizerName, true)
    submitResponse(id, meeting.organizerName, preferences)
    setOrganizerAttending(id, true)
    setSubmitted(true)
    refresh()
    setTab('dashboard')
  }

  return (
    <div className={styles.container}>
      {shareToast && <div className={styles.shareToast}>{shareToast}</div>}
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
        <div className={styles.headerTop}>
          <button className={styles.backBtn} onClick={() => navigate('/meetings')}>‹ 회의 목록</button>
          <button className={styles.shareBtn} onClick={shareLink}>
            <Icon name="link" size={15} /> 링크 공유
          </button>
        </div>
        <div className={styles.meetingMeta}>
          <h2 className={styles.meetingTitle}>
            {meeting.title}
            {id?.startsWith('demo-') && <span className={styles.titleDemoBadge}>데모</span>}
          </h2>
          <p className={styles.meta}>
            {formatDate(meeting.dateRange.start)} ~ {formatDate(meeting.dateRange.end)} · {meeting.durationMinutes}분
            {formatMeta(meeting.format) && (
              <span style={{ marginLeft: 6 }}>
                · <Icon name={formatMeta(meeting.format)!.icon} size={13} /> {formatMeta(meeting.format)!.label}
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
            <p>지금 보는 건 <b>주최자</b> 화면이에요. 참여자 입장은 어떻게 보이는지 직접 체험해볼 수 있어요.</p>
          </div>
          <button className={styles.demoGuideBtn} onClick={() => navigate(`/meeting/${id}/respond`)}>
            참여자로 응답해보기 →
          </button>
        </div>
      )}

      {/* 데모 제약 안내 — 실시간 동기화 없음을 투명하게 */}
      <p className={styles.demoLimitNote}>
        <Icon name="bulb" size={13} /> 데모 버전은 이 브라우저 안에서 전체 흐름을 체험하도록 만들어졌어요. 다른 기기에서 한 응답은 실시간으로 모이지 않아요 (실서비스에선 서버로 동기화).
      </p>

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
          {submitted && <span className={styles.tabCheck}><Icon name="check" size={13} /></span>}
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
              <img src="/whitelogo.png" alt="CanCan" className={styles.machineLogoImg} />
              <div className={styles.machineStatusPanel}>
                <span className={styles.statusLed} />
                <span className={styles.statusReadout}>{rosterResponded}/{roster.length} READY</span>
              </div>
            </div>

            {/* 캔 진열 */}
            <div className={styles.machineDisplay}>
              {roster.length === 0 ? (
                <div className={styles.emptyDisplay}><p>링크를 공유해 참여자를 모아보세요</p></div>
              ) : (
                <div className={styles.canRow}>
                  {roster.map((p, i) => (
                    <div
                      key={p.name}
                      className={styles.canSlot}
                      onMouseEnter={() => setHoveredParticipant(p.name)}
                      onMouseLeave={() => setHoveredParticipant(null)}
                      onClick={() => setHoveredParticipant(prev => prev === p.name ? null : p.name)}
                    >
                      <CanIcon name={p.name} size={64} pending={!p.submittedAt} colorIndex={i} required={p.isRequired} />
                      {hoveredParticipant === p.name && (
                        <div className={styles.participantPopup}>
                          <span className={styles.popupName}>{p.name}{p.name === meeting.organizerName && ' (주최자)'}</span>
                          {p.contact && <span className={styles.popupContact}>{p.contact}</span>}
                          <span className={styles.popupStatus}>{p.submittedAt ? <><Icon name="check" size={12} /> 응답 완료</> : '응답 대기'}</span>
                          {p.name !== meeting.organizerName && (
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
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 상태 푸터 */}
            <div className={styles.machineMessagePanel}>
              {rosterPending === 0 ? (
                <span className={styles.messageText}>● 참여자 모두 응답했어요</span>
              ) : (
                <>
                  <span className={styles.messageText}>● {rosterPending}명 응답 대기 중</span>
                  {pending.length > 0 && (
                    <button className={styles.resendBtn} onClick={shareNudge}><Icon name="message" size={13} /> 응답 재촉</button>
                  )}
                </>
              )}
            </div>

            {/* 참여자 추가 */}
            <div className={styles.addPanel}>
              {!showAdd ? (
                <button className={styles.addToggle} onClick={() => setShowAdd(true)}>+ 참여자 추가</button>
              ) : (
                <>
                  <div className={styles.addForm}>
                    <input
                      className={`${styles.addInput} ${addError ? styles.addInputError : ''}`}
                      placeholder="이름 (예: 김토스 B)"
                      value={newName}
                      autoFocus
                      onChange={e => { setNewName(e.target.value); setAddError('') }}
                      onKeyDown={e => e.key === 'Enter' && handleAddParticipant()}
                    />
                    <label className={styles.addReq}>
                      <input type="checkbox" checked={newRequired} onChange={e => setNewRequired(e.target.checked)} />
                      필수
                    </label>
                    <button className={styles.addConfirm} onClick={handleAddParticipant} disabled={!newName.trim()}>추가</button>
                    <button className={styles.addCancel} onClick={() => { setShowAdd(false); setNewName(''); setAddError('') }}>취소</button>
                  </div>
                  {addError && <p className={styles.addErrorMsg}>{addError}</p>}
                </>
              )}
            </div>
          </section>

          {/* 추천 시간 */}
          <section className={styles.recommendSection}>
            <div className={styles.recHeader}>
              <h3 className={styles.sectionTitle}>추천 시간</h3>
              {requiredNames.length > 0 && (
                <span className={styles.reqLegend}><span className={styles.reqLegendDot} />필수 참석자</span>
              )}
            </div>
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
                            { value: 'online', icon: 'monitor', label: '온라인' },
                            { value: 'offline', icon: 'pin', label: '오프라인' },
                            { value: 'both', icon: 'shuffle', label: '온·오프라인' },
                          ] as { value: MeetingFormat; icon: IconName; label: string }[]).map(opt => (
                            <button
                              key={opt.value}
                              type="button"
                              className={`${styles.confirmSegBtn} ${confirmFormat === opt.value ? styles.confirmSegActive : ''}`}
                              onClick={() => setConfirmFormat(opt.value)}
                            >
                              <Icon name={opt.icon} size={14} /> {opt.label}
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
                      onCoordinate={() => shareCoordinate(rec)}
                      isSelected={isSelected}
                      confirmContent={confirmPanel}
                      requiredNames={requiredNames}
                    />
                  )
                })}
              </div>
            ) : (
              <div className={styles.noResult}>
                <p className={styles.noResultTitle}>모두 가능한 시간이 없어요</p>
                <p className={styles.noResultSub}>필수 참석자들이 표시한 가능 시간이 서로 겹치지 않아요. 가능한 시간을 더 표시해달라고 요청해보세요.</p>
                <button className={styles.recoordBtn} onClick={shareRecoordinate}>
                  <Icon name="message" size={15} /> 다시 조율 요청 보내기
                </button>
              </div>
            )}
          </section>


      </div>{/* end dashColumn */}

      {/* ===== 오른쪽: 내 응답하기 ===== */}
      <div className={`${styles.respondColumn} ${tab !== 'respond' ? styles.mobileHide : ''}`}>
        {organizerSkipped ? (
          <div className={styles.notAttending}>
            <Icon name="enter" size={22} />
            <p className={styles.notAttendingTitle}>직접 참여하지 않는 회의예요</p>
            <p className={styles.notAttendingDesc}>주최자로서 일정만 조율하고 있어요.<br />참석하기로 했다면 아래에서 가능 시간을 입력할 수 있어요.</p>
            <button className={styles.notAttendingBtn} onClick={() => { if (id) setOrganizerAttending(id, true); refresh() }}>
              나도 참석할래요
            </button>
          </div>
        ) : (
        <div className={styles.respondSection}>
          <div className={styles.respondHeader}>
            <p className={styles.respondName}>{meeting.organizerName}님의 가능 시간</p>
            <p className={styles.respondHint}>드래그해서 선호도를 입력해주세요</p>
          </div>

          <TimeGrid
            dates={dates}
            preferences={preferences}
            onChange={(key, pref) => setPreferences(prev => ({ ...prev, [key]: pref }))}
            othersCount={orgOthersTotal > 0 ? orgOthersCount : undefined}
            othersTotal={orgOthersTotal}
          />

          <button
            className={styles.submitBtn}
            onClick={handleOrganizerSubmit}
            disabled={organizerMarkedCount === 0}
          >
            {organizerMarkedCount === 0 ? '가능한 시간을 1개 이상 표시해주세요' : submitted ? '응답 수정 완료' : '내 응답 제출하기'}
          </button>
        </div>
        )}
      </div>{/* end respondColumn */}

      </div>{/* end mainLayout */}
    </div>
  )
}
