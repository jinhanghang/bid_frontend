<template>
  <div class="member-admin-page">

    <el-tabs v-model="activeTab" class="admin-tabs">
      <el-tab-pane label="套餐管理" name="plans">
        <div class="toolbar">
          <el-button type="primary" @click="openPlanDialog()">新增套餐</el-button>
        </div>
        <el-table :data="plans" class="ui-table" height="560">
          <el-table-column prop="planCode" label="套餐编码" width="140" />
          <el-table-column prop="planName" label="套餐名称" min-width="140" />
          <el-table-column label="类型" width="100">
            <template #default="{ row }"><el-tag>{{ planTypeText(row.planType) }}</el-tag></template>
          </el-table-column>
          <el-table-column label="价格" width="110">
            <template #default="{ row }">¥{{ Number(row.price || 0).toFixed(2) }}</template>
          </el-table-column>
          <el-table-column label="赠送字数" width="130">
            <template #default="{ row }">{{ formatNumber(row.wordQuota) }}</template>
          </el-table-column>
          <el-table-column prop="durationDays" label="有效天数" width="100" />
          <el-table-column label="状态" width="90">
            <template #default="{ row }"><el-tag :type="row.status === 1 ? 'success' : 'info'">{{ row.status === 1 ? '启用' : '停用' }}</el-tag></template>
          </el-table-column>
          <el-table-column prop="remark" label="备注" min-width="220" show-overflow-tooltip />
          <el-table-column label="操作" width="150" fixed="right">
            <template #default="{ row }">
              <el-button link type="primary" @click="openPlanDialog(row)">编辑</el-button>
              <el-button link type="danger" @click="removePlan(row)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-tab-pane>

      <el-tab-pane label="充值订单" name="orders">
        <div class="toolbar">
          <el-input v-model="orderQuery.keyword" placeholder="搜索订单号 / 套餐" clearable @keyup.enter="loadOrders" />
          <el-select v-model="orderQuery.status" placeholder="订单状态" clearable>
            <el-option label="待确认" value="created" />
            <el-option label="已到账" value="paid" />
            <el-option label="已关闭" value="closed" />
          </el-select>
          <el-button type="primary" @click="loadOrders">搜索</el-button>
        </div>
        <el-table :data="orders" class="ui-table" height="560">
          <el-table-column prop="orderNo" label="订单号" min-width="180" />
          <el-table-column prop="planName" label="套餐" min-width="130" />
          <el-table-column label="赠送字数" width="130"><template #default="{ row }">{{ formatNumber(row.grantWords) }}</template></el-table-column>
          <el-table-column label="金额" width="110"><template #default="{ row }">¥{{ Number(row.amount || 0).toFixed(2) }}</template></el-table-column>
          <el-table-column label="状态" width="100"><template #default="{ row }"><el-tag :type="orderStatusType(row.status)">{{ orderStatusText(row.status) }}</el-tag></template></el-table-column>
          <el-table-column prop="createTime" label="创建时间" min-width="160" />
          <el-table-column prop="payTime" label="到账时间" min-width="160" />
          <el-table-column label="操作" width="130" fixed="right">
            <template #default="{ row }">
              <el-button v-if="row.status !== 'paid'" link type="primary" @click="confirmPaid(row)">确认到账</el-button>
              <span v-else class="muted">已处理</span>
            </template>
          </el-table-column>
        </el-table>
      </el-tab-pane>

      <el-tab-pane label="用户额度" name="accounts">
        <div class="toolbar">
          <el-input v-model="accountQuery.keyword" placeholder="搜索用户 / 手机号 / 企业" clearable @keyup.enter="loadAccounts" />
          <el-button type="primary" @click="loadAccounts">搜索</el-button>
        </div>
        <el-table :data="accounts" class="ui-table" height="560">
          <el-table-column prop="fullName" label="姓名" min-width="120" />
          <el-table-column prop="phone" label="手机号" min-width="130" />
          <el-table-column prop="enterpriseName" label="企业" min-width="160" show-overflow-tooltip />
          <el-table-column label="剩余总字数" width="130"><template #default="{ row }">{{ formatNumber(row.availableWords) }}</template></el-table-column>
          <el-table-column label="免费剩余" width="120"><template #default="{ row }">{{ formatNumber(row.freeRemainWords) }}</template></el-table-column>
          <el-table-column label="付费剩余" width="120"><template #default="{ row }">{{ formatNumber(row.paidRemainWords) }}</template></el-table-column>
          <el-table-column prop="memberExpireTime" label="会员到期" min-width="160" />
          <el-table-column label="操作" width="120" fixed="right">
            <template #default="{ row }"><el-button link type="primary" @click="openAdjust(row)">调整额度</el-button></template>
          </el-table-column>
        </el-table>
      </el-tab-pane>

      <el-tab-pane label="消耗流水" name="logs">
        <div class="toolbar">
          <el-input v-model="logQuery.keyword" placeholder="搜索场景 / 业务 / 备注" clearable @keyup.enter="loadLogs" />
          <el-button type="primary" @click="loadLogs">搜索</el-button>
        </div>
        <el-table :data="logs" class="ui-table" height="560">
          <el-table-column prop="userId" label="用户ID" width="90" />
          <el-table-column prop="scene" label="场景" width="130" />
          <el-table-column prop="bizType" label="业务类型" width="150" />
          <el-table-column label="变动字数" width="120"><template #default="{ row }"><span :class="Number(row.words || 0) >= 0 ? 'plus' : 'minus'">{{ Number(row.words || 0) > 0 ? '+' : '' }}{{ formatNumber(row.words) }}</span></template></el-table-column>
          <el-table-column prop="beforeWords" label="变动前" width="110" />
          <el-table-column prop="afterWords" label="变动后" width="110" />
          <el-table-column prop="remark" label="说明" min-width="220" show-overflow-tooltip />
          <el-table-column prop="createTime" label="时间" min-width="160" />
        </el-table>
      </el-tab-pane>

      <el-tab-pane v-if="canManageModels" label="模型管理" name="models">
        <div class="toolbar model-toolbar">
          <el-input v-model="modelQuery.keyword" placeholder="搜索服务商 / 模型 / 场景" clearable @keyup.enter="loadModels" />
          <el-select v-model="modelQuery.modelType" placeholder="模型类型" clearable>
            <el-option label="Chat" value="chat" />
            <el-option label="Rerank" value="rerank" />
          </el-select>
          <el-button type="primary" @click="loadModels">搜索</el-button>
          <el-button type="primary" plain @click="openModelDialog()">新增模型</el-button>
        </div>
        <el-alert
          class="model-alert"
          type="info"
          :closable="false"
          show-icon
          title="所有文本生成类 AI 调用都会优先读取这里启用的 Chat 模型；知识库向量化由百炼云服务托管，本系统不再维护 Embedding 模型。"
        />
        <el-table :data="models" class="ui-table" height="520">
          <el-table-column prop="provider" label="服务商" width="110" />
          <el-table-column prop="modelName" label="模型名称" min-width="210" show-overflow-tooltip />
          <el-table-column label="类型" width="105">
            <template #default="{ row }"><el-tag>{{ modelTypeText(row.modelType) }}</el-tag></template>
          </el-table-column>
          <el-table-column label="使用场景" min-width="180" show-overflow-tooltip>
            <template #default="{ row }">{{ sceneText(row.sceneCode) }}</template>
          </el-table-column>
          <el-table-column label="AI等级" width="100">
            <template #default="{ row }">{{ levelText(row.aiLevel) }}</template>
          </el-table-column>
          <el-table-column label="默认" width="80">
            <template #default="{ row }"><el-tag v-if="row.defaultFlag === 1" type="success">默认</el-tag><span v-else class="muted">-</span></template>
          </el-table-column>
          <el-table-column prop="temperature" label="温度" width="80" />
          <el-table-column prop="maxTokens" label="Token" width="90" />
          <el-table-column label="状态" width="90">
            <template #default="{ row }"><el-tag :type="row.status === 1 ? 'success' : 'info'">{{ row.status === 1 ? '启用' : '停用' }}</el-tag></template>
          </el-table-column>
          <el-table-column prop="remark" label="备注" min-width="180" show-overflow-tooltip />
          <el-table-column label="操作" width="150" fixed="right">
            <template #default="{ row }">
              <el-button link type="primary" @click="openModelDialog(row)">编辑</el-button>
              <el-button link type="danger" @click="removeModel(row)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-tab-pane>

    </el-tabs>

    <el-dialog v-model="planDialog.visible" :title="planDialog.form.id ? '编辑套餐' : '新增套餐'" width="680px" destroy-on-close>
      <el-form :model="planDialog.form" label-width="100px">
        <el-form-item label="套餐编码"><el-input v-model="planDialog.form.planCode" placeholder="如 MONTHLY" /></el-form-item>
        <el-form-item label="套餐名称"><el-input v-model="planDialog.form.planName" /></el-form-item>
        <el-form-item label="套餐类型">
          <el-select v-model="planDialog.form.planType" style="width: 100%">
            <el-option label="免费" value="free" />
            <el-option label="包月" value="monthly" />
            <el-option label="包年" value="yearly" />
            <el-option label="企业版" value="enterprise" />
          </el-select>
        </el-form-item>
        <el-form-item label="价格"><el-input-number v-model="planDialog.form.price" :min="0" :precision="2" style="width: 100%" /></el-form-item>
        <el-form-item label="赠送字数"><el-input-number v-model="planDialog.form.wordQuota" :min="0" style="width: 100%" /></el-form-item>
        <el-form-item label="有效天数"><el-input-number v-model="planDialog.form.durationDays" :min="0" style="width: 100%" /></el-form-item>
        <el-form-item label="排序"><el-input-number v-model="planDialog.form.sortNo" :min="0" style="width: 100%" /></el-form-item>
        <el-form-item label="状态"><el-switch v-model="planDialog.form.status" :active-value="1" :inactive-value="0" active-text="启用" inactive-text="停用" /></el-form-item>
        <el-form-item label="备注"><el-input v-model="planDialog.form.remark" type="textarea" :rows="3" /></el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="planDialog.visible = false">取消</el-button>
        <el-button type="primary" @click="savePlan">保存</el-button>
      </template>
    </el-dialog>


    <el-dialog v-model="modelDialog.visible" :title="modelDialog.form.id ? '编辑模型配置' : '新增模型配置'" width="780px" destroy-on-close>
      <el-alert type="warning" :closable="false" show-icon class="model-alert">
        模型名称仅超级管理员可见。这里只维护 Chat / Rerank 模型；知识库向量化由百炼云服务托管，不再配置 Embedding 模型。
      </el-alert>
      <el-form :model="modelDialog.form" label-width="110px" class="model-form">
        <el-row :gutter="14">
          <el-col :span="12"><el-form-item label="服务商"><el-input v-model="modelDialog.form.provider" placeholder="如 bailian" /></el-form-item></el-col>
          <el-col :span="12"><el-form-item label="模型名称"><el-input v-model="modelDialog.form.modelName" placeholder="如 qwen-plus / qwen-max" /></el-form-item></el-col>
          <el-col :span="12"><el-form-item label="模型类型">
            <el-select v-model="modelDialog.form.modelType" style="width: 100%">
              <el-option label="Chat" value="chat" />
              <el-option label="Rerank" value="rerank" />
            </el-select>
          </el-form-item></el-col>
          <el-col :span="12"><el-form-item label="使用场景">
            <el-select v-model="modelDialog.form.sceneCode" clearable placeholder="为空表示通用" style="width: 100%">
              <el-option v-for="item in sceneOptions" :key="item.value" :label="item.label" :value="item.value" />
            </el-select>
          </el-form-item></el-col>
          <el-col :span="12"><el-form-item label="AI等级">
            <el-select v-model="modelDialog.form.aiLevel" clearable placeholder="为空表示通用" style="width: 100%">
              <el-option label="基础版" value="BASIC" />
              <el-option label="标准版" value="STANDARD" />
              <el-option label="旗舰版" value="FLAGSHIP" />
            </el-select>
          </el-form-item></el-col>
          <el-col :span="12"><el-form-item label="默认模型"><el-switch v-model="modelDialog.form.defaultFlag" :active-value="1" :inactive-value="0" /></el-form-item></el-col>
          <el-col :span="12"><el-form-item label="API地址"><el-input v-model="modelDialog.form.apiBase" placeholder="为空使用 application.yml" /></el-form-item></el-col>
          <el-col :span="12"><el-form-item label="密钥引用"><el-input v-model="modelDialog.form.apiKeyRef" placeholder="如 DASHSCOPE_API_KEY" /></el-form-item></el-col>
          <el-col :span="8"><el-form-item label="温度"><el-input-number v-model="modelDialog.form.temperature" :min="0" :max="2" :step="0.1" style="width: 100%" /></el-form-item></el-col>
          <el-col :span="8"><el-form-item label="最大Token"><el-input-number v-model="modelDialog.form.maxTokens" :min="1" style="width: 100%" /></el-form-item></el-col>
          <el-col :span="8"><el-form-item label="排序"><el-input-number v-model="modelDialog.form.sortNo" :min="0" style="width: 100%" /></el-form-item></el-col>
          <el-col :span="12"><el-form-item label="状态"><el-switch v-model="modelDialog.form.status" :active-value="1" :inactive-value="0" active-text="启用" inactive-text="停用" /></el-form-item></el-col>
          <el-col :span="24"><el-form-item label="备注"><el-input v-model="modelDialog.form.remark" type="textarea" :rows="3" /></el-form-item></el-col>
        </el-row>
      </el-form>
      <template #footer>
        <el-button @click="modelDialog.visible = false">取消</el-button>
        <el-button type="primary" @click="saveModel">保存</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="adjustDialog.visible" title="调整用户额度" width="520px" destroy-on-close>
      <el-alert type="info" :closable="false" show-icon>正数表示增加额度，负数表示扣减额度。所有调整都会写入额度流水。</el-alert>
      <el-form :model="adjustDialog.form" label-width="90px" style="margin-top: 16px">
        <el-form-item label="目标用户"><el-input :value="adjustDialog.user?.fullName || adjustDialog.user?.phone" disabled /></el-form-item>
        <el-form-item label="调整字数"><el-input-number v-model="adjustDialog.form.words" style="width: 100%" /></el-form-item>
        <el-form-item label="备注"><el-input v-model="adjustDialog.form.remark" type="textarea" :rows="3" /></el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="adjustDialog.visible = false">取消</el-button>
        <el-button type="primary" @click="submitAdjust">确认调整</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import {
  adjustMemberQuota,
  confirmMemberOrderPaid,
  createMemberPlan,
  deleteMemberPlan,
  pageAdminQuotaLogs,
  pageMemberAccounts,
  pageMemberOrders,
  pageMemberPlanManage,
  updateMemberPlan
} from '@/api/member'
import { createAiModel, deleteAiModel, pageAiModels, updateAiModel } from '@/api/aiModel'

