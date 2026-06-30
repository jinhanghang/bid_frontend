<template>
  <div class="material-library-layout">
    <div class="material-library-head">
      <div>
        <h2>资料库</h2>
        <p>统一管理企业资料、图片素材和知识库内容。</p>
      </div>
      <el-tabs :model-value="activeTab" class="material-library-tabs" @tab-change="onTabChange">
        <el-tab-pane label="企业资料" name="company" />
        <el-tab-pane label="图片库" name="images" />
        <el-tab-pane label="知识库" name="knowledge" />
      </el-tabs>
    </div>
    <router-view />
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()

const activeTab = computed(() => {
  if (route.path.includes('/materials/images')) return 'images'
  if (route.path.includes('/materials/knowledge')) return 'knowledge'
  return 'company'
})

function onTabChange(name) {
  if (name === 'images') router.push('/materials/images')
  else if (name === 'knowledge') router.push('/materials/knowledge')
  else router.push('/materials/company')
}
</script>

<style scoped>
.material-library-layout {
  display: flex;
  flex-direction: column;
  gap: 14px;
  min-height: 0;
  height: 100%;
}
.material-library-head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 18px;
  padding: 18px 22px 0;
  border-radius: 18px;
  background: #fff;
  border: 1px solid #e5edf7;
  box-shadow: 0 10px 28px rgba(15, 23, 42, 0.05);
}
.material-library-head h2 {
  margin: 0;
  font-size: 20px;
  color: #0f172a;
}
.material-library-head p {
  margin: 6px 0 16px;
  font-size: 13px;
  color: #64748b;
}
.material-library-tabs {
  flex-shrink: 0;
  min-width: 330px;
}
.material-library-tabs :deep(.el-tabs__header) {
  margin-bottom: 0;
}
@media (max-width: 900px) {
  .material-library-head {
    align-items: flex-start;
    flex-direction: column;
  }
  .material-library-tabs {
    width: 100%;
    min-width: 0;
  }
}
</style>
