import request from '@/utils/request'
import { getToken } from '@/utils/storage'

/**
 * 标书项目分页
 */
export function pageBidProjects(params) {
  return request.get('/bid-project/page', { params })
}

/**
 * 标书项目详情
 */
export function getBidProject(id) {
  return request.get(`/bid-project/${id}`)
}

/**
 * 标书项目生成前检查
 */
export function getBidProjectGenerateCheck(id) {
  return request.get(`/bid-project/${id}/generate-check`)
}

/**
 * 新增标书项目
 */
export function createBidProject(data) {
  return request.post('/bid-project', data)
}

/**
 * 修改标书项目
 */
export function updateBidProject(id, data) {
  return request.put(`/bid-project/${id}`, data)
}

/**
 * 修改标书项目状态
 */
export function updateBidProjectStatus(id, data) {
  return request.put(`/bid-project/${id}/status`, data)
}

/**
 * 删除标书项目
 */
export function deleteBidProject(id) {
  return request.delete(`/bid-project/${id}`)
}

/**
 * 项目资料分页
 */
export function pageProjectMaterials(params) {
  return request.get('/project-material/page', { params })
}

/**
 * 项目资料列表
 */
export function listProjectMaterials(params) {
  return request.get('/project-material/list', { params })
}

/**
 * 添加项目资料
 */
export function createProjectMaterial(data) {
  return request.post('/project-material', data)
}

/**
 * 项目资料加入知识库
 */
export function addProjectMaterialToKnowledge(id, data) {
  return request.post(`/project-material/${id}/to-knowledge`, data)
}

/**
 * 删除项目资料
 */
export function deleteProjectMaterial(id) {
  return request.delete(`/project-material/${id}`)
}
/**
 * AI标书：项目工作台详情
 */
export function getBidProjectWorkflow(id) {
  return request.get(`/bid-project/${id}/workflow`)
}

/**
 * AI标书：上传招标文件并创建项目，不立即读标
 */
export function uploadTenderProject(formData) {
  return request.post('/bid-project/workflow/upload-tender', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 300000
  })
}

/**
 * AI标书：开始读标解析
 */
export function startReadTenderProject(id) {
  return request.post(`/bid-project/${id}/workflow/start-read`, null, {
    timeout: 300000
  })
}

/**
 * AI标书：进入投标文件
 */
export function enterBidDocument(id) {
  return request.post(`/bid-project/${id}/bid-document/enter`)
}

/**
 * AI标书：进入技术方案
 */
export function enterTechnicalSolution(id) {
  return request.post(`/bid-project/${id}/technical-solution/enter`)
}

/**
 * AI标书：技术方案详情（后台内部方案，不跳 AI方案菜单）
 */
export function getBidProjectTechnicalSolution(id) {
  return request.get(`/bid-project/${id}/technical-solution`)
}

/**
 * AI标书：生成技术方案目录
 */
export function generateBidProjectTechnicalOutline(id, data) {
  return request.post(`/bid-project/${id}/technical-solution/outline/generate`, data, {
    timeout: 300000
  })
}

/**
 * AI标书：技术方案设置篇幅
 */
export function applyBidProjectTechnicalWordPreset(id, data) {
  return request.post(`/bid-project/${id}/technical-solution/word-count/preset`, data)
}

/**
 * AI标书：技术方案开始生成正文
 */
export function generateBidProjectTechnicalFull(id, data = {}) {
  return request.post(`/bid-project/${id}/technical-solution/content/generate-full`, data, {
    timeout: 300000
  })
}

/**
 * AI标书：技术方案重编全文
 */
export function rewriteBidProjectTechnicalFull(id, data = {}) {
  return request.post(`/bid-project/${id}/technical-solution/content/rewrite-full`, data, {
    timeout: 300000
  })
}

/**
 * AI标书：技术方案生成任务详情
 */
export function getBidProjectTechnicalTask(id, taskId) {
  return request.get(`/bid-project/${id}/technical-solution/task/${taskId}`)
}

/**
 * AI标书：技术方案导出 Word
 */
export function exportBidProjectTechnicalWord(id) {
  return request.post(`/bid-project/${id}/technical-solution/export-word`, null, {
    timeout: 300000
  })
}

/**
 * 文件下载
 */
export function downloadFileResource(id) {
  return request.get(`/files/download/${id}`, {
    responseType: 'blob',
    timeout: 300000
  })
}

/**
 * AI标书：技术方案单章节流式生成。
 * 这里复用 AI方案已有单章节生成接口，传入的 outlineId 属于 AI标书内部技术方案草稿。
 */
export async function streamBidProjectTechnicalSection(outlineId, data = {}, handlers = {}) {
  return streamFetch(`/ai-solution/outline/${outlineId}/generate-section/stream`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data || {})
  }, handlers)
}

async function streamFetch(url, options = {}, handlers = {}) {
  const base = import.meta.env.VITE_API_BASE || '/ai_bid/api'
  const token = getToken()
  const headers = new Headers(options.headers || {})
  if (token) headers.set('Authorization', `Bearer ${token}`)

  const response = await fetch(base + url, {
    ...options,
    headers
  })
  if (!response.ok || !response.body) {
    const text = await response.text().catch(() => '')
    throw new Error(text || `请求失败：${response.status}`)
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder('utf-8')
  let buffer = ''
  let finishedByDoneEvent = false
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const chunks = buffer.split('\n\n')
    buffer = chunks.pop() || ''
    chunks.forEach((chunk) => {
      const eventName = handleSseChunk(chunk, handlers)
      if (eventName === 'done') finishedByDoneEvent = true
    })
    if (finishedByDoneEvent) {
      await reader.cancel().catch(() => {})
      break
    }
  }
  if (buffer && !finishedByDoneEvent) handleSseChunk(buffer, handlers)
  handlers.onDone?.()
}

function handleSseChunk(chunk, handlers) {
  const lines = chunk.split('\n')
  let eventName = 'message'
  const dataLines = []
  lines.forEach((line) => {
    if (line.startsWith('event:')) eventName = line.slice(6).trim()
    if (line.startsWith('data:')) dataLines.push(line.slice(5).trimStart())
  })
  const data = dataLines.join('\n')
  if (!data) return eventName
  if (eventName === 'error') handlers.onError?.(data)
  else if (eventName === 'done') handlers.onDoneEvent?.(data)
  else handlers.onMessage?.(data)
  return eventName
}
