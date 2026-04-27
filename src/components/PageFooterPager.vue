<template>
  <div class="page-footer-pager">
    <el-pagination
      background
      layout="total, sizes, prev, pager, next, jumper"
      :total="total"
      :current-page="page"
      :page-size="size"
      :page-sizes="[10, 20, 50, 100]"
      @update:current-page="$emit('update:page', $event)"
      @update:page-size="$emit('update:size', $event)"
      @current-change="$emit('change')"
      @size-change="$emit('change')"
    />
  </div>
</template>

<script setup>
defineProps({
  total: { type: Number, default: 0 },
  page: { type: Number, default: 1 },
  size: { type: Number, default: 10 }
})

defineEmits(['update:page', 'update:size', 'change'])
</script>
