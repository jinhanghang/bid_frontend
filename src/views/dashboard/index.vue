<template>
  <div class="page dashboard-page">
    <div class="page-body dashboard-body">
      <section class="dashboard-hero dashboard-card">
        <div class="hero-content">
          <div class="hero-heading">
            <span class="hero-symbol"><el-icon><MagicStick /></el-icon></span>
            <div>
              <h1>恒鼎·智慧AI工作台</h1>
              <span>AI BIDDING WORKSPACE</span>
            </div>
          </div>
          <p class="hero-description">
            <template v-if="isPersonalWorkspace">
              当前账号还没有绑定企业，可先使用 AI标书、标讯商机和个人知识库等个人空间功能；企业资料、团队协作和企业级共享资料需要提交企业申请并审核通过后使用。
            </template>
            <template v-else>
              从项目创建、资料准备、AI生成到正式 Word/PDF 导出，集中查看当前企业的标书业务进展。
            </template>
          </p>
        </div>

        <div class="hero-actions">
          <el-button
            v-if="isPersonalWorkspace"
            type="primary"
            class="gradient-button"
            :icon="OfficeBuilding"
            @click="$router.push('/system/enterprise-apply')"
          >
            提交企业申请
          </el-button>
          <el-button class="soft-button" :icon="Refresh" :loading="loading" @click="loadStats">刷新</el-button>
        </div>

        <span class="hero-orb hero-orb-one" />
        <span class="hero-orb hero-orb-two" />
      </section>

      <section class="metric-grid" v-loading="loading">
        <button
          v-for="item in stats"
          :key="item.title"
          type="button"
          class="metric-card dashboard-card"
          :class="`tone-${item.tone}`"
          @click="handleStatClick(item)"
        >
          <span class="metric-icon">
            <el-icon><component :is="item.icon" /></el-icon>
          </span>
          <span class="metric-content">
            <span class="metric-title">{{ item.title }}</span>
            <strong class="metric-value">{{ item.value }}</strong>
            <span class="metric-desc">{{ item.desc }}</span>
          </span>
          <span class="metric-arrow"><el-icon><ArrowRight /></el-icon></span>
          <span class="metric-glow" />
        </button>
      </section>

      <section v-if="isPersonalWorkspace" class="workspace-guide dashboard-card">
        <div class="section-heading">
          <div>
            <h2>未绑定企业时的使用范围</h2>
            <p>个人空间与企业空间相互隔离，申请通过后可使用企业级协作能力。</p>
          </div>
        </div>

        <div class="guide-grid">
          <article class="guide-panel guide-personal">
            <div class="guide-copy">
              <span class="guide-label">PERSONAL WORKSPACE</span>
              <h3>可以先用个人空间</h3>
              <p>AI标书、个人知识库、下载中心等数据会按当前账号隔离保存，不会进入任何企业。</p>
              <button type="button" @click="$router.push('/ai-bid')">
                进入个人标书
                <el-icon><ArrowRight /></el-icon>
              </button>
            </div>
            <div class="guide-illustration personal-illustration" aria-hidden="true">
              <span class="floating-card card-back"><el-icon><Document /></el-icon></span>
              <span class="floating-card card-front"><el-icon><FolderOpened /></el-icon></span>
              <span class="floating-dot" />
            </div>
          </article>

          <article class="guide-panel guide-enterprise">
            <div class="guide-copy">
              <span class="guide-label">ENTERPRISE WORKSPACE</span>
              <h3>需要企业后再申请</h3>
              <p>注册新企业后可立即使用企业功能；加入已有企业需等待管理员审批。</p>
              <button type="button" @click="$router.push('/system/enterprise-apply')">
                发起企业申请
                <el-icon><ArrowRight /></el-icon>
              </button>
            </div>
            <div class="guide-illustration enterprise-illustration" aria-hidden="true">
              <span class="approval-window">
                <i /><i /><i />
                <b /><b /><b />
              </span>
              <span class="approval-check"><el-icon><CircleCheckFilled /></el-icon></span>
              <span class="approval-shield"><el-icon><OfficeBuilding /></el-icon></span>
            </div>
          </article>
        </div>
      </section>

      <section class="recent-projects dashboard-card">
        <div class="section-heading recent-heading">
          <div>
            <h2>最近标书项目</h2>
            <p>最近更新的项目，方便从上次进度继续处理。</p>
          </div>
          <button type="button" class="section-link" @click="$router.push('/ai-bid')">
            全部项目
            <el-icon><ArrowRight /></el-icon>
          </button>
        </div>

        <div v-if="summary.recentProjects?.length" class="recent-list">
          <button
            v-for="item in summary.recentProjects"
            :key="item.id"
            type="button"
            class="recent-item"
            @click="openRecentProject(item)"
          >
            <span class="recent-status-dot" :class="projectStatusClass(item.status)" />
            <span class="recent-main">
              <strong>{{ item.title }}</strong>
              <small>{{ item.subTitle || item.id || '-' }} · {{ item.typeLabel || '标书项目' }}</small>
            </span>
            <span class="recent-meta">
              <span class="status-chip" :class="projectStatusClass(item.status)">{{ item.statusLabel || projectStatusLabel(item.status) }}</span>
              <time>{{ item.timeText || '-' }}</time>
            </span>
            <span class="recent-arrow"><el-icon><ArrowRight /></el-icon></span>
          </button>
        </div>
        <el-empty v-else :image-size="88" description="暂无标书项目" />
      </section>

      <section class="help-banner">
        <div class="help-copy">
          <h2>还没有找到你需要的功能？</h2>
          <p>从标讯商机筛选项目，在 AI标书中关联标讯并开始编制。</p>
        </div>
        <div class="help-art" aria-hidden="true">
          <span class="art-cube"><el-icon><Tickets /></el-icon></span>
          <span class="art-doc"><el-icon><Document /></el-icon></span>
          <span class="art-search"><el-icon><Search /></el-icon></span>
        </div>
        <button type="button" class="help-action" @click="$router.push('/ai-bid')">
          <el-icon><Collection /></el-icon>
          创建AI标书
          <el-icon><ArrowRight /></el-icon>
        </button>
      </section>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import {
  ArrowRight,
  CircleCheckFilled,
  Collection,
  Document,
  Download,
  Files,
  FolderOpened,
  MagicStick,
  OfficeBuilding,
  Refresh,
  Search,
  Tickets,
  UserFilled
} from '@element-plus/icons-vue'
import { getDashboardSummary } from '@/api/dashboard'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const router = useRouter()
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
const isPersonalWorkspace = computed(() => !isPlatformUser.value && !auth.user?.enterpriseId)

