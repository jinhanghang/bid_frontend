<template>
  <div class="page">
    <div class="page-body result-page">
      <!-- 左侧：生成结果列表 -->
      <div class="card card--table result-left">
        <div class="list-head">
          <div class="list-head__left">
            <el-input
              v-model="filters.keyword"
              class="filter-input"
              placeholder="按项目名称 / 项目编号 / 结果标题自动查询"
              clearable
              @input="onKeywordInput"
            />
          </div>

          <div class="list-head__right result-filters">
            <el-select v-model="filters.bizType" clearable placeholder="生成类型" style="width: 140px" @change="reloadFirstPage">
              <el-option label="技术标" value="bid_tech" />
              <el-option label="商务标" value="bid_business" />
              <el-option label="完整标书" value="bid_full" />
              <el-option label="通用标书" value="bid" />
            </el-select>

            <el-select v-model="filters.exportState" clearable placeholder="导出状态" style="width: 140px" @change="reloadFirstPage">
              <el-option label="已导出" value="exported" />
              <el-option label="未导出" value="not_exported" />
              <el-option label="文件丢失" value="file_lost" />
            </el-select>

            <el-button class="table-icon-btn" text :icon="Refresh" @click="loadResults" />
          </div>
        </div>

        <div class="summary-row">
          <div class="summary-card">
            <span>生成结果</span>
            <strong>{{ pager.total }}</strong>
          </div>
          <div class="summary-card">
            <span>当前页已导出</span>
            <strong>{{ currentPageExportedCount }}</strong>
          </div>
          <div class="summary-card is-warning">
            <span>当前页未导出</span>
            <strong>{{ currentPageNotExportedCount }}</strong>
          </div>
        </div>

        <el-table
          class="ui-table"
          :data="rows"
          border
          stripe
          highlight-current-row
          height="calc(100vh - 312px)"
          v-loading="loading"
          empty-text="暂无生成结果"
          @current-change="selectResult"
          @row-dblclick="selectResult"
        >
          <el-table-column label="所属项目" min-width="210" show-overflow-tooltip>
            <template #default="{ row }">
              <div class="project-cell">
                <div class="project-name">{{ row.projectName || '-' }}</div>
                <div class="project-code">{{ row.projectCode || `项目ID：${row.bizId || '-'}` }}</div>
              </div>
            </template>
          </el-table-column>

          <el-table-column label="生成类型" width="110">
            <template #default="{ row }">
              <el-tag :type="generateTypeTag(row.bizType)" effect="light">
                {{ generateTypeLabel(row.bizType) }}
              </el-tag>
            </template>
          </el-table-column>

          <el-table-column prop="title" label="结果标题" min-width="230" show-overflow-tooltip />

          <el-table-column label="导出状态" width="140">
            <template #default="{ row }">
              <el-tag :type="exportStateTag(row)" effect="light">
                {{ exportStateLabel(row) }}
              </el-tag>
            </template>
          </el-table-column>

          <el-table-column prop="createTime" label="生成时间" width="170" />

          <el-table-column label="操作" width="250" fixed="right">
            <template #default="{ row }">
              <div class="table-actions">
                <el-button link type="primary" @click.stop="selectResult(row)">查看</el-button>
                <el-button link type="success" :loading="exportingWord && exportingResultId === row.id" @click.stop="exportResultWord(row)">导出Word</el-button>
                <el-button link type="primary" @click.stop="goProject(row)">项目</el-button>
                <el-button link type="warning" @click.stop="goRegenerate(row)">重新生成</el-button>
              </div>
            </template>
          </el-table-column>
        </el-table>

        <PageFooterPager
          v-model:page="pager.page"
          v-model:size="pager.size"
          :total="pager.total"
          @change="loadResults"
        />
      </div>

      <!-- 右侧：生成结果详情 -->
      <div class="card result-right">
        <template v-if="current">
          <div class="detail-head">
            <div class="detail-title-wrap">
              <div class="detail-title">{{ current.title || `生成结果 #${current.id}` }}</div>
              <div class="detail-meta">
                <el-tag :type="generateTypeTag(current.bizType)" effect="light">
                  {{ generateTypeLabel(current.bizType) }}
                </el-tag>
                <span>{{ current.projectName || '-' }}</span>
                <span>{{ current.projectCode || '' }}</span>
                <span>{{ current.createTime || '-' }}</span>
              </div>
            </div>

            <div class="detail-actions">
              <el-button :icon="CopyDocument" :disabled="!current.contentMarkdown" @click="copyMarkdown">复制Markdown</el-button>
              <el-button :icon="Download" :loading="exportingWord" @click="handleExportWord">导出Word</el-button>
              <el-button :icon="Download" :loading="exportingMarkdown" @click="handleExportMarkdown">导出Markdown</el-button>
              <el-button :icon="Back" @click="goProject(current)">返回项目</el-button>
              <el-button type="warning" plain @click="goRegenerate(current)">重新生成</el-button>
            </div>
          </div>

          <div class="export-card">
            <div class="export-card__left">
              <span class="export-label">导出状态</span>
              <el-tag :type="exportStateTag(current)" effect="light">
                {{ exportStateLabel(current) }}
              </el-tag>
              <span class="export-time">导出次数：{{ current.exportCount || 0 }}</span>
              <span v-if="current.latestExportTime" class="export-time">
                最近导出：{{ current.latestExportTime }}
              </span>
            </div>

            <div class="export-card__right">
              <span v-if="current.latestExportFileName" class="export-file">
                {{ current.latestExportFileName }}
              </span>
              <el-button
                v-if="canDownloadLatest(current)"
                link
                type="primary"
                @click="downloadLatestExport"
              >
                下载最新文件
              </el-button>
              <span v-else-if="Number(current.exportCount || 0) > 0" class="lost-tip">
                文件已丢失，请重新导出
              </span>
            </div>
          </div>

          <el-alert
            v-if="exportSuccessTip"
            class="export-success-alert"
            type="success"
            show-icon
            :closable="true"
            @close="exportSuccessTip = ''"
            :title="exportSuccessTip"
          />

          <el-tabs v-model="activeContentTab" class="content-tabs">
            <el-tab-pane label="预览" name="preview">
              <div
                v-if="current.contentHtml"
                class="markdown-box result-content"
                v-html="current.contentHtml"
              ></div>
              <div v-else class="markdown-box result-content">
                {{ current.contentMarkdown || '暂无内容' }}
              </div>
            </el-tab-pane>

            <el-tab-pane label="Markdown源码" name="markdown">
              <el-input
                :model-value="current.contentMarkdown || ''"
                type="textarea"
                readonly
                resize="none"
                class="markdown-source"
              />
            </el-tab-pane>
          </el-tabs>
        </template>

        <el-empty v-else description="请选择左侧生成结果" />
      </div>
    </div>

    <WordExportTemplateDialog
      v-model="wordExportDialog.visible"
      :result="wordExportDialog.result"
      @success="onWordExportSuccess"
    />
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Back, CopyDocument, Download, Refresh } from '@element-plus/icons-vue'
import {
  downloadExportFile,
  exportMarkdown,
  getAiGenerateResult,
  pageAiGenerateResults
} from '@/api/ai'
import PageFooterPager from '@/components/PageFooterPager.vue'
import WordExportTemplateDialog from '@/components/WordExportTemplateDialog.vue'

