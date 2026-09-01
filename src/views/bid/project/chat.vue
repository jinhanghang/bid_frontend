<template>
  <div class="bid-chat-page">
    <aside class="project-list">
      <div class="side-head"><div><h2>AI标书</h2><p>对话编制 · 资料驱动</p></div><el-button type="primary" :icon="Plus" circle @click="openCreate" /></div>
      <el-input v-model="keyword" clearable :prefix-icon="Search" placeholder="搜索标书项目" @input="debouncedLoad" />
      <div class="projects" v-loading="loadingProjects">
        <button v-for="item in projects" :key="item.id" :class="{active:item.id===current?.id}" @click="selectProject(item)">
          <strong>{{ item.projectName }}</strong><span>{{ statusText(item) }} · {{ timeText(item.updateTime||item.createTime) }}</span>
          <i v-if="item.tenderNoticeId">已关联标讯</i>
        </button>
        <el-empty v-if="!projects.length&&!loadingProjects" description="暂无AI标书" :image-size="72" />
      </div>
    </aside>

    <main v-if="current" class="conversation-panel">
      <header class="conversation-head">
        <div class="title"><h2>{{ current.projectName }}</h2><p>{{ current.projectCode }} · {{ current.tenderNoticeTitle || '未关联标讯' }}</p></div>
        <div class="head-actions">
          <el-tag class="model-tag" type="success" effect="light" :title="currentModelDisplayName">{{ currentModelDisplayName }}</el-tag>
          <el-tag class="context-tag" effect="plain" @click="openReferences">已关联 {{ contextCount }} 项资料</el-tag>
          <el-button @click="artifactDrawer=true;loadArtifacts()">标书成果</el-button>
          <el-dropdown @command="handleHeaderCommand"><el-button>更多<el-icon><ArrowDown /></el-icon></el-button>
            <template #dropdown><el-dropdown-menu><el-dropdown-item command="new">新建对话</el-dropdown-item><el-dropdown-item command="history">历史对话</el-dropdown-item><el-dropdown-item command="references">关联资料</el-dropdown-item></el-dropdown-menu></template>
          </el-dropdown>
        </div>
      </header>

      <section ref="messageBox" class="messages">
        <div v-if="materialGuideItems.length" class="material-guide-card">
          <div class="material-guide-title">
            <div><strong>企业资料待补充</strong><span>补齐后，AI会在后续对话和标书生成中自动使用</span></div>
            <el-tag type="warning" effect="light">{{ materialGuideItems.length }} 项</el-tag>
          </div>
          <div class="material-guide-items">
            <button v-for="item in materialGuideItems" :key="item.key" @click="goSupplementMaterial(item)">
              <span><b>{{ item.label }}</b><small>{{ item.reason }}</small></span><i>去补充 →</i>
            </button>
          </div>
        </div>
        <div v-if="!messages.length" class="welcome"><div class="ai-mark">AI</div><h1>这份标书，您想先做什么？</h1>
          <p>已自动关联当前项目资料，选择一个任务即可开始，也可以直接在下方输入要求。</p>
          <div class="start-steps"><span><b>1</b>关联项目资料</span><i></i><span><b>2</b>选择编制任务</span><i></i><span><b>3</b>编辑并导出</span></div>
          <div class="guide-grid"><button v-for="(task,index) in guideTasks" :key="task.title" @click="chooseGuide(task)"><i>{{ index+1 }}</i><span><strong>{{ task.title }}</strong><small>{{ task.description }}</small></span></button></div>
        </div>
        <article v-for="m in messages" :key="m.id" class="message" :class="m.role">
          <div class="avatar">{{ m.role==='user'?'我':'AI' }}</div><div class="bubble-wrap">
            <div v-if="attachments[m.id]?.length" class="chips"><span v-for="f in attachments[m.id]" :key="f.id">{{ f.fileName }}</span></div>
            <div class="bubble"><div v-if="m.status==='GENERATING'&&!m.content" class="stream-status"><span>正在生成中</span></div>
              <MarkdownContent v-if="m.role==='assistant'" :content="m.content"/><template v-else>{{ m.content }}</template><i v-if="m.status==='GENERATING'" />
            </div>
            <div v-if="m.role==='assistant'&&m.status!=='GENERATING'" class="message-actions">
              <el-button link @click="continueFrom(m)">继续追问</el-button>
              <el-button link type="primary" @click="openEditor(m)">在线编辑</el-button>
              <el-dropdown @command="format=>saveArtifact(m,format)"><el-button link :loading="savingMessageId===m.id">导出</el-button>
                <template #dropdown><el-dropdown-menu><el-dropdown-item command="word">导出 Word</el-dropdown-item><el-dropdown-item command="pdf">导出 PDF</el-dropdown-item></el-dropdown-menu></template>
              </el-dropdown>
              <el-dropdown @command="command=>handleMessageCommand(m,command)"><el-button link>更多</el-button>
                <template #dropdown><el-dropdown-menu><el-dropdown-item command="copy">复制</el-dropdown-item><el-dropdown-item command="regenerate" :disabled="generating">重新生成</el-dropdown-item></el-dropdown-menu></template>
              </el-dropdown>
            </div>
            <div v-if="m.id===latestAssistantMessageId&&m.status!=='GENERATING'" class="next-guide"><span>接下来可以：</span><button v-for="item in nextSuggestions" :key="item" @click="chooseSuggestion(item)">{{ item }}</button></div>
          </div>
        </article>
      </section>

      <footer class="composer">
        <div v-if="pendingFiles.length" class="chips pending"><span v-for="f in pendingFiles" :key="f.attachment.id">{{ f.attachment.fileName }}<button @click="removePending(f)">×</button></span></div>
        <el-input v-model="draft" type="textarea" resize="none" :autosize="{minRows:2,maxRows:7}" :placeholder="composerPlaceholder" @keydown="onKeydown" />
        <div class="composer-tools"><div><el-upload :show-file-list="false" :http-request="uploadChatFile" multiple accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.md"><el-tooltip content="添加招标文件或资料" placement="top"><el-button circle :icon="Paperclip" :loading="uploading" /></el-tooltip></el-upload>
          <span class="context-state"><i></i> 已关联 {{ contextCount }} 项项目资料</span></div>
          <el-button v-if="generating" type="danger" :icon="VideoPause" circle @click="stop"/><el-button v-else type="primary" :icon="Promotion" circle :disabled="!canSend" @click="send"/>
        </div>
      </footer>
    </main>

    <main v-else class="empty"><div class="ai-mark">AI</div><h1>创建第一份对话式标书</h1><p>可从标讯商机、招标文件或空白项目开始。</p><el-button type="primary" size="large" @click="openCreate">新建AI标书</el-button></main>

    <el-dialog v-model="createDialog" title="新建AI标书" width="760px" destroy-on-close>
      <el-form label-position="top" class="create-model-form"><el-form-item label="生成模型" required>
        <el-select v-model="createForm.modelConfigId" style="width:100%" placeholder="请选择已配置的模型" :loading="loadingModels"><el-option v-for="item in models" :key="item.id" :label="item.displayName || item.modelName" :value="item.id" /></el-select>
        <div class="model-lock-tip">模型在AI标书创建后锁定，不可修改</div>
      </el-form-item></el-form>
      <el-form v-if="isPlatformManager" label-position="top" class="create-admin-form">
        <div class="admin-fields"><el-form-item label="所属企业" required><el-select v-model="createForm.enterpriseId" filterable placeholder="请选择标书所属企业" :loading="loadingEnterprises" style="width:100%" @change="onEnterpriseChange"><el-option v-for="item in enterprises" :key="item.id" :label="item.enterpriseName" :value="item.id" /></el-select></el-form-item>
        <el-form-item label="项目负责人" required><el-select v-model="createForm.ownerUserId" filterable placeholder="请选择该企业项目负责人" :loading="loadingOwners" :disabled="!createForm.enterpriseId" style="width:100%"><el-option v-for="item in owners" :key="item.id" :label="item.fullName||item.username||item.phone" :value="item.id" /></el-select></el-form-item></div>
        <div class="model-lock-tip">平台管理员无需加入企业，创建时选择项目归属企业即可。</div>
      </el-form>
      <el-tabs v-model="createTab" class="create-tabs">
        <el-tab-pane label="从标讯商机创建" name="notice"><el-input v-model="noticeKeyword" clearable placeholder="搜索标讯" @input="loadNotices" />
          <div class="notice-options" v-loading="loadingNotices"><label v-for="n in notices" :key="n.id" :class="{selected:createForm.noticeId===n.id}"><input v-model="createForm.noticeId" type="radio" :value="n.id"/><div><strong>{{ n.noticeTitle }}</strong><span>{{ n.tenderNo||'暂无编号' }} · {{ n.purchaser||'-' }}</span></div></label></div>
        </el-tab-pane>
        <el-tab-pane label="上传招标文件" name="upload"><el-upload drag :auto-upload="false" :limit="1" :on-change="onTenderFile" :on-remove="()=>createForm.file=null" accept=".pdf,.doc,.docx"><el-icon class="el-icon--upload"><UploadFilled /></el-icon><div>拖拽招标文件到这里，或点击选择</div></el-upload></el-tab-pane>
        <el-tab-pane label="创建空白标书" name="blank"><el-form label-position="top"><el-form-item label="项目名称" required><el-input v-model="createForm.projectName" placeholder="请输入项目名称"/></el-form-item><el-form-item label="项目类型"><el-input v-model="createForm.projectType" placeholder="例如：信息化建设、工程施工"/></el-form-item></el-form></el-tab-pane>
      </el-tabs>
      <template #footer><el-button @click="createDialog=false">取消</el-button><el-button type="primary" :loading="creating" @click="createProject">创建并开始对话</el-button></template>
    </el-dialog>

    <el-drawer v-model="conversationDrawer" title="历史对话" size="420px"><div class="conversation-list">
      <el-button type="primary" plain class="new-conversation" @click="switchConversation('__new__');conversationDrawer=false">＋ 新建对话</el-button>
      <button v-for="item in conversations" :key="item.id" :class="{active:item.id===conversationId}" @click="switchConversation(item.id);conversationDrawer=false"><strong>{{ item.title||'新对话' }}</strong><span>{{ timeText(item.lastMessageTime||item.updateTime||item.createTime) }}</span></button>
    </div></el-drawer>

    <el-drawer v-model="referenceDrawer" title="项目上下文与关联资料" size="520px">
      <div v-if="current" class="context-summary"><h3>自动关联</h3><p>标讯：{{ current.tenderNoticeTitle||'未关联' }}</p><p>招标文件：{{ current.tenderFileName||'未上传' }}</p><p>企业资料：{{ current.companyMaterialName||'未关联' }}</p></div>
      <h3>知识库</h3><el-select v-model="referenceForm.knowledgeIds" multiple filterable placeholder="选择用于本项目的知识库" style="width:100%"><el-option v-for="k in knowledgeBases" :key="k.id" :label="k.kbName" :value="k.id"/></el-select>
      <h3>企业资料档案</h3><el-select v-model="referenceForm.companyMaterialId" clearable filterable placeholder="选择企业资料" style="width:100%"><el-option v-for="m in companyMaterials" :key="m.id" :label="m.title" :value="m.id"/></el-select>
      <div class="drawer-actions"><el-button type="primary" :loading="savingReferences" @click="saveReferences">保存关联</el-button><el-button v-if="current.tenderFileId&&current.parseStatus!=='SUCCESS'" :loading="reading" @click="startRead">开始解析招标文件</el-button></div>
    </el-drawer>
    <el-drawer v-model="artifactDrawer" title="标书成果" size="520px">
      <div class="artifact-toolbar"><span>保存后的Word/PDF会长期保留，并按版本管理</span><el-button link @click="loadArtifacts">刷新</el-button></div>
      <div v-loading="artifactLoading" class="artifact-list"><div v-for="item in artifacts" :key="item.id" class="artifact-card">
        <div class="artifact-icon">{{ item.format==='pdf'?'PDF':'W' }}</div><div class="artifact-main"><strong>{{ item.artifactName }}</strong><span>V{{ item.versionNo }} · {{ sizeText(item.fileSize) }} · {{ timeText(item.createTime) }}</span>
          <div><el-button v-if="item.format==='pdf'" link @click="previewArtifact(item)">预览</el-button><el-button link @click="downloadArtifact(item)">下载</el-button><el-button link @click="renameArtifact(item)">重命名</el-button><el-button v-if="item.sourceMessageId" link :loading="artifactBusyId===item.id" @click="rebuildArtifact(item)">重新生成</el-button><el-button link type="danger" @click="removeArtifact(item)">删除</el-button></div>
        </div></div><el-empty v-if="!artifacts.length&&!artifactLoading" description="暂无标书成果" /></div>
    </el-drawer>
  </div>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import { ArrowDown, Paperclip, Plus, Promotion, Search, UploadFilled, VideoPause } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from '@/plugins/element-plus-api'
