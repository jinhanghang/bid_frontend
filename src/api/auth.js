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
