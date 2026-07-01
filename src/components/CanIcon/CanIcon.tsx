import styles from './CanIcon.module.css'

interface CanIconProps {
  name: string
  size?: number
  pending?: boolean
  darkBg?: boolean
  showName?: boolean
}

export function CanIcon({ name, size = 48, pending = false, darkBg = false, showName = true }: CanIconProps) {
  const height = Math.round(size * 1.5)

  return (
    <div className={styles.wrapper}>
      <div className={styles.canBox} style={{ width: size, height }}>
        <img
          src="/can.png"
          alt=""
          className={styles.canImg}
          style={{ filter: pending ? 'grayscale(1) brightness(1.1) opacity(0.5)' : 'none' }}
        />
        {/* 캔 라벨 밴드 */}
        <span
          className={styles.canLabel}
          style={{ fontSize: Math.round(size * 0.2), opacity: pending ? 0.6 : 1 }}
        >
          {name}
        </span>
      </div>

      {showName && (
        <span
          className={styles.name}
          style={{
            color: darkBg
              ? (pending ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.85)')
              : (pending ? '#9ca3af' : '#374151')
          }}
        >
          {name}
        </span>
      )}
    </div>
  )
}
