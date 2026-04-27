<template>
  <div class="page">
    <div class="page-body">
      <div class="card card--table">
        <div class="list-head">
          <div class="list-head__left">
            <el-input
              v-model="keyword"
              class="filter-input"
              placeholder="按项目名称 / 项目编号 / 客户名称自动筛选"
              clearable
              @input="onKeywordInput"
            />
          </div>
          <div class="list-head__right">
            <el-button class="table-icon-btn" text :icon="Refresh" @click="loadData" />
            <el-button type="primary" :icon="Plus" @click="openCreate">新增项目</el-button>
          </div>
        </div>

        <el-table
          class="ui-table"
          :data="displayRows"
          border
          stripe
          height="calc(100vh - 224px)"
          v-loading="loading"
        >
          <el-table-column prop="id" label="ID" width="90" />
          <el-table-column prop="projectName" label="项目名称" min-width="260" show-overflow-tooltip />
          <el-table-column prop="projectCode" label="项目编号" min-width="150" show-overflow-tooltip />
          <el-table-column prop="projectType" label="项目类型" width="120" />
          <el-table-column prop="clientName" label="招标方/客户" min-width="180" show-overflow-tooltip />
          <el-table-column prop="budgetAmount" label="预算金额" width="130">
            <template #default="{ row }">¥ {{ money(row.budgetAmount) }}</template>
          </el-table-column>
          <el-table-column prop="periodDays" label="工期" width="100">
            <template #default="{ row }">{{ row.periodDays || '-' }} 天</template>
          </el-table-column>
          <el-table-column prop="status" label="状态" width="110">
            <template #default="{ row }">
              <StatusTag :value="row.status" :map="projectStatusMap" />
            </template>
          </el-table-column>
          <el-table-column prop="fileUrl" label="生成文件" width="110">
            <template #default="{ row }">
              <el-link v-if="row.fileUrl" type="primary" :href="row.fileUrl" target="_blank">打开</el-link>
              <span v-else>-</span>
            </template>
          </el-table-column>
          <el-table-column prop="createTime" label="创建时间" width="170" />

          <el-table-column label="操作" width="330" fixed="right">
            <template #default="{ row }">
              <div class="table-actions">
                <el-button link type="primary" @click="openGenerate(row)">AI生成</el-button>
                <el-button link type="primary" @click="openContent(row)">内容</el-button>
                <el-button link type="primary" @click="openEdit(row)">编辑</el-button>
                <el-button link type="warning" @click="openUpload(row)">上传资料</el-button>
                <el-button link type="danger" @click="deleteRow(row)">删除</el-button>
              </div>
            </template>
          </el-table-column>
        </el-table>

        <PageFooterPager
          v-model:page="pager.page"
          v-model:size="pager.size"
          :total="pager.total"
          @change="loadData"
        />
      </div>
    </div>

    <el-dialog
      v-model="formDialog.visible"
      :title="formDialog.isEdit ? '编辑标书项目' : '新增标书项目'"
      width="820px"
      destroy-on-close
    >
      <el-form ref="formRef" :model="form" :rules="rules" label-width="130px">
        <el-form-item label="项目名称" prop="projectName">
          <el-input v-model="form.projectName" placeholder="请输入项目名称" />
        </el-form-item>
        <el-form-item label="项目编号">
          <el-input v-model="form.projectCode" placeholder="请输入项目编号" />
        </el-form-item>
        <el-form-item label="创建用户ID" prop="userId">
          <el-input-number v-model="form.userId" controls-position="right" style="width: 100%" />
          <div class="form-tip">后端 t_bid_project.user_id 为必填；这里默认使用当前登录用户ID。</div>
        </el-form-item>
        <el-row :gutter="12">
          <el-col :span="12">
            <el-form-item label="企业ID">
              <el-input-number v-model="form.enterpriseId" controls-position="right" style="width: 100%" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="项目类型">
              <el-input v-model="form.projectType" placeholder="工程 / 服务 / 采购等" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="12">
          <el-col :span="12">
            <el-form-item label="标书模板">
              <el-select v-model="form.bidTemplateId" clearable filterable placeholder="请选择标书模板" style="width: 100%">
                <el-option v-for="item in bidTemplates" :key="item.id" :label="item.templateName" :value="item.id" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="Prompt模板">
              <el-select v-model="form.promptTemplateId" clearable filterable placeholder="请选择Prompt模板" style="width: 100%">
                <el-option v-for="item in promptTemplates" :key="item.id" :label="`${item.name}（${item.scene || '-'}）`" :value="item.id" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="招标方/客户">
          <el-input v-model="form.clientName" placeholder="请输入招标方或客户名称" />
        </el-form-item>
        <el-row :gutter="12">
          <el-col :span="12">
            <el-form-item label="预算金额">
              <el-input-number v-model="form.budgetAmount" :min="0" :precision="2" controls-position="right" style="width: 100%" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="工期天数">
              <el-input-number v-model="form.periodDays" :min="0" controls-position="right" style="width: 100%" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="知识库ID">
          <JsonEditor v-model="form.knowledgeIds" :rows="4" placeholder="请输入知识库ID数组，例如：[1,2,3]" />
        </el-form-item>
        <el-form-item label="项目状态">
          <el-select v-model="form.status" style="width: 100%">
            <el-option label="草稿" value="draft" />
            <el-option label="生成中" value="generating" />
            <el-option label="已完成" value="completed" />
            <el-option label="失败" value="failed" />
            <el-option label="已归档" value="archived" />
          </el-select>
        </el-form-item>
        <el-form-item label="Markdown内容">
          <el-input v-model="form.contentMarkdown" type="textarea" :rows="8" placeholder="AI生成后会写入最后生成的Markdown内容" />
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="formDialog.visible = false">取消</el-button>
        <el-button type="primary" @click="submitForm">保存</el-button>
      </template>
    </el-dialog>

    <el-drawer v-model="generateDrawer.visible" title="AI生成标书内容" size="720px" destroy-on-close>
      <el-form :model="generateForm" label-width="130px">
        <el-alert
          title="调用接口：POST /ai/bid-project/{projectId}/generate"
          type="info"
          show-icon
          :closable="false"
          style="margin-bottom: 14px"
        />
        <el-form-item label="当前项目">
          <el-input :model-value="currentRow?.projectName" disabled />
        </el-form-item>
        <el-form-item label="业务类型">
          <el-input v-model="generateForm.bizType" />
        </el-form-item>
        <el-form-item label="Prompt模板">
          <el-select v-model="generateForm.promptTemplateId" clearable filterable style="width: 100%">
            <el-option v-for="item in promptTemplates" :key="item.id" :label="`${item.name}（${item.scene || '-'}）`" :value="item.id" />
          </el-select>
        </el-form-item>
        <el-row :gutter="12">
          <el-col :span="12">
            <el-form-item label="模型服务商">
              <el-input v-model="generateForm.modelProvider" placeholder="不填则使用后端默认" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="模型名称">
              <el-input v-model="generateForm.modelName" placeholder="不填则使用后端默认" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="知识库ID">
          <JsonEditor v-model="generateForm.knowledgeIds" :rows="4" placeholder="不填则使用项目 knowledgeIds；例如：[1,2]" />
        </el-form-item>
        <el-form-item label="动态变量">
          <JsonEditor v-model="generateForm.variables" :rows="8" placeholder='例如：{"project_name":"某项目","service_year":"3年"}' />
        </el-form-item>
        <el-form-item label="额外要求">
          <el-input v-model="generateForm.extraRequirement" type="textarea" :rows="5" placeholder="例如：重点突出施工组织、售后服务、人员配置、风险控制等" />
        </el-form-item>
        <el-row :gutter="12">
          <el-col :span="12">
            <el-form-item label="温度参数">
              <el-input-number v-model="generateForm.temperature" :min="0" :max="2" :step="0.1" controls-position="right" style="width: 100%" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="最大Token">
              <el-input-number v-model="generateForm.maxTokens" :min="1000" :max="50000" controls-position="right" style="width: 100%" />
            </el-form-item>
          </el-col>
        </el-row>

        <el-button type="primary" :loading="generating" @click="submitGenerate">开始生成</el-button>
        <el-button :disabled="!lastResultId" @click="doExportWord">导出Word</el-button>
        <el-button :disabled="!lastResultId" @click="doExportMarkdown">导出Markdown</el-button>
      </el-form>

      <div v-if="generateResult.contentMarkdown || generateResult.contentHtml" style="margin-top: 18px">
        <div class="form-tip">生成结果ID：{{ lastResultId || '-' }}，任务ID：{{ generateResult.taskId || '-' }}</div>
        <div v-if="generateResult.contentHtml" class="markdown-box" v-html="generateResult.contentHtml"></div>
        <div v-else class="markdown-box">{{ generateResult.contentMarkdown }}</div>
      </div>
    </el-drawer>

    <el-dialog v-model="contentDialog.visible" title="标书内容预览/编辑" width="920px" destroy-on-close>
      <el-input v-model="contentForm.contentMarkdown" type="textarea" :rows="20" />
      <template #footer>
        <el-button @click="contentDialog.visible = false">关闭</el-button>
        <el-button type="primary" @click="saveContent">保存到项目</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="uploadDialog.visible" title="上传项目资料" width="680px" destroy-on-close>
      <FileUploadBox
        module-type="tender_material"
        :biz-id="currentRow?.id"
        @success="onUploadSuccess"
      />
      <el-table v-if="uploadedFiles.length" :data="uploadedFiles" border style="margin-top: 14px">
        <el-table-column prop="id" label="文件ID" width="100" />
        <el-table-column prop="originalName" label="文件名" min-width="220" />
        <el-table-column prop="fileUrl" label="地址" min-width="180">
          <template #default="{ row }">
            <el-link v-if="row.fileUrl" :href="row.fileUrl" target="_blank" type="primary">打开</el-link>
            <span v-else>-</span>
          </template>
        </el-table-column>
      </el-table>
    </el-dialog>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Refresh } from '@element-plus/icons-vue'
