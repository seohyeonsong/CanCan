import type { Meeting } from '../types'

// Google 캘린더 "일정 추가" 템플릿 URL 생성 (백엔드·OAuth 불필요)
export function buildGoogleCalendarUrl(meeting: Meeting): string | null {
  const s = meeting.confirmedSlot
  if (!s) return null

  const pad = (n: number) => String(n).padStart(2, '0')
  const [y, mo, d] = s.date.split('-').map(Number)
  const startMin = s.hour * 60 + s.minute
  const endMin = startMin + meeting.durationMinutes
  const fmt = (min: number) =>
    `${y}${pad(mo)}${pad(d)}T${pad(Math.floor(min / 60))}${pad(min % 60)}00`

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: meeting.title,
    dates: `${fmt(startMin)}/${fmt(endMin)}`,
    ctz: 'Asia/Seoul',
    details: `CanCan으로 확정된 회의예요.\n${window.location.origin}/meeting/${meeting.id}/respond`,
  })
  if (meeting.location) params.set('location', meeting.location)

  return `https://calendar.google.com/calendar/render?${params.toString()}`
}
