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
            <el-button class="table-icon-btn" text :icon="Refresh" @click="loadTasks" />
          </div>
        </div>

        <div class="summary-row">
          <div class="summary-card">
            <span>当前查询任务</span>
            <strong>{{ pager.total }}</strong>
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

        <el-table
          class="ui-table"
          :data="rows"
          border
          stripe
          height="calc(100vh - 326px)"
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

          <el-table-column label="耗时" width="110" align="center">
            <template #default="{ row }">
              {{ formatDuration(row.durationSeconds) }}
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

          <el-table-column label="错误信息" min-width="200" show-overflow-tooltip>
            <template #default="{ row }">
              <span v-if="row.errorMsg" class="error-text">{{ row.errorMsg }}</span>
              <span v-else>-</span>
            </template>
          </el-table-column>

          <el-table-column label="操作" width="330" fixed="right">
            <template #default="{ row }">
              <div class="table-actions">
                <el-button link type="primary" @click="openDetail(row)">详情</el-button>
                <el-button link type="primary" :disabled="!row.resultId" @click="goResult(row)">结果</el-button>
                <el-button link type="success" :disabled="!row.bizId" @click="goWorkbench(row)">重新生成</el-button>
                <el-button link type="warning" :disabled="!row.errorMsg" @click="showError(row)">错误</el-button>
                <el-button link type="primary" :disabled="!row.bizId" @click="goProject(row)">项目</el-button>
              </div>
            </template>
          </el-table-column>
        </el-table>

        <PageFooterPager
          v-model:page="pager.page"
          v-model:size="pager.size"
          :total="pager.total"
          @change="loadTasks"
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
            <el-button :disabled="!detailDrawer.task.resultId" @click="goResult(detailDrawer.task)">查看结果</el-button>
            <el-button :disabled="!detailDrawer.task.bizId" @click="goWorkbench(detailDrawer.task)">重新生成</el-button>
            <el-button :disabled="!detailDrawer.task.bizId" @click="goProject(detailDrawer.task)">跳转项目</el-button>
          </div>
        </div>

        <el-descriptions :column="3" border class="detail-desc">
          <el-descriptions-item label="任务状态">
            <el-tag :type="statusTag(detailDrawer.task.status)" effect="light">
              {{ statusLabel(detailDrawer.task.status) }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="生成类型">{{ generateTypeLabel(detailDrawer.task.bizType) }}</el-descriptions-item>
          <el-descriptions-item label="耗时">{{ formatDuration(detailDrawer.task.durationSeconds) }}</el-descriptions-item>
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
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Refresh } from '@element-plus/icons-vue'
import { getAiGenerateTask, pageAiGenerateTasks } from '@/api/ai'
import PageFooterPager from '@/components/PageFooterPager.vue'

const router = useRouter()

const loading = ref(false)
const rows = ref([])
const keyword = ref('')
const timer = ref(null)

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
  const map = { running: 0, success: 0, failed: 0 }
  rows.value.forEach((row) => {
    const status = normalizeStatus(row.status)
    if (status in map) map[status] += 1
  })
  return map
})

onMounted(() => {
  loadTasks()
})

function onKeywordInput() {
  clearTimeout(timer.value)
  timer.value = setTimeout(() => {
    reloadFirstPage()
  }, 300)
}

function reloadFirstPage() {
  pager.page = 1
  loadTasks()
}

async function loadTasks() {
  loading.value = true
  try {
    const res = await pageAiGenerateTasks({
      current: pager.page,
      size: pager.size,
      pageNum: pager.page,
      pageSize: pager.size,
      keyword: keyword.value || undefined,
      bizType: filters.bizType || undefined,
      status: filters.status || undefined
    })

    rows.value = res?.records || []
    pager.total = Number(res?.total || 0)
  } finally {
    loading.value = false
  }
}

async function openDetail(row) {
  if (!row?.id) return
  const detail = await getAiGenerateTask(row.id)
  detailDrawer.task = detail
  detailDrawer.activeTab = detail?.errorMsg ? 'error' : 'prompt'
  detailDrawer.visible = true
}

function goResult(row) {
  if (!row?.resultId) {
    ElMessage.warning('当前任务暂无生成结果')
    return
  }
  router.push({ path: '/ai/results', query: { resultId: row.resultId } })
}

function goWorkbench(row) {
  if (!row?.bizId) {
    ElMessage.warning('当前任务未关联项目，不能重新生成')
    return
  }
  router.push({ path: '/ai/workbench', query: { projectId: row.bizId } })
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
    confirmButtonText: '知道了'
  })
}

function normalizeStatus(value) {
  return String(value || '').toLowerCase()
}

function statusLabel(value) {
  const map = {
    pending: '待生成',
    running: '生成中',
    success: '成功',
    failed: '失败',
    cancelled: '已取消'
  }
  return map[normalizeStatus(value)] || value || '-'
}

function statusTag(value) {
  const map = {
    pending: 'info',
    running: 'warning',
    success: 'success',
    failed: 'danger',
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

function formatDuration(seconds) {
  if (seconds === null || seconds === undefined || seconds === '') return '-'
  const value = Number(seconds)
  if (!Number.isFinite(value)) return '-'
  if (value < 60) return `${value} 秒`
  const minute = Math.floor(value / 60)
  const second = value % 60
  if (minute < 60) return `${minute} 分 ${second} 秒`
  const hour = Math.floor(minute / 60)
  return `${hour} 小时 ${minute % 60} 分`
}

function formatJson(value) {
  if (!value) return ''
  try {
    return JSON.stringify(JSON.parse(value), null, 2)
  } catch (e) {
    return value
  }
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

.summary-row {
  display: grid;
  grid-template-columns: repeat(4, minmax(120px, 1fr));
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

.summary-card.is-running strong {
  color: #d97706;
}

.summary-card.is-success strong {
  color: #16a34a;
}

.summary-card.is-danger strong,
.error-text {
  color: #dc2626;
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

@media (max-width: 1080px) {
  .summary-row {
    grid-template-columns: repeat(2, minmax(120px, 1fr));
  }

  .task-filters {
    flex-wrap: wrap;
  }
}
</style>
