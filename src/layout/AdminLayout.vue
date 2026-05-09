<template>
  <div class="admin-shell">
    <aside class="admin-aside">
      <div class="brand">
        <div class="brand-logo">AI</div>
        <div>
          <div class="brand-title">AI标书系统</div>
          <div class="brand-sub">一键中标 / 标书生成</div>
        </div>
      </div>

      <el-scrollbar class="menu-scroll">
        <el-menu
            :default-active="route.path"
            router
            unique-opened
            class="side-menu"
        >
          <el-menu-item index="/dashboard">
            <el-icon><DataBoard /></el-icon>
            <span>工作台</span>
          </el-menu-item>

          <el-sub-menu v-if="canUseBusiness" index="bid">
            <template #title>
              <el-icon><Document /></el-icon>
              <span>标书业务</span>
            </template>
            <el-menu-item index="/bid/projects">标书项目</el-menu-item>
            <el-menu-item v-if="canManageBusinessData" index="/bid/templates">标书模板</el-menu-item>
            <el-menu-item v-if="canManageBusinessData" index="/bid/template-variables">模板变量</el-menu-item>
            <el-menu-item index="/bid/company-materials">企业资料库</el-menu-item>
          </el-sub-menu>

          <el-sub-menu v-if="canUseBusiness" index="ai">
            <template #title>
              <el-icon><MagicStick /></el-icon>
              <span>AI能力</span>
            </template>
            <el-menu-item index="/ai/workbench">AI生成工作台</el-menu-item>
            <el-menu-item index="/ai/solutions">AI方案</el-menu-item>
            <el-menu-item v-if="canManagePrompt" index="/ai/prompts">Prompt模板</el-menu-item>
            <el-menu-item v-if="canManageAiModel" index="/ai/models">模型配置</el-menu-item>
            <el-menu-item index="/ai/tasks">生成任务</el-menu-item>
            <el-menu-item index="/ai/results">生成结果</el-menu-item>
            <el-menu-item index="/ai/exports">导出记录</el-menu-item>
          </el-sub-menu>

          <el-sub-menu v-if="canUseBusiness" index="tender">
            <template #title>
              <el-icon><Tickets /></el-icon>
              <span>一键中标</span>
            </template>
            <el-menu-item index="/tender/sources">招标数据源</el-menu-item>
            <el-menu-item index="/tender/notices">招标公告</el-menu-item>
            <el-menu-item index="/tender/reports">一键报备</el-menu-item>
          </el-sub-menu>

          <el-sub-menu v-if="canUseBusiness" index="knowledge">
            <template #title>
              <el-icon><Collection /></el-icon>
              <span>知识库</span>
            </template>
            <el-menu-item index="/knowledge/bases">知识库管理</el-menu-item>
          </el-sub-menu>

          <el-sub-menu v-if="showSystemMenu" index="system">
            <template #title>
              <el-icon><Setting /></el-icon>
              <span>系统管理</span>
            </template>
            <el-menu-item v-if="canManageUsers" index="/system/users">用户管理</el-menu-item>
            <el-menu-item v-if="canSubmitEnterpriseApply" index="/system/enterprise-apply">企业申请</el-menu-item>
            <el-menu-item v-if="canAuditEnterpriseApply" index="/system/enterprise-apply-audit">企业申请审核</el-menu-item>
            <el-menu-item v-if="canViewEnterpriseProfile" index="/system/enterprise-profile">企业资料</el-menu-item>
            <el-menu-item v-if="canManageEnterprise" index="/system/enterprises">企业管理</el-menu-item>
            <el-menu-item v-if="canManageCoreSystem" index="/system/roles">角色管理</el-menu-item>
            <el-menu-item v-if="canManageCoreSystem" index="/system/menus">菜单管理</el-menu-item>
            <el-menu-item v-if="canManageCoreSystem" index="/system/files">文件资源</el-menu-item>
            <el-menu-item v-if="canManageCoreSystem" index="/system/configs">系统配置</el-menu-item>
            <el-menu-item v-if="canManageCoreSystem" index="/system/dict-types">字典类型</el-menu-item>
            <el-menu-item v-if="canManageCoreSystem" index="/system/dict-data">字典数据</el-menu-item>
          </el-sub-menu>
        </el-menu>
      </el-scrollbar>
    </aside>

    <section class="admin-main">
      <header class="admin-header">
        <div class="breadcrumb-title">{{ currentTitle }}</div>
        <div class="header-right">
          <el-button link :icon="Refresh" @click="reloadMe">刷新用户</el-button>
          <el-dropdown trigger="click">
            <div class="user-entry">
              <div class="avatar">{{ avatarText }}</div>
              <span>{{ auth.displayName }}</span>
              <el-icon><ArrowDown /></el-icon>
            </div>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item disabled>
                  {{ userSubText }}
                </el-dropdown-item>

                <!-- 新增：修改密码，放在退出登录上方 -->
                <el-dropdown-item divided @click="openChangePasswordDialog">
                  修改密码
                </el-dropdown-item>

                <el-dropdown-item @click="logout">
                  退出登录
                </el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </header>

      <main class="admin-content">
        <router-view />
      </main>
    </section>

    <!-- 修改密码弹窗 -->
    <el-dialog
        v-model="passwordDialogVisible"
        title="修改密码"
        width="430px"
        destroy-on-close
        :close-on-click-modal="false"
        @closed="resetPasswordForm"
    >
      <el-form
          ref="passwordFormRef"
          :model="passwordForm"
          :rules="passwordRules"
          label-width="96px"
      >
        <el-form-item label="旧密码" prop="oldPassword">
          <el-input
              v-model="passwordForm.oldPassword"
              type="password"
              show-password
              clearable
              autocomplete="current-password"
              placeholder="请输入旧密码"
          />
        </el-form-item>

        <el-form-item label="新密码" prop="newPassword">
          <el-input
              v-model="passwordForm.newPassword"
              type="password"
              show-password
              clearable
              autocomplete="new-password"
              placeholder="请输入新密码"
              @input="validateConfirmPasswordAgain"
          />
        </el-form-item>

        <el-form-item label="确认密码" prop="confirmPassword">
          <el-input
              v-model="passwordForm.confirmPassword"
              type="password"
              show-password
              clearable
              autocomplete="new-password"
              placeholder="请再次输入新密码"
          />
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="passwordDialogVisible = false">
          取消
        </el-button>
        <el-button
            type="primary"
            :loading="passwordSubmitting"
            @click="submitChangePassword"
        >
          确认修改
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { computed, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { changePassword } from '@/api/auth'
import { Refresh } from '@element-plus/icons-vue'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()

const ROLE_SUPER_ADMIN = 'SUPERADMIN'
const ROLE_PLATFORM_ADMIN = 'PLATFORMADMIN'
const ROLE_ENTERPRISE_ADMIN = 'ENTERPRISEADMIN'

const currentTitle = computed(() => route.meta.title || 'AI标书后台管理系统')
const avatarText = computed(() => (auth.displayName || '用').slice(0, 1))
const currentRoleCodes = computed(() => normalizeRoleList(auth.user?.roles || auth.user?.roleCodes || []))
const isSuperAdmin = computed(() => currentRoleCodes.value.includes(ROLE_SUPER_ADMIN))
const isPlatformAdmin = computed(() => currentRoleCodes.value.includes(ROLE_PLATFORM_ADMIN))
const isEnterpriseAdmin = computed(() => currentRoleCodes.value.includes(ROLE_ENTERPRISE_ADMIN))
const hasEnterprise = computed(() => Boolean(auth.user?.enterpriseId))
const canManageUsers = computed(() => isSuperAdmin.value || isPlatformAdmin.value || isEnterpriseAdmin.value)
const canManageEnterprise = computed(() => isSuperAdmin.value || isPlatformAdmin.value)
const canManageCoreSystem = computed(() => isSuperAdmin.value)
const canManageAiModel = computed(() => isSuperAdmin.value)
const canManageBusinessData = computed(() => isSuperAdmin.value || isPlatformAdmin.value || isEnterpriseAdmin.value)
const canManagePrompt = computed(() => isSuperAdmin.value || isPlatformAdmin.value)
const canUseBusiness = computed(() => hasEnterprise.value || canManageEnterprise.value)
const canViewEnterpriseProfile = computed(() => isEnterpriseAdmin.value && !canManageEnterprise.value)
const canSubmitEnterpriseApply = computed(() => !hasEnterprise.value && !canManageEnterprise.value)
const canAuditEnterpriseApply = computed(() => canManageEnterprise.value || isEnterpriseAdmin.value)
const showSystemMenu = computed(() => canManageUsers.value || canManageEnterprise.value || canManageCoreSystem.value || canSubmitEnterpriseApply.value || canAuditEnterpriseApply.value)
const userSubText = computed(() => auth.user?.enterpriseName || auth.user?.phone || auth.user?.username || '暂无账号信息')

/**
 * 修改密码弹窗是否显示。
 */
const passwordDialogVisible = ref(false)

/**
 * 修改密码提交 loading。
 */
const passwordSubmitting = ref(false)

/**
 * Element Plus 表单引用。
 */
const passwordFormRef = ref()

/**
 * 修改密码表单。
 *
 * oldPassword：旧密码
 * newPassword：新密码
 * confirmPassword：确认新密码
 */
const passwordForm = reactive({
  oldPassword: '',
  newPassword: '',
  confirmPassword: ''
})

/**
 * 校验新密码。
 */
function validateNewPassword(rule, value, callback) {
  if (!value) {
    callback(new Error('请输入新密码'))
    return
  }

  if (value.length < 6) {
    callback(new Error('新密码至少 6 位'))
    return
  }

  if (value.length > 32) {
    callback(new Error('新密码不能超过 32 位'))
    return
  }

  if (passwordForm.oldPassword && value === passwordForm.oldPassword) {
    callback(new Error('新密码不能和旧密码一样'))
    return
  }

  callback()
}

/**
 * 校验确认密码。
 */
function validateConfirmPassword(rule, value, callback) {
  if (!value) {
    callback(new Error('请再次输入新密码'))
    return
  }

  if (value !== passwordForm.newPassword) {
    callback(new Error('两次输入的新密码不一致'))
    return
  }

  callback()
}

/**
 * 修改密码表单规则。
 */
const passwordRules = {
  oldPassword: [
    { required: true, message: '请输入旧密码', trigger: 'blur' }
  ],
  newPassword: [
    { required: true, validator: validateNewPassword, trigger: 'blur' }
  ],
  confirmPassword: [
    { required: true, validator: validateConfirmPassword, trigger: 'blur' }
  ]
}

/**
 * 新密码变化时，如果确认密码已经填了，需要重新校验确认密码。
 */
function validateConfirmPasswordAgain() {
  if (passwordForm.confirmPassword) {
    passwordFormRef.value?.validateField('confirmPassword')
  }
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

/**
 * 打开修改密码弹窗。
 */
function openChangePasswordDialog() {
  resetPasswordForm()
  passwordDialogVisible.value = true
}

/**
 * 重置修改密码表单。
 */
function resetPasswordForm() {
  passwordForm.oldPassword = ''
  passwordForm.newPassword = ''
  passwordForm.confirmPassword = ''
  passwordSubmitting.value = false
  passwordFormRef.value?.clearValidate()
}

/**
 * 提交修改密码。
 *
 * 修改成功后建议强制退出登录：
 * 1. 避免旧 token 继续使用；
 * 2. 让用户用新密码重新登录；
 * 3. 更符合后台系统安全习惯。
 */
async function submitChangePassword() {
  await passwordFormRef.value?.validate()

  passwordSubmitting.value = true
  try {
    await changePassword({
      oldPassword: passwordForm.oldPassword,
      newPassword: passwordForm.newPassword,
      confirmPassword: passwordForm.confirmPassword
    })

    ElMessage.success('密码修改成功，请重新登录')
    passwordDialogVisible.value = false

    await auth.logout()
    router.replace('/login')
  } finally {
    passwordSubmitting.value = false
  }
}

async function reloadMe() {
  await auth.loadMe()
  ElMessage.success('用户信息已刷新')
}

async function logout() {
  await auth.logout()
  router.replace('/login')
}
</script>

<style scoped>
.admin-shell {
  display: flex;
  width: 100%;
  height: 100%;
  background: var(--page-bg);
}

.admin-aside {
  display: flex;
  flex-direction: column;
  width: 238px;
  height: 100%;
  background: #0f172a;
  color: #ffffff;
}

.brand {
  display: flex;
  align-items: center;
  gap: 10px;
  height: 68px;
  padding: 0 18px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.brand-logo {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 38px;
  height: 38px;
  border-radius: 12px;
  background: var(--aliyun-orange);
  font-weight: 700;
}

.brand-title {
  font-size: 16px;
  font-weight: 700;
}

.brand-sub {
  margin-top: 2px;
  font-size: 12px;
  color: #94a3b8;
}

.menu-scroll {
  flex: 1;
}

.side-menu {
  border-right: 0;
  background: transparent;
}

.side-menu :deep(.el-menu-item),
.side-menu :deep(.el-sub-menu__title) {
  color: #cbd5e1;
}

.side-menu :deep(.el-menu-item.is-active) {
  color: #ffffff;
  background: var(--aliyun-orange);
}

.admin-main {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-width: 0;
  height: 100%;
}

.admin-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 58px;
  padding: 0 18px;
  background: #ffffff;
  border-bottom: 1px solid var(--border);
}

.breadcrumb-title {
  font-size: 16px;
  font-weight: 700;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 16px;
}

.user-entry {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

.avatar {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  color: #ffffff;
  background: var(--aliyun-orange);
  font-size: 14px;
  font-weight: 700;
}

.admin-content {
  flex: 1;
  min-height: 0;
  overflow: auto;
}
</style>