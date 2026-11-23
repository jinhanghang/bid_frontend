// Route known body projects directly; parse-only and outline-only projects keep their workflow.
export function projectEntryRoute(project) {
  const id=String(project?.id || '')
  const status=String(project?.status || '').toUpperCase()
  if(['CONTENT_READY','CONTENT_PARTIAL','CONTENT_GENERATING','EXPORTED','GENERATED','COMPLETED'].includes(status)) {
    return {path:'/ai-bid/workbench',query:{projectId:id,doc:'TECHNICAL_SOLUTION'}}
  }
  return {path:'/dashboard',query:{step:'parse',projectId:id}}
}