import { getToken } from '@/utils/storage'
import { useAuthStore } from '@/stores/auth'
import { useRoute, useRouter } from 'vue-router'
import { bindBidProjectCompanyMaterial, createBidProject, createBidProjectFromNotice, getBidProject, listBidProjectCompanyMaterialOptions, pageBidProjects, startReadTenderProject, unbindBidProjectCompanyMaterial, updateBidProject, uploadTenderProject } from '@/api/bidProject'
import { listKnowledgeBases } from '@/api/knowledge'
import { getCompanyMaterial } from '@/api/companyMaterial'
import { listDocumentModels } from '@/api/aiDocument'
import { listEnterprises } from '@/api/enterprise'
import { pageUsers } from '@/api/systemUser'
import { getTenderNotice, pageTenderNotices } from '@/api/tenderNotice'
import { createConversation, deleteDocumentArtifact, documentArtifactDownloadUrl, getConversationMessages, getConversationRun, listConversations, listDocumentArtifacts, regenerateConversationMessage, regenerateDocumentArtifact, renameDocumentArtifact, resumeConversationRun, saveBidArtifact, stopConversationRun, streamConversationMessage, uploadConversationAttachment } from '@/api/aiConversation'
import MarkdownContent from '@/components/ai/MarkdownContent.vue'

