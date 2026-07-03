import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getUser, saveUser } from '../../lib/auth'
import { seedDemoMeeting } from '../../lib/store'
import styles from './Login.module.css'

export function Login() {
  const navigate = useNavigate()

  useEffect(() => {
    if (getUser()) { navigate('/meetings') }
  }, [navigate])

  function handleGuestLogin() {
    const email = 'demo@cancan.app'
    saveUser({ name: '데모 사용자', email })
    seedDemoMeeting(email)
    navigate('/meetings')
  }

  return (
    <div className={styles.container}>
      <img src="/logo.png" alt="CanCan" className={styles.wordmark} />

      <div className={styles.heroRow}>
        <img src="/bifinal.png" alt="" className={styles.heroMachine} />

        <div className={styles.card}>
        <h2 className={styles.cardTitle}>시작하기</h2>
        <p className={styles.cardDesc}>로그인 없이 바로 체험해보세요</p>

        <button className={styles.guestBtn} onClick={handleGuestLogin}>
          데모 계정으로 둘러보기
        </button>
        <p className={styles.guestHint}>핵심 흐름을 로그인 없이 체험할 수 있어요</p>

        <div className={styles.divider}><span>또는</span></div>

        <button className={styles.googleDisabled} disabled>
          Google 계정으로 로그인
          <span className={styles.soonBadge}>준비 중</span>
        </button>
        <p className={styles.guestHint}>Google 캘린더 자동 연동은 곧 지원돼요</p>
        </div>
      </div>
    </div>
  )
}
