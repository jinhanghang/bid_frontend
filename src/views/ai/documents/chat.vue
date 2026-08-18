<template>
  <div class="document-chat-page">
    <aside class="document-list">
      <div class="list-head">
        <div><h2>AI文档</h2><p>对话生成 · 自动携带资料</p></div>
        <el-button type="primary" :icon="Plus" circle @click="newDialog = true" />
      </div>
      <el-input v-model="keyword" clearable :prefix-icon="Search" placeholder="搜索文档" @input="loadDocuments" />
      <div class="documents" v-loading="loadingDocs">
        <button v-for="item in documents" :key="item.id" :class="{ active: item.id === current?.id }" @click="selectDocument(item)">
          <strong>{{ item.solutionName }}</strong>
          <span>{{ typeName(item.solutionType, item) }} · {{ timeText(item.updateTime || item.createTime) }}</span>
        </button>
        <el-empty v-if="!documents.length && !loadingDocs" description="暂无AI文档" :image-size="76" />
      </div>
    </aside>

    <main v-if="current" class="conversation-panel">
      <header class="conversation-head">
        <div class="conversation-title"><h2 :title="current.solutionName">{{ current.solutionName }}</h2><p>当前文档信息、已有内容、历史消息和附件会自动传递给所选模型</p></div>
        <div class="head-actions">
          <el-tag type="primary">{{ typeName(current.solutionType, current) }}</el-tag>
          <el-tag class="model-tag" type="success" :title="current.modelName || '系统默认模型'">{{ modelDisplayName(current) }}</el-tag>
          <el-dropdown @command="switchConversation">
            <el-button>历史对话<el-icon><ArrowDown /></el-icon></el-button>
            <template #dropdown><el-dropdown-menu>
              <el-dropdown-item command="__new__">＋ 新建对话</el-dropdown-item>
              <el-dropdown-item v-for="item in conversations" :key="item.id" :command="item.id">{{ item.title }}</el-dropdown-item>
            </el-dropdown-menu></template>
          </el-dropdown>
          <el-button @click="artifactDrawer = true; loadArtifacts()">文档成果</el-button>
        </div>
      </header>

      <section ref="messageBox" class="messages">
        <div v-if="!messages.length" class="welcome">
          <div class="ai-mark">AI</div>
          <h1>直接告诉我您要生成什么文档</h1>
          <p>不需要先建大纲。您可以上传原件、图片或参考资料，我会结合当前文档信息连续生成、续写和修改。</p>
          <div class="suggestions">
            <button v-for="prompt in prompts" :key="prompt" @click="draft = prompt">{{ prompt }}</button>
          </div>
        </div>
        <article v-for="message in messages" :key="message.id" class="message" :class="message.role">
          <div class="avatar">{{ message.role === 'user' ? '我' : 'AI' }}</div>
          <div class="bubble-wrap">
            <div v-if="attachments[message.id]?.length" class="file-chips">
              <span v-for="file in attachments[message.id]" :key="file.id"><el-icon><Paperclip /></el-icon>{{ file.fileName }}</span>
            </div>
            <div class="bubble">
              <div v-if="message.status === 'GENERATING' && !message.content" class="stream-status">
                <span>正在生成中</span>
              </div>
              {{ message.content }}<i v-if="message.status === 'GENERATING'" />
            </div>
            <div v-if="message.role === 'assistant' && message.status !== 'GENERATING'" class="message-actions">
              <el-button link @click="copy(message.content)">复制</el-button>
              <el-button link :disabled="generating" @click="regenerate(message)">重新生成</el-button>
              <el-dropdown @command="format => saveArtifact(message, format)">
                <el-button link :loading="savingMessageId === message.id">保存文档</el-button>
                <template #dropdown><el-dropdown-menu>
                  <el-dropdown-item command="word">保存为 Word</el-dropdown-item>
                  <el-dropdown-item command="pdf">保存为 PDF</el-dropdown-item>
                </el-dropdown-menu></template>
              </el-dropdown>
            </div>
          </div>
        </article>
      </section>

      <footer class="composer">
        <div v-if="pendingFiles.length" class="pending-files">
          <span v-for="file in pendingFiles" :key="file.attachment.id">{{ file.attachment.fileName }}<button @click="removePending(file)">×</button></span>
        </div>
        <el-input v-model="draft" type="textarea" resize="none" :autosize="{ minRows: 2, maxRows: 7 }"
          placeholder="输入生成要求，Enter 发送，Shift+Enter 换行" @keydown="onKeydown" />
        <div class="composer-tools">
          <div>
            <el-upload :show-file-list="false" :http-request="uploadFile" multiple
              accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.md,.csv">
              <el-button text :icon="Paperclip" :loading="uploading">添加文件或图片</el-button>
            </el-upload>
            <span class="context-state"><i></i> 已自动关联当前文档</span>
          </div>
          <el-button v-if="generating" type="danger" :icon="VideoPause" circle @click="stop" />
          <el-button v-else type="primary" :icon="Promotion" circle :disabled="!canSend" @click="send" />
        </div>
      </footer>
    </main>

    <main v-else class="empty-workspace">
      <div class="ai-mark">AI</div><h1>开始一份新的 AI 文档</h1><p>创建文档后，全部内容都通过对话生成。</p>
      <el-button type="primary" size="large" @click="newDialog = true">新建AI文档</el-button>
    </main>

    <el-dialog v-model="newDialog" title="新建AI文档" width="520px">
      <el-form label-position="top">
        <el-form-item label="文档标题" required><el-input v-model="newForm.documentTitle" placeholder="例如：智慧工厂建设方案" /></el-form-item>
        <el-form-item label="文档类型"><el-select v-model="newForm.documentType" style="width:100%">
          <el-option v-for="item in types" :key="item.type" :label="item.title" :value="item.type" />
        </el-select></el-form-item>
        <el-form-item v-if="newForm.documentType === 'OTHER'" label="其他文档类型" required>
          <el-input v-model="newForm.customDocumentType" maxlength="50" show-word-limit placeholder="请输入具体文档类型，例如：项目实施方案" />
        </el-form-item>
        <el-form-item label="生成模型" required>
          <el-select v-model="newForm.modelConfigId" style="width:100%" placeholder="请选择已配置的模型" :loading="loadingModels">
            <el-option v-for="item in models" :key="item.id" :label="item.displayName || providerName(item.provider)" :value="item.id">
              <span>{{ item.displayName || providerName(item.provider) }}</span>
            </el-option>
          </el-select>
          <div class="model-lock-tip">模型在文档创建后锁定，不可修改</div>
        </el-form-item>
      </el-form>
      <template #footer><el-button @click="newDialog = false">取消</el-button><el-button type="primary" :loading="creating" @click="createNew">创建并开始对话</el-button></template>
    </el-dialog>
    <el-drawer v-model="artifactDrawer" title="文档成果" size="520px">
      <div class="artifact-toolbar"><span>AI回复保存后会长期保留，并按版本管理</span><el-button link @click="loadArtifacts">刷新</el-button></div>
      <div v-loading="artifactLoading" class="artifact-list">
        <div v-for="item in artifacts" :key="item.id" class="artifact-card">
          <div class="artifact-icon">{{ item.format === 'pdf' ? 'PDF' : 'W' }}</div>
          <div class="artifact-main"><strong>{{ item.artifactName }}</strong><span>V{{ item.versionNo }} · {{ sizeText(item.fileSize) }} · {{ timeText(item.createTime) }}</span>
            <div><el-button v-if="item.format === 'pdf'" link @click="previewArtifact(item)">预览</el-button><el-button link @click="downloadArtifact(item)">下载</el-button><el-button link @click="renameArtifact(item)">重命名</el-button><el-button link :loading="artifactBusyId === item.id" @click="rebuildArtifact(item)">重新生成</el-button><el-button link type="danger" @click="removeArtifact(item)">删除</el-button></div>
          </div>
        </div>
        <el-empty v-if="!artifacts.length && !artifactLoading" description="暂无文档成果" />
      </div>
    </el-drawer>
  </div>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import { ArrowDown, Paperclip, Plus, Promotion, Search, VideoPause } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from '@/plugins/element-plus-api'
