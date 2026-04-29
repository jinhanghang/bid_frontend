import request from '@/utils/request'

export function submitJoinApply(data) {
  return request.post('/enterprise-apply/join', data)
}

export function submitRegisterApply(data) {
  return request.post('/enterprise-apply/register', data)
}

export function pageMyEnterpriseApplies(params) {
  return request.get('/enterprise-apply/my-page', { params })
}

export function pageEnterpriseApplies(params) {
  return request.get('/enterprise-apply/page', { params })
}

export function getEnterpriseApply(id) {
  return request.get(`/enterprise-apply/${id}`)
}

export function auditEnterpriseApply(id, data) {
  return request.put(`/enterprise-apply/${id}/audit`, data)
}
