<template>
  <div class="member-page">

    <section class="quota-grid">
      <div class="quota-card">
        <div class="quota-num">{{ formatNumber(summary.freeRemainWords) }}</div>
        <div class="quota-label">免费剩余</div>
        <div class="quota-desc">免费总额 {{ formatNumber(summary.freeTotalWords) }} 字</div>
      </div>
      <div class="quota-card">
        <div class="quota-num">{{ formatNumber(summary.paidRemainWords) }}</div>
        <div class="quota-label">付费剩余</div>
        <div class="quota-desc">包月 / 包年充值后增加</div>
      </div>
      <div class="quota-card">
        <div class="quota-num">{{ summary.memberExpireTime ? formatDate(summary.memberExpireTime) : '长期' }}</div>
        <div class="quota-label">会员有效期</div>
        <div class="quota-desc">免费额度长期有效，付费套餐按有效期使用</div>
      </div>
    </section>

    <section class="content-card">
      <div class="section-head">
        <div>
          <h2>套餐充值</h2>
          <p>第一版先提交充值订单，由平台后台确认到账；后续可接微信 / 支付宝。</p>
        </div>
        <el-button :loading="loading" @click="loadAll">刷新</el-button>
      </div>
      <div class="plan-grid">
        <div v-for="plan in paidPlans" :key="plan.id" class="plan-card">
          <div class="plan-type">{{ planTypeText(plan.planType) }}</div>
          <div class="plan-name">{{ plan.planName }}</div>
          <div class="plan-price">¥{{ Number(plan.price || 0).toFixed(2) }}</div>
          <div class="plan-meta">{{ formatNumber(resolveGrantWords(plan)) }} 字 · {{ plan.durationDays || 0 }} 天</div>
          <p>{{ plan.remark || '适合持续生成方案、标书和文档。' }}</p>
          <el-button type="primary" class="buy-btn" @click="buy(plan)">立即充值</el-button>
        </div>
      </div>
    </section>

    <section class="two-cols">
      <div class="content-card">
        <div class="section-head compact">
          <h2>充值订单</h2>
          <el-button text type="primary" @click="loadOrders">刷新</el-button>
        </div>
        <div class="member-table-wrap">
          <el-table :data="orders" height="100%" class="ui-table">
            <el-table-column prop="orderNo" label="订单号" min-width="150" show-overflow-tooltip />
            <el-table-column prop="planName" label="套餐" min-width="110" show-overflow-tooltip />
            <el-table-column label="金额" width="86">
              <template #default="{ row }">¥{{ Number(row.amount || 0).toFixed(2) }}</template>
            </el-table-column>
            <el-table-column label="状态" width="90">
              <template #default="{ row }"><el-tag :type="orderStatusType(row.status)">{{ orderStatusText(row.status) }}</el-tag></template>
            </el-table-column>
            <el-table-column prop="createTime" label="创建时间" min-width="145" show-overflow-tooltip />
          </el-table>
        </div>
        <div class="member-pager">
          <el-pagination
            background
            small
            layout="total, prev, pager, next"
            :pager-count="5"
            :total="orderPager.total"
            :current-page="orderPager.current"
            :page-size="orderPager.size"
            @update:current-page="orderPager.current = $event"
            @current-change="loadOrders"
          />
        </div>
      </div>

      <div class="content-card">
        <div class="section-head compact">
          <h2>消耗明细</h2>
          <el-button text type="primary" @click="loadLogs">刷新</el-button>
        </div>
        <div class="member-table-wrap">
          <el-table :data="logs" height="100%" class="ui-table">
            <el-table-column label="变动" width="96">
              <template #default="{ row }">
                <span :class="Number(row.words || 0) >= 0 ? 'plus' : 'minus'">{{ Number(row.words || 0) > 0 ? '+' : '' }}{{ formatNumber(row.words) }}</span>
              </template>
            </el-table-column>
            <el-table-column label="场景" width="96">
              <template #default="{ row }"><el-tag effect="plain">{{ sceneText(row.scene) }}</el-tag></template>
            </el-table-column>
            <el-table-column label="业务" width="110">
              <template #default="{ row }">{{ bizTypeText(row.bizType) }}</template>
            </el-table-column>
            <el-table-column prop="remark" label="说明" min-width="150" show-overflow-tooltip />
            <el-table-column prop="createTime" label="时间" min-width="145" show-overflow-tooltip />
          </el-table>
        </div>
        <div class="member-pager">
          <el-pagination
            background
            small
            layout="total, prev, pager, next"
            :pager-count="5"
            :total="logPager.total"
            :current-page="logPager.current"
            :page-size="logPager.size"
            @update:current-page="logPager.current = $event"
            @current-change="loadLogs"
          />
        </div>
      </div>
    </section>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  createMemberOrder,
  getMemberSummary,
  listMemberPlans,
  pageMyOrders,
  pageMyQuotaLogs
} from '@/api/member'

