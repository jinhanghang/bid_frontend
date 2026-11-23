const urlAllowed = value => /^https?:\/\/[^\s<>]+$/i.test(value || '')
const elements = node => [...node.childNodes]
const tag = node => node.nodeType === 1 ? node.tagName.toLowerCase() : ''
const blockTags = new Set(['p','div','section','h1','h2','h3','h4','h5','h6','ul','ol','table','blockquote','pre','hr','figure'])

// Store Markdown, not browser-generated HTML, so previews and Word exports keep using one format.
export function visualContentToMarkdown(root) {
  function inline(node) {
    if (node.nodeType === 3) return node.nodeValue || ''
    if (node.nodeType !== 1) return ''
    const name=tag(node),body=elements(node).map(inline).join('')
    if (['script','style','iframe','object','svg'].includes(name)) return ''
    if (name==='br') return '\n'
    if (name==='strong' || name==='b') return body ? `**${body}**` : ''
    if (name==='em' || name==='i') return body ? `*${body}*` : ''
    if (name==='del' || name==='s' || name==='strike') return `~~${body}~~`
    if (name==='code') return '`'.repeat(Math.max(1,...[...body.matchAll(/`+/g)].map(m=>m[0].length+1)))+body+'`'.repeat(Math.max(1,...[...body.matchAll(/`+/g)].map(m=>m[0].length+1)))
    if (name==='a') return urlAllowed(node.getAttribute('href')) ? `[${body}](${node.getAttribute('href')})` : body
    if (name==='img') return urlAllowed(node.getAttribute('src')) ? `![${String(node.getAttribute('alt') || '').replace(/[\[\]]/g,'')}](${node.getAttribute('src')})` : ''
    return (name==='div' || name==='p') ? body+'\n' : body
  }
  function list(node,depth=0) {
    let number=Number(node.getAttribute('start')) || 1
    return [...node.children].filter(n=>tag(n)==='li').map(item=>{
      const nested=[...item.children].filter(n=>['ol','ul'].includes(tag(n)))
      const text=elements(item).filter(n=>!nested.includes(n)).map(inline).join('').trim()
      const prefix=tag(node)==='ol'?`${number++}. `:'- '
      return '  '.repeat(depth)+prefix+text.replace(/\n/g,'\n'+'  '.repeat(depth+1))+(nested.length?'\n'+nested.map(n=>list(n,depth+1)).join('\n'):'')
    }).join('\n')
  }
  function table(node) {
    const rows=[...node.querySelectorAll('tr')].filter(row=>row.closest('table')===node)
    if(!rows.length)return ''
    const width=Math.max(...rows.map(row=>row.cells.length))
    const rowText=row=>'| '+Array.from({length:width},(_,index)=>row.cells[index]?elements(row.cells[index]).map(inline).join('').trim().replace(/\|/g,'\\|').replace(/\n/g,'<br>'):'').join(' | ')+' |'
    const divider='| '+Array.from({length:width},(_,index)=>{
      const align=rows[0].cells[index]?.style.textAlign
      return align==='center'?':---:':align==='right'?'---:':align==='left'?':---':'---'
    }).join(' | ')+' |'
    return [rowText(rows[0]),divider,...rows.slice(1).map(rowText)].join('\n')
  }
  function blocks(container) {
    const output=[];let pending=''
    const flush=()=>{if(pending.trim())output.push(pending.trim());pending=''}
    for(const node of elements(container)) {
      const name=tag(node)
      if(!blockTags.has(name)){pending+=inline(node);continue}
      flush()
      if(name==='figure' && node.hasAttribute('data-image-source')) output.push(node.getAttribute('data-image-source'))
      else if(name==='table')output.push(table(node))
      else if(name==='ul' || name==='ol')output.push(list(node))
      else if(/^h[1-6]$/.test(name))output.push('#'.repeat(Number(name[1]))+' '+elements(node).map(inline).join('').trim())
      else if(name==='pre') {const body=node.textContent || '';const fence='`'.repeat(Math.max(3,...[...body.matchAll(/`+/g)].map(m=>m[0].length+1)));output.push(fence+'\n'+body+'\n'+fence)}
      else if(name==='hr')output.push('---')
      else if(name==='blockquote')output.push(blocks(node).split('\n').map(line=>'> '+line).join('\n'))
      else if(name==='p')output.push(elements(node).map(inline).join('').trim())
      else output.push(blocks(node))
    }
    flush();return output.filter(Boolean).join('\n\n')
  }
  return blocks(root)
}

// Clipboard HTML never carries event handlers, styling or internal image/file attributes into the editor.
export function sanitizeEditorPaste(html, document) {
  const source=document.createElement('template');source.innerHTML=html
  const safe=document.createElement('div')
  const allowed=new Set(['p','div','br','strong','b','em','i','s','del','code','pre','blockquote','h1','h2','h3','h4','h5','h6','ul','ol','li','table','thead','tbody','tr','th','td','a','hr'])
  function copy(node,parent){
    if(node.nodeType===3){parent.append(document.createTextNode(node.nodeValue || ''));return}
    if(node.nodeType!==1 || ['script','style','iframe','object','svg','img'].includes(tag(node)))return
    if(!allowed.has(tag(node))){elements(node).forEach(child=>copy(child,parent));return}
    const el=document.createElement(tag(node))
    if(tag(node)==='a' && urlAllowed(node.getAttribute('href')))el.setAttribute('href',node.getAttribute('href'))
    if(tag(node)==='ol' && /^\d+$/.test(node.getAttribute('start') || ''))el.setAttribute('start',node.getAttribute('start'))
    elements(node).forEach(child=>copy(child,el));parent.append(el)
  }
  elements(source.content).forEach(node=>copy(node,safe));return safe.innerHTML
}

// Work on a clone: a picker may have focus now, but its last valid editor Range still identifies the caret.
export function insertImageAtEditorRange(root, savedRange, marker, fallbackContent = '') {
  if (!/^!\[[^\]]*\]\(aibid-file:\/\/[^)\s]+\)$/.test(marker || '')) throw new Error('图片引用无效')
  const append=()=>`${fallbackContent.trimEnd()}${fallbackContent.trimEnd()?'\n\n':''}${marker}\n`
  if (!root || !savedRange || !root.contains(savedRange.endContainer)) return append()
  const path=[];let anchor=savedRange.endContainer
  while(anchor!==root){const parent=anchor.parentNode;if(!parent)return append();path.unshift([...parent.childNodes].indexOf(anchor));anchor=parent}
  const clone=root.cloneNode(true);let target=clone
  for(const index of path){target=target.childNodes[index];if(!target)return append()}
  const document=root.ownerDocument,range=document.createRange()
  try{range.setStart(target,savedRange.endOffset);range.collapse(true)}catch{return append()}
  const image=document.createElement('figure');image.setAttribute('data-image-source',marker)
  const element=target.nodeType===1?target:target.parentElement
  const container=element.closest('.section-content-renderer') || clone
  const unsplittable=element.closest('table,ul,ol,pre,blockquote,figure')
  if(unsplittable && clone.contains(unsplittable)) {
    // Standalone image blocks cannot live inside Markdown table cells or list items.
    let outer=unsplittable
    while(outer.parentElement && outer.parentElement!==container && outer.parentElement!==clone)outer=outer.parentElement
    outer.after(image)
  } else {
    let block=element
    while(block && block!==container && block!==clone && !/^(P|H[1-6]|DIV)$/.test(block.tagName))block=block.parentElement
    if(block && block!==container && block!==clone) {
      const tail=range.cloneRange();tail.setEnd(block,block.childNodes.length)
      const suffix=tail.extractContents(),following=block.cloneNode(false);following.append(suffix)
      block.after(image);if(following.textContent || following.querySelector('br,img'))image.after(following)
    } else range.insertNode(image)
  }
  return visualContentToMarkdown(clone)
}
