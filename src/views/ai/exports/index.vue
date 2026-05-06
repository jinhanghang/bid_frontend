<template>
  <div class="page">
    <div class="page-body">
      <div class="card card--table export-card">
        <div class="list-head">
          <div class="list-head__left">
            <el-input
              v-model="filters.keyword"
              class="filter-input"
              placeholder="按项目名称 / 项目编号 / 结果标题 / 文件名自动查询"
              clearable
              @input="onKeywordInput"
            />
          </div>
          <div class="list-head__right export-filters">
            <el-select v-model="filters.exportType" clearable placeholder="导出类型" style="width: 130px" @change="reloadFirstPage">
              <el-option label="Word" value="word" />
              <el-option label="Markdown" value="markdown" />
              <el-option label="PDF" value="pdf" />
            </el-select>

            <el-select v-model="filters.fileState" clearable placeholder="文件状态" style="width: 140px" @change="reloadFirstPage">
              <el-option label="可下载" value="available" />
              <el-option label="文件丢失" value="lost" />
            </el-select>

            <el-button class="table-icon-btn" text :icon="Refresh" @click="loadExports" />
          </div>
        </div>

        <div class="summary-row">
          <div class="summary-card">
            <span>导出记录</span>
            <strong>{{ pager.total }}</strong>
          </div>
          <div class="summary-card">
            <span>可下载</span>
            <strong>{{ currentPageAvailableCount }}</strong>
          </div>
          <div class="summary-card is-warning">
            <span>当前页丢失</span>
            <strong>{{ currentPageLostCount }}</strong>
          </div>
        </div>

        <el-table
          class="ui-table"
          :data="rows"
          border
          stripe
          height="calc(100vh - 312px)"
          v-loading="loading"
          empty-text="暂无导出记录"
        >
          <el-table-column label="所属项目" min-width="230" show-overflow-tooltip>
            <template #default="{ row }">
              <div class="project-cell">
                <div class="project-name">{{ row.projectName || '-' }}</div>
                <div class="project-code">{{ row.projectCode || `项目ID：${row.bizId || '-'}` }}</div>
              </div>
            </template>
          </el-table-column>

          <el-table-column label="生成结果" min-width="240" show-overflow-tooltip>
            <template #default="{ row }">
              <div class="result-title">{{ row.resultTitle || '旧导出记录，未关联生成结果' }}</div>
              <div class="result-sub">结果ID：{{ row.resultId || '-' }}</div>
            </template>
          </el-table-column>

          <el-table-column label="导出类型" width="110" align="center">
            <template #default="{ row }">
              <el-tag :type="exportTypeTag(row.exportType)" effect="light">
                {{ exportTypeLabel(row.exportType) }}
              </el-tag>
            </template>
          </el-table-column>

          <el-table-column label="套用模板" min-width="180" show-overflow-tooltip>
            <template #default="{ row }">
              <span v-if="row.templateName">{{ row.templateName }}</span>
              <span v-else class="empty-text">普通导出</span>
            </template>
          </el-table-column>

          <el-table-column label="文件状态" width="150">
            <template #default="{ row }">
              <el-tag :type="fileStateTag(row)" effect="light">
                {{ fileStateLabel(row) }}
              </el-tag>
              <el-tooltip v-if="row.errorMsg" :content="row.errorMsg" placement="top">
                <el-tag type="danger" effect="light" size="small" style="margin-left: 6px">说明</el-tag>
              </el-tooltip>
            </template>
          </el-table-column>

          <el-table-column label="文件名" min-width="220" show-overflow-tooltip>
            <template #default="{ row }">
              {{ row.originalName || row.fileName || '-' }}
            </template>
          </el-table-column>

          <el-table-column prop="createTime" label="导出时间" width="170" />

          <el-table-column label="操作" width="340" fixed="right">
            <template #default="{ row }">
              <div class="table-actions">
                <el-button link type="primary" :disabled="!canDownload(row)" @click="downloadRow(row)">下载</el-button>
                <el-button link type="primary" :disabled="!row.resultId" @click="goResult(row)">查看结果</el-button>
                <el-button link type="success" :disabled="!row.resultId" @click="reExportRow(row)">重新导出</el-button>
                <el-button link type="danger" @click="deleteRow(row)">删除记录</el-button>
              </div>
            </template>
          </el-table-column>
        </el-table>

        <PageFooterPager
          v-model:page="pager.page"
          v-model:size="pager.size"
          :total="pager.total"
          @change="loadExports"
        />
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
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Refresh } from '@element-plus/icons-vue'
import {
  deleteDocumentExport,
  downloadExportFile,
  exportMarkdown,
  pageDocumentExports
} from '@/api/ai'
import PageFooterPager from '@/components/PageFooterPager.vue'
import WordExportTemplateDialog from '@/components/WordExportTemplateDialog.vue'

