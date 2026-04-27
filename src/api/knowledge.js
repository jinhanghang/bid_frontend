import request from '@/utils/request'

export function pageKnowledgeBases(params) {
  return request.get('/knowledge-base/page', { params })
}

export function listKnowledgeBases(params) {
  return request.get('/knowledge-base/list', { params })
}

export function getKnowledgeBase(id) {
  return request.get(`/knowledge-base/${id}`)
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

export function listKnowledgeFiles(params) {
  return request.get('/knowledge-file/list', { params })
}

export function getKnowledgeFile(id) {
  return request.get(`/knowledge-file/${id}`)
}

export function createKnowledgeFile(data) {
  return request.post('/knowledge-file', data)
}

export function deleteKnowledgeFile(id) {
  return request.delete(`/knowledge-file/${id}`)
}