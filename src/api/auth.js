import request from '@/utils/request'

export function getCaptcha() {
  return request.get('/auth/captcha')
}

export function sendSmsCode(data) {
  return request.post('/auth/sms-code', data)
}

export function sendResetPasswordSmsCode(data) {
  return request.post('/auth/forgot-password/sms-code', data)
}

export function resetPassword(data) {
  return request.post('/auth/forgot-password/reset', data)
}

export function changePassword(data) {
  return request.post('/auth/change-password', data)
}

export function sendChangePasswordSmsCode() {
  return request.post('/auth/change-password/sms-code')
}

export function changePasswordBySms(data) {
  return request.post('/auth/change-password/by-sms', data)
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
