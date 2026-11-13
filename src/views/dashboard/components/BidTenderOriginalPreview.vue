<template>
  <div class="original-preview">
    <div v-if="loading" class="preview-message" role="status"><el-icon class="rotating"><Loading /></el-icon><span>正在加载原文件预览…</span></div>
    <div v-if="error" class="preview-message preview-error"><el-icon><Document /></el-icon><strong>原文件暂时无法预览</strong><p>{{ error }}</p><el-button @click="loadOriginal">重新加载</el-button></div>
    <iframe v-if="pdfUrl" :src="pdfUrl" title="招标文件 PDF 原文预览" referrerpolicy="no-referrer" />
    <iframe v-else ref="frame" v-show="!error" title="招标文件原文预览" sandbox="allow-same-origin" referrerpolicy="no-referrer" />
  </div>
</template>

<script setup>
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { Document, Loading } from '@element-plus/icons-vue'
import { downloadFileResource } from '@/api/bidProject'
import { getLegacyTenderPreview } from '@/api/homeTenderParse'

const props = defineProps({ projectId: { type: String, required: true }, fileId: { type: String, default: '' }, fileName: { type: String, default: '' } })
const frame = ref(null)
const loading = ref(true)
const error = ref('')
const pdfUrl = ref('')
let sequence = 0
let observer
let disposed = false
const csp = "default-src 'none'; style-src 'unsafe-inline'; img-src data: blob:; font-src data: blob:; base-uri 'none'; form-action 'none'"
function fitDocument() {
  const doc = frame.value?.contentDocument
  const root = doc?.getElementById('original')
  if (!root) return
  const pages = [...root.querySelectorAll('section.docx')]
  const width = pages.length ? Math.max(...pages.map(node => node.offsetWidth)) + 48 : 842
  root.style.width = `${width}px`
  root.style.zoom = String(Math.min(1, Math.max(0.15, (frame.value.clientWidth - 12) / width)))
}
async function prepareFrame(id) {
  await nextTick()
  if (!frame.value || disposed || id !== sequence) return null
  const el = frame.value
  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => { el.removeEventListener('load', loaded); reject(new Error('预览容器加载超时')) }, 8000)
    function loaded() { clearTimeout(timeout); resolve() }
    el.addEventListener('load', loaded, { once: true })
    el.srcdoc = `<!doctype html><html><head><meta charset="UTF-8"><meta http-equiv="Content-Security-Policy" content="${csp}"><style>html,body{margin:0;padding:0;background:#f5f6fa;overflow-x:hidden}#original{margin:0 auto;transform-origin:top left}.docx-wrapper{padding:24px!important;background:transparent!important}section.docx{margin:0 auto 20px!important;box-shadow:0 2px 12px #272f4010!important}.legacy-document{width:794px;min-height:1123px;padding:45px 48px;box-sizing:border-box;margin:24px;background:white;box-shadow:0 2px 12px #272f4010}.legacy-document img{max-width:100%;height:auto}</style></head><body data-sequence="${id}"><div id="docx-styles"></div><div id="original"></div></body></html>`
  })
  if (disposed || id !== sequence) return null
  const doc = el.contentDocument
  doc.addEventListener('click', event => { if (event.target.closest?.('a')) event.preventDefault() })
  return doc
}
function releasePdf() {
  if (!pdfUrl.value) return
  URL.revokeObjectURL(pdfUrl.value)
  pdfUrl.value = ''
}
async function loadOriginal() {
  const id = ++sequence
  releasePdf()
  if (!props.fileId) { loading.value = true; return }
  loading.value = true
  error.value = ''
  try {
    const isLegacy = /\.doc$/i.test(props.fileName)
    const source = isLegacy ? await getLegacyTenderPreview(props.projectId) : await downloadFileResource(props.fileId)
    if (disposed || id !== sequence) return
    if (/\.pdf$/i.test(props.fileName)) {
      const signature = await source.slice(0, 5).text()
      if (disposed || id !== sequence) return
      if (signature !== '%PDF-') throw new Error('无效的 PDF 文件')
      pdfUrl.value = URL.createObjectURL(source.slice(0, source.size, 'application/pdf'))
      return
    }
    const doc = await prepareFrame(id)
    if (!doc) return
    const root = doc.getElementById('original')
    if (isLegacy) {
      const original = new DOMParser().parseFromString(source?.html || '', 'text/html')
      const paper = doc.createElement('div')
      paper.className = 'legacy-document'
      for (const style of original.querySelectorAll('head style')) doc.head.appendChild(doc.importNode(style, true))
      for (const node of [...original.body.childNodes]) paper.appendChild(doc.importNode(node, true))
      root.appendChild(paper)
    } else {
      const { renderAsync } = await import('docx-preview')
      if (disposed || id !== sequence) return
      await renderAsync(source, root, doc.getElementById('docx-styles'), { inWrapper: true, ignoreWidth: false, ignoreHeight: false, breakPages: true,
        ignoreLastRenderedPageBreak: false, renderHeaders: true, renderFooters: true, renderFootnotes: true,
        renderEndnotes: true, renderAltChunks: false, useBase64URL: true })
    }
    if (disposed || id !== sequence) return
    fitDocument()
  } catch (_) { if (!disposed && id === sequence) error.value = '可下载原文件核对，右侧解析不受预览失败影响。' }
  finally { if (!disposed && id === sequence) loading.value = false }
}
watch(() => [props.projectId, props.fileId, props.fileName], loadOriginal, { immediate: true })
watch(frame, (current, previous) => {
  if (previous) observer?.unobserve(previous)
  if (current) observer?.observe(current)
})
onMounted(() => { observer = new ResizeObserver(fitDocument); if (frame.value) observer.observe(frame.value) })
onBeforeUnmount(() => { disposed = true; sequence += 1; observer?.disconnect(); releasePdf() })
</script>

<style scoped>
.original-preview{position:relative;flex:1;min-height:0;overflow:hidden;background:#f6f7fb}.original-preview iframe{display:block;width:100%;height:100%;border:0;background:#f6f7fb}.preview-message{position:absolute;inset:0;z-index:1;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:12px;background:#f8f9fd;color:#9390a5;font-size:13px;text-align:center;padding:24px}.preview-message>.el-icon{font-size:26px;color:#8d71ff}.preview-error p{line-height:1.7;max-width:270px;font-size:12px}.preview-error strong{font-weight:500;color:#5f6173}.rotating{animation:rotate 1s linear infinite}@keyframes rotate{to{transform:rotate(360deg)}}
</style>
