<template>
  <div class="ai-model-trace" :class="{ compact }">
    <el-tag size="small" type="primary" effect="light">AI等级：{{ levelName }}</el-tag>
    <el-tag size="small" type="info" effect="light">场景：{{ displaySceneName }}</el-tag>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  sceneCode: { type: String, default: '' },
  sceneName: { type: String, default: '' },
  aiLevel: { type: String, default: '' },
  compact: { type: Boolean, default: false }
})

const normalizedLevel = computed(() => normalizeAiLevel(props.aiLevel))
const levelName = computed(() => aiLevelLabel(normalizedLevel.value))
const displaySceneName = computed(() => props.sceneName || sceneLabel(props.sceneCode) || props.sceneCode || '通用生成')

function normalizeAiLevel(value) {
  const text = String(value || '').trim().toUpperCase()
  if (['BASIC', 'STANDARD', 'FLAGSHIP'].includes(text)) return text
  return ''
}

function aiLevelLabel(value) {
  if (value === 'BASIC') return '基础版'
  if (value === 'STANDARD') return '标准版'
  if (value === 'FLAGSHIP') return '旗舰版'
  return value || '未选择'
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
</style>
