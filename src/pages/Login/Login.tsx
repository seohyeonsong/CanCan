import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { loadGoogleScript } from '../../lib/googleCalendar'
import { initGoogleSignIn, renderSignInButton, getUser, saveUser } from '../../lib/auth'
import { seedDemoMeeting } from '../../lib/store'
import styles from './Login.module.css'

export function Login() {
  const navigate = useNavigate()
  const btnRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (getUser()) { navigate('/meetings'); return }

    loadGoogleScript().then(() => {
      initGoogleSignIn((user) => {
        console.log('로그인 성공', user)
        navigate('/meetings')
      })
      if (btnRef.current) renderSignInButton(btnRef.current)
    }).catch(console.error)
  }, [navigate])

  function handleGuestLogin() {
    const email = 'demo@cancan.app'
    saveUser({ name: '데모 사용자', email })
    seedDemoMeeting(email)
    navigate('/meetings')
  }

  return (
    <div className={styles.container}>
      <div className={styles.hero}>
        <img src="/bifinal.png" alt="" className={styles.heroMachine} />
        <h1 className={styles.logo}>CanCan</h1>
        <p className={styles.tagline}>모두의 시간을<br />한 번에 맞추세요</p>
      </div>

      <div className={styles.card}>
        <h2 className={styles.cardTitle}>시작하기</h2>
        <p className={styles.cardDesc}>로그인 없이 바로 체험해보세요</p>

        <button className={styles.guestBtn} onClick={handleGuestLogin}>
          데모 계정으로 둘러보기
        </button>
        <p className={styles.guestHint}>핵심 흐름을 로그인 없이 체험할 수 있어요</p>

        <div className={styles.divider}><span>또는</span></div>

        <div ref={btnRef} className={styles.googleBtn} />
        <p className={styles.guestHint}>Google 로그인·캘린더 연동은 실서비스용이에요</p>
      </div>
    </div>
  )
}