import { getToken } from '@/utils/storage'
import { createDocument, getDocument, listDocumentModels, listDocumentTypes, pageDocuments } from '@/api/aiDocument'
import { createConversation, deleteDocumentArtifact, documentArtifactDownloadUrl, getConversationMessages, getConversationRun, listConversations, listDocumentArtifacts, regenerateConversationMessage, regenerateDocumentArtifact, renameDocumentArtifact, resumeConversationRun, saveDocumentArtifact, stopConversationRun, streamConversationMessage, uploadConversationAttachment } from '@/api/aiConversation'

const documents = ref([]), types = ref([]), models = ref([]), current = ref(null), keyword = ref(''), loadingDocs = ref(false), loadingModels = ref(false)
const conversations = ref([]), conversationId = ref(''), messages = ref([]), attachments = ref({})
const pendingFiles = ref([]), draft = ref(''), uploading = ref(false), generating = ref(false)
const activeRunId = ref(''), activeStream = ref(null), messageBox = ref(null)
const newDialog = ref(false), creating = ref(false)
const artifactDrawer = ref(false), artifactLoading = ref(false), artifacts = ref([]), savingMessageId = ref(''), artifactBusyId = ref('')
const pendingAutoArtifactFormat = ref('')
let runPollTimer = 0
const newForm = reactive({ documentTitle: '', documentType: 'FEASIBILITY', customDocumentType: '', modelConfigId: '', aiLevel: 'FLAGSHIP', writingStyle: 'PROFESSIONAL' })
const prompts = ['根据我上传的资料，直接生成完整文档', '继续完成这份文档剩余内容', '检查当前文档缺少什么并直接补全']
const canSend = computed(() => !generating.value && !uploading.value && (!!draft.value.trim() || pendingFiles.value.length > 0))

