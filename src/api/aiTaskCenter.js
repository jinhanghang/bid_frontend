import request from '@/utils/request'

export function pageAiTasks(params) {
  return request({ url: '/ai-task-center/page', method: 'get', params, timeout: 0 })
}
