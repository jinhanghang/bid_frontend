<template>
  <div class="page dashboard-page">
    <div class="page-body">
      <div class="welcome-card card">
        <div>
          <div class="welcome-title">恒鼎·智慧AI工作台</div>
          <div class="welcome-sub">
            <template v-if="needEnterpriseApply">
              当前账号还没有绑定企业。请先提交企业申请，审核通过后即可使用标书项目、知识库、AI生成等业务功能。
            </template>
            <template v-else>
              从项目创建、资料准备、AI标书生成到文件导出，集中查看当前企业的标书业务进展。
            </template>
          </div>
        </div>
        <div class="welcome-actions">
          <el-button v-if="needEnterpriseApply" type="primary" @click="$router.push('/system/enterprise-apply')">提交企业申请</el-button>
          <el-button v-else @click="loadStats" :icon="Refresh">刷新</el-button>
        </div>
      </div>

      <div v-if="needEnterpriseApply" class="enterprise-guide card">
        <div class="guide-title">请选择一种方式继续</div>
        <div class="enterprise-options">
          <div class="enterprise-option">
            <div class="option-title">注册新企业</div>
            <div class="option-desc">
              适合你的企业还没有在系统中开通。提交企业入驻申请后，由平台管理员审核；审核通过后系统会创建企业，并把你设置为企业管理员。
            </div>
          </div>
          <div class="enterprise-option">
            <div class="option-title">加入已有企业</div>
            <div class="option-desc">
              适合你的企业已经在系统中存在。提交加入申请后，由平台管理员或企业管理员审核；审核通过后你会加入该企业。
            </div>
          </div>
        </div>
      </div>

      <template v-else>
        <div class="stat-grid dashboard-stats" v-loading="loading">
          <div v-for="item in stats" :key="item.title" class="stat-card" @click="$router.push(item.path)">
            <div class="stat-title">{{ item.title }}</div>
            <div class="stat-value">{{ item.value }}</div>
            <div class="stat-desc">{{ item.desc }}</div>
          </div>
        </div>

        <div class="card list-card recent-project-card">
          <div class="card-head">
            <div>
              <div class="guide-title">最近标书项目</div>
              <div class="guide-desc">最近更新的项目，方便继续处理。</div>
            </div>
            <el-button link type="primary" @click="$router.push('/bid/projects')">全部项目</el-button>
          </div>

          <div v-if="summary.recentProjects?.length" class="recent-list">
            <div v-for="item in summary.recentProjects" :key="item.id" class="recent-item" @click="$router.push(item.path)">
              <div class="recent-main">
                <strong>{{ item.title }}</strong>
                <span>{{ item.subTitle || '-' }} · {{ item.typeLabel || '标书项目' }}</span>
              </div>
              <div class="recent-right">
                <el-tag :type="projectStatusTag(item.status)" effect="light">{{ item.statusLabel }}</el-tag>
                <span>{{ item.timeText }}</span>
              </div>
            </div>
          </div>
          <el-empty v-else description="暂无标书项目" />
        </div>

        <div class="card quick-card">
          <div class="guide-title">常用操作</div>
          <div class="quick-grid">
            <div v-for="item in quickActions" :key="item.title" class="quick-item" @click="$router.push(item.path)">
              <div class="quick-icon">{{ item.icon }}</div>
              <div>
                <strong>{{ item.title }}</strong>
                <span>{{ item.desc }}</span>
              </div>
            </div>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { Refresh } from '@element-plus/icons-vue'
import { getDashboardSummary } from '@/api/dashboard'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const loading = ref(false)

const summary = reactive({
  bidProjectCount: 0,
  documentExportCount: 0,
  knowledgeBaseCount: 0,
  companyMaterialCount: 0,
  tenderNoticeCount: 0,
  tenderReportCount: 0,
  recentProjects: []
})

const roleCodes = computed(() => normalizeRoleList(auth.user?.roleCodes || auth.user?.roles || []))
const isPlatformUser = computed(() => roleCodes.value.includes('SUPERADMIN') || roleCodes.value.includes('PLATFORMADMIN'))
const needEnterpriseApply = computed(() => !isPlatformUser.value && !auth.user?.enterpriseId)

const stats = computed(() => [
  { title: '标书项目', value: summary.bidProjectCount || 0, desc: '项目全流程管理', path: '/bid/projects' },
  { title: '企业资料', value: summary.companyMaterialCount || 0, desc: '公司简介 / 资质 / 业绩', path: '/bid/company-materials' },
  { title: '导出文件', value: summary.documentExportCount || 0, desc: 'Word / Markdown 导出', path: '/ai/exports' },
  { title: '知识库', value: summary.knowledgeBaseCount || 0, desc: '资料检索准备', path: '/knowledge/bases' }
])

