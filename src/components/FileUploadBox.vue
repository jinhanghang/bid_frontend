<template>
  <el-upload
    drag
    :show-file-list="true"
    :auto-upload="false"
    :on-change="onChange"
    :on-remove="onRemove"
  >
    <el-icon class="el-icon--upload"><UploadFilled /></el-icon>
    <div class="el-upload__text">拖拽文件到这里，或 <em>点击选择文件</em></div>
    <template #tip>
      <div class="el-upload__tip">
        选择文件后会立即调用后端 /files/upload 上传，并返回文件ID和URL。
      </div>
    </template>
  </el-upload>
</template>

<script setup>
import { ElMessage } from 'element-plus'
import { uploadFile } from '@/api/file'

const props = defineProps({
  moduleType: { type: String, default: 'other' },
  bizId: { type: [String, Number], default: '' },
  privateFlag: { type: Boolean, default: true }
})

const emit = defineEmits(['success', 'remove'])

async function onChange(uploadFileItem) {
  const raw = uploadFileItem.raw
  if (!raw) return
  const res = await uploadFile({
    file: raw,
    moduleType: props.moduleType,
    bizId: props.bizId,
    privateFlag: props.privateFlag
  })
  ElMessage.success('上传成功')
  emit('success', res)
}

function onRemove(file) {
  emit('remove', file)
}
</script>
