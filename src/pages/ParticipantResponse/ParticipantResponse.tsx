import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { getMeeting, submitResponse, addParticipant } from '../../lib/store'
import { loadGoogleScript, initTokenClient, requestAccessToken, fetchBusySlots, mockBusySlots } from '../../lib/googleCalendar'
import { TimeGrid } from '../../components/TimeGrid/TimeGrid'
import { getDateRange } from '../../lib/algorithm'
import type { Preference, Meeting, ParticipantResponse as ParticipantResponseType } from '../../types'
import { getUser } from '../../lib/auth'
import { Logo } from '../../components/Logo/Logo'
import styles from './ParticipantResponse.module.css'

type Step = 'name' | 'calendar' | 'grid' | 'done'

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
  const [meeting, setMeeting] = useState<Meeting | null>(null)
  const [step, setStep] = useState<Step>('name')
  const [name, setName] = useState('')
  const [contact, setContact] = useState('')
  const [preferences, setPreferences] = useState<Record<string, Preference>>({})
  const [formatPreference, setFormatPreference] = useState<'online' | 'offline' | 'both'>('both')
  const [isLoading, setIsLoading] = useState(false)
  const [googleReady, setGoogleReady] = useState(false)
  const [calendarKeys, setCalendarKeys] = useState<Set<string>>(new Set())
  const [usedDemoCalendar, setUsedDemoCalendar] = useState(false)

  useEffect(() => {
    if (id) setMeeting(getMeeting(id))
  }, [id])

  useEffect(() => {
    loadGoogleScript().then(() => {
      setGoogleReady(true)
    }).catch(console.error)
  }, [])

  if (!meeting) return <div className={styles.error}>회의를 찾을 수 없어요</div>

  const shareUrl = `${window.location.origin}/meeting/${id}/respond`

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
        <div className={styles.contextCard}>
          <p className={styles.contextLabel}>회의 요청</p>
          <h2 className={styles.contextTitle}>{meeting.title}</h2>
          <p className={styles.contextMeta}>
            {meeting.organizerName} · {meeting.durationMinutes}분
            {meeting.format && (
              <span style={{ marginLeft: 6 }}>
                · {meeting.format === 'online' ? '💻 온라인' : meeting.format === 'offline' ? '📍 오프라인' : '🔀 온·오프라인'}
                {meeting.location && ` (${meeting.location})`}
              </span>
            )}
          </p>
        </div>
        <div className={styles.card}>
          <div style={{ fontSize: 40 }}>🎉</div>
          <h3 className={styles.stepTitle}>회의 시간이 확정됐어요!</h3>
          <div className={styles.confirmedTime}>{confirmedStr}</div>
          <p className={styles.confirmedSub}>{meeting.organizerName}님이 일정을 확정했어요</p>
        </div>
      </div>
    )
  }

  const dates = getDateRange(meeting.dateRange.start, meeting.dateRange.end)
  const respondedParticipants = meeting.participants.filter(p => p.submittedAt !== null)
  const isFirstParticipant = respondedParticipants.length === 0

  // 이전 참여자 응답 기반으로 "아직 살아있는" 슬롯만 추출
  // 필수 참여자가 '안 돼요'로 막은 슬롯은 제외
  function computeActiveKeys(): Set<string> | null {
    if (isFirstParticipant) return null  // 첫 참여자 → 전부 활성
    const required = respondedParticipants.filter((p: ParticipantResponseType) => p.isRequired)
    const ref = required.length > 0 ? required : respondedParticipants
    const active = new Set<string>()
    for (const date of dates) {
      for (let h = 9; h <= 21; h++) {
        if (h === 12) continue
        for (const m of [0, 30] as const) {
          const key = `${date}-${h}-${m}`
          const blocked = ref.some((p: ParticipantResponseType) => (p.preferences[key] ?? 'okay') === 'no')
          if (!blocked) active.add(key)
        }
      }
    }
    return active
  }

  const activeKeys = computeActiveKeys()

  function initEmptyPreferences(): Record<string, Preference> {
    return {}
  }

  function applyDemoCalendar() {
    if (!meeting) return
    const result = mockBusySlots(meeting.dateRange.start, meeting.dateRange.end)
    setPreferences(result.preferences)
    setCalendarKeys(result.calendarKeys)
    setUsedDemoCalendar(true)
    setIsLoading(false)
    setStep('grid')
  }

  function handleGoogleSync() {
    if (!meeting) return
    setIsLoading(true)

    let settled = false

    // 실제 Google 계정(등록된 origin·테스트 사용자)이면 진짜 캘린더를 불러온다.
    if (googleReady) {
      initTokenClient(async (_token) => {
        if (settled) return
        settled = true
        try {
          const result = await fetchBusySlots(meeting.dateRange.start, meeting.dateRange.end)
          setPreferences(result.preferences)
          setCalendarKeys(result.calendarKeys)
          setUsedDemoCalendar(false)
          setStep('grid')
        } catch (e) {
          console.error(e)
          applyDemoCalendar()
        } finally {
          setIsLoading(false)
        }
      })
      requestAccessToken()
    }

    // OAuth를 못 쓰는 환경(미등록 origin·팝업 차단·데모)에서는
    // 2.5초 안에 응답이 없으면 예시 캘린더로 자동 폴백한다.
    setTimeout(() => {
      if (settled) return
      settled = true
      applyDemoCalendar()
    }, googleReady ? 2500 : 300)
  }

  function handleManual() {
    setIsLoading(false)
    setPreferences(initEmptyPreferences())
    setStep('grid')
  }

  function handleSubmit() {
    if (!id || !name.trim() || !meeting) return
    const loggedInUser = getUser()
    addParticipant(id, name.trim(), false, contact.trim() || undefined, loggedInUser?.email)
    const fp = meeting.format === 'both' ? formatPreference : undefined
    submitResponse(id, name.trim(), preferences, fp)
    setStep('done')
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <Logo size="sm" />
      </header>

      <div className={styles.contextCard}>
        <p className={styles.contextLabel}>회의 요청</p>
        <h2 className={styles.contextTitle}>{meeting.title}</h2>
        <p className={styles.contextMeta}>
          {meeting.organizerName} · {fmtDate(meeting.dateRange.start)} ~ {fmtDate(meeting.dateRange.end)} · {meeting.durationMinutes}분
          {meeting.format && (
            <span style={{ marginLeft: 6 }}>
              · {meeting.format === 'online' ? '💻 온라인' : meeting.format === 'offline' ? '📍 오프라인' : '🔀 온·오프라인'}
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
                          onClick={() => { setName(p.name); setContact(p.contact ?? ''); setStep('calendar') }}
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
                placeholder="홍길동"
                value={name}
                onChange={e => setName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && name.trim() && setStep('calendar')}
              />
            </div>
            <div className={styles.nameFieldGroup}>
              <label className={styles.nameLabel}>연락처 <span className={styles.optionalLabel}>(선택)</span></label>
              <input
                className={styles.nameInput}
                type="text"
                placeholder="카카오톡 ID · 전화번호 · 이메일"
                value={contact}
                onChange={e => setContact(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && name.trim() && setStep('calendar')}
              />
            </div>
            <p className={styles.contactHint}>동명이인 구분 및 일정 조율 연락에 사용돼요</p>
          </div>
          <button
            className={styles.primaryBtn}
            disabled={!name.trim()}
            onClick={() => setStep('calendar')}
          >
            다음
          </button>
        </div>
      )}

      {step === 'calendar' && (
        <div className={styles.card}>
          <h3 className={styles.stepTitle}>캘린더를 연동하면<br />바쁜 시간이 자동으로 반영돼요</h3>

          <div className={styles.canIllustration}>
            <svg width="56" height="78" viewBox="0 0 40 56" fill="none">
              <rect x="4" y="10" width="32" height="36" rx="6" fill="var(--color-primary)" />
              <ellipse cx="20" cy="10" rx="16" ry="5" fill="var(--color-primary)" />
              <ellipse cx="20" cy="46" rx="16" ry="5" fill="var(--color-primary)" opacity="0.7" />
              <rect x="9" y="14" width="4" height="24" rx="2" fill="white" opacity="0.25" />
              <text x="20" y="32" textAnchor="middle" dominantBaseline="middle" fill="white" fontSize="12" fontWeight="700">G</text>
            </svg>
          </div>

          {meeting.format === 'both' && (
            <div style={{ marginBottom: 16 }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 8 }}>어떻게 참여하실 예정인가요?</p>
              <div style={{ display: 'flex', gap: 8, width: '100%' }}>
                {([
                  { value: 'online', icon: '💻', label: '온라인' },
                  { value: 'offline', icon: '🏢', label: '오프라인' },
                  { value: 'both', icon: '✌️', label: '모두 가능' },
                ] as { value: 'online' | 'offline' | 'both'; icon: string; label: string }[]).map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    style={{
                      flex: 1,
                      padding: '10px 4px',
                      borderRadius: 10,
                      border: formatPreference === opt.value ? '2px solid var(--color-primary)' : '1.5px solid #e2e8f0',
                      background: formatPreference === opt.value ? 'var(--color-primary-light)' : 'white',
                      color: formatPreference === opt.value ? 'var(--color-primary)' : '#64748b',
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 4,
                      whiteSpace: 'nowrap',
                      minWidth: 0,
                    }}
                    onClick={() => setFormatPreference(opt.value)}
                  >
                    <span style={{ fontSize: 18 }}>{opt.icon}</span>
                    <span>{opt.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <button
            className={styles.primaryBtn}
            onClick={handleGoogleSync}
            disabled={isLoading}
          >
            {isLoading ? '불러오는 중...' : '📅 Google 캘린더 연동'}
          </button>
          <button className={styles.secondaryBtn} onClick={handleManual}>
            직접 입력할게요
          </button>
        </div>
      )}

      {step === 'grid' && (
        <div className={styles.gridCard}>
          <div className={styles.gridHeader}>
            {meeting && name && isEditingExisting(meeting, name) ? (
              <div className={styles.editBanner}>
                <span>✏️</span>
                <p>{name}님의 응답을 수정하고 있어요. 완료 후 제출하기를 눌러주세요.</p>
              </div>
            ) : isFirstParticipant ? (
              <>
                <h3 className={styles.stepTitle}>가능한 시간을 최대한 많이 표시해주세요</h3>
                <div className={styles.firstBanner}>
                  <span className={styles.firstBannerIcon}>🥇</span>
                  <p>첫 번째 응답이에요! 많이 표시할수록 시간 맞추기가 쉬워져요</p>
                </div>
              </>
            ) : (
              <>
                <h3 className={styles.stepTitle}>후보 시간을 골라주세요</h3>
                <div className={styles.narrowBanner}>
                  <span>앞선 {respondedParticipants.length}명 응답 기준 후보 {activeKeys?.size ?? 0}개 추렸어요</span>
                  <span className={styles.narrowSub}>흐린 칸은 이미 불가능한 시간이에요</span>
                </div>
              </>
            )}
          </div>

          {usedDemoCalendar && (
            <div className={styles.demoCalNote}>
              <span>🗓️</span>
              <p>데모 환경이라 <b>예시 캘린더</b>를 불러왔어요. 회색 칸이 기존 일정이에요 — 자유롭게 수정하세요.</p>
            </div>
          )}

          <TimeGrid
            dates={dates}
            preferences={preferences}
            onChange={(key, pref) => setPreferences(prev => ({ ...prev, [key]: pref }))}
            calendarKeys={calendarKeys}
            activeKeys={activeKeys ?? undefined}
          />

          <button className={styles.primaryBtn} onClick={handleSubmit}>
            제출하기
          </button>
        </div>
      )}

      {step === 'done' && (
        <div className={styles.card}>
          <div style={{ fontSize: 40 }}>✅</div>
          <h3 className={styles.stepTitle}>응답 완료!</h3>
          <p className={styles.doneDesc}>
            {meeting.organizerName}님이 시간을 확정하면<br />아래 링크에서 확인할 수 있어요
          </p>
          <div className={styles.linkBox}>
            <span className={styles.linkText}>{shareUrl}</span>
            <button
              className={styles.copyBtn}
              onClick={() => navigator.clipboard.writeText(shareUrl)}
            >
              복사
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
