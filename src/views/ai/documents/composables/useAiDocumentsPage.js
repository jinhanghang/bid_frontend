import { computed, defineComponent, h, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ElButton, ElIcon, ElMessage, ElMessageBox, ElTag, ElTooltip } from '@/plugins/element-plus-api'
import { ArrowLeft, Document, InfoFilled, MagicStick, Plus, Refresh, Search, UploadFilled } from '@element-plus/icons-vue'
import {
  applyDocumentWordCountPreset,
  createDocument,
  deleteDocument,
  startDocumentExportTask,
  getDocumentExportTask,
  getDocumentExportCheck,
  generateDocumentFull,
  generateDocumentOutline,
  getDocument,
  getDocumentGenerateCheck,
  getDocumentGenerationTask,
  getDocumentParseTask,
  getDocumentQualityCheck,
  getDocumentWordCountStats,
  getDocumentConsistencyPackage,
  getDocumentDuplicateCheck,
  compressDocumentDuplicateSections,
  reviewDocumentByAi,
  cancelDocumentGenerationTask,
  listDocumentTypes,
  pageDocuments,
  rewriteDocumentFull,
  retryFailedDocumentSections,
  saveDocumentForm,
  uploadDocumentReference,
  autoFillDocumentFromReference
} from '@/api/aiDocument'
import { downloadFileResource, getCurrentUserRunningAiTask, streamSection, updateSectionContent } from '@/api/aiSolution'
import { formatDateTime } from '@/utils/format'
import { notifyRequestError } from '@/utils/errorNotify'
import { normalizeStreamErrorMessage } from '@/utils/streamError'
import { openWordExportDialog } from '@/utils/wordExportDialog'
import AiReviewDrawer from '@/components/ai/AiReviewDrawer.vue'
import AiModelTrace from '@/components/ai/AiModelTrace.vue'
import OutlineNodeList from '../components/OutlineNodeList.vue'