const stats = computed(() => {
  if (isPersonalWorkspace.value) {
    return [
      { title: '个人标书项目', value: summary.bidProjectCount || 0, desc: '仅当前账号可见', path: '/ai-bid', icon: UserFilled, tone: 'violet' },
      { title: '个人知识库', value: summary.knowledgeBaseCount || 0, desc: '个人资料检索准备', path: '/materials/knowledge', icon: FolderOpened, tone: 'blue' },
      { title: '导出文件', value: summary.documentExportCount || 0, desc: 'Word / PDF 导出', path: '/download-center', icon: Download, tone: 'green' },
      { title: '企业申请', value: '-', desc: '注册新企业或加入已有企业', path: '/system/enterprise-apply', icon: OfficeBuilding, tone: 'amber' }
    ]
  }

  return [
    { title: '标书项目', value: summary.bidProjectCount || 0, desc: '项目全流程管理', path: '/ai-bid', icon: Files, tone: 'violet' },
    { title: '企业资料', value: summary.companyMaterialCount || 0, desc: '公司简介 / 资质 / 业绩', path: '/materials/company', icon: OfficeBuilding, tone: 'blue' },
    { title: '导出文件', value: summary.documentExportCount || 0, desc: 'Word / PDF 导出', path: '/download-center', icon: Download, tone: 'green' },
    { title: '知识库', value: summary.knowledgeBaseCount || 0, desc: '资料检索准备', path: '/materials/knowledge', icon: Collection, tone: 'amber' }
  ]
})

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

function handleStatClick(item) {
  if (!item?.path) return
  router.push(item.path)
}

function openRecentProject(item) {
  router.push(item?.path || '/ai-bid')
}

