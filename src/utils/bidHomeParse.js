// 文件引用仅在本标签页内存保存；页面恢复使用首页URL中的项目ID。
let uploaded = null
export function rememberHomeUpload(userId, file, projectId) {
  uploaded = { owner: String(userId || ''), file, projectId: String(projectId || '') }
}
export function findHomeUpload(userId, file) {
  if (!uploaded || uploaded.owner !== String(userId || '')) { uploaded = null; return '' }
  return uploaded.file === file ? uploaded.projectId : ''
}
const homeCategoryOrder = ['OVERVIEW', 'TECH_OUTLINE', 'SCORE', 'BLIND', 'DISQUALIFICATION', 'SERVICE_LIST']

export function visibleHomeCategories(view) {
  const categories = new Map()
  for (const item of Array.isArray(view?.categories) ? view.categories : []) {
    const code = item?.code || item?.id
    if (!homeCategoryOrder.includes(code) || categories.has(code) || !item.id
        || !String(item.title || '').trim() || !String(item.content || '').trim()) continue
    categories.set(code, item)
  }
  if (!categories.has('BLIND') && view?.status === 'SUCCESS') {
    categories.set('BLIND', { id: 'BLIND', code: 'BLIND', title: '暗标要求', content: view.blindMode === 'NOT_APPLICABLE' ? '无暗标要求' : '暗标要求待核对', placeholder: true })
  }
  return homeCategoryOrder.flatMap(code => categories.has(code) ? [categories.get(code)] : [])
}
export function homeParseRunning(view) {
  return ['WAITING', 'PARSING', 'EXTRACTING', 'RUNNING'].includes(String(view?.status || '').toUpperCase())
}
