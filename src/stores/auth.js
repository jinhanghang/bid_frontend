import { defineStore } from 'pinia'
import { getMe, login as loginApi, logout as logoutApi } from '@/api/auth'
import {
  clearAuthStorage,
  getStoredMenus,
  getStoredUser,
  getToken,
  setStoredMenus,
  setStoredUser,
  setToken
} from '@/utils/storage'

function normalizeUserFromResponse(res = {}) {
  const roleCodes = res?.roleCodes || res?.roles || []
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
    roleNames
  }
}

export const useAuthStore = defineStore('auth', {
  state: () => ({
    token: getToken(),
    user: getStoredUser(),
    menus: getStoredMenus(),
    permissions: []
  }),
  getters: {
    isLogin: (state) => Boolean(state.token),
    displayName: (state) => state.user?.fullName || state.user?.username || state.user?.phone || '未登录',
    roleCodes: (state) => state.user?.roleCodes || state.user?.roles || [],
    enterpriseId: (state) => state.user?.enterpriseId
  },
  actions: {
    async login(payload) {
      const res = await loginApi(payload)
      const token = res?.token || ''
      setToken(token)
      this.token = token

      this.user = normalizeUserFromResponse(res)
      this.permissions = res?.permissions || []
      this.menus = res?.menus || []
      setStoredUser(this.user)
      setStoredMenus(this.menus)
      return res
    },

    async loadMe() {
      if (!this.token) return null
      const me = await getMe()
      this.user = normalizeUserFromResponse(me)
      this.permissions = me?.permissions || this.permissions || []
      setStoredUser(this.user)
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
