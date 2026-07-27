<template>
  <div class="page ai-task-page">
    <div class="page-body ai-task-body">
      <section class="task-filter-card">
        <div class="task-filter-left">
          <el-input
            v-model="query.keyword"
            clearable
            placeholder="搜索任务名称、任务号、消息或错误"
            class="task-search"
            @input="onSearchInput"
          >
            <template #prefix><el-icon><Search /></el-icon></template>
          </el-input>

          <el-select v-model="query.taskCategory" clearable placeholder="任务类型" class="task-filter-select" @change="onFilterChange">
            <el-option label="资料解析" value="PARSE" />
            <el-option label="AI生成" value="GENERATE" />
            <el-option label="文档导出" value="EXPORT" />
            <el-option label="知识库问答" value="ASK" />
          </el-select>

          <el-select v-model="query.status" clearable placeholder="任务状态" class="task-filter-select" @change="onFilterChange">
            <el-option label="等待中" value="WAITING" />
            <el-option label="运行中" value="RUNNING" />
            <el-option label="成功" value="SUCCESS" />
            <el-option label="部分成功" value="PARTIAL" />
            <el-option label="失败" value="FAILED" />
            <el-option label="已取消" value="CANCELED" />
          </el-select>

          <el-date-picker
            v-model="dateRange"
            type="daterange"
            value-format="YYYY-MM-DD"
            range-separator="至"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            class="task-date-range"
            @change="onFilterChange"
          />
        </div>

        <div class="task-filter-right">
          <el-switch v-model="autoRefresh" active-text="自动刷新" @change="scheduleAutoRefresh" />
          <el-button :icon="RefreshLeft" @click="resetFilters">重置</el-button>
        </div>
      </section>

      <section class="task-list-card" v-loading="loading">
        <div class="task-list-scroll">
          <div v-if="tasks.length" class="task-list">
            <article
              v-for="row in tasks"
              :key="row.id"
              class="task-row"
              :class="{ 'is-failed': isFailureStatus(row.status), 'is-running': isRunningStatus(row.status) }"
              @click="openTaskDetail(row)"
            >
            <div class="task-identity">
              <span class="task-type-icon" :class="`tone-${taskTone(row)}`">
                <el-icon><component :is="taskIcon(row)" /></el-icon>
              </span>
              <span class="task-identity-copy">
                <strong>{{ row.taskName || row.taskType || '-' }}</strong>
                <small>{{ row.taskNo || row.id }}</small>
              </span>
            </div>

            <div class="task-status-cell">
              <span class="status-pill" :class="statusClass(row.status)">{{ statusLabel(row.status) }}</span>
            </div>

            <div class="task-progress-cell">
              <el-progress :percentage="safePercent(row.progress)" :stroke-width="7" :show-text="false" />
              <strong>{{ safePercent(row.progress) }}%</strong>
            </div>

            <div class="task-node-cell">
              <small>节点</small>
              <strong>{{ row.finishedNodes || 0 }}/{{ row.totalNodes || 0 }}</strong>
              <span v-if="row.failedNodes">失败 {{ row.failedNodes }}</span>
            </div>

            <div class="task-message-cell">
              <small>消息</small>
              <strong :class="{ danger: isFailureStatus(row.status) }">{{ taskMainMessage(row) }}</strong>
              <span v-if="row.wordCount">已生成 {{ Number(row.wordCount).toLocaleString() }} 字</span>
            </div>

            <div class="task-result-cell">
              <strong>{{ taskSecondaryMessage(row) }}</strong>
              <time>{{ formatTime(row.createTime) }}</time>
            </div>

            <div class="task-action-cell" @click.stop>
              <el-dropdown trigger="click" @command="(command) => handleTaskCommand(command, row)">
                <button type="button" class="more-button" aria-label="任务操作">
                  <el-icon><MoreFilled /></el-icon>
                </button>
                <template #dropdown>
                  <el-dropdown-menu>
                    <el-dropdown-item command="detail">查看详情</el-dropdown-item>
                    <el-dropdown-item v-if="isCancelable(row)" command="cancel" divided>取消任务</el-dropdown-item>
                  </el-dropdown-menu>
                </template>
              </el-dropdown>
            </div>
            </article>
          </div>

          <el-empty v-else :image-size="94" description="暂无符合条件的任务" />
        </div>

        <PageFooterPager
          v-model:page="query.pageNum"
          v-model:size="query.pageSize"
          :total="total"
          @change="loadTasks"
        />
      </section>
    </div>

    <el-drawer
      v-model="detailVisible"
      title="任务详情"
      size="720px"
      destroy-on-close
      class="task-detail-drawer"
    >
      <div v-loading="detailLoading" class="task-detail">
        <template v-if="taskDetail?.task">
          <el-descriptions :column="2" border size="small">
            <el-descriptions-item label="任务名称">{{ taskDetail.task.taskName || '-' }}</el-descriptions-item>
            <el-descriptions-item label="任务状态">
              <el-tag :type="statusTagType(taskDetail.task.status)" size="small">{{ statusLabel(taskDetail.task.status) }}</el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="业务类型">{{ taskDetail.bizLabel || categoryLabel(taskDetail.task.taskCategory) }}</el-descriptions-item>
            <el-descriptions-item label="生成成果">{{ taskDetail.solutionName || taskDetail.solutionId || '-' }}</el-descriptions-item>
            <el-descriptions-item label="进度">{{ safePercent(taskDetail.task.progress) }}%</el-descriptions-item>
            <el-descriptions-item label="节点">{{ taskDetail.task.finishedNodes || 0 }}/{{ taskDetail.task.totalNodes || 0 }}，失败 {{ taskDetail.task.failedNodes || 0 }}</el-descriptions-item>
            <el-descriptions-item label="开始时间">{{ formatTime(taskDetail.task.startTime) }}</el-descriptions-item>
            <el-descriptions-item label="完成时间">{{ formatTime(taskDetail.task.finishTime) }}</el-descriptions-item>
            <el-descriptions-item label="消息" :span="2">{{ taskDetail.task.message || '-' }}</el-descriptions-item>
            <el-descriptions-item label="失败原因" :span="2">{{ safeErrorMessage(taskDetail.task.errorMessage) }}</el-descriptions-item>
          </el-descriptions>

          <div class="detail-section-head">
            <div>
              <h3>任务事件</h3>
              <p>展示生成、联网摘要、自动图表和自动配图等关键过程，便于定位失败原因。</p>
            </div>
          </div>

          <el-empty v-if="!eventLoading && !taskEvents.length" description="暂无任务事件" />
          <el-table
            v-else
            v-loading="eventLoading"
            :data="taskEvents"
            border
            stripe
            size="small"
            max-height="260"
            class="task-event-table"
          >
            <el-table-column label="时间" width="155">
              <template #default="{ row }">{{ formatTime(row.createTime) }}</template>
            </el-table-column>
            <el-table-column label="事件" min-width="150" show-overflow-tooltip>
              <template #default="{ row }">{{ row.eventName || row.eventType || '-' }}</template>
            </el-table-column>
            <el-table-column label="状态" width="90" align="center">
              <template #default="{ row }"><el-tag size="small" :type="statusTagType(row.status)">{{ eventStatusLabel(row.status) }}</el-tag></template>
            </el-table-column>
            <el-table-column label="说明" min-width="260" show-overflow-tooltip>
              <template #default="{ row }">{{ safeEventMessage(row.message) }}</template>
            </el-table-column>
            <el-table-column label="耗时" width="90" align="center">
              <template #default="{ row }">{{ formatDuration(row.costMs) }}</template>
            </el-table-column>
          </el-table>

          <div v-if="taskDetail.sectionTasks?.length" class="detail-section-head">
            <div>
              <h3>章节流水线</h3>
              <p>总 {{ taskDetail.sectionTaskTotal || 0 }}，等待 {{ taskDetail.sectionTaskWaiting || 0 }}，生成中 {{ taskDetail.sectionTaskRunning || 0 }}，成功 {{ taskDetail.sectionTaskSuccess || 0 }}，失败 {{ taskDetail.sectionTaskFailed || 0 }}</p>
            </div>
            <span v-if="taskDetail.estimatedRemainingSeconds" class="detail-muted">预计剩余 {{ Math.ceil(taskDetail.estimatedRemainingSeconds / 60) }} 分钟</span>
          </div>

          <el-table
            v-if="taskDetail.sectionTasks?.length"
            :data="taskDetail.sectionTasks"
            border
            stripe
            size="small"
            max-height="320"
            class="section-task-table"
          >
            <el-table-column label="章节" min-width="200">
              <template #default="{ row }">
                <div class="section-title">{{ row.title || '未命名章节' }}</div>
                <div class="section-sub">目标 {{ row.targetWordCount || 0 }} 字，实际 {{ row.actualWordCount || 0 }} 字</div>
              </template>
            </el-table-column>
            <el-table-column label="状态" width="90" align="center">
              <template #default="{ row }"><el-tag size="small" :type="statusTagType(row.status)">{{ statusLabel(row.status) }}</el-tag></template>
            </el-table-column>
            <el-table-column label="质检" width="100" align="center">
              <template #default="{ row }">
                <el-tag v-if="row.qualityStatus" size="small" :type="qualityTagType(row.qualityStatus)">{{ qualityLabel(row.qualityStatus) }}</el-tag>
                <span v-else>-</span>
              </template>
            </el-table-column>
            <el-table-column label="质检问题" min-width="220" show-overflow-tooltip>
              <template #default="{ row }">{{ row.qualityIssues || '-' }}</template>
            </el-table-column>
            <el-table-column label="模型" width="150" show-overflow-tooltip>
              <template #default="{ row }">{{ row.modelName || '-' }}</template>
            </el-table-column>
            <el-table-column label="耗时" width="90" align="center">
              <template #default="{ row }">{{ formatDuration(row.durationMs) }}</template>
            </el-table-column>
          </el-table>

          <div class="detail-section-head">
            <div>
              <h3>失败 / 未完成章节</h3>
              <p>{{ taskDetail.retryFailedTip || '查看失败章节原因，支持逐章重试。' }}</p>
            </div>
            <el-button
              v-if="taskDetail.canRetryFailed && taskDetail.solutionId"
              type="primary"
              plain
              :loading="retryingAll"
              @click="retryAllFailedSections"
            >重试全部失败章节</el-button>
          </div>

          <el-empty v-if="!taskDetail.failedSections?.length" description="暂无失败或未完成章节" />
          <el-table v-else :data="taskDetail.failedSections" border stripe size="small" class="failed-section-table">
            <el-table-column label="章节" min-width="180">
              <template #default="{ row }">
                <div class="section-title">{{ row.title || '未命名章节' }}</div>
                <div class="section-sub">目标 {{ row.targetWordCount || 0 }} 字，实际 {{ row.actualWordCount || 0 }} 字</div>
              </template>
            </el-table-column>
            <el-table-column label="状态" width="130">
              <template #default="{ row }">
                <el-tag size="small" type="warning">{{ row.contentStatus || row.generateStatus || '未完成' }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="原因" min-width="220" show-overflow-tooltip>
              <template #default="{ row }">{{ safeErrorMessage(row.failureReason) }}</template>
            </el-table-column>
            <el-table-column label="操作" width="120" align="center">
              <template #default="{ row }">
                <el-button
                  link
                  type="primary"
                  :disabled="!row.retryable"
                  :loading="retryingSectionId === row.outlineId"
                  @click="retrySingleSection(row)"
                >重试本章</el-button>
              </template>
            </el-table-column>
          </el-table>
        </template>
      </div>
    </el-drawer>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import {
  ChatDotRound,
  Document,
  MagicStick,
  MoreFilled,
  Operation,
  RefreshLeft,
  Search,
  UploadFilled
} from '@element-plus/icons-vue'
import { cancelAiTask, getAiTaskDetail, pageAiTasks, pageAiTaskEventLogs } from '@/api/aiTaskCenter'
import { formatDateTime } from '@/utils/format'
import { normalizeStreamErrorMessage } from '@/utils/streamError'
import { generateFull, streamSection } from '@/api/aiSolution'
import PageFooterPager from '@/components/PageFooterPager.vue'
import { ElMessage, ElMessageBox } from 'element-plus'

const loading = ref(false)
const tasks = ref([])
const total = ref(0)
const cancelingId = ref('')
const detailVisible = ref(false)
const detailLoading = ref(false)
const detailTaskId = ref('')
const taskDetail = ref(null)
const taskEvents = ref([])
const eventLoading = ref(false)
const retryingAll = ref(false)
const retryingSectionId = ref('')
const autoRefresh = ref(true)
const dateRange = ref([])
const hasRunningTasks = computed(() => tasks.value.some((task) => isRunningStatus(task.status)))
const query = reactive({ pageNum: 1, pageSize: 10, keyword: '', taskCategory: '', status: '' })
let searchTimer = null
let autoRefreshTimer = null

onMounted(() => {
  document.addEventListener('visibilitychange', onVisibilityChange)
  loadTasks()
})

onBeforeUnmount(() => {
  clearTimeout(searchTimer)
  clearTimeout(autoRefreshTimer)
  document.removeEventListener('visibilitychange', onVisibilityChange)
})

function onSearchInput() {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    query.pageNum = 1
    loadTasks()
  }, 260)
}

