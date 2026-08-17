<template>
  <div class="material-library-layout">
    <div class="material-library-head">
      <div>
        <h2>资料库</h2>
        <p>统一管理企业资料、图片素材和知识库内容。</p>
      </div>
      <div class="material-library-tabs" role="tablist" aria-label="资料库分类">
        <button
          v-for="tab in tabs"
          :key="tab.name"
          class="material-tab-card"
          :class="{ active: activeTab === tab.name }"
          type="button"
          role="tab"
          :aria-selected="activeTab === tab.name"
          @click="onTabChange(tab.name)"
        >
          <span class="material-tab-icon">
            <el-icon><component :is="tab.icon" /></el-icon>
          </span>
          <span class="material-tab-copy">
            <strong>{{ tab.label }}</strong>
            <small>{{ tab.description }}</small>
          </span>
        </button>
      </div>
    </div>
    <router-view />
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Collection, OfficeBuilding, Picture } from '@element-plus/icons-vue'

const route = useRoute()
const router = useRouter()

const tabs = [
  { name: 'company', label: '企业资料', description: '企业档案与资质', icon: OfficeBuilding },
  { name: 'images', label: '图片库', description: '统一管理图片素材', icon: Picture },
  { name: 'knowledge', label: '知识库', description: '沉淀企业知识内容', icon: Collection }
]

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
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  padding: 18px 22px;
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
  margin: 6px 0 0;
  font-size: 13px;
  color: #64748b;
}
.material-library-tabs {
  display: grid;
  grid-template-columns: repeat(3, minmax(148px, 1fr));
  gap: 10px;
  flex-shrink: 0;
  min-width: 500px;
}

.material-tab-card {
  appearance: none;
  min-height: 72px;
  padding: 11px 14px;
  border: 1px solid #e3e9f4;
  border-radius: 14px;
  background: #f8faff;
  color: #34435d;
  font-family: inherit;
  text-align: left;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 11px;
  transition: transform 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease, background 0.18s ease;
}

.material-tab-card:hover {
  transform: translateY(-2px);
  border-color: #a9b6ff;
  background: #f4f3ff;
  box-shadow: 0 9px 20px rgba(79, 70, 229, 0.12);
}

.material-tab-card.active {
  border-color: #6558f5;
  background: linear-gradient(135deg, #6658f5 0%, #775df8 100%);
  color: #fff;
  box-shadow: 0 10px 22px rgba(101, 88, 245, 0.24);
}

.material-tab-icon {
  width: 38px;
  height: 38px;
  border-radius: 11px;
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: #eceeff;
  color: #6257f2;
  font-size: 20px;
}

.material-tab-card.active .material-tab-icon {
  background: rgba(255, 255, 255, 0.18);
  color: #fff;
}

.material-tab-copy {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.material-tab-copy strong {
  font-size: 16px;
  line-height: 1.2;
  white-space: nowrap;
}

.material-tab-copy small {
  color: #7b879d;
  font-size: 12px;
  line-height: 1.2;
  white-space: nowrap;
}

.material-tab-card.active .material-tab-copy small {
  color: rgba(255, 255, 255, 0.78);
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

@media (max-width: 620px) {
  .material-library-tabs {
    grid-template-columns: 1fr;
  }
}
</style>
