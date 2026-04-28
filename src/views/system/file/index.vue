<template>
  <div class="page">
    <div class="page-body">
      <div class="card card--table">
        <div class="list-head">
          <div class="list-head__left">
            <el-input
              v-model="keyword"
              class="filter-input"
              placeholder="按文件名 / 模块 / 扩展名 / 企业 / 上传人自动查询"
              clearable
              @input="onKeywordInput"
            />
          </div>
          <div class="list-head__right">
            <el-button class="table-icon-btn" text :icon="Refresh" @click="loadData" />
            <el-button type="primary" :icon="Upload" @click="openUpload">上传文件</el-button>
          </div>
        </div>

        <el-table
          class="ui-table"
          :data="rows"
          border
          stripe
          height="calc(100vh - 224px)"
          v-loading="loading"
        >
          <el-table-column prop="originalName" label="文件名" min-width="230" show-overflow-tooltip />
          <el-table-column prop="moduleType" label="模块" width="130" show-overflow-tooltip />
          <el-table-column prop="enterpriseName" label="所属企业" min-width="160" show-overflow-tooltip />
          <el-table-column prop="ownerFullName" label="上传人" width="120" show-overflow-tooltip />
          <el-table-column prop="fileExt" label="扩展名" width="90" />
          <el-table-column prop="fileSize" label="大小" width="110">
            <template #default="{ row }">
              {{ formatFileSize(row.fileSize) }}
            </template>
          </el-table-column>
          <el-table-column prop="storageType" label="存储" width="90" />
          <el-table-column prop="privateFlag" label="权限" width="90">
            <template #default="{ row }">
              <el-tag :type="Number(row.privateFlag) === 1 ? 'warning' : 'success'" effect="light">
                {{ Number(row.privateFlag) === 1 ? '私有' : '公开' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="parseStatus" label="解析" width="100">
            <template #default="{ row }">
              <el-tag :type="parseStatusMap[Number(row.parseStatus)]?.type || 'info'" effect="light">
                {{ parseStatusMap[Number(row.parseStatus)]?.label || '未知' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="status" label="状态" width="90">
            <template #default="{ row }">
              <StatusTag :value="row.status" :map="enableMap" />
            </template>
          </el-table-column>
          <el-table-column prop="createTime" label="上传时间" width="170" />
          <el-table-column label="操作" width="230" fixed="right">
            <template #default="{ row }">
              <div class="table-actions">
                <el-button v-if="row.fileUrl" link type="primary" @click="openFile(row)">查看</el-button>
                <el-button link type="primary" @click="openDetail(row)">详情</el-button>
                <el-button link type="warning" @click="toggleStatus(row)">
                  {{ Number(row.status) === 1 ? '禁用' : '启用' }}
                </el-button>
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

    <el-dialog v-model="uploadDialog.visible" title="上传文件" width="680px" destroy-on-close>
      <el-form label-width="110px">
        <el-form-item label="业务模块">
          <el-select v-model="uploadForm.moduleType" filterable style="width: 100%">
            <el-option label="其他文件" value="other" />
            <el-option label="知识库" value="knowledge" />
            <el-option label="投标资料" value="tender_material" />
            <el-option label="标书导出" value="bid_export" />
            <el-option label="合同" value="contract" />
            <el-option label="CAD" value="cad" />
            <el-option label="名片" value="card" />
          </el-select>
        </el-form-item>

        <el-form-item label="业务ID">
          <el-input v-model="uploadForm.bizId" type="number" placeholder="可选，不填则为空" />
        </el-form-item>

        <el-form-item label="文件权限">
          <el-radio-group v-model="uploadForm.privateFlag">
            <el-radio :label="true">私有</el-radio>
            <el-radio :label="false">公开</el-radio>
          </el-radio-group>
        </el-form-item>

        <el-form-item label="选择文件">
          <FileUploadBox
            :module-type="uploadForm.moduleType"
            :biz-id="uploadForm.bizId"
            :private-flag="uploadForm.privateFlag"
            @success="onUploadSuccess"
          />
        </el-form-item>
      </el-form>
    </el-dialog>

    <el-dialog v-model="detailDialog.visible" title="文件详情" width="760px">
      <el-descriptions v-if="detail" :column="2" border>
        <el-descriptions-item label="文件ID">{{ detail.id }}</el-descriptions-item>
        <el-descriptions-item label="所属企业">{{ detail.enterpriseName || '-' }}</el-descriptions-item>
        <el-descriptions-item label="上传人">{{ detail.ownerFullName || detail.ownerUsername || '-' }}</el-descriptions-item>
        <el-descriptions-item label="业务模块">{{ detail.moduleType || '-' }}</el-descriptions-item>
        <el-descriptions-item label="业务ID">{{ detail.bizId || '-' }}</el-descriptions-item>
        <el-descriptions-item label="原始文件名">{{ detail.originalName || '-' }}</el-descriptions-item>
        <el-descriptions-item label="扩展名">{{ detail.fileExt || '-' }}</el-descriptions-item>
        <el-descriptions-item label="大小">{{ formatFileSize(detail.fileSize) }}</el-descriptions-item>
        <el-descriptions-item label="存储类型">{{ detail.storageType || '-' }}</el-descriptions-item>
        <el-descriptions-item label="私有文件">{{ Number(detail.privateFlag) === 1 ? '是' : '否' }}</el-descriptions-item>
        <el-descriptions-item label="MD5" :span="2">{{ detail.md5 || '-' }}</el-descriptions-item>
        <el-descriptions-item label="对象Key" :span="2">{{ detail.objectKey || '-' }}</el-descriptions-item>
        <el-descriptions-item label="访问地址" :span="2">
          <el-link v-if="detail.fileUrl" type="primary" :href="detail.fileUrl" target="_blank">
            {{ detail.fileUrl }}
          </el-link>
          <span v-else>-</span>
        </el-descriptions-item>
        <el-descriptions-item label="上传时间">{{ detail.createTime || '-' }}</el-descriptions-item>
        <el-descriptions-item label="更新时间">{{ detail.updateTime || '-' }}</el-descriptions-item>
      </el-descriptions>
    </el-dialog>
  </div>
</template>

<script setup>
import { reactive, ref, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Refresh, Upload } from '@element-plus/icons-vue'
import {
  deleteFileResource,
  getFileResource,
  pageFileResources,
  updateFileResourceStatus
} from '@/api/file'
import PageFooterPager from '@/components/PageFooterPager.vue'
import StatusTag from '@/components/StatusTag.vue'
import FileUploadBox from '@/components/FileUploadBox.vue'
import { enableMap } from '@/config/statusMaps'

const loading = ref(false)
const rows = ref([])
const keyword = ref('')
const detail = ref(null)

const pager = reactive({
  page: 1,
  size: 10,
  total: 0
})

const uploadDialog = reactive({
  visible: false
})

const uploadForm = reactive({
  moduleType: 'other',
  bizId: '',
  privateFlag: true
})

const detailDialog = reactive({
  visible: false
})

let timer = null

const parseStatusMap = {
  0: { label: '未解析', type: 'info' },
  1: { label: '处理中', type: 'warning' },
  2: { label: '成功', type: 'success' },
  3: { label: '失败', type: 'danger' }
}

watch(
  () => [pager.page, pager.size],
  () => {
    loadData()
  },
  { immediate: true }
)

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
    const res = await pageFileResources({
      pageNum: pager.page,
      pageSize: pager.size,
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

function openUpload() {
  uploadForm.moduleType = 'other'
  uploadForm.bizId = ''
  uploadForm.privateFlag = true
  uploadDialog.visible = true
}

async function onUploadSuccess() {
  ElMessage.success('文件上传成功')
  uploadDialog.visible = false
  pager.page = 1
  await loadData()
}

function openFile(row) {
  if (!row.fileUrl) {
    ElMessage.warning('文件访问地址为空')
    return
  }
  window.open(row.fileUrl, '_blank')
}

async function openDetail(row) {
  detail.value = await getFileResource(row.id)
  detailDialog.visible = true
}

async function toggleStatus(row) {
  const nextStatus = Number(row.status) === 1 ? 0 : 1
  const actionText = nextStatus === 1 ? '启用' : '禁用'

  await ElMessageBox.confirm(`确认${actionText}文件「${row.originalName}」吗？`, '提示', {
    type: nextStatus === 1 ? 'success' : 'warning'
  })

  await updateFileResourceStatus(row.id, { status: nextStatus })
  ElMessage.success(`${actionText}成功`)
  await loadData()
}

async function removeRow(row) {
  await ElMessageBox.confirm(`确认删除文件「${row.originalName}」吗？`, '删除确认', {
    type: 'warning'
  })

  await deleteFileResource(row.id)
  ElMessage.success('删除成功')
  await loadData()
}

function formatFileSize(size) {
  const value = Number(size || 0)
  if (value < 1024) {
    return `${value} B`
  }
  if (value < 1024 * 1024) {
    return `${(value / 1024).toFixed(2)} KB`
  }
  if (value < 1024 * 1024 * 1024) {
    return `${(value / 1024 / 1024).toFixed(2)} MB`
  }
  return `${(value / 1024 / 1024 / 1024).toFixed(2)} GB`
}
</script>

<style scoped>
.table-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  white-space: nowrap;
}
</style>