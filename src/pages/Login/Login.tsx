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
        <p className={styles.cardDesc}>회사 Google 계정으로 로그인하세요</p>
        <div ref={btnRef} className={styles.googleBtn} />

        <div className={styles.divider}><span>또는</span></div>

        <button className={styles.guestBtn} onClick={handleGuestLogin}>
          데모 계정으로 둘러보기
        </button>
        <p className={styles.guestHint}>로그인 없이 바로 핵심 흐름을 체험할 수 있어요</p>
      </div>

      <div className={styles.flow}>
        <p className={styles.flowTitle}>이렇게 작동해요</p>
        <ol className={styles.flowSteps}>
          {[
            { icon: '🔗', title: '링크 만들기', desc: '회의 정보를 입력하면 공유 링크가 생겨요' },
            { icon: '🗓️', title: '참여자 응답', desc: '캘린더 연동 또는 직접 선택 · 로그인 불필요' },
            { icon: '✨', title: 'AI 자동 추천', desc: '모두의 응답을 분석해 최적 시간을 추천해요' },
            { icon: '📤', title: '확정 & 공유', desc: '시간을 확정하고 슬랙으로 바로 공유해요' },
          ].map((s, i) => (
            <li key={i} className={styles.flowStep}>
              <span className={styles.flowIcon}>{s.icon}</span>
              <div className={styles.flowText}>
                <span className={styles.flowStepTitle}>{s.title}</span>
                <span className={styles.flowStepDesc}>{s.desc}</span>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </div>
  )
}
