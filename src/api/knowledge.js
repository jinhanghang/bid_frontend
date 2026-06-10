import request from '@/utils/request'

export function pageKnowledgeBases(params) {
  return request.get('/knowledge-base/page', { params })
}

export function listKnowledgeBases(params) {
  return request.get('/knowledge-base/list', { params })
}

export function createKnowledgeBase(data) {
  return request.post('/knowledge-base', data)
}

export function updateKnowledgeBase(id, data) {
  return request.put(`/knowledge-base/${id}`, data)
}

export function updateKnowledgeBaseStatus(id, data) {
  return request.put(`/knowledge-base/${id}/status`, data)
}

export function deleteKnowledgeBase(id) {
  return request.delete(`/knowledge-base/${id}`)
}

export function pageKnowledgeFiles(params) {
  return request.get('/knowledge-file/page', { params })
}

export function createKnowledgeFile(data) {
  return request.post('/knowledge-file', data)
}

export function deleteKnowledgeFile(id) {
  return request.delete(`/knowledge-file/${id}`)
}

export function rebuildKnowledgeFile(id, async = true) {
  return request.post(`/knowledge-vector/files/${id}/rebuild`, null, {
    params: { async }
  })
}

export function rebuildKnowledgeBase(id, async = true) {
  return request.post(`/knowledge-vector/bases/${id}/rebuild`, null, {
    params: { async }
  })
}

export function searchKnowledge(data) {
  return request.post('/knowledge-vector/search', data, { timeout: 0 })
}

export function askKnowledge(data) {
  return request.post('/knowledge-vector/ask', data, { timeout: 0 })
}


export function submitKnowledgeAskFeedback(data) {
  return request.post('/knowledge-vector/ask-feedback', data)
}

export function getKnowledgeAskFeedbackStats(params) {
  return request.get('/knowledge-vector/ask-feedback/stats', { params })
}

export function previewAskKnowledge(data) {
  return request.post('/knowledge-vector/ask/preview', data, { timeout: 0 })
}

export function submitAskTask(data) {
  return request.post('/knowledge-vector/ask/tasks', data, { timeout: 0 })
}

export function getAskTask(id) {
  return request.get(`/knowledge-vector/ask/tasks/${id}`, { silentError: true })
}

export function updateAskTaskReview(id, data) {
  return request.put(`/knowledge-vector/ask/tasks/${id}/review`, data)
}

export function analyzeTenderKnowledge(data) {
  return request.post('/knowledge-vector/tender-analysis', data, { timeout: 0 })
}
