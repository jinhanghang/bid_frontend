<template>
  <div class="ai-doc-page">
    <aside class="doc-sidebar">
      <div class="side-head">
        <div>
          <h3>AI文档生成</h3>
          <p>可研 / 合同 / 环评 / 交评</p>
        </div>
        <el-button type="primary" size="small" :icon="Plus" @click="resetWorkspace">新建</el-button>
      </div>

      <el-input
        v-model="query.keyword"
        class="side-search"
        clearable
        placeholder="搜索文档"
        :prefix-icon="Search"
        @input="onSearchInput"
        @clear="loadDocuments"
      />

      <el-scrollbar class="doc-list-scroll">
        <div v-if="documents.length" class="doc-list">
          <div
            v-for="item in documents"
            :key="item.id"
            class="doc-item"
            :class="{ active: currentDoc?.id === item.id }"
            @click="loadDetail(item.id)"
          >
            <div class="doc-item-title">
              <el-icon><Document /></el-icon>
              <span>{{ item.solutionName }}</span>
            </div>
            <div class="doc-item-meta">
              <el-tag size="small" type="primary">{{ docTypeLabel(item.solutionType) }}</el-tag>
              <el-tag size="small" :type="statusTagType(item.status)">{{ statusLabel(item.status) }}</el-tag>
            </div>
            <div class="doc-item-bottom">
              <span>{{ formatDateTime(item.updateTime || item.createTime) }}</span>
              <el-button link type="danger" @click.stop="onDelete(item)">删除</el-button>
            </div>
          </div>
        </div>
        <el-empty v-else description="暂无AI文档" :image-size="100" />
      </el-scrollbar>
    </aside>

    <main class="doc-main">
      <template v-if="!currentDoc">
        <section class="type-grid">
          <div
            v-for="type in documentTypes"
            :key="type.type"
            class="type-card"
            @click="createNew(type)"
          >
            <div class="type-icon"><el-icon><MagicStick /></el-icon></div>
            <h3>{{ type.title }}</h3>
            <p>{{ type.description }}</p>
            <el-button type="primary" link>开始生成</el-button>
          </div>
        </section>
      </template>

      <template v-else>
        <section class="work-header">
          <div>
            <div class="breadcrumb-line">
              <el-button link :icon="ArrowLeft" @click="currentDoc = null">返回类型选择</el-button>
              <span>/</span>
              <span>{{ docTypeLabel(currentDoc.solutionType) }}</span>
            </div>
            <h2>{{ currentDoc.solutionName }}</h2>
            <div class="summary-tags">
              <el-tag type="primary">{{ docTypeLabel(currentDoc.solutionType) }}</el-tag>
              <el-tag :type="statusTagType(currentDoc.status)">{{ statusLabel(currentDoc.status) }}</el-tag>
              <el-tag type="success">目标 {{ currentDoc.targetWordCount || 0 }} 字</el-tag>
              <el-tag type="warning">已生成 {{ currentDoc.actualWordCount || 0 }} 字</el-tag>
            </div>
          </div>
          <div class="header-actions">
            <el-button :icon="Refresh" :loading="detailLoading" @click="refreshCurrent">刷新</el-button>
            <el-button type="success" :loading="exportLoading" :disabled="!canExport" @click="onExport">导出</el-button>
          </div>
        </section>

        <section class="flow-card">
          <el-steps :active="activeStep" finish-status="success" align-center>
            <el-step title="填写信息" />
            <el-step title="生成目录" />
            <el-step title="设置篇幅" />
            <el-step title="生成正文" />
            <el-step title="导出下载" />
          </el-steps>
        </section>

        <section class="workspace-grid">
          <div class="left-panel">
            <div class="panel-title">
              <span>基础信息</span>
              <el-tag size="small" type="info">{{ currentType?.shortTitle }}</el-tag>
            </div>
            <el-form label-position="top" class="doc-form">
              <el-form-item label="文档标题" required>
                <el-input v-model="form.documentTitle" placeholder="请输入文档标题" />
              </el-form-item>
              <el-form-item label="项目名称">
                <el-input v-model="form.projectName" placeholder="请输入项目名称" />
              </el-form-item>

              <template v-for="field in currentFields" :key="field.prop">
                <el-form-item :label="field.label" :required="field.required">
                  <el-input
                    v-if="field.type === 'textarea'"
                    v-model="formData[field.prop]"
                    type="textarea"
                    :rows="4"
                    maxlength="5000"
                    show-word-limit
                    :placeholder="field.placeholder"
                  />
                  <el-input v-else v-model="formData[field.prop]" :placeholder="field.placeholder" />
                </el-form-item>
              </template>

              <el-form-item label="生成要求">
                <el-input
                  v-model="form.mainRequirement"
                  type="textarea"
                  :rows="4"
                  maxlength="20000"
                  show-word-limit
                  placeholder="补充你希望AI重点生成的内容、边界、口径和注意事项"
                />
              </el-form-item>

              <el-form-item label="目录要求">
                <el-input
                  v-model="form.outlineRequirement"
                  type="textarea"
                  :rows="3"
                  maxlength="10000"
                  show-word-limit
                  placeholder="例如：目录必须包含项目概况、风险分析、结论建议等"
                />
              </el-form-item>

              <el-form-item label="整体编写方向">
                <el-input
                  v-model="form.overallWritingRequirement"
                  type="textarea"
                  :rows="3"
                  maxlength="10000"
                  show-word-limit
                  placeholder="例如：语言正式、突出可落地、避免绝对化结论"
                />
              </el-form-item>

              <div class="form-row-two">
                <el-form-item label="AI等级">
                  <el-select v-model="form.aiLevel" class="full-select">
                    <el-option label="基础版" value="BASIC" />
                    <el-option label="标准版" value="STANDARD" />
                    <el-option label="旗舰版" value="FLAGSHIP" />
                  </el-select>
                </el-form-item>
                <el-form-item label="写作风格">
                  <el-select v-model="form.writingStyle" class="full-select">
                    <el-option label="专业正式" value="PROFESSIONAL" />
                    <el-option label="通用规范" value="GENERAL" />
                    <el-option label="简洁清晰" value="CONCISE" />
                  </el-select>
                </el-form-item>
              </div>
            </el-form>

            <div class="panel-actions">
              <el-button :loading="saving" @click="saveFormOnly">保存草稿</el-button>
              <el-button type="primary" :loading="outlineLoading" :disabled="hasOutline" @click="onGenerateOutline">生成大纲</el-button>
            </div>
          </div>

          <div class="right-panel">
            <div class="panel-title">
              <span>资料与生成配置</span>
            </div>
            <el-upload
              drag
              :auto-upload="false"
              :show-file-list="false"
              accept=".doc,.docx,.pdf,.txt,.md"
              :on-change="onReferenceChange"
              class="reference-upload"
            >
              <template v-if="parseTask">
                <el-icon class="upload-icon"><Document /></el-icon>
                <div class="upload-title">{{ parseTask.fileName }}</div>
                <div class="upload-status">{{ parseTask.message || statusLabel(parseTask.status) }} {{ parseTask.progress || 0 }}%</div>
              </template>
              <template v-else>
                <el-icon class="upload-icon"><UploadFilled /></el-icon>
                <div class="upload-title">上传参考资料</div>
                <p>支持 Word / PDF / TXT / Markdown，上传后自动解析并作为生成参考</p>
              </template>
            </el-upload>

            <el-input
              v-model="form.referenceRequirement"
              class="reference-note"
              type="textarea"
              :rows="4"
              maxlength="10000"
              show-word-limit
              placeholder="资料使用说明：例如以模板为格式参考、以项目资料为事实依据等"
            />

            <div class="setting-box">
              <div class="setting-title">章节字数</div>
              <el-radio-group v-model="wordPreset.mode">
                <el-radio-button label="FIXED">统一字数</el-radio-button>
                <el-radio-button label="AUTO">自动分配</el-radio-button>
              </el-radio-group>
              <el-select v-model="wordPreset.wordCount" class="word-select">
                <el-option v-for="n in wordOptions" :key="n" :label="`${n} 字/节`" :value="n" />
              </el-select>
              <el-button :disabled="!hasOutline" :loading="wordSaving" @click="onApplyWordPreset">应用篇幅</el-button>
            </div>

            <div class="generate-box">
              <div>
                <strong>正文生成</strong>
                <p>建议先确认目录和字数，再开始全文生成。生成中可离开页面，回来后系统会恢复进度。</p>
              </div>
              <div class="generate-actions">
                <el-button type="primary" :loading="fullGenerating" :disabled="!hasOutline || hasRunningTask" @click="onGenerateFull(false)">生成全文</el-button>
                <el-button :loading="fullGenerating" :disabled="!hasOutline || hasRunningTask" @click="onGenerateFull(true)">重编全文</el-button>
              </div>
              <el-progress v-if="runningTask" :percentage="runningTask.progress || 0" :status="progressStatus" />
              <small v-if="runningTask">{{ runningTask.message }}</small>
            </div>

            <el-alert
              class="risk-alert"
              type="warning"
              show-icon
              :closable="false"
              title="AI生成内容仅作为草稿参考，正式使用前请由专业人员复核。"
            />
          </div>
        </section>

        <section class="result-grid">
          <div class="outline-panel">
            <div class="panel-title">
              <span>文档大纲</span>
              <el-tag size="small">{{ leafNodes.length }} 节</el-tag>
            </div>
            <el-scrollbar class="outline-scroll">
              <el-empty v-if="!outlineTree.length" description="暂无大纲，请先生成大纲" />
              <OutlineNodeList v-else :nodes="outlineTree" :active-id="activeNode?.id" @select="selectNode" />
            </el-scrollbar>
          </div>

          <div class="section-panel">
            <template v-if="activeNode">
              <div class="section-head">
                <div>
                  <h3>{{ activeNode.title }}</h3>
                  <p>{{ activeNode.writingDirection || '暂无编写方向' }}</p>
                </div>
                <div class="section-actions">
                  <el-button :loading="sectionGenerating" @click="onRegenerateSection">重写本章</el-button>
                  <el-button type="primary" :loading="sectionSaving" @click="onSaveSection">保存正文</el-button>
                </div>
              </div>
              <el-input
                v-model="sectionDraft"
                class="section-editor"
                type="textarea"
                resize="none"
                placeholder="章节正文生成后会显示在这里，也可以手工编辑后保存"
              />
            </template>
            <el-empty v-else description="请选择一个末级章节查看正文" />
          </div>
        </section>
      </template>
    </main>
  </div>