const route = useRoute()
const auth = useAuthStore()
const activeTab = ref(route.query?.tab === 'models' ? 'models' : 'plans')
const plans = ref([])
const orders = ref([])
const accounts = ref([])
const logs = ref([])
const models = ref([])

const orderQuery = reactive({ keyword: '', status: '' })
const accountQuery = reactive({ keyword: '' })
const logQuery = reactive({ keyword: '' })
const modelQuery = reactive({ keyword: '', modelType: '' })

const planDialog = reactive({ visible: false, form: emptyPlan() })
const adjustDialog = reactive({ visible: false, user: null, form: { words: 100000, remark: '' } })
const modelDialog = reactive({ visible: false, form: emptyModel() })

const canManageModels = computed(() => normalizeRoleList(auth.user?.roles || auth.user?.roleCodes || []).includes('SUPERADMIN'))

const sceneOptions = [
  { label: '通用生成', value: 'GENERIC_GENERATE' },
  { label: '方案文件解析', value: 'SOLUTION_PARSE_EXTRACT' },
  { label: '方案目录生成', value: 'SOLUTION_OUTLINE_GENERATE' },
  { label: '编写方向生成', value: 'SOLUTION_DIRECTION_GENERATE' },
  { label: '章节正文生成', value: 'SOLUTION_SECTION_GENERATE' },
  { label: '全文生成', value: 'SOLUTION_FULL_GENERATE' },
  { label: '章节/全文重写', value: 'SOLUTION_REWRITE' },
  { label: '知识库问答', value: 'KNOWLEDGE_RETRIEVAL_SUMMARY' },
  { label: '知识库向量化', value: 'KNOWLEDGE_EMBEDDING' }
]

