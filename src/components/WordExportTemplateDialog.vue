<template>
  <el-dialog
    v-model="innerVisible"
    title="导出正式 Word"
    width="640px"
    destroy-on-close
    @closed="reset"
  >
    <div class="word-export-dialog">
      <el-descriptions :column="2" border>
        <el-descriptions-item label="生成结果">
          {{ resultTitle }}
        </el-descriptions-item>
        <el-descriptions-item label="生成类型">
          {{ generateTypeLabel(result?.bizType) }}
        </el-descriptions-item>
        <el-descriptions-item label="所属项目">
          {{ result?.projectName || '-' }}
        </el-descriptions-item>
        <el-descriptions-item label="项目编号">
          {{ result?.projectCode || '-' }}
        </el-descriptions-item>
      </el-descriptions>

      <div class="template-card">
        <div class="template-card__title">正式标书版导出</div>
        <div class="template-card__body">
          <strong>使用系统内置正式 Word 样式导出</strong>
          <span>系统会自动生成封面、目录、章节分页，并统一标题、正文、表格、列表样式。</span>
        </div>
        <div class="formal-options">
          <el-checkbox v-model="form.includeCoverPage">生成封面页</el-checkbox>
          <el-checkbox v-model="form.includeCatalogPage">生成目录页</el-checkbox>
          <el-checkbox v-model="form.chapterPageBreak">一级章节自动分页</el-checkbox>
        </div>
      </div>

      <el-alert
        class="dialog-alert"
        title="Word 标书模板模块已移除，导出统一使用系统内置正式 Word 样式。"
        type="success"
        show-icon
        :closable="false"
      />
    </div>

    <template #footer>
      <el-button @click="innerVisible = false">取消</el-button>
      <el-button type="primary" :loading="submitting" @click="submitExport">
        确认导出
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { computed, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { exportWord } from '@/api/ai'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  result: {
    type: Object,
    default: null
  }
})

const emit = defineEmits(['update:modelValue', 'success'])

const innerVisible = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

const submitting = ref(false)
const result = computed(() => props.result || {})

const form = reactive({
  includeCoverPage: true,
  includeCatalogPage: true,
  chapterPageBreak: true
})

const resultTitle = computed(() => {
  return props.result?.title || props.result?.resultTitle || 'AI生成结果'
})

async function submitExport() {
  if (!props.result?.id && !props.result?.resultId) {
    ElMessage.warning('生成结果ID为空')
    return
  }

  const resultId = props.result.id || props.result.resultId
  submitting.value = true
  try {
    const file = await exportWord(resultId, {
      plainExport: true,
      formalExport: true,
      includeCoverPage: form.includeCoverPage,
      includeCatalogPage: form.includeCatalogPage,
      chapterPageBreak: form.chapterPageBreak
    })
    ElMessage.success('Word已导出，开始下载')
    emit('success', file)
    innerVisible.value = false
  } finally {
    submitting.value = false
  }
}

function reset() {
  form.includeCoverPage = true
  form.includeCatalogPage = true
  form.chapterPageBreak = true
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
</script>

<style scoped>
.word-export-dialog {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.dialog-alert {
  margin-top: 0;
}

.template-card {
  padding: 14px;
  border-radius: 14px;
  border: 1px solid var(--border);
  background: #f8fafc;
}

.template-card__title {
  font-weight: 800;
  color: var(--text-main);
  margin-bottom: 8px;
}

.template-card__body {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.template-card__body strong {
  color: var(--text-main);
}

.template-card__body span {
  color: var(--text-sub);
  font-size: 13px;
}

.formal-options {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  margin-top: 12px;
}
</style>