</template>

<script setup>
import { computed, defineComponent, h, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElButton, ElIcon, ElMessage, ElMessageBox, ElTag } from 'element-plus'
import { ArrowLeft, Document, MagicStick, Plus, Refresh, Search, UploadFilled } from '@element-plus/icons-vue'
import {
  applyDocumentWordCountPreset,
  createDocument,
  deleteDocument,
  exportDocumentPdf,
  exportDocumentWord,
  generateDocumentFull,
  generateDocumentOutline,
  getDocument,
  getDocumentGenerationTask,
  getDocumentParseTask,
  listDocumentTypes,
  pageDocuments,
  rewriteDocumentFull,
  saveDocumentForm,
  uploadDocumentReference
} from '@/api/aiDocument'
import { downloadFileResource, streamSection, updateSectionContent } from '@/api/aiSolution'
import { formatDateTime } from '@/utils/format'

const router = useRouter()

const documentTypes = ref([])
const documents = ref([])
const currentDoc = ref(null)
const detailLoading = ref(false)
const saving = ref(false)
const outlineLoading = ref(false)
const wordSaving = ref(false)
const fullGenerating = ref(false)
const exportLoading = ref(false)
const sectionGenerating = ref(false)
const sectionSaving = ref(false)
const parseTask = ref(null)
const runningTask = ref(null)
const activeNode = ref(null)
const sectionDraft = ref('')

