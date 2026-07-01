import styles from './Logo.module.css'

interface LogoProps {
  size?: 'sm' | 'md' | 'lg'
}

const SIZE_MAP = {
  sm: 18,
  md: 26,
  lg: 40,
}

export function Logo({ size = 'md' }: LogoProps) {
  const fontSize = SIZE_MAP[size]

  return (
    <span className={styles.logo} style={{ fontSize }}>
      CANCAN
    </span>
  )
}
