export const enableMap = {
  1: ['正常', 'success'],
  0: ['停用', 'info']
}

export const projectStatusMap = {
  draft: ['草稿', 'info'],
  generating: ['生成中', 'warning'],
  completed: ['已完成', 'success'],
  failed: ['失败', 'danger'],
  archived: ['已归档', 'info']
}

export const aiTaskStatusMap = {
  pending: ['等待中', 'info'],
  running: ['运行中', 'warning'],
  success: ['成功', 'success'],
  failed: ['失败', 'danger'],
  cancelled: ['已取消', 'info']
}

export const tenderStatusMap = {
  new: ['新公告', 'warning'],
  read: ['已读', 'info'],
  reported: ['已报备', 'success'],
  expired: ['已过期', 'info'],
  invalid: ['无效', 'danger']
}

export const approvalStatusMap = {
  draft: ['草稿', 'info'],
  submitted: ['已提交', 'warning'],
  approving: ['审批中', 'warning'],
  approved: ['已通过', 'success'],
  rejected: ['已驳回', 'danger'],
  cancelled: ['已取消', 'info']
}
