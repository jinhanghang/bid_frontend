<template>
  <div class="page">
    <div class="page-body">
      <div class="card card--table">
        <div class="list-head">
          <div class="list-head__left">
            <el-input
                v-model="query.keyword"
                class="filter-input"
                placeholder="按姓名 / 手机号 / 账号 / 企业名称自动查询"
                clearable
                @input="onKeywordInput"
            />
          </div>
          <div class="list-head__right">
            <el-button class="table-icon-btn" text :icon="Refresh" @click="loadData" />
            <el-button v-if="canCreateUser" type="primary" :icon="Plus" @click="openCreate">新增用户</el-button>
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
          <el-table-column prop="fullName" label="姓名" min-width="130" show-overflow-tooltip />
          <el-table-column prop="phone" label="手机号" min-width="140" />
          <el-table-column prop="username" label="账号" min-width="170" show-overflow-tooltip />
          <el-table-column prop="industryCategory" label="行业类别" min-width="150" show-overflow-tooltip>
            <template #default="{ row }">{{ row.industryCategory || '未设置' }}</template>
          </el-table-column>

          <el-table-column prop="isInternal" label="内部人员" width="100">
            <template #default="{ row }">
              <el-tag :type="Number(row.isInternal) === 1 ? 'success' : 'info'" effect="plain">
                {{ Number(row.isInternal) === 1 ? '是' : '否' }}
              </el-tag>
            </template>
          </el-table-column>

          <el-table-column prop="oaUsername" label="OA系统用户名" min-width="150" show-overflow-tooltip>
            <template #default="{ row }">
              {{ Number(row.isInternal) === 1 ? (row.oaUsername || '-') : '-' }}
            </template>
          </el-table-column>

          <el-table-column prop="enterpriseId" label="所属企业" min-width="190" show-overflow-tooltip>
            <template #default="{ row }">{{ getEnterpriseName(row.enterpriseId, row.enterpriseName) }}</template>
          </el-table-column>

          <el-table-column prop="roleNames" label="角色" min-width="180" show-overflow-tooltip>
            <template #default="{ row }">
              {{ formatRoleNames(row) }}
            </template>
          </el-table-column>

          <el-table-column prop="status" label="状态" width="90">
            <template #default="{ row }">
              <StatusTag :value="row.status" :map="enableMap" />
            </template>
          </el-table-column>

          <el-table-column prop="lastLoginTime" label="最后登录" width="170" />
          <el-table-column prop="createTime" label="创建时间" width="170" />

          <el-table-column label="操作" width="310" fixed="right">
            <template #default="{ row }">
              <div class="table-actions">
                <el-button v-if="canEditRow(row)" link type="primary" @click="openEdit(row)">编辑</el-button>
                <el-button v-if="canAssignRole(row)" link type="primary" @click="openRoleDialog(row)">分配角色</el-button>
                <el-button v-if="canToggleRow(row)" link type="warning" @click="toggleStatus(row)">
                  {{ Number(row.status) === 1 ? '禁用' : '启用' }}
                </el-button>
                <el-button v-if="canResetRow(row)" link type="warning" @click="resetPassword(row)">重置密码</el-button>
                <el-button v-if="canDeleteRow(row)" link type="danger" @click="deleteRow(row)">删除</el-button>
                <span v-if="!hasAnyRowAction(row)" class="no-action">-</span>
              </div>
            </template>
          </el-table-column>
        </el-table>

        <PageFooterPager
            v-model:page="pager.page"
            v-model:size="pager.size"
            :total="pager.total"
            @change="loadData"
        />
      </div>
    </div>

    <el-dialog
        v-model="formDialog.visible"
        :title="formDialog.isEdit ? '编辑用户' : '新增用户'"
        width="760px"
        destroy-on-close
    >
      <el-form ref="formRef" :model="form" :rules="rules" label-width="120px">
        <el-form-item label="姓名" prop="fullName">
          <el-input v-model="form.fullName" placeholder="请输入姓名" />
        </el-form-item>

        <el-form-item label="手机号" prop="phone">
          <el-input v-model="form.phone" placeholder="请输入手机号" />
        </el-form-item>

        <el-form-item label="邮箱">
          <el-input v-model="form.email" placeholder="请输入邮箱" />
        </el-form-item>

        <el-form-item label="行业类别">
          <el-input v-model="form.industryCategory" clearable placeholder="用于标讯商机自动筛选，可由人员首次进入时选择" />
        </el-form-item>

        <el-form-item label="是否内部人员" prop="isInternal">
          <el-radio-group v-model="form.isInternal">
            <el-radio :label="1">是</el-radio>
            <el-radio :label="0">否</el-radio>
          </el-radio-group>
        </el-form-item>

        <el-form-item label="OA系统用户名" prop="oaUsername">
          <el-input
              v-model="form.oaUsername"
              clearable
              :disabled="Number(form.isInternal) !== 1"
              placeholder="选择内部人员后填写 OA 系统用户名"
          />
        </el-form-item>

        <el-form-item v-if="showRoleField" label="角色" prop="roleIds">
          <el-select
              v-model="form.roleIds"
              multiple
              :multiple-limit="1"
              clearable
              filterable
              placeholder="请选择角色"
              style="width: 100%"
          >
            <el-option
                v-for="role in assignableRoles"
                :key="role.id"
                :label="role.roleName"
                :value="role.id"
            />
          </el-select>
        </el-form-item>

        <el-form-item v-if="showEnterpriseField" label="所属企业" prop="enterpriseId">
          <el-select
              v-model="form.enterpriseId"
              clearable
              filterable
              placeholder="请选择用户所属企业"
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

        <el-form-item v-if="!formDialog.isEdit" label="初始密码">
          <el-input
              v-model="form.password"
              show-password
              clearable
              placeholder="可不填，不填则由后端自动生成"
          />
        </el-form-item>

        <el-form-item label="状态">
          <el-select v-model="form.status" style="width: 100%">
            <el-option label="启用" :value="1" />
            <el-option label="禁用" :value="0" />
          </el-select>
        </el-form-item>

        <el-form-item label="备注">
          <el-input v-model="form.remark" type="textarea" :rows="4" placeholder="请输入备注" />
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="formDialog.visible = false">取消</el-button>
        <el-button type="primary" @click="submitForm">保存</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="roleDialog.visible" title="分配角色" width="560px" destroy-on-close>
      <div class="form-tip" style="margin-bottom: 12px">
        当前用户：{{ roleDialog.user?.fullName || roleDialog.user?.username || '-' }}
      </div>

      <el-form label-width="92px">
        <el-form-item label="角色">
          <el-select v-model="roleDialog.roleIds" multiple :multiple-limit="1" clearable filterable style="width: 100%">
            <el-option
                v-for="role in assignableRoles"
                :key="role.id"
                :label="`${role.roleName}（${role.roleCode}）`"
                :value="role.id"
            />
          </el-select>
        </el-form-item>

        <el-form-item v-if="roleDialogRequiresEnterprise" label="所属企业">
          <el-select
              v-model="roleDialog.enterpriseId"
              clearable
              filterable
              placeholder="请选择用户所属企业"
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
      </el-form>

      <template #footer>
        <el-button @click="roleDialog.visible = false">取消</el-button>
        <el-button type="primary" @click="submitRoles">保存角色</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { ElMessage, ElMessageBox } from '@/plugins/element-plus-api'
