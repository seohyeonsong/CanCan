import type { Meeting, MeetingFormat, Preference, TimeSlot } from '../types'

const STORAGE_KEY = 'cancan_meetings'

function generateId(): string {
  return Math.random().toString(36).slice(2, 10)
}

function load(): Record<string, Meeting> {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}')
  } catch {
    return {}
  }
}

function save(meetings: Record<string, Meeting>): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(meetings))
}

const DEMO_ID = 'demo-kickoff'

function localDateStr(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

// 시드 데이터 스키마 버전 — 응답 모델이 바뀌면 올려서 기존 브라우저도 갱신
const SEED_VERSION = '4'

// 심사/데모용: 응답이 모두 모인 현실적인 회의를 1개 시딩한다.
// 날짜는 접속 시점 기준으로 생성해 항상 "다가오는 회의"로 보이게 한다.
// 같은 버전으로 이미 시딩돼 있으면 아무 것도 하지 않는다(멱등).
export function seedDemoMeeting(ownerEmail: string): string {
  const meetings = load()
  if (meetings[DEMO_ID] && localStorage.getItem('cancan_seed_v') === SEED_VERSION) return DEMO_ID

  // 다음 평일(월)부터 3일(월·화·수) 범위
  const base = new Date()
  base.setHours(0, 0, 0, 0)
  base.setDate(base.getDate() + 1)
  while (base.getDay() === 0 || base.getDay() === 6) base.setDate(base.getDate() + 1)
  const dates: string[] = []
  const cur = new Date(base)
  while (dates.length < 3) {
    if (cur.getDay() !== 0 && cur.getDay() !== 6) dates.push(localDateStr(cur))
    cur.setDate(cur.getDate() + 1)
  }
  const [d1, d2, d3] = dates

  const key = (date: string, hour: number, minute: 0 | 30) => `${date}-${hour}-${minute}`

  // "표시 안 함 = 불가" 모델: 가능한 시간만 희소하게 마킹한다
  function marks(list: [string, number, 0 | 30, Preference][]): Record<string, Preference> {
    const p: Record<string, Preference> = {}
    for (const [date, h, m, pref] of list) p[key(date, h, m)] = pref
    return p
  }

  const now = new Date().toISOString()

  const participants: Meeting['participants'] = [
    {
      // 지훈 (필수·온라인) — 오후 위주로 가능
      name: '김지훈', isRequired: true, formatPreference: 'online',
      preferences: marks([
        [d1, 10, 0, 'okay'], [d1, 10, 30, 'okay'],
        [d1, 14, 0, 'good'], [d1, 14, 30, 'good'], [d1, 15, 0, 'good'], [d1, 15, 30, 'good'],
        [d2, 14, 0, 'good'], [d2, 14, 30, 'good'],
        [d2, 16, 0, 'okay'], [d2, 16, 30, 'okay'],
        [d3, 11, 0, 'okay'], [d3, 11, 30, 'okay'],
      ]),
      submittedAt: now,
    },
    {
      // 민아 (필수·오프라인) — 지훈과 d1 오후·d2 14시·d3 11시만 겹침
      name: '이민아', isRequired: true, formatPreference: 'offline',
      preferences: marks([
        [d1, 14, 0, 'good'], [d1, 14, 30, 'good'], [d1, 15, 0, 'okay'], [d1, 15, 30, 'okay'],
        [d2, 10, 0, 'good'], [d2, 10, 30, 'good'],
        [d2, 14, 0, 'okay'], [d2, 14, 30, 'okay'],
        [d3, 11, 0, 'good'], [d3, 11, 30, 'good'],
      ]),
      submittedAt: now,
    },
    {
      // 수빈 (선택·모두 가능)
      name: '박수빈', isRequired: false, formatPreference: 'both',
      preferences: marks([
        [d1, 9, 0, 'okay'], [d1, 9, 30, 'okay'],
        [d1, 14, 0, 'good'], [d1, 14, 30, 'good'],
        [d2, 14, 0, 'good'], [d2, 14, 30, 'good'],
        [d3, 11, 0, 'okay'], [d3, 11, 30, 'okay'],
      ]),
      submittedAt: now,
    },
    {
      // 태호 (선택·온라인) — d2 14시는 조율 가능
      name: '정태호', isRequired: false, formatPreference: 'online',
      preferences: marks([
        [d1, 14, 0, 'okay'], [d1, 14, 30, 'okay'],
        [d1, 15, 0, 'good'], [d1, 15, 30, 'good'],
        [d2, 14, 0, 'flexible'], [d2, 14, 30, 'flexible'],
      ]),
      submittedAt: now,
    },
  ]

  const meeting: Meeting = {
    id: DEMO_ID,
    title: '신규 서비스 킥오프 회의',
    organizerName: '데모 사용자',
    ownerEmail,
    format: 'both',
    location: '',
    dateRange: { start: d1, end: d3 },
    durationMinutes: 60,
    participants,
    createdAt: now,
    confirmedSlot: null,
  }

  meetings[DEMO_ID] = meeting

  // 확정 완료 상태 데모 — 심사자가 "확정 후(취소·공유·캘린더)" 흐름도 바로 보게
  meetings['demo-confirmed'] = {
    id: 'demo-confirmed',
    title: '디자인 시스템 리뷰',
    organizerName: '데모 사용자',
    ownerEmail,
    format: 'online',
    location: 'Google Meet',
    dateRange: { start: d1, end: d3 },
    durationMinutes: 60,
    participants: [
      { name: '김지훈', isRequired: true, formatPreference: 'online', preferences: marks([[d2, 15, 0, 'good'], [d2, 15, 30, 'good']]), submittedAt: now },
      { name: '이민아', isRequired: true, formatPreference: 'online', preferences: marks([[d2, 15, 0, 'good'], [d2, 15, 30, 'good']]), submittedAt: now },
      { name: '박수빈', isRequired: false, formatPreference: 'online', preferences: marks([[d2, 15, 0, 'okay'], [d2, 15, 30, 'okay']]), submittedAt: now },
    ],
    createdAt: now,
    confirmedSlot: { date: d2, hour: 15, minute: 0 },
  }

  save(meetings)
  localStorage.setItem('cancan_seed_v', SEED_VERSION)
  return DEMO_ID
}

export function getMyMeetings(email: string): Meeting[] {
  const meetings = load()
  return Object.values(meetings).filter(m =>
    m.ownerEmail === email ||
    m.participants.some(p => p.email === email)
  ).sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

export function createMeeting(data: {
  title: string
  organizerName: string
  ownerEmail?: string
  format?: MeetingFormat
  location?: string
  dateRange: { start: string; end: string }
  durationMinutes: number
  responseDeadline?: string
  participants: { name: string; isRequired: boolean }[]
}): Meeting {
  const meetings = load()
  const id = generateId()
  const meeting: Meeting = {
    id,
    title: data.title,
    organizerName: data.organizerName,
    ownerEmail: data.ownerEmail,
    format: data.format,
    location: data.location,
    dateRange: data.dateRange,
    durationMinutes: data.durationMinutes,
    responseDeadline: data.responseDeadline,
    participants: data.participants.map(p => ({
      name: p.name,
      isRequired: p.isRequired,
      preferences: {},
      submittedAt: null,
    })),
    createdAt: new Date().toISOString(),
    confirmedSlot: null,
  }
  meetings[id] = meeting
  save(meetings)
  return meeting
}

// 링크로 전달받은 회의 스냅샷 저장 (기존 데이터가 없을 때만 — 원본을 덮지 않음)
export function importMeeting(meeting: Meeting): void {
  const meetings = load()
  if (!meetings[meeting.id]) {
    meetings[meeting.id] = meeting
    save(meetings)
  }
}

export function getMeeting(id: string): Meeting | null {
  const meetings = load()
  return meetings[id] ?? null
}

export function submitResponse(
  meetingId: string,
  participantName: string,
  preferences: Record<string, Preference>,
  formatPreference?: 'online' | 'offline' | 'both'
): void {
  const meetings = load()
  const meeting = meetings[meetingId]
  if (!meeting) return

  const existing = meeting.participants.find(p => p.name === participantName)
  if (existing) {
    existing.preferences = preferences
    if (formatPreference) existing.formatPreference = formatPreference
    existing.submittedAt = new Date().toISOString()
  } else {
    meeting.participants.push({
      name: participantName,
      isRequired: false,
      formatPreference,
      preferences,
      submittedAt: new Date().toISOString(),
    })
  }
  save(meetings)
}

export function confirmMeeting(
  meetingId: string,
  slot: TimeSlot,
  format?: MeetingFormat,
  location?: string
): void {
  const meetings = load()
  const meeting = meetings[meetingId]
  if (!meeting) return
  meeting.confirmedSlot = slot
  if (format) meeting.format = format
  meeting.location = location ?? meeting.location
  save(meetings)
}

export function unconfirmMeeting(meetingId: string): void {
  const meetings = load()
  const meeting = meetings[meetingId]
  if (!meeting) return
  meeting.confirmedSlot = null
  save(meetings)
}

export function removeParticipant(meetingId: string, name: string): void {
  const meetings = load()
  const meeting = meetings[meetingId]
  if (!meeting) return
  meeting.participants = meeting.participants.filter(p => p.name !== name)
  save(meetings)
}

export function addParticipant(
  meetingId: string,
  name: string,
  isRequired: boolean,
  contact?: string,
  email?: string
): void {
  const meetings = load()
  const meeting = meetings[meetingId]
  if (!meeting) return
  if (!meeting.participants.find(p => p.name === name)) {
    meeting.participants.push({
      name,
      email,
      contact,
      isRequired,
      preferences: {},
      submittedAt: null,
    })
  } else {
    const existing = meeting.participants.find(p => p.name === name)
    if (existing) {
      if (contact) existing.contact = contact
      if (email) existing.email = email
    }
  }
  save(meetings)
}
