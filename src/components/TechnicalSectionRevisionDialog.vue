<template>
  <el-dialog v-model="visible" :title="mode === 'rewrite' ? `重写本节 · ${context.title}` : sectionOnly ? `本节历史 · ${context.title}` : '技术方案历史版本'" width="min(1400px, 96vw)" append-to-body :show-close="!working" :close-on-press-escape="!working" :close-on-click-modal="false" @closed="invalidateRead">
    <el-alert v-if="error" :title="error" type="error" :closable="false" show-icon />
    <template v-if="mode === 'rewrite'">
      <div v-loading="loading" class="rewrite-content">
      <p class="revision-note">新稿生成会消耗额度；只有点击“采用新稿”才替换正文。关闭页面后，可再次点击“重写本节”找回待采用新稿。</p>
      <template v-if="draft">
        <div class="revision-meta">新稿时间：{{ draft.createdAt }} · {{ draft.requirement || '按原编制要求重写' }}</div>
        <el-alert v-if="draft.content === currentContent(context.outlineId)" title="新稿与当前正文完全一致，暂不需要采用；可放弃新稿后补充具体修改要求再生成。" type="warning" :closable="false" />
        <div class="revision-summary">当前 {{ textCount(currentContent(context.outlineId)) }} 字 → 新稿 {{ textCount(draft.content) }} 字 · 新稿尚未采用</div>
        <SectionRevisionCompare :before="currentContent(context.outlineId)" :after="draft.content" left-title="当前正文" right-title="待采用新稿" />
      </template>
      <template v-else>
        <div class="rewrite-config"><span>当前 {{ textCount(currentContent(context.outlineId)) }} 字</span><label>本次目标字数 <el-input-number v-model="targetWords" :min="150" :max="20000" :step="100" :disabled="generating" controls-position="right" /></label></div>
        <div class="rewrite-presets"><el-button v-for="preset in rewritePresets" :key="preset.label" size="small" :disabled="generating" @click="addInstruction(preset.text)">{{ preset.label }}</el-button></div>
        <el-input v-model="instruction" type="textarea" :rows="4" maxlength="2000" show-word-limit placeholder="可选，例如：增加实施步骤和检查表格，减少背景介绍和套话" :disabled="generating" />
        <p class="revision-note">已有章节方向、编写要求、知识库及图表配置会继续作为依据；上面的修改要求仅用于本次重写。</p>
        <div v-if="generating" class="revision-progress" role="status">正在生成新稿，已用时 {{ elapsed }} 秒。生成完成后展示新旧对比，原文保持不变。</div>
        <pre v-if="streamed" class="rewrite-stream">{{ streamed }}</pre>
      </template>
      </div>
    </template>
    <div v-else class="revision-history" v-loading="loading">
      <aside>
        <button v-for="version in versions" :key="version.id" :class="{active:selected?.id===version.id}" @click="selectVersion(version)">
          <strong>V{{ version.versionNo }} {{ version.versionName }}</strong><small>{{ version.createdAt }} · {{ version.totalWords || 0 }} 字</small>
          <small>操作人：{{ version.createdBy || '系统' }}</small><small>{{ version.remark }}</small>
        </button>
        <el-empty v-if="!loading && !versions.length" description="暂无历史记录。编辑保存、采用新稿、重编或恢复前会自动备份。" />
      </aside>
      <main v-if="selected">
        <el-checkbox v-model="restoreConfig">恢复时同时恢复章节字数及写作配置（默认仅正文）</el-checkbox>
        <p class="revision-note">恢复前会备份当前版本。已删除或已重新生成目录的旧小节可查看、复制，不能恢复到其他小节。</p>
        <section v-for="section in sections" :key="section.outlineId" class="history-section">
          <header><strong>{{ section.title }}</strong><el-button size="small" :disabled="working || busy || !findNode(section.outlineId)" @click="restore(section.outlineId)">恢复本节</el-button></header>
          <SectionRevisionCompare :before="section.content || ''" :after="currentContent(section.outlineId)" />
        </section>
      </main>
      <el-empty v-else description="请选择历史版本" />
    </div>
    <template #footer>
      <template v-if="mode==='rewrite'">
        <el-button v-if="draft" :disabled="working || generating" @click="discard">保留原文，放弃新稿</el-button>
        <el-button :disabled="working" @click="visible=false">{{ generating ? '关闭，后台继续生成' : '关闭' }}</el-button>
        <el-button v-if="draft" type="primary" :loading="working" :disabled="busy || generating || draft.content === currentContent(context.outlineId)" @click="adopt">采用新稿</el-button>
        <el-button v-else type="primary" :loading="generating" :disabled="busy || loading || generating" @click="generate">生成新稿</el-button>
      </template>
      <template v-else>
        <el-button :disabled="working" @click="visible=false">关闭</el-button>
        <el-button v-if="!sectionOnly && selected" type="primary" :loading="working" :disabled="busy" @click="restore(null)">恢复整个方案</el-button>
      </template>
    </template>
  </el-dialog>