const query = reactive({ pageNum: 1, pageSize: 20, keyword: '' })
const form = reactive({
  documentType: 'FEASIBILITY',
  documentTitle: '',
  projectName: '',
  aiLevel: 'STANDARD',
  writingStyle: 'PROFESSIONAL',
  mainRequirement: '',
  referenceRequirement: '',
  outlineRequirement: '',
  overallWritingRequirement: ''
})
const formData = reactive({})
const wordPreset = reactive({ mode: 'FIXED', wordCount: 900 })
const wordOptions = [300, 600, 900, 1200, 1800, 2400, 3000]

let searchTimer = null
let parseTimer = null
let taskTimer = null

const currentType = computed(() => documentTypes.value.find((item) => item.type === form.documentType) || documentTypes.value[0])
const currentFields = computed(() => currentType.value?.fields || [])
const outlineTree = computed(() => currentDoc.value?.outlines || [])
const leafNodes = computed(() => flattenLeaves(outlineTree.value))
const hasOutline = computed(() => outlineTree.value.length > 0)
const hasRunningTask = computed(() => ['WAITING', 'RUNNING'].includes(String(runningTask.value?.status || '').toUpperCase()))
const canExport = computed(() => currentDoc.value?.canExport === true || (leafNodes.value.length > 0 && leafNodes.value.every((node) => node?.section?.content)))
const progressStatus = computed(() => {
  const status = String(runningTask.value?.status || '').toUpperCase()
  if (status === 'SUCCESS') return 'success'
  if (status === 'FAILED' || status === 'PARTIAL') return 'exception'
  return undefined
})
const activeStep = computed(() => {
  const status = String(currentDoc.value?.status || '').toUpperCase()
  if (canExport.value) return 4
  if (['CONTENT_GENERATING', 'CONTENT_PARTIAL', 'CONTENT_READY', 'DONE'].includes(status)) return 3
  if (['WORD_COUNT_SET'].includes(status)) return 2
  if (hasOutline.value || ['OUTLINE_READY'].includes(status)) return 1
  return 0
})

