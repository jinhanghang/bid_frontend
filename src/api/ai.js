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

export function pageAiGenerateResults(params) {
  return request.get('/ai-generate-result/page', { params })
}

export function getAiGenerateResult(id) {
  return request.get(`/ai-generate-result/${id}`)
}

export function pageAiGenerateTasks(params) {
  return request.get('/ai-generate-task/page', { params })
}

export function getAiGenerateTask(id) {
  return request.get(`/ai-generate-task/${id}`)
}

export function exportWord(resultId) {
  return request.post(`/ai/export/word/${resultId}`)
}

export function exportMarkdown(resultId) {
  return request.post(`/ai/export/markdown/${resultId}`)
}

export function downloadExportFile(fileId) {
  return request.get(`/ai/export/download/${fileId}`, {
    responseType: 'blob'
  })
}