import { Plus, Refresh } from '@element-plus/icons-vue'
import {
  createUser,
  deleteUser,
  getUserRoles,
  pageUsers,
  resetUserPassword,
  updateUser,
  updateUserRoles,
  updateUserStatus
} from '@/api/systemUser'
import { createCrudApi } from '@/api/crud'
import { useAuthStore } from '@/stores/auth'
import PageFooterPager from '@/components/PageFooterPager.vue'
import StatusTag from '@/components/StatusTag.vue'
import { enableMap } from '@/config/statusMaps'

const ROLE_SUPER_ADMIN = 'SUPERADMIN'
const ROLE_PLATFORM_ADMIN = 'PLATFORMADMIN'
const ROLE_ENTERPRISE_ADMIN = 'ENTERPRISEADMIN'
const ROLE_NORMAL_USER = 'NORMALUSER'
const MAIN_ASSIGNABLE_ROLE_CODES = [ROLE_PLATFORM_ADMIN, ROLE_ENTERPRISE_ADMIN, ROLE_NORMAL_USER]

const auth = useAuthStore()
const loading = ref(false)
const formRef = ref()
const rows = ref([])
const roles = ref([])
const enterprises = ref([])
const timer = ref(null)

const query = reactive({
  keyword: ''
})

const pager = reactive({
  page: 1,
  size: 10,
  total: 0
})

