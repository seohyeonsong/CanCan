import type { Recommendation } from '../../types'
import { Badge } from '../Badge/Badge'
import styles from './RecommendationCard.module.css'

interface RecommendationCardProps {
  recommendation: Recommendation
  rank: number
  onConfirm: () => void
  isSelected?: boolean
  confirmContent?: React.ReactNode
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

export function RecommendationCard({ recommendation, rank, onConfirm, isSelected, confirmContent }: RecommendationCardProps) {
  const { slot, tags, flexibleCount, availableNames, blockedNames } = recommendation
  const isTop = rank === 1
  const total = availableNames.length + blockedNames.length
  const allAvailable = blockedNames.length === 0 && availableNames.length > 0

  return (
    <div className={`${styles.card} ${isTop ? styles.cardTop : ''} ${isSelected ? styles.cardSelected : ''}`}>
      {isTop && <div className={styles.topBadge}>최적 추천</div>}
      <div className={styles.content}>
        <div className={styles.slotRow}>
          <span className={styles.slotText}>{formatSlot(slot.date, slot.hour, slot.minute)}</span>
          {flexibleCount > 0 && (
            <span className={styles.flexNote}>DM 확인 필요</span>
          )}
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
                  <span key={n} className={`${styles.nameChip} ${styles.nameChipOk}`}>
                    {n}
                    {isOnlineOnly && <span className={styles.formatTag}>💻</span>}
                    {isOfflineOnly && <span className={styles.formatTag}>📍</span>}
                  </span>
                )
              })}
            </div>
          )}
          {recommendation.blockedNames.length > 0 && (
            <div className={styles.participantRow}>
              <span className={styles.participantRowLabel}>불가</span>
              {recommendation.blockedNames.map(n => (
                <span key={n} className={`${styles.nameChip} ${styles.nameChipNo}`}>{n}</span>
              ))}
            </div>
          )}
        </div>
        {tags.length > 0 && (
          <div className={styles.tags}>
            {tags.map(tag => (
              <Badge key={tag} color={getTagColor(tag)}>{tag}</Badge>
            ))}
          </div>
        )}
      </div>
      {confirmContent ?? (
        <button
          className={`${styles.btn} ${isTop ? styles.btnPrimary : styles.btnSecondary}`}
          onClick={onConfirm}
        >
          이 시간으로 확정
        </button>
      )}
    </div>
  )
}
