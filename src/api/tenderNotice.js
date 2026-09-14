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

export function updateTenderIndustryPreference(industryCategories) {
  return request.put(`${BASE_URL}/industry-preference`, { industryCategories })
}

export function listTenderIndustryOptions() {
  return request.get(`${BASE_URL}/industry-options`)
}
