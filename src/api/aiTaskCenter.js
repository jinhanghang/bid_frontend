import request from '@/utils/request'

export function pageAiTasks(params) {
  return request({ url: '/ai-task-center/page', method: 'get', params, timeout: 0 })
}


export function cancelAiTask(taskCategory, taskId) {
  return request({ url: `/ai-task-center/${taskCategory}/${taskId}/cancel`, method: 'post', timeout: 0 })
}
