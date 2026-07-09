<template>
  <template v-for="node in safeNodes" :key="nodeKey(node, depth)">
    <div class="direction-node">
      <div class="tree-row" :style="{ paddingLeft: `${depth * 20}px` }">
        <span class="tree-dot">{{ hasChildren(node) ? '▾' : '•' }}</span>
        <el-input v-model="node.title" class="title-input" />
        <el-button size="small" @click="emit('save', node)">保存</el-button>
      </div>

      <div v-if="!hasChildren(node)" class="direction-editor" :style="{ marginLeft: `${depth * 20 + 28}px` }">
        <div class="mini-card-title">
          <span>编写方向：</span>
          <el-button
            size="small"
            type="primary"
            :loading="String(streamingId || '') === String(node.id || '')"
            @click="emit('ai-write', node)"
          >AI帮写</el-button>
        </div>
        <el-input v-model="node.writingDirection" type="textarea" :rows="6" :maxlength="10000" show-word-limit />
        <div class="mini-card-title second">
          <span>编写要求：</span>
          <el-button size="small" type="primary" @click="emit('save', node)">保存</el-button>
        </div>
        <el-input
          v-model="node.writingRequirement"
          type="textarea"
          :rows="3"
          :maxlength="10000"
          show-word-limit
          placeholder="请输入编写要求"
        />
      </div>

      <WritingDirectionBranch
        v-if="hasChildren(node)"
        :nodes="childrenOf(node)"
        :depth="depth + 1"
        :streaming-id="streamingId"
        @ai-write="(payload) => emit('ai-write', payload)"
        @save="(payload) => emit('save', payload)"
      />
    </div>
  </template>
</template>

<script setup>
import { computed } from 'vue'

defineOptions({ name: 'WritingDirectionBranch' })
const props = defineProps({
  nodes: { type: Array, default: () => [] },
  depth: { type: Number, default: 0 },
  streamingId: { type: [Number, String], default: null }
})
const emit = defineEmits(['ai-write', 'save'])
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
</script>
