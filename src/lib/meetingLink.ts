import type { Meeting } from '../types'

// 회의 데이터를 링크(#m=...)에 담아, 다른 브라우저/기기에서 열어도 복원되게 한다.
// localStorage 기반 프로토타입에서 "회의를 찾을 수 없어요"를 막는 핵심 장치.
// (해시 프래그먼트라 서버로 전송되지 않고, SPA 라우팅에도 영향 없음)

export function encodeMeeting(meeting: Meeting): string {
  const bytes = new TextEncoder().encode(JSON.stringify(meeting))
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
    const m = JSON.parse(new TextDecoder().decode(bytes))
    if (!m || typeof m.id !== 'string' || !Array.isArray(m.participants)) return null
    return m as Meeting
  } catch {
    return null
  }
}

// 공유용 응답 링크 — 회의 스냅샷 포함
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