const OutlineNodeList = defineComponent({
  name: 'OutlineNodeList',
  props: {
    nodes: { type: Array, default: () => [] },
    activeId: { type: [String, Number], default: null },
    level: { type: Number, default: 1 }
  },
  emits: ['select'],
  setup(props, { emit }) {
    const renderNode = (node) => {
      const children = Array.isArray(node.children) ? node.children : []
      const isLeaf = !children.length
      return h('div', { class: 'outline-node-wrap' }, [
        h('div', {
          class: ['outline-node', { active: Number(props.activeId) === Number(node.id), leaf: isLeaf }],
          style: { paddingLeft: `${Math.max(0, props.level - 1) * 14}px` },
          onClick: () => isLeaf && emit('select', node)
        }, [
          h(ElTag, { size: 'small', type: isLeaf ? 'success' : 'info', effect: 'light' }, () => isLeaf ? '节' : '章'),
          h('span', { class: 'outline-title' }, node.title || '未命名章节'),
          isLeaf ? h('small', `${node.actualWordCount || 0}/${node.targetWordCount || 0}字`) : null
        ]),
        children.length ? h(OutlineNodeList, {
          nodes: children,
          activeId: props.activeId,
          level: props.level + 1,
          onSelect: (n) => emit('select', n)
        }) : null
      ])
    }
    return () => h('div', { class: 'outline-tree' }, props.nodes.map(renderNode))
  }
})

onMounted(async () => {
  await loadTypes()
  await loadDocuments()
})

onBeforeUnmount(() => {
  clearTimeout(searchTimer)
  clearInterval(parseTimer)
  clearInterval(taskTimer)
})

async function loadTypes() {
  documentTypes.value = await listDocumentTypes()
  if (!documentTypes.value.length) documentTypes.value = fallbackTypes()
}

async function loadDocuments() {
  const res = await pageDocuments({ ...query, keyword: query.keyword?.trim() || undefined })
  // 删除后的 AI文档只应出现在“回收站”，不能继续显示在当前工作台左侧列表。
  // 这里前端再做一层兜底过滤，避免历史数据或接口缓存把 DELETED/PURGED 状态带回来。
  documents.value = (res?.records || []).filter(isVisibleDocument)
}

function isVisibleDocument(item) {
  if (!item) return false
  const status = String(item.status || '').toUpperCase()
  return item.deleted !== 1 && status !== 'DELETED' && status !== 'PURGED'
}

function onSearchInput() {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(loadDocuments, 300)
}

function resetWorkspace() {
  currentDoc.value = null
  activeNode.value = null
  sectionDraft.value = ''
  parseTask.value = null
  runningTask.value = null
}

async function createNew(type) {
  const draft = await createDocument({
    documentType: type.type,
    documentTitle: type.title.replace('生成', ''),
    aiLevel: 'STANDARD',
    writingStyle: 'PROFESSIONAL'
  })
  await loadDocuments()
  applyDoc(draft)
}

async function loadDetail(id) {
  detailLoading.value = true
  try {
    const data = await getDocument(id)
    applyDoc(data)
  } finally {
    detailLoading.value = false
  }
}

async function refreshCurrent() {
  if (!currentDoc.value?.id) return
  await loadDetail(currentDoc.value.id)
  await loadDocuments()
}

function applyDoc(data) {
  currentDoc.value = data
  runningTask.value = data?.runningTask || null
  form.documentType = data?.solutionType || 'FEASIBILITY'
  form.documentTitle = data?.solutionName || docTypeLabel(form.documentType)
  form.projectName = data?.solutionName || ''
  form.aiLevel = data?.aiLevel || 'STANDARD'
  form.writingStyle = data?.writingStyle || 'PROFESSIONAL'
  form.mainRequirement = data?.requirement?.purchaseRequirement || ''
  form.referenceRequirement = data?.requirement?.serviceRequirement || ''
  form.outlineRequirement = data?.requirement?.outlineRequirement || ''
  form.overallWritingRequirement = data?.overallWritingRequirement || ''
  parseTask.value = data?.latestParseTask || parseTask.value
  Object.keys(formData).forEach((key) => delete formData[key])
  fillFormDataFromSummary(data?.requirement?.technicalRequirement || '')
  ensureCurrentFields()
  activeNode.value = leafNodes.value.find((node) => node?.section?.content) || leafNodes.value[0] || null
  sectionDraft.value = activeNode.value?.section?.content || ''
  resumeTaskPolling()
  resumeParsePolling()
}

