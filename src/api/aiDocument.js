import request from '@/utils/request'

// AI生成/解析/导出属于长耗时接口，不设置前端超时；由后端任务状态控制结果。
const NO_TIMEOUT = 0

export function listDocumentTypes() {
  return request({ url: '/ai-document/types', method: 'get' })
}

export function pageDocuments(params) {
  return request({ url: '/ai-document/page', method: 'get', params })
}

export function getDocument(id) {
  return request({ url: `/ai-document/${id}`, method: 'get' })
}

export function createDocument(data) {
  return request({ url: '/ai-document', method: 'post', data })
}

export function deleteDocument(id) {
  return request({ url: `/ai-document/${id}`, method: 'delete' })
}

export function saveDocumentForm(id, data) {
  return request({ url: `/ai-document/${id}/form`, method: 'put', data })
}

export function uploadDocumentReference(id, file, data = {}) {
  const form = new FormData()
  form.append('file', file)
  Object.entries(data).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') form.append(key, value)
  })
  return request({
    url: `/ai-document/${id}/files/upload`,
    method: 'post',
    data: form,
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: NO_TIMEOUT
  })
}

export function getDocumentParseTask(taskId) {
  return request({ url: `/ai-document/parse/task/${taskId}`, method: 'get' })
}

export function generateDocumentOutline(id, data) {
  return request({ url: `/ai-document/${id}/outline/generate`, method: 'post', data, timeout: NO_TIMEOUT })
}

export function applyDocumentWordCountPreset(id, data) {
  return request({ url: `/ai-document/${id}/outline/word-count/preset`, method: 'post', data })
}

export function generateDocumentFull(id, data = {}) {
  return request({ url: `/ai-document/${id}/content/generate-full`, method: 'post', data, timeout: NO_TIMEOUT })
}

export function rewriteDocumentFull(id, data = {}) {
  return request({ url: `/ai-document/${id}/content/rewrite-full`, method: 'post', data, timeout: NO_TIMEOUT })
}

export function getDocumentGenerationTask(taskId) {
  return request({ url: `/ai-document/task/${taskId}`, method: 'get' })
}

export function exportDocumentWord(id) {
  return request({ url: `/ai-document/${id}/export-word`, method: 'post', timeout: NO_TIMEOUT })
}

export function exportDocumentPdf(id) {
  return request({ url: `/ai-document/${id}/export-pdf`, method: 'post', timeout: NO_TIMEOUT })
}