const route = useRoute()
const router = useRouter()

const loading = ref(false)
const exportingWord = ref(false)
const exportingMarkdown = ref(false)
const exportingResultId = ref(null)
const exportSuccessTip = ref('')
const rows = ref([])
const current = ref(null)
const activeContentTab = ref('preview')
const timer = ref(null)

const filters = reactive({
  keyword: '',
  bizType: '',
  exportState: ''
})

const wordExportDialog = reactive({
  visible: false,
  result: null
})

const pager = reactive({
  page: 1,
  size: 10,
  total: 0
})

const currentPageExportedCount = computed(() => {
  return rows.value.filter((row) => Number(row.exportCount || 0) > 0).length
})

const currentPageNotExportedCount = computed(() => {
  return rows.value.filter((row) => Number(row.exportCount || 0) === 0).length
})

onMounted(async () => {
  if (route.query.projectId || route.query.bizId) {
    filters.bizType = route.query.bizType ? String(route.query.bizType) : ''
  }

  await loadResults(route.query.resultId ? Number(route.query.resultId) : undefined)
})

function onKeywordInput() {
  clearTimeout(timer.value)
  timer.value = setTimeout(() => {
    reloadFirstPage()
  }, 300)
}

function reloadFirstPage() {
  pager.page = 1
  loadResults()
}

