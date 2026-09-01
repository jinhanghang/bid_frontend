<template>
  <div class="editor-page" v-loading="loading">
    <header class="editor-header">
      <div class="header-left"><el-button @click="back">返回AI标书</el-button><div><h2>{{ editorDoc.projectName || '标书在线编辑' }}</h2><p>{{ saveStateText }} · {{ wordCount }} 字</p></div></div>
      <div class="header-actions">
        <el-button @click="versionDrawer=true;loadVersions()">历史版本</el-button>
        <el-dropdown @command="exportFile"><el-button>导出文档<el-icon><ArrowDown/></el-icon></el-button><template #dropdown><el-dropdown-menu><el-dropdown-item command="word">导出 Word</el-dropdown-item><el-dropdown-item command="pdf">导出 PDF</el-dropdown-item></el-dropdown-menu></template></el-dropdown>
        <el-button type="primary" :loading="saving" @click="save(true)">保存版本</el-button>
      </div>
    </header>
    <div class="toolbar"><el-button v-for="item in tools" :key="item.label" text @mousedown.prevent @click="insert(item.before,item.after)">{{ item.label }}</el-button></div>
    <main class="editor-workspace">
      <section class="edit-pane"><div class="pane-title">编辑内容 <span>支持 Markdown</span></div><textarea ref="textarea" :value="content" spellcheck="false" placeholder="在这里编辑标书内容……" @input="handleInput"/></section>
      <section class="preview-pane"><div class="pane-title">实时预览 <span>导出效果以 Word/PDF 为准</span></div><div class="preview-paper"><MarkdownContent :content="content"/></div></section>
    </main>
    <el-drawer v-model="versionDrawer" title="历史版本" size="420px"><div class="version-list" v-loading="versionLoading">
      <div v-for="item in versions" :key="item.id" class="version-card"><div><strong>版本 V{{ item.versionNo }}</strong><span>{{ sourceText(item.sourceType) }} · {{ timeText(item.createTime) }}</span></div><el-button link type="primary" @click="restore(item)">恢复此版本</el-button></div>
      <el-empty v-if="!versions.length&&!versionLoading" description="暂无手动保存版本"/>
    </div></el-drawer>
  </div>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { ArrowDown } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from '@/plugins/element-plus-api'
import { useRoute, useRouter } from 'vue-router'
import MarkdownContent from '@/components/ai/MarkdownContent.vue'
import { downloadFileResource, exportBidDocumentEditor, getBidDocumentEditor, listBidDocumentEditorVersions, restoreBidDocumentEditorVersion, saveBidDocumentEditor } from '@/api/bidProject'

const route=useRoute(),router=useRouter(),projectId=String(route.query.projectId||''),messageId=String(route.query.messageId||'')
const editorDoc=reactive({projectName:'',messageId:'',updateTime:''}),content=ref(''),textarea=ref(null),loading=ref(false),saving=ref(false),dirty=ref(false),savedAt=ref('')
const versionDrawer=ref(false),versionLoading=ref(false),versions=ref([])
let saveTimer=0,initialized=false,savePromise=null
const tools=[{label:'标题',before:'## ',after:''},{label:'加粗',before:'**',after:'**'},{label:'列表',before:'- ',after:''},{label:'编号',before:'1. ',after:''},{label:'表格',before:'\n| 项目 | 内容 |\n| --- | --- |\n|  |  |\n',after:''},{label:'引用',before:'> ',after:''},{label:'分隔线',before:'\n---\n',after:''}]
const wordCount=computed(()=>String(content.value||'').replace(/\s/g,'').length)
const saveStateText=computed(()=>saving.value?'正在保存':dirty.value?'有未保存修改':savedAt.value?`已保存 ${savedAt.value}`:'已加载')

onMounted(load)
onBeforeUnmount(()=>{clearTimeout(saveTimer);window.removeEventListener('beforeunload',beforeUnload)})
watch(content,()=>{if(!initialized)return;dirty.value=true;clearTimeout(saveTimer);saveTimer=setTimeout(()=>save(false),2000)})

