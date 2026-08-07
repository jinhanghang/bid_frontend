<template>
  <el-drawer v-model="visible" size="520px" class="ai-chat-drawer" :with-header="false" destroy-on-close>
    <div class="chat-shell">
      <header class="chat-head">
        <div><strong>AI 文档助手</strong><span>默认使用豆包 · 支持连续追问</span></div>
        <div class="chat-head-actions">
          <el-dropdown trigger="click" @command="switchConversation">
            <el-button text>历史会话<el-icon><ArrowDown /></el-icon></el-button>
            <template #dropdown><el-dropdown-menu>
              <el-dropdown-item command="__new__">＋ 新建会话</el-dropdown-item>
              <el-dropdown-item v-for="item in conversations" :key="item.id" :command="item.id" :class="{ active: item.id === conversationId }">{{ item.title }}</el-dropdown-item>
            </el-dropdown-menu></template>
          </el-dropdown>
          <el-button text :icon="Close" @click="visible = false" />
        </div>
      </header>

      <main ref="messageBox" class="chat-messages">
        <div v-if="!messages.length" class="chat-welcome">
          <div class="welcome-mark"><el-icon><MagicStick /></el-icon></div>
          <h3>我可以协助完善这份文档</h3>
          <p>上传图片、PDF 或 Word 后直接提问，也可以让我改写章节、提炼要点或补充方案。</p>
          <button v-for="prompt in prompts" :key="prompt" @click="draft = prompt">{{ prompt }}</button>
        </div>
        <article v-for="message in messages" :key="message.id" class="chat-message" :class="message.role">
          <div class="chat-avatar">{{ message.role === 'user' ? '我' : 'AI' }}</div>
          <div class="chat-bubble">
            <div v-if="attachments[message.id]?.length" class="message-files">
              <span v-for="file in attachments[message.id]" :key="file.id"><el-icon><Paperclip /></el-icon>{{ file.fileName }}</span>
            </div>
            <div v-if="message.status === 'GENERATING'" class="generation-progress">
              <div class="progress-title"><strong>{{ message.progress?.stageText || '正在准备生成任务' }}</strong><span>{{ message.progress?.progress || 0 }}%</span></div>
              <el-progress :percentage="message.progress?.progress || 0" :stroke-width="6" :show-text="false" />
              <div class="progress-detail">
                <span v-if="message.progress?.currentPart">第 {{ message.progress.currentPart }}/{{ message.progress.totalParts }} 部分</span>
                <span>已生成 {{ formatNumber(message.progress?.generatedChars || message.content?.length || 0) }} 字</span>
                <span>用时 {{ formatElapsed(message.progress?.elapsedSeconds || 0) }}</span>
              </div>
              <div v-if="(message.progress?.elapsedSeconds || 0) >= 30 && !message.content" class="slow-tip">模型正在处理较长内容，请稍候…</div>
            </div>
            <div class="message-content">{{ message.content }}<i v-if="message.status === 'GENERATING'" class="typing-caret" /></div>
            <div v-if="message.role === 'assistant' && message.status !== 'GENERATING'" class="message-tools">
              <el-button link size="small" @click="copyText(message.content)">复制</el-button>
              <el-button link size="small" :disabled="generating" @click="regenerate(message)">重新生成</el-button>
            </div>
          </div>
        </article>
        <div v-if="loading" class="chat-loading">正在加载会话…</div>
      </main>

      <footer class="chat-composer">
        <div v-if="pendingFiles.length" class="pending-files">
          <span v-for="file in pendingFiles" :key="file.attachment.id">{{ file.attachment.fileName }}<button @click="removePending(file)">×</button></span>
        </div>
        <el-input v-model="draft" type="textarea" :autosize="{ minRows: 2, maxRows: 6 }" resize="none" placeholder="输入问题，Enter 发送，Shift+Enter 换行" @keydown="onKeydown" />
        <div class="composer-tools">
          <div>
            <el-upload :show-file-list="false" :http-request="uploadFile" accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.md,.csv" multiple>
              <el-button text :icon="Paperclip" :loading="uploading">添加文件或图片</el-button>
            </el-upload>
            <span class="model-label">豆包</span>
          </div>
          <el-button v-if="generating" type="danger" plain circle :icon="VideoPause" @click="stop" />
          <el-button v-else type="primary" circle :icon="Promotion" :disabled="!canSend" @click="send" />
        </div>
      </footer>
    </div>
  </el-drawer>
</template>

<script setup>
import { computed, nextTick, ref, watch } from 'vue'
import { ElMessage } from '@/plugins/element-plus-api'
import { ArrowDown, Close, MagicStick, Paperclip, Promotion, VideoPause } from '@element-plus/icons-vue'
import {
  createConversation, getConversationMessages, listConversations, regenerateConversationMessage,
  resumeConversationRun, stopConversationRun, streamConversationMessage, uploadConversationAttachment
} from '@/api/aiConversation'

