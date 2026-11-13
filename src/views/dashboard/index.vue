<template>
  <BidHomeParseWorkspace v-if="parseProjectId" :key="`${owner}:${parseProjectId}`" :project-id="parseProjectId" :auto-start="route.query.autoStart === '1'" :options="form" @back="returnToHome" />
  <div v-else class="bid-home">
    <div class="home-orbit orbit-one" aria-hidden="true" />
    <div class="home-orbit orbit-two" aria-hidden="true" />
    <div class="home-content">
      <header class="home-heading">
        <div>
          <div class="heading-eyebrow"><span /> 鼎丰AI · 智能投标</div>
          <h1>您的<span>智能标书生成</span>助手</h1>
          <p>上传招标文件，开启您的标书编制。</p>
        </div>
        <button type="button" class="help-link" @click="openProjectList">
          <el-icon><FolderOpened /></el-icon> 我的标书 <el-icon><ArrowRight /></el-icon>
        </button>
      </header>

      <section class="generator-card" aria-label="生成标书">
        <div class="document-scene" aria-hidden="true"><div class="scene-ring" /><div class="scene-sheet"><span>AI</span><i /><i /><i /></div><div class="scene-base" /></div>
        <input ref="tenderInput" class="native-file-input" type="file" :accept="homeTenderAccept" aria-label="选择招标文件" @change="onTenderInput" />
        <input ref="checklistInput" class="native-file-input" type="file" accept=".doc,.docx,.xls,.xlsx,.pdf" aria-label="选择清单文件" @change="onChecklistInput" />
        <div class="upload-panel" :class="{ 'is-dragging': dragging, 'has-file': form.file }"
          role="button" tabindex="0" :aria-label="form.file ? '更换招标文件' : '上传招标文件'"
          @click="chooseTender" @keydown.enter.self.prevent="chooseTender" @keydown.space.self.prevent="chooseTender"
          @dragenter.prevent="dragging = true" @dragover.prevent="dragging = true" @dragleave.prevent="onDragLeave" @drop.prevent="onDrop">
          <div class="upload-folder" aria-hidden="true"><div class="folder-back" /><div class="folder-paper" /><div class="folder-front"><el-icon><Upload /></el-icon></div></div>
          <template v-if="form.file">
            <strong class="upload-title file-name">{{ form.file.name }}</strong>
            <p class="upload-description">{{ fileSize(form.file.size) }}<span class="description-divider">·</span>已选择，点击或拖拽可更换</p>
            <button type="button" class="remove-file" aria-label="移除招标文件" @click.stop="clearTender"><el-icon><Close /></el-icon></button>
          </template>
          <template v-else>
            <strong class="upload-title">上传招标文件</strong>
            <p class="upload-description">点击选择文件，或将文件拖拽到此处</p>
            <span class="upload-format">支持 DOC、DOCX、PDF 格式，单文件不超过 50MB</span>
          </template>
        </div>

        <div class="generator-options">
          <div class="option-field field-mode">
            <label><b>*</b> 生成方式</label>
            <el-select v-model="form.generationMode" class="mode-select" aria-label="生成方式">
              <template #prefix><el-icon><Upload /></el-icon></template>
              <el-option label="上传招标文件" value="UPLOAD" />
            </el-select>
          </div>
          <div class="option-field field-pages">
            <label><b>*</b> 标书页数</label>
            <el-popover v-model:visible="pagesVisible" placement="bottom-start" :width="pagePopoverWidth" trigger="click" popper-class="bid-home-pages-popover">
              <template #reference><button type="button" class="option-button" :aria-expanded="pagesVisible" aria-label="设置标书页数"><el-icon><Document /></el-icon><span>{{ form.pageCount }}页</span><el-icon class="select-arrow"><ArrowDown /></el-icon></button></template>
              <div class="pages-popover">
                <div class="pages-heading"><strong>标书页数</strong><label><input v-model.number="pageInput" type="number" min="20" max="5000" step="1" aria-label="自定义标书页数" @change="commitPageInput" @keydown.enter="commitPageInput" /> 页</label></div>
                <input :value="pageStep" type="range" min="0" :max="pageSteps.length - 1" step="1" aria-label="滑动选择标书页数" @input="choosePageStep" />
                <div class="page-ticks"><span v-for="n in [20, 200, 500, 1000, 2500, 5000]" :key="n" :style="{ left: `${pageSteps.indexOf(n) / (pageSteps.length - 1) * 100}%` }">{{ n }}</span></div>
                <div class="page-presets"><button v-for="n in [100, 200, 300, 500, 1000]" :key="n" type="button" :class="{ active: form.pageCount === n }" @click="setPageCount(n)">{{ n }}页</button></div>
              </div>
            </el-popover>
          </div>
          <div class="option-field field-type">
            <label><b>*</b> 标书类型</label>
            <el-select v-model="form.projectType" aria-label="标书类型">
              <template #prefix><el-icon><Collection /></el-icon></template>
              <el-option v-for="item in projectTypes" :key="item.value" :value="item.value" :label="item.label" />
            </el-select>
          </div>
          <div class="option-field field-checklist">
            <label>清单文件解析</label>
            <button type="button" class="option-button" :class="{ selected: form.checklistFile }" :title="form.checklistFile?.name" @click="checklistInput?.click()"><el-icon><Plus /></el-icon><span>{{ form.checklistFile?.name || checklistLabel }}</span></button>
          </div>
          <div class="option-field field-knowledge">
            <label>引用资料</label>
            <el-popover v-model:visible="knowledgeVisible" placement="bottom-start" :width="knowledgePopoverWidth" trigger="click" @show="openKnowledge">
              <template #reference><button type="button" class="option-button" :class="{ selected: form.knowledgeIds.length }" :title="selectedKnowledgeNames" aria-label="选择引用知识库" :aria-expanded="knowledgeVisible"><el-icon><FolderOpened /></el-icon><span>{{ form.knowledgeIds.length ? `已选 ${form.knowledgeIds.length} 个知识库` : '不引用资料' }}</span><el-icon class="select-arrow"><ArrowDown /></el-icon></button></template>
              <div class="knowledge-popover">
                <div class="knowledge-heading"><strong>引用知识库</strong><el-button link type="primary" :disabled="!form.knowledgeIds.length" @click="clearKnowledge">清空选择</el-button></div>
                <el-input v-model="knowledgeKeyword" clearable placeholder="搜索知识库名称" :prefix-icon="Search" @input="searchKnowledge" />
                <div v-loading="knowledgeLoading" class="knowledge-list">
                  <el-checkbox v-for="item in knowledgeRecords" :key="item.id" :model-value="form.knowledgeIds.includes(item.id)" @change="checked => toggleKnowledge(item, checked)"><span :title="item.name || item.kbName">{{ item.name || item.kbName || '未命名知识库' }}</span></el-checkbox>
                  <div v-if="!knowledgeLoading && knowledgeError" class="knowledge-empty">加载失败，<button type="button" @click="loadKnowledge(knowledgePage)">点击重试</button></div>
                  <div v-else-if="!knowledgeLoading && !knowledgeRecords.length" class="knowledge-empty">暂无可用知识库</div>
                </div>
                <div v-if="knowledgeTotal > 20" class="knowledge-pagination"><button type="button" :disabled="knowledgePage <= 1 || knowledgeLoading" @click="loadKnowledge(knowledgePage - 1)">上一页</button><span>{{ knowledgePage }} / {{ Math.ceil(knowledgeTotal / 20) }}</span><button type="button" :disabled="knowledgePage * 20 >= knowledgeTotal || knowledgeLoading" @click="loadKnowledge(knowledgePage + 1)">下一页</button></div>
                <p class="knowledge-foot">已选择 {{ form.knowledgeIds.length }} 个知识库</p>
              </div>
            </el-popover>
          </div>
        </div>

        <div class="generator-bottom">
          <div class="option-field field-tables">
            <label>表格</label>
            <el-select v-model="form.tableDensity" aria-label="表格数量">
              <template #prefix><el-icon><Grid /></el-icon></template>
              <el-option v-for="item in tableOptions" :key="item.value" :label="item.label" :value="item.value" />
            </el-select>
          </div>
          <div class="selection-notes" aria-live="polite">
            <span v-if="form.checklistFile" class="selection-chip"><el-icon><Document /></el-icon><span>{{ form.checklistFile.name }}</span><button type="button" aria-label="移除清单文件" @click="form.checklistFile = null"><el-icon><Close /></el-icon></button></span>
            <span v-if="form.knowledgeIds.length" class="reference-note" :title="selectedKnowledgeNames">已引用：{{ selectedKnowledgeNames }}</span>
          </div>
          <el-button type="primary" class="generate-button" :loading="openingWorkbench" @click="startGenerate"><el-icon v-if="!openingWorkbench"><Right /></el-icon><span>开始生成</span></el-button>
        </div>
      </section>

      <section class="recent-section" aria-label="最近标书">
        <div class="recent-heading"><h2>最近</h2><div><button type="button" class="refresh-recent" :disabled="loading" aria-label="刷新最近标书" @click="loadRecent"><el-icon :class="{ spinning: loading }"><Refresh /></el-icon></button><button type="button" class="all-projects" @click="openProjectList">全部标书 <el-icon><ArrowRight /></el-icon></button></div></div>
        <div v-if="loading && !recentProjects.length" class="recent-grid" aria-busy="true"><div v-for="n in 3" :key="n" class="project-skeleton"><span /><span /><span /></div></div>
        <div v-else-if="recentError" class="recent-empty"><p>最近标书加载失败</p><el-button text type="primary" @click="loadRecent">重新加载</el-button></div>
        <div v-else-if="recentProjects.length" class="recent-grid"><button v-for="item in recentProjects" :key="item.id" type="button" class="project-card" @click="openRecentProject(item)"><div class="project-card-top"><span class="project-mini-icon"><el-icon><Document /></el-icon></span><el-icon class="project-arrow"><TopRight /></el-icon></div><h3>{{ item.title || '未命名标书' }}</h3><span class="project-type">{{ projectTypeLabel(item.typeLabel) }}</span><div class="project-card-footer"><span class="project-status" :class="statusTone(item.status)"><i />{{ item.statusLabel || statusLabel(item.status) }}</span><time>{{ item.timeText || '—' }}</time></div></button></div>
        <div v-else class="recent-empty"><span class="empty-icon"><el-icon><Document /></el-icon></span><p>还没有标书，从上传第一份招标文件开始</p></div>
      </section>
    </div>
    <el-drawer v-model="projectListVisible" title="我的标书" size="min(640px, 96vw)">
      <div v-loading="projectListLoading" class="home-project-list"><button v-for="item in projectListRecords" :key="item.id" type="button" @click="openProjectFromList(item)"><strong>{{ item.projectName }}</strong><span>{{ projectTypeLabel(item.projectType) }} · {{ String(item.updateTime || '').replace('T', ' ').slice(0, 16) }}</span><el-icon><ArrowRight /></el-icon></button><el-empty v-if="!projectListLoading && !projectListRecords.length && !projectListError" description="暂无标书" /><div v-if="projectListError" class="knowledge-empty">标书加载失败，<button type="button" @click="loadProjectPage(projectListPage)">重新加载</button></div></div>
      <div class="home-list-pagination"><el-button :disabled="projectListPage <= 1 || projectListLoading" @click="loadProjectPage(projectListPage - 1)">上一页</el-button><span>{{ projectListPage }} / {{ Math.max(1, Math.ceil(projectListTotal / 12)) }}</span><el-button :disabled="projectListPage * 12 >= projectListTotal || projectListLoading" @click="loadProjectPage(projectListPage + 1)">下一页</el-button></div>
    </el-drawer>
    <el-dialog v-model="scopeVisible" title="确认项目所属企业" width="min(440px, 94vw)" :close-on-click-modal="false">
      <div class="home-scope-fields"><label>所属企业</label><el-select v-model="scopeForm.enterpriseId" filterable remote :remote-method="searchEnterprises" :loading="scopeLoading" placeholder="搜索并选择企业" @change="onScopeEnterpriseChange"><el-option v-for="item in enterpriseChoices" :key="item.id" :label="item.enterpriseName || item.name" :value="item.id" /></el-select><label>项目负责人</label><el-select v-model="scopeForm.ownerUserId" filterable :disabled="!scopeForm.enterpriseId" :loading="ownerLoading" placeholder="请选择项目负责人"><el-option v-for="item in ownerChoices" :key="item.id" :label="item.fullName || item.username || item.phone" :value="item.id" /></el-select></div>
      <template #footer><el-button @click="scopeVisible = false">取消</el-button><el-button type="primary" :loading="openingWorkbench" @click="uploadAndOpenParse">开始解析</el-button></template>
    </el-dialog>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from '@/plugins/element-plus-api'
import { ElPopover } from 'element-plus/es/components/popover/index'
import { ArrowDown, ArrowRight, Close, Collection, Document, FolderOpened, Grid, Plus, Refresh, Right, Search, TopRight, Upload } from '@element-plus/icons-vue'
import { getDashboardSummary } from '@/api/dashboard'
import { pageKnowledgeBases } from '@/api/knowledge'
import { useAuthStore } from '@/stores/auth'
import { getBidHomeDraft, saveBidHomeDraft, homeTenderAccept, validateHomeTender } from '@/utils/bidHomeDraft'
import BidHomeParseWorkspace from './components/BidHomeParseWorkspace.vue'
import { uploadTenderProject, pageBidProjects } from '@/api/bidProject'
import { pageEnterprises } from '@/api/enterprise'
import { pageUsers } from '@/api/systemUser'
import { findHomeUpload, rememberHomeUpload } from '@/utils/bidHomeParse'

const auth = useAuthStore()
const router = useRouter()
const route = useRoute()
const parseProjectId = computed(() => route.query.step === 'parse' ? String(route.query.projectId || '') : '')
const projectListVisible = ref(false)
const projectListLoading = ref(false)
const projectListError = ref(false)
const projectListRecords = ref([])
const projectListPage = ref(1)
const projectListTotal = ref(0)
let projectListSequence = 0
const scopeVisible = ref(false)
const scopeForm = reactive({ enterpriseId: '', ownerUserId: '' })
const enterpriseChoices = ref([])
const ownerChoices = ref([])
const scopeLoading = ref(false)
const ownerLoading = ref(false)
let scopeSequence = 0
const isPlatformUser = computed(() => (auth.user?.roles || auth.user?.roleCodes || []).some(item => ['SUPERADMIN', 'PLATFORMADMIN'].includes(String(typeof item === 'string' ? item : item.code || item.roleCode || '').toUpperCase().replace(/[^A-Z0-9]/g, ''))))
const owner = computed(() => String(auth.user?.id || ''))
const form = reactive(getBidHomeDraft(owner.value))
const tenderInput = ref(null)
const checklistInput = ref(null)
const dragging = ref(false)
const pagesVisible = ref(false)
const knowledgeVisible = ref(false)
const openingWorkbench = ref(false)
const loading = ref(false)
const recentError = ref(false)
const recentProjects = ref([])
const pageInput = ref(form.pageCount)
const pageSteps = [20, 40, 80, 100, 120, 160, 200, 300, 400, 500, 800, 1000, 1500, 2000, 2500, 3000, 3500, 4000, 4500, 5000]
const projectTypes = [{ value: 'SERVICE', label: '服务类' }, { value: 'GOODS', label: '货物类' }, { value: 'ENGINEERING', label: '工程类' }, { value: 'OTHER', label: '其他' }]
const tableOptions = [{ value: 'NONE', label: '无表格' }, { value: 'LESS', label: '少量表格' }, { value: 'MEDIUM', label: '适量表格' }, { value: 'MORE', label: '大量表格' }]
const checklistLabel = computed(() => ({ SERVICE: '上传服务清单', GOODS: '上传采购清单', ENGINEERING: '上传工程清单', OTHER: '上传清单文件' }[form.projectType]))
const pageStep = computed(() => pageSteps.reduce((best, n, index) => Math.abs(n - form.pageCount) < Math.abs(pageSteps[best] - form.pageCount) ? index : best, 0))
const viewportWidth = ref(window.innerWidth)
const pagePopoverWidth = computed(() => Math.min(580, viewportWidth.value - 32))
const knowledgePopoverWidth = computed(() => Math.min(350, viewportWidth.value - 32))
const selectedKnowledgeNames = computed(() => form.knowledgeIds.map(id => form.knowledgeOptions.find(item => item.id === id)?.name || '知识库').join('、'))
const knowledgeKeyword = ref('')
const knowledgeRecords = ref([])
const knowledgeTotal = ref(0)
const knowledgePage = ref(1)
const knowledgeLoading = ref(false)
const knowledgeError = ref(false)
let knowledgeTimer
let knowledgeSequence = 0
let recentSequence = 0
let disposed = false

