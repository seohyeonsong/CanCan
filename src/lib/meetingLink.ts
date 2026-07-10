import type { Meeting } from '../types'

// 회의 데이터를 링크(#m=...)에 담아, 다른 브라우저/기기에서 열어도 복원되게 한다.
// localStorage 기반 프로토타입에서 "회의를 찾을 수 없어요"를 막는 핵심 장치.
// 링크가 너무 길어지지 않게 "회의 정의"만 담고 응답(preferences)은 뺀다.
// (다른 기기에서 열면 아직 아무도 응답 안 한 상태로 보이고, 본인 응답만 로컬 저장 — 데모 제약)

interface SlimMeeting {
  id: string; t: string; o: string; e?: string
  f?: string; l?: string; s: string; d: string
  dur: number; dl?: string
  c?: { date: string; hour: number; minute: number } | null
  oa?: boolean
  p: [string, 0 | 1][]  // [이름, 필수여부]
}

export function encodeMeeting(meeting: Meeting): string {
  const slim: SlimMeeting = {
    id: meeting.id, t: meeting.title, o: meeting.organizerName, e: meeting.ownerEmail,
    f: meeting.format, l: meeting.location, s: meeting.dateRange.start, d: meeting.dateRange.end,
    dur: meeting.durationMinutes, dl: meeting.responseDeadline, c: meeting.confirmedSlot,
    oa: meeting.organizerAttending,
    p: meeting.participants.map(x => [x.name, x.isRequired ? 1 : 0]),
  }
  const bytes = new TextEncoder().encode(JSON.stringify(slim))
  let bin = ''
  const CHUNK = 0x8000
  for (let i = 0; i < bytes.length; i += CHUNK) {
    bin += String.fromCharCode(...bytes.subarray(i, i + CHUNK))
  }
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export function decodeMeeting(param: string): Meeting | null {
  try {
    const b64 = param.replace(/-/g, '+').replace(/_/g, '/')
    const bytes = Uint8Array.from(atob(b64), c => c.charCodeAt(0))
    const m = JSON.parse(new TextDecoder().decode(bytes)) as SlimMeeting
    if (!m || typeof m.id !== 'string' || !Array.isArray(m.p)) return null
    const meeting: Meeting = {
      id: m.id,
      title: m.t,
      organizerName: m.o,
      ownerEmail: m.e,
      format: m.f as Meeting['format'],
      location: m.l,
      dateRange: { start: m.s, end: m.d },
      durationMinutes: m.dur,
      responseDeadline: m.dl,
      confirmedSlot: m.c ? { date: m.c.date, hour: m.c.hour, minute: (m.c.minute === 30 ? 30 : 0) } : null,
      organizerAttending: m.oa,
      createdAt: new Date().toISOString(),
      participants: m.p.map(([name, req]) => ({
        name, isRequired: req === 1, preferences: {}, submittedAt: null,
      })),
    }
    return meeting
  } catch {
    return null
  }
}

// 공유용 응답 링크 — 회의 정의 스냅샷 포함
export function buildRespondUrl(meeting: Meeting): string {
  return `${window.location.origin}/meeting/${meeting.id}/respond#m=${encodeMeeting(meeting)}`
}

// 현재 URL 해시에서 회의 복원 시도
export function meetingFromHash(id: string): Meeting | null {
  const match = window.location.hash.match(/[#&]m=([^&]+)/)
  if (!match) return null
  const m = decodeMeeting(match[1])
  return m && m.id === id ? m : null
}
