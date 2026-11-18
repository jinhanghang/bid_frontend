<template>
  <section class="home-parse-workspace" aria-label="首页招标文件解析">
    <header class="workspace-heading"><div><button type="button" class="back-link" @click="requestBack"><el-icon><ArrowLeft /></el-icon> 返回首页</button><h1 :title="view.projectName">{{ view.projectName || '招标文件解析' }}</h1></div><span class="overall-state" :class="{ failed: view.status === 'FAILED' }"><el-icon v-if="running" class="rotating"><Loading /></el-icon><el-icon v-else-if="view.status === 'SUCCESS'"><CircleCheck /></el-icon>{{ phaseLabel }}</span></header>
    <div v-if="loadError" class="connection-warning" role="alert">解析状态暂时无法获取，已保留当前内容。<button type="button" @click="reconnect">重新连接</button></div>
    <div v-if="view.reviewState === 'PARTIAL'" class="partial-warning" role="alert">部分内容未完成识别或未通过原文核对，请结合原文件检查。<button type="button" :disabled="starting" @click="retryParse">重新解析</button></div>
    <div v-if="categories.length && ['FAILED', 'CANCELED', 'CANCELLED'].includes(view.status)" class="partial-warning" role="alert">本次解析未完成，已识别内容仍保留。<button type="button" :disabled="starting" @click="retryParse">重新解析</button></div>
    <div class="parse-panels">
      <article v-if="!outlineMode" class="original-panel">
        <div class="panel-heading"><div><el-icon><Document /></el-icon><strong>招标文件</strong><span :title="view.fileName">{{ view.fileName }}</span></div><el-button text size="small" :disabled="!view.fileId" :loading="downloading" @click="downloadOriginal"><el-icon><Download /></el-icon> 下载原文</el-button></div>
        <BidTenderOriginalPreview v-if="view.fileId" :project-id="projectId" :file-id="view.fileId" :file-name="view.fileName" />
        <div v-else class="panel-empty"><el-icon class="rotating"><Loading /></el-icon><p>{{ loading ? '正在读取原文件…' : '该项目没有招标文件，请返回首页上传文件。' }}</p></div>
      </article>
      <article class="result-panel">
        <div v-if="categories.length" class="result-tabs" role="tablist" aria-label="实际识别类别"><button v-for="item in categories" :id="`category-tab-${item.id}`" :key="item.id" type="button" role="tab" :aria-selected="activeId === item.id" :tabindex="activeId === item.id ? 0 : -1" :class="{ active: activeId === item.id }" @click="switchCategory(item.id)" @keydown.right.prevent="stepTab(1)" @keydown.left.prevent="stepTab(-1)">{{ item.title }}</button></div>
        <div v-else class="empty-tabs"><el-icon><Reading /></el-icon> 解析内容</div>
        <div v-if="running" class="parsing-progress" role="status"><div><span>{{ view.message || '正在识别招标文件内容' }}</span><span>{{ view.progress || 0 }}%</span></div><div class="progress-track"><i :style="{ width: `${Math.min(99, view.progress || 0)}%` }" /></div></div>
        <div v-if="activeCategory" class="result-body" role="tabpanel" :aria-labelledby="`category-tab-${activeCategory.id}`">
          <div v-if="!outlineMode" class="category-heading"><div><h2>{{ activeCategory.title }}</h2><p v-if="!activeCategory.placeholder">{{ editing ? '核对原文后修改，保存后会保留在当前项目中。' : '根据招标文件实际内容识别，请对照左侧原文核对。' }}</p></div><el-button v-if="view.status === 'SUCCESS' && !activeCategory.placeholder && !editing" text type="primary" @click="beginEdit"><el-icon><EditPen /></el-icon> 编辑</el-button></div>
          <div v-if="editing" class="category-editor"><textarea v-model="editContent" :aria-label="`编辑${activeCategory.title}`" maxlength="200000" spellcheck="false" /><div class="editor-footer"><span>{{ editContent.length }} / 200000</span><div><el-button :disabled="saving" @click="editing = false">取消</el-button><el-button type="primary" :loading="saving" @click="saveEdit">保存修改</el-button></div></div></div>
          <div v-else class="category-content"><BidHomeStructuredResult :category="activeCategory" /><span v-if="activeCategory.edited" class="manual-tag">已人工修改</span></div>
          <details v-if="activeCategory.sources?.length && !editing" class="source-evidence"><summary>原文依据 · {{ activeCategory.sources.length }} 处</summary><blockquote v-for="(source, index) in activeCategory.sources" :key="index"><small v-if="source.pageNo">第 {{ source.pageNo }} 页 · </small>{{ source.text }}</blockquote></details>
        </div>
        <div v-else class="panel-empty result-empty">
          <template v-if="running || loading || starting"><div class="parse-orb"><el-icon class="rotating"><Loading /></el-icon></div><h2>正在解析招标文件</h2><p>正在识别文件中的项目概述、技术方案目录、评分标准等内容，<br>识别到的类别将陆续展示。</p></template>
          <template v-else-if="view.status === 'FAILED' || view.status === 'CANCELED'"><el-icon><Warning /></el-icon><h2>{{ view.status === 'FAILED' ? '本次解析未完成' : '解析已停止' }}</h2><p>{{ view.message || '原文件已保留，可以重新解析。' }}</p><el-button type="primary" :loading="starting" @click="retryParse">重新解析</el-button></template>
          <template v-else-if="view.status === 'NOT_STARTED' || view.status === 'LEGACY'"><el-icon><Reading /></el-icon><h2>原文件已准备好</h2><p>开始解析后，按实际识别结果展示类别。</p><el-button type="primary" :loading="starting" :disabled="!view.fileId" @click="beginParse">开始解析</el-button></template>
          <template v-else-if="loadError"><el-icon><Warning /></el-icon><h2>暂时无法加载解析结果</h2><el-button @click="reconnect">重新加载</el-button></template>
          <template v-else><el-icon><Document /></el-icon><h2>暂未识别到可展示的分类内容</h2><p>请对照左侧原文核对，也可以重新解析。</p><el-button @click="retryParse">重新解析</el-button></template>
        </div>
      </article>
      <article v-if="outlineMode" class="result-panel outline-panel" aria-label="技术方案目录">
        <div class="outline-toolbar">
          <div v-if="outlineChapters.length" class="outline-estimates">
            <span>预估字数 {{ outlineWords.toLocaleString('zh-CN') }}</span>
            <span>预估页数 {{ estimatePages(outlineWords) }}</span>
          </div>
          <div class="outline-controls">
            <el-button size="small" :loading="outlineBusy" :disabled="outlineSaving" @click="generateOutline">{{ outlineChapters.length ? '重新生成' : '生成目录' }}</el-button>
            <el-button v-if="outlineChapters.length" size="small" :disabled="outlineBusy || outlineSaving" @click="downloadOutline"><el-icon><Download /></el-icon> 下载目录</el-button>
            <el-button v-if="outlineRows.length" size="small" type="primary" :loading="outlineSaving" :disabled="outlineBusy || !outlineDirty" @click="saveOutline">保存目录</el-button>
          </div>
        </div>
        <div v-if="outlineBusy" class="outline-notice" role="status">正在生成目录，请稍候…</div>
        <div v-if="outlineError" class="outline-notice" role="alert">{{ outlineError }} <el-button text @click="refreshOutline().catch(() => {})">刷新</el-button></div>
        <div v-if="outlineChapters.length" class="result-body outline-editor">
          <section v-for="chapter in outlineChapters" :key="chapter.node.id" class="outline-chapter">
            <div class="outline-chapter-heading">
              <input v-model="outlineDraft[chapter.node.id]" :disabled="outlineBusy || outlineSaving" aria-label="章标题" maxlength="255" />
              <span v-if="chapter.words" class="outline-chapter-estimate"><el-icon><CircleCheck /></el-icon>约 {{ estimatePages(chapter.words) }} 页 / {{ chapter.words.toLocaleString('zh-CN') }} 字</span>
            </div>
            <div v-if="chapter.rows.length" class="outline-chapter-lines">
              <div v-for="row in chapter.rows" :key="row.id" class="outline-section-row">
                <input v-model="outlineDraft[row.id]" @blur="markEmptySection(row.id)"
                  :disabled="outlineBusy || outlineSaving" :aria-label="'第 ' + row.depth + ' 级目录标题'"
                  :style="{ paddingInlineStart: (row.depth - 2) * 16 + 4 + 'px' }" maxlength="255" />
                <el-button text type="danger" size="small" :disabled="outlineBusy || outlineSaving"
                  :aria-label="'删除小节：' + row.title" @mousedown.prevent @click="deleteOutlineNode(row)"><el-icon><Delete /></el-icon></el-button>
              </div>
            </div>
            <div class="outline-chapter-actions">
              <el-button plain type="danger" size="small" :disabled="outlineBusy || outlineSaving" @click="deleteOutlineNode(chapter.node)">
                <el-icon><Delete /></el-icon> 删除本章
              </el-button>
            </div>
          </section>
        </div>
        <div v-else-if="!outlineBusy && !outlineError" class="panel-empty">暂无目录</div>
      </article>
    </div>
    <footer class="workspace-footer">
      <span>{{ parserLabel }}</span>
      <el-button v-if="!outlineMode && view.status === 'SUCCESS'" class="outline-action" type="primary" :loading="outlineBusy"
        :disabled="editing || outlineSaving || starting" @click="generateOutline">生成目录</el-button>
      <el-button v-else-if="outlineMode && outlineChapters.length" class="outline-action" type="primary"
        :disabled="outlineBusy || outlineSaving" @click="writeBody">编写正文</el-button>
      <div>
        <el-button v-if="!outlineMode && view.status === 'SUCCESS' && categories.length" :loading="starting" @click="retryParse">重新解析</el-button>
        <el-button :disabled="outlineSaving" @click="outlineMode ? leaveOutline() : requestBack()">上一步</el-button>
      </div>
    </footer>
  </section>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from '@/plugins/element-plus-api'
