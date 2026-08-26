import request from '@/utils/request'
import { getToken } from '@/utils/storage'
import { createRequestId } from '@/utils/requestId'
import { buildStreamRequestError, normalizeStreamErrorMessage } from '@/utils/streamError'

// AI读标/生成/导出属于长耗时接口，不设置前端超时；由后端任务状态控制结果。
const NO_TIMEOUT = 0

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

export function createBidProjectFromNotice(noticeId, data = {}) {
  return request.post(`/bid-project/from-tender-notice/${noticeId}`, data)
}

export function saveBidProjectChatDraft(id, data) {
  return request.put(`/bid-project/${id}/chat-draft`, data)
}

export function getBidDocumentEditor(id, messageId) { return request.get(`/bid-project/${id}/editor`, { params: { messageId } }) }
export function saveBidDocumentEditor(id, messageId, data) { return request.put(`/bid-project/${id}/editor`, data, { params: { messageId } }) }
export function listBidDocumentEditorVersions(id, messageId) { return request.get(`/bid-project/${id}/editor/versions`, { params: { messageId } }) }
export function restoreBidDocumentEditorVersion(id, messageId, versionId) { return request.post(`/bid-project/${id}/editor/versions/${versionId}/restore`, null, { params: { messageId } }) }
export function exportBidDocumentEditor(id, messageId, data) { return request.post(`/bid-project/${id}/editor/export`, data, { params: { messageId }, timeout: NO_TIMEOUT }) }

/**
 * 修改标书项目
 */
export function updateBidProject(id, data) {
  return request.put(`/bid-project/${id}`, data)
}

/**
 * 为历史项目补充所属企业（仅平台管理员）。
 */
export function setBidProjectEnterprise(id, enterpriseId) {
  return request.put(`/bid-project/${id}/enterprise`, { enterpriseId })
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
 * AI标书：当前项目可关联的企业资料档案
 */
export function listBidProjectCompanyMaterialOptions(id, params = {}) {
  return request.get(`/bid-project/${id}/company-material/options`, { params })
}

/**
 * AI标书：关联企业资料档案
 */
export function bindBidProjectCompanyMaterial(id, data) {
  const body = data && typeof data === 'object' ? data : { companyMaterialId: data }
  return request.post(`/bid-project/${id}/company-material/bind`, body)
}

/**
 * AI标书：解除企业资料档案关联
 */
export function unbindBidProjectCompanyMaterial(id) {
  return request.delete(`/bid-project/${id}/company-material/bind`)
}

/**
 * AI标书：上传招标文件并创建项目，不立即读标
 */
export function uploadTenderProject(formData) {
  return request.post('/bid-project/workflow/upload-tender', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: NO_TIMEOUT
  })
}

/**
 * AI标书：给当前已有项目补传 / 替换招标文件，不新建项目
 */
export function uploadTenderToExistingProject(id, formData) {
  return request.post(`/bid-project/${id}/workflow/upload-tender`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: NO_TIMEOUT
  })
}

/**
 * AI标书：开始读标解析
 */
export function startReadTenderProject(id, data = {}) {
  return request.post(`/bid-project/${id}/workflow/start-read`, data || {}, {
    timeout: NO_TIMEOUT
  })
}

/**
 * AI标书：从解析结果自动回填项目基础信息。
 *
 * 说明：
 * 1. 不新增页面入口；
 * 2. 只在当前项目解析完成后，由用户点击按钮触发；
 * 3. 后端只补空字段，避免覆盖用户手工修改过的项目信息。
 */
export function autoFillBidProjectBasicInfo(id) {
  return request.post(`/bid-project/${id}/workflow/auto-fill-basic-info`)
}

/**
 * AI标书：进入投标文件
 */
export function enterBidDocument(id) {
  return request.post(`/bid-project/${id}/bid-document/enter`)
}

/**
 * AI标书：投标文件智能填空详情
 */
