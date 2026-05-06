<template>
  <div class="page">
    <div class="page-body">
      <div class="card card--table">
        <div class="list-head">
          <div class="list-head__left">
            <!-- 按列表页统一规范：左侧只放一个 keyword 模糊查询，不放 label，不放查询/重置按钮。 -->
            <el-input
              v-model="keyword"
              class="filter-input"
              :placeholder="config.keywordPlaceholder || '请输入关键词自动筛选'"
              clearable
              @input="onKeywordInput"
            />
          </div>

          <div class="list-head__right">
            <el-button class="table-icon-btn" text :icon="Refresh" @click="loadData" />
            <el-button v-if="!config.readonly" type="primary" :icon="Plus" @click="openCreate">新增</el-button>
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
          <el-table-column
            v-for="col in visibleColumns"
            :key="col.prop"
            :prop="col.prop"
            :label="col.label"
            :width="col.width"
            :min-width="col.minWidth"
            show-overflow-tooltip
          >
            <template #default="{ row }">
              <StatusTag v-if="col.type === 'status'" :value="row[col.prop]" :map="col.map || {}" />
              <el-link v-else-if="col.type === 'link' && row[col.prop]" type="primary" :href="row[col.prop]" target="_blank">
                打开链接
              </el-link>
              <el-link v-else-if="col.type === 'fileLink' && getFileUrl(row, col)" type="primary" :href="getFileUrl(row, col)" target="_blank">
                {{ getFileName(row, col) }}
              </el-link>
              <span v-else-if="col.type === 'money'">¥ {{ money(row[col.prop]) }}</span>
              <span v-else-if="col.type === 'fileSize'">{{ fileSize(row[col.prop]) }}</span>
              <span v-else-if="col.type === 'optionLabel'">{{ getOptionLabel(col, row[col.prop]) }}</span>
              <span v-else>{{ row[col.prop] ?? '-' }}</span>
            </template>
          </el-table-column>

          <el-table-column v-if="!config.readonly" label="操作" width="150" fixed="right">
            <template #default="{ row }">
              <div class="table-actions">
                <el-button link type="primary" @click="openEdit(row)">编辑</el-button>
                <el-button link type="danger" @click="removeRow(row)">删除</el-button>
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
      v-model="dialog.visible"
      :title="dialog.isEdit ? `编辑${config.title}` : `新增${config.title}`"
      :width="config.formWidth || '720px'"
      destroy-on-close
    >
      <el-form ref="formRef" :model="form" :rules="rules" label-width="130px">
        <template v-for="field in visibleFormFields" :key="field.prop">
          <el-form-item :label="field.label" :prop="field.prop">
            <el-input
              v-if="field.type === 'number'"
              v-model="form[field.prop]"
              class="number-input"
              type="number"
              :min="field.min"
              :max="field.max"
              :step="field.step || 1"
              :disabled="field.disabled"
              :placeholder="field.placeholder || `请输入${field.label}`"
              clearable
            />
            <el-select
              v-else-if="field.type === 'select'"
              v-model="form[field.prop]"
              :multiple="Boolean(field.multiple)"
              :disabled="field.disabled"
              clearable
              filterable
              :placeholder="field.placeholder || `请选择${field.label}`"
              style="width: 100%"
            >
              <el-option
                v-for="opt in getFieldOptions(field)"
                :key="String(opt.value)"
                :label="opt.label"
                :value="opt.value"
              />
            </el-select>
            <el-date-picker
              v-else-if="field.type === 'date'"
              v-model="form[field.prop]"
              value-format="YYYY-MM-DD"
              type="date"
              :disabled="field.disabled"
              style="width: 100%"
            />
            <el-date-picker
              v-else-if="field.type === 'datetime'"
              v-model="form[field.prop]"
              value-format="YYYY-MM-DD HH:mm:ss"
              type="datetime"
              :disabled="field.disabled"
              style="width: 100%"
            />
            <JsonEditor
              v-else-if="field.type === 'json'"
              v-model="form[field.prop]"
              :rows="field.rows || 6"
            />
            <div v-else-if="field.type === 'fileUpload'" class="upload-field">
              <FileUploadBox
                :module-type="field.moduleType || 'other'"
                :biz-id="dialog.id || ''"
                :private-flag="field.privateFlag !== false"
                @success="(file) => onFormFileUpload(field, file)"
              />
              <div v-if="form[field.prop]" class="form-tip upload-value">
                已选择文件：
                <el-link v-if="form[`_${field.prop}FileUrl`]" :href="form[`_${field.prop}FileUrl`]" target="_blank" type="primary">
                  {{ form[`_${field.prop}FileName`] || `文件 #${form[field.prop]}` }}
                </el-link>
                <span v-else>{{ form[`_${field.prop}FileName`] || `文件 #${form[field.prop]}` }}</span>
              </div>
            </div>
            <el-input
              v-else-if="field.type === 'textarea'"
              v-model="form[field.prop]"
              type="textarea"
              :rows="field.rows || 4"
              :disabled="field.disabled"
            />
            <el-input v-else v-model="form[field.prop]" :disabled="field.disabled" clearable />
            <div v-if="field.tip" class="form-tip">{{ field.tip }}</div>
          </el-form-item>
        </template>

        <div v-if="!visibleFormFields.length" class="form-tip">
          当前模块配置为只读，仅用于查看后端数据。
        </div>
      </el-form>

      <template #footer>
        <el-button :disabled="submitting" @click="dialog.visible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="submitForm">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Refresh } from '@element-plus/icons-vue'
