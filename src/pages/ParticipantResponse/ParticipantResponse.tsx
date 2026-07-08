import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { getMeeting, submitResponse, addParticipant } from '../../lib/store'
import { buildGoogleCalendarUrl } from '../../lib/calendarLink'
import { TimeGrid } from '../../components/TimeGrid/TimeGrid'
import { getDateRange } from '../../lib/algorithm'
import type { Preference, Meeting, ParticipantResponse as ParticipantResponseType } from '../../types'
import { getUser } from '../../lib/auth'
import { Logo } from '../../components/Logo/Logo'
import { Icon, formatMeta } from '../../components/Icon/Icon'
import styles from './ParticipantResponse.module.css'

type Step = 'name' | 'grid' | 'done' | 'pending'

const DAYS = ['일', '월', '화', '수', '목', '금', '토']
function fmtDate(s: string) {
  const d = new Date(s + 'T00:00:00')
  return `${d.getMonth() + 1}월 ${d.getDate()}일 (${DAYS[d.getDay()]})`
}

function isEditingExisting(meeting: { participants: { name: string; submittedAt: string | null }[] }, name: string) {
  return meeting.participants.some(p => p.name === name && p.submittedAt !== null)
}

export function ParticipantResponse() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const isSetup = searchParams.get('setup') === '1'
  const [isOrganizerSetup, setIsOrganizerSetup] = useState(false)
  const [meeting, setMeeting] = useState<Meeting | null>(null)
  const [step, setStep] = useState<Step>('name')
  const [name, setName] = useState('')
  const [contact, setContact] = useState('')
  const [preferences, setPreferences] = useState<Record<string, Preference>>({})
  const [formatPreference, setFormatPreference] = useState<'online' | 'offline' | 'both' | null>(null)
  const [highlightFormat, setHighlightFormat] = useState(false)
  const formatRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (id) setMeeting(getMeeting(id))
  }, [id])

  // 회의 생성 직후: 주최자가 자기 가능 시간을 바로 입력하는 셋업 모드
  useEffect(() => {
    if (!meeting || !isSetup) return
    const me = getUser()
    if (me?.email && meeting.ownerEmail === me.email) {
      setName(meeting.organizerName)
      setIsOrganizerSetup(true)
      setStep('grid')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meeting, isSetup])

  if (!meeting) return <div className={styles.error}>회의를 찾을 수 없어요</div>

  // 이미 확정된 회의면 결과 화면
  if (meeting.confirmedSlot && step !== 'done') {
    const s = meeting.confirmedSlot
    const d = new Date(s.date + 'T00:00:00')
    const days = ['일', '월', '화', '수', '목', '금', '토']
    const ampm = s.hour < 12 ? '오전' : '오후'
    const displayHour = s.hour > 12 ? s.hour - 12 : s.hour
    const minStr = s.minute === 30 ? ' 30분' : ''
    const confirmedStr = `${d.getMonth()+1}월 ${d.getDate()}일 (${days[d.getDay()]}) ${ampm} ${displayHour}시${minStr}`
    return (
      <div className={styles.container}>
        <header className={styles.header}><Logo size="sm" /></header>

        <h2 className={styles.pageHeadline}>회의 시간이 확정됐어요!</h2>

        <div className={styles.card}>
          <img src="/fin.png" alt="" className={styles.finImg} />
          <div className={styles.confirmedTime}>{confirmedStr}</div>
          <div className={styles.confirmedMeta}>
            <p className={styles.confirmedMeetingTitle}>{meeting.title}</p>
            <p className={styles.confirmedMetaLine}>
              {meeting.organizerName} · {meeting.durationMinutes}분
              {meeting.format && (
                <span style={{ marginLeft: 6 }}>
                  · <Icon name={formatMeta(meeting.format)!.icon} size={13} /> {formatMeta(meeting.format)!.label}
                  {meeting.location && ` (${meeting.location})`}
                </span>
              )}
            </p>
          </div>
          <button
            className={styles.primaryBtn}
            onClick={() => { const u = buildGoogleCalendarUrl(meeting); if (u) window.open(u, '_blank') }}
          >
            <Icon name="calendarPlus" size={17} /> 캘린더에 추가하기
          </button>
        </div>
      </div>
    )
  }

  const dates = getDateRange(meeting.dateRange.start, meeting.dateRange.end)
  const respondedParticipants = meeting.participants.filter(p => p.submittedAt !== null)

  // 나(현재 이름)를 제외한 앞선 응답자들의 가능 시간을 히트맵으로 겹쳐 보여준다.
  // 슬롯을 잠그지 않으므로 아무도 못 고르는 상황이 생기지 않는다.
  const others = respondedParticipants.filter((p: ParticipantResponseType) => p.name !== name.trim())
  const isFirstParticipant = others.length === 0
  const othersTotal = others.length
  const othersCount: Record<string, number> = {}
  for (const p of others) {
    for (const [key, pref] of Object.entries(p.preferences)) {
      if (pref !== 'no') othersCount[key] = (othersCount[key] ?? 0) + 1
    }
  }

  // 직접 입력한 이름이 이미 응답한 사람과 같으면 덮어쓰기 위험 → 경고
  const nameClash = !!name.trim() && meeting.participants.some(p => p.name === name.trim() && p.submittedAt)

  // 나 말고 모두 응답했다면, 아무도 안 되는 칸은 골라도 소용없으니 잠근다
  const pendingOthers = meeting.participants.filter(p => p.name !== name.trim() && !p.submittedAt)
  const allOthersResponded = othersTotal > 0 && pendingOthers.length === 0
  const viableKeys = allOthersResponded ? new Set(Object.keys(othersCount)) : undefined

  // "표시 안 함 = 불가" 모델이라, 가능 시간이 0개면 제출을 막는다 (빈 응답이 추천을 오염시킴)
  const markedCount = Object.values(preferences).filter(p => p !== 'no').length

  // 확정 여부 재확인 — 확정됐으면 확정 화면, 아니면 대기 화면
  function checkConfirmed() {
    if (!id) return
    const fresh = getMeeting(id)
    setMeeting(fresh)
    setStep(fresh?.confirmedSlot ? 'name' : 'pending')
  }

  // 제출 버튼 클릭 — 참여방식 미선택이면 제출 대신 그쪽으로 스크롤/강조
  function handleSubmitClick() {
    if (markedCount === 0) return
    if (meeting!.format === 'both' && !formatPreference) {
      formatRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      setHighlightFormat(true)
      setTimeout(() => setHighlightFormat(false), 1800)
      return
    }
    handleSubmit()
  }

  function handleSubmit() {
    if (!id || !name.trim() || !meeting || markedCount === 0) return
    const loggedInUser = getUser()
    // 주최자 셋업이면 필수 참석자로 등록
    addParticipant(id, name.trim(), isOrganizerSetup, contact.trim() || undefined, loggedInUser?.email)
    const fp = meeting.format === 'both' ? (formatPreference ?? undefined) : undefined
    submitResponse(id, name.trim(), preferences, fp)
    if (isOrganizerSetup) { navigate(`/meeting/${id}/share`); return }
    setStep('done')
  }

  // 남들이 가능한 시간을 내 응답으로 미리 채운다 (이미 표시한 칸은 유지) → 안 되는 것만 빼면 됨
  function prefillFromOthers() {
    setPreferences(prev => {
      const next = { ...prev }
      for (const key of Object.keys(othersCount)) {
        if (!next[key]) next[key] = 'okay'
      }
      return next
    })
  }

  // 아직 남들 겹침 칸 중 내가 안 채운 게 있는지 (버튼 노출 판단)
  const hasUnfilledOverlap = !isFirstParticipant &&
    Object.keys(othersCount).some(key => !preferences[key])

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <Logo size="sm" />
      </header>

      {step === 'grid' && (
        <div className={styles.whoBar}>
          <span className={styles.whoName}>
            <b>{name}</b>님{isOrganizerSetup ? '(주최자)' : ''}으로 응답 중
          </span>
          {isOrganizerSetup ? (
            <button className={styles.whoEdit} onClick={() => navigate(`/meeting/${id}/share`)}>참석 안 해요 · 건너뛰기</button>
          ) : (
            <button className={styles.whoEdit} onClick={() => setStep('name')}>이름 수정</button>
          )}
        </div>
      )}

      <div className={styles.contextCard}>
        <p className={styles.contextLabel}>회의 요청</p>
        <h2 className={styles.contextTitle}>{meeting.title}</h2>
        <p className={styles.contextMeta}>
          {meeting.organizerName} · {fmtDate(meeting.dateRange.start)} ~ {fmtDate(meeting.dateRange.end)} · {meeting.durationMinutes}분
          {formatMeta(meeting.format) && (
            <span style={{ marginLeft: 6 }}>
              · <Icon name={formatMeta(meeting.format)!.icon} size={13} /> {formatMeta(meeting.format)!.label}
              {meeting.location && ` (${meeting.location})`}
            </span>
          )}
        </p>
      </div>

      {step === 'name' && (
        <div className={styles.card}>
          <h3 className={styles.stepTitle}>먼저 알려주세요</h3>

          {/* 사전 등록된 참여자 목록 */}
          {(() => {
            const allKnown = [
              { name: meeting.organizerName, contact: undefined, responded: false },
              ...meeting.participants.map(p => ({ name: p.name, contact: p.contact, responded: !!p.submittedAt }))
            ].filter((p, i, arr) => arr.findIndex(x => x.name === p.name) === i)

            const pending = allKnown.filter(p => !p.responded)
            const responded = allKnown.filter(p => p.responded)

            if (allKnown.length === 0) return null
            return (
              <div className={styles.quickPick}>
                {pending.length > 0 && (
                  <>
                    <p className={styles.quickPickLabel}>본인을 선택하세요</p>
                    <div className={styles.quickPickList}>
                      {pending.map(p => (
                        <button
                          key={p.name}
                          className={`${styles.quickPickBtn} ${name === p.name ? styles.quickPickBtnActive : ''}`}
                          onClick={() => { setName(p.name); setContact(p.contact ?? ''); setPreferences({}); setStep('grid') }}
                        >
                          {p.name}
                        </button>
                      ))}
                    </div>
                  </>
                )}
                {responded.length > 0 && (
                  <>
                    <p className={styles.quickPickLabel} style={{ marginTop: pending.length > 0 ? 12 : 0 }}>응답 수정</p>
                    <div className={styles.quickPickList}>
                      {responded.map(p => {
                        const existing = meeting.participants.find(pt => pt.name === p.name)
                        return (
                          <button
                            key={p.name}
                            className={`${styles.quickPickBtn} ${styles.quickPickBtnEdit}`}
                            onClick={() => {
                              setName(p.name)
                              setContact(p.contact ?? '')
                              setPreferences(existing?.preferences ?? {})
                              setFormatPreference(existing?.formatPreference ?? null)
                              setStep('grid')
                            }}
                          >
                            {p.name} <span className={styles.editBadge}>수정</span>
                          </button>
                        )
                      })}
                    </div>
                  </>
                )}

              </div>
            )
          })()}

          {/* 직접 입력 */}
          <div className={styles.nameFields}>
            <p className={styles.quickPickDivider}>목록에 없다면 직접 입력</p>
            <div className={styles.nameFieldGroup}>
              <label className={styles.nameLabel}>이름</label>
              <input
                className={styles.nameInput}
                type="text"
                placeholder="송서현A"
                value={name}
                onChange={e => setName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && name.trim() && !nameClash && setStep('grid')}
              />
              {nameClash ? (
                <p className={styles.nameError}>
                  <Icon name="x" size={13} /> 이미 <b>{name.trim()}</b>님이 응답했어요. 본인이면 위 <b>‘응답 수정’</b>을 누르고, 다른 사람이면 <b>{name.trim()}B</b>처럼 구분해 주세요.
                </p>
              ) : (
                <p className={styles.nameHint}><Icon name="bulb" size={13} /> 동명이인이 있다면 <b>송서현A</b>처럼 구분 표시를 꼭 붙여주세요</p>
              )}
            </div>
            <div className={styles.nameFieldGroup}>
              <label className={styles.nameLabel}>연락처 <span className={styles.optionalLabel}>(선택)</span></label>
              <input
                className={styles.nameInput}
                type="text"
                placeholder="카카오톡 ID · 전화번호 · 이메일"
                value={contact}
                onChange={e => setContact(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && name.trim() && !nameClash && setStep('grid')}
              />
            </div>
            <p className={styles.contactHint}>동명이인 구분 및 일정 조율 연락에 사용돼요</p>
          </div>
          <button
            className={styles.primaryBtn}
            disabled={!name.trim() || nameClash}
            onClick={() => setStep('grid')}
          >
            다음
          </button>
        </div>
      )}

      {step === 'grid' && (
        <div className={styles.gridCard}>
          <div className={styles.gridHeader}>
            {meeting && name && isEditingExisting(meeting, name) ? (
              <div className={styles.editBanner}>
                <span className={styles.firstBannerIcon}><Icon name="pencil" size={15} /></span>
                <p>{name}님의 기존 응답을 수정하고 있어요. 완료 후 제출하기를 눌러주세요.</p>
              </div>
            ) : isFirstParticipant ? (
              <>
                <h3 className={styles.stepTitle}>가능한 시간을 최대한 많이 표시해주세요</h3>
                <div className={styles.firstBanner}>
                  <span className={styles.firstBannerIcon}><Icon name="flag" size={15} /></span>
                  <p>첫 번째 응답이에요! 많이 표시할수록 시간 맞추기가 쉬워져요</p>
                </div>
              </>
            ) : (
              <>
                <h3 className={styles.stepTitle}>가능한 시간을 표시해주세요</h3>
                <div className={styles.narrowBanner}>
                  <span>이미 <b>{othersTotal}명</b>이 응답했어요</span>
                  <span className={styles.narrowSub}>
                    {allOthersResponded ? '회색 칸은 아무도 안 되는 시간이라 잠겨 있어요' : '테두리가 진한 시간에 맞추면 조율이 빨라져요'}
                  </span>
                </div>
              </>
            )}
          </div>

          {hasUnfilledOverlap && (
            <button type="button" className={styles.prefillBtn} onClick={prefillFromOthers}>
              <span className={styles.prefillMain}><Icon name="sparkle" size={15} /> 다들 가능한 시간 먼저 채우기</span>
              <span className={styles.prefillSub}>안 되는 시간만 빼면 돼요</span>
            </button>
          )}

          {markedCount > 0 && (
            <div className={styles.gridToolbar}>
              <span className={styles.markedCountText}>{markedCount}칸 선택됨</span>
              <button type="button" className={styles.resetBtn} onClick={() => setPreferences({})}>
                <Icon name="refresh" size={13} /> 전체 해제
              </button>
            </div>
          )}

          <TimeGrid
            dates={dates}
            preferences={preferences}
            onChange={(key, pref) => setPreferences(prev => ({ ...prev, [key]: pref }))}
            othersCount={isFirstParticipant ? undefined : othersCount}
            othersTotal={othersTotal}
            activeKeys={viableKeys}
          />

          {meeting.format === 'both' && (
            <div ref={formatRef} className={`${styles.formatPick} ${highlightFormat ? styles.formatPickHighlight : ''}`}>
              <p className={styles.formatPickLabel}>이 회의, 어떻게 참여하실 예정인가요?</p>
              <div className={styles.formatPickRow}>
                {([
                  { value: 'online', icon: 'monitor', label: '온라인' },
                  { value: 'offline', icon: 'pin', label: '오프라인' },
                  { value: 'both', icon: 'shuffle', label: '모두 가능' },
                ] as { value: 'online' | 'offline' | 'both'; icon: 'monitor' | 'pin' | 'shuffle'; label: string }[]).map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    className={`${styles.formatPickBtn} ${formatPreference === opt.value ? styles.formatPickBtnActive : ''}`}
                    onClick={() => setFormatPreference(opt.value)}
                  >
                    <span style={{ display: 'flex' }}><Icon name={opt.icon} size={18} /></span>
                    <span>{opt.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className={styles.floatBar}>
            <button className={styles.floatSubmit} onClick={handleSubmitClick} disabled={markedCount === 0}>
              {markedCount === 0
                ? '가능한 시간을 1개 이상 표시해주세요'
                : (meeting.format === 'both' && !formatPreference)
                ? '참여 방식 선택하기'
                : '제출하기'}
            </button>
          </div>
        </div>
      )}

      {step === 'done' && (
        <div className={styles.card}>
          <Logo size="md" />
          <h3 className={styles.stepTitle}>응답 완료!</h3>
          <p className={styles.doneDesc}>
            {meeting.organizerName}님이 시간을 확정하면<br />여기에서 바로 확인할 수 있어요
          </p>
          <button className={styles.primaryBtn} onClick={checkConfirmed}>
            확정 결과 확인하기
          </button>
          <button className={styles.secondaryBtn} onClick={() => setStep('grid')}>
            내 응답 수정하기
          </button>
        </div>
      )}

      {step === 'pending' && (
        <div className={styles.card}>
          <img src="/bifinal.png" alt="" className={styles.pendingImg} />
          <h3 className={styles.stepTitle}>아직 확정 전이에요</h3>
          <p className={styles.doneDesc}>
            {meeting.organizerName}님이 시간을 확정하면<br />이 링크에서 확인할 수 있어요
          </p>
          <button className={styles.primaryBtn} onClick={checkConfirmed}>
            다시 확인하기
          </button>
          <button className={styles.secondaryBtn} onClick={() => setStep('grid')}>
            내 응답 수정하기
          </button>
        </div>
      )}
    </div>
  )
}