onMounted(refreshAll)
watch(() => route.query?.tab, (tab) => {
  if (tab === 'models' && canManageModels.value) activeTab.value = 'models'
})

watch(activeTab, (tab) => {
  if (tab === 'plans') loadPlans()
  if (tab === 'orders') loadOrders()
  if (tab === 'accounts') loadAccounts()
  if (tab === 'logs') loadLogs()
  if (tab === 'models' && canManageModels.value) loadModels()
})

async function refreshAll() {
  const jobs = [loadPlans(), loadOrders(), loadAccounts(), loadLogs()]
  if (canManageModels.value) jobs.push(loadModels())
  await Promise.all(jobs)
}

async function loadPlans() {
  const res = await pageMemberPlanManage({ current: 1, size: 100 })
  plans.value = res?.records || []
}

async function loadOrders() {
  const res = await pageMemberOrders({ current: 1, size: 100, ...orderQuery })
  orders.value = res?.records || []
}

async function loadAccounts() {
  const res = await pageMemberAccounts({ current: 1, size: 100, keyword: accountQuery.keyword })
  accounts.value = res?.records || []
}

async function loadLogs() {
  const res = await pageAdminQuotaLogs({ current: 1, size: 100, keyword: logQuery.keyword })
  logs.value = res?.records || []
}