import { createCrudApi } from '@/api/crud'
import { useAuthStore } from '@/stores/auth'
import PageFooterPager from '@/components/PageFooterPager.vue'
import StatusTag from '@/components/StatusTag.vue'
import JsonEditor from '@/components/JsonEditor.vue'
import FileUploadBox from '@/components/FileUploadBox.vue'
import { fileSize, money, parseJsonLoose } from '@/utils/format'

const props = defineProps({
  config: {
    type: Object,
    required: true
  }
})

const auth = useAuthStore()
const loading = ref(false)
const submitting = ref(false)
const rows = ref([])
const keyword = ref('')
const formRef = ref()
const form = reactive({})
const optionStore = reactive({})
const pager = reactive({
  page: 1,
  size: 10,
  total: 0
})

let timer = null
const dialog = reactive({
  visible: false,
  isEdit: false,
  id: null
})

const api = computed(() => createCrudApi(props.config.baseUrl))
const visibleColumns = computed(() => (props.config.columns || []).filter((col) => !col.hidden))
const visibleFormFields = computed(() => (props.config.formFields || []).filter((field) => !field.hidden))

const displayRows = computed(() => {
  const key = keyword.value.trim().toLowerCase()
  if (!key) return rows.value
  const fields = props.config.searchFields || []
  if (!fields.length) return rows.value
  return rows.value.filter((row) => fields.some((field) => String(row[field] ?? '').toLowerCase().includes(key)))
})

const rules = computed(() => {
  const obj = {}
  for (const field of props.config.formFields || []) {
    if (field.required && !field.hidden) {
      obj[field.prop] = [{ required: true, message: field.type === 'select' ? `请选择${field.label}` : `请填写${field.label}`, trigger: field.type === 'select' ? 'change' : 'blur' }]
    }
  }
  return obj
})

watch(
  () => props.config.baseUrl,
  () => {
    pager.page = 1
    keyword.value = ''
    loadFieldOptions()
    loadData()
  },
  { immediate: true }
)

function getOptionKey(source, fallbackProp) {
  if (!source) return fallbackProp
  return source.key || `${source.baseUrl || 'static'}:${source.label || 'label'}:${source.value || 'value'}:${fallbackProp}`
}

async function loadOptionsBySource(source, fallbackProp) {
  const key = getOptionKey(source, fallbackProp)
  if (optionStore[key]) return optionStore[key]
  if (!source?.baseUrl) return []
  try {
    const list = await createCrudApi(source.baseUrl).list(source.params || {})
    const labelField = source.label || 'label'
    const valueField = source.value || 'value'
    optionStore[key] = (Array.isArray(list) ? list : []).map((item) => ({
      label: item[labelField] || item.name || item.title || item.id,
      value: item[valueField]
    }))
  } catch (e) {
    optionStore[key] = []
  }
  return optionStore[key]
}

async function loadFieldOptions() {
  const fields = props.config.formFields || []
  const columns = props.config.columns || []
  const tasks = []
  for (const field of fields) {
    if (field.optionSource) tasks.push(loadOptionsBySource(field.optionSource, field.prop))
  }
  for (const col of columns) {
    if (col.optionSource) tasks.push(loadOptionsBySource(col.optionSource, col.prop))
  }
  await Promise.all(tasks)
}