const route=useRoute(), router=useRouter(), auth=useAuthStore(), projects=ref([]), current=ref(null), keyword=ref(''), loadingProjects=ref(false)
const conversations=ref([]), conversationId=ref(''), messages=ref([]), attachments=ref({}), pendingFiles=ref([]), draft=ref('')
const generating=ref(false), uploading=ref(false), activeRunId=ref(''), activeStream=ref(null), messageBox=ref(null)
const createDialog=ref(false), createTab=ref('notice'), creating=ref(false), notices=ref([]), noticeKeyword=ref(''), loadingNotices=ref(false)
const createForm=reactive({noticeId:'',projectName:'',projectType:'',file:null,modelConfigId:'',enterpriseId:'',ownerUserId:''})
const models=ref([]), loadingModels=ref(false)
const enterprises=ref([]), owners=ref([]), loadingEnterprises=ref(false), loadingOwners=ref(false)
const referenceDrawer=ref(false), knowledgeBases=ref([]), companyMaterials=ref([]), savingReferences=ref(false), reading=ref(false)
const referenceForm=reactive({knowledgeIds:[],companyMaterialId:''})
const artifactDrawer=ref(false), artifactLoading=ref(false), artifacts=ref([]), savingMessageId=ref(''), artifactBusyId=ref('')
const conversationDrawer=ref(false)
const materialGuideItems=ref([])
const guideTasks=[
  {title:'分析招标文件',description:'提取资格条件、废标项和重要时间',prompt:'请分析当前项目的招标文件，提取资格条件、废标项、重要时间节点和需要重点关注的风险。'},
  {title:'生成评分响应表',description:'根据评分办法逐项给出响应建议',prompt:'请根据招标文件中的评分办法，生成完整的评分响应矩阵，并给出每个评分项的响应建议和所需证明材料。'},
  {title:'编制投标目录',description:'结合项目资料生成完整目录',prompt:'请结合招标文件、标讯和已关联资料，生成一份完整、层级清晰的投标文件目录。'},
  {title:'撰写标书章节',description:'编写商务、技术或服务方案',prompt:'请根据当前项目资料协助撰写标书章节。先列出可撰写的章节并询问我从哪一章开始。'},
  {title:'检查标书风险',description:'检查遗漏、冲突和未响应内容',prompt:'请检查当前项目可能存在的资格、废标、评分响应和资料完整性风险，并输出可执行的整改清单。'}
]
const canSend=computed(()=>!generating.value&&!uploading.value&&(!!draft.value.trim()||pendingFiles.value.length>0))
const currentModelDisplayName=computed(()=>{const item=models.value.find(x=>x.id===current.value?.modelConfigId);return item?.displayName||current.value?.modelName||providerName(item?.provider)||'系统默认模型'})
const isPlatformManager=computed(()=>{const roles=auth.roleCodes||[];return roles.includes('SUPERADMIN')||roles.includes('PLATFORMADMIN')})
const contextCount=computed(()=>[current.value?.tenderNoticeId,current.value?.tenderFileId,current.value?.companyMaterialId].filter(Boolean).length+(current.value?.knowledgeIdList?.length||0))
const latestAssistant=computed(()=>[...messages.value].reverse().find(item=>item.role==='assistant')||null)
const latestAssistantMessageId=computed(()=>latestAssistant.value?.id||'')
const nextSuggestions=computed(()=>suggestionsFor(latestAssistant.value?.content||''))
const composerPlaceholder=computed(()=>current.value?.tenderFileId?'告诉AI你想完成什么，或从上方建议中选择……':'告诉AI你想完成什么，也可以先上传招标文件……')
let timer=0, runPollTimer=0

