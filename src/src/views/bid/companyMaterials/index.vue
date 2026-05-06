<template>
  <div class="page">
    <div class="page-body company-material-page">
      <!-- 左侧：分类 -->
      <div class="card material-category">
        <div class="category-head">
          <div>
            <div class="section-title">企业资料库</div>
            <div class="section-desc">统一维护公司简介、资质证书、项目业绩等资料。</div>
          </div>
          <el-button class="table-icon-btn" text :icon="Refresh" @click="loadMaterials" />
        </div>

        <div class="category-list">
          <div
            v-for="item in materialTypes"
            :key="item.value"
            class="category-item"
            :class="{ active: filters.materialType === item.value }"
            @click="selectMaterialType(item.value)"
          >
            <div class="category-icon">{{ item.short }}</div>
            <div class="category-info">
              <strong>{{ item.label }}</strong>
              <span>{{ item.desc }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 中间：列表 -->
      <div class="card card--table material-list">
        <div class="list-head">
          <div class="list-head__left">
            <el-input
              v-model="filters.keyword"
              class="filter-input"
              placeholder="按标题 / 内容 / 企业 / 附件名自动查询"
              clearable
              @input="onKeywordInput"
            />
          </div>
          <div class="list-head__right">
            <el-select
              v-if="canManagePlatform"
              v-model="filters.enterpriseId"
              clearable
              filterable
              placeholder="所属企业"
              style="width: 180px"
              @change="reloadFirstPage"
            >
              <el-option
                v-for="item in enterprises"
                :key="item.id"
                :label="item.enterpriseName"
                :value="item.id"
              />
            </el-select>
            <el-select v-model="filters.fileState" clearable placeholder="附件状态" style="width: 130px" @change="reloadFirstPage">
              <el-option label="有附件" value="available" />
              <el-option label="附件丢失" value="lost" />
              <el-option label="无附件" value="none" />
            </el-select>
            <el-button type="primary" :icon="Plus" @click="openCreate">新增资料</el-button>
          </div>
        </div>

        <div class="summary-row">
          <div class="summary-card">
            <span>资料总数</span>
            <strong>{{ pager.total }}</strong>
          </div>
          <div class="summary-card">
            <span>当前页有附件</span>
            <strong>{{ currentPageFileCount }}</strong>
          </div>
          <div class="summary-card is-warning">
            <span>当前页附件丢失</span>
            <strong>{{ currentPageLostCount }}</strong>
          </div>
        </div>

        <el-table
          class="ui-table"
          :data="rows"
          border
          stripe
          highlight-current-row
          height="calc(100vh - 356px)"
          v-loading="loading"
          @current-change="selectRow"
          @row-dblclick="selectRow"
        >
          <el-table-column label="资料标题" min-width="220" show-overflow-tooltip>
            <template #default="{ row }">
              <div class="title-cell">
                <div class="title-main">{{ row.title }}</div>
                <div class="title-sub">{{ row.enterpriseName || '-' }}</div>
              </div>
            </template>
          </el-table-column>

          <el-table-column label="资料类型" width="120">
            <template #default="{ row }">
              <el-tag :type="materialTypeTag(row.materialType)" effect="light">
                {{ materialTypeLabel(row.materialType) }}
              </el-tag>
            </template>
          </el-table-column>

          <el-table-column label="附件" width="110">
            <template #default="{ row }">
              <el-tag :type="fileStateTag(row)" effect="light">
                {{ fileStateLabel(row) }}
              </el-tag>
            </template>
          </el-table-column>

          <el-table-column label="有效期" width="190" show-overflow-tooltip>
            <template #default="{ row }">
              {{ validityText(row) }}
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

          <el-table-column label="操作" width="190" fixed="right">
            <template #default="{ row }">
              <div class="table-actions">
                <el-button link type="primary" @click.stop="selectRow(row)">详情</el-button>
                <el-button link type="success" :disabled="!canOpenFile(row)" @click.stop="openFile(row)">附件</el-button>
                <el-button link type="danger" @click.stop="removeRow(row)">删除</el-button>
              </div>
            </template>
          </el-table-column>
        </el-table>

        <PageFooterPager
          v-model:page="pager.page"
          v-model:size="pager.size"
          :total="pager.total"
          @change="loadMaterials"
        />
      </div>

      <!-- 右侧：详情编辑 -->
      <div class="card material-detail">
        <template v-if="editMode">
          <div class="editor-head">
            <div>
              <div class="section-title">{{ form.id ? '编辑企业资料' : '新增企业资料' }}</div>
              <div class="section-desc">
                附件会统一上传到 OSS，并写入文件资源；文件资源删除后，这里会显示无附件。
              </div>
            </div>
            <div class="editor-actions">
              <el-button :icon="Refresh" @click="resetForm">重置</el-button>
              <el-button type="primary" :loading="saving" @click="saveRow">保存资料</el-button>
            </div>
          </div>

          <el-alert
            v-if="!form.id"
            class="detail-alert"
            title="请先保存资料基础信息，再上传附件。"
            type="info"
            show-icon
            :closable="false"
          />

          <el-form ref="formRef" :model="form" :rules="rules" label-width="112px" class="material-form">
            <el-form-item v-if="canManagePlatform" label="所属企业" prop="enterpriseId">
              <el-select v-model="form.enterpriseId" filterable placeholder="请选择企业" style="width: 100%">
                <el-option
                  v-for="item in enterprises"
                  :key="item.id"
                  :label="item.enterpriseName"
                  :value="item.id"
                />
              </el-select>
            </el-form-item>

            <el-form-item label="资料类型" prop="materialType">
              <el-select v-model="form.materialType" style="width: 100%">
                <el-option
                  v-for="item in materialTypes"
                  :key="item.value"
                  :label="item.label"
                  :value="item.value"
                />
              </el-select>
            </el-form-item>

            <el-form-item label="资料标题" prop="title">
              <el-input v-model="form.title" placeholder="例如：公司简介 / ISO9001证书 / 类似业绩" maxlength="200" show-word-limit />
            </el-form-item>

            <el-form-item label="正文内容">
              <el-input
                v-model="form.content"
                type="textarea"
                :rows="8"
                placeholder="可填写资料正文。后续 AI 生成时会优先引用这里的文本内容。"
                maxlength="10000"
                show-word-limit
              />
            </el-form-item>

            <el-row :gutter="14">
              <el-col :span="12">
                <el-form-item label="有效期开始">
                  <el-date-picker v-model="form.validStartDate" type="date" value-format="YYYY-MM-DD" placeholder="开始日期" style="width: 100%" />
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="有效期结束">
                  <el-date-picker v-model="form.validEndDate" type="date" value-format="YYYY-MM-DD" placeholder="结束日期" style="width: 100%" />
                </el-form-item>
              </el-col>
            </el-row>

            <el-row :gutter="14">
              <el-col :span="12">
                <el-form-item label="状态">
                  <el-select v-model="form.status" style="width: 100%">
                    <el-option label="启用" :value="1" />
                    <el-option label="停用" :value="0" />
                  </el-select>
                </el-form-item>
              </el-col>
            </el-row>

            <el-form-item label="备注">
              <el-input v-model="form.remark" type="textarea" :rows="3" placeholder="内部备注，可为空" maxlength="1000" show-word-limit />
            </el-form-item>
          </el-form>

          <div class="file-card">
            <div class="file-card-head">
              <div>
                <div class="assist-title">附件</div>
                <div class="assist-desc">可上传证书、证明、业绩合同、团队资料等附件。</div>
              </div>
              <div class="file-actions">
                <el-button :disabled="!canOpenFile(currentDetail)" @click="openFile(currentDetail)">查看附件</el-button>
              </div>
            </div>

            <div v-if="currentDetail?.fileId && Number(currentDetail.fileExists) === 1" class="file-info">
              <div class="file-icon">{{ fileExtLabel(currentDetail.fileExt) }}</div>
              <div class="file-main">
                <div class="file-name">{{ currentDetail.originalName || currentDetail.fileName || '附件' }}</div>
                <div class="file-meta">
                  文件ID：{{ currentDetail.fileId }} · {{ formatFileSize(currentDetail.fileSize) }} · 可用
                </div>
              </div>
            </div>

            <el-alert
              v-else-if="currentDetail?.fileId"
              class="detail-alert"
              title="附件已丢失，请重新上传。"
              type="warning"
              show-icon
              :closable="false"
            />

            <FileUploadBox
              v-if="form.id"
              module-type="company_material"
              :biz-id="form.id"
              :private-flag="true"
              accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.zip,.rar"
              :max-count="1"
              :max-size-mb="50"
              tip="支持常见文档、图片和压缩包；上传成功后自动关联到当前企业资料。"
              @success="onUploadSuccess"
            />
          </div>
        </template>

        <el-empty v-else description="请选择左侧资料，或点击新增资料">
          <el-button type="primary" :icon="Plus" @click="openCreate">新增资料</el-button>
        </el-empty>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, nextTick, onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Refresh } from '@element-plus/icons-vue'