import { ArrowLeft, CircleCheck, Delete, Document, Download, EditPen, Loading, Reading, Warning } from '@element-plus/icons-vue'
import { useRoute, useRouter } from 'vue-router'
import BidHomeStructuredResult from './BidHomeStructuredResult.vue'
import BidTenderOriginalPreview from './BidTenderOriginalPreview.vue'
import { getHomeTenderParse, startHomeTenderParse, saveHomeTenderCategory } from '@/api/homeTenderParse'
import { deleteBidProjectTechnicalOutlineNodes, downloadFileResource, generateBidProjectTechnicalOutline, getBidProjectTechnicalSolution, updateBidProjectTechnicalWritingConfig } from '@/api/bidProject'
import { createSerialPoller } from '@/utils/serialPoller'
import { homeParseRunning, visibleHomeCategories } from '@/utils/bidHomeParse'

const props = defineProps({ projectId: { type: String, required: true }, autoStart: { type: Boolean, default: false }, options: { type: Object, default: () => ({}) } })
const emit = defineEmits(['back'])
const router = useRouter()
const route = useRoute()
const view = reactive({ status: '', reviewState: '', projectName: '', fileId: '', fileName: '', taskId: '', revision: 0, progress: 0, categories: [] })
const outlineMode = ref(false)
const outline = ref(null)
const outlineDraft = reactive({})
const pendingOutlineDeletes = reactive(new Set())
const outlineBusy = ref(false)
const outlineSaving = ref(false)
const outlineError = ref('')
const WORDS_PER_PAGE = 650
let outlinePoller
function flattenOutline(nodes, depth = 1) {
  return (nodes || []).flatMap(node => [{ ...node, depth }, ...flattenOutline(node.children, depth + 1)])
}
const outlineRows = computed(() => flattenOutline(outline.value?.outlines))
function chapterWordCount(node) {
  const childWords = (node.children || []).reduce((total, child) => total + chapterWordCount(child), 0)
  return childWords || Math.max(0, Number(node.targetWordCount) || 0)
}
function withoutOutlineNodes(nodes, ids) {
  return (nodes || []).filter(node => !ids.has(node.id))
    .map(node => ({ ...node, children: withoutOutlineNodes(node.children, ids) }))
}
const visibleOutline = computed(() => withoutOutlineNodes(outline.value?.outlines, pendingOutlineDeletes))
const outlineChapters = computed(() => visibleOutline.value.map(node => ({
  node,
  rows: flattenOutline(node.children, 2),
  words: chapterWordCount(node)
})))
const outlineWords = computed(() => outlineChapters.value.reduce((total, chapter) => total + chapter.words, 0))