onMounted(async()=>{
  await loadModels()
  await loadProjects(route.query.projectId)
  const sourceNoticeId=String(route.query.noticeId||'').trim()
  if(route.query.create==='notice'&&sourceNoticeId){
    await openCreate(sourceNoticeId)
    await router.replace({path:'/ai-bid'})
  }
}); onBeforeUnmount(()=>{clearTimeout(timer);stopPolling()})
function debouncedLoad(){clearTimeout(timer);timer=setTimeout(loadProjects,300)}
async function loadProjects(selectId){loadingProjects.value=true;try{const p=await pageBidProjects({pageNum:1,pageSize:100,keyword:keyword.value||undefined});projects.value=p?.records||[];const target=selectId?projects.value.find(x=>x.id===selectId):(!current.value&&projects.value[0]);if(target)await selectProject(target)}finally{loadingProjects.value=false}}
async function selectProject(item){current.value=await getBidProject(item.id);referenceForm.knowledgeIds=current.value.knowledgeIdList||[];referenceForm.companyMaterialId=current.value.companyMaterialId||'';conversationId.value='';await checkCompanyMaterialCompleteness();await initChat()}
async function initChat(){const p=await listConversations({current:1,size:50,bizType:'AI_BID',bizId:current.value.id});conversations.value=p?.records||[];conversationId.value=conversations.value[0]?.id||(await newConversation()).id;await loadMessages()}
async function newConversation(){const c=await createConversation({title:'新对话',bizType:'AI_BID',bizId:current.value.id,aiLevel:'FLAGSHIP'});conversations.value.unshift(c);conversationId.value=c.id;messages.value=[];attachments.value={};return c}
async function switchConversation(id){if(id==='__new__')await newConversation();else{conversationId.value=id;await loadMessages()}}
async function handleHeaderCommand(command){if(command==='new')await switchConversation('__new__');if(command==='history')conversationDrawer.value=true;if(command==='references')openReferences()}
async function loadMessages(){const d=await getConversationMessages(conversationId.value);messages.value=d?.messages||[];attachments.value=d?.attachments||{};await scrollBottom();const running=[...messages.value].reverse().find(x=>x.role==='assistant'&&x.status==='GENERATING'&&x.runId);if(running){generating.value=true;activeRunId.value=running.runId;startPolling(running);activeStream.value=await resumeConversationRun(running.runId,running.content?.length||0,handlers(running))}}
async function uploadChatFile({file}){uploading.value=true;try{pendingFiles.value.push(await uploadConversationAttachment(conversationId.value,file));ElMessage.success('资料已加入本轮对话')}finally{uploading.value=false}}
function removePending(f){pendingFiles.value=pendingFiles.value.filter(x=>x.attachment.id!==f.attachment.id)}
async function send(){if(!canSend.value)return;const user={id:`u-${Date.now()}`,role:'user',content:draft.value.trim(),status:'COMPLETE'},assistant=reactive({id:`a-${Date.now()}`,role:'assistant',content:'',status:'GENERATING',stageText:'正在读取项目资料',progress:0});attachments.value[user.id]=pendingFiles.value.map(x=>x.attachment);const payload={content:user.content,attachmentIds:pendingFiles.value.map(x=>x.attachment.id),maxOutputWords:8000};messages.value.push(user,assistant);draft.value='';pendingFiles.value=[];generating.value=true;await scrollBottom();try{activeStream.value=await streamConversationMessage(conversationId.value,payload,handlers(assistant))}catch(e){fail(assistant,e)}}
async function regenerate(m){const a=reactive({id:`a-${Date.now()}`,role:'assistant',content:'',status:'GENERATING',progress:0});messages.value.push(a);generating.value=true;activeStream.value=await regenerateConversationMessage(conversationId.value,m.id,8000,handlers(a))}
function handlers(a){return{onEvent(event,data){if(event==='start'){activeRunId.value=data.runId;a.id=data.messageId;a.runId=data.runId;startPolling(a)}if(event==='progress'||event==='heartbeat'){a.stageText=data.stageText||a.stageText;a.progress=data.progress??a.progress}if(event==='delta'){a.content+=data.content||'';scrollBottom()}if(event==='done'||event==='stopped'){snapshot(a,data);a.status=event==='done'?'COMPLETE':'CANCELLED';finish();refreshConversations()}if(event==='error')fail(a,new Error(data.message||'生成失败'))},onError:e=>fail(a,e)}}
function startPolling(m){stopPolling();const poll=async()=>{const id=activeRunId.value||m.runId;if(!id||!generating.value)return;try{const d=await getConversationRun(id);snapshot(m,d);if(['SUCCESS','FAILED','CANCELLED'].includes(d?.status)){m.status=d.status==='SUCCESS'?'COMPLETE':d.status;finish();return}}catch(_){}runPollTimer=setTimeout(poll,800)};runPollTimer=setTimeout(poll,300)}
function snapshot(m,d){if(!d)return;m.stageText=d.stageText||m.stageText;m.progress=d.progress??m.progress;if(typeof d.content==='string'&&d.content.length>(m.content||'').length)m.content=d.content;scrollBottom()}
function stopPolling(){if(runPollTimer)clearTimeout(runPollTimer);runPollTimer=0} function finish(){stopPolling();generating.value=false;activeRunId.value=''}
async function stop(){if(!activeRunId.value)return;await stopConversationRun(activeRunId.value);activeStream.value?.abort?.();finish();await loadMessages()}
function fail(m,e){if(activeRunId.value||m.runId){startPolling(m);return}m.status='FAILED';finish();ElMessage.error(e?.message||'连接中断')}
async function refreshConversations(){const p=await listConversations({current:1,size:50,bizType:'AI_BID',bizId:current.value.id});conversations.value=p?.records||[]}
async function loadArtifacts(){if(!current.value?.id)return;artifactLoading.value=true;try{const p=await listDocumentArtifacts({documentId:current.value.id,bizType:'AI_BID',current:1,size:100});artifacts.value=p?.records||[]}finally{artifactLoading.value=false}}
async function saveArtifact(m,format){savingMessageId.value=m.id;try{await saveBidArtifact(current.value.id,{messageId:m.id,format,artifactName:current.value.projectName,styleCode:'BUSINESS'});ElMessage.success(format==='pdf'?'PDF已生成并保存':'Word已生成并保存');await loadArtifacts();artifactDrawer.value=true}finally{savingMessageId.value=''}}
async function rebuildArtifact(item){artifactBusyId.value=item.id;try{await regenerateDocumentArtifact(item.id);ElMessage.success('已生成新版本');await loadArtifacts()}finally{artifactBusyId.value=''}}
async function renameArtifact(item){const{value}=await ElMessageBox.prompt('请输入新的成果名称','重命名',{inputValue:item.artifactName,inputPattern:/\S+/,inputErrorMessage:'名称不能为空'});await renameDocumentArtifact(item.id,value);ElMessage.success('重命名成功');await loadArtifacts()}
async function removeArtifact(item){await ElMessageBox.confirm(`确定删除“${item.artifactName}”V${item.versionNo}及其文件吗？`,'删除成果',{type:'warning'});await deleteDocumentArtifact(item.id);ElMessage.success('已删除');await loadArtifacts()}
async function downloadArtifact(item){const response=await fetch(documentArtifactDownloadUrl(item.id),{headers:{Authorization:`Bearer ${getToken()}`}});if(!response.ok)return ElMessage.error('下载失败');const blob=await response.blob(),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`${item.artifactName}-V${item.versionNo}.${item.format==='pdf'?'pdf':'docx'}`;a.click();URL.revokeObjectURL(url)}
async function previewArtifact(item){const response=await fetch(documentArtifactDownloadUrl(item.id),{headers:{Authorization:`Bearer ${getToken()}`}});if(!response.ok)return ElMessage.error('预览失败');const url=URL.createObjectURL(await response.blob());window.open(url,'_blank','noopener');setTimeout(()=>URL.revokeObjectURL(url),60000)}
function sizeText(bytes){const n=Number(bytes||0);return n<1024*1024?`${Math.max(1,Math.round(n/1024))}KB`:`${(n/1024/1024).toFixed(1)}MB`}
async function copyText(t){await navigator.clipboard.writeText(t||'');ElMessage.success('已复制')} function onKeydown(e){if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();send()}} async function scrollBottom(){await nextTick();if(messageBox.value)messageBox.value.scrollTop=messageBox.value.scrollHeight}
function openEditor(message){router.push({path:'/ai-bid/editor',query:{projectId:current.value.id,messageId:message.id}})}
function chooseGuide(task){draft.value=task.prompt;nextTick(()=>scrollBottom())}
function chooseSuggestion(text){draft.value=suggestionPrompt(text);nextTick(()=>scrollBottom())}
function continueFrom(message){draft.value=`请基于上一条回复继续完善，重点补充：`;nextTick(()=>scrollBottom())}
function handleMessageCommand(message,command){if(command==='copy')copyText(message.content);if(command==='regenerate')regenerate(message)}
function openReferences(){referenceDrawer.value=true;loadReferences()}
async function checkCompanyMaterialCompleteness(){
  materialGuideItems.value=[]
  const archiveId=current.value?.companyMaterialId
  if(!archiveId){materialGuideItems.value=[{key:'archive',label:'关联企业资料档案',reason:'当前项目尚未关联企业资料',action:'references'}];return}
  try{
    const material=await getCompanyMaterial(archiveId)
    let profile={}
    try{const root=JSON.parse(material?.content||'{}');profile=root?.profile||root||{}}catch(_){profile={}}
    const license=profile.license||{},members=Array.isArray(profile.members)?profile.members:[],certificates=Array.isArray(profile.certificates)?profile.certificates:[],cases=Array.isArray(profile.cases)?profile.cases:[],financials=Array.isArray(profile.financials)?profile.financials:[]
    const items=[]
    if(!license.companyName||!license.creditCode||!license.legalRepresentative)items.push({key:'license-fields',label:'补全营业执照信息',reason:'企业名称、信用代码或法定代表人不完整',tab:'license'})
    if(!material?.fileId||Number(material?.fileExists)!==1)items.push({key:'license-file',label:'上传营业执照附件',reason:'尚未上传可用的营业执照扫描件',tab:'license',action:'upload'})
    appendDetailGuide(items,'members','补充项目成员及证明',members,'尚未维护项目成员信息','人员记录缺少身份证、职称证、社保等证明附件')
    appendDetailGuide(items,'certificates','补充企业资质证书',certificates,'尚未维护企业资质证书','资质记录缺少对应证书附件')
    appendDetailGuide(items,'cases','补充企业业绩证明',cases,'尚未维护企业业绩','业绩记录缺少合同、中标通知书或验收证明')
    appendDetailGuide(items,'financials','补充财务证明资料',financials,'尚未维护财务资料','财务记录缺少审计报告或报表附件')
    materialGuideItems.value=items
  }catch(_){materialGuideItems.value=[{key:'archive-check',label:'检查企业资料档案',reason:'暂时无法读取当前关联档案，请进入资料库确认',tab:'license'}]}
}
function appendDetailGuide(items,tab,label,rows,emptyReason,attachmentReason){
  if(!rows.length){items.push({key:`${tab}-empty`,label,reason:emptyReason,tab,action:'add'});return}
  const index=rows.findIndex(row=>!Array.isArray(row?.attachments)||!row.attachments.length)
  if(index>=0)items.push({key:`${tab}-file-${index}`,label,reason:attachmentReason,tab,action:'edit',recordIndex:index})
}
function goSupplementMaterial(item){
  if(item.action==='references'||!current.value?.companyMaterialId){openReferences();return}
  router.push({path:'/materials/company',query:{archiveId:current.value.companyMaterialId,tab:item.tab||'license',action:item.action||'focus',recordIndex:item.recordIndex??undefined,fromProject:current.value.id}})
}
function suggestionsFor(content){
  const text=String(content||'')
  if(/评分|得分|响应矩阵/.test(text))return ['补充评分证明材料','生成逐项响应内容','检查评分项遗漏']
  if(/目录|章节|大纲/.test(text))return ['撰写第一章','检查目录完整性','调整目录结构']
  if(/资格|废标|否决/.test(text))return ['生成资格审查表','生成废标项清单','继续分析评分办法']
  if(/风险|缺失|遗漏/.test(text))return ['生成整改清单','补充缺失资料','重新检查完整性']
  return ['继续完善内容','检查遗漏和风险','整理为正式标书章节']
}
function suggestionPrompt(text){return({
  '补充评分证明材料':'请基于上一条回复，补充每个评分项所需的证明材料和资料来源。','生成逐项响应内容':'请根据上一条评分分析，生成可直接写入投标文件的逐项响应内容。','检查评分项遗漏':'请检查上一条评分响应是否存在遗漏、重复或无法得分的内容。',
  '撰写第一章':'请按照上一条目录开始撰写第一章，内容要完整、正式并符合投标文件语言。','检查目录完整性':'请检查上一条目录是否完整响应招标文件要求，并指出需要补充的章节。','调整目录结构':'请优化上一条目录的层级和章节顺序，使其更适合正式投标文件。',
  '生成资格审查表':'请根据上一条分析生成资格审查对照表，列明要求、响应材料和风险状态。','生成废标项清单':'请将上一条内容整理成废标项清单，并标明核验方式和责任人。','继续分析评分办法':'请继续读取评分办法，整理评分项目、分值、得分条件和响应建议。',
  '生成整改清单':'请将上一条风险分析整理成可执行的整改清单，并标注优先级。','补充缺失资料':'请列出当前缺失资料，并说明获取方式、责任人和完成时限。','重新检查完整性':'请结合当前全部项目资料重新检查投标响应完整性。',
  '继续完善内容':'请基于上一条回复继续补充细节，使内容可以直接用于正式投标文件。','检查遗漏和风险':'请检查上一条回复中的遗漏、矛盾、风险和不明确内容。','整理为正式标书章节':'请将上一条回复整理成格式规范、语言正式的标书章节。'
}[text]||text)}

