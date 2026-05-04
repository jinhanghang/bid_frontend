<template>
  <div class="page">
    <div class="page-body workbench-layout">
      <div class="card workbench-card">
        <div class="section-head">
          <div>
            <div class="section-title">AI生成工作台</div>
            <div class="section-desc">
              当前工作台按业务流程生成标书：先选择标书项目，系统自动带出项目资料，再选择模板和生成要求。
            </div>
          </div>
          <el-button class="table-icon-btn" text :icon="Refresh" @click="reloadAllOptions" />
        </div>

        <el-steps :active="activeStep" finish-status="success" class="flow-steps">
          <el-step title="选择项目" />
          <el-step title="确认模板" />
          <el-step title="生成查看" />
        </el-steps>

        <el-form label-width="112px" class="workbench-form">
          <el-form-item label="标书项目" required>
            <el-select
              v-model="selectedProjectId"
              filterable
              remote
              clearable
              reserve-keyword
              :remote-method="remoteSearchProjects"
              :loading="projectLoading"
              placeholder="请选择要生成标书的项目"
              style="width: 100%"
              @change="onProjectChange"
            >
              <el-option
                v-for="item in projectOptions"
                :key="item.id"
                :label="projectOptionLabel(item)"
                :value="item.id"
              />
            </el-select>
            <div class="form-tip">
              不再手填业务ID。选择项目后，项目名称、编号、招标单位、预算、工期等信息会自动带入。
            </div>
          </el-form-item>

          <div v-if="selectedProject" class="project-summary">
            <div class="summary-item">
              <span>项目名称</span>
              <strong>{{ selectedProject.projectName || '-' }}</strong>
            </div>
            <div class="summary-item">
              <span>项目编号</span>
              <strong>{{ selectedProject.projectCode || '-' }}</strong>
            </div>
            <div class="summary-item">
              <span>项目类型</span>
              <strong>{{ projectTypeLabel(selectedProject.projectType) }}</strong>
            </div>
            <div class="summary-item">
              <span>招标单位</span>
              <strong>{{ selectedProject.clientName || '-' }}</strong>
            </div>
            <div class="summary-item">
              <span>投标单位</span>
              <strong>{{ selectedProject.bidderName || '-' }}</strong>
            </div>
            <div class="summary-item">
              <span>预算金额</span>
              <strong>{{ formatMoney(selectedProject.budgetAmount) }}</strong>
            </div>
            <div class="summary-item">
              <span>工期天数</span>
              <strong>{{ selectedProject.periodDays || '-' }}</strong>
            </div>
            <div class="summary-item">
              <span>当前状态</span>
              <strong>{{ projectStatusLabel(selectedProject.status) }}</strong>
            </div>
          </div>

          <el-form-item label="Prompt模板">
            <el-select
              v-model="generateForm.promptTemplateId"
              clearable
              filterable
              placeholder="不选则使用项目绑定模板或系统默认模板"
              style="width: 100%"
            >
              <el-option
                v-for="item in bidPromptTemplates"
                :key="item.id"
                :label="promptOptionLabel(item)"
                :value="item.id"
              />
            </el-select>
            <div class="form-tip">
              这里只展示标书相关模板。项目本身绑定了模板时，会自动默认选中。
            </div>
          </el-form-item>

          <el-form-item label="引用知识库">
            <div class="knowledge-box">
              <el-switch
                v-model="generateForm.useKnowledge"
                active-text="引用"
                inactive-text="不引用"
              />
              <el-select
                v-model="generateForm.knowledgeIds"
                multiple
                clearable
                filterable
                :disabled="!generateForm.useKnowledge"
                placeholder="请选择要引用的知识库"
                style="width: 100%; margin-top: 10px"
              >
                <el-option
                  v-for="item in knowledgeBases"
                  :key="item.id"
                  :label="item.kbName"
                  :value="item.id"
                />
              </el-select>
              <div class="form-tip">
                当前你还没接完整向量检索时，建议保持“不引用”。后面向量检索接好后再打开。
              </div>
            </div>
          </el-form-item>

          <el-form-item label="生成要求">
            <el-input
              v-model="generateForm.extraRequirement"
              type="textarea"
              :rows="5"
              maxlength="2000"
              show-word-limit
              placeholder="例如：重点突出技术方案、实施计划、售后服务、人员配置；语言正式，章节完整。"
            />
          </el-form-item>

          <el-collapse v-model="advancedPanels" class="advanced-collapse">
            <el-collapse-item title="高级参数，一般不用改" name="advanced">
              <el-row :gutter="12">
                <el-col :span="12">
                  <el-form-item label="温度参数">
                    <el-input-number
                      v-model="generateForm.temperature"
                      :min="0"
                      :max="2"
                      :step="0.1"
                      :precision="1"
                      style="width: 100%"
                    />
                  </el-form-item>
                </el-col>
                <el-col :span="12">
                  <el-form-item label="最大Token">
                    <el-input-number
                      v-model="generateForm.maxTokens"
                      :min="1000"
                      :max="50000"
                      :step="1000"
                      style="width: 100%"
                    />
                  </el-form-item>
                </el-col>
              </el-row>
            </el-collapse-item>
          </el-collapse>

          <div class="form-actions">
            <el-button
              type="primary"
              :icon="MagicStick"
              :loading="generating"
              :disabled="!canGenerate"
              @click="submitGenerate"
            >
              开始生成
            </el-button>
            <el-button @click="resetGenerateForm">重置参数</el-button>
            <el-button v-if="lastResultId" type="success" plain @click="goResultPage">查看完整结果</el-button>
          </div>
        </el-form>
      </div>

      <div class="card result-card">
        <div class="result-head">
          <div>
            <div class="section-title">生成结果</div>
            <div class="section-desc">
              生成完成后可在这里预览，也可进入“生成结果”页面查看历史结果。
            </div>
          </div>
          <div class="result-actions">
            <el-button :icon="View" :disabled="!lastResultId" @click="goResultPage">结果详情</el-button>
            <el-button :icon="CopyDocument" :disabled="!result.contentMarkdown" @click="copyMarkdown">复制Markdown</el-button>
            <el-button :icon="Download" :disabled="!lastResultId" :loading="exportingWord" @click="handleExportWord">导出Word</el-button>
            <el-button :icon="Download" :disabled="!lastResultId" :loading="exportingMarkdown" @click="handleExportMarkdown">导出Markdown</el-button>
          </div>
        </div>

        <div v-if="result.resultId" class="result-meta">
          <span>结果ID：{{ result.resultId }}</span>
          <span>任务ID：{{ result.taskId || '-' }}</span>
          <span>状态：{{ result.status || '-' }}</span>
          <span>模型：{{ result.modelProvider || '-' }} / {{ result.modelName || '-' }}</span>
        </div>

        <div v-if="generating" class="result-loading">
          <el-icon class="is-loading"><Loading /></el-icon>
          <span>AI 正在生成，请稍等...</span>
        </div>

        <div v-else-if="result.contentHtml" class="markdown-box result-content" v-html="result.contentHtml"></div>
        <div v-else-if="result.contentMarkdown" class="markdown-box result-content">{{ result.contentMarkdown }}</div>
        <el-empty v-else description="请选择项目后开始生成" />
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { CopyDocument, Download, Loading, MagicStick, Refresh, View } from '@element-plus/icons-vue'
import { createCrudApi } from '@/api/crud'
import { downloadExportFile, exportMarkdown, exportWord, generateBidProject } from '@/api/ai'
import { getBidProject, pageBidProjects } from '@/api/bidProject'
import { listKnowledgeBases } from '@/api/knowledge'

