<template>
  <div class="download-page">
    <div class="content-card">
      <div class="page-title-row">
        <span class="title-mark"></span>
        <span>下载中心</span>
        <span class="title-tip">AI标书 / AI文档导出的 Word / PDF 成果文件统一在这里下载。</span>
      </div>

      <div class="toolbar-row">
        <el-input
          v-model="filters.keyword"
          class="search-input"
          placeholder="输入文件名自动查询"
          clearable
          :prefix-icon="Search"
          @input="onKeywordInput"
          @clear="reloadFirstPage"
          @keyup.enter="reloadFirstPage"
        />
        <el-select
          v-model="filters.sourceType"
          class="source-select"
          placeholder="来源"
          clearable
          @change="reloadFirstPage"
          @clear="reloadFirstPage"
        >
          <el-option label="历史生成成果" value="ai_solution" />
          <el-option label="AI标书" value="bid_tech" />
          <el-option label="AI文档" value="ai_document" />
        </el-select>
        <el-select
          v-model="filters.fileState"
          class="state-select"
          placeholder="状态"
          clearable
          @change="reloadFirstPage"
          @clear="reloadFirstPage"
        >
          <el-option label="可下载" value="success" />
          <el-option label="文件丢失" value="lost" />
        </el-select>
        <el-button class="refresh-btn" :icon="Refresh" :loading="loading" @click="loadRows">刷新</el-button>
      </div>

      <el-table
        class="ui-table download-table"
        :data="rows"
        v-loading="loading"
        border
        stripe
        height="calc(100vh - 300px)"
        empty-text="暂无下载文件"
      >
        <el-table-column label="文件名" min-width="420" show-overflow-tooltip>
          <template #default="{ row }">
            <div class="file-name-cell">
              <el-icon><Document /></el-icon>
              <div class="file-name-main">
                <span>{{ row.fileName || '-' }}</span>
                <small v-if="!isFileAvailable(row)">文件已丢失，请重新导出</small>
              </div>
            </div>
          </template>
        </el-table-column>

        <el-table-column label="来源" width="120" align="center">
          <template #default="{ row }">
            <el-tag effect="light">{{ row.sourceLabel || sourceTypeLabel(row) }}</el-tag>
          </template>
        </el-table-column>

        <el-table-column label="文件类型" width="120" align="center">
          <template #default="{ row }">
            <el-tag type="primary" effect="light">{{ fileTypeLabel(row) }}</el-tag>
          </template>
        </el-table-column>

        <el-table-column label="文件大小" width="150">
          <template #default="{ row }">{{ fileSize(row.fileSize) }}</template>
        </el-table-column>

        <el-table-column label="创建时间" width="190">
          <template #default="{ row }">{{ formatDateTime(row.createTime) }}</template>
        </el-table-column>

        <el-table-column label="文件状态" width="160">
          <template #default="{ row }">
            <el-tag :type="isFileAvailable(row) ? 'success' : 'danger'" effect="light">
              {{ isFileAvailable(row) ? '可下载' : '文件丢失' }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column label="操作" width="180" align="center" fixed="right">
          <template #default="{ row }">
            <el-button link type="danger" @click="deleteRow(row)">删除</el-button>
            <el-tooltip
              :disabled="isFileAvailable(row)"
              content="文件已丢失，请重新导出"
              placement="top"
            >
              <span>
                <el-button
                  link
                  type="primary"
                  :loading="downloadingId === row.id"
                  :disabled="!isFileAvailable(row)"
                  @click="downloadRow(row)"
                >下载</el-button>
              </span>
            </el-tooltip>
          </template>
        </el-table-column>
      </el-table>

      <PageFooterPager
        v-model:page="pager.page"
        v-model:size="pager.size"
        :total="pager.total"
        @change="loadRows"
      />
    </div>
  </div>
</template>

<script setup>
import { onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from '@/plugins/element-plus-api'
import { Document, Refresh, Search } from '@element-plus/icons-vue'
import PageFooterPager from '@/components/PageFooterPager.vue'
import { deleteDownloadFile, downloadCenterFile, pageDownloadFiles } from '@/api/downloadCenter'
import { fileSize, formatDateTime } from '@/utils/format'

const loading = ref(false)
const rows = ref([])
const downloadingId = ref(null)
const filters = reactive({ keyword: '', sourceType: '', fileState: '' })
const pager = reactive({ page: 1, size: 10, total: 0 })
let keywordTimer = null

onMounted(() => {
  loadRows()
})

onBeforeUnmount(() => {
  clearTimeout(keywordTimer)
})

function onKeywordInput() {
  clearTimeout(keywordTimer)
  keywordTimer = setTimeout(reloadFirstPage, 300)
}

function reloadFirstPage() {
  clearTimeout(keywordTimer)
  pager.page = 1
  loadRows()
}

async function loadRows() {
  loading.value = true
  try {
    const res = await pageDownloadFiles({
      pageNum: pager.page,
      pageSize: pager.size,
      keyword: String(filters.keyword || '').trim() || undefined,
      sourceType: filters.sourceType || undefined,
      fileState: filters.fileState || undefined
    })
    rows.value = res?.records || []
    pager.total = Number(res?.total || 0)
  } finally {
    loading.value = false
  }
}

function isFileAvailable(row) {
  return Number(row?.fileExists) === 1 && String(row?.fileState || '').toLowerCase() !== 'lost'
}

function sourceTypeLabel(row) {
  const source = String(row?.sourceType || '').toLowerCase()
  if (source === 'ai_solution') return '历史生成成果'
  if (source === 'bid_tech' || source === 'bid') return 'AI标书'
  if (source === 'ai_document') return 'AI文档'
  return '其他'
}

function fileTypeLabel(row) {
  const type = String(row?.fileType || '').toLowerCase()
  if (type === 'word' || type === 'doc' || type === 'docx') return 'Word'
  if (type === 'pdf') return 'PDF'

  const name = String(row?.fileName || '').toLowerCase()
  if (name.endsWith('.doc') || name.endsWith('.docx')) return 'Word'
  if (name.endsWith('.pdf')) return 'PDF'
  if (name.endsWith('.xlsx') || name.endsWith('.xls')) return 'Excel'
  return '文件'
}

async function downloadRow(row) {
  if (!isFileAvailable(row)) {
    ElMessage.warning('文件已丢失，请重新导出')
    return
  }

  downloadingId.value = row.id
  try {
    const blob = await downloadCenterFile(row.id)
    downloadBlob(blob, row.fileName || defaultDownloadFileName(row))
  } finally {
    downloadingId.value = null
  }
}

async function deleteRow(row) {
  await ElMessageBox.confirm(
    `确定删除文件“${row.fileName || ''}”吗？删除后会同步删除文件资源和 OSS 文件，不进入回收站。`,
    '确认删除',
    { type: 'warning' }
  )
  await deleteDownloadFile(row.id)
  ElMessage.success('删除成功')

  if (rows.value.length <= 1 && pager.page > 1) {
    pager.page -= 1
  }
  await loadRows()
}

function defaultDownloadFileName(row) {
  return fileTypeLabel(row) === 'PDF' ? '导出文件.pdf' : '导出文件.docx'
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

function sanitizeFileName(name) {
  return String(name || '导出文件').replace(/[\\/:*?"<>|]/g, '_')
}
</script>

<style scoped>
.download-page {
  height: 100%;
  padding: 0;
  box-sizing: border-box;
}

.content-card {
  height: 100%;
  padding: 22px 24px 16px;
  background: #fff;
  border-radius: 12px;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.page-title-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding-bottom: 18px;
  border-bottom: 1px solid #edf0f5;
  color: #111827;
  font-size: 18px;
  font-weight: 800;
}

.title-mark {
  width: 4px;
  height: 16px;
  border-radius: 4px;
  background: #2f6bff;
}

.title-tip {
  color: #9aa4b2;
  font-size: 13px;
  font-weight: 400;
}

.toolbar-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin: 18px 0 14px;
}

.search-input {
  width: 360px;
  max-width: 100%;
}

.download-table {
  flex: 1;
  min-height: 0;
}

.file-name-cell {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #4b5563;
  min-width: 0;
}

.file-name-cell .el-icon {
  color: #2f80ed;
  flex-shrink: 0;
}

.file-name-main {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.file-name-main span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.file-name-main small {
  margin-top: 3px;
  color: #ef4444;
  font-size: 12px;
}

.refresh-btn {
  flex-shrink: 0;
}

:deep(.page-footer-pager) {
  padding-top: 12px;
  border-top: 1px solid #edf0f5;
}
</style>