onMounted(async () => { types.value = await listDocumentTypes(); await loadModels(); await loadDocuments() })
onBeforeUnmount(() => stopRunPolling())
async function loadDocuments() {
  loadingDocs.value = true
  try {
    const page = await pageDocuments({ current: 1, size: 100, keyword: keyword.value })
    documents.value = page?.records || []
    if (!current.value && documents.value.length) await selectDocument(documents.value[0])
  } finally { loadingDocs.value = false }
}
async function selectDocument(item) { current.value = await getDocument(item.id); conversationId.value = ''; await initializeChat() }
async function createNew() {
  if (!newForm.documentTitle.trim()) return ElMessage.warning('请填写文档标题')
  if (newForm.documentType === 'OTHER' && !newForm.customDocumentType.trim()) return ElMessage.warning('请输入其他文档类型')
  if (!newForm.modelConfigId) return ElMessage.warning('请选择生成模型')
  creating.value = true
  try { const doc = await createDocument({ ...newForm }); newDialog.value = false; resetNewForm(); await loadDocuments(); await selectDocument(doc) }
  finally { creating.value = false }
}
async function loadModels() {
  loadingModels.value = true
  try {
    models.value = await listDocumentModels() || []
    const preferred = models.value.find(item => item.defaultFlag) || models.value[0]
    if (!newForm.modelConfigId && preferred) newForm.modelConfigId = preferred.id
  } finally { loadingModels.value = false }
}
function resetNewForm() {
  newForm.documentTitle = ''; newForm.documentType = 'FEASIBILITY'; newForm.customDocumentType = ''
  newForm.modelConfigId = (models.value.find(item => item.defaultFlag) || models.value[0])?.id || ''
}
async function initializeChat() {
  const page = await listConversations({ current: 1, size: 50, bizType: 'AI_DOCUMENT', bizId: current.value.id })
  conversations.value = page?.records || []
  conversationId.value = conversations.value[0]?.id || (await newConversation()).id
  await loadMessages()
}
async function newConversation() {
  const value = await createConversation({ title: '新对话', bizType: 'AI_DOCUMENT', bizId: current.value.id, aiLevel: current.value.aiLevel || 'FLAGSHIP' })
  conversations.value.unshift(value); conversationId.value = value.id; messages.value = []; attachments.value = {}; return value
}
async function switchConversation(id) { if (id === '__new__') await newConversation(); else { conversationId.value = id; await loadMessages() } }
async function loadMessages() {
  const data = await getConversationMessages(conversationId.value); messages.value = data?.messages || []; attachments.value = data?.attachments || {}; await scrollBottom()
  const running = [...messages.value].reverse().find(x => x.role === 'assistant' && x.status === 'GENERATING' && x.runId)
  if (running) { generating.value = true; activeRunId.value = running.runId; startRunPolling(running); activeStream.value = await resumeConversationRun(running.runId, running.content?.length || 0, handlers(running)) }
}
async function uploadFile({ file }) { uploading.value = true; try { pendingFiles.value.push(await uploadConversationAttachment(conversationId.value, file)); ElMessage.success('附件已加入本轮对话') } finally { uploading.value = false } }
function removePending(file) { pendingFiles.value = pendingFiles.value.filter(x => x.attachment.id !== file.attachment.id) }
async function send() {
  if (!canSend.value) return
  const user = { id: `u-${Date.now()}`, role: 'user', content: draft.value.trim(), status: 'COMPLETE' }
  // 流式回调会持续修改该对象，必须直接创建为响应式对象，否则数据虽已收到，
  // Vue 页面却可能直到刷新历史记录后才显示。
  const assistant = reactive({ id: `a-${Date.now()}`, role: 'assistant', content: '', status: 'GENERATING', stageText: '正在连接所选模型', progress: 0 })
  attachments.value[user.id] = pendingFiles.value.map(x => x.attachment)
  const payload = { content: user.content, attachmentIds: pendingFiles.value.map(x => x.attachment.id), maxOutputWords: 8000 }
  pendingAutoArtifactFormat.value = /(?:PDF|pdf)/.test(user.content) ? 'pdf' : /(?:Word|word|docx|导出文档|生成文档)/.test(user.content) ? 'word' : ''
  messages.value.push(user, assistant); draft.value = ''; pendingFiles.value = []; generating.value = true; await scrollBottom()
  try { activeStream.value = await streamConversationMessage(conversationId.value, payload, handlers(assistant)) } catch (e) { fail(assistant, e) }
}
async function regenerate(message) { const assistant = reactive({ id: `a-${Date.now()}`, role: 'assistant', content: '', status: 'GENERATING', stageText: '正在连接所选模型', progress: 0 }); messages.value.push(assistant); generating.value = true; activeStream.value = await regenerateConversationMessage(conversationId.value, message.id, 8000, handlers(assistant)) }
function handlers(assistant) { return { onEvent(event, data) {
  if (event === 'start') { activeRunId.value = data.runId; assistant.id = data.messageId; assistant.runId = data.runId; startRunPolling(assistant) }
  if (event === 'progress' || event === 'heartbeat') { assistant.stageText = data.stageText || assistant.stageText; assistant.progress = data.progress ?? assistant.progress }
  if (event === 'delta') { assistant.content += data.content || ''; assistant.stageText = '正在生成中'; scrollBottom() }
  if (event === 'done' || event === 'stopped') { applyRunSnapshot(assistant, data); assistant.status = event === 'done' ? 'COMPLETE' : 'CANCELLED'; finishRun(); refreshConversations(); if (event === 'done' && pendingAutoArtifactFormat.value) { const format = pendingAutoArtifactFormat.value; pendingAutoArtifactFormat.value = ''; saveArtifact(assistant, format) } }
  if (event === 'error') fail(assistant, new Error(data.message || '生成失败'))
}, onError: e => fail(assistant, e) } }
function startRunPolling(message) {
  stopRunPolling()
  const poll = async () => {
    const runId = activeRunId.value || message.runId
    if (!runId || !generating.value) return
    try {
      const data = await getConversationRun(runId)
      applyRunSnapshot(message, data)
      if (['SUCCESS', 'FAILED', 'CANCELLED'].includes(data?.status)) {
        message.status = data.status === 'SUCCESS' ? 'COMPLETE' : data.status
        finishRun()
        await refreshConversations()
        return
      }
    } catch (_) { /* SSE 仍可能正常，单次轮询失败不打断生成 */ }
    runPollTimer = window.setTimeout(poll, 800)
  }
  runPollTimer = window.setTimeout(poll, 300)
}
function applyRunSnapshot(message, data) {
  if (!data) return
  message.stageText = data.stageText || message.stageText
  message.progress = data.progress ?? message.progress
  // 快照正文是完整前缀，只在更长时覆盖，避免 SSE 与轮询并发造成倒退或重复。
  if (typeof data.content === 'string' && data.content.length > (message.content || '').length) message.content = data.content
  scrollBottom()
}
function stopRunPolling() { if (runPollTimer) window.clearTimeout(runPollTimer); runPollTimer = 0 }
function finishRun() { stopRunPolling(); generating.value = false; activeRunId.value = '' }
async function stop() { if (!activeRunId.value) return; await stopConversationRun(activeRunId.value); activeStream.value?.abort?.(); finishRun(); await loadMessages() }
function fail(message, error) {
  // SSE 断开时不要立即把任务判失败；轮询通道会继续取回后端生成内容。
  if (activeRunId.value || message.runId) { startRunPolling(message); return }
  message.status = 'FAILED'; finishRun(); ElMessage.error(error?.message || '连接中断，请重试')
}
async function refreshConversations() { const p = await listConversations({ current: 1, size: 50, bizType: 'AI_DOCUMENT', bizId: current.value.id }); conversations.value = p?.records || [] }
function onKeydown(e) { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }
async function copy(text) { await navigator.clipboard.writeText(text || ''); ElMessage.success('已复制') }
async function loadArtifacts() { if (!current.value?.id) return; artifactLoading.value = true; try { const page = await listDocumentArtifacts({ documentId: current.value.id, current: 1, size: 100 }); artifacts.value = page?.records || [] } finally { artifactLoading.value = false } }
async function saveArtifact(message, format) { savingMessageId.value = message.id; try { await saveDocumentArtifact(current.value.id, { messageId: message.id, format, artifactName: current.value.solutionName, styleCode: 'BUSINESS' }); ElMessage.success(format === 'pdf' ? 'PDF已生成并保存' : 'Word已生成并保存'); await loadArtifacts(); artifactDrawer.value = true } finally { savingMessageId.value = '' } }
async function rebuildArtifact(item) { artifactBusyId.value = item.id; try { await regenerateDocumentArtifact(item.id); ElMessage.success('已生成新版本'); await loadArtifacts() } finally { artifactBusyId.value = '' } }
async function renameArtifact(item) { const { value } = await ElMessageBox.prompt('请输入新的成果名称', '重命名', { inputValue: item.artifactName, inputPattern: /\S+/, inputErrorMessage: '名称不能为空' }); await renameDocumentArtifact(item.id, value); ElMessage.success('重命名成功'); await loadArtifacts() }
async function removeArtifact(item) { await ElMessageBox.confirm(`确定删除“${item.artifactName}”V${item.versionNo}及其文件吗？`, '删除成果', { type: 'warning' }); await deleteDocumentArtifact(item.id); ElMessage.success('已删除'); await loadArtifacts() }
async function downloadArtifact(item) { const response = await fetch(documentArtifactDownloadUrl(item.id), { headers: { Authorization: `Bearer ${getToken()}` } }); if (!response.ok) return ElMessage.error('下载失败'); const blob = await response.blob(), url = URL.createObjectURL(blob), a = document.createElement('a'); a.href = url; a.download = `${item.artifactName}-V${item.versionNo}.${item.format === 'pdf' ? 'pdf' : 'docx'}`; a.click(); URL.revokeObjectURL(url) }
async function previewArtifact(item) { const response = await fetch(documentArtifactDownloadUrl(item.id), { headers: { Authorization: `Bearer ${getToken()}` } }); if (!response.ok) return ElMessage.error('预览失败'); const url = URL.createObjectURL(await response.blob()); window.open(url, '_blank', 'noopener'); setTimeout(() => URL.revokeObjectURL(url), 60000) }
function sizeText(bytes) { const n = Number(bytes || 0); return n < 1024 * 1024 ? `${Math.max(1, Math.round(n / 1024))}KB` : `${(n / 1024 / 1024).toFixed(1)}MB` }
async function scrollBottom() { await nextTick(); if (messageBox.value) messageBox.value.scrollTop = messageBox.value.scrollHeight }
function typeName(code, document) { return code === 'OTHER' ? (document?.solutionSubType || '其他') : (types.value.find(x => x.type === code)?.title || code || '通用文档') }
function providerName(provider) { return ({ doubao: '豆包', bailian: '百炼', qwen: '百炼', openai: 'OpenAI', deepseek: 'DeepSeek' }[String(provider || '').toLowerCase()] || provider || '') }
function modelDisplayName(value) { return providerName(value?.modelProvider || value?.provider) || value?.modelName || '系统默认模型' }
function timeText(value) { return value ? String(value).replace('T', ' ').slice(0, 16) : '' }
</script>

