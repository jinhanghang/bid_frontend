<template>
  <el-drawer
    v-model="visible"
    :title="title"
    :size="size"
    destroy-on-close
    class="quality-check-drawer ai-review-drawer"
  >
    <div class="quality-check-wrap ai-review-wrap" v-loading="loading">
      <el-tabs v-model="activeTab" class="ai-review-tabs">
        <el-tab-pane label="本次审稿" name="current">
          <div class="quality-check-toolbar">
            <div>
              <div class="quality-check-title">全文统一口径与审稿建议</div>
              <div class="quality-check-desc">用于正式导出前检查术语、周期、交付物、结论、重复内容和风险表达。</div>
              <AiModelTrace scene-code="SOLUTION_AI_REVIEW" scene-name="AI二次审稿" :ai-level="aiLevel" compact />
            </div>
            <el-button type="primary" :disabled="disabled" :loading="loading" @click="$emit('run-review')">开始审稿</el-button>
          </div>

          <el-alert
            v-if="reviewResult && !reviewResult.reviewRecordId"
            class="review-record-alert"
            type="warning"
            show-icon
            :closable="false"
            title="本次审稿已完成，但后端未返回审稿记录编号，请检查 t_ai_review_record 增量SQL是否已执行，以及后端保存记录日志。"
          />

          <el-descriptions v-if="consistencyPackage" :column="1" border class="extract-summary">
            <el-descriptions-item label="统一术语">{{ consistencyPackage.unifiedTerms || '-' }}</el-descriptions-item>
            <el-descriptions-item label="统一周期">{{ consistencyPackage.unifiedPeriod || '-' }}</el-descriptions-item>
            <el-descriptions-item label="统一人员">{{ consistencyPackage.unifiedPersonnel || '-' }}</el-descriptions-item>
            <el-descriptions-item label="统一交付物">{{ consistencyPackage.unifiedDeliverables || '-' }}</el-descriptions-item>
            <el-descriptions-item label="服务承诺">{{ consistencyPackage.unifiedServiceCommitment || '-' }}</el-descriptions-item>
            <el-descriptions-item label="风险边界">{{ consistencyPackage.unifiedRiskBoundary || '-' }}</el-descriptions-item>
          </el-descriptions>

          <template v-if="reviewResult">
            <div class="quality-stat-grid">
              <div class="quality-stat-card"><span>审稿得分</span><strong>{{ reviewResult.overallScore ?? '-' }}</strong><small>{{ reviewResult.summary || '-' }}</small></div>
              <div class="quality-stat-card"><span>风险等级</span><strong>{{ reviewResult.riskLevel || '-' }}</strong><small>LOW / MEDIUM / HIGH</small></div>
              <div class="quality-stat-card"><span>问题数量</span><strong>{{ (reviewResult.issues || []).length }}</strong><small>建议逐项处理</small></div>
            </div>
            <el-table class="ui-table quality-table" :data="reviewResult.issues || []" border stripe size="small" empty-text="暂无审稿问题">
              <el-table-column prop="severity" label="等级" width="100" align="center" />
              <el-table-column prop="title" label="问题" min-width="160" show-overflow-tooltip />
              <el-table-column prop="description" label="说明" min-width="220" show-overflow-tooltip />
              <el-table-column prop="suggestion" label="修改建议" min-width="260" show-overflow-tooltip />
            </el-table>
            <el-input v-if="reviewResult.aiReviewText" class="review-textarea" type="textarea" :rows="12" readonly :model-value="reviewResult.aiReviewText" />
          </template>

          <el-empty v-else description="暂无本次审稿结果，点击开始审稿后系统会自动保存记录" />
        </el-tab-pane>

        <el-tab-pane :label="`审稿记录${recordTotal ? `（${recordTotal}）` : ''}`" name="records">
          <div class="review-record-toolbar">
            <div>
              <div class="quality-check-title">历史审稿记录</div>
              <div class="quality-check-desc">每次 AI审稿完成后自动留痕，可用于复核和对比修改效果。</div>
            </div>
            <el-button plain :loading="recordLoading" @click="loadRecords">刷新</el-button>
          </div>

          <el-alert
            v-if="recordError"
            class="review-record-alert"
            type="warning"
            show-icon
            :closable="false"
            :title="recordError"
          />

          <el-table class="ui-table quality-table" :data="records" border stripe size="small" v-loading="recordLoading" empty-text="暂无审稿记录">
            <el-table-column prop="createTime" label="审稿时间" width="170">
              <template #default="{ row }">{{ formatDateTime(row.createTime) }}</template>
            </el-table-column>
            <el-table-column prop="title" label="标题" min-width="180" show-overflow-tooltip />
            <el-table-column prop="overallScore" label="得分" width="80" align="center" />
            <el-table-column prop="riskLevel" label="风险" width="100" align="center">
              <template #default="{ row }"><el-tag size="small" :type="riskTagType(row.riskLevel)">{{ row.riskLevel || '-' }}</el-tag></template>
            </el-table-column>
            <el-table-column prop="issueCount" label="问题数" width="90" align="center" />
            <el-table-column prop="summary" label="摘要" min-width="220" show-overflow-tooltip />
            <el-table-column label="操作" width="140" fixed="right" align="center">
              <template #default="{ row }">
                <el-button link type="primary" @click="openRecordDetail(row)">查看</el-button>
                <el-button link type="danger" @click="removeRecord(row)">删除</el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-tab-pane>
      </el-tabs>
    </div>

    <el-dialog v-model="detailVisible" title="审稿记录详情" width="760px" append-to-body destroy-on-close>
      <div v-if="activeRecord" class="review-record-detail">
        <div class="quality-stat-grid">
          <div class="quality-stat-card"><span>审稿得分</span><strong>{{ activeRecord.overallScore ?? '-' }}</strong><small>{{ activeRecord.summary || '-' }}</small></div>
          <div class="quality-stat-card"><span>风险等级</span><strong>{{ activeRecord.riskLevel || '-' }}</strong><small>{{ formatDateTime(activeRecord.createTime) }}</small></div>
          <div class="quality-stat-card"><span>问题数量</span><strong>{{ activeRecord.issueCount ?? 0 }}</strong><small>历史记录</small></div>
        </div>
        <el-table class="ui-table quality-table" :data="activeRecordIssues" border stripe size="small" empty-text="暂无审稿问题">
          <el-table-column prop="severity" label="等级" width="100" align="center" />
          <el-table-column prop="title" label="问题" min-width="160" show-overflow-tooltip />
          <el-table-column prop="description" label="说明" min-width="220" show-overflow-tooltip />
          <el-table-column prop="suggestion" label="修改建议" min-width="260" show-overflow-tooltip />
        </el-table>
        <el-input v-if="activeRecord.aiReviewText" class="review-textarea" type="textarea" :rows="10" readonly :model-value="activeRecord.aiReviewText" />
      </div>
    </el-dialog>
  </el-drawer>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { deleteAiReviewRecord, getAiReviewRecord, pageAiReviewRecords } from '@/api/aiReviewRecord'
