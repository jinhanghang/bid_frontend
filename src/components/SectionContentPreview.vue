<template>
  <div class="section-content-renderer">
    <template v-for="(block, index) in blocks" :key="`${block.type}-${index}-${block.fileId || block.text}`">
      <component
        :is="block.tag || 'p'"
        v-if="block.type === 'text'"
        :class="['section-render-text', block.className]"
      >
        <template v-for="(segment, segIndex) in block.segments || [{ text: block.text }]" :key="`${index}-${segIndex}`">
          <strong v-if="segment.bold">{{ segment.text }}</strong>
          <span v-else>{{ segment.text }}</span>
        </template>
      </component>

      <div v-else-if="block.type === 'blank'" class="section-render-blank" />

      <figure v-else class="section-render-image-card" :class="`align-${block.align || 'center'}`">
        <div v-if="editable" class="section-render-image-toolbar">
          <span class="toolbar-label">图片设置</span>
          <el-button size="small" text :type="Number(block.width || 0) === 420 ? 'primary' : ''" @click="emit('update-width', { block, width: 420 })">小</el-button>
          <el-button size="small" text :type="Number(block.width || 0) === 680 || !block.width ? 'primary' : ''" @click="emit('update-width', { block, width: 680 })">中</el-button>
          <el-button size="small" text :type="Number(block.width || 0) === 900 ? 'primary' : ''" @click="emit('update-width', { block, width: 900 })">大</el-button>
          <span class="toolbar-divider" />
          <el-button size="small" text :type="block.align === 'left' ? 'primary' : ''" @click="emit('update-align', { block, align: 'left' })">左对齐</el-button>
          <el-button size="small" text :type="!block.align || block.align === 'center' ? 'primary' : ''" @click="emit('update-align', { block, align: 'center' })">居中</el-button>
          <el-button size="small" text :type="block.align === 'right' ? 'primary' : ''" @click="emit('update-align', { block, align: 'right' })">右对齐</el-button>
          <span class="toolbar-divider" />
          <el-button size="small" text @click="emit('edit-caption', { block })">改说明</el-button>
          <el-button size="small" text type="danger" @click="emit('delete-reference', { block })">删除引用</el-button>
        </div>

        <div class="section-render-image-box">
          <img
            v-if="imageUrls[block.fileId]"
            class="section-render-image-el"
            :src="imageUrls[block.fileId]"
            :alt="block.alt || '章节图片'"
            :style="getImageStyle(block)"
            @error="handleImageError(block.fileId)"
          />
          <div v-else-if="imageErrors[block.fileId]" class="section-render-image-placeholder">图片加载失败</div>
          <div v-else class="section-render-image-placeholder">图片加载中...</div>
        </div>
        <figcaption v-if="block.alt">{{ block.alt }}</figcaption>
      </figure>
    </template>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { downloadFileBlob } from '@/api/file'

const props = defineProps({
  content: {
    type: String,
    default: ''
  },
  editable: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update-width', 'update-align', 'edit-caption', 'delete-reference'])

const imageUrls = ref({})
const imageErrors = ref({})
const objectUrls = new Set()

const blocks = computed(() => parseContent(props.content))

watch(blocks, async (list) => {
  const ids = [...new Set(list.filter((item) => item.type === 'image' && item.fileId).map((item) => item.fileId))]
  await Promise.all(ids.map(loadImageUrl))
}, { immediate: true })

onBeforeUnmount(() => {
  for (const url of objectUrls) URL.revokeObjectURL(url)
  objectUrls.clear()
})

async function loadImageUrl(fileId) {
  if (!fileId || imageUrls.value[fileId]) return
  try {
    const blob = await downloadFileBlob(fileId)
    const url = URL.createObjectURL(blob)
    objectUrls.add(url)
    imageUrls.value = { ...imageUrls.value, [fileId]: url }
  } catch (e) {
    imageErrors.value = { ...imageErrors.value, [fileId]: true }
  }
}

function handleImageError(fileId) {
  if (!fileId) return
  imageErrors.value = { ...imageErrors.value, [fileId]: true }
  imageUrls.value = { ...imageUrls.value, [fileId]: '' }
}

function getImageStyle(block) {
  const width = Number(block?.width || 0)
  const safeWidth = Number.isFinite(width) && width > 0 ? Math.min(Math.max(width, 120), 1200) : 680
  return { '--section-image-width': `${safeWidth}px` }
}

function parseContent(content) {
  const lines = String(content || '').replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n')
  const result = []
  const imagePattern = /^!\[([^\]]*)\]\(aibid-file:\/\/([^)?\s]+)(?:\?([^)]*))?\)$/
  lines.forEach((raw, lineIndex) => {
    const line = String(raw || '')
    const trimmed = line.trim()
    if (!trimmed) {
      result.push({ type: 'blank', lineIndex, rawLine: line })
      return
    }
    const match = trimmed.match(imagePattern)
    if (match) {
      const query = parseQuery(match[3])
      result.push({
        type: 'image',
        alt: decodeValue(match[1]),
        fileId: match[2],
        width: query.width,
        align: query.align || 'center',
        imageId: query.imageId || '',
        rawLine: line,
        lineIndex
      })
      return
    }
    const heading = trimmed.match(/^(#{1,6})\s+(.+)$/)
    if (heading) {
      const level = Math.min(Math.max(heading[1].length + 1, 3), 5)
      result.push({
        type: 'text',
        tag: `h${level}`,
        className: `heading heading-${level}`,
        text: stripInlineMarkdown(heading[2]),
        segments: parseInlineSegments(heading[2]),
        lineIndex,
        rawLine: line
      })
      return
    }
    const list = trimmed.match(/^([-*+]|\d+[.)])\s+(.+)$/)
    if (list) {
      result.push({
        type: 'text',
        tag: 'p',
        className: 'list-item',
        text: `• ${stripInlineMarkdown(list[2])}`,
        segments: [{ text: '• ' }, ...parseInlineSegments(list[2])],
        lineIndex,
        rawLine: line
      })
      return
    }
    result.push({
      type: 'text',
      tag: 'p',
      className: 'paragraph',
      text: stripInlineMarkdown(line),
      segments: parseInlineSegments(line),
      lineIndex,
      rawLine: line
    })
  })
  return result
}

