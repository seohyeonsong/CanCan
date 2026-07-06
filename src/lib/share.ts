// 백엔드 없이 "한 번 탭 공유": Web Share API → 폴백 복사
// 반환: 'shared'(공유 시트 사용) | 'copied'(클립보드 폴백)
export async function shareOrCopy(text: string, url?: string): Promise<'shared' | 'copied'> {
  const nav = navigator as Navigator & { share?: (d: ShareData) => Promise<void> }
  if (typeof nav.share === 'function') {
    try {
      await nav.share(url ? { text, url } : { text })
      return 'shared'
    } catch (e) {
      // 사용자가 공유 시트를 닫은 경우도 정상 종료로 취급
      if (e instanceof DOMException && e.name === 'AbortError') return 'shared'
      // 그 외(미지원 등)는 복사로 폴백
    }
  }
  await copyText(text)
  return 'copied'
}

export function copyText(text: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    return navigator.clipboard.writeText(text).catch(() => fallbackCopy(text))
  }
  return fallbackCopy(text)
}

function fallbackCopy(text: string): Promise<void> {
  return new Promise(resolve => {
    const ta = document.createElement('textarea')
    ta.value = text
    ta.style.position = 'fixed'
    ta.style.opacity = '0'
    document.body.appendChild(ta)
    ta.select()
    try { document.execCommand('copy') } catch { /* noop */ }
    document.body.removeChild(ta)
    resolve()
  })
}
