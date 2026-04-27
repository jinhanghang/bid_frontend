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

export const useAuthStore = defineStore('auth', {
  state: () => ({
    token: getToken(),
    user: getStoredUser(),
    menus: getStoredMenus(),
    permissions: []
  }),
  getters: {
    isLogin: (state) => Boolean(state.token),
    displayName: (state) => state.user?.fullName || state.user?.username || state.user?.phone || '未登录'
  },
  actions: {
    async login(payload) {
      const res = await loginApi(payload)
      // 后端 LoginResponse: tokenType, token, userId, username, fullName, roles, permissions, menus
      const token = res?.token || ''
      setToken(token)
      this.token = token

      this.user = {
        id: res?.userId,
        username: res?.username,
        fullName: res?.fullName,
        phone: res?.phone,
        roles: res?.roles || []
      }
      this.permissions = res?.permissions || []
      this.menus = res?.menus || []
      setStoredUser(this.user)
      setStoredMenus(this.menus)
      return res
    },

    async loadMe() {
      if (!this.token) return null
      const me = await getMe()
      this.user = me
      setStoredUser(me)
      return me
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
