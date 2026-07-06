// 앱 전역 라인 아이콘 세트 (currentColor 상속, 텍스트와 인라인 정렬)
export type IconName =
  | 'link' | 'calendar' | 'sparkle' | 'send' | 'plus' | 'enter'
  | 'monitor' | 'pin' | 'shuffle' | 'check' | 'pencil' | 'bulb' | 'flag'
  | 'thumbsup' | 'smile' | 'refresh' | 'x' | 'utensils' | 'moon'
  | 'message' | 'clipboard' | 'calendarPlus' | 'users'

export function Icon({ name, size = 16 }: { name: IconName; size?: number }) {
  const s = {
    width: size, height: size, viewBox: '0 0 24 24', fill: 'none',
    stroke: 'currentColor', strokeWidth: 1.8,
    strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const,
    style: { flexShrink: 0, verticalAlign: '-0.15em' as const },
  }
  switch (name) {
    case 'link': return <svg {...s}><path d="M9.5 14.5l5-5"/><path d="M11 6.5l1-1a3.5 3.5 0 015 5l-1 1"/><path d="M13 17.5l-1 1a3.5 3.5 0 01-5-5l1-1"/></svg>
    case 'calendar': return <svg {...s}><rect x="3.5" y="5" width="17" height="15" rx="2.5"/><path d="M3.5 9.5h17M8 3.5v3M16 3.5v3"/><path d="M8.5 14l2 2 3.5-3.5"/></svg>
    case 'calendarPlus': return <svg {...s}><rect x="3.5" y="5" width="17" height="15" rx="2.5"/><path d="M3.5 9.5h17M8 3.5v3M16 3.5v3M12 12.5v5M9.5 15h5"/></svg>
    case 'sparkle': return <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" style={{ flexShrink: 0, verticalAlign: '-0.15em' }}><path d="M12 3l1.6 5.2a2 2 0 001.2 1.2L20 11l-5.2 1.6a2 2 0 00-1.2 1.2L12 19l-1.6-5.2a2 2 0 00-1.2-1.2L4 11l5.2-1.6a2 2 0 001.2-1.2z"/></svg>
    case 'send': return <svg {...s}><path d="M20 4L10.5 13.5"/><path d="M20 4l-6 16-3.5-7.5L3 9z"/></svg>
    case 'plus': return <svg {...s}><path d="M12 5v14M5 12h14"/></svg>
    case 'enter': return <svg {...s}><path d="M14 4h4a2 2 0 012 2v12a2 2 0 01-2 2h-4"/><path d="M10 16l4-4-4-4"/><path d="M14 12H4"/></svg>
    case 'monitor': return <svg {...s}><rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4"/></svg>
    case 'pin': return <svg {...s}><path d="M12 21s6-5.3 6-10a6 6 0 10-12 0c0 4.7 6 10 6 10z"/><circle cx="12" cy="11" r="2.2"/></svg>
    case 'shuffle': return <svg {...s}><path d="M17 4h4v4M21 4l-6 6M3 4h3l11 12h4M21 16v4h-4M8 8L3 20"/></svg>
    case 'check': return <svg {...s}><path d="M5 12.5l4.5 4.5L19 6.5"/></svg>
    case 'pencil': return <svg {...s}><path d="M4 20h4L18.5 9.5a2 2 0 00-2.83-2.83L5 17.5V20z"/><path d="M14 7l3 3"/></svg>
    case 'bulb': return <svg {...s}><path d="M9 18h6M10 21h4"/><path d="M12 3a6 6 0 00-3.5 10.9c.5.4.5 1.1.5 1.6h6c0-.5 0-1.2.5-1.6A6 6 0 0012 3z"/></svg>
    case 'flag': return <svg {...s}><path d="M5 21V4M5 4h11l-1.5 4L16 12H5"/></svg>
    case 'thumbsup': return <svg {...s}><path d="M7 11v9H4a1 1 0 01-1-1v-7a1 1 0 011-1h3z"/><path d="M7 11l4-8a2 2 0 012 2v3h5a2 2 0 012 2.3l-1.2 6A2 2 0 0118.8 20H7"/></svg>
    case 'smile': return <svg {...s}><circle cx="12" cy="12" r="9"/><path d="M8.5 14.5a4 4 0 007 0"/><path d="M9 9.5h.01M15 9.5h.01"/></svg>
    case 'refresh': return <svg {...s}><path d="M20 11a8 8 0 10-1.8 6.5M20 20v-5h-5"/></svg>
    case 'x': return <svg {...s}><path d="M6 6l12 12M18 6L6 18"/></svg>
    case 'utensils': return <svg {...s}><path d="M5 3v7a2 2 0 002 2h0v9M7 3v6M19 3c-1.5 0-3 1.5-3 5s1.5 4 3 4v9"/></svg>
    case 'moon': return <svg {...s}><path d="M20 14.5A8 8 0 019.5 4a7 7 0 100 16 8 8 0 0010.5-5.5z"/></svg>
    case 'message': return <svg {...s}><path d="M20 15a2 2 0 01-2 2H8l-4 4V6a2 2 0 012-2h12a2 2 0 012 2z"/></svg>
    case 'clipboard': return <svg {...s}><rect x="8" y="4" width="8" height="4" rx="1"/><path d="M8 6H6a2 2 0 00-2 2v11a2 2 0 002 2h12a2 2 0 002-2V8a2 2 0 00-2-2h-2"/></svg>
    case 'users': return <svg {...s}><circle cx="9" cy="8" r="3.2"/><path d="M3.5 20a5.5 5.5 0 0111 0M16 5.2a3.2 3.2 0 010 6M17.5 14.3A5.5 5.5 0 0120.5 19"/></svg>
    default: return null
  }
}

// 회의 진행 방식 → 아이콘 이름 + 라벨
export function formatMeta(format?: string): { icon: IconName; label: string } | null {
  if (format === 'online') return { icon: 'monitor', label: '온라인' }
  if (format === 'offline') return { icon: 'pin', label: '오프라인' }
  if (format === 'both') return { icon: 'shuffle', label: '온·오프라인' }
  return null
}