const route = useRoute()
const router = useRouter()

const projectLoading = ref(false)
const generating = ref(false)
const exportingWord = ref(false)
const exportingMarkdown = ref(false)
const projectOptions = ref([])
const promptTemplates = ref([])
const knowledgeBases = ref([])
const selectedProjectId = ref(null)
const selectedProject = ref(null)
const advancedPanels = ref([])
const result = reactive({})

const generateForm = reactive({
  promptTemplateId: null,
  useKnowledge: false,
  knowledgeIds: [],
  extraRequirement: '',
  temperature: 0.7,
  maxTokens: 8192
})

const bidPromptTemplates = computed(() => {
  return promptTemplates.value.filter((item) => {
    if (Number(item.status) === 0) return false
    const scene = String(item.scene || '').toUpperCase()
    return !scene || scene.includes('BID')
  })
})

const activeStep = computed(() => {
  if (result.resultId) return 3
  if (selectedProject.value) return 2
  return 1
})

const canGenerate = computed(() => {
  return Boolean(selectedProjectId.value && !generating.value)
})

const lastResultId = computed(() => result.resultId || null)

onMounted(async () => {
  await reloadAllOptions()
  const queryProjectId = route.query.projectId
  if (queryProjectId) {
    selectedProjectId.value = Number(queryProjectId)
    await onProjectChange(selectedProjectId.value)
  }
})

async function reloadAllOptions() {
  await Promise.all([
    loadProjects(''),
    loadPromptTemplates(),
    loadKnowledgeBases()
  ])
}

