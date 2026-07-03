import styles from './Logo.module.css'

interface LogoProps {
  size?: 'sm' | 'md' | 'lg'
}

// logo.png(털글씨 워드마크) 너비 기준 사이즈
const SIZE_MAP = {
  sm: 92,
  md: 128,
  lg: 210,
}

export function Logo({ size = 'md' }: LogoProps) {
  return (
    <img
      src="/logo.png"
      alt="CanCan"
      className={styles.logo}
      style={{ width: SIZE_MAP[size] }}
    />
  )
}