function normalizeRoleCode(value = '') {
  const raw = String(value || '').trim()
  if (raw.includes('超级管理员')) return 'SUPERADMIN'
  if (raw.includes('平台管理员')) return 'PLATFORMADMIN'
  if (raw.includes('企业管理员')) return 'ENTERPRISEADMIN'
  if (raw.includes('普通用户')) return 'NORMALUSER'
  return raw.toUpperCase().replace(/^ROLE[_-]?/, '').replace(/[^A-Z0-9]/g, '')
}

function normalizeRoleList(values = []) {
  if (!Array.isArray(values)) return []
  return values.map((item) => {
    if (typeof item === 'string') return normalizeRoleCode(item)
    return normalizeRoleCode(item?.roleCode || item?.code || item?.authority || item?.name || '')
  }).filter(Boolean)
}

function projectStatusClass(status) {
  const value = String(status || '').toUpperCase()
  if (value === 'EXPORTED' || value === 'GENERATED' || value === 'COMPLETED') return 'success'
  if (value === 'GENERATING' || value === 'PARSING' || value === 'RUNNING') return 'warning'
  if (value === 'FAILED') return 'danger'
  return 'info'
}

function projectStatusLabel(status) {
  const value = String(status || '').toUpperCase()
  const map = {
    EXPORTED: '已导出',
    GENERATED: '已生成',
    COMPLETED: '已完成',
    GENERATING: '生成中',
    PARSING: '解析中',
    RUNNING: '处理中',
    FAILED: '失败',
    MATERIAL_READY: '资料已就绪'
  }
  return map[value] || status || '待处理'
}
</script>

<style scoped>
.dashboard-page {
  min-height: 100%;
  padding: 10px 0 0;
  background: transparent;
}

.dashboard-body {
  display: flex;
  flex-direction: column;
  gap: 20px;
  max-width: 1500px;
  margin: 0 auto;
}

.dashboard-card {
  border: 1px solid rgba(228, 232, 243, 0.88);
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.93);
  box-shadow: 0 14px 34px rgba(49, 65, 104, 0.07);
  backdrop-filter: blur(16px);
}

.dashboard-hero {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 148px;
  padding: 28px 32px;
  overflow: hidden;
}

.hero-content {
  position: relative;
  z-index: 2;
  min-width: 0;
  max-width: 850px;
}

.hero-heading {
  display: flex;
  align-items: center;
  gap: 13px;
}

.hero-symbol {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  border-radius: 12px;
  background: linear-gradient(145deg, rgba(92, 107, 255, 0.14), rgba(147, 72, 237, 0.16));
  color: #7659f4;
}

.hero-symbol :deep(.el-icon) {
  font-size: 22px;
}

.hero-heading h1 {
  margin: 0;
  color: #172033;
  font-size: 25px;
  font-weight: 900;
  letter-spacing: -0.5px;
}

.hero-heading span {
  display: block;
  margin-top: 3px;
  color: #a0a8bb;
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 1.5px;
}

.hero-description {
  max-width: 850px;
  margin: 16px 0 0;
  color: #657087;
  font-size: 14px;
  line-height: 1.8;
}

.hero-actions {
  position: relative;
  z-index: 2;
  display: flex;
  flex-shrink: 0;
  align-items: center;
  gap: 10px;
  margin-left: 24px;
}

