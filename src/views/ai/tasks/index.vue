<template>
  <div class="page ai-task-page">
    <div class="page-header ai-task-header">
      <div>
        <h2>AI任务中心</h2>
        <p>统一查看解析、生成、导出等长耗时任务，便于排查失败和运行状态。</p>
      </div>
      <div class="header-actions">
        <el-switch v-model="autoRefresh" active-text="自动刷新" inactive-text="手动刷新" @change="scheduleAutoRefresh" />
        <el-button type="primary" :loading="loading" @click="loadTasks">刷新</el-button>
      </div>
    </div>

    <div class="page-body ai-task-body">
      <div class="card card--table ai-task-card">
        <div class="page-toolbar ai-task-toolbar">
          <div class="toolbar-left">
            <el-input v-model="query.keyword" clearable placeholder="搜索任务号/消息/错误" class="toolbar-input" @input="onSearchInput" />
            <el-select v-model="query.taskCategory" clearable placeholder="任务类型" class="toolbar-select" @change="onFilterChange">
              <el-option label="资料解析" value="PARSE" />
              <el-option label="AI生成" value="GENERATE" />
              <el-option label="文档导出" value="EXPORT" />
              <el-option label="知识库问答" value="ASK" />
            </el-select>
            <el-select v-model="query.status" clearable placeholder="状态" class="toolbar-select" @change="onFilterChange">
              <el-option label="等待中" value="WAITING" />
              <el-option label="运行中" value="RUNNING" />
              <el-option label="成功" value="SUCCESS" />
              <el-option label="部分成功" value="PARTIAL" />
              <el-option label="失败" value="FAILED" />
              <el-option label="已取消" value="CANCELED" />
            </el-select>
          </div>
        </div>

        <div class="ai-task-table-wrap">
          <el-table class="ui-table ai-task-table" :data="tasks" v-loading="loading" border stripe :height="tableHeight">
            <el-table-column label="序号" width="70" align="center">
              <template #default="{ $index }">{{ (query.pageNum - 1) * query.pageSize + $index + 1 }}</template>
            </el-table-column>
            <el-table-column label="任务" min-width="180">
              <template #default="{ row }">
                <div class="task-title">{{ row.taskName || row.taskType || '-' }}</div>
                <div class="task-sub">{{ row.taskNo || row.id }}</div>
              </template>
            </el-table-column>
            <el-table-column label="类型" width="110" align="center">
              <template #default="{ row }"><el-tag size="small" effect="light">{{ categoryLabel(row.taskCategory) }}</el-tag></template>
            </el-table-column>
            <el-table-column label="状态" width="110" align="center">
              <template #default="{ row }"><el-tag :type="statusTagType(row.status)" size="small">{{ statusLabel(row.status) }}</el-tag></template>
            </el-table-column>
            <el-table-column label="进度" width="160">
              <template #default="{ row }"><el-progress :percentage="safePercent(row.progress)" :stroke-width="8" /></template>
            </el-table-column>
            <el-table-column label="节点" width="130" align="center">
              <template #default="{ row }">{{ row.finishedNodes || 0 }}/{{ row.totalNodes || 0 }}<span v-if="row.failedNodes">，失败{{ row.failedNodes }}</span></template>
            </el-table-column>
            <el-table-column prop="message" label="消息" min-width="220" show-overflow-tooltip />
            <el-table-column label="失败原因" min-width="220" show-overflow-tooltip>
              <template #default="{ row }">{{ safeErrorMessage(row.errorMessage) }}</template>
            </el-table-column>
            <el-table-column label="创建时间" width="180">
              <template #default="{ row }">{{ formatTime(row.createTime) }}</template>
            </el-table-column>
            <el-table-column label="操作" width="150" fixed="right" align="center">
              <template #default="{ row }">
                <el-button link type="primary" :loading="detailLoading && detailTaskId === row.id" @click="openTaskDetail(row)">详情</el-button>
                <el-button
                  v-if="isCancelable(row)"
                  link
                  type="danger"
                  :loading="cancelingId === row.id"
                  @click="cancelTask(row)"
                >取消</el-button>
              </template>
            </el-table-column>
          </el-table>
        </div>

        <PageFooterPager
          v-model:page="query.pageNum"
          v-model:size="query.pageSize"
          :total="total"
          @change="loadTasks"
        />
      </div>
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
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import { cancelAiTask, getAiTaskDetail, pageAiTasks } from '@/api/aiTaskCenter'
import { formatDateTime } from '@/utils/format'
import { normalizeStreamErrorMessage } from '@/utils/streamError'
import { generateFull, streamSection } from '@/api/aiSolution'
import PageFooterPager from '@/components/PageFooterPager.vue'
import { ElMessage, ElMessageBox } from 'element-plus'

const loading = ref(false)
const tasks = ref([])
const total = ref(0)
const tableHeight = ref(420)
const cancelingId = ref('')
const detailVisible = ref(false)
const detailLoading = ref(false)
const detailTaskId = ref('')
const taskDetail = ref(null)
const retryingAll = ref(false)
const retryingSectionId = ref('')
const autoRefresh = ref(true)
const hasRunningTasks = computed(() => tasks.value.some((task) => isRunningStatus(task.status)))
const query = reactive({ pageNum: 1, pageSize: 10, keyword: '', taskCategory: '', status: '' })
let searchTimer = null
let autoRefreshTimer = null

