export const TECH_STEPS = [
  { value: 1, label: '选择方案类型' },
  { value: 2, label: '录入基础信息' },
  { value: 3, label: '生成预览目录' },
  { value: 4, label: '调整总字数' },
  { value: 5, label: '生成方案' }
]

export const TECH_TASK_RUNNING_STATUSES = ['WAITING', 'RUNNING']
export const TECH_TASK_TERMINAL_STATUSES = ['SUCCESS', 'PARTIAL', 'FAILED', 'TIMEOUT', 'CANCELED', 'CANCELLED']

export function normalizeTechStatus(value, fallback = '') {
  return String(value || fallback || '').trim().toUpperCase()
}

export function hasTimeoutText(message) {
  const text = String(message || '')
  if (!text) return false
  const lower = text.toLowerCase()
  return text.includes('超时') || lower.includes('timeout') || lower.includes('timed out')
}

export function normalizeTechnicalTaskStatus(task) {
  const status = normalizeTechStatus(task?.status)
  if (status === 'TIMEOUT' || hasTimeoutText(task?.message) || hasTimeoutText(task?.errorMessage)) return 'TIMEOUT'
  if (status === 'CANCELLED') return 'CANCELED'
  return status
}

export function isTechnicalTaskRunningStatus(status) {
  return TECH_TASK_RUNNING_STATUSES.includes(normalizeTechStatus(status))
}

export function isTechnicalTaskTerminalStatus(status) {
  return TECH_TASK_TERMINAL_STATUSES.includes(normalizeTechStatus(status))
}

export function technicalTaskResultMessage(status, task) {
  const message = task?.message || task?.errorMessage || ''
  const normalized = normalizeTechStatus(status)
  if (normalized === 'SUCCESS') return message || '技术方案正文生成完成'
  if (normalized === 'PARTIAL') return message || '部分章节未生成完成，可重试失败章节'
  if (normalized === 'TIMEOUT') return message || '生成任务已超时，可刷新状态或重新生成'
  if (normalized === 'FAILED') return message || '生成失败，请查看失败原因后重试'
  if (normalized === 'CANCELED') return message || '生成任务已取消'
  return message || '任务已结束'
}

export function resolveTechnicalWorkflowState(options = {}) {
  const backendStatus = normalizeTechStatus(options.backendStatus)
  const solutionStatus = normalizeTechStatus(options.solutionStatus)
  const hasOutlines = !!options.hasOutlines
  const hasRequirement = !!String(options.purchaseRequirement || '').trim()
  const hasAiLevel = !!String(options.aiLevel || '').trim()
  const totalLeafCount = Number(options.totalLeafCount || 0)
  const finishedLeafCount = Number(options.finishedLeafCount || 0)
  const hasWordCount = !!options.hasWordCount

  if (options.generatingOutline || backendStatus === 'OUTLINE_GENERATING' || solutionStatus === 'OUTLINE_GENERATING') return 'OUTLINE_GENERATING'
  if (options.fullGenerating || backendStatus === 'GENERATING' || solutionStatus === 'CONTENT_GENERATING') return 'CONTENT_GENERATING'
  if (backendStatus === 'TIMEOUT') return 'TIMEOUT'
  if (backendStatus === 'FAILED') return 'FAILED'
  if (backendStatus === 'PARTIAL' || solutionStatus === 'CONTENT_PARTIAL') return 'PARTIAL'
  if (backendStatus === 'DONE' || solutionStatus === 'CONTENT_READY' || solutionStatus === 'DONE' || (totalLeafCount > 0 && finishedLeafCount >= totalLeafCount)) return 'DONE'
  if (backendStatus === 'WORD_COUNT_READY' || solutionStatus === 'WORD_COUNT_SET' || (hasOutlines && hasWordCount)) return 'WORD_COUNT_READY'
  if (backendStatus === 'OUTLINE_READY' || solutionStatus === 'OUTLINE_READY' || hasOutlines) return 'OUTLINE_READY'
  if (hasAiLevel && hasRequirement) return 'REQUIREMENT_READY'
  if (hasAiLevel || hasRequirement) return 'INFO_READY'
  return 'INIT'
}

export function technicalWorkflowStep(state) {
  const value = normalizeTechStatus(state)
  if (['CONTENT_GENERATING', 'PARTIAL', 'DONE', 'FAILED', 'TIMEOUT'].includes(value)) return 5
  if (['WORD_COUNT_READY'].includes(value)) return 4
  if (['OUTLINE_GENERATING', 'OUTLINE_READY'].includes(value)) return 3
  if (['INFO_READY', 'REQUIREMENT_READY'].includes(value)) return 2
  return 1
}

export function technicalWorkflowLabel(state) {
  const value = normalizeTechStatus(state)
  if (value === 'INIT') return '待选择方案类型和AI等级'
  if (value === 'INFO_READY') return '基础信息填写中'
  if (value === 'REQUIREMENT_READY') return '需求已填写，可生成目录'
  if (value === 'OUTLINE_GENERATING') return '目录生成中'
  if (value === 'OUTLINE_READY') return '目录已生成，请设置篇幅'
  if (value === 'WORD_COUNT_READY') return '篇幅已设置，可生成正文'
  if (value === 'CONTENT_GENERATING') return '正文生成中'
  if (value === 'PARTIAL') return '部分章节已完成'
  if (value === 'DONE') return '技术方案已完成'
  if (value === 'FAILED') return '生成失败'
  if (value === 'TIMEOUT') return '生成超时'
  return '待处理'
}

export function technicalWorkflowAlert(state) {
  const value = normalizeTechStatus(state)
  if (value === 'PARTIAL') return { type: 'warning', title: '部分章节未完成，可点击“重试失败章节”继续补齐。' }
  if (value === 'FAILED') return { type: 'error', title: '技术方案生成失败，请查看任务提示后重新生成。' }
  if (value === 'TIMEOUT') return { type: 'error', title: '技术方案生成任务已超时，建议刷新状态或重新生成。' }
  if (value === 'CONTENT_GENERATING') return { type: 'info', title: '正文正在后台生成，可停留查看进度，也可稍后返回本页面。' }
  if (value === 'OUTLINE_GENERATING') return { type: 'info', title: '目录正在生成，请等待生成完成后再调整篇幅。' }
  return null
}
