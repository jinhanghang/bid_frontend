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
          <div class="quota-pill" @click="goMemberCenter">
            <span>剩余总字数：{{ formatNumber(quota.availableWords) }}</span>
            <el-button size="small" type="primary" plain round @click.stop="goMemberCenter">立即充值</el-button>
          </div>
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
                <el-dropdown-item divided @click="goMemberCenter">会员中心</el-dropdown-item>
                <el-dropdown-item v-if="showCompanyApprovalEntry" @click="goCompanyApproval">
                  <span class="dropdown-row">
                    <span>公司审批</span>
                    <el-tag
                      v-if="approvalPendingCount > 0"
                      size="small"
                      type="danger"
                      effect="light"
                    >
                      {{ approvalPendingCount }}
                    </el-tag>
                  </span>
                </el-dropdown-item>
                <el-dropdown-item v-if="showManagerEntry" @click="goManager">用户管理</el-dropdown-item>
                <el-dropdown-item v-if="showMemberAdminEntry" @click="goMemberAdmin">会员运营</el-dropdown-item>
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

    <el-dialog
      v-model="enterpriseDialogVisible"
      title="完善企业信息"
      width="460px"
      :close-on-click-modal="false"
      :close-on-press-escape="false"
      :show-close="false"
      append-to-body
    >
      <div class="enterprise-complete-tip">
        登录成功。首次使用需要填写企业名称，系统会根据该名称自动创建企业资料，其余资料可以后续在资料库中补充。
      </div>
      <el-form
        ref="enterpriseFormRef"
        :model="enterpriseForm"
        :rules="enterpriseRules"
        label-position="top"
        @submit.prevent
      >
        <el-form-item label="企业名称" prop="enterpriseName">
          <el-input
            v-model.trim="enterpriseForm.enterpriseName"
            maxlength="200"
            show-word-limit
            placeholder="请输入企业名称"
            @keyup.enter="submitEnterpriseComplete"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button
          type="primary"
          :loading="enterpriseSubmitting"
          @click="submitEnterpriseComplete"
        >
          保存并进入系统
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
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
import { getMemberSummary } from '@/api/member'
import { getAuditPendingCount } from '@/api/enterpriseApply'

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
const showMemberAdminEntry = computed(() => isSuperAdmin.value || isPlatformAdmin.value)
const showCompanyApprovalEntry = computed(() => showManagerEntry.value)
// 是否需要补全企业信息以后只以后端返回的 needCompleteEnterprise 为准。
// 超级管理员、平台管理员等无企业归属账号由后端统一返回 false，避免前端仅根据 enterpriseId 为空误弹。
const shouldCompleteEnterprise = computed(() => auth.isLogin && Boolean(auth.needCompleteEnterprise))
const approvalPendingCount = ref(0)
const enterpriseDialogVisible = ref(false)
const enterpriseSubmitting = ref(false)
const enterpriseFormRef = ref()
const enterpriseForm = reactive({
  enterpriseName: ''
})
const enterpriseRules = {
  enterpriseName: [
    { required: true, message: '请输入企业名称', trigger: 'blur' },
    { min: 2, max: 200, message: '企业名称长度必须在 2 到 200 个字符之间', trigger: 'blur' }
  ]
}

const quota = reactive({
  availableWords: 0,
  freeRemainWords: 0,
  paidRemainWords: 0
})

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
  await Promise.all([loadQuota(), loadApprovalPendingCount()])
  ElMessage.success('用户信息已刷新')
}

async function loadQuota() {
  if (!auth.token) return
  try {
    const res = await getMemberSummary()
    quota.availableWords = Number(res?.availableWords || 0)
    quota.freeRemainWords = Number(res?.freeRemainWords || 0)
    quota.paidRemainWords = Number(res?.paidRemainWords || 0)
  } catch (e) {
    quota.availableWords = 0
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

async function submitEnterpriseComplete() {
  await enterpriseFormRef.value?.validate()
  enterpriseSubmitting.value = true
  try {
    await auth.completeEnterprise({
      enterpriseName: enterpriseForm.enterpriseName
    })
    enterpriseDialogVisible.value = false
    enterpriseForm.enterpriseName = ''
    await Promise.all([loadQuota(), loadApprovalPendingCount()])
    ElMessage.success('企业资料已创建')
  } finally {
    enterpriseSubmitting.value = false
  }
}

onMounted(() => {
  loadQuota()
  loadApprovalPendingCount()
})

watch(() => route.fullPath, () => {
  loadQuota()
  loadApprovalPendingCount()
})

watch(() => auth.user?.id, () => {
  loadApprovalPendingCount()
})

watch(shouldCompleteEnterprise, (value) => {
  enterpriseDialogVisible.value = Boolean(value)
}, { immediate: true })

function goManager() {
  router.push('/system/users')
}

async function logout() {
  await auth.logout()
  router.replace('/login')
}
</script>

<style scoped>
.enterprise-complete-tip {
  margin-bottom: 16px;
  color: #5f6b7a;
  line-height: 1.7;
}

.dropdown-row {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-width: 86px;
  justify-content: space-between;
}

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

.quota-pill {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 5px 8px 5px 12px;
  border-radius: 999px;
  background: linear-gradient(135deg, #ff6b57, #ff9f45);
  color: #fff;
  font-size: 13px;
  font-weight: 700;
  box-shadow: 0 8px 18px rgba(255, 111, 76, 0.22);
  cursor: pointer;
}

.quota-pill :deep(.el-button) {
  height: 24px;
  padding: 0 10px;
  border-color: rgba(255, 255, 255, 0.8);
  background: rgba(255, 255, 255, 0.92);
  color: #f06543;
  font-weight: 700;
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
