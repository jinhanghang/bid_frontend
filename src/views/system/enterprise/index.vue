<template>
  <div class="page">
    <div class="page-body">
      <div class="card card--table">
        <div class="list-head">
          <div class="list-head__left">
            <el-input
              v-if="canManagePlatform"
              v-model="query.keyword"
              class="filter-input"
              placeholder="按企业名称 / 信用代码 / 联系人 / 电话自动查询"
              clearable
              @input="onKeywordInput"
            />
            <div v-else class="profile-title">企业资料</div>
          </div>
          <div class="list-head__right">
            <el-button class="table-icon-btn" text :icon="Refresh" @click="loadData" />
            <el-button v-if="canManagePlatform" type="primary" :icon="Plus" @click="openCreate">新增企业</el-button>
          </div>
        </div>

        <el-table
          class="ui-table"
          :data="rows"
          border
          stripe
          height="calc(100vh - 224px)"
          v-loading="loading"
        >
          <el-table-column prop="enterpriseName" label="企业名称" min-width="220" show-overflow-tooltip />
          <el-table-column prop="creditCode" label="统一社会信用代码" min-width="180" show-overflow-tooltip />
          <el-table-column prop="legalPerson" label="法定代表人" width="120" show-overflow-tooltip />
          <el-table-column prop="contactName" label="联系人" width="120" show-overflow-tooltip />
          <el-table-column prop="contactPhone" label="联系电话" width="140" />
          <el-table-column prop="email" label="邮箱" min-width="170" show-overflow-tooltip />
          <el-table-column prop="status" label="状态" width="90">
            <template #default="{ row }">
              <StatusTag :value="row.status" :map="enableMap" />
            </template>
          </el-table-column>
          <el-table-column prop="createTime" label="创建时间" width="170" />
          <el-table-column label="操作" width="210" fixed="right">
            <template #default="{ row }">
              <div class="table-actions">
                <el-button v-if="canEditEnterprise(row)" link type="primary" @click="openEdit(row)">编辑</el-button>
                <el-button v-if="canManagePlatform" link type="warning" @click="toggleStatus(row)">
                  {{ Number(row.status) === 1 ? '禁用' : '启用' }}
                </el-button>
                <el-button v-if="canManagePlatform" link type="danger" @click="deleteRow(row)">删除</el-button>
                <span v-if="!canEditEnterprise(row) && !canManagePlatform" class="no-action">-</span>
              </div>
            </template>
          </el-table-column>
        </el-table>

        <PageFooterPager
          v-if="canManagePlatform"
          v-model:page="pager.page"
          v-model:size="pager.size"
          :total="pager.total"
          @change="loadData"
        />
      </div>
    </div>

    <el-dialog
      v-model="dialog.visible"
      :title="dialog.isEdit ? '编辑企业' : '新增企业'"
      width="780px"
      destroy-on-close
    >
      <el-form ref="formRef" :model="form" :rules="rules" label-width="140px">
        <el-form-item label="企业名称" prop="enterpriseName">
          <el-input v-model="form.enterpriseName" placeholder="请输入企业名称" />
        </el-form-item>
        <el-form-item label="统一社会信用代码">
          <el-input v-model="form.creditCode" placeholder="请输入统一社会信用代码" />
        </el-form-item>
        <el-form-item label="法定代表人">
          <el-input v-model="form.legalPerson" placeholder="请输入法定代表人" />
        </el-form-item>
        <el-form-item label="联系人">
          <el-input v-model="form.contactName" placeholder="请输入联系人" />
        </el-form-item>
        <el-form-item label="联系电话">
          <el-input v-model="form.contactPhone" placeholder="请输入联系电话" />
        </el-form-item>
        <el-form-item label="邮箱">
          <el-input v-model="form.email" placeholder="请输入邮箱" />
        </el-form-item>
        <el-form-item label="企业地址">
          <el-input v-model="form.address" type="textarea" :rows="3" placeholder="请输入企业地址" />
        </el-form-item>
        <el-form-item v-if="canManagePlatform" label="状态">
          <el-select v-model="form.status" style="width: 100%">
            <el-option label="正常" :value="1" />
            <el-option label="停用" :value="0" />
          </el-select>
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="form.remark" type="textarea" :rows="3" placeholder="请输入备注" />
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="dialog.visible = false">取消</el-button>
        <el-button type="primary" @click="submitForm">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { ElMessage, ElMessageBox } from '@/plugins/element-plus-api'
import { Plus, Refresh } from '@element-plus/icons-vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import {
  createEnterprise,
  deleteEnterprise,
  getCurrentEnterprise,
  pageEnterprises,
  updateEnterprise,
  updateEnterpriseStatus
} from '@/api/enterprise'
import PageFooterPager from '@/components/PageFooterPager.vue'
import StatusTag from '@/components/StatusTag.vue'
import { enableMap } from '@/config/statusMaps'

const route = useRoute()
const auth = useAuthStore()