async function loadProjects(keyword = '') {
  projectLoading.value = true
  try {
    const res = await pageBidProjects({
      current: 1,
      size: 50,
      pageNum: 1,
      pageSize: 50,
      keyword: keyword || undefined
    })
    projectOptions.value = res?.records || []
  } finally {
    projectLoading.value = false
  }
}

function remoteSearchProjects(keyword) {
  loadProjects(keyword)
}

async function loadPromptTemplates() {
  try {
    promptTemplates.value = await createCrudApi('/prompt-template').list()
  } catch (e) {
    promptTemplates.value = []
  }
}

async function loadKnowledgeBases() {
  try {
    knowledgeBases.value = await listKnowledgeBases({ status: 1 })
  } catch (e) {
    knowledgeBases.value = []
  }
}

async function onProjectChange(projectId) {
  clearResult()

  if (!projectId) {
    selectedProject.value = null
    resetGenerateForm()
    return
  }

  const detail = await getBidProject(projectId)
  selectedProject.value = detail

  if (!projectOptions.value.some((item) => String(item.id) === String(detail.id))) {
    projectOptions.value.unshift(detail)
  }

  generateForm.promptTemplateId = detail.promptTemplateId || null
  generateForm.knowledgeIds = parseKnowledgeIds(detail)
  generateForm.useKnowledge = false
  generateForm.extraRequirement = buildDefaultRequirement(detail)
}

function parseKnowledgeIds(project) {
  if (Array.isArray(project?.knowledgeIdList)) {
    return project.knowledgeIdList.map(Number).filter((id) => Number.isFinite(id))
  }

  if (Array.isArray(project?.knowledgeIds)) {
    return project.knowledgeIds.map(Number).filter((id) => Number.isFinite(id))
  }

  const raw = project?.knowledgeIds
  if (typeof raw === 'string' && raw.trim()) {
    try {
      const arr = JSON.parse(raw)
      return Array.isArray(arr) ? arr.map(Number).filter((id) => Number.isFinite(id)) : []
    } catch (e) {
      return []
    }
  }

  return []
}

function buildDefaultRequirement(project) {
  const name = project?.projectName || ''
  if (!name) return ''
  return `请围绕“${name}”生成一份结构完整、语言正式、可继续编辑的投标文件草稿。重点突出项目理解、技术方案、实施计划、质量保障、售后服务和企业优势。`
}

async function submitGenerate() {
  if (!selectedProjectId.value) {
    ElMessage.warning('请先选择标书项目')
    return
  }

  if (generateForm.useKnowledge && !generateForm.knowledgeIds.length) {
    ElMessage.warning('已开启引用知识库，请至少选择一个知识库')
    return
  }

  generating.value = true
  clearResult()

  try {
    const payload = {
      promptTemplateId: generateForm.promptTemplateId || undefined,
      useKnowledge: Boolean(generateForm.useKnowledge),
      knowledgeIds: generateForm.useKnowledge ? generateForm.knowledgeIds : [],
      variables: {},
      extraRequirement: generateForm.extraRequirement || undefined,
      temperature: toNumberOrUndefined(generateForm.temperature),
      maxTokens: toNumberOrUndefined(generateForm.maxTokens)
    }

    const res = await generateBidProject(selectedProjectId.value, payload)
    Object.assign(result, res || {})
    ElMessage.success('生成完成')
  } finally {
    generating.value = false
  }
}

function resetGenerateForm() {
  generateForm.promptTemplateId = selectedProject.value?.promptTemplateId || null
  generateForm.useKnowledge = false
  generateForm.knowledgeIds = selectedProject.value ? parseKnowledgeIds(selectedProject.value) : []
  generateForm.extraRequirement = selectedProject.value ? buildDefaultRequirement(selectedProject.value) : ''
  generateForm.temperature = 0.7
  generateForm.maxTokens = 8192
}

function clearResult() {
  for (const key of Object.keys(result)) {
    delete result[key]
  }
}

function toNumberOrUndefined(value) {
  if (value === '' || value === null || value === undefined) return undefined
  const numberValue = Number(value)
  return Number.isFinite(numberValue) ? numberValue : undefined
}

async function copyMarkdown() {
  if (!result.contentMarkdown) {
    ElMessage.warning('暂无可复制内容')
    return
  }

  await navigator.clipboard.writeText(result.contentMarkdown)
  ElMessage.success('已复制Markdown内容')
}

async function handleExportWord() {
  if (!lastResultId.value) return

  exportingWord.value = true
  try {
    const file = await exportWord(lastResultId.value)
    ElMessage.success('Word导出成功')
    await openExportedFile(file)
  } finally {
    exportingWord.value = false
  }
}