import { createCrudApi } from '@/api/crud'
import { exportMarkdown, exportWord, generateBidProject } from '@/api/ai'
import { useAuthStore } from '@/stores/auth'
import PageFooterPager from '@/components/PageFooterPager.vue'
import StatusTag from '@/components/StatusTag.vue'
import JsonEditor from '@/components/JsonEditor.vue'
import FileUploadBox from '@/components/FileUploadBox.vue'
import { money, parseJsonLoose, toJsonText } from '@/utils/format'
import { projectStatusMap } from '@/config/statusMaps'

const projectApi = createCrudApi('/bid-project')
const bidTemplateApi = createCrudApi('/bid-template')
const promptApi = createCrudApi('/prompt-template')
const auth = useAuthStore()

const loading = ref(false)
const generating = ref(false)
const rows = ref([])
const keyword = ref('')
const bidTemplates = ref([])
const promptTemplates = ref([])
const currentRow = ref(null)
const lastResultId = ref(null)
const uploadedFiles = ref([])

const pager = reactive({
  page: 1,
  size: 10,
  total: 0
})

const formDialog = reactive({ visible: false, isEdit: false })
const generateDrawer = reactive({ visible: false })
const contentDialog = reactive({ visible: false })
const uploadDialog = reactive({ visible: false })

