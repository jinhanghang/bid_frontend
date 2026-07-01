<template>
  <div class="image-library-page">
    <section class="image-library-header">
      <div>
        <h2>图片库</h2>
        <p>统一维护标书插图素材。图片通过分类、标签和适用章节管理，不拆分多个图库。</p>
      </div>
      <div class="header-actions">
        <el-button plain @click="openOnlineSearchDialog">在线搜索图片</el-button>
        <el-button type="primary" :icon="UploadFilled" @click="openUploadDialog">上传图片</el-button>
      </div>
    </section>

    <section class="image-library-overview">
      <div class="overview-card">
        <span>当前筛选图片</span>
        <strong>{{ pager.total }}</strong>
      </div>
      <div class="overview-card">
        <span>本页已引用</span>
        <strong>{{ referencedCount }}</strong>
      </div>
      <div class="overview-card">
        <span>本页可删除</span>
        <strong>{{ availableDeleteCount }}</strong>
      </div>
    </section>

    <section class="image-library-toolbar">
      <div class="toolbar-left">
        <el-input v-model="query.keyword" clearable placeholder="搜索图片名称、标签、说明" @keyup.enter="searchImages">
          <template #prefix><el-icon><Search /></el-icon></template>
        </el-input>
        <el-select v-model="query.category" clearable filterable placeholder="分类" @change="searchImages">
          <el-option v-for="item in categoryOptions" :key="item" :label="item" :value="item" />
        </el-select>
        <el-select v-model="query.chapterType" clearable filterable placeholder="适用章节" @change="searchImages">
          <el-option v-for="item in chapterOptions" :key="item" :label="item" :value="item" />
        </el-select>
        <el-select v-model="query.status" clearable placeholder="状态" @change="searchImages">
          <el-option label="启用" :value="1" />
          <el-option label="停用" :value="0" />
        </el-select>
        <el-button type="primary" plain @click="searchImages">搜索</el-button>
        <el-button plain @click="resetSearch">重置</el-button>
      </div>
    </section>

    <section v-loading="loading" class="image-library-grid">
      <article v-for="item in imageList" :key="item.id" class="image-card" :class="{ 'is-referenced': hasReferences(item) }">
        <div class="image-thumb-wrap" @click="openPreviewDialog(item)">
          <ImageThumb :file-id="item.fileResourceId || item.fileId" />
          <div class="image-card-badges">
            <el-tag size="small" :type="item.status === 1 ? 'success' : 'info'" effect="dark">{{ item.status === 1 ? '启用' : '停用' }}</el-tag>
            <el-tag v-if="hasReferences(item)" size="small" type="warning" effect="dark">引用 {{ item.referenceCount }} 次</el-tag>
          </div>
          <div class="image-thumb-mask">点击预览</div>
        </div>
        <div class="image-card-body">
          <div class="image-card-title">
            <strong :title="item.imageName || item.originalName">{{ item.imageName || item.originalName || '未命名图片' }}</strong>
          </div>
          <p>{{ item.description || item.scene || '暂无图片说明' }}</p>
          <div class="image-card-tags">
            <el-tag v-if="item.category" size="small" effect="light">{{ item.category }}</el-tag>
            <el-tag v-if="item.chapterType" size="small" type="info" effect="light">{{ item.chapterType }}</el-tag>
            <el-tag v-for="tag in splitTags(item.tags)" :key="tag" size="small" type="warning" effect="light">{{ tag }}</el-tag>
          </div>
          <div class="image-card-meta">
            <span>{{ item.enterpriseName || '当前企业' }}</span>
            <span>{{ formatFileSize(item.fileSize) }}</span>
          </div>
          <div class="image-card-actions">
            <el-button size="small" plain @click="openPreviewDialog(item)">预览</el-button>
            <el-button size="small" plain @click="openReferenceDialog(item)">引用</el-button>
            <el-button size="small" plain @click="copyMarker(item)">复制标记</el-button>
            <el-button size="small" plain :disabled="!canEditImage(item)" @click="openEditDialog(item)">编辑</el-button>
            <el-tooltip :disabled="!hasReferences(item)" content="已被章节引用，需先删除章节中的图片引用" placement="top">
              <span>
                <el-button size="small" plain type="danger" :disabled="!canEditImage(item) || hasReferences(item)" @click="deleteImage(item)">删除</el-button>
              </span>
            </el-tooltip>
          </div>
        </div>
      </article>
      <el-empty v-if="!loading && !imageList.length" class="image-library-empty" description="暂无图片素材">
        <el-button type="primary" :icon="UploadFilled" @click="openUploadDialog">上传第一张图片</el-button>
        <p>建议上传前填写分类、标签和适用章节，后续技术方案插图时会自动推荐。</p>
      </el-empty>
    </section>

    <el-pagination
      v-if="pager.total > 0"
      class="image-library-pager"
      background
      layout="total, sizes, prev, pager, next, jumper"
      :total="pager.total"
      :current-page="pager.pageNum"
      :page-size="pager.pageSize"
      :page-sizes="[12, 24, 36, 60]"
      @current-change="onPageChange"
      @size-change="onSizeChange"
    />

    <el-dialog v-model="onlineSearchDialog.visible" title="在线搜索图片" width="1120px" class="online-search-dialog" destroy-on-close>
      <div class="online-search-panel">
        <div class="online-search-toolbar">
          <el-input v-model="onlineSearchDialog.keyword" clearable placeholder="输入关键词搜索网络图片，如：施工现场 安全文明施工" @keyup.enter="submitOnlineSearch">
            <template #prefix><el-icon><Search /></el-icon></template>
          </el-input>
          <el-input-number v-model="onlineSearchDialog.topK" :min="1" :max="20" />
          <el-button type="primary" :loading="onlineSearchDialog.loading" @click="submitOnlineSearch">搜索</el-button>
        </div>
        <div class="online-import-settings">
          <div class="online-import-settings-title">
            <span>导入设置</span>
            <small>点击“导入图片库”时会使用以下信息，来源页面会自动写入图片说明。</small>
          </div>
          <el-form label-position="top" class="online-import-form">
            <div class="online-import-grid">
              <el-form-item v-if="isPlatformUser" label="所属企业" required>
                <el-select
                  v-model="onlineSearchDialog.enterpriseId"
                  filterable
                  remote
                  clearable
                  reserve-keyword
                  :remote-method="remoteSearchEnterprises"
                  :loading="enterpriseLoading"
                  placeholder="请选择所属企业"
                  style="width: 100%"
                  @visible-change="onEnterpriseVisibleChange"
                >
                  <el-option v-for="item in enterpriseOptions" :key="item.id" :label="item.enterpriseName || item.name" :value="item.id" />
                </el-select>
              </el-form-item>
              <el-form-item label="分类">
                <el-select v-model="onlineSearchDialog.category" clearable filterable allow-create default-first-option placeholder="分类" style="width: 100%">
                  <el-option v-for="item in categoryOptions" :key="item" :label="item" :value="item" />
                </el-select>
              </el-form-item>
              <el-form-item label="标签">
                <el-select v-model="onlineSearchDialog.tagList" multiple filterable allow-create default-first-option placeholder="标签" style="width: 100%">
                  <el-option v-for="item in tagSuggestions" :key="item" :label="item" :value="item" />
                </el-select>
              </el-form-item>
              <el-form-item label="适用章节">
                <el-select v-model="onlineSearchDialog.chapterType" clearable filterable allow-create default-first-option placeholder="适用章节" style="width: 100%">
                  <el-option v-for="item in chapterOptions" :key="item" :label="item" :value="item" />
                </el-select>
              </el-form-item>
              <el-form-item label="适用场景">
                <el-input v-model="onlineSearchDialog.scene" placeholder="如：技术标插图、现场展示" />
              </el-form-item>
              <el-form-item label="图片说明">
                <el-input v-model="onlineSearchDialog.description" placeholder="可选，导入时会附加来源页面" />
              </el-form-item>
            </div>
          </el-form>
        </div>
        <div class="online-search-result-bar">
          <span>搜索结果</span>
          <small v-if="onlineSearchDialog.results.length">共 {{ onlineSearchDialog.results.length }} 张候选图片</small>
        </div>
        <div v-loading="onlineSearchDialog.loading" class="online-search-grid">
          <div v-for="(item, index) in onlineSearchDialog.results" :key="item.imageUrl || index" class="online-search-card">
            <el-image class="online-search-thumb" :src="item.thumbnailUrl || item.imageUrl" :preview-src-list="[item.imageUrl || item.thumbnailUrl].filter(Boolean)" fit="cover" preview-teleported />
            <div class="online-search-body">
              <strong :title="item.title || '在线图片'">{{ item.title || '在线图片' }}</strong>
              <p>{{ item.sourceDomain || '未知来源' }}</p>
              <div class="online-search-links">
                <a v-if="item.sourceUrl" :href="item.sourceUrl" target="_blank" rel="noreferrer">来源页面</a>
                <a v-if="item.imageUrl" :href="item.imageUrl" target="_blank" rel="noreferrer">原图</a>
              </div>
              <el-button size="small" type="primary" :loading="onlineSearchDialog.importingIndex === index" @click="importOnlineImage(item, index)">导入图片库</el-button>
            </div>
          </div>
          <el-empty v-if="!onlineSearchDialog.loading && !onlineSearchDialog.results.length" description="请输入关键词后搜索网络图片" />
        </div>
      </div>
    </el-dialog>

    <el-dialog v-model="previewDialog.visible" title="图片预览" width="780px" destroy-on-close>
      <div v-if="previewDialog.item" class="preview-dialog-body">
        <ImageThumb :file-id="previewDialog.item.fileResourceId || previewDialog.item.fileId" large />
        <div class="preview-info">
          <h3>{{ previewDialog.item.imageName || previewDialog.item.originalName || '未命名图片' }}</h3>
          <p>{{ previewDialog.item.description || '暂无图片说明' }}</p>
          <div class="preview-tags">
            <el-tag v-if="previewDialog.item.category" effect="light">{{ previewDialog.item.category }}</el-tag>
            <el-tag v-if="previewDialog.item.chapterType" type="info" effect="light">{{ previewDialog.item.chapterType }}</el-tag>
            <el-tag v-for="tag in splitTags(previewDialog.item.tags)" :key="tag" type="warning" effect="light">{{ tag }}</el-tag>
          </div>
        </div>
      </div>
    </el-dialog>

    <el-dialog v-model="uploadDialog.visible" title="上传图片" width="720px" destroy-on-close>
      <el-form class="image-form" label-position="top">
        <el-form-item v-if="isPlatformUser" label="所属企业" required>
          <el-select
            v-model="uploadDialog.enterpriseId"
            filterable
            remote
            clearable
            reserve-keyword
            :remote-method="remoteSearchEnterprises"
            :loading="enterpriseLoading"
            placeholder="请选择所属企业"
            style="width: 100%"
            @visible-change="onEnterpriseVisibleChange"
          >
            <el-option v-for="item in enterpriseOptions" :key="item.id" :label="item.enterpriseName || item.name" :value="item.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="图片文件" required>
          <el-upload
            drag
            action="#"
            :auto-upload="false"
            :limit="1"
            :file-list="uploadDialog.files"
            :on-change="onImageFileChange"
            :on-remove="onImageFileRemove"
            :on-exceed="onImageFileExceed"
            accept=".jpg,.jpeg,.png,.JPG,.JPEG,.PNG"
          >
            <el-icon class="upload-icon"><UploadFilled /></el-icon>
            <div>拖拽图片到此处，或点击选择</div>
            <small>仅支持 jpg、jpeg、png，建议单图不超过 10MB</small>
          </el-upload>
        </el-form-item>
        <div class="image-form-grid">
          <el-form-item label="图片名称">
            <el-input v-model="uploadDialog.imageName" maxlength="100" show-word-limit placeholder="默认使用文件名" />
          </el-form-item>
          <el-form-item label="分类">
            <el-select v-model="uploadDialog.category" clearable filterable allow-create default-first-option placeholder="请选择或输入分类" style="width: 100%">
              <el-option v-for="item in categoryOptions" :key="item" :label="item" :value="item" />
            </el-select>
          </el-form-item>
          <el-form-item label="标签">
            <el-select v-model="uploadDialog.tagList" multiple filterable allow-create default-first-option placeholder="请选择或输入标签" style="width: 100%">
              <el-option v-for="item in tagSuggestions" :key="item" :label="item" :value="item" />
            </el-select>
          </el-form-item>
          <el-form-item label="适用章节">
            <el-select v-model="uploadDialog.chapterType" clearable filterable allow-create default-first-option placeholder="请选择或输入适用章节" style="width: 100%">
              <el-option v-for="item in chapterOptions" :key="item" :label="item" :value="item" />
            </el-select>
          </el-form-item>
        </div>
        <el-form-item label="适用场景">
          <el-input v-model="uploadDialog.scene" placeholder="如：技术标插图、案例展示" />
        </el-form-item>
        <el-form-item label="图片说明">
          <el-input v-model="uploadDialog.description" type="textarea" :rows="3" maxlength="500" show-word-limit />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="uploadDialog.visible = false">取消</el-button>
        <el-button type="primary" :loading="uploadDialog.loading" @click="submitUpload">上传</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="editDialog.visible" title="编辑图片信息" width="680px" destroy-on-close>
      <el-form class="image-form" label-position="top">
        <div class="image-form-grid">
          <el-form-item label="图片名称" required>
            <el-input v-model="editDialog.form.imageName" maxlength="100" show-word-limit />
          </el-form-item>
          <el-form-item label="状态">
            <el-radio-group v-model="editDialog.form.status">
              <el-radio-button :label="1">启用</el-radio-button>
              <el-radio-button :label="0">停用</el-radio-button>
            </el-radio-group>
          </el-form-item>
          <el-form-item label="分类">
            <el-select v-model="editDialog.form.category" clearable filterable allow-create default-first-option placeholder="请选择或输入分类" style="width: 100%">
              <el-option v-for="item in categoryOptions" :key="item" :label="item" :value="item" />
            </el-select>
          </el-form-item>
          <el-form-item label="适用章节">
            <el-select v-model="editDialog.form.chapterType" clearable filterable allow-create default-first-option placeholder="请选择或输入适用章节" style="width: 100%">
              <el-option v-for="item in chapterOptions" :key="item" :label="item" :value="item" />
            </el-select>
          </el-form-item>
        </div>
        <el-form-item label="标签">
          <el-select v-model="editDialog.form.tagList" multiple filterable allow-create default-first-option placeholder="请选择或输入标签" style="width: 100%">
            <el-option v-for="item in tagSuggestions" :key="item" :label="item" :value="item" />
          </el-select>
        </el-form-item>
        <el-form-item label="适用场景">
          <el-input v-model="editDialog.form.scene" />
        </el-form-item>
        <el-form-item label="图片说明">
          <el-input v-model="editDialog.form.description" type="textarea" :rows="3" maxlength="500" show-word-limit />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="editDialog.visible = false">取消</el-button>
        <el-button type="primary" :loading="editDialog.loading" @click="submitEdit">保存</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="referenceDialog.visible" title="图片引用情况" width="720px" destroy-on-close>
      <div v-loading="referenceDialog.loading" class="reference-dialog-body">
        <el-alert
          v-if="referenceDialog.summary.referenceCount > 0"
          type="warning"
          show-icon
          :closable="false"
          :title="`该图片已被 ${referenceDialog.summary.referenceCount} 个章节引用，删除前需要先在章节正文中移除图片引用。`"
        />
        <el-alert
          v-else
          type="success"
          show-icon
          :closable="false"
          title="当前图片暂未被章节引用，可以删除。"
        />
        <el-table v-if="referenceDialog.summary.references.length" :data="referenceDialog.summary.references" size="small" border class="reference-table">
          <el-table-column label="方案/标书" min-width="220">
            <template #default="{ row }">{{ row.solutionName || '-' }}</template>
          </el-table-column>
          <el-table-column label="章节" min-width="220">
            <template #default="{ row }">{{ row.sectionTitle || row.outlineTitle || '-' }}</template>
          </el-table-column>
          <el-table-column label="更新时间" width="170">
            <template #default="{ row }">{{ formatDateTime(row.updateTime) }}</template>
          </el-table-column>
        </el-table>
        <el-empty v-else-if="!referenceDialog.loading" description="暂无引用明细" />
      </div>
      <template #footer>
        <el-button @click="referenceDialog.visible = false">关闭</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { computed, defineComponent, h, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { Search, UploadFilled } from '@element-plus/icons-vue'
import { ElImage, genFileId } from 'element-plus'
import { ElMessage, ElMessageBox } from '@/plugins/element-plus-api'
import { pageEnterprises } from '@/api/enterprise'
import { deleteMaterialImage, getMaterialImageReferences, importOnlineMaterialImage, onlineSearchMaterialImages, pageMaterialImages, updateMaterialImage, uploadMaterialImage } from '@/api/materialImage'
import {
  MATERIAL_IMAGE_CATEGORY_OPTIONS,
  MATERIAL_IMAGE_CHAPTER_OPTIONS,
  MATERIAL_IMAGE_TAG_SUGGESTIONS
} from '@/config/materialImageOptions'
import { downloadFileBlob } from '@/api/file'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const ROLE_SUPER_ADMIN = 'SUPERADMIN'
const ROLE_PLATFORM_ADMIN = 'PLATFORMADMIN'

const categoryOptions = MATERIAL_IMAGE_CATEGORY_OPTIONS
const chapterOptions = MATERIAL_IMAGE_CHAPTER_OPTIONS
const tagSuggestions = MATERIAL_IMAGE_TAG_SUGGESTIONS

const imageList = ref([])
const loading = ref(false)
const query = reactive({ keyword: '', category: '', chapterType: '', status: '' })
const pager = reactive({ pageNum: 1, pageSize: 12, total: 0 })
const enterpriseOptions = ref([])
const enterpriseLoading = ref(false)
const enterpriseKeyword = ref('')

const uploadDialog = reactive({
  visible: false,
  loading: false,
  files: [],
  enterpriseId: '',
  imageName: '',
  category: '',
  tags: '',
  tagList: [],
  scene: '',
  chapterType: '',
  description: ''
})


const onlineSearchDialog = reactive({
  visible: false,
  loading: false,
  importingIndex: -1,
  keyword: '',
  topK: 10,
  enterpriseId: '',
  category: '在线搜索',
  tagList: [],
  scene: '在线搜索导入',
  chapterType: '',
  description: '',
  results: []
})

const editDialog = reactive({
  visible: false,
  loading: false,
  id: '',
  form: {
    imageName: '',
    category: '',
    tags: '',
    tagList: [],
    scene: '',
    chapterType: '',
    description: '',
    status: 1
  }
})

const referenceDialog = reactive({
  visible: false,
  loading: false,
  imageId: '',
  summary: {
    referenceCount: 0,
    references: []
  }
})

const roleCodes = computed(() => normalizeRoleList(auth.user?.roles || auth.user?.roleCodes || []))
const isPlatformUser = computed(() => roleCodes.value.includes(ROLE_SUPER_ADMIN) || roleCodes.value.includes(ROLE_PLATFORM_ADMIN))
const referencedCount = computed(() => imageList.value.filter((item) => hasReferences(item)).length)
const availableDeleteCount = computed(() => imageList.value.filter((item) => canEditImage(item) && !hasReferences(item)).length)

const previewDialog = reactive({
  visible: false,
  item: null
})

onMounted(() => {
  loadImages()
})

async function loadImages() {
  loading.value = true
  try {
    const res = await pageMaterialImages({
      keyword: query.keyword || undefined,
      category: query.category || undefined,
      chapterType: query.chapterType || undefined,
      status: query.status === '' ? undefined : query.status,
      pageNum: pager.pageNum,
      pageSize: pager.pageSize
    })
    imageList.value = res?.records || []
    pager.total = Number(res?.total || 0)
  } finally {
    loading.value = false
  }
}

function searchImages() {
  pager.pageNum = 1
  loadImages()
}

function resetSearch() {
  query.keyword = ''
  query.category = ''
  query.chapterType = ''
  query.status = ''
  pager.pageNum = 1
  loadImages()
}

function hasReferences(item) {
  return Number(item?.referenceCount || 0) > 0
}

function canEditImage(item) {
  return item?.canEdit !== false
}

function openPreviewDialog(item) {
  previewDialog.item = item
  previewDialog.visible = true
}

function onPageChange(page) {
  pager.pageNum = page
  loadImages()
}

function onSizeChange(size) {
  pager.pageSize = size
  pager.pageNum = 1
  loadImages()
}


function openOnlineSearchDialog() {
  Object.assign(onlineSearchDialog, {
    visible: true,
    loading: false,
    importingIndex: -1,
    keyword: '',
    topK: 10,
    enterpriseId: '',
    category: '在线搜索',
    tagList: [],
    scene: '在线搜索导入',
    chapterType: '',
    description: '',
    results: []
  })
  if (isPlatformUser.value) loadEnterprises('')
}

async function submitOnlineSearch() {
  if (!onlineSearchDialog.keyword.trim()) {
    ElMessage.warning('请输入在线搜索关键词')
    return
  }
  onlineSearchDialog.loading = true
  try {
    const res = await onlineSearchMaterialImages({ keyword: onlineSearchDialog.keyword, topK: onlineSearchDialog.topK })
    onlineSearchDialog.results = Array.isArray(res) ? res : []
    if (!onlineSearchDialog.results.length) {
      ElMessage.warning('未搜索到可用图片')
    }
  } finally {
    onlineSearchDialog.loading = false
  }
}

async function importOnlineImage(item, index) {
  if (isPlatformUser.value && !onlineSearchDialog.enterpriseId) {
    ElMessage.warning('请选择所属企业')
    return
  }
  onlineSearchDialog.importingIndex = index
  try {
    await importOnlineMaterialImage({
      enterpriseId: onlineSearchDialog.enterpriseId,
      imageUrl: item.imageUrl,
      thumbnailUrl: item.thumbnailUrl,
      sourceUrl: item.sourceUrl,
      sourceDomain: item.sourceDomain,
      imageName: item.title,
      category: onlineSearchDialog.category,
      tags: normalizeTagValue(onlineSearchDialog.tagList),
      scene: onlineSearchDialog.scene,
      chapterType: onlineSearchDialog.chapterType,
      description: onlineSearchDialog.description
    })
    ElMessage.success('已导入图片库')
    loadImages()
  } finally {
    onlineSearchDialog.importingIndex = -1
  }
}

function openUploadDialog() {
  Object.assign(uploadDialog, {
    visible: true,
    loading: false,
    files: [],
    enterpriseId: '',
    imageName: '',
    category: '',
    tags: '',
    tagList: [],
    scene: '',
    chapterType: '',
    description: ''
  })
  if (isPlatformUser.value) loadEnterprises('')
}

function onImageFileChange(file) {
  uploadDialog.files = [file]
  if (!uploadDialog.imageName && file?.name) {
    uploadDialog.imageName = String(file.name).replace(/\.[^.]+$/, '')
  }
}

function onImageFileRemove() {
  uploadDialog.files = []
}

function onImageFileExceed(files, uploadFiles) {
  uploadDialog.files = [{ ...files[0], uid: genFileId() }]
}

async function submitUpload() {
  const raw = uploadDialog.files?.[0]?.raw || uploadDialog.files?.[0]
  if (!raw) {
    ElMessage.warning('请选择图片文件')
    return
  }
  if (isPlatformUser.value && !uploadDialog.enterpriseId) {
    ElMessage.warning('请选择所属企业')
    return
  }
  uploadDialog.loading = true
  try {
    await uploadMaterialImage({
      file: raw,
      enterpriseId: uploadDialog.enterpriseId,
      imageName: uploadDialog.imageName,
      category: uploadDialog.category,
      tags: normalizeTagValue(uploadDialog.tagList),
      scene: uploadDialog.scene,
      chapterType: uploadDialog.chapterType,
      description: uploadDialog.description
    })
    uploadDialog.visible = false
    ElMessage.success('图片已上传')
    await loadImages()
  } finally {
    uploadDialog.loading = false
  }
}

function openEditDialog(item) {
  editDialog.id = item.id
  editDialog.form = {
    imageName: item.imageName || '',
    category: item.category || '',
    tags: item.tags || '',
    tagList: splitTags(item.tags),
    scene: item.scene || '',
    chapterType: item.chapterType || '',
    description: item.description || '',
    status: item.status === 0 ? 0 : 1
  }
  editDialog.visible = true
}

async function submitEdit() {
  if (!editDialog.form.imageName.trim()) {
    ElMessage.warning('请输入图片名称')
    return
  }
  editDialog.loading = true
  try {
    await updateMaterialImage(editDialog.id, {
      imageName: editDialog.form.imageName,
      category: editDialog.form.category,
      tags: normalizeTagValue(editDialog.form.tagList),
      scene: editDialog.form.scene,
      chapterType: editDialog.form.chapterType,
      description: editDialog.form.description,
      status: editDialog.form.status
    })
    editDialog.visible = false
    ElMessage.success('图片信息已保存')
    await loadImages()
  } finally {
    editDialog.loading = false
  }
}

async function openReferenceDialog(item) {
  referenceDialog.visible = true
  referenceDialog.loading = true
  referenceDialog.imageId = item.id
  referenceDialog.summary = { referenceCount: Number(item.referenceCount || 0), references: [] }
  try {
    const res = await getMaterialImageReferences(item.id)
    referenceDialog.summary = {
      referenceCount: Number(res?.referenceCount || 0),
      references: Array.isArray(res?.references) ? res.references : []
    }
  } finally {
    referenceDialog.loading = false
  }
}

async function deleteImage(item) {
  if (!canEditImage(item)) {
    ElMessage.warning('当前账号不能删除该图片')
    return
  }
  try {
    const ref = await getMaterialImageReferences(item.id)
    const refCount = Number(ref?.referenceCount || 0)
    if (refCount > 0) {
      referenceDialog.visible = true
      referenceDialog.loading = false
      referenceDialog.imageId = item.id
      referenceDialog.summary = {
        referenceCount: refCount,
        references: Array.isArray(ref?.references) ? ref.references : []
      }
      ElMessage.warning(`该图片已被 ${refCount} 个章节引用，不能直接删除`)
      return
    }
    await ElMessageBox.confirm(`确认删除图片“${item.imageName || item.originalName || ''}”？`, '删除图片', { type: 'warning' })
    await deleteMaterialImage(item.id)
    ElMessage.success('图片已删除')
    await loadImages()
  } catch (e) {
    // 用户取消不处理。
  }
}

async function copyMarker(item) {
  const text = item.marker || buildMarker(item)
  try {
    await navigator.clipboard.writeText(text)
    ElMessage.success('插图标记已复制')
  } catch (e) {
    ElMessage.warning('浏览器不支持自动复制，请在标书编辑区通过“插入图片”选择')
  }
}

function splitTags(value) {
  return String(value || '')
    .split(/[，,]/)
    .map((item) => item.trim())
    .filter(Boolean)
}

function normalizeTagValue(value) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item || '').trim()).filter(Boolean).join(',')
  }
  return String(value || '').trim()
}