function onFilterChange() {
  query.pageNum = 1
  loadTasks()
}

function resetFilters() {
  query.keyword = ''
  query.taskCategory = ''
  query.status = ''
  query.pageNum = 1
  dateRange.value = []
  loadTasks()
}

function buildTaskQuery() {
  const params = { ...query }
  if (Array.isArray(dateRange.value) && dateRange.value.length === 2) {
    params.startTime = `${dateRange.value[0]} 00:00:00`
    params.endTime = `${dateRange.value[1]} 23:59:59`
  }
  return params
}

async function loadTasks() {
  loading.value = true
  try {
    const res = await pageAiTasks(buildTaskQuery())
    tasks.value = res?.records || []
    total.value = Number(res?.total || 0)
    if (total.value > 0 && tasks.value.length === 0 && query.pageNum > 1) {
      query.pageNum -= 1
      await loadTasks()
    }
  } finally {
    loading.value = false
    scheduleAutoRefresh()
  }
}

function scheduleAutoRefresh() {
  clearTimeout(autoRefreshTimer)
  if (!autoRefresh.value || document.hidden || !hasRunningTasks.value) return
  autoRefreshTimer = setTimeout(() => {
    if (!loading.value && autoRefresh.value && !document.hidden) {
      loadTasks()
    }
  }, 8000)
}