async function loadModels() {
  if (!canManageModels.value) return
  const params = { current: 1, size: 100, keyword: modelQuery.keyword }
  const res = await pageAiModels(params)
  const records = res?.records || []
  const visibleRecords = records.filter((item) => String(item.modelType || '').toLowerCase() !== 'embedding')
  models.value = modelQuery.modelType ? visibleRecords.filter((item) => item.modelType === modelQuery.modelType) : visibleRecords
}

function emptyPlan() {
  return { planCode: '', planName: '', planType: 'monthly', price: 0, durationDays: 30, wordQuota: 1000000, generateLimitDaily: 0, sortNo: 10, status: 1, remark: '' }
}

function emptyModel() {
  return { provider: 'bailian', modelName: '', modelType: 'chat', sceneCode: '', aiLevel: '', apiBase: '', apiKeyRef: 'DASHSCOPE_API_KEY', temperature: 0.7, maxTokens: 8192, sortNo: 10, defaultFlag: 0, status: 1, remark: '' }
}

function openPlanDialog(row) {
  planDialog.form = row ? { ...row } : emptyPlan()
  planDialog.visible = true
}

async function savePlan() {
  if (!planDialog.form.planCode || !planDialog.form.planName) {
    ElMessage.warning('请填写套餐编码和套餐名称')
    return
  }
  if (planDialog.form.id) await updateMemberPlan(planDialog.form.id, planDialog.form)
  else await createMemberPlan(planDialog.form)
  ElMessage.success('保存成功')
  planDialog.visible = false
  await loadPlans()
}

