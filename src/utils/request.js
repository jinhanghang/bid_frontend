import axios from 'axios'
import { ElMessage } from 'element-plus'
import router from '@/router'
import { getToken, clearAuthStorage } from '@/utils/storage'

let loginExpiredNotified = false

const AI_GENERIC_ERROR_MESSAGE = 'AI任务执行失败，请稍后重试或检查模型配置/额度'

function isAiModuleRequest(config) {
  const url = String(config?.url || '')
  return url.includes('/ai-solution') || url.includes('/ai-document') || url.includes('/technical-solution')
}

function isRawAiFailureMessage(message) {
  const text = String(message || '')
  if (!text) return true
  if (text.length > 80) return true
  return /HTTP状态码|request_id|requestId|trace|Exception|Error:|java\.|stack|timeout|exceeded|Quota|exhausted|DashScope|百炼|Chat接口|model|403|500|调用失败/i.test(text)
}

function safeResponseMessage(config, message, fallback = '接口请求失败') {
  const text = message || fallback
  if (isAiModuleRequest(config) && isRawAiFailureMessage(text)) return AI_GENERIC_ERROR_MESSAGE
  return text
}


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
      const message = safeResponseMessage(response.config, body.message, '接口请求失败')
      ElMessage.error(message)
      return Promise.reject(new Error(message))
    }
    return body
  },
  (error) => {
    const status = error?.response?.status
    const message = safeResponseMessage(error?.config, error?.response?.data?.message || error?.message, '网络异常，请检查后端服务是否启动')

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
      ElMessage.error(isAiModuleRequest(error?.config) ? message : '没有权限访问该功能')
      return Promise.reject(error)
    }

    ElMessage.error(message)
    return Promise.reject(error)
  }
)

export default service
