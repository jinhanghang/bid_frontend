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
          <el-button type="primary" @click="searchOrders">搜索</el-button>
        </div>
        <el-table :data="orders" class="ui-table" height="520">
          <el-table-column prop="orderNo" label="订单号" min-width="180" show-overflow-tooltip />
          <el-table-column prop="planName" label="套餐" min-width="130" show-overflow-tooltip />
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
        <PageFooterPager
          :total="orderPager.total"
          v-model:page="orderPager.current"
          v-model:size="orderPager.size"
          @change="loadOrders"
        />
      </el-tab-pane>

      <el-tab-pane label="用户额度" name="accounts">
        <div class="toolbar">
          <el-input v-model="accountQuery.keyword" placeholder="搜索用户 / 手机号 / 企业" clearable @keyup.enter="searchAccounts" />
          <el-button type="primary" @click="searchAccounts">搜索</el-button>
        </div>
        <el-table :data="accounts" class="ui-table" height="520">
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
        <PageFooterPager
          :total="accountPager.total"
          v-model:page="accountPager.current"
          v-model:size="accountPager.size"
          @change="loadAccounts"
        />
      </el-tab-pane>

      <el-tab-pane label="消耗流水" name="logs">
        <div class="toolbar">
          <el-input v-model="logQuery.keyword" placeholder="搜索场景 / 业务 / 备注" clearable @keyup.enter="loadLogs" />
          <el-button type="primary" @click="searchLogs">搜索</el-button>
          <el-button plain @click="openQuotaAudit">额度核对</el-button>
          <el-tooltip content="只读检查，不会修改任何额度；用于排查余额、流水链路、预占未结算等异常" placement="top">
            <el-button link type="primary">怎么用</el-button>
          </el-tooltip>
        </div>
        <el-table :data="logs" class="ui-table" height="520">
          <el-table-column prop="userId" label="用户ID" width="90" show-overflow-tooltip />
          <el-table-column label="场景" width="110">
            <template #default="{ row }"><el-tag effect="plain">{{ quotaSceneText(row.scene) }}</el-tag></template>
          </el-table-column>
          <el-table-column label="业务类型" width="130">
            <template #default="{ row }">{{ bizTypeText(row.bizType) }}</template>
          </el-table-column>
          <el-table-column label="变动字数" width="120"><template #default="{ row }"><span :class="Number(row.words || 0) >= 0 ? 'plus' : 'minus'">{{ Number(row.words || 0) > 0 ? '+' : '' }}{{ formatNumber(row.words) }}</span></template></el-table-column>
          <el-table-column prop="beforeWords" label="变动前" width="110" />
          <el-table-column prop="afterWords" label="变动后" width="110" />
          <el-table-column prop="remark" label="说明" min-width="220" show-overflow-tooltip />
          <el-table-column prop="createTime" label="时间" min-width="160" />
        </el-table>
        <PageFooterPager
          :total="logPager.total"
          v-model:page="logPager.current"
          v-model:size="logPager.size"
          @change="loadLogs"
        />
      </el-tab-pane>

      <el-tab-pane v-if="canManageModels" label="模型管理" name="models">
        <div class="toolbar model-toolbar">
          <el-input v-model="modelQuery.keyword" placeholder="搜索服务商 / 模型 / 场景 / 备注" clearable @keyup.enter="loadModels" />
          <el-select v-model="modelQuery.modelType" placeholder="模型类型" clearable>
            <el-option label="Chat" value="chat" />
            <el-option label="Rerank" value="rerank" />
          </el-select>
          <el-button type="primary" @click="loadModels">搜索</el-button>
          <el-button plain @click="openDiagnose">配置体检</el-button>
          <el-button type="primary" plain @click="openModelDialog()">新增模型</el-button>
        </div>

        <div class="model-flow-card">
          <div class="model-flow-title">模型调用闭环</div>
          <div class="model-flow-steps">
            <span>套餐/项目选择 AI等级</span>
            <em>→</em>
            <span>AI方案 / AI文档 / 知识库问答传入场景</span>
            <em>→</em>
            <span>模型管理按“场景 + 等级”解析真实模型</span>
            <em>→</em>
            <span>生成结果、额度流水、任务日志形成闭环</span>
          </div>
        </div>

        <el-table :data="models" class="ui-table" height="500">
          <el-table-column prop="provider" label="服务商" width="110" />
          <el-table-column prop="modelName" label="模型名称" min-width="210" show-overflow-tooltip />
          <el-table-column label="类型" width="100">
            <template #default="{ row }"><el-tag>{{ modelTypeText(row.modelType) }}</el-tag></template>
          </el-table-column>
          <el-table-column label="生效范围" min-width="240" show-overflow-tooltip>
            <template #default="{ row }">{{ scopeText(row) }}</template>
          </el-table-column>
          <el-table-column label="默认" width="80">
            <template #default="{ row }"><el-tag v-if="row.defaultFlag === 1" type="success">默认</el-tag><span v-else class="muted">-</span></template>
          </el-table-column>
          <el-table-column label="状态" width="90">
            <template #default="{ row }"><el-tag :type="row.status === 1 ? 'success' : 'info'">{{ row.status === 1 ? '启用' : '停用' }}</el-tag></template>
          </el-table-column>
          <el-table-column label="影响模块" min-width="210" show-overflow-tooltip>
            <template #default="{ row }">{{ effectModulesText(row) }}</template>
          </el-table-column>
          <el-table-column prop="remark" label="备注" min-width="180" show-overflow-tooltip />
          <el-table-column label="操作" width="190" fixed="right">
            <template #default="{ row }">
              <el-button link type="primary" @click="previewModel(row)">预览</el-button>
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


    <el-dialog v-model="modelDialog.visible" :title="modelDialog.form.id ? '编辑模型配置' : '新增模型配置'" width="820px" destroy-on-close>
      <el-alert type="warning" :closable="false" show-icon class="model-alert">
        模型名称、接口地址、密钥引用仅超级管理员可见。默认模型是全局兜底模型，开启后会自动清空使用场景和 AI等级。
      </el-alert>
      <el-form :model="modelDialog.form" label-width="110px" class="model-form">
        <el-row :gutter="14">
          <el-col :span="12"><el-form-item label="服务商"><el-input v-model="modelDialog.form.provider" placeholder="如 bailian" /></el-form-item></el-col>
          <el-col :span="12"><el-form-item label="模型名称"><el-input v-model="modelDialog.form.modelName" placeholder="如 qwen-plus / qwen-max" /></el-form-item></el-col>
          <el-col :span="12"><el-form-item label="模型类型">
            <el-select v-model="modelDialog.form.modelType" style="width: 100%">
              <el-option label="Chat：文本生成主链路" value="chat" />
              <el-option label="Rerank：知识库排序预留" value="rerank" />
            </el-select>
          </el-form-item></el-col>
          <el-col :span="12"><el-form-item label="默认模型">
            <div class="switch-line">
              <el-switch v-model="modelDialog.form.defaultFlag" :active-value="1" :inactive-value="0" />
              <span class="form-tip">作为全局兜底，只允许一个默认模型</span>
            </div>
          </el-form-item></el-col>
          <el-col :span="12"><el-form-item label="使用场景">
            <el-select v-model="modelDialog.form.sceneCode" :disabled="modelDialog.form.defaultFlag === 1" clearable placeholder="为空表示通用" style="width: 100%">
              <el-option v-for="item in sceneOptions" :key="item.value" :label="item.label" :value="item.value" />
            </el-select>
          </el-form-item></el-col>
          <el-col :span="12"><el-form-item label="AI等级">
            <el-select v-model="modelDialog.form.aiLevel" :disabled="modelDialog.form.defaultFlag === 1" clearable placeholder="为空表示通用" style="width: 100%">
              <el-option label="基础版" value="BASIC" />
              <el-option label="标准版" value="STANDARD" />
              <el-option label="旗舰版" value="FLAGSHIP" />
            </el-select>
          </el-form-item></el-col>
          <el-col :span="12"><el-form-item label="API地址"><el-input v-model="modelDialog.form.apiBase" placeholder="为空使用 application.yml" /></el-form-item></el-col>
          <el-col :span="12"><el-form-item label="密钥引用"><el-input v-model="modelDialog.form.apiKeyRef" placeholder="如 DASHSCOPE_API_KEY" /></el-form-item></el-col>
          <el-col :span="12"><el-form-item label="排序"><el-input-number v-model="modelDialog.form.sortNo" :min="0" style="width: 100%" /></el-form-item></el-col>
          <el-col :span="12"><el-form-item label="状态"><el-switch v-model="modelDialog.form.status" :active-value="1" :inactive-value="0" active-text="启用" inactive-text="停用" /></el-form-item></el-col>
          <el-col :span="24"><el-form-item label="备注"><el-input v-model="modelDialog.form.remark" type="textarea" :rows="3" placeholder="建议写清楚：适用模块、等级、成本或稳定性说明" /></el-form-item></el-col>
        </el-row>
      </el-form>
      <template #footer>
        <el-button @click="modelDialog.visible = false">取消</el-button>
        <el-button plain @click="previewModel(modelDialog.form)">预览命中</el-button>
        <el-button type="primary" @click="saveModel">保存</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="diagnoseDialog.visible" title="模型配置体检" width="1080px" destroy-on-close>
      <el-alert type="info" :closable="false" show-icon class="model-alert">
        体检不会真实调用大模型，只检查当前配置在 AI方案、AI文档、知识库问答等场景下最终会命中哪个 Chat 模型。
      </el-alert>
      <el-table v-loading="diagnoseDialog.loading" :data="diagnoseDialog.records" class="ui-table" height="560">
        <el-table-column prop="sceneName" label="业务场景" min-width="170" show-overflow-tooltip />
        <el-table-column prop="aiLevelName" label="AI等级" width="90" />
        <el-table-column prop="effectiveRule" label="命中规则" min-width="150" />
        <el-table-column prop="provider" label="服务商" width="100" />
        <el-table-column prop="modelName" label="模型名称" min-width="210" show-overflow-tooltip />
        <el-table-column label="状态" width="100">
          <template #default="{ row }"><el-tag :type="diagnoseStatusType(row.status)">{{ diagnoseStatusText(row.status) }}</el-tag></template>
        </el-table-column>
        <el-table-column prop="warning" label="提示" min-width="260" show-overflow-tooltip />
      </el-table>
      <template #footer>
        <el-button @click="diagnoseDialog.visible = false">关闭</el-button>
        <el-button type="primary" @click="loadDiagnose">重新体检</el-button>
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

    <el-dialog v-model="auditDialog.visible" title="额度消耗流水核对" width="1080px" destroy-on-close>
      <div v-loading="auditDialog.loading" class="quota-audit-box">
        <div class="quota-audit-guide">
          <div>
            <strong>这个功能怎么用</strong>
            <p>这是管理员排查额度异常的只读工具，不会自动修改用户额度。正常情况下打开后显示“核对通过”；出现异常时按下面明细处理。</p>
          </div>
          <ul>
            <li><b>余额异常</b>：用户权益表余额与最后一条额度流水余额不一致。</li>
            <li><b>链路异常</b>：同一用户流水 before/after 没有首尾衔接，通常和并发扣减或手工改数有关。</li>
            <li><b>负数权益</b>：会员权益剩余额度小于 0，需要检查扣减逻辑。</li>
            <li><b>未结算预占</b>：AI 任务预占额度超过 120 分钟仍未结算或释放。</li>
          </ul>
        </div>
        <template v-if="auditDialog.result">
          <el-alert
            :title="auditDialog.result.conclusion || '核对完成'"
            :type="totalAuditIssueCount > 0 ? 'warning' : 'success'"
            show-icon
            :closable="false"
          />
          <div class="audit-summary-grid">
            <div><span>用户数</span><strong>{{ formatNumber(auditDialog.result.userCount) }}</strong></div>
            <div><span>流水数</span><strong>{{ formatNumber(auditDialog.result.logRecordCount) }}</strong></div>
            <div><span>余额异常</span><strong>{{ formatNumber(auditDialog.result.balanceIssueCount) }}</strong></div>
            <div><span>链路异常</span><strong>{{ formatNumber(auditDialog.result.chainIssueCount) }}</strong></div>
            <div><span>负数权益</span><strong>{{ formatNumber(auditDialog.result.negativeMemberIssueCount) }}</strong></div>
            <div><span>未结算预占</span><strong>{{ formatNumber(auditDialog.result.openReservationIssueCount) }}</strong></div>
          </div>

          <div v-if="totalAuditIssueCount === 0" class="audit-ok-tip">
            当前无需处理。后续如果出现“用户说额度不对、AI生成失败但额度被占用、重复扣减”等情况，再打开本工具重新核对。
          </div>

          <div class="audit-section-title">用户额度异常</div>
          <el-table :data="auditDialog.result.userIssues || []" class="ui-table" height="240" empty-text="暂无用户额度异常">
            <el-table-column label="类型" width="170">
              <template #default="{ row }">{{ quotaIssueTypeText(row.issueType) }}</template>
            </el-table-column>
            <el-table-column prop="fullName" label="姓名" width="120" show-overflow-tooltip />
            <el-table-column prop="phone" label="手机号" width="130" show-overflow-tooltip />
            <el-table-column prop="actualAvailableWords" label="权益余额" width="110" />
            <el-table-column prop="latestLogAfterWords" label="流水余额" width="110" />
            <el-table-column prop="message" label="说明" min-width="280" show-overflow-tooltip />
          </el-table>

          <div class="audit-section-title">预占额度异常</div>
          <el-table :data="auditDialog.result.reservationIssues || []" class="ui-table" height="220" empty-text="暂无未结算预占异常">
            <el-table-column label="业务类型" width="130">
              <template #default="{ row }">{{ bizTypeText(row.bizType) }}</template>
            </el-table-column>
            <el-table-column prop="bizId" label="业务ID" width="190" show-overflow-tooltip />
            <el-table-column prop="reserveWords" label="预占字数" width="110" />
            <el-table-column prop="reserveTime" label="预占时间" width="170" />
            <el-table-column prop="message" label="说明" min-width="300" show-overflow-tooltip />
          </el-table>
        </template>
      </div>
      <template #footer>
        <el-button @click="auditDialog.visible = false">关闭</el-button>
        <el-button type="primary" :loading="auditDialog.loading" @click="runQuotaAudit">重新核对</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import PageFooterPager from '@/components/PageFooterPager.vue'