function onVisibilityChange() {
  if (document.hidden) {
    clearTimeout(autoRefreshTimer)
    return
  }
  if (autoRefresh.value && hasRunningTasks.value) {
    loadTasks()
  }
}

function isRunningStatus(value) {
  const status = String(value || '').toUpperCase()
  return ['WAITING', 'PENDING', 'RUNNING', 'PARSING', 'EXTRACTING', 'CANCEL_REQUESTED'].includes(status)
}

function isSuccessStatus(value) {
  return String(value || '').toUpperCase() === 'SUCCESS'
}

function isFailureStatus(value) {
  return ['FAILED', 'TIMEOUT'].includes(String(value || '').toUpperCase())
}

function isCancelable(row) {
  return !!row?.cancelable && ['PARSE', 'GENERATE'].includes(String(row.taskCategory || '').toUpperCase()) && isRunningStatus(row.status)
}

function taskTone(row) {
  const category = String(row?.taskCategory || '').toUpperCase()
  if (category === 'GENERATE') return 'violet'
  if (category === 'PARSE') return 'blue'
  if (category === 'EXPORT') return 'amber'
  if (category === 'ASK') return 'cyan'
  return 'blue'
}

function taskIcon(row) {
  const category = String(row?.taskCategory || '').toUpperCase()
  if (category === 'GENERATE') return MagicStick
  if (category === 'PARSE') return Document
  if (category === 'EXPORT') return UploadFilled
  if (category === 'ASK') return ChatDotRound
  return Operation
}

