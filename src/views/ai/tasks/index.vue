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
            <el-table-column label="操作" width="110" fixed="right" align="center">
              <template #default="{ row }">
                <el-button
                  v-if="isCancelable(row)"
                  link
                  type="danger"
                  :loading="cancelingId === row.id"
                  @click="cancelTask(row)"
                >取消</el-button>
                <el-tooltip v-else :content="row.cancelTip || '当前任务不支持取消'" placement="top">
                  <span class="task-action-disabled">-</span>
                </el-tooltip>
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
  </div>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import { cancelAiTask, pageAiTasks } from '@/api/aiTaskCenter'
import { formatDateTime } from '@/utils/format'
import { normalizeStreamErrorMessage } from '@/utils/streamError'
import PageFooterPager from '@/components/PageFooterPager.vue'
import { ElMessage, ElMessageBox } from 'element-plus'

const loading = ref(false)
const tasks = ref([])
const total = ref(0)
const tableHeight = ref(420)
const cancelingId = ref('')
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
</style>
