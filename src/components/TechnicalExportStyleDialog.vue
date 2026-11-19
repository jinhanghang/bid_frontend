<template>
  <el-dialog :model-value="modelValue" title="标书样式配置" class="technical-export-dialog" width="min(1500px, calc(100vw - 48px))" top="3vh" append-to-body destroy-on-close :close-on-click-modal="false" :close-on-press-escape="!saving && !busy" :show-close="!saving && !busy" @update:model-value="close">
    <div v-if="loading" class="export-placeholder">正在读取当前项目的导出格式…</div>
    <div v-else-if="loadError" class="export-placeholder">{{ loadError }} <el-button @click="load">重新读取</el-button></div>
    <div v-else-if="form" class="export-layout">
      <div class="export-settings">
        <div class="settings-source"><span>{{ hasSaved ? '已载入本项目保存的格式' : hasParsedFormat ? '已载入解析格式，未规定项使用默认配置' : '未解析到格式要求，已载入默认配置' }}</span><el-button link type="primary" :disabled="saving || busy" @click="restoreParsed">{{ hasParsedFormat ? '恢复解析格式' : '恢复默认配置' }}</el-button></div>
        <p v-if="changedFromParsed" class="style-difference">当前配置已调整，可恢复初始配置；招标文件有要求时请核对“解析原文”。</p>
        <fieldset :disabled="saving || busy">
          <el-collapse v-model="opened">
            <el-collapse-item name="page">
              <template #title><span>页面格式</span><el-button class="preset-link" link type="primary" @click.stop="applyCommon">常用规格</el-button></template>
              <div class="setting-row"><label>纸张</label><el-select v-model="form.paper"><el-option v-for="paper in ['A4','A3','LETTER']" :key="paper" :value="paper" /></el-select><el-select v-model="form.orientation"><el-option value="portrait" label="纵向"/><el-option value="landscape" label="横向"/></el-select></div>
              <div class="margin-grid"><label v-for="(label,key) in marginLabels" :key="key">{{ label }}<el-input-number v-model="form.margins[key]" :min="0" :max="10" :step="0.1" :precision="2" controls-position="right"/><span>cm</span></label></div>
            </el-collapse-item>
            <el-collapse-item name="body" title="正文样式设置">
              <FontFields v-model="form.body" />
              <div class="setting-row"><label>对齐方式</label><AlignmentSelect v-model="form.paragraph.alignment"/><label>首行缩进</label><el-input-number v-model="form.paragraph.firstLineChars" :min="0" :max="10" :step="0.5" controls-position="right"/><span>字符</span></div>
              <div class="setting-row"><label>行间距</label><el-select v-model="form.paragraph.lineType" @change="form.paragraph.lineValue = null"><el-option value="fixed" label="固定值（磅）"/><el-option value="multiple" label="多倍行距"/></el-select><el-input-number v-model="form.paragraph.lineValue" :min="form.paragraph.lineType==='fixed'?1:0.5" :max="form.paragraph.lineType==='fixed'?100:5" :step="form.paragraph.lineType==='fixed'?1:0.1" controls-position="right"/></div>
              <div class="setting-row"><label>段前</label><el-input-number v-model="form.paragraph.beforePt" :min="0" :max="150" controls-position="right"/><span>磅</span><label>段后</label><el-input-number v-model="form.paragraph.afterPt" :min="0" :max="150" controls-position="right"/><span>磅</span></div>
              <div class="setting-row"><el-checkbox v-model="form.paragraph.removeSpaces">清除正文空格</el-checkbox><el-checkbox v-model="form.paragraph.allowEmptyParagraphs">保留空段落</el-checkbox></div>
            </el-collapse-item>
            <el-collapse-item name="headings" title="标题样式设置">
              <div class="setting-row"><label>标题自动编号</label><el-switch v-model="form.numbering"/></div>
              <el-collapse v-model="headingOpened">
                <el-collapse-item v-for="(heading,index) in form.headings" :key="index" :name="index" :title="`${index+1}级标题`">
                  <FontFields v-model="form.headings[index]" />
                  <div class="setting-row"><label>对齐</label><AlignmentSelect v-model="heading.alignment"/><label>缩进</label><el-input-number v-model="heading.firstLineChars" :min="0" :max="10" controls-position="right"/><span>字符</span></div>
                  <div class="setting-row"><label>行间距</label><el-select v-model="heading.lineType" @change="heading.lineValue = null"><el-option value="fixed" label="固定值（磅）"/><el-option value="multiple" label="多倍行距"/></el-select><el-input-number v-model="heading.lineValue" :min="heading.lineType==='fixed'?1:0.5" :max="heading.lineType==='fixed'?100:5" :step="heading.lineType==='fixed'?1:0.1" controls-position="right"/></div>
                  <div class="setting-row"><label>段前</label><el-input-number v-model="heading.beforePt" :min="0" :max="150" controls-position="right"/><span>磅</span><label>段后</label><el-input-number v-model="heading.afterPt" :min="0" :max="150" controls-position="right"/><span>磅</span></div>
                  <div v-if="form.numbering" class="setting-row"><label>编号</label><el-select v-model="heading.kind" @change="setHeadingKind(heading,index)"><el-option v-for="kind in numberingKinds" :key="kind.value" :label="kind.label" :value="kind.value"/></el-select><label>起始编号</label><el-input-number v-model="heading.start" :min="1" :max="9999" controls-position="right"/></div>
                  <div class="setting-row"><label>Word标题级别</label><el-select v-model="heading.wordHeadingLevel"><el-option v-for="level in 9" :key="level" :label="`标题 ${level}（H${level}）`" :value="level"/></el-select></div>
                </el-collapse-item>
              </el-collapse>
            </el-collapse-item>
            <el-collapse-item name="table" title="正文表格设置"><FontFields v-model="form.table"/><div class="setting-row"><label>表格文字对齐</label><AlignmentSelect v-model="form.tableAlignment"/></div></el-collapse-item>
            <el-collapse-item name="footer" title="页眉页脚">
              <div class="setting-row"><label>添加页眉</label><el-switch v-model="form.headers"/><el-input v-if="form.headers" v-model="form.headerText" placeholder="页眉文字"/></div>
              <div class="setting-row"><label>添加页脚</label><el-switch v-model="form.footers"/><el-input v-if="form.footers" v-model="form.footerText" placeholder="页脚文字"/></div>
              <div class="setting-row"><label>添加页码</label><el-switch v-model="form.pageNumbers"/></div>
            </el-collapse-item>
            <el-collapse-item name="other" title="编排与颜色">
              <div class="setting-row"><el-checkbox v-model="form.cover">添加封面</el-checkbox><el-checkbox v-model="form.tableOfContents">添加目录</el-checkbox><el-checkbox v-model="form.chapterPageBreak">每章另起一页</el-checkbox></div>
              <div class="setting-row"><label>允许空白页</label><el-switch v-model="form.blankPages"/></div>
              <div class="setting-row"><label>文字与图表颜色</label><el-select v-model="form.colorMode"><el-option value="monochrome" label="纯黑白"/><el-option value="grayscale" label="黑字、灰度图"/><el-option value="color" label="保留颜色"/></el-select></div>
              <div class="setting-row"><label>页数上限</label><el-input-number v-model="form.maxPages" :min="0" :max="10000" controls-position="right"/><span>页（0为不限）</span></div>
            </el-collapse-item>
            <el-collapse-item name="source" title="解析原文"><div v-if="sourceQuotes.length" class="source-quotes"><p v-for="(quote,index) in sourceQuotes" :key="index">{{ quote }}</p></div><p v-else>当前解析结果未提供格式原文。</p></el-collapse-item>
          </el-collapse>
        </fieldset>
      </div>
      <div class="export-preview-panel">
        <div class="preview-label"><span>样式预览</span><span v-if="previewLoading">正在更新…</span></div>
        <div ref="viewport" class="export-preview-viewport"><div ref="previewHost" class="export-docx-preview" :style="{zoom: previewScale}"/><div v-if="previewError" class="preview-message">{{ previewError }}</div></div>
        <div class="preview-note">预览当前内容节选；完整页数以导出结果为准。</div>
      </div>
    </div>
    <template #footer><div class="export-dialog-footer"><span class="format-note">修改后将保存至当前项目，并按此配置导出。</span><el-select v-model="exportFormat" :disabled="saving || busy" style="width:110px"><el-option value="word" label="Word"/><el-option value="pdf" label="PDF"/></el-select><el-button :disabled="saving || busy" @click="close(false)">取消</el-button><el-button type="primary" :loading="saving || busy" :disabled="loading || !!loadError || !form" @click="submit">导出</el-button></div></template>
  </el-dialog>