export function getBidDocument(id) {
  return request.get(`/bid-project/${id}/bid-document`)
}

/**
 * AI标书：投标文件智能填空
 */
export function fillBidDocument(id) {
  return request.post(`/bid-project/${id}/bid-document/fill`, null, {
    timeout: NO_TIMEOUT
  })
}

/**
 * AI标书：保存投标文件智能填空内容
 */
export function saveBidDocument(id, data) {
  return request.post(`/bid-project/${id}/bid-document/save`, data || {})
}

/**
 * AI标书：进入技术方案
 */
export function enterTechnicalSolution(id) {
  return request.post(`/bid-project/${id}/technical-solution/enter`)
}

/**
 * AI标书：技术方案详情（后台内部生成成果，不跳独立产品入口）
 */
export function getBidProjectTechnicalSolution(id) {
  return request.get(`/bid-project/${id}/technical-solution`)
}

/**
 * AI标书：生成技术方案目录
 */
export function generateBidProjectTechnicalOutline(id, data) {
  return request.post(`/bid-project/${id}/technical-solution/outline/generate`, data, {
    timeout: NO_TIMEOUT
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
  const payload = { ...(data || {}) }
  if (!payload.requestId) payload.requestId = createRequestId(`bid_${id}_tech_generate`)
  return request.post(`/bid-project/${id}/technical-solution/content/generate-full`, payload, {
    timeout: NO_TIMEOUT
  })
}

/**
 * AI标书：技术方案重编全文
 */
export function rewriteBidProjectTechnicalFull(id, data = {}) {
  const payload = { ...(data || {}) }
  if (!payload.requestId) payload.requestId = createRequestId(`bid_${id}_tech_rewrite`)
  return request.post(`/bid-project/${id}/technical-solution/content/rewrite-full`, payload, {
    timeout: NO_TIMEOUT
  })
}

/**
 * AI标书：技术方案只重试失败/未完成章节
 */
export function retryBidProjectTechnicalFailedSections(id, data = {}) {
  const payload = { ...(data || {}), retryFailedOnly: true }
  if (!payload.requestId) payload.requestId = createRequestId(`bid_${id}_tech_retry_failed`)
  return request.post(`/bid-project/${id}/technical-solution/content/generate-full`, payload, {
    timeout: NO_TIMEOUT
  })
}

/**
 * AI标书：技术方案生成任务详情
 */
export function getBidProjectTechnicalTask(id, taskId) {
  return request.get(`/bid-project/${id}/technical-solution/task/${taskId}`)
}

/**
 * AI标书：终止尚未生成的技术方案章节（已完成章节保留）
 */
export function cancelBidProjectTechnicalTask(id, taskId) {
  return request.post(`/bid-project/${id}/technical-solution/task/${taskId}/cancel`, null, {
    timeout: NO_TIMEOUT
  })
}


/**
 * AI标书：技术方案历史版本列表
 */
export function listBidProjectTechnicalVersions(id) {
  return request.get(`/bid-project/${id}/technical-solution/versions`)
}

/**
 * AI标书：技术方案历史版本详情
 */
export function getBidProjectTechnicalVersion(id, versionId) {
  return request.get(`/bid-project/${id}/technical-solution/versions/${versionId}`)
}

/**
 * AI标书：恢复技术方案历史版本
 */
export function restoreBidProjectTechnicalVersion(id, versionId) {
  return request.post(`/bid-project/${id}/technical-solution/versions/${versionId}/restore`)
}

/**
 * AI标书：恢复技术方案历史版本单章
 */
export function restoreBidProjectTechnicalVersionSection(id, versionId, outlineId) {
  return request.post(`/bid-project/${id}/technical-solution/versions/${versionId}/sections/${outlineId}/restore`)
}

/**
 * AI标书：技术方案导出 Word
 */
export function exportBidProjectTechnicalWord(id) {
  return request.post(`/bid-project/${id}/technical-solution/export-word`, null, {
    timeout: NO_TIMEOUT
  })
}

/**
 * AI标书：技术方案导出 PDF
 */
export function exportBidProjectTechnicalPdf(id) {
  return request.post(`/bid-project/${id}/technical-solution/export-pdf`, null, {
    timeout: NO_TIMEOUT
  })
}

/**
 * AI标书：创建技术方案异步导出任务
 */
export function startBidProjectTechnicalExportTask(id, format, data = {}) {
  return request.post(`/bid-project/${id}/technical-solution/export-task/${format}`, data, {
    timeout: NO_TIMEOUT
  })
}

/**
 * AI标书：查询技术方案异步导出任务
 */
export function getBidProjectTechnicalExportTask(id, exportId) {
  return request.get(`/bid-project/${id}/technical-solution/export-task/${exportId}`, {
    timeout: NO_TIMEOUT
  })
}

/**
 * 文件下载
 */
export function downloadFileResource(id) {
  return request.get(`/files/download/${id}`, {
    responseType: 'blob',
    timeout: NO_TIMEOUT
  })
}


function requireProjectId(projectId) {
  if (!projectId) throw new Error('缺少项目ID，无法操作技术方案')
  return projectId
}

/**
 * AI标书：技术方案单节点修改目标字数。
 * 通过项目包装接口操作，后端会校验项目权限和章节归属。
 */
export function updateBidProjectTechnicalOutlineWordCount(projectId, outlineId, targetWordCount) {
  return request.put(`/bid-project/${requireProjectId(projectId)}/technical-solution/outline/${outlineId}/word-count`, { targetWordCount })
}

/**
 * AI标书：技术方案批量修改下级节点目标字数。
 */
export function batchUpdateBidProjectTechnicalOutlineWordCount(projectId, outlineId, targetWordCount) {
  return request.put(`/bid-project/${requireProjectId(projectId)}/technical-solution/outline/${outlineId}/word-count/batch`, { targetWordCount })
}

/**
 * AI标书：技术方案保存节点标题、编写方向和编写要求。
 */
export function updateBidProjectTechnicalWritingConfig(projectId, outlineId, data = {}) {
  return request.put(`/bid-project/${requireProjectId(projectId)}/technical-solution/outline/${outlineId}/writing-config`, data || {})
}

/**
 * AI标书：技术方案新增目录节点。
 */
export function addBidProjectTechnicalOutlineNode(projectId, outlineId, data = {}) {
  return request.post(`/bid-project/${requireProjectId(projectId)}/technical-solution/outline/${outlineId}/children`, data || {})
}

/**
 * AI标书：技术方案批量删除目录节点。
 */
export function deleteBidProjectTechnicalOutlineNodes(projectId, outlineIds = []) {
  return request.delete(`/bid-project/${requireProjectId(projectId)}/technical-solution/outline/batch`, { data: { outlineIds } })
}

/**
 * AI标书：技术方案节点排序。
 */
export function moveBidProjectTechnicalOutlineNode(projectId, outlineId, direction) {
  return request.post(`/bid-project/${requireProjectId(projectId)}/technical-solution/outline/${outlineId}/move`, { direction })
}

/**
 * AI标书：技术方案保存章节正文。
 */
export function updateBidProjectTechnicalSectionContent(projectId, outlineId, content) {
  return request.put(`/bid-project/${requireProjectId(projectId)}/technical-solution/outline/${outlineId}/section-content`, { content })
}

/**
 * AI标书：技术方案保存整体编写要求。
 */
export function saveBidProjectTechnicalOverallWritingRequirement(projectId, overallWritingRequirement) {
  return request.put(`/bid-project/${requireProjectId(projectId)}/technical-solution/overall-writing-requirement`, { overallWritingRequirement })
}

/**
 * AI标书：技术方案 AI帮写编写方向。
 */
export async function streamBidProjectTechnicalWritingDirection(projectId, outlineId, params = {}, handlers = {}) {
  const query = new URLSearchParams()
  Object.entries(params || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') query.append(key, value)
  })
  return streamFetch(`/bid-project/${requireProjectId(projectId)}/technical-solution/outline/${outlineId}/writing-direction/stream?${query.toString()}`, {
    method: 'GET'
  }, handlers)
}

/**
 * AI标书：技术方案单章节流式生成。
 */
export async function streamBidProjectTechnicalSection(projectId, outlineId, data = {}, handlers = {}) {
  return streamFetch(`/bid-project/${requireProjectId(projectId)}/technical-solution/outline/${outlineId}/generate-section/stream`, {
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
    headers,
    signal: handlers.signal || options.signal
  })
  if (!response.ok || !response.body) {
    throw await buildStreamRequestError(response)
  }

  const reader = response.body.getReader()
  const abortHandler = () => reader.cancel().catch(() => {})
  if (handlers.signal) handlers.signal.addEventListener('abort', abortHandler, { once: true })
  const decoder = new TextDecoder('utf-8')
  let buffer = ''
  let finishedByDoneEvent = false
  try {
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
  } finally {
    if (handlers.signal) handlers.signal.removeEventListener('abort', abortHandler)
  }
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
  if (eventName === 'error') handlers.onError?.(normalizeStreamErrorMessage(data))
  else if (eventName === 'done') handlers.onDoneEvent?.(data)
  else handlers.onMessage?.(data)
  return eventName
}

export function getBidProjectTechnicalQualityCheck(id) {
  return request.get(`/bid-project/${id}/technical-solution/quality-check`, { timeout: NO_TIMEOUT })
}

export function getBidProjectTechnicalWordCountStats(id) {
  return request.get(`/bid-project/${id}/technical-solution/word-count-stats`, { timeout: NO_TIMEOUT })
}

export function getBidProjectTechnicalConsistencyPackage(id) {
  return request.get(`/bid-project/${id}/technical-solution/consistency-package`, { timeout: NO_TIMEOUT })
}

export function getBidProjectTechnicalDuplicateCheck(id) {
  return request.get(`/bid-project/${id}/technical-solution/duplicate-check`, { timeout: NO_TIMEOUT })
}

export function compressBidProjectTechnicalDuplicateSections(id) {
  return request.post(`/bid-project/${id}/technical-solution/duplicate-compress`, null, { timeout: NO_TIMEOUT })
}

export function reviewBidProjectTechnicalByAi(id) {
  return request.post(`/bid-project/${id}/technical-solution/ai-review`, null, { timeout: NO_TIMEOUT })
}

/**
 * AI标书：查看当前项目已保存的招标文件分析结果
 */
export function getBidProjectTenderAnalysis(id) {
  return request.get(`/bid-project/${id}/tender-analysis`)
}

/**
 * AI标书：基于当前项目关联知识库生成并保存招标文件分析
 */
export function analyzeBidProjectTender(id, data = {}) {
  return request.post(`/bid-project/${id}/tender-analysis`, data || {}, {
    timeout: NO_TIMEOUT
  })
}

/**
 * AI标书：客户确认 / 修改投标文件结果。
 */
export function reviewBidDocument(id, data = {}) {
  return request.put(`/bid-project/${id}/bid-document/review`, data || {})
}

/**
 * AI标书：导出投标文件 Word。
 */
export function exportBidDocumentWord(id, data = {}) {
  return request.post(`/bid-project/${id}/bid-document/export-word`, data || {}, {
    timeout: NO_TIMEOUT
  })
}

/**
 * AI标书：导出投标文件 Markdown 备份。
 */
export function exportBidDocumentMarkdown(id) {
  return request.post(`/bid-project/${id}/bid-document/export-markdown`, null, {
    timeout: NO_TIMEOUT
  })
}

