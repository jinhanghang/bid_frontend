<template>
  <div class="page">
    <div class="page-body kb-page">
      <div class="card card--table kb-left">
        <div class="list-head">
          <div class="list-head__left">
            <el-input
              v-model="keyword"
              class="filter-input"
              placeholder="按知识库名称 / 类型自动筛选"
              clearable
              @input="onKeywordInput"
            />
          </div>
          <div class="list-head__right">
            <el-button class="table-icon-btn" text :icon="Refresh" @click="loadBases" />
            <el-button type="primary" :icon="Plus" @click="openCreateBase">新建知识库</el-button>
          </div>
        </div>

        <el-table
          class="ui-table"
          :data="bases"
          border
          stripe
          height="calc(100vh - 224px)"
          highlight-current-row
          v-loading="baseLoading"
          @current-change="selectBase"
        >
          <el-table-column prop="kbName" label="知识库名称" min-width="190" show-overflow-tooltip />
          <el-table-column prop="kbType" label="类型" width="110">
            <template #default="{ row }">{{ kbTypeLabel(row.kbType) }}</template>
          </el-table-column>
          <el-table-column prop="status" label="状态" width="90">
            <template #default="{ row }"><StatusTag :value="row.status" :map="enableMap" /></template>
          </el-table-column>
          <el-table-column label="操作" width="150" fixed="right">
            <template #default="{ row }">
              <div class="table-actions">
                <el-button link type="primary" @click.stop="openEditBase(row)">编辑</el-button>
                <el-button link type="danger" @click.stop="deleteBase(row)">删除</el-button>
              </div>
            </template>
          </el-table-column>
        </el-table>

        <PageFooterPager
          v-model:page="basePager.page"
          v-model:size="basePager.size"
          :total="basePager.total"
          @change="loadBases"
        />
      </div>

      <div class="card card--table kb-right">
        <template v-if="selectedBase">
          <div class="kb-header">
            <div>
              <div class="kb-title">{{ selectedBase.kbName }}</div>
              <div class="kb-sub">
                {{ kbTypeLabel(selectedBase.kbType) }} · {{ selectedBase.description || '暂无描述' }}
              </div>
            </div>
            <el-button type="primary" :icon="Upload" @click="uploadDialog.visible = true">添加文件</el-button>
          </div>

          <el-alert
            title="正常流程：先新建知识库，再在当前知识库下添加资料文件；后续标书项目或AI生成时选择这个知识库即可引用资料。"
            type="success"
            show-icon
            :closable="false"
            style="margin-bottom: 12px"
          />

          <el-table
            class="ui-table"
            :data="files"
            border
            stripe
            height="calc(100vh - 286px)"
            v-loading="fileLoading"
          >
            <el-table-column prop="originalName" label="文件名" min-width="260" show-overflow-tooltip />
            <el-table-column prop="fileExt" label="类型" width="90" />
            <el-table-column prop="parseStatus" label="解析状态" width="120">
              <template #default="{ row }">{{ parseStatusLabel(row.parseStatus) }}</template>
            </el-table-column>
            <el-table-column prop="chunkCount" label="切片数" width="90" />
            <el-table-column prop="createTime" label="上传时间" width="170" />
            <el-table-column label="操作" width="90" fixed="right">
              <template #default="{ row }">
                <el-button link type="danger" @click="deleteFile(row)">删除</el-button>
              </template>
            </el-table-column>
          </el-table>
        </template>

        <el-empty v-else description="请先新建或选择一个知识库">
          <el-button type="primary" :icon="Plus" @click="openCreateBase">新建知识库</el-button>
        </el-empty>
      </div>
    </div>

    <el-dialog v-model="baseDialog.visible" :title="baseDialog.isEdit ? '编辑知识库' : '新建知识库'" width="680px" destroy-on-close>
      <el-form ref="baseFormRef" :model="baseForm" :rules="baseRules" label-width="110px">
        <el-form-item label="所属企业">
          <el-select v-model="baseForm.enterpriseId" clearable filterable placeholder="请选择企业" style="width: 100%">
            <el-option v-for="item in enterprises" :key="item.id" :label="item.enterpriseName" :value="item.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="知识库名称" prop="kbName">
          <el-input v-model="baseForm.kbName" placeholder="例如：某企业资质库 / 某项目招标资料库" />
        </el-form-item>
        <el-form-item label="知识库类型">
          <el-select v-model="baseForm.kbType" style="width: 100%">
            <el-option label="标书知识库" value="bid" />
            <el-option label="企业资料库" value="enterprise" />
            <el-option label="行业资料库" value="industry" />
            <el-option label="通用资料库" value="common" />
          </el-select>
        </el-form-item>
        <el-form-item label="描述">
          <el-input v-model="baseForm.description" type="textarea" :rows="4" placeholder="说明这个知识库主要放哪些资料" />
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="baseForm.status" style="width: 100%">
            <el-option label="正常" :value="1" />
            <el-option label="停用" :value="0" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="baseDialog.visible = false">取消</el-button>
        <el-button type="primary" @click="submitBase">保存并进入文件管理</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="uploadDialog.visible" :title="`给「${selectedBase?.kbName || ''}」添加文件`" width="680px" destroy-on-close>
      <FileUploadBox
        v-if="selectedBase"
        module-type="knowledge_base"
        :biz-id="selectedBase.id"
        @success="onKnowledgeFileUploaded"
      />
      <div class="form-tip" style="margin-top: 10px">
        文件上传成功后，系统会自动在当前知识库下创建文件记录，不需要再手工填写知识库ID或文件ID。
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Refresh, Upload } from '@element-plus/icons-vue'
import { createCrudApi } from '@/api/crud'
import FileUploadBox from '@/components/FileUploadBox.vue'
import PageFooterPager from '@/components/PageFooterPager.vue'
import StatusTag from '@/components/StatusTag.vue'
import { enableMap } from '@/config/statusMaps'

