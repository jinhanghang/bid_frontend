<template>
  <div class="page">
    <div class="page-body">
      <div class="card card--table task-card">
        <div class="list-head">
          <div class="list-head__left">
            <el-input
              v-model="keyword"
              class="filter-input"
              placeholder="按项目名称 / 项目编号 / 任务编号 / 结果标题 / 错误信息自动查询"
              clearable
              @input="onKeywordInput"
            />
          </div>
          <div class="list-head__right task-filters">
            <el-tag v-if="autoRefreshing" type="warning" effect="light">自动刷新中</el-tag>
            <span v-if="lastRefreshTime" class="refresh-time">最近刷新：{{ lastRefreshTime }}</span>

            <el-select v-model="filters.bizType" clearable placeholder="生成类型" style="width: 150px" @change="reloadFirstPage">
              <el-option label="技术标" value="bid_tech" />
              <el-option label="商务标" value="bid_business" />
              <el-option label="完整标书" value="bid_full" />
              <el-option label="通用标书" value="bid" />
            </el-select>
            <el-select v-model="filters.status" clearable placeholder="任务状态" style="width: 130px" @change="reloadFirstPage">
              <el-option label="待生成" value="pending" />
              <el-option label="生成中" value="running" />
              <el-option label="成功" value="success" />
              <el-option label="失败" value="failed" />
              <el-option label="已取消" value="cancelled" />
            </el-select>
            <el-button class="table-icon-btn" text :icon="Refresh" @click="loadTasks()" />
            <el-button v-if="autoRefreshing" plain @click="stopAutoRefresh(true)">停止刷新</el-button>
            <el-button v-else-if="hasRunningTask" plain type="primary" @click="startAutoRefresh">开启刷新</el-button>
          </div>
        </div>

        <div class="summary-row">
          <div class="summary-card">
            <span>当前查询任务</span>
            <strong>{{ pager.total }}</strong>
          </div>
          <div class="summary-card is-pending">
            <span>当前页待生成</span>
            <strong>{{ statusCount.pending }}</strong>
          </div>
          <div class="summary-card is-running">
            <span>当前页生成中</span>
            <strong>{{ statusCount.running }}</strong>
          </div>
          <div class="summary-card is-success">
            <span>当前页成功</span>
            <strong>{{ statusCount.success }}</strong>
          </div>
          <div class="summary-card is-danger">
            <span>当前页失败</span>
            <strong>{{ statusCount.failed }}</strong>
          </div>
        </div>

        <el-alert
          v-if="routeBizId"
          class="route-alert"
          type="info"
          show-icon
          :closable="false"
          title="当前仅展示从 AI生成工作台提交的项目任务。"
        />

        <el-table
          class="ui-table"
          :data="rows"
          border
          stripe
          height="calc(100vh - 354px)"
          v-loading="loading"
          empty-text="暂无AI生成任务"
          @row-dblclick="openDetail"
        >
          <el-table-column label="所属项目" min-width="230" show-overflow-tooltip>
            <template #default="{ row }">
              <div class="project-cell">
                <div class="project-name">{{ row.projectName || '-' }}</div>
                <div class="project-code">{{ row.projectCode || `业务ID：${row.bizId || '-'}` }}</div>
              </div>
            </template>
          </el-table-column>

          <el-table-column label="生成类型" width="110" align="center">
            <template #default="{ row }">
              <el-tag :type="generateTypeTag(row.bizType)" effect="light">
                {{ generateTypeLabel(row.bizType) }}
              </el-tag>
            </template>
          </el-table-column>

          <el-table-column label="任务状态" width="110" align="center">
            <template #default="{ row }">
              <el-tag :type="statusTag(row.status)" effect="light">
                {{ statusLabel(row.status) }}
              </el-tag>
            </template>
          </el-table-column>

          <el-table-column label="模型" min-width="220" show-overflow-tooltip>
            <template #default="{ row }">
              <div class="model-cell">{{ row.modelName || '-' }}</div>
              <div class="model-sub">{{ row.modelProvider || '-' }}</div>
            </template>
          </el-table-column>

          <el-table-column label="耗时" width="130" align="center">
            <template #default="{ row }">
              <span :class="{ 'running-duration': isRunning(row.status) }">
                {{ formatDuration(row.durationSeconds, row.startTime, row.finishTime, row.status) }}
              </span>
            </template>
          </el-table-column>

          <el-table-column label="Token / 字数" width="150" align="center">
            <template #default="{ row }">
              <div>{{ row.tokensInput || 0 }} / {{ row.tokensOutput || 0 }}</div>
              <div class="model-sub">{{ row.wordCount || 0 }} 字</div>
            </template>
          </el-table-column>

          <el-table-column prop="startTime" label="开始时间" width="170" />
          <el-table-column prop="finishTime" label="结束时间" width="170" />

          <el-table-column label="错误信息" min-width="210" show-overflow-tooltip>
            <template #default="{ row }">
              <span v-if="row.errorMsg" class="error-text">{{ row.errorMsg }}</span>
              <span v-else>-</span>
            </template>
          </el-table-column>

          <el-table-column label="操作" width="360" fixed="right">
            <template #default="{ row }">
              <div class="table-actions">
                <el-button link type="primary" @click="openDetail(row)">详情</el-button>
                <el-button
                  v-if="canViewResult(row)"
                  link
                  type="success"
                  @click="goResult(row)"
                >
                  查看结果
                </el-button>
                <el-button
                  v-else-if="isSuccess(row.status)"
                  link
                  type="warning"
                  @click="showResultMissing(row)"
                >
                  结果缺失
                </el-button>
                <el-button
                  v-if="canShowError(row)"
                  link
                  type="danger"
                  @click="showError(row)"
                >
                  查看错误
                </el-button>
                <el-button link type="primary" :disabled="!row.bizId" @click="goProject(row)">项目</el-button>
                <el-button
                  link
                  type="warning"
                  :disabled="!row.bizId || isRunning(row.status)"
                  @click="goWorkbench(row)"
                >
                  重新生成
                </el-button>
              </div>
            </template>
          </el-table-column>
        </el-table>

        <PageFooterPager
          v-model:page="pager.page"
          v-model:size="pager.size"
          :total="pager.total"
          @change="loadTasks()"
        />
      </div>
    </div>

    <el-drawer v-model="detailDrawer.visible" size="62%" :title="detailDrawer.task?.taskNo || '任务详情'" destroy-on-close>
      <template v-if="detailDrawer.task">
        <div class="detail-head">
          <div>
            <div class="detail-title">
              {{ detailDrawer.task.projectName || '未关联项目' }}
            </div>
            <div class="detail-sub">
              {{ generateTypeLabel(detailDrawer.task.bizType) }} · {{ statusLabel(detailDrawer.task.status) }} · {{ detailDrawer.task.modelName || '-' }}
            </div>
          </div>
          <div class="detail-actions">
            <el-button :disabled="!canViewResult(detailDrawer.task)" @click="goResult(detailDrawer.task)">查看结果</el-button>
            <el-button :disabled="!detailDrawer.task.bizId || isRunning(detailDrawer.task.status)" @click="goWorkbench(detailDrawer.task)">重新生成</el-button>
            <el-button :disabled="!detailDrawer.task.bizId" @click="goProject(detailDrawer.task)">跳转项目</el-button>
            <el-button @click="refreshDetail">刷新详情</el-button>
          </div>
        </div>

        <el-descriptions :column="3" border class="detail-desc">
          <el-descriptions-item label="任务状态">
            <el-tag :type="statusTag(detailDrawer.task.status)" effect="light">
              {{ statusLabel(detailDrawer.task.status) }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="生成类型">{{ generateTypeLabel(detailDrawer.task.bizType) }}</el-descriptions-item>
          <el-descriptions-item label="耗时">
            {{ formatDuration(detailDrawer.task.durationSeconds, detailDrawer.task.startTime, detailDrawer.task.finishTime, detailDrawer.task.status) }}
          </el-descriptions-item>
          <el-descriptions-item label="开始时间">{{ detailDrawer.task.startTime || '-' }}</el-descriptions-item>
          <el-descriptions-item label="结束时间">{{ detailDrawer.task.finishTime || '-' }}</el-descriptions-item>
          <el-descriptions-item label="结果ID">{{ detailDrawer.task.resultId || '-' }}</el-descriptions-item>
          <el-descriptions-item label="Prompt模板">{{ detailDrawer.task.promptTemplateName || detailDrawer.task.promptTemplateId || '-' }}</el-descriptions-item>
          <el-descriptions-item label="输入Token">{{ detailDrawer.task.tokensInput || 0 }}</el-descriptions-item>
          <el-descriptions-item label="输出Token">{{ detailDrawer.task.tokensOutput || 0 }}</el-descriptions-item>
        </el-descriptions>

        <el-alert
          v-if="detailDrawer.task.errorMsg"
          class="detail-alert"
          :title="detailDrawer.task.errorMsg"
          type="error"
          show-icon
          :closable="false"
        />

        <el-alert
          v-else-if="isSuccess(detailDrawer.task.status) && !detailDrawer.task.resultId"
          class="detail-alert"
          title="生成任务已成功，但结果记录不存在，请检查 t_ai_generate_result 或后台生成逻辑。"
          type="warning"
          show-icon
          :closable="false"
        />

        <el-tabs v-model="detailDrawer.activeTab">
          <el-tab-pane label="最终Prompt" name="prompt">
            <el-input :model-value="detailDrawer.task.promptText || ''" type="textarea" :rows="18" readonly resize="none" />
          </el-tab-pane>
          <el-tab-pane label="请求参数" name="request">
            <el-input :model-value="formatJson(detailDrawer.task.requestJson)" type="textarea" :rows="18" readonly resize="none" />
          </el-tab-pane>
          <el-tab-pane label="错误详情" name="error">
            <el-input :model-value="detailDrawer.task.errorMsg || '暂无错误信息'" type="textarea" :rows="18" readonly resize="none" />
          </el-tab-pane>
        </el-tabs>
      </template>
    </el-drawer>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Refresh } from '@element-plus/icons-vue'