const router = useRouter()

const loading = ref(false)
const rows = ref([])
const timer = ref(null)

const filters = reactive({
  keyword: '',
  exportType: '',
  fileState: ''
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

const currentPageAvailableCount = computed(() => {
  return rows.value.filter((row) => canDownload(row)).length
})

const currentPageLostCount = computed(() => {
  return rows.value.filter((row) => !canDownload(row)).length
})

onMounted(() => {
  loadExports()
})

function onKeywordInput() {
  clearTimeout(timer.value)
  timer.value = setTimeout(() => {
    reloadFirstPage()
  }, 300)
}

function reloadFirstPage() {
  pager.page = 1
  loadExports()
}

async function loadExports() {
  loading.value = true
  try {
    const res = await pageDocumentExports({
      current: pager.page,
      size: pager.size,
      pageNum: pager.page,
      pageSize: pager.size,
      keyword: filters.keyword || undefined,
      exportType: filters.exportType || undefined,
      fileState: filters.fileState || undefined
    })

    rows.value = res?.records || []
    pager.total = Number(res?.total || 0)
  } finally {
    loading.value = false
  }
}

function canDownload(row) {
  return Number(row.fileExists) === 1 && Boolean(row.fileId)
}

async function downloadRow(row) {
  if (!canDownload(row)) {
    ElMessage.warning('文件已丢失，请重新导出')
    return
  }

  const blob = await downloadExportFile(row.fileId)
  downloadBlob(blob, row.originalName || row.fileName || '导出文件')
}

async function reExportRow(row) {
  if (!row.resultId) {
    ElMessage.warning('旧导出记录未关联生成结果，请到生成结果页面重新导出')
    return
  }

  const type = String(row.exportType || '').toLowerCase()
  let file

  if (type === 'markdown') {
    file = await exportMarkdown(row.resultId)
    ElMessage.success('已重新导出，开始下载')
    await downloadExportedFile(file)
    await loadExports()
  } else if (type === 'word') {
    wordExportDialog.result = {
      id: row.resultId,
      resultId: row.resultId,
      title: row.resultTitle,
      projectName: row.projectName,
      projectCode: row.projectCode,
      bizType: row.bizType,
      bizId: row.bizId
    }
    wordExportDialog.visible = true
  } else {
    ElMessage.warning('当前导出类型暂不支持重新导出')
  }
}

async function onWordExportSuccess(file) {
  await downloadExportedFile(file)
  await loadExports()
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

function goResult(row) {
  if (!row.resultId) {
    ElMessage.warning('旧导出记录未关联生成结果')
    return
  }

  router.push({
    path: '/ai/results',
    query: { resultId: row.resultId }
  })
}

async function deleteRow(row) {
  await ElMessageBox.confirm(
    `确认删除这条导出记录吗？这只删除导出记录，不会删除文件资源和OSS文件。`,
    '删除导出记录',
    {
      type: 'warning'
    }
  )

  await deleteDocumentExport(row.id)
  ElMessage.success('导出记录已删除')
  await loadExports()
}

function exportTypeLabel(value) {
  const map = {
    word: 'Word',
    markdown: 'Markdown',
    pdf: 'PDF'
  }
  return map[String(value || '').toLowerCase()] || value || '-'
}

function exportTypeTag(value) {
  const map = {
    word: 'primary',
    markdown: 'success',
    pdf: 'warning'
  }
  return map[String(value || '').toLowerCase()] || 'info'
}

function fileStateLabel(row) {
  if (canDownload(row)) return '可下载'
  if (row.status === 'file_deleted') return '文件已丢失'
  if (row.status === 'failed') return '导出失败'
  if (row.status === 'pending') return '处理中'
  return '文件已丢失'
}

function fileStateTag(row) {
  if (canDownload(row)) return 'success'
  if (row.status === 'pending') return 'warning'
  return 'danger'
}
</script>

<style scoped>
.export-card {
  min-width: 0;
}

.export-filters {
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
  color: #dc2626;
}

.project-cell,
.result-title {
  min-width: 0;
}

.project-name,
.result-title {
  font-weight: 700;
  color: var(--text-main);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.project-code,
.result-sub,
.empty-text {
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

@media (max-width: 960px) {
  .summary-row {
    grid-template-columns: 1fr;
  }

  .export-filters {
    flex-wrap: wrap;
  }
}
</style>
