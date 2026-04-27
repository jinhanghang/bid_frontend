<template>
  <CrudPage :config="config" />
</template>

<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import CrudPage from '@/views/common/CrudPage.vue'
import { moduleConfigs } from '@/config/moduleConfigs'

const route = useRoute()
const config = computed(() => {
  const key = route.meta.configKey
  return moduleConfigs[key] || moduleConfigs.role
})
</script>
