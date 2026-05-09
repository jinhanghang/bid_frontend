import request from '@/utils/request'

export function getCaptcha() {
  return request.get('/auth/captcha')
}

export function sendSmsCode(data) {
  return request.post('/auth/sms-code', data)
}

export function smsLogin(data) {
  return request.post('/auth/sms-login', data)
}

export function login(data) {
  return request.post('/auth/login', data)
}

export function logout() {
  return request.post('/auth/logout')
}

export function getMe() {
  return request.get('/auth/me')
}

/**
 * 修改当前登录用户密码。
 *
 * 前端传参：
 * {
 *   oldPassword: '旧密码',
 *   newPassword: '新密码',
 *   confirmPassword: '确认新密码'
 * }
 *
 * 后端接口建议：
 * POST /auth/change-password
 */
export function changePassword(data) {
  return request.post('/auth/change-password', data)
}