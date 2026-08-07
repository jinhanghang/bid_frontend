import request from '@/utils/request'
import { getToken } from '@/utils/storage'

const base = import.meta.env.VITE_API_BASE || '/ai_bid/api'

export function createConversation(data) { return request.post('/ai-conversations', data) }
export function listConversations(params) { return request.get('/ai-conversations', { params }) }
export function getConversationMessages(id) { return request.get(`/ai-conversations/${id}/messages`) }
export function deleteConversation(id) { return request.delete(`/ai-conversations/${id}`) }
export function stopConversationRun(runId) { return request.post(`/ai-conversations/runs/${runId}/stop`) }
export function getConversationRun(runId) { return request.get(`/ai-conversations/runs/${runId}`) }

export function listDocumentArtifacts(params) { return request.get('/ai-document-artifacts', { params }) }
export function saveDocumentArtifact(documentId, data) { return request.post(`/ai-document-artifacts/documents/${documentId}`, data, { timeout: 0 }) }
export function regenerateDocumentArtifact(id) { return request.post(`/ai-document-artifacts/${id}/regenerate`, null, { timeout: 0 }) }
export function renameDocumentArtifact(id, artifactName) { return request.put(`/ai-document-artifacts/${id}/name`, { artifactName }) }
export function deleteDocumentArtifact(id) { return request.delete(`/ai-document-artifacts/${id}`) }
export function documentArtifactDownloadUrl(id) { return `${base}/ai-document-artifacts/${id}/download` }

export function uploadConversationAttachment(id, file, onProgress) {
  const form = new FormData()
  form.append('file', file)
  return request.post(`/ai-conversations/${id}/attachments`, form, {
    headers: { 'Content-Type': 'multipart/form-data' }, timeout: 0, onUploadProgress: onProgress
  })
}

export function streamConversationMessage(id, data, handlers = {}) {
  return fetchSse(`${base}/ai-conversations/${id}/messages/stream`, { method: 'POST', body: JSON.stringify(data) }, handlers)
}

export function regenerateConversationMessage(id, messageId, maxOutputWords, handlers = {}) {
  const query = maxOutputWords ? `?maxOutputWords=${encodeURIComponent(maxOutputWords)}` : ''
  return fetchSse(`${base}/ai-conversations/${id}/messages/${messageId}/regenerate${query}`, { method: 'POST' }, handlers)
}

export function resumeConversationRun(runId, offset, handlers = {}) {
  return fetchSse(`${base}/ai-conversations/runs/${runId}/events?offset=${Math.max(0, offset || 0)}`, { method: 'GET' }, handlers)
}

async function fetchSse(url, options, handlers) {
  const controller = new AbortController()
  const response = await fetch(url, {
    ...options,
    signal: controller.signal,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}`, ...(options.headers || {}) }
  })
  if (!response.ok) throw new Error(`请求失败（${response.status}）`)
  const contentType = response.headers.get('content-type') || ''
  if (!contentType.includes('text/event-stream')) {
    const body = await response.json().catch(() => ({}))
    throw new Error(body.message || '流式请求启动失败')
  }
  const reader = response.body.getReader()
  const decoder = new TextDecoder('utf-8')
  let buffer = ''
  const consume = (block) => {
    let event = 'message'; const data = []
    block.split(/\r?\n/).forEach((line) => {
      if (line.startsWith('event:')) event = line.slice(6).trim()
      if (line.startsWith('data:')) data.push(line.slice(5).trim())
    })
    if (!data.length) return
    let value = data.join('\n')
    try { value = JSON.parse(value) } catch (_) { /* text event */ }
    handlers.onEvent?.(event, value)
  }
  ;(async () => {
    try {
      while (true) {
        const { value, done } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const blocks = buffer.split(/\r?\n\r?\n/)
        buffer = blocks.pop() || ''
        blocks.forEach(consume)
      }
      if (buffer.trim()) consume(buffer)
      handlers.onClose?.()
    } catch (error) {
      if (error.name !== 'AbortError') handlers.onError?.(error)
    }
  })()
  return { abort: () => controller.abort() }
}