function parseInlineSegments(text = '') {
  const raw = String(text || '')
  const segments = []
  const pattern = /\*\*([^*]+)\*\*/g
  let lastIndex = 0
  let match
  while ((match = pattern.exec(raw)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ text: stripInlineMarkdown(raw.slice(lastIndex, match.index)), bold: false })
    }
    segments.push({ text: stripInlineMarkdown(match[1]), bold: true })
    lastIndex = match.index + match[0].length
  }
  if (lastIndex < raw.length) {
    segments.push({ text: stripInlineMarkdown(raw.slice(lastIndex)), bold: false })
  }
  return segments.length ? segments.filter((item) => item.text !== '') : [{ text: '' }]
}

function stripInlineMarkdown(text = '') {
  return String(text || '')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
}

function parseQuery(query = '') {
  const data = {}
  String(query || '').split('&').forEach((item) => {
    const [key, value] = item.split('=')
    if (key) data[decodeValue(key)] = decodeValue(value || '')
  })
  return data
}

function decodeValue(value = '') {
  try {
    return decodeURIComponent(String(value || ''))
  } catch (e) {
    return String(value || '')
  }
}
</script>

<style scoped>
.section-content-renderer {
  white-space: normal;
  word-break: normal;
  overflow-wrap: break-word;
}
.section-render-text {
  margin: 0 0 12px;
  white-space: pre-wrap;
}
.section-render-text.heading {
  margin: 18px 0 10px;
  color: #07162d;
  font-weight: 800;
  line-height: 1.45;
  white-space: normal;
  word-break: normal;
  overflow-wrap: break-word;
}
.section-render-text.heading-3 {
  font-size: 20px;
}
.section-render-text.heading-4 {
  font-size: 18px;
}
.section-render-text.heading-5 {
  font-size: 16px;
}
.section-render-text.paragraph {
  text-indent: 2em;
}
.section-render-text.list-item {
  padding-left: 1.2em;
  text-indent: -1.2em;
}
.section-render-text strong {
  font-weight: 800;
  color: #06152b;
}
.section-render-blank {
  height: 10px;
}
.section-render-image-card {
  position: relative;
  margin: 18px 0 20px;
  padding: 12px;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  background: #fff;
  box-shadow: 0 8px 24px rgba(15, 23, 42, 0.04);
}
.section-render-image-card.align-center {
  text-align: center;
}
.section-render-image-card.align-left {
  text-align: left;
}
.section-render-image-card.align-right {
  text-align: right;
}
.section-render-image-toolbar {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 4px;
  margin-bottom: 10px;
  padding: 6px 8px;
  text-align: left;
  border: 1px solid #eef2f7;
  border-radius: 10px;
  background: #f8fafc;
}
.toolbar-label {
  margin-right: 6px;
  color: #64748b;
  font-size: 12px;
}
.toolbar-divider {
  width: 1px;
  height: 16px;
  margin: 0 4px;
  background: #dbe3ef;
}
.section-render-image-box {
  text-align: inherit;
}
.section-render-image-el {
  display: inline-block;
  width: min(100%, var(--section-image-width, 680px));
  max-height: 560px;
  height: auto;
  object-fit: contain;
  border-radius: 8px;
  border: 1px solid #e5e7eb;
  background: #f8fafc;
}
.section-render-image-placeholder {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: min(100%, 480px);
  height: 160px;
  color: #64748b;
  border: 1px dashed #cbd5e1;
  border-radius: 8px;
  background: #f8fafc;
}
.section-render-image-card figcaption {
  margin-top: 8px;
  font-size: 13px;
  line-height: 1.5;
  color: #64748b;
  text-align: center;
}
</style>
