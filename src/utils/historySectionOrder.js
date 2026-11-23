// Snapshots store sections by database ID, which is unrelated to directory order.
// Use the snapshot's own tree so later edits/moves do not reorder an old version.
export function orderHistoricalSections(snapshot = {}, currentOutlines = []) {
  const sections=Array.isArray(snapshot.sections)?snapshot.sections:[]
  const historical=Array.isArray(snapshot.outlines)?snapshot.outlines:[]
  const source=historical.length?historical:currentOutlines
  const nodes=new Map(),children=new Map(),rank=new Map(),visited=new Set()
  let index=0
  function collect(rows,parent='') {
    for(const row of rows || []) {
      if(row?.id==null)continue
      const id=String(row.id)
      if(nodes.has(id))continue
      nodes.set(id,{...row,id,parentId:String(row.parentId ?? parent),index:index++})
      if(Array.isArray(row.children))collect(row.children,id)
    }
  }
  collect(source)
  for(const row of nodes.values()) {
    const parent=nodes.has(row.parentId) && row.parentId!==row.id?row.parentId:''
    if(!children.has(parent))children.set(parent,[])
    children.get(parent).push(row)
  }
  const sortValue=row=>row.sortNo==null || row.sortNo==='' || !Number.isFinite(Number(row.sortNo))?Number.MAX_SAFE_INTEGER:Number(row.sortNo)
  const compare=(a,b)=>sortValue(a)-sortValue(b) || a.index-b.index
  for(const siblings of children.values())siblings.sort(compare)
  function visit(row) {
    if(visited.has(row.id))return
    visited.add(row.id);rank.set(row.id,rank.size)
    for(const child of children.get(row.id) || [])visit(child)
  }
  for(const root of children.get('') || [])visit(root)
  // Corrupt cycles and partial snapshots must never hide saved content.
  for(const row of [...nodes.values()].sort(compare))visit(row)
  const collator=new Intl.Collator('zh-CN',{numeric:true})
  return sections.map((section,index)=>({section,index})).sort((a,b)=>{
    const ar=rank.get(String(a.section.outlineId)),br=rank.get(String(b.section.outlineId))
    if(ar!=null || br!=null)return (ar ?? Number.MAX_SAFE_INTEGER)-(br ?? Number.MAX_SAFE_INTEGER) || a.index-b.index
    return collator.compare(String(a.section.title || ''),String(b.section.title || '')) || a.index-b.index
  }).map(row=>row.section)
}