watch(form, () => saveBidHomeDraft(owner.value, form), { deep: true })
watch(owner, () => {
  scopeSequence += 1
  projectListSequence += 1
  projectListVisible.value = false
  projectListRecords.value = []
  scopeVisible.value = false
  scopeForm.enterpriseId = ''
  scopeForm.ownerUserId = ''
  if (parseProjectId.value) router.replace({ path: '/dashboard' })
  knowledgeSequence += 1
  clearTimeout(knowledgeTimer)
  Object.assign(form, getBidHomeDraft(owner.value))
  pageInput.value = form.pageCount
  knowledgeRecords.value = []
  knowledgeKeyword.value = ''
  knowledgeTotal.value = 0
  knowledgePage.value = 1
  knowledgeLoading.value = false
  knowledgeError.value = false
  knowledgeVisible.value = false
  recentProjects.value = []
  loadRecent()
})
onMounted(() => { loadRecent(); window.addEventListener('resize', onResize) })
onBeforeUnmount(() => { disposed = true; knowledgeSequence += 1; recentSequence += 1; projectListSequence += 1; clearTimeout(knowledgeTimer); window.removeEventListener('resize', onResize) })
function onResize() { viewportWidth.value = window.innerWidth }
function chooseTender() { if (!openingWorkbench.value) tenderInput.value?.click() }
function onTenderInput(event) { const file = event.target.files?.[0]; if (file) selectTender(file); event.target.value = '' }
function selectTender(file) { if (openingWorkbench.value) return; const error = validateHomeTender(file); if (error) return ElMessage.warning(error); form.file = file }
function clearTender() { form.file = null; if (tenderInput.value) tenderInput.value.value = '' }
function onDragLeave(event) { if (!event.currentTarget.contains(event.relatedTarget)) dragging.value = false }
function onDrop(event) { dragging.value = false; const files = event.dataTransfer?.files; if (!files?.length) return; if (files.length > 1) return ElMessage.warning('一次请选择一份招标文件'); selectTender(files[0]) }
function fileSize(size) { return size >= 1024 * 1024 ? `${(size / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.ceil(size / 1024))} KB` }
function onChecklistInput(event) {
  const file = event.target.files?.[0]
  event.target.value = ''
  if (!file) return
  if (!/\.(doc|docx|xls|xlsx|pdf)$/i.test(file.name)) return ElMessage.warning('清单文件支持 Word、Excel、PDF 格式')
  if (!file.size || file.size > 50 * 1024 * 1024) return ElMessage.warning('请选择非空且不超过50MB的清单文件')
  form.checklistFile = file
}
function setPageCount(value) { form.pageCount = Math.min(5000, Math.max(20, Math.round(Number(value) || 200))); pageInput.value = form.pageCount }
function choosePageStep(event) { setPageCount(pageSteps[Number(event.target.value)]) }
function commitPageInput() { setPageCount(pageInput.value) }
function clearKnowledge() { form.knowledgeIds = []; form.knowledgeOptions = [] }
function toggleKnowledge(item, checked) {
  if (checked && !form.knowledgeIds.includes(item.id)) { form.knowledgeIds.push(item.id); form.knowledgeOptions.push({ id: item.id, name: item.name || item.kbName || '未命名知识库' }) }
  if (!checked) { form.knowledgeIds = form.knowledgeIds.filter(id => id !== item.id); form.knowledgeOptions = form.knowledgeOptions.filter(value => value.id !== item.id) }
}
function openKnowledge() { if (!knowledgeRecords.value.length) loadKnowledge(1) }
function searchKnowledge() { clearTimeout(knowledgeTimer); knowledgeSequence += 1; knowledgeTimer = setTimeout(() => loadKnowledge(1), 300) }
async function loadKnowledge(page = 1) {
  const sequence = ++knowledgeSequence
  knowledgeLoading.value = true
  knowledgeError.value = false
  try {
    const response = await pageKnowledgeBases({ pageNum: page, pageSize: 20, status: 1, keyword: knowledgeKeyword.value.trim() || undefined, includePersonal: true })
    if (disposed || sequence !== knowledgeSequence) return
    knowledgeRecords.value = response?.records || []
    knowledgeTotal.value = response?.total || 0
    knowledgePage.value = page
  } catch (_) { if (!disposed && sequence === knowledgeSequence) { knowledgeRecords.value = []; knowledgeError.value = true } }
  finally { if (!disposed && sequence === knowledgeSequence) knowledgeLoading.value = false }
}
async function loadRecent() {
  const sequence = ++recentSequence
  loading.value = true
  recentError.value = false
  try {
    const response = await getDashboardSummary()
    if (!disposed && sequence === recentSequence) recentProjects.value = response?.recentProjects || []
  } catch (_) { if (!disposed && sequence === recentSequence) recentError.value = true }
  finally { if (!disposed && sequence === recentSequence) loading.value = false }
}
function openProjectList() { projectListVisible.value = true; loadProjectPage(1) }
async function loadProjectPage(page = 1) {
  const sequence = ++projectListSequence
  projectListLoading.value = true
  projectListError.value = false
  try {
    const response = await pageBidProjects({ pageNum: page, pageSize: 12 })
    if (!disposed && sequence === projectListSequence) { projectListRecords.value = response?.records || []; projectListTotal.value = response?.total || 0; projectListPage.value = page }
  } catch (_) { if (!disposed && sequence === projectListSequence) projectListError.value = true }
  finally { if (!disposed && sequence === projectListSequence) projectListLoading.value = false }
}
function openProjectFromList(item) { projectListVisible.value = false; openParse(item.id) }
async function startGenerate() {
  if (openingWorkbench.value) return
  const error = validateHomeTender(form.file)
  if (error) { ElMessage.warning(error); if (!form.file) chooseTender(); return }
  if (!owner.value) return ElMessage.warning('登录状态已失效，请重新登录')
  saveBidHomeDraft(owner.value, form)
  const existing = findHomeUpload(owner.value, form.file)
  if (existing) { await openParse(existing); return }
  if (isPlatformUser.value) { scopeVisible.value = true; searchEnterprises(''); return }
  await uploadAndOpenParse()
}
async function uploadAndOpenParse() {
  if (openingWorkbench.value) return
  if (isPlatformUser.value && (!scopeForm.enterpriseId || !scopeForm.ownerUserId)) return ElMessage.warning('请选择所属企业和项目负责人')
  openingWorkbench.value = true
  const requestOwner = owner.value
  const file = form.file
  try {
    const body = new FormData()
    body.append('file', file)
    if (isPlatformUser.value) { body.append('enterpriseId', scopeForm.enterpriseId); body.append('ownerUserId', scopeForm.ownerUserId) }
    const result = await uploadTenderProject(body)
    if (disposed || requestOwner !== owner.value) return
    const projectId = result?.project?.id
    if (!projectId) throw new Error('上传成功但未返回项目编号，请刷新首页查看最近标书')
    rememberHomeUpload(owner.value, file, projectId)
    scopeVisible.value = false
    await openParse(projectId, true)
  } catch (error) { if (!error.__alreadyNotified) ElMessage.error(error.message || '招标文件上传失败，请重试') }
  finally { if (!disposed) openingWorkbench.value = false }
}
function openParse(projectId, autoStart = false) { return router.replace({ path: '/dashboard', query: { step: 'parse', projectId, ...(autoStart ? { autoStart: '1' } : {}) } }) }
function returnToHome() { router.replace({ path: '/dashboard' }); loadRecent() }
function openRecentProject(item) { openParse(item.id) }
async function searchEnterprises(keyword) {
  const sequence = ++scopeSequence
  scopeLoading.value = true
  try { const response = await pageEnterprises({ pageNum: 1, pageSize: 20, keyword: keyword || undefined, status: 1 }); if (!disposed && sequence === scopeSequence) enterpriseChoices.value = response?.records || [] }
  catch (_) { /* 全局请求提示。 */ }
  finally { if (!disposed && sequence === scopeSequence) scopeLoading.value = false }
}
async function onScopeEnterpriseChange(id) {
  scopeForm.ownerUserId = ''
  ownerChoices.value = []
  if (!id) return
  ownerLoading.value = true
  const userId = owner.value
  try { const response = await pageUsers({ pageNum: 1, pageSize: 100, enterpriseId: id, status: 1 }); if (!disposed && userId === owner.value && id === scopeForm.enterpriseId) ownerChoices.value = response?.records || [] }
  catch (_) { /* 全局请求提示。 */ }
  finally { if (!disposed && userId === owner.value && id === scopeForm.enterpriseId) ownerLoading.value = false }
}
function projectTypeLabel(value) { return projectTypes.find(item => item.value === String(value || '').toUpperCase())?.label || value || '标书项目' }
function statusTone(status) { const value = String(status || '').toUpperCase(); if (['EXPORTED', 'GENERATED', 'COMPLETED', 'SUCCESS'].includes(value)) return 'success'; if (['GENERATING', 'PARSING', 'RUNNING', 'CONTENT_GENERATING', 'OUTLINE_GENERATING'].includes(value)) return 'warning'; if (value === 'FAILED') return 'danger'; return 'info' }
function statusLabel(status) { return ({ EXPORTED: '已导出', GENERATED: '已生成', COMPLETED: '已完成', GENERATING: '生成中', PARSING: '解析中', RUNNING: '处理中', FAILED: '生成失败', MATERIAL_READY: '待解析', DRAFT: '待编制' }[String(status || '').toUpperCase()] || '待编制') }
</script>

