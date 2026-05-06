<template>
  <div class="page">
    <div class="page-body template-page">
      <div class="card card--table template-left">
        <div class="list-head">
          <div class="list-head__left">
            <el-input
              v-model="keyword"
              class="filter-input"
              placeholder="按模板名称 / 企业 / 文件名 / 描述自动查询"
              clearable
              @input="onKeywordInput"
            />
          </div>
          <div class="list-head__right">
            <el-button class="table-icon-btn" text :icon="Refresh" @click="loadTemplates" />
            <el-button type="primary" :icon="Plus" @click="openCreate">新增模板</el-button>
          </div>
        </div>

        <div class="filter-row">
          <el-select v-model="filters.templateType" clearable placeholder="模板类型" style="width: 150px" @change="reloadFirstPage">
            <el-option v-for="item in templateTypeOptions" :key="item.value" :label="item.label" :value="item.value" />
          </el-select>
          <el-select v-model="filters.templateScope" clearable placeholder="模板范围" style="width: 150px" @change="reloadFirstPage">
            <el-option label="平台模板" value="PLATFORM" />
            <el-option label="企业模板" value="ENTERPRISE" />
          </el-select>
          <el-select v-model="filters.status" clearable placeholder="状态" style="width: 120px" @change="reloadFirstPage">
            <el-option label="启用" :value="1" />
            <el-option label="停用" :value="0" />
          </el-select>
        </div>

        <el-table
          class="ui-table"
          :data="rows"
          border
          stripe
          highlight-current-row
          height="calc(100vh - 300px)"
          v-loading="loading"
          @current-change="selectRow"
        >
          <el-table-column prop="templateName" label="模板名称" min-width="200" show-overflow-tooltip />
          <el-table-column label="类型" width="100">
            <template #default="{ row }">
              <el-tag :type="templateTypeTag(row.templateType)" effect="light">
                {{ templateTypeLabel(row.templateType) }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="范围" width="100">
            <template #default="{ row }">
              <el-tag :type="row.templateScope === 'PLATFORM' ? 'warning' : 'success'" effect="light">
                {{ scopeLabel(row.templateScope) }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="文件" width="110">
            <template #default="{ row }">
              <el-tag :type="fileStateTag(row)" effect="light">
                {{ fileStateLabel(row) }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="默认" width="80" align="center">
            <template #default="{ row }">
              <el-tag v-if="Number(row.defaultFlag) === 1" type="primary" effect="light">默认</el-tag>
              <span v-else>-</span>
            </template>
          </el-table-column>
          <el-table-column label="状态" width="80" align="center">
            <template #default="{ row }">
              <el-tag :type="Number(row.status) === 1 ? 'success' : 'info'" effect="light">
                {{ Number(row.status) === 1 ? '启用' : '停用' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="updateTime" label="更新时间" width="170" show-overflow-tooltip />
          <el-table-column label="操作" width="210" fixed="right">
            <template #default="{ row }">
              <div class="table-actions">
                <el-button link type="primary" @click.stop="selectRow(row)">编辑</el-button>
                <el-button link type="success" :disabled="!canDownload(row)" @click.stop="downloadRow(row)">下载</el-button>
                <el-button link type="warning" @click.stop="setDefault(row)">默认</el-button>
                <el-button link type="danger" @click.stop="removeRow(row)">删除</el-button>
              </div>
            </template>
          </el-table-column>
        </el-table>

        <PageFooterPager
          v-model:page="pager.page"
          v-model:size="pager.size"
          :total="pager.total"
          @change="loadTemplates"
        />
      </div>

      <div class="card template-right">
        <template v-if="editMode">
          <div class="editor-head">
            <div>
              <div class="section-title">{{ form.id ? '编辑标书模板' : '新增标书模板' }}</div>
              <div class="section-desc">
                标书模板用于后续 Word 套版导出。当前仅支持上传 .docx 文件，文件统一保存到 OSS 和文件资源。
              </div>
            </div>
            <div class="editor-actions">
              <el-button :icon="Refresh" @click="resetForm">重置</el-button>
              <el-button type="primary" :loading="saving" @click="saveRow">保存模板</el-button>
            </div>
          </div>

          <el-alert
            v-if="!form.id"
            class="template-alert"
            title="请先保存模板基础信息，再上传 Word 模板文件。"
            type="info"
            show-icon
            :closable="false"
          />

          <el-form ref="formRef" :model="form" :rules="rules" label-width="112px" class="template-form">
            <el-row :gutter="14">
              <el-col :span="12">
                <el-form-item label="模板名称" prop="templateName">
                  <el-input v-model="form.templateName" placeholder="例如：完整标书默认Word模板" maxlength="100" show-word-limit />
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="模板类型" prop="templateType">
                  <el-select v-model="form.templateType" style="width: 100%" @change="onTemplateTypeChange">
                    <el-option v-for="item in templateTypeOptions" :key="item.value" :label="item.label" :value="item.value" />
                  </el-select>
                </el-form-item>
              </el-col>
            </el-row>

            <el-row :gutter="14">
              <el-col :span="8">
                <el-form-item label="模板场景">
                  <el-input :model-value="form.templateScene" disabled />
                </el-form-item>
              </el-col>
              <el-col :span="8">
                <el-form-item label="模板范围" prop="templateScope">
                  <el-select v-model="form.templateScope" :disabled="!canManagePlatform" style="width: 100%" @change="onScopeChange">
                    <el-option v-if="canManagePlatform" label="平台模板" value="PLATFORM" />
                    <el-option label="企业模板" value="ENTERPRISE" />
                  </el-select>
                </el-form-item>
              </el-col>
              <el-col :span="8">
                <el-form-item v-if="canManagePlatform && form.templateScope === 'ENTERPRISE'" label="所属企业" prop="enterpriseId">
                  <el-select
                    v-model="form.enterpriseId"
                    :disabled="form.templateScope === 'PLATFORM'"
                    clearable
                    filterable
                    placeholder="请选择企业"
                    style="width: 100%"
                  >
                    <el-option
                      v-for="item in enterprises"
                      :key="item.id"
                      :label="item.enterpriseName"
                      :value="item.id"
                    />
                  </el-select>
                </el-form-item>
              </el-col>
            </el-row>

            <el-row :gutter="14">
              <el-col :span="8">
                <el-form-item label="版本号">
                  <el-input v-model="form.versionNo" placeholder="例如：V1.0" />
                </el-form-item>
              </el-col>
              <el-col :span="8">
                <el-form-item label="是否默认">
                  <el-select v-model="form.defaultFlag" style="width: 100%">
                    <el-option label="否" :value="0" />
                    <el-option label="是" :value="1" />
                  </el-select>
                </el-form-item>
              </el-col>
              <el-col :span="8">
                <el-form-item label="状态">
                  <el-select v-model="form.status" style="width: 100%">
                    <el-option label="启用" :value="1" />
                    <el-option label="停用" :value="0" />
                  </el-select>
                </el-form-item>
              </el-col>
            </el-row>

            <el-row :gutter="14">
              <el-col :span="8">
                <el-form-item label="排序">
                  <el-input-number v-model="form.sortNo" :min="0" :max="9999" style="width: 100%" />
                </el-form-item>
              </el-col>
              <el-col :span="16">
                <el-form-item label="描述">
                  <el-input v-model="form.description" placeholder="模板用途说明" maxlength="300" show-word-limit />
                </el-form-item>
              </el-col>
            </el-row>
          </el-form>

          <div class="file-card">
            <div class="file-card-head">
              <div>
                <div class="assist-title">Word模板文件</div>
                <div class="assist-desc">只支持 .docx；上传后会写入文件资源，并关联到当前标书模板。</div>
              </div>
              <div class="file-actions">
                <el-button :disabled="!canDownload(currentDetail)" @click="downloadCurrent">下载模板</el-button>
                <el-button v-if="currentDetail?.fileUrl" @click="openCurrentFile">查看文件</el-button>
              </div>
            </div>

            <div v-if="currentDetail?.fileId" class="file-info">
              <div class="file-icon">W</div>
              <div class="file-main">
                <div class="file-name">{{ currentDetail.originalName || currentDetail.fileName || '模板文件' }}</div>
                <div class="file-meta">
                  文件ID：{{ currentDetail.fileId }} · {{ formatFileSize(currentDetail.fileSize) }} ·
                  {{ fileStateLabel(currentDetail) }}
                </div>
              </div>
            </div>

            <FileUploadBox
              v-if="form.id"
              module-type="bid_template"
              :biz-id="form.id"
              :private-flag="true"
              accept=".docx"
              :max-count="1"
              :max-size-mb="50"
              tip="只允许上传 .docx Word模板文件；上传成功后自动关联到当前标书模板。"
              @success="onUploadSuccess"
            />
          </div>
        </template>

        <el-empty v-else description="请选择左侧模板，或点击新增模板">
          <el-button type="primary" :icon="Plus" @click="openCreate">新增模板</el-button>
        </el-empty>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, nextTick, onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Refresh } from '@element-plus/icons-vue'
import {
  attachBidTemplateFile,
  createBidTemplate,
  deleteBidTemplate,
  downloadBidTemplate,
  getBidTemplate,
  pageBidTemplates,
  setDefaultBidTemplate,
  updateBidTemplate
} from '@/api/bidTemplate'
import { listEnterprises } from '@/api/enterprise'
import { useAuthStore } from '@/stores/auth'
import FileUploadBox from '@/components/FileUploadBox.vue'
import PageFooterPager from '@/components/PageFooterPager.vue'

const auth = useAuthStore()
const ROLE_SUPER_ADMIN = 'SUPERADMIN'
const ROLE_PLATFORM_ADMIN = 'PLATFORMADMIN'

const loading = ref(false)
const saving = ref(false)
const editMode = ref(false)
const rows = ref([])
const enterprises = ref([])
const keyword = ref('')
const timer = ref(null)
const formRef = ref()
const currentDetail = ref(null)

const pager = reactive({
  page: 1,
  size: 10,
  total: 0
})

const filters = reactive({
  templateType: '',
  templateScope: '',
  status: ''
})

const form = reactive(defaultForm())

const currentRoleCodes = computed(() => normalizeRoleList(auth.user?.roles || auth.user?.roleCodes || []))
const canManagePlatform = computed(() => {
  return currentRoleCodes.value.includes(ROLE_SUPER_ADMIN) || currentRoleCodes.value.includes(ROLE_PLATFORM_ADMIN)
})

const templateTypeOptions = [
  { label: '技术标', value: 'TECH', scene: 'BID_TECH' },
  { label: '商务标', value: 'BUSINESS', scene: 'BID_BUSINESS' },
  { label: '完整标书', value: 'FULL', scene: 'BID_FULL' },
  { label: '通用标书', value: 'COMMON', scene: 'BID' }
]

const rules = {
  templateName: [{ required: true, message: '请输入模板名称', trigger: 'blur' }],
  templateType: [{ required: true, message: '请选择模板类型', trigger: 'change' }],
  templateScope: [{ required: true, message: '请选择模板范围', trigger: 'change' }],
  enterpriseId: [{ validator: validateEnterpriseId, trigger: 'change' }]
}

onMounted(async () => {
  await loadEnterprises()
  await loadTemplates()
})

function defaultForm() {
  return {
    id: null,
    enterpriseId: null,
    templateName: '',
    templateType: 'FULL',
    templateScene: 'BID_FULL',
    templateScope: 'ENTERPRISE',
    fileId: null,
    versionNo: 'V1.0',
    defaultFlag: 0,
    description: '',
    sortNo: 0,
    status: 1
  }
}

function validateEnterpriseId(rule, value, callback) {
  if (!canManagePlatform.value || form.templateScope !== 'ENTERPRISE') {
    callback()
    return
  }
  if (!value) {
    callback(new Error('企业模板必须选择所属企业'))
    return
  }
  callback()
}

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

function onKeywordInput() {
  clearTimeout(timer.value)
  timer.value = setTimeout(() => reloadFirstPage(), 300)
}

function reloadFirstPage() {
  pager.page = 1
  loadTemplates()
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

async function loadTemplates(selectId) {
  loading.value = true
  try {
    const res = await pageBidTemplates({
      current: pager.page,
      size: pager.size,
      pageNum: pager.page,
      pageSize: pager.size,
      keyword: keyword.value || undefined,
      templateType: filters.templateType || undefined,
      templateScope: filters.templateScope || undefined,
      status: filters.status === '' ? undefined : filters.status
    })

    rows.value = res?.records || []
    pager.total = Number(res?.total || 0)

    if (selectId) {
      const target = rows.value.find((item) => String(item.id) === String(selectId))
      if (target) await selectRow(target)
    } else if (!currentDetail.value && rows.value.length) {
      await selectRow(rows.value[0])
    }
  } finally {
    loading.value = false
  }
}

async function selectRow(row) {
  if (!row?.id) return
  const detail = await getBidTemplate(row.id)
  currentDetail.value = detail
  fillForm(detail)
  editMode.value = true
}

function openCreate() {
  currentDetail.value = null
  fillForm(defaultForm())
  if (!canManagePlatform.value) {
    form.templateScope = 'ENTERPRISE'
    form.enterpriseId = auth.user?.enterpriseId || null
  }
  editMode.value = true
  nextTick(() => formRef.value?.clearValidate?.())
}

function resetForm() {
  if (currentDetail.value?.id) {
    fillForm(currentDetail.value)
  } else {
    fillForm(defaultForm())
  }
}

function fillForm(row) {
  Object.assign(form, defaultForm(), row || {})
  form.templateType = row?.templateType || 'FULL'
  form.templateScene = row?.templateScene || sceneByType(form.templateType)
  form.templateScope = row?.templateScope || 'ENTERPRISE'
  form.versionNo = row?.versionNo || 'V1.0'
  form.defaultFlag = row?.defaultFlag === 1 ? 1 : 0
  form.status = row?.status === 0 ? 0 : 1
  form.sortNo = Number(row?.sortNo || 0)
}

function onTemplateTypeChange(value) {
  form.templateScene = sceneByType(value)
}

function onScopeChange(value) {
  if (value === 'PLATFORM') {
    form.enterpriseId = null
  } else if (!canManagePlatform.value) {
    form.enterpriseId = auth.user?.enterpriseId || null
  }
  formRef.value?.clearValidate?.(['enterpriseId'])
}

async function saveRow() {
  await formRef.value?.validate()

  saving.value = true
  try {
    const payload = {
      enterpriseId: form.templateScope === 'PLATFORM' ? null : (canManagePlatform.value ? form.enterpriseId : auth.user?.enterpriseId),
      templateName: form.templateName,
      templateType: form.templateType,
      templateScene: form.templateScene,
      templateScope: form.templateScope,
      fileId: form.fileId || null,
      versionNo: form.versionNo || 'V1.0',
      defaultFlag: form.defaultFlag,
      description: form.description || null,
      sortNo: form.sortNo || 0,
      status: form.status
    }

    let savedId = form.id
    if (form.id) {
      await updateBidTemplate(form.id, payload)
      ElMessage.success('模板已保存')
    } else {
      savedId = await createBidTemplate(payload)
      ElMessage.success('模板已创建，请继续上传 .docx 模板文件')
    }

    await loadTemplates(savedId)
  } finally {
    saving.value = false
  }
}

async function onUploadSuccess(file) {
  if (!form.id) {
    ElMessage.warning('请先保存模板基础信息')
    return
  }

  await attachBidTemplateFile(form.id, file.id)
  ElMessage.success('模板文件已关联')
  await loadTemplates(form.id)
}

async function setDefault(row) {
  await setDefaultBidTemplate(row.id)
  ElMessage.success('已设为默认模板')
  await loadTemplates(row.id)
}

async function removeRow(row) {
  await ElMessageBox.confirm(
    `确认删除模板「${row.templateName}」吗？这只删除模板记录，不会删除文件资源；如需删除文件请到“文件资源”页面操作。`,
    '删除确认',
    { type: 'warning' }
  )

  await deleteBidTemplate(row.id)
  ElMessage.success('模板已删除')

  if (currentDetail.value?.id === row.id) {
    currentDetail.value = null
    editMode.value = false
  }

  await loadTemplates()
}

async function downloadRow(row) {
  if (!canDownload(row)) {
    ElMessage.warning('模板文件已丢失，请重新上传')
    return
  }

  const blob = await downloadBidTemplate(row.id)
  downloadBlob(blob, row.originalName || row.fileName || `${row.templateName || '标书模板'}.docx`)
}

async function downloadCurrent() {
  if (!currentDetail.value) return
  await downloadRow(currentDetail.value)
}

function openCurrentFile() {
  if (currentDetail.value?.fileUrl) {
    window.open(currentDetail.value.fileUrl, '_blank')
  }
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
  return String(fileName || '标书模板.docx')
    .replace(/[\\/:*?"<>|]/g, '_')
    .trim() || '标书模板.docx'
}

function canDownload(row) {
  return Boolean(row?.id && row?.fileId && Number(row?.fileExists) === 1)
}

function fileStateLabel(row) {
  if (!row?.fileId) return '未上传'
  if (Number(row.fileExists) === 1) return '已上传'
  return '文件丢失'
}

function fileStateTag(row) {
  if (!row?.fileId) return 'info'
  if (Number(row.fileExists) === 1) return 'success'
  return 'danger'
}

function templateTypeLabel(value) {
  return templateTypeOptions.find((item) => item.value === value)?.label || value || '-'
}

function templateTypeTag(value) {
  const map = {
    TECH: 'primary',
    BUSINESS: 'success',
    FULL: 'warning',
    COMMON: 'info'
  }
  return map[value] || 'info'
}

function sceneByType(type) {
  return templateTypeOptions.find((item) => item.value === type)?.scene || 'BID'
}

function scopeLabel(value) {
  return value === 'PLATFORM' ? '平台模板' : '企业模板'
}

function formatFileSize(size) {
  const value = Number(size || 0)
  if (!value) return '0 B'
  if (value < 1024) return `${value} B`
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`
  return `${(value / 1024 / 1024).toFixed(1)} MB`
}
</script>

<style scoped>
.template-page {
  display: grid;
  grid-template-columns: minmax(620px, 0.94fr) minmax(0, 1.06fr);
  gap: 16px;
}

.template-left,
.template-right {
  min-width: 0;
}

.template-right {
  padding: 18px;
}

.filter-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 12px;
}

.editor-head,
.file-card-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.editor-actions,
.file-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.section-title {
  font-size: 18px;
  font-weight: 800;
  color: var(--text-main);
}

.section-desc,
.assist-desc {
  margin-top: 6px;
  color: var(--text-sub);
  line-height: 1.6;
  font-size: 13px;
}

.template-alert {
  margin-top: 14px;
}

.template-form {
  margin-top: 16px;
}

.file-card {
  margin-top: 14px;
  padding: 14px;
  border: 1px solid var(--border);
  border-radius: 14px;
  background: #f8fafc;
}

.assist-title {
  font-weight: 800;
  color: var(--text-main);
}

.file-info {
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 12px 0;
  padding: 12px;
  border-radius: 12px;
  background: #fff;
  border: 1px solid #e5e7eb;
}

.file-icon {
  width: 42px;
  height: 42px;
  border-radius: 12px;
  background: #e0ecff;
  color: #2563eb;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 900;
  flex-shrink: 0;
}

.file-main {
  min-width: 0;
}

.file-name {
  font-weight: 800;
  color: var(--text-main);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.file-meta {
  margin-top: 4px;
  color: var(--text-sub);
  font-size: 12px;
}

.table-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  white-space: nowrap;
}

@media (max-width: 1280px) {
  .template-page {
    grid-template-columns: 1fr;
  }
}
</style>