function ensureCurrentFields() {
  currentFields.value.forEach((field) => {
    if (formData[field.prop] === undefined) formData[field.prop] = ''
  })
}

function fillFormDataFromSummary(summary) {
  String(summary || '').split('\n').forEach((line) => {
    const match = line.match(/^[-•]\s*([^：:]+)[：:]\s*(.*)$/)
    if (match) formData[match[1].trim()] = match[2].trim()
  })
}

function validateForm() {
  if (!form.documentTitle?.trim()) {
    ElMessage.warning('请填写文档标题')
    return false
  }
  for (const field of currentFields.value) {
    if (field.required && !String(formData[field.prop] || '').trim()) {
      ElMessage.warning(`请填写${field.label}`)
      return false
    }
  }
  return true
}

function buildFormPayload() {
  return {
    documentType: form.documentType,
    documentTitle: form.documentTitle,
    projectName: form.projectName,
    aiLevel: form.aiLevel,
    writingStyle: form.writingStyle,
    formData: { ...formData },
    mainRequirement: form.mainRequirement,
    referenceRequirement: form.referenceRequirement,
    outlineRequirement: form.outlineRequirement,
    overallWritingRequirement: form.overallWritingRequirement
  }
}

async function saveFormOnly() {
  if (!currentDoc.value?.id) return
  if (!validateForm()) return
  saving.value = true
  try {
    await saveDocumentForm(currentDoc.value.id, buildFormPayload())
    await refreshCurrent()
    ElMessage.success('草稿已保存')
  } finally {
    saving.value = false
  }
}

async function onReferenceChange(uploadFile) {
  if (!uploadFile?.raw || !currentDoc.value?.id) return
  parseTask.value = null
  const task = await uploadDocumentReference(currentDoc.value.id, uploadFile.raw, {
    documentType: form.documentType,
    aiLevel: form.aiLevel,
    writingStyle: form.writingStyle
  })
  parseTask.value = task
  pollParseTask(task.id)
  ElMessage.success('资料已上传，正在解析')
}

function resumeParsePolling() {
  clearInterval(parseTimer)
  if (parseTask.value?.id && !['SUCCESS', 'FAILED', 'CANCELED'].includes(String(parseTask.value.status || '').toUpperCase())) {
    pollParseTask(parseTask.value.id)
  }
}

function pollParseTask(taskId) {
  clearInterval(parseTimer)
  const tick = async () => {
    const task = await getDocumentParseTask(taskId)
    parseTask.value = task
    const status = String(task.status || '').toUpperCase()
    if (['SUCCESS', 'FAILED', 'CANCELED'].includes(status)) {
      clearInterval(parseTimer)
      parseTimer = null
      if (status === 'SUCCESS') {
        await refreshCurrent()
        ElMessage.success('资料解析完成')
      }
    }
  }
  tick()
  parseTimer = setInterval(tick, 2500)
}

async function onGenerateOutline() {
  if (!currentDoc.value?.id) return
  if (!validateForm()) return
  outlineLoading.value = true
  try {
    await saveDocumentForm(currentDoc.value.id, buildFormPayload())
    const data = await generateDocumentOutline(currentDoc.value.id, {
      outlineMode: 'DOCUMENT',
      writingStyle: form.writingStyle,
      outlineRequirement: form.outlineRequirement,
      extraRequirement: form.outlineRequirement,
      writingDirection: form.overallWritingRequirement
    })
    applyDoc(data)
    await applyDocumentWordCountPreset(currentDoc.value.id, wordPreset)
    await refreshCurrent()
    await loadDocuments()
    ElMessage.success('大纲已生成，请确认篇幅后生成正文')
  } finally {
    outlineLoading.value = false
  }
}

async function onApplyWordPreset() {
  if (!currentDoc.value?.id) return
  wordSaving.value = true
  try {
    const data = await applyDocumentWordCountPreset(currentDoc.value.id, wordPreset)
    applyDoc(data)
    await loadDocuments()
    ElMessage.success('篇幅已应用')
  } finally {
    wordSaving.value = false
  }
}

