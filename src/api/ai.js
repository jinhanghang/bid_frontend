import request from '@/utils/request'

export function generateAi(data) {
  return request.post('/ai/generate', data)
}

export function generateBidProject(projectId, data) {
  return request.post(`/ai/bid-project/${projectId}/generate`, data || {})
}

export function testAi(data) {
  return request.post('/ai/test', data)
}

export function exportWord(resultId) {
  return request.post(`/ai/export/word/${resultId}`)
}

export function exportMarkdown(resultId) {
  return request.post(`/ai/export/markdown/${resultId}`)
}