async function load(){if(!projectId||!messageId){ElMessage.error('缺少需要编辑的AI回复');return router.push({path:'/ai-bid',query:{projectId}})}loading.value=true;try{const data=await getBidDocumentEditor(projectId,messageId);Object.assign(editorDoc,data||{});content.value=data?.content||'';initialized=true;window.addEventListener('beforeunload',beforeUnload)}finally{loading.value=false}}
async function save(createVersion){
  clearTimeout(saveTimer)
  if(savePromise){
    await savePromise
    if(!createVersion&&!dirty.value)return
  }
  const savingContent=content.value
  saving.value=true
  savePromise=saveBidDocumentEditor(projectId,messageId,{content:savingContent,createVersion,sourceType:'MANUAL'})
  try{
    const data=await savePromise
    dirty.value=content.value!==savingContent
    savedAt.value=new Date().toLocaleTimeString('zh-CN',{hour:'2-digit',minute:'2-digit'})
    if(createVersion){
      ElMessage.success(data?.versionCreated?'已保存新版本':'内容与最新版本相同，无需重复创建')
      await loadVersions()
    }
  }finally{
    savePromise=null
    saving.value=false
  }
}
async function loadVersions(){versionLoading.value=true;try{versions.value=await listBidDocumentEditorVersions(projectId,messageId)||[]}finally{versionLoading.value=false}}
async function restore(item){
  await ElMessageBox.confirm(`确定将这条回复恢复到 V${item.versionNo}？当前编辑内容将被替换，恢复操作不会创建新版本。`,'恢复版本',{type:'warning'})
  clearTimeout(saveTimer)
  if(savePromise)await savePromise
  const data=await restoreBidDocumentEditorVersion(projectId,messageId,item.id)
  initialized=false
  content.value=data?.content||''
  initialized=true
  dirty.value=false
  savedAt.value=new Date().toLocaleTimeString('zh-CN',{hour:'2-digit',minute:'2-digit'})
  ElMessage.success(`已恢复到 V${item.versionNo}，未创建新版本`)
  versionDrawer.value=false
}
async function exportFile(format){await save(false);const artifact=await exportBidDocumentEditor(projectId,messageId,{content:content.value,format,artifactName:editorDoc.projectName,styleCode:'BUSINESS'});const blob=await downloadFileResource(artifact.fileResourceId);const url=URL.createObjectURL(blob),link=window.document.createElement('a');link.href=url;link.download=`${editorDoc.projectName||'AI标书'}.${format==='pdf'?'pdf':'docx'}`;link.click();URL.revokeObjectURL(url);ElMessage.success('已按当前回复导出，并保存到标书成果和下载中心')}
function handleInput(event){
  const el=event.target,scrollTop=el.scrollTop,scrollLeft=el.scrollLeft,start=el.selectionStart,end=el.selectionEnd
  content.value=el.value
  requestAnimationFrame(()=>{
    if(textarea.value!==el)return
    el.scrollTop=scrollTop
    el.scrollLeft=scrollLeft
    if(document.activeElement===el)el.setSelectionRange(start,end)
  })
}
async function insert(before,after){
  const el=textarea.value
  if(!el)return
  const start=el.selectionStart,end=el.selectionEnd,scrollTop=el.scrollTop,scrollLeft=el.scrollLeft
  const pageX=window.scrollX,pageY=window.scrollY,selected=content.value.slice(start,end)
  content.value=content.value.slice(0,start)+before+selected+after+content.value.slice(end)
  await nextTick()
  el.focus({preventScroll:true})
  el.setSelectionRange(start+before.length,start+before.length+selected.length)
  restoreEditorPosition(el,scrollTop,scrollLeft,pageX,pageY)
  requestAnimationFrame(()=>restoreEditorPosition(el,scrollTop,scrollLeft,pageX,pageY))
}
function restoreEditorPosition(el,scrollTop,scrollLeft,pageX,pageY){
  el.scrollTop=scrollTop
  el.scrollLeft=scrollLeft
  window.scrollTo(pageX,pageY)
}
async function back(){if(dirty.value)await save(false);router.push({path:'/ai-bid',query:{projectId}})}
function beforeUnload(event){if(!dirty.value)return;event.preventDefault();event.returnValue=''}
function sourceText(value){return({AI_MESSAGE:'AI回复',RESTORE:'版本恢复',MANUAL:'手动保存'}[value]||'保存版本')}
function timeText(value){return value?String(value).replace('T',' ').slice(0,16):''}
</script>

<style scoped>
.editor-page{height:100%;min-height:0;display:flex;flex-direction:column;background:#f3f6fb;color:#17243a}.editor-header{min-height:76px;padding:12px 24px;border-bottom:1px solid #e1e6ef;background:#fff;display:flex;align-items:center;justify-content:space-between;gap:20px}.header-left,.header-actions{display:flex;align-items:center;gap:14px}.header-left h2{margin:0;font-size:20px}.header-left p{margin:5px 0 0;color:#8490a3;font-size:12px}.toolbar{padding:7px 24px;border-bottom:1px solid #e1e6ef;background:#fff}.editor-workspace{flex:1;min-height:0;display:grid;grid-template-columns:1fr 1fr;gap:14px;padding:14px}.edit-pane,.preview-pane{min-width:0;min-height:0;border:1px solid #dfe5ee;border-radius:14px;background:#fff;overflow:hidden;display:flex;flex-direction:column}.pane-title{height:44px;padding:0 16px;border-bottom:1px solid #e5e9f0;display:flex;align-items:center;justify-content:space-between;font-weight:700}.pane-title span{color:#98a2b3;font-size:12px;font-weight:400}.edit-pane textarea{flex:1;min-height:0;width:100%;padding:22px;border:0;outline:0;resize:none;font:15px/1.85 Consolas,"Microsoft YaHei",sans-serif;color:#273650;box-sizing:border-box}.preview-pane{background:#eef2f7}.preview-paper{flex:1;min-height:0;margin:18px;overflow:auto;padding:32px 38px;background:#fff;box-shadow:0 5px 22px rgba(34,52,84,.08)}.version-card{display:flex;align-items:center;justify-content:space-between;padding:14px 4px;border-bottom:1px solid #edf0f5}.version-card strong,.version-card span{display:block}.version-card span{margin-top:6px;color:#929caf;font-size:12px}@media(max-width:1000px){.editor-workspace{grid-template-columns:1fr}.preview-pane{display:none}.editor-header{align-items:flex-start}.header-actions{flex-wrap:wrap;justify-content:flex-end}}
.editor-page,.editor-workspace,.edit-pane,.preview-pane,.edit-pane textarea,.preview-paper{overflow-anchor:none}
</style>