async function onGenerateFull(rewrite) {
  if (!currentDoc.value?.id) return
  await saveDocumentForm(currentDoc.value.id, buildFormPayload())
  fullGenerating.value = true
  try {
    const task = rewrite
      ? await rewriteDocumentFull(currentDoc.value.id, { writingStyle: form.writingStyle })
      : await generateDocumentFull(currentDoc.value.id, { writingStyle: form.writingStyle })
    runningTask.value = task
    pollGenerationTask(task.id)
  } finally {
    fullGenerating.value = false
  }
}

function resumeTaskPolling() {
  clearInterval(taskTimer)
  const task = currentDoc.value?.runningTask || runningTask.value
  if (task?.id && ['WAITING', 'RUNNING'].includes(String(task.status || '').toUpperCase())) {
    pollGenerationTask(task.id)
  }
}

function pollGenerationTask(taskId) {
  clearInterval(taskTimer)
  const tick = async () => {
    const task = await getDocumentGenerationTask(taskId)
    runningTask.value = task
    const status = String(task.status || '').toUpperCase()
    if (!['WAITING', 'RUNNING'].includes(status)) {
      clearInterval(taskTimer)
      taskTimer = null
      await refreshCurrent()
      await loadDocuments()
      if (status === 'SUCCESS') ElMessage.success('全文生成完成')
      else if (status === 'PARTIAL') ElMessage.warning('生成完成，但存在失败章节，请检查后重试')
      else if (status === 'FAILED') ElMessage.error('全文生成失败，请稍后重试或联系管理员')
    }
  }
  tick()
  taskTimer = setInterval(tick, 2500)
}

function selectNode(node) {
  activeNode.value = node
  sectionDraft.value = node?.section?.content || ''
}

async function onRegenerateSection() {
  if (!activeNode.value?.id) return
  sectionGenerating.value = true
  sectionDraft.value = ''
  try {
    await streamSection(activeNode.value.id, {
      title: activeNode.value.title,
      targetWordCount: activeNode.value.targetWordCount || wordPreset.wordCount,
      writingStyle: form.writingStyle,
      writingDirection: activeNode.value.writingDirection,
      writingRequirement: activeNode.value.writingRequirement,
      overwrite: true,
      chartLevel: 'NONE',
      tableLevel: 'NONE',
      imageLevel: 'NONE'
    }, {
      onMessage(chunk) {
        sectionDraft.value += chunk
      },
      onError(message) {
        ElMessage.error('章节生成失败，请稍后重试')
      }
    })
    await refreshCurrent()
    ElMessage.success('章节已重写')
  } finally {
    sectionGenerating.value = false
  }
}

async function onSaveSection() {
  if (!activeNode.value?.id) return
  sectionSaving.value = true
  try {
    await updateSectionContent(activeNode.value.id, sectionDraft.value)
    await refreshCurrent()
    ElMessage.success('章节正文已保存')
  } finally {
    sectionSaving.value = false
  }
}

async function chooseExportFormat() {
  try {
    await ElMessageBox.confirm(
      h('div', { class: 'export-format-tip' }, [
        h('p', '请选择导出文件格式：'),
        h('p', { class: 'export-format-sub' }, 'Word 方便继续编辑，PDF 方便定稿分发。')
      ]),
      '选择导出格式',
      {
        confirmButtonText: 'Word',
        cancelButtonText: 'PDF',
        distinguishCancelAndClose: true,
        closeOnClickModal: true,
        closeOnPressEscape: true,
        type: 'info'
      }
    )
    return 'word'
  } catch (action) {
    return action === 'cancel' ? 'pdf' : ''
  }
}

async function onExport() {
  if (!currentDoc.value?.id) return
  const format = await chooseExportFormat()
  if (!format) return
  exportLoading.value = true
  try {
    const file = format === 'pdf'
      ? await exportDocumentPdf(currentDoc.value.id)
      : await exportDocumentWord(currentDoc.value.id)
    if (!file?.id) {
      ElMessage.warning('导出成功，但未返回文件ID，请到下载中心查看')
      return
    }
    const blob = await downloadFileResource(file.id)
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = file.originalName || `${currentDoc.value.solutionName || 'AI文档'}-导出.${format === 'pdf' ? 'pdf' : 'docx'}`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.URL.revokeObjectURL(url)
    await refreshCurrent()
    await loadDocuments()
    ElMessage.success(`${format === 'pdf' ? 'PDF' : 'Word'}已导出，并写入下载中心`)
  } finally {
    exportLoading.value = false
  }
}

async function onDelete(item) {
  await ElMessageBox.confirm(`确定删除“${item.solutionName || ''}”吗？删除后可在回收站恢复。`, '删除确认', { type: 'warning' })
  await deleteDocument(item.id)
  // 删除成功后立即从左侧列表移除；该记录后续只在回收站展示。
  documents.value = documents.value.filter((doc) => Number(doc.id) !== Number(item.id))
  if (currentDoc.value?.id === item.id) resetWorkspace()
  await loadDocuments()
  ElMessage.success('已删除，记录已进入回收站')
}

function flattenLeaves(nodes = []) {
  const result = []
  const walk = (list) => {
    ;(list || []).forEach((node) => {
      if (node.children?.length) walk(node.children)
      else result.push(node)
    })
  }
  walk(nodes)
  return result
}

function statusLabel(status) {
  const map = {
    DRAFT: '草稿',
    INFO_READY: '信息就绪',
    FILE_PARSING: '资料解析中',
    OUTLINE_GENERATING: '大纲生成中',
    OUTLINE_READY: '大纲已生成',
    WORD_COUNT_SET: '已设篇幅',
    CONTENT_GENERATING: '正文生成中',
    CONTENT_PARTIAL: '部分完成',
    CONTENT_READY: '正文完成',
    DONE: '已完成',
    DELETED: '已删除',
    FAILED: '失败'
  }
  return map[String(status || '').toUpperCase()] || status || '未知'
}

function statusTagType(status) {
  const value = String(status || '').toUpperCase()
  if (['DONE', 'CONTENT_READY'].includes(value)) return 'success'
  if (['CONTENT_GENERATING', 'OUTLINE_GENERATING', 'FILE_PARSING'].includes(value)) return 'warning'
  if (['FAILED', 'PARSE_FAILED'].includes(value)) return 'danger'
  return 'info'
}

function docTypeLabel(type) {
  const found = documentTypes.value.find((item) => item.type === type)
  if (found) return found.shortTitle || found.title
  const map = { FEASIBILITY: '可研报告', CONTRACT: '商务合同', EIA: '环评报告', TIA: '交评报告' }
  return map[type] || 'AI文档'
}

function fallbackTypes() {
  return [
    { type: 'FEASIBILITY', title: 'AI可行性研究报告生成', shortTitle: '可研报告', description: '生成可研报告草稿', fields: [] },
    { type: 'CONTRACT', title: 'AI商务合同生成', shortTitle: '商务合同', description: '生成商务合同草稿', fields: [] },
    { type: 'EIA', title: 'AI环境影响评价生成', shortTitle: '环评报告', description: '生成环评报告草稿', fields: [] },
    { type: 'TIA', title: 'AI交通影响评价生成', shortTitle: '交评报告', description: '生成交评报告草稿', fields: [] }
  ]
}
</script>

<style scoped>
.ai-doc-page {
  display: grid;
  grid-template-columns: 300px minmax(0, 1fr);
  gap: 14px;
  height: calc(100vh - 76px);
  min-height: 660px;
}

.doc-sidebar,
.doc-main,
.hero-card,
.flow-card,
.left-panel,
.right-panel,
.outline-panel,
.section-panel {
  border: 1px solid #e5ebf5;
  border-radius: 18px;
  background: #fff;
  box-shadow: 0 10px 28px rgba(15, 23, 42, 0.05);
}

.doc-sidebar {
  display: flex;
  flex-direction: column;
  padding: 14px;
  min-width: 0;
}

.side-head {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  align-items: flex-start;
}

.side-head h3 {
  margin: 0;
  font-size: 18px;
  color: #172033;
}

.side-head p,
.hero-card p,
.generate-box p,
.section-head p {
  margin: 6px 0 0;
  color: #718096;
  font-size: 13px;
}

.side-search {
  margin: 14px 0;
}

.doc-list-scroll {
  flex: 1;
  min-height: 0;
}

.doc-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.doc-item {
  padding: 12px;
  border-radius: 14px;
  border: 1px solid #edf2fb;
  cursor: pointer;
  transition: all .18s ease;
}

.doc-item:hover,
.doc-item.active {
  border-color: #8ab4ff;
  background: #f7fbff;
  box-shadow: 0 8px 18px rgba(37, 99, 235, 0.08);
}

.doc-item-title {
  display: flex;
  gap: 8px;
  align-items: center;
  font-weight: 700;
  color: #1f2a44;
}

