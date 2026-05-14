<template>
  <div class="download-page">
    <div class="content-card">
      <div class="page-title-row">
        <span class="title-mark"></span>
        <span>下载中心</span>
      </div>
      <div class="toolbar-row">
        <el-input
          v-model="filters.keyword"
          class="search-input"
          placeholder="请输入文件名"
          clearable
          :prefix-icon="Search"
          @keyup.enter="reloadFirstPage"
        />
        <el-button type="primary" @click="reloadFirstPage">搜索</el-button>
        <el-button @click="resetSearch">清空</el-button>
      </div>

      <el-table
        class="simple-table"
        :data="rows"
        v-loading="loading"
        height="calc(100vh - 328px)"
        empty-text="暂无下载文件"
      >
        <el-table-column label="文件名" min-width="420" show-overflow-tooltip>
          <template #default="{ row }">
            <div class="file-name-cell">
              <el-icon><Document /></el-icon>
              <span>{{ row.fileName || '-' }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="文件大小" width="180">
          <template #default="{ row }">{{ fileSize(row.fileSize) }}</template>
        </el-table-column>
        <el-table-column label="创建时间" width="220">
          <template #default="{ row }">{{ formatDateTime(row.createTime) }}</template>
        </el-table-column>
        <el-table-column label="文件状态" width="180">
          <template #default="{ row }">
            <span class="state-dot" :class="row.fileState"></span>
            <span>{{ row.fileStateLabel || '-' }}</span>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="180" align="center">
          <template #header>
            <span>操作</span>
            <el-button class="refresh-btn" text :icon="Refresh" @click="loadRows" />
          </template>
          <template #default="{ row }">
            <el-button link type="danger" @click="deleteRow(row)">删除</el-button>
            <el-button link type="primary" :disabled="Number(row.fileExists) !== 1" @click="downloadRow(row)">下载</el-button>
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
import { onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Document, Refresh, Search } from '@element-plus/icons-vue'
import PageFooterPager from '@/components/PageFooterPager.vue'
import { deleteDownloadFile, downloadCenterFile, pageDownloadFiles } from '@/api/downloadCenter'
import { fileSize, formatDateTime } from '@/utils/format'

const loading = ref(false)
const rows = ref([])
const filters = reactive({ keyword: '' })
const pager = reactive({ page: 1, size: 10, total: 0 })

onMounted(() => {
  loadRows()
})

function reloadFirstPage() {
  pager.page = 1
  loadRows()
}

function resetSearch() {
  filters.keyword = ''
  reloadFirstPage()
}

async function loadRows() {
  loading.value = true
  try {
    const res = await pageDownloadFiles({
      pageNum: pager.page,
      pageSize: pager.size,
      keyword: filters.keyword || undefined
    })
    rows.value = res?.records || []
    pager.total = Number(res?.total || 0)
  } finally {
    loading.value = false
  }
}

async function downloadRow(row) {
  if (Number(row.fileExists) !== 1) {
    ElMessage.warning('文件已丢失，请重新导出')
    return
  }
  const blob = await downloadCenterFile(row.id)
  downloadBlob(blob, row.fileName || '导出文件.docx')
}

async function deleteRow(row) {
  await ElMessageBox.confirm(
    `确定删除文件“${row.fileName || ''}”吗？删除后会同步删除文件资源和 OSS 文件，不进入回收站。`,
    '确认删除',
    { type: 'warning' }
  )
  await deleteDownloadFile(row.id)
  ElMessage.success('删除成功')
  await loadRows()
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
  return String(name || '导出文件.docx').replace(/[\\/:*?"<>|]/g, '_')
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
  padding-bottom: 22px;
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

.page-desc {
  margin: 18px 0 18px;
  padding: 14px 16px;
  border: 1px solid #d7dde8;
  color: #5f6b7a;
  font-size: 15px;
  line-height: 1.8;
  background: #fff;
}

.toolbar-row {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 18px;
}

.search-input {
  width: 260px;
}

.simple-table {
  flex: 1;
  min-height: 0;
}

.simple-table :deep(.el-table__header th) {
  background: #f4f6fa !important;
  color: #8a94a6;
  font-weight: 600;
}

.simple-table :deep(.el-table__cell) {
  border-bottom-color: #edf0f5 !important;
}

.file-name-cell {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #4b5563;
}

.file-name-cell .el-icon {
  color: #2f80ed;
}

.state-dot {
  display: inline-block;
  width: 5px;
  height: 5px;
  margin-right: 7px;
  border-radius: 50%;
  vertical-align: middle;
  background: #22c55e;
}

.state-dot.lost {
  background: #ef4444;
}

.refresh-btn {
  margin-left: 4px;
  vertical-align: middle;
}

:deep(.page-footer-pager) {
  padding-top: 12px;
  border-top: 1px solid #edf0f5;
}
</style>
