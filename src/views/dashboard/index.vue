<template>
  <div class="page">
    <div class="page-body">
      <div class="welcome-card card">
        <div>
          <div class="welcome-title">AI标书后台管理系统</div>
          <div class="welcome-sub">
            <template v-if="needEnterpriseApply">
              当前账号还没有绑定企业。请先提交企业申请，审核通过后即可使用标书项目、知识库、AI生成等业务功能。
            </template>
            <template v-else>
              围绕项目、知识库、模板和 AI 生成进行标书编制管理，帮助企业沉淀投标资料、规范编制流程、提升出标效率。
            </template>
          </div>
        </div>
        <el-button v-if="needEnterpriseApply" type="primary" @click="$router.push('/system/enterprise-apply')">提交企业申请</el-button>
        <el-button v-else type="primary" @click="$router.push('/bid/projects')">进入标书项目</el-button>
      </div>

      <div v-if="needEnterpriseApply" class="enterprise-guide card">
        <div class="guide-title">请选择一种方式继续</div>
        <div class="enterprise-options">
          <div class="enterprise-option">
            <div class="option-title">注册新企业</div>
            <div class="option-desc">
              适合你的企业还没有在系统中开通。提交企业入驻申请后，由平台管理员审核；审核通过后系统会创建企业，并把你设置为企业管理员。
            </div>
          </div>
          <div class="enterprise-option">
            <div class="option-title">加入已有企业</div>
            <div class="option-desc">
              适合你的企业已经在系统中存在。提交加入申请后，由平台管理员或企业管理员审核；审核通过后你会加入该企业。
            </div>
          </div>
        </div>
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
import { computed, onMounted, reactive } from 'vue'
import { getDashboardSummary } from '@/api/dashboard'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()

const stats = reactive([
  { title: '标书项目', value: 0 },
  { title: 'AI生成任务', value: 0 },
  { title: '招标公告', value: 0 },
  { title: '一键报备', value: 0 }
])

const roleCodes = computed(() => (auth.user?.roleCodes || auth.user?.roles || []).map((item) => String(item).toUpperCase()))
const isPlatformUser = computed(() => roleCodes.value.includes('SUPER_ADMIN') || roleCodes.value.includes('PLATFORM_ADMIN'))
const needEnterpriseApply = computed(() => !isPlatformUser.value && !auth.user?.enterpriseId)

onMounted(loadStats)

async function loadStats() {
  const res = await getDashboardSummary()
  stats[0].value = res?.bidProjectCount ?? 0
  stats[1].value = res?.aiGenerateTaskCount ?? 0
  stats[2].value = res?.tenderNoticeCount ?? 0
  stats[3].value = res?.tenderReportCount ?? 0
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
  line-height: 1.7;
}

.enterprise-guide {
  margin-top: 16px;
  padding: 22px;
}

.enterprise-options {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

.enterprise-option {
  padding: 18px;
  border: 1px solid var(--border);
  border-radius: 14px;
  background: #f8fafc;
}

.option-title {
  font-size: 16px;
  font-weight: 800;
}

.option-desc {
  margin-top: 8px;
  color: var(--text-sub);
  line-height: 1.7;
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

@media (max-width: 900px) {
  .enterprise-options {
    grid-template-columns: 1fr;
  }
}
</style>
