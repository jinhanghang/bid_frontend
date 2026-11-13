// 首页到既有工作台的一次性交接；File只保存在当前标签页内存中。
// 页数、清单和表格等首页配置先保留为草稿，不改变后端生成规则。
let ownerId = ''
let draft = null
let pending = false

function defaults() {
  return { generationMode: 'UPLOAD', file: null, checklistFile: null, pageCount: 200,
    projectType: 'SERVICE', knowledgeIds: [], knowledgeOptions: [], tableDensity: 'MEDIUM' }
}

function bindOwner(userId) {
  const nextOwner = String(userId || '')
  if (ownerId !== nextOwner || !draft) {
    ownerId = nextOwner
    draft = defaults()
    pending = false
  }
}

function copy(value) {
  return { ...value, knowledgeIds: [...(value.knowledgeIds || [])],
    knowledgeOptions: [...(value.knowledgeOptions || [])] }
}

export function getBidHomeDraft(userId) {
  bindOwner(userId)
  return copy(draft)
}

export function saveBidHomeDraft(userId, value) {
  bindOwner(userId)
  draft = copy({ ...defaults(), ...value })
}

export function markBidHomeDraftPending(userId) {
  bindOwner(userId)
  pending = Boolean(ownerId && draft.file)
}

export function consumeBidHomeDraft(userId) {
  bindOwner(userId)
  if (!pending || !ownerId) return null
  pending = false
  return copy(draft)
}

export const homeTenderAccept = '.doc,.docx,.pdf'

export function validateHomeTender(file) {
  if (!file || !Number.isFinite(file.size) || file.size <= 0) return '请选择有效的招标文件，文件不能为空'
  if (!/\.(doc|docx|pdf)$/i.test(file.name || '')) return '请上传 DOC、DOCX 或 PDF 招标文件'
  if (file.size > 50 * 1024 * 1024) return '招标文件不能超过 50MB'
  return ''
}