function taskMainMessage(row) {
  if (isFailureStatus(row?.status)) return safeErrorMessage(row?.errorMessage)
  return row?.message || '任务处理中'
}

function taskSecondaryMessage(row) {
  if (isFailureStatus(row?.status)) return '任务执行失败，请查看详情'
  if (String(row?.status || '').toUpperCase() === 'PARTIAL') return '部分章节已完成，可重试失败章节'
  if (String(row?.status || '').toUpperCase() === 'CANCELED') return '任务已取消，已完成内容仍然保留'
  if (isRunningStatus(row?.status)) return row?.cancelTip || '任务正在执行，请耐心等待'
  return row?.errorMessage ? safeErrorMessage(row.errorMessage) : '-'
}

function handleTaskCommand(command, row) {
  if (command === 'detail') {
    openTaskDetail(row)
    return
  }
  if (command === 'cancel') {
    cancelTask(row)
  }
}

async function openTaskDetail(row) {
  if (!row?.id || !row?.taskCategory) return
  detailVisible.value = true
  detailTaskId.value = row.id
  await Promise.all([
    loadTaskDetail(row.taskCategory, row.id),
    loadTaskEvents(row.id)
  ])
}

async function loadTaskDetail(taskCategory, taskId) {
  detailLoading.value = true
  try {
    taskDetail.value = await getAiTaskDetail(taskCategory, taskId)
  } finally {
    detailLoading.value = false
  }
}

async function loadTaskEvents(taskId) {
  if (!taskId) {
    taskEvents.value = []
    return
  }
  eventLoading.value = true
  try {
    const res = await pageAiTaskEventLogs({ taskId, current: 1, size: 30 })
    taskEvents.value = res?.records || []
  } catch (e) {
    taskEvents.value = []
  } finally {
    eventLoading.value = false
  }
}

