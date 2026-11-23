<template>
  <div class="section-content-renderer">
    <template v-for="(block, index) in blocks" :key="`${block.type}-${index}-${block.fileId || block.text}`">
      <component
        :is="block.tag || 'p'"
        v-if="block.type === 'text'"
        :class="['section-render-text', block.className]"
      >
        <InlineContent :segments="block.segments" />
      </component>

      <div v-else-if="block.type === 'blank'" class="section-render-blank" />

      <div v-else-if="block.type === 'table'" class="section-render-table-wrap">
        <table class="section-render-table">
          <thead><tr><th v-for="(cell,column) in block.headers" :key="column" scope="col" :style="{textAlign:block.alignments[column]}"><InlineContent :segments="cell"/></th></tr></thead>
          <tbody><tr v-for="(row,rowIndex) in block.rows" :key="rowIndex"><td v-for="(cell,column) in row" :key="column" :style="{textAlign:block.alignments[column]}"><InlineContent :segments="cell"/></td></tr></tbody>
        </table>
      </div>
      <ContentList v-else-if="block.type === 'list'" :block="block" />
      <pre v-else-if="block.type === 'code'" class="section-render-code"><code>{{ block.text }}</code></pre>
      <blockquote v-else-if="block.type === 'quote'" class="section-render-quote"><InlineContent :segments="block.segments"/></blockquote>
      <hr v-else-if="block.type === 'rule'" class="section-render-rule"/>

      <figure v-else-if="block.type === 'image'" class="section-render-image-card" :class="`align-${block.align || 'center'}`" :data-image-source="block.rawLine" :contenteditable="visualEditing ? 'false' : undefined">
        <div v-if="editable && block.fileId" class="section-render-image-toolbar">
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
            v-if="(block.url && !imageErrors[block.url]) || imageUrls[block.fileId]"
            class="section-render-image-el"
            :src="block.url || imageUrls[block.fileId]"
            :alt="block.alt || '章节图片'"
            :style="getImageStyle(block)"
            @error="handleImageError(block.fileId || block.url)"
          />
          <div v-else-if="imageErrors[block.fileId || block.url]" class="section-render-image-placeholder">图片加载失败</div>
          <div v-else class="section-render-image-placeholder">图片加载中...</div>
        </div>
        <figcaption v-if="block.alt">{{ block.alt }}</figcaption>
      </figure>
    </template>
  </div>
</template>

<script setup>
import { computed, defineComponent, h, onBeforeUnmount, ref, watch } from 'vue'
import { parseSectionContent } from '@/utils/sectionContentBlocks'
import { downloadFileBlob } from '@/api/file'

const props = defineProps({
  visualEditing: { type: Boolean, default: false },
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

const blocks = computed(() => parseSectionContent(props.content))

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

const InlineContent = defineComponent({
  props: { segments: Array },
  setup(p) {
    const render = segments => (segments || []).map(segment => {
      if (segment.type === 'break') return h('br')
      if (segment.type === 'link') return h('a', {href:segment.href,target:'_blank',rel:'noopener noreferrer'},render(segment.children))
      const tag = {bold:'strong',italic:'em',strike:'del',code:'code'}[segment.type]
      return tag ? h(tag, segment.children ? render(segment.children) : segment.text) : segment.text
    })
    return () => h('span', render(p.segments))
  }
})
const ContentList = defineComponent({
  props: { block: Object },
  setup(p) {
    const render = block => h(block.ordered ? 'ol' : 'ul', {class:'section-render-list',start:block.start}, block.items.map(item =>
      h('li', [h(InlineContent,{segments:item.segments}),...item.children.map(render)])))
    return () => render(p.block)
  }
})
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
.section-render-text.heading:is(h1,h2,h3) {
  font-size: 20px;
}
.section-render-text.heading:is(h4) {
  font-size: 18px;
}
.section-render-text.heading:is(h5,h6) {
  font-size: 16px;
}
.section-render-text.paragraph {
  text-indent: 2em;
}
.section-render-text.list-item {
  padding-left: 1.2em;
  text-indent: -1.2em;
}
.section-content-renderer :deep(strong) {
  font-weight: 800;
  color: #06152b;
}
.section-render-blank {
  height: 10px;
}
.section-render-table-wrap { width:100%;overflow-x:auto;margin:16px 0 20px; }
.section-render-table { width:100%;border-collapse:collapse;table-layout:fixed;font:inherit;line-height:1.65; }
.section-render-table th,.section-render-table td {border:1px solid #9aa4b3;padding:9px 11px;vertical-align:top;white-space:pre-wrap;overflow-wrap:anywhere;text-indent:0;}
.section-render-table th {background:#f6f7fa;font-weight:600;}
.section-content-renderer :deep(.section-render-list) {margin:10px 0;padding-left:1.8em;list-style:revert;}
.section-content-renderer :deep(.section-render-list li) {margin:5px 0;white-space:pre-wrap;}
.section-content-renderer :deep(.section-render-list .section-render-list) {margin:4px 0;}
.section-render-code {white-space:pre;overflow:auto;background:#f6f7fa;padding:14px;border-radius:4px;text-indent:0;font-family:monospace;font-size:.85em;}
.section-render-quote {border-left:3px solid #c9c2ed;padding:4px 14px;margin:14px 0;color:#586174;white-space:pre-wrap;}
.section-render-rule {border:0;border-top:1px solid #cfd3dc;margin:18px 0;}
.section-content-renderer :deep(code) {font-family:monospace;}
.section-content-renderer :deep(a) {color:#6550d9;text-decoration:underline;}
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
