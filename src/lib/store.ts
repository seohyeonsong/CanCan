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

// 심사/데모용: 응답이 모두 모인 현실적인 회의를 1개 시딩한다.
// 날짜는 접속 시점 기준으로 생성해 항상 "다가오는 회의"로 보이게 한다.
// 이미 시딩돼 있으면 아무 것도 하지 않는다(멱등).
export function seedDemoMeeting(ownerEmail: string): string {
  const meetings = load()
  if (meetings[DEMO_ID]) return DEMO_ID

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

  // 근무시간 전체를 기본 'okay'로 채우는 헬퍼
  function fill(base: Preference): Record<string, Preference> {
    const p: Record<string, Preference> = {}
    for (const date of dates) {
      for (let h = 9; h <= 21; h++) {
        if (h === 12) continue
        p[key(date, h, 0)] = base
        p[key(date, h, 30)] = base
      }
    }
    return p
  }

  function withOverrides(base: Preference, overrides: [string, number, 0 | 30, Preference][]): Record<string, Preference> {
    const p = fill(base)
    for (const [date, h, m, pref] of overrides) p[key(date, h, m)] = pref
    return p
  }

  const now = new Date().toISOString()

  const participants: Meeting['participants'] = [
    {
      // 지훈 — 온라인 참여, 오전은 대체로 바쁨
      name: '지훈', isRequired: true, formatPreference: 'online',
      preferences: withOverrides('okay', [
        [d1, 14, 0, 'good'], [d1, 14, 30, 'good'], [d1, 15, 0, 'good'],
        [d1, 9, 0, 'no'], [d1, 9, 30, 'no'], [d1, 10, 0, 'no'],
        [d2, 16, 0, 'good'], [d2, 16, 30, 'good'],
        [d3, 11, 0, 'no'], [d3, 11, 30, 'no'],
      ]),
      submittedAt: now,
    },
    {
      // 민아 — 오프라인 참여, 오후 롱미팅 있음
      name: '민아', isRequired: true, formatPreference: 'offline',
      preferences: withOverrides('okay', [
        [d1, 14, 0, 'good'], [d1, 14, 30, 'good'], [d1, 15, 0, 'good'],
        [d2, 13, 0, 'no'], [d2, 13, 30, 'no'], [d2, 14, 0, 'no'], [d2, 14, 30, 'no'],
        [d3, 10, 0, 'good'], [d3, 10, 30, 'good'],
      ]),
      submittedAt: now,
    },
    {
      // 수빈 — 온·오프라인 모두 가능, 유연
      name: '수빈', isRequired: false, formatPreference: 'both',
      preferences: withOverrides('good', [
        [d1, 9, 0, 'no'], [d1, 9, 30, 'no'],
        [d2, 17, 0, 'flexible'], [d2, 17, 30, 'flexible'],
      ]),
      submittedAt: now,
    },
    {
      // 태호 — 온라인 참여, 금요일 오전만 애매
      name: '태호', isRequired: false, formatPreference: 'online',
      preferences: withOverrides('okay', [
        [d1, 14, 0, 'good'], [d1, 14, 30, 'good'], [d1, 15, 0, 'good'],
        [d1, 16, 0, 'no'], [d1, 16, 30, 'no'],
        [d3, 9, 0, 'no'], [d3, 9, 30, 'no'],
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
  save(meetings)
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