.doc-item-title span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.doc-item-meta,
.summary-tags,
.generate-actions,
.header-actions,
.section-actions {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}

.doc-item-meta {
  margin-top: 10px;
}

.doc-item-bottom {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 8px;
  color: #94a3b8;
  font-size: 12px;
}

.doc-main {
  min-width: 0;
  padding: 14px;
  overflow: auto;
  background: linear-gradient(180deg, #ffffff 0%, #f6f9ff 100%);
}

.hero-card {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 28px;
  min-height: 170px;
  background: linear-gradient(135deg, #f7fbff, #eef5ff);
}

.eyebrow {
  color: #246bfe !important;
  font-weight: 800;
  letter-spacing: 2px;
}

.hero-card h1 {
  margin: 8px 0 0;
  font-size: 30px;
  color: #14213d;
}

.hero-ill {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 120px;
  height: 120px;
  border-radius: 36px;
  background: linear-gradient(135deg, #246bfe, #7c3aed);
  color: #fff;
  font-size: 30px;
  font-weight: 900;
  box-shadow: 0 18px 40px rgba(37, 99, 235, .22);
}

.type-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;
  margin-top: 14px;
}

.type-card {
  min-height: 180px;
  padding: 18px;
  border: 1px solid #e5ebf5;
  border-radius: 18px;
  background: #fff;
  cursor: pointer;
  transition: all .18s ease;
}

.type-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 16px 34px rgba(37, 99, 235, .13);
  border-color: #8ab4ff;
}

.type-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 42px;
  height: 42px;
  border-radius: 14px;
  background: #edf5ff;
  color: #246bfe;
  font-size: 20px;
}

.type-card h3 {
  margin: 14px 0 8px;
  color: #172033;
}

.type-card p {
  min-height: 42px;
  color: #718096;
  font-size: 13px;
  line-height: 1.6;
}

.work-header,
.flow-card {
  margin-bottom: 14px;
}

.work-header {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: center;
  padding: 6px 2px 0;
}

.breadcrumb-line {
  display: flex;
  align-items: center;
  gap: 6px;
  color: #7b8794;
  font-size: 13px;
}

.work-header h2 {
  margin: 8px 0;
  color: #172033;
}

.flow-card {
  padding: 16px 12px;
}

.workspace-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.1fr) minmax(360px, .9fr);
  gap: 14px;
}

.left-panel,
.right-panel,
.outline-panel,
.section-panel {
  padding: 16px;
}

.panel-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14px;
  font-size: 16px;
  font-weight: 800;
  color: #172033;
}

.form-row-two {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.full-select,
.word-select {
  width: 100%;
}

.panel-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding-top: 10px;
  border-top: 1px dashed #e5ebf5;
}

.reference-upload :deep(.el-upload-dragger) {
  border-radius: 16px;
  background: #f8fbff;
}

.upload-icon {
  font-size: 32px;
  color: #246bfe;
}

.upload-title {
  margin-top: 8px;
  font-weight: 800;
  color: #1f2a44;
}

.upload-status {
  margin-top: 6px;
  color: #246bfe;
}

.reference-note {
  margin-top: 12px;
}

.setting-box,
.generate-box {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 14px;
  padding: 14px;
  border-radius: 16px;
  background: #f8fbff;
  border: 1px solid #edf2fb;
}

.setting-title {
  font-weight: 800;
  color: #1f2a44;
}

.risk-alert {
  margin-top: 14px;
}

.result-grid {
  display: grid;
  grid-template-columns: 380px minmax(0, 1fr);
  gap: 14px;
  margin-top: 14px;
  min-height: 460px;
}

.outline-scroll {
  height: 410px;
}

.outline-node {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 36px;
  padding: 6px 8px;
  border-radius: 10px;
  color: #243047;
}

.outline-node.leaf {
  cursor: pointer;
}

.outline-node:hover,
.outline-node.active {
  background: #edf5ff;
  color: #246bfe;
}

.outline-title {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.outline-node small {
  color: #94a3b8;
}

.section-panel {
  min-width: 0;
}

.section-head {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: flex-start;
  margin-bottom: 12px;
}

.section-head h3 {
  margin: 0;
  color: #172033;
}

.section-editor :deep(.el-textarea__inner) {
  height: 370px;
  line-height: 1.8;
  border-radius: 14px;
}

@media (max-width: 1400px) {
  .type-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .workspace-grid,
  .result-grid {
    grid-template-columns: 1fr;
  }
}
</style>