async function removePlan(row) {
  await ElMessageBox.confirm(`确定删除套餐【${row.planName}】吗？`, '删除确认', { type: 'warning' })
  await deleteMemberPlan(row.id)
  ElMessage.success('删除成功')
  await loadPlans()
}

async function confirmPaid(row) {
  await ElMessageBox.confirm(`确认订单【${row.orderNo}】充值到账吗？`, '确认到账', { type: 'success' })
  await confirmMemberOrderPaid(row.id)
  ElMessage.success('充值已到账')
  await Promise.all([loadOrders(), loadAccounts(), loadLogs()])
}

function openAdjust(row) {
  adjustDialog.user = row
  adjustDialog.form = { words: 100000, remark: '' }
  adjustDialog.visible = true
}

async function submitAdjust() {
  if (!adjustDialog.user?.userId) return
  await adjustMemberQuota(adjustDialog.user.userId, adjustDialog.form)
  ElMessage.success('调整成功')
  adjustDialog.visible = false
  await Promise.all([loadAccounts(), loadLogs()])
}


function openModelDialog(row) {
  modelDialog.form = row ? { ...row } : emptyModel()
  modelDialog.visible = true
}

async function saveModel() {
  if (!modelDialog.form.provider || !modelDialog.form.modelName || !modelDialog.form.modelType) {
    ElMessage.warning('请填写服务商、模型名称和模型类型')
    return
  }
  const payload = { ...modelDialog.form }
  if (payload.sceneCode === '') payload.sceneCode = null
  if (payload.aiLevel === '') payload.aiLevel = null
  if (payload.id) await updateAiModel(payload.id, payload)
  else await createAiModel(payload)
  ElMessage.success('模型配置已保存')
  modelDialog.visible = false
  await loadModels()
}

