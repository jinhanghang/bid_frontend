<template>
  <div class="writing-direction-tree">
    <WritingDirectionBranch
      :nodes="safeNodes"
      :depth="0"
      :streaming-id="streamingId"
      @ai-write="(payload) => emit('ai-write', payload)"
      @save="(payload) => emit('save', payload)"
    />
  </div>
</template>

<script setup>
import { computed } from 'vue'
import WritingDirectionBranch from './WritingDirectionBranch.vue'

defineOptions({ name: 'WritingDirectionEditor' })

const props = defineProps({
  nodes: { type: Array, default: () => [] },
  streamingId: { type: [Number, String], default: null }
})
const emit = defineEmits(['ai-write', 'save'])
const safeNodes = computed(() => Array.isArray(props.nodes) ? props.nodes.filter(Boolean) : [])
</script>