function estimatePages(words) {
  return Math.ceil(words / WORDS_PER_PAGE)
}

function downloadOutline() {
  const lines = flattenOutline(visibleOutline.value).flatMap(row => {
    const title = outlineDraft[row.id]?.trim() || row.title?.trim()
    return title ? ['　'.repeat(row.depth - 1) + title] : []
  })
  const blob = new Blob(['\ufeff', lines.join('\r\n')], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = (view.projectName || '招标项目') + '-技术方案目录.txt'
  link.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

const outlineDirty = computed(() => pendingOutlineDeletes.size > 0 || outlineRows.value.some(row => outlineDraft[row.id] !== row.title))

function applyOutline(data) {
  outline.value = data
  pendingOutlineDeletes.clear()
  for (const key of Object.keys(outlineDraft)) delete outlineDraft[key]
  for (const row of outlineRows.value) outlineDraft[row.id] = row.title
  outlineBusy.value = false
  outlineError.value = /^目录生成失败/.test(data?.remark || '') ? data.remark
    : outlineRows.value.length ? '' : '目录生成未完成，请重新生成。'
}

function pollOutline() {
  outlinePoller?.stop()
  outlinePoller = createSerialPoller(async () => await refreshOutline() ? undefined : false, { interval: 3000, maxBackoff: 15000 })
  outlinePoller.start({ immediate: true })
}

function openBodyWorkbench() {
  return router.replace({ path: '/ai-bid/workbench', query: { projectId: props.projectId, doc: 'TECHNICAL_SOLUTION' } })
}

async function writeBody() {
  if (outlineBusy.value || outlineSaving.value || !outlineChapters.value.length) return
  if (outlineDirty.value && !(await saveOutline())) return
  if (!disposed && outlineChapters.value.length) await openBodyWorkbench()
}

async function resumeProjectStage() {
  const data = await getBidProjectTechnicalSolution(props.projectId)
  if (disposed || !data) return
  if (data.status === 'OUTLINE_GENERATING') {
    if (data.outlines?.length) applyOutline(data)
    outlineMode.value = true
    outlineBusy.value = true
    pollOutline()
  } else if (route.query.view !== 'outline' && data.outlines?.length && (data.runningTask || ['CONTENT_GENERATING', 'CONTENT_READY', 'CONTENT_PARTIAL'].includes(data.status))) {
    await openBodyWorkbench()
  } else if (data.outlines?.length) {
    applyOutline(data)
    outlineMode.value = true
  }
}

async function refreshOutline() {
  try {
    const data = await getBidProjectTechnicalSolution(props.projectId)
    if (disposed) return false
    if (data?.status === 'OUTLINE_GENERATING') return true
    applyOutline(data)
    return false
  } catch (error) {
    if (!disposed) outlineError.value = '目录状态暂时无法获取，正在重试。'
    throw error
  }
}

async function generateOutline() {
  if (outlineBusy.value || outlineSaving.value) return
  outlineBusy.value = true
  try {
    const current = await getBidProjectTechnicalSolution(props.projectId)
    if (disposed) return
    const regenerate = !!current?.outlines?.length && outlineMode.value
    if (regenerate) {
      try {
        await ElMessageBox.confirm('新目录生成成功后将替换现有目录和已生成正文。', '重新生成目录')
      } catch (_) { outlineBusy.value = false; return }
    }
    outlineMode.value = true
    outlineError.value = ''
    if (current?.status !== 'OUTLINE_GENERATING') {
      if (current?.outlines?.length && !regenerate) {
        await refreshOutline()
        return
      }
      await generateBidProjectTechnicalOutline(props.projectId, {
        aiLevel: current?.aiLevel || 'STANDARD',
        solutionType: props.options.projectType,
        targetTotalWordCount: Math.min(400000, (Number(props.options.pageCount) || 200) * WORDS_PER_PAGE),
        regenerate
      })
    }
    if (disposed) return
    pollOutline()
  } catch (_) {
    if (!disposed) {
      outlineBusy.value = false
      outlineError.value = '启动目录生成失败，请重试。'
    }
  }
}

function markEmptySection(id) {
  if (!outlineBusy.value && !outlineSaving.value && !outlineDraft[id]?.trim()) {
    pendingOutlineDeletes.add(id)
  }
}

async function removeOutlineNodes(ids) {
  await deleteBidProjectTechnicalOutlineNodes(props.projectId, [...ids])
  outline.value.outlines = withoutOutlineNodes(outline.value.outlines, ids)
  const remainingIds = new Set(outlineRows.value.map(row => row.id))
  for (const id of Object.keys(outlineDraft)) {
    if (remainingIds.has(id)) continue
    delete outlineDraft[id]
    pendingOutlineDeletes.delete(id)
  }
  outlineError.value = ''
}

async function deleteOutlineNode(node) {
  if (outlineSaving.value || outlineBusy.value) return
  const isChapter = !node.depth
  const label = isChapter ? '本章' : '小节'
  outlineSaving.value = true
  try {
    try {
      await ElMessageBox.confirm(
        `确定删除「${outlineDraft[node.id]?.trim() || node.title}」？其下级目录及已生成正文也会删除，无法恢复。`,
        `删除${label}`,
        { confirmButtonText: '删除', cancelButtonText: '取消', type: 'warning' }
      )
    } catch (_) { return }
    await removeOutlineNodes(new Set([node.id]))
    ElMessage.success(`${label}已删除`)
  } catch (_) {
    ElMessage.warning('目录删除失败，请重试')
  } finally {
    outlineSaving.value = false
  }
}

async function saveOutline() {
  if (outlineSaving.value || outlineBusy.value) return
  if (visibleOutline.value.some(node => !outlineDraft[node.id]?.trim())) return ElMessage.warning('章标题不能为空')
  const deleted = new Set()
  for (const chapter of outlineChapters.value) {
    for (const row of chapter.rows) {
      if (!outlineDraft[row.id]?.trim()) pendingOutlineDeletes.add(row.id)
    }
  }
  // 只提交待删除子树的根节点，下级由现有接口一并删除。
  function collectDeletedRoots(nodes) {
    for (const node of nodes || []) {
      if (pendingOutlineDeletes.has(node.id)) deleted.add(node.id)
      else collectDeletedRoots(node.children)
    }
  }
  collectDeletedRoots(outline.value?.outlines)
  outlineSaving.value = true
  try {
    if (deleted.size) {
      try {
        await ElMessageBox.confirm(
          '保存时将删除已清空的小节及其下级目录和已生成正文，无法恢复。',
          '保存并删除小节',
          { confirmButtonText: '保存并删除', cancelButtonText: '取消', type: 'warning' }
        )
      } catch (_) {
        pendingOutlineDeletes.clear()
        for (const row of outlineRows.value) {
          if (row.depth > 1 && !outlineDraft[row.id]?.trim()) outlineDraft[row.id] = row.title
        }
        return
      }
      await removeOutlineNodes(deleted)
    }
    const changed = outlineRows.value.filter(row => outlineDraft[row.id] !== row.title)
    for (const row of changed) {
      const title = outlineDraft[row.id].trim()
      await updateBidProjectTechnicalWritingConfig(props.projectId, row.id, { ...row, title })
      const saved = findOutlineNode(outline.value.outlines, row.id)
      if (saved) saved.title = title
      outlineDraft[row.id] = title
    }
    ElMessage.success('目录已保存')
    return true
  } catch (_) {
    ElMessage.warning('部分目录改动可能尚未保存，请重试保存目录')
  } finally {
    outlineSaving.value = false
  }
}

function findOutlineNode(nodes, id) {
  for (const node of nodes || []) {
    if (node.id === id) return node
    const child = findOutlineNode(node.children, id)
    if (child) return child
  }
  return null
}

async function leaveOutline() {
  if (outlineSaving.value) return
  if (outlineDirty.value) {
    try { await ElMessageBox.confirm('目录有未保存的修改，确定返回吗？', '返回解析页') } catch (_) { return }
  }
  pendingOutlineDeletes.clear()
  for (const row of outlineRows.value) outlineDraft[row.id] = row.title
  outlineMode.value = false
}
const loading = ref(true)
const loadError = ref(false)
const starting = ref(false)
const saving = ref(false)
const downloading = ref(false)
const activeId = ref('')
const editing = ref(false)
const editContent = ref('')
const parserLabel = computed(() => ({
  ark_deepseek_file: '文档读取：DeepSeek V4.1 Flash',
  aliyun_docmind: '文档读取：阿里云 DocMind',
  local: '文档读取：本地解析'
}[view.parser] || '原文件始终保留。'))
const categories = computed(() => visibleHomeCategories(view))
const activeCategory = computed(() => categories.value.find(item => item.id === activeId.value) || categories.value[0])
const running = computed(() => homeParseRunning(view))
const phaseLabel = computed(() => starting.value ? '正在提交解析' : running.value ? '解析中' : outlineMode.value && outlineBusy.value ? '目录生成中' : outlineMode.value && outlineRows.value.length ? '目录已生成' : view.reviewState === 'PARTIAL' ? '需核对识别结果' : view.status === 'SUCCESS' ? '解析完成' : view.status === 'FAILED' ? '解析失败' : '招标文件解析')
let disposed = false
let poller
let requestSequence = 0
let editTaskId = ''
let editRevision = 0
function focusMenu(active) { window.dispatchEvent(new CustomEvent('ai-bid-focus-mode', { detail: { active } })) }
function apply(data) {
  Object.assign(view, data || {})
  if (!categories.value.some(item => item.id === activeId.value)) activeId.value = categories.value[0]?.id || ''
}
async function refresh() {
  const sequence = ++requestSequence
  try {
    const data = await getHomeTenderParse(props.projectId)
    if (disposed || sequence !== requestSequence) return
    apply(data)
    loadError.value = false
    return data
  } catch (_) { if (!disposed && sequence === requestSequence) loadError.value = true; throw _ }
  finally { if (!disposed && sequence === requestSequence) loading.value = false }
}
function reconnect() { refresh().then(() => { if (running.value) startPolling() }).catch(() => {}) }
function startPolling() {
  poller?.stop()
  poller = createSerialPoller(async () => {
    await refresh()
    return !running.value ? false : undefined
  }, { interval: 3000, maxBackoff: 20000, pauseWhenHidden: true, onError: () => {} })
  poller.start({ immediate: false })
}
async function beginParse(force = false) {
  if (starting.value || running.value) return
  starting.value = true
  try {
    const data = await startHomeTenderParse(props.projectId, { force: force === true, projectType: props.options.projectType, knowledgeIds: props.options.knowledgeIds })
    if (disposed) return
    apply(data)
    loadError.value = false
    startPolling()
    const query = { ...router.currentRoute.value.query }
    delete query.autoStart
    await router.replace({ path: '/dashboard', query })
  } catch (_) {
    if (!disposed) {
      try { await refresh(); if (running.value) startPolling() } catch (_) { /* 请求失败时保留原文件和已有结果。 */ }
    }
  } finally { if (!disposed) starting.value = false }
}
async function retryParse() {
  if (categories.value.some(item => item.edited)) {
    try { await ElMessageBox.confirm('重新解析会替换当前识别结果和已保存的人工修改，是否继续？', '重新解析', { type: 'warning', confirmButtonText: '继续解析', cancelButtonText: '保留当前结果' }) } catch (_) { return }
  }
  editing.value = false
  await beginParse(true)
}
async function requestBack() {
  if (outlineMode.value) return leaveOutline()
  if (editing.value && editContent.value !== activeCategory.value?.content) {
    try { await ElMessageBox.confirm('当前修改尚未保存，是否放弃修改并返回首页？', '返回首页', { type: 'warning' }) } catch (_) { return }
  }
  emit('back')
}
function beforeUnload(event) {
  if (!outlineDirty.value && (!editing.value || editContent.value === activeCategory.value?.content)) return
  event.preventDefault()
  event.returnValue = ''
}
function beginEdit() { editContent.value = activeCategory.value.content; editTaskId = view.taskId; editRevision = view.revision; editing.value = true }
async function switchCategory(id) {
  if (editing.value && editContent.value !== activeCategory.value.content) {
    try { await ElMessageBox.confirm('当前修改尚未保存，是否放弃修改并切换类别？', '切换类别', { type: 'warning' }) } catch (_) { return }
  }
  editing.value = false
  activeId.value = id
}
function stepTab(direction) { const index = categories.value.findIndex(item => item.id === activeId.value); const next = categories.value[(index + direction + categories.value.length) % categories.value.length]; if (next) switchCategory(next.id) }
async function saveEdit() {
  if (!editContent.value.trim()) return ElMessage.warning('解析内容不能为空')
  saving.value = true
  try {
    const data = await saveHomeTenderCategory(props.projectId, activeCategory.value.id, { taskId: editTaskId, revision: editRevision, content: editContent.value })
    if (disposed) return
    apply(data)
    editing.value = false
    ElMessage.success('解析内容已保存')
  } catch (_) { /* 保存失败时保留编辑内容，全局请求层显示原因。 */ }
  finally { if (!disposed) saving.value = false }
}
async function downloadOriginal() {
  if (downloading.value) return
  downloading.value = true
  try { const blob = await downloadFileResource(view.fileId); const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = view.fileName || '招标文件.docx'; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000) }
  catch (_) { /* 全局请求层显示下载错误。 */ }
  finally { downloading.value = false }
}
onMounted(async () => {
  focusMenu(true)
  window.addEventListener('beforeunload', beforeUnload)
  try {
    await refresh()
    if (disposed) return
    if (props.autoStart && view.status === 'NOT_STARTED') await beginParse()
    else {
      if (running.value) startPolling()
      await resumeProjectStage()
    }
  } catch (_) { /* 请求提示由全局处理；保留当前原文件和已识别内容。 */ }
})
onBeforeUnmount(() => { outlinePoller?.stop(); disposed = true; requestSequence += 1; poller?.stop(); window.removeEventListener('beforeunload', beforeUnload); focusMenu(false) })
</script>

<style scoped>
.home-parse-workspace{display:flex;flex:1;flex-direction:column;height:100%;min-height:0;min-width:0;color:#242a3a}.workspace-heading{display:flex;align-items:center;justify-content:space-between;gap:18px;min-height:48px;padding:0 0 16px}.workspace-heading>div{display:flex;align-items:center;gap:20px;min-width:0}.workspace-heading h1{margin:0;font-size:16px;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:650px}.back-link{display:flex;align-items:center;gap:6px;flex-shrink:0;padding:0;border:0;background:none;color:#807294;font:inherit;font-size:12px;cursor:pointer}.overall-state{display:flex;align-items:center;gap:6px;white-space:nowrap;font-size:12px;color:#8b6bff}.overall-state.failed{color:#df7c84}.parse-panels{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:20px;flex:1;min-height:0}.original-panel,.result-panel{display:flex;flex-direction:column;min-height:0;min-width:0;overflow:hidden;background:#fff;border:1px solid #f0ecf8;border-radius:9px;box-shadow:0 7px 28px #71618f07}.panel-heading{display:flex;justify-content:space-between;align-items:center;gap:8px;min-height:66px;padding:0 23px;border-bottom:1px solid #f2f1f7}.panel-heading>div{display:flex;align-items:center;gap:8px;min-width:0}.panel-heading>div>.el-icon{color:#8974c4}.panel-heading strong{font-size:15px;font-weight:500;white-space:nowrap}.panel-heading>div>span{margin-left:6px;font-size:11px;color:#a19aaa;white-space:nowrap;text-overflow:ellipsis;overflow:hidden;max-width:240px}.panel-heading .el-button{flex-shrink:0;color:#998aa9}.panel-heading .el-button .el-icon{margin-right:4px}.result-tabs{display:flex;gap:26px;min-height:66px;padding:0 26px;border-bottom:1px solid #f2f1f7;overflow-x:auto;flex-shrink:0;scrollbar-width:thin}.result-tabs>button{position:relative;flex-shrink:0;padding:0 0 2px;border:0;background:none;color:#62677b;font:inherit;font-size:14px;cursor:pointer}.result-tabs>button.active{color:#8060ff;font-weight:600}.result-tabs>button.active:after{position:absolute;content:"";left:0;right:0;bottom:0;height:2px;background:#8060ff}.empty-tabs{display:flex;align-items:center;gap:7px;min-height:66px;padding:0 26px;border-bottom:1px solid #f2f1f7;font-size:15px;color:#6e6482}.parsing-progress{padding:13px 26px 8px;flex-shrink:0}.parsing-progress>div:first-child{display:flex;justify-content:space-between;font-size:11px;color:#a191b1;gap:14px}.progress-track{height:3px;border-radius:3px;background:#f1ecfb;margin-top:9px;overflow:hidden}.progress-track>i{display:block;height:100%;background:linear-gradient(90deg,#ac88ff,#7f60fa);transition:width .3s}.result-body{flex:1;min-height:0;padding:25px 26px 28px;overflow:auto;overscroll-behavior:contain}.category-heading{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:15px}.category-heading h2{margin:0;color:#8160ff;font-size:15px;line-height:1.8;font-weight:600}.category-heading p{margin:3px 0 0;font-size:11px;line-height:1.8;color:#a09cae}.category-heading .el-button{flex-shrink:0;margin-top:2px}.category-heading .el-icon{margin-right:4px}.category-content{min-height:calc(100% - 65px);padding:18px 19px;border:1px solid #e1deec;border-radius:6px;font-size:13px;line-height:1.95;overflow-wrap:anywhere}.category-content :deep(.markdown-content){font-size:13px;line-height:1.95}.category-content :deep(h1),.category-content :deep(h2),.category-content :deep(h3){font-size:14px}.manual-tag{display:inline-block;margin-top:16px;padding:2px 7px;color:#9c86b1;background:#f6f1fa;font-size:10px;border-radius:4px}.source-evidence{margin-top:18px;border:1px solid #f0edf5;border-radius:5px;padding:10px 12px;color:#9c93a7;font-size:11px}.source-evidence summary{cursor:pointer}.source-evidence blockquote{margin:14px 0 0;padding:0 0 0 12px;border-left:2px solid #dcd2f5;white-space:pre-wrap;line-height:1.9;color:#8a8396;overflow-wrap:anywhere}.category-editor textarea{width:100%;min-height:360px;height:48vh;resize:vertical;box-sizing:border-box;padding:17px;border:1px solid #c8b9f5;border-radius:6px;outline:none;font:13px/1.9 "Microsoft YaHei",sans-serif;color:#454353}.editor-footer{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-top:12px}.editor-footer>span{color:#a89cb6;font-size:10px}.panel-empty{display:flex;flex:1;min-height:150px;align-items:center;justify-content:center;flex-direction:column;gap:12px;padding:26px;color:#a79eb4;text-align:center;font-size:13px}.panel-empty>.el-icon{font-size:30px;color:#b1a2d3}.result-empty h2{margin:4px 0 0;font-size:16px;color:#787086;font-weight:500}.result-empty p{margin:0;line-height:1.9;font-size:12px}.parse-orb{display:grid;place-items:center;width:68px;height:68px;border-radius:23px;background:linear-gradient(140deg,#f1eafe,#f8f5ff);font-size:30px;color:#a587ef}.workspace-footer{display:flex;align-items:center;justify-content:flex-end;gap:20px;min-height:62px;flex-shrink:0}.workspace-footer>span{margin-right:auto;color:#aaa0b4;font-size:11px}.workspace-footer>.el-button{border-color:#b79afa;color:#956af0;background:#fff9;min-width:90px}.connection-warning,.partial-warning{display:flex;align-items:center;gap:12px;margin-bottom:12px;padding:9px 12px;border-radius:5px;background:#fff5e7;color:#b48b4d;font-size:12px;line-height:1.8}.connection-warning>button,.partial-warning>button{border:0;background:none;color:#9c73c9;cursor:pointer;white-space:nowrap}.rotating{animation:rotate 1s linear infinite}@keyframes rotate{to{transform:rotate(360deg)}}
@media(max-width:1150px){.panel-heading{padding:0 15px}.panel-heading>div>span{display:none}.result-tabs{gap:20px;padding:0 18px}.result-body{padding:20px 18px}.parsing-progress{padding-left:18px;padding-right:18px}.workspace-heading h1{max-width:380px}.category-content{padding:15px}}
@media(max-width:760px){.workspace-heading{align-items:flex-start}.workspace-heading>div{align-items:flex-start;flex-direction:column;gap:8px}.workspace-heading h1{font-size:13px;max-width:240px}.overall-state{font-size:10px}.parse-panels{display:flex;flex-direction:column;overflow:auto;gap:14px}.original-panel{height:52vh;min-height:320px;flex-shrink:0}.result-panel{min-height:460px;flex-shrink:0}.result-body{overflow:visible}.panel-heading,.result-tabs,.empty-tabs{min-height:53px}.result-tabs{gap:19px}.result-tabs>button{font-size:12px}.category-content{min-height:270px}.workspace-footer>span{max-width:170px;font-size:10px}.category-editor textarea{height:330px}.workspace-footer{min-height:60px}.connection-warning,.partial-warning{font-size:11px;align-items:flex-start}.category-heading p{font-size:10px}.category-heading h2{font-size:14px}}
.workspace-footer{display:grid;grid-template-columns:minmax(0,1fr) auto minmax(0,1fr)}
.workspace-footer>div{grid-column:3;justify-self:end}
.workspace-footer>.outline-action{grid-column:2;color:white;background:#6955ef;border-color:#6955ef;margin:0}
.outline-toolbar{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:8px 14px;padding:14px 22px;background:#f6f4ff}
.outline-estimates,.outline-controls{display:flex;flex-wrap:wrap;align-items:center;gap:8px}
.outline-estimates{color:#55536b;font-size:12px}
.outline-estimates span+span{padding-inline-start:8px;border-inline-start:1px solid #ddd7f2}
.outline-controls .el-button{margin:0}
.outline-controls .el-icon{margin-right:4px}
.outline-editor{display:grid;align-content:start;gap:16px;padding:4px 22px 20px;background:#f6f4ff}
.outline-chapter{min-width:0;padding:14px 17px;border:1px solid #dcd8eb;border-radius:7px;background:#fff;box-shadow:0 3px 10px #3b29680a}
.outline-chapter:focus-within{border-color:#6955ef;box-shadow:0 0 0 1px #6955ef}
.outline-chapter-heading{display:flex;align-items:center;flex-wrap:wrap;gap:4px 12px;margin-bottom:8px}
.outline-chapter-estimate{display:flex;align-items:center;gap:5px;color:#615c76;white-space:nowrap;font-size:11px}
.outline-chapter-estimate .el-icon{color:#6955ef}
.outline-chapter-lines{max-height:320px;overflow:auto;scrollbar-width:thin}
.outline-section-row{display:flex;align-items:center;gap:4px}
.outline-section-row .el-button{flex:none;opacity:0}
.outline-section-row:hover .el-button,.outline-section-row:focus-within .el-button{opacity:1}
@media(hover:none){.outline-section-row .el-button{opacity:1}}
.outline-chapter-actions{display:flex;margin-top:10px}
.outline-chapter-actions .el-icon{margin-right:4px}
.outline-chapter input{display:block;box-sizing:border-box;width:100%;min-width:0;border:1px solid transparent;border-radius:4px;padding:3px 4px;background:transparent;font:inherit;font-size:13px;line-height:1.4;color:inherit}
.outline-chapter input:not(:disabled):hover{background:#f8f6ff}
.outline-chapter input:focus{border-color:#a491f7;outline:none;background:#f8f6ff}
.outline-chapter-heading input{flex:1 1 140px;font-size:14px;font-weight:600}
.outline-notice{padding:16px 24px;color:#6e6482}
@media(max-width:760px){.outline-panel{min-height:360px}.outline-editor,.outline-toolbar{padding-inline:12px}.workspace-footer{gap:8px}}
</style>
