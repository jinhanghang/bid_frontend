<template>
  <div class="markdown-content" v-html="rendered" />
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({ content: { type: String, default: '' } })
const rendered = computed(() => renderMarkdown(props.content))

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char])
}

function inline(value) {
  let text = escapeHtml(value)
  const codes = []
  text = text.replace(/`([^`]+)`/g, (_, code) => `\u0000CODE${codes.push(`<code>${code}</code>`) - 1}\u0000`)
  text = text.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/__([^_]+)__/g, '<strong>$1</strong>')
    .replace(/~~([^~]+)~~/g, '<del>$1</del>')
    .replace(/\*([^*\n]+)\*/g, '<em>$1</em>')
    .replace(/\[([^\]]+)]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')
  return text.replace(/\u0000CODE(\d+)\u0000/g, (_, index) => codes[Number(index)] || '')
    .replace(/\u0000BR\u0000/g, '<br>')
}

function cells(line) {
  return line.trim().replace(/^\||\|$/g, '').split('|').map(value => value.trim())
}

function isDivider(line) {
  const values = cells(line)
  return values.length > 0 && values.every(value => /^:?-{3,}:?$/.test(value))
}

function renderMarkdown(source) {
  const lines = String(source || '').replace(/<br\s*\/?\s*>/gi, '\u0000BR\u0000').replace(/\r\n?/g, '\n').split('\n')
  const html = []
  let index = 0
  while (index < lines.length) {
    const line = lines[index]
    if (!line.trim()) { index += 1; continue }

    if (/^\s*```/.test(line)) {
      const code = []
      index += 1
      while (index < lines.length && !/^\s*```/.test(lines[index])) code.push(lines[index++])
      if (index < lines.length) index += 1
      html.push(`<pre><code>${escapeHtml(code.join('\n'))}</code></pre>`)
      continue
    }

    const heading = line.match(/^\s*(#{1,6})\s+(.+)$/)
    if (heading) {
      const level = heading[1].length
      html.push(`<h${level}>${inline(heading[2])}</h${level}>`)
      index += 1
      continue
    }

    if (/^\s*(---+|___+|\*\*\*+)\s*$/.test(line)) { html.push('<hr>'); index += 1; continue }

    if (line.includes('|') && index + 1 < lines.length && isDivider(lines[index + 1])) {
      const headers = cells(line)
      index += 2
      const rows = []
      while (index < lines.length && lines[index].includes('|') && lines[index].trim()) rows.push(cells(lines[index++]))
      html.push(`<div class="table-wrap"><table><thead><tr>${headers.map(cell => `<th>${inline(cell)}</th>`).join('')}</tr></thead><tbody>${rows.map(row => `<tr>${headers.map((_, i) => `<td>${inline(row[i] || '')}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`)
      continue
    }

    const list = line.match(/^\s*([-+*]|\d+[.)])\s+(.+)$/)
    if (list) {
      const ordered = /^\d/.test(list[1])
      const tag = ordered ? 'ol' : 'ul'
      const items = []
      while (index < lines.length) {
        const item = lines[index].match(/^\s*([-+*]|\d+[.)])\s+(.+)$/)
        if (!item || /^\d/.test(item[1]) !== ordered) break
        items.push(`<li>${inline(item[2])}</li>`)
        index += 1
      }
      html.push(`<${tag}>${items.join('')}</${tag}>`)
      continue
    }

    if (/^\s*>\s?/.test(line)) {
      const quote = []
      while (index < lines.length && /^\s*>\s?/.test(lines[index])) quote.push(lines[index++].replace(/^\s*>\s?/, ''))
      html.push(`<blockquote>${quote.map(inline).join('<br>')}</blockquote>`)
      continue
    }

    const paragraph = [line.trim()]
    index += 1
    while (index < lines.length && lines[index].trim()
      && !/^\s*(#{1,6})\s+/.test(lines[index]) && !/^\s*```/.test(lines[index])
      && !/^\s*([-+*]|\d+[.)])\s+/.test(lines[index])
      && !(lines[index].includes('|') && index + 1 < lines.length && isDivider(lines[index + 1]))) {
      paragraph.push(lines[index++].trim())
    }
    html.push(`<p>${paragraph.map(inline).join('<br>')}</p>`)
  }
  return html.join('')
}
</script>

<style scoped>
.markdown-content{font-size:15px;line-height:1.85;color:inherit;overflow-wrap:anywhere}
.markdown-content :deep(h1),.markdown-content :deep(h2),.markdown-content :deep(h3),.markdown-content :deep(h4){margin:20px 0 10px;color:#17243a;line-height:1.4}.markdown-content :deep(h1){font-size:24px}.markdown-content :deep(h2){font-size:21px}.markdown-content :deep(h3){font-size:18px}.markdown-content :deep(h4){font-size:16px}
.markdown-content :deep(p){margin:8px 0}.markdown-content :deep(ul),.markdown-content :deep(ol){margin:8px 0;padding-left:26px}.markdown-content :deep(li){margin:5px 0}.markdown-content :deep(strong){font-weight:700;color:#13213a}.markdown-content :deep(a){color:#526ff0;text-decoration:none}.markdown-content :deep(a:hover){text-decoration:underline}
.markdown-content :deep(hr){margin:18px 0;border:0;border-top:1px solid #e2e7ef}.markdown-content :deep(blockquote){margin:12px 0;padding:10px 14px;border-left:4px solid #7589ee;background:#f4f6ff;color:#55627a}
.markdown-content :deep(pre){margin:12px 0;padding:14px;overflow:auto;border-radius:10px;background:#172033;color:#e8edf6;line-height:1.65}.markdown-content :deep(code){padding:2px 5px;border-radius:4px;background:#eef1f7;font-family:Consolas,monospace;font-size:13px}.markdown-content :deep(pre code){padding:0;background:transparent;color:inherit}
.markdown-content :deep(.table-wrap){width:100%;margin:14px 0;overflow-x:auto;border:1px solid #dfe5ee;border-radius:10px}.markdown-content :deep(table){width:100%;min-width:620px;border-collapse:collapse;background:#fff}.markdown-content :deep(th),.markdown-content :deep(td){padding:10px 12px;border-right:1px solid #e4e8ef;border-bottom:1px solid #e4e8ef;text-align:left;vertical-align:top}.markdown-content :deep(th){background:#f5f7fb;color:#273650;font-weight:700}.markdown-content :deep(tr:last-child td){border-bottom:0}.markdown-content :deep(th:last-child),.markdown-content :deep(td:last-child){border-right:0}
</style>