const props = defineProps({ modelValue: Boolean, document: { type: Object, default: null } })
const emit = defineEmits(['update:modelValue'])
const visible = computed({ get: () => props.modelValue, set: (value) => emit('update:modelValue', value) })
const conversations = ref([]); const conversationId = ref(''); const messages = ref([]); const attachments = ref({})
const pendingFiles = ref([]); const draft = ref(''); const loading = ref(false); const uploading = ref(false)
const generating = ref(false); const activeRunId = ref(''); const activeStream = ref(null); const messageBox = ref()
let elapsedTimer = null
const prompts = ['根据当前文档，帮我梳理还缺少哪些核心内容', '把我选中的章节改得更专业、更有逻辑', '根据上传的参考文件提炼关键要求']
const canSend = computed(() => !generating.value && !uploading.value && (!!draft.value.trim() || pendingFiles.value.length > 0))

watch(() => [visible.value, props.document?.id], async ([open, id]) => { if (open && id) await initialize() }, { immediate: true })

async function initialize() {
  loading.value = true
  try {
    const page = await listConversations({ current: 1, size: 50, bizType: 'AI_DOCUMENT', bizId: props.document.id })
    conversations.value = page?.records || []
    if (!conversationId.value || !conversations.value.some((x) => x.id === conversationId.value)) {
      conversationId.value = conversations.value[0]?.id || (await newConversation()).id
    }
    await loadMessages()
  } finally { loading.value = false }
}

async function newConversation() {
  const value = await createConversation({ title: '新对话', bizType: 'AI_DOCUMENT', bizId: props.document.id, aiLevel: props.document.aiLevel || 'FLAGSHIP' })
  conversations.value.unshift(value); conversationId.value = value.id; messages.value = []; attachments.value = {}; return value
}
async function switchConversation(command) { if (command === '__new__') await newConversation(); else { conversationId.value = command; await loadMessages() } }
async function loadMessages() {
  const data = await getConversationMessages(conversationId.value)
  messages.value = data?.messages || []; attachments.value = data?.attachments || {}; await scrollBottom()
  const running = [...messages.value].reverse().find((x) => x.role === 'assistant' && x.status === 'GENERATING' && x.runId)
  if (running) { generating.value = true; activeRunId.value = running.runId; connectResume(running) }
}

async function uploadFile({ file }) {
  uploading.value = true
  try { pendingFiles.value.push(await uploadConversationAttachment(conversationId.value, file)); ElMessage.success('附件已就绪') }
  catch (error) { ElMessage.error(error.safeMessage || '附件上传失败') }
  finally { uploading.value = false }
}
function removePending(file) { pendingFiles.value = pendingFiles.value.filter((x) => x.attachment.id !== file.attachment.id) }

async function send() {
  if (!canSend.value) return
  const user = { id: `local-u-${Date.now()}`, role: 'user', content: draft.value.trim(), status: 'COMPLETE' }
  const assistant = generatingMessage()
  attachments.value[user.id] = pendingFiles.value.map((x) => x.attachment)
  const payload = { content: user.content, attachmentIds: pendingFiles.value.map((x) => x.attachment.id), maxOutputWords: 2000 }
  messages.value.push(user, assistant); draft.value = ''; pendingFiles.value = []; generating.value = true; await scrollBottom()
  try { activeStream.value = await streamConversationMessage(conversationId.value, payload, streamHandlers(assistant)) }
  catch (error) { failStream(assistant, error) }
}

async function regenerate(message) {
  const assistant = generatingMessage()
  messages.value.push(assistant); generating.value = true; await scrollBottom()
  try { activeStream.value = await regenerateConversationMessage(conversationId.value, message.id, 2000, streamHandlers(assistant)) }
  catch (error) { failStream(assistant, error) }
}

function streamHandlers(assistant) { return { onEvent(event, data) {
  if (event === 'start') { activeRunId.value = data.runId; assistant.id = data.messageId; assistant.runId = data.runId }
  if (event === 'progress' || event === 'heartbeat') assistant.progress = { ...(assistant.progress || {}), ...data }
  if (event === 'delta') { assistant.content += data.content || ''; scrollBottom() }
  if (event === 'model') assistant.modelName = data.modelName
  if (event === 'done' || event === 'stopped') { assistant.status = event === 'done' ? 'COMPLETE' : 'CANCELLED'; assistant.progress = { ...(assistant.progress || {}), ...data }; stopElapsedTimer(); generating.value = false; activeRunId.value = ''; refreshList() }
  if (event === 'error') { assistant.status = 'FAILED'; generating.value = false; activeRunId.value = ''; ElMessage.error(data.message || 'AI回复生成失败') }
}, onError(error) { failStream(assistant, error) } } }