import { getAiGenerateTask, pageAiGenerateTasks } from '@/api/ai'
import PageFooterPager from '@/components/PageFooterPager.vue'

const route = useRoute()
const router = useRouter()

const loading = ref(false)
const rows = ref([])
const keyword = ref('')
const timer = ref(null)
const autoRefreshTimer = ref(null)
const routeBizId = ref(null)
const lastRefreshTime = ref('')
const autoRefreshManuallyStopped = ref(false)

const pager = reactive({
  page: 1,
  size: 10,
  total: 0
})

const filters = reactive({
  bizType: '',
  status: ''
})

const detailDrawer = reactive({
  visible: false,
  activeTab: 'prompt',
  task: null
})

const statusCount = computed(() => {
  const map = { pending: 0, running: 0, success: 0, failed: 0 }
  rows.value.forEach((row) => {
    const status = normalizeStatus(row.status)
    if (status in map) map[status] += 1
  })
  return map
})

const hasRunningTask = computed(() => rows.value.some((row) => isRunning(row.status)))
const autoRefreshing = computed(() => Boolean(autoRefreshTimer.value))

onMounted(async () => {
  initRouteQuery()
  await loadTasks()

  if (route.query.autoRefresh === '1' || hasRunningTask.value) {
    startAutoRefresh()
  }
})

