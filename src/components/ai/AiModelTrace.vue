<template>
  <div class="ai-model-trace" :class="{ compact }">
    <el-tag size="small" type="primary" effect="light">AI等级：{{ levelName }}</el-tag>
    <el-tag size="small" type="info" effect="light">场景：{{ displaySceneName }}</el-tag>
    <el-tooltip v-if="isSuperAdmin" placement="top" effect="light">
      <template #content>
        <div class="trace-tooltip">
          <div>场景编码：{{ sceneCode || '-' }}</div>
          <div>AI等级：{{ normalizedLevel || '-' }}</div>
          <div>命中规则：{{ preview?.effectiveRule || '-' }}</div>
          <div>状态：{{ previewStatusText }}</div>
          <div v-if="preview?.warning">提示：{{ preview.warning }}</div>
        </div>
      </template>
      <el-tag size="small" :type="previewTagType" effect="plain" @click.stop="refreshPreview">
        {{ previewText }}
      </el-tag>
    </el-tooltip>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { previewAiModel } from '@/api/aiModel'

const props = defineProps({
  sceneCode: { type: String, default: '' },
  sceneName: { type: String, default: '' },
  aiLevel: { type: String, default: '' },
  compact: { type: Boolean, default: false }
})

const auth = useAuthStore()
const preview = ref(null)
const previewLoading = ref(false)

const isSuperAdmin = computed(() => (auth.roleCodes || []).includes('SUPERADMIN') || (auth.roleCodes || []).includes('SUPER_ADMIN'))
const normalizedLevel = computed(() => normalizeAiLevel(props.aiLevel || 'BASIC'))
const levelName = computed(() => aiLevelLabel(normalizedLevel.value))
const displaySceneName = computed(() => props.sceneName || sceneLabel(props.sceneCode) || props.sceneCode || '通用生成')
const previewText = computed(() => {
  if (previewLoading.value) return '链路检查中'
  if (!preview.value) return '查看模型链路'
  return preview.value.effectiveRule || previewStatusText.value || '模型链路正常'
})
const previewStatusText = computed(() => {
  const status = String(preview.value?.status || '').toUpperCase()
  if (status === 'OK') return '已命中可用配置'
  if (status === 'FALLBACK') return '使用兜底配置'
  if (status === 'MISSING') return '未匹配到配置'
  return '未检查'
})
const previewTagType = computed(() => {
  const status = String(preview.value?.status || '').toUpperCase()
  if (status === 'OK') return 'success'
  if (status === 'FALLBACK') return 'warning'
  if (status === 'MISSING') return 'danger'
  return 'info'
})

watch(() => [props.sceneCode, normalizedLevel.value, isSuperAdmin.value], () => {
  if (isSuperAdmin.value && props.sceneCode) refreshPreview()
}, { immediate: true })

async function refreshPreview() {
  if (!isSuperAdmin.value || !props.sceneCode || previewLoading.value) return
  previewLoading.value = true
  try {
    preview.value = await previewAiModel({ modelType: 'chat', sceneCode: props.sceneCode, aiLevel: normalizedLevel.value })
  } catch (e) {
    preview.value = null
  } finally {
    previewLoading.value = false
  }
}

function normalizeAiLevel(value) {
  const text = String(value || '').trim().toUpperCase()
  if (['BASIC', 'STANDARD', 'FLAGSHIP'].includes(text)) return text
  return 'BASIC'
}

function aiLevelLabel(value) {
  if (value === 'BASIC') return '基础版'
  if (value === 'STANDARD') return '标准版'
  if (value === 'FLAGSHIP') return '旗舰版'
  return value || '基础版'
}

function sceneLabel(code) {
  const map = {
    GENERIC_GENERATE: '通用生成',
    SOLUTION_PARSE_EXTRACT: '资料解析',
    SOLUTION_OUTLINE_GENERATE: '目录生成',
    SOLUTION_DIRECTION_GENERATE: '编写方向生成',
    SOLUTION_SECTION_GENERATE: '章节正文生成',
    SOLUTION_FULL_GENERATE: '全文生成',
    SOLUTION_REWRITE: '章节/全文重写',
    SOLUTION_AI_REVIEW: 'AI二次审稿',
    KNOWLEDGE_RETRIEVAL_SUMMARY: '知识库问答总结'
  }
  return map[code] || ''
}
</script>

<style scoped>
.ai-model-trace {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  margin-top: 8px;
}
.ai-model-trace.compact { margin-top: 0; }
.trace-tooltip { line-height: 1.8; max-width: 360px; }
</style>
