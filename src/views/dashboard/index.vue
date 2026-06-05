<template>
  <div class="page dashboard-page">
    <div class="page-body">
      <div class="welcome-card card">
        <div>
          <div class="welcome-title">恒鼎·智慧AI工作台</div>
          <div class="welcome-sub">
            <template v-if="needEnterpriseApply">
              当前账号还没有绑定企业，可先使用 AI方案、AI文档、AI标书、个人知识库等个人空间功能；企业资料、团队协作和企业级共享资料需要提交企业申请并审核通过后使用。
            </template>
            <template v-else>
              从项目创建、资料准备、AI生成到正式 Word/PDF 导出，集中查看当前企业的标书业务进展。
            </template>
          </div>
        </div>
        <div class="welcome-actions">
          <el-button v-if="needEnterpriseApply" type="primary" @click="$router.push('/system/enterprise-apply')">提交企业申请</el-button>
          <el-button @click="loadStats" :icon="Refresh">刷新</el-button>
        </div>
      </div>

      <div v-if="needEnterpriseApply" class="enterprise-guide card">
        <div class="guide-title">未绑定企业时的使用范围</div>
        <div class="enterprise-options">
          <div class="enterprise-option">
            <div class="option-title">可以先用个人空间</div>
            <div class="option-desc">AI方案、AI文档、AI标书、个人知识库、下载中心等数据会按当前账号隔离保存，不会进入任何企业。</div>
          </div>
          <div class="enterprise-option">
            <div class="option-title">需要企业后再申请</div>
            <div class="option-desc">企业资料库、企业共享知识库、团队成员和企业协作能力，需要注册新企业或加入已有企业并通过审批。</div>
          </div>
        </div>
      </div>

      <template>
        <div class="stat-grid dashboard-stats" v-loading="loading">
          <div v-for="item in stats" :key="item.title" class="stat-card" @click="$router.push(item.path)">
            <div class="stat-title">{{ item.title }}</div>
            <div class="stat-value">{{ item.value }}</div>
            <div class="stat-desc">{{ item.desc }}</div>
          </div>
        </div>

        <div class="dashboard-main-grid">
          <div class="card list-card">
            <div class="card-head">
              <div>
                <div class="guide-title">最近标书项目</div>
                <div class="guide-desc">最近更新的项目，方便继续处理。</div>
              </div>
              <el-button link type="primary" @click="$router.push('/ai-bid')">全部项目</el-button>
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
        </div>
      </template>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
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
  recentProjects: []
})

const roleCodes = computed(() => normalizeRoleList(auth.user?.roleCodes || auth.user?.roles || []))
const isPlatformUser = computed(() => roleCodes.value.includes('SUPERADMIN') || roleCodes.value.includes('PLATFORMADMIN'))
const needEnterpriseApply = computed(() => !isPlatformUser.value && !auth.user?.enterpriseId)

const stats = computed(() => [
  { title: '标书项目', value: summary.bidProjectCount || 0, desc: '项目全流程管理', path: '/ai-bid' },
  { title: '企业资料', value: summary.companyMaterialCount || 0, desc: '公司简介 / 资质 / 业绩', path: '/materials' },
  { title: '导出文件', value: summary.documentExportCount || 0, desc: 'Word/PDF导出', path: '/download-center' },
  { title: '知识库', value: summary.knowledgeBaseCount || 0, desc: '资料检索准备', path: '/knowledge/bases' }
])

onMounted(loadStats)

watch(() => auth.user?.enterpriseId, () => {
  loadStats()
})

async function loadStats() {
  loading.value = true
  try {
    const res = await getDashboardSummary()
    Object.assign(summary, {
      bidProjectCount: 0,
      documentExportCount: 0,
      knowledgeBaseCount: 0,
      companyMaterialCount: 0,
      recentProjects: [],
      ...(res || {})
    })
  } finally {
    loading.value = false
  }
}

function normalizeRoleCode(value = '') {
  return String(value).trim().toUpperCase().replace(/^ROLE[_-]?/, '').replace(/[^A-Z0-9]/g, '')
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

.dashboard-main-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 16px;
  margin-top: 16px;
}

.list-card {
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

@media (max-width: 1480px) {
  .dashboard-stats {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (max-width: 900px) {
  .enterprise-options,
  .dashboard-stats {
    grid-template-columns: 1fr;
  }

  .welcome-card {
    align-items: flex-start;
    flex-direction: column;
  }
}
</style>