import {
  adjustMemberQuota,
  auditQuotaUsageLogs,
  confirmMemberOrderPaid,
  createMemberPlan,
  deleteMemberPlan,
  pageAdminQuotaLogs,
  pageMemberAccounts,
  pageMemberOrders,
  pageMemberPlanManage,
  updateMemberPlan
} from '@/api/member'
import { createAiModel, deleteAiModel, diagnoseAiModels, pageAiModels, previewAiModel, updateAiModel } from '@/api/aiModel'

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

const orderPager = reactive({ current: 1, size: 10, total: 0 })
const accountPager = reactive({ current: 1, size: 10, total: 0 })
const logPager = reactive({ current: 1, size: 10, total: 0 })

const planDialog = reactive({ visible: false, form: emptyPlan() })
const adjustDialog = reactive({ visible: false, user: null, form: { words: 100000, remark: '' } })
const auditDialog = reactive({ visible: false, loading: false, result: null })
const modelDialog = reactive({ visible: false, form: emptyModel() })
const diagnoseDialog = reactive({ visible: false, loading: false, records: [] })

const canManageModels = computed(() => normalizeRoleList(auth.user?.roles || auth.user?.roleCodes || []).includes('SUPERADMIN'))
const totalAuditIssueCount = computed(() => {
  const r = auditDialog.result || {}
  return Number(r.balanceIssueCount || 0) + Number(r.chainIssueCount || 0) + Number(r.negativeMemberIssueCount || 0) + Number(r.openReservationIssueCount || 0)
})

