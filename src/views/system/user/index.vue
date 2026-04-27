<template>
  <div class="page">
    <div class="page-body">
      <div class="card card--table">
        <div class="list-head">
          <div class="list-head__left">
            <el-input
              v-model="query.keyword"
              class="filter-input"
              placeholder="按账号 / 姓名 / 手机号 / 邮箱自动查询"
              clearable
              @input="onKeywordInput"
            />
          </div>
          <div class="list-head__right">
            <el-button class="table-icon-btn" text :icon="Refresh" @click="loadData" />
            <el-button type="primary" :icon="Plus" @click="openCreate">新增用户</el-button>
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
          <el-table-column prop="id" label="ID" width="90" />
          <el-table-column prop="username" label="账号" min-width="140" show-overflow-tooltip />
          <el-table-column prop="fullName" label="真实姓名" min-width="130" />
          <el-table-column prop="phone" label="手机号" min-width="140" />
          <el-table-column prop="email" label="邮箱" min-width="180" show-overflow-tooltip />
          <el-table-column prop="memberLevel" label="会员等级" width="110" />
          <el-table-column prop="usedWords" label="已用字数" width="110" />
          <el-table-column prop="status" label="状态" width="90">
            <template #default="{ row }">
              <StatusTag :value="row.status" :map="enableMap" />
            </template>
          </el-table-column>
          <el-table-column prop="roleNames" label="角色" min-width="180">
            <template #default="{ row }">
              {{ Array.isArray(row.roleNames) ? row.roleNames.join('、') : '-' }}
            </template>
          </el-table-column>
          <el-table-column prop="lastLoginTime" label="最后登录" width="170" />
          <el-table-column label="操作" width="340" fixed="right">
            <template #default="{ row }">
              <div class="table-actions">
                <el-button link type="primary" @click="openEdit(row)">编辑</el-button>
                <el-button link type="primary" @click="openRoleDialog(row)">分配角色</el-button>
                <el-button link type="warning" @click="toggleStatus(row)">
                  {{ Number(row.status) === 1 ? '禁用' : '启用' }}
                </el-button>
                <el-button link type="warning" @click="resetPassword(row)">重置密码</el-button>
                <el-button link type="danger" @click="deleteRow(row)">删除</el-button>
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

    <el-dialog v-model="formDialog.visible" :title="formDialog.isEdit ? '编辑用户' : '新增用户'" width="760px" destroy-on-close>
      <el-form ref="formRef" :model="form" :rules="rules" label-width="120px">
        <el-form-item label="所属企业ID">
          <el-input-number v-model="form.enterpriseId" controls-position="right" style="width: 100%" />
        </el-form-item>
        <el-form-item v-if="!formDialog.isEdit" label="账号">
          <el-input v-model="form.username" placeholder="账号登录时填写" />
        </el-form-item>
        <el-form-item v-if="!formDialog.isEdit" label="密码">
          <el-input v-model="form.password" type="password" show-password placeholder="填写账号时建议设置密码" />
        </el-form-item>
        <el-form-item label="手机号" prop="phone">
          <el-input v-model="form.phone" />
        </el-form-item>
        <el-form-item label="真实姓名">
          <el-input v-model="form.fullName" />
        </el-form-item>
        <el-form-item label="邮箱">
          <el-input v-model="form.email" />
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="form.status" style="width: 100%">
            <el-option label="正常" :value="1" />
            <el-option label="停用" :value="0" />
          </el-select>
        </el-form-item>
        <el-form-item v-if="!formDialog.isEdit" label="角色">
          <el-select v-model="form.roleIds" multiple clearable filterable style="width: 100%">
            <el-option v-for="role in roles" :key="role.id" :label="role.roleName" :value="role.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="form.remark" type="textarea" :rows="4" />
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
      <el-select v-model="roleDialog.roleIds" multiple clearable filterable style="width: 100%">
        <el-option v-for="role in roles" :key="role.id" :label="`${role.roleName}（${role.roleCode}）`" :value="role.id" />
      </el-select>

      <template #footer>
        <el-button @click="roleDialog.visible = false">取消</el-button>
        <el-button type="primary" @click="submitRoles">保存角色</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
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
import PageFooterPager from '@/components/PageFooterPager.vue'
import StatusTag from '@/components/StatusTag.vue'
import { enableMap } from '@/config/statusMaps'

const loading = ref(false)
const formRef = ref()
const rows = ref([])
const roles = ref([])
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
  roleIds: []
})

const rules = {
  phone: [{ required: true, message: '请输入手机号', trigger: 'blur' }]
}

onMounted(() => {
  loadData()
  loadRoles()
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
  } catch (e) {
    roles.value = []
  }
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
    status: row.status ?? 1,
    roleIds: row.roleIds || [],
    remark: row.remark ?? ''
  })
}

function openCreate() {
  formDialog.isEdit = false
  resetForm()
  formDialog.visible = true
}

function openEdit(row) {
  formDialog.isEdit = true
  resetForm(row)
  formDialog.visible = true
}

async function submitForm() {
  await formRef.value.validate()
  const payload = { ...form }
  if (formDialog.isEdit) {
    await updateUser(form.id, payload)
    ElMessage.success('修改成功')
  } else {
    const res = await createUser(payload)
    if (res?.plainPassword) {
      ElMessageBox.alert(`用户创建成功，初始密码：${res.plainPassword}`, '请保存初始密码', {
        confirmButtonText: '我已保存'
      })
    } else {
      ElMessage.success('新增成功')
    }
  }
  formDialog.visible = false
  loadData()
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
  const password = res?.plainPassword || res?.password || ''
  if (password) {
    await ElMessageBox.alert(`新密码：${password}`, '重置成功，请保存', {
      confirmButtonText: '我已保存'
    })
  } else {
    ElMessage.success('密码已重置')
  }
}

async function openRoleDialog(row) {
  roleDialog.user = row
  roleDialog.roleIds = await getUserRoles(row.id)
  roleDialog.visible = true
}

async function submitRoles() {
  if (!roleDialog.user?.id) return
  await updateUserRoles(roleDialog.user.id, { roleIds: roleDialog.roleIds })
  ElMessage.success('角色已保存')
  roleDialog.visible = false
  loadData()
}
</script>