<style scoped>
.document-chat-page{height:100%;min-height:0;display:flex;overflow:hidden;background:#f4f6fa;color:#202b3c}.document-list{width:310px;flex:0 0 310px;min-height:0;padding:22px 18px;border-right:1px solid #e3e8f0;background:#fff;display:flex;flex-direction:column;gap:16px}.list-head{display:flex;align-items:center;justify-content:space-between}.list-head h2,.conversation-head h2{margin:0;font-size:20px}.list-head p,.conversation-head p{margin:5px 0 0;color:#8a96a8;font-size:12px}.documents{flex:1;min-height:0;overflow-y:auto;overflow-x:hidden;scrollbar-gutter:stable}.documents button{width:100%;padding:14px;margin-bottom:9px;text-align:left;border:1px solid transparent;border-radius:13px;background:#f7f9fc;cursor:pointer}.documents button:hover,.documents button.active{border-color:#8094ed;background:#f0f3ff}.documents strong,.documents span{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.documents strong{font-size:14px}.documents span{margin-top:8px;color:#8995a7;font-size:12px}.conversation-panel{min-width:0;min-height:0;flex:1;display:flex;flex-direction:column;overflow:hidden;background:#f6f8fc}.conversation-head{position:relative;z-index:2;min-height:76px;flex:0 0 auto;padding:14px 28px;border-bottom:1px solid #e3e8f0;background:#fff;display:grid;grid-template-columns:minmax(180px,1fr) auto;align-items:center;gap:24px}.conversation-title{min-width:0}.conversation-title h2{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.conversation-title p{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.head-actions{display:flex;flex:0 0 auto;align-items:center;justify-content:flex-end;gap:9px;white-space:nowrap}.messages{flex:1;min-height:0;overflow-y:auto;overflow-x:hidden;padding:26px max(34px,calc((100% - 920px)/2)) 34px;scrollbar-gutter:stable}.welcome{max-width:740px;margin:10vh auto 0;text-align:center}.ai-mark{width:58px;height:58px;margin:0 auto 18px;border-radius:18px;display:grid;place-items:center;background:linear-gradient(135deg,#3d56c7,#7557d9);color:#fff;font-weight:800;font-size:21px}.welcome h1,.empty-workspace h1{font-size:26px}.welcome p,.empty-workspace p{color:#7b8798;line-height:1.8}.suggestions{margin-top:26px;display:grid;gap:10px}.suggestions button{padding:14px 18px;text-align:left;border:1px solid #dfe5ee;border-radius:12px;background:#fff;cursor:pointer;color:#4d5b70}.suggestions button:hover{border-color:#7187e8;background:#f4f6ff}.message{display:flex;gap:12px;margin:0 auto 24px;max-width:920px}.message.user{flex-direction:row-reverse}.avatar{width:34px;height:34px;flex:0 0 34px;border-radius:10px;display:grid;place-items:center;background:#e9edff;color:#536fe5;font-size:12px;font-weight:700}.user .avatar{background:#e6f4ec;color:#369267}.bubble-wrap{min-width:0;max-width:84%}.bubble{padding:13px 16px;border-radius:5px 16px 16px;background:#fff;white-space:pre-wrap;overflow-wrap:anywhere;line-height:1.8;box-shadow:0 5px 20px rgba(36,52,82,.06)}.user .bubble{border-radius:16px 5px 16px 16px;background:#5874e8;color:#fff}.bubble i{display:inline-block;width:2px;height:16px;margin-left:4px;background:#607cf2;animation:blink 1s infinite}.message-actions{display:flex;align-items:center;gap:2px;min-height:32px;margin-top:7px;padding:0 6px;opacity:0;transition:opacity .18s ease}.message:hover .message-actions,.message-actions:focus-within{opacity:1}.file-chips,.pending-files{display:flex;flex-wrap:wrap;gap:7px;margin-bottom:8px}.file-chips span,.pending-files span{padding:6px 10px;border-radius:8px;background:#e9edf5;color:#526076;font-size:12px}.pending-files button{border:0;background:transparent;cursor:pointer}.composer{width:min(920px,calc(100% - 68px));flex:0 0 auto;margin:0 auto 22px;padding:12px 15px;border:1px solid #dce3ed;border-radius:16px;background:#fff;box-shadow:0 12px 34px rgba(36,53,86,.1)}.composer :deep(.el-textarea__inner){box-shadow:none}.composer-tools,.composer-tools>div{display:flex;align-items:center;justify-content:space-between}.context-state{font-size:12px;color:#6c788c}.context-state i{display:inline-block;width:7px;height:7px;margin-right:5px;border-radius:50%;background:#32ac72}.empty-workspace{min-height:0;flex:1;display:grid;align-content:center;justify-items:center;overflow:hidden;text-align:center}.empty-workspace .ai-mark{margin-bottom:0}@keyframes blink{50%{opacity:0}}@media(max-width:1100px){.conversation-head{grid-template-columns:minmax(0,1fr);gap:10px}.head-actions{justify-content:flex-start;overflow-x:auto;padding-bottom:1px}.conversation-head p{display:none}}@media(max-width:900px){.document-list{width:240px;flex-basis:240px}.messages{padding-right:24px;padding-left:24px}.composer{width:calc(100% - 48px)}}
.artifact-toolbar{display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;color:#7b8798;font-size:12px}.artifact-card{display:flex;gap:12px;padding:14px;margin-bottom:10px;border:1px solid #e2e7ef;border-radius:12px}.artifact-icon{width:44px;height:44px;display:grid;place-items:center;border-radius:10px;background:#eef2ff;color:#536fe5;font-weight:800}.artifact-main{min-width:0;flex:1}.artifact-main strong,.artifact-main span{display:block}.artifact-main strong{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.artifact-main span{margin:5px 0;color:#8a96a8;font-size:12px}
.stream-status{display:flex;justify-content:space-between;gap:20px;margin-bottom:8px;color:#6d7890;font-size:12px}
.model-tag{max-width:220px;overflow:hidden;text-overflow:ellipsis}.model-tag :deep(.el-tag__content){overflow:hidden;text-overflow:ellipsis}
.model-provider{float:right;margin-left:24px;color:#98a2b3}.model-lock-tip{margin-top:7px;color:#98a2b3;font-size:12px}
</style>