.gradient-button {
  border: 0;
  background: linear-gradient(105deg, #4d79ff, #7f45ef);
  box-shadow: 0 10px 22px rgba(91, 82, 235, 0.22);
}

.gradient-button:hover,
.gradient-button:focus {
  border: 0;
  background: linear-gradient(105deg, #456eef, #7140dd);
}

.soft-button {
  border-color: #e2e6f0;
  background: rgba(255, 255, 255, 0.76);
  color: #58647a;
}

.hero-orb {
  position: absolute;
  border-radius: 50%;
  filter: blur(1px);
  pointer-events: none;
}

.hero-orb-one {
  top: -85px;
  right: 160px;
  width: 220px;
  height: 220px;
  background: radial-gradient(circle, rgba(107, 108, 255, 0.10), rgba(107, 108, 255, 0));
}

.hero-orb-two {
  right: -60px;
  bottom: -100px;
  width: 260px;
  height: 260px;
  background: radial-gradient(circle, rgba(109, 208, 255, 0.09), rgba(109, 208, 255, 0));
}

.metric-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 16px;
}

.metric-card {
  position: relative;
  display: flex;
  align-items: flex-start;
  min-height: 154px;
  padding: 26px 22px;
  overflow: hidden;
  border: 1px solid rgba(228, 232, 243, 0.88);
  font-family: inherit;
  text-align: left;
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
}

.metric-card:hover {
  transform: translateY(-3px);
  border-color: rgba(104, 91, 238, 0.22);
  box-shadow: 0 18px 38px rgba(67, 72, 126, 0.12);
}

.metric-icon {
  position: relative;
  z-index: 2;
  display: inline-flex;
  flex: 0 0 50px;
  align-items: center;
  justify-content: center;
  width: 50px;
  height: 50px;
  border-radius: 14px;
  box-shadow: 0 10px 20px rgba(60, 75, 140, 0.16);
  color: #fff;
}

.metric-icon :deep(.el-icon) {
  font-size: 24px;
}

.tone-violet .metric-icon { background: linear-gradient(145deg, #4f78ff, #8a4cf3); }
.tone-blue .metric-icon { background: linear-gradient(145deg, #4c80ff, #5cb1ff); }
.tone-green .metric-icon { background: linear-gradient(145deg, #39cf56, #69e85c); }
.tone-amber .metric-icon { background: linear-gradient(145deg, #ffb30f, #ffc83d); }

.metric-content {
  position: relative;
  z-index: 2;
  display: flex;
  min-width: 0;
  flex-direction: column;
  margin-left: 16px;
}

.metric-title {
  color: #525f75;
  font-size: 14px;
}

.metric-value {
  margin-top: 8px;
  color: #162033;
  font-size: 30px;
  font-weight: 900;
  line-height: 1.1;
}

.metric-desc {
  margin-top: 10px;
  color: #8a94a9;
  font-size: 12px;
  line-height: 1.5;
}

.metric-arrow {
  position: absolute;
  top: 22px;
  right: 18px;
  z-index: 2;
  color: #c4cad8;
  opacity: 0;
  transform: translateX(-4px);
  transition: all 0.18s ease;
}

.metric-card:hover .metric-arrow {
  color: #6d5df4;
  opacity: 1;
  transform: translateX(0);
}

.metric-glow {
  position: absolute;
  right: -35px;
  bottom: -55px;
  width: 130px;
  height: 130px;
  border-radius: 50%;
  opacity: 0.14;
}

.tone-violet .metric-glow { background: #8a4cf3; }
.tone-blue .metric-glow { background: #5cb1ff; }
.tone-green .metric-glow { background: #58db65; }
.tone-amber .metric-glow { background: #ffbc1f; }

.workspace-guide,
.recent-projects {
  padding: 26px;
}

.section-heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.section-heading h2 {
  margin: 0;
  color: #172033;
  font-size: 19px;
  font-weight: 900;
}

.section-heading p {
  margin: 7px 0 0;
  color: #8a94a8;
  font-size: 12px;
  line-height: 1.6;
}

.guide-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 18px;
  margin-top: 20px;
}

.guide-panel {
  position: relative;
  min-height: 210px;
  padding: 25px;
  overflow: hidden;
  border: 1px solid rgba(226, 229, 244, 0.80);
  border-radius: 16px;
}

.guide-personal {
  background: linear-gradient(125deg, #f9faff 0%, #f1efff 100%);
}

.guide-enterprise {
  background: linear-gradient(125deg, #f7fbff 0%, #eef7fc 100%);
}

.guide-copy {
  position: relative;
  z-index: 2;
  max-width: 65%;
}

.guide-label {
  color: #887ef3;
  font-size: 9px;
  font-weight: 800;
  letter-spacing: 1.2px;
}

.guide-copy h3 {
  margin: 11px 0 0;
  color: #20283a;
  font-size: 16px;
  font-weight: 900;
}

.guide-copy p {
  margin: 11px 0 0;
  color: #6d778c;
  font-size: 12px;
  line-height: 1.8;
}

.guide-copy button {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin-top: 14px;
  padding: 0;
  border: 0;
  background: transparent;
  color: #695af2;
  font-family: inherit;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
}

.guide-illustration {
  position: absolute;
  right: 20px;
  bottom: 12px;
  width: 190px;
  height: 145px;
}

.floating-card {
  position: absolute;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid rgba(255, 255, 255, 0.75);
  color: #fff;
  box-shadow: 0 18px 30px rgba(89, 81, 200, 0.18);
  backdrop-filter: blur(7px);
}

.card-back {
  right: 16px;
  bottom: 22px;
  width: 116px;
  height: 74px;
  border-radius: 18px;
  background: linear-gradient(145deg, rgba(117, 137, 255, 0.65), rgba(151, 87, 240, 0.55));
  transform: rotate(6deg);
}

.card-front {
  right: 62px;
  bottom: 7px;
  width: 100px;
  height: 86px;
  border-radius: 20px;
  background: linear-gradient(145deg, rgba(118, 132, 255, 0.86), rgba(104, 92, 239, 0.76));
  transform: rotate(-5deg);
}

.floating-card :deep(.el-icon) {
  font-size: 34px;
}

.floating-dot {
  position: absolute;
  top: 20px;
  right: 82px;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: rgba(154, 126, 255, 0.35);
  box-shadow: -28px 34px 0 rgba(120, 169, 255, 0.18);
}

.approval-window {
  position: absolute;
  right: 25px;
  bottom: 22px;
  display: block;
  width: 132px;
  height: 88px;
  padding: 13px 12px;
  border: 1px solid rgba(255, 255, 255, 0.9);
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.76);
  box-shadow: 0 18px 35px rgba(67, 134, 177, 0.15);
}

.approval-window i {
  display: inline-block;
  width: 6px;
  height: 6px;
  margin-right: 3px;
  border-radius: 50%;
  background: #6cc0ff;
}

.approval-window i:nth-child(2) { background: #61dcbb; }
.approval-window i:nth-child(3) { background: #9a85f5; }

.approval-window b {
  display: block;
  width: 78%;
  height: 8px;
  margin-top: 10px;
  border-radius: 999px;
  background: linear-gradient(90deg, #dbe8f5, #edf4fb);
}

.approval-window b:nth-of-type(2) { width: 62%; }
.approval-window b:nth-of-type(3) { width: 88%; }

.approval-check,
.approval-shield {
  position: absolute;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  color: #fff;
  box-shadow: 0 10px 18px rgba(28, 181, 145, 0.20);
}

.approval-check {
  right: 133px;
  bottom: 22px;
  width: 36px;
  height: 36px;
  background: linear-gradient(145deg, #42d9ae, #17bd91);
}

.approval-shield {
  right: 4px;
  bottom: 28px;
  width: 46px;
  height: 54px;
  border-radius: 13px 13px 20px 20px;
  background: linear-gradient(145deg, #36d39c, #11b97e);
}

.recent-heading {
  margin-bottom: 15px;
}

.section-link {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 4px 0;
  border: 0;
  background: transparent;
  color: #5d68f5;
  font-family: inherit;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
}

.recent-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.recent-item {
  display: grid;
  grid-template-columns: 10px minmax(0, 1fr) auto 28px;
  align-items: center;
  gap: 12px;
  width: 100%;
  min-height: 78px;
  padding: 14px 16px;
  border: 1px solid #e6eaf2;
  border-radius: 14px;
  background: linear-gradient(90deg, #fff, #fcfdff);
  font-family: inherit;
  text-align: left;
  cursor: pointer;
  transition: border-color 0.18s ease, box-shadow 0.18s ease, transform 0.18s ease;
}

.recent-item:hover {
  border-color: rgba(99, 85, 238, 0.24);
  box-shadow: 0 10px 24px rgba(68, 74, 121, 0.08);
  transform: translateY(-1px);
}

.recent-status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #9aa4b7;
}

.recent-status-dot.success { background: #30cb85; }
.recent-status-dot.warning { background: #ffb020; }
.recent-status-dot.danger { background: #ff5b65; }
.recent-status-dot.info { background: #6f7df5; }

.recent-main {
  display: flex;
  min-width: 0;
  flex-direction: column;
}

.recent-main strong,
.recent-main small {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.recent-main strong {
  color: #222b3d;
  font-size: 15px;
}

.recent-main small {
  margin-top: 7px;
  color: #7c879b;
  font-size: 11px;
}

.recent-meta {
  display: flex;
  align-items: flex-end;
  flex-direction: column;
  gap: 7px;
}

.recent-meta time {
  color: #8e98aa;
  font-size: 10px;
}

.status-chip {
  display: inline-flex;
  align-items: center;
  min-height: 23px;
  padding: 0 9px;
  border-radius: 999px;
  background: #f1f3f7;
  color: #7d8799;
  font-size: 10px;
  font-weight: 700;
}

.status-chip.success { background: #eaf9f1; color: #20a96b; }
.status-chip.warning { background: #fff5df; color: #e48b00; }
.status-chip.danger { background: #fff0f1; color: #e94352; }
.status-chip.info { background: #f1efff; color: #745df4; }

.recent-arrow {
  color: #8d96a8;
}

.help-banner {
  position: relative;
  display: flex;
  align-items: center;
  min-height: 126px;
  padding: 24px 28px;
  overflow: hidden;
  border: 1px solid rgba(227, 231, 245, 0.78);
  border-radius: 18px;
  background: linear-gradient(105deg, rgba(238, 247, 255, 0.95), rgba(247, 241, 255, 0.96));
}

.help-copy {
  position: relative;
  z-index: 2;
}

.help-copy h2 {
  margin: 0;
  color: #182134;
  font-size: 18px;
  font-weight: 900;
}

.help-copy p {
  margin: 9px 0 0;
  color: #748096;
  font-size: 12px;
}

.help-art {
  position: absolute;
  top: 8px;
  left: 54%;
  width: 245px;
  height: 112px;
}

.help-art span {
  position: absolute;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  box-shadow: 0 14px 26px rgba(91, 85, 209, 0.18);
}

.art-cube {
  top: 42px;
  left: 20px;
  width: 52px;
  height: 52px;
  border-radius: 15px;
  background: linear-gradient(145deg, #5c83ff, #7b5af2);
  transform: rotate(-8deg);
}

.art-doc {
  top: 24px;
  left: 84px;
  width: 72px;
  height: 72px;
  border-radius: 19px;
  background: linear-gradient(145deg, #8aa0ff, #8261ef);
  transform: rotate(5deg);
}

.art-search {
  top: 50px;
  left: 156px;
  width: 54px;
  height: 54px;
  border-radius: 50%;
  background: linear-gradient(145deg, #7b91ff, #6e58ec);
}

.help-art :deep(.el-icon) {
  font-size: 28px;
}

.help-action {
  position: relative;
  z-index: 2;
  display: inline-flex;
  align-items: center;
  gap: 7px;
  min-height: 42px;
  margin-left: auto;
  padding: 0 16px;
  border: 1px solid rgba(103, 89, 239, 0.12);
  border-radius: 11px;
  background: rgba(255, 255, 255, 0.78);
  box-shadow: 0 9px 20px rgba(80, 67, 165, 0.07);
  color: #6557ed;
  font-family: inherit;
  font-size: 12px;
  font-weight: 800;
  cursor: pointer;
}

@media (max-width: 1100px) {
  .metric-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .guide-copy {
    max-width: 74%;
  }

  .guide-illustration {
    right: -15px;
    opacity: 0.7;
  }

  .help-art {
    left: 48%;
    opacity: 0.72;
  }
}

@media (max-width: 760px) {
  .dashboard-hero {
    align-items: flex-start;
    flex-direction: column;
    padding: 23px;
  }

  .hero-actions {
    margin: 20px 0 0;
  }

  .metric-grid,
  .guide-grid {
    grid-template-columns: 1fr;
  }

  .guide-copy {
    max-width: 80%;
  }

  .workspace-guide,
  .recent-projects {
    padding: 20px;
  }

  .recent-item {
    grid-template-columns: 10px minmax(0, 1fr) 24px;
  }

  .recent-meta {
    display: none;
  }

  .help-art {
    display: none;
  }
}

@media (max-width: 520px) {
  .metric-grid {
    grid-template-columns: 1fr;
  }

  .hero-heading h1 {
    font-size: 21px;
  }

  .guide-illustration {
    display: none;
  }

  .guide-copy {
    max-width: none;
  }

  .help-banner {
    align-items: flex-start;
    flex-direction: column;
    gap: 18px;
  }

  .help-action {
    margin-left: 0;
  }
}
</style>