async function loadResults(selectId) {
  loading.value = true
  try {
    const res = await pageAiGenerateResults({
      current: pager.page,
      size: pager.size,
      pageNum: pager.page,
      pageSize: pager.size,
      keyword: filters.keyword || undefined,
      bizType: filters.bizType || undefined,
      bizId: route.query.projectId || route.query.bizId || undefined,
      exportState: filters.exportState || undefined
    })

    rows.value = res?.records || []
    pager.total = Number(res?.total || 0)

    if (selectId) {
      const target = rows.value.find((item) => String(item.id) === String(selectId))
      if (target) {
        await selectResult(target)
      } else {
        try {
          const detail = await getAiGenerateResult(selectId)
          current.value = detail
          activeContentTab.value = 'preview'
        } catch (e) {
          current.value = rows.value[0] || null
        }
      }
    } else if (!current.value && rows.value.length) {
      await selectResult(rows.value[0])
    } else if (current.value) {
      const exists = rows.value.some((item) => String(item.id) === String(current.value.id))
      if (!exists && rows.value.length) {
        await selectResult(rows.value[0])
      }
    }
  } finally {
    loading.value = false
  }
}

async function selectResult(row) {
  if (!row?.id) return

  current.value = await getAiGenerateResult(row.id)
  activeContentTab.value = 'preview'
}

async function copyMarkdown() {
  if (!current.value?.contentMarkdown) {
    ElMessage.warning('暂无可复制内容')
    return
  }

  await navigator.clipboard.writeText(current.value.contentMarkdown)
  ElMessage.success('已复制Markdown内容')
}

function handleExportWord() {
  if (!current.value?.id) return
  exportSuccessTip.value = ''
  openWordExportDialog(current.value)
}

function openWordExportDialog(row) {
  exportingResultId.value = row?.id || null
  wordExportDialog.result = row
  wordExportDialog.visible = true
}

async function onWordExportSuccess(file) {
  exportingWord.value = true
  try {
    await downloadExportedFile(file)
    exportSuccessTip.value = `已生成 Word 文件：${file?.originalName || file?.fileName || '导出文件'}`
    ElMessage.success('Word 已生成并开始下载')
    await refreshCurrent()
    await loadResults(wordExportDialog.result?.id)
  } finally {
    exportingWord.value = false
    exportingResultId.value = null
  }
}

async function handleExportMarkdown() {
  if (!current.value?.id) return

  exportingMarkdown.value = true
  try {
    const file = await exportMarkdown(current.value.id)
    await downloadExportedFile(file)
    ElMessage.success('Markdown已开始下载')
    await refreshCurrent()
  } finally {
    exportingMarkdown.value = false
  }
}

function exportResultWord(row) {
  if (!row?.id) return
  exportSuccessTip.value = ''
  openWordExportDialog(row)
}

async function downloadLatestExport() {
  if (!canDownloadLatest(current.value)) {
    ElMessage.warning('文件已丢失，请重新导出')
    return
  }

  const blob = await downloadExportFile(current.value.latestExportFileId)
  downloadBlob(blob, current.value.latestExportFileName || '导出文件')
  ElMessage.success('最新导出文件已开始下载')
}

async function downloadExportedFile(file) {
  if (!file?.id) {
    ElMessage.error('导出成功但没有返回文件ID，无法下载')
    return
  }

  const blob = await downloadExportFile(file.id)
  downloadBlob(blob, file.originalName || file.fileName || '导出文件')
}

function downloadBlob(blob, fileName) {
  const url = window.URL.createObjectURL(blob)
  const link = document.createElement('a')

  link.href = url
  link.download = sanitizeFileName(fileName)
  link.style.display = 'none'

  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)

  window.URL.revokeObjectURL(url)
}