</template>

<script setup>
import { computed, defineComponent, h, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { ElSelect, ElOption, ElCheckbox, ElMessage } from '@/plugins/element-plus-api'
import { ElInputNumber } from 'element-plus/es/components/input-number/index'
import { getBidProjectTechnicalExportStyle, saveBidProjectTechnicalExportStyle, previewBidProjectTechnicalExportStyle } from '@/api/bidProject'
import { exportFonts, exportSizes, alignments, numberingKinds, readExportStyle, writeExportStyle, validateExportStyle, commonExportStyle, initialExportStyle, setHeadingKind } from '@/utils/technicalExportStyle'
const props = defineProps({ modelValue:Boolean, projectId:String, busy:Boolean, onExport:Function })
const emit = defineEmits(['update:modelValue'])
const form = ref(null), parsed = ref({}), base = ref({}), revision = ref(0), parseTaskId = ref(''), hasSaved = ref(false)
const loading = ref(false), loadError = ref(''), saving = ref(false), exportFormat = ref('word')
const opened = ref(['page','body']), headingOpened = ref([0]), previewLoading = ref(false), previewError = ref('')
const previewHost = ref(null), viewport = ref(null), previewScale = ref(.6)
const marginLabels = {topCm:'上边距',bottomCm:'下边距',leftCm:'左边距',rightCm:'右边距'}
let timer, controller, sequence = 0, loadSequence = 0
const changedFromParsed = computed(() => form.value && JSON.stringify(form.value) !== JSON.stringify(initialExportStyle(parsed.value)))
const hasParsedFormat = computed(() => Object.entries(parsed.value || {}).some(([key, rule]) => key !== 'conflicts' && rule?.value != null))
const sourceQuotes = computed(() => [...new Set(Object.values(parsed.value || {}).map(rule => rule?.quote).filter(Boolean))])
const AlignmentSelect = defineComponent({ props:['modelValue'], emits:['update:modelValue'], setup(p,{emit:e}) {return () => h(ElSelect,{modelValue:p.modelValue,'onUpdate:modelValue':v=>e('update:modelValue',v)},()=>alignments.map(a=>h(ElOption,{...a,key:a.value}))) } })
const FontFields = defineComponent({props:['modelValue'],emits:['update:modelValue'],setup(p,{emit:e}) {
 const update = (key,value) => e('update:modelValue',{...p.modelValue,[key]:value})
 return () => h('div',{class:'font-fields'},[
 h(ElSelect,{modelValue:p.modelValue.name,filterable:true,allowCreate:true,placeholder:'字体','onUpdate:modelValue':v=>update('name',v)},()=>exportFonts.map(name=>h(ElOption,{value:name,key:name}))),
 h(ElSelect,{modelValue:p.modelValue.sizePt,placeholder:'字号','onUpdate:modelValue':v=>update('sizePt',v)},()=>exportSizes.map(([label,value])=>h(ElOption,{label:`${label}（${value}磅）`,value,key:value}))),
 ...[['bold','加粗'],['italic','倾斜'],['underline','下划线']].map(([key,label])=>h(ElCheckbox,{modelValue:p.modelValue[key],'onUpdate:modelValue':v=>update(key,v)},()=>label)),
 h('input',{type:'color',value:p.modelValue.color,title:'文字颜色',onInput:event=>update('color',event.target.value)})])
} })
function close(value) { if (!saving.value && !props.busy) emit('update:modelValue', value) }
function cancelPreview() { clearTimeout(timer); controller?.abort(); sequence++; previewLoading.value=false }
async function load() {
 const id = ++loadSequence; cancelPreview(); loading.value=true; loadError.value=''; form.value=null
 try {const data=await getBidProjectTechnicalExportStyle(props.projectId); if(id!==loadSequence || !props.modelValue)return
 parsed.value=data.parsed||{};base.value=data.effective||{};revision.value=data.revision||0;parseTaskId.value=data.parseTaskId||'';hasSaved.value=!!data.hasSaved;form.value=initialExportStyle(base.value)
 } catch(error) {if(id===loadSequence)loadError.value=error.message||'导出格式读取失败'} finally {if(id===loadSequence)loading.value=false}
}
function restoreParsed(){ form.value=initialExportStyle(parsed.value); base.value=parsed.value }
function applyCommon(){ form.value=commonExportStyle() }
watch(()=>[props.modelValue,props.projectId],([visible,id])=>{if(visible&&id)load();else{loadSequence++;cancelPreview()}},{immediate:true})
watch(form,()=>{if(!props.modelValue || loading.value)return;cancelPreview();timer=setTimeout(updatePreview,850)},{deep:true,flush:'post'})
async function updatePreview(){
 if(!form.value)return
 const error=validateExportStyle(form.value); if(error){previewError.value=error+'后可预览';previewHost.value?.replaceChildren();return}
 const token=++sequence;controller=new AbortController();previewLoading.value=true;previewError.value=''
 try {const blob=await previewBidProjectTechnicalExportStyle(props.projectId,{tenderFormat:writeExportStyle(form.value,base.value)},controller.signal)
 const {renderAsync}=await import('docx-preview'); if(token!==sequence)return
 const wrapper=document.createElement('div'),styles=document.createElement('div'),body=document.createElement('div');wrapper.append(styles,body)
 await renderAsync(blob,body,styles,{inWrapper:true,breakPages:true,useBase64URL:true})
 if(token!==sequence || !props.modelValue)return;await nextTick();previewHost.value?.replaceChildren(wrapper)
 const pageWidth = body.querySelector('section.docx')?.offsetWidth || 794
 previewScale.value=Math.min(1,Math.max(.2,((viewport.value?.clientWidth||500)-32)/(pageWidth+36)))
 }catch(error){if(token===sequence && !controller?.signal.aborted)previewError.value=error.message||'预览失败，请稍后调整设置重试'}finally{if(token===sequence)previewLoading.value=false}
}
async function submit(){
 const error=validateExportStyle(form.value);if(error){ElMessage.warning(error);return}
 const projectId=props.projectId,format=writeExportStyle(form.value,base.value);saving.value=true
 try {const saved=await saveBidProjectTechnicalExportStyle(projectId,{format,revision:revision.value,parseTaskId:parseTaskId.value});revision.value=saved.revision;hasSaved.value=true
 if(await props.onExport?.(exportFormat.value,{tenderFormat:format}))emit('update:modelValue',false)
 }catch(error){ElMessage.error(error.message||'保存导出格式失败')}finally{saving.value=false}
}
onBeforeUnmount(()=>{loadSequence++;cancelPreview()})
</script>

<style scoped>
.export-layout{display:grid;grid-template-columns:1fr 1fr;gap:36px;height:calc(87vh - 135px);min-height:360px}.export-settings{overflow:auto;padding-right:12px;border-right:1px solid #efedf7}.style-difference{font-size:12px;color:#9b7935;margin:0 10px 12px}.settings-source{display:flex;justify-content:space-between;align-items:center;color:#898496;font-size:12px;padding:0 10px 10px}.export-settings fieldset{margin:0;padding:0;border:0;min-width:0}.export-settings fieldset:disabled{pointer-events:none;opacity:.7}.export-settings :deep(.el-collapse){border:0}.export-settings :deep(.el-collapse-item__header){background:#f6f4ff;border:0;border-radius:7px;padding:0 16px;margin-bottom:10px;color:#24213a;font-weight:500}.export-settings :deep(.el-collapse-item__wrap){border:0}.export-settings :deep(.el-collapse-item__content){padding:5px 16px 20px}.preset-link{margin-left:14px}.setting-row,.font-fields{display:flex;align-items:center;gap:10px;margin:10px 0;flex-wrap:wrap}.setting-row label{min-width:52px}.setting-row :deep(.el-select){width:142px}.setting-row :deep(.el-input-number){width:110px}.setting-row :deep(.el-input){max-width:260px}.font-fields :deep(.el-select){width:145px}.font-fields :deep(.el-checkbox){margin-right:0}.font-fields input[type=color]{width:24px;height:24px;border:1px solid #ddd;border-radius:4px;padding:2px;background:white}.margin-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin:14px 0}.margin-grid label{display:flex;align-items:center;gap:8px}.margin-grid :deep(.el-input-number){width:120px}.source-quotes{color:#6f6a7d;font-size:13px;line-height:1.8}.export-preview-panel{display:flex;flex-direction:column;min-width:0;min-height:0;padding-right:14px}.preview-label{display:flex;justify-content:space-between;padding:0 4px 12px;color:#898496;font-size:13px}.export-preview-viewport{position:relative;flex:1;overflow:auto;background:#f2f3f5;border:1px solid #e4e0ed;border-radius:7px;padding:12px}.export-docx-preview{min-height:100%}.export-docx-preview :deep(.docx-wrapper){padding:18px;background:transparent}.export-docx-preview :deep(section.docx){margin-bottom:18px;box-shadow:0 1px 8px #00000012}.preview-note{padding-top:10px;font-size:12px;color:#96919f}.preview-message,.export-placeholder{padding:40px 20px;text-align:center;color:#898496}.export-dialog-footer{display:flex;align-items:center;gap:12px}.format-note{margin-right:auto;font-size:12px;color:#96919f}@media(max-width:1000px){.export-layout{grid-template-columns:1.1fr 1fr;gap:14px}.margin-grid{grid-template-columns:1fr}.font-fields{gap:8px}.format-note{max-width:220px}}@media(max-width:700px){.export-layout{grid-template-columns:1fr}.export-preview-panel{display:none}}
</style>
