<template>
  <div class="page">
    <div class="page-body result-page">
      <div class="card card--table result-left">
        <div class="list-head">
          <div class="list-head__left">
            <el-input
              v-model="keyword"
              class="filter-input"
              placeholder="按结果标题 / 业务类型 / 审核状态自动查询"
              clearable
              @input="onKeywordInput"
            />
          </div>
          <div class="list-head__right">
            <el-button class="table-icon-btn" text :icon="Refresh" @click="loadResults" />
          </div>
        </div>

        <el-table
          class="ui-table"
          :data="results"
          border
          stripe
          highlight-current-row
          height="calc(100vh - 224px)"
          v-loading="loading"
          @current-change="selectResult"
          @row-dblclick="selectResult"
        >
          <el-table-column prop="title" label="结果标题" min-width="240" show-overflow-tooltip />
          <el-table-column prop="bizType" label="业务" width="90" />
          <el-table-column prop="bizId" label="业务ID" width="90" />
          <el-table-column prop="auditStatus" label="状态" width="100">
            <template #default="{ row }">
              <el-tag :type="auditStatusMap[row.auditStatus]?.type || 'info'" effect="light">
                {{ auditStatusMap[row.auditStatus]?.label || row.auditStatus || '-' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="createTime" label="创建时间" width="170" />
          <el-table-column label="操作" width="90" fixed="right">
            <template #default="{ row }">
              <el-button link type="primary" @click.stop="selectResult(row)">查看</el-button>
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

      <div class="card result-right">
        <template v-if="current">
          <div class="detail-head">
            <div class="detail-title-wrap">
              <div class="detail-title">{{ current.title || `生成结果 #${current.id}` }}</div>
            </div>

            <div class="detail-actions">
              <el-button :icon="Back" @click="goWorkbench">回到工作台</el-button>
              <el-button :icon="CopyDocument" :disabled="!current.contentMarkdown" @click="copyMarkdown">复制Markdown</el-button>
              <el-button :icon="Download" :loading="exportingWord" @click="handleExportWord">导出Word</el-button>
              <el-button :icon="Download" :loading="exportingMarkdown" @click="handleExportMarkdown">导出Markdown</el-button>
            </div>
          </div>

          <el-tabs v-model="activeTab" class="result-tabs">
            <el-tab-pane label="预览" name="preview">
              <div v-if="current.contentHtml" class="markdown-box content-view" v-html="current.contentHtml"></div>
              <div v-else-if="current.contentMarkdown" class="markdown-box content-view">{{ current.contentMarkdown }}</div>
              <el-empty v-else description="当前结果没有内容" />
            </el-tab-pane>
            <el-tab-pane label="Markdown源码" name="markdown">
              <el-input
                :model-value="current.contentMarkdown || ''"
                type="textarea"
                :rows="22"
                readonly
                resize="none"
              />
            </el-tab-pane>
          </el-tabs>
        </template>

        <el-empty v-else description="请选择左侧生成结果查看详情" />
      </div>
    </div>
  </div>
</template>

<script setup>
import { onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Back, CopyDocument, Download, Refresh } from '@element-plus/icons-vue'
import { downloadExportFile, exportMarkdown, exportWord, getAiGenerateResult, pageAiGenerateResults } from '@/api/ai'
import PageFooterPager from '@/components/PageFooterPager.vue'

const route = useRoute()
const router = useRouter()

const loading = ref(false)
const exportingWord = ref(false)
const exportingMarkdown = ref(false)
const keyword = ref('')
const results = ref([])
const current = ref(null)
const activeTab = ref('preview')
const timer = ref(null)

const pager = reactive({
  page: 1,
  size: 10,
  total: 0
})

const auditStatusMap = {
  pending: { label: '待审核', type: 'warning' },
  approved: { label: '通过', type: 'success' },
  rejected: { label: '驳回', type: 'danger' }
}

onMounted(async () => {
  await loadResults()

  const resultId = route.query.resultId
  if (resultId) {
    await loadResultDetail(resultId)
  } else if (results.value.length) {
    selectResult(results.value[0])
  }
})

function onKeywordInput() {
  clearTimeout(timer.value)
  timer.value = setTimeout(() => {
    pager.page = 1
    loadResults()
  }, 300)
}

async function loadResults() {
  loading.value = true
  try {
    const res = await pageAiGenerateResults({
      current: pager.page,
      size: pager.size,
      pageNum: pager.page,
      pageSize: pager.size,
      keyword: keyword.value || undefined
    })

    results.value = res?.records || []
    pager.total = Number(res?.total || 0)

    if (current.value?.id) {
      const next = results.value.find((item) => String(item.id) === String(current.value.id))
      if (next) current.value = next
    }
  } finally {
    loading.value = false
  }
}

async function selectResult(row) {
  if (!row?.id) return
  await loadResultDetail(row.id)
}

async function loadResultDetail(id) {
  const detail = await getAiGenerateResult(id)
  current.value = detail
  activeTab.value = 'preview'
}

async function copyMarkdown() {
  if (!current.value?.contentMarkdown) {
    ElMessage.warning('暂无可复制内容')
    return
  }

  await navigator.clipboard.writeText(current.value.contentMarkdown)
  ElMessage.success('已复制Markdown内容')
}

async function handleExportWord() {
  if (!current.value?.id) return

  exportingWord.value = true
  try {
    const file = await exportWord(current.value.id)
    ElMessage.success('Word导出成功')
    await openExportedFile(file)
  } finally {
    exportingWord.value = false
  }
}

async function handleExportMarkdown() {
  if (!current.value?.id) return

  exportingMarkdown.value = true
  try {
    const file = await exportMarkdown(current.value.id)
    ElMessage.success('Markdown导出成功')
    await openExportedFile(file)
  } finally {
    exportingMarkdown.value = false
  }
}

async function openExportedFile(file) {
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

function goWorkbench() {
  if (current.value?.bizType === 'bid' && current.value?.bizId) {
    router.push({ path: '/ai/workbench', query: { projectId: current.value.bizId } })
    return
  }
  router.push('/ai/workbench')
}
</script>

<style scoped>
.result-page {
  display: grid;
  grid-template-columns: minmax(520px, 0.9fr) minmax(0, 1.1fr);
  gap: 16px;
}

.result-left,
.result-right {
  min-width: 0;
}

.result-right {
  padding: 18px;
}

.detail-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 10px;
}

.detail-title-wrap {
  min-width: 0;
}

.detail-title {
  font-size: 18px;
  font-weight: 800;
  line-height: 1.4;
}

.detail-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 8px;
  flex-shrink: 0;
}

.result-tabs {
  margin-top: 8px;
}

.content-view {
  height: calc(100vh - 245px);
  overflow: auto;
}

@media (max-width: 1280px) {
  .result-page {
    grid-template-columns: 1fr;
  }

  .detail-head {
    flex-direction: column;
  }

  .detail-actions {
    justify-content: flex-start;
  }
}
</style>