onMounted(() => {
  updateTableHeight()
  window.addEventListener('resize', updateTableHeight)
  document.addEventListener('visibilitychange', onVisibilityChange)
  loadTasks()
})

onBeforeUnmount(() => {
  clearTimeout(searchTimer)
  clearTimeout(autoRefreshTimer)
  window.removeEventListener('resize', updateTableHeight)
  document.removeEventListener('visibilitychange', onVisibilityChange)
})

function updateTableHeight() {
  nextTick(() => {
    const viewportHeight = window.innerHeight || document.documentElement.clientHeight || 900
    // 页面头部、筛选条、卡片内边距和分页器都预留出来，确保分页始终露在可视区域。
    tableHeight.value = Math.max(320, viewportHeight - 405)
  })
}

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

async function loadTasks() {
  loading.value = true
  try {
    const res = await pageAiTasks(query)
    tasks.value = res?.records || []
    total.value = Number(res?.total || 0)
    if (total.value > 0 && tasks.value.length === 0 && query.pageNum > 1) {
      query.pageNum -= 1
      await loadTasks()
    }
  } finally {
    loading.value = false
    updateTableHeight()
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
  return ['WAITING', 'PENDING', 'RUNNING', 'PARSING', 'EXTRACTING'].includes(status)
}

function isCancelable(row) {
  return !!row?.cancelable && ['PARSE', 'GENERATE'].includes(String(row.taskCategory || '').toUpperCase()) && isRunningStatus(row.status)
}


async function openTaskDetail(row) {
  if (!row?.id || !row?.taskCategory) return
  detailVisible.value = true
  detailTaskId.value = row.id
  await loadTaskDetail(row.taskCategory, row.id)
}

async function loadTaskDetail(taskCategory, taskId) {
  detailLoading.value = true
  try {
    taskDetail.value = await getAiTaskDetail(taskCategory, taskId)
  } finally {
    detailLoading.value = false
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
      '取消后后台会在当前安全检查点停止任务，已发出的模型调用不会被强制中断。确定取消该任务吗？',
      '取消AI任务',
      { type: 'warning', confirmButtonText: '确定取消', cancelButtonText: '再等等' }
    )
  } catch (e) {
    return
  }
  cancelingId.value = row.id
  try {
    await cancelAiTask(row.taskCategory, row.id)
    ElMessage.success('已提交取消请求')
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
  const map = { WAITING: '等待中', PENDING: '等待中', RUNNING: '运行中', SUCCESS: '成功', PARTIAL: '部分成功', FAILED: '失败', CANCELED: '已取消' }
  return map[String(value || '').toUpperCase()] || value || '-'
}

function statusTagType(value) {
  const status = String(value || '').toUpperCase()
  if (status === 'SUCCESS') return 'success'
  if (status === 'FAILED') return 'danger'
  if (status === 'CANCELED') return 'info'
  if (status === 'PARTIAL') return 'warning'
  if (status === 'RUNNING' || status === 'WAITING' || status === 'PENDING') return 'warning'
  return 'info'
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
  display: flex;
  height: 100%;
  min-height: 0;
  flex-direction: column;
  overflow: hidden;
}

.ai-task-header {
  flex-shrink: 0;
}

.ai-task-body {
  display: flex;
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.ai-task-card {
  display: flex;
  width: 100%;
  min-height: 0;
  flex-direction: column;
  overflow: hidden;
}

.ai-task-toolbar {
  flex-shrink: 0;
}

.ai-task-table-wrap {
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.ai-task-table {
  width: 100%;
}

.ai-task-card :deep(.page-footer-pager) {
  flex-shrink: 0;
  justify-content: flex-end;
  padding-top: 12px;
  margin-top: 12px;
  border-top: 1px solid #edf2f7;
  background: #fff;
}

.page-header { display: flex; align-items: center; justify-content: space-between; gap: 16px; margin-bottom: 16px; }
.header-actions { display: flex; align-items: center; gap: 12px; }
.page-header h2 { margin: 0; font-size: 22px; }
.page-header p { margin: 6px 0 0; color: #64748b; }
.toolbar-left { display: flex; align-items: center; gap: 12px; }
.toolbar-input { width: 280px; }
.toolbar-select { width: 150px; }
.task-title { font-weight: 700; color: #1f2937; }
.task-sub { margin-top: 4px; font-size: 12px; color: #94a3b8; }
.task-action-disabled { color: #94a3b8; cursor: help; }
.task-detail { min-height: 240px; }
.detail-section-head { display: flex; align-items: center; justify-content: space-between; gap: 16px; margin: 20px 0 12px; }
.detail-section-head h3 { margin: 0; font-size: 16px; color: #1f2937; }
.detail-section-head p { margin: 4px 0 0; color: #64748b; font-size: 13px; }
.failed-section-table { width: 100%; }
.section-task-table { width: 100%; margin-bottom: 18px; }
.detail-muted { color: #64748b; font-size: 13px; }
.section-title { font-weight: 700; color: #1f2937; }
.section-sub { margin-top: 4px; color: #94a3b8; font-size: 12px; }
</style>
