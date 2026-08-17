import request from '@/utils/request'

const BASE_URL = '/tender-notice'

export function pageTenderNotices(params) {
  return request.get(`${BASE_URL}/page`, { params })
}

export function getTenderNotice(id) {
  return request.get(`${BASE_URL}/${id}`)
}

export function getTenderIndustryPreference() {
  return request.get(`${BASE_URL}/industry-preference`)
}

export function updateTenderIndustryPreference(industryCategory) {
  return request.put(`${BASE_URL}/industry-preference`, { industryCategory })
}

export function listTenderIndustryOptions() {
  return request.get(`${BASE_URL}/industry-options`)
}
