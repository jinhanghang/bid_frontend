import request from '@/utils/request'

export function pageTemplateVariables(params) {
  return request.get('/template-variable/page', { params })
}

export function listTemplateVariables(params) {
  return request.get('/template-variable/list', { params })
}

export function listEnabledTemplateVariables(params) {
  return request.get('/template-variable/list-enabled', { params })
}

export function getTemplateVariable(id) {
  return request.get(`/template-variable/${id}`)
}

export function createTemplateVariable(data) {
  return request.post('/template-variable', data)
}

export function updateTemplateVariable(id, data) {
  return request.put(`/template-variable/${id}`, data)
}

export function deleteTemplateVariable(id) {
  return request.delete(`/template-variable/${id}`)
}