function getFieldOptions(field) {
  if (field.options) return field.options
  if (!field.optionSource) return []
  return optionStore[getOptionKey(field.optionSource, field.prop)] || []
}

function getOptionLabel(col, value) {
  if (value === null || value === undefined || value === '') return '-'
  const options = col.options || optionStore[getOptionKey(col.optionSource, col.prop)] || []
  const match = options.find((opt) => String(opt.value) === String(value))
  return match?.label || value
}

function getFileUrl(row, col) {
  return row[col.urlProp || 'fileUrl'] || row.fileUrl || ''
}

function getFileName(row, col) {
  return row[col.nameProp || 'originalName'] || row.originalName || row.fileName || '打开文件'
}

function resolveDefault(field, row = {}) {
  const value = row[field.prop]
  if (value !== undefined && value !== null) return value
  if (field.defaultFromCurrentUser === 'id') return auth.user?.id ?? ''
  if (field.defaultFromCurrentUser === 'enterpriseId') return auth.user?.enterpriseId ?? ''
  if (field.multiple) return Array.isArray(field.default) ? field.default : []
  return field.default ?? ''
}

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
    const params = {
      current: pager.page,
      size: pager.size,
      pageNum: pager.page,
      pageSize: pager.size,
      keyword: keyword.value || undefined
    }
    const res = await api.value.page(params)
    rows.value = res?.records || []
    pager.total = Number(res?.total || rows.value.length || 0)
  } finally {
    loading.value = false
  }
}

function resetForm(row = {}) {
  for (const key of Object.keys(form)) delete form[key]
  for (const field of props.config.formFields || []) {
    form[field.prop] = resolveDefault(field, row)
    if (field.type === 'fileUpload') {
      form[`_${field.prop}FileName`] = row.originalName || row.fileName || ''
      form[`_${field.prop}FileUrl`] = row.fileUrl || ''
    }
  }
}

function openCreate() {
  dialog.isEdit = false
  dialog.id = null
  resetForm()
  dialog.visible = true
}

function openEdit(row) {
  dialog.isEdit = true
  dialog.id = row.id
  resetForm(row)
  dialog.visible = true
}

function toNumberOrUndefined(value) {
  if (value === '' || value === null || value === undefined) return undefined
  const numberValue = Number(value)
  return Number.isFinite(numberValue) ? numberValue : undefined
}

function normalizePayload() {
  const payload = { ...form }
  for (const key of Object.keys(payload)) {
    if (key.startsWith('_')) delete payload[key]
  }
  for (const field of props.config.formFields || []) {
    if (field.type === 'json') {
      payload[field.prop] = parseJsonLoose(payload[field.prop], payload[field.prop] || null)
    }
    if (field.type === 'number') {
      payload[field.prop] = toNumberOrUndefined(payload[field.prop])
    }
  }
  return payload
}

function onFormFileUpload(field, file) {
  form[field.prop] = file?.id || file?.fileId || ''
  form[`_${field.prop}FileName`] = file?.originalName || file?.fileName || ''
  form[`_${field.prop}FileUrl`] = file?.fileUrl || ''
  ElMessage.success('文件已绑定到当前表单，保存后生效')
}

async function submitForm() {
  if (submitting.value) return
  if (!formRef.value) return

  await formRef.value.validate()
  submitting.value = true

  try {
    const payload = normalizePayload()
    if (dialog.isEdit) {
      await api.value.update(dialog.id, payload)
      ElMessage.success('修改成功')
    } else {
      await api.value.create(payload)
      ElMessage.success('新增成功')
    }
    dialog.visible = false
    loadData()
  } finally {
    submitting.value = false
  }
}

async function removeRow(row) {
  if (!row?.id) {
    ElMessage.warning('当前记录缺少ID，不能删除')
    return
  }

  const title = row.name || row.title || row.projectName || row.kbName || row.id
  await ElMessageBox.confirm(`确定删除「${title}」吗？删除后不可恢复。`, '删除确认', {
    type: 'warning'
  })

  await api.value.remove(row.id)
  ElMessage.success('删除成功')
  loadData()
}
</script>


<style scoped>
.number-input {
  width: 100%;
}

:deep(.number-input input[type='number']::-webkit-outer-spin-button),
:deep(.number-input input[type='number']::-webkit-inner-spin-button) {
  -webkit-appearance: none;
  margin: 0;
}

:deep(.number-input input[type='number']) {
  -moz-appearance: textfield;
}
</style>