onBeforeUnmount(() => {
  stopAutoRefresh()
})

function initRouteQuery() {
  const bizId = route.query.bizId || route.query.projectId
  routeBizId.value = bizId ? Number(bizId) : null

  if (route.query.bizType) {
    filters.bizType = String(route.query.bizType)
  }

  if (route.query.status) {
    filters.status = String(route.query.status)
  }
}

function startAutoRefresh() {
  autoRefreshManuallyStopped.value = false
  stopAutoRefresh()

  autoRefreshTimer.value = setInterval(async () => {
    await loadTasks(false)

    if (!hasRunningTask.value) {
      stopAutoRefresh()
      ElMessage.success('生成任务已结束，自动刷新已停止')
    }
  }, 3000)
}

function stopAutoRefresh(manual = false) {
  if (manual) {
    autoRefreshManuallyStopped.value = true
  }
  if (autoRefreshTimer.value) {
    clearInterval(autoRefreshTimer.value)
    autoRefreshTimer.value = null
  }
}

function onKeywordInput() {
  clearTimeout(timer.value)
  timer.value = setTimeout(() => {
    reloadFirstPage()
  }, 300)
}

function reloadFirstPage() {
  pager.page = 1
  autoRefreshManuallyStopped.value = false
  loadTasks()
}

