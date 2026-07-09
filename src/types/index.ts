export type Preference = 'good' | 'okay' | 'flexible' | 'no'

export interface TimeSlot {
  date: string        // 'YYYY-MM-DD'
  hour: number        // 9~17
  minute: 0 | 30     // 0 or 30
}

export interface ParticipantResponse {
  name: string
  email?: string     // 로그인된 경우 Google 이메일
  contact?: string   // 카카오톡 ID / 전화번호 / 이메일 등
  isRequired: boolean
  formatPreference?: 'online' | 'offline' | 'both'  // 온/오프라인 참여 방식
  // key: `${date}-${hour}-${minute}` e.g. "2026-07-01-9-0", "2026-07-01-9-30"
  preferences: Record<string, Preference>
  submittedAt: string | null
}

export type MeetingFormat = 'online' | 'offline' | 'both'

export interface Meeting {
  id: string
  title: string
  organizerName: string
  ownerEmail?: string    // 주최자 Google 이메일
  format?: MeetingFormat  // 온라인/오프라인/둘다
  location?: string       // 오프라인일 때 장소 (선택)
  dateRange: {
    start: string
    end: string
  }
  durationMinutes: number
  responseDeadline?: string   // 'YYYY-MM-DD' — 응답 마감일
  participants: ParticipantResponse[]
  createdAt: string
  confirmedSlot: TimeSlot | null
}

export interface Recommendation {
  slot: TimeSlot
  score: number
  requiredCount: number
  optionalCount: number
  flexibleCount: number
  flexibleNames: string[]
  tags: string[]
  availableNames: string[]   // 가능한 참여자 이름
  blockedNames: string[]     // 불가능한 참여자 이름
  onlineNames: string[]      // 온라인으로 참여 가능한 이름
  offlineNames: string[]     // 오프라인으로 참여 가능한 이름
}
