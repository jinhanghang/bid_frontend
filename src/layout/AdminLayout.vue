<template>
  <div class="product-shell">
    <aside class="product-sidebar" :class="{ 'is-collapsed': sidebarCompact }">
      <button type="button" class="brand" @click="router.push('/dashboard')">
        <span class="brand-mark">AI</span>
        <span class="brand-copy">
          <strong>恒鼎·智慧AI</strong>
          <small>AI BIDDING WORKSPACE</small>
        </span>
      </button>

      <el-tooltip :content="sidebarCompact ? '展开菜单' : '收起菜单'" placement="right" :show-after="250">
        <button
          type="button"
          class="sidebar-collapse-toggle"
          :aria-label="sidebarCompact ? '展开左侧菜单' : '收起左侧菜单'"
          @click="toggleSidebar"
        >
          <el-icon>
            <Expand v-if="sidebarCompact" />
            <Fold v-else />
          </el-icon>
        </button>
      </el-tooltip>

      <el-scrollbar class="sidebar-scroll">
        <nav class="sidebar-menu" aria-label="主导航">
          <el-tooltip
            v-for="item in productMenus"
            :key="item.path"
            :content="item.title"
            placement="right"
            :disabled="!sidebarCompact"
            :show-after="280"
          >
            <button
              type="button"
              class="sidebar-item"
              :class="{ active: isMenuActive(item) }"
              :aria-label="item.title"
              @click="goMenu(item)"
            >
              <span class="sidebar-active-line" />
              <span class="sidebar-icon">
                <el-badge v-if="item.badge" :value="item.badge" class="sidebar-badge">
                  <el-icon><component :is="item.icon" /></el-icon>
                </el-badge>
                <el-icon v-else><component :is="item.icon" /></el-icon>
              </span>
              <span class="sidebar-label">{{ item.title }}</span>
            </button>
          </el-tooltip>
        </nav>
      </el-scrollbar>

      <div class="service-panel">
        <div class="service-title">
          <span>AI服务状态</span>
          <span class="service-state" :class="{ offline: !serviceOnline }">
            <i />{{ serviceOnline ? '运行正常' : '连接异常' }}
          </span>
        </div>
        <div class="service-quota-heading">
          <div class="service-quota-label">剩余可用字数</div>
          <el-tooltip content="刷新额度" placement="top">
            <button type="button" class="service-quota-refresh" :class="{ spinning: refreshing }" aria-label="刷新额度" @click.stop="reloadMe">
              <el-icon><Refresh /></el-icon>
            </button>
          </el-tooltip>
        </div>
        <div class="service-quota-value">{{ formatNumber(quota.availableWords) }}</div>
        <div class="service-quota-foot">点击查看会员与额度</div>
        <svg class="service-sparkline" viewBox="0 0 140 42" aria-hidden="true">
          <defs>
            <linearGradient id="sidebarLineGradient" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stop-color="#5b7cfa" />
              <stop offset="1" stop-color="#8b5cf6" />
            </linearGradient>
          </defs>
          <path d="M2 34 C14 19, 22 30, 34 23 S53 32, 65 20 S82 8, 94 17 S113 35, 126 14 S137 9, 139 11" fill="none" stroke="url(#sidebarLineGradient)" stroke-width="2.4" stroke-linecap="round" />
        </svg>
        <button type="button" class="service-link" @click="goMemberCenter">
          额度详情
          <el-icon><ArrowRight /></el-icon>
        </button>
      </div>
    </aside>

    <section class="product-main">
      <header class="product-header">
        <div class="header-left">
          <div v-if="showLayoutTitle" class="page-title">{{ currentTitle }}</div>
        </div>

        <div class="header-right">
          <el-tooltip content="通知" placement="bottom">
            <button type="button" class="header-icon-button notification-button" @click="handleNotificationClick">
              <el-icon><Bell /></el-icon>
              <span v-if="approvalPendingCount > 0" class="notification-dot">{{ Math.min(approvalPendingCount, 99) }}</span>
            </button>
          </el-tooltip>