const loading = ref(false)
const plans = ref([])
const orders = ref([])
const logs = ref([])
const orderPager = reactive({ current: 1, size: 10, total: 0 })
const logPager = reactive({ current: 1, size: 10, total: 0 })
const summary = reactive({
  freeTotalWords: 300000,
  freeRemainWords: 0,
  paidRemainWords: 0,
  availableWords: 0,
  memberExpireTime: null
})

const paidPlans = computed(() => plans.value.filter((item) => !isSystemPlan(item)))

onMounted(loadAll)

async function loadAll() {
  loading.value = true
  try {
    await Promise.all([loadSummary(), loadPlans(), loadOrders(), loadLogs()])
  } finally {
    loading.value = false
  }
}

async function loadSummary() {
  const res = await getMemberSummary()
  Object.assign(summary, res || {})
}

async function loadPlans() {
  plans.value = await listMemberPlans()
}

async function loadOrders() {
  const res = await pageMyOrders({ current: orderPager.current, size: orderPager.size })
  orders.value = res?.records || []
  orderPager.total = Number(res?.total || 0)
}

async function loadLogs() {
  const res = await pageMyQuotaLogs({ current: logPager.current, size: logPager.size })
  logs.value = res?.records || []
  logPager.total = Number(res?.total || 0)
}

async function buy(plan) {
  await ElMessageBox.confirm(`确定提交【${plan.planName}】充值订单吗？`, '确认充值', { type: 'info' })
  const order = await createMemberOrder({ planId: plan.id })
  ElMessage.success(`订单已提交：${order.orderNo}，请联系平台管理员确认充值到账`)
  orderPager.current = 1
  await loadOrders()
}

function isSystemPlan(plan) {
  const code = String(plan?.planCode || '').toUpperCase()
  const type = String(plan?.planType || '').toLowerCase()
  return code === 'FREE' || code === 'ADMIN_ADJUST' || type === 'free' || type === 'admin_adjust'
}

function sceneText(value) {
  const map = {
    ai_solution: 'AI方案',
    ai_document: 'AI文档',
    ai_bid: 'AI标书',
    register: '注册赠送',
    member_recharge: '充值到账',
    admin_adjust: '管理员调整',
    ai_generate: 'AI生成'
  }
  return map[value] || value || '-'
}

function bizTypeText(value) {
  const map = {
    OUTLINE_GENERATE: '生成目录',
    FULL_GENERATE: '全文生成',
    SECTION_GENERATE: '单章生成',
    SECTION_SHORTEN: '缩写本章',
    WRITING_DIRECTION: '编写方向',
    REGISTER_GIFT: '注册赠送',
    MEMBER_ORDER: '充值订单',
    ADMIN_ADJUST: '管理员调整'
  }
  return map[value] || value || '-'
}

function resolveGrantWords(plan) {
  const configured = Number(plan.wordQuota || 0)
  if (configured > 0) return configured
  const type = String(plan.planType || '').toLowerCase()
  if (type.includes('month')) return 1000000
  if (type.includes('year')) return 12000000
  if (type.includes('enterprise')) return 50000000
  return configured
}

function planTypeText(type) {
  const value = String(type || '').toLowerCase()
  if (value.includes('month')) return '包月'
  if (value.includes('year')) return '包年'
  if (value.includes('enterprise')) return '企业版'
  return '套餐'
}

function orderStatusText(status) {
  const value = String(status || '').toLowerCase()
  if (value === 'paid') return '已到账'
  if (value === 'closed') return '已关闭'
  if (value === 'refunded') return '已退款'
  return '待确认'
}

function orderStatusType(status) {
  return String(status || '').toLowerCase() === 'paid' ? 'success' : 'warning'
}