async function retryAllFailedSections() {
  const solutionId = taskDetail.value?.solutionId
  if (!solutionId || retryingAll.value) return
  try {
    await ElMessageBox.confirm(
      '将只重试失败或未完成章节，不覆盖已成功章节。确定继续？',
      '重试失败章节',
      { type: 'warning', confirmButtonText: '开始重试', cancelButtonText: '取消' }
    )
  } catch (e) {
    return
  }
  retryingAll.value = true
  try {
    await generateFull(solutionId, { retryFailedOnly: true, requestId: `task_center_retry_${solutionId}_${Date.now()}` })
    ElMessage.success('已提交失败章节重试任务')
    await loadTasks()
    if (taskDetail.value?.task?.taskCategory && taskDetail.value?.task?.id) {
      await loadTaskDetail(taskDetail.value.task.taskCategory, taskDetail.value.task.id)
      await loadTaskEvents(taskDetail.value.task.id)
    }
  } catch (e) {
    ElMessage.error(safeErrorMessage(e?.message || e))
  } finally {
    retryingAll.value = false
  }
}

async function retrySingleSection(row) {
  if (!row?.outlineId || retryingSectionId.value) return
  try {
    await ElMessageBox.confirm(
      `确定重新生成章节“${row.title || '未命名章节'}”？本次只覆盖该章节正文。`,
      '重试本章',
      { type: 'warning', confirmButtonText: '开始重试', cancelButtonText: '取消' }
    )
  } catch (e) {
    return
  }
  retryingSectionId.value = row.outlineId
  try {
    await streamSection(row.outlineId, { overwrite: true }, {
      onError: (message) => { throw new Error(safeErrorMessage(message)) }
    })
    ElMessage.success('章节已重新生成')
    await loadTasks()
    if (taskDetail.value?.task?.taskCategory && taskDetail.value?.task?.id) {
      await loadTaskDetail(taskDetail.value.task.taskCategory, taskDetail.value.task.id)
      await loadTaskEvents(taskDetail.value.task.id)
    }
  } catch (e) {
    ElMessage.error(safeErrorMessage(e?.message || e))
  } finally {
    retryingSectionId.value = ''
  }
}

async function cancelTask(row) {
  if (!row?.id || !isCancelable(row)) return
  try {
    await ElMessageBox.confirm(
      '终止后只停止尚未完成的内容，已经生成成功的章节会继续保留。确定终止该任务吗？',
      '终止AI任务',
      { type: 'warning', confirmButtonText: '确定终止', cancelButtonText: '再等等' }
    )
  } catch (e) {
    return
  }
  cancelingId.value = row.id
  try {
    await cancelAiTask(row.taskCategory, row.id)
    ElMessage.success('已提交终止请求，已生成章节不会丢失')
    await loadTasks()
  } finally {
    cancelingId.value = ''
  }
}

function formatTime(value) {
  return value ? formatDateTime(value) : '-'
}

function categoryLabel(value) {
  const map = { PARSE: '解析', GENERATE: '生成', EXPORT: '导出', ASK: '问答' }
  return map[String(value || '').toUpperCase()] || value || '-'
}

function statusLabel(value) {
  const map = {
    WAITING: '等待中',
    PENDING: '等待中',
    RUNNING: '运行中',
    CANCEL_REQUESTED: '终止中',
    SUCCESS: '成功',
    PARTIAL: '部分成功',
    FAILED: '失败',
    TIMEOUT: '已超时',
    CANCELED: '已取消'
  }
  return map[String(value || '').toUpperCase()] || value || '-'
}

function statusClass(value) {
  const status = String(value || '').toUpperCase()
  if (status === 'SUCCESS') return 'success'
  if (status === 'FAILED' || status === 'TIMEOUT') return 'danger'
  if (status === 'PARTIAL') return 'warning'
  if (status === 'CANCELED') return 'neutral'
  if (status === 'CANCEL_REQUESTED') return 'orange'
  if (isRunningStatus(status)) return 'running'
  return 'neutral'
}

function statusTagType(value) {
  const status = String(value || '').toUpperCase()
  if (status === 'SUCCESS') return 'success'
  if (status === 'FAILED' || status === 'TIMEOUT') return 'danger'
  if (status === 'CANCELED') return 'info'
  if (status === 'PARTIAL' || status === 'CANCEL_REQUESTED') return 'warning'
  if (status === 'RUNNING' || status === 'WAITING' || status === 'PENDING') return 'warning'
  return 'info'
}

function eventStatusLabel(value) {
  const map = { WAITING: '等待中', PENDING: '等待中', RUNNING: '运行中', SUCCESS: '成功', PARTIAL: '已跳过', WARN: '预警', FAILED: '失败', TIMEOUT: '已超时', CANCELED: '已取消' }
  return map[String(value || '').toUpperCase()] || value || '-'
}

