<template>
  <el-dialog v-model="visible" title="插入配图" width="1120px" destroy-on-close @open="onOpen">
    <div class="image-picker-top">
      <div>
        <strong>当前章节：{{ chapterTitle || '未选择章节' }}</strong>
        <p v-if="recommendation.matched">
          系统已根据章节推荐素材：
          <el-tag v-if="recommendation.category" size="small" effect="light">{{ recommendation.category }}</el-tag>
          <el-tag v-if="recommendation.chapterType" size="small" type="info" effect="light">{{ recommendation.chapterType }}</el-tag>
        </p>
        <p v-else>未命中固定推荐规则，可通过分类、适用章节或关键字筛选。</p>
      </div>
      <el-button v-if="recommendation.matched" size="small" type="primary" plain @click="applyRecommendation">应用推荐筛选</el-button>
    </div>

    <div class="image-picker-toolbar">
      <el-input v-model="query.keyword" clearable placeholder="搜索图片名称、标签、说明" @keyup.enter="searchImages">
        <template #prefix><el-icon><Search /></el-icon></template>
      </el-input>
      <el-select v-model="query.category" clearable filterable placeholder="分类" @change="searchImages">
        <el-option v-for="item in categoryOptions" :key="item" :label="item" :value="item" />
      </el-select>
      <el-select v-model="query.chapterType" clearable filterable placeholder="适用章节" @change="searchImages">
        <el-option v-for="item in chapterOptions" :key="item" :label="item" :value="item" />
      </el-select>
      <el-button type="primary" plain @click="searchImages">搜索</el-button>
      <el-button plain @click="resetSearch">重置</el-button>
    </div>

    <el-alert
      v-if="fallbackNotice"
      class="image-picker-alert"
      type="info"
      :closable="false"
      show-icon
      :title="fallbackNotice"
    />

    <div class="image-picker-tabs">
      <button type="button" :class="{ active: filterMode === 'all' }" @click="setFilterMode('all')">全部图片 {{ imageList.length }}</button>
      <button type="button" :class="{ active: filterMode === 'recommended' }" @click="setFilterMode('recommended')">推荐图片 {{ recommendedCount }}</button>
    </div>

    <div class="image-picker-body">
      <div v-loading="loading" class="image-picker-grid">
        <div
          v-for="item in displayImages"
          :key="item.id"
          class="image-picker-card"
          :class="{ active: selected?.id === item.id, recommended: isRecommendedImage(item) }"
          @click="selectImage(item)"
        >
          <div v-if="isRecommendedImage(item)" class="recommended-badge">推荐</div>
          <ImageThumb :file-id="item.fileResourceId || item.fileId" />
          <div class="image-picker-card-body">
            <strong :title="item.imageName || item.originalName">{{ item.imageName || item.originalName || '未命名图片' }}</strong>
            <p>{{ item.description || item.scene || '暂无说明' }}</p>
            <div class="image-picker-tags">
              <el-tag v-if="item.category" size="small" effect="light">{{ item.category }}</el-tag>
              <el-tag v-if="item.chapterType" size="small" type="info" effect="light">{{ item.chapterType }}</el-tag>
              <el-tag v-for="tag in splitTags(item.tags)" :key="tag" size="small" type="warning" effect="light">{{ tag }}</el-tag>
            </div>
          </div>
        </div>
        <el-empty v-if="!loading && !displayImages.length" :description="filterMode === 'recommended' ? '当前页暂无推荐图片，可切换全部图片或调整筛选条件' : '暂无图片，请先到资料库-图片库上传'" />
      </div>

      <div class="image-insert-panel">
        <div class="panel-title">插入设置</div>
        <div class="local-upload-box">
          <div class="local-upload-head">
            <strong>本地上传</strong>
            <span>上传后自动加入图片库并选中</span>
          </div>
          <el-upload
            accept=".jpg,.jpeg,.png,image/jpeg,image/png"
            :auto-upload="false"
            :show-file-list="false"
            :disabled="uploading"
            :on-change="onLocalUploadChange"
          >
            <el-button size="small" type="primary" plain :loading="uploading">上传本地图片</el-button>
          </el-upload>
          <p>支持 JPG、JPEG、PNG，建议单张不超过 8MB。插入后会绑定到当前章节。</p>
        </div>
        <template v-if="selected">
          <ImageThumb :file-id="selected.fileResourceId || selected.fileId" large />
          <div class="selected-image-info">
            <span>已选择</span>
            <strong>{{ selected.imageName || selected.originalName || '未命名图片' }}</strong>
            <p>{{ selected.description || selected.scene || '暂无图片说明' }}</p>
          </div>
          <el-form label-position="top" class="insert-form">
            <el-form-item label="图片说明">
              <el-input v-model="insertForm.caption" maxlength="80" show-word-limit placeholder="例如：图 2-1 施工现场塔吊作业情况" />
            </el-form-item>
            <el-form-item label="图片宽度">
              <el-radio-group v-model="insertForm.width" size="small">
                <el-radio-button :label="420">小</el-radio-button>
                <el-radio-button :label="680">中</el-radio-button>
                <el-radio-button :label="900">大</el-radio-button>
              </el-radio-group>
            </el-form-item>
            <el-form-item label="对齐方式">
              <el-radio-group v-model="insertForm.align" size="small">
                <el-radio-button label="left">左对齐</el-radio-button>
                <el-radio-button label="center">居中</el-radio-button>
                <el-radio-button label="right">右对齐</el-radio-button>
              </el-radio-group>
            </el-form-item>
          </el-form>
        </template>
        <el-empty v-else :image-size="72" description="请先选择一张图片" />
      </div>
    </div>

    <template #footer>
      <el-pagination
        class="image-picker-pager"
        layout="prev, pager, next"
        :total="pager.total"
        :current-page="pager.pageNum"
        :page-size="pager.pageSize"
        @current-change="onPageChange"
      />
      <el-button @click="visible = false">取消</el-button>
      <el-button type="primary" :disabled="!selected" @click="confirmInsert">插入配图</el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { computed, defineComponent, h, onBeforeUnmount, reactive, ref, watch } from 'vue'
