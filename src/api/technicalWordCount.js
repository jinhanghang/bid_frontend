import request from '@/utils/request'

/**
 * 将技术方案内全部未生成的末级章节统一设置为固定字数或 AI 灵活生成。
 * targetWordCount 为 null 时表示不指定字数。
 */
export function batchUpdateBidProjectTechnicalAllOutlineWordCount(projectId, targetWordCount) {
  const id = String(projectId || '').trim()
  if (!id) return Promise.reject(new Error('项目ID不能为空'))
  return request.put(`/bid-project/${id}/technical-solution/outline/word-count/batch-all`, {
    targetWordCount: targetWordCount == null ? null : Number(targetWordCount)
  })
}
