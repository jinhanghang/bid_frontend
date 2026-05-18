import request from '@/utils/request'

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
    timeout: 180000
  })
}

export function getDocumentParseTask(taskId) {
  return request({ url: `/ai-document/parse/task/${taskId}`, method: 'get' })
}

export function generateDocumentOutline(id, data) {
  return request({ url: `/ai-document/${id}/outline/generate`, method: 'post', data, timeout: 180000 })
}

export function applyDocumentWordCountPreset(id, data) {
  return request({ url: `/ai-document/${id}/outline/word-count/preset`, method: 'post', data })
}

export function generateDocumentFull(id, data = {}) {
  return request({ url: `/ai-document/${id}/content/generate-full`, method: 'post', data })
}

export function rewriteDocumentFull(id, data = {}) {
  return request({ url: `/ai-document/${id}/content/rewrite-full`, method: 'post', data })
}

export function getDocumentGenerationTask(taskId) {
  return request({ url: `/ai-document/task/${taskId}`, method: 'get' })
}

export function exportDocumentWord(id) {
  return request({ url: `/ai-document/${id}/export-word`, method: 'post', timeout: 180000 })
}

export function exportDocumentPdf(id) {
  return request({ url: `/ai-document/${id}/export-pdf`, method: 'post', timeout: 180000 })
}
