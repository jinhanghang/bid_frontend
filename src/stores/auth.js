import { defineStore } from 'pinia'
import { getMe, login as loginApi, logout as logoutApi, smsLogin as smsLoginApi } from '@/api/auth'
import {
  clearAuthStorage,
  getStoredMenus,
  getStoredUser,
  getToken,
  setStoredMenus,
  setStoredUser,
  setToken
} from '@/utils/storage'

function normalizeRoleCode(value = '') {
  return String(value)
    .trim()
    .toUpperCase()
    .replace(/^ROLE[_-]?/, '')
    .replace(/[^A-Z0-9]/g, '')
}

function normalizeRoleList(values = []) {
  if (!Array.isArray(values)) return []
  return values.map((item) => {
    if (typeof item === 'string') return normalizeRoleCode(item)
    return normalizeRoleCode(item?.roleCode || item?.code || item?.authority || item?.name || '')
  }).filter(Boolean)
}

function normalizeUserFromResponse(res = {}) {
  const roleCodes = normalizeRoleList(res?.roleCodes || res?.roles || [])
  const roleNames = res?.roleNames || []

  return {
    id: res?.userId ?? res?.id,
    username: res?.username,
    fullName: res?.fullName,
    phone: res?.phone,
    email: res?.email,
    enterpriseId: res?.enterpriseId,
    enterpriseName: res?.enterpriseName,
    roles: roleCodes,
    roleCodes,
    roleNames,
    permissions: Array.isArray(res?.permissions) ? res.permissions : [],
    menus: Array.isArray(res?.menus) ? res.menus : []
  }
}

export const useAuthStore = defineStore('auth', {
  state: () => {
    const storedUser = getStoredUser()
    return {
      token: getToken(),
      user: storedUser ? normalizeUserFromResponse(storedUser) : null,
      menus: getStoredMenus(),
      permissions: Array.isArray(storedUser?.permissions) ? storedUser.permissions : []
    }
  },
  getters: {
    isLogin: (state) => Boolean(state.token),
    displayName: (state) => state.user?.fullName || state.user?.username || state.user?.phone || '未登录',
    roleCodes: (state) => normalizeRoleList(state.user?.roleCodes || state.user?.roles || []),
    enterpriseId: (state) => state.user?.enterpriseId
  },
  actions: {
    saveLoginState(res = {}) {
      const token = res?.token || ''
      setToken(token)
      this.token = token

      this.user = normalizeUserFromResponse(res)
      this.permissions = Array.isArray(res?.permissions) ? res.permissions : this.user.permissions || []
      this.menus = Array.isArray(res?.menus) ? res.menus : this.user.menus || []
      this.user.permissions = this.permissions
      this.user.menus = this.menus
      setStoredUser(this.user)
      setStoredMenus(this.menus)
      return res
    },

    async login(payload) {
      const res = await loginApi(payload)
      return this.saveLoginState(res)
    },

    async smsLogin(payload) {
      const res = await smsLoginApi(payload)
      return this.saveLoginState(res)
    },

    async loadMe() {
      if (!this.token) return null
      const me = await getMe()
      this.user = normalizeUserFromResponse(me)
      this.permissions = Array.isArray(me?.permissions) ? me.permissions : this.permissions || []
      this.menus = Array.isArray(me?.menus) ? me.menus : this.menus || []
      this.user.permissions = this.permissions
      this.user.menus = this.menus
      setStoredUser(this.user)
      setStoredMenus(this.menus)
      return this.user
    },

    async logout() {
      try {
        await logoutApi()
      } catch (e) {
        // 后端 JWT 是无状态方案，退出失败也要清理前端登录状态。
      }
      clearAuthStorage()
      this.token = ''
      this.user = null
      this.menus = []
      this.permissions = []
    }
  }
})
