// Parse generated Markdown without injecting HTML; keep source coordinates for image editing.
export function splitTableCells(line) {
  let text = String(line).trim()
  if (text.startsWith('|')) text = text.slice(1)
  if (text.endsWith('|') && !text.endsWith('\\|')) text = text.slice(0, -1)
  const cells = [], buffer = []
  let ticks = 0
  for (let index = 0; index < text.length; index++) {
    const char = text[index]
    if (char === '\\' && text[index + 1] === '|') { buffer.push('|'); index++; continue }
    if (char === '`') {
      let count=1
      while (text[index+count] === '`') count++
      if (!ticks) ticks=count
      else if (ticks===count) ticks=0
      buffer.push('`'.repeat(count));index+=count-1;continue
    }
    if (char === '|' && !ticks) { cells.push(buffer.join('').trim()); buffer.length = 0 }
    else buffer.push(char)
  }
  cells.push(buffer.join('').trim())
  return cells
}
function tableDivider(line) {
  const cells = splitTableCells(line)
  return cells.length > 0 && cells.every(cell => /^:?-{3,}:?$/.test(cell))
}
const hasCells = line => String(line || '').includes('|') && splitTableCells(line).length > 1
const listMatch = line => String(line).match(/^([ \t]*)([-+*]|\d+[.)])\s+(.+)$/)
const indentOf = match => match[1].replace(/\t/g, '    ').length
const decode = value => { try { return decodeURIComponent(value) } catch { return value } }

export function parseInlineSegments(source = '') {
  const text = String(source), result = []
  // Vue renders text values, never v-html, so untrusted tags remain inert text.
  const pattern = /(`+)([^`]*?)\1|\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)|\*\*([^*]+)\*\*|__([^_]+)__|~~([^~]+)~~|\*([^*\n]+)\*|_([^_\n]+)_|<br\s*\/?\s*>/gi
  let cursor = 0, match
  while ((match = pattern.exec(text))) {
    if (match.index > cursor) result.push({ text: text.slice(cursor, match.index) })
    if (match[1]) result.push({ type: 'code', text: match[2] })
    else if (match[3]) result.push({ type: 'link', href: match[4], children: parseInlineSegments(match[3]) })
    else if (match[5] || match[6]) result.push({ type: 'bold', children: parseInlineSegments(match[5] || match[6]) })
    else if (match[7]) result.push({ type: 'strike', children: parseInlineSegments(match[7]) })
    else if (match[8] || match[9]) result.push({ type: 'italic', children: parseInlineSegments(match[8] || match[9]) })
    else result.push({ type: 'break' })
    cursor = pattern.lastIndex
  }
  if (cursor < text.length) result.push({ text: text.slice(cursor) })
  return result
}