function safeEventMessage(value) {
  return safeErrorMessage(value)
}

function qualityLabel(value) {
  const map = { PASS: '通过', WARN: '预警', FAIL: '失败' }
  return map[String(value || '').toUpperCase()] || value || '-'
}

function qualityTagType(value) {
  const status = String(value || '').toUpperCase()
  if (status === 'PASS') return 'success'
  if (status === 'WARN') return 'warning'
  if (status === 'FAIL') return 'danger'
  return 'info'
}

function formatDuration(value) {
  const ms = Number(value || 0)
  if (!Number.isFinite(ms) || ms <= 0) return '-'
  if (ms < 1000) return `${Math.round(ms)}ms`
  if (ms < 60000) return `${Math.round(ms / 1000)}s`
  return `${Math.round(ms / 60000)}min`
}

function safePercent(value) {
  const n = Number(value || 0)
  return Math.max(0, Math.min(100, Number.isFinite(n) ? n : 0))
}

function safeErrorMessage(value) {
  if (!value) return '-'
  return normalizeStreamErrorMessage(value, '任务失败，请稍后重试或联系管理员')
}
</script>

<style scoped>
.ai-task-page {
  height: 100%;
  min-height: 0;
  padding: 0;
  overflow: hidden;
  background: transparent;
}

.ai-task-body {
  display: flex;
  width: 100%;
  max-width: 1500px;
  height: 100%;
  min-height: 0;
  margin: 0 auto;
  flex-direction: column;
  gap: 18px;
  overflow: hidden;
}

.task-stat-grid,
.task-filter-card {
  flex-shrink: 0;
}

.task-stat-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 16px;
}

.task-stat-card {
  position: relative;
  display: flex;
  align-items: center;
  min-height: 132px;
  padding: 21px 20px;
  overflow: hidden;
  border: 1px solid rgba(227, 231, 242, 0.88);
  border-radius: 17px;
  background: rgba(255, 255, 255, 0.94);
  box-shadow: 0 13px 31px rgba(49, 65, 104, 0.07);
}

.task-stat-icon {
  position: relative;
  z-index: 2;
  display: inline-flex;
  flex: 0 0 46px;
  align-items: center;
  justify-content: center;
  width: 46px;
  height: 46px;
  border-radius: 13px;
  color: #fff;
  box-shadow: 0 10px 19px rgba(62, 77, 145, 0.17);
}

.task-stat-icon :deep(.el-icon) {
  font-size: 23px;
}