function formatNumber(value) {
  return Number(value || 0).toLocaleString()
}

function formatDate(value) {
  return String(value || '').slice(0, 10)
}
</script>

<style scoped>
.member-page {
  height: calc(100vh - 56px);
  overflow: hidden;
  padding: 18px;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  gap: 14px;
  min-width: 0;
  max-width: 100%;
}
.hero-card,
.content-card,
.quota-card {
  border-radius: 18px;
  border: 1px solid #e6edf7;
  background: #fff;
  box-shadow: 0 12px 32px rgba(31, 54, 91, 0.06);
}
.hero-card {
  display: flex;
  justify-content: space-between;
  align-items: center;
  min-height: 160px;
  padding: 30px 36px;
  background: linear-gradient(135deg, #ffffff 0%, #eff6ff 55%, #eef2ff 100%);
}
.eyebrow {
  letter-spacing: 8px;
  color: #2563eb;
  font-weight: 900;
  font-size: 13px;
}
h1, h2, p { margin: 0; }
h1 { margin-top: 12px; font-size: 30px; color: #0f172a; }
.hero-card p, .section-head p, .plan-card p { margin-top: 10px; color: #64748b; line-height: 1.7; }
.quota-summary { text-align: center; padding: 20px 30px; border-radius: 20px; background: rgba(255,255,255,0.75); }
.total { color: #2563eb; font-size: 42px; font-weight: 900; }
.label { color: #64748b; }
.quota-grid { flex: 0 0 auto; display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 14px; margin-top: 0; min-width: 0; }
.quota-card { padding: 20px; }
.quota-num { color: #2563eb; font-size: 24px; font-weight: 900; }
.quota-label { margin-top: 8px; font-weight: 800; color: #1e293b; }
.quota-desc { margin-top: 6px; color: #94a3b8; font-size: 13px; }
.content-card { margin-top: 0; padding: 18px; min-width: 0; overflow: hidden; }
.section-head { flex: 0 0 auto; display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; gap: 12px; min-width: 0; }
.section-head.compact { margin-bottom: 12px; }
.section-head h2 { font-size: 20px; color: #0f172a; }
.plan-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 14px; min-width: 0; }
.plan-card { padding: 20px; border: 1px solid #e6edf7; border-radius: 16px; background: linear-gradient(180deg, #fff, #f8fbff); }
.plan-type { display: inline-flex; padding: 3px 9px; border-radius: 999px; background: #eaf2ff; color: #2563eb; font-size: 12px; font-weight: 800; }
.plan-name { margin-top: 14px; font-size: 20px; color: #0f172a; font-weight: 900; }
.plan-price { margin-top: 8px; font-size: 28px; color: #f97316; font-weight: 900; }
.plan-meta { margin-top: 8px; color: #2563eb; font-weight: 800; }
.buy-btn { width: 100%; margin-top: 16px; }
.two-cols { flex: 1 1 auto; min-height: 0; display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 14px; overflow: hidden; }
.two-cols > .content-card {
  display: flex;
  flex-direction: column;
  min-height: 0;
}
.member-table-wrap {
  flex: 1 1 auto;
  min-height: 0;
  overflow: hidden;
}
.member-pager {
  flex: 0 0 auto;
  display: flex;
  justify-content: flex-end;
  align-items: center;
  padding-top: 10px;
  margin-top: 10px;
  border-top: 1px solid #edf2f7;
  min-width: 0;
}
.member-pager :deep(.el-pagination) {
  max-width: 100%;
  white-space: nowrap;
  flex-wrap: nowrap;
}
.plus { color: #16a34a; font-weight: 800; }
.minus { color: #ef4444; font-weight: 800; }
:deep(.ui-table .el-table__header-wrapper th .cell) { white-space: nowrap; }

.member-page > .content-card {
  flex: 0 0 auto;
}
.member-page :deep(.el-table) {
  width: 100% !important;
}
.member-page :deep(.el-table__body-wrapper) {
  overflow-x: hidden;
}
.member-page :deep(.el-pagination__jump),
.member-page :deep(.el-pagination__sizes) {
  display: none;
}
@media (max-height: 820px) {
  .quota-grid { display: none; }
  .plan-card { padding: 16px; }
  .plan-price { font-size: 24px; }
}
</style>