export function parseSectionContent(content) {
  const lines = String(content || '').replace(/\r\n?/g, '\n').split('\n'), blocks = []
  let index = 0
  function nextNonBlank(start) { while (start < lines.length && !lines[start].trim()) start++; return start }
  function readList(start, indent, ordered) {
    const items = []; let position = start
    const first = listMatch(lines[start])
    while (position < lines.length) {
      if (!lines[position].trim()) {
        const next = nextNonBlank(position)
        if (next < lines.length && listMatch(lines[next]) && indentOf(listMatch(lines[next])) >= indent) { position = next; continue }
        break
      }
      const match = listMatch(lines[position])
      if (!match || indentOf(match) < indent) break
      if (indentOf(match) > indent) {
        if (!items.length) break
        const nested = readList(position, indentOf(match), /^\d/.test(match[2]))
        items[items.length - 1].children.push(nested.block); position = nested.end; continue
      }
      if (/^\d/.test(match[2]) !== ordered) break
      items.push({ segments: parseInlineSegments(match[3]), children: [] }); position++
    }
    return { block: { type: 'list', ordered, start: ordered ? parseInt(first[2], 10) : undefined, items, lineIndex: start }, end: position }
  }
  while (index < lines.length) {
    const lineIndex = index, rawLine = lines[index], trimmed = rawLine.trim()
    if (!trimmed) { blocks.push({ type: 'blank', lineIndex, rawLine }); index++; continue }
    const fence = trimmed.match(/^(`{3,}|~{3,})(.*)$/)
    if (fence) {
      const body = []; index++
      while (index < lines.length && !(lines[index].trim().startsWith(fence[1][0].repeat(fence[1].length)))) body.push(lines[index++])
      if (index < lines.length) index++
      blocks.push({ type: 'code', text: body.join('\n'), language: fence[2].trim(), lineIndex, rawLine }); continue
    }
    const image = trimmed.match(/^!\[([^\]]*)\]\((aibid-file:\/\/[^)\s]+|https?:\/\/[^)\s]+)\)$/)
    if (image) {
      const local = image[2].startsWith('aibid-file://'), [id, query = ''] = image[2].slice('aibid-file://'.length).split('?')
      const settings = Object.fromEntries(query.split('&').filter(Boolean).map(part => { const at=part.indexOf('='); return at<0?[decode(part),'']:[decode(part.slice(0,at)),decode(part.slice(at+1))] }))
      blocks.push({ type: 'image', fileId: local ? id : '', url: local ? '' : image[2], alt: decode(image[1]), width: local ? settings.width : undefined,
        align: local ? settings.align || 'center' : 'center', imageId: settings.imageId || '', lineIndex, rawLine }); index++; continue
    }
    const dividerIndex = nextNonBlank(index + 1)
    if (hasCells(rawLine) && dividerIndex < lines.length && tableDivider(lines[dividerIndex]) && splitTableCells(rawLine).length === splitTableCells(lines[dividerIndex]).length) {
      const headers = splitTableCells(rawLine), divider = splitTableCells(lines[dividerIndex]), rows = []
      index = dividerIndex + 1
      while (index < lines.length) {
        // Some saved AI responses contain empty lines between Markdown table rows.
        const rowIndex = nextNonBlank(index)
        if (rowIndex >= lines.length || !hasCells(lines[rowIndex]) || tableDivider(lines[rowIndex])) break
        rows.push(splitTableCells(lines[rowIndex])); index = rowIndex + 1
      }
      const columns = Math.max(headers.length, ...rows.map(row => row.length))
      const alignments = Array.from({length:columns}, (_,i) => /^:.*:$/.test(divider[i] || '') ? 'center' : /:$/.test(divider[i] || '') ? 'right' : 'left')
      blocks.push({ type: 'table', headers: Array.from({length:columns},(_,i)=>parseInlineSegments(headers[i] || '')),
        rows: rows.map(row => Array.from({length:columns},(_,i)=>parseInlineSegments(row[i] || ''))), alignments, lineIndex, rawLine }); continue
    }
    const heading = trimmed.match(/^(#{1,6})\s+(.+)$/)
    if (heading) { blocks.push({type:'text',tag:`h${heading[1].length}`,className:'heading',segments:parseInlineSegments(heading[2]),lineIndex,rawLine});index++;continue }
    const list = listMatch(rawLine)
    if (list) { const parsed=readList(index,indentOf(list),/^\d/.test(list[2]));blocks.push(parsed.block);index=parsed.end;continue }
    if (/^>\s?/.test(trimmed)) {
      const quote=[]
      while (index<lines.length && /^\s*>\s?/.test(lines[index])) quote.push(lines[index++].replace(/^\s*>\s?/,''))
      blocks.push({type:'quote',segments:parseInlineSegments(quote.join('\n')),lineIndex,rawLine});continue
    }
    if (/^(?:-{3,}|_{3,}|\*{3,})$/.test(trimmed)) { blocks.push({type:'rule',lineIndex,rawLine});index++;continue }
    blocks.push({type:'text',tag:'p',className:'paragraph',segments:parseInlineSegments(rawLine),lineIndex,rawLine});index++
  }
  return blocks
}
