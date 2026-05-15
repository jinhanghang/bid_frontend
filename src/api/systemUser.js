import request from '@/utils/request'

export function pageUsers(params) {
  return request.get('/system/user/page', { params })
}

export function createUser(data) {
  return request.post('/system/user', data)
}

export function updateUser(id, data) {
  return request.put(`/system/user/${id}`, data)
}

export function deleteUser(id) {
  return request.delete(`/system/user/${id}`)
}

export function updateUserStatus(id, data) {
  return request.put(`/system/user/${id}/status`, data)
}

export function getUserRoles(id) {
  return request.get(`/system/user/${id}/roles`)
}

export function updateUserRoles(id, data) {
  return request.put(`/system/user/${id}/roles`, data)
}

export function resetUserPassword(id) {
  return request.put(`/system/user/${id}/password/reset`)
}