<!--          <el-tooltip content="帮助" placement="bottom">-->
<!--            <button type="button" class="header-icon-button" @click="handleHelp">-->
<!--              <el-icon><QuestionFilled /></el-icon>-->
<!--            </button>-->
<!--          </el-tooltip>-->

          <el-dropdown trigger="click">
            <button type="button" class="user-entry">
              <span class="avatar">{{ avatarText }}</span>
              <span class="user-copy">
                <strong>{{ auth.displayName }}</strong>
                <small>{{ roleLabel }}</small>
              </span>
              <el-icon class="user-arrow"><ArrowDown /></el-icon>
            </button>
            
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item disabled>{{ userSubText }}</el-dropdown-item>
                <el-dropdown-item divided @click="goMemberCenter">会员中心</el-dropdown-item>
                <el-dropdown-item v-if="showCompanyApprovalEntry" @click="goCompanyApproval">
                  <span class="dropdown-row">
                    <span>公司审批</span>
                    <el-tag v-if="approvalPendingCount > 0" size="small" type="danger" effect="light">
                      {{ approvalPendingCount }}
                    </el-tag>
                  </span>
                </el-dropdown-item>
                <el-dropdown-item v-if="showManagerEntry" @click="goManager">用户管理</el-dropdown-item>
                <el-dropdown-item v-if="showMemberAdminEntry" @click="goMemberAdmin">会员运营</el-dropdown-item>
                <el-dropdown-item @click="openChangePassword">修改密码</el-dropdown-item>
                <el-dropdown-item divided @click="logout">退出登录</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </header>

      <main class="product-content" :class="{ 'task-center-content': route.path === '/ai/tasks' }">
        <router-view />
      </main>
    </section>

    <ChangePasswordDialog
      v-model="changePasswordVisible"
      :phone="auth.user?.phone"
      @success="handlePasswordChanged"
    />
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { ElMessage } from '@/plugins/element-plus-api'
import {
  ArrowDown,
  ArrowRight,
  Bell,
  DataAnalysis,
  Delete,
  Document,
  Download,
  Expand,
  Files,
  Fold,
  House,
  Operation,
  QuestionFilled,
  Refresh
} from '@element-plus/icons-vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { getMemberSummary } from '@/api/member'
import { getAuditPendingCount } from '@/api/enterpriseApply'
import ChangePasswordDialog from '@/components/ChangePasswordDialog.vue'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()

const SIDEBAR_COLLAPSED_KEY = 'ai-bid:sidebar-collapsed'
const viewportWidth = ref(typeof window === 'undefined' ? 1440 : window.innerWidth)
const sidebarCollapsed = ref(readSidebarCollapsed())
const sidebarCompact = computed(() => sidebarCollapsed.value || viewportWidth.value <= 720)

const ROLE_SUPER_ADMIN = 'SUPERADMIN'
const ROLE_PLATFORM_ADMIN = 'PLATFORMADMIN'
const ROLE_ENTERPRISE_ADMIN = 'ENTERPRISEADMIN'

const currentTitle = computed(() => route.meta.title || '恒鼎·智慧AI')
const showLayoutTitle = computed(() => route.path !== '/dashboard')
const avatarText = computed(() => (auth.displayName || '用').slice(0, 1))
const userSubText = computed(() => auth.user?.enterpriseName || auth.user?.phone || auth.user?.username || '暂无账号信息')
const currentRoleCodes = computed(() => normalizeRoleList(auth.user?.roles || auth.user?.roleCodes || []))
const isSuperAdmin = computed(() => currentRoleCodes.value.includes(ROLE_SUPER_ADMIN))
const isPlatformAdmin = computed(() => currentRoleCodes.value.includes(ROLE_PLATFORM_ADMIN))
const isEnterpriseAdmin = computed(() => currentRoleCodes.value.includes(ROLE_ENTERPRISE_ADMIN))
const showManagerEntry = computed(() => isSuperAdmin.value || isPlatformAdmin.value || isEnterpriseAdmin.value)
const showMemberAdminEntry = computed(() => isSuperAdmin.value || isPlatformAdmin.value)
const showCompanyApprovalEntry = computed(() => showManagerEntry.value)
const roleLabel = computed(() => {
  if (isSuperAdmin.value) return '超级管理员'
  if (isPlatformAdmin.value) return '平台管理员'
  if (isEnterpriseAdmin.value) return '企业管理员'
  return auth.user?.enterpriseId ? '企业用户' : '普通用户'
})

const approvalPendingCount = ref(0)
const changePasswordVisible = ref(false)
const refreshing = ref(false)
const serviceOnline = ref(true)
const quota = reactive({
  availableWords: 0,
  freeRemainWords: 0,
  paidRemainWords: 0
})

