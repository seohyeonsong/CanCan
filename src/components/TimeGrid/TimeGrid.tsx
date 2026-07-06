import { useState, useEffect, useRef } from 'react'
import type { Preference } from '../../types'
import { Icon, type IconName } from '../Icon/Icon'
import styles from './TimeGrid.module.css'

interface TimeGridProps {
  dates: string[]
  preferences: Record<string, Preference>
  onChange: (key: string, pref: Preference) => void
  calendarKeys?: Set<string>
  activeKeys?: Set<string>  // progressive narrowing: 비활성 슬롯은 흐리게 + 비인터랙티브
  readOnly?: boolean        // 조회 전용 (참여자 응답 보기)
  othersCount?: Record<string, number>  // 슬롯별 "이미 가능하다고 응답한 사람 수" (히트맵)
  othersTotal?: number                  // 앞선 응답자 총원 (농도 정규화용)
}

type SlotItem =
  | { type: 'slot'; hour: number; minute: 0 | 30 }
  | { type: 'lunch' }
  | { type: 'evening' }

const SLOT_ITEMS: SlotItem[] = []
for (let h = 9; h <= 21; h++) {
  if (h === 12) { SLOT_ITEMS.push({ type: 'lunch' }); continue }
  if (h === 18) { SLOT_ITEMS.push({ type: 'evening' }) }
  SLOT_ITEMS.push({ type: 'slot', hour: h, minute: 0 })
  SLOT_ITEMS.push({ type: 'slot', hour: h, minute: 30 })
}

const SLOTS = SLOT_ITEMS.filter((s): s is { type: 'slot'; hour: number; minute: 0 | 30 } => s.type === 'slot')

function slotKey(date: string, hour: number, minute: 0 | 30) {
  return `${date}-${hour}-${minute}`
}

function formatTimeLabel(hour: number): string {
  if (hour === 12) return '오후 12시'
  const h = hour > 12 ? hour - 12 : hour
  return `${hour < 12 ? '오전' : '오후'} ${h}시`
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00')
  const days = ['일', '월', '화', '수', '목', '금', '토']
  return `${d.getMonth() + 1}/${d.getDate()}\n(${days[d.getDay()]})`
}

const PREF_COLORS: Record<Preference, string> = {
  good:     '#3182f6',
  okay:     '#c3d9fc',
  flexible: '#fef3c7',
  no:       '#fee2e2',
}

const PREF_TEXT_COLORS: Record<Preference, string> = {
  good:     '#fff',
  okay:     '#64748b',
  flexible: '#92400e',
  no:       '#991b1b',
}

const PREF_LABELS: Record<Preference, string> = {
  good:     '좋아요',
  okay:     '괜찮아요',
  flexible: '조율 가능',
  no:       '안 돼요',
}

const PREF_ICONS: Record<Preference, IconName> = {
  good:     'thumbsup',
  okay:     'smile',
  flexible: 'refresh',
  no:       'x',
}

