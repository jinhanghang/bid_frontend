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
                <el-dropdown-item divided @click="logout">退出登录</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </header>

      <main class="admin-content">
        <router-view />
      </main>
    </section>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { ElMessage } from 'element-plus'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
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