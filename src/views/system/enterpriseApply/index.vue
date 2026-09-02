<template>
  <div class="page" :class="{ 'page--apply-user': !isAuditPage }">
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
        <section v-if="!selectedMode" class="enterprise-choice">
          <div class="choice-heading">
            <div v-if="$route.query.required === '1'" class="required-tip">完成企业设置后即可使用企业协作功能</div>
            <h1>请选择企业加入方式</h1>
            <p>您当前尚未加入任何企业，请选择以下方式开始使用恒鼎·智慧AI平台</p>
          </div>

          <div class="choice-cards">
            <button type="button" class="choice-card choice-card--register" @click="selectMode('register')">
              <span class="choice-visual building-visual" aria-hidden="true">
                <i class="building-main"></i><i class="building-side"></i><i class="building-tree tree-one"></i><i class="building-tree tree-two"></i>
              </span>
              <strong>注册新企业</strong>
              <span class="choice-desc">创建一个全新的企业，成为企业管理员，<br>提交后立即生效。</span>
              <span class="choice-divider"></span>
              <span class="choice-action"><b>＋</b> 注册新企业</span>
            </button>

            <button type="button" class="choice-card choice-card--join" @click="selectMode('join')">
              <span class="choice-visual team-visual" aria-hidden="true">
                <i class="person person-one"></i><i class="person person-two"></i><i class="person person-three"></i><i class="team-check">✓</i>
              </span>
              <strong>加入已有企业</strong>
              <span class="choice-desc">搜索并申请加入已有企业，<br>管理员审批通过后即可加入团队。</span>
              <span class="choice-divider"></span>
              <span class="choice-action"><b>↪</b> 加入已有企业</span>
            </button>
          </div>

          <div class="choice-help">ⓘ&nbsp; 不确定如何选择？ <span>注册新企业将立即生效，加入已有企业需要审批</span></div>
        </section>

        <section v-else class="enterprise-form-stage">
          <div class="form-stage-head">
            <button type="button" class="back-choice" @click="backToChoice">返回重新选择</button>
            <div>
              <h1>{{ selectedMode === 'register' ? '注册新企业' : '加入已有企业' }}</h1>
              <p>{{ selectedMode === 'register' ? '填写企业基本信息，提交成功后您将成为企业管理员。' : '选择您要加入的企业，提交后等待企业管理员审批。' }}</p>
            </div>
          </div>

          <div class="form-content-grid" :class="{ 'form-content-grid--register': selectedMode === 'register' }">
            <div class="card mode-form-card">
              <el-form v-if="selectedMode === 'register'" ref="registerFormRef" :model="registerForm" :rules="registerRules" label-position="top" class="register-form two-column-form">
                <el-form-item label="企业名称" prop="enterpriseName"><el-input v-model="registerForm.enterpriseName" placeholder="请输入企业名称" /></el-form-item>
                <el-form-item label="统一社会信用代码" prop="creditCode"><el-input v-model="registerForm.creditCode" placeholder="请输入18位统一社会信用代码" maxlength="18" /></el-form-item>
                <el-form-item label="法定代表人"><el-input v-model="registerForm.legalPerson" placeholder="请输入法定代表人，可选" /></el-form-item>
                <el-form-item label="联系人"><el-input v-model="registerForm.contactName" placeholder="请输入联系人" /></el-form-item>
                <el-form-item label="联系电话"><el-input v-model="registerForm.contactPhone" placeholder="请输入联系电话" /></el-form-item>
                <el-form-item label="邮箱"><el-input v-model="registerForm.email" placeholder="请输入邮箱，可选" /></el-form-item>
                <el-form-item label="企业地址" class="form-span-2"><el-input v-model="registerForm.address" placeholder="请输入企业地址，可选" /></el-form-item>
                <el-form-item label="补充说明" class="form-span-2"><el-input v-model="registerForm.remark" type="textarea" :rows="3" placeholder="可以填写企业背景或使用场景，可选" /></el-form-item>
                <div class="form-submit-row form-span-2"><el-button @click="backToChoice">取消</el-button><el-button type="primary" :loading="submitLoading" @click="submitRegister">立即注册企业</el-button></div>
              </el-form>

              <el-form v-else ref="joinFormRef" :model="joinForm" :rules="joinRules" label-position="top" class="join-form join-form-grid">
                <el-form-item label="选择企业" prop="enterpriseId" class="form-span-2">
                  <el-select v-model="joinForm.enterpriseId" filterable remote clearable reserve-keyword placeholder="请输入企业名称搜索" :remote-method="loadEnterpriseOptions" :loading="enterpriseLoading" style="width:100%">
                    <el-option v-for="item in enterpriseOptions" :key="item.id" :label="item.enterpriseName" :value="item.id" />
                  </el-select>
                </el-form-item>
                <el-form-item label="申请人姓名"><el-input v-model="joinForm.applicantName" placeholder="默认使用当前用户名称" /></el-form-item>
                <el-form-item label="联系电话"><el-input v-model="joinForm.contactPhone" placeholder="默认使用当前手机号" /></el-form-item>
                <el-form-item label="申请说明" class="form-span-2"><el-input v-model="joinForm.remark" type="textarea" :rows="3" placeholder="请输入加入企业的原因，方便管理员审核" /></el-form-item>
                <div class="form-submit-row form-span-2"><el-button @click="backToChoice">取消</el-button><el-button type="primary" :loading="submitLoading" @click="submitJoin">提交加入申请</el-button></div>
              </el-form>
            </div>

            <div v-if="selectedMode === 'join'" class="card card--table my-apply-card">
              <div class="section-title">我的申请记录</div>
              <el-table v-loading="myLoading" class="ui-table" :data="myRows" border>
                <el-table-column prop="applyTypeName" label="类型" min-width="110" />
                <el-table-column prop="enterpriseName" label="企业名称" min-width="170" show-overflow-tooltip />
                <el-table-column prop="statusName" label="状态" width="90"><template #default="{ row }"><el-tag :type="statusTagType(row.status)">{{ row.statusName }}</el-tag></template></el-table-column>
                <el-table-column prop="createTime" label="提交时间" min-width="155" show-overflow-tooltip />
                <el-table-column label="操作" width="76"><template #default="{ row }"><el-button link type="primary" @click="openDetail(row)">详情</el-button></template></el-table-column>
              </el-table>
              <PageFooterPager v-model:page="myQuery.pageNum" v-model:size="myQuery.pageSize" :total="myTotal" @change="loadMyList" />
            </div>
          </div>
        </section>
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