export function useAiDocumentsPage() {

  const router = useRouter()

  const loading = ref(false)
  const appendLoading = ref(false)
  const documentTypes = ref([])
  const documents = ref([])
  const currentDoc = ref(null)
  const detailLoading = ref(false)
  const saving = ref(false)
  const outlineLoading = ref(false)
  const wordSaving = ref(false)
  const wordPresetDialogVisible = ref(false)
  const fullGenerating = ref(false)
  const taskCanceling = ref(false)
  const exportLoading = ref(false)
  const sectionGenerating = ref(false)
  const sectionSaving = ref(false)
  const formDialogVisible = ref(false)
  const parseTask = ref(null)
  const autoFillRunning = ref(false)
  const autoFillDoneTaskIds = new Set()
  const runningTask = ref(null)
  const globalRunningTask = ref(null)
  const activeNode = ref(null)
  const sectionDraft = ref('')
  const docQualityCheckVisible = ref(false)
  const docQualityCheckLoading = ref(false)
  const docQualityCheckData = ref({ items: [] })
  const docWordCountVisible = ref(false)
  const docWordCountLoading = ref(false)
  const docWordCountStats = ref({ items: [] })
  const docDuplicateCheckData = ref({ duplicates: [] })
  const docDuplicateCompressing = ref(false)
  const docReviewVisible = ref(false)
  const docReviewLoading = ref(false)
  const docReviewResult = ref(null)
  const docConsistencyPackage = ref(null)

  const query = reactive({ pageNum: 1, pageSize: 20, keyword: '' })
  const docListScrollbar = ref()
  const documentPager = reactive({ page: 1, size: 20, total: 0 })
  const form = reactive({
    documentType: 'FEASIBILITY',
    documentTitle: '',
    projectName: '',
    aiLevel: '',
    writingStyle: 'PROFESSIONAL',
    mainRequirement: '',
    referenceRequirement: '',
    outlineRequirement: '',
    overallWritingRequirement: '',
    targetTotalWordCount: null,
    longOutlinePreset: 0
  })
  const formData = reactive({})
  const wordPreset = reactive({ mode: '', wordCount: null })
  const wordPresetSelectionValid = computed(() => wordPreset.mode === 'AUTO' || (wordPreset.mode === 'FIXED' && Number(wordPreset.wordCount || 0) > 0))
  const wordOptions = [300, 600, 900, 1200, 1800, 2400, 3000]

  watch(() => form.longOutlinePreset, (value) => {
    form.targetTotalWordCount = Number(value || 0) > 0 ? Number(value) : null
  })

  let searchTimer = null
  let parseTimer = null
  let taskTimer = null
  let outlineTimer = null
  let globalTaskTimer = null

  const currentType = computed(() => documentTypes.value.find((item) => item.type === form.documentType) || documentTypes.value[0])
  const currentFields = computed(() => (currentType.value?.fields || []).filter((field) => !isBasicDuplicateField(field)))
  const outlineTree = computed(() => currentDoc.value?.outlines || [])
  const leafNodes = computed(() => flattenLeaves(outlineTree.value))
  const documentDoneLeafCount = computed(() => leafNodes.value.filter(isDocumentLeafDone).length)
  const retryableDocumentLeaves = computed(() => leafNodes.value.filter(isDocumentLeafRetryable))
  const retryableDocumentTitleText = computed(() => briefDocumentNodeList(retryableDocumentLeaves.value))
  const canRetryDocumentFailedSections = computed(() => !!currentDoc.value?.id && retryableDocumentLeaves.value.length > 0 && !isOperationLocked.value && !fullGenerating.value)
  const hasOutline = computed(() => outlineTree.value.length > 0)
  const isOutlineGenerating = computed(() => outlineLoading.value || isOutlineGeneratingStatus(currentDoc.value?.status))
  const hasRunningTask = computed(() => ['WAITING', 'RUNNING'].includes(String(runningTask.value?.status || '').toUpperCase()))
  const isGlobalAiTaskRunning = computed(() => ['WAITING', 'RUNNING'].includes(String(globalRunningTask.value?.status || '').toUpperCase()))
  const isGlobalAiTaskForCurrentDoc = computed(() => {
    const currentId = String(currentDoc.value?.id || '')
    return !!currentId && String(globalRunningTask.value?.solutionId || '') === currentId
  })
  const hasOtherAiTaskRunning = computed(() => isGlobalAiTaskRunning.value && !isGlobalAiTaskForCurrentDoc.value)
  const isOperationLocked = computed(() => Boolean(isOutlineGenerating.value || hasRunningTask.value || hasOtherAiTaskRunning.value || fullGenerating.value || sectionGenerating.value || isDocumentGeneratingStatus(currentDoc.value?.status)))
  const canExport = computed(() => currentDoc.value?.canExport === true || (leafNodes.value.length > 0 && leafNodes.value.every((node) => node?.section?.content)))
  const progressStatus = computed(() => {
    const status = String(runningTask.value?.status || '').toUpperCase()
    if (status === 'SUCCESS') return 'success'
    if (status === 'FAILED' || status === 'PARTIAL') return 'exception'
    return undefined
  })
  const sectionPromptText = computed(() => (activeNode.value?.writingDirection || activeNode.value?.writingRequirement || '').trim())
  const documentNoMore = computed(() => documentPager.total > 0 && documents.value.length >= documentPager.total)
  const docQualityItems = computed(() => docQualityCheckData.value?.items || [])
  const docQualityStatCards = computed(() => {
    const data = docQualityCheckData.value || {}
    return [
      { label: '章节总数', value: data.totalSections || 0, desc: '当前目录末级章节' },
      { label: '已检查', value: data.checkedSections || 0, desc: '已有质量日志章节' },
      { label: '平均分', value: data.averageScore || 0, desc: '仅统计已检查章节' },
      { label: '需重编', value: data.rewriteSections || 0, desc: '低于最低质量线' },
      { label: '需关注', value: data.attentionSections || 0, desc: '建议人工复核' },
      { label: '优秀/可用', value: `${data.excellentSections || 0}/${data.usableSections || 0}`, desc: '优秀 / 可用章节' }
    ]
  })
  const docDuplicateItems = computed(() => docDuplicateCheckData.value?.duplicates || [])

  const activeStep = computed(() => {
    const status = String(currentDoc.value?.status || '').toUpperCase()
    if (canExport.value) return 4
    if (['CONTENT_GENERATING', 'CONTENT_PARTIAL', 'CONTENT_READY', 'DONE'].includes(status)) return 3
    if (['WORD_COUNT_SET'].includes(status)) return 2
    if (hasOutline.value || ['OUTLINE_READY'].includes(status)) return 1
    return 0
  })

  onMounted(async () => {
    await loadGlobalRunningTask()
    await loadTypes()
    await loadDocuments()
    startGlobalTaskPolling()
  })

  onBeforeUnmount(() => {
    clearTimeout(searchTimer)
    clearInterval(parseTimer)
    clearInterval(taskTimer)
    clearInterval(outlineTimer)
    clearInterval(globalTaskTimer)
  })

  function startGlobalTaskPolling() {
    clearInterval(globalTaskTimer)
    globalTaskTimer = setInterval(() => {
      if (!document.hidden) loadGlobalRunningTask()
    }, 5000)
  }

  async function loadGlobalRunningTask() {
    try {
      globalRunningTask.value = await getCurrentUserRunningAiTask()
    } catch (e) {
      globalRunningTask.value = null
    }
  }

  async function loadTypes() {
    documentTypes.value = await listDocumentTypes()
    if (!documentTypes.value.length) documentTypes.value = fallbackTypes()
  }

  async function loadDocuments(options = {}) {
    const append = Boolean(options.append)
    if ((append && documentNoMore.value) || loading.value || appendLoading.value) return

    const pageToLoad = append ? documentPager.page + 1 : 1
    if (append) {
      appendLoading.value = true
    } else {
      loading.value = true
    }

    try {
      const res = await pageDocuments({
        ...query,
        current: pageToLoad,
        size: documentPager.size,
        pageNum: pageToLoad,
        pageSize: documentPager.size,
        keyword: query.keyword?.trim() || undefined
      })
      const records = (res?.records || []).filter(isVisibleDocument)
      documentPager.page = pageToLoad
      documentPager.total = Number(res?.total || 0)

      if (append) {
        const exists = new Set(documents.value.map((item) => String(item.id)))
        documents.value = documents.value.concat(records.filter((item) => item?.id && !exists.has(String(item.id))))
        return
      }

      // 删除后的 AI文档只应出现在“回收站”，不能继续显示在当前工作台左侧列表。
      // 这里前端再做一层兜底过滤，避免历史数据或接口缓存把 DELETED/PURGED 状态带回来。
      documents.value = records
    } finally {
      if (append) {
        appendLoading.value = false
      } else {
        loading.value = false
      }
    }
  }

  function isVisibleDocument(item) {
    if (!item) return false
    const status = String(item.status || '').toUpperCase()
    return item.deleted !== 1 && status !== 'DELETED' && status !== 'PURGED'
  }

  function reloadDocumentsFirstPage() {
    documentPager.page = 1
    documents.value = []
    loadDocuments()
  }

  function onSearchInput() {
    clearTimeout(searchTimer)
    searchTimer = setTimeout(reloadDocumentsFirstPage, 300)
  }

  function onDocumentListScroll() {
    const el = docListScrollbar.value?.wrapRef
    if (!el || loading.value || appendLoading.value || documentNoMore.value) return
    const remain = el.scrollHeight - el.scrollTop - el.clientHeight
    if (remain <= 80) {
      loadDocuments({ append: true })
    }
  }

  function resetWorkspace() {
    if (isOperationLocked.value) return
    clearInterval(outlineTimer)
    outlineTimer = null
    currentDoc.value = null
    activeNode.value = null
    sectionDraft.value = ''
    parseTask.value = null
    runningTask.value = null
    formDialogVisible.value = false
  }

  async function createNew(type) {
    if (isOperationLocked.value) return
    const draft = await createDocument({
      documentType: type.type,
      documentTitle: type.title.replace('生成', ''),
      aiLevel: null,
      writingStyle: 'PROFESSIONAL'
    })
    await loadDocuments()
    applyDoc(draft)
    formDialogVisible.value = true
  }

  async function loadDetail(id) {
    // AI文档全文生成属于后台任务，页面必须允许用户切换文档查看进度或历史内容。
    // 只锁定新建、编辑、删除、生成、保存等写操作，不锁定左侧文档查看。
    detailLoading.value = true
    try {
      const data = await getDocument(id)
      applyDoc(data)
      if (shouldOpenFormDialog(data)) formDialogVisible.value = true
    } finally {
      detailLoading.value = false
    }
  }


  function openFormDialog() {
    if (isOperationLocked.value) return
    if (!currentDoc.value?.id) return
    formDialogVisible.value = true
  }

  function shouldOpenFormDialog(data) {
    if (!data) return false
    const status = String(data.status || '').toUpperCase()
    const outlines = Array.isArray(data.outlines) ? data.outlines : []
    return !outlines.length && ['DRAFT', 'INFO_READY'].includes(status)
  }

  async function refreshCurrent() {
    if (!currentDoc.value?.id) return
    detailLoading.value = true
    try {
      const data = await getDocument(currentDoc.value.id)
      applyDoc(data)
      await loadDocuments()
    } finally {
      detailLoading.value = false
    }
  }

  function normalizeQualityCheckPayload(data) {
    return data || { items: [], totalSections: 0, checkedSections: 0, averageScore: 0, excellentSections: 0, usableSections: 0, attentionSections: 0, rewriteSections: 0, noQualityLogSections: 0 }
  }

  function safePercent(value) {
    const n = Number(value || 0)
    return Math.min(100, Math.max(0, Number.isFinite(n) ? n : 0))
  }

  function qualityLevelTagType(level, score) {
    const n = Number(score || 0)
    if (String(level || '').includes('重写') || n < 72) return 'danger'
    if (String(level || '').includes('关注') || n < 82) return 'warning'
    if (String(level || '').includes('优秀') || n >= 92) return 'success'
    return 'primary'
  }

  function qualityProgressStatus(score) {
    const n = Number(score || 0)
    if (n < 72) return 'exception'
    if (n < 82) return 'warning'
    if (n >= 92) return 'success'
    return ''
  }

  function issueSeverityTagType(value) {
    const v = String(value || '').toUpperCase()
    if (v === 'HIGH') return 'danger'
    if (v === 'MEDIUM') return 'warning'
    if (v === 'LOW') return 'info'
    return 'success'
  }

  function qualityRowClassName({ row }) {
    if (!row?.hasQualityLog) return 'quality-row-missing'
    if (row.recommendRewrite) return 'quality-row-rewrite'
    if (row.recommendReview) return 'quality-row-review'
    return ''
  }

  function wordStatusTagType(status) {
    if (status === '字数正常') return 'success'
    if (status === '略超字数' || status === '明显偏短') return 'warning'
    if (status === '明显超字数') return 'danger'
    return 'info'
  }

  function duplicateSectionsText(sections = []) {
    return (sections || []).map((item) => item.path || item.title || item.outlineId).filter(Boolean).join('；') || '-'
  }

  async function openDocumentQualityCheckDrawer() {
    if (!currentDoc.value?.id) return
    docQualityCheckVisible.value = true
    await loadDocumentQualityCheck()
  }

  async function loadDocumentQualityCheck() {
    if (!docQualityCheckVisible.value || !currentDoc.value?.id) return
    docQualityCheckLoading.value = true
    try {
      docQualityCheckData.value = normalizeQualityCheckPayload(await getDocumentQualityCheck(currentDoc.value.id))
    } catch (e) {
      notifyRequestError(e, '加载质量检查失败')
    } finally {
      docQualityCheckLoading.value = false
    }
  }

  async function openDocumentWordCountDrawer() {
    if (!currentDoc.value?.id) return
    docWordCountVisible.value = true
    await loadDocumentWordCountStats()
  }

  async function loadDocumentWordCountStats() {
    if (!docWordCountVisible.value || !currentDoc.value?.id) return
    docWordCountLoading.value = true
    try {
      const [wordRes, duplicateRes] = await Promise.all([
        getDocumentWordCountStats(currentDoc.value.id),
        getDocumentDuplicateCheck(currentDoc.value.id)
      ])
      docWordCountStats.value = wordRes || { items: [] }
      docDuplicateCheckData.value = duplicateRes || { duplicates: [] }
    } catch (e) {
      notifyRequestError(e, '加载字数检查失败')
    } finally {
      docWordCountLoading.value = false
    }
  }

  async function onCompressDocumentDuplicates() {
    if (!currentDoc.value?.id) return
    await ElMessageBox.confirm('系统将删除跨章节重复段落，保留首次出现内容。该操作不会新增事实内容，是否继续？', '一键压缩重复内容', {
      type: 'warning', confirmButtonText: '开始压缩', cancelButtonText: '取消'
    })
    docDuplicateCompressing.value = true
    try {
      const updated = await compressDocumentDuplicateSections(currentDoc.value.id)
      applyDoc(updated)
      ElMessage.success('重复内容已压缩')
      await loadDocumentWordCountStats()
    } catch (e) {
      notifyRequestError(e, '压缩重复内容失败')
    } finally {
      docDuplicateCompressing.value = false
    }
  }

  async function openDocumentReviewDrawer() {
    if (!currentDoc.value?.id) return
    docReviewVisible.value = true
    docReviewResult.value = null
    docReviewLoading.value = true
    try {
      docConsistencyPackage.value = await getDocumentConsistencyPackage(currentDoc.value.id)
    } catch (e) {
      notifyRequestError(e, '加载全文统一口径失败')
    } finally {
      docReviewLoading.value = false
    }
  }

  async function runDocumentAiReviewNow() {
    if (!currentDoc.value?.id) return
    docReviewLoading.value = true
    try {
      docReviewResult.value = await reviewDocumentByAi(currentDoc.value.id)
      if (docReviewResult.value?.reviewRecordId) {
        ElMessage.success('AI二次审稿完成，审稿记录已保存')
      } else {
        ElMessage.warning('AI二次审稿完成，但审稿记录未保存，请检查增量SQL和后端日志')
      }
    } catch (e) {
      notifyRequestError(e, 'AI二次审稿失败')
    } finally {
      docReviewLoading.value = false
    }
  }

  // 全文生成中需要轻量刷新右侧正文和左侧大纲。
  // 这里不打开 detailLoading，避免每 2.5 秒页面闪一下。
  async function refreshCurrentLight(options = {}) {
    const docId = options.docId || currentDoc.value?.id
    if (!docId) return
    const data = await getDocument(docId)
    if (currentDoc.value?.id && String(currentDoc.value.id) !== String(docId)) return
    applyDoc(data, options)
  }

  function applyDoc(data, options = {}) {
    const previousActiveId = activeNode.value?.id
    currentDoc.value = data
    runningTask.value = data?.runningTask || null
    form.documentType = data?.solutionType || 'FEASIBILITY'
    form.documentTitle = data?.solutionName || docTypeLabel(form.documentType)
    form.projectName = ''
    form.aiLevel = data?.aiLevel || ''
    form.writingStyle = data?.writingStyle || 'PROFESSIONAL'
    form.mainRequirement = data?.requirement?.purchaseRequirement || ''
    form.referenceRequirement = data?.requirement?.serviceRequirement || ''
    form.outlineRequirement = data?.requirement?.outlineRequirement || ''
    form.overallWritingRequirement = data?.overallWritingRequirement || ''
    form.targetTotalWordCount = null
    form.longOutlinePreset = 0
    parseTask.value = data?.latestParseTask || parseTask.value
    Object.keys(formData).forEach((key) => delete formData[key])
    fillFormDataFromSummary(data?.requirement?.technicalRequirement || '')
    form.projectName = String(formData.projectName || data?.solutionName || '')
    ensureCurrentFields()
    scheduleAutoFillForCurrentDoc()
    const leaves = leafNodes.value
    const previousNode = leaves.find((node) => String(node?.id || '') === String(previousActiveId || ''))
    const latestGeneratedNode = [...leaves].reverse().find((node) => node?.section?.content)

    // 全文生成轮询刷新时保留用户正在查看的章节，不再因为其他章节新生成而自动切走。
    // 只有首次进入、当前选中章节不存在时，才默认选中最新已生成章节或第一节。
    activeNode.value = previousNode
      || latestGeneratedNode
      || leaves[0]
      || null
    sectionDraft.value = activeNode.value?.section?.content || ''
    if (!options.skipTaskPolling) resumeTaskPolling()
    resumeParsePolling()
    if (!options.skipOutlinePolling) resumeOutlinePolling()
  }


  function isBasicDuplicateField(field) {
    const prop = String(field?.prop || '').trim().toLowerCase()
    const label = String(field?.label || '').trim()
    return ['documenttitle', 'solutionname', 'projectname'].includes(prop) || ['文档标题', '项目名称'].includes(label)
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
    if (!form.aiLevel) {
      ElMessage.warning('请先选择AI等级')
      return false
    }
    if (!form.documentTitle?.trim()) {
      ElMessage.warning('请填写文档标题')
      return false
    }
    for (const field of currentFields.value) {
      if (!field.required) continue
      const value = String(formData[field.prop] || '').trim()
      if (!value) {
        ElMessage.warning(`请填写${field.label}`)
        return false
      }
      if (isWeakFormValue(field, value)) {
        ElMessage.warning(`请补充有效的${field.label}`)
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
    if (isOperationLocked.value) return false
    if (!currentDoc.value?.id) return false
    if (requiredMissingFields().length) {
      await tryAutoFillFromLatestParseTask({ force: true, silent: true })
    }
    if (!validateForm()) return false
    saving.value = true
    try {
      await saveDocumentForm(currentDoc.value.id, buildFormPayload())
      await refreshCurrent()
      ElMessage.success('草稿已保存')
      return true
    } finally {
      saving.value = false
    }
  }

  async function onSaveFormDialog() {
    const ok = await saveFormOnly()
    if (ok) formDialogVisible.value = false
  }

  async function onReferenceChange(uploadFile) {
    if (isOperationLocked.value) return
    if (!uploadFile?.raw || !currentDoc.value?.id) return
    if (!form.aiLevel) {
      ElMessage.warning('请先选择AI等级')
      return
    }
    parseTask.value = null
    const task = await uploadDocumentReference(currentDoc.value.id, uploadFile.raw, {
      documentType: form.documentType,
      aiLevel: form.aiLevel,
      writingStyle: form.writingStyle
    })
    parseTask.value = task
    pollParseTask(task.id)
    const status = String(task?.status || '').toUpperCase()
    if (['WAITING', 'PARSING', 'EXTRACTING'].includes(status)) {
      ElMessage.info(task?.message || '解析任务已在排队或执行中，请等待完成')
    } else {
      ElMessage.success('资料已上传，正在解析')
    }
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
      if (document.hidden) return
      try {
        const task = await getDocumentParseTask(taskId)
        parseTask.value = task
        const status = String(task.status || '').toUpperCase()
        if (['SUCCESS', 'FAILED', 'CANCELED'].includes(status)) {
          clearInterval(parseTimer)
          parseTimer = null
          if (status === 'SUCCESS') {
            await autoFillAfterParseSuccess(taskId)
          }
        }
      } catch (e) {
        // Polling should not block the page when the network jitters.
      }
    }
    tick()
    parseTimer = setInterval(tick, 2500)
  }


  async function autoFillAfterParseSuccess(taskId) {
    await tryAutoFillFromLatestParseTask({ taskId, force: true, silent: false, successPrefix: '资料解析完成' })
  }

  function latestSuccessfulParseTaskId() {
    const candidates = [parseTask.value, currentDoc.value?.latestParseTask]
    for (const task of candidates) {
      const status = String(task?.status || '').toUpperCase()
      if (task?.id && status === 'SUCCESS') return task.id
    }
    return ''
  }

  function shouldAutoFillCurrentDoc() {
    return !!currentDoc.value?.id && !!latestSuccessfulParseTaskId() && requiredMissingFields().length > 0
  }

  function scheduleAutoFillForCurrentDoc() {
    const taskId = latestSuccessfulParseTaskId()
    if (!taskId || autoFillDoneTaskIds.has(String(taskId)) || autoFillRunning.value) return
    if (!shouldAutoFillCurrentDoc()) return
    window.setTimeout(() => {
      const latestTaskId = latestSuccessfulParseTaskId()
      if (!latestTaskId || autoFillDoneTaskIds.has(String(latestTaskId)) || autoFillRunning.value) return
      if (!shouldAutoFillCurrentDoc()) return
      tryAutoFillFromLatestParseTask({ taskId: latestTaskId, force: false, silent: true })
    }, 0)
  }

  async function tryAutoFillFromLatestParseTask(options = {}) {
    if (!currentDoc.value?.id || autoFillRunning.value) return false
    const taskId = options.taskId || latestSuccessfulParseTaskId()
    if (!taskId) return false
    if (!options.force && autoFillDoneTaskIds.has(String(taskId))) return false
    autoFillRunning.value = true
    try {
      const updated = await autoFillDocumentFromReference(
        currentDoc.value.id,
        { taskId },
        { silentError: !!options.silent }
      )
      autoFillDoneTaskIds.add(String(taskId))
      applyDoc(updated)
      await loadDocuments()
      const missing = requiredMissingFields()
      if (!options.silent) {
        const prefix = options.successPrefix || '参考资料识别完成'
        if (missing.length) {
          ElMessage.warning(`${prefix}，已自动填充部分内容，请补充：${missing.join('、')}`)
        } else {
          ElMessage.success(`${prefix}，已自动填充表单内容`)
        }
      }
      return true
    } catch (e) {
      autoFillDoneTaskIds.add(String(taskId))
      await refreshCurrent()
      if (!options.silent) {
        ElMessage.warning('资料解析完成，但自动填充失败，请手工补充后再生成大纲')
      }
      return false
    } finally {
      autoFillRunning.value = false
    }
  }

  function requiredMissingFields() {
    const missing = []
    if (!form.documentTitle?.trim()) missing.push('文档标题')
    currentFields.value.forEach((field) => {
      if (!field.required) return
      const value = String(formData[field.prop] || '').trim()
      if (!value || isWeakFormValue(field, value)) {
        missing.push(field.label)
      }
    })
    return missing
  }

  function isWeakFormValue(field, value) {
    const prop = String(field?.prop || '').trim()
    const compact = String(value || '').replace(/\s+/g, '')
    if (!compact) return true
    if (/请输入|请填写|示例|例如|如：|如:|确认意见|审核意见|评审意见|目录要求|整体编写方向|补充你希望|章节篇幅|自动分配/.test(compact)) return true
    if (/投标文件格式要求|工期质量要求|商务报价要求|评分办法|评标办法|投标人须知|废标条款|资格审查|形式评审|响应性评审/.test(compact)) return true
    if (['constructionContent', 'content', 'scope', 'pollution', 'roads'].includes(prop)) {
      return compact.length < 18 || /^(建设内容|主要建设内容|项目内容|服务内容|招标范围|承包范围|工程概况)[。.:：]*$/.test(compact)
    }
    if (['builder', 'partyA', 'partyB'].includes(prop)) {
      return compact.length > 80 || /确认意见|单位确认|盖章|签字/.test(compact) || /^(建设单位|甲方|乙方|采购人|招标人)[。.:：]*$/.test(compact)
    }
    if (prop === 'period') {
      return compact.length > 80 || /质量要求|商务报价|评分|评标|格式要求/.test(compact) || /^(工期|建设周期|实施周期)[。.:：]*$/.test(compact)
    }
    if (['investment', 'amount'].includes(prop)) {
      return /^(金额|投资金额|总投资|合同金额|报价)[。.:：]*$/.test(compact)
    }
    if (prop === 'location') {
      return /^(项目地点|建设地点|工程地点|项目位置)[。.:：]*$/.test(compact)
    }
    return false
  }

  function isOutlineGeneratingStatus(status) {
    return String(status || '').toUpperCase() === 'OUTLINE_GENERATING'
  }

  function isDocumentGeneratingStatus(status) {
    return ['OUTLINE_GENERATING', 'CONTENT_GENERATING', 'FULL_GENERATING', 'REGENERATING', 'GENERATING'].includes(String(status || '').toUpperCase())
  }

  function resumeOutlinePolling(forceDocId) {
    clearInterval(outlineTimer)
    const docId = forceDocId || currentDoc.value?.id
    if (!docId) return
    if (!forceDocId && !isOutlineGeneratingStatus(currentDoc.value?.status)) return

    const tick = async () => {
      if (document.hidden) return
      try {
        if (currentDoc.value?.id && String(currentDoc.value.id) !== String(docId)) {
          clearInterval(outlineTimer)
          outlineTimer = null
          return
        }
        const data = await getDocument(docId)
        applyDoc(data, { skipOutlinePolling: true })
        await loadDocuments()
        if (!isOutlineGeneratingStatus(data?.status)) {
          clearInterval(outlineTimer)
          outlineTimer = null
          if ((data?.outlines || []).length) {
            const leaves = flattenLeaves(data?.outlines || [])
            const needWordPreset = leaves.length > 0 && leaves.some((node) => !Number(node?.targetWordCount || node?.wordCount || 0))
            if (needWordPreset && !wordPresetDialogVisible.value) {
              resetWordPresetSelection()
              wordPresetDialogVisible.value = true
              ElMessage.success('大纲生成完成，请设置篇幅')
            } else {
              ElMessage.success('大纲生成完成')
            }
          } else {
            ElMessage.error('大纲生成失败或超时，请稍后重试')
          }
        }
      } catch (e) {
        // 轮询只负责刷新状态，接口异常由全局请求拦截器提示，这里避免定时器抛出未捕获异常。
      }
    }

    outlineTimer = setInterval(tick, 3000)
  }

  function formatDocumentGenerateCheckIssues(data = {}) {
    const failed = Array.isArray(data.items) ? data.items.filter((item) => !item.passed) : []
    const lines = failed.map((item) => `【${item.name || item.key}】${item.message || '未通过'}`)
    const warnings = Array.isArray(data.warnings) ? data.warnings : []
    const suggestions = Array.isArray(data.suggestions) ? data.suggestions : []
    return [
      `准备度：${data.percent || 0}%`,
      ...lines,
      ...warnings.map((item) => `提醒：${item}`),
      ...suggestions.map((item) => `建议：${item}`)
    ].filter(Boolean).join('\n') || '当前资料未达到生成条件，请先补充必填信息。'
  }

  async function onGenerateOutline() {
    await loadGlobalRunningTask()
    if (hasOtherAiTaskRunning.value) {
      ElMessage.warning('已有其他AI生成任务正在执行，请等待完成后再操作')
      return
    }
    if (isOperationLocked.value && !isOutlineGenerating.value) return
    if (!currentDoc.value?.id) return
    if (isOutlineGenerating.value) {
      ElMessage.warning('大纲正在生成中，请等待完成')
      return
    }
    if (requiredMissingFields().length) {
      await tryAutoFillFromLatestParseTask({ force: true, silent: true })
    }
    if (!validateForm()) return
    outlineLoading.value = true
    try {
      await saveDocumentForm(currentDoc.value.id, buildFormPayload())
      const docId = currentDoc.value.id
      const generateCheck = await getDocumentGenerateCheck(docId)
      if (generateCheck && generateCheck.canGenerateOutline === false) {
        await ElMessageBox.alert(formatDocumentGenerateCheckIssues(generateCheck), '生成前检查未通过', { type: 'warning' })
        return
      }
      const regenerateOutline = hasOutline.value
      if (regenerateOutline) {
        try {
          await ElMessageBox.confirm('当前文档已经生成大纲，重新生成会在新大纲生成成功后覆盖旧大纲及旧章节正文，是否继续？', '重新生成大纲确认', {
            type: 'warning',
            confirmButtonText: '重新生成',
            cancelButtonText: '取消'
          })
        } catch {
          return
        }
      }
      resumeOutlinePolling(docId)
      const data = await generateDocumentOutline(docId, {
        outlineMode: 'DOCUMENT',
        writingStyle: form.writingStyle,
        outlineRequirement: form.outlineRequirement,
        extraRequirement: form.outlineRequirement,
        writingDirection: form.overallWritingRequirement,
        targetTotalWordCount: Number(form.targetTotalWordCount || 0) > 0 ? Number(form.targetTotalWordCount) : null,
        leafMinWordCount: null,
        leafMaxWordCount: null,
        regenerate: regenerateOutline
      })
      applyDoc(data)
      if (isOutlineGeneratingStatus(data?.status)) {
        resumeOutlinePolling(docId)
        ElMessage.success('大纲生成已开始，完成后会自动刷新')
        return
      }
      await refreshCurrent()
      await loadDocuments()
      formDialogVisible.value = false
      const latestLeaves = flattenLeaves(currentDoc.value?.outlines || data?.outlines || [])
      const needWordPreset = latestLeaves.length > 0 && latestLeaves.some((node) => !Number(node?.targetWordCount || node?.wordCount || 0))
      if (needWordPreset) {
        resetWordPresetSelection()
        wordPresetDialogVisible.value = true
        ElMessage.success('大纲已生成，请设置篇幅')
      } else {
        wordPresetDialogVisible.value = false
        ElMessage.success('长文档大纲已生成，系统已按目标总字数分配章节篇幅')
      }
    } finally {
      outlineLoading.value = false
    }
  }

  function resetWordPresetSelection() {
    wordPreset.mode = ''
    wordPreset.wordCount = null
  }

  async function confirmDocumentWordPreset() {
    await onApplyWordPreset({ fromDialog: true })
  }

  async function onApplyWordPreset(options = {}) {
    if (isOperationLocked.value) return
    if (!currentDoc.value?.id) return
    if (!wordPresetSelectionValid.value) {
      ElMessage.warning('请先选择章节字数')
      return
    }
    wordSaving.value = true
    try {
      const data = await applyDocumentWordCountPreset(currentDoc.value.id, wordPreset)
      applyDoc(data)
      await loadDocuments()
      if (options?.fromDialog) wordPresetDialogVisible.value = false
      ElMessage.success('篇幅已应用')
    } finally {
      wordSaving.value = false
    }
  }

  async function onGenerateFull(rewrite) {
    await loadGlobalRunningTask()
    if (hasOtherAiTaskRunning.value) {
      ElMessage.warning('已有其他AI生成任务正在执行，请等待完成后再操作')
      return
    }
    if (isOperationLocked.value) return
    if (!currentDoc.value?.id) return
    await saveDocumentForm(currentDoc.value.id, buildFormPayload())
    const generateCheck = await getDocumentGenerateCheck(currentDoc.value.id)
    if (generateCheck && generateCheck.canGenerateFull === false) {
      await ElMessageBox.alert(formatDocumentGenerateCheckIssues(generateCheck), '生成前检查未通过', { type: 'warning' })
      return
    }
    fullGenerating.value = true
    try {
      const task = rewrite
        ? await rewriteDocumentFull(currentDoc.value.id, { writingStyle: form.writingStyle })
        : await generateDocumentFull(currentDoc.value.id, { writingStyle: form.writingStyle })
      runningTask.value = task
      globalRunningTask.value = task
      pollGenerationTask(task.id)
    } finally {
      fullGenerating.value = false
    }
  }

  async function onRetryFailedDocumentSections() {
    await loadGlobalRunningTask()
    if (hasOtherAiTaskRunning.value) {
      ElMessage.warning('已有其他AI生成任务正在执行，请等待完成后再操作')
      return
    }
    if (!canRetryDocumentFailedSections.value) return
    if (!currentDoc.value?.id) return
    fullGenerating.value = true
    try {
      await saveDocumentForm(currentDoc.value.id, buildFormPayload())
      const task = await retryFailedDocumentSections(currentDoc.value.id, { writingStyle: form.writingStyle })
      runningTask.value = task
      globalRunningTask.value = task
      pollGenerationTask(task.id)
      ElMessage.info('已开始重试失败章节')
    } catch (e) {
      notifyRequestError(e, '重试失败章节失败')
    } finally {
      fullGenerating.value = false
    }
  }

  async function onCancelDocumentTask() {
    const taskId = runningTask.value?.id
    if (!taskId || taskCanceling.value) return
    try {
      await ElMessageBox.confirm('确认取消当前AI文档生成任务？已经发出的模型请求会在返回后停止保存和继续生成。', '取消生成任务', {
        type: 'warning',
        confirmButtonText: '确认取消',
        cancelButtonText: '继续生成'
      })
    } catch (e) {
      return
    }
    taskCanceling.value = true
    try {
      const canceled = await cancelDocumentGenerationTask(taskId)
      runningTask.value = canceled
      globalRunningTask.value = null
      clearInterval(taskTimer)
      taskTimer = null
      await refreshCurrentLight({ skipOutlinePolling: true, skipTaskPolling: true, preferLatestGenerated: true })
      await loadDocuments()
      ElMessage.warning(normalizeStreamErrorMessage(canceled?.message, '生成任务已取消'))
    } catch (e) {
      notifyRequestError(e, '取消任务失败，请稍后重试或到任务中心查看状态')
    } finally {
      taskCanceling.value = false
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
      if (document.hidden) return
      try {
        const task = await getDocumentGenerationTask(taskId)
        const status = String(task.status || '').toUpperCase()
        const taskDocId = String(task?.solutionId || task?.documentId || task?.bizId || '')
        const currentDocId = String(currentDoc.value?.id || '')
        const isTaskForCurrentDoc = !taskDocId || !currentDocId || taskDocId === currentDocId
        globalRunningTask.value = ['WAITING', 'RUNNING'].includes(status) ? task : null
        runningTask.value = isTaskForCurrentDoc ? task : (currentDoc.value?.runningTask || null)

        // 后台生成任务可以继续轮询，但用户切换到其他文档查看时，不要用该任务刷新/污染当前文档详情。
        if (isTaskForCurrentDoc) {
          await refreshCurrentLight({ docId: currentDocId || taskDocId, skipOutlinePolling: true, skipTaskPolling: true, preferLatestGenerated: true })
        }
        await loadDocuments()

        if (!['WAITING', 'RUNNING'].includes(status)) {
          clearInterval(taskTimer)
          taskTimer = null
          runningTask.value = isTaskForCurrentDoc ? task : null
          if (isTaskForCurrentDoc) {
            await refreshCurrentLight({ docId: currentDocId || taskDocId, skipOutlinePolling: true, skipTaskPolling: true, preferLatestGenerated: true })
          }
          await loadDocuments()
          if (status === 'SUCCESS') ElMessage.success('全文生成完成')
          else if (status === 'PARTIAL') ElMessage.warning('生成完成，但存在失败章节，请检查后重试')
          else if (status === 'FAILED') ElMessage.error('全文生成失败，请稍后重试或联系管理员')
        }
      } catch (e) {
        // 轮询异常不打断页面，避免短暂网络抖动导致实时刷新停止。
      }
    }
    tick()
    taskTimer = setInterval(tick, 2500)
  }

  function selectNode(node) {
    // 生成中也允许查看已生成章节或切换章节；保存/重写等写操作仍由按钮锁定。
    activeNode.value = node
    sectionDraft.value = node?.section?.content || ''
  }

  async function onRegenerateSection() {
    await loadGlobalRunningTask()
    if (hasOtherAiTaskRunning.value) {
      ElMessage.warning('已有其他AI生成任务正在执行，请等待完成后再操作')
      return
    }
    if (isOperationLocked.value) return
    if (!activeNode.value?.id) return
    sectionGenerating.value = true
    sectionDraft.value = ''
    try {
      await streamSection(activeNode.value.id, {
        title: activeNode.value.title,
        targetWordCount: activeNode.value.targetWordCount || wordPreset.wordCount || 900,
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
    if (isOperationLocked.value) return
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

  async function chooseExportOptions() {
    return await openWordExportDialog({
      format: 'word',
      styleCode: 'BID_OFFICIAL',
      showFormat: true
    })
  }

  async function onExport() {
    if (isOperationLocked.value) return
    if (!currentDoc.value?.id) return
    const confirmed = await confirmDocumentExportBeforeDownload()
    if (!confirmed) return
    const exportOptions = await chooseExportOptions()
    if (!exportOptions) return
    const format = exportOptions.format
    const request = {
      styleCode: exportOptions.styleCode,
      generateCatalog: true,
      beautifyTable: true,
      keepBold: true,
      pageNumber: true
    }
    exportLoading.value = true
    try {
      const started = await startDocumentExportTask(currentDoc.value.id, format, request)
      const task = await waitDocumentExportTask(started?.id)
      if (!task?.fileId) {
        ElMessage.warning('导出成功，但未返回文件ID，请到下载中心查看')
        return
      }
      const blob = await downloadFileResource(task.fileId)
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = task.originalName || `${currentDoc.value.solutionName || 'AI文档'}-导出.${format === 'pdf' ? 'pdf' : 'docx'}`
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


  async function confirmDocumentExportBeforeDownload() {
    if (!currentDoc.value?.id) return false
    let check = null
    try {
      check = await getDocumentExportCheck(currentDoc.value.id)
    } catch (e) {
      try {
        await ElMessageBox.confirm('服务端导出前检查暂不可用。请确认文档正文完整后再导出。', '导出前检查', {
          type: 'warning',
          confirmButtonText: '继续导出',
          cancelButtonText: '返回处理'
        })
        return true
      } catch (ignored) {
        return false
      }
    }
    const errors = check?.errors || []
    const warnings = check?.warnings || []
    const suggestions = check?.suggestions || []
    if (check?.canExport === false) {
      await ElMessageBox.alert(
        h('div', { class: 'doc-export-check-message' }, [
          h('p', { class: 'doc-export-check-title' }, `导出前检查未通过（完成度 ${check.percent || 0}%）`),
          h('ul', { class: 'doc-export-check-list' }, (errors.length ? errors : warnings).map((item, index) => h('li', { key: index }, item))),
          ...(suggestions.length ? [h('p', { class: 'doc-export-check-tip' }, suggestions.join('；'))] : [])
        ]),
        '导出前检查',
        { type: 'warning', confirmButtonText: '返回处理' }
      )
      return false
    }
    if (!warnings.length) return true
    try {
      await ElMessageBox.confirm(
        h('div', { class: 'doc-export-check-message' }, [
          h('p', { class: 'doc-export-check-title' }, `导出前检查发现以下问题（完成度 ${check.percent || 0}%）`),
          h('ul', { class: 'doc-export-check-list' }, warnings.map((item, index) => h('li', { key: index }, item))),
          h('p', { class: 'doc-export-check-tip' }, suggestions.length ? suggestions.join('；') : '可以返回处理后再导出，也可以继续导出当前版本。')
        ]),
        '导出前检查',
        { type: 'warning', confirmButtonText: '继续导出', cancelButtonText: '返回处理' }
      )
      return true
    } catch (e) {
      return false
    }
  }

  async function waitDocumentExportTask(exportId) {
    if (!exportId) throw new Error('导出任务创建失败，请稍后重试')
    for (let i = 0; i < 180; i += 1) {
      const task = await getDocumentExportTask(exportId)
      const status = String(task?.status || '').toLowerCase()
      if (status === 'success') return task
      if (status === 'failed') throw new Error(normalizeStreamErrorMessage(task?.errorMsg, '导出失败，请稍后重试'))
      await sleep(i < 6 ? 2000 : 5000)
    }
    throw new Error('导出任务仍在执行，请稍后到下载中心查看')
  }

  function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }

  async function onDelete(item) {
    if (isOperationLocked.value) return
    await ElMessageBox.confirm(`确定删除“${item.solutionName || ''}”吗？删除后可在回收站恢复。`, '删除确认', { type: 'warning' })
    await deleteDocument(item.id)
    // 删除成功后立即从左侧列表移除；该记录后续只在回收站展示。
    documents.value = documents.value.filter((doc) => String(doc.id || '') !== String(item.id || ''))
    if (currentDoc.value?.id === item.id) resetWorkspace()
    await loadDocuments()
    ElMessage.success('已删除，记录已进入回收站')
  }

  function isDocumentLeafDone(node) {
    if (!node) return false
    const status = String(node?.contentStatus || node?.section?.generateStatus || '').toUpperCase()
    if (['GENERATING', 'STALE', 'FAILED', 'LOCKED'].includes(status)) return false
    return status === 'SUCCESS' || !!String(node?.section?.content || '').trim()
  }

  function isDocumentLeafRetryable(node) {
    if (!node || isDocumentLeafDone(node)) return false
    const status = String(node?.contentStatus || node?.section?.generateStatus || '').toUpperCase()
    const partialStatus = ['CONTENT_PARTIAL', 'CONTENT_GENERATING'].includes(String(currentDoc.value?.status || '').toUpperCase())
    return ['FAILED', 'STALE', 'GENERATING', 'LOCKED'].includes(status) || (documentDoneLeafCount.value > 0 && partialStatus)
  }

  function briefDocumentNodeList(nodes, limit = 5) {
    const list = (nodes || []).slice(0, limit).map((node) => `「${node?.title || '未命名章节'}」`)
    const remain = Math.max(0, (nodes || []).length - limit)
    return remain > 0 ? `${list.join('、')} 等 ${nodes.length} 个章节` : list.join('、')
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

  return {
    router, loading, appendLoading, documentTypes, documents,
    currentDoc, detailLoading, saving, outlineLoading, wordSaving,
    wordPresetDialogVisible, fullGenerating, taskCanceling, exportLoading, sectionGenerating,
    sectionSaving, formDialogVisible, parseTask, autoFillRunning, autoFillDoneTaskIds,
    runningTask, globalRunningTask, activeNode, sectionDraft, docQualityCheckVisible,
    docQualityCheckLoading, docQualityCheckData, docWordCountVisible, docWordCountLoading, docWordCountStats,
    docDuplicateCheckData, docDuplicateCompressing, docReviewVisible, docReviewLoading, docReviewResult,
    docConsistencyPackage, query, docListScrollbar, documentPager, form,
    formData, wordPreset, wordPresetSelectionValid, wordOptions, searchTimer,
    parseTimer, taskTimer, outlineTimer, globalTaskTimer, currentType,
    currentFields, outlineTree, leafNodes, documentDoneLeafCount, retryableDocumentLeaves,
    retryableDocumentTitleText, canRetryDocumentFailedSections, hasOutline, isOutlineGenerating, hasRunningTask,
    isGlobalAiTaskRunning, isGlobalAiTaskForCurrentDoc, hasOtherAiTaskRunning, isOperationLocked, canExport,
    progressStatus, sectionPromptText, documentNoMore, docQualityItems, docQualityStatCards,
    docDuplicateItems, activeStep, startGlobalTaskPolling, loadGlobalRunningTask, loadTypes,
    loadDocuments, isVisibleDocument, reloadDocumentsFirstPage, onSearchInput, onDocumentListScroll,
    resetWorkspace, createNew, loadDetail, openFormDialog, shouldOpenFormDialog,
    refreshCurrent, normalizeQualityCheckPayload, safePercent, qualityLevelTagType, qualityProgressStatus,
    issueSeverityTagType, qualityRowClassName, wordStatusTagType, duplicateSectionsText, openDocumentQualityCheckDrawer,
    loadDocumentQualityCheck, openDocumentWordCountDrawer, loadDocumentWordCountStats, onCompressDocumentDuplicates, openDocumentReviewDrawer,
    runDocumentAiReviewNow, refreshCurrentLight, applyDoc, isBasicDuplicateField, ensureCurrentFields,
    fillFormDataFromSummary, validateForm, buildFormPayload, saveFormOnly, onSaveFormDialog,
    onReferenceChange, resumeParsePolling, pollParseTask, autoFillAfterParseSuccess, latestSuccessfulParseTaskId,
    shouldAutoFillCurrentDoc, scheduleAutoFillForCurrentDoc, tryAutoFillFromLatestParseTask, requiredMissingFields, isWeakFormValue,
    isOutlineGeneratingStatus, isDocumentGeneratingStatus, resumeOutlinePolling, formatDocumentGenerateCheckIssues, onGenerateOutline,
    resetWordPresetSelection, confirmDocumentWordPreset, onApplyWordPreset, onGenerateFull, onRetryFailedDocumentSections,
    onCancelDocumentTask, resumeTaskPolling, pollGenerationTask, selectNode, onRegenerateSection,
    onSaveSection, chooseExportOptions, onExport, confirmDocumentExportBeforeDownload, waitDocumentExportTask,
    sleep, onDelete, isDocumentLeafDone, isDocumentLeafRetryable, briefDocumentNodeList,
    flattenLeaves, statusLabel, statusTagType, docTypeLabel, fallbackTypes,
    AiReviewDrawer, AiModelTrace, OutlineNodeList, ArrowLeft, Document,
    InfoFilled, MagicStick, Plus, Refresh, Search,
    UploadFilled
  }
}
