import request from '@/utils/request'

export function getHomeTenderParse(projectId) {
  return request.get(`/bid-project/${projectId}/home-parse`, { silentError: true })
}
export function startHomeTenderParse(projectId, data = {}) {
  return request.post(`/bid-project/${projectId}/home-parse/start`, data, { timeout: 0 })
}
export function saveHomeTenderCategory(projectId, categoryId, data) {
  return request.put(`/bid-project/${projectId}/home-parse/categories/${encodeURIComponent(categoryId)}`, data)
}
export function getLegacyTenderPreview(projectId) {
  return request.get(`/bid-project/${projectId}/home-parse/original-preview`, { timeout: 0 })
}
