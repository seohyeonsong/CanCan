import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { createMeeting } from '../../lib/store'
import { getUser } from '../../lib/auth'
import { Icon, type IconName } from '../../components/Icon/Icon'
import type { MeetingFormat } from '../../types'
import styles from './CreateMeeting.module.css'

interface ParticipantInput {
  name: string
  contact?: string
  isRequired: boolean
}

const DURATION_OPTIONS = [
  { label: '30분', value: 30 },
  { label: '1시간', value: 60 },
  { label: '1시간 30분', value: 90 },
  { label: '2시간', value: 120 },
]

export function CreateMeeting() {
  const navigate = useNavigate()
  const user = getUser()
  const [title, setTitle] = useState('')
  const [organizerName, setOrganizerName] = useState('')
  const [startDate, setStartDate] = useState(() => {
    const n = new Date()
    const p = (x: number) => String(x).padStart(2, '0')
    return `${n.getFullYear()}-${p(n.getMonth() + 1)}-${p(n.getDate())}`
  })
  const [endDate, setEndDate] = useState('')
  const [duration, setDuration] = useState(60)
  const [format, setFormat] = useState<MeetingFormat>('online')
  const [location, setLocation] = useState('')
  const [responseDeadline, setResponseDeadline] = useState('')
  const [participants, setParticipants] = useState<ParticipantInput[]>([])
  const [newName, setNewName] = useState('')
  const [newContact, setNewContact] = useState('')
  const [newIsRequired, setNewIsRequired] = useState(true)
  const [errors, setErrors] = useState<Record<string, string>>({})

  // 오늘(로컬) — 지난 날짜 선택 차단용
  const now = new Date()
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`

  function addParticipant() {
    const nm = newName.trim()
    if (!nm) return
    // 같은 이름(주최자 포함)이 이미 있으면 막고 안내 — 동명이인은 구분 표시 유도
    const taken = nm === organizerName.trim() || participants.some(p => p.name === nm)
    if (taken) {
      setErrors(p => ({ ...p, newName: `이미 '${nm}'이(가) 있어요. 구분해서 적어주세요 (예: ${nm} B)` }))
      return
    }
    setParticipants(prev => [...prev, { name: nm, contact: newContact.trim() || undefined, isRequired: newIsRequired }])
    setNewName('')
    setNewContact('')
    setErrors(p => ({ ...p, newName: '' }))
  }

  function removeParticipant(index: number) {
    setParticipants(prev => prev.filter((_, i) => i !== index))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const today = new Date(); today.setHours(0,0,0,0)
    const newErrors: Record<string, string> = {}
    if (!title.trim()) newErrors.title = '회의 이름을 입력해주세요'
    if (!organizerName.trim()) newErrors.organizerName = '주최자 이름을 입력해주세요'
    else if (participants.some(p => p.name === organizerName.trim())) newErrors.organizerName = '참여자와 같은 이름이에요. 구분해서 적어주세요'
    if (!startDate) newErrors.startDate = '시작일을 선택해주세요'
    else if (new Date(startDate) < today) newErrors.startDate = '오늘 이후 날짜를 선택해주세요'
    if (!endDate) newErrors.endDate = '종료일을 선택해주세요'
    else if (startDate && endDate < startDate) newErrors.endDate = '종료일은 시작일 이후여야 해요'
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      // 에러가 폼 위쪽에 있으니, 눌렀는데 아무 일도 없어 보이지 않게 위로 스크롤
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }
    setErrors({})
    const meeting = createMeeting({
      title,
      organizerName,
      ownerEmail: user?.email,
      format,
      location: (format !== 'online' && location.trim()) ? location.trim() : undefined,
      dateRange: { start: startDate, end: endDate },
      durationMinutes: duration,
      responseDeadline: responseDeadline || undefined,
      participants,
    })
    navigate(`/meeting/${meeting.id}/respond?setup=1`)
  }


  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.heroGradient}>
          <button type="button" className={styles.backBtn} onClick={() => navigate('/meetings')} aria-label="뒤로">‹ 내 회의</button>
          <p className={styles.heroTitle}>새 회의 만들기</p>
          <p className={styles.heroSub}>회의 정보를 입력하면 공유 링크가 만들어져요</p>
        </div>
      </header>

      <form className={styles.form} onSubmit={handleSubmit}>
        <div className={styles.card}>
          <h2 className={styles.sectionTitle}>회의 정보</h2>

          <div className={styles.field}>
            <label className={styles.label}>회의 이름</label>
            <input
              className={`${styles.input} ${errors.title ? styles.inputError : ''}`}
              type="text"
              placeholder="무슨 회의인가요?"
              value={title}
              onChange={e => { setTitle(e.target.value); setErrors(p => ({...p, title: ''})) }}
            />
            {errors.title && <p className={styles.errorMsg}>{errors.title}</p>}
          </div>

          <div className={styles.field}>
            <label className={styles.label}>주최자 이름</label>
            <input
              className={`${styles.input} ${errors.organizerName ? styles.inputError : ''}`}
              type="text"
              placeholder="김토스 A"
              value={organizerName}
              onChange={e => { setOrganizerName(e.target.value); setErrors(p => ({...p, organizerName: ''})) }}
            />
            {errors.organizerName && <p className={styles.errorMsg}>{errors.organizerName}</p>}
          </div>

          <div className={styles.field}>
            <label className={styles.label}>후보 기간</label>
            <p className={styles.fieldHint}>이 기간 안에서 다 같이 되는 시간을 찾아요</p>
            <div className={styles.fieldRow}>
              <div className={styles.field}>
                <input
                  className={`${styles.input} ${errors.startDate ? styles.inputError : ''}`}
                  type="date"
                  aria-label="언제부터"
                  min={todayStr}
                  value={startDate}
                  onChange={e => { setStartDate(e.target.value); setErrors(p => ({...p, startDate: ''})) }}
                />
                {errors.startDate && <p className={styles.errorMsg}>{errors.startDate}</p>}
              </div>
              <span className={styles.rangeSep}>~</span>
              <div className={styles.field}>
                <input
                  className={`${styles.input} ${errors.endDate ? styles.inputError : ''}`}
                  type="date"
                  aria-label="언제까지"
                  min={startDate || todayStr}
                  value={endDate}
                  onChange={e => { setEndDate(e.target.value); setErrors(p => ({...p, endDate: ''})) }}
                />
                {errors.endDate && <p className={styles.errorMsg}>{errors.endDate}</p>}
              </div>
            </div>
          </div>

          <div className={styles.field}>
            <label className={styles.label}>응답 마감일 <span style={{ fontWeight: 400, color: '#94a3b8' }}>(선택)</span></label>
            <input
              className={`${styles.input} ${errors.responseDeadline ? styles.inputError : ''}`}
              type="date"
              min={todayStr}
              value={responseDeadline}
              onChange={e => { setResponseDeadline(e.target.value); setErrors(p => ({...p, responseDeadline: ''})) }}
            />
            {errors.responseDeadline && <p className={styles.errorMsg}>{errors.responseDeadline}</p>}
          </div>

          <div className={styles.field}>
            <label className={styles.label}>소요 시간</label>
            <div className={styles.segmented}>
              {DURATION_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  className={`${styles.segmentBtn} ${duration === opt.value ? styles.segmentActive : ''}`}
                  onClick={() => setDuration(opt.value)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className={styles.field}>
            <label className={styles.label}>진행 방식</label>
            <div className={styles.segmented}>
              {([
                { value: 'online', icon: 'monitor', label: '온라인' },
                { value: 'offline', icon: 'pin', label: '오프라인' },
                { value: 'both', icon: 'shuffle', label: '둘 다 가능' },
              ] as { value: MeetingFormat; icon: IconName; label: string }[]).map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  className={`${styles.segmentBtn} ${format === opt.value ? styles.segmentActive : ''}`}
                  onClick={() => setFormat(opt.value)}
                >
                  <Icon name={opt.icon} size={15} /> {opt.label}
                </button>
              ))}
            </div>
          </div>

          {(format === 'offline' || format === 'both') && (
            <div className={styles.field}>
              <label className={styles.label}>장소 <span style={{ fontWeight: 400, color: '#94a3b8' }}>(선택)</span></label>
              <input
                className={styles.input}
                type="text"
                placeholder="예: 토스 본사 회의실 A"
                value={location}
                onChange={e => setLocation(e.target.value)}
              />
            </div>
          )}
        </div>

        <div className={styles.card}>
          <h2 className={styles.sectionTitle}>참여자</h2>
          <p className={styles.hint}>지금 추가하지 않아도 링크 공유 후 참여자가 직접 합류할 수 있어요</p>

          <div className={styles.participantInput}>
            <input
              className={`${styles.input} ${errors.newName ? styles.inputError : ''}`}
              type="text"
              placeholder="이름 (예: 김토스 B)"
              value={newName}
              onChange={e => { setNewName(e.target.value); setErrors(p => ({...p, newName: ''})) }}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addParticipant() } }}
            />
            {errors.newName && <p className={styles.errorMsg}>{errors.newName}</p>}
            <input
              className={styles.input}
              type="text"
              placeholder="연락처 (선택) — 카카오톡·전화번호 등"
              value={newContact}
              onChange={e => setNewContact(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addParticipant() } }}
            />
            <div className={styles.participantActions}>
              <div className={styles.requiredToggle}>
                <button
                  type="button"
                  className={`${styles.toggleBtn} ${newIsRequired ? styles.toggleOn : styles.toggleOff}`}
                  onClick={() => setNewIsRequired(true)}
                >
                  필수
                </button>
                <button
                  type="button"
                  className={`${styles.toggleBtn} ${!newIsRequired ? styles.toggleOn : styles.toggleOff}`}
                  onClick={() => setNewIsRequired(false)}
                >
                  선택
                </button>
              </div>
              <button type="button" className={styles.addBtn} onClick={addParticipant}>
                추가
              </button>
            </div>
          </div>

          {participants.length > 0 && (
            <ul className={styles.participantList}>
              {participants.map((p, i) => (
                <li key={i} className={styles.participantItem}>
                  <div className={styles.participantInfo}>
                    <span className={styles.participantName}>{p.name}</span>
                    {p.contact && <span className={styles.participantContact}>{p.contact}</span>}
                  </div>
                  <span className={`${styles.typeBadge} ${p.isRequired ? styles.badgeRequired : styles.badgeOptional}`}>
                    {p.isRequired ? '필수' : '선택'}
                  </span>
                  <button
                    type="button"
                    className={styles.removeBtn}
                    onClick={() => removeParticipant(i)}
                    aria-label="삭제"
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <button type="submit" className={styles.submitBtn}>
          링크 만들기
        </button>
      </form>
    </div>
  )
}
