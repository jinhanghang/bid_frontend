import request from '@/utils/request'

export function generateAi(data) {
  return request.post('/ai/generate', data)
}

export function generateBidProject(projectId, data) {
  return request.post(`/ai/bid-project/${projectId}/generate`, data || {}, {
    // 后端已经改为异步提交，但这里仍然取消超时限制，
    // 避免偶发网络慢或后端创建任务慢时前端先报 timeout。
    timeout: 0
  })
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

export function exportWord(resultId, data) {
  return request.post(`/ai/export/word/${resultId}`, data || {})
}

export function exportMarkdown(resultId) {
  return request.post(`/ai/export/markdown/${resultId}`)
}

export function downloadExportFile(fileId) {
  return request.get(`/ai/export/download/${fileId}`, {
    responseType: 'blob'
  })
}

export function deleteAiGenerateTask(id) {
  return request.delete(`/ai-generate-task/${id}`)
}
