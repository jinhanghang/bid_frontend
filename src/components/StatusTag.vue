<template>
  <el-tag :type="type" effect="light">
    {{ text }}
  </el-tag>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  value: { type: [String, Number, Boolean], default: '' },
  map: { type: Object, default: () => ({}) }
})

const text = computed(() => {
  const item = props.map[String(props.value)]
  if (Array.isArray(item)) return item[0]
  if (item && typeof item === 'object') return item.label
  if (props.value === 1 || props.value === '1' || props.value === true) return '正常'
  if (props.value === 0 || props.value === '0' || props.value === false) return '停用'
  return props.value || '-'
})

const type = computed(() => {
  const item = props.map[String(props.value)]
  if (Array.isArray(item)) return item[1] || ''
  if (item && typeof item === 'object') return item.type || ''
  if (props.value === 1 || props.value === '1' || props.value === true) return 'success'
  if (props.value === 0 || props.value === '0' || props.value === false) return 'info'
  if (['failed', 'fail', 'rejected', 'invalid'].includes(String(props.value))) return 'danger'
  if (['pending', 'draft', 'new'].includes(String(props.value))) return 'warning'
  if (['success', 'completed', 'approved'].includes(String(props.value))) return 'success'
  return ''
})
</script>
