import axios from 'axios'
import { ElMessage } from '@/plugins/element-plus-api'
import router from '@/router'
import { getToken, clearAuthStorage } from '@/utils/storage'

let loginExpiredNotified = false
let loginExpiredRedirecting = false

const LOGIN_REQUIRED_CODE = 200001
const AI_GENERIC_ERROR_MESSAGE = 'AI任务执行失败，请稍后重试或检查模型配置/额度'

function isLoginRequiredCode(code) {
  return Number(code) === LOGIN_REQUIRED_CODE || Number(code) === 401
}

function buildLoginQuery() {
  const currentRoute = router.currentRoute.value
  const currentFullPath = currentRoute?.fullPath || '/dashboard'
  const redirect = currentRoute?.path === '/login' ? '/dashboard' : currentFullPath
  return {
    expired: '1',
    redirect
  }
}

function notifyLoginExpired(message = '登录已过期，请重新登录') {
  if (loginExpiredNotified) return
  loginExpiredNotified = true
  ElMessage.warning(message)
  window.setTimeout(() => {
    loginExpiredNotified = false
  }, 3000)
}

function handleLoginExpired(message = '登录已过期，请重新登录') {
  clearAuthStorage()
  notifyLoginExpired(message)

  const currentRoute = router.currentRoute.value
  if (currentRoute?.path === '/login' || loginExpiredRedirecting) return

  loginExpiredRedirecting = true
  router
    .replace({ path: '/login', query: buildLoginQuery() })
    .finally(() => {
      loginExpiredRedirecting = false
    })
}

function isAiModuleRequest(config) {
  const url = String(config?.url || '')
  return url.includes('/ai-solution') || url.includes('/ai-document') || url.includes('/technical-solution')
}

function isAiExportRequest(config) {
  const url = String(config?.url || '')
  return /\/export-(word|pdf)(\?|$)/.test(url) || /\/technical-solution\/export-(word|pdf)(\?|$)/.test(url)
}

function isAiPdfExportRequest(config) {
  const url = String(config?.url || '')
  return /\/export-pdf(\?|$)/.test(url) || /\/technical-solution\/export-pdf(\?|$)/.test(url)
}

function isPdfExportFailureMessage(message) {
  const text = String(message || '')
  return /PDF导出|PDF 导出|导出服务|PDFBox|字体|font|IOException|渲染失败|导出失败/i.test(text)
}

function isRawAiFailureMessage(message) {
  const text = String(message || '')
  if (!text) return true
  if (text.length > 80) return true
  return /HTTP状态码|request_id|requestId|trace|Exception|Error:|java\.|stack|timeout|exceeded|Quota|exhausted|DashScope|百炼|Chat接口|model|403|500|调用失败/i.test(text)
}

function safeResponseMessage(config, message, fallback = '接口请求失败') {
  const text = message || fallback

  // 导出 Word/PDF 不是 AI 生成任务，不能再统一替换成“AI任务执行失败”。
  // PDF 导出失败时，前端只显示业务化提示；详细原因由后端日志记录。
  if (isAiPdfExportRequest(config) && isPdfExportFailureMessage(text)) {
    return 'PDF导出失败，请联系管理员查看导出日志'
  }
  if (isAiExportRequest(config)) return text

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
      if (isLoginRequiredCode(body.code)) {
        handleLoginExpired(message || '登录已过期，请重新登录')
        return Promise.reject(new Error(message))
      }

      if (!response.config?.silentError) ElMessage.error(message)
      return Promise.reject(new Error(message))
    }
    return body
  },
  (error) => {
    const status = error?.response?.status
    const message = safeResponseMessage(error?.config, error?.response?.data?.message || error?.message, '网络异常，请检查后端服务是否启动')

    if (status === 401) {
      handleLoginExpired(message || '登录已过期，请重新登录')
      return Promise.reject(error)
    }

    if (status === 403) {
      if (!error?.config?.silentError) ElMessage.error(isAiModuleRequest(error?.config) ? message : '没有权限访问该功能')
      return Promise.reject(error)
    }

    if (!error?.config?.silentError) ElMessage.error(message)
    return Promise.reject(error)
  }
)

export default service

