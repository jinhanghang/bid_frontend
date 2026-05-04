<template>
  <div class="page">
    <div class="page-body kb-page">
      <!-- 左侧：知识库列表 -->
      <div class="card card--table kb-left">
        <div class="list-head">
          <div class="list-head__left">
            <el-input
              v-model="keyword"
              class="filter-input"
              placeholder="按知识库名称 / 类型 / 企业名称自动查询"
              clearable
              @input="onKeywordInput"
            />
          </div>
          <div class="list-head__right">
            <el-button class="table-icon-btn" text :icon="Refresh" @click="loadBases" />
            <el-button type="primary" :icon="Plus" @click="openCreateBase">新建知识库</el-button>
          </div>
        </div>

        <el-table
          class="ui-table"
          :data="bases"
          border
          stripe
          height="calc(100vh - 224px)"
          highlight-current-row
          v-loading="baseLoading"
          @current-change="selectBase"
        >
          <el-table-column prop="kbName" label="知识库名称" min-width="190" show-overflow-tooltip />
          <el-table-column prop="enterpriseName" label="所属企业" min-width="150" show-overflow-tooltip />
          <el-table-column prop="kbType" label="类型" width="120">
            <template #default="{ row }">
              {{ kbTypeLabel(row.kbType) }}
            </template>
          </el-table-column>
          <el-table-column prop="fileCount" label="文件" width="70" align="center" />
          <el-table-column prop="chunkCount" label="切片" width="70" align="center" />
          <el-table-column prop="embeddingStatus" label="入库" width="90" align="center">
            <template #default="{ row }">
              <el-tag :type="embeddingStatusMap[Number(row.embeddingStatus)]?.type || 'info'" effect="light">
                {{ embeddingStatusMap[Number(row.embeddingStatus)]?.label || '未知' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="status" label="状态" width="90" align="center">
            <template #default="{ row }">
              <StatusTag :value="row.status" :map="enableMap" />
            </template>
          </el-table-column>
          <el-table-column label="操作" width="180" fixed="right">
            <template #default="{ row }">
              <div class="table-actions">
                <el-button link type="primary" @click.stop="openEditBase(row)">编辑</el-button>
                <el-button link type="warning" @click.stop="toggleBaseStatus(row)">
                  {{ Number(row.status) === 1 ? '停用' : '启用' }}
                </el-button>
                <el-button link type="danger" @click.stop="deleteBase(row)">删除</el-button>
              </div>
            </template>
          </el-table-column>
        </el-table>

        <PageFooterPager
          v-model:page="basePager.page"
          v-model:size="basePager.size"
          :total="basePager.total"
          @change="loadBases"
        />
      </div>

      <!-- 右侧：知识库详情和文件列表 -->
      <div class="card card--table kb-right">
        <template v-if="selectedBase">
          <div class="kb-header">
            <div class="kb-header__main">
              <div class="kb-title">{{ selectedBase.kbName }}</div>
              <div class="kb-sub">
                {{ kbTypeLabel(selectedBase.kbType) }}
                <span v-if="selectedBase.enterpriseName"> · {{ selectedBase.enterpriseName }}</span>
                <span> · {{ selectedBase.description || '暂无描述' }}</span>
              </div>
            </div>

            <div class="kb-header-actions">
              <el-button :icon="Search" @click="openSearchDialog">检索测试</el-button>
              <el-button :icon="ChatLineRound" @click="openAskDialog">知识问答</el-button>
              <el-button type="primary" :icon="Upload" @click="openUploadDialog">添加文件</el-button>
            </div>
          </div>

          <el-alert
            class="kb-tip"
            title="文件加入知识库后会自动触发：OSS存储 → 文档解析 → 文本切片 → Embedding向量化 → 可检索问答。解析失败时可点击“重新入库”。"
            type="success"
            show-icon
            :closable="false"
          />

          <el-table
            class="ui-table kb-file-table"
            :data="files"
            border
            stripe
            height="calc(100vh - 336px)"
            v-loading="fileLoading"
            empty-text="当前知识库还没有文件，请点击右上角“添加文件”"
          >
            <el-table-column prop="fileName" label="文件名" min-width="260" show-overflow-tooltip>
              <template #default="{ row }">
                <div class="file-name-cell">
                  <span class="file-icon">文</span>
                  <span class="file-name-text">{{ row.fileName || '-' }}</span>
                </div>
              </template>
            </el-table-column>

            <el-table-column prop="fileType" label="类型" width="80" align="center">
              <template #default="{ row }">
                {{ row.fileType || '-' }}
              </template>
            </el-table-column>

            <el-table-column prop="fileSize" label="大小" width="110" align="center">
              <template #default="{ row }">
                {{ formatFileSize(row.fileSize) }}
              </template>
            </el-table-column>

            <el-table-column label="文件状态" width="190">
              <template #default="{ row }">
                <div class="status-group">
                  <el-tag :type="parseStatusMap[Number(row.parseStatus)]?.type || 'info'" effect="light" size="small">
                    解析：{{ parseStatusMap[Number(row.parseStatus)]?.label || '未知' }}
                  </el-tag>
                  <el-tag :type="embeddingStatusMap[Number(row.embeddingStatus)]?.type || 'info'" effect="light" size="small">
                    向量：{{ embeddingStatusMap[Number(row.embeddingStatus)]?.label || '未知' }}
                  </el-tag>
                  <el-tooltip v-if="row.errorMsg" :content="row.errorMsg" placement="top">
                    <el-tag type="danger" effect="light" size="small">错误</el-tag>
                  </el-tooltip>
                </div>
              </template>
            </el-table-column>

            <el-table-column prop="chunkCount" label="切片" width="80" align="center">
              <template #default="{ row }">
                {{ row.chunkCount || 0 }}
              </template>
            </el-table-column>

            <el-table-column prop="createTime" label="添加时间" width="170" show-overflow-tooltip />

            <el-table-column label="操作" width="180" fixed="right">
              <template #default="{ row }">
                <div class="table-actions">
                  <el-button v-if="row.fileUrl" link type="primary" @click="openFile(row)">查看</el-button>
                  <el-button link type="success" @click="rebuildFile(row)">重新入库</el-button>
                  <el-button link type="danger" @click="deleteFile(row)">删除</el-button>
                </div>
              </template>
            </el-table-column>
          </el-table>
        </template>

        <el-empty v-else description="请先新建或选择一个知识库">
          <el-button type="primary" :icon="Plus" @click="openCreateBase">新建知识库</el-button>
        </el-empty>
      </div>
    </div>

    <!-- 新建 / 编辑知识库 -->
    <el-dialog
      v-model="baseDialog.visible"
      :title="baseDialog.isEdit ? '编辑知识库' : '新建知识库'"
      width="680px"
      destroy-on-close
    >
      <el-form ref="baseFormRef" :model="baseForm" :rules="baseRules" label-width="110px">
        <el-form-item v-if="canManagePlatform" label="所属企业" prop="enterpriseId">
          <el-select v-model="baseForm.enterpriseId" clearable filterable placeholder="请选择企业" style="width: 100%">
            <el-option v-for="item in enterprises" :key="item.id" :label="item.enterpriseName" :value="item.id" />
          </el-select>
        </el-form-item>

        <el-form-item label="知识库名称" prop="kbName">
          <el-input v-model="baseForm.kbName" placeholder="例如：企业资质库 / 项目招标资料库" />
        </el-form-item>

        <el-form-item label="知识库类型">
          <el-select v-model="baseForm.kbType" style="width: 100%">
            <el-option label="企业资料" value="company_profile" />
            <el-option label="企业资质" value="qualification" />
            <el-option label="案例业绩" value="case_study" />
            <el-option label="技术标准" value="tech_standard" />
            <el-option label="法律法规" value="laws" />
            <el-option label="其他" value="other" />
          </el-select>
        </el-form-item>

        <el-form-item label="描述">
          <el-input v-model="baseForm.description" type="textarea" :rows="4" placeholder="说明这个知识库主要放哪些资料" />
        </el-form-item>

        <el-form-item label="状态">
          <el-select v-model="baseForm.status" style="width: 100%">
            <el-option label="正常" :value="1" />
            <el-option label="停用" :value="0" />
          </el-select>
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="baseDialog.visible = false">取消</el-button>
        <el-button type="primary" @click="submitBase">保存</el-button>
      </template>
    </el-dialog>

    <!-- 添加文件：保留你现在这个上传方式，只是入口放在右上角 -->
    <el-dialog
      v-model="uploadDialog.visible"
      :title="`给「${selectedBase?.kbName || ''}」添加文件`"
      width="680px"
      destroy-on-close
    >
      <FileUploadBox
        v-if="selectedBase"
        module-type="knowledge_base"
        :biz-id="selectedBase.id"
        :private-flag="true"
        accept=".doc,.docx,.pdf,.xls,.xlsx,.txt"
        :max-size-mb="100"
        :max-count="5"
        @success="onKnowledgeFileUploaded"
      />

      <div class="form-tip" style="margin-top: 10px">
        文件上传成功后，系统会自动把文件加入当前知识库，并开始解析、切片和向量化。
      </div>
    </el-dialog>

    <!-- 知识库检索测试 -->
    <el-dialog v-model="searchDialog.visible" title="知识库检索测试" width="820px" destroy-on-close>
      <el-form label-width="90px">
        <el-form-item label="检索问题">
          <el-input
            v-model="searchForm.query"
            type="textarea"
            :rows="3"
            placeholder="例如：公司有哪些类似项目业绩？"
          />
        </el-form-item>
        <el-form-item label="返回数量">
          <el-input-number v-model="searchForm.topK" :min="1" :max="20" />
        </el-form-item>
      </el-form>

      <div class="dialog-actions">
        <el-button type="primary" :loading="searchDialog.loading" @click="submitSearch">开始检索</el-button>
      </div>

      <div v-if="searchResult.length" class="hit-list">
        <div v-for="item in searchResult" :key="item.chunkId" class="hit-card">
          <div class="hit-head">
            <span>相似度：{{ formatScore(item.score) }}</span>
            <span>{{ item.fileName || `文件#${item.knowledgeFileId}` }}</span>
          </div>
          <div class="hit-content">{{ item.content }}</div>
        </div>
      </div>

      <el-empty v-else description="暂无检索结果" />
    </el-dialog>

    <!-- 知识库问答 -->
    <el-dialog v-model="askDialog.visible" title="知识库问答" width="860px" destroy-on-close>
      <el-form label-width="90px">
        <el-form-item label="问题">
          <el-input
            v-model="askForm.question"
            type="textarea"
            :rows="3"
            placeholder="例如：根据企业资料，总结一下我们的核心优势"
          />
        </el-form-item>
        <el-form-item label="引用数量">
          <el-input-number v-model="askForm.topK" :min="1" :max="10" />
        </el-form-item>
      </el-form>

      <div class="dialog-actions">
        <el-button type="primary" :loading="askDialog.loading" @click="submitAsk">生成回答</el-button>
      </div>

      <div v-if="askAnswer" class="answer-box">
        <div class="answer-title">AI回答</div>
        <div class="answer-content">{{ askAnswer }}</div>
      </div>

      <div v-if="askReferences.length" class="hit-list">
        <div class="answer-title">引用片段</div>
        <div v-for="item in askReferences" :key="item.chunkId" class="hit-card">
          <div class="hit-head">
            <span>相似度：{{ formatScore(item.score) }}</span>
            <span>{{ item.fileName || `文件#${item.knowledgeFileId}` }}</span>
          </div>
          <div class="hit-content">{{ item.content }}</div>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { ChatLineRound, Plus, Refresh, Search, Upload } from '@element-plus/icons-vue'
import { useAuthStore } from '@/stores/auth'
import { listEnterprises } from '@/api/enterprise'
import FileUploadBox from '@/components/FileUploadBox.vue'
import PageFooterPager from '@/components/PageFooterPager.vue'
import StatusTag from '@/components/StatusTag.vue'
import { enableMap } from '@/config/statusMaps'
import {
  askKnowledge,
  createKnowledgeBase,
  createKnowledgeFile,
  deleteKnowledgeBase,
  deleteKnowledgeFile,
  pageKnowledgeBases,
  pageKnowledgeFiles,
  rebuildKnowledgeFile,
  searchKnowledge,
  updateKnowledgeBase,
  updateKnowledgeBaseStatus
} from '@/api/knowledge'

const auth = useAuthStore()

const ROLE_SUPER_ADMIN = 'SUPERADMIN'
const ROLE_PLATFORM_ADMIN = 'PLATFORMADMIN'

const baseLoading = ref(false)
const fileLoading = ref(false)
const keyword = ref('')
const bases = ref([])
const files = ref([])
const enterprises = ref([])
const selectedBase = ref(null)
const baseFormRef = ref()
const timer = ref(null)

const basePager = reactive({
  page: 1,
  size: 10,
  total: 0
})

const baseDialog = reactive({
  visible: false,
  isEdit: false,
  id: null
})

const uploadDialog = reactive({
  visible: false
})

const searchDialog = reactive({
  visible: false,
  loading: false
})

const askDialog = reactive({
  visible: false,
  loading: false
})

const searchForm = reactive({
  query: '',
  topK: 5
})

const askForm = reactive({
  question: '',
  topK: 5
})

const searchResult = ref([])
const askAnswer = ref('')
const askReferences = ref([])

const baseForm = reactive({
  enterpriseId: '',
  kbName: '',
  kbType: 'company_profile',
  description: '',
  status: 1
})

const currentRoleCodes = computed(() => normalizeRoleList(auth.user?.roles || auth.user?.roleCodes || []))
const canManagePlatform = computed(() => {
  return currentRoleCodes.value.includes(ROLE_SUPER_ADMIN) || currentRoleCodes.value.includes(ROLE_PLATFORM_ADMIN)
})

const baseRules = computed(() => {
  const rules = {
    kbName: [{ required: true, message: '请输入知识库名称', trigger: 'blur' }]
  }

  if (canManagePlatform.value) {
    rules.enterpriseId = [{ required: true, message: '请选择所属企业', trigger: 'change' }]
  }

  return rules
})

const parseStatusMap = {
  0: { label: '未解析', type: 'info' },
  1: { label: '处理中', type: 'warning' },
  2: { label: '成功', type: 'success' },
  3: { label: '失败', type: 'danger' }
}

const embeddingStatusMap = {
  0: { label: '未处理', type: 'info' },
  1: { label: '处理中', type: 'warning' },
  2: { label: '成功', type: 'success' },
  3: { label: '失败', type: 'danger' }
}

onMounted(() => {
  loadBases()
  loadEnterprises()
})

function normalizeRoleCode(value = '') {
  return String(value)
    .trim()
    .toUpperCase()
    .replace(/^ROLE[_-]?/, '')
    .replace(/[^A-Z0-9]/g, '')
}

function normalizeRoleList(values = []) {
  if (!Array.isArray(values)) return []
  return values.map((item) => {
    if (typeof item === 'string') return normalizeRoleCode(item)
    return normalizeRoleCode(item?.roleCode || item?.code || item?.authority || item?.name || '')
  }).filter(Boolean)
}

function kbTypeLabel(value) {
  const map = {
    company_profile: '企业资料',
    qualification: '企业资质',
    case_study: '案例业绩',
    tech_standard: '技术标准',
    laws: '法律法规',
    other: '其他'
  }
  return map[value] || value || '-'
}

function onKeywordInput() {
  clearTimeout(timer.value)
  timer.value = setTimeout(() => {
    basePager.page = 1
    loadBases()
  }, 300)
}

async function loadEnterprises() {
  if (!canManagePlatform.value) {
    enterprises.value = []
    return
  }

  try {
    enterprises.value = await listEnterprises({ status: 1 })
  } catch (e) {
    enterprises.value = []
  }
}

async function loadBases(selectId) {
  baseLoading.value = true
  try {
    const res = await pageKnowledgeBases({
      current: basePager.page,
      size: basePager.size,
      pageNum: basePager.page,
      pageSize: basePager.size,
      keyword: keyword.value || undefined
    })

    bases.value = res?.records || []
    basePager.total = Number(res?.total || 0)

    const next = selectId
      ? bases.value.find((item) => String(item.id) === String(selectId))
      : selectedBase.value
        ? bases.value.find((item) => String(item.id) === String(selectedBase.value.id))
        : bases.value[0]

    if (next) {
      selectBase(next)
    } else {
      selectedBase.value = null
      files.value = []
    }
  } finally {
    baseLoading.value = false
  }
}

function selectBase(row) {
  if (!row) return
  selectedBase.value = row
  loadFiles()
}

async function loadFiles() {
  if (!selectedBase.value?.id) return

  fileLoading.value = true
  try {
    const res = await pageKnowledgeFiles({
      current: 1,
      size: 200,
      pageNum: 1,
      pageSize: 200,
      knowledgeBaseId: selectedBase.value.id
    })

    files.value = res?.records || []
  } finally {
    fileLoading.value = false
  }
}

function resetBaseForm(row = {}) {
  baseForm.enterpriseId = row.enterpriseId || ''
  baseForm.kbName = row.kbName || ''
  baseForm.kbType = row.kbType || 'company_profile'
  baseForm.description = row.description || ''
  baseForm.status = row.status === 0 ? 0 : 1
}

function openCreateBase() {
  baseDialog.isEdit = false
  baseDialog.id = null
  resetBaseForm({})
  baseDialog.visible = true
}

function openEditBase(row) {
  baseDialog.isEdit = true
  baseDialog.id = row.id
  resetBaseForm(row)
  baseDialog.visible = true
}

async function submitBase() {
  await baseFormRef.value?.validate()

  const payload = {
    enterpriseId: baseForm.enterpriseId || null,
    kbName: baseForm.kbName,
    kbType: baseForm.kbType,
    description: baseForm.description,
    status: baseForm.status
  }

  let savedId = baseDialog.id

  if (baseDialog.isEdit) {
    await updateKnowledgeBase(baseDialog.id, payload)
    ElMessage.success('知识库已修改')
  } else {
    savedId = await createKnowledgeBase(payload)
    ElMessage.success('知识库已创建，现在可以添加文件')
  }

  baseDialog.visible = false
  await loadBases(savedId)
}

async function toggleBaseStatus(row) {
  const nextStatus = Number(row.status) === 1 ? 0 : 1
  const actionText = nextStatus === 1 ? '启用' : '停用'

  await ElMessageBox.confirm(`确认${actionText}知识库「${row.kbName}」吗？`, '提示', {
    type: nextStatus === 1 ? 'success' : 'warning'
  })

  await updateKnowledgeBaseStatus(row.id, { status: nextStatus })
  ElMessage.success(`${actionText}成功`)
  await loadBases(row.id)
}

async function deleteBase(row) {
  await ElMessageBox.confirm(`确定删除知识库「${row.kbName}」吗？如果下面已有文件，后端会拒绝删除。`, '删除确认', {
    type: 'warning'
  })

  await deleteKnowledgeBase(row.id)
  ElMessage.success('删除成功')

  if (selectedBase.value?.id === row.id) {
    selectedBase.value = null
    files.value = []
  }

  await loadBases()
}

function openUploadDialog() {
  if (!selectedBase.value?.id) {
    ElMessage.warning('请先选择知识库')
    return
  }

  uploadDialog.visible = true
}

async function onKnowledgeFileUploaded(file) {
  if (!selectedBase.value?.id) return

  const fileId = file?.id || file?.fileId
  if (!fileId) {
    ElMessage.error('上传成功但没有返回文件ID')
    return
  }

  await createKnowledgeFile({
    knowledgeBaseId: selectedBase.value.id,
    fileId
  })

  ElMessage.success('文件已添加到当前知识库，正在解析入库')
  uploadDialog.visible = false

  await loadFiles()
  await loadBases(selectedBase.value.id)
}

async function rebuildFile(row) {
  await ElMessageBox.confirm(`确定重新解析并向量化「${row.fileName || row.id}」吗？`, '重新入库', {
    type: 'warning'
  })

  await rebuildKnowledgeFile(row.id, true)
  ElMessage.success('已提交重新入库任务，请稍后刷新查看状态')
  await loadFiles()
}

function openSearchDialog() {
  if (!selectedBase.value?.id) {
    ElMessage.warning('请先选择知识库')
    return
  }
  searchDialog.visible = true
  searchResult.value = []
}

function openAskDialog() {
  if (!selectedBase.value?.id) {
    ElMessage.warning('请先选择知识库')
    return
  }
  askDialog.visible = true
  askAnswer.value = ''
  askReferences.value = []
}

async function submitSearch() {
  if (!searchForm.query.trim()) {
    ElMessage.warning('请输入检索问题')
    return
  }

  searchDialog.loading = true
  try {
    const res = await searchKnowledge({
      knowledgeBaseIds: [selectedBase.value.id],
      query: searchForm.query,
      topK: searchForm.topK
    })
    searchResult.value = res?.hits || []
  } finally {
    searchDialog.loading = false
  }
}

async function submitAsk() {
  if (!askForm.question.trim()) {
    ElMessage.warning('请输入问题')
    return
  }

  askDialog.loading = true
  try {
    const res = await askKnowledge({
      knowledgeBaseIds: [selectedBase.value.id],
      question: askForm.question,
      topK: askForm.topK
    })
    askAnswer.value = res?.answer || ''
    askReferences.value = res?.references || []
  } finally {
    askDialog.loading = false
  }
}

function openFile(row) {
  if (!row.fileUrl) {
    ElMessage.warning('文件访问地址为空')
    return
  }
  window.open(row.fileUrl, '_blank')
}

async function deleteFile(row) {
  await ElMessageBox.confirm(`确定从当前知识库删除文件「${row.fileName || row.id}」吗？`, '删除确认', {
    type: 'warning'
  })

  await deleteKnowledgeFile(row.id)
  ElMessage.success('文件记录已删除')

  await loadFiles()
  await loadBases(selectedBase.value?.id)
}

function formatFileSize(size) {
  const value = Number(size || 0)
  if (value < 1024) return `${value} B`
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(2)} KB`
  if (value < 1024 * 1024 * 1024) return `${(value / 1024 / 1024).toFixed(2)} MB`
  return `${(value / 1024 / 1024 / 1024).toFixed(2)} GB`
}

function formatScore(score) {
  const value = Number(score || 0)
  return value.toFixed(4)
}
</script>

<style scoped>
.kb-page {
  display: grid;
  grid-template-columns: minmax(560px, 0.95fr) minmax(720px, 1.05fr);
  gap: 16px;
}

.kb-left,
.kb-right {
  min-width: 0;
}

.kb-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 12px;
}

.kb-header__main {
  min-width: 0;
  flex: 1;
}

.kb-header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: nowrap;
  justify-content: flex-end;
  flex-shrink: 0;
}

.kb-title {
  font-size: 18px;
  font-weight: 800;
  line-height: 1.3;
}

.kb-sub {
  margin-top: 6px;
  color: var(--text-sub);
  line-height: 1.5;
  word-break: break-all;
}

.kb-tip {
  margin-bottom: 12px;
}

.file-name-cell {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.file-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border-radius: 6px;
  background: #e8f1ff;
  color: #2563eb;
  font-size: 12px;
  font-weight: 700;
  flex-shrink: 0;
}

.file-name-text {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.status-group {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

.table-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  white-space: nowrap;
}

.dialog-actions {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 12px;
}

.hit-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-height: 440px;
  overflow: auto;
}

.hit-card {
  padding: 12px;
  border: 1px solid var(--border);
  border-radius: 10px;
  background: #f8fafc;
}

.hit-head {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 8px;
  color: var(--text-sub);
  font-size: 13px;
}

.hit-content {
  color: var(--text-main);
  line-height: 1.7;
  white-space: pre-wrap;
}

.answer-box {
  padding: 14px;
  margin-bottom: 14px;
  border: 1px solid #bfdbfe;
  border-radius: 12px;
  background: #eff6ff;
}

.answer-title {
  margin-bottom: 8px;
  font-weight: 800;
}

.answer-content {
  line-height: 1.8;
  white-space: pre-wrap;
}

@media (max-width: 1380px) {
  .kb-page {
    grid-template-columns: minmax(500px, 0.9fr) minmax(640px, 1.1fr);
  }

  .kb-header {
    flex-direction: column;
    align-items: stretch;
  }

  .kb-header-actions {
    justify-content: flex-end;
  }
}

@media (max-width: 1180px) {
  .kb-page {
    grid-template-columns: 1fr;
  }
}
</style>
