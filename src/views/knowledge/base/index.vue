<template>
  <div class="page">
    <div class="page-body kb-page">
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
          <el-table-column prop="fileCount" label="文件" width="70" />
          <el-table-column prop="status" label="状态" width="90">
            <template #default="{ row }">
              <StatusTag :value="row.status" :map="enableMap" />
            </template>
          </el-table-column>
          <el-table-column label="操作" width="190" fixed="right">
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

      <div class="card card--table kb-right">
        <template v-if="selectedBase">
          <div class="kb-header">
            <div>
              <div class="kb-title">{{ selectedBase.kbName }}</div>
              <div class="kb-sub">
                {{ kbTypeLabel(selectedBase.kbType) }}
                <span v-if="selectedBase.enterpriseName"> · {{ selectedBase.enterpriseName }}</span>
                <span> · {{ selectedBase.description || '暂无描述' }}</span>
              </div>
            </div>
            <el-button type="primary" :icon="Upload" @click="openUploadDialog">添加文件</el-button>
          </div>

          <el-alert
            title="当前只做资料归档和企业隔离；文件解析、切片、向量化、AI调用后续最后统一接入。"
            type="success"
            show-icon
            :closable="false"
            style="margin-bottom: 12px"
          />

          <el-table
            class="ui-table"
            :data="files"
            border
            stripe
            height="calc(100vh - 286px)"
            v-loading="fileLoading"
          >
            <el-table-column prop="fileName" label="文件名" min-width="260" show-overflow-tooltip />
            <el-table-column prop="fileType" label="类型" width="90" />
            <el-table-column prop="fileSize" label="大小" width="110">
              <template #default="{ row }">
                {{ formatFileSize(row.fileSize) }}
              </template>
            </el-table-column>
            <el-table-column prop="parseStatus" label="解析" width="100">
              <template #default="{ row }">
                <el-tag :type="parseStatusMap[Number(row.parseStatus)]?.type || 'info'" effect="light">
                  {{ parseStatusMap[Number(row.parseStatus)]?.label || '未知' }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="embeddingStatus" label="向量化" width="100">
              <template #default="{ row }">
                <el-tag :type="embeddingStatusMap[Number(row.embeddingStatus)]?.type || 'info'" effect="light">
                  {{ embeddingStatusMap[Number(row.embeddingStatus)]?.label || '未知' }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="chunkCount" label="切片数" width="90" />
            <el-table-column prop="createTime" label="添加时间" width="170" />
            <el-table-column label="操作" width="120" fixed="right">
              <template #default="{ row }">
                <div class="table-actions">
                  <el-button v-if="row.fileUrl" link type="primary" @click="openFile(row)">查看</el-button>
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

    <el-dialog v-model="baseDialog.visible" :title="baseDialog.isEdit ? '编辑知识库' : '新建知识库'" width="680px" destroy-on-close>
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

    <el-dialog v-model="uploadDialog.visible" :title="`给「${selectedBase?.kbName || ''}」添加文件`" width="680px" destroy-on-close>
      <FileUploadBox
        v-if="selectedBase"
        module-type="knowledge_base"
        :biz-id="selectedBase.id"
        :private-flag="true"
        @success="onKnowledgeFileUploaded"
      />

      <div class="form-tip" style="margin-top: 10px">
        文件上传成功后，系统会自动把文件加入当前知识库。
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Refresh, Upload } from '@element-plus/icons-vue'
import { useAuthStore } from '@/stores/auth'
import { listEnterprises } from '@/api/enterprise'
import FileUploadBox from '@/components/FileUploadBox.vue'
import PageFooterPager from '@/components/PageFooterPager.vue'
import StatusTag from '@/components/StatusTag.vue'
import { enableMap } from '@/config/statusMaps'
import {
  createKnowledgeBase,
  createKnowledgeFile,
  deleteKnowledgeBase,
  deleteKnowledgeFile,
  pageKnowledgeBases,
  pageKnowledgeFiles,
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

  ElMessage.success('文件已添加到当前知识库')
  uploadDialog.visible = false

  await loadFiles()
  await loadBases(selectedBase.value.id)
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
</script>

<style scoped>
.kb-page {
  display: grid;
  grid-template-columns: minmax(520px, 0.95fr) minmax(0, 1.05fr);
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
  gap: 12px;
  margin-bottom: 12px;
}

.kb-title {
  font-size: 18px;
  font-weight: 800;
}

.kb-sub {
  margin-top: 6px;
  color: var(--text-sub);
  line-height: 1.5;
}

.table-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  white-space: nowrap;
}

@media (max-width: 1180px) {
  .kb-page {
    grid-template-columns: 1fr;
  }
}
</style>