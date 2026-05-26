/**
 * 生成前端请求幂等 ID。
 *
 * 用于 AI 全文生成、重编全文等重任务。用户双击按钮、网络重试或页面恢复时，
 * 同一个业务动作携带 requestId，后端会返回已有任务，避免重复创建任务和重复预占额度。
 */
export function createRequestId(prefix = 'req') {
  const time = Date.now().toString(36)
  const random = Math.random().toString(36).slice(2, 10)
  return `${prefix}_${time}_${random}`
}