async function loadTasks(showLoading = true) {
  if (showLoading) {
    loading.value = true
  }

  try {
    const res = await pageAiGenerateTasks({
      current: pager.page,
      size: pager.size,
      pageNum: pager.page,
      pageSize: pager.size,
      keyword: keyword.value || undefined,
      bizType: filters.bizType || undefined,
      status: filters.status || undefined,
      bizId: routeBizId.value || undefined
    })

    rows.value = res?.records || []
    pager.total = Number(res?.total || 0)
    lastRefreshTime.value = formatNow()

    if (hasRunningTask.value && !autoRefreshing.value && !autoRefreshManuallyStopped.value) {
      startAutoRefresh()
    }
  } finally {
    if (showLoading) {
      loading.value = false
    }
  }
}

async function openDetail(row) {
  if (!row?.id) return
  const detail = await getAiGenerateTask(row.id)
  detailDrawer.task = detail
  detailDrawer.activeTab = detail?.errorMsg ? 'error' : 'prompt'
  detailDrawer.visible = true
}

async function refreshDetail() {
  if (!detailDrawer.task?.id) return
  detailDrawer.task = await getAiGenerateTask(detailDrawer.task.id)
  ElMessage.success('任务详情已刷新')
}

function canViewResult(row) {
  return isSuccess(row?.status) && Boolean(row?.resultId)
}

function canShowError(row) {
  return isFailed(row?.status) || Boolean(row?.errorMsg)
}

function goResult(row) {
  if (!canViewResult(row)) {
    showResultMissing(row)
    return
  }
  router.push({
    path: '/ai/results',
    query: {
      resultId: row.resultId,
      projectId: row.bizId || undefined,
      bizType: row.bizType || undefined
    }
  })
}

function showResultMissing(row) {
  if (isSuccess(row?.status)) {
    ElMessageBox.alert('生成任务已成功，但结果记录不存在，请检查生成结果表。', '结果缺失', {
      type: 'warning',
      confirmButtonText: '知道了'
    })
    return
  }
  ElMessage.warning('当前任务暂无生成结果')
}

function goWorkbench(row) {
  if (!row?.bizId) {
    ElMessage.warning('当前任务未关联项目，不能重新生成')
    return
  }
  router.push({
    path: '/ai/workbench',
    query: {
      projectId: row.bizId,
      bizType: row.bizType || undefined
    }
  })
}

function goProject(row) {
  if (!row?.bizId) {
    ElMessage.warning('当前任务未关联项目')
    return
  }
  router.push({ path: '/bid/projects', query: { projectId: row.bizId, tab: 'generateRecords' } })
}

function showError(row) {
  if (!row?.errorMsg) {
    ElMessage.info('暂无错误信息')
    return
  }
  ElMessageBox.alert(row.errorMsg, '错误详情', {
    type: 'error',
    confirmButtonText: '知道了',
    customClass: 'task-error-dialog'
  })
}

function normalizeStatus(value) {
  return String(value || '').toLowerCase()
}

function isRunning(value) {
  return ['pending', 'running', 'processing'].includes(normalizeStatus(value))
}

function isSuccess(value) {
  return normalizeStatus(value) === 'success'
}

function isFailed(value) {
  return ['failed', 'error'].includes(normalizeStatus(value))
}

function statusLabel(value) {
  const map = {
    pending: '待生成',
    running: '生成中',
    processing: '生成中',
    success: '生成成功',
    failed: '生成失败',
    error: '生成失败',
    cancelled: '已取消'
  }
  return map[normalizeStatus(value)] || value || '-'
}

function statusTag(value) {
  const map = {
    pending: 'info',
    running: 'warning',
    processing: 'warning',
    success: 'success',
    failed: 'danger',
    error: 'danger',
    cancelled: 'info'
  }
  return map[normalizeStatus(value)] || 'info'
}

