<template>
  <div class="page">
    <div class="page-body">
      <template v-if="isAuditPage">
        <div class="card audit-guide-card">
          <div class="audit-guide-main">
            <div>
              <div class="audit-guide-title">公司审批怎么用</div>
              <div class="audit-guide-desc">
                这里主要处理用户提交的“加入已有企业”申请；注册新企业提交后会自动通过。没有数据通常表示当前没有待处理申请，或被上方筛选条件过滤。
              </div>
            </div>
            <div class="audit-guide-actions">
              <el-button plain @click="setAuditStatus(0)">只看待审核</el-button>
              <el-button plain @click="resetAuditFilters">查看全部</el-button>
              <el-button type="primary" plain :loading="auditLoading" @click="loadAuditList">刷新</el-button>
            </div>
          </div>
          <div class="audit-guide-steps">
            <span>用户申请加入已有企业</span>
            <em>→</em>
            <span>管理员在本页查看详情</span>
            <em>→</em>
            <span>通过后加入目标企业</span>
            <em>→</em>
            <span>驳回时填写原因</span>
          </div>
        </div>

        <div class="card card--table apply-card">
          <div class="list-head">
            <div class="list-head__left">
              <el-input
                v-model="auditQuery.keyword"
                class="filter-input"
                clearable
                placeholder="按企业名称 / 申请人 / 手机号 / 信用代码自动查询"
              />
            </div>
            <div class="list-head__right">
              <el-select v-model="auditQuery.applyType" clearable placeholder="申请类型" style="width: 150px" @change="handleAuditFilterChange">
                <el-option label="加入已有企业" value="JOIN" />
                <el-option label="注册新企业" value="REGISTER" />
              </el-select>
              <el-select v-model="auditQuery.status" clearable placeholder="审核状态" style="width: 130px" @change="handleAuditFilterChange">
                <el-option label="待审核" :value="0" />
                <el-option label="已通过" :value="1" />
                <el-option label="已驳回" :value="2" />
              </el-select>
              <el-button plain @click="resetAuditFilters">全部</el-button>
            </div>
          </div>

          <el-table
            v-loading="auditLoading"
            class="ui-table"
            :data="auditRows"
            border
            height="calc(100vh - 230px)"
          >
            <el-table-column prop="id" label="ID" width="80" />
            <el-table-column prop="applyTypeName" label="申请类型" min-width="120" />
            <el-table-column prop="enterpriseName" label="企业名称" min-width="220" show-overflow-tooltip />
            <el-table-column prop="creditCode" label="统一社会信用代码" min-width="180" show-overflow-tooltip />
            <el-table-column prop="applicantName" label="申请人" min-width="120" />
            <el-table-column prop="applicantPhone" label="手机号" min-width="130" />
            <el-table-column prop="statusName" label="状态" width="100">
              <template #default="{ row }">
                <el-tag :type="statusTagType(row.status)">{{ row.statusName }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="createTime" label="申请时间" min-width="170" show-overflow-tooltip />
            <el-table-column prop="auditTime" label="审核时间" min-width="170" show-overflow-tooltip />
            <el-table-column label="操作" fixed="right" width="190">
              <template #default="{ row }">
                <div class="table-actions">
                  <el-button size="small" @click="openDetail(row)">详情</el-button>
                  <el-button
                    v-if="row.status === 0"
                    size="small"
                    type="primary"
                    @click="openAudit(row, 1)"
                  >
                    通过
                  </el-button>
                  <el-button
                    v-if="row.status === 0"
                    size="small"
                    type="danger"
                    plain
                    @click="openAudit(row, 2)"
                  >
                    驳回
                  </el-button>
                </div>
              </template>
            </el-table-column>
            <template #empty>
              <div class="audit-empty">
                <div class="audit-empty-title">{{ auditEmptyTitle }}</div>
                <div class="audit-empty-desc">{{ auditEmptyDesc }}</div>
                <div class="audit-empty-actions">
                  <el-button size="small" plain @click="resetAuditFilters">查看全部申请</el-button>
                  <el-button size="small" type="primary" plain @click="loadAuditList">重新查询</el-button>
                </div>
              </div>
            </template>
          </el-table>

          <PageFooterPager
            v-model:page="auditQuery.pageNum"
            v-model:size="auditQuery.pageSize"
            :total="auditTotal"
            @change="loadAuditList"
          />
        </div>
      </template>

      <template v-else>
        <el-alert
          v-if="$route.query.required === '1'"
          title="企业信息为必填项"
          description="注册新企业将立即创建并生效；加入已有企业需等待管理员审批。"
          type="warning"
          show-icon
          :closable="false"
          style="margin-bottom: 16px"
        />
        <div class="apply-hero card">
          <div>
            <div class="apply-title">你还没有加入企业</div>
            <div class="apply-sub">
              请选择“注册新企业”或“加入已有企业”。注册新企业提交后立即创建，你会成为该企业管理员；加入已有企业需要等待管理员审批。
            </div>
          </div>
        </div>

        <div class="apply-grid">
          <div class="card apply-form-card">
            <el-tabs v-model="activeTab">
              <el-tab-pane label="注册新企业" name="register">
                <el-form
                  ref="registerFormRef"
                  :model="registerForm"
                  :rules="registerRules"
                  label-width="130px"
                >
                  <el-form-item label="企业名称" prop="enterpriseName">
                    <el-input v-model="registerForm.enterpriseName" placeholder="请输入企业名称" />
                  </el-form-item>
                  <el-form-item label="统一信用代码" prop="creditCode">
                    <el-input v-model="registerForm.creditCode" placeholder="请输入统一社会信用代码" maxlength="18" />
                  </el-form-item>
                  <el-form-item label="法定代表人">
                    <el-input v-model="registerForm.legalPerson" placeholder="请输入法定代表人，可选" />
                  </el-form-item>
                  <el-form-item label="联系人">
                    <el-input v-model="registerForm.contactName" placeholder="请输入联系人" />
                  </el-form-item>
                  <el-form-item label="联系电话">
                    <el-input v-model="registerForm.contactPhone" placeholder="请输入联系电话" />
                  </el-form-item>
                  <el-form-item label="邮箱">
                    <el-input v-model="registerForm.email" placeholder="请输入邮箱，可选" />
                  </el-form-item>
                  <el-form-item label="企业地址">
                    <el-input v-model="registerForm.address" placeholder="请输入企业地址，可选" />
                  </el-form-item>
                  <el-form-item label="申请说明">
                    <el-input
                      v-model="registerForm.remark"
                      type="textarea"
                      :rows="4"
                      placeholder="可以填写企业背景、使用场景、审核说明等"
                    />
                  </el-form-item>
                  <el-form-item>
                    <el-button type="primary" :loading="submitLoading" @click="submitRegister">立即注册企业</el-button>
                  </el-form-item>
                </el-form>
              </el-tab-pane>

              <el-tab-pane label="加入已有企业" name="join">
                <el-form
                  ref="joinFormRef"
                  :model="joinForm"
                  :rules="joinRules"
                  label-width="130px"
                >
                  <el-form-item label="选择企业" prop="enterpriseId">
                    <el-select
                      v-model="joinForm.enterpriseId"
                      filterable
                      remote
                      clearable
                      reserve-keyword
                      placeholder="请输入企业名称搜索"
                      :remote-method="loadEnterpriseOptions"
                      :loading="enterpriseLoading"
                      style="width: 100%"
                    >
                      <el-option
                        v-for="item in enterpriseOptions"
                        :key="item.id"
                        :label="item.enterpriseName"
                        :value="item.id"
                      />
                    </el-select>
                  </el-form-item>
                  <el-form-item label="申请人姓名">
                    <el-input v-model="joinForm.applicantName" placeholder="默认使用当前用户名称" />
                  </el-form-item>
                  <el-form-item label="联系电话">
                    <el-input v-model="joinForm.contactPhone" placeholder="默认使用当前手机号" />
                  </el-form-item>
                  <el-form-item label="申请说明">
                    <el-input
                      v-model="joinForm.remark"
                      type="textarea"
                      :rows="4"
                      placeholder="请输入加入企业的原因，方便管理员审核"
                    />
                  </el-form-item>
                  <el-form-item>
                    <el-button type="primary" :loading="submitLoading" @click="submitJoin">提交加入企业申请</el-button>
                  </el-form-item>
                </el-form>
              </el-tab-pane>
            </el-tabs>
          </div>

          <div class="card card--table my-apply-card">
            <div class="section-title">我的申请记录</div>
            <el-table
              v-loading="myLoading"
              class="ui-table"
              :data="myRows"
              border
              height="450"
            >
              <el-table-column prop="applyTypeName" label="类型" min-width="120" />
              <el-table-column prop="enterpriseName" label="企业名称" min-width="180" show-overflow-tooltip />
              <el-table-column prop="statusName" label="状态" width="100">
                <template #default="{ row }">
                  <el-tag :type="statusTagType(row.status)">{{ row.statusName }}</el-tag>
                </template>
              </el-table-column>
              <el-table-column prop="createTime" label="提交时间" min-width="170" show-overflow-tooltip />
              <el-table-column label="操作" width="90">
                <template #default="{ row }">
                  <el-button size="small" @click="openDetail(row)">详情</el-button>
                </template>
              </el-table-column>
            </el-table>
            <PageFooterPager
              v-model:page="myQuery.pageNum"
              v-model:size="myQuery.pageSize"
              :total="myTotal"
              @change="loadMyList"
            />
          </div>
        </div>
      </template>
    </div>

    <el-dialog v-model="detailVisible" title="企业申请详情" width="720px">
      <el-descriptions v-if="currentRow" :column="2" border>
        <el-descriptions-item label="申请类型">{{ currentRow.applyTypeName }}</el-descriptions-item>
        <el-descriptions-item label="审核状态">{{ currentRow.statusName }}</el-descriptions-item>
        <el-descriptions-item label="企业名称">{{ currentRow.enterpriseName || '-' }}</el-descriptions-item>
        <el-descriptions-item label="统一信用代码">{{ currentRow.creditCode || '-' }}</el-descriptions-item>
        <el-descriptions-item label="法定代表人">{{ currentRow.legalPerson || '-' }}</el-descriptions-item>
        <el-descriptions-item label="联系人">{{ currentRow.contactName || '-' }}</el-descriptions-item>
        <el-descriptions-item label="联系电话">{{ currentRow.contactPhone || currentRow.applicantPhone || '-' }}</el-descriptions-item>
        <el-descriptions-item label="邮箱">{{ currentRow.email || '-' }}</el-descriptions-item>
        <el-descriptions-item label="申请人">{{ currentRow.applicantName || currentRow.userFullName || '-' }}</el-descriptions-item>
        <el-descriptions-item label="申请手机号">{{ currentRow.applicantPhone || currentRow.userPhone || '-' }}</el-descriptions-item>
        <el-descriptions-item label="申请时间">{{ currentRow.createTime || '-' }}</el-descriptions-item>
        <el-descriptions-item label="审核时间">{{ currentRow.auditTime || '-' }}</el-descriptions-item>
        <el-descriptions-item label="企业地址" :span="2">{{ currentRow.address || '-' }}</el-descriptions-item>
        <el-descriptions-item label="申请说明" :span="2">{{ currentRow.remark || '-' }}</el-descriptions-item>
        <el-descriptions-item label="审核意见" :span="2">{{ currentRow.auditRemark || '-' }}</el-descriptions-item>
      </el-descriptions>
    </el-dialog>

    <el-dialog v-model="auditVisible" :title="auditForm.status === 1 ? '通过申请' : '驳回申请'" width="520px">
      <el-form label-width="90px">
        <el-form-item label="审核意见">
          <el-input
            v-model="auditForm.auditRemark"
            type="textarea"
            :rows="4"
            :placeholder="auditForm.status === 1 ? '可填写通过说明' : '请输入驳回原因'"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="auditVisible = false">取消</el-button>
        <el-button :type="auditForm.status === 1 ? 'primary' : 'danger'" :loading="auditSubmitting" @click="submitAudit">
          确认{{ auditForm.status === 1 ? '通过' : '驳回' }}
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { ElMessage, ElMessageBox } from '@/plugins/element-plus-api'
import { useRoute, useRouter } from 'vue-router'
import PageFooterPager from '@/components/PageFooterPager.vue'
import { listEnterprises } from '@/api/enterprise'
import {
  auditEnterpriseApply,
  getEnterpriseApply,
  pageEnterpriseApplies,
  pageMyEnterpriseApplies,
  submitJoinApply,
  submitRegisterApply
} from '@/api/enterpriseApply'
import { useAuthStore } from '@/stores/auth'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const isAuditPage = computed(() => Boolean(route.meta.audit))
const isPlatformManager = computed(() => {
  const roles = auth.roleCodes || []
  return roles.includes('SUPERADMIN') || roles.includes('PLATFORMADMIN')
})

const activeTab = ref('register')
const submitLoading = ref(false)
const myLoading = ref(false)
const auditLoading = ref(false)
const enterpriseLoading = ref(false)
const enterpriseOptions = ref([])
const myRows = ref([])
const auditRows = ref([])
const myTotal = ref(0)
const auditTotal = ref(0)
const detailVisible = ref(false)
const currentRow = ref(null)
const auditVisible = ref(false)
const auditSubmitting = ref(false)
const auditTarget = ref(null)

const registerFormRef = ref()
const joinFormRef = ref()

const registerForm = reactive({
  enterpriseName: '',
  creditCode: '',
  legalPerson: '',
  contactName: auth.user?.fullName || auth.user?.username || '',
  contactPhone: auth.user?.phone || '',
  email: '',
  address: '',
  remark: ''
})

const joinForm = reactive({
  enterpriseId: undefined,
  applicantName: auth.user?.fullName || auth.user?.username || '',
  contactPhone: auth.user?.phone || '',
  remark: ''
})

const myQuery = reactive({
  pageNum: 1,
  pageSize: 10
})

const auditQuery = reactive({
  keyword: '',
  applyType: '',
  status: '',
  pageNum: 1,
  pageSize: 10
})

const auditForm = reactive({
  status: 1,
  auditRemark: ''
})

const auditEmptyTitle = computed(() => {
  if (auditQuery.keyword || auditQuery.applyType || auditQuery.status !== '') return '没有找到符合条件的企业申请'
  return '暂无企业申请记录'
})

const auditEmptyDesc = computed(() => {
  if (auditQuery.status === 0) return '当前没有待审核申请。可以点击“查看全部申请”查看已通过或已驳回记录。'
  if (auditQuery.keyword || auditQuery.applyType || auditQuery.status !== '') return '请调整企业名称、申请类型或审核状态后重新查询。'
  return '用户申请加入已有企业后，本页才会出现待审核记录；注册新企业会自动通过。'
})

const registerRules = {
  enterpriseName: [{ required: true, message: '请输入企业名称', trigger: 'blur' }],
  creditCode: [
    { required: true, message: '请输入统一社会信用代码', trigger: 'blur' },
    { pattern: /^[0-9A-Z]{18}$/, message: '统一社会信用代码应为18位大写字母或数字', trigger: 'blur' }
  ]
}

const joinRules = {
  enterpriseId: [{ required: true, message: '请选择要加入的企业', trigger: 'change' }]
}

let auditKeywordTimer = null

watch(() => auditQuery.keyword, () => {
  clearTimeout(auditKeywordTimer)
  auditKeywordTimer = setTimeout(() => {
    auditQuery.pageNum = 1
    loadAuditList()
  }, 350)
})

watch(isAuditPage, () => {
  initPage()
})

onMounted(() => {
  initPage()
})

function initPage() {
  if (isPlatformManager.value && !isAuditPage.value) {
    router.replace('/system/enterprise-apply-audit')
    return
  }
  if (isAuditPage.value) {
    loadAuditList()
  } else {
    loadEnterpriseOptions('')
    loadMyList()
  }
}

async function loadEnterpriseOptions(keyword = '') {
  enterpriseLoading.value = true
  try {
    enterpriseOptions.value = await listEnterprises({ keyword })
  } finally {
    enterpriseLoading.value = false
  }
}

async function loadMyList() {
  myLoading.value = true
  try {
    const res = await pageMyEnterpriseApplies(myQuery)
    myRows.value = res?.records || []
    myTotal.value = Number(res?.total || 0)
  } finally {
    myLoading.value = false
  }
}

function handleAuditFilterChange() {
  auditQuery.pageNum = 1
  loadAuditList()
}

function setAuditStatus(status) {
  auditQuery.status = status
  auditQuery.pageNum = 1
  loadAuditList()
}

function resetAuditFilters() {
  auditQuery.keyword = ''
  auditQuery.applyType = ''
  auditQuery.status = ''
  auditQuery.pageNum = 1
  loadAuditList()
}

async function loadAuditList() {
  auditLoading.value = true
  try {
    const params = {
      keyword: auditQuery.keyword,
      applyType: auditQuery.applyType,
      status: auditQuery.status,
      pageNum: auditQuery.pageNum,
      pageSize: auditQuery.pageSize
    }
    const res = await pageEnterpriseApplies(params)
    auditRows.value = res?.records || []
    auditTotal.value = Number(res?.total || 0)
  } finally {
    auditLoading.value = false
  }
}

async function submitRegister() {
  await registerFormRef.value?.validate()
  submitLoading.value = true
  try {
    await submitRegisterApply({ ...registerForm })
    await auth.loadMe()
    ElMessage.success('企业注册成功，你已成为该企业管理员')
    clearRegisterForm()
    await router.replace('/dashboard')
  } finally {
    submitLoading.value = false
  }
}

async function submitJoin() {
  await joinFormRef.value?.validate()
  submitLoading.value = true
  try {
    await submitJoinApply({ ...joinForm })
    ElMessage.success('加入企业申请已提交，请等待管理员审核')
    clearJoinForm()
    await loadMyList()
  } finally {
    submitLoading.value = false
  }
}

function clearRegisterForm() {
  registerForm.enterpriseName = ''
  registerForm.creditCode = ''
  registerForm.legalPerson = ''
  registerForm.contactName = auth.user?.fullName || auth.user?.username || ''
  registerForm.contactPhone = auth.user?.phone || ''
  registerForm.email = ''
  registerForm.address = ''
  registerForm.remark = ''
  registerFormRef.value?.clearValidate()
}

function clearJoinForm() {
  joinForm.enterpriseId = undefined
  joinForm.applicantName = auth.user?.fullName || auth.user?.username || ''
  joinForm.contactPhone = auth.user?.phone || ''
  joinForm.remark = ''
  joinFormRef.value?.clearValidate()
}

async function openDetail(row) {
  currentRow.value = await getEnterpriseApply(row.id)
  detailVisible.value = true
}

function openAudit(row, status) {
  auditTarget.value = row
  auditForm.status = status
  auditForm.auditRemark = ''
  auditVisible.value = true
}

async function submitAudit() {
  if (!auditTarget.value?.id) return

  if (auditForm.status === 1) {
    const tip = auditTarget.value.applyType === 'REGISTER'
      ? '审核通过后会创建企业，并将申请用户升级为该企业管理员。确定通过吗？'
      : '审核通过后会把申请用户加入该企业。确定通过吗？'
    await ElMessageBox.confirm(tip, '确认审核', { type: 'warning' })
  }

  auditSubmitting.value = true
  try {
    await auditEnterpriseApply(auditTarget.value.id, {
      status: auditForm.status,
      auditRemark: auditForm.auditRemark
    })
    ElMessage.success('审核完成')
    auditVisible.value = false
    await loadAuditList()
  } finally {
    auditSubmitting.value = false
  }
}

function statusTagType(status) {
  if (status === 1) return 'success'
  if (status === 2) return 'danger'
  return 'warning'
}
</script>

<style scoped>
.apply-hero {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  padding: 22px;
  margin-bottom: 16px;
}

.apply-title {
  font-size: 22px;
  font-weight: 800;
}

.apply-sub {
  margin-top: 8px;
  color: var(--text-sub);
  line-height: 1.7;
}

.apply-grid {
  display: grid;
  grid-template-columns: minmax(0, 540px) minmax(0, 1fr);
  gap: 16px;
}

.apply-form-card {
  padding: 18px;
}

.my-apply-card,
.apply-card {
  min-width: 0;
}

.section-title {
  margin-bottom: 14px;
  font-size: 17px;
  font-weight: 800;
}

@media (max-width: 1100px) {
  .apply-grid {
    grid-template-columns: 1fr;
  }
}
.audit-guide-card { margin-bottom: 14px; padding: 16px 18px; border: 1px solid #dbeafe; background: linear-gradient(135deg, #f8fbff, #ffffff); }
.audit-guide-main { display: flex; justify-content: space-between; gap: 16px; align-items: flex-start; }
.audit-guide-title { color: #0f172a; font-size: 17px; font-weight: 800; }
.audit-guide-desc { margin-top: 6px; color: #64748b; line-height: 1.7; }
.audit-guide-actions { display: flex; gap: 8px; flex-shrink: 0; }
.audit-guide-steps { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; margin-top: 12px; color: #334155; font-size: 13px; }
.audit-guide-steps span { padding: 5px 9px; border-radius: 999px; background: #eef4ff; border: 1px solid #dbeafe; }
.audit-guide-steps em { color: #94a3b8; font-style: normal; }
.audit-empty { padding: 56px 0; color: #64748b; text-align: center; }
.audit-empty-title { color: #334155; font-size: 15px; font-weight: 800; }
.audit-empty-desc { margin-top: 8px; line-height: 1.8; }
.audit-empty-actions { display: flex; justify-content: center; gap: 8px; margin-top: 14px; }
@media (max-width: 900px) {
  .audit-guide-main { flex-direction: column; }
  .audit-guide-actions { width: 100%; flex-wrap: wrap; }
}

</style>