const sceneOptions = [
  { label: '通用生成', value: 'GENERIC_GENERATE' },
  { label: '方案文件解析', value: 'SOLUTION_PARSE_EXTRACT' },
  { label: '方案目录生成', value: 'SOLUTION_OUTLINE_GENERATE' },
  { label: '编写方向生成', value: 'SOLUTION_DIRECTION_GENERATE' },
  { label: '章节正文生成', value: 'SOLUTION_SECTION_GENERATE' },
  { label: '全文生成', value: 'SOLUTION_FULL_GENERATE' },
  { label: '章节/全文重写', value: 'SOLUTION_REWRITE' },
  { label: 'AI二次审稿', value: 'SOLUTION_AI_REVIEW' },
  { label: '知识库问答', value: 'KNOWLEDGE_RETRIEVAL_SUMMARY' }
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

watch(() => modelDialog.form.defaultFlag, (value) => {
  if (value === 1) {
    modelDialog.form.sceneCode = ''
    modelDialog.form.aiLevel = ''
  }
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
  const res = await pageMemberOrders({ current: orderPager.current, size: orderPager.size, ...orderQuery })
  orders.value = res?.records || []
  orderPager.total = Number(res?.total || 0)
}

function searchOrders() {
  orderPager.current = 1
  loadOrders()
}

async function loadAccounts() {
  const res = await pageMemberAccounts({ current: accountPager.current, size: accountPager.size, keyword: accountQuery.keyword })
  accounts.value = res?.records || []
  accountPager.total = Number(res?.total || 0)
}

function searchAccounts() {
  accountPager.current = 1
  loadAccounts()
}

async function loadLogs() {
  const res = await pageAdminQuotaLogs({ current: logPager.current, size: logPager.size, keyword: logQuery.keyword })
  logs.value = res?.records || []
  logPager.total = Number(res?.total || 0)
}

function searchLogs() {
  logPager.current = 1
  loadLogs()
}

async function openQuotaAudit() {
  auditDialog.visible = true
  await runQuotaAudit()
}

async function runQuotaAudit() {
  auditDialog.loading = true
  try {
    auditDialog.result = await auditQuotaUsageLogs({ issueLimit: 200 })
  } finally {
    auditDialog.loading = false
  }
}

async function loadModels() {
  if (!canManageModels.value) return
  const params = { current: 1, size: 100, keyword: modelQuery.keyword, modelType: modelQuery.modelType }
  const res = await pageAiModels(params)
  models.value = (res?.records || []).filter((item) => String(item.modelType || '').toLowerCase() !== 'embedding')
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
  modelDialog.form = row ? normalizeModelForm(row) : emptyModel()
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

function normalizeModelForm(row = {}) {
  return {
    ...emptyModel(),
    ...row,
    sceneCode: row.sceneCode || '',
    aiLevel: row.aiLevel || '',
    apiBase: row.apiBase || '',
    apiKeyRef: row.apiKeyRef || 'DASHSCOPE_API_KEY',
    defaultFlag: row.defaultFlag || 0,
    status: row.status == null ? 1 : row.status
  }
}

async function openDiagnose() {
  diagnoseDialog.visible = true
  await loadDiagnose()
}

async function loadDiagnose() {
  diagnoseDialog.loading = true
  try {
    diagnoseDialog.records = await diagnoseAiModels() || []
  } finally {
    diagnoseDialog.loading = false
  }
}

async function previewModel(row) {
  const payload = {
    modelType: row?.modelType || 'chat',
    sceneCode: row?.defaultFlag === 1 ? '' : (row?.sceneCode || ''),
    aiLevel: row?.defaultFlag === 1 ? '' : (row?.aiLevel || '')
  }
  const result = await previewAiModel(payload)
  const text = [
    `业务场景：${result?.sceneName || sceneText(payload.sceneCode)}`,
    `AI等级：${result?.aiLevelName || levelText(payload.aiLevel)}`,
    `命中规则：${result?.effectiveRule || '-'}`,
    `模型名称：${result?.modelName || '-'}`,
    `服务商：${result?.provider || '-'}`,
    result?.warning ? `提示：${result.warning}` : ''
  ].filter(Boolean).join('\n')
  ElMessageBox.alert(text, '模型命中预览', { confirmButtonText: '知道了' })
}

function quotaIssueTypeText(value) {
  const map = {
    BALANCE_MISMATCH: '余额不一致',
    LOG_CHAIN_BREAK: '流水链路断裂',
    NEGATIVE_MEMBER_BALANCE: '权益余额为负'
  }
  return map[value] || value || '-'
}

function quotaSceneText(value) {
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

function scopeText(row) {
  if (!row) return '-'
  if (row.defaultFlag === 1) return '全局默认兜底'
  const scene = sceneText(row.sceneCode)
  const level = levelText(row.aiLevel)
  if (!row.sceneCode && !row.aiLevel) return '通用模型'
  if (row.sceneCode && row.aiLevel) return `${scene} / ${level}`
  if (row.sceneCode) return `${scene} / 全部等级`
  return `全部场景 / ${level}`
}

function effectModulesText(row) {
  const type = String(row?.modelType || '').toLowerCase()
  if (type === 'rerank') return '知识库检索排序增强预留'
  if (!row?.sceneCode) return 'AI方案、AI文档、知识库问答通用兜底'
  if (row.sceneCode === 'SOLUTION_AI_REVIEW') return 'AI方案、AI文档、AI标书审稿链路'
  if (String(row.sceneCode).startsWith('SOLUTION_')) return 'AI方案、AI文档、AI标书生成链路'
  if (row.sceneCode === 'KNOWLEDGE_RETRIEVAL_SUMMARY') return '知识库问答总结'
  return '通用AI生成'
}

function diagnoseStatusText(status) {
  if (status === 'OK') return '正常'
  if (status === 'FALLBACK') return '配置兜底'
  if (status === 'MISSING') return '缺失'
  return status || '-'
}

function diagnoseStatusType(status) {
  if (status === 'OK') return 'success'
  if (status === 'FALLBACK') return 'warning'
  if (status === 'MISSING') return 'danger'
  return 'info'
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
.page-footer-pager { margin-top: 10px; justify-content: flex-end; }
.model-toolbar .el-select { width: 170px; }
.model-flow-card { margin-bottom: 12px; padding: 14px 16px; border: 1px solid #e6edf7; border-radius: 14px; background: linear-gradient(135deg, #f8fbff, #ffffff); }
.model-flow-title { font-size: 15px; font-weight: 800; color: #0f172a; margin-bottom: 8px; }
.model-flow-steps { display: flex; align-items: center; flex-wrap: wrap; gap: 8px; color: #1f2937; font-size: 13px; }
.model-flow-steps span { padding: 5px 9px; border-radius: 999px; background: #eef4ff; border: 1px solid #dbeafe; }
.model-flow-steps em { color: #94a3b8; font-style: normal; }
.model-flow-desc { margin-top: 8px; color: #64748b; font-size: 13px; line-height: 1.7; }
.model-alert { margin-bottom: 12px; }
.model-form { margin-top: 14px; }
.switch-line { display: flex; align-items: center; gap: 10px; }
.form-tip { color: #64748b; font-size: 12px; }
.muted { color: #94a3b8; }
.plus { color: #16a34a; font-weight: 800; }
.minus { color: #ef4444; font-weight: 800; }
:deep(.ui-table .el-table__header-wrapper th .cell) { white-space: nowrap; }
.quota-audit-box { min-height: 260px; }
.audit-summary-grid { display: grid; grid-template-columns: repeat(6, minmax(0, 1fr)); gap: 10px; margin: 14px 0; }
.audit-summary-grid > div { padding: 12px; border: 1px solid #e5e7eb; border-radius: 12px; background: #f8fafc; }
.audit-summary-grid span { display: block; color: #64748b; font-size: 12px; }
.audit-summary-grid strong { display: block; margin-top: 6px; color: #0f172a; font-size: 18px; }
.audit-section-title { margin: 14px 0 8px; font-weight: 700; color: #1e293b; }

.quota-audit-guide { margin-bottom: 12px; padding: 14px 16px; border: 1px solid #dbeafe; border-radius: 14px; background: linear-gradient(135deg, #f8fbff, #ffffff); color: #334155; }
.quota-audit-guide strong { display: block; color: #0f172a; font-size: 15px; margin-bottom: 6px; }
.quota-audit-guide p { margin: 0; color: #64748b; line-height: 1.7; }
.quota-audit-guide ul { margin: 10px 0 0; padding-left: 18px; color: #475569; line-height: 1.8; }
.audit-ok-tip { margin: 10px 0 2px; padding: 10px 12px; border-radius: 10px; background: #f0fdf4; color: #166534; font-size: 13px; line-height: 1.7; }

</style>
