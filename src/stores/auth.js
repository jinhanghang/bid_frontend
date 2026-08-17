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

function isPlatformUser(roleCodes = []) {
  return roleCodes.includes('SUPERADMIN') || roleCodes.includes('PLATFORMADMIN')
}

function hasEnterpriseAccess(res = {}, roleCodes = []) {
  if (isPlatformUser(roleCodes)) return true
  const status = String(res?.enterpriseAccessStatus || '').trim().toUpperCase()
  return Boolean(res?.enterpriseId) && status !== 'UNBOUND' && status !== 'DISABLED'
}

function normalizeUserFromResponse(res = {}) {
  const roleCodes = normalizeRoleList(res?.roleCodes || res?.roles || [])
  const roleNames = res?.roleNames || []

  const enterpriseAvailable = hasEnterpriseAccess(res, roleCodes)

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
    menus: Array.isArray(res?.menus) ? res.menus : [],
    needCompleteEnterprise: !enterpriseAvailable,
    enterpriseAccessStatus: res?.enterpriseAccessStatus || (enterpriseAvailable ? 'AVAILABLE' : 'UNBOUND'),
    enterpriseAccessMessage: res?.enterpriseAccessMessage || ''
  }
}

export const useAuthStore = defineStore('auth', {
  state: () => {
    const storedUser = getStoredUser()
    const normalizedUser = storedUser ? normalizeUserFromResponse(storedUser) : null
    return {
      token: getToken(),
      user: normalizedUser,
      menus: normalizedUser?.needCompleteEnterprise ? [] : getStoredMenus(),
      permissions: normalizedUser?.needCompleteEnterprise ? [] : (Array.isArray(storedUser?.permissions) ? storedUser.permissions : [])
    }
  },
  getters: {
    isLogin: (state) => Boolean(state.token),
    displayName: (state) => state.user?.fullName || state.user?.username || state.user?.phone || '未登录',
    roleCodes: (state) => normalizeRoleList(state.user?.roleCodes || state.user?.roles || []),
    enterpriseId: (state) => state.user?.enterpriseId,
    needCompleteEnterprise: (state) => Boolean(state.user?.needCompleteEnterprise),
    enterpriseAccessStatus: (state) => state.user?.enterpriseAccessStatus
  },
  actions: {
    saveLoginState(res = {}) {
      const token = res?.token || ''
      setToken(token)
      this.token = token

      this.user = normalizeUserFromResponse(res)
      this.permissions = this.user.needCompleteEnterprise ? [] : (Array.isArray(res?.permissions) ? res.permissions : this.user.permissions || [])
      this.menus = this.user.needCompleteEnterprise ? [] : (Array.isArray(res?.menus) ? res.menus : this.user.menus || [])
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
      this.permissions = this.user.needCompleteEnterprise ? [] : (Array.isArray(me?.permissions) ? me.permissions : this.permissions || [])
      this.menus = this.user.needCompleteEnterprise ? [] : (Array.isArray(me?.menus) ? me.menus : this.menus || [])
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
