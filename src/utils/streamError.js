const AI_STREAM_FALLBACK = 'AI生成失败，请稍后重试或检查模型配置/额度'

function hasText(value) {
  return value !== undefined && value !== null && String(value).trim() !== ''
}

function withTraceId(message, traceId) {
  const id = String(traceId || '').trim().slice(0, 64)
  const text = message || AI_STREAM_FALLBACK
  if (!id || text.includes(id) || text.includes('追踪号')) return text
  return `${text}（追踪号：${id}）`
}

function looksRawOrUnsafe(text) {
  const value = String(text || '').trim()
  if (!value) return true
  if (value.length > 120) return true
  return /<!doctype|<html|exception|java\.|springframework|mybatis|sql|jdbc|stack|traceback|request_id|requestId|dashscope|百炼|Chat接口|HTTP状态码|accessKey|secret|token|model|quota|timeout|connection reset/i.test(value)
}

export function normalizeStreamErrorMessage(payload, fallback = AI_STREAM_FALLBACK) {
  if (!hasText(payload)) return fallback
  const text = String(payload).trim()

  try {
    const json = JSON.parse(text)
    const message = json.message || json.msg || json.error || json.errorMessage
    const safeMessage = looksRawOrUnsafe(message) ? fallback : String(message).trim()
    return withTraceId(safeMessage, json.traceId || json.requestId)
  } catch (_) {
    // 非 JSON 继续走文本安全判断。
  }

  if (looksRawOrUnsafe(text)) return fallback
  return text
}

export async function buildStreamRequestError(response, fallback = AI_STREAM_FALLBACK) {
  const text = await response.text().catch(() => '')
  const message = normalizeStreamErrorMessage(text || `请求失败：${response.status}`, fallback)
  const error = new Error(message)
  error.safeMessage = message
  return error
}
