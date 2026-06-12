import { ElMessage } from '@/plugins/element-plus-api'
import { normalizeStreamErrorMessage } from '@/utils/streamError'

/**
 * 页面级错误提示兜底。
 *
 * request.js 已经统一弹过的错误会带 __alreadyNotified，页面 catch 里不再重复弹窗。
 */
export function notifyRequestError(error, fallback = '操作失败，请稍后重试') {
  if (error?.__alreadyNotified) return
  const rawMessage = error?.safeMessage || error?.message || fallback
  const message = normalizeStreamErrorMessage(rawMessage, fallback)
  ElMessage.error(message || fallback)
}