function buildMarker(item) {
  const alt = String(item.imageName || item.originalName || '图片').replace(/[\[\]()]/g, '')
  const fileId = item.fileResourceId || item.fileId
  return `![${alt}](aibid-file://${fileId}?width=480&align=center&imageId=${item.id})`
}

async function loadEnterprises(keyword = '') {
  if (!isPlatformUser.value) return
  enterpriseLoading.value = true
  try {
    const res = await pageEnterprises({ keyword, pageNum: 1, pageSize: 20, status: 1 })
    enterpriseOptions.value = res?.records || []
  } finally {
    enterpriseLoading.value = false
  }
}

function remoteSearchEnterprises(keyword) {
  enterpriseKeyword.value = keyword || ''
  loadEnterprises(enterpriseKeyword.value)
}

function onEnterpriseVisibleChange(visible) {
  if (visible && !enterpriseOptions.value.length) loadEnterprises(enterpriseKeyword.value)
}

function formatDateTime(value) {
  if (!value) return '-'
  return String(value).replace('T', ' ').slice(0, 19)
}

function formatFileSize(size) {
  const value = Number(size || 0)
  if (!value) return '0 KB'
  if (value < 1024 * 1024) return `${Math.max(1, Math.round(value / 1024))} KB`
  return `${(value / 1024 / 1024).toFixed(1)} MB`
}

