const TOKEN_KEY = 'AI_BID_TOKEN'
const USER_KEY = 'AI_BID_USER'
const MENUS_KEY = 'AI_BID_MENUS'

export function getToken() {
  return localStorage.getItem(TOKEN_KEY) || ''
}

export function setToken(token) {
  if (!token) {
    localStorage.removeItem(TOKEN_KEY)
    return
  }
  localStorage.setItem(TOKEN_KEY, token)
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY)
}

export function getStoredUser() {
  const raw = localStorage.getItem(USER_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw)
  } catch (e) {
    return null
  }
}

export function setStoredUser(user) {
  if (!user) {
    localStorage.removeItem(USER_KEY)
    return
  }
  localStorage.setItem(USER_KEY, JSON.stringify(user))
}

export function getStoredMenus() {
  const raw = localStorage.getItem(MENUS_KEY)
  if (!raw) return []
  try {
    return JSON.parse(raw)
  } catch (e) {
    return []
  }
}

export function setStoredMenus(menus) {
  localStorage.setItem(MENUS_KEY, JSON.stringify(Array.isArray(menus) ? menus : []))
}

export function clearAuthStorage() {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(USER_KEY)
  localStorage.removeItem(MENUS_KEY)
}
