import { useState, useEffect, useRef } from 'react'
import type { Preference } from '../../types'
import styles from './TimeGrid.module.css'

interface TimeGridProps {
  dates: string[]
  preferences: Record<string, Preference>
  onChange: (key: string, pref: Preference) => void
  calendarKeys?: Set<string>
  activeKeys?: Set<string>  // progressive narrowing: 비활성 슬롯은 흐리게 + 비인터랙티브
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

const PREF_ICONS: Record<Preference, string> = {
  good:     '👍',
  okay:     '🙂',
  flexible: '🔄',
  no:       '✕',
}

export function TimeGrid({ dates, preferences, onChange, calendarKeys, activeKeys }: TimeGridProps) {
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

  // 툴팁 바깥 클릭 → 닫기
  useEffect(() => {
    if (!tooltip) return
    function onDown() {
      setTooltip(null)
      setPendingSelection(null)
    }
    window.addEventListener('mousedown', onDown)
    return () => window.removeEventListener('mousedown', onDown)
  }, [tooltip])

  function handleMouseDown(e: React.MouseEvent, date: string, idx: number) {
    e.preventDefault()
    setTooltip(null)
    setPendingSelection(null)
    setDragState({ date, startIdx: idx, endIdx: idx })
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
        {(['good', 'okay', 'flexible', 'no'] as Preference[]).map(p => (
          <div key={p} className={styles.legendItem}>
            <div className={styles.legendDot} style={{ background: PREF_COLORS[p], border: p === 'okay' ? '1px solid #cbd5e1' : 'none' }} />
            <span>{PREF_LABELS[p]}</span>
          </div>
        ))}
        {calendarKeys && calendarKeys.size > 0 && (
          <div className={styles.legendItem}>
            <div className={styles.legendDot} style={{ background: '#fee2e2', border: '2px dashed #f87171' }} />
            <span>구글 캘린더</span>
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
                  return <div key={`lunch-${itemIdx}`} className={styles.lunchBreak}>🍱 점심</div>
                }
                if (s.type === 'evening') {
                  return <div key={`evening-${itemIdx}`} className={styles.eveningBreak}>🌙 퇴근 이후</div>
                }
                const idx = slotIdx++
                const key = slotKey(date, s.hour, s.minute)
                const pref: Preference | undefined = preferences[key] as Preference | undefined
                const fromCal = calendarKeys?.has(key)
                const highlighted = isHighlighted(date, idx)
                const inactive = activeKeys !== undefined && !activeKeys.has(key)
                const cellBg = inactive ? undefined : highlighted ? 'rgba(49,130,246,0.35)' : pref ? PREF_COLORS[pref] : '#e8f0fe'
                return (
                  <div
                    key={itemIdx}
                    className={`${styles.cell} ${s.minute === 0 ? styles.cellHourBoundary : ''} ${fromCal ? styles.cellFromCal : ''} ${highlighted ? styles.cellHighlighted : ''} ${inactive ? styles.cellInactive : ''}`}
                    style={{ background: cellBg }}
                    onMouseDown={inactive ? undefined : e => handleMouseDown(e, date, idx)}
                    onMouseEnter={inactive ? undefined : () => handleMouseEnter(date, idx)}
                  />
                )
              })}
            </div>
          )
        })}
      </div>

      {/* Drag hint */}
      <p className={styles.hint}>드래그해서 시간 범위를 선택하세요</p>

      {/* Preference tooltip */}
      {tooltip && (
        <div
          className={styles.tooltip}
          style={{
            left: Math.min(tooltip.x, window.innerWidth - 260),
            top: tooltip.y + 12,
          }}
          onMouseDown={e => e.stopPropagation()}
        >
          {(['good', 'okay', 'flexible', 'no'] as Preference[]).map(p => (
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
              <span className={styles.tooltipIcon}>{PREF_ICONS[p]}</span>
              <span className={styles.tooltipLabel}>{PREF_LABELS[p]}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