function normalizeRoleCode(value = '') {
  return String(value).trim().toUpperCase().replace(/^ROLE[_-]?/, '').replace(/[^A-Z0-9]/g, '')
}

function normalizeRoleList(values = []) {
  if (!Array.isArray(values)) return []
  return values.map((item) => {
    if (typeof item === 'string') return normalizeRoleCode(item)
    return normalizeRoleCode(item?.roleCode || item?.code || item?.authority || item?.name || '')
  }).filter(Boolean)
}

const ImageThumb = defineComponent({
  name: 'ImageThumb',
  props: { fileId: String, large: Boolean },
  setup(props) {
    const url = ref('')
    let objectUrl = ''
    async function load() {
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl)
        objectUrl = ''
      }
      url.value = ''
      if (!props.fileId) return
      try {
        const blob = await downloadFileBlob(props.fileId)
        objectUrl = URL.createObjectURL(blob)
        url.value = objectUrl
      } catch (e) {
        url.value = ''
      }
    }
    watch(() => props.fileId, load, { immediate: true })
    onBeforeUnmount(() => {
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    })
    return () => url.value
      ? h(ElImage, { src: url.value, fit: 'cover', class: ['image-thumb', { 'is-large': props.large }], previewTeleported: true, previewSrcList: [url.value], zIndex: 3000 })
      : h('div', { class: ['image-thumb', 'empty', { 'is-large': props.large }] }, '无预览')
  }
})
</script>


