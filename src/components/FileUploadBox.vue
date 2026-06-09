<template>
  <el-upload
    drag
    :show-file-list="true"
    :auto-upload="false"
    :accept="accept"
    :limit="maxCount"
    :disabled="uploading"
    :on-change="onChange"
    :on-remove="onRemove"
    :on-exceed="onExceed"
  >
    <el-icon class="el-icon--upload"><UploadFilled /></el-icon>
    <div class="el-upload__text">
      {{ uploading ? '文件正在上传，请稍等...' : '拖拽文件到这里，或' }}
      <em v-if="!uploading">点击选择文件</em>
    </div>
    <template #tip>
      <div class="el-upload__tip">
        {{ tipText }}
      </div>
    </template>
  </el-upload>
</template>

<script setup>
import { computed, ref } from 'vue'
import { ElMessage } from '@/plugins/element-plus-api'
import { UploadFilled } from '@element-plus/icons-vue'
import { uploadFile } from '@/api/file'

const props = defineProps({
  moduleType: { type: String, default: 'other' },
  bizId: { type: [String, Number], default: '' },
  privateFlag: { type: Boolean, default: true },
  accept: { type: String, default: '.doc,.docx,.pdf,.xls,.xlsx,.ppt,.pptx,.txt,.jpg,.jpeg,.png,.webp,.zip,.rar,.7z' },
  maxSizeMb: { type: Number, default: 50 },
  maxCount: { type: Number, default: 5 },
  tip: { type: String, default: '' }
})

const emit = defineEmits(['success', 'remove'])

const uploading = ref(false)
const uploadingNames = ref(new Set())

const tipText = computed(() => {
  if (props.tip) return props.tip

  const acceptText = props.accept
    ? `支持格式：${props.accept.replaceAll('.', '').replaceAll(',', '、')}`
    : '支持常见办公文档、图片或压缩文件'

  return `单个文件不超过 ${props.maxSizeMb}MB，${acceptText}，每次最多 ${props.maxCount} 个。`
})

async function onChange(uploadFileItem, uploadFiles) {
  const raw = uploadFileItem.raw
  if (!raw) return

  if (uploadFiles.length > props.maxCount) {
    ElMessage.warning(`每次最多上传 ${props.maxCount} 个文件`)
    return
  }

  if (!validateFile(raw)) return

  const uploadKey = `${raw.name}_${raw.size}_${raw.lastModified}`
  if (uploadingNames.value.has(uploadKey)) return

  uploadingNames.value.add(uploadKey)
  uploading.value = true

  try {
    const res = await uploadFile({
      file: raw,
      moduleType: props.moduleType,
      bizId: props.bizId,
      privateFlag: props.privateFlag
    })
    ElMessage.success(`文件「${raw.name}」上传成功`)
    emit('success', res)
  } finally {
    uploadingNames.value.delete(uploadKey)
    uploading.value = uploadingNames.value.size > 0
  }
}

function validateFile(file) {
  const maxSize = props.maxSizeMb * 1024 * 1024
  if (file.size > maxSize) {
    ElMessage.warning(`文件「${file.name}」超过 ${props.maxSizeMb}MB 限制`)
    return false
  }

  if (props.accept) {
    const allowExts = props.accept
      .split(',')
      .map((item) => item.trim().replace('.', '').toLowerCase())
      .filter(Boolean)

    const suffix = String(file.name || '').split('.').pop()?.toLowerCase() || ''
    if (allowExts.length && !allowExts.includes(suffix)) {
      ElMessage.warning(`文件「${file.name}」格式不支持`)
      return false
    }
  }

  return true
}

function onExceed() {
  ElMessage.warning(`每次最多上传 ${props.maxCount} 个文件`)
}

function onRemove(file) {
  emit('remove', file)
}
</script>

