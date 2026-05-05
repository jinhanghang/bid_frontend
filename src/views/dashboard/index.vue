<template>
  <div class="page dashboard-page">
    <div class="page-body">
      <div class="welcome-card card">
        <div>
          <div class="welcome-title">AI标书工作台</div>
          <div class="welcome-sub">
            <template v-if="needEnterpriseApply">
              当前账号还没有绑定企业。请先提交企业申请，审核通过后即可使用标书项目、知识库、AI生成等业务功能。
            </template>
            <template v-else>
              从项目创建、资料准备、AI生成到Word套版导出，集中查看当前企业的标书业务进展。
            </template>
          </div>
        </div>
        <div class="welcome-actions">
          <el-button v-if="needEnterpriseApply" type="primary" @click="$router.push('/system/enterprise-apply')">提交企业申请</el-button>
          <template v-else>
            <el-button @click="loadStats" :icon="Refresh">刷新</el-button>
            <el-button type="primary" @click="$router.push('/bid/projects')">进入标书项目</el-button>
            <el-button type="success" @click="$router.push('/ai/workbench')">开始AI生成</el-button>
          </template>
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

        <div class="dashboard-main-grid">
          <div class="card process-card">
            <div class="card-head">
              <div>
                <div class="guide-title">项目流程状态</div>
                <div class="guide-desc">按项目状态查看当前标书处理阶段。</div>
              </div>
              <el-button link type="primary" @click="$router.push('/bid/projects')">查看项目</el-button>
            </div>

            <div class="status-grid">
              <div v-for="item in projectStatusCards" :key="item.label" class="status-card">
                <div class="status-card__label">{{ item.label }}</div>
                <div class="status-card__value">{{ item.value }}</div>
              </div>
            </div>

            <div class="progress-section">
              <div class="progress-title">
                <span>项目完成度参考</span>
                <strong>{{ projectProgress }}%</strong>
              </div>
              <el-progress :percentage="projectProgress" :status="projectProgress >= 80 ? 'success' : undefined" />
            </div>
          </div>

          <div class="card todo-card">
            <div class="card-head">
              <div>
                <div class="guide-title">待处理事项</div>
                <div class="guide-desc">根据当前数据自动给出下一步建议。</div>
              </div>
            </div>

            <div v-if="summary.todos?.length" class="todo-list">
              <div v-for="item in summary.todos" :key="item.title" class="todo-item" :class="`is-${item.level || 'info'}`">
                <div class="todo-main">
                  <strong>{{ item.title }}</strong>
                  <span>{{ item.description }}</span>
                </div>
                <el-button size="small" @click="$router.push(item.path)">
                  {{ item.actionText || '处理' }}
                </el-button>
              </div>
            </div>
            <el-empty v-else description="暂无待处理事项" />
          </div>
        </div>

        <div class="dashboard-main-grid">
          <div class="card list-card">
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

          <div class="card list-card">
            <div class="card-head">
              <div>
                <div class="guide-title">最近AI任务</div>
                <div class="guide-desc">查看最近生成任务和失败任务。</div>
              </div>
              <el-button link type="primary" @click="$router.push('/ai/tasks')">全部任务</el-button>
            </div>

            <div v-if="summary.recentTasks?.length" class="recent-list">
              <div v-for="item in summary.recentTasks" :key="item.id" class="recent-item" @click="$router.push(item.path)">
                <div class="recent-main">
                  <strong>{{ item.title }}</strong>
                  <span>{{ item.typeLabel || '-' }} · {{ item.subTitle || '-' }}</span>
                </div>
                <div class="recent-right">
                  <el-tag :type="taskStatusTag(item.status)" effect="light">{{ item.statusLabel }}</el-tag>
                  <span>{{ item.timeText }}</span>
                </div>
              </div>
            </div>
            <el-empty v-else description="暂无AI任务" />
          </div>
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
  aiGenerateTaskCount: 0,
  aiGenerateResultCount: 0,
  documentExportCount: 0,
  knowledgeBaseCount: 0,
  companyMaterialCount: 0,
  bidTemplateCount: 0,
  tenderNoticeCount: 0,
  tenderReportCount: 0,
  projectDraftCount: 0,
  projectGeneratingCount: 0,
  projectGeneratedCount: 0,
  projectExportedCount: 0,
  projectFailedCount: 0,
  taskRunningCount: 0,
  taskFailedCount: 0,
  recentProjects: [],
  recentTasks: [],
  todos: []
})

const roleCodes = computed(() => normalizeRoleList(auth.user?.roleCodes || auth.user?.roles || []))
const isPlatformUser = computed(() => roleCodes.value.includes('SUPERADMIN') || roleCodes.value.includes('PLATFORMADMIN'))
const needEnterpriseApply = computed(() => !isPlatformUser.value && !auth.user?.enterpriseId)

