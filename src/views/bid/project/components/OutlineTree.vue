<template>
  <div class="outline-tree">
    <div
      v-for="node in safeNodes"
      :key="nodeKey(node, 0)"
      class="tree-node-wrap"
    >
      <div
        class="tree-row"
        :class="[
          `level-0`,
          mode === 'generate' && !hasChildren(node) ? 'clickable generate-row' : '',
          isGenerateSelected(node) ? 'selected' : ''
        ]"
        :style="{ paddingLeft: '0px' }"
        @click="onPreview(node)"
      >
        <el-checkbox
          v-if="mode === 'delete'"
          :model-value="selected.includes(node.id)"
          @update:model-value="(checked) => onSelectedChange(node, checked)"
        />
        <span class="tree-dot">{{ hasChildren(node) ? '▾' : '•' }}</span>
        <span class="tree-title" :class="hasChildren(node) ? 'parent' : 'leaf'">{{ node.title }}</span>
        <div class="tree-controls" :class="mode === 'generate' && !hasChildren(node) ? 'generate-controls' : ''">
          <template v-if="mode === 'word'">
            <el-select
              v-if="hasChildren(node)"
              :model-value="null"
              size="small"
              class="word-select"
              placeholder="批量修改"
              @change="(value) => emit('batch-word', { node, value })"
            >
              <el-option v-for="n in wordOptions" :key="n" :label="`${n}字`" :value="n" />
            </el-select>
            <el-select
              v-else
              :model-value="wordModelValue(node)"
              size="small"
              class="word-select"
              placeholder="请选择"
              @change="(value) => emit('word-change', { node, value })"
            >
              <el-option v-for="n in wordOptions" :key="n" :label="`${n}字`" :value="n" />
            </el-select>
          </template>

          <el-button v-if="mode === 'add'" link :icon="Plus" @click.stop="emit('add-node', node)" />

          <template v-if="mode === 'sort'">
            <el-button link :icon="SortUp" @click.stop="emit('move', { node, direction: 'UP' })" />
            <el-button link :icon="SortDown" @click.stop="emit('move', { node, direction: 'DOWN' })" />
          </template>

          <template v-if="mode === 'generate' && !hasChildren(node)">
            <span class="count-text" :class="[isOutlineFailed(node) ? 'failed' : '', technicalWordHealthClass(node)]">
              {{ outlineActualWordCount(node) }} / {{ outlineTargetWordCount(node) }}字
            </span>
            <template v-if="isNodeOptimizing(node)">
              <el-tag size="small" type="warning" effect="light">{{ optimizeActionLabel(sectionOptimizing) }}中</el-tag>
              <el-button size="small" type="warning" plain loading disabled>处理中</el-button>
            </template>
            <template v-else-if="isOutlineGenerated(node)">
              <el-tag size="small" type="success" effect="light">已完成</el-tag>
              <el-button size="small" type="warning" plain :disabled="busy" @click.stop="onSectionGenerate(node)">{{ busy ? '锁定' : '重编' }}</el-button>
            </template>
            <template v-else-if="isOutlineFailed(node)">
              <el-tag size="small" type="danger" effect="light">失败</el-tag>
              <el-button size="small" type="danger" plain :disabled="busy" @click.stop="onSectionGenerate(node)">{{ busy ? '锁定' : '重试' }}</el-button>
            </template>
            <template v-else>
              <el-tag size="small" type="info" effect="light">未生成</el-tag>
              <el-button size="small" type="primary" plain :disabled="busy" @click.stop="onSectionGenerate(node)">{{ busy ? '锁定' : '生成' }}</el-button>
            </template>
          </template>

          <span v-if="simple && !hasChildren(node)" class="simple-level">{{ node.headingType || 'H4' }}</span>
        </div>
      </div>

      <div v-if="hasChildren(node)" class="tree-children">
        <OutlineTreeBranch
          :nodes="childrenOf(node)"
          :depth="1"
          :mode="mode"
          :simple="simple"
          :selected="selected"
          :selected-id="selectedId"
          :word-options="wordOptions"
          :busy="busy"
          :section-optimizing="sectionOptimizing"
          :is-node-optimizing="isNodeOptimizing"
          :optimize-action-label="optimizeActionLabel"
          :is-outline-generated="isOutlineGenerated"
          :is-outline-failed="isOutlineFailed"
          :outline-actual-word-count="outlineActualWordCount"
          :outline-target-word-count="outlineTargetWordCount"
          :technical-word-health-class="technicalWordHealthClass"
          @word-change="(payload) => emit('word-change', payload)"
          @batch-word="(payload) => emit('batch-word', payload)"
          @add-node="(payload) => emit('add-node', payload)"
          @update:selected="(payload) => emit('update:selected', payload)"
          @move="(payload) => emit('move', payload)"
          @preview="(payload) => emit('preview', payload)"
          @section-generate="(payload) => emit('section-generate', payload)"
        />
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { Plus, SortDown, SortUp } from '@element-plus/icons-vue'
import OutlineTreeBranch from './OutlineTreeBranch.vue'

defineOptions({ name: 'OutlineTree' })

const props = defineProps({
  nodes: { type: Array, default: () => [] },
  mode: { type: String, default: 'view' },
  simple: { type: Boolean, default: false },
  selected: { type: Array, default: () => [] },
  selectedId: { type: [String, Number], default: '' },
  wordOptions: { type: Array, default: () => [300, 600, 900, 1200, 1800, 2700, 3600, 4500, 5400, 6300, 7200, 8100, 9000, 9900] },
  busy: { type: Boolean, default: false },
  sectionOptimizing: { type: String, default: '' },
  isNodeOptimizing: { type: Function, default: () => (() => false) },
  optimizeActionLabel: { type: Function, default: () => (() => '') },
  isOutlineGenerated: { type: Function, default: () => (() => false) },
  isOutlineFailed: { type: Function, default: () => (() => false) },
  outlineActualWordCount: { type: Function, default: () => (() => 0) },
  outlineTargetWordCount: { type: Function, default: () => (() => 0) },
  technicalWordHealthClass: { type: Function, default: () => (() => '') }
})

const emit = defineEmits(['word-change', 'batch-word', 'add-node', 'update:selected', 'move', 'preview', 'section-generate'])

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

function wordModelValue(node) {
  const value = Number(node?.targetWordCount || node?.wordCount || 0)
  return value > 0 ? value : null
}

function isGenerateSelected(node) {
  return props.mode === 'generate' && !hasChildren(node) && String(props.selectedId || '') === String(node?.id || '')
}

function onPreview(node) {
  if (props.mode === 'generate' && !hasChildren(node)) emit('preview', node)
}

function onSelectedChange(node, checked) {
  const id = node?.id
  const next = checked ? [...props.selected, id] : props.selected.filter((item) => item !== id)
  emit('update:selected', next)
}

function onSectionGenerate(node) {
  if (props.busy) return
  emit('section-generate', node)
}
</script>
