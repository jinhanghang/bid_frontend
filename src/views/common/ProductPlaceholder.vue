<template>
  <div class="placeholder-page">
    <div class="placeholder-card">
      <div class="placeholder-icon">AI</div>
      <h2>{{ productName }}</h2>
      <p>{{ productDesc }}</p>
      <el-tag type="info" effect="light">功能入口已预留，后续按业务优先级接入</el-tag>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()
const productName = computed(() => route.meta.productName || route.meta.title || '功能建设中')
const productDesc = computed(() => route.meta.productDesc || '当前功能正在规划中。')
</script>

<style scoped>
.placeholder-page {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  border-radius: 18px;
  background: #fff;
}

.placeholder-card {
  width: min(560px, 90vw);
  padding: 48px;
  text-align: center;
  border-radius: 24px;
  background: linear-gradient(180deg, #f8fbff, #ffffff);
  box-shadow: 0 18px 44px rgba(30, 64, 175, 0.08);
}

.placeholder-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 70px;
  height: 70px;
  border-radius: 24px;
  color: #fff;
  font-size: 22px;
  font-weight: 900;
  background: linear-gradient(135deg, #3b82f6, #8b5cf6);
}

h2 {
  margin: 20px 0 10px;
  color: #1f2937;
}

p {
  margin: 0 0 18px;
  color: #64748b;
  line-height: 1.8;
}
</style>
