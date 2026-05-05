<template>
  <div class="page">
    <div class="page-body prompt-page">
      <!-- 左侧：模板列表 -->
      <div class="card card--table prompt-left">
        <div class="list-head">
          <div class="list-head__left">
            <el-input
              v-model="keyword"
              class="filter-input"
              placeholder="按模板名称 / 场景 / 备注自动查询"
              clearable
              @input="onKeywordInput"
            />
          </div>
          <div class="list-head__right">
            <el-button class="table-icon-btn" text :icon="Refresh" @click="loadTemplates" />
            <el-button type="primary" :icon="Plus" @click="openCreateTemplate">新增模板</el-button>
          </div>
        </div>

        <div class="scene-filter">
          <el-segmented v-model="sceneGroup" :options="sceneGroupOptions" @change="onSceneGroupChange" />
        </div>

        <el-table
          class="ui-table"
          :data="templates"
          border
          stripe
          highlight-current-row
          height="calc(100vh - 274px)"
          v-loading="loading"
          @current-change="selectTemplate"
          @row-dblclick="selectTemplate"
        >
          <el-table-column prop="name" label="模板名称" min-width="190" show-overflow-tooltip />
          <el-table-column label="类型" width="110">
            <template #default="{ row }">
              <el-tag :type="sceneTag(row.scene)" effect="light">
                {{ sceneLabel(row.scene) }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="versionNo" label="版本" width="80" align="center" />
          <el-table-column label="状态" width="80" align="center">
            <template #default="{ row }">
              <el-tag :type="Number(row.status) === 1 ? 'success' : 'info'" effect="light">
                {{ Number(row.status) === 1 ? '正常' : '停用' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="updateTime" label="更新时间" width="170" show-overflow-tooltip />
          <el-table-column label="操作" width="130" fixed="right">
            <template #default="{ row }">
              <div class="table-actions">
                <el-button link type="primary" @click.stop="selectTemplate(row)">编辑</el-button>
                <el-button link type="danger" @click.stop="removeTemplate(row)">删除</el-button>
              </div>
            </template>
          </el-table-column>
        </el-table>

        <PageFooterPager
          v-model:page="pager.page"
          v-model:size="pager.size"
          :total="pager.total"
          @change="loadTemplates"
        />
      </div>

      <!-- 右侧：模板编辑器 -->
      <div class="card prompt-right">
        <template v-if="selectedTemplate || editMode">
          <div class="editor-head">
            <div>
              <div class="section-title">
                {{ form.id ? '编辑 Prompt 模板' : '新增 Prompt 模板' }}
              </div>
              <div class="section-desc">
                模型固定使用 qwen / qwen3.5-plus-2026-04-20。模板内容支持 &#123;&#123;variable&#125;&#125; 占位符。
              </div>
            </div>
            <div class="editor-actions">
              <el-button :icon="Refresh" @click="resetEditor">重置</el-button>
              <el-button type="primary" :loading="saving" @click="saveTemplate">保存模板</el-button>
            </div>
          </div>

          <el-form ref="formRef" :model="form" :rules="rules" label-width="112px" class="prompt-form">
            <el-row :gutter="14">
              <el-col :span="12">
                <el-form-item label="模板名称" prop="name">
                  <el-input v-model="form.name" placeholder="例如：技术标生成模板" maxlength="100" show-word-limit />
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="生成场景" prop="scene">
                  <el-select v-model="form.scene" filterable placeholder="请选择生成场景" style="width: 100%">
                    <el-option
                      v-for="item in sceneOptions"
                      :key="item.value"
                      :label="item.label"
                      :value="item.value"
                    >
                      <span>{{ item.label }}</span>
                      <span class="option-code">{{ item.value }}</span>
                    </el-option>
                  </el-select>
                </el-form-item>
              </el-col>
            </el-row>

            <el-row :gutter="14">
              <el-col :span="8">
                <el-form-item label="模型服务商">
                  <el-input v-model="form.modelProvider" disabled />
                </el-form-item>
              </el-col>
              <el-col :span="10">
                <el-form-item label="模型名称">
                  <el-input v-model="form.modelName" disabled />
                </el-form-item>
              </el-col>
              <el-col :span="6">
                <el-form-item label="状态">
                  <el-select v-model="form.status" style="width: 100%">
                    <el-option label="正常" :value="1" />
                    <el-option label="停用" :value="0" />
                  </el-select>
                </el-form-item>
              </el-col>
            </el-row>

            <el-row :gutter="14">
              <el-col :span="8">
                <el-form-item label="版本号">
                  <el-input v-model="form.versionNo" placeholder="例如：V1.0" />
                </el-form-item>
              </el-col>
              <el-col :span="16">
                <el-form-item label="备注">
                  <el-input v-model="form.remark" placeholder="模板用途说明" maxlength="200" show-word-limit />
                </el-form-item>
              </el-col>
            </el-row>

            <el-form-item label="模板内容" prop="content">
              <el-input
                v-model="form.content"
                type="textarea"
                :rows="18"
                resize="vertical"
                maxlength="20000"
                show-word-limit
                placeholder="请输入 Prompt 模板内容，例如：请根据 {{project_name}} 生成技术方案..."
              />
            </el-form-item>
          </el-form>

          <div class="assist-layout">
            <div class="assist-card">
              <div class="assist-head">
                <div>
                  <div class="assist-title">变量识别</div>
                  <div class="assist-desc">系统自动识别模板中的 &#123;&#123;变量&#125;&#125;</div>
                </div>
                <el-tag v-if="unknownVariables.length" type="warning" effect="light">
                  {{ unknownVariables.length }} 个未知变量
                </el-tag>
                <el-tag v-else type="success" effect="light">
                  变量正常
                </el-tag>
              </div>

              <div v-if="templateVariables.length" class="variable-list">
                <div
                  v-for="key in templateVariables"
                  :key="key"
                  class="variable-item"
                  :class="{ unknown: !knownVariableMap[key] }"
                >
                  <div class="variable-code">{{ key }}</div>
                  <div class="variable-name">{{ variableLabel(key) }}</div>
                </div>
              </div>
              <el-empty v-else description="模板内容中暂无变量" />

              <el-alert
                v-if="unknownVariables.length"
                class="assist-alert"
                title="存在未知变量，请确认是否拼写错误；系统生成时未知变量会按“待补充”处理。"
                type="warning"
                show-icon
                :closable="false"
              />
            </div>

            <div class="assist-card">
              <div class="assist-head">
                <div>
                  <div class="assist-title">预览替换效果</div>
                  <div class="assist-desc">用示例项目数据预览模板最终效果</div>
                </div>
                <el-button text type="primary" @click="resetPreviewVars">恢复示例</el-button>
              </div>

              <div class="preview-vars">
                <el-input
                  v-for="key in templateVariables"
                  :key="key"
                  v-model="previewVars[key]"
                  :placeholder="variableLabel(key)"
                  clearable
                >
                  <template #prepend>{{ variableLabel(key) }}</template>
                </el-input>
              </div>

              <div class="preview-box markdown-box">{{ previewContent }}</div>
            </div>
          </div>
        </template>

        <el-empty v-else description="请选择左侧模板，或点击新增模板">
          <el-button type="primary" :icon="Plus" @click="openCreateTemplate">新增模板</el-button>
        </el-empty>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, nextTick, onMounted, reactive, ref, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Refresh } from '@element-plus/icons-vue'
import {
  createPromptTemplate,
  deletePromptTemplate,
  getPromptTemplate,
  pagePromptTemplates,
  updatePromptTemplate
} from '@/api/promptTemplate'
import { listEnabledTemplateVariables } from '@/api/templateVariable'
import PageFooterPager from '@/components/PageFooterPager.vue'

const MODEL_PROVIDER = 'qwen'
const MODEL_NAME = 'qwen3.5-plus-2026-04-20'

const loading = ref(false)
const saving = ref(false)
const editMode = ref(false)
const keyword = ref('')
const templates = ref([])
const variableDictionary = ref([])
const selectedTemplate = ref(null)
const sceneGroup = ref('BID')
const timer = ref(null)
const formRef = ref()

const pager = reactive({
  page: 1,
  size: 10,
  total: 0
})

const form = reactive({
  id: null,
  name: '',
  scene: 'BID_TECH',
  content: '',
  modelProvider: MODEL_PROVIDER,
  modelName: MODEL_NAME,
  versionNo: 'V1.0',
  status: 1,
  remark: ''
})

const previewVars = reactive({})

const sceneGroupOptions = [
  { label: '标书', value: 'BID' },
  { label: '合同', value: 'CONTRACT' },
  { label: '可研', value: 'FEASIBILITY' },
  { label: '环评', value: 'EIA' },
  { label: '交评', value: 'TIA' },
  { label: '全部', value: 'ALL' }
]

const sceneOptions = [
  { label: '技术标模板', value: 'BID_TECH', group: 'BID' },
  { label: '商务标模板', value: 'BID_BUSINESS', group: 'BID' },
  { label: '完整标书模板', value: 'BID_FULL', group: 'BID' },
  { label: '通用标书模板', value: 'BID', group: 'BID' },
  { label: '合同模板', value: 'CONTRACT', group: 'CONTRACT' },
  { label: '可研报告模板', value: 'FEASIBILITY', group: 'FEASIBILITY' },
  { label: '环境影响评价模板', value: 'EIA', group: 'EIA' },
  { label: '交通影响评价模板', value: 'TIA', group: 'TIA' }
]

const fallbackVariableMap = {
  project_name: '项目名称',
  project_code: '项目编号',
  project_type: '项目类型',
  client_name: '招标单位',
  tender_name: '招标单位',
  tender_company: '招标单位',
  bidder_name: '投标单位',
  budget_amount: '预算金额',
  period_days: '工期天数',
  tender_deadline: '投标截止时间',
  bid_open_time: '开标时间',
  project_location: '项目地点',
  project_scale: '建设规模',
  service_period: '服务期限',
  quality_target: '质量目标',
  warranty_period: '质保期限',
  project_manager: '项目负责人',
  company_name: '公司名称',
  company_profile: '公司简介',
  qualification_desc: '资质说明',
  case_desc: '业绩案例',
  after_sale_plan: '售后方案',
  implementation_plan: '实施计划',
  knowledge_text: '知识库资料',
  extra_requirement: '额外要求',
  current_date: '当前日期',
  current_time: '当前时间',
  generate_type: '生成类型',
  generate_type_label: '生成类型'
}

const knownVariableMap = computed(() => {
  const map = { ...fallbackVariableMap }
  variableDictionary.value.forEach((item) => {
    if (item.variableKey) {
      map[item.variableKey] = item.variableLabel || item.variableKey
    }
  })
  return map
})

const sampleVars = {
  project_name: '智慧园区建设项目',
  project_code: 'BID202605050001',
  project_type: '信息化项目',
  client_name: '某某招标单位',
  tender_name: '某某招标单位',
  tender_company: '某某招标单位',
  bidder_name: '某某科技有限公司',
  budget_amount: '1,000,000.00',
  period_days: '90',
  tender_deadline: '2026-05-30 17:00:00',
  bid_open_time: '2026-05-31 09:00:00',
  project_location: '待补充',
  project_scale: '待补充',
  service_period: '待补充',
  quality_target: '合格',
  warranty_period: '待补充',
  project_manager: '待补充',
  company_name: '某某科技有限公司',
  company_profile: '公司简介示例内容',
  qualification_desc: '资质说明示例内容',
  case_desc: '类似业绩示例内容',
  after_sale_plan: '售后服务方案示例内容',
  implementation_plan: '实施计划示例内容',
  knowledge_text: '这里会填充知识库检索片段。当前未引用知识库时为空或“暂无”。',
  extra_requirement: '语言正式，章节完整，不要编造证书编号和合同编号。',
  current_date: '2026-05-05',
  current_time: '2026-05-05 09:00:00',
  generate_type: 'bid_tech',
  generate_type_label: '技术标'
}

const rules = {
  name: [{ required: true, message: '请输入模板名称', trigger: 'blur' }],
  scene: [{ required: true, message: '请选择生成场景', trigger: 'change' }],
  content: [{ required: true, message: '请输入模板内容', trigger: 'blur' }]
}

const templateVariables = computed(() => {
  const content = form.content || ''
  const pattern = /\{\{\s*([a-zA-Z0-9_.-]+)\s*}}/g
  const set = new Set()
  let match

  while ((match = pattern.exec(content)) !== null) {
    set.add(match[1])
  }

  return Array.from(set)
})

const unknownVariables = computed(() => {
  return templateVariables.value.filter((key) => !knownVariableMap.value[key])
})

const previewContent = computed(() => {
  let text = form.content || ''

  templateVariables.value.forEach((key) => {
    const value = previewVars[key] || sampleValue(key) || '待补充'
    const reg = new RegExp(`\\{\\{\\s*${escapeRegExp(key)}\\s*}}`, 'g')
    text = text.replace(reg, value)
  })

  return text || '暂无预览内容'
})

onMounted(async () => {
  await loadVariableDictionary()
  await loadTemplates()
})

watch(templateVariables, () => {
  syncPreviewVars()
})

watch(
  () => form.scene,
  () => {
    loadVariableDictionary()
  }
)

async function loadVariableDictionary() {
  try {
    variableDictionary.value = await listEnabledTemplateVariables({
      scene: form.scene || undefined
    })
  } catch (e) {
    variableDictionary.value = []
  }
}

function onKeywordInput() {
  clearTimeout(timer.value)
  timer.value = setTimeout(() => {
    pager.page = 1
    loadTemplates()
  }, 300)
}

function onSceneGroupChange() {
  pager.page = 1
  loadTemplates()
}

async function loadTemplates(selectId) {
  loading.value = true
  try {
    const params = {
      current: pager.page,
      size: pager.size,
      pageNum: pager.page,
      pageSize: pager.size,
      keyword: keyword.value || undefined
    }

    if (sceneGroup.value && sceneGroup.value !== 'ALL') {
      params.sceneGroup = sceneGroup.value
    }

    const res = await pagePromptTemplates(params)
    templates.value = res?.records || []
    pager.total = Number(res?.total || 0)

    if (selectId) {
      const next = templates.value.find((item) => String(item.id) === String(selectId))
      if (next) {
        await selectTemplate(next)
      }
    } else if (!selectedTemplate.value && templates.value.length) {
      await selectTemplate(templates.value[0])
    }
  } finally {
    loading.value = false
  }
}

async function selectTemplate(row) {
  if (!row?.id) return

  const detail = await getPromptTemplate(row.id)
  selectedTemplate.value = detail
  editMode.value = true
  fillForm(detail)
}

function openCreateTemplate() {
  selectedTemplate.value = null
  editMode.value = true
  fillForm({
    scene: defaultSceneByGroup(),
    modelProvider: MODEL_PROVIDER,
    modelName: MODEL_NAME,
    versionNo: 'V1.0',
    status: 1
  })

  nextTick(() => {
    formRef.value?.clearValidate?.()
  })
}

function resetEditor() {
  if (selectedTemplate.value?.id) {
    fillForm(selectedTemplate.value)
  } else {
    openCreateTemplate()
  }
}

function fillForm(row = {}) {
  form.id = row.id || null
  form.name = row.name || ''
  form.scene = row.scene || defaultSceneByGroup()
  form.content = row.content || ''
  form.modelProvider = MODEL_PROVIDER
  form.modelName = MODEL_NAME
  form.versionNo = row.versionNo || 'V1.0'
  form.status = row.status === 0 ? 0 : 1
  form.remark = row.remark || ''

  syncPreviewVars()
}

async function saveTemplate() {
  await formRef.value?.validate()

  if (unknownVariables.value.length) {
    await ElMessageBox.confirm(
      `当前模板存在未知变量：${unknownVariables.value.join('、')}。未知变量生成时会按“待补充”处理，是否继续保存？`,
      '未知变量提示',
      {
        type: 'warning',
        confirmButtonText: '继续保存',
        cancelButtonText: '返回修改'
      }
    )
  }

  saving.value = true
  try {
    const payload = {
      name: form.name,
      scene: form.scene,
      content: form.content,
      modelProvider: MODEL_PROVIDER,
      modelName: MODEL_NAME,
      versionNo: form.versionNo || 'V1.0',
      status: form.status,
      remark: form.remark || null
    }

    let savedId = form.id
    if (form.id) {
      await updatePromptTemplate(form.id, payload)
      ElMessage.success('模板已保存')
    } else {
      savedId = await createPromptTemplate(payload)
      ElMessage.success('模板已创建')
    }

    await loadTemplates(savedId)
  } finally {
    saving.value = false
  }
}

async function removeTemplate(row) {
  await ElMessageBox.confirm(`确认删除模板「${row.name}」吗？`, '删除确认', {
    type: 'warning'
  })

  await deletePromptTemplate(row.id)
  ElMessage.success('模板已删除')

  if (selectedTemplate.value?.id === row.id) {
    selectedTemplate.value = null
    editMode.value = false
  }

  await loadTemplates()
}

function syncPreviewVars() {
  templateVariables.value.forEach((key) => {
    if (!(key in previewVars)) {
      previewVars[key] = sampleValue(key) || ''
    }
  })

  Object.keys(previewVars).forEach((key) => {
    if (!templateVariables.value.includes(key)) {
      delete previewVars[key]
    }
  })
}

function resetPreviewVars() {
  templateVariables.value.forEach((key) => {
    previewVars[key] = sampleValue(key) || '待补充'
  })
}

function defaultSceneByGroup() {
  const map = {
    BID: 'BID_TECH',
    CONTRACT: 'CONTRACT',
    FEASIBILITY: 'FEASIBILITY',
    EIA: 'EIA',
    TIA: 'TIA'
  }
  return map[sceneGroup.value] || 'BID_TECH'
}

function sceneLabel(value) {
  return sceneOptions.find((item) => item.value === value)?.label || value || '-'
}

function sceneTag(value) {
  const map = {
    BID_TECH: 'primary',
    BID_BUSINESS: 'success',
    BID_FULL: 'warning',
    BID: 'info',
    CONTRACT: 'danger',
    FEASIBILITY: 'success',
    EIA: 'warning',
    TIA: 'info'
  }
  return map[value] || 'info'
}

function variableLabel(key) {
  return knownVariableMap.value[key] || `未知变量：${key}`
}

function sampleValue(key) {
  const item = variableDictionary.value.find((variable) => variable.variableKey === key)
  return item?.exampleValue || item?.defaultValue || sampleVars[key]
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
</script>

<style scoped>
.prompt-page {
  display: grid;
  grid-template-columns: minmax(520px, 0.86fr) minmax(0, 1.14fr);
  gap: 16px;
}

.prompt-left,
.prompt-right {
  min-width: 0;
}

.prompt-right {
  padding: 18px;
}

.scene-filter {
  margin-bottom: 12px;
}

.editor-head,
.assist-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.editor-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.section-title {
  font-size: 18px;
  font-weight: 800;
  color: var(--text-main);
}

.section-desc {
  margin-top: 6px;
  color: var(--text-sub);
  line-height: 1.6;
  font-size: 13px;
}

.prompt-form {
  margin-top: 16px;
}

.option-code {
  float: right;
  color: var(--text-sub);
  font-size: 12px;
  margin-left: 20px;
}

.assist-layout {
  display: grid;
  grid-template-columns: minmax(280px, 0.78fr) minmax(0, 1.22fr);
  gap: 14px;
  margin-top: 14px;
}

.assist-card {
  min-width: 0;
  padding: 14px;
  border: 1px solid var(--border);
  border-radius: 14px;
  background: #f8fafc;
}

.assist-title {
  font-weight: 800;
  color: var(--text-main);
}

.assist-desc {
  margin-top: 4px;
  color: var(--text-sub);
  font-size: 12px;
}

.variable-list {
  display: grid;
  grid-template-columns: 1fr;
  gap: 8px;
  margin-top: 12px;
  max-height: 360px;
  overflow: auto;
}

.variable-item {
  padding: 10px;
  border: 1px solid #dbeafe;
  border-radius: 10px;
  background: #eff6ff;
}

.variable-item.unknown {
  border-color: #fed7aa;
  background: #fff7ed;
}

.variable-code {
  font-family: Consolas, Monaco, monospace;
  color: #2563eb;
  font-weight: 800;
  word-break: break-all;
}

.variable-item.unknown .variable-code {
  color: #ea580c;
}

.variable-name {
  margin-top: 4px;
  color: var(--text-sub);
  font-size: 12px;
}

.assist-alert {
  margin-top: 12px;
}

.preview-vars {
  display: grid;
  grid-template-columns: 1fr;
  gap: 8px;
  margin-top: 12px;
  max-height: 180px;
  overflow: auto;
}

.preview-box {
  margin-top: 12px;
  height: 360px;
  overflow: auto;
  white-space: pre-wrap;
}

.table-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  white-space: nowrap;
}

@media (max-width: 1280px) {
  .prompt-page {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 920px) {
  .assist-layout {
    grid-template-columns: 1fr;
  }

  .editor-head,
  .assist-head {
    flex-direction: column;
  }
}
</style>