import { useAuthStore } from '@/stores/auth'
import { listEnterprises } from '@/api/enterprise'
import {
  attachCompanyMaterialFile,
  createCompanyMaterial,
  deleteCompanyMaterial,
  getCompanyMaterial,
  pageCompanyMaterials,
  updateCompanyMaterial
} from '@/api/companyMaterial'
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
const currentDetail = ref(null)
const keywordTimer = ref(null)
const formRef = ref()

const filters = reactive({
  keyword: '',
  enterpriseId: '',
  materialType: '',
  fileState: ''
})

const pager = reactive({
  page: 1,
  size: 10,
  total: 0
})

const form = reactive(defaultForm())

const materialTypes = [
  { label: '公司简介', value: 'COMPANY_PROFILE', short: '企', desc: '企业介绍、组织架构、主营业务' },
  { label: '资质证书', value: 'QUALIFICATION', short: '资', desc: '营业执照、体系认证、行业资质' },
  { label: '人员证书', value: 'PERSON_CERT', short: '人', desc: '项目经理、技术人员证书' },
  { label: '项目业绩', value: 'CASE', short: '绩', desc: '类似项目、合同、验收材料' },
  { label: '荣誉奖项', value: 'HONOR', short: '荣', desc: '奖项、荣誉、表彰证明' },
  { label: '售后服务', value: 'AFTER_SALE', short: '售', desc: '服务承诺、运维体系、响应机制' },
  { label: '实施团队', value: 'TEAM', short: '团', desc: '团队配置、岗位职责、人员安排' },
  { label: '其他资料', value: 'OTHER', short: '其', desc: '其他可被 AI 引用的企业材料' }
]