function sanitizeFileName(fileName) {
  return String(fileName || '导出文件')
    .replace(/[\\/:*?"<>|]/g, '_')
    .trim() || '导出文件'
}

async function refreshCurrent() {
  const currentId = current.value?.id
  await loadResults(currentId)
  if (currentId) {
    current.value = await getAiGenerateResult(currentId)
  }
}

function canDownloadLatest(row) {
  return Boolean(row?.latestExportFileId) && Number(row?.latestExportFileExists) === 1
}

function goProject(row) {
  if (!row?.bizId) {
    ElMessage.warning('当前结果未关联项目')
    return
  }

  router.push({
    path: '/bid/projects',
    query: {
      projectId: row.bizId,
      tab: 'generateRecords'
    }
  })
}

function goRegenerate(row) {
  if (!row?.bizId) {
    ElMessage.warning('当前结果未关联项目')
    return
  }

  router.push({
    path: '/ai/workbench',
    query: {
      projectId: row.bizId
    }
  })
}

function generateTypeLabel(value) {
  const map = {
    bid_tech: '技术标',
    bid_business: '商务标',
    bid_full: '完整标书',
    bid: '通用标书'
  }
  return map[String(value || '').toLowerCase()] || value || '-'
}

function generateTypeTag(value) {
  const map = {
    bid_tech: 'primary',
    bid_business: 'success',
    bid_full: 'warning',
    bid: 'info'
  }
  return map[String(value || '').toLowerCase()] || 'info'
}

function exportStateLabel(row) {
  if (Number(row?.exportCount || 0) === 0) return '未导出'
  if (Number(row?.latestExportFileExists) === 1) return '已导出'
  return '文件已丢失'
}

function exportStateTag(row) {
  if (Number(row?.exportCount || 0) === 0) return 'info'
  if (Number(row?.latestExportFileExists) === 1) return 'success'
  return 'danger'
}
</script>

<style scoped>
.result-page {
  display: grid;
  grid-template-columns: minmax(600px, 0.92fr) minmax(0, 1.08fr);
  gap: 16px;
}

.result-left,
.result-right {
  min-width: 0;
}

.result-right {
  padding: 18px;
}

.result-filters {
  display: flex;
  align-items: center;
  gap: 8px;
}

.summary-row {
  display: grid;
  grid-template-columns: repeat(3, minmax(120px, 1fr));
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

.summary-card.is-warning strong {
  color: #d97706;
}

.project-cell {
  min-width: 0;
}

.project-name {
  font-weight: 700;
  color: var(--text-main);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.project-code {
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
  gap: 14px;
  margin-bottom: 12px;
}

.detail-title-wrap {
  min-width: 0;
}

.detail-title {
  font-size: 19px;
  font-weight: 800;
  color: var(--text-main);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.detail-meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  margin-top: 8px;
  color: var(--text-sub);
  font-size: 13px;
}

.detail-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 8px;
}

.export-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px;
  border: 1px solid var(--border);
  border-radius: 12px;
  background: #f8fafc;
  margin-bottom: 12px;
}

.export-card__left,
.export-card__right {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.export-label {
  color: var(--text-sub);
  font-size: 13px;
}

.export-time,
.export-file {
  color: var(--text-sub);
  font-size: 13px;
}

.export-file {
  max-width: 260px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.lost-tip {
  color: #dc2626;
  font-size: 13px;
}

.export-success-alert {
  margin-bottom: 12px;
}

.content-tabs {
  min-width: 0;
}

.result-content {
  height: calc(100vh - 315px);
  overflow: auto;
}

.markdown-source :deep(.el-textarea__inner) {
  height: calc(100vh - 315px);
  font-family: Consolas, Monaco, monospace;
  line-height: 1.6;
}

@media (max-width: 1280px) {
  .result-page {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 920px) {
  .summary-row {
    grid-template-columns: 1fr;
  }

  .detail-head,
  .export-card {
    flex-direction: column;
    align-items: stretch;
  }

  .detail-actions {
    justify-content: flex-start;
  }

  .result-filters {
    flex-wrap: wrap;
  }
}
</style>