const formDialog = reactive({
  visible: false,
  isEdit: false
})

const form = reactive({})

const roleDialog = reactive({
  visible: false,
  user: null,
  roleIds: [],
  enterpriseId: ''
})

const currentRoleCodes = computed(() => {
  const user = auth.user || {}
  return normalizeRoleList(user.roles || user.roleCodes || user.authorities || [])
})

const currentUserId = computed(() => auth.user?.id || auth.user?.userId)
const currentEnterpriseId = computed(() => auth.user?.enterpriseId)
const isSuperAdmin = computed(() => currentRoleCodes.value.includes(ROLE_SUPER_ADMIN))
const isPlatformAdmin = computed(() => currentRoleCodes.value.includes(ROLE_PLATFORM_ADMIN))
const isEnterpriseAdmin = computed(() => currentRoleCodes.value.includes(ROLE_ENTERPRISE_ADMIN))
const canSelectRole = computed(() => isSuperAdmin.value || isPlatformAdmin.value)
const canSelectEnterprise = computed(() => isSuperAdmin.value || isPlatformAdmin.value)
const canCreateUser = computed(() => isSuperAdmin.value || isPlatformAdmin.value || isEnterpriseAdmin.value)

const assignableRoles = computed(() => {
  let allowCodes = []

  if (isSuperAdmin.value) {
    // 超级管理员也不在页面开放新增/分配 SUPER_ADMIN，避免误操作。
    allowCodes = [ROLE_PLATFORM_ADMIN, ROLE_ENTERPRISE_ADMIN, ROLE_NORMAL_USER]
  } else if (isPlatformAdmin.value) {
    allowCodes = [ROLE_ENTERPRISE_ADMIN, ROLE_NORMAL_USER]
  } else if (isEnterpriseAdmin.value) {
    allowCodes = [ROLE_NORMAL_USER]
  }

  return roles.value.filter((role) => {
    const code = getRoleCode(role)
    return MAIN_ASSIGNABLE_ROLE_CODES.includes(code) && allowCodes.includes(code)
  })
})

const selectedRoles = computed(() => {
  const selectedIds = Array.isArray(form.roleIds) ? form.roleIds : []
  return roles.value.filter((role) => selectedIds.some((id) => String(id) === String(role.id)))
})

const roleDialogSelectedRoles = computed(() => {
  const selectedIds = Array.isArray(roleDialog.roleIds) ? roleDialog.roleIds : []
  return roles.value.filter((role) => selectedIds.some((id) => String(id) === String(role.id)))
})

const selectedRoleCodes = computed(() => selectedRoles.value.map((role) => getRoleCode(role)).filter(Boolean))
const roleDialogSelectedRoleCodes = computed(() => roleDialogSelectedRoles.value.map((role) => getRoleCode(role)).filter(Boolean))

const roleDialogRequiresEnterprise = computed(() => {
  if (!canSelectEnterprise.value) return false
  return roleDialogSelectedRoleCodes.value.some((code) => [ROLE_ENTERPRISE_ADMIN, ROLE_NORMAL_USER].includes(code))
})

const selectedRequiresEnterprise = computed(() => {
  if (formDialog.isEdit) return editTargetRequiresEnterprise()
  if (isEnterpriseAdmin.value) return false
  if (!selectedRoleCodes.value.length) return false
  return selectedRoleCodes.value.some((code) => [ROLE_ENTERPRISE_ADMIN, ROLE_NORMAL_USER].includes(code))
})

const showRoleField = computed(() => !formDialog.isEdit && canSelectRole.value)

const showEnterpriseField = computed(() => {
  if (!canSelectEnterprise.value) return false
  return selectedRequiresEnterprise.value
})

