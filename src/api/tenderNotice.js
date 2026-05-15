import request from '@/utils/request'

const BASE_URL = '/tender-notice'

export function pageTenderNotices(params) {
  return request.get(`${BASE_URL}/page`, { params })
}

export function listTenderNotices(params) {
  return request.get(`${BASE_URL}/list`, { params })
}

export function getTenderNotice(id) {
  return request.get(`${BASE_URL}/${id}`)
}

export function createTenderNotice(data) {
  return request.post(BASE_URL, data)
}

export function updateTenderNotice(id, data) {
  return request.put(`${BASE_URL}/${id}`, data)
}

export function deleteTenderNotice(id) {
  return request.delete(`${BASE_URL}/${id}`)
}
