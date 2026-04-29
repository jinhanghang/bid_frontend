import request from '@/utils/request'

export function getDashboardSummary() {
  return request.get('/dashboard/summary')
}