const formRef = ref()
const form = reactive({})
const generateForm = reactive({})
const generateResult = reactive({})
const contentForm = reactive({ contentMarkdown: '' })

let timer = null

const rules = {
  projectName: [{ required: true, message: '请输入项目名称', trigger: 'blur' }],
  userId: [{ required: true, message: '请输入创建用户ID', trigger: 'blur' }]
}

const displayRows = computed(() => {
  const key = keyword.value.trim().toLowerCase()
  if (!key) return rows.value
  return rows.value.filter((row) => {
    return ['projectName', 'projectCode', 'clientName', 'projectType', 'status']
      .some((field) => String(row[field] ?? '').toLowerCase().includes(key))
  })
})

onMounted(() => {
  loadData()
  loadOptions()
})

function onKeywordInput() {
  clearTimeout(timer)
  timer = setTimeout(() => {
    pager.page = 1
    loadData()
  }, 300)
}

async function loadData() {
  loading.value = true
  try {
    const res = await projectApi.page({
      current: pager.page,
      size: pager.size,
      keyword: keyword.value || undefined
    })
    rows.value = res?.records || []
    pager.total = Number(res?.total || 0)
  } finally {
    loading.value = false
  }
}

async function loadOptions() {
  try {
    bidTemplates.value = await bidTemplateApi.list()
  } catch (e) {
    bidTemplates.value = []
  }
  try {
    promptTemplates.value = await promptApi.list()
  } catch (e) {
    promptTemplates.value = []
  }
}

