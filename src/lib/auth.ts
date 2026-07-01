export interface User {
  email: string
  name: string
  picture?: string
}

const USER_KEY = 'cancan_user'
const CLIENT_ID = '932528645988-66oiu4fjfuu091erl3kel1k4cd2eq8ck.apps.googleusercontent.com'

export function getUser(): User | null {
  try {
    const raw = localStorage.getItem(USER_KEY)
    return raw ? JSON.parse(raw) : null
  } catch { return null }
}

export function saveUser(user: User): void {
  localStorage.setItem(USER_KEY, JSON.stringify(user))
}

export function clearUser(): void {
  localStorage.removeItem(USER_KEY)
  ;(window.google?.accounts as any)?.id?.disableAutoSelect?.()
}

function decodeJwt(token: string): Record<string, unknown> {
  const payload = token.split('.')[1]
  return JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')))
}

export function initGoogleSignIn(callback: (user: User) => void): void {
  ;(window.google.accounts as any).id.initialize({
    client_id: CLIENT_ID,
    callback: (response: { credential: string }) => {
      const payload = decodeJwt(response.credential) as { email: string; name: string; picture?: string }
      const user: User = { email: payload.email, name: payload.name, picture: payload.picture }
      saveUser(user)
      callback(user)
    },
  })
}

export function renderSignInButton(element: HTMLElement): void {
  ;(window.google.accounts as any).id.renderButton(element, {
    theme: 'outline',
    size: 'large',
    text: 'signin_with',
    locale: 'ko',
    width: 280,
  })
}
