import request from '@/utils/request'

export function getMemberSummary() {
  return request.get('/member/account/summary')
}

export function listMemberPlans() {
  return request.get('/member/plans')
}

export function createMemberOrder(data) {
  return request.post('/member/orders', data)
}

export function pageMyOrders(params) {
  return request.get('/member/orders/my-page', { params })
}

export function pageMyQuotaLogs(params) {
  return request.get('/member/quota/my-page', { params })
}

export function pageMemberAccounts(params) {
  return request.get('/member/admin/accounts/page', { params })
}

export function adjustMemberQuota(userId, data) {
  return request.post(`/member/admin/accounts/${userId}/adjust`, data)
}

export function pageMemberOrders(params) {
  return request.get('/member/admin/orders/page', { params })
}

export function confirmMemberOrderPaid(id) {
  return request.post(`/member/admin/orders/${id}/confirm-paid`)
}

export function pageAdminQuotaLogs(params) {
  return request.get('/member/admin/quota/page', { params })
}

export function auditQuotaUsageLogs(params) {
  return request.get('/quota-usage-log/audit', { params })
}

export function pageMemberPlanManage(params) {
  return request.get('/member-plan/page', { params })
}

export function createMemberPlan(data) {
  return request.post('/member-plan', data)
}

export function updateMemberPlan(id, data) {
  return request.put(`/member-plan/${id}`, data)
}

export function deleteMemberPlan(id) {
  return request.delete(`/member-plan/${id}`)
}

export function getQuotaUsageStats(params) {
  return request.get('/quota-usage-log/stats', { params })
}

export function getSecurityAuditReport() {
  return request.get('/security-audit/report')
}