.tone-blue .task-stat-icon { background: linear-gradient(145deg, #3b7df8, #5b9dff); }
.tone-green .task-stat-icon { background: linear-gradient(145deg, #28c989, #52dfad); }
.tone-red .task-stat-icon { background: linear-gradient(145deg, #ff5965, #ff7e82); }
.tone-violet .task-stat-icon { background: linear-gradient(145deg, #9b4af2, #b36bf8); }

.task-stat-copy {
  position: relative;
  z-index: 2;
  display: flex;
  flex-direction: column;
  margin-left: 14px;
}

.task-stat-title {
  color: #657086;
  font-size: 12px;
}

.task-stat-copy strong {
  margin-top: 5px;
  color: #172033;
  font-size: 29px;
  font-weight: 900;
  line-height: 1;
}

.task-stat-copy strong small {
  margin-left: 4px;
  color: #6f7890;
  font-size: 11px;
  font-weight: 700;
}

.task-stat-trend {
  margin-top: 9px;
  color: #8d96a9;
  font-size: 10px;
}

.task-stat-trend.positive { color: #20b978; }
.task-stat-trend.negative { color: #ef5360; }
.task-stat-trend.neutral { color: #8d96a9; }

.task-stat-line {
  position: absolute;
  right: 14px;
  bottom: 16px;
  width: 84px;
  height: 34px;
  opacity: 0.72;
}

.tone-blue .task-stat-line { color: #5f8fff; }
.tone-green .task-stat-line { color: #45d59b; }
.tone-red .task-stat-line { color: #ff6b78; }
.tone-violet .task-stat-line { color: #a85ef6; }

.task-stat-glow {
  position: absolute;
  right: -42px;
  bottom: -58px;
  width: 125px;
  height: 125px;
  border-radius: 50%;
  opacity: 0.09;
}

.tone-blue .task-stat-glow { background: #4f86ff; }
.tone-green .task-stat-glow { background: #30cb91; }
.tone-red .task-stat-glow { background: #ff5f6c; }
.tone-violet .task-stat-glow { background: #9f50f2; }

.task-filter-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  padding: 15px 16px;
  border: 1px solid rgba(227, 231, 242, 0.88);
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.94);
  box-shadow: 0 11px 26px rgba(49, 65, 104, 0.06);
}

.task-filter-left,
.task-filter-right {
  display: flex;
  align-items: center;
  gap: 10px;
}

.task-filter-left {
  min-width: 0;
  flex: 1;
}

.task-search {
  width: 310px;
}

.task-filter-select {
  width: 148px;
}

.task-date-range {
  width: 280px;
}

.task-filter-card :deep(.el-input__wrapper),
.task-filter-card :deep(.el-select__wrapper) {
  min-height: 38px;
  border-radius: 10px;
  box-shadow: 0 0 0 1px #e7eaf2 inset;
}

.task-filter-card :deep(.el-input__wrapper.is-focus),
.task-filter-card :deep(.el-select__wrapper.is-focused) {
  box-shadow: 0 0 0 1px #7664f4 inset;
}

.task-list-card {
  display: flex;
  flex: 1;
  min-height: 0;
  flex-direction: column;
  padding: 10px 14px 12px;
  overflow: hidden;
  border: 1px solid rgba(227, 231, 242, 0.88);
  border-radius: 17px;
  background: rgba(255, 255, 255, 0.95);
  box-shadow: 0 13px 32px rgba(49, 65, 104, 0.07);
}

.task-list-scroll {
  flex: 1;
  min-height: 0;
  overflow-x: hidden;
  overflow-y: auto;
  overscroll-behavior: contain;
  scrollbar-gutter: stable;
}

.task-list-scroll::-webkit-scrollbar {
  width: 7px;
}

.task-list-scroll::-webkit-scrollbar-thumb {
  border-radius: 999px;
  background: rgba(129, 139, 166, 0.35);
}

.task-list-scroll::-webkit-scrollbar-track {
  background: transparent;
}

.task-list {
  display: flex;
  flex-direction: column;
}

.task-row {
  display: grid;
  grid-template-columns: minmax(225px, 1.4fr) 92px 160px 88px minmax(190px, 1.15fr) minmax(180px, 1fr) 34px;
  align-items: center;
  gap: 14px;
  min-height: 82px;
  padding: 13px 9px;
  border-bottom: 1px solid #edf0f5;
  cursor: pointer;
  transition: background 0.18s ease, transform 0.18s ease;
}

.task-row:hover {
  background: linear-gradient(90deg, rgba(247, 249, 255, 0.95), rgba(252, 253, 255, 0.95));
  transform: translateY(-1px);
}

.task-row:last-child {
  border-bottom: 0;
}

.task-row.is-failed {
  background: linear-gradient(90deg, rgba(255, 249, 249, 0.68), transparent 70%);
}

.task-row.is-running {
  background: linear-gradient(90deg, rgba(247, 249, 255, 0.70), transparent 75%);
}

.task-identity {
  display: flex;
  min-width: 0;
  align-items: center;
}

.task-type-icon {
  display: inline-flex;
  flex: 0 0 42px;
  align-items: center;
  justify-content: center;
  width: 42px;
  height: 42px;
  border-radius: 12px;
  color: #fff;
  box-shadow: 0 8px 16px rgba(60, 75, 140, 0.15);
}

.task-type-icon.tone-violet { background: linear-gradient(145deg, #a34df3, #bf6af7); }
.task-type-icon.tone-blue { background: linear-gradient(145deg, #5489f9, #65a8ff); }
.task-type-icon.tone-amber { background: linear-gradient(145deg, #ffaf4e, #ffc46e); }
.task-type-icon.tone-cyan { background: linear-gradient(145deg, #3fbfd7, #65d5e6); }

.task-type-icon :deep(.el-icon) {
  font-size: 21px;
}

.task-identity-copy {
  display: flex;
  min-width: 0;
  flex-direction: column;
  margin-left: 12px;
}

.task-identity-copy strong,
.task-identity-copy small {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.task-identity-copy strong {
  color: #283146;
  font-size: 12px;
  font-weight: 800;
}

.task-identity-copy small {
  margin-top: 7px;
  color: #9aa3b5;
  font-size: 9px;
}

.status-pill {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 23px;
  padding: 0 9px;
  border-radius: 999px;
  font-size: 10px;
  font-weight: 700;
  white-space: nowrap;
}

.status-pill.success { background: #eaf9f1; color: #25ae6e; }
.status-pill.danger { background: #fff0f1; color: #ed4c5a; }
.status-pill.warning { background: #fff5e3; color: #dc8a0b; }
.status-pill.running { background: #eef3ff; color: #4d78ee; }
.status-pill.orange { background: #fff3e6; color: #e47c18; }
.status-pill.neutral { background: #f1f3f7; color: #7c8699; }

.task-progress-cell {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 34px;
  align-items: center;
  gap: 8px;
}

.task-progress-cell strong {
  color: #58647b;
  font-size: 10px;
}

.task-progress-cell :deep(.el-progress-bar__outer) {
  background: #edf1f8;
}

.task-progress-cell :deep(.el-progress-bar__inner) {
  background: linear-gradient(90deg, #4c83fa, #5d9cff);
}

.task-node-cell,
.task-message-cell,
.task-result-cell {
  display: flex;
  min-width: 0;
  flex-direction: column;
}

.task-node-cell small,
.task-message-cell small {
  color: #9aa3b5;
  font-size: 9px;
}

.task-node-cell strong,
.task-message-cell strong,
.task-result-cell strong {
  overflow: hidden;
  color: #556078;
  font-size: 10px;
  font-weight: 700;
  line-height: 1.45;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.task-node-cell strong,
.task-message-cell strong {
  margin-top: 5px;
}

.task-node-cell span,
.task-message-cell span {
  margin-top: 3px;
  color: #9aa3b5;
  font-size: 9px;
}

.task-message-cell strong.danger {
  color: #ef4c59;
}

.task-result-cell time {
  margin-top: 7px;
  color: #9aa3b5;
  font-size: 9px;
}

.more-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  padding: 0;
  border: 0;
  border-radius: 9px;
  background: transparent;
  color: #8993a6;
  cursor: pointer;
}

.more-button:hover {
  background: #f1f3f8;
  color: #6658ee;
}

.task-list-card :deep(.page-footer-pager) {
  flex-shrink: 0;
  justify-content: center;
  padding: 15px 0 2px;
  margin-top: 8px;
  border-top: 1px solid #edf0f5;
}

.task-detail {
  min-height: 240px;
}

.detail-section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin: 20px 0 12px;
}

.detail-section-head h3 {
  margin: 0;
  color: #1f2937;
  font-size: 16px;
}

.detail-section-head p {
  margin: 4px 0 0;
  color: #64748b;
  font-size: 13px;
}

.failed-section-table,
.section-task-table,
.task-event-table {
  width: 100%;
}

.section-task-table,
.task-event-table {
  margin-bottom: 18px;
}

.detail-muted {
  color: #64748b;
  font-size: 13px;
}

.section-title {
  color: #1f2937;
  font-weight: 700;
}

.section-sub {
  margin-top: 4px;
  color: #94a3b8;
  font-size: 12px;
}

@media (max-width: 1280px) {
  .task-row {
    grid-template-columns: minmax(210px, 1.4fr) 88px 145px 78px minmax(170px, 1fr) minmax(150px, 0.9fr) 32px;
    gap: 10px;
  }

  .task-date-range {
    width: 245px;
  }
}

@media (max-width: 1080px) {
  .task-stat-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .task-filter-card,
  .task-filter-left {
    align-items: stretch;
    flex-wrap: wrap;
  }

  .task-filter-card {
    flex-direction: column;
  }

  .task-filter-right {
    justify-content: flex-end;
  }

  .task-row {
    grid-template-columns: minmax(250px, 1.5fr) 90px 160px 90px 34px;
  }

  .task-message-cell {
    grid-column: 1 / 4;
    padding-left: 54px;
  }

  .task-result-cell {
    grid-column: 4 / 6;
  }

  .task-action-cell {
    grid-column: 5;
    grid-row: 1;
  }
}

@media (max-width: 720px) {
  .task-stat-grid {
    grid-template-columns: 1fr;
  }

  .task-search,
  .task-filter-select,
  .task-date-range {
    width: 100%;
  }

  .task-filter-left {
    flex-direction: column;
  }

  .task-row {
    grid-template-columns: minmax(0, 1fr) 34px;
    gap: 10px;
    padding: 16px 8px;
  }

  .task-identity {
    grid-column: 1;
  }

  .task-action-cell {
    grid-column: 2;
  }

  .task-status-cell,
  .task-progress-cell,
  .task-node-cell,
  .task-message-cell,
  .task-result-cell {
    grid-column: 1 / 3;
    padding-left: 54px;
  }

  .task-status-cell {
    grid-row: auto;
  }

  .task-result-cell {
    grid-row: auto;
  }
}
</style>