import { formatDateTime } from '@/utils/format'
import AiModelTrace from '@/components/ai/AiModelTrace.vue'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  title: { type: String, default: 'AI二次审稿' },
  size: { type: String, default: '58%' },
  bizType: { type: String, default: '' },
  bizId: { type: [String, Number], default: '' },
  consistencyPackage: { type: Object, default: null },
  reviewResult: { type: Object, default: null },
  loading: { type: Boolean, default: false },
  disabled: { type: Boolean, default: false },
  aiLevel: { type: String, default: 'BASIC' }
})

const emit = defineEmits(['update:modelValue', 'run-review'])

const visible = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

const activeTab = ref('current')
const records = ref([])
const recordTotal = ref(0)
const recordLoading = ref(false)
const recordError = ref('')
const detailVisible = ref(false)
const activeRecord = ref(null)

const activeRecordIssues = computed(() => parseReviewIssues(activeRecord.value))

watch(() => [props.modelValue, props.bizType, String(props.bizId || '')], ([show]) => {
  if (show && props.bizType && props.bizId) loadRecords()
})

watch(() => activeTab.value, (tab) => {
  if (tab === 'records' && props.modelValue && props.bizType && props.bizId) loadRecords()
})

watch(() => props.reviewResult, (result) => {
  if (props.modelValue && result && props.bizType && props.bizId) {
    window.setTimeout(() => loadRecords(), 300)
  }
})

async function loadRecords() {
  if (!props.bizType || !props.bizId) return
  recordLoading.value = true
  try {
    recordError.value = ''
    const page = await pageAiReviewRecords({ bizType: props.bizType, bizId: props.bizId, pageNum: 1, pageSize: 20 })
    records.value = page?.records || []
    recordTotal.value = page?.total || 0
  } catch (e) {
    records.value = []
    recordTotal.value = 0
    recordError.value = e?.message || '审稿记录加载失败，请检查后端审稿记录接口和增量SQL。'
  } finally {
    recordLoading.value = false
  }
}

async function openRecordDetail(row) {
  if (!row?.id) return
  try {
    activeRecord.value = await getAiReviewRecord(row.id)
    detailVisible.value = true
  } catch (e) {
    ElMessage.error(e?.message || '加载审稿记录失败')
  }
}

async function removeRecord(row) {
  if (!row?.id) return
  await ElMessageBox.confirm('删除后该审稿记录不再展示，不影响正文内容，是否继续？', '删除审稿记录', {
    type: 'warning', confirmButtonText: '删除', cancelButtonText: '取消'
  })
  try {
    await deleteAiReviewRecord(row.id)
    ElMessage.success('审稿记录已删除')
    await loadRecords()
  } catch (e) {
    ElMessage.error(e?.message || '删除审稿记录失败')
  }
}

function parseReviewIssues(record) {
  if (!record?.reviewResult) return []
  try {
    const parsed = JSON.parse(record.reviewResult)
    return Array.isArray(parsed?.issues) ? parsed.issues : []
  } catch (e) {
    return []
  }
}

function riskTagType(risk) {
  const value = String(risk || '').toUpperCase()
  if (value === 'HIGH') return 'danger'
  if (value === 'MEDIUM') return 'warning'
  if (value === 'LOW') return 'success'
  return 'info'
}
</script>

<style scoped>
.ai-review-wrap {
  min-height: 360px;
}
.ai-review-tabs :deep(.el-tabs__content) {
  padding-top: 8px;
}
.review-record-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}
.review-record-alert {
  margin-bottom: 12px;
}
.review-record-detail {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.review-textarea {
  margin-top: 14px;
}
.quality-check-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}
.quality-check-title {
  font-size: 15px;
  font-weight: 800;
  color: #1f2937;
}
.quality-check-desc {
  margin-top: 4px;
  font-size: 12px;
  color: #64748b;
}
.quality-stat-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  margin: 14px 0;
}
.quality-stat-card {
  padding: 12px 14px;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  background: #f8fafc;
}
.quality-stat-card span,
.quality-stat-card small {
  display: block;
  color: #64748b;
  font-size: 12px;
}
.quality-stat-card strong {
  display: block;
  margin: 6px 0 4px;
  color: #111827;
  font-size: 22px;
}
.extract-summary {
  margin-bottom: 14px;
}
.quality-table {
  margin-top: 10px;
}
@media (max-width: 1200px) {
  .quality-stat-grid {
    grid-template-columns: 1fr;
  }
}
</style>
