<template>
  <el-input
    v-model="inner"
    class="code-textarea"
    type="textarea"
    :rows="rows"
    :placeholder="placeholder"
    @blur="formatJson"
  />
</template>

<script setup>
import { computed } from 'vue'
import { ElMessage } from 'element-plus'

const props = defineProps({
  modelValue: { type: [String, Object, Array], default: '' },
  rows: { type: Number, default: 6 },
  placeholder: { type: String, default: '请输入 JSON，例如：{\"key\":\"value\"}' }
})
const emit = defineEmits(['update:modelValue'])

const inner = computed({
  get() {
    if (!props.modelValue) return ''
    if (typeof props.modelValue === 'string') return props.modelValue
    return JSON.stringify(props.modelValue, null, 2)
  },
  set(value) {
    emit('update:modelValue', value)
  }
})

function formatJson() {
  if (!inner.value) return
  try {
    const obj = JSON.parse(inner.value)
    emit('update:modelValue', JSON.stringify(obj, null, 2))
  } catch (e) {
    ElMessage.warning('JSON格式不正确，保存前请检查')
  }
}
</script>
