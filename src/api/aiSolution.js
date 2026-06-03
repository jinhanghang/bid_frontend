import request from '@/utils/request'
import { getToken } from '@/utils/storage'
import { createRequestId } from '@/utils/requestId'

// AI生成/解析/导出属于长耗时接口，不设置前端超时；由后端任务状态控制结果。
const NO_TIMEOUT = 0

export function pageSolutions(params) {
  return request({ url: '/ai-solution/page', method: 'get', params, timeout: NO_TIMEOUT })
}

export function getSolution(id) {
  return request({ url: `/ai-solution/${id}`, method: 'get', timeout: NO_TIMEOUT })
}

export function createSolution(data) {
  return request({ url: '/ai-solution', method: 'post', data })
}

export function deleteSolution(id) {
  return request({ url: `/ai-solution/${id}`, method: 'delete' })
}

export function uploadAndParseTenderFile(file, data = {}) {
  const form = new FormData()
  form.append('file', file)
  Object.entries(data).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') form.append(key, value)
  })
  return request({
    url: '/ai-solution/parse/upload',
    method: 'post',
    data: form,
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: NO_TIMEOUT
  })
}

export function getParseTask(taskId) {
  return request({ url: `/ai-solution/parse/task/${taskId}`, method: 'get', timeout: NO_TIMEOUT })
}

export function saveRequirement(id, data) {
  return request({ url: `/ai-solution/${id}/requirement`, method: 'put', data })
}

export function saveOverallWritingRequirement(id, overallWritingRequirement) {
  return request({ url: `/ai-solution/${id}/overall-writing-requirement`, method: 'put', data: { overallWritingRequirement } })
}

export function generateOutline(id, data) {
  return request({ url: `/ai-solution/${id}/outline/generate`, method: 'post', data, timeout: NO_TIMEOUT })
}

export function applyWordCountPreset(id, data) {
  return request({ url: `/ai-solution/${id}/outline/word-count/preset`, method: 'post', data })
}

export function updateOutlineWordCount(outlineId, targetWordCount) {
  return request({ url: `/ai-solution/outline/${outlineId}/word-count`, method: 'put', data: { targetWordCount } })
}

export function batchUpdateOutlineWordCount(outlineId, targetWordCount) {
  return request({ url: `/ai-solution/outline/${outlineId}/word-count/batch`, method: 'put', data: { targetWordCount } })
}

export function updateWritingConfig(outlineId, data) {
  return request({ url: `/ai-solution/outline/${outlineId}/writing-config`, method: 'put', data })
}

export function addOutlineNode(outlineId, data) {
  return request({ url: `/ai-solution/outline/${outlineId}/children`, method: 'post', data })
}

export function deleteOutlineNodes(outlineIds) {
  return request({ url: '/ai-solution/outline/batch', method: 'delete', data: { outlineIds } })
}

export function moveOutlineNode(outlineId, direction) {
  return request({ url: `/ai-solution/outline/${outlineId}/move`, method: 'post', data: { direction } })
}

export function generateFull(id, data = {}) {
  const payload = { ...(data || {}) }
  if (!payload.requestId) payload.requestId = createRequestId(`solution_${id}_generate`)
  return request({ url: `/ai-solution/${id}/content/generate-full`, method: 'post', data: payload, timeout: NO_TIMEOUT })
}

export function rewriteFull(id, data = {}) {
  const payload = { ...(data || {}) }
  if (!payload.requestId) payload.requestId = createRequestId(`solution_${id}_rewrite`)
  return request({ url: `/ai-solution/${id}/content/rewrite-full`, method: 'post', data: payload, timeout: NO_TIMEOUT })
}

export function getGenerationTask(taskId) {
  return request({ url: `/ai-solution/task/${taskId}`, method: 'get', timeout: NO_TIMEOUT, silentError: true })
}

export function getCurrentUserRunningAiTask() {
  return request({ url: '/ai-solution/task/current-user/running', method: 'get', timeout: NO_TIMEOUT, silentError: true })
}

export function listSolutionVersions(id) {
  return request({ url: `/ai-solution/${id}/versions`, method: 'get' })
}

export function getSolutionVersion(versionId) {
  return request({ url: `/ai-solution/version/${versionId}`, method: 'get' })
}

export function restoreSolutionVersion(id, versionId) {
  return request({ url: `/ai-solution/${id}/versions/${versionId}/restore`, method: 'post' })
}

export function restoreSolutionVersionSection(id, versionId, outlineId) {
  return request({ url: `/ai-solution/${id}/versions/${versionId}/sections/${outlineId}/restore`, method: 'post' })
}

export function updateSectionContent(outlineId, content) {
  return request({
    url: `/ai-solution/outline/${outlineId}/section-content`,
    method: 'put',
    data: { content }
  })
}

export function exportWord(id, data = {}) {
  return request({ url: `/ai-solution/${id}/export-word`, method: 'post', data, timeout: NO_TIMEOUT })
}

export function exportPdf(id, data = {}) {
  return request({ url: `/ai-solution/${id}/export-pdf`, method: 'post', data, timeout: NO_TIMEOUT })
}

export function startSolutionExportTask(id, format, data = {}) {
  return request({ url: `/ai-solution/${id}/export-task/${format}`, method: 'post', data, timeout: NO_TIMEOUT })
}

export function getSolutionExportTask(exportId) {
  return request({ url: `/ai-solution/export-task/${exportId}`, method: 'get', timeout: NO_TIMEOUT })
}

export function downloadFileResource(id) {
  return request({
    url: `/files/download/${id}`,
    method: 'get',
    responseType: 'blob',
    timeout: NO_TIMEOUT
  })
}

export async function streamWritingDirection(outlineId, params = {}, handlers = {}) {
  const query = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') query.append(key, value)
  })
  return streamFetch(`/ai-solution/outline/${outlineId}/writing-direction/stream?${query.toString()}`, {
    method: 'GET'
  }, handlers)
}

export async function streamSection(outlineId, data = {}, handlers = {}) {
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
    headers,
    signal: handlers.signal || options.signal
  })
  if (!response.ok || !response.body) {
    const text = await response.text().catch(() => '')
    throw new Error(text || `请求失败：${response.status}`)
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
  if (eventName === 'error') handlers.onError?.(data)
  else if (eventName === 'done') handlers.onDoneEvent?.(data)
  else handlers.onMessage?.(data)
  return eventName
}

export function getSolutionQualityCheck(id) {
  return request({ url: `/ai-solution/${id}/quality-check`, method: 'get', timeout: NO_TIMEOUT })
}

export function getSolutionWordCountStats(id) {
  return request({ url: `/ai-solution/${id}/word-count-stats`, method: 'get', timeout: NO_TIMEOUT })
}

export function getSolutionConsistencyPackage(id) {
  return request({ url: `/ai-solution/${id}/consistency-package`, method: 'get', timeout: NO_TIMEOUT })
}

export function getSolutionDuplicateCheck(id) {
  return request({ url: `/ai-solution/${id}/duplicate-check`, method: 'get', timeout: NO_TIMEOUT })
}

export function compressSolutionDuplicateSections(id) {
  return request({ url: `/ai-solution/${id}/duplicate-compress`, method: 'post', timeout: NO_TIMEOUT })
}

export function reviewSolutionByAi(id) {
  return request({ url: `/ai-solution/${id}/ai-review`, method: 'post', timeout: NO_TIMEOUT })
}
