import type { Meeting, Recommendation, Preference } from '../types'

const PREF_SCORE: Record<Preference, number> = {
  good: 2,
  okay: 1,
  flexible: 0.5,
  no: -999,
}

export function getDateRange(start: string, end: string): string[] {
  const dates: string[] = []
  const current = new Date(start + 'T00:00:00')
  const endDate = new Date(end + 'T00:00:00')
  while (current <= endDate) {
    const y = current.getFullYear()
    const m = String(current.getMonth() + 1).padStart(2, '0')
    const d = String(current.getDate()).padStart(2, '0')
    dates.push(`${y}-${m}-${d}`)
    current.setDate(current.getDate() + 1)
  }
  return dates
}

// 슬롯 키 생성: "2026-07-01-9-0", "2026-07-01-9-30"
export function slotKey(date: string, hour: number, minute: 0 | 30): string {
  return `${date}-${hour}-${minute}`
}

// 9:00 ~ 17:30까지의 모든 30분 슬롯
const ALL_SLOTS: Array<{ hour: number; minute: 0 | 30 }> = []
for (let h = 9; h <= 21; h++) {
  if (h === 12) continue  // 점심 제외
  ALL_SLOTS.push({ hour: h, minute: 0 })
  ALL_SLOTS.push({ hour: h, minute: 30 })
}

export function getRecommendations(meeting: Meeting): Recommendation[] {
  const dates = getDateRange(meeting.dateRange.start, meeting.dateRange.end)
  const slotsNeeded = meeting.durationMinutes / 30  // 60분 = 2슬롯, 30분 = 1슬롯

  const respondedParticipants = meeting.participants.filter(p => p.submittedAt !== null)
  if (respondedParticipants.length === 0) return []

  const requiredParticipants = respondedParticipants.filter(p => p.isRequired)
  const optionalParticipants = respondedParticipants.filter(p => !p.isRequired)

  const candidates: Recommendation[] = []

  for (const date of dates) {
    for (let si = 0; si <= ALL_SLOTS.length - slotsNeeded; si++) {
      // 연속된 slotsNeeded개 슬롯을 모두 검사
      const startSlot = ALL_SLOTS[si]
      const slotRange = ALL_SLOTS.slice(si, si + slotsNeeded)

      // 슬롯이 실제로 30분 간격으로 연속인지 확인 (점심 12시 건너뛰기로 인한 불연속 방지)
      const contiguous = slotRange.every((s, i) => {
        if (i === 0) return true
        const prev = slotRange[i - 1]
        const prevMin = prev.hour * 60 + prev.minute
        const curMin = s.hour * 60 + s.minute
        return curMin - prevMin === 30
      })
      if (!contiguous) continue

      const keys = slotRange.map(s => slotKey(date, s.hour, s.minute))

      // 필수 참석자 중 어느 슬롯이라도 'no'면 제외
      const requiredBlocked = requiredParticipants.some(p =>
        keys.some(key => (p.preferences[key] ?? 'okay') === 'no')
      )
      if (requiredBlocked) continue

      // 점수: 슬롯 범위 전체의 평균
      let totalScore = 0
      let flexibleCount = 0
      let requiredAvailable = 0
      let optionalAvailable = 0

      for (const p of requiredParticipants) {
        const worstPref = keys.reduce<Preference>((worst, key) => {
          const pref = (p.preferences[key] ?? 'okay') as Preference
          return PREF_SCORE[pref] < PREF_SCORE[worst] ? pref : worst
        }, 'good')
        totalScore += PREF_SCORE[worstPref]
        if (worstPref === 'flexible') flexibleCount++
        if (worstPref !== 'no') requiredAvailable++
      }

      for (const p of optionalParticipants) {
        const worstPref = keys.reduce<Preference>((worst, key) => {
          const pref = (p.preferences[key] ?? 'okay') as Preference
          return PREF_SCORE[pref] < PREF_SCORE[worst] ? pref : worst
        }, 'good')
        if (worstPref !== 'no') {
          totalScore += PREF_SCORE[worstPref] * 0.5
          optionalAvailable++
        }
        if (worstPref === 'flexible') flexibleCount++
      }

      const availableNames: string[] = []
      const blockedNames: string[] = []
      const onlineNames: string[] = []
      const offlineNames: string[] = []

      for (const p of respondedParticipants) {
        const blocked = keys.some(key => (p.preferences[key] ?? 'okay') === 'no')
        if (blocked) {
          blockedNames.push(p.name)
        } else {
          availableNames.push(p.name)
          const fp = p.formatPreference ?? 'both'
          if (fp === 'online') onlineNames.push(p.name)
          else if (fp === 'offline') offlineNames.push(p.name)
          // 'both'는 둘 다에 포함하지 않음 (따로 표시)
        }
      }

      const tags: string[] = []
      if (flexibleCount > 0) tags.push(`조율 필요 ${flexibleCount}명`)

      candidates.push({
        slot: { date, hour: startSlot.hour, minute: startSlot.minute },
        score: totalScore,
        requiredCount: requiredAvailable,
        optionalCount: optionalAvailable,
        flexibleCount,
        tags,
        availableNames,
        blockedNames,
        onlineNames,
        offlineNames,
      })
    }
  }

  candidates.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score
    return a.flexibleCount - b.flexibleCount
  })

  return candidates.slice(0, 3)
}
