<template>
  <div class="recycle-page">
    <div class="content-card">
      <div class="page-title-row">
        <span class="title-mark"></span>
        <span>回收站</span>
        <span class="title-tip">回收站中的内容显示剩余保留天数，超过30天后将永久删除。</span>
      </div>

      <div class="toolbar-row">
        <div class="toolbar-left">
          <el-select v-model="filters.bizType" class="type-select" clearable placeholder="请选择类型" @change="reloadFirstPage">
            <el-option label="AI方案" value="AI_SOLUTION" />
            <el-option label="AI标书" value="AI_BID" />
            <el-option label="AI文档" value="AI_DOCUMENT" />
          </el-select>
          <el-input
            v-model="filters.keyword"
            class="search-input"
            placeholder="输入名称 / 所属人自动查询"
            clearable
            :prefix-icon="Search"
            @input="onKeywordInput"
            @clear="reloadFirstPage"
            @keyup.enter="reloadFirstPage"
          />
        </div>
        <div class="toolbar-actions">
          <el-button :icon="Refresh" :loading="loading" @click="loadRows">刷新</el-button>
          <el-button
            type="primary"
            plain
            :disabled="!selectedRows.length"
            :loading="batchLoading"
            @click="batchRestore"
          >批量还原</el-button>
          <el-button
            type="danger"
            plain
            :disabled="!selectedRows.length"
            :loading="batchLoading"
            @click="batchDelete"
          >批量永久删除</el-button>
        </div>
      </div>

      <el-table
        class="ui-table recycle-table"
        :data="rows"
        v-loading="loading"
        border
        stripe
        height="calc(100vh - 304px)"
        empty-text="暂无回收站数据"
        @selection-change="onSelectionChange"
      >
        <el-table-column type="selection" width="56" />
        <el-table-column label="名称" min-width="320" show-overflow-tooltip>
          <template #default="{ row }">
            <div class="name-cell">
              <el-icon><Document /></el-icon>
              <div class="name-main">
                <span>{{ row.bizName || '-' }}</span>
                <small>{{ bizTypeLabel(row.bizType) }}</small>
              </div>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="删除位置" width="150" prop="deleteLocation" />
        <el-table-column label="所属人" width="150">
          <template #default="{ row }">{{ row.ownerName || '-' }}</template>
        </el-table-column>
        <el-table-column label="删除时间" width="190">
          <template #default="{ row }">{{ formatDateTime(row.deleteTime) }}</template>
        </el-table-column>
        <el-table-column label="剩余天数" width="140">
          <template #default="{ row }">
            <el-tag :type="remainingType(row.remainingDays)" effect="light">
              {{ row.remainingDays || 0 }}天
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="删除操作者" width="150">
          <template #default="{ row }">{{ row.deleteUserName || '-' }}</template>
        </el-table-column>
        <el-table-column label="操作" width="170" align="center" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="restoreRow(row)">还原</el-button>
            <el-button link type="danger" @click="deleteRow(row)">永久删除</el-button>
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
import { ElMessage, ElMessageBox } from 'element-plus'
import { Document, Refresh, Search } from '@element-plus/icons-vue'
import PageFooterPager from '@/components/PageFooterPager.vue'
import { deleteRecycleItemForever, pageRecycleBin, restoreRecycleItem } from '@/api/recycleBin'
import { formatDateTime } from '@/utils/format'

const loading = ref(false)
const batchLoading = ref(false)
const rows = ref([])
const selectedRows = ref([])
const filters = reactive({ bizType: '', keyword: '' })
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

function onSelectionChange(selection) {
  selectedRows.value = selection || []
}

async function loadRows() {
  loading.value = true
  try {
    const res = await pageRecycleBin({
      pageNum: pager.page,
      pageSize: pager.size,
      bizType: filters.bizType || undefined,
      keyword: String(filters.keyword || '').trim() || undefined
    })
    rows.value = res?.records || []
    pager.total = Number(res?.total || 0)
    selectedRows.value = []
  } finally {
    loading.value = false
  }
}

async function restoreRow(row) {
  await ElMessageBox.confirm(`确定还原“${row.bizName || ''}”吗？`, '确认还原', { type: 'warning' })
  await restoreRecycleItem(row.id)
  ElMessage.success('还原成功')
  await reloadAfterChange(1)
}

async function deleteRow(row) {
  await ElMessageBox.confirm(`确定永久删除“${row.bizName || ''}”吗？永久删除后不能恢复。`, '确认删除', { type: 'warning' })
  await deleteRecycleItemForever(row.id)
  ElMessage.success('删除成功')
  await reloadAfterChange(1)
}

async function batchRestore() {
  if (!selectedRows.value.length) return
  await ElMessageBox.confirm(`确定还原选中的 ${selectedRows.value.length} 条记录吗？`, '批量还原', { type: 'warning' })
  batchLoading.value = true
  try {
    for (const row of selectedRows.value) {
      await restoreRecycleItem(row.id)
    }
    ElMessage.success('批量还原成功')
    await reloadAfterChange(selectedRows.value.length)
  } finally {
    batchLoading.value = false
  }
}

async function batchDelete() {
  if (!selectedRows.value.length) return
  await ElMessageBox.confirm(`确定永久删除选中的 ${selectedRows.value.length} 条记录吗？永久删除后不能恢复。`, '批量永久删除', { type: 'warning' })
  batchLoading.value = true
  try {
    for (const row of selectedRows.value) {
      await deleteRecycleItemForever(row.id)
    }
    ElMessage.success('批量删除成功')
    await reloadAfterChange(selectedRows.value.length)
  } finally {
    batchLoading.value = false
  }
}

async function reloadAfterChange(changedCount = 1) {
  if (rows.value.length <= changedCount && pager.page > 1) {
    pager.page -= 1
  }
  await loadRows()
}

function bizTypeLabel(type) {
  if (type === 'AI_SOLUTION') return 'AI方案'
  if (type === 'AI_BID') return 'AI标书'
  if (type === 'AI_DOCUMENT') return 'AI文档'
  return type || '-'
}

function remainingType(days) {
  const value = Number(days || 0)
  if (value <= 3) return 'danger'
  if (value <= 7) return 'warning'
  return 'success'
}
</script>

<style scoped>
.recycle-page {
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

.toolbar-left,
.toolbar-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.type-select {
  width: 180px;
  flex-shrink: 0;
}

.search-input {
  width: 300px;
}

.recycle-table {
  flex: 1;
  min-height: 0;
}

.name-cell {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #4b5563;
  min-width: 0;
}

.name-cell .el-icon {
  color: #6b7280;
  flex-shrink: 0;
}

.name-main {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.name-main span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.name-main small {
  margin-top: 3px;
  color: #9ca3af;
  font-size: 12px;
}

:deep(.page-footer-pager) {
  padding-top: 12px;
  border-top: 1px solid #edf0f5;
}

@media (max-width: 980px) {
  .toolbar-row,
  .toolbar-left,
  .toolbar-actions {
    align-items: stretch;
    flex-direction: column;
  }

  .type-select,
  .search-input {
    width: 100%;
  }
}
</style>
