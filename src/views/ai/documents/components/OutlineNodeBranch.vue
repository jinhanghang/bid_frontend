<template>
  <template v-for="node in safeNodes" :key="nodeKey(node, level)">
    <div class="tree-node-wrap">
      <div
        class="tree-row"
        :class="[
          `level-${level}`,
          isLeaf(node) ? 'clickable generate-row' : 'parent-row',
          { active: isActive(node), locked }
        ]"
        :style="{ paddingLeft: `${level * 14}px` }"
        @click="onSelect(node)"
      >
        <span class="tree-toggle">{{ hasChildren(node) ? '▾' : '' }}</span>
        <span class="tree-badge" :class="isLeaf(node) ? 'leaf-badge' : (level === 0 ? 'chapter-badge' : 'section-badge')">
          {{ nodeBadgeText(level, isLeaf(node)) }}
        </span>
        <span class="tree-title" :class="hasChildren(node) ? 'parent' : 'leaf'">{{ node.title || '未命名章节' }}</span>
        <div class="tree-controls" :class="isLeaf(node) ? 'generate-controls' : ''">
          <template v-if="isLeaf(node)">
            <span class="count-text">{{ actualWordCount(node) }}/{{ targetWordCount(node) }}字</span>
            <el-tag size="small" :type="statusType(node)" effect="light">{{ statusLabel(node) }}</el-tag>
          </template>
        </div>
      </div>

      <div v-if="hasChildren(node)" class="tree-children">
        <OutlineNodeBranch
          :nodes="childrenOf(node)"
          :active-id="activeId"
          :level="level + 1"
          :locked="locked"
          @select="(payload) => emit('select', payload)"
        />
      </div>
    </div>
  </template>
</template>

<script setup>
import { computed } from 'vue'

defineOptions({ name: 'OutlineNodeBranch' })
const props = defineProps({
  nodes: { type: Array, default: () => [] },
  activeId: { type: [String, Number], default: null },
  level: { type: Number, default: 0 },
  locked: { type: Boolean, default: false }
})
const emit = defineEmits(['select'])
const safeNodes = computed(() => Array.isArray(props.nodes) ? props.nodes.filter(Boolean) : [])

function nodeKey(node, depth = 0) {
  return String(node?.id || `${depth}-${node?.title || 'node'}`)
}

function childrenOf(node) {
  return Array.isArray(node?.children) ? node.children.filter(Boolean) : []
}

function hasChildren(node) {
  return childrenOf(node).length > 0
}

function isLeaf(node) {
  return !hasChildren(node)
}

function isActive(node) {
  return String(props.activeId || '') === String(node?.id || '')
}

function statusLabel(node) {
  const status = String(node?.contentStatus || node?.section?.generateStatus || '').toUpperCase()
  if (status === 'FAILED') return '失败'
  if (['GENERATING', 'LOCKED'].includes(status)) return '生成中'
  if (status === 'STALE') return '待重试'
  return node?.section?.content ? '已生成' : '待生成'
}

function statusType(node) {
  const status = String(node?.contentStatus || node?.section?.generateStatus || '').toUpperCase()
  if (status === 'FAILED') return 'danger'
  if (['GENERATING', 'LOCKED'].includes(status)) return 'warning'
  if (node?.section?.content) return 'success'
  return 'info'
}

function nodeBadgeText(depth, leaf) {
  if (leaf) return '条'
  if (depth === 0) return '章'
  return '节'
}

function actualWordCount(node) {
  return Number(node?.actualWordCount || node?.section?.wordCount || 0) || 0
}

function targetWordCount(node) {
  return Number(node?.targetWordCount || 0) || 0
}

function onSelect(node) {
  if (!props.locked && isLeaf(node)) emit('select', node)
}
</script>
