import styles from './CanIcon.module.css'

interface CanIconProps {
  name: string
  size?: number
  pending?: boolean
  darkBg?: boolean
  showName?: boolean
  colorIndex?: number
}

const POM_COLORS = ['blue', 'orange', 'mint', 'pink', 'purple', 'yellow', 'white']

// 이름 기반 안정적 색 (colorIndex 없을 때 폴백)
function pomColorByName(name: string): string {
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0
  return POM_COLORS[h % POM_COLORS.length]
}

export function CanIcon({ name, size = 48, pending = false, darkBg = false, showName = true, colorIndex }: CanIconProps) {
  const color = colorIndex != null ? POM_COLORS[colorIndex % POM_COLORS.length] : pomColorByName(name)

  return (
    <div className={styles.wrapper}>
      <div className={styles.canBox} style={{ width: size, height: size }}>
        <img
          src={`/pom${color}.png`}
          alt=""
          className={styles.canImg}
          style={{ filter: pending ? 'grayscale(1) brightness(1.05) opacity(0.45)' : 'none' }}
        />
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
