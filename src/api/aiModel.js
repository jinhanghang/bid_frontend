import request from '@/utils/request'

export function pageAiModels(params) {
  return request.get('/ai-model-config/page', { params })
}

export function listAiModels() {
  return request.get('/ai-model-config/list')
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