import { Search } from '@element-plus/icons-vue'
import { ElImage, ElMessage } from 'element-plus'
import { pageMaterialImages, uploadMaterialImage } from '@/api/materialImage'
import { downloadFileBlob } from '@/api/file'
import {
  MATERIAL_IMAGE_CATEGORY_OPTIONS,
  MATERIAL_IMAGE_CHAPTER_OPTIONS,
  inferMaterialImageRecommendation
} from '@/config/materialImageOptions'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  chapterTitle: {
    type: String,
    default: ''
  },
  enterpriseId: {
    type: [String, Number],
    default: ''
  }
})
const emit = defineEmits(['update:modelValue', 'insert'])

const visible = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

const categoryOptions = MATERIAL_IMAGE_CATEGORY_OPTIONS
const chapterOptions = MATERIAL_IMAGE_CHAPTER_OPTIONS
const recommendation = computed(() => inferMaterialImageRecommendation(props.chapterTitle))
const query = reactive({ keyword: '', category: '', chapterType: '' })
const pager = reactive({ pageNum: 1, pageSize: 12, total: 0 })
const imageList = ref([])
const selected = ref(null)
const loading = ref(false)
const uploading = ref(false)
const fallbackNotice = ref('')
const insertedByRecommendation = ref(false)
const insertForm = reactive({ caption: '', width: 680, align: 'center' })
const filterMode = ref('all')
const recommendedCount = computed(() => imageList.value.filter((item) => isRecommendedImage(item)).length)
const displayImages = computed(() => filterMode.value === 'recommended' ? imageList.value.filter((item) => isRecommendedImage(item)) : imageList.value)

watch(selected, (item) => {
  if (!item) {
    insertForm.caption = ''
    insertForm.width = 680
    insertForm.align = 'center'
    return
  }
  insertForm.caption = item.description || item.imageName || item.originalName || '图片'
  insertForm.width = 680
  insertForm.align = 'center'
})

function onOpen() {
  pager.pageNum = 1
  selected.value = null
  fallbackNotice.value = ''
  filterMode.value = 'all'
  if (recommendation.value.matched) {
    query.category = recommendation.value.category || ''
    query.chapterType = recommendation.value.chapterType || ''
    insertedByRecommendation.value = true
  } else {
    insertedByRecommendation.value = false
  }
  loadImages({ fallbackIfEmpty: insertedByRecommendation.value })
}