<style scoped>
.image-library-page {
  display: flex;
  flex-direction: column;
  gap: 14px;
  min-height: 0;
}
.image-library-header,
.image-library-toolbar,
.image-library-overview {
  border: 1px solid #e5edf7;
  border-radius: 16px;
  background: #fff;
}

.header-actions {
  display: flex;
  gap: 10px;
}
:deep(.online-search-dialog .el-dialog__body) {
  max-height: 74vh;
  overflow-y: auto;
  padding-top: 8px;
}
.online-search-panel {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.online-search-toolbar {
  display: grid;
  grid-template-columns: minmax(360px, 1fr) 150px 84px;
  gap: 10px;
  align-items: center;
}
.online-search-toolbar :deep(.el-input-number) {
  width: 150px;
}
.online-import-settings {
  padding: 12px 14px 4px;
  border: 1px solid #e5edf7;
  border-radius: 14px;
  background: #f8fbff;
}
.online-import-settings-title {
  display: flex;
  align-items: baseline;
  gap: 10px;
  margin-bottom: 8px;
}
.online-import-settings-title span {
  color: #0f172a;
  font-weight: 600;
}
.online-import-settings-title small {
  color: #94a3b8;
}
.online-import-form :deep(.el-form-item) {
  margin-bottom: 10px;
}
.online-import-form :deep(.el-form-item__label) {
  padding-bottom: 4px;
  color: #64748b;
  font-size: 12px;
}
.online-import-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0 12px;
}
.online-search-result-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: #0f172a;
  font-weight: 600;
}
.online-search-result-bar small {
  color: #94a3b8;
  font-weight: 400;
}
.online-search-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
  min-height: 220px;
}
.online-search-card {
  overflow: hidden;
  border: 1px solid #e5edf7;
  border-radius: 14px;
  background: #fff;
  box-shadow: 0 8px 20px rgba(15, 23, 42, 0.04);
}
.online-search-thumb {
  display: block;
  width: 100%;
  height: 178px;
  background: #f8fafc;
}
.online-search-body {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
}
.online-search-body strong {
  overflow: hidden;
  color: #0f172a;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.online-search-body p {
  margin: 0;
  color: #64748b;
  font-size: 13px;
}
.online-search-links {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}
.online-search-links a {
  color: #1677ff;
  font-size: 12px;
  text-decoration: none;
}