const rules = {
  fullName: [{ required: true, message: '请输入姓名', trigger: 'blur' }],
  phone: [{ required: true, message: '请输入手机号', trigger: 'blur' }],
  roleIds: [{ validator: validateRoleIds, trigger: 'change' }],
  enterpriseId: [{ validator: validateEnterpriseId, trigger: 'change' }],
  oaUsername: [{ validator: validateOaUsername, trigger: ['blur', 'change'] }]
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

  return values
      .map((item) => {
        if (typeof item === 'string') return normalizeRoleCode(item)
        return normalizeRoleCode(item?.roleCode || item?.code || item?.authority || item?.name || '')
      })
      .filter(Boolean)
}

function getRoleCode(role = {}) {
  return normalizeRoleCode(role.roleCode || role.code || '')
}

function getRowRoleCodes(row = {}) {
  const codes = normalizeRoleList(row.roleCodes || row.roles || [])
  if (codes.length) return codes

  const roleNames = Array.isArray(row.roleNames) ? row.roleNames : []
  const inferred = []

  roleNames.forEach((name) => {
    const text = String(name || '')
    if (text.includes('超级')) inferred.push(ROLE_SUPER_ADMIN)
    else if (text.includes('平台')) inferred.push(ROLE_PLATFORM_ADMIN)
    else if (text.includes('企业')) inferred.push(ROLE_ENTERPRISE_ADMIN)
    else if (text.includes('普通')) inferred.push(ROLE_NORMAL_USER)
  })

  return inferred
}

function rowHasRole(row, roleCode) {
  return getRowRoleCodes(row).includes(roleCode)
}

function isSameUser(row = {}) {
  return String(row.id || '') === String(currentUserId.value || '')
}

function isSameEnterprise(row = {}) {
  return String(row.enterpriseId || '') === String(currentEnterpriseId.value || '')
}

function isProtectedPlatformRow(row = {}) {
  return rowHasRole(row, ROLE_SUPER_ADMIN) || rowHasRole(row, ROLE_PLATFORM_ADMIN)
}

function isEnterpriseAdminRow(row = {}) {
  return rowHasRole(row, ROLE_ENTERPRISE_ADMIN)
}

function editTargetRequiresEnterprise() {
  const codes = getRowRoleCodes(form)
  if (codes.includes(ROLE_SUPER_ADMIN) || codes.includes(ROLE_PLATFORM_ADMIN)) return false
  if (codes.includes(ROLE_ENTERPRISE_ADMIN) || codes.includes(ROLE_NORMAL_USER)) return true
  return Boolean(form.enterpriseId)
}

function canOperateRow(row = {}) {
  if (isSuperAdmin.value) return !rowHasRole(row, ROLE_SUPER_ADMIN)
  if (isPlatformAdmin.value) return !isProtectedPlatformRow(row)

  if (isEnterpriseAdmin.value) {
    return isSameEnterprise(row) && !isProtectedPlatformRow(row) && !isEnterpriseAdminRow(row)
  }

  return false
}

function canEditRow(row) {
  return canOperateRow(row)
}

function canAssignRole(row) {
  return canSelectRole.value && canOperateRow(row) && !isSameUser(row)
}

function canToggleRow(row) {
  return canOperateRow(row) && !isSameUser(row)
}

function canResetRow(row) {
  return canOperateRow(row) && !isSameUser(row)
}

function canDeleteRow(row) {
  return canOperateRow(row) && !isSameUser(row)
}

function hasAnyRowAction(row) {
  return canEditRow(row) || canAssignRole(row) || canToggleRow(row) || canResetRow(row) || canDeleteRow(row)
}

function validateRoleIds(rule, value, callback) {
  if (!showRoleField.value) {
    callback()
    return
  }

  if (!Array.isArray(value) || value.length === 0) {
    callback(new Error('请选择角色'))
    return
  }

  callback()
}

function validateEnterpriseId(rule, value, callback) {
  if (!showEnterpriseField.value) {
    callback()
    return
  }

  if (value === undefined || value === null || value === '') {
    callback(new Error('请选择用户所属企业'))
    return
  }

  callback()
}

function validateOaUsername(rule, value, callback) {
  if (Number(form.isInternal) !== 1) {
    callback()
    return
  }

  if (!String(value || '').trim()) {
    callback(new Error('内部人员请填写 OA 系统用户名'))
    return
  }

  callback()
}

