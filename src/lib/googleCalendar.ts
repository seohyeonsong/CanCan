import type { Preference } from '../types'

const CLIENT_ID = '932528645988-66oiu4fjfuu091erl3kel1k4cd2eq8ck.apps.googleusercontent.com'
const SCOPES = 'https://www.googleapis.com/auth/calendar.readonly'

let tokenClient: google.accounts.oauth2.TokenClient | null = null
let accessToken: string | null = null

declare global {
  interface Window { google: typeof google }
}

export function loadGoogleScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.getElementById('google-gsi')) { resolve(); return }
    const script = document.createElement('script')
    script.id = 'google-gsi'
    script.src = 'https://accounts.google.com/gsi/client'
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Google GSI 로드 실패'))
    document.head.appendChild(script)
  })
}

export function initTokenClient(callback: (token: string) => void): void {
  tokenClient = window.google.accounts.oauth2.initTokenClient({
    client_id: CLIENT_ID,
    scope: SCOPES,
    callback: (response) => {
      if (response.access_token) {
        accessToken = response.access_token
        callback(response.access_token)
      }
    },
  })
}

export function requestAccessToken(): void {
  tokenClient?.requestAccessToken()
}

// 데모/미등록 환경용: 현실적인 예시 일정을 채워 캘린더 연동 결과를 재현한다.
// 요일별로 고정된 바쁜 시간대(회의·점심 등)를 'no'로 표시해 항상 같은 결과를 보여준다.
export function mockBusySlots(
  dateStart: string,
  dateEnd: string
): { preferences: Record<string, Preference>; calendarKeys: Set<string> } {
  const preferences: Record<string, Preference> = {}
  const calendarKeys = new Set<string>()

  // 요일(0=일 ~ 6=토)별 바쁜 시간대 [시작시, 끝시)
  const busyByWeekday: Record<number, [number, number][]> = {
    1: [[10, 11], [15, 16]],       // 월: 오전 스탠드업, 오후 리뷰
    2: [[9, 10], [14, 15]],        // 화
    3: [[11, 12], [16, 17]],       // 수
    4: [[10, 11], [13, 15]],       // 목: 오후 롱미팅
    5: [[9, 10], [17, 18]],        // 금
    0: [], 6: [],                  // 주말은 비움
  }

  const cur = new Date(dateStart + 'T00:00:00')
  const end = new Date(dateEnd + 'T00:00:00')
  while (cur <= end) {
    const y = cur.getFullYear()
    const mo = String(cur.getMonth() + 1).padStart(2, '0')
    const d = String(cur.getDate()).padStart(2, '0')
    const dateStr = `${y}-${mo}-${d}`
    const wd = cur.getDay()
    const busy = busyByWeekday[wd] ?? []
    for (let h = 9; h <= 21; h++) {
      if (h === 12) continue
      const isBusy = busy.some(([s, e]) => h >= s && h < e)
      for (const m of [0, 30] as const) {
        const key = `${dateStr}-${h}-${m}`
        if (isBusy) { preferences[key] = 'no'; calendarKeys.add(key) }
        else preferences[key] = 'okay'
      }
    }
    cur.setDate(cur.getDate() + 1)
  }

  return { preferences, calendarKeys }
}

export async function fetchBusySlots(
  dateStart: string,
  dateEnd: string
): Promise<{ preferences: Record<string, Preference>; calendarKeys: Set<string> }> {
  if (!accessToken) throw new Error('로그인이 필요해요')

  const timeMin = new Date(dateStart + 'T00:00:00').toISOString()
  const timeMax = new Date(dateEnd + 'T23:59:59').toISOString()

  const response = await fetch('https://www.googleapis.com/calendar/v3/freeBusy', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ timeMin, timeMax, items: [{ id: 'primary' }] }),
  })

  if (!response.ok) throw new Error('캘린더 조회 실패')

  const data = await response.json()
  const busyPeriods: { start: string; end: string }[] =
    data.calendars?.primary?.busy ?? []

  const preferences: Record<string, Preference> = {}
  const calendarKeys = new Set<string>()  // 캘린더에서 가져온 슬롯 추적

  // 모든 슬롯을 'okay'로 초기화 (30분 단위)
  const cur = new Date(dateStart + 'T00:00:00')
  const end = new Date(dateEnd + 'T00:00:00')
  while (cur <= end) {
    const dateStr = cur.toISOString().slice(0, 10)
    for (let h = 9; h <= 21; h++) {
      if (h === 12) continue
      preferences[`${dateStr}-${h}-0`] = 'okay'
      preferences[`${dateStr}-${h}-30`] = 'okay'
    }
    cur.setDate(cur.getDate() + 1)
  }

  // 바쁜 시간대를 30분 단위로 'no' 처리
  for (const busy of busyPeriods) {
    const busyStart = new Date(busy.start)
    const busyEnd = new Date(busy.end)

    // 30분 단위로 반올림
    const slot = new Date(busyStart)
    slot.setSeconds(0, 0)
    if (slot.getMinutes() > 0 && slot.getMinutes() < 30) slot.setMinutes(0)
    else if (slot.getMinutes() > 30) slot.setMinutes(30)

    while (slot < busyEnd) {
      const dateStr = slot.toISOString().slice(0, 10)
      const h = slot.getHours()
      const m = slot.getMinutes() as 0 | 30
      if (h >= 9 && h <= 17) {
        const key = `${dateStr}-${h}-${m}`
        preferences[key] = 'no'
        calendarKeys.add(key)
      }
      slot.setMinutes(slot.getMinutes() + 30)
    }
  }

  return { preferences, calendarKeys }
}