const kbApi = createCrudApi('/knowledge-base')
const knowledgeFileApi = createCrudApi('/knowledge-file')
const enterpriseApi = createCrudApi('/enterprise')

const baseLoading = ref(false)
const fileLoading = ref(false)
const keyword = ref('')
const bases = ref([])
const files = ref([])
const enterprises = ref([])
const selectedBase = ref(null)
const baseFormRef = ref()
const timer = ref(null)

const basePager = reactive({ page: 1, size: 10, total: 0 })
const baseDialog = reactive({ visible: false, isEdit: false })
const uploadDialog = reactive({ visible: false })
const baseForm = reactive({})

const baseRules = {
  kbName: [{ required: true, message: '请输入知识库名称', trigger: 'blur' }]
}

onMounted(() => {
  loadBases()
  loadEnterprises()
})

function kbTypeLabel(value) {
  const map = {
    bid: '标书知识库',
    enterprise: '企业资料库',
    industry: '行业资料库',
    common: '通用资料库'
  }
  return map[value] || value || '-'
}

function parseStatusLabel(value) {
  const map = {
    pending: '待解析',
    parsing: '解析中',
    success: '已解析',
    completed: '已解析',
    failed: '解析失败'
  }
  return map[value] || value || '待解析'
}

function getExt(filename = '') {
  const index = String(filename).lastIndexOf('.')
  return index >= 0 ? String(filename).slice(index + 1).toLowerCase() : ''
}

function onKeywordInput() {
  clearTimeout(timer.value)
  timer.value = setTimeout(() => {
    basePager.page = 1
    loadBases()
  }, 300)
}

async function loadEnterprises() {
  try {
    enterprises.value = await enterpriseApi.list()
  } catch (e) {
    enterprises.value = []
  }
}

async function loadBases(selectId) {
  baseLoading.value = true
  try {
    const res = await kbApi.page({
      current: basePager.page,
      size: basePager.size,
      pageNum: basePager.page,
      pageSize: basePager.size,
      keyword: keyword.value || undefined
    })
    bases.value = res?.records || []
    basePager.total = Number(res?.total || bases.value.length || 0)

    const next = selectId
      ? bases.value.find((item) => String(item.id) === String(selectId))
      : (selectedBase.value ? bases.value.find((item) => String(item.id) === String(selectedBase.value.id)) : bases.value[0])

    if (next) {
      selectBase(next)
    } else {
      selectedBase.value = null
      files.value = []
    }
  } finally {
    baseLoading.value = false
  }
}

function selectBase(row) {
  if (!row) return
  selectedBase.value = row
  loadFiles()
}

async function loadFiles() {
  if (!selectedBase.value?.id) return
  fileLoading.value = true
  try {
    const res = await knowledgeFileApi.page({
      current: 1,
      size: 200,
      pageNum: 1,
      pageSize: 200,
      knowledgeBaseId: selectedBase.value.id
    })
    const records = res?.records || []
    files.value = records.filter((item) => String(item.knowledgeBaseId) === String(selectedBase.value.id))
  } finally {
    fileLoading.value = false
  }
}

function resetBaseForm(row = {}) {
  for (const key of Object.keys(baseForm)) delete baseForm[key]
  Object.assign(baseForm, {
    id: row.id,
    enterpriseId: row.enterpriseId ?? '',
    kbName: row.kbName ?? '',
    kbType: row.kbType ?? 'bid',
    description: row.description ?? '',
    status: row.status ?? 1
  })
}

function openCreateBase() {
  baseDialog.isEdit = false
  resetBaseForm()
  baseDialog.visible = true
}

function openEditBase(row) {
  baseDialog.isEdit = true
  resetBaseForm(row)
  baseDialog.visible = true
}

async function submitBase() {
  await baseFormRef.value.validate()
  let saved = null
  if (baseDialog.isEdit) {
    saved = await kbApi.update(baseForm.id, { ...baseForm })
    ElMessage.success('知识库已修改')
  } else {
    saved = await kbApi.create({ ...baseForm })
    ElMessage.success('知识库已创建，现在可以添加文件')
  }
  baseDialog.visible = false
  await loadBases(saved?.id || baseForm.id)
}

async function deleteBase(row) {
  await ElMessageBox.confirm(`确定删除知识库「${row.kbName}」吗？删除前请确认里面的文件是否还需要保留。`, '删除确认', { type: 'warning' })
  await kbApi.remove(row.id)
  ElMessage.success('删除成功')
  if (selectedBase.value?.id === row.id) selectedBase.value = null
  loadBases()
}

async function onKnowledgeFileUploaded(file) {
  if (!selectedBase.value?.id) return
  await knowledgeFileApi.create({
    knowledgeBaseId: selectedBase.value.id,
    fileId: file?.id || file?.fileId,
    originalName: file?.originalName || file?.fileName || '',
    fileExt: file?.fileExt || getExt(file?.originalName || file?.fileName || ''),
    parseStatus: 'pending',
    chunkCount: 0
  })
  ElMessage.success('文件已添加到当前知识库')
  uploadDialog.visible = false
  loadFiles()
}

async function deleteFile(row) {
  await ElMessageBox.confirm(`确定从当前知识库删除文件「${row.originalName || row.id}」吗？`, '删除确认', { type: 'warning' })
  await knowledgeFileApi.remove(row.id)
  ElMessage.success('文件记录已删除')
  loadFiles()
}
</script>

<style scoped>
.kb-page {
  display: grid;
  grid-template-columns: minmax(460px, 0.9fr) minmax(0, 1.1fr);
  gap: 16px;
}

.kb-left,
.kb-right {
  min-width: 0;
}

.kb-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}

.kb-title {
  font-size: 18px;
  font-weight: 800;
}

.kb-sub {
  margin-top: 6px;
  color: var(--text-sub);
  line-height: 1.5;
}

@media (max-width: 1180px) {
  .kb-page {
    grid-template-columns: 1fr;
  }
}
</style>
