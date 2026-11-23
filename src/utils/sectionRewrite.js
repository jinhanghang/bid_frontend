// Both body and outline actions must use the same non-destructive rewrite flow.
export function sectionRewriteSource(node) {
  return String(node?.section?.content || node?.section?.contentMarkdown || node?.content || node?.contentMarkdown || '')
}
export const rewritePresets = [
  {label:'减少套话',text:'删除重复背景、空泛定义和通用套话，保留项目事实、评分响应及可执行措施。'},
  {label:'补充实施细节',text:'补充实施步骤、责任岗位、检查节点、验收依据和交付成果，不编造项目参数或承诺。'},
  {label:'加强评分响应',text:'逐项核对本节绑定的评分标准和采购要求，补齐缺失响应，清楚说明措施、依据及检查方法。'},
  {label:'优化表格',text:'将适合对比、分工、检查清单的内容整理为完整Markdown表格，保留必要说明，避免重复表述。'}
]
export function buildSectionRewritePayload(node,source,instruction,targetWordCount) {
  const target=Number(targetWordCount ?? node?.targetWordCount ?? node?.section?.targetWordCount)
  if(!Number.isInteger(target) || target<150 || target>20000) throw new Error('目标字数请输入150至20000之间的整数')
  return {
    action:'REWRITE',previewOnly:true,sourceContent:String(source ?? ''),rewriteInstruction:String(instruction || '').trim(),
    title:node.title,targetWordCount:target,
    writingDirection:node.writingDirection,writingRequirement:node.writingRequirement,writingStyle:node.writingStyle,
    knowledgeIds:typeof node.knowledgeIds==='string'?node.knowledgeIds:JSON.stringify(node.knowledgeIds || []),
    fileResourceIds:node.fileResourceIds,chartLevel:node.chartLevel,tableLevel:node.tableLevel,imageLevel:node.imageLevel
  }
}
