import styles from './Badge.module.css'

type BadgeColor = 'blue' | 'green' | 'yellow' | 'orange' | 'grey' | 'red'

interface BadgeProps {
  color: BadgeColor
  children: React.ReactNode
}

export function Badge({ color, children }: BadgeProps) {
  return (
    <span className={`${styles.badge} ${styles[color]}`}>
      {children}
    </span>
  )
}