<style scoped>
.bid-home{position:relative;isolation:isolate;min-height:100%;margin:0 -24px -24px;padding:20px 42px 56px;overflow:hidden;background:radial-gradient(ellipse at 91% 59%,#dcd9f1a3 0,transparent 46%),radial-gradient(ellipse at 24% 5%,#e7e5fc91 0,transparent 45%),linear-gradient(125deg,#f7f7fc 2%,#eff0f9 48%,#f2f2fc 100%);color:#1d2535;font-family:Inter,"PingFang SC","Microsoft YaHei",sans-serif}
.bid-home *{box-sizing:border-box}.home-content{position:relative;z-index:1;max-width:1640px;margin:0 auto}.home-orbit{position:absolute;z-index:0;pointer-events:none;border:1px solid #b2aaf030;border-radius:50%;box-shadow:0 13px 3px -10px #afa4ef48}.orbit-one{width:660px;height:320px;top:-245px;left:8%;transform:rotate(14deg);background:linear-gradient(135deg,#eeedf900,#d4d2f42b)}.orbit-two{width:138px;height:70px;top:4px;right:25%;transform:rotate(-32deg);background:#c9c4f415}.home-heading{display:flex;align-items:center;justify-content:space-between;gap:20px;margin:5px 0 30px}.heading-eyebrow{display:flex;align-items:center;gap:8px;margin-bottom:12px;font-size:12px;font-weight:600;color:#77788d;letter-spacing:1.6px}.heading-eyebrow>span{width:7px;height:7px;border-radius:50%;background:#7c63fc;box-shadow:0 0 0 4px #7c63fc13}.home-heading h1{margin:0;font-size:clamp(26px,2.7vw,38px);line-height:1.4;font-weight:800;letter-spacing:-1px}.home-heading h1>span{color:#7760ff}.home-heading p{margin:10px 0 0;color:#86869b;font-size:14px}.help-link,.all-projects,.refresh-recent{display:inline-flex;align-items:center;gap:8px;border:0;background:transparent;color:#71678e;cursor:pointer;font-size:13px;font-family:inherit}.help-link{align-self:flex-end;padding:10px 0}.help-link:hover,.all-projects:hover{color:#7555fb}.generator-card{position:relative;border:2px solid #fff;border-radius:12px;padding:26px 30px 25px;background:#ffffff65;box-shadow:0 4px 6px #3b3f6c13,0 18px 38px #565b8210;backdrop-filter:blur(6px)}.native-file-input{position:absolute;width:1px;height:1px;opacity:0;pointer-events:none}.upload-panel{position:relative;z-index:1;min-height:235px;padding:30px 50px;display:flex;align-items:center;justify-content:center;flex-direction:column;border:2px solid #fff;border-radius:8px;background:linear-gradient(120deg,#f7f5fd80,#f1effc65);box-shadow:0 3px 5px #7b62e512;cursor:pointer;transition:border-color .18s,background .18s,box-shadow .18s;outline:none}.upload-panel:hover,.upload-panel:focus-visible,.upload-panel.is-dragging{border-color:#a490ff;background:#f2edffb3;box-shadow:0 0 0 4px #8161ff10}.upload-folder{position:relative;width:64px;height:58px;margin-bottom:17px;transform:rotate(-4deg)}.folder-back{position:absolute;inset:9px 1px 1px;border-radius:4px;background:linear-gradient(135deg,#9662ff,#5443fa)}.folder-back:before{content:"";position:absolute;width:28px;height:10px;top:-5px;right:0;border-radius:6px 6px 0 0;background:#694bff}.folder-paper{position:absolute;left:5px;right:6px;top:13px;height:34px;border:2px solid #fff;border-radius:2px;background:linear-gradient(135deg,#fff,#dcd4ff);box-shadow:0 -4px 0 -1px #ffffffb3;transform:rotate(1deg)}.folder-front{position:absolute;left:0;right:0;bottom:0;height:38px;display:flex;align-items:center;justify-content:center;color:white;font-size:24px;border:1px solid #cfbdff;border-radius:3px 3px 5px 5px;background:linear-gradient(180deg,#c4b4ff95,#7150ffe6);box-shadow:0 7px 17px #7654ee20;transform:skewX(-2deg)}.upload-title{max-width:95%;font-size:20px;font-weight:600;line-height:1.5;color:#30313e}.file-name{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.upload-description{margin:12px 0 0;font-size:13px;line-height:1.7;color:#73758b}.upload-format{margin-top:5px;color:#9090a5;font-size:12px}.description-divider{margin:0 10px;color:#aaa2c4}.remove-file{position:absolute;right:16px;top:16px;display:grid;place-items:center;width:28px;height:28px;border:0;border-radius:50%;color:#8c83a4;background:#ffffffad;cursor:pointer}.remove-file:hover{color:#e85f68;background:#fff}.generator-options{position:relative;z-index:2;display:flex;align-items:flex-start;flex-wrap:wrap;gap:22px;margin-top:27px}.option-field{display:flex;flex-direction:column;gap:9px;min-width:0}.option-field>label{font-size:14px;color:#363643;line-height:21px}.option-field>label>b{color:#ff616d;font-weight:400}.field-mode{width:177px}.field-pages{width:134px}.field-type{width:135px}.field-checklist{width:163px}.field-knowledge{width:180px}.field-tables{width:154px;flex-shrink:0}.option-button{display:flex;align-items:center;gap:9px;width:100%;height:45px;padding:0 14px;border:1px solid #dcdbe4;border-radius:6px;color:#393847;background:#fff;box-shadow:0 2px 2px #22223e04;cursor:pointer;font-size:14px;font-family:inherit;text-align:left;transition:border-color .18s,box-shadow .18s}.option-button>span{flex:1;min-width:0;overflow:hidden;white-space:nowrap;text-overflow:ellipsis}.option-button>.el-icon{flex-shrink:0;font-size:17px}.option-button>.select-arrow{font-size:13px;margin-left:auto;color:#77758b}.option-button:hover{border-color:#aa98fc}.option-button.selected{border-color:#c1afff;color:#7758e9;background:#fcfaff}.option-field :deep(.el-select){width:100%}.option-field :deep(.el-select__wrapper){min-height:45px;border-radius:6px;padding:8px 14px;box-shadow:0 0 0 1px #dcdbe4 inset,0 2px 2px #22223e04;background:#fff;font-size:14px}.option-field :deep(.el-select__placeholder){color:#393847}.option-field :deep(.el-select__prefix){color:#49465c;font-size:17px}.option-field :deep(.el-select__wrapper.is-focused){box-shadow:0 0 0 1px #8b6aff inset}.mode-select :deep(.el-select__wrapper){background:#efebff;box-shadow:0 0 0 1px #8c6bff inset}.mode-select :deep(.el-select__placeholder),.mode-select :deep(.el-select__prefix),.mode-select :deep(.el-select__caret){color:#8462ff}.generator-bottom{position:relative;z-index:2;display:flex;align-items:flex-end;gap:20px;margin-top:20px}.selection-notes{flex:1;min-width:0;display:flex;align-items:flex-end;flex-wrap:wrap;gap:8px;padding-bottom:4px}.selection-chip{display:inline-flex;align-items:center;gap:6px;max-width:260px;padding:7px 8px;border-radius:5px;background:#eee9fc;color:#7e65ab;font-size:12px}.selection-chip>span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.selection-chip>button{display:flex;padding:0;background:none;border:0;color:inherit;cursor:pointer}.reference-note{max-width:100%;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;color:#8b819f;font-size:12px;line-height:28px}.generate-button.el-button{height:45px;min-width:135px;margin-left:auto;padding:0 22px;gap:9px;border:0;border-radius:8px;background:linear-gradient(110deg,#974cff,#5744ff);color:#fff;font-size:15px;font-weight:600;box-shadow:0 6px 15px #754bf21f;transition:transform .18s,box-shadow .18s}.generate-button.el-button:hover{background:linear-gradient(110deg,#a15aff,#6756ff);transform:translateY(-1px);box-shadow:0 8px 20px #754bf233}.generate-button :deep(.el-icon){margin-right:7px;font-size:18px}.document-scene{position:absolute;pointer-events:none;right:-21px;top:-65px;width:315px;height:385px;opacity:.14;z-index:0;transform:rotate(9deg);filter:blur(.6px)}.scene-sheet{position:absolute;top:35px;right:30px;width:188px;height:249px;border:5px solid #8f72e1;border-radius:20px;background:linear-gradient(135deg,#fff,#d3c5fc);box-shadow:17px 25px 0 #baa4fb4d;transform:skewY(6deg)}.scene-sheet>span{display:block;margin:45px 25px 20px;text-align:center;border-radius:13px;background:#a88beb61;color:#8a65e0;font-size:62px;font-weight:800;line-height:96px}.scene-sheet>i{display:block;height:6px;margin:11px 28px;border-radius:6px;background:#b498ed}.scene-sheet>i:last-child{width:65px}.scene-ring{position:absolute;top:120px;right:-14px;width:330px;height:144px;border:6px solid #9b7fe6;border-top-color:transparent;border-radius:50%;transform:rotate(-14deg)}.scene-base{position:absolute;bottom:25px;right:-12px;width:305px;height:65px;background:linear-gradient(135deg,#d9cbfc,#a88de7);border-radius:12px;transform:skewY(-14deg)}.recent-section{margin-top:42px}.recent-heading{display:flex;align-items:center;justify-content:space-between;margin-bottom:22px}.recent-heading h2{margin:0;font-size:20px;font-weight:700}.recent-heading>div{display:flex;align-items:center;gap:16px}.refresh-recent{padding:5px}.refresh-recent:disabled{opacity:.5;cursor:default}.all-projects{font-size:12px}.recent-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:20px}.project-card{min-height:195px;display:flex;flex-direction:column;align-items:flex-start;padding:21px 24px;border:1px solid #fff;border-radius:10px;background:#ffffffb0;box-shadow:0 5px 15px #41456608;cursor:pointer;text-align:left;font:inherit;transition:transform .18s,box-shadow .18s,border-color .18s;overflow:hidden}.project-card:hover{transform:translateY(-3px);border-color:#d7caff;box-shadow:0 12px 25px #78619513}.project-card-top{display:flex;align-items:center;justify-content:space-between;width:100%}.project-mini-icon{display:grid;place-items:center;width:28px;height:28px;border-radius:7px;background:#eee9ff;color:#8a6ae9}.project-arrow{color:#c3b8d5;font-size:15px}.project-card h3{display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:2;overflow:hidden;min-height:44px;margin:13px 0 14px;color:#252a3b;font-size:15px;line-height:1.5;font-weight:600;overflow-wrap:anywhere}.project-type{display:inline-block;padding:5px 13px;background:#efebfe;border-radius:4px;color:#8a6af8;font-size:12px;line-height:1.4}.project-card-footer{display:flex;align-items:center;justify-content:space-between;gap:8px;width:100%;margin-top:20px}.project-status{display:flex;align-items:center;gap:5px;color:#9a91b0;font-size:11px;white-space:nowrap}.project-status>i{width:7px;height:7px;border-radius:50%;background:currentColor}.project-status.success{color:#3db895}.project-status.warning{color:#ef9b42}.project-status.danger{color:#e5757d}.project-card time{color:#9390a7;font-size:11px;white-space:nowrap}.recent-empty{display:flex;align-items:center;justify-content:center;flex-direction:column;min-height:150px;padding:24px;border:1px dashed #dcd6ec;border-radius:10px;background:#ffffff45;color:#9d95b0;font-size:13px}.recent-empty p{margin:10px 0}.empty-icon{font-size:26px;color:#b9abd5}.project-skeleton{height:213px;padding:28px 24px;border:1px solid #fff;border-radius:10px;background:#ffffff80}.project-skeleton>span{display:block;height:16px;margin-bottom:24px;background:linear-gradient(90deg,#efecf8,#f8f6fe,#efecf8);background-size:200%;animation:shimmer 1.5s infinite;border-radius:4px}.project-skeleton>span:nth-child(2){width:65%}.project-skeleton>span:nth-child(3){width:35%}.spinning{animation:spin 1s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}@keyframes shimmer{to{background-position:-200% 0}}
.pages-popover{padding:7px 8px 9px;color:#454052;font-family:"Microsoft YaHei",sans-serif}.pages-heading{display:flex;align-items:center;justify-content:space-between;gap:12px;font-size:13px}.pages-heading>label{font-size:12px;color:#8b829f}.pages-heading input{width:78px;padding:5px 8px;border:1px solid #e0d9ee;border-radius:5px;text-align:center;color:#7952e8;outline:none}.pages-heading input:focus{border-color:#9a7af8}.pages-popover>input[type=range]{width:100%;height:7px;margin:27px 0 12px;accent-color:#8b68ff;cursor:pointer}.page-ticks{position:relative;height:15px;color:#9c94ab;font-size:10px}.page-ticks>span{position:absolute;transform:translateX(-50%)}.page-ticks>span:first-child{transform:none}.page-ticks>span:last-child{transform:translateX(-100%)}.page-presets{display:flex;flex-wrap:wrap;gap:7px;margin-top:18px}.page-presets>button{padding:5px 10px;border:0;border-radius:5px;background:#f5f2fc;color:#8b7fa3;cursor:pointer;font-family:inherit;font-size:12px}.page-presets>button.active{color:#8056ed;background:#ede5ff}.knowledge-popover{padding:2px;color:#52485e}.knowledge-heading{display:flex;align-items:center;justify-content:space-between;margin:0 0 10px;font-size:14px}.knowledge-list{min-height:92px;max-height:240px;overflow:auto;padding-top:8px}.knowledge-list :deep(.el-checkbox){display:flex;margin:0;padding:7px 4px;height:auto;min-height:34px;white-space:normal}.knowledge-list :deep(.el-checkbox__label){min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#746a83;font-size:13px}.knowledge-empty{padding:26px 5px;text-align:center;color:#aaa0b6;font-size:12px}.knowledge-empty>button{border:0;padding:0;background:transparent;color:#8962ee;cursor:pointer}.knowledge-pagination{display:flex;align-items:center;justify-content:space-between;margin-top:9px;color:#a497b5;font-size:11px}.knowledge-pagination>button{border:0;border-radius:4px;background:#f2edf9;color:#9178bc;padding:5px 9px;cursor:pointer}.knowledge-pagination>button:disabled{opacity:.4;cursor:default}.knowledge-foot{margin:11px 0 0;padding-top:9px;border-top:1px solid #f0ebf6;color:#9d91ac;font-size:11px}
@media(min-width:1600px){.bid-home{padding-left:46px;padding-right:46px}.generator-card{padding:28px 32px 26px}.upload-panel{min-height:245px}.generator-options{gap:23px}.recent-grid{grid-template-columns:repeat(4,minmax(0,1fr))}.document-scene{right:-28px;width:350px;transform:scale(1.12) rotate(9deg)}}
@media(max-width:1200px){.bid-home{padding:16px 26px 40px}.generator-card{padding:22px}.generator-options{gap:18px}.field-mode{width:171px}.field-pages{width:129px}.field-type{width:130px}.field-checklist{width:155px}.field-knowledge{width:170px}.recent-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.home-heading h1{font-size:30px}.document-scene{right:-70px}}
@media(max-width:900px){.bid-home{margin:0 -14px -16px}}
@media(max-width:720px){.bid-home{margin:0 -14px -16px;padding:14px 18px 32px}.home-heading{gap:10px;margin-bottom:21px}.heading-eyebrow{font-size:10px;margin-bottom:10px;letter-spacing:.5px}.home-heading h1{font-size:26px;max-width:285px;letter-spacing:-.8px}.home-heading p{font-size:12px;line-height:1.7}.help-link{font-size:12px;white-space:nowrap;padding-bottom:4px}.help-link>.el-icon:first-child{display:none}.generator-card{padding:17px 16px 18px;border-radius:10px}.upload-panel{min-height:218px;padding:26px 18px}.upload-title{font-size:17px}.upload-description{font-size:11px;text-align:center}.upload-format{font-size:10px;text-align:center}.generator-options{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:17px 12px;margin-top:23px}.option-field{width:auto}.option-field>label{font-size:12px}.field-knowledge{grid-column:1 / -1}.option-button{font-size:12px;padding:0 10px}.option-field :deep(.el-select__wrapper){font-size:12px;padding:8px 10px}.generator-bottom{align-items:flex-end;flex-wrap:wrap;gap:14px;margin-top:17px}.field-tables{width:calc(50% - 6px)}.selection-notes{order:3;flex-basis:100%;padding:0}.selection-notes:empty{display:none}.generate-button.el-button{min-width:0;width:calc(50% - 8px);padding:0 12px;font-size:13px}.document-scene{width:220px;right:-65px;top:-30px;opacity:.09;transform:scale(.85) rotate(9deg)}.recent-section{margin-top:30px}.recent-heading{margin-bottom:16px}.recent-heading h2{font-size:18px}.recent-grid{grid-template-columns:1fr;gap:14px}.project-card{min-height:185px;padding:18px 20px}.project-card h3{min-height:0}.project-card-footer{margin-top:17px}.project-card time{font-size:10px}.home-orbit{display:none}}
@media(prefers-reduced-motion:reduce){.project-skeleton>span,.spinning{animation:none}.project-card,.generate-button.el-button,.upload-panel{transition:none}}
.home-scope-fields{display:flex;flex-direction:column;gap:12px}.home-scope-fields>label{font-size:13px;color:#82778e}.home-scope-fields :deep(.el-select){width:100%}
.home-project-list{min-height:180px}.home-project-list>button{position:relative;display:flex;flex-direction:column;gap:8px;width:100%;padding:18px 30px 18px 14px;margin:0 0 12px;border:1px solid #ece7f5;border-radius:8px;background:#fbf9fe;text-align:left;cursor:pointer}.home-project-list strong{font-size:14px;color:#555063;font-weight:500}.home-project-list span{font-size:11px;color:#a699b2}.home-project-list .el-icon{position:absolute;right:12px;top:25px;color:#b3a2cf}.home-list-pagination{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-top:22px;color:#a297ae;font-size:12px}
</style>