</template>
<script setup>
import {computed,ref,watch,onBeforeUnmount} from 'vue'
import {ElMessage,ElMessageBox} from 'element-plus'
import SectionRevisionCompare from './SectionRevisionCompare.vue'
import {buildSectionRewritePayload,rewritePresets,sectionRewriteSource} from '@/utils/sectionRewrite'
import {orderHistoricalSections} from '@/utils/historySectionOrder'
import {getTechnicalRewriteDraft,adoptTechnicalRewriteDraft,discardTechnicalRewriteDraft,restoreTechnicalContentVersion,listTechnicalSectionVersions,listBidProjectTechnicalVersions,getBidProjectTechnicalVersion,streamBidProjectTechnicalSection} from '@/api/bidProject'
const props=defineProps({projectId:String,node:Object,outlines:Array,busy:Boolean})
const emit=defineEmits(['updated'])
const visible=ref(false),mode=ref('history'),context=ref({}),draft=ref(null),instruction=ref(''),error=ref(''),generating=ref(false),working=ref(false),loading=ref(false),sectionOnly=ref(true),versions=ref([]),selected=ref(null),restoreConfig=ref(false)
const targetWords=ref(1200),elapsed=ref(0),streamed=ref('')
let timer=null,sequence=0
function textCount(value){return String(value || '').replace(/\s|[#*|`>]/g,'').length}
function addInstruction(value){instruction.value=[instruction.value.trim(),value].filter(Boolean).join('\n').slice(0,2000)}
function stopTimer(){if(timer)clearInterval(timer);timer=null}
onBeforeUnmount(stopTimer)
watch(()=>props.projectId,()=>{visible.value=false;sequence++})
const sections=computed(()=>{try{return orderHistoricalSections(JSON.parse(selected.value?.snapshotJson || '{}'),props.outlines || [])}catch{return []}})
function findNode(id,nodes=props.outlines || []) {for(const node of nodes){if(String(node.id)===String(id))return node;const hit=findNode(id,node.children || []);if(hit)return hit}return null}
function currentContent(id){const node=findNode(id);return sectionRewriteSource(node)}
function capture(node=props.node){context.value={projectId:props.projectId,outlineId:node?.id,title:node?.title || '当前小节',node:{...node}};error.value='';restoreConfig.value=false}
function invalidateRead(){sequence++}
async function openRewrite(node=props.node){
  if(!node?.id)return
  if(generating.value){
    if(context.value.projectId===props.projectId && context.value.outlineId===node.id)visible.value=true
    else ElMessage.warning('另一小节正在重写，请等待完成')
    return
  }
  capture(node);targetWords.value=Number(node.targetWordCount || node.section?.targetWordCount || 1200);streamed.value='';elapsed.value=0;mode.value='rewrite';draft.value=null;instruction.value='';visible.value=true;loading.value=true
  const token=++sequence
  try{const result=await getTechnicalRewriteDraft(context.value.projectId,context.value.outlineId);if(token===sequence)draft.value=result}
  catch(e){if(token===sequence)error.value=e.message || '新稿读取失败'}finally{if(token===sequence)loading.value=false}
}
async function openHistory(onlySection=true){
  if(generating.value){ElMessage.warning('本节正在重写，请完成后再查看历史');return}
  if(onlySection && !props.node?.id)return
  capture();mode.value='history';sectionOnly.value=onlySection;versions.value=[];selected.value=null;visible.value=true;loading.value=true
  const token=++sequence,ctx={...context.value}
  try{
    const rows=onlySection?await listTechnicalSectionVersions(ctx.projectId,ctx.outlineId):await listBidProjectTechnicalVersions(ctx.projectId)
    if(token!==sequence)return
    versions.value=rows || [];loading.value=false;if(versions.value.length)await selectVersion(versions.value[0])
  }catch(e){if(token===sequence)error.value=e.message || '历史读取失败'}finally{if(token===sequence)loading.value=false}
}
async function selectVersion(item){
 const token=++sequence;loading.value=true
 try{const value=item.snapshotJson?item:await getBidProjectTechnicalVersion(context.value.projectId,item.id);if(token===sequence)selected.value=value}
 catch(e){if(token===sequence)error.value=e.message || '历史读取失败'}
 finally{if(token===sequence)loading.value=false}
}
async function generate(){
  if(generating.value || loading.value || props.busy)return
  const ctx={...context.value},base=currentContent(ctx.outlineId)
  let payload
  try{payload=buildSectionRewritePayload(ctx.node,base,instruction.value,targetWords.value)}catch(e){error.value=e.message;return}
  generating.value=true;error.value='';streamed.value='';elapsed.value=0
  const started=Date.now();stopTimer();timer=setInterval(()=>{elapsed.value=Math.floor((Date.now()-started)/1000)},1000)
  try{
    await streamBidProjectTechnicalSection(ctx.projectId,ctx.outlineId,payload,{onMessage(chunk){streamed.value+=chunk}})
    const result=await getTechnicalRewriteDraft(ctx.projectId,ctx.outlineId)
    if(!result)throw new Error('尚未读取到新稿，请稍后重新打开查看')
    if(props.projectId===ctx.projectId) {
      draft.value=result
      ElMessage.success('新稿已保存，请对比后点击“采用新稿”')
    }
  }catch(e){if(props.projectId===ctx.projectId)error.value=e.message || '重写失败，原文保持不变'}
  finally{generating.value=false;stopTimer();if(props.projectId===ctx.projectId)emit('updated')}
}

async function adopt(){
 working.value=true;error.value=''
 try{await adoptTechnicalRewriteDraft(context.value.projectId,context.value.outlineId,draft.value.id);visible.value=false;emit('updated');ElMessage.success('已采用新稿，原文已自动备份')}
 catch(e){error.value=e.message || '采用失败'}finally{working.value=false}
}
async function discard(){
 working.value=true
 try{await discardTechnicalRewriteDraft(context.value.projectId,context.value.outlineId,draft.value.id);draft.value=null;visible.value=false;ElMessage.success('已保留原文')}
 catch(e){error.value=e.message || '放弃失败'}finally{working.value=false}
}
async function restore(outlineId){
 try{await ElMessageBox.confirm(`恢复${outlineId?'本节':'整个方案'}前会自动备份当前版本。${restoreConfig.value?'同时恢复章节配置。':'仅恢复正文，保留当前编写配置。'}`,'恢复历史版本',{type:'warning'})}catch{return}
 working.value=true;error.value=''
 try{await restoreTechnicalContentVersion(context.value.projectId,selected.value.id,outlineId,restoreConfig.value);visible.value=false;emit('updated');ElMessage.success('已恢复，恢复前内容已备份')}
 catch(e){error.value=e.message || '恢复失败'}finally{working.value=false}
}
defineExpose({openRewrite,openHistory})
</script>
<style scoped>
.rewrite-content{max-height:72vh;overflow:auto}.rewrite-config,.rewrite-presets{display:flex;gap:12px;align-items:center;flex-wrap:wrap;margin:12px 0}.rewrite-config label{display:flex;gap:8px;align-items:center}.rewrite-presets .el-button{margin-left:0}.revision-summary,.revision-progress{padding:12px;background:#f5f3ff;color:#6253b5;margin:12px 0;border-radius:8px}.rewrite-stream{max-height:230px;overflow:auto;white-space:pre-wrap;overflow-wrap:anywhere;font-size:13px;line-height:1.7}.revision-note,.revision-meta{font-size:13px;line-height:1.8;color:#817b91;margin:10px 0}.revision-history{display:grid;grid-template-columns:280px 1fr;gap:20px;min-height:350px;max-height:70vh;overflow:auto}.revision-history aside{overflow:auto}.revision-history aside button{display:block;text-align:left;width:100%;border:1px solid #e8e5ef;border-radius:7px;background:white;padding:12px;margin-bottom:10px;cursor:pointer}.revision-history aside button.active{border-color:#6b54ff;background:#f7f4ff}.revision-history small{display:block;margin-top:8px;color:#827b91;overflow-wrap:anywhere}.revision-history main{min-width:0}.history-section{margin:12px 0;border-bottom:1px solid #e8e5ef}.history-section header{display:flex;justify-content:space-between;gap:12px;align-items:center}@media(max-width:800px){.revision-history{grid-template-columns:1fr}.revision-history aside{max-height:180px}}
</style>
