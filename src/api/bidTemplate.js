import request from '@/utils/request'

export function pageBidTemplates(params) {
  return request.get('/bid-template/page', { params })
}

export function listBidTemplates(params) {
  return request.get('/bid-template/list', { params })
}

export function getBidTemplate(id) {
  return request.get(`/bid-template/${id}`)
}

export function createBidTemplate(data) {
  return request.post('/bid-template', data)
}

export function updateBidTemplate(id, data) {
  return request.put(`/bid-template/${id}`, data)
}

export function attachBidTemplateFile(id, fileId) {
  return request.put(`/bid-template/${id}/file/${fileId}`)
}

export function setDefaultBidTemplate(id) {
  return request.put(`/bid-template/${id}/default`)
}

export function deleteBidTemplate(id) {
  return request.delete(`/bid-template/${id}`)
}

export function downloadBidTemplate(id) {
  return request.get(`/bid-template/${id}/download`, {
    responseType: 'blob'
  })
}
