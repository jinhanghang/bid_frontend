import axios from 'axios'
import { ElMessage } from 'element-plus'
import router from '@/router'
import { getToken, clearAuthStorage } from '@/utils/storage'

let loginExpiredNotified = false

const service = axios.create({
  baseURL: import.meta.env.VITE_API_BASE || '/ai_bid/api',
  timeout: 120000
})

service.interceptors.request.use(
  (config) => {
    const token = getToken()
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

service.interceptors.response.use(
  (response) => {
    // 后端统一返回：{ code: 0, message: 'success', data: ... }
    // 文件流或特殊返回保持原样；普通业务接口统一解包 data。
    const body = response.data
    if (body && typeof body === 'object' && Object.prototype.hasOwnProperty.call(body, 'code')) {
      if (body.code === 0) return body.data
      const message = body.message || '接口请求失败'
      ElMessage.error(message)
      return Promise.reject(new Error(message))
    }
    return body
  },
  (error) => {
    const status = error?.response?.status
    const message = error?.response?.data?.message || error?.message || '网络异常，请检查后端服务是否启动'

    if (status === 401) {
      clearAuthStorage()
      if (!loginExpiredNotified) {
        loginExpiredNotified = true
        ElMessage.warning('登录已过期，请重新登录')
      }
      if (router.currentRoute.value.path !== '/login') {
        router.replace('/login')
      }
      return Promise.reject(error)
    }

    if (status === 403) {
      ElMessage.error('没有权限访问该功能')
      return Promise.reject(error)
    }

    ElMessage.error(message)
    return Promise.reject(error)
  }
)

export default service