const productMenus = computed(() => [
  { title: '首页', path: '/dashboard', icon: House },
  { title: 'AI文档', path: '/ai/documents', icon: Document },
  { title: 'AI任务中心', path: '/ai/tasks', icon: Operation },
  { title: 'AI标书', path: '/ai-bid', icon: Files },
  { title: '资料库', path: '/materials/company', activePrefixes: ['/materials/company', '/materials/images'], icon: DataAnalysis },
  { title: '标讯商机', path: '/tender/notice', icon: DataAnalysis },
  { title: '下载中心', path: '/download-center', icon: Download },
  { title: '回收站', path: '/recycle-bin', icon: Delete }
])

function readSidebarCollapsed() {
  try {
    return window.localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === '1'
  } catch (e) {
    return false
  }
}

function saveSidebarCollapsed(value) {
  try {
    window.localStorage.setItem(SIDEBAR_COLLAPSED_KEY, value ? '1' : '0')
  } catch (e) {
    // 浏览器禁用本地存储时，仅保留当前会话状态。
  }
}

function toggleSidebar() {
  if (viewportWidth.value <= 720) {
    ElMessage.info('当前窗口较窄，左侧菜单已自动折叠')
    return
  }
  sidebarCollapsed.value = !sidebarCollapsed.value
  saveSidebarCollapsed(sidebarCollapsed.value)
}

function handleViewportResize() {
  viewportWidth.value = window.innerWidth
}

function isMenuActive(item) {
  if (item.path === '/dashboard') return route.path === '/dashboard' || route.path === '/'
  if (item.path === '/ai-bid') return route.path === '/ai-bid' || route.path.startsWith('/bid/projects')
  if (Array.isArray(item.activePrefixes)) return item.activePrefixes.some((prefix) => route.path === prefix || route.path.startsWith(`${prefix}/`))
  if (item.activePrefix) return route.path === item.activePrefix || route.path.startsWith(`${item.activePrefix}/`)
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
  if (refreshing.value) return
  refreshing.value = true
  try {
    await auth.loadMe()
    await Promise.all([loadQuota(), loadApprovalPendingCount()])
    ElMessage.success('额度已刷新')
  } finally {
    refreshing.value = false
  }
}

async function loadQuota() {
  if (!auth.token) return
  try {
    const res = await getMemberSummary()
    quota.availableWords = Number(res?.availableWords || 0)
    quota.freeRemainWords = Number(res?.freeRemainWords || 0)
    quota.paidRemainWords = Number(res?.paidRemainWords || 0)
    serviceOnline.value = true
  } catch (e) {
    quota.availableWords = 0
    serviceOnline.value = false
  }
}

async function loadApprovalPendingCount() {
  if (!auth.token || !showCompanyApprovalEntry.value) {
    approvalPendingCount.value = 0
    return
  }
  try {
    const res = await getAuditPendingCount()
    approvalPendingCount.value = Number(res || 0)
  } catch (e) {
    approvalPendingCount.value = 0
  }
}

function formatNumber(value) {
  return Number(value || 0).toLocaleString()
}

function goMemberCenter() {
  router.push('/member-center')
}

function goMemberAdmin() {
  router.push('/member/admin')
}

function goCompanyApproval() {
  router.push('/system/enterprise-apply-audit')
}

function handleNotificationClick() {
  if (approvalPendingCount.value > 0 && showCompanyApprovalEntry.value) {
    goCompanyApproval()
    return
  }
  ElMessage.info('暂无新的待处理通知')
}

function handleHelp() {
  ElMessage.info('可从首页进入各业务模块，任务异常请在 AI任务中心查看详情')
}

onMounted(() => {
  window.addEventListener('resize', handleViewportResize, { passive: true })
  handleViewportResize()
  loadQuota()
  loadApprovalPendingCount()
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleViewportResize)
})

watch(() => route.fullPath, () => {
  loadQuota()
  loadApprovalPendingCount()
})

watch(() => auth.user?.id, () => {
  loadApprovalPendingCount()
})

function goManager() {
  router.push('/system/users')
}

function openChangePassword() {
  changePasswordVisible.value = true
}

async function handlePasswordChanged() {
  ElMessage.success('密码修改成功，请使用新密码重新登录')
  await auth.logout()
  router.replace('/login')
}

async function logout() {
  await auth.logout()
  router.replace('/login')
}
</script>

<style scoped>
.dropdown-row {
  display: inline-flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  min-width: 96px;
}