async function loadImages(options = {}) {
  loading.value = true
  fallbackNotice.value = ''
  try {
    const params = {
      keyword: query.keyword || undefined,
      category: query.category || undefined,
      chapterType: query.chapterType || undefined,
      status: 1,
      enterpriseId: props.enterpriseId || undefined,
      pageNum: pager.pageNum,
      pageSize: pager.pageSize
    }
    const res = await pageMaterialImages(params)
    let records = res?.records || []
    let total = Number(res?.total || 0)

    if (options.fallbackIfEmpty && !records.length && (query.category || query.chapterType)) {
      const fallbackRes = await pageMaterialImages({
        keyword: query.keyword || undefined,
        status: 1,
        enterpriseId: props.enterpriseId || undefined,
        pageNum: 1,
        pageSize: pager.pageSize
      })
      records = fallbackRes?.records || []
      total = Number(fallbackRes?.total || 0)
      pager.pageNum = 1
      fallbackNotice.value = '当前章节推荐条件暂无图片，已自动展示全部启用图片。'
    }

    imageList.value = sortRecommendedFirst(records)
    pager.total = total
    if (selected.value && !imageList.value.some((item) => item.id === selected.value.id)) selected.value = null
  } finally {
    loading.value = false
  }
}

function sortRecommendedFirst(records = []) {
  return [...records].sort((a, b) => Number(isRecommendedImage(b)) - Number(isRecommendedImage(a)))
}

function isRecommendedImage(item) {
  if (!recommendation.value.matched || !item) return false
  return String(item.category || '') === recommendation.value.category || String(item.chapterType || '') === recommendation.value.chapterType
}

function searchImages() {
  pager.pageNum = 1
  selected.value = null
  insertedByRecommendation.value = false
  loadImages()
}

function resetSearch() {
  filterMode.value = 'all'
  query.keyword = ''
  query.category = ''
  query.chapterType = ''
  pager.pageNum = 1
  selected.value = null
  insertedByRecommendation.value = false
  loadImages()
}

function setFilterMode(mode) {
  filterMode.value = mode
  if (mode === 'recommended' && recommendedCount.value === 0 && recommendation.value.matched) {
    applyRecommendation()
  }
}

function selectImage(item) {
  selected.value = item
}

function splitTags(value) {
  return String(value || '')
    .split(/[，,]/)
    .map((item) => item.trim())
    .filter(Boolean)
}

function applyRecommendation() {
  if (!recommendation.value.matched) return
  query.category = recommendation.value.category || ''
  query.chapterType = recommendation.value.chapterType || ''
  pager.pageNum = 1
  selected.value = null
  insertedByRecommendation.value = true
  loadImages({ fallbackIfEmpty: true })
}

function onPageChange(page) {
  pager.pageNum = page
  loadImages({ fallbackIfEmpty: insertedByRecommendation.value })
}

async function onLocalUploadChange(uploadFile) {
  const raw = uploadFile?.raw
  if (!raw) return
  const name = raw.name || 'section-image.png'
  if (!/\.(jpe?g|png)$/i.test(name)) {
    ElMessage.warning('只支持上传 JPG、JPEG、PNG 图片')
    return
  }
  if (raw.size && raw.size > 8 * 1024 * 1024) {
    ElMessage.warning('图片不能超过 8MB')
    return
  }
  const enterpriseId = props.enterpriseId
  if (!enterpriseId) {
    ElMessage.warning('当前项目未绑定所属企业，不能上传本地图片。请先完善项目所属企业，或从图片库选择已有图片。')
    return
  }
  uploading.value = true
  try {
    const imageName = stripImageExt(name) || props.chapterTitle || '章节配图'
    const uploaded = await uploadMaterialImage({
      file: raw,
      enterpriseId,
      imageName,
      category: recommendation.value.category || '',
      chapterType: recommendation.value.chapterType || '',
      scene: props.chapterTitle || '',
      description: props.chapterTitle ? `${props.chapterTitle}配图` : imageName
    })
    selected.value = uploaded
    insertForm.caption = uploaded?.description || uploaded?.imageName || imageName || '章节配图'
    ElMessage.success('图片已上传并选中')
    pager.pageNum = 1
    await loadImages()
    selected.value = uploaded
  } catch (e) {
    // 业务异常由全局拦截器提示，这里只保持弹窗可继续操作。
  } finally {
    uploading.value = false
  }
}

function stripImageExt(name = '') {
  return String(name || '').replace(/\.[^.]+$/, '').trim()
}

function confirmInsert() {
  if (!selected.value) return
  emit('insert', {
    image: selected.value,
    caption: insertForm.caption,
    width: insertForm.width,
    align: insertForm.align
  })
  visible.value = false
}

