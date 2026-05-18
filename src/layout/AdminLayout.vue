<template>
  <div class="product-shell">
    <aside class="product-rail">
      <div class="rail-logo">AI</div>

      <el-scrollbar class="rail-scroll">
        <div class="rail-menu">
          <div
            v-for="item in productMenus"
            :key="item.path"
            class="rail-item"
            :class="{ active: isMenuActive(item) }"
            @click="goMenu(item)"
          >
            <el-badge v-if="item.badge" :value="item.badge" class="rail-badge">
              <el-icon><component :is="item.icon" /></el-icon>
            </el-badge>
            <el-icon v-else><component :is="item.icon" /></el-icon>
            <span>{{ item.title }}</span>
          </div>
        </div>
      </el-scrollbar>
      
    </aside>

    <section class="product-main">
      <header class="product-header">
        <div class="header-left">
          <div class="page-title">{{ currentTitle }}</div>
        </div>
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
                <el-dropdown-item disabled>{{ userSubText }}</el-dropdown-item>
                <el-dropdown-item v-if="showManagerEntry" divided @click="goManager">管理后台</el-dropdown-item>
                <el-dropdown-item divided @click="logout">退出登录</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </header>

      <main class="product-content">
        <router-view />
      </main>
    </section>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { ElMessage } from 'element-plus'
import {
  ArrowDown,
  DataBoard,
  Delete,
  Download,
  Files,
  Folder,
  House,
  MagicStick,
  Notebook,
  Refresh,
  Tickets
} from '@element-plus/icons-vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()

const ROLE_SUPER_ADMIN = 'SUPERADMIN'
const ROLE_PLATFORM_ADMIN = 'PLATFORMADMIN'
const ROLE_ENTERPRISE_ADMIN = 'ENTERPRISEADMIN'

const currentTitle = computed(() => route.meta.title || '恒鼎·智慧AI')
const avatarText = computed(() => (auth.displayName || '用').slice(0, 1))
const userSubText = computed(() => auth.user?.enterpriseName || auth.user?.phone || auth.user?.username || '暂无账号信息')
const currentRoleCodes = computed(() => normalizeRoleList(auth.user?.roles || auth.user?.roleCodes || []))
const isSuperAdmin = computed(() => currentRoleCodes.value.includes(ROLE_SUPER_ADMIN))
const isPlatformAdmin = computed(() => currentRoleCodes.value.includes(ROLE_PLATFORM_ADMIN))
const isEnterpriseAdmin = computed(() => currentRoleCodes.value.includes(ROLE_ENTERPRISE_ADMIN))
const showManagerEntry = computed(() => isSuperAdmin.value || isPlatformAdmin.value || isEnterpriseAdmin.value)

const productMenus = computed(() => [
  { title: '首页', path: '/dashboard', icon: House },
  { title: 'AI方案', path: '/ai/solutions', icon: MagicStick },
  { title: 'AI文档', path: '/ai/documents', icon: Notebook },
  { title: 'AI标书', path: '/ai-bid', icon: Files },
  { title: '知识库', path: '/knowledge/bases', icon: Folder },
  { title: '资料库', path: '/materials', icon: Tickets },
  { title: '标讯商机', path: '/tender/notice', icon: DataBoard },
  { title: '下载中心', path: '/download-center', icon: Download },
  { title: '回收站', path: '/recycle-bin', icon: Delete }
])

function isMenuActive(item) {
  if (item.path === '/dashboard') return route.path === '/dashboard' || route.path === '/'
  if (item.path === '/ai-bid') return route.path === '/ai-bid' || route.path.startsWith('/bid/projects')
  return route.path === item.path || route.path.startsWith(`${item.path}/`)
}

function goMenu(item) {
  router.push(item.path)
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

async function reloadMe() {
  await auth.loadMe()
  ElMessage.success('用户信息已刷新')
}

function goManager() {
  router.push('/system/users')
}

async function logout() {
  await auth.logout()
  router.replace('/login')
}
</script>

<style scoped>
.product-shell {
  display: flex;
  width: 100%;
  height: 100%;
  background: #eef3fb;
}

.product-rail {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 82px;
  height: 100%;
  background: #f7faff;
  border-right: 1px solid #e7edf7;
}

.rail-logo {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 38px;
  height: 38px;
  margin: 14px 0 8px;
  border-radius: 14px;
  background: linear-gradient(135deg, #3b82f6, #7c3aed);
  color: #fff;
  font-weight: 800;
}

.rail-scroll {
  flex: 1;
  width: 100%;
}

.rail-menu {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 4px 8px 12px;
}

.rail-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 5px;
  width: 64px;
  min-height: 58px;
  border-radius: 14px;
  color: #273449;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.18s ease;
}

.rail-item .el-icon {
  font-size: 20px;
}

.rail-item:hover {
  background: #edf4ff;
  color: #246bfe;
}

.rail-item.active {
  color: #246bfe;
  background: #ffffff;
  box-shadow: 0 8px 20px rgba(37, 99, 235, 0.12);
}

.rail-badge :deep(.el-badge__content) {
  transform: translate(8px, -6px) scale(0.8);
}

.product-main {
  display: flex;
  flex: 1;
  min-width: 0;
  height: 100%;
  flex-direction: column;
}

.product-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 52px;
  padding: 0 18px;
}

.page-title {
  font-size: 16px;
  font-weight: 800;
  color: #1f2937;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 12px;
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
  width: 34px;
  height: 34px;
  border-radius: 50%;
  color: #fff;
  font-weight: 800;
  background: linear-gradient(135deg, #2563eb, #06b6d4);
}

.product-content {
  flex: 1;
  min-height: 0;
  padding: 0 16px 16px 0;
  overflow: hidden;
}
</style>
