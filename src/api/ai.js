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


export function pageDocumentExports(params) {
  return request.get('/document-export/page', { params })
}

export function getDocumentExport(id) {
  return request.get(`/document-export/${id}`)
}

export function deleteDocumentExport(id) {
  return request.delete(`/document-export/${id}`)
}


export function deleteAiGenerateTask(id) {
  return request.delete(`/ai-generate-task/${id}`)
}

// ================= AI方案模块 V1 =================
export function pageAiSolutions(params) {
  return request.get('/ai-solution/page', { params })
}

export function getAiSolution(id) {
  return request.get(`/ai-solution/${id}`)
}

export function createAiSolution(data) {
  return request.post('/ai-solution', data)
}

export function saveAiSolutionRequirement(id, data) {
  return request.put(`/ai-solution/${id}/requirement`, data || {})
}

export function saveOverallWritingRequirement(id, data) {
  return request.put(`/ai-solution/${id}/overall-writing-requirement`, data || {})
}

export function saveAiSolutionOutline(id, data) {
  return request.put(`/ai-solution/${id}/outline`, data || {})
}

export function initAiSolutionDemoOutline(id) {
  return request.post(`/ai-solution/${id}/outline/demo`)
}

export function updateAiSolutionOutlineWordCount(outlineId, data) {
  return request.put(`/ai-solution/outline/${outlineId}/word-count`, data || {})
}

export function batchUpdateAiSolutionOutlineWordCount(outlineId, data) {
  return request.put(`/ai-solution/outline/${outlineId}/word-count/batch`, data || {})
}

export function updateAiSolutionOutlineWriting(outlineId, data) {
  return request.put(`/ai-solution/outline/${outlineId}/writing-config`, data || {})
}

export function addAiSolutionOutlineNode(outlineId, data) {
  return request.post(`/ai-solution/outline/${outlineId}/children`, data || {})
}

export function deleteAiSolutionOutlineNodes(data) {
  return request.delete('/ai-solution/outline/batch', { data: data || {} })
}

export function moveAiSolutionOutlineNode(outlineId, data) {
  return request.post(`/ai-solution/outline/${outlineId}/move`, data || {})
}

export function generateAiSolutionSection(outlineId, data) {
  return request.post(`/ai-solution/outline/${outlineId}/generate-section`, data || {}, { timeout: 0 })
}
