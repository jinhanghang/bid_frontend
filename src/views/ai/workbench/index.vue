<template>
  <div class="page">
    <div class="page-body workbench-layout">
      <div class="card workbench-card">
        <div class="section-head">
          <div>
            <div class="section-title">AI生成工作台</div>
            <div class="section-desc">
              按标书业务生成：选择项目 → 选择生成类型 → 自动匹配模板 → 补充缺失信息 → 生成。
            </div>
          </div>
          <el-button class="table-icon-btn" text :icon="Refresh" @click="reloadAllOptions" />
        </div>

        <el-steps :active="activeStep" finish-status="success" class="flow-steps">
          <el-step title="选择项目" />
          <el-step title="选择类型" />
          <el-step title="补充信息" />
          <el-step title="生成查看" />
        </el-steps>

        <el-form label-width="112px" class="workbench-form">
          <el-form-item label="标书项目" required>
            <el-select
              v-model="selectedProjectId"
              filterable
              remote
              clearable
              reserve-keyword
              :remote-method="remoteSearchProjects"
              :loading="projectLoading"
              placeholder="请选择要生成标书的项目"
              style="width: 100%"
              @change="onProjectChange"
            >
              <el-option
                v-for="item in projectOptions"
                :key="item.id"
                :label="projectOptionLabel(item)"
                :value="item.id"
              />
            </el-select>
            <div class="form-tip">
              不再手填业务ID。选择项目后，项目名称、编号、招标单位、预算、工期等信息会自动带入。
            </div>
          </el-form-item>

          <div v-if="selectedProject" class="project-summary">
            <div class="summary-item">
              <span>项目名称</span>
              <strong>{{ selectedProject.projectName || '-' }}</strong>
            </div>
            <div class="summary-item">
              <span>项目编号</span>
              <strong>{{ selectedProject.projectCode || '-' }}</strong>
            </div>
            <div class="summary-item">
              <span>项目类型</span>
              <strong>{{ projectTypeLabel(selectedProject.projectType) }}</strong>
            </div>
            <div class="summary-item">
              <span>招标单位</span>
              <strong>{{ selectedProject.clientName || '-' }}</strong>
            </div>
            <div class="summary-item">
              <span>投标单位</span>
              <strong>{{ selectedProject.bidderName || '-' }}</strong>
            </div>
            <div class="summary-item">
              <span>预算金额</span>
              <strong>{{ formatMoney(selectedProject.budgetAmount) }}</strong>
            </div>
            <div class="summary-item">
              <span>工期天数</span>
              <strong>{{ selectedProject.periodDays || '-' }}</strong>
            </div>
            <div class="summary-item">
              <span>当前状态</span>
              <strong>{{ projectStatusLabel(selectedProject.status) }}</strong>
            </div>
          </div>

          <div v-if="selectedProject" class="readiness-card" v-loading="readinessLoading">
            <div class="readiness-head">
              <div>
                <div class="readiness-title">生成准备度</div>
                <div class="readiness-desc">
                  {{ readinessCheck ? `已完成 ${readinessCheck.passedCount || 0} / ${readinessCheck.totalCount || 0} 项检查` : '正在检查项目生成条件' }}
                </div>
              </div>
              <el-progress
                type="circle"
                :width="62"
                :percentage="readinessCheck?.percent || 0"
                :status="readinessProgressStatus(readinessCheck)"
              />
            </div>

            <div v-if="readinessCheck?.items?.length" class="readiness-items">
              <div
                v-for="item in readinessCheck.items"
                :key="item.key"
                class="readiness-item"
                :class="`is-${item.level || 'info'}`"
              >
                <div class="readiness-item__main">
                  <strong>{{ item.name }}</strong>
                  <span>{{ item.message }}</span>
                </div>
                <el-tag :type="readinessTagType(item)" effect="light">
                  {{ item.passed ? '已完成' : '需处理' }}
                </el-tag>
              </div>
            </div>

            <el-alert
              v-if="readinessCheck?.warnings?.length"
              class="readiness-alert"
              type="warning"
              show-icon
              :closable="false"
            >
              <template #title>
                {{ readinessCheck.warnings.join('；') }}
              </template>
            </el-alert>
          </div>

          <el-form-item label="生成类型" required>
            <div class="generate-type-grid">
              <div
                v-for="item in generateTypes"
                :key="item.value"
                class="generate-type-card"
                :class="{ active: generateForm.generateType === item.value }"
                @click="selectGenerateType(item.value)"
              >
                <div class="generate-type-icon">
                  <el-icon><component :is="item.icon" /></el-icon>
                </div>
                <div class="generate-type-main">
                  <div class="generate-type-title">{{ item.label }}</div>
                  <div class="generate-type-desc">{{ item.desc }}</div>
                  <div class="generate-type-scene">{{ item.sceneText }}</div>
                </div>
              </div>
            </div>
          </el-form-item>

          <el-form-item label="Prompt模板">
            <el-select
              v-model="generateForm.promptTemplateId"
              clearable
              filterable
              :placeholder="templatePlaceholder"
              style="width: 100%"
              @change="onTemplateChange"
            >
              <el-option
                v-for="item in matchedPromptTemplates"
                :key="item.id"
                :label="promptOptionLabel(item)"
                :value="item.id"
              />
            </el-select>
            <div class="form-tip">
              已根据生成类型自动筛选模板；如果不选择，后端会使用该类型的默认模板。
            </div>
            <el-alert
              v-if="selectedProject && !matchedPromptTemplates.length"
              title="当前生成类型暂无启用模板，可以先不选模板生成；建议后续在 Prompt模板 中新增对应场景模板。"
              type="warning"
              show-icon
              :closable="false"
              style="margin-top: 10px"
            />
          </el-form-item>

          <el-form-item label="引用知识库">
            <div class="knowledge-box">
              <el-switch
                v-model="generateForm.useKnowledge"
                active-text="引用"
                inactive-text="不引用"
              />
              <el-select
                v-model="generateForm.knowledgeIds"
                multiple
                clearable
                filterable
                :disabled="!generateForm.useKnowledge"
                :placeholder="selectedProject ? '请选择当前项目所属企业的知识库' : '请先选择标书项目'"
                style="width: 100%; margin-top: 10px"
              >
                <el-option
                  v-for="item in knowledgeBases"
                  :key="item.id"
                  :label="knowledgeOptionLabel(item)"
                  :value="item.id"
                />
              </el-select>
              <div class="form-tip">
                这里只显示当前项目所属企业的知识库。当前你还没接完整向量检索时，建议保持“不引用”。
              </div>
              <el-alert
                v-if="generateForm.useKnowledge && selectedProject && !knowledgeBases.length"
                title="当前项目所属企业暂无可用知识库，请先到知识库管理中新建并上传资料，或关闭引用知识库。"
                type="warning"
                show-icon
                :closable="false"
                style="margin-top: 10px"
              />
            </div>
          </el-form-item>

          <el-form-item label="引用企业资料">
            <div class="knowledge-box">
              <el-switch
                v-model="generateForm.useCompanyMaterials"
                active-text="引用"
                inactive-text="不引用"
                :disabled="!selectedProject"
              />
              <el-select
                v-model="generateForm.companyMaterialIds"
                multiple
                clearable
                filterable
                collapse-tags
                collapse-tags-tooltip
                :disabled="!generateForm.useCompanyMaterials"
                :placeholder="selectedProject ? '请选择当前项目所属企业的资料' : '请先选择标书项目'"
                style="width: 100%; margin-top: 10px"
              >
                <el-option-group
                  v-for="group in companyMaterialGroups"
                  :key="group.type"
                  :label="group.label"
                >
                  <el-option
                    v-for="item in group.items"
                    :key="item.id"
                    :label="companyMaterialOptionLabel(item)"
                    :value="item.id"
                  >
                    <div class="material-option">
                      <span>{{ item.title }}</span>
                      <span class="material-option__meta">
                        {{ materialTypeLabel(item.materialType) }}
                        <template v-if="Number(item.fileExists) === 1"> · 有附件</template>
                      </span>
                    </div>
                  </el-option>
                </el-option-group>
              </el-select>
              <div class="form-tip">
                建议商务标引用公司简介、资质证书、项目业绩；技术标可引用实施团队、售后服务、项目业绩。
              </div>
              <el-alert
                v-if="generateForm.useCompanyMaterials && selectedProject && !companyMaterials.length"
                title="当前项目所属企业暂无启用企业资料，可以先到 企业资料库 中维护。"
                type="warning"
                show-icon
                :closable="false"
                style="margin-top: 10px"
              />
              <div v-if="selectedCompanyMaterials.length" class="company-material-preview">
                <div class="preview-title">已选择 {{ selectedCompanyMaterials.length }} 条企业资料</div>
                <div class="preview-tags">
                  <el-tag
                    v-for="item in selectedCompanyMaterials"
                    :key="item.id"
                    type="success"
                    effect="light"
                  >
                    {{ materialTypeLabel(item.materialType) }}：{{ item.title }}
                  </el-tag>
                </div>
              </div>
            </div>
          </el-form-item>

          <el-form-item v-if="selectedTemplateVariables.length" label="模板变量">
            <div class="variable-check-box">
              <div class="variable-check-head">
                <span>当前模板识别到 {{ selectedTemplateVariables.length }} 个变量</span>
                <el-tag v-if="emptyTemplateVariables.length" type="warning" effect="light">
                  {{ emptyTemplateVariables.length }} 个待补充
                </el-tag>
                <el-tag v-else type="success" effect="light">变量完整</el-tag>
              </div>

              <div v-if="emptyTemplateVariables.length" class="variable-form-grid">
                <el-form-item
                  v-for="key in emptyTemplateVariables"
                  :key="key"
                  :label="variableLabel(key)"
                  label-width="108px"
                  class="inline-variable-item"
                >
                  <el-input
                    v-model="extraVariables[key]"
                    :placeholder="`请输入${variableLabel(key)}`"
                    clearable
                  />
                </el-form-item>
              </div>

              <el-collapse v-if="filledTemplateVariables.length" class="filled-collapse">
                <el-collapse-item title="已自动带入的信息" name="filled">
                  <div class="filled-variable-list">
                    <div v-for="key in filledTemplateVariables" :key="key" class="filled-variable-item">
                      <span>{{ variableLabel(key) }}</span>
                      <strong>{{ displayVariableValue(key) }}</strong>
                    </div>
                  </div>
                </el-collapse-item>
              </el-collapse>
            </div>
          </el-form-item>

          <el-form-item label="生成要求">
            <el-input
              v-model="generateForm.extraRequirement"
              type="textarea"
              :rows="5"
              maxlength="2000"
              show-word-limit
              placeholder="例如：重点突出技术方案、实施计划、售后服务、人员配置；语言正式，章节完整。"
            />
          </el-form-item>

          <el-collapse v-model="advancedPanels" class="advanced-collapse">
            <el-collapse-item title="高级参数，一般不用改" name="advanced">
              <el-row :gutter="12">
                <el-col :span="12">
                  <el-form-item label="温度参数">
                    <el-input-number
                      v-model="generateForm.temperature"
                      :min="0"
                      :max="2"
                      :step="0.1"
                      :precision="1"
                      style="width: 100%"
                    />
                  </el-form-item>
                </el-col>
                <el-col :span="12">
                  <el-form-item label="最大Token">
                    <el-input-number
                      v-model="generateForm.maxTokens"
                      :min="1000"
                      :max="50000"
                      :step="1000"
                      style="width: 100%"
                    />
                  </el-form-item>
                </el-col>
              </el-row>
            </el-collapse-item>
          </el-collapse>

          <div class="form-actions">
            <el-button
              type="primary"
              :icon="MagicStick"
              :loading="generating"
              :disabled="!canGenerate"
              @click="submitGenerate"
            >
              开始生成{{ currentGenerateTypeLabel }}
            </el-button>
            <el-button @click="resetGenerateForm">重置参数</el-button>
            <el-button v-if="lastResultId" type="success" plain @click="goResultPage">查看完整结果</el-button>
            <el-button v-if="selectedProjectId" plain @click="goProjectGenerateRecords">返回项目生成记录</el-button>
          </div>
        </el-form>
      </div>

      <div class="card result-card">
        <div class="result-head">
          <div>
            <div class="section-title">生成结果</div>
            <div class="section-desc">
              生成完成后可在这里预览，也可进入“生成结果”页面查看历史结果。
            </div>
          </div>
          <div class="result-actions">
            <el-button :icon="View" :disabled="!lastResultId" @click="goResultPage">结果详情</el-button>
            <el-button :icon="View" :disabled="!selectedProjectId" @click="goProjectGenerateRecords">项目记录</el-button>
            <el-button :icon="CopyDocument" :disabled="!result.contentMarkdown" @click="copyMarkdown">复制Markdown</el-button>
            <el-button :icon="Download" :disabled="!lastResultId" :loading="exportingWord" @click="handleExportWord">导出Word</el-button>
            <el-button :icon="Download" :disabled="!lastResultId" :loading="exportingMarkdown" @click="handleExportMarkdown">导出Markdown</el-button>
          </div>
        </div>

        <div v-if="result.resultId" class="result-meta">
          <span>结果ID：{{ result.resultId }}</span>
          <span>任务ID：{{ result.taskId || '-' }}</span>
          <span>状态：{{ result.status || '-' }}</span>
          <span>模型：{{ result.modelProvider || '-' }} / {{ result.modelName || '-' }}</span>
        </div>

        <div v-if="generating" class="result-loading">
          <el-icon class="is-loading"><Loading /></el-icon>
          <span>AI 正在生成，请稍等...</span>
        </div>

        <div v-else-if="result.contentHtml" class="markdown-box result-content" v-html="result.contentHtml"></div>
        <div v-else-if="result.contentMarkdown" class="markdown-box result-content">{{ result.contentMarkdown }}</div>
        <el-empty v-else description="请选择项目后开始生成" />
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, markRaw, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  Collection,
  CopyDocument,
  Download,
  Files,
  Loading,
  MagicStick,
  Notebook,
  Refresh,
  View
} from '@element-plus/icons-vue'
import { createCrudApi } from '@/api/crud'
import { downloadExportFile, exportMarkdown, exportWord, generateBidProject } from '@/api/ai'
import { getBidProject, getBidProjectGenerateCheck, pageBidProjects } from '@/api/bidProject'
import { listKnowledgeBases } from '@/api/knowledge'
import { listCompanyMaterials } from '@/api/companyMaterial'
import { listEnabledTemplateVariables } from '@/api/templateVariable'

const route = useRoute()
const router = useRouter()

const projectLoading = ref(false)
const generating = ref(false)
const exportingWord = ref(false)
const exportingMarkdown = ref(false)
const projectOptions = ref([])
const promptTemplates = ref([])
const knowledgeBases = ref([])
const companyMaterials = ref([])
const variableDictionary = ref([])
const selectedProjectId = ref(null)
const selectedProject = ref(null)
const readinessCheck = ref(null)
const readinessLoading = ref(false)
const advancedPanels = ref([])
const result = reactive({})
const extraVariables = reactive({})

const generateTypes = [
  {
    value: 'tech',
    label: '技术标',
    sceneList: ['BID_TECH'],
    bizType: 'bid_tech',
    sceneText: '匹配 BID_TECH',
    desc: '技术方案、实施计划、质量保障、售后服务',
    icon: markRaw(Notebook)
  },
  {
    value: 'business',
    label: '商务标',
    sceneList: ['BID_BUSINESS'],
    bizType: 'bid_business',
    sceneText: '匹配 BID_BUSINESS',
    desc: '公司介绍、资质响应、业绩、人员、服务承诺',
    icon: markRaw(Collection)
  },
  {
    value: 'full',
    label: '完整标书',
    sceneList: ['BID_FULL', 'BID'],
    bizType: 'bid_full',
    sceneText: '匹配 BID_FULL / BID',
    desc: '一次性生成完整标书草稿，后续可拆章节精修',
    icon: markRaw(Files)
  }
]

const materialTypes = [
  { label: '公司简介', value: 'COMPANY_PROFILE' },
  { label: '资质证书', value: 'QUALIFICATION' },
  { label: '人员证书', value: 'PERSON_CERT' },
  { label: '项目业绩', value: 'CASE' },
  { label: '荣誉奖项', value: 'HONOR' },
  { label: '售后服务', value: 'AFTER_SALE' },
  { label: '实施团队', value: 'TEAM' },
  { label: '其他资料', value: 'OTHER' }
]

const generateForm = reactive({
  generateType: 'tech',
  promptTemplateId: null,
  useKnowledge: false,
  knowledgeIds: [],
  useCompanyMaterials: false,
  companyMaterialIds: [],
  extraRequirement: '',
  temperature: 0.7,
  maxTokens: 8192
})

const currentGenerateType = computed(() => {
  return findGenerateType(generateForm.generateType)
})

const currentGenerateTypeLabel = computed(() => {
  return currentGenerateType.value?.label ? `（${currentGenerateType.value.label}）` : ''
})

const matchedPromptTemplates = computed(() => {
  const scenes = currentGenerateType.value.sceneList || []
  return promptTemplates.value.filter((item) => {
    if (Number(item.status) === 0) return false
    const scene = String(item.scene || '').toUpperCase()
    return scenes.includes(scene)
  })
})

const selectedCompanyMaterials = computed(() => {
  const ids = new Set(generateForm.companyMaterialIds.map((id) => String(id)))
  return companyMaterials.value.filter((item) => ids.has(String(item.id)))
})

const companyMaterialGroups = computed(() => {
  return materialTypes
    .map((type) => ({
      ...type,
      items: companyMaterials.value.filter((item) => item.materialType === type.value)
    }))
    .filter((group) => group.items.length)
})

const companyMaterialVariables = computed(() => {
  const map = {
    company_material_text: '',
    company_profile: '',
    qualification_desc: '',
    person_cert_desc: '',
    case_desc: '',
    honor_desc: '',
    after_sale_plan: '',
    implementation_team: '',
    team_desc: ''
  }

  selectedCompanyMaterials.value.forEach((item) => {
    const section = buildCompanyMaterialSection(item)
    map.company_material_text = appendText(map.company_material_text, section)

    if (item.materialType === 'COMPANY_PROFILE') {
      map.company_profile = appendText(map.company_profile, section)
    } else if (item.materialType === 'QUALIFICATION') {
      map.qualification_desc = appendText(map.qualification_desc, section)
    } else if (item.materialType === 'PERSON_CERT') {
      map.person_cert_desc = appendText(map.person_cert_desc, section)
    } else if (item.materialType === 'CASE') {
      map.case_desc = appendText(map.case_desc, section)
    } else if (item.materialType === 'HONOR') {
      map.honor_desc = appendText(map.honor_desc, section)
    } else if (item.materialType === 'AFTER_SALE') {
      map.after_sale_plan = appendText(map.after_sale_plan, section)
    } else if (item.materialType === 'TEAM') {
      map.implementation_team = appendText(map.implementation_team, section)
      map.team_desc = appendText(map.team_desc, section)
    }
  })

  return map
})

const selectedPromptTemplate = computed(() => {
  return promptTemplates.value.find((item) => String(item.id) === String(generateForm.promptTemplateId)) || null
})

const selectedTemplateVariables = computed(() => {
  if (!selectedPromptTemplate.value?.content) return []
  const content = selectedPromptTemplate.value.content
  const pattern = /\{\{\s*([a-zA-Z0-9_.-]+)\s*}}/g
  const result = new Set()
  let match

  while ((match = pattern.exec(content)) !== null) {
    const key = match[1]
    if (!ignoredVariableKeys.has(key)) {
      result.add(key)
    }
  }

  return Array.from(result)
})

const knownVariables = computed(() => {
  const project = selectedProject.value || {}
  const vars = {
    project_name: project.projectName,
    project_code: project.projectCode,
    project_type: project.projectType,
    client_name: project.clientName,
    tender_name: project.clientName,
    tender_company: project.clientName,
    bidder_name: project.bidderName,
    budget_amount: project.budgetAmount,
    period_days: project.periodDays,
    tender_deadline: project.tenderDeadline,
    bid_open_time: project.bidOpenTime,
    remark: project.remark,
    generate_type: currentGenerateType.value.value,
    generate_type_label: currentGenerateType.value.label
  }

  Object.entries(companyMaterialVariables.value).forEach(([key, value]) => {
    if (!isBlank(value)) {
      vars[key] = value
    }
  })

  Object.keys(extraVariables).forEach((key) => {
    vars[key] = extraVariables[key]
  })

  return vars
})

const emptyTemplateVariables = computed(() => {
  return selectedTemplateVariables.value.filter((key) => isBlank(knownVariables.value[key]))
})

const filledTemplateVariables = computed(() => {
  return selectedTemplateVariables.value.filter((key) => !isBlank(knownVariables.value[key]))
})

const activeStep = computed(() => {
  if (result.resultId) return 4
  if (selectedProject.value && generateForm.generateType && !emptyTemplateVariables.value.length) return 3
  if (selectedProject.value && generateForm.generateType) return 2
  if (selectedProject.value) return 1
  return 0
})

const canGenerate = computed(() => {
  const checkPass = !readinessCheck.value || readinessCheck.value.canGenerate !== false
  return Boolean(selectedProjectId.value && generateForm.generateType && !generating.value && checkPass)
})

const lastResultId = computed(() => result.resultId || null)

const templatePlaceholder = computed(() => {
  if (!selectedProject.value) return '请先选择标书项目'
  if (!matchedPromptTemplates.value.length) return '当前类型暂无模板，可不选使用默认模板'
  return '请选择Prompt模板'
})

function findGenerateType(value) {
  return generateTypes.find((item) => item.value === value) || generateTypes[0]
}

const ignoredVariableKeys = new Set([
  'knowledge_text',
  'company_material_text',
  'extra_requirement',
  'system_prompt',
  'current_date',
  'current_time'
])

const fallbackVariableLabelMap = {
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
  company_material_text: '企业资料库',
  person_cert_desc: '人员证书',
  honor_desc: '荣誉奖项',
  implementation_team: '实施团队',
  team_desc: '实施团队',
  generate_type: '生成类型',
  generate_type_label: '生成类型'
}

const variableLabelMap = computed(() => {
  const map = { ...fallbackVariableLabelMap }
  variableDictionary.value.forEach((item) => {
    if (item.variableKey) {
      map[item.variableKey] = item.variableLabel || item.variableKey
    }
  })
  return map
})

onMounted(async () => {
  await reloadAllOptions()
  const queryProjectId = route.query.projectId
  if (queryProjectId) {
    selectedProjectId.value = Number(queryProjectId)
    await onProjectChange(selectedProjectId.value)
  }
})

watch(
  () => generateForm.generateType,
  async (newType, oldType) => {
    syncDefaultRequirementWhenTypeChanged(newType, oldType)
    autoSelectPromptTemplate()
    await loadTemplateVariables()
    if (selectedProject.value && companyMaterials.value.length) {
      autoRecommendCompanyMaterials()
    }
    initExtraVariables()
    clearResult()
  }
)

watch(
  () => generateForm.promptTemplateId,
  () => {
    initExtraVariables()
  }
)

async function reloadAllOptions() {
  await Promise.all([
    loadProjects(''),
    loadPromptTemplates(),
    loadTemplateVariables()
  ])

  if (selectedProject.value?.enterpriseId) {
    await loadKnowledgeBases(selectedProject.value.enterpriseId)
    await loadCompanyMaterials(selectedProject.value.enterpriseId)
  } else {
    knowledgeBases.value = []
    companyMaterials.value = []
  }

  autoSelectPromptTemplate()
  initExtraVariables()
}

async function loadTemplateVariables() {
  try {
    const scene = currentGenerateType.value?.sceneList?.[0]
    variableDictionary.value = await listEnabledTemplateVariables({
      scene
    })
  } catch (e) {
    variableDictionary.value = []
  }
}

async function loadProjects(keyword = '') {
  projectLoading.value = true
  try {
    const res = await pageBidProjects({
      current: 1,
      size: 50,
      pageNum: 1,
      pageSize: 50,
      keyword: keyword || undefined
    })
    projectOptions.value = res?.records || []
  } finally {
    projectLoading.value = false
  }
}

function remoteSearchProjects(keyword) {
  loadProjects(keyword)
}

async function loadPromptTemplates() {
  try {
    promptTemplates.value = await createCrudApi('/prompt-template').list()
  } catch (e) {
    promptTemplates.value = []
  }
}

async function loadKnowledgeBases(enterpriseId) {
  if (!enterpriseId) {
    knowledgeBases.value = []
    generateForm.knowledgeIds = []
    generateForm.useKnowledge = false
    return
  }

  try {
    knowledgeBases.value = await listKnowledgeBases({
      status: 1,
      enterpriseId
    })

    const allowIds = new Set(knowledgeBases.value.map((item) => Number(item.id)))
    generateForm.knowledgeIds = generateForm.knowledgeIds.filter((id) => allowIds.has(Number(id)))

    if (!knowledgeBases.value.length) {
      generateForm.useKnowledge = false
    }
  } catch (e) {
    knowledgeBases.value = []
    generateForm.knowledgeIds = []
    generateForm.useKnowledge = false
  }
}

async function loadCompanyMaterials(enterpriseId) {
  if (!enterpriseId) {
    companyMaterials.value = []
    generateForm.companyMaterialIds = []
    generateForm.useCompanyMaterials = false
    return
  }

  try {
    companyMaterials.value = await listCompanyMaterials({
      enterpriseId,
      status: 1
    })

    const allowIds = new Set(companyMaterials.value.map((item) => Number(item.id)))
    generateForm.companyMaterialIds = generateForm.companyMaterialIds.filter((id) => allowIds.has(Number(id)))

    if (!companyMaterials.value.length) {
      generateForm.useCompanyMaterials = false
    }
  } catch (e) {
    companyMaterials.value = []
    generateForm.companyMaterialIds = []
    generateForm.useCompanyMaterials = false
  }
}

async function loadReadinessCheck(projectId) {
  if (!projectId) {
    readinessCheck.value = null
    return
  }

  readinessLoading.value = true
  try {
    readinessCheck.value = await getBidProjectGenerateCheck(projectId)
  } catch (e) {
    readinessCheck.value = null
  } finally {
    readinessLoading.value = false
  }
}

function readinessTagType(item) {
  if (item?.passed) return 'success'
  if (item?.level === 'error') return 'danger'
  if (item?.level === 'warning') return 'warning'
  return 'info'
}

function readinessProgressStatus(check) {
  if (!check) return undefined
  if (check.canGenerate === false) return 'exception'
  if ((check.percent || 0) >= 85) return 'success'
  if ((check.percent || 0) < 50) return 'warning'
  return undefined
}

async function onProjectChange(projectId) {
  clearResult()
  clearExtraVariables()

  if (!projectId) {
    selectedProject.value = null
    readinessCheck.value = null
    resetGenerateForm()
    return
  }

  const detail = await getBidProject(projectId)
  selectedProject.value = detail
  await loadReadinessCheck(detail.id)

  if (!projectOptions.value.some((item) => String(item.id) === String(detail.id))) {
    projectOptions.value.unshift(detail)
  }

  generateForm.knowledgeIds = parseKnowledgeIds(detail)
  generateForm.useKnowledge = false
  generateForm.extraRequirement = buildDefaultRequirement(detail)
  generateForm.temperature = 0.7
  generateForm.maxTokens = 8192

  await loadKnowledgeBases(detail.enterpriseId)
  await loadCompanyMaterials(detail.enterpriseId)
  autoRecommendCompanyMaterials()
  autoSelectPromptTemplate()
  initExtraVariables()
}

function selectGenerateType(value) {
  if (generateForm.generateType === value) return
  generateForm.generateType = value
}

function autoSelectPromptTemplate() {
  const selected = selectedPromptTemplate.value
  if (selected && matchedPromptTemplates.value.some((item) => String(item.id) === String(selected.id))) {
    return
  }

  const projectTemplateId = selectedProject.value?.promptTemplateId
  const projectTemplate = matchedPromptTemplates.value.find((item) => String(item.id) === String(projectTemplateId))
  if (projectTemplate) {
    generateForm.promptTemplateId = projectTemplate.id
    return
  }

  generateForm.promptTemplateId = matchedPromptTemplates.value[0]?.id || null
}

function onTemplateChange() {
  initExtraVariables()
}

function initExtraVariables() {
  selectedTemplateVariables.value.forEach((key) => {
    if (!(key in extraVariables)) {
      extraVariables[key] = templateVariableDefaultValue(key) || ''
    }
  })
}

function clearExtraVariables() {
  Object.keys(extraVariables).forEach((key) => {
    delete extraVariables[key]
  })
}

function templateVariableDefaultValue(key) {
  const item = variableDictionary.value.find((variable) => variable.variableKey === key)
  return item?.defaultValue || ''
}

function parseKnowledgeIds(project) {
  if (Array.isArray(project?.knowledgeIdList)) {
    return project.knowledgeIdList.map(Number).filter((id) => Number.isFinite(id))
  }

  if (Array.isArray(project?.knowledgeIds)) {
    return project.knowledgeIds.map(Number).filter((id) => Number.isFinite(id))
  }

  const raw = project?.knowledgeIds
  if (typeof raw === 'string' && raw.trim()) {
    try {
      const arr = JSON.parse(raw)
      return Array.isArray(arr) ? arr.map(Number).filter((id) => Number.isFinite(id)) : []
    } catch (e) {
      return []
    }
  }

  return []
}

function autoRecommendCompanyMaterials() {
  if (!companyMaterials.value.length) {
    generateForm.useCompanyMaterials = false
    generateForm.companyMaterialIds = []
    return
  }

  const recommendTypes = currentGenerateType.value.value === 'business'
    ? ['COMPANY_PROFILE', 'QUALIFICATION', 'CASE', 'HONOR', 'PERSON_CERT']
    : ['COMPANY_PROFILE', 'CASE', 'AFTER_SALE', 'TEAM', 'QUALIFICATION']

  const selected = companyMaterials.value
    .filter((item) => recommendTypes.includes(item.materialType))
    .slice(0, 8)
    .map((item) => item.id)

  generateForm.companyMaterialIds = selected
  generateForm.useCompanyMaterials = selected.length > 0
}

function buildCompanyMaterialSection(item) {
  const lines = [`【${materialTypeLabel(item.materialType)}】${item.title || ''}`]
  if (item.content) {
    lines.push(item.content)
  }
  if (item.validStartDate || item.validEndDate) {
    lines.push(`有效期：${item.validStartDate || '开始不限'} 至 ${item.validEndDate || '长期有效'}`)
  }
  return lines.filter(Boolean).join('\n')
}

function appendText(oldValue, text) {
  if (isBlank(text)) return oldValue || ''
  if (isBlank(oldValue)) return text
  return `${oldValue}\n\n${text}`
}

function materialTypeLabel(value) {
  return materialTypes.find((item) => item.value === value)?.label || value || '-'
}

function companyMaterialOptionLabel(item) {
  return `${materialTypeLabel(item.materialType)}：${item.title || `资料#${item.id}`}`
}

function syncDefaultRequirementWhenTypeChanged(newType, oldType) {
  if (!selectedProject.value) return

  const oldDefaultRequirement = buildDefaultRequirement(selectedProject.value, findGenerateType(oldType))
  const newDefaultRequirement = buildDefaultRequirement(selectedProject.value, findGenerateType(newType))
  const currentRequirement = String(generateForm.extraRequirement || '').trim()

  // 只有在用户没有手工改过“生成要求”时，才跟随生成类型自动切换；
  // 如果用户已经自己写了要求，切换类型不覆盖用户输入。
  if (!currentRequirement || currentRequirement === oldDefaultRequirement) {
    generateForm.extraRequirement = newDefaultRequirement
  }
}

function buildDefaultRequirement(project, typeItem = currentGenerateType.value) {
  const name = project?.projectName || ''
  if (!name) return ''

  const safeTip = '对缺失信息使用“待补充”，不要编造资质证书编号、金额、业绩合同编号等敏感信息。'

  if (typeItem?.value === 'business') {
    return `请围绕“${name}”生成一份结构完整、语言正式、可继续编辑的商务标草稿。重点包含公司介绍、资质响应、业绩案例、人员证书、服务承诺、商务响应偏离说明等内容。${safeTip}`
  }

  if (typeItem?.value === 'full') {
    return `请围绕“${name}”生成一份结构完整、语言正式、可继续编辑的完整标书草稿。请按目录组织技术标、商务标、企业资料响应、实施计划、售后服务等章节。${safeTip}`
  }

  return `请围绕“${name}”生成一份结构完整、语言正式、可继续编辑的技术标草稿。重点包含技术方案、实施计划、质量保障、安全措施、人员配置、售后服务等内容。${safeTip}`
}

async function submitGenerate() {
  if (!selectedProjectId.value) {
    ElMessage.warning('请先选择标书项目')
    return
  }

  if (!generateForm.generateType) {
    ElMessage.warning('请选择生成类型')
    return
  }

  if (generateForm.useKnowledge && !generateForm.knowledgeIds.length) {
    ElMessage.warning('已开启引用知识库，请至少选择一个知识库')
    return
  }

  if (generateForm.useCompanyMaterials && !generateForm.companyMaterialIds.length) {
    ElMessage.warning('已开启引用企业资料，请至少选择一条企业资料')
    return
  }

  const stillEmpty = emptyTemplateVariables.value.filter((key) => isBlank(extraVariables[key]))
  if (stillEmpty.length) {
    const names = stillEmpty.map((key) => variableLabel(key)).join('、')
    await ElMessageBox.confirm(
      `以下模板变量未补充：${names}。继续生成时会按“待补充”处理，是否继续？`,
      '模板变量未完整',
      {
        type: 'warning',
        confirmButtonText: '继续生成',
        cancelButtonText: '返回补充'
      }
    )
  }

  generating.value = true
  clearResult()

  try {
    const payload = {
      bizType: currentGenerateType.value.bizType,
      promptTemplateId: generateForm.promptTemplateId || undefined,
      useKnowledge: Boolean(generateForm.useKnowledge),
      knowledgeIds: generateForm.useKnowledge ? generateForm.knowledgeIds : [],
      useCompanyMaterials: Boolean(generateForm.useCompanyMaterials),
      companyMaterialIds: generateForm.useCompanyMaterials ? generateForm.companyMaterialIds : [],
      variables: buildPayloadVariables(),
      extraRequirement: generateForm.extraRequirement || undefined,
      temperature: toNumberOrUndefined(generateForm.temperature),
      maxTokens: toNumberOrUndefined(generateForm.maxTokens)
    }

    const res = await generateBidProject(selectedProjectId.value, payload)
    Object.assign(result, res || {})
    ElMessage.success('生成完成，可返回项目详情的“生成记录”查看')
  } finally {
    generating.value = false
  }
}

function buildPayloadVariables() {
  const variables = {}

  Object.entries(knownVariables.value).forEach(([key, value]) => {
    if (!isBlank(value)) {
      variables[key] = value
    }
  })

  selectedTemplateVariables.value.forEach((key) => {
    if (isBlank(variables[key])) {
      variables[key] = isBlank(extraVariables[key]) ? '待补充' : extraVariables[key]
    }
  })

  return variables
}

function resetGenerateForm() {
  generateForm.generateType = 'tech'
  generateForm.useKnowledge = false
  generateForm.knowledgeIds = selectedProject.value ? parseKnowledgeIds(selectedProject.value) : []
  generateForm.useCompanyMaterials = false
  generateForm.companyMaterialIds = []
  generateForm.extraRequirement = selectedProject.value ? buildDefaultRequirement(selectedProject.value) : ''
  generateForm.temperature = 0.7
  generateForm.maxTokens = 8192
  autoSelectPromptTemplate()
  initExtraVariables()
}

function clearResult() {
  for (const key of Object.keys(result)) {
    delete result[key]
  }
}

function toNumberOrUndefined(value) {
  if (value === '' || value === null || value === undefined) return undefined
  const numberValue = Number(value)
  return Number.isFinite(numberValue) ? numberValue : undefined
}

async function copyMarkdown() {
  if (!result.contentMarkdown) {
    ElMessage.warning('暂无可复制内容')
    return
  }

  await navigator.clipboard.writeText(result.contentMarkdown)
  ElMessage.success('已复制Markdown内容')
}

async function handleExportWord() {
  if (!lastResultId.value) return

  exportingWord.value = true
  try {
    const file = await exportWord(lastResultId.value)
    ElMessage.success('Word导出成功')
    await openExportedFile(file)
  } finally {
    exportingWord.value = false
  }
}

async function handleExportMarkdown() {
  if (!lastResultId.value) return

  exportingMarkdown.value = true
  try {
    const file = await exportMarkdown(lastResultId.value)
    ElMessage.success('Markdown导出成功')
    await openExportedFile(file)
  } finally {
    exportingMarkdown.value = false
  }
}

async function openExportedFile(file) {
  if (!file?.id) {
    ElMessage.error('导出成功但没有返回文件ID，无法下载')
    return
  }

  const blob = await downloadExportFile(file.id)
  downloadBlob(blob, file.originalName || file.fileName || '导出文件')
}

function downloadBlob(blob, fileName) {
  const url = window.URL.createObjectURL(blob)
  const link = document.createElement('a')

  link.href = url
  link.download = sanitizeFileName(fileName)
  link.style.display = 'none'

  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)

  window.URL.revokeObjectURL(url)
}

function sanitizeFileName(fileName) {
  return String(fileName || '导出文件')
    .replace(/[\\/:*?"<>|]/g, '_')
    .trim() || '导出文件'
}

function goResultPage() {
  if (lastResultId.value) {
    router.push({ path: '/ai/results', query: { resultId: lastResultId.value } })
  } else {
    router.push('/ai/results')
  }
}

function goProjectGenerateRecords() {
  if (!selectedProjectId.value) {
    ElMessage.warning('请先选择项目')
    return
  }

  router.push({
    path: '/bid/projects',
    query: {
      projectId: selectedProjectId.value,
      tab: 'generateRecords'
    }
  })
}

function projectOptionLabel(item) {
  const code = item.projectCode ? `【${item.projectCode}】` : ''
  const client = item.clientName ? ` - ${item.clientName}` : ''
  return `${code}${item.projectName || `项目#${item.id}`}${client}`
}

function promptOptionLabel(item) {
  const scene = item.scene ? `（${item.scene}）` : ''
  return `${item.name || `模板#${item.id}`}${scene}`
}

function knowledgeOptionLabel(item) {
  const enterprise = item.enterpriseName ? ` - ${item.enterpriseName}` : ''
  return `${item.kbName || `知识库#${item.id}`}${enterprise}`
}

function variableLabel(key) {
  return variableLabelMap.value[key] || key
}

function displayVariableValue(key) {
  const value = knownVariables.value[key]
  if (isBlank(value)) return '-'
  return String(value)
}

function projectStatusLabel(value) {
  const map = {
    DRAFT: '草稿',
    MATERIAL_READY: '资料已准备',
    GENERATING: '生成中',
    GENERATED: '已生成',
    EXPORTED: '已导出',
    ARCHIVED: '已归档',
    CANCELLED: '已取消',
    FAILED: '生成失败'
  }
  return map[value] || value || '-'
}

function projectTypeLabel(value) {
  const map = {
    CONSTRUCTION: '工程施工',
    GOODS: '货物采购',
    SERVICE: '服务采购',
    IT: '信息化项目',
    OTHER: '其他'
  }
  return map[value] || value || '-'
}

function formatMoney(value) {
  if (value === null || value === undefined || value === '') return '-'
  const number = Number(value)
  if (Number.isNaN(number)) return value
  return `¥ ${number.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function isBlank(value) {
  return value === null || value === undefined || String(value).trim() === ''
}
</script>

<style scoped>
.workbench-layout {
  display: grid;
  grid-template-columns: minmax(560px, 0.92fr) minmax(0, 1.08fr);
  gap: 16px;
}

.workbench-card,
.result-card {
  padding: 18px;
  min-width: 0;
}

.section-head,
.result-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.section-title {
  font-size: 18px;
  font-weight: 800;
}

.section-desc {
  margin-top: 6px;
  color: var(--text-sub);
  line-height: 1.6;
  font-size: 13px;
}

.flow-steps {
  margin: 18px 0 8px;
}

.workbench-form {
  margin-top: 16px;
}

.project-summary {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
  margin: 8px 0 18px 112px;
  padding: 12px;
  border: 1px solid var(--border);
  border-radius: 12px;
  background: #f8fafc;
}

.summary-item {
  min-width: 0;
}

.summary-item span {
  display: block;
  margin-bottom: 4px;
  color: var(--text-sub);
  font-size: 12px;
}

.summary-item strong {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--text-main);
  font-size: 14px;
}

.generate-type-grid {
  width: 100%;
  display: grid;
  grid-template-columns: 1fr;
  gap: 10px;
}

.generate-type-card {
  display: flex;
  gap: 12px;
  padding: 12px;
  border: 1px solid var(--border);
  border-radius: 12px;
  background: #fff;
  cursor: pointer;
  transition: all 0.18s ease;
}

.generate-type-card:hover {
  border-color: #93c5fd;
  box-shadow: 0 8px 18px rgba(37, 99, 235, 0.08);
}

.generate-type-card.active {
  border-color: #2563eb;
  background: #eff6ff;
}

.generate-type-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 42px;
  height: 42px;
  border-radius: 12px;
  background: #e0ecff;
  color: #2563eb;
  font-size: 20px;
  flex-shrink: 0;
}

.generate-type-main {
  min-width: 0;
}

.generate-type-title {
  font-weight: 800;
  color: var(--text-main);
}

.generate-type-desc {
  margin-top: 4px;
  color: var(--text-sub);
  line-height: 1.5;
  font-size: 13px;
}

.generate-type-scene {
  margin-top: 6px;
  color: #2563eb;
  font-size: 12px;
}


.material-option {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  width: 100%;
}

.material-option__meta {
  color: var(--text-sub);
  font-size: 12px;
  flex-shrink: 0;
}

.company-material-preview {
  margin-top: 10px;
  padding: 10px;
  border: 1px solid var(--border);
  border-radius: 12px;
  background: #f8fafc;
}

.preview-title {
  color: var(--text-main);
  font-weight: 800;
  margin-bottom: 8px;
}

.preview-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}


.readiness-card {
  margin: 10px 0 18px;
  padding: 14px;
  border: 1px solid var(--border);
  border-radius: 16px;
  background: #f8fafc;
}

.readiness-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
}

.readiness-title {
  font-size: 15px;
  font-weight: 800;
  color: var(--text-main);
}

.readiness-desc {
  margin-top: 5px;
  color: var(--text-sub);
  font-size: 13px;
}

.readiness-items {
  display: grid;
  gap: 8px;
  margin-top: 12px;
}

.readiness-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 12px;
  border-radius: 12px;
  background: #fff;
  border: 1px solid #e5e7eb;
}

.readiness-item.is-error {
  border-color: #fecaca;
  background: #fff7f7;
}

.readiness-item.is-warning {
  border-color: #fde68a;
  background: #fffbeb;
}

.readiness-item__main {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.readiness-item__main strong {
  color: var(--text-main);
}

.readiness-item__main span {
  color: var(--text-sub);
  font-size: 12px;
  line-height: 1.5;
}

.readiness-alert {
  margin-top: 10px;
}

.knowledge-box,
.variable-check-box {
  width: 100%;
}

.variable-check-box {
  padding: 12px;
  border: 1px solid var(--border);
  border-radius: 12px;
  background: #f8fafc;
}

.variable-check-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  color: var(--text-main);
  font-weight: 700;
  margin-bottom: 10px;
}

.variable-form-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 8px;
}

.inline-variable-item {
  margin-bottom: 0;
}

.filled-collapse {
  margin-top: 10px;
}

.filled-variable-list {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.filled-variable-item {
  padding: 8px 10px;
  border-radius: 8px;
  background: #fff;
  border: 1px solid #e5e7eb;
  min-width: 0;
}

.filled-variable-item span {
  display: block;
  color: var(--text-sub);
  font-size: 12px;
  margin-bottom: 4px;
}

.filled-variable-item strong {
  display: block;
  color: var(--text-main);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.advanced-collapse {
  margin-left: 112px;
  margin-bottom: 16px;
  border-top: 0;
}

.form-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-left: 112px;
}

.result-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 8px;
}

.result-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin: 12px 0;
  color: var(--text-sub);
  font-size: 13px;
}

.result-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  min-height: 360px;
  color: var(--text-sub);
}

.result-content {
  height: calc(100vh - 230px);
  overflow: auto;
}

@media (max-width: 1180px) {
  .workbench-layout {
    grid-template-columns: 1fr;
  }

  .project-summary,
  .advanced-collapse,
  .form-actions {
    margin-left: 0;
  }
}

@media (max-width: 720px) {
  .project-summary,
  .filled-variable-list {
    grid-template-columns: 1fr;
  }

  .section-head,
  .result-head {
    flex-direction: column;
  }

  .result-actions {
    justify-content: flex-start;
  }
}
</style>
