import request from '@/utils/request'

export function pageAiModels(params) {
  return request.get('/ai-model-config/page', { params })
}

export function listAiModels(params) {
  return request.get('/ai-model-config/list', { params })
}

export function diagnoseAiModels() {
  return request.get('/ai-model-config/diagnose')
}

export function previewAiModel(data) {
  return request.post('/ai-model-config/preview', data)
}

export function createAiModel(data) {
  return request.post('/ai-model-config', data)
}

export function updateAiModel(id, data) {
  return request.put(`/ai-model-config/${id}`, data)
}

export function deleteAiModel(id) {
  return request.delete(`/ai-model-config/${id}`)
}