const stats = computed(() => [
  { title: '标书项目', value: summary.bidProjectCount || 0, desc: '项目全流程管理', path: '/bid/projects' },
  { title: '企业资料', value: summary.companyMaterialCount || 0, desc: '公司简介 / 资质 / 业绩', path: '/bid/company-materials' },
  { title: 'AI生成结果', value: summary.aiGenerateResultCount || 0, desc: '生成内容沉淀', path: '/ai/results' },
  { title: '导出文件', value: summary.documentExportCount || 0, desc: 'Word / Markdown 导出', path: '/ai/exports' },
  { title: '知识库', value: summary.knowledgeBaseCount || 0, desc: '资料检索准备', path: '/knowledge/bases' },
  { title: '标书模板', value: summary.bidTemplateCount || 0, desc: 'Word套版模板', path: '/bid/templates' }
])

const projectStatusCards = computed(() => [
  { label: '草稿', value: summary.projectDraftCount || 0 },
  { label: '生成中', value: summary.projectGeneratingCount || 0 },
  { label: '已生成', value: summary.projectGeneratedCount || 0 },
  { label: '已导出', value: summary.projectExportedCount || 0 },
  { label: '失败', value: summary.projectFailedCount || 0 }
])

const projectProgress = computed(() => {
  const total = Number(summary.bidProjectCount || 0)
  if (!total) return 0
  const done = Number(summary.projectGeneratedCount || 0) + Number(summary.projectExportedCount || 0)
  return Math.min(100, Math.round(done * 100 / total))
})

const quickActions = [
  { title: '新建标书项目', desc: '录入项目基础信息，绑定模板和知识库', icon: '项', path: '/bid/projects' },
  { title: '维护企业资料', desc: '补充公司简介、资质证书、项目业绩', icon: '企', path: '/bid/company-materials' },
  { title: '上传标书模板', desc: '维护 .docx 模板并设置默认模板', icon: '模', path: '/bid/templates' },
  { title: '进入AI工作台', desc: '选择项目并发起技术标 / 商务标生成', icon: 'AI', path: '/ai/workbench' },
  { title: '查看生成结果', desc: '预览、复制、导出和重新生成', icon: '结', path: '/ai/results' },
  { title: '查看文件资源', desc: '检查OSS文件和业务依赖', icon: '文', path: '/system/files' }
]

onMounted(loadStats)

async function loadStats() {
  loading.value = true
  try {
    const res = await getDashboardSummary()
    Object.assign(summary, {
      bidProjectCount: 0,
      aiGenerateTaskCount: 0,
      aiGenerateResultCount: 0,
      documentExportCount: 0,
      knowledgeBaseCount: 0,
      companyMaterialCount: 0,
      bidTemplateCount: 0,
      tenderNoticeCount: 0,
      tenderReportCount: 0,
      projectDraftCount: 0,
      projectGeneratingCount: 0,
      projectGeneratedCount: 0,
      projectExportedCount: 0,
      projectFailedCount: 0,
      taskRunningCount: 0,
      taskFailedCount: 0,
      recentProjects: [],
      recentTasks: [],
      todos: [],
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

function taskStatusTag(status) {
  const value = String(status || '').toLowerCase()
  if (value === 'success') return 'success'
  if (value === 'running' || value === 'pending') return 'warning'
  if (value === 'failed') return 'danger'
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
  grid-template-columns: repeat(6, minmax(0, 1fr));
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

.dashboard-main-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 16px;
  margin-top: 16px;
}

.process-card,
.todo-card,
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

.status-grid {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 10px;
}

.status-card {
  padding: 14px;
  border-radius: 14px;
  background: #f8fafc;
  border: 1px solid var(--border);
}

.status-card__label {
  color: var(--text-sub);
  font-size: 13px;
}

.status-card__value {
  margin-top: 8px;
  font-size: 24px;
  font-weight: 900;
  color: var(--text-main);
}

.progress-section {
  margin-top: 16px;
}

.progress-title {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
  color: var(--text-sub);
}

.todo-list,
.recent-list {
  display: grid;
  gap: 10px;
}

.todo-item,
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

.todo-item.is-warning {
  background: #fffbeb;
  border-color: #fde68a;
}

.todo-item.is-danger {
  background: #fff7f7;
  border-color: #fecaca;
}

.todo-main,
.recent-main {
  min-width: 0;
}

.todo-main strong,
.recent-main strong {
  display: block;
  color: var(--text-main);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.todo-main span,
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

.quick-card {
  margin-top: 16px;
}

.quick-grid {
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: 12px;
  margin-top: 16px;
}

.quick-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px;
  border: 1px solid var(--border);
  border-radius: 14px;
  background: #f8fafc;
  cursor: pointer;
  transition: all 0.18s ease;
}

.quick-item:hover {
  border-color: #2563eb;
  background: #eff6ff;
}

.quick-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 42px;
  height: 42px;
  border-radius: 14px;
  background: #dbeafe;
  color: #2563eb;
  font-weight: 900;
  flex-shrink: 0;
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
  line-height: 1.5;
}

@media (max-width: 1480px) {
  .dashboard-stats,
  .quick-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .status-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (max-width: 1080px) {
  .dashboard-main-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 900px) {
  .enterprise-options,
  .dashboard-stats,
  .quick-grid {
    grid-template-columns: 1fr;
  }

  .welcome-card {
    align-items: flex-start;
    flex-direction: column;
  }
}
</style>
