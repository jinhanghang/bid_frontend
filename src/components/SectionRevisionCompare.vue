<template>
  <el-tabs v-model="tab">
    <el-tab-pane label="格式预览" name="preview">
      <div class="comparison-columns"><section><h4>{{ leftTitle }}</h4><SectionContentPreview :content="before" /></section><section><h4>{{ rightTitle }}</h4><SectionContentPreview :content="after" /></section></div>
    </el-tab-pane>
    <el-tab-pane :label="`修改差异（新增 ${added} 行 / 删除 ${removed} 行）`" name="diff">
      <div class="revision-diff"><div v-for="(row,index) in rows" :key="index" :class="row.kind"><span>{{ row.kind === 'added' ? '+' : row.kind === 'removed' ? '−' : ' ' }}</span>{{ row.text }}</div></div>
    </el-tab-pane>
  </el-tabs>
</template>
<script setup>
import {computed,ref} from 'vue'
import SectionContentPreview from './SectionContentPreview.vue'
import {sectionRevisionDiff} from '@/utils/sectionRevisionDiff'
const props=defineProps({before:{type:String,default:''},after:{type:String,default:''},leftTitle:{type:String,default:'历史内容'},rightTitle:{type:String,default:'当前内容'}})
const tab=ref('preview'),rows=computed(()=>sectionRevisionDiff(props.before,props.after))
const added=computed(()=>rows.value.filter(r=>r.kind==='added').length),removed=computed(()=>rows.value.filter(r=>r.kind==='removed').length)
</script>
<style scoped>
.comparison-columns{display:grid;grid-template-columns:1fr 1fr;gap:20px}.comparison-columns section{min-width:0;max-height:55vh;overflow:auto;padding:16px;border:1px solid #e9e5f2;background:white}.comparison-columns h4{margin:0 0 16px}.revision-diff{max-height:55vh;overflow:auto;white-space:pre-wrap;overflow-wrap:anywhere;font-size:13px;line-height:1.8}.revision-diff>div{padding:2px 8px}.revision-diff span{display:inline-block;width:20px}.added{background:#e7f8ee}.removed{background:#ffecec}@media(max-width:700px){.comparison-columns{grid-template-columns:1fr}}
</style>