function providerName(provider){return({doubao:'豆包',bailian:'百炼',qwen:'千问',deepseek:'DeepSeek'}[String(provider||'').toLowerCase()]||provider||'系统默认模型')}
async function loadModels(){loadingModels.value=true;try{models.value=await listDocumentModels()||[];const preferred=models.value.find(x=>x.defaultFlag)||models.value[0];if(!createForm.modelConfigId&&preferred)createForm.modelConfigId=preferred.id}finally{loadingModels.value=false}}
async function loadEnterprises(){loadingEnterprises.value=true;try{enterprises.value=await listEnterprises({limit:500})||[]}finally{loadingEnterprises.value=false}}
async function onEnterpriseChange(){createForm.ownerUserId='';owners.value=[];if(!createForm.enterpriseId)return;loadingOwners.value=true;try{const p=await pageUsers({pageNum:1,pageSize:500,status:1,enterpriseId:createForm.enterpriseId});owners.value=p?.records||[]}finally{loadingOwners.value=false}}
async function openCreate(noticeId=''){
  const preferred=models.value.find(x=>x.defaultFlag)||models.value[0]
  Object.assign(createForm,{noticeId:'',projectName:'',projectType:'',file:null,modelConfigId:preferred?.id||'',enterpriseId:'',ownerUserId:''})
  owners.value=[]
  noticeKeyword.value=''
  createDialog.value=true
  createTab.value='notice'
  await loadNotices()
  const selectedId=(typeof noticeId==='string'||typeof noticeId==='number')?String(noticeId).trim():''
  if(selectedId){
    let matched=notices.value.find(item=>String(item.id)===selectedId)
    if(!matched){
      try{
        matched=await getTenderNotice(selectedId)
        if(matched?.id)notices.value=[matched,...notices.value.filter(item=>String(item.id)!==selectedId)]
      }catch(_){
        ElMessage.warning('未能读取所选标讯，请在列表中重新选择')
      }
    }
    if(matched?.id)createForm.noticeId=matched.id
  }
  if(isPlatformManager.value)await loadEnterprises()
}
async function loadNotices(){loadingNotices.value=true;try{const p=await pageTenderNotices({current:1,size:30,keyword:noticeKeyword.value||undefined});notices.value=p?.records||[]}finally{loadingNotices.value=false}}
function onTenderFile(file){createForm.file=file.raw}
async function createProject(){if(!createForm.modelConfigId)return ElMessage.warning('请选择生成模型');if(isPlatformManager.value&&!createForm.enterpriseId)return ElMessage.warning('请选择所属企业');if(isPlatformManager.value&&!createForm.ownerUserId)return ElMessage.warning('请选择项目负责人');creating.value=true;try{const scope={modelConfigId:createForm.modelConfigId,enterpriseId:createForm.enterpriseId||undefined,ownerUserId:createForm.ownerUserId||undefined};let id;if(createTab.value==='notice'){if(!createForm.noticeId)return ElMessage.warning('请选择标讯商机');id=await createBidProjectFromNotice(createForm.noticeId,scope)}else if(createTab.value==='upload'){if(!createForm.file)return ElMessage.warning('请选择招标文件');const fd=new FormData();fd.append('file',createForm.file);Object.entries(scope).forEach(([key,value])=>{if(value)fd.append(key,value)});const w=await uploadTenderProject(fd);id=w?.project?.id||w?.id}else{if(!createForm.projectName.trim())return ElMessage.warning('请输入项目名称');id=await createBidProject({projectName:createForm.projectName,projectType:createForm.projectType,...scope})}createDialog.value=false;const preferred=models.value.find(x=>x.defaultFlag)||models.value[0];Object.assign(createForm,{noticeId:'',projectName:'',projectType:'',file:null,modelConfigId:preferred?.id||'',enterpriseId:'',ownerUserId:''});await loadProjects(id);ElMessage.success('AI标书项目已创建')}finally{creating.value=false}}
async function loadReferences(){const [kb,cm]=await Promise.all([listKnowledgeBases({status:1}),listBidProjectCompanyMaterialOptions(current.value.id)]);knowledgeBases.value=kb||[];companyMaterials.value=cm||[];referenceForm.knowledgeIds=current.value.knowledgeIdList||[];referenceForm.companyMaterialId=current.value.companyMaterialId||''}
async function saveReferences(){savingReferences.value=true;try{await updateBidProject(current.value.id,{projectName:current.value.projectName,projectType:current.value.projectType,clientName:current.value.clientName,bidderName:current.value.bidderName,budgetAmount:current.value.budgetAmount,tenderDeadline:current.value.tenderDeadline,bidOpenTime:current.value.bidOpenTime,periodDays:current.value.periodDays,ownerUserId:current.value.ownerUserId,knowledgeIds:referenceForm.knowledgeIds,remark:current.value.remark});if(referenceForm.companyMaterialId){await bindBidProjectCompanyMaterial(current.value.id,{companyMaterialId:referenceForm.companyMaterialId})}else if(current.value.companyMaterialId){await unbindBidProjectCompanyMaterial(current.value.id)}current.value=await getBidProject(current.value.id);await checkCompanyMaterialCompleteness();ElMessage.success('关联资料已保存，后续对话自动生效')}finally{savingReferences.value=false}}
async function startRead(){reading.value=true;try{await startReadTenderProject(current.value.id,{aiLevel:'FLAGSHIP'});current.value=await getBidProject(current.value.id);ElMessage.success('已启动招标文件解析')}finally{reading.value=false}}
function statusText(x){return({DRAFT:'草稿',GENERATING:'生成中',GENERATED:'待校审',EXPORTED:'已导出'}[x.status]||x.status||'草稿')} function timeText(v){return v?String(v).replace('T',' ').slice(0,16):''}
</script>