.product-shell {
  display: flex;
  width: 100%;
  height: 100%;
  overflow: hidden;
  background:
    radial-gradient(circle at 74% 0%, rgba(105, 124, 255, 0.10), transparent 30%),
    linear-gradient(135deg, #f8fbff 0%, #f1f5fc 48%, #f7f8ff 100%);
}

.product-sidebar {
  position: relative;
  z-index: 4;
  display: flex;
  flex: 0 0 196px;
  width: 196px;
  min-width: 196px;
  height: 100%;
  flex-direction: column;
  padding: 18px 14px 18px;
  border-right: 1px solid rgba(224, 230, 242, 0.9);
  background: rgba(255, 255, 255, 0.92);
  box-shadow: 8px 0 32px rgba(50, 65, 100, 0.04);
  backdrop-filter: blur(18px);
  transition: width 0.22s ease, min-width 0.22s ease, flex-basis 0.22s ease, padding 0.22s ease;
}

.product-sidebar.is-collapsed {
  flex-basis: 78px;
  width: 78px;
  min-width: 78px;
  padding-right: 9px;
  padding-left: 9px;
}

.sidebar-collapse-toggle {
  position: absolute;
  z-index: 8;
  top: 72px;
  right: -13px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  padding: 0;
  border: 1px solid #e2e7f2;
  border-radius: 9px;
  background: rgba(255, 255, 255, 0.98);
  box-shadow: 0 6px 16px rgba(61, 73, 108, 0.14);
  color: #65718a;
  cursor: pointer;
  transition: color 0.18s ease, background 0.18s ease, transform 0.18s ease, box-shadow 0.18s ease;
}

.sidebar-collapse-toggle:hover {
  color: #6556ef;
  background: #f7f5ff;
  box-shadow: 0 8px 20px rgba(89, 75, 188, 0.18);
  transform: translateY(-1px);
}

.sidebar-collapse-toggle :deep(.el-icon) {
  font-size: 15px;
}

.brand {
  display: flex;
  align-items: center;
  width: 100%;
  min-height: 48px;
  padding: 0 8px;
  border: 0;
  background: transparent;
  color: #172033;
  text-align: left;
  cursor: pointer;
}

.brand-mark {
  display: inline-flex;
  flex: 0 0 38px;
  align-items: center;
  justify-content: center;
  width: 38px;
  height: 38px;
  border-radius: 12px;
  background: linear-gradient(145deg, #5276ff 0%, #7b46f6 100%);
  box-shadow: 0 10px 22px rgba(94, 82, 246, 0.25);
  color: #fff;
  font-size: 15px;
  font-weight: 900;
  letter-spacing: 0.5px;
}

.brand-copy {
  display: flex;
  min-width: 0;
  flex-direction: column;
  margin-left: 10px;
}

.brand-copy strong {
  overflow: hidden;
  color: #172033;
  font-size: 15px;
  font-weight: 900;
  line-height: 1.3;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.brand-copy small {
  margin-top: 3px;
  color: #a2abc0;
  font-size: 8px;
  letter-spacing: 0.8px;
  white-space: nowrap;
}

.product-sidebar.is-collapsed .brand {
  justify-content: center;
  padding: 0;
}

.product-sidebar.is-collapsed .brand-copy,
.product-sidebar.is-collapsed .sidebar-label {
  display: none;
}

.product-sidebar.is-collapsed .sidebar-scroll {
  margin-top: 24px;
}

.product-sidebar.is-collapsed .sidebar-menu {
  padding-right: 0;
  padding-left: 0;
}

.product-sidebar.is-collapsed .sidebar-item {
  min-height: 50px;
  justify-content: center;
  padding: 0;
}

.product-sidebar.is-collapsed .sidebar-item:hover {
  transform: translateY(-1px);
}

.product-sidebar.is-collapsed .sidebar-icon {
  margin-right: 0;
}

.sidebar-scroll {
  flex: 1;
  min-height: 0;
  margin-top: 24px;
}

.sidebar-menu {
  display: flex;
  flex-direction: column;
  gap: 7px;
  padding: 0 2px 14px;
}

.sidebar-item {
  position: relative;
  display: flex;
  align-items: center;
  width: 100%;
  min-height: 46px;
  padding: 0 13px;
  overflow: hidden;
  border: 0;
  border-radius: 12px;
  background: transparent;
  color: #4d5b73;
  font-family: inherit;
  font-size: 14px;
  text-align: left;
  cursor: pointer;
  transition: color 0.18s ease, background 0.18s ease, transform 0.18s ease;
}

.sidebar-item:hover {
  color: #5b57ed;
  background: #f5f4ff;
  transform: translateX(2px);
}

.sidebar-item.active {
  color: #6355ee;
  background: linear-gradient(90deg, rgba(111, 91, 239, 0.13), rgba(112, 94, 246, 0.06));
  font-weight: 700;
}

.sidebar-active-line {
  position: absolute;
  top: 9px;
  bottom: 9px;
  left: 0;
  width: 3px;
  border-radius: 0 4px 4px 0;
  background: linear-gradient(180deg, #5875ff, #8b5cf6);
  opacity: 0;
  transform: scaleY(0.35);
  transition: all 0.18s ease;
}

.sidebar-item.active .sidebar-active-line {
  opacity: 1;
  transform: scaleY(1);
}

.sidebar-icon {
  display: inline-flex;
  flex: 0 0 26px;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  margin-right: 10px;
  color: currentColor;
}

.sidebar-icon :deep(.el-icon) {
  font-size: 18px;
}

.sidebar-label {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.sidebar-badge :deep(.el-badge__content) {
  transform: translate(8px, -7px) scale(0.78);
}

.service-panel {
  position: relative;
  flex-shrink: 0;
  min-height: 190px;
  padding: 15px 14px 12px;
  overflow: hidden;
  border: 1px solid rgba(226, 230, 243, 0.92);
  border-radius: 17px;
  background: linear-gradient(160deg, rgba(255, 255, 255, 0.98), rgba(248, 247, 255, 0.94));
  box-shadow: 0 14px 30px rgba(69, 66, 125, 0.08);
}

.service-title {
  display: flex;
  flex-direction: column;
  gap: 7px;
  color: #667085;
  font-size: 12px;
}

.service-state {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: #18b976;
  font-size: 12px;
  font-weight: 700;
}

.service-state i {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #2bd589;
  box-shadow: 0 0 0 4px rgba(43, 213, 137, 0.10);
}

.service-state.offline {
  color: #ef476f;
}

.service-state.offline i {
  background: #ef476f;
  box-shadow: 0 0 0 4px rgba(239, 71, 111, 0.10);
}

.service-quota-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 15px;
}

.service-quota-refresh {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  padding: 0;
  border: 0;
  border-radius: 7px;
  background: rgba(91, 124, 250, 0.10);
  color: rgb(91, 124, 250);
  cursor: pointer;
}

.service-quota-refresh:hover { background: rgba(91, 124, 250, 0.18); }
.service-quota-refresh.spinning :deep(.el-icon) { animation: spin 0.8s linear infinite; }

.service-quota-label {
  color: #7b8499;
  font-size: 11px;
}

.service-quota-value {
  margin-top: 4px;
  color: #162033;
  font-size: 24px;
  font-weight: 900;
  letter-spacing: 0.3px;
}

.service-quota-foot {
  margin-top: 3px;
  color: #a0a9bd;
  font-size: 10px;
}

.service-sparkline {
  display: block;
  width: 100%;
  height: 42px;
  margin-top: 5px;
}

.service-link {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 3px;
  width: 100%;
  padding: 0;
  border: 0;
  background: transparent;
  color: #6d5df6;
  font-family: inherit;
  font-size: 11px;
  cursor: pointer;
}

.product-sidebar.is-collapsed .service-panel {
  display: flex;
  min-height: 56px;
  align-items: center;
  justify-content: center;
  padding: 0;
  border-radius: 14px;
}

.product-sidebar.is-collapsed .service-title {
  align-items: center;
}

.product-sidebar.is-collapsed .service-title > span:first-child,
.product-sidebar.is-collapsed .service-quota-label,
.product-sidebar.is-collapsed .service-quota-value,
.product-sidebar.is-collapsed .service-quota-foot,
.product-sidebar.is-collapsed .service-sparkline,
.product-sidebar.is-collapsed .service-link {
  display: none;
}

.product-sidebar.is-collapsed .service-state {
  gap: 0;
  font-size: 0;
}

.product-sidebar.is-collapsed .service-state i {
  width: 10px;
  height: 10px;
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
  flex: 0 0 64px;
  align-items: center;
  justify-content: space-between;
  height: 64px;
  padding: 0 28px;
}

.header-left {
  min-width: 0;
}

.page-title {
  overflow: hidden;
  color: #20283b;
  font-size: 17px;
  font-weight: 800;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 9px;
  margin-left: auto;
}

.quota-pill {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  min-height: 34px;
  padding: 4px 5px 4px 14px;
  border: 0;
  border-radius: 999px;
  background: linear-gradient(110deg, #ff705e 0%, #ff9d3d 100%);
  box-shadow: 0 8px 18px rgba(255, 119, 76, 0.22);
  color: #fff;
  font-family: inherit;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
}

.quota-pill strong {
  padding: 6px 11px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.95);
  color: #f17643;
  font-weight: 800;
}

.header-icon-button {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  padding: 0;
  border: 0;
  border-radius: 10px;
  background: transparent;
  color: #445069;
  cursor: pointer;
  transition: background 0.18s ease, color 0.18s ease, transform 0.18s ease;
}

.header-icon-button:hover {
  color: #6355ee;
  background: rgba(99, 85, 238, 0.08);
  transform: translateY(-1px);
}

.header-icon-button :deep(.el-icon) {
  font-size: 18px;
}

.header-icon-button.spinning :deep(.el-icon) {
  animation: header-spin 0.8s linear infinite;
}

.notification-dot {
  position: absolute;
  top: 1px;
  right: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 16px;
  height: 16px;
  padding: 0 4px;
  border: 2px solid #f5f8fd;
  border-radius: 999px;
  background: #ff4d5f;
  color: #fff;
  font-size: 8px;
  font-weight: 800;
}

.user-entry {
  display: flex;
  align-items: center;
  min-height: 42px;
  padding: 3px 4px 3px 6px;
  border: 0;
  border-radius: 13px;
  background: transparent;
  font-family: inherit;
  cursor: pointer;
  transition: background 0.18s ease;
}

.user-entry:hover {
  background: rgba(255, 255, 255, 0.7);
}

.avatar {
  display: inline-flex;
  flex: 0 0 36px;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border: 3px solid rgba(255, 255, 255, 0.92);
  border-radius: 50%;
  background: linear-gradient(145deg, #6276f7, #8f58dd);
  box-shadow: 0 6px 14px rgba(82, 75, 153, 0.20);
  color: #fff;
  font-size: 14px;
  font-weight: 900;
}

.user-copy {
  display: flex;
  max-width: 128px;
  flex-direction: column;
  align-items: flex-start;
  margin-left: 9px;
}

.user-copy strong,
.user-copy small {
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.user-copy strong {
  color: #242c3f;
  font-size: 13px;
  line-height: 1.35;
}

.user-copy small {
  margin-top: 2px;
  color: #97a0b4;
  font-size: 10px;
}

.user-arrow {
  margin: 0 3px 0 7px;
  color: #8f98aa;
  font-size: 12px;
}

.product-content {
  flex: 1;
  min-height: 0;
  padding: 0 24px 24px;
  overflow: auto;
}

.product-content.task-center-content {
  padding-bottom: 18px;
  overflow: hidden;
}

@keyframes header-spin {
  to { transform: rotate(360deg); }
}

@media (max-width: 1200px) {
  .product-header {
    padding-right: 20px;
    padding-left: 20px;
  }

  .user-copy {
    max-width: 104px;
  }
}

@media (max-width: 900px) {
  .product-header {
    padding: 0 16px;
  }

  .product-content {
    padding: 0 14px 16px;
  }

  .quota-pill span,
  .user-copy {
    display: none;
  }

  .quota-pill {
    padding-left: 5px;
  }

  .quota-pill strong {
    padding: 6px 10px;
  }
}

@media (max-width: 640px) {
  .product-sidebar,
  .product-sidebar.is-collapsed {
    flex-basis: 68px;
    width: 68px;
    min-width: 68px;
    padding: 12px 6px;
  }

  .product-sidebar .brand {
    justify-content: center;
    padding: 0;
  }

  .product-sidebar .brand-copy,
  .product-sidebar .sidebar-label {
    display: none;
  }

  .product-sidebar .sidebar-item {
    min-height: 50px;
    justify-content: center;
    padding: 0;
  }

  .product-sidebar .sidebar-icon {
    margin-right: 0;
  }

  .sidebar-collapse-toggle {
    top: 66px;
    right: -11px;
    width: 22px;
    height: 22px;
  }

  .brand-mark {
    width: 34px;
    height: 34px;
  }

  .service-panel {
    display: none;
  }

  .header-right {
    gap: 4px;
  }

  .quota-pill {
    display: none;
  }
}
</style>