function resetProjectForm(row = {}) {
  for (const key of Object.keys(form)) delete form[key]
  Object.assign(form, {
    id: row.id,
    enterpriseId: row.enterpriseId ?? auth.user?.enterpriseId ?? '',
    userId: row.userId ?? auth.user?.id ?? '',
    projectName: row.projectName ?? '',
    projectCode: row.projectCode ?? '',
    bidTemplateId: row.bidTemplateId ?? '',
    promptTemplateId: row.promptTemplateId ?? '',
    knowledgeIds: toJsonText(row.knowledgeIds || []),
    projectType: row.projectType ?? '',
    clientName: row.clientName ?? '',
    budgetAmount: row.budgetAmount ?? 0,
    periodDays: row.periodDays ?? 0,
    status: row.status ?? 'draft',
    generatedFileId: row.generatedFileId ?? '',
    fileUrl: row.fileUrl ?? '',
    contentMarkdown: row.contentMarkdown ?? ''
  })
}

function openCreate() {
  formDialog.isEdit = false
  resetProjectForm()
  formDialog.visible = true
}

function openEdit(row) {
  currentRow.value = row
  formDialog.isEdit = true
  resetProjectForm(row)
  formDialog.visible = true
}

function normalizeProjectPayload() {
  return {
    ...form,
    knowledgeIds: parseJsonLoose(form.knowledgeIds, [])
  }
}

async function submitForm() {
  await formRef.value.validate()
  const payload = normalizeProjectPayload()
  if (formDialog.isEdit) {
    await projectApi.update(form.id, payload)
    ElMessage.success('修改成功')
  } else {
    await projectApi.create(payload)
    ElMessage.success('新增成功')
  }
  formDialog.visible = false
  loadData()
}

async function deleteRow(row) {
  await ElMessageBox.confirm(`确定删除项目「${row.projectName}」吗？`, '删除确认', { type: 'warning' })
  await projectApi.remove(row.id)
  ElMessage.success('删除成功')
  loadData()
}

function resetGenerateForm(row) {
  for (const key of Object.keys(generateForm)) delete generateForm[key]
  for (const key of Object.keys(generateResult)) delete generateResult[key]
  Object.assign(generateForm, {
    bizType: 'bid',
    promptTemplateId: row.promptTemplateId || '',
    modelProvider: '',
    modelName: '',
    knowledgeIds: '',
    variables: '{}',
    extraRequirement: '',
    temperature: 0.7,
    maxTokens: 8192
  })
  lastResultId.value = null
}

function openGenerate(row) {
  currentRow.value = row
  resetGenerateForm(row)
  generateDrawer.visible = true
}

async function submitGenerate() {
  if (!currentRow.value?.id) return
  generating.value = true
  try {
    const payload = {
      ...generateForm,
      promptTemplateId: generateForm.promptTemplateId || undefined,
      knowledgeIds: parseJsonLoose(generateForm.knowledgeIds, undefined),
      variables: parseJsonLoose(generateForm.variables, {}),
      modelProvider: generateForm.modelProvider || undefined,
      modelName: generateForm.modelName || undefined
    }
    const res = await generateBidProject(currentRow.value.id, payload)
    Object.assign(generateResult, res || {})
    lastResultId.value = res?.resultId || null
    ElMessage.success('AI生成完成')
    loadData()
  } finally {
    generating.value = false
  }
}

function openContent(row) {
  currentRow.value = row
  contentForm.contentMarkdown = row.contentMarkdown || ''
  contentDialog.visible = true
}

async function saveContent() {
  if (!currentRow.value?.id) return
  await projectApi.update(currentRow.value.id, {
    ...currentRow.value,
    contentMarkdown: contentForm.contentMarkdown
  })
  ElMessage.success('内容已保存')
  contentDialog.visible = false
  loadData()
}

function openUpload(row) {
  currentRow.value = row
  uploadedFiles.value = []
  uploadDialog.visible = true
}

function onUploadSuccess(file) {
  uploadedFiles.value.unshift(file)
}

async function doExportWord() {
  if (!lastResultId.value) return
  const file = await exportWord(lastResultId.value)
  ElMessage.success('Word导出成功')
  if (file?.fileUrl) window.open(file.fileUrl, '_blank')
}

async function doExportMarkdown() {
  if (!lastResultId.value) return
  const file = await exportMarkdown(lastResultId.value)
  ElMessage.success('Markdown导出成功')
  if (file?.fileUrl) window.open(file.fileUrl, '_blank')
}
</script>