async function handleExportMarkdown() {
  if (!lastResultId.value) return

  exportingMarkdown.value = true
  try {
    const file = await exportMarkdown(lastResultId.value)
    ElMessage.success('Markdown导出成功')
    await openExportedFile(file)
  } finally {
    exportingMarkdown.value = false
  }
}

async function openExportedFile(file) {
  if (!file?.id) {
    ElMessage.error('导出成功但没有返回文件ID，无法下载')
    return
  }

  const blob = await downloadExportFile(file.id)
  downloadBlob(blob, file.originalName || file.fileName || '导出文件')
}

function downloadBlob(blob, fileName) {
  const url = window.URL.createObjectURL(blob)
  const link = document.createElement('a')

  link.href = url
  link.download = sanitizeFileName(fileName)
  link.style.display = 'none'

  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)

  window.URL.revokeObjectURL(url)
}

function sanitizeFileName(fileName) {
  return String(fileName || '导出文件')
    .replace(/[\\/:*?"<>|]/g, '_')
    .trim() || '导出文件'
}

function goResultPage() {
  if (lastResultId.value) {
    router.push({ path: '/ai/results', query: { resultId: lastResultId.value } })
  } else {
    router.push('/ai/results')
  }
}

function projectOptionLabel(item) {
  const code = item.projectCode ? `【${item.projectCode}】` : ''
  const client = item.clientName ? ` - ${item.clientName}` : ''
  return `${code}${item.projectName || `项目#${item.id}`}${client}`
}

function promptOptionLabel(item) {
  const scene = item.scene ? `（${item.scene}）` : ''
  return `${item.name || `模板#${item.id}`}${scene}`
}

function projectStatusLabel(value) {
  const map = {
    DRAFT: '草稿',
    MATERIAL_READY: '资料已准备',
    GENERATING: '生成中',
    GENERATED: '已生成',
    EXPORTED: '已导出',
    ARCHIVED: '已归档',
    CANCELLED: '已取消',
    FAILED: '生成失败'
  }
  return map[value] || value || '-'
}

function projectTypeLabel(value) {
  const map = {
    CONSTRUCTION: '工程施工',
    GOODS: '货物采购',
    SERVICE: '服务采购',
    IT: '信息化项目',
    OTHER: '其他'
  }
  return map[value] || value || '-'
}

function formatMoney(value) {
  if (value === null || value === undefined || value === '') return '-'
  const number = Number(value)
  if (Number.isNaN(number)) return value
  return `¥ ${number.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}
</script>

<style scoped>
.workbench-layout {
  display: grid;
  grid-template-columns: minmax(520px, 0.9fr) minmax(0, 1.1fr);
  gap: 16px;
}

.workbench-card,
.result-card {
  padding: 18px;
  min-width: 0;
}

.section-head,
.result-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.section-title {
  font-size: 18px;
  font-weight: 800;
}

.section-desc {
  margin-top: 6px;
  color: var(--text-sub);
  line-height: 1.6;
  font-size: 13px;
}

.flow-steps {
  margin: 18px 0 8px;
}

.workbench-form {
  margin-top: 16px;
}

.project-summary {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
  margin: 8px 0 18px 112px;
  padding: 12px;
  border: 1px solid var(--border);
  border-radius: 12px;
  background: #f8fafc;
}

.summary-item {
  min-width: 0;
}

.summary-item span {
  display: block;
  margin-bottom: 4px;
  color: var(--text-sub);
  font-size: 12px;
}

.summary-item strong {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--text-main);
  font-size: 14px;
}

.knowledge-box {
  width: 100%;
}

.advanced-collapse {
  margin-left: 112px;
  margin-bottom: 16px;
  border-top: 0;
}

.form-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-left: 112px;
}

.result-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 8px;
}

.result-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin: 12px 0;
  color: var(--text-sub);
  font-size: 13px;
}

.result-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  min-height: 360px;
  color: var(--text-sub);
}

.result-content {
  height: calc(100vh - 230px);
  overflow: auto;
}

@media (max-width: 1180px) {
  .workbench-layout {
    grid-template-columns: 1fr;
  }

  .project-summary,
  .advanced-collapse,
  .form-actions {
    margin-left: 0;
  }
}

@media (max-width: 720px) {
  .project-summary {
    grid-template-columns: 1fr;
  }

  .section-head,
  .result-head {
    flex-direction: column;
  }

  .result-actions {
    justify-content: flex-start;
  }
}
</style>