function formatRoleNames(row = {}) {
  if (Array.isArray(row.roleNames) && row.roleNames.length) return row.roleNames.join('、')
  if (Array.isArray(row.roles) && row.roles.length) return row.roles.join('、')
  return '-'
}

function setDefaultCreateRole() {
  if (formDialog.isEdit) return
  if (Array.isArray(form.roleIds) && form.roleIds.length > 0) return

  const normalRole = assignableRoles.value.find((role) => getRoleCode(role) === ROLE_NORMAL_USER)
  const defaultRole = normalRole || assignableRoles.value[0]

  if (defaultRole?.id) {
    form.roleIds = [defaultRole.id]
  }
}

watch(
    () => form.roleIds,
    () => {
      if (!formDialog.isEdit && !selectedRequiresEnterprise.value) {
        form.enterpriseId = ''
      }

      formRef.value?.clearValidate?.(['roleIds', 'enterpriseId'])
    },
    { deep: true }
)

watch(
    () => form.isInternal,
    (value) => {
      if (Number(value) !== 1) {
        form.oaUsername = ''
      }

      formRef.value?.clearValidate?.(['oaUsername'])
    }
)

onMounted(async () => {
  await Promise.all([loadRoles(), loadEnterprises()])
  loadData()
})

function onKeywordInput() {
  clearTimeout(timer.value)

  timer.value = setTimeout(() => {
    pager.page = 1
    loadData()
  }, 300)
}

async function loadData() {
  loading.value = true

  try {
    const res = await pageUsers({
      keyword: query.keyword || undefined,
      pageNum: pager.page,
      pageSize: pager.size
    })

    rows.value = res?.records || []
    pager.total = Number(res?.total || 0)
  } finally {
    loading.value = false
  }
}

async function loadRoles() {
  try {
    roles.value = await createCrudApi('/sys-role').list()
    setDefaultCreateRole()
  } catch (e) {
    roles.value = []
  }
}

async function loadEnterprises() {
  try {
    enterprises.value = await createCrudApi('/enterprise').list()
  } catch (e) {
    enterprises.value = []
  }
}

function getEnterpriseName(id, fallback = '') {
  if (fallback) return fallback

  const match = enterprises.value.find((item) => String(item.id) === String(id))
  return match?.enterpriseName || (id ? `企业 #${id}` : '-')
}

function resetForm(row = {}) {
  for (const key of Object.keys(form)) delete form[key]

  Object.assign(form, {
    id: row.id,
    enterpriseId: row.enterpriseId ?? '',
    username: row.username ?? '',
    password: '',
    phone: row.phone ?? '',
    fullName: row.fullName ?? '',
    email: row.email ?? '',
    industryCategory: row.industryCategory ?? '',
    isInternal: Number(row.isInternal) === 1 ? 1 : 0,
    oaUsername: row.oaUsername ?? '',
    status: row.status ?? 1,
    roleIds: row.roleIds || [],
    roleCodes: row.roleCodes || row.roles || [],
    roleNames: row.roleNames || [],
    remark: row.remark ?? ''
  })
}

function openCreate() {
  formDialog.isEdit = false
  resetForm()

  if (isEnterpriseAdmin.value) {
    const normalRole = roles.value.find((role) => getRoleCode(role) === ROLE_NORMAL_USER)
    form.roleIds = normalRole?.id ? [normalRole.id] : []
    form.enterpriseId = currentEnterpriseId.value || ''
  } else {
    setDefaultCreateRole()
  }

  formDialog.visible = true
}

function openEdit(row) {
  formDialog.isEdit = true
  resetForm(row)
  formDialog.visible = true
}

function buildCreatePayload() {
  const payload = {
    fullName: form.fullName,
    phone: form.phone,
    email: form.email || undefined,
    industryCategory: String(form.industryCategory || '').trim() || undefined,
    isInternal: Number(form.isInternal) === 1 ? 1 : 0,
    oaUsername: Number(form.isInternal) === 1 ? String(form.oaUsername || '').trim() : '',
    status: form.status,
    remark: form.remark || undefined
  }

  if (form.password) {
    payload.password = form.password
  }

  if (showRoleField.value) {
    payload.roleIds = form.roleIds
  }

  if (showEnterpriseField.value) {
    payload.enterpriseId = form.enterpriseId
  }

  return payload
}

