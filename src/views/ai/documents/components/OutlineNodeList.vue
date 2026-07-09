<template>
  <div class="outline-tree">
    <OutlineNodeBranch
      :nodes="safeNodes"
      :active-id="activeId"
      :level="level"
      :locked="locked"
      @select="(payload) => emit('select', payload)"
    />
  </div>
</template>

<script setup>
import { computed } from 'vue'
import OutlineNodeBranch from './OutlineNodeBranch.vue'

defineOptions({ name: 'OutlineNodeList' })
const props = defineProps({
  nodes: { type: Array, default: () => [] },
  activeId: { type: [String, Number], default: null },
  level: { type: Number, default: 0 },
  locked: { type: Boolean, default: false }
})
const emit = defineEmits(['select'])
const safeNodes = computed(() => Array.isArray(props.nodes) ? props.nodes.filter(Boolean) : [])
</script>
