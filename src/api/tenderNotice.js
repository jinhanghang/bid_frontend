import request from '@/utils/request'

const BASE_URL = '/tender-notice'

export function pageTenderNotices(params) {
  return request.get(`${BASE_URL}/page`, { params })
}

export function getTenderNotice(id) {
  return request.get(`${BASE_URL}/${id}`)
}