const quickActions = [
  { title: '新建标书项目', desc: '录入项目基础信息，绑定知识库和企业资料', icon: '项', path: '/bid/projects' },
  { title: '维护企业资料', desc: '补充公司简介、资质证书、项目业绩', icon: '企', path: '/bid/company-materials' },
  { title: '查看文件资源', desc: '检查OSS文件和业务依赖', icon: '文', path: '/system/files' }
]

onMounted(loadStats)

async function loadStats() {
  loading.value = true
  try {
    const res = await getDashboardSummary()
    Object.assign(summary, {
      bidProjectCount: 0,
      documentExportCount: 0,
      knowledgeBaseCount: 0,
      companyMaterialCount: 0,
      tenderNoticeCount: 0,
      tenderReportCount: 0,
      recentProjects: [],
      ...(res || {})
    })
  } finally {
    loading.value = false
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

function projectStatusTag(status) {
  const value = String(status || '').toUpperCase()
  if (value === 'EXPORTED' || value === 'GENERATED') return 'success'
  if (value === 'GENERATING') return 'warning'
  if (value === 'FAILED') return 'danger'
  return 'info'
}
</script>

<style scoped>
.dashboard-page {
  background: var(--page-bg);
}

.welcome-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 22px;
}

.welcome-title {
  font-size: 24px;
  font-weight: 800;
}

.welcome-sub {
  margin-top: 8px;
  color: var(--text-sub);
  line-height: 1.7;
}

.welcome-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.enterprise-guide {
  margin-top: 16px;
  padding: 22px;
}

.enterprise-options {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

.enterprise-option {
  padding: 18px;
  border: 1px solid var(--border);
  border-radius: 14px;
  background: #f8fafc;
}

.option-title {
  font-size: 16px;
  font-weight: 800;
}

.option-desc {
  margin-top: 8px;
  color: var(--text-sub);
  line-height: 1.7;
}

.dashboard-stats {
  margin-top: 16px;
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

.stat-card {
  cursor: pointer;
  transition: all 0.18s ease;
}

.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 12px 24px rgba(15, 23, 42, 0.08);
}

.stat-desc {
  margin-top: 6px;
  color: var(--text-sub);
  font-size: 12px;
}

.recent-project-card,
.quick-card {
  margin-top: 16px;
}

.list-card,
.quick-card {
  padding: 20px;
}

.card-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 14px;
  margin-bottom: 16px;
}

.guide-title {
  font-size: 18px;
  font-weight: 800;
}

.guide-desc {
  margin-top: 6px;
  color: var(--text-sub);
  font-size: 13px;
}

.recent-list {
  display: grid;
  gap: 10px;
}

.recent-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  padding: 12px;
  border-radius: 14px;
  background: #f8fafc;
  border: 1px solid var(--border);
}

.recent-main {
  min-width: 0;
}

.recent-main strong {
  display: block;
  color: var(--text-main);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.recent-main span {
  display: block;
  margin-top: 5px;
  color: var(--text-sub);
  font-size: 12px;
  line-height: 1.5;
}

.recent-right {
  display: flex;
  align-items: flex-end;
  flex-direction: column;
  gap: 6px;
  flex-shrink: 0;
  color: var(--text-sub);
  font-size: 12px;
}

.quick-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  margin-top: 16px;
}

.quick-item {
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 72px;
  padding: 16px;
  border-radius: 14px;
  border: 1px solid var(--border);
  background: #f8fafc;
  cursor: pointer;
  transition: all 0.18s ease;
}

.quick-item:hover {
  background: #eff6ff;
  border-color: #bfdbfe;
  transform: translateY(-1px);
}

.quick-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 38px;
  height: 38px;
  border-radius: 12px;
  background: #2563eb;
  color: #fff;
  font-weight: 900;
}

.quick-item strong {
  display: block;
  color: var(--text-main);
}

.quick-item span {
  display: block;
  margin-top: 4px;
  color: var(--text-sub);
  font-size: 12px;
  line-height: 1.4;
}

@media (max-width: 1200px) {
  .dashboard-stats {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .quick-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 768px) {
  .welcome-card,
  .enterprise-options {
    grid-template-columns: 1fr;
  }

  .welcome-card {
    align-items: flex-start;
    flex-direction: column;
  }

  .dashboard-stats,
  .quick-grid {
    grid-template-columns: 1fr;
  }
}
</style>
