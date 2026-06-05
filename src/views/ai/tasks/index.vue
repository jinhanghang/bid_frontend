<template>
  <div class="page">
    <div class="page-header">
      <div>
        <h2>AI任务中心</h2>
        <p>统一查看解析、生成、导出等长耗时任务，便于排查失败和运行状态。</p>
      </div>
      <el-button type="primary" :loading="loading" @click="loadTasks">刷新</el-button>
    </div>

    <div class="page-body">
      <div class="card card--table">
        <div class="page-toolbar">
          <div class="toolbar-left">
            <el-input v-model="query.keyword" clearable placeholder="搜索任务号/消息/错误" class="toolbar-input" @input="onSearchInput" />
            <el-select v-model="query.taskCategory" clearable placeholder="任务类型" class="toolbar-select" @change="loadTasks">
              <el-option label="资料解析" value="PARSE" />
              <el-option label="AI生成" value="GENERATE" />
              <el-option label="文档导出" value="EXPORT" />
            </el-select>
            <el-select v-model="query.status" clearable placeholder="状态" class="toolbar-select" @change="loadTasks">
              <el-option label="等待中" value="WAITING" />
              <el-option label="运行中" value="RUNNING" />
              <el-option label="成功" value="SUCCESS" />
              <el-option label="部分成功" value="PARTIAL" />
              <el-option label="失败" value="FAILED" />
            </el-select>
          </div>
        </div>

        <el-table class="ui-table" :data="tasks" v-loading="loading" border stripe>
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
          <el-table-column prop="errorMessage" label="失败原因" min-width="220" show-overflow-tooltip />
          <el-table-column label="创建时间" width="180">
            <template #default="{ row }">{{ formatTime(row.createTime) }}</template>
          </el-table-column>
        </el-table>

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
import { onMounted, reactive, ref } from 'vue'
import { pageAiTasks } from '@/api/aiTaskCenter'
import { formatDateTime } from '@/utils/format'
import PageFooterPager from '@/components/PageFooterPager.vue'

const loading = ref(false)
const tasks = ref([])
const total = ref(0)
const query = reactive({ pageNum: 1, pageSize: 20, keyword: '', taskCategory: '', status: '' })
let searchTimer = null

onMounted(loadTasks)

function onSearchInput() {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    query.pageNum = 1
    loadTasks()
  }, 260)
}

async function loadTasks() {
  loading.value = true
  try {
    const res = await pageAiTasks(query)
    tasks.value = res?.records || []
    total.value = res?.total || 0
  } finally {
    loading.value = false
  }
}

function formatTime(value) {
  return value ? formatDateTime(value) : '-'
}

function categoryLabel(value) {
  const map = { PARSE: '解析', GENERATE: '生成', EXPORT: '导出' }
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
  if (status === 'PARTIAL') return 'warning'
  if (status === 'RUNNING' || status === 'WAITING' || status === 'PENDING') return 'warning'
  return 'info'
}

function safePercent(value) {
  const n = Number(value || 0)
  return Math.max(0, Math.min(100, Number.isFinite(n) ? n : 0))
}
</script>

<style scoped>
.page-header { display: flex; align-items: center; justify-content: space-between; gap: 16px; margin-bottom: 16px; }
.page-header h2 { margin: 0; font-size: 22px; }
.page-header p { margin: 6px 0 0; color: #64748b; }
.toolbar-left { display: flex; align-items: center; gap: 12px; }
.toolbar-input { width: 280px; }
.toolbar-select { width: 150px; }
.task-title { font-weight: 700; color: #1f2937; }
.task-sub { margin-top: 4px; font-size: 12px; color: #94a3b8; }
</style>