.image-library-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 18px 20px;
}
.image-library-header h2 {
  margin: 0;
  color: #0f172a;
  font-size: 20px;
}
.image-library-header p {
  margin: 6px 0 0;
  color: #64748b;
  font-size: 13px;
}
.image-library-overview {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  padding: 14px;
}
.overview-card {
  padding: 14px 16px;
  border-radius: 12px;
  background: linear-gradient(180deg, #f8fbff 0%, #ffffff 100%);
  border: 1px solid #edf2f7;
}
.overview-card span {
  display: block;
  color: #64748b;
  font-size: 13px;
}
.overview-card strong {
  display: block;
  margin-top: 6px;
  color: #0f172a;
  font-size: 24px;
}
.image-library-toolbar {
  padding: 16px;
}
.toolbar-left {
  display: grid;
  grid-template-columns: minmax(220px, 1fr) 150px 170px 120px auto auto;
  gap: 10px;
  align-items: center;
}
.image-library-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;
  min-height: 360px;
}
.image-card {
  overflow: hidden;
  border: 1px solid #e5edf7;
  border-radius: 16px;
  background: #fff;
  box-shadow: 0 10px 24px rgba(15, 23, 42, 0.04);
  transition: border-color 0.16s ease, box-shadow 0.16s ease, transform 0.16s ease;
}
.image-card:hover {
  border-color: #b8d7ff;
  box-shadow: 0 14px 30px rgba(15, 23, 42, 0.08);
  transform: translateY(-1px);
}
.image-card.is-referenced {
  border-color: #f5d48a;
}
.image-thumb-wrap {
  position: relative;
  cursor: pointer;
}
.image-thumb {
  display: block;
  width: 100%;
  height: 178px;
  background: #f8fafc;
}
.image-thumb.is-large {
  height: 430px;
  border-radius: 12px;
}
.image-thumb.empty {
  display: flex;
  align-items: center;
  justify-content: center;
  color: #94a3b8;
}
.image-card-badges {
  position: absolute;
  top: 8px;
  left: 8px;
  right: 8px;
  z-index: 2;
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}
.image-thumb-mask {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 13px;
  opacity: 0;
  background: rgba(15, 23, 42, 0.38);
  transition: opacity 0.16s ease;
}
.image-thumb-wrap:hover .image-thumb-mask {
  opacity: 1;
}
.image-card-body {
  padding: 12px;
}
.image-card-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.image-card-title strong {
  overflow: hidden;
  color: #0f172a;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.image-card-body p {
  height: 42px;
  margin: 8px 0;
  overflow: hidden;
  color: #64748b;
  font-size: 13px;
  line-height: 1.5;
}
.image-card-tags,
.preview-tags {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  min-height: 24px;
}
.image-card-meta {
  display: flex;
  justify-content: space-between;
  margin-top: 10px;
  color: #94a3b8;
  font-size: 12px;
}
.image-card-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 12px;
}
.image-library-pager {
  align-self: flex-end;
  padding: 8px 0 0;
}
.image-library-empty {
  grid-column: 1 / -1;
  align-self: center;
}
.image-library-empty p {
  margin: 10px 0 0;
  color: #94a3b8;
  font-size: 13px;
}
.upload-icon {
  margin-bottom: 8px;
  font-size: 30px;
  color: #1677ff;
}
.image-form :deep(.el-upload),
.image-form :deep(.el-upload-dragger) {
  width: 100%;
}
.image-form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0 14px;
}
.preview-dialog-body {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.preview-info {
  padding: 12px;
  border-radius: 12px;
  background: #f8fafc;
}
.preview-info h3 {
  margin: 0 0 6px;
  color: #0f172a;
}
.preview-info p {
  margin: 0 0 10px;
  color: #64748b;
}
.reference-dialog-body {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-height: 160px;
}
.reference-table {
  width: 100%;
}
@media (max-width: 1280px) {
  .image-library-grid,
  .online-search-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}
@media (max-width: 980px) {
  .toolbar-left,
  .image-form-grid,
  .image-library-overview,
  .online-search-toolbar,
  .online-import-grid {
    grid-template-columns: 1fr;
  }
  .image-library-header {
    align-items: flex-start;
    flex-direction: column;
  }
  .image-library-grid,
  .online-search-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
