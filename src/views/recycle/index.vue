<template>
  <div class="recycle-page">
    <div class="content-card">
      <div class="page-title-row">
        <span class="title-mark"></span>
        <span>回收站</span>
        <span class="title-tip">（回收站中的内容显示剩余保留天数，超过30天后将永久删除）</span>
      </div>

      <div class="toolbar-row">
        <el-select v-model="filters.bizType" class="type-select" clearable placeholder="请选择类型" @change="reloadFirstPage">
          <el-option label="AI方案" value="AI_SOLUTION" />
          <el-option label="AI标书" value="AI_BID" />
        </el-select>
        <el-input
          v-model="filters.keyword"
          class="search-input"
          placeholder="请输入名称/所属人"
          clearable
          :prefix-icon="Search"
          @keyup.enter="reloadFirstPage"
        />
        <el-button type="primary" @click="reloadFirstPage">搜索</el-button>
        <el-button @click="resetSearch">重置</el-button>
      </div>

      <el-table
        class="simple-table"
        :data="rows"
        v-loading="loading"
        height="calc(100vh - 292px)"
        empty-text="暂无回收站数据"
      >
        <el-table-column type="selection" width="56" />
        <el-table-column label="名称" min-width="320" show-overflow-tooltip>
          <template #default="{ row }">
            <div class="name-cell">
              <el-icon><Document /></el-icon>
              <span>{{ row.bizName || '-' }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="删除位置" width="160" prop="deleteLocation" />
        <el-table-column label="所属人" width="160">
          <template #default="{ row }">{{ row.ownerName || '-' }}</template>
        </el-table-column>
        <el-table-column label="删除时间" width="200">
          <template #default="{ row }">{{ formatDateTime(row.deleteTime) }}</template>
        </el-table-column>
        <el-table-column label="剩余天数" width="140">
          <template #default="{ row }">
            <span class="remaining-days">{{ row.remainingDays || 0 }}天</span>
          </template>
        </el-table-column>
        <el-table-column label="删除操作者" width="160">
          <template #default="{ row }">{{ row.deleteUserName || '-' }}</template>
        </el-table-column>
        <el-table-column label="操作" width="160" align="center">
          <template #default="{ row }">
            <el-button link type="primary" @click="restoreRow(row)">还原</el-button>
            <el-button link type="primary" @click="deleteRow(row)">删除</el-button>
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
import { Document, Search } from '@element-plus/icons-vue'
import PageFooterPager from '@/components/PageFooterPager.vue'
import { deleteRecycleItemForever, pageRecycleBin, restoreRecycleItem } from '@/api/recycleBin'
import { formatDateTime } from '@/utils/format'

const loading = ref(false)
const rows = ref([])
const filters = reactive({ bizType: '', keyword: '' })
const pager = reactive({ page: 1, size: 10, total: 0 })

onMounted(() => {
  loadRows()
})

function reloadFirstPage() {
  pager.page = 1
  loadRows()
}

function resetSearch() {
  filters.bizType = ''
  filters.keyword = ''
  reloadFirstPage()
}

async function loadRows() {
  loading.value = true
  try {
    const res = await pageRecycleBin({
      pageNum: pager.page,
      pageSize: pager.size,
      bizType: filters.bizType || undefined,
      keyword: filters.keyword || undefined
    })
    rows.value = res?.records || []
    pager.total = Number(res?.total || 0)
  } finally {
    loading.value = false
  }
}

async function restoreRow(row) {
  await ElMessageBox.confirm(`确定还原“${row.bizName || ''}”吗？`, '确认还原', { type: 'warning' })
  await restoreRecycleItem(row.id)
  ElMessage.success('还原成功')
  await loadRows()
}

async function deleteRow(row) {
  await ElMessageBox.confirm(`确定永久删除“${row.bizName || ''}”吗？永久删除后不能恢复。`, '确认删除', { type: 'warning' })
  await deleteRecycleItemForever(row.id)
  ElMessage.success('删除成功')
  await loadRows()
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

.title-tip {
  color: #9aa4b2;
  font-size: 13px;
  font-weight: 400;
}

.toolbar-row {
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 20px 0 18px;
}

.type-select {
  width: 220px;
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

.name-cell {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #4b5563;
}

.name-cell .el-icon {
  color: #6b7280;
}

.remaining-days {
  color: #ff4d4f;
}

:deep(.page-footer-pager) {
  padding-top: 12px;
  border-top: 1px solid #edf0f5;
}
</style>