function generateTypeLabel(value) {
  const map = {
    bid_tech: '技术标',
    bid_business: '商务标',
    bid_full: '完整标书',
    bid: '标书',
    contract: '合同',
    feasibility: '可研',
    eia: '环评',
    tia: '交评'
  }
  return map[String(value || '').toLowerCase()] || value || '-'
}

function generateTypeTag(value) {
  const map = {
    bid_tech: 'primary',
    bid_business: 'success',
    bid_full: 'warning',
    bid: 'info',
    contract: 'danger',
    feasibility: 'success',
    eia: 'warning',
    tia: 'info'
  }
  return map[String(value || '').toLowerCase()] || 'info'
}

function formatDuration(seconds, startTime, finishTime, status) {
  let value = Number(seconds)

  if ((!Number.isFinite(value) || value <= 0) && startTime) {
    const start = new Date(startTime).getTime()
    const end = finishTime ? new Date(finishTime).getTime() : Date.now()
    if (Number.isFinite(start) && Number.isFinite(end) && end > start) {
      value = Math.floor((end - start) / 1000)
    }
  }

  if (!Number.isFinite(value) || value < 0) {
    return isRunning(status) ? '生成中' : '-'
  }

  const prefix = isRunning(status) ? '已运行 ' : ''
  if (value < 60) return `${prefix}${value} 秒`

  const minute = Math.floor(value / 60)
  const second = value % 60
  if (minute < 60) return `${prefix}${minute} 分 ${second} 秒`

  const hour = Math.floor(minute / 60)
  return `${prefix}${hour} 小时 ${minute % 60} 分`
}

function formatJson(value) {
  if (!value) return ''
  try {
    return JSON.stringify(JSON.parse(value), null, 2)
  } catch (e) {
    return value
  }
}

function formatNow() {
  const date = new Date()
  const pad = (num) => String(num).padStart(2, '0')
  return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
}
</script>

<style scoped>
.task-card {
  min-width: 0;
}

.task-filters {
  display: flex;
  align-items: center;
  gap: 8px;
}

.refresh-time {
  color: var(--text-sub);
  font-size: 13px;
  white-space: nowrap;
}

.summary-row {
  display: grid;
  grid-template-columns: repeat(5, minmax(120px, 1fr));
  gap: 12px;
  margin-bottom: 12px;
}

.summary-card {
  padding: 12px 14px;
  border-radius: 12px;
  border: 1px solid var(--border);
  background: #f8fafc;
}

.summary-card span {
  display: block;
  color: var(--text-sub);
  font-size: 13px;
  margin-bottom: 4px;
}

.summary-card strong {
  display: block;
  color: var(--text-main);
  font-size: 20px;
  font-weight: 800;
}

.summary-card.is-pending strong,
.summary-card.is-running strong,
.running-duration {
  color: #d97706;
}

.summary-card.is-success strong {
  color: #16a34a;
}

.summary-card.is-danger strong,
.error-text {
  color: #dc2626;
}

.route-alert {
  margin-bottom: 12px;
}

.project-cell,
.model-cell {
  min-width: 0;
}

.project-name,
.model-cell {
  font-weight: 700;
  color: var(--text-main);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.project-code,
.model-sub {
  margin-top: 4px;
  color: var(--text-sub);
  font-size: 12px;
}

.table-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  white-space: nowrap;
}

.detail-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 14px;
}

.detail-title {
  font-size: 18px;
  font-weight: 800;
  color: var(--text-main);
}

.detail-sub {
  margin-top: 6px;
  color: var(--text-sub);
  font-size: 13px;
}

.detail-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 8px;
}

.detail-desc,
.detail-alert {
  margin-bottom: 14px;
}

@media (max-width: 1280px) {
  .summary-row {
    grid-template-columns: repeat(3, minmax(120px, 1fr));
  }
}

@media (max-width: 1080px) {
  .summary-row {
    grid-template-columns: repeat(2, minmax(120px, 1fr));
  }

  .task-filters {
    flex-wrap: wrap;
  }
}
</style>
