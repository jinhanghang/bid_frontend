import request from '@/utils/request'

export function pageAiTasks(params) {
  return request({ url: '/ai-task-center/page', method: 'get', params, timeout: 0 })
}


export function getAiTaskDetail(taskCategory, taskId) {
  return request({ url: `/ai-task-center/${taskCategory}/${taskId}/detail`, method: 'get', timeout: 0, silentError: true })
}

export function cancelAiTask(taskCategory, taskId) {
  return request({ url: `/ai-task-center/${taskCategory}/${taskId}/cancel`, method: 'post', timeout: 0 })
}

export function pageAiTaskEventLogs(params) {
  return request({ url: '/ai-task-event-log/page', method: 'get', params, timeout: 0, silentError: true })
}
