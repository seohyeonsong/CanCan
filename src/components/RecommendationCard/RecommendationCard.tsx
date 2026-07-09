import type { Recommendation } from '../../types'
import { Badge } from '../Badge/Badge'
import { Icon } from '../Icon/Icon'
import styles from './RecommendationCard.module.css'

interface RecommendationCardProps {
  recommendation: Recommendation
  rank: number
  onConfirm: () => void
  onCoordinate?: () => void
  isSelected?: boolean
  confirmContent?: React.ReactNode
  requiredNames?: string[]
}

const DAYS = ['일', '월', '화', '수', '목', '금', '토']

function formatSlot(date: string, hour: number, minute: 0 | 30 = 0): string {
  const d = new Date(date + 'T00:00:00')
  const month = d.getMonth() + 1
  const day = d.getDate()
  const dayName = DAYS[d.getDay()]
  const ampm = hour < 12 ? '오전' : '오후'
  const displayHour = hour > 12 ? hour - 12 : hour
  const minStr = minute === 30 ? ' 30분' : ''
  return `${month}월 ${day}일 (${dayName}) ${ampm} ${displayHour}시${minStr}`
}

function getTagColor(tag: string): 'blue' | 'green' | 'orange' | 'yellow' | 'grey' {
  if (tag.includes('모두 가능')) return 'green'
  if (tag.includes('조율 가능')) return 'orange'
  return 'blue'
}

export function RecommendationCard({ recommendation, rank, onConfirm, onCoordinate, isSelected, confirmContent, requiredNames = [] }: RecommendationCardProps) {
  const { slot, tags, availableNames, blockedNames, flexibleNames } = recommendation
  const isReq = (n: string) => requiredNames.includes(n)
  const isFlex = (n: string) => flexibleNames.includes(n)
  const isTop = rank === 1
  const total = availableNames.length + blockedNames.length
  const allAvailable = blockedNames.length === 0 && availableNames.length > 0

  return (
    <div className={`${styles.card} ${isTop ? styles.cardTop : ''} ${isSelected ? styles.cardSelected : ''}`}>
      {isTop && <div className={styles.topBadge}>최적 추천</div>}
      <div className={styles.content}>
        <div className={styles.slotRow}>
          <span className={styles.slotText}>{formatSlot(slot.date, slot.hour, slot.minute)}</span>
        </div>
        {total > 0 && (
          <div className={`${styles.summary} ${allAvailable ? styles.summaryAll : ''}`}>
            <span className={styles.summaryDot} />
            {allAvailable
              ? `참여자 ${total}명 모두 가능해요`
              : `${total}명 중 ${availableNames.length}명 가능`}
          </div>
        )}
        <div className={styles.participants}>
          {recommendation.availableNames.length > 0 && (
            <div className={styles.participantRow}>
              <span className={styles.participantRowLabel}>가능</span>
              {recommendation.availableNames.map(n => {
                const isOnlineOnly = recommendation.onlineNames.includes(n)
                const isOfflineOnly = recommendation.offlineNames.includes(n)
                return (
                  <span key={n} className={`${styles.nameChip} ${isFlex(n) ? styles.nameChipFlex : styles.nameChipOk}`}>
                    {isReq(n) && <span className={styles.reqDot} title="필수 참석자" />}
                    {n}
                    {isFlex(n) && <span className={styles.formatTag}><Icon name="refresh" size={11} /></span>}
                    {isOnlineOnly && <span className={styles.formatTag}><Icon name="monitor" size={12} /></span>}
                    {isOfflineOnly && <span className={styles.formatTag}><Icon name="pin" size={12} /></span>}
                  </span>
                )
              })}
            </div>
          )}
          {recommendation.blockedNames.length > 0 && (
            <div className={styles.participantRow}>
              <span className={styles.participantRowLabel}>불가</span>
              {recommendation.blockedNames.map(n => (
                <span key={n} className={`${styles.nameChip} ${styles.nameChipNo}`}>
                  {isReq(n) && <span className={styles.reqDot} title="필수 참석자" />}
                  {n}
                </span>
              ))}
            </div>
          )}
        </div>
        {flexibleNames.length > 0 && (
          <p className={styles.flexLine}>
            <Icon name="refresh" size={12} /> {flexibleNames.join(', ')}님은 ‘조율 가능’으로 응답했어요 — 확정 전에 한 번 확인해보세요
          </p>
        )}
        {tags.length > 0 && (
          <div className={styles.tags}>
            {tags.map(tag => (
              <Badge key={tag} color={getTagColor(tag)}>{tag}</Badge>
            ))}
          </div>
        )}
      </div>
      {confirmContent ?? (
        <div className={styles.actions}>
          {blockedNames.length > 0 && onCoordinate && (
            <button className={styles.coordinateBtn} onClick={onCoordinate}>
              <Icon name="message" size={14} />
              {blockedNames.length === 1
                ? `${blockedNames[0]}님에게 조율 요청`
                : `못 오는 ${blockedNames.length}명에게 조율 요청`}
            </button>
          )}
          <button
            className={`${styles.btn} ${isTop ? styles.btnPrimary : styles.btnSecondary}`}
            onClick={onConfirm}
          >
            이 시간으로 확정
          </button>
        </div>
      )}
    </div>
  )
}