function buildUpdatePayload() {
  const payload = {
    fullName: form.fullName,
    phone: form.phone,
    email: form.email || undefined,
    industryCategory: form.industryCategory == null ? undefined : String(form.industryCategory).trim(),
    isInternal: Number(form.isInternal) === 1 ? 1 : 0,
    oaUsername: Number(form.isInternal) === 1 ? String(form.oaUsername || '').trim() : '',
    status: form.status,
    remark: form.remark || undefined
  }

  if (showEnterpriseField.value) {
    payload.enterpriseId = form.enterpriseId
  }

  return payload
}

async function submitForm() {
  await formRef.value.validate()

  if (formDialog.isEdit) {
    await updateUser(form.id, buildUpdatePayload())
    ElMessage.success('修改成功')
  } else {
    const res = await createUser(buildCreatePayload())
    await showCreatedAccount(res)
  }

  formDialog.visible = false
  loadData()
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

async function showCreatedAccount(res = {}) {
  const username = res?.username || ''
  const password = res?.plainPassword || res?.password || ''

  if (username || password) {
    await ElMessageBox.alert(
        `<div style="line-height: 1.9">
        <div>用户创建成功，请复制保存。</div>
        ${username ? `<div>账号：<b>${escapeHtml(username)}</b></div>` : ''}
        ${password ? `<div>初始密码：<b>${escapeHtml(password)}</b></div>` : '<div>初始密码：已按你填写的密码保存</div>'}
        <div style="color:#909399;margin-top:8px">账号和初始密码只在创建成功时展示一次。</div>
      </div>`,
        '新增成功',
        {
          dangerouslyUseHTMLString: true,
          confirmButtonText: '我已保存'
        }
    )
  } else {
    ElMessage.success('新增成功')
  }
}

async function deleteRow(row) {
  await ElMessageBox.confirm(`确定删除用户「${row.fullName || row.username || row.phone}」吗？`, '删除确认', { type: 'warning' })
  await deleteUser(row.id)
  ElMessage.success('删除成功')
  loadData()
}

async function toggleStatus(row) {
  const next = Number(row.status) === 1 ? 0 : 1
  await updateUserStatus(row.id, { status: next })
  ElMessage.success(next === 1 ? '已启用' : '已禁用')
  loadData()
}

async function resetPassword(row) {
  await ElMessageBox.confirm(`确定重置用户「${row.fullName || row.username}」的密码吗？`, '重置密码', { type: 'warning' })
  const res = await resetUserPassword(row.id)
  const username = res?.username || row.username || ''
  const password = res?.plainPassword || res?.password || ''

  if (password) {
    await ElMessageBox.alert(
        `<div style="line-height: 1.9">
        ${username ? `<div>账号：<b>${escapeHtml(username)}</b></div>` : ''}
        <div>新密码：<b>${escapeHtml(password)}</b></div>
        <div style="color:#909399;margin-top:8px">请复制保存，密码只显示一次。</div>
      </div>`,
        '重置成功',
        {
          dangerouslyUseHTMLString: true,
          confirmButtonText: '我已保存'
        }
    )
  } else {
    ElMessage.success('密码已重置')
  }
}

async function openRoleDialog(row) {
  roleDialog.user = row
  roleDialog.roleIds = await getUserRoles(row.id)
  roleDialog.enterpriseId = row.enterpriseId || ''
  roleDialog.visible = true
}

async function submitRoles() {
  if (!roleDialog.user?.id) return

  if (!Array.isArray(roleDialog.roleIds) || roleDialog.roleIds.length === 0) {
    ElMessage.warning('请选择角色')
    return
  }

  if (roleDialogRequiresEnterprise.value && !roleDialog.enterpriseId) {
    ElMessage.warning('企业管理员或普通用户必须选择所属企业')
    return
  }

  await updateUserRoles(roleDialog.user.id, {
    roleIds: roleDialog.roleIds,
    enterpriseId: roleDialogRequiresEnterprise.value ? roleDialog.enterpriseId : null
  })

  ElMessage.success('角色已保存')
  roleDialog.visible = false
  loadData()
}
</script>

<style scoped>
.no-action {
  color: #909399;
}
</style>
