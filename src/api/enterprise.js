import request from '@/utils/request'

export function pageEnterprises(params) {
  return request.get('/enterprise/page', { params })
}

export function listEnterprises(params) {
  return request.get('/enterprise/list', { params })
}

export function getCurrentEnterprise() {
  return request.get('/enterprise/me')
}

export function createEnterprise(data) {
  return request.post('/enterprise', data)
}

export function updateEnterprise(id, data) {
  return request.put(`/enterprise/${id}`, data)
}

export function updateEnterpriseStatus(id, data) {
  return request.put(`/enterprise/${id}/status`, data)
}

export function deleteEnterprise(id) {
  return request.delete(`/enterprise/${id}`)
}