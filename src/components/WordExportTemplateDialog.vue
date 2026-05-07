<template>
  <el-dialog
    v-model="innerVisible"
    title="导出正式 Word"
    width="760px"
    destroy-on-close
    @closed="reset"
  >
    <div class="word-export-dialog">
      <el-descriptions :column="2" border>
        <el-descriptions-item label="生成结果">
          {{ resultTitle }}
        </el-descriptions-item>
        <el-descriptions-item label="生成类型">
          {{ generateTypeLabel(result?.bizType) }}
        </el-descriptions-item>
        <el-descriptions-item label="所属项目">
          {{ project?.projectName || result?.projectName || '-' }}
        </el-descriptions-item>
        <el-descriptions-item label="项目编号">
          {{ project?.projectCode || result?.projectCode || '-' }}
        </el-descriptions-item>
      </el-descriptions>

      <el-alert
        v-if="!hasAnyTemplate"
        class="dialog-alert"
        title="当前没有可用标书模板，将使用系统正式标书版导出。"
        type="info"
        show-icon
        :closable="false"
      />

      <el-radio-group v-model="form.mode" class="mode-list">
        <el-radio-button label="project" :disabled="!projectTemplate">
          使用项目绑定模板
        </el-radio-button>
        <el-radio-button label="enterprise" :disabled="!enterpriseDefaultTemplate">
          使用企业默认模板
        </el-radio-button>
        <el-radio-button label="platform" :disabled="!platformDefaultTemplate">
          使用平台默认模板
        </el-radio-button>
        <el-radio-button label="other" :disabled="!availableTemplates.length">
          选择其他模板
        </el-radio-button>
        <el-radio-button label="plain">
          正式标书版导出
        </el-radio-button>
      </el-radio-group>

      <div class="template-card" v-if="form.mode === 'project'">
        <div class="template-card__title">项目绑定模板</div>
        <div v-if="projectTemplate" class="template-card__body">
          <strong>{{ projectTemplate.templateName }}</strong>
          <span>{{ templateDesc(projectTemplate) }}</span>
        </div>
        <el-empty v-else description="当前项目没有可用绑定模板" />
      </div>

      <div class="template-card" v-if="form.mode === 'enterprise'">
        <div class="template-card__title">企业默认模板</div>
        <div v-if="enterpriseDefaultTemplate" class="template-card__body">
          <strong>{{ enterpriseDefaultTemplate.templateName }}</strong>
          <span>{{ templateDesc(enterpriseDefaultTemplate) }}</span>
        </div>
        <el-empty v-else description="当前企业没有可用默认模板" />
      </div>

      <div class="template-card" v-if="form.mode === 'platform'">
        <div class="template-card__title">平台默认模板</div>
        <div v-if="platformDefaultTemplate" class="template-card__body">
          <strong>{{ platformDefaultTemplate.templateName }}</strong>
          <span>{{ templateDesc(platformDefaultTemplate) }}</span>
        </div>
        <el-empty v-else description="平台没有可用默认模板" />
      </div>

      <div class="template-card" v-if="form.mode === 'other'">
        <div class="template-card__title">选择其他模板</div>
        <el-select
          v-model="form.templateId"
          filterable
          clearable
          placeholder="请选择一个可用的 .docx 标书模板"
          style="width: 100%"
        >
          <el-option
            v-for="item in availableTemplates"
            :key="item.id"
            :label="templateOptionLabel(item)"
            :value="item.id"
          >
            <div class="template-option">
              <span>{{ item.templateName }}</span>
              <span class="template-option__meta">
                {{ templateTypeLabel(item.templateType) }} · {{ scopeLabel(item.templateScope) }}
                <template v-if="Number(item.defaultFlag) === 1"> · 默认</template>
              </span>
            </div>
          </el-option>
        </el-select>
      </div>

      <div class="template-card" v-if="form.mode === 'plain'">
        <div class="template-card__title">正式标书版导出</div>
        <div class="template-card__body">
          <strong>不套用上传的 Word 模板，使用系统内置正式标书样式</strong>
          <span>系统会自动生成封面、目录、章节分页，并统一标题、正文、表格、列表样式。</span>
        </div>
        <div class="formal-options">
          <el-checkbox v-model="form.includeCoverPage">生成封面页</el-checkbox>
          <el-checkbox v-model="form.includeCatalogPage">生成目录页</el-checkbox>
          <el-checkbox v-model="form.chapterPageBreak">一级章节自动分页</el-checkbox>
        </div>
      </div>

      <el-alert
        class="dialog-alert"
        title="没有上传套版模板时，推荐使用“正式标书版导出”；如使用上传的 Word 模板，模板中建议放置 &#123;&#123;content&#125;&#125; 或 &#123;&#123;content_markdown&#125;&#125; 占位符。"
        type="success"
        show-icon
        :closable="false"
      />
    </div>

    <template #footer>
      <el-button @click="innerVisible = false">取消</el-button>
      <el-button type="primary" :loading="submitting" @click="submitExport">
        确认导出
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { exportWord } from '@/api/ai'
import { listBidTemplates } from '@/api/bidTemplate'
import { getBidProject } from '@/api/bidProject'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  result: {
    type: Object,
    default: null
  }
})

const emit = defineEmits(['update:modelValue', 'success'])

const innerVisible = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

const loading = ref(false)
const submitting = ref(false)
const project = ref(null)
const templates = ref([])
const result = computed(() => props.result || {})

const form = reactive({
  mode: 'plain',
  templateId: null,
  includeCoverPage: true,
  includeCatalogPage: true,
  chapterPageBreak: true
})

const resultTitle = computed(() => {
  return props.result?.title || props.result?.resultTitle || 'AI生成结果'
})

const currentScene = computed(() => sceneByBizType(props.result?.bizType))

const availableTemplates = computed(() => {
  return templates.value.filter((item) => {
    if (Number(item.status) !== 1) return false
    if (Number(item.fileExists) !== 1) return false
    if (item.templateScene === currentScene.value) return true
    return currentScene.value === 'BID' && item.templateScene === 'BID_FULL'
  })
})

const projectTemplate = computed(() => {
  const id = project.value?.bidTemplateId
  if (!id) return null
  return availableTemplates.value.find((item) => String(item.id) === String(id)) || null
})

const enterpriseDefaultTemplate = computed(() => {
  return availableTemplates.value.find((item) => {
    return item.templateScope === 'ENTERPRISE'
      && Number(item.defaultFlag) === 1
      && String(item.enterpriseId || '') === String(project.value?.enterpriseId || '')
  }) || null
})

const platformDefaultTemplate = computed(() => {
  return availableTemplates.value.find((item) => {
    return item.templateScope === 'PLATFORM' && Number(item.defaultFlag) === 1
  }) || null
})

const hasAnyTemplate = computed(() => {
  return Boolean(projectTemplate.value || enterpriseDefaultTemplate.value || platformDefaultTemplate.value || availableTemplates.value.length)
})

watch(
  () => props.modelValue,
  async (visible) => {
    if (visible) {
      await prepare()
    }
  }
)

async function prepare() {
  loading.value = true
  try {
    project.value = null
    templates.value = []
    form.templateId = null
  form.includeCoverPage = true
  form.includeCatalogPage = true
  form.chapterPageBreak = true

    if (isBidResult(props.result) && props.result?.bizId) {
      try {
        project.value = await getBidProject(props.result.bizId)
      } catch (e) {
        project.value = null
      }
    }

    await loadTemplates()
    chooseDefaultMode()
  } finally {
    loading.value = false
  }
}

async function loadTemplates() {
  const paramsBase = {
    status: 1,
    pageNum: 1,
    pageSize: 300
  }

  const enterpriseId = project.value?.enterpriseId
  const [platformTemplates, enterpriseTemplates] = await Promise.all([
    listBidTemplates({
      ...paramsBase,
      templateScope: 'PLATFORM'
    }),
    enterpriseId
      ? listBidTemplates({
        ...paramsBase,
        templateScope: 'ENTERPRISE',
        enterpriseId
      })
      : Promise.resolve([])
  ])

  templates.value = [
    ...(enterpriseTemplates || []),
    ...(platformTemplates || [])
  ]
}

function chooseDefaultMode() {
  if (projectTemplate.value) {
    form.mode = 'project'
    return
  }

  if (enterpriseDefaultTemplate.value) {
    form.mode = 'enterprise'
    return
  }

  if (platformDefaultTemplate.value) {
    form.mode = 'platform'
    return
  }

  form.mode = 'plain'
}

async function submitExport() {
  if (!props.result?.id && !props.result?.resultId) {
    ElMessage.warning('生成结果ID为空')
    return
  }

  const resultId = props.result.id || props.result.resultId
  const payload = buildPayload()

  if (form.mode === 'other' && !payload.templateId) {
    ElMessage.warning('请选择标书模板')
    return
  }

  submitting.value = true
  try {
    const file = await exportWord(resultId, payload)
    ElMessage.success('Word已导出，开始下载')
    emit('success', file)
    innerVisible.value = false
  } finally {
    submitting.value = false
  }
}

function buildPayload() {
  if (form.mode === 'plain') {
    return {
      plainExport: true,
      formalExport: true,
      includeCoverPage: form.includeCoverPage,
      includeCatalogPage: form.includeCatalogPage,
      chapterPageBreak: form.chapterPageBreak
    }
  }

  if (form.mode === 'project') {
    return {
      templateId: projectTemplate.value?.id || null
    }
  }

  if (form.mode === 'enterprise') {
    return {
      templateId: enterpriseDefaultTemplate.value?.id || null
    }
  }

  if (form.mode === 'platform') {
    return {
      templateId: platformDefaultTemplate.value?.id || null
    }
  }

  return {
    templateId: form.templateId || null
  }
}

function reset() {
  form.mode = 'plain'
  form.templateId = null
  form.includeCoverPage = true
  form.includeCatalogPage = true
  form.chapterPageBreak = true
  project.value = null
  templates.value = []
}

function isBidResult(result) {
  return String(result?.bizType || '').toLowerCase().startsWith('bid')
}

function sceneByBizType(value) {
  const type = String(value || '').toLowerCase()
  if (type === 'bid_tech') return 'BID_TECH'
  if (type === 'bid_business') return 'BID_BUSINESS'
  if (type === 'bid_full') return 'BID_FULL'
  return 'BID'
}

function generateTypeLabel(value) {
  const map = {
    bid_tech: '技术标',
    bid_business: '商务标',
    bid_full: '完整标书',
    bid: '通用标书'
  }
  return map[String(value || '').toLowerCase()] || value || '-'
}

function templateTypeLabel(value) {
  const map = {
    TECH: '技术标',
    BUSINESS: '商务标',
    FULL: '完整标书',
    COMMON: '通用标书'
  }
  return map[value] || value || '-'
}

function scopeLabel(value) {
  return value === 'PLATFORM' ? '平台模板' : '企业模板'
}

function templateDesc(item) {
  if (!item) return ''
  const tags = [templateTypeLabel(item.templateType), scopeLabel(item.templateScope), item.versionNo || 'V1.0']
  if (Number(item.defaultFlag) === 1) {
    tags.push('默认模板')
  }
  return tags.filter(Boolean).join(' · ')
}

function templateOptionLabel(item) {
  return `${item.templateName}（${templateDesc(item)}）`
}
</script>

<style scoped>
.word-export-dialog {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.dialog-alert {
  margin-top: 0;
}

.mode-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.template-card {
  padding: 14px;
  border-radius: 14px;
  border: 1px solid var(--border);
  background: #f8fafc;
}

.template-card__title {
  font-weight: 800;
  color: var(--text-main);
  margin-bottom: 8px;
}

.template-card__body {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.template-card__body strong {
  color: var(--text-main);
}

.template-card__body span {
  color: var(--text-sub);
  font-size: 13px;
}

.template-option {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  width: 100%;
}

.formal-options {
  display: flex;
  flex-wrap: wrap;
  gap: 10px 18px;
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px dashed var(--border);
}

.template-option__meta {
  color: var(--text-sub);
  font-size: 12px;
  flex-shrink: 0;
}
</style>