async function connectResume(message) {
  message.progress ||= { stageText: '正在恢复生成进度', progress: 0, generatedChars: message.content?.length || 0, elapsedSeconds: 0 }
  startElapsedTimer(message)
  try { activeStream.value = await resumeConversationRun(message.runId, message.content?.length || 0, streamHandlers(message)) }
  catch (error) { failStream(message, error) }
}
async function stop() { if (!activeRunId.value) return; await stopConversationRun(activeRunId.value); activeStream.value?.abort?.(); stopElapsedTimer(); generating.value = false; activeRunId.value = ''; await loadMessages() }
function failStream(message, error) { message.status = 'FAILED'; stopElapsedTimer(); generating.value = false; activeRunId.value = ''; ElMessage.error(error?.message || '连接中断，可刷新后恢复') }
function generatingMessage() { const value = { id: `local-a-${Date.now()}`, role: 'assistant', content: '', status: 'GENERATING', progress: { stage: 'PREPARING', stageText: '正在准备生成任务', progress: 5, currentPart: 0, totalParts: 1, generatedChars: 0, elapsedSeconds: 0 } }; startElapsedTimer(value); return value }
function startElapsedTimer(message) { stopElapsedTimer(); elapsedTimer = window.setInterval(() => { if (message.status === 'GENERATING') message.progress.elapsedSeconds = (message.progress.elapsedSeconds || 0) + 1 }, 1000) }
function stopElapsedTimer() { if (elapsedTimer) window.clearInterval(elapsedTimer); elapsedTimer = null }
function formatNumber(value) { return Number(value || 0).toLocaleString('zh-CN') }
function formatElapsed(value) { const seconds = Math.max(0, Number(value || 0)); return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}` }
async function refreshList() { const page = await listConversations({ current: 1, size: 50, bizType: 'AI_DOCUMENT', bizId: props.document.id }); conversations.value = page?.records || [] }
function onKeydown(event) { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); send() } }
async function copyText(text) { await navigator.clipboard.writeText(text || ''); ElMessage.success('已复制') }
async function scrollBottom() { await nextTick(); if (messageBox.value) messageBox.value.scrollTop = messageBox.value.scrollHeight }
</script>

<style scoped>
.chat-shell{height:100%;display:flex;flex-direction:column;background:#f7f9fc}.chat-head{height:68px;padding:0 18px;border-bottom:1px solid #e8edf5;background:#fff;display:flex;align-items:center;justify-content:space-between}.chat-head strong{display:block;font-size:17px;color:#18233a}.chat-head span{display:block;margin-top:3px;font-size:12px;color:#8a97aa}.chat-head-actions{display:flex;align-items:center}.chat-messages{flex:1;overflow:auto;padding:22px 18px}.chat-welcome{text-align:center;padding:56px 28px;color:#65738a}.welcome-mark{width:52px;height:52px;margin:auto;border-radius:16px;display:grid;place-items:center;color:#fff;font-size:24px;background:linear-gradient(135deg,#5578f6,#7b5de8)}.chat-welcome h3{color:#24324a}.chat-welcome button{display:block;width:100%;margin:9px 0;padding:11px 14px;text-align:left;border:1px solid #e0e7f1;border-radius:12px;background:#fff;color:#526079;cursor:pointer}.chat-welcome button:hover{border-color:#7892f5;background:#f5f7ff}.chat-message{display:flex;gap:10px;margin-bottom:20px}.chat-message.user{flex-direction:row-reverse}.chat-avatar{width:32px;height:32px;flex:0 0 32px;border-radius:10px;display:grid;place-items:center;background:#e9edff;color:#536fe5;font-size:12px;font-weight:700}.chat-message.user .chat-avatar{background:#e9f6ef;color:#399267}.chat-bubble{max-width:82%}.message-content{white-space:pre-wrap;line-height:1.75;padding:11px 14px;border-radius:6px 16px 16px 16px;background:#fff;color:#26344b;box-shadow:0 4px 18px rgba(35,52,91,.06)}.user .message-content{border-radius:16px 6px 16px 16px;background:#607cf2;color:#fff}.message-files,.pending-files{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:7px}.message-files span,.pending-files span{padding:5px 9px;border-radius:8px;background:#edf1f8;color:#536177;font-size:12px}.message-tools{opacity:0;margin-top:4px}.chat-message:hover .message-tools{opacity:1}.typing-caret{display:inline-block;width:2px;height:15px;margin-left:3px;background:#607cf2;animation:blink 1s infinite}.chat-composer{padding:12px 16px 16px;border-top:1px solid #e6ebf3;background:#fff}.pending-files button{border:0;background:transparent;cursor:pointer}.composer-tools{margin-top:7px;display:flex;align-items:center;justify-content:space-between}.composer-tools>div{display:flex;align-items:center}.model-label{padding:4px 9px;border-radius:999px;background:#f0f3ff;color:#5c72dc;font-size:12px}.chat-loading{text-align:center;color:#8995a7}@keyframes blink{50%{opacity:0}}
.generation-progress{margin-bottom:8px;padding:12px 13px;border:1px solid #dfe6ff;border-radius:12px;background:linear-gradient(135deg,#f7f9ff,#f3f6ff)}.progress-title,.progress-detail{display:flex;align-items:center;justify-content:space-between;gap:10px}.progress-title{margin-bottom:8px;font-size:13px;color:#35466c}.progress-title span{color:#6178e4;font-weight:700}.progress-detail{margin-top:7px;justify-content:flex-start;flex-wrap:wrap;color:#7c899e;font-size:11px}.slow-tip{margin-top:8px;color:#9a7440;font-size:11px}
</style>
