const USER_KEY = 'ea_user'
const CREDS_KEY = 'ea_creds'
const PROGRESS_KEY = id => `ea_progress_${id}`

export function saveCreds(nickname, pin) {
  localStorage.setItem(CREDS_KEY, JSON.stringify({ nickname, pin }))
}

export function loadCreds() {
  try {
    const s = localStorage.getItem(CREDS_KEY)
    return s ? JSON.parse(s) : null
  } catch {
    return null
  }
}

export function clearCreds() {
  // Set a flag so login screen pre-fills instead of auto-logging in
  sessionStorage.setItem('ea_just_logged_out', '1')
}

export function wasLogout() {
  return sessionStorage.getItem('ea_just_logged_out') === '1'
}

export function clearLogoutFlag() {
  sessionStorage.removeItem('ea_just_logged_out')
}
export function saveUser(user) {
  localStorage.setItem(USER_KEY, JSON.stringify(user))
}

export function loadUser() {
  try {
    const s = localStorage.getItem(USER_KEY)
    return s ? JSON.parse(s) : null
  } catch {
    return null
  }
}

export function clearUser() {
  localStorage.removeItem(USER_KEY)
}

export function saveProgress(userId, data) {
  localStorage.setItem(PROGRESS_KEY(userId), JSON.stringify(data))
}

export function loadProgress(userId) {
  try {
    const s = localStorage.getItem(PROGRESS_KEY(userId))
    return s ? JSON.parse(s) : null
  } catch {
    return null
  }
}
