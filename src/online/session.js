const SESSION_KEY = 'call-break-online-session'

export function loadSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function saveSession(session) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session))
}

export function clearSession() {
  localStorage.removeItem(SESSION_KEY)
}

export function getOrCreatePlayerKey() {
  const session = loadSession()
  if (session?.playerKey) return session.playerKey
  return crypto.randomUUID()
}