export function TimeGrid({ dates, preferences, onChange, calendarKeys, activeKeys, readOnly = false, othersCount, othersTotal = 0 }: TimeGridProps) {
  const [dragState, setDragState] = useState<{
    date: string; startIdx: number; endIdx: number
  } | null>(null)

  // 드래그 끝난 후 툴팁이 열려있는 동안 유지되는 선택 영역
  const [pendingSelection, setPendingSelection] = useState<{
    date: string; from: number; to: number
  } | null>(null)

  const [tooltip, setTooltip] = useState<{
    x: number; y: number; keys: string[]
  } | null>(null)

  const dragStateRef = useRef(dragState)
  dragStateRef.current = dragState

  // Global mouseup to finish drag
  useEffect(() => {
    function onMouseUp(e: MouseEvent) {
      const ds = dragStateRef.current
      if (!ds) return
      const from = Math.min(ds.startIdx, ds.endIdx)
      const to = Math.max(ds.startIdx, ds.endIdx)
      const keys = SLOTS.slice(from, to + 1).map(s => slotKey(ds.date, s.hour, s.minute))
      setDragState(null)
      if (keys.length > 0) {
        setPendingSelection({ date: ds.date, from, to })
        setTooltip({ x: e.clientX, y: e.clientY, keys })
      }
    }
    window.addEventListener('mouseup', onMouseUp)
    return () => window.removeEventListener('mouseup', onMouseUp)
  }, [])

  // 터치(모바일) 드래그: 손가락 아래 셀을 추적
  useEffect(() => {
    function cellAt(x: number, y: number): { date: string; idx: number } | null {
      const el = document.elementFromPoint(x, y)?.closest('[data-slot]')
      if (!el) return null
      const date = el.getAttribute('data-date')
      const idx = Number(el.getAttribute('data-idx'))
      if (date == null || Number.isNaN(idx)) return null
      return { date, idx }
    }
    function onTouchMove(e: TouchEvent) {
      const ds = dragStateRef.current
      if (!ds) return
      e.preventDefault()  // 드래그 중 스크롤 방지
      const t = e.touches[0]
      const c = cellAt(t.clientX, t.clientY)
      if (c && c.date === ds.date) {
        setDragState(prev => (prev ? { ...prev, endIdx: c.idx } : prev))
      }
    }
    function onTouchEnd(e: TouchEvent) {
      const ds = dragStateRef.current
      if (!ds) return
      e.preventDefault()  // 합성 mouse 이벤트 억제 (툴팁 자동 닫힘 방지)
      const from = Math.min(ds.startIdx, ds.endIdx)
      const to = Math.max(ds.startIdx, ds.endIdx)
      const keys = SLOTS.slice(from, to + 1).map(s => slotKey(ds.date, s.hour, s.minute))
      setDragState(null)
      const t = e.changedTouches[0]
      if (keys.length > 0) {
        setPendingSelection({ date: ds.date, from, to })
        setTooltip({ x: t.clientX, y: t.clientY, keys })
      }
    }
    window.addEventListener('touchmove', onTouchMove, { passive: false })
    window.addEventListener('touchend', onTouchEnd, { passive: false })
    return () => {
      window.removeEventListener('touchmove', onTouchMove)
      window.removeEventListener('touchend', onTouchEnd)
    }
  }, [])

  // 툴팁 바깥 클릭 → 닫기
  useEffect(() => {
    if (!tooltip) return
    function onDown() {
      setTooltip(null)
      setPendingSelection(null)
    }
    window.addEventListener('mousedown', onDown)
    window.addEventListener('touchstart', onDown)
    return () => {
      window.removeEventListener('mousedown', onDown)
      window.removeEventListener('touchstart', onDown)
    }
  }, [tooltip])

  function handleStart(date: string, idx: number) {
    if (readOnly) return
    setTooltip(null)
    setPendingSelection(null)
    setDragState({ date, startIdx: idx, endIdx: idx })
  }

  function handleMouseDown(e: React.MouseEvent, date: string, idx: number) {
    e.preventDefault()
    handleStart(date, idx)
  }

  function handleMouseEnter(date: string, idx: number) {
    if (!dragState || date !== dragState.date) return
    setDragState(prev => prev ? { ...prev, endIdx: idx } : prev)
  }

  function applyPref(pref: Preference) {
    if (!tooltip) return
    for (const key of tooltip.keys) onChange(key, pref)
    setTooltip(null)
    setPendingSelection(null)
  }

  // 셀이 선택(하이라이트)돼야 하는지 — 드래그 중이거나 툴팁 대기 중
  function isHighlighted(date: string, idx: number): boolean {
    const drag = dragState
      ? { date: dragState.date, from: Math.min(dragState.startIdx, dragState.endIdx), to: Math.max(dragState.startIdx, dragState.endIdx) }
      : null
    if (drag?.date === date && idx >= drag.from && idx <= drag.to) return true
    if (pendingSelection?.date === date && idx >= pendingSelection.from && idx <= pendingSelection.to) return true
    return false
  }

  return (
    <div className={styles.wrapper} style={{ userSelect: 'none' }}>
      {/* Legend */}
      <div className={styles.legend}>
        {(['good', 'okay', 'flexible'] as Preference[]).map(p => (
          <div key={p} className={styles.legendItem}>
            <div className={styles.legendDot} style={{ background: PREF_COLORS[p], border: p === 'okay' ? '1px solid #cbd5e1' : 'none' }} />
            <span>{PREF_LABELS[p]}</span>
          </div>
        ))}
        <div className={styles.legendItem}>
          <div className={styles.legendDot} style={{ background: '#eef1f5', border: '1px solid #e2e8f0' }} />
          <span>안 됨</span>
        </div>
        {othersCount && othersTotal > 0 && (
          <div className={styles.legendItem}>
            <div className={styles.legendDot} style={{ background: '#fff', boxShadow: 'inset 0 0 0 2px rgba(49,130,246,0.6)' }} />
            <span>테두리 진할수록 여러 명 가능</span>
          </div>
        )}
      </div>

      {/* Grid */}
      <div className={styles.grid}>
        {/* Time column */}
        <div className={styles.timeCol}>
          <div className={styles.dateHeaderEmpty} />
          {SLOT_ITEMS.map((s, i) => {
            if (s.type === 'lunch') return <div key={`lunch-${i}`} className={styles.timeLabelLunch} />
            if (s.type === 'evening') return <div key={`evening-${i}`} className={styles.timeLabelLunch} />
            return (
              <div key={i} className={`${styles.timeLabel} ${s.minute === 30 ? styles.timeLabelHalf : ''}`}>
                {s.minute === 0 ? formatTimeLabel(s.hour) : ''}
              </div>
            )
          })}
        </div>

        {/* Date columns */}
        {dates.map(date => {
          let slotIdx = 0
          return (
            <div key={date} className={styles.dateCol}>
              <div className={styles.dateHeader}>{formatDate(date)}</div>
              {SLOT_ITEMS.map((s, itemIdx) => {
                if (s.type === 'lunch') {
                  return <div key={`lunch-${itemIdx}`} className={styles.lunchBreak}><Icon name="utensils" size={13} /> 점심</div>
                }
                if (s.type === 'evening') {
                  return <div key={`evening-${itemIdx}`} className={styles.eveningBreak}><Icon name="moon" size={13} /> 퇴근 이후</div>
                }
                const idx = slotIdx++
                const key = slotKey(date, s.hour, s.minute)
                const pref: Preference | undefined = preferences[key] as Preference | undefined
                const fromCal = calendarKeys?.has(key)
                const highlighted = isHighlighted(date, idx)
                const inactive = activeKeys !== undefined && !activeKeys.has(key)
                const mine = !!pref && pref !== 'no'
                const others = othersCount?.[key] ?? 0
                // 내 선택은 '채움', 남들 가능은 '스트로크(테두리)'로 구분
                let cellBg: string | undefined
                let cellShadow: string | undefined
                if (inactive) cellBg = undefined
                else if (highlighted) cellBg = 'rgba(49,130,246,0.35)'
                else if (mine) cellBg = PREF_COLORS[pref as Preference]
                else if (others > 0 && othersTotal > 0) {
                  const t = 0.35 + 0.5 * Math.min(1, others / othersTotal)
                  cellBg = '#fff'
                  cellShadow = `inset 0 0 0 1.5px rgba(49,130,246,${t.toFixed(2)})`
                } else cellBg = '#eef1f5'
                const interactive = !readOnly && !inactive
                return (
                  <div
                    key={itemIdx}
                    data-slot=""
                    data-date={date}
                    data-idx={idx}
                    className={`${styles.cell} ${s.minute === 0 ? styles.cellHourBoundary : ''} ${fromCal ? styles.cellFromCal : ''} ${highlighted ? styles.cellHighlighted : ''} ${inactive ? styles.cellInactive : ''}`}
                    style={{ background: cellBg, boxShadow: cellShadow, cursor: interactive ? 'pointer' : 'default' }}
                    onMouseDown={interactive ? e => handleMouseDown(e, date, idx) : undefined}
                    onMouseEnter={interactive ? () => handleMouseEnter(date, idx) : undefined}
                    onTouchStart={interactive ? () => handleStart(date, idx) : undefined}
                  />
                )
              })}
            </div>
          )
        })}
      </div>

      {/* Drag hint */}
      {!readOnly && (
        <p className={styles.hint}>드래그해서 가능한 시간을 표시하세요 · 표시 안 한 칸은 참석 불가로 처리돼요</p>
      )}

      {/* Preference tooltip */}
      {tooltip && (
        <div
          className={styles.tooltip}
          style={{
            left: Math.min(tooltip.x, window.innerWidth - 260),
            top: tooltip.y + 12,
          }}
          onMouseDown={e => e.stopPropagation()}
          onTouchStart={e => e.stopPropagation()}
        >
          {(['good', 'okay', 'flexible'] as Preference[]).map(p => (
            <button
              key={p}
              className={styles.tooltipBtn}
              style={{
                background: PREF_COLORS[p],
                color: PREF_TEXT_COLORS[p],
                border: p === 'okay' ? '1px solid #cbd5e1' : 'none',
              }}
              onClick={() => applyPref(p)}
            >
              <span className={styles.tooltipIcon}><Icon name={PREF_ICONS[p]} size={15} /></span>
              <span className={styles.tooltipLabel}>{PREF_LABELS[p]}</span>
            </button>
          ))}
          <button className={styles.tooltipClear} onClick={() => applyPref('no')}>
            선택 해제
          </button>
        </div>
      )}
    </div>
  )
}
