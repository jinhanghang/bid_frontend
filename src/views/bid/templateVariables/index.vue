<template>
  <div class="page">
    <div class="page-body variable-page">
      <div class="card card--table variable-left">
        <div class="list-head">
          <div class="list-head__left">
            <el-input
              v-model="keyword"
              class="filter-input"
              placeholder="按变量编码 / 名称 / 说明自动查询"
              clearable
              @input="onKeywordInput"
            />
          </div>
          <div class="list-head__right">
            <el-button class="table-icon-btn" text :icon="Refresh" @click="loadVariables" />
            <el-button type="primary" :icon="Plus" @click="openCreate">新增变量</el-button>
          </div>
        </div>

        <div class="filter-row">
          <el-select v-model="filters.scene" clearable placeholder="适用场景" style="width: 160px" @change="reloadFirstPage">
            <el-option v-for="item in sceneOptions" :key="item.value" :label="item.label" :value="item.value" />
          </el-select>
          <el-select v-model="filters.variableType" clearable placeholder="变量类型" style="width: 160px" @change="reloadFirstPage">
            <el-option v-for="item in variableTypeOptions" :key="item.value" :label="item.label" :value="item.value" />
          </el-select>
          <el-select v-model="filters.status" clearable placeholder="状态" style="width: 120px" @change="reloadFirstPage">
            <el-option label="启用" :value="1" />
            <el-option label="停用" :value="0" />
          </el-select>
        </div>

        <el-table
          class="ui-table"
          :data="rows"
          border
          stripe
          highlight-current-row
          height="calc(100vh - 300px)"
          v-loading="loading"
          @current-change="selectRow"
        >
          <el-table-column prop="variableKey" label="变量编码" min-width="180" show-overflow-tooltip>
            <template #default="{ row }">
              <span class="code-text">{{ row.variableKey }}</span>
            </template>
          </el-table-column>
          <el-table-column prop="variableLabel" label="变量名称" min-width="140" show-overflow-tooltip />
          <el-table-column label="类型" width="110">
            <template #default="{ row }">
              <el-tag :type="variableTypeTag(row.variableType)" effect="light">
                {{ variableTypeLabel(row.variableType) }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="场景" width="120">
            <template #default="{ row }">
              {{ sceneLabel(row.scene) }}
            </template>
          </el-table-column>
          <el-table-column label="状态" width="90" align="center">
            <template #default="{ row }">
              <el-tag :type="Number(row.status) === 1 ? 'success' : 'info'" effect="light">
                {{ Number(row.status) === 1 ? '启用' : '停用' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="sortNo" label="排序" width="80" align="center" />
          <el-table-column label="操作" width="130" fixed="right">
            <template #default="{ row }">
              <div class="table-actions">
                <el-button link type="primary" @click.stop="selectRow(row)">编辑</el-button>
                <el-button link type="danger" @click.stop="removeRow(row)">删除</el-button>
              </div>
            </template>
          </el-table-column>
        </el-table>

        <PageFooterPager
          v-model:page="pager.page"
          v-model:size="pager.size"
          :total="pager.total"
          @change="loadVariables"
        />
      </div>

      <div class="card variable-right">
        <template v-if="editMode">
          <div class="editor-head">
            <div>
              <div class="section-title">{{ form.id ? '编辑模板变量' : '新增模板变量' }}</div>
              <div class="section-desc">
                变量编码用于模板中的 &#123;&#123;variable_key&#125;&#125;，编码保存后建议不要随意修改。
              </div>
            </div>
            <div class="editor-actions">
              <el-button :icon="Refresh" @click="resetForm">重置</el-button>
              <el-button type="primary" :loading="saving" @click="saveRow">保存变量</el-button>
            </div>
          </div>

          <el-form ref="formRef" :model="form" :rules="rules" label-width="112px" class="variable-form">
            <el-row :gutter="14">
              <el-col :span="12">
                <el-form-item label="变量编码" prop="variableKey">
                  <el-input v-model="form.variableKey" placeholder="例如：project_name" clearable />
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="变量名称" prop="variableLabel">
                  <el-input v-model="form.variableLabel" placeholder="例如：项目名称" clearable />
                </el-form-item>
              </el-col>
            </el-row>

            <el-row :gutter="14">
              <el-col :span="8">
                <el-form-item label="变量类型" prop="variableType">
                  <el-select v-model="form.variableType" style="width: 100%">
                    <el-option v-for="item in variableTypeOptions" :key="item.value" :label="item.label" :value="item.value" />
                  </el-select>
                </el-form-item>
              </el-col>
              <el-col :span="8">
                <el-form-item label="适用场景">
                  <el-select v-model="form.scene" clearable style="width: 100%" placeholder="通用变量可不选">
                    <el-option v-for="item in sceneOptions" :key="item.value" :label="item.label" :value="item.value" />
                  </el-select>
                </el-form-item>
              </el-col>
              <el-col :span="8">
                <el-form-item label="输入类型">
                  <el-select v-model="form.inputType" style="width: 100%">
                    <el-option label="单行文本" value="text" />
                    <el-option label="多行文本" value="textarea" />
                    <el-option label="数字" value="number" />
                    <el-option label="日期" value="date" />
                    <el-option label="下拉选项" value="select" />
                    <el-option label="文件" value="file" />
                  </el-select>
                </el-form-item>
              </el-col>
            </el-row>

            <el-row :gutter="14">
              <el-col :span="8">
                <el-form-item label="是否必填">
                  <el-select v-model="form.requiredFlag" style="width: 100%">
                    <el-option label="否" :value="0" />
                    <el-option label="是" :value="1" />
                  </el-select>
                </el-form-item>
              </el-col>
              <el-col :span="8">
                <el-form-item label="状态">
                  <el-select v-model="form.status" style="width: 100%">
                    <el-option label="启用" :value="1" />
                    <el-option label="停用" :value="0" />
                  </el-select>
                </el-form-item>
              </el-col>
              <el-col :span="8">
                <el-form-item label="排序">
                  <el-input-number v-model="form.sortNo" :min="0" :max="9999" style="width: 100%" />
                </el-form-item>
              </el-col>
            </el-row>

            <el-form-item label="默认值">
              <el-input v-model="form.defaultValue" placeholder="用户未填写时的默认值，可为空" clearable />
            </el-form-item>

            <el-form-item label="示例值">
              <el-input v-model="form.exampleValue" placeholder="用于 Prompt 模板预览，例如：智慧园区建设项目" clearable />
            </el-form-item>

            <el-form-item label="选项JSON">
              <el-input
                v-model="form.optionJson"
                type="textarea"
                :rows="3"
                placeholder='输入类型为 select 时填写，例如：[{"label":"合格","value":"合格"}]'
              />
            </el-form-item>

            <el-form-item label="说明">
              <el-input v-model="form.remark" type="textarea" :rows="4" placeholder="说明变量来源和用途" />
            </el-form-item>
          </el-form>

          <div class="preview-card">
            <div class="assist-title">模板中使用方式</div>
            <div class="usage-code">&#123;&#123;{{ form.variableKey || 'variable_key' }}&#125;&#125;</div>
            <div class="assist-desc">
              {{ form.variableLabel || '变量名称' }}：{{ form.remark || '暂无说明' }}
            </div>
          </div>
        </template>

        <el-empty v-else description="请选择左侧变量，或点击新增变量">
          <el-button type="primary" :icon="Plus" @click="openCreate">新增变量</el-button>
        </el-empty>
      </div>
    </div>
  </div>
</template>

<script setup>
import { nextTick, onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from '@/plugins/element-plus-api'
import { Plus, Refresh } from '@element-plus/icons-vue'
import {
  createTemplateVariable,
  deleteTemplateVariable,
  getTemplateVariable,
  pageTemplateVariables,
  updateTemplateVariable
} from '@/api/templateVariable'
import PageFooterPager from '@/components/PageFooterPager.vue'

const loading = ref(false)
const saving = ref(false)
const editMode = ref(false)
const rows = ref([])
const keyword = ref('')
const timer = ref(null)
const formRef = ref()
const currentRow = ref(null)

const pager = reactive({
  page: 1,
  size: 10,
  total: 0
})

const filters = reactive({
  scene: '',
  variableType: '',
  status: ''
})

const form = reactive(defaultForm())

const sceneOptions = [
  { label: '技术标', value: 'BID_TECH' },
  { label: '商务标', value: 'BID_BUSINESS' },
  { label: '完整标书', value: 'BID_FULL' },
  { label: '通用标书', value: 'BID' },
  { label: '合同', value: 'CONTRACT' },
  { label: '可研', value: 'FEASIBILITY' },
  { label: '环评', value: 'EIA' },
  { label: '交评', value: 'TIA' }
]

const variableTypeOptions = [
  { label: '项目字段', value: 'PROJECT_FIELD' },
  { label: '用户补充', value: 'USER_INPUT' },
  { label: '系统变量', value: 'SYSTEM' },
  { label: '知识库变量', value: 'KNOWLEDGE' },
  { label: '企业变量', value: 'ENTERPRISE' }
]

const rules = {
  variableKey: [
    { required: true, message: '请输入变量编码', trigger: 'blur' },
    { pattern: /^[a-zA-Z][a-zA-Z0-9_.-]*$/, message: '变量编码必须以字母开头，只能包含字母、数字、下划线、横杠、点', trigger: 'blur' }
  ],
  variableLabel: [{ required: true, message: '请输入变量名称', trigger: 'blur' }],
  variableType: [{ required: true, message: '请选择变量类型', trigger: 'change' }]
}

onMounted(() => {
  loadVariables()
})

function defaultForm() {
  return {
    id: null,
    templateId: null,
    variableKey: '',
    variableLabel: '',
    variableType: 'USER_INPUT',
    scene: '',
    inputType: 'text',
    requiredFlag: 0,
    defaultValue: '',
    exampleValue: '',
    optionJson: '',
    sortNo: 0,
    status: 1,
    remark: ''
  }
}

function onKeywordInput() {
  clearTimeout(timer.value)
  timer.value = setTimeout(() => {
    reloadFirstPage()
  }, 300)
}

function reloadFirstPage() {
  pager.page = 1
  loadVariables()
}

async function loadVariables(selectId) {
  loading.value = true
  try {
    const res = await pageTemplateVariables({
      current: pager.page,
      size: pager.size,
      pageNum: pager.page,
      pageSize: pager.size,
      keyword: keyword.value || undefined,
      scene: filters.scene || undefined,
      variableType: filters.variableType || undefined,
      status: filters.status === '' ? undefined : filters.status
    })

    rows.value = res?.records || []
    pager.total = Number(res?.total || 0)

    if (selectId) {
      const target = rows.value.find((item) => String(item.id) === String(selectId))
      if (target) {
        await selectRow(target)
      }
    }
  } finally {
    loading.value = false
  }
}

async function selectRow(row) {
  if (!row?.id) return
  const detail = await getTemplateVariable(row.id)
  currentRow.value = detail
  fillForm(detail)
  editMode.value = true
}

function openCreate() {
  currentRow.value = null
  fillForm(defaultForm())
  editMode.value = true
  nextTick(() => formRef.value?.clearValidate?.())
}

function resetForm() {
  if (currentRow.value?.id) {
    fillForm(currentRow.value)
  } else {
    fillForm(defaultForm())
  }
}

function fillForm(row) {
  Object.assign(form, defaultForm(), row || {})
  form.status = row?.status === 0 ? 0 : 1
  form.requiredFlag = row?.requiredFlag === 1 ? 1 : 0
  form.variableType = row?.variableType || 'USER_INPUT'
  form.inputType = row?.inputType || 'text'
  form.sortNo = Number(row?.sortNo || 0)
}

async function saveRow() {
  await formRef.value?.validate()

  saving.value = true
  try {
    const payload = {
      templateId: form.templateId || null,
      variableKey: form.variableKey,
      variableLabel: form.variableLabel,
      variableType: form.variableType,
      scene: form.scene || null,
      inputType: form.inputType,
      requiredFlag: form.requiredFlag,
      defaultValue: form.defaultValue || null,
      exampleValue: form.exampleValue || null,
      optionJson: form.optionJson || null,
      sortNo: form.sortNo || 0,
      status: form.status,
      remark: form.remark || null
    }

    let savedId = form.id
    if (form.id) {
      await updateTemplateVariable(form.id, payload)
      ElMessage.success('变量已保存')
    } else {
      savedId = await createTemplateVariable(payload)
      ElMessage.success('变量已创建')
    }

    await loadVariables(savedId)
  } finally {
    saving.value = false
  }
}

async function removeRow(row) {
  await ElMessageBox.confirm(`确认删除变量「${row.variableKey}」吗？删除后 Prompt 模板里仍然可以写该变量，但会被识别为未知变量。`, '删除确认', {
    type: 'warning'
  })

  await deleteTemplateVariable(row.id)
  ElMessage.success('变量已删除')

  if (currentRow.value?.id === row.id) {
    editMode.value = false
    currentRow.value = null
  }

  await loadVariables()
}

function sceneLabel(value) {
  return sceneOptions.find((item) => item.value === value)?.label || '通用'
}

function variableTypeLabel(value) {
  return variableTypeOptions.find((item) => item.value === value)?.label || value || '-'
}

function variableTypeTag(value) {
  const map = {
    PROJECT_FIELD: 'primary',
    USER_INPUT: 'success',
    SYSTEM: 'warning',
    KNOWLEDGE: 'danger',
    ENTERPRISE: 'info'
  }
  return map[value] || 'info'
}
</script>

<style scoped>
.variable-page {
  display: grid;
  grid-template-columns: minmax(560px, 0.92fr) minmax(0, 1.08fr);
  gap: 16px;
}

.variable-left,
.variable-right {
  min-width: 0;
}

.variable-right {
  padding: 18px;
}

.filter-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 12px;
}

.code-text {
  font-family: Consolas, Monaco, monospace;
  color: #2563eb;
  font-weight: 700;
}

.editor-head {
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

.section-desc,
.assist-desc {
  margin-top: 6px;
  color: var(--text-sub);
  line-height: 1.6;
  font-size: 13px;
}

.variable-form {
  margin-top: 16px;
}

.preview-card {
  padding: 14px;
  border: 1px solid var(--border);
  border-radius: 14px;
  background: #f8fafc;
}

.assist-title {
  font-weight: 800;
  color: var(--text-main);
}

.usage-code {
  margin-top: 10px;
  padding: 10px 12px;
  border-radius: 10px;
  background: #111827;
  color: #dbeafe;
  font-family: Consolas, Monaco, monospace;
  word-break: break-all;
}

.table-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  white-space: nowrap;
}

@media (max-width: 1280px) {
  .variable-page {
    grid-template-columns: 1fr;
  }
}
</style>

