import request from '@/utils/request'

export function pagePromptTemplates(params) {
  return request.get('/prompt-template/page', { params })
}

export function getPromptTemplate(id) {
  return request.get(`/prompt-template/${id}`)
}

export function createPromptTemplate(data) {
  return request.post('/prompt-template', data)
}

export function updatePromptTemplate(id, data) {
  return request.put(`/prompt-template/${id}`, data)
}

export function deletePromptTemplate(id) {
  return request.delete(`/prompt-template/${id}`)
}