const selectedMode = ref('')
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
  }
}

function selectMode(mode) {
  selectedMode.value = mode
  if (mode === 'join') {
    if (!enterpriseOptions.value.length) loadEnterpriseOptions('')
    loadMyList()
  }
}

function backToChoice() {
  selectedMode.value = ''
  registerFormRef.value?.clearValidate?.()
  joinFormRef.value?.clearValidate?.()
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

.enterprise-choice { position:relative; min-height:calc(100vh - 150px); padding:48px 24px 34px; box-sizing:border-box; overflow:hidden; border-radius:24px; background:radial-gradient(circle at 18% 48%,rgba(101,145,255,.13),transparent 25%),radial-gradient(circle at 82% 45%,rgba(133,105,255,.10),transparent 24%),linear-gradient(135deg,#f9fbff 0%,#f4f7ff 55%,#f9faff 100%); }
.enterprise-choice::before,.enterprise-choice::after { position:absolute; content:''; pointer-events:none; width:480px; height:260px; bottom:-85px; border:2px solid rgba(153,178,232,.16); transform:rotate(18deg); }
.enterprise-choice::before { left:-170px; }.enterprise-choice::after { right:-190px; transform:rotate(-20deg); }
.choice-heading { position:relative; z-index:1; text-align:center; }
.choice-heading h1 { margin:8px 0 12px; color:#132039; font-size:clamp(30px,3vw,43px); line-height:1.2; font-weight:900; letter-spacing:1px; }
.choice-heading p { margin:0; color:#718097; font-size:16px; }
.required-tip { display:inline-flex; padding:6px 13px; color:#6f5bd3; font-size:12px; border:1px solid #e1dbff; border-radius:20px; background:rgba(255,255,255,.75); }
.choice-cards { position:relative; z-index:1; width:min(900px,100%); margin:54px auto 0; display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:36px; }
.choice-card { min-width:0; min-height:430px; padding:28px 44px 35px; display:flex; flex-direction:column; align-items:center; border:1px solid #e2e8f5; border-radius:18px; color:#18243a; background:rgba(255,255,255,.88); box-shadow:0 18px 42px rgba(60,88,145,.10); cursor:pointer; transition:transform .2s ease,box-shadow .2s ease,border-color .2s ease; }
.choice-card:hover { transform:translateY(-6px); border-color:#aebfff; box-shadow:0 24px 50px rgba(60,88,145,.16); }
.choice-card>strong { margin-top:20px; font-size:25px; font-weight:900; }
.choice-desc { margin-top:17px; color:#78869b; font-size:14px; line-height:1.75; text-align:center; }
.choice-divider { width:100%; height:1px; margin:24px 0; background:#e8edf6; }
.choice-action { width:100%; height:52px; margin-top:auto; display:flex; align-items:center; justify-content:center; gap:9px; color:#fff; border-radius:9px; background:linear-gradient(90deg,#5368ff,#4461f3); box-shadow:0 10px 22px rgba(73,96,245,.22); font-size:16px; font-weight:800; }
.choice-card--join .choice-action { background:linear-gradient(90deg,#7655ed,#863bf0); }.choice-action b { font-size:21px; font-weight:400; }
.choice-help { position:relative; z-index:1; margin-top:38px; color:#79869a; font-size:13px; text-align:center; }.choice-help span { margin-left:8px; color:#556bf3; }
.choice-visual { position:relative; width:185px; height:145px; display:block; border-radius:50%; background:radial-gradient(circle,rgba(105,132,255,.16),rgba(105,132,255,.02) 68%,transparent 70%); }
.building-main,.building-side { position:absolute; bottom:27px; border-radius:5px 5px 2px 2px; background:linear-gradient(180deg,#7393ff,#365cf1); box-shadow:0 12px 22px rgba(59,91,220,.2); }
.building-main { left:59px; width:52px; height:84px; }.building-side { left:108px; width:43px; height:61px; background:linear-gradient(180deg,#9ab3ff,#5575ed); }
.building-main::before,.building-side::before { content:''; position:absolute; inset:14px 10px; background:repeating-linear-gradient(180deg,rgba(255,255,255,.82) 0 5px,transparent 5px 13px); }
.building-tree { position:absolute; bottom:27px; width:7px; height:25px; border-radius:4px; background:#87a7f7; }.building-tree::before { content:''; position:absolute; left:-7px; top:-12px; width:21px; height:21px; border-radius:50%; background:#b4c7ff; }.tree-one { left:38px; }.tree-two { right:20px; }
.person { position:absolute; bottom:35px; width:54px; height:63px; border-radius:29px 29px 17px 17px; background:linear-gradient(180deg,#9678ff,#6138df); box-shadow:0 10px 20px rgba(104,66,215,.2); }.person::before { content:''; position:absolute; left:13px; top:-29px; width:29px; height:29px; border-radius:50%; background:linear-gradient(180deg,#c7b8ff,#8d70f2); }.person-one { left:41px; }.person-two { left:90px; transform:scale(1.12); }.person-three { left:118px; transform:scale(.78); opacity:.65; }
.team-check { position:absolute; right:14px; bottom:22px; width:43px; height:47px; display:flex; align-items:center; justify-content:center; color:#fff; font-size:23px; font-style:normal; border-radius:12px 12px 18px 18px; background:linear-gradient(145deg,#8566ff,#5436d8); box-shadow:0 8px 18px rgba(91,58,210,.26); }

.enterprise-form-stage { max-width:1440px; margin:0 auto; }.form-stage-head { margin-bottom:18px; display:flex; align-items:flex-start; gap:24px; }.form-stage-head h1 { margin:0; color:#17233a; font-size:27px; font-weight:900; }.form-stage-head p { margin:7px 0 0; color:#758399; }
.back-choice { margin-top:4px; padding:8px 13px; flex:0 0 auto; color:#4f63d9; border:1px solid #d9e1f2; border-radius:8px; background:#fff; cursor:pointer; }
.form-content-grid { display:grid; grid-template-columns:1fr; gap:16px; align-items:start; }.mode-form-card { padding:24px 28px; }.two-column-form,.join-form-grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); column-gap:20px; }.form-span-2 { grid-column:1/-1; }
.mode-form-card :deep(.el-form-item) { margin-bottom:17px; }.mode-form-card :deep(.el-form-item__label) { color:#3f4c61; font-weight:700; }.mode-form-card :deep(.el-input__wrapper),.mode-form-card :deep(.el-select__wrapper) { min-height:42px; border-radius:8px; }
.form-submit-row { display:flex; justify-content:flex-end; gap:10px; padding-top:4px; }.form-submit-row .el-button { min-width:120px; }.join-form { width:100%; }.my-apply-card { padding:16px 20px; }

@media (max-width:1200px) { .form-content-grid { grid-template-columns:1fr; } }
@media (max-width:760px) { .enterprise-choice { padding:30px 14px; }.choice-cards { margin-top:30px; grid-template-columns:1fr; gap:18px; }.choice-card { min-height:380px; padding:22px 28px 28px; }.choice-heading h1 { font-size:28px; }.form-stage-head { flex-direction:column; gap:12px; }.two-column-form { grid-template-columns:1fr; }.form-span-2 { grid-column:auto; }.mode-form-card { padding:18px; } }

/* 普通用户企业申请始终在当前内容区一屏展示 */
.page--apply-user { height:100%; min-height:0; overflow:hidden; }
.page--apply-user .page-body { height:100%; min-height:0; overflow:hidden; }
.page--apply-user .enterprise-choice { width:100%; height:100%; min-height:0; padding-top:clamp(20px,5vh,48px); padding-bottom:clamp(16px,3vh,34px); }
.page--apply-user .choice-cards { margin-top:clamp(22px,5vh,54px); }
.page--apply-user .choice-card { min-height:clamp(300px,48vh,430px); padding-top:clamp(16px,3vh,28px); padding-bottom:clamp(20px,3.6vh,35px); }
.page--apply-user .choice-visual { width:clamp(130px,19vh,185px); height:clamp(105px,16vh,145px); transform-origin:center bottom; }
.page--apply-user .choice-help { margin-top:clamp(16px,3.5vh,38px); }

.page--apply-user .enterprise-form-stage { height:100%; min-height:0; display:flex; flex-direction:column; overflow:hidden; }
.page--apply-user .form-stage-head { flex:0 0 auto; margin-bottom:clamp(10px,2vh,18px); }
.page--apply-user .form-content-grid { flex:1; min-height:0; grid-template-columns:1fr; grid-template-rows:auto minmax(0,1fr); overflow:hidden; }
.page--apply-user .form-content-grid--register { width:min(960px,100%); margin:0 auto; display:block; }
.page--apply-user .form-content-grid--register .mode-form-card { height:100%; }
.page--apply-user .mode-form-card,.page--apply-user .my-apply-card { min-height:0; max-height:100%; overflow:hidden; box-sizing:border-box; }
.page--apply-user .mode-form-card { padding:clamp(12px,2vh,20px) clamp(20px,3vw,42px); }
.page--apply-user .join-form { max-width:1120px; margin:0 auto; }
.page--apply-user .mode-form-card :deep(.el-form-item) { margin-bottom:clamp(6px,1.2vh,12px); }
.page--apply-user .mode-form-card :deep(.el-input__wrapper),.page--apply-user .mode-form-card :deep(.el-select__wrapper) { min-height:clamp(34px,4.6vh,42px); }
.page--apply-user .mode-form-card :deep(.el-textarea__inner) { min-height:clamp(52px,7vh,72px)!important; }
.page--apply-user .my-apply-card { display:flex; flex-direction:column; }
.page--apply-user .my-apply-card .ui-table { flex:1; min-height:0; }
.page--apply-user .my-apply-card :deep(.el-table__body-wrapper) { overflow:hidden; }
.page--apply-user .my-apply-card :deep(.page-footer-pager) { flex:0 0 auto; }

@media (max-height:760px) {
  .page--apply-user .choice-heading h1 { font-size:30px; margin-bottom:7px; }
  .page--apply-user .choice-heading p { font-size:14px; }
  .page--apply-user .choice-card>strong { margin-top:10px; font-size:21px; }
  .page--apply-user .choice-desc { margin-top:8px; line-height:1.5; }
  .page--apply-user .choice-divider { margin:13px 0; }
  .page--apply-user .choice-action { height:44px; }
  .page--apply-user .form-stage-head h1 { font-size:23px; }
  .page--apply-user .form-stage-head p { margin-top:3px; font-size:13px; }
  .page--apply-user .mode-form-card :deep(.el-form-item__label) { height:24px; line-height:24px; }
}

@media (max-width:900px) {
  .page--apply-user .form-content-grid { grid-template-columns:1fr; }
}

@media (max-width:760px) {
  .page--apply-user .enterprise-choice { padding:14px 10px; }
  .page--apply-user .choice-cards { margin-top:14px; gap:10px; }
  .page--apply-user .choice-card { min-height:230px; padding:10px 18px 14px; }
  .page--apply-user .choice-visual { width:90px; height:68px; transform:scale(.58); margin-bottom:-18px; }
  .page--apply-user .choice-card>strong { margin-top:4px; font-size:19px; }
  .page--apply-user .choice-desc { margin-top:5px; font-size:12px; }
  .page--apply-user .choice-divider { margin:8px 0; }
  .page--apply-user .choice-action { height:38px; font-size:14px; }
  .page--apply-user .choice-help { display:none; }
  .page--apply-user .form-stage-head { flex-direction:row; align-items:center; gap:10px; }
  .page--apply-user .form-stage-head p { display:none; }
  .page--apply-user .two-column-form { grid-template-columns:1fr; }
  .page--apply-user .join-form-grid { grid-template-columns:repeat(2,minmax(0,1fr)); }
  .page--apply-user .form-span-2 { grid-column:auto; }
  .page--apply-user .mode-form-card { padding:10px 12px; }
  .page--apply-user .mode-form-card :deep(.el-form-item) { margin-bottom:5px; }
  .page--apply-user .mode-form-card :deep(.el-form-item__label) { height:20px; line-height:20px; font-size:12px; }
  .page--apply-user .mode-form-card :deep(.el-input__wrapper),.page--apply-user .mode-form-card :deep(.el-select__wrapper) { min-height:30px; }
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