const ROLE_SUPER_ADMIN = 'SUPERADMIN'
const ROLE_PLATFORM_ADMIN = 'PLATFORMADMIN'
const ROLE_ENTERPRISE_ADMIN = 'ENTERPRISEADMIN'

const loading = ref(false)
const rows = ref([])
const formRef = ref()
const query = reactive({ keyword: '' })
const pager = reactive({ page: 1, size: 10, total: 0 })
const dialog = reactive({ visible: false, isEdit: false, id: null })
const form = reactive({
  enterpriseName: '',
  creditCode: '',
  legalPerson: '',
  contactName: '',
  contactPhone: '',
  email: '',
  address: '',
  status: 1,
  remark: ''
})

let timer = null

const currentRoleCodes = computed(() => normalizeRoleList(auth.user?.roles || auth.user?.roleCodes || []))
const isSuperAdmin = computed(() => currentRoleCodes.value.includes(ROLE_SUPER_ADMIN))
const isPlatformAdmin = computed(() => currentRoleCodes.value.includes(ROLE_PLATFORM_ADMIN))
const isEnterpriseAdmin = computed(() => currentRoleCodes.value.includes(ROLE_ENTERPRISE_ADMIN))
const canManagePlatform = computed(() => isSuperAdmin.value || isPlatformAdmin.value)
const currentOnly = computed(() => route.meta.currentOnly || (!canManagePlatform.value && isEnterpriseAdmin.value))

const rules = {
  enterpriseName: [{ required: true, message: '请输入企业名称', trigger: 'blur' }]
}

watch(
  () => route.fullPath,
  () => {
    pager.page = 1
    query.keyword = ''
    loadData()
  },
  { immediate: true }
)

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
  clearTimeout(timer)
  timer = setTimeout(() => {
    pager.page = 1
    loadData()
  }, 300)
}

async function loadData() {
  loading.value = true
  try {
    if (currentOnly.value) {
      const item = await getCurrentEnterprise()
      rows.value = item ? [item] : []
      pager.total = rows.value.length
      return
    }

    const res = await pageEnterprises({
      pageNum: pager.page,
      pageSize: pager.size,
      current: pager.page,
      size: pager.size,
      keyword: query.keyword || undefined
    })
    rows.value = res?.records || []
    pager.total = Number(res?.total || 0)
  } finally {
    loading.value = false
  }
}

function resetForm(row = {}) {
  form.enterpriseName = row.enterpriseName || ''
  form.creditCode = row.creditCode || ''
  form.legalPerson = row.legalPerson || ''
  form.contactName = row.contactName || ''
  form.contactPhone = row.contactPhone || ''
  form.email = row.email || ''
  form.address = row.address || ''
  form.status = row.status === 0 ? 0 : 1
  form.remark = row.remark || ''
}

function openCreate() {
  dialog.visible = true
  dialog.isEdit = false
  dialog.id = null
  resetForm({ status: 1 })
}

function openEdit(row) {
  dialog.visible = true
  dialog.isEdit = true
  dialog.id = row.id
  resetForm(row)
}

function canEditEnterprise(row) {
  if (canManagePlatform.value) return true
  return isEnterpriseAdmin.value && String(row?.id) === String(auth.user?.enterpriseId || '')
}

async function submitForm() {
  await formRef.value?.validate()
  const payload = {
    enterpriseName: form.enterpriseName,
    creditCode: form.creditCode,
    legalPerson: form.legalPerson,
    contactName: form.contactName,
    contactPhone: form.contactPhone,
    email: form.email,
    address: form.address,
    status: form.status,
    remark: form.remark
  }

  if (dialog.isEdit) {
    await updateEnterprise(dialog.id, payload)
    ElMessage.success('企业信息已保存')
  } else {
    await createEnterprise(payload)
    ElMessage.success('企业新增成功')
  }

  dialog.visible = false
  await loadData()
  await auth.loadMe()
}

async function toggleStatus(row) {
  const nextStatus = Number(row.status) === 1 ? 0 : 1
  const actionText = nextStatus === 1 ? '启用' : '禁用'
  await ElMessageBox.confirm(`确认${actionText}企业「${row.enterpriseName}」吗？`, '提示', {
    type: nextStatus === 1 ? 'success' : 'warning'
  })
  await updateEnterpriseStatus(row.id, { status: nextStatus })
  ElMessage.success(`${actionText}成功`)
  await loadData()
}

async function deleteRow(row) {
  await ElMessageBox.confirm(`确认删除企业「${row.enterpriseName}」吗？如果企业下已有用户，后端会拒绝删除。`, '提示', {
    type: 'warning'
  })
  await deleteEnterprise(row.id)
  ElMessage.success('删除成功')
  await loadData()
}
</script>

<style scoped>
.profile-title {
  font-size: 14px;
  font-weight: 700;
  color: var(--text-main);
}

.table-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  white-space: nowrap;
}

.no-action {
  color: #94a3b8;
}
</style>