<style scoped>
.bid-chat-page{height:100%;min-height:0;display:flex;overflow:hidden;background:#f4f6fb;color:#1f2b3d}.project-list{width:292px;flex:0 0 292px;padding:20px 16px;border-right:1px solid #e3e8f0;background:#fff;display:flex;flex-direction:column;gap:15px}.side-head,.conversation-head,.head-actions,.composer-tools,.composer-tools>div{display:flex;align-items:center;justify-content:space-between}.side-head h2,.conversation-head h2{margin:0;font-size:20px}.side-head p,.conversation-head p{margin:5px 0 0;color:#8a96a8;font-size:12px}.projects{flex:1;min-height:0;overflow:auto}.projects button{width:100%;margin-bottom:9px;padding:13px;text-align:left;border:1px solid transparent;border-radius:13px;background:#f7f9fc;cursor:pointer}.projects button.active,.projects button:hover{border-color:#8174ed;background:#f2f0ff}.projects strong,.projects span{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.projects span{margin-top:7px;color:#8793a7;font-size:12px}.projects i{display:inline-block;margin-top:8px;padding:2px 7px;border-radius:8px;background:#e8f7ef;color:#35a36e;font-size:11px;font-style:normal}.conversation-panel{min-width:0;flex:1;display:flex;flex-direction:column}.conversation-head{min-height:76px;padding:12px 24px;border-bottom:1px solid #e3e8f0;background:#fff;gap:18px}.title{min-width:0}.title h2,.title p{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.head-actions{gap:8px;white-space:nowrap}.messages{flex:1;min-height:0;overflow:auto;padding:25px max(30px,calc((100% - 920px)/2))}.welcome{max-width:720px;margin:8vh auto 0;text-align:center}.ai-mark{width:58px;height:58px;margin:0 auto 18px;border-radius:18px;display:grid;place-items:center;background:linear-gradient(135deg,#5268e8,#8055dc);color:white;font-weight:800}.welcome p,.empty p{color:#7d899b}.suggestions{display:grid;gap:10px;margin-top:24px}.suggestions button{padding:13px 16px;text-align:left;border:1px solid #dfe4ee;border-radius:12px;background:white;cursor:pointer}.message{display:flex;gap:11px;max-width:920px;margin:0 auto 23px}.message.user{flex-direction:row-reverse}.avatar{width:34px;height:34px;flex:0 0 34px;border-radius:10px;display:grid;place-items:center;background:#eceaff;color:#6558df;font-size:12px;font-weight:700}.user .avatar{background:#e4f4eb;color:#329568}.bubble-wrap{min-width:0;max-width:85%}.bubble{padding:13px 16px;border-radius:5px 16px 16px;background:#fff;white-space:pre-wrap;overflow-wrap:anywhere;line-height:1.8;box-shadow:0 5px 18px rgba(35,50,80,.06)}.user .bubble{border-radius:16px 5px 16px 16px;background:#6276e8;color:white}.bubble i{display:inline-block;width:2px;height:16px;margin-left:4px;background:#607cf2;animation:blink 1s infinite}.message-actions{margin-top:6px;opacity:0}.message:hover .message-actions{opacity:1}.stream-status{display:flex;justify-content:space-between;color:#747f92;font-size:12px}.chips{display:flex;flex-wrap:wrap;gap:7px;margin-bottom:8px}.chips span{padding:6px 9px;border-radius:8px;background:#e9edf5;color:#526076;font-size:12px}.chips button{border:0;background:transparent;cursor:pointer}.composer{width:min(920px,calc(100% - 60px));margin:0 auto 20px;padding:11px 14px;border:1px solid #dce3ed;border-radius:16px;background:#fff;box-shadow:0 12px 32px rgba(36,53,86,.1)}.composer :deep(.el-textarea__inner){box-shadow:none}.context-state{font-size:12px;color:#6c788c}.context-state i{display:inline-block;width:7px;height:7px;margin-right:5px;border-radius:50%;background:#32ac72}.empty{flex:1;display:grid;align-content:center;justify-items:center;text-align:center}.notice-options{max-height:360px;margin-top:12px;overflow:auto}.notice-options label{display:flex;gap:10px;padding:12px;margin-bottom:8px;border:1px solid #e1e6ef;border-radius:11px;cursor:pointer}.notice-options label.selected{border-color:#7465e8;background:#f5f3ff}.notice-options strong,.notice-options span{display:block}.notice-options span{margin-top:5px;color:#8793a7;font-size:12px}.context-summary,.draft-preview{padding:14px;border:1px solid #e1e6ef;border-radius:12px;background:#f8f9fc}.context-summary p{margin:7px 0;color:#647086}.drawer-actions{display:flex;gap:10px;margin-top:20px}.draft-preview{max-height:360px;overflow:auto;white-space:pre-wrap;line-height:1.7;color:#566176}@keyframes blink{50%{opacity:0}}@media(max-width:1100px){.project-list{width:240px;flex-basis:240px}.conversation-head{align-items:flex-start;flex-direction:column}.head-actions{max-width:100%;overflow:auto}}
.create-model-form{margin-bottom:4px}.model-lock-tip{margin-top:6px;color:#8a96a8;font-size:12px}.model-tag{max-width:130px;overflow:hidden;text-overflow:ellipsis}
.artifact-toolbar{display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;color:#7b8798;font-size:12px}.artifact-card{display:flex;gap:12px;padding:14px;margin-bottom:10px;border:1px solid #e2e7ef;border-radius:12px}.artifact-icon{width:44px;height:44px;display:grid;place-items:center;border-radius:10px;background:#eef2ff;color:#536fe5;font-weight:800}.artifact-main{min-width:0;flex:1}.artifact-main strong,.artifact-main span{display:block}.artifact-main strong{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.artifact-main span{margin:5px 0;color:#8a96a8;font-size:12px}
.create-admin-form{margin-bottom:8px;padding:12px 14px;border:1px solid #e7e3ff;border-radius:12px;background:#faf9ff}.admin-fields{display:grid;grid-template-columns:1fr 1fr;gap:14px}.create-admin-form :deep(.el-form-item){margin-bottom:4px}
.context-tag{cursor:pointer}.welcome{max-width:820px;margin:5vh auto 0}.welcome h1{margin:0 0 10px;font-size:27px}.guide-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:26px;text-align:left}.guide-grid button{display:flex;align-items:flex-start;gap:12px;min-height:82px;padding:16px;border:1px solid #e0e5ee;border-radius:14px;background:#fff;color:#24324a;cursor:pointer;transition:.2s}.guide-grid button:last-child{grid-column:1/-1}.guide-grid button:hover{border-color:#7567e9;box-shadow:0 8px 22px rgba(89,75,210,.1);transform:translateY(-1px)}.guide-grid i{width:28px;height:28px;flex:0 0 28px;border-radius:9px;display:grid;place-items:center;background:#f0edff;color:#6657df;font-size:12px;font-style:normal;font-weight:700}.guide-grid strong,.guide-grid small{display:block}.guide-grid strong{margin-bottom:7px;font-size:15px}.guide-grid small{color:#8490a3;font-size:12px;line-height:1.5}.message-actions{display:flex;align-items:center;margin-top:7px;opacity:1}.next-guide{display:flex;align-items:center;flex-wrap:wrap;gap:8px;margin-top:10px;padding:10px 12px;border-radius:12px;background:#f7f8fc}.next-guide span{color:#7c8799;font-size:12px}.next-guide button{padding:5px 10px;border:1px solid #dce2ec;border-radius:999px;background:#fff;color:#52627b;font-size:12px;cursor:pointer}.next-guide button:hover{border-color:#7567e9;color:#6657df}.composer{padding:13px 16px}.composer-tools{margin-top:4px}.conversation-list{display:flex;flex-direction:column;gap:9px}.conversation-list .new-conversation{width:100%;margin-bottom:5px}.conversation-list>button:not(.el-button){padding:13px 14px;text-align:left;border:1px solid #e3e7ef;border-radius:12px;background:#fafbfc;cursor:pointer}.conversation-list>button.active{border-color:#7567e9;background:#f3f1ff}.conversation-list strong,.conversation-list span{display:block}.conversation-list span{margin-top:5px;color:#8b96a8;font-size:12px}@media(max-width:850px){.guide-grid{grid-template-columns:1fr}.guide-grid button:last-child{grid-column:auto}}
.start-steps{display:flex;align-items:center;justify-content:center;gap:10px;margin:20px auto 0;color:#748096;font-size:12px}.start-steps span{display:flex;align-items:center;gap:6px}.start-steps b{width:22px;height:22px;border-radius:50%;display:grid;place-items:center;background:#ece9ff;color:#6657df}.start-steps>i{width:32px;height:1px;background:#dce1ea}
.material-guide-card{max-width:920px;margin:0 auto 20px;padding:16px;border:1px solid #f1d49a;border-radius:15px;background:#fffaf0;box-shadow:0 8px 22px rgba(120,83,20,.06)}.material-guide-title{display:flex;align-items:center;justify-content:space-between;gap:12px}.material-guide-title strong,.material-guide-title span{display:block}.material-guide-title span{margin-top:4px;color:#8a7350;font-size:12px}.material-guide-items{display:grid;grid-template-columns:1fr 1fr;gap:9px;margin-top:13px}.material-guide-items button{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:11px 12px;text-align:left;border:1px solid #f0dfbd;border-radius:11px;background:#fff;cursor:pointer}.material-guide-items button:hover{border-color:#e7b34d;background:#fffdf7}.material-guide-items b,.material-guide-items small{display:block}.material-guide-items b{color:#4b3a1e;font-size:13px}.material-guide-items small{margin-top:4px;color:#8c7a5f;font-size:11px}.material-guide-items i{flex:0 0 auto;color:#b47708;font-size:12px;font-style:normal}@media(max-width:850px){.material-guide-items{grid-template-columns:1fr}}
</style>