const rules = {
  enterpriseId: [{ required: true, message: '请选择所属企业', trigger: 'change' }],
  materialType: [{ required: true, message: '请选择资料类型', trigger: 'change' }],
  title: [{ required: true, message: '请输入资料标题', trigger: 'blur' }]
}

const currentRoleCodes = computed(() => normalizeRoleList(auth.user?.roles || auth.user?.roleCodes || []))

const canManagePlatform = computed(() => {
  return currentRoleCodes.value.includes(ROLE_SUPER_ADMIN) || currentRoleCodes.value.includes(ROLE_PLATFORM_ADMIN)
})

const currentPageFileCount = computed(() => rows.value.filter((row) => Number(row.fileExists) === 1).length)
const currentPageLostCount = computed(() => rows.value.filter((row) => row.fileId && Number(row.fileExists) !== 1).length)

onMounted(async () => {
  await loadEnterprises()
  await loadMaterials()
})

function defaultForm() {
  return {
    id: null,
    enterpriseId: '',
    materialType: 'COMPANY_PROFILE',
    title: '',
    content: '',
    fileId: null,
    validStartDate: '',
    validEndDate: '',
    status: 1,
    remark: ''
  }
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

function selectMaterialType(value) {
  filters.materialType = value
  currentDetail.value = null
  editMode.value = false
  reloadFirstPage()
}

function onKeywordInput() {
  clearTimeout(keywordTimer.value)
  keywordTimer.value = setTimeout(() => reloadFirstPage(), 300)
}

function reloadFirstPage() {
  pager.page = 1
  loadMaterials()
}

async function loadMaterials(selectId) {
  loading.value = true
  try {
    const res = await pageCompanyMaterials({
      current: pager.page,
      size: pager.size,
      pageNum: pager.page,
      pageSize: pager.size,
      keyword: filters.keyword || undefined,
      enterpriseId: filters.enterpriseId || undefined,
      materialType: filters.materialType || undefined,
      fileState: filters.fileState || undefined
    })

    rows.value = res?.records || []
    pager.total = Number(res?.total || 0)

    if (selectId) {
      const target = rows.value.find((item) => String(item.id) === String(selectId))
      if (target) await selectRow(target)
    } else if (rows.value.length) {
      const stillVisible = currentDetail.value
        ? rows.value.some((item) => String(item.id) === String(currentDetail.value.id))
        : false
      if (!stillVisible) {
        await selectRow(rows.value[0])
      }
    } else {
      currentDetail.value = null
      editMode.value = false
    }
  } finally {
    loading.value = false
  }
}

async function selectRow(row) {
  if (!row?.id) return
  const detail = await getCompanyMaterial(row.id)
  currentDetail.value = detail
  fillForm(detail)
  editMode.value = true
}

function openCreate() {
  currentDetail.value = null
  fillForm({
    ...defaultForm(),
    enterpriseId: canManagePlatform.value ? (filters.enterpriseId || '') : (auth.user?.enterpriseId || ''),
    materialType: filters.materialType || 'COMPANY_PROFILE'
  })
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
  if (canManagePlatform.value) {
    form.enterpriseId = form.enterpriseId || filters.enterpriseId || ''
  } else {
    form.enterpriseId = auth.user?.enterpriseId || form.enterpriseId
  }
  form.status = row?.status === 0 ? 0 : 1
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

async function saveRow() {
  await formRef.value?.validate()

  saving.value = true
  try {
    const payload = {
      enterpriseId: canManagePlatform.value ? form.enterpriseId : auth.user?.enterpriseId,
      materialType: form.materialType,
      title: form.title,
      content: form.content || null,
      fileId: form.fileId || null,
      validStartDate: form.validStartDate || null,
      validEndDate: form.validEndDate || null,
      status: form.status,
      remark: form.remark || null
    }

    let savedId = form.id
    if (form.id) {
      await updateCompanyMaterial(form.id, payload)
      ElMessage.success('企业资料已保存')
    } else {
      savedId = await createCompanyMaterial(payload)
      ElMessage.success('企业资料已创建，请继续上传附件')
    }

    await loadMaterials(savedId)
  } finally {
    saving.value = false
  }
}

async function onUploadSuccess(file) {
  if (!form.id) {
    ElMessage.warning('请先保存资料基础信息')
    return
  }

  await attachCompanyMaterialFile(form.id, file.id)
  ElMessage.success('附件已关联')
  await loadMaterials(form.id)
}

async function removeRow(row) {
  await ElMessageBox.confirm(
    `确认删除企业资料「${row.title}」吗？这只删除资料记录，不会删除文件资源和OSS文件。`,
    '删除确认',
    { type: 'warning' }
  )

  await deleteCompanyMaterial(row.id)
  ElMessage.success('企业资料已删除')

  if (currentDetail.value?.id === row.id) {
    currentDetail.value = null
    editMode.value = false
  }

  await loadMaterials()
}

function openFile(row) {
  if (!canOpenFile(row)) {
    ElMessage.warning('附件已丢失或未上传')
    return
  }
  window.open(row.fileUrl, '_blank')
}

function canOpenFile(row) {
  return Boolean(row?.fileUrl && row?.fileId && Number(row.fileExists) === 1)
}

function materialTypeLabel(value) {
  return materialTypes.find((item) => item.value === value)?.label || value || '-'
}

function materialTypeTag(value) {
  const map = {
    COMPANY_PROFILE: 'primary',
    QUALIFICATION: 'success',
    PERSON_CERT: 'warning',
    CASE: 'danger',
    HONOR: 'warning',
    AFTER_SALE: 'success',
    TEAM: 'primary',
    OTHER: 'info'
  }
  return map[value] || 'info'
}

function fileStateLabel(row) {
  if (!row?.fileId) return '无附件'
  if (Number(row.fileExists) === 1) return '可用'
  return '已丢失'
}

function fileStateTag(row) {
  if (!row?.fileId) return 'info'
  if (Number(row.fileExists) === 1) return 'success'
  return 'danger'
}

function validityText(row) {
  if (!row?.validStartDate && !row?.validEndDate) return '-'
  return `${row.validStartDate || '开始不限'} ~ ${row.validEndDate || '长期有效'}`
}

function fileExtLabel(ext) {
  const value = String(ext || 'F').toUpperCase()
  return value.length > 4 ? value.slice(0, 4) : value
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
.company-material-page {
  display: grid;
  grid-template-columns: 280px minmax(560px, 1fr) minmax(420px, 0.85fr);
  gap: 16px;
}

.material-category,
.material-list,
.material-detail {
  min-width: 0;
}

.material-category,
.material-detail {
  padding: 18px;
}

.category-head,
.editor-head,
.file-card-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
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

.category-list {
  display: grid;
  gap: 10px;
  margin-top: 16px;
}

.category-item {
  display: flex;
  gap: 10px;
  padding: 12px;
  border: 1px solid var(--border);
  border-radius: 14px;
  background: #f8fafc;
  cursor: pointer;
  transition: all 0.18s ease;
}

.category-item:hover,
.category-item.active {
  border-color: #2563eb;
  background: #eff6ff;
  box-shadow: 0 8px 18px rgba(37, 99, 235, 0.08);
}

.category-icon {
  width: 34px;
  height: 34px;
  border-radius: 12px;
  background: #dbeafe;
  color: #2563eb;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 900;
  flex-shrink: 0;
}

.category-info {
  min-width: 0;
}

.category-info strong {
  display: block;
  color: var(--text-main);
  line-height: 1.2;
}

.category-info span {
  display: block;
  margin-top: 5px;
  color: var(--text-sub);
  font-size: 12px;
  line-height: 1.35;
}

.list-head__right {
  gap: 8px;
}

.summary-row {
  display: grid;
  grid-template-columns: repeat(3, minmax(120px, 1fr));
  gap: 12px;
  margin-bottom: 12px;
}

.summary-card {
  padding: 12px 14px;
  border-radius: 12px;
  border: 1px solid var(--border);
  background: #f8fafc;
}

.summary-card span {
  display: block;
  color: var(--text-sub);
  font-size: 13px;
  margin-bottom: 4px;
}

.summary-card strong {
  display: block;
  color: var(--text-main);
  font-size: 20px;
  font-weight: 800;
}

.summary-card.is-warning strong {
  color: #dc2626;
}

.title-cell {
  min-width: 0;
}

.title-main {
  font-weight: 800;
  color: var(--text-main);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.title-sub {
  margin-top: 4px;
  color: var(--text-sub);
  font-size: 12px;
}

.table-actions {
  display: flex;
  gap: 8px;
  white-space: nowrap;
}

.editor-actions,
.file-actions {
  display: flex;
  gap: 8px;
}

.detail-alert {
  margin-top: 14px;
}

.material-form {
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

@media (max-width: 1480px) {
  .company-material-page {
    grid-template-columns: 240px minmax(0, 1fr);
  }

  .material-detail {
    grid-column: 1 / -1;
  }
}

@media (max-width: 920px) {
  .company-material-page {
    grid-template-columns: 1fr;
  }

  .summary-row {
    grid-template-columns: 1fr;
  }
}
</style>
