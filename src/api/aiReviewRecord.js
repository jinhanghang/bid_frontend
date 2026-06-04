import request from '@/utils/request'

const NO_TIMEOUT = 0

export function pageAiReviewRecords(params) {
  return request({ url: '/ai-review-record/list', method: 'get', params, timeout: NO_TIMEOUT })
}

export function getAiReviewRecord(id) {
  return request({ url: `/ai-review-record/${id}`, method: 'get', timeout: NO_TIMEOUT })
}

export function deleteAiReviewRecord(id) {
  return request({ url: `/ai-review-record/${id}`, method: 'delete' })
}