const ImageThumb = defineComponent({
  name: 'ImageThumb',
  props: { fileId: String, large: Boolean },
  setup(componentProps) {
    const url = ref('')
    let objectUrl = ''
    async function load() {
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl)
        objectUrl = ''
      }
      url.value = ''
      if (!componentProps.fileId) return
      try {
        const blob = await downloadFileBlob(componentProps.fileId)
        objectUrl = URL.createObjectURL(blob)
        url.value = objectUrl
      } catch (e) {
        url.value = ''
      }
    }
    watch(() => componentProps.fileId, load, { immediate: true })
    onBeforeUnmount(() => {
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    })
    return () => url.value
      ? h(ElImage, { src: url.value, fit: 'cover', class: ['image-picker-thumb', { 'is-large': componentProps.large }], previewTeleported: true, previewSrcList: [url.value], zIndex: 3000 })
      : h('div', { class: ['image-picker-thumb', 'empty', { 'is-large': componentProps.large }] }, '无预览')
  }
})
</script>


<style scoped>
.image-picker-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
  padding: 12px 14px;
  border: 1px solid #d9e8ff;
  border-radius: 12px;
  background: #f4f8ff;
}
.image-picker-top strong {
  display: block;
  color: #0f172a;
}
.image-picker-top p {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
  margin: 4px 0 0;
  color: #64748b;
  font-size: 13px;
}
.image-picker-toolbar {
  display: grid;
  grid-template-columns: 1fr 160px 170px auto auto;
  gap: 10px;
  margin-bottom: 12px;
}
.image-picker-alert {
  margin-bottom: 12px;
}
.image-picker-tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
}
.image-picker-tabs button {
  height: 32px;
  padding: 0 14px;
  color: #475569;
  border: 1px solid #e5e7eb;
  border-radius: 999px;
  background: #fff;
  cursor: pointer;
}
.image-picker-tabs button.active {
  color: #1677ff;
  border-color: #91caff;
  background: #f0f7ff;
}
.image-picker-body {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 300px;
  gap: 14px;
}
.image-picker-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  align-content: flex-start;
  min-height: 430px;
}
.image-picker-card {
  position: relative;
  overflow: hidden;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  background: #fff;
  cursor: pointer;
  transition: 0.16s ease;
}
.image-picker-card:hover {
  border-color: #b8d7ff;
  box-shadow: 0 10px 22px rgba(15, 23, 42, 0.08);
}
.image-picker-card.recommended {
  border-color: #91caff;
}
.image-picker-card.active {
  border-color: #1677ff;
  box-shadow: 0 0 0 2px rgba(22, 119, 255, 0.14);
}
.recommended-badge {
  position: absolute;
  top: 8px;
  left: 8px;
  z-index: 2;
  padding: 2px 8px;
  color: #fff;
  font-size: 12px;
  border-radius: 999px;
  background: #1677ff;
}
.image-picker-thumb {
  display: block;
  width: 100%;
  height: 150px;
  background: #f8fafc;
}
.image-picker-thumb.is-large {
  height: 180px;
  border-radius: 10px;
}
.image-picker-thumb.empty {
  display: flex;
  align-items: center;
  justify-content: center;
  color: #94a3b8;
}
.image-picker-card-body {
  padding: 10px 12px 12px;
}
.image-picker-card-body strong {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: #0f172a;
}
.image-picker-card-body p {
  height: 38px;
  margin: 6px 0 8px;
  overflow: hidden;
  color: #64748b;
  font-size: 13px;
  line-height: 1.45;
}
.image-picker-tags {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}
.image-insert-panel {
  min-height: 430px;
  padding: 14px;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  background: #f8fafc;
}
.panel-title {
  margin-bottom: 12px;
  color: #0f172a;
  font-weight: 700;
}
.local-upload-box {
  margin-bottom: 12px;
  padding: 12px;
  border: 1px dashed #bfdbfe;
  border-radius: 10px;
  background: #fff;
}
.local-upload-head {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 8px;
}
.local-upload-head strong {
  color: #0f172a;
}
.local-upload-head span,
.local-upload-box p {
  color: #64748b;
  font-size: 12px;
}
.local-upload-box p {
  margin: 8px 0 0;
  line-height: 1.5;
}
.selected-image-info {
  margin-top: 10px;
  padding: 10px;
  color: #475569;
  font-size: 13px;
  border-radius: 8px;
  background: #fff;
}
.selected-image-info span {
  display: block;
  margin-bottom: 4px;
  color: #94a3b8;
}
.selected-image-info strong {
  display: block;
  color: #0f172a;
}
.selected-image-info p {
  margin: 6px 0 0;
  line-height: 1.5;
}
.insert-form {
  margin-top: 12px;
}
.image-picker-pager {
  margin-right: auto;
}
@media (max-width: 960px) {
  .image-picker-body {
    grid-template-columns: 1fr;
  }
  .image-picker-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .image-picker-toolbar {
    grid-template-columns: 1fr;
  }
  .image-picker-top {
    align-items: flex-start;
    flex-direction: column;
  }
}
</style>