async function removeModel(row) {
  await ElMessageBox.confirm(`确定删除模型【${row.modelName}】吗？删除后业务不会再选用该模型。`, '删除确认', { type: 'warning' })
  await deleteAiModel(row.id)
  ElMessage.success('删除成功')
  await loadModels()
}

function sceneText(value) {
  if (!value) return '通用'
  return sceneOptions.find((item) => item.value === value)?.label || value
}

function levelText(value) {
  if (!value) return '通用'
  if (value === 'BASIC') return '基础版'
  if (value === 'STANDARD') return '标准版'
  if (value === 'FLAGSHIP') return '旗舰版'
  return value
}

function modelTypeText(value) {
  if (value === 'chat') return 'Chat'
  if (value === 'rerank') return 'Rerank'
  return value || '-'
}

function normalizeRoleCode(value = '') {
  return String(value).trim().toUpperCase().replace(/^ROLE[_-]?/, '').replace(/[^A-Z0-9]/g, '')
}

function normalizeRoleList(values = []) {
  if (!Array.isArray(values)) return []
  return values.map((item) => {
    if (typeof item === 'string') return normalizeRoleCode(item)
    return normalizeRoleCode(item?.roleCode || item?.code || item?.authority || item?.name || '')
  }).filter(Boolean)
}

function planTypeText(type) {
  const value = String(type || '').toLowerCase()
  if (value.includes('month')) return '包月'
  if (value.includes('year')) return '包年'
  if (value.includes('enterprise')) return '企业版'
  if (value === 'free') return '免费'
  return type || '-'
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
</script>

<style scoped>
.member-admin-page { height: 100%; overflow: auto; padding: 18px; box-sizing: border-box; }
.admin-head { display: flex; align-items: center; justify-content: space-between; padding: 24px 28px; border: 1px solid #e6edf7; border-radius: 18px; background: linear-gradient(135deg, #fff, #f0f6ff); }
.eyebrow { color: #2563eb; letter-spacing: 8px; font-weight: 900; font-size: 13px; }
h1, h2, p { margin: 0; }
h1 { margin-top: 10px; color: #0f172a; font-size: 28px; }
p { margin-top: 8px; color: #64748b; }
.admin-tabs { margin-top: 14px; padding: 18px; border-radius: 18px; background: #fff; border: 1px solid #e6edf7; }
.toolbar { display: flex; gap: 10px; align-items: center; margin-bottom: 12px; }
.toolbar .el-input { max-width: 280px; }
.toolbar .el-select { width: 150px; }
.model-toolbar .el-select { width: 170px; }
.model-alert { margin-bottom: 12px; }
.model-form { margin-top: 14px; }
.muted { color: #94a3b8; }
.plus { color: #16a34a; font-weight: 800; }
.minus { color: #ef4444; font-weight: 800; }
:deep(.ui-table .el-table__header-wrapper th .cell) { white-space: nowrap; }
</style>
