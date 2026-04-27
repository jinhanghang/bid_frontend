<template>
  <div class="page">
    <div class="page-body">
      <div class="welcome-card card">
        <div>
          <div class="welcome-title">AI标书后台管理系统</div>
          <div class="welcome-sub">
            当前前端已按后端项目生成，接口前缀为 /ai_bid/api，登录使用 Authorization: Bearer token。
          </div>
        </div>
        <el-button type="primary" @click="$router.push('/bid/projects')">进入标书项目</el-button>
      </div>

      <div class="stat-grid dashboard-stats">
        <div v-for="item in stats" :key="item.title" class="stat-card">
          <div class="stat-title">{{ item.title }}</div>
          <div class="stat-value">{{ item.value }}</div>
        </div>
      </div>

      <div class="card card--table dashboard-guide">
        <div class="guide-title">主流程建议</div>
        <el-steps :active="5" finish-status="success" align-center>
          <el-step title="建知识库" description="新建知识库并上传企业资料、招标文件、业绩文件" />
          <el-step title="建项目" description="录入项目名称、企业、预算、工期、客户等信息" />
          <el-step title="配模板" description="选择标书模板、Prompt模板和引用知识库" />
          <el-step title="AI生成" description="根据项目、变量和知识库生成标书内容" />
          <el-step title="导出" description="导出Word或Markdown文件" />
        </el-steps>
      </div>
    </div>
  </div>
</template>

<script setup>
import { onMounted, reactive } from 'vue'
import { createCrudApi } from '@/api/crud'

const stats = reactive([
  { title: '标书项目', value: '-' },
  { title: 'AI生成任务', value: '-' },
  { title: '招标公告', value: '-' },
  { title: '一键报备', value: '-' }
])

onMounted(loadStats)

async function getTotal(baseUrl) {
  try {
    const res = await createCrudApi(baseUrl).page({ current: 1, size: 1, pageNum: 1, pageSize: 1 })
    return res?.total ?? 0
  } catch (e) {
    return '-'
  }
}

async function loadStats() {
  const totals = await Promise.all([
    getTotal('/bid-project'),
    getTotal('/ai-generate-task'),
    getTotal('/tender-notice'),
    getTotal('/tender-report')
  ])
  stats.forEach((item, index) => {
    item.value = totals[index]
  })
}
</script>

<style scoped>
.welcome-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 22px;
}

.welcome-title {
  font-size: 24px;
  font-weight: 800;
}

.welcome-sub {
  margin-top: 8px;
  color: var(--text-sub);
}

.dashboard-stats {
  margin-top: 16px;
}

.dashboard-guide {
  margin-top: 16px;
  padding: 22px;
}

.guide-title {
  margin-bottom: 20px;
  font-size: 18px;
  font-weight: 800;
}
</style>
