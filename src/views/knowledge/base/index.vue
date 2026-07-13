<template>
  <div class="page kb-page-wrap">
    <div class="kb-shell">
      <!-- 左侧：我的知识库 -->
      <aside class="kb-sidebar">
        <div class="kb-sidebar-head">
          <div class="kb-sidebar-title">
            <el-icon><Tickets /></el-icon>
            <span>我的知识库</span>
          </div>
        </div>

        <el-input
          v-model="keyword"
          class="kb-search"
          placeholder="搜索知识库"
          clearable
          :prefix-icon="Search"
          @input="onKeywordInput"
        />

        <el-scrollbar ref="baseListScrollbar" class="kb-list-scroll" v-loading="baseLoading && bases.length === 0" @scroll="onBaseListScroll">
          <div class="kb-list">
            <div
              v-for="item in bases"
              :key="item.id"
              class="kb-card"
              :class="{ active: String(selectedBase?.id || '') === String(item.id || '') }"
              @click="selectBase(item)"
            >
              <div class="kb-card-top">
                <div class="kb-card-name">
                  <el-icon class="folder-icon"><FolderOpened /></el-icon>
                  <span>{{ item.kbName }}</span>
                </div>

                <el-dropdown
                  v-if="canManageKnowledgeBase(item)"
                  trigger="click"
                  @command="(command) => handleBaseCommand(command, item)"
                >
                  <el-button class="kb-more" text :icon="MoreFilled" @click.stop />
                  <template #dropdown>
                    <el-dropdown-menu>
                      <el-dropdown-item command="edit">编辑知识库</el-dropdown-item>
                      <el-dropdown-item command="toggle">
                        {{ Number(item.status) === 1 ? '停用知识库' : '启用知识库' }}
                      </el-dropdown-item>
                      <el-dropdown-item command="delete" divided>删除知识库</el-dropdown-item>
                    </el-dropdown-menu>
                  </template>
                </el-dropdown>
              </div>

              <div class="kb-card-meta">
                <span>{{ kbTypeLabel(item.kbType) }}</span>
                <span>{{ formatTime(item.createTime || item.createdAt) }}</span>
              </div>

              <div class="kb-card-tags">
                <span class="kb-mini-tag">{{ item.fileCount || 0 }} 个文件</span>
                <span class="kb-mini-tag">{{ item.chunkCount || 0 }} 个切片</span>
                <span v-if="Number(item.status) !== 1" class="kb-mini-tag muted-tag">已停用</span>
              </div>
            </div>

            <div v-if="!baseLoading && !bases.length" class="kb-list-empty">
              暂无知识库
            </div>

            <div v-if="bases.length" class="kb-list-end">
              <span v-if="baseAppendLoading">正在加载更多...</span>
              <span v-else-if="baseNoMore">—没有更多知识库了—</span>
              <span v-else>下滑加载更多</span>
            </div>
          </div>
        </el-scrollbar>

        <div class="kb-sidebar-footer">
          <el-button
            v-if="canCreateKnowledge"
            class="new-base-btn"
            type="primary"
            :icon="Plus"
            @click="openCreateBase"
          >
            新建知识库
          </el-button>
        </div>
      </aside>

      <!-- 右侧：详情区域 -->
      <main class="kb-main">
        <template v-if="selectedBase">
          <!-- 保留现有知识库头部信息和操作入口 -->
          <section class="kb-detail-head">
            <div class="kb-title-block">
              <div class="kb-detail-title">{{ selectedBase.kbName }}</div>
              <div class="kb-detail-sub">
                {{ kbTypeLabel(selectedBase.kbType) }}
                <span v-if="selectedBase.enterpriseName"> · {{ selectedBase.enterpriseName }}</span>
                <span> · {{ selectedBase.description || '暂无描述' }}</span>
              </div>
            </div>

            <div class="kb-detail-actions">
              <el-button :icon="Search" @click="openSearchDialog">检索测试</el-button>
              <el-button :icon="ChatLineRound" @click="openAskDialog">知识问答</el-button>
              <el-button v-if="canManageSelectedBase" type="primary" :icon="Upload" @click="openUploadDialog">添加文件</el-button>
            </div>
          </section>

          <section class="kb-file-section">
            <div class="kb-table-head">
              <div class="kb-table-title">知识库文件</div>
              <div class="kb-table-summary">
                共 {{ files.length }} 个文件
                <span v-if="hasProcessingFiles"> · 有文件正在处理</span>
              </div>
              <el-button class="refresh-file-btn" text :icon="Refresh" @click="loadFiles" />
            </div>

            <el-table
              class="ui-table kb-file-table"
              :data="files"
              v-loading="fileLoading"
              height="calc(100vh - 402px)"
              empty-text="当前知识库还没有文件，请点击右上角“添加文件”"
            >
              <el-table-column prop="fileName" label="文件名" min-width="340" show-overflow-tooltip>
                <template #default="{ row }">
                  <div class="file-name-cell">
                    <el-icon class="file-doc-icon"><Document /></el-icon>
                    <span class="file-name-text">{{ row.fileName || '-' }}</span>
                  </div>
                </template>
              </el-table-column>

              <el-table-column prop="fileSize" label="文件大小" width="130">
                <template #default="{ row }">
                  {{ formatFileSize(row.fileSize) }}
                </template>
              </el-table-column>

              <el-table-column label="上传时间" width="180">
                <template #default="{ row }">
                  {{ formatTime(row.createTime || row.createdAt || row.uploadTime) }}
                </template>
              </el-table-column>

              <el-table-column label="文件状态" width="170">
                <template #default="{ row }">
                  <span class="file-state" :class="fileStatusClass(row)">
                    <span class="state-dot"></span>
                    {{ fileStatusLabel(row) }}
                  </span>
                  <el-tooltip v-if="hasFileStatusTip(row)" :content="fileStatusTip(row)" placement="top">
                    <el-tag
                      class="error-tag"
                      :type="fileStatusTipTagType(row)"
                      effect="light"
                      size="small"
                    >
                      {{ fileStatusTipLabel(row) }}
                    </el-tag>
                  </el-tooltip>
                </template>
              </el-table-column>

              <el-table-column label="解析质量" width="130">
                <template #default="{ row }">
                  <el-button link type="primary" @click.stop="openQualityDialog(row)">
                    {{ qualityLabel(row) }}
                  </el-button>
                </template>
              </el-table-column>

              <el-table-column label="操作" width="190" align="right" fixed="right">
                <template #default="{ row }">
                  <div class="table-actions compact-actions">
                    <el-button
                      v-if="canManageSelectedBase"
                      link
                      type="primary"
                      :loading="isRebuilding(row)"
                      :disabled="isFileProcessing(row)"
                      @click.stop="rebuildFile(row)"
                    >重新入库</el-button>
                    <el-button v-if="canManageSelectedBase" link type="danger" @click.stop="deleteFile(row)">删除</el-button>
                  </div>
                </template>
              </el-table-column>
            </el-table>
          </section>
        </template>

        <section v-else class="kb-empty-panel">
          <div class="empty-hero"></div>
          <div class="empty-title">沉淀知识资产，驱动组织进化</div>
          <div class="empty-desc">
            正文撰写时，可导入知识库文件，让 AI 基于你选定的知识库素材，生成质量更高、更贴合要求的标书内容。
          </div>

          <div class="empty-feature-row">
            <div class="empty-feature">
              <div class="feature-icon blue"><el-icon><Tickets /></el-icon></div>
              <div class="feature-title">快速复用</div>
              <div class="feature-desc">历史标书模板、技术方案、资质文件一键调用，减少重复编写</div>
            </div>
            <div class="feature-line"></div>
            <div class="empty-feature">
              <div class="feature-icon purple"><el-icon><Search /></el-icon></div>
              <div class="feature-title">智能检索</div>
              <div class="feature-desc">按行业、项目类型、客户特征快速定位参考案例，缩短准备周期</div>
            </div>
            <div class="feature-line"></div>
            <div class="empty-feature">
              <div class="feature-icon cyan"><el-icon><ChatLineRound /></el-icon></div>
              <div class="feature-title">协同加速</div>
              <div class="feature-desc">多部门共享素材库，打破信息孤岛，并行推进标书制作</div>
            </div>
          </div>

          <el-button v-if="canCreateKnowledge" class="empty-new-btn" type="primary" :icon="Plus" @click="openCreateBase">
            新建知识库
          </el-button>
        </section>
      </main>
    </div>

    <!-- 新建 / 编辑知识库 -->
    <el-dialog
      v-model="baseDialog.visible"
      :title="baseDialog.isEdit ? '编辑知识库' : '新建知识库'"
      width="680px"
      destroy-on-close
    >
      <el-form ref="baseFormRef" :model="baseForm" :rules="baseRules" label-width="110px">
        <el-form-item v-if="canManagePlatform" label="所属企业" prop="enterpriseId">
          <el-select
            v-model="baseForm.enterpriseId"
            clearable
            filterable
            remote
            reserve-keyword
            :remote-method="remoteSearchEnterprises"
            :loading="enterpriseLoading"
            placeholder="请选择企业"
            style="width: 100%"
            @visible-change="onEnterpriseVisibleChange"
          >
            <el-option v-for="item in enterprises" :key="item.id" :label="item.enterpriseName" :value="item.id" />
          </el-select>
        </el-form-item>

        <el-form-item label="知识库名称" prop="kbName">
          <el-input v-model="baseForm.kbName" placeholder="例如：企业资质库 / 项目招标资料库" />
        </el-form-item>

        <el-form-item label="知识库类型">
          <el-select v-model="baseForm.kbType" style="width: 100%">
            <el-option label="企业资料" value="company_profile" />
            <el-option label="企业资质" value="qualification" />
            <el-option label="案例业绩" value="case_study" />
            <el-option label="技术标准" value="tech_standard" />
            <el-option label="法律法规" value="laws" />
            <el-option label="其他" value="other" />
          </el-select>
        </el-form-item>

        <el-form-item label="描述">
          <el-input v-model="baseForm.description" type="textarea" :rows="4" placeholder="说明这个知识库主要放哪些资料" />
        </el-form-item>

        <el-form-item label="状态">
          <el-select v-model="baseForm.status" style="width: 100%">
            <el-option label="正常" :value="1" />
            <el-option label="停用" :value="0" />
          </el-select>
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="baseDialog.visible = false">取消</el-button>
        <el-button type="primary" @click="submitBase">保存</el-button>
      </template>
    </el-dialog>

    <!-- 添加文件：保留现有上传组件和入库逻辑 -->
    <el-dialog
      v-model="uploadDialog.visible"
      :title="`给「${selectedBase?.kbName || ''}」添加文件`"
      width="720px"
      destroy-on-close
    >
      <FileUploadBox
        v-if="selectedBase"
        module-type="knowledge_base"
        :biz-id="selectedBase.id"
        :private-flag="true"
        accept=".doc,.docx,.pdf,.xls,.xlsx,.txt"
        :max-size-mb="50"
        :max-count="5"
        @success="onKnowledgeFileUploaded"
      />

      <div class="form-tip" style="margin-top: 10px">
        文件上传成功后，系统会自动把文件加入当前知识库，并开始解析、切片和向量化。
      </div>
    </el-dialog>

    <!-- 知识库检索测试 -->
    <el-dialog v-model="searchDialog.visible" title="知识库检索测试" width="820px" destroy-on-close>
      <el-form label-width="90px">
        <el-form-item label="检索问题">
          <el-input
            v-model="searchForm.query"
            type="textarea"
            :rows="3"
            placeholder="例如：公司有哪些类似项目业绩？"
          />
        </el-form-item>
        <el-form-item label="返回数量">
          <el-input-number v-model="searchForm.topK" :min="1" :max="20" />
        </el-form-item>
      </el-form>

      <div class="dialog-actions">
        <el-button type="primary" :loading="searchDialog.loading" @click="submitSearch">开始检索</el-button>
      </div>

      <div v-if="searchResult.length" class="hit-list">
        <div v-for="item in searchResult" :key="item.chunkId" class="hit-card">
          <div class="hit-head hit-head--stack">
            <div class="hit-source-title">{{ formatReferenceTitle(item) }}</div>
            <div class="hit-source-meta">
              <span>相似度：{{ formatScore(item.score) }}</span>
              <span v-if="formatReferenceMeta(item)">{{ formatReferenceMeta(item) }}</span>
            </div>
          </div>
          <div class="hit-content">{{ referencePreview(item) }}</div>
        </div>
      </div>

      <el-empty
        v-else
        :description="searchDialog.searched ? '未检索到相关片段，请确认文件已解析入库，或换一个关键词再试' : '输入检索问题后点击开始检索'"
      />
    </el-dialog>

    <!-- 知识库问答 -->
    <el-dialog v-model="askDialog.visible" title="知识库问答" width="860px">
      <el-form label-width="90px">
        <el-form-item label="问题">
          <el-input
            v-model="askForm.question"
            type="textarea"
            :rows="3"
            placeholder="例如：根据企业资料，总结一下我们的核心优势"
          />
        </el-form-item>
        <el-form-item label="引用数量">
          <el-input-number v-model="askForm.topK" :min="1" :max="ASK_TOP_K_MAX" />
        </el-form-item>
      </el-form>

      <div class="dialog-actions">
        <el-button
          v-if="askSessionDirty"
          :disabled="askDialog.loading || askDialog.previewLoading"
          @click="startNewAskSession"
        >新问题</el-button>
        <el-button :loading="askDialog.previewLoading" @click="previewAskEvidence">先预览依据</el-button>
        <el-button type="primary" :loading="askDialog.loading" :disabled="!askPreview.hasEvidence" @click="submitAskTaskFlow">确认依据并生成回答</el-button>
      </div>

      <div v-if="askPreview.searched" class="preview-box">
        <div class="answer-title">
          <span>回答依据预览</span>
          <el-tag v-if="askPreview.hasEvidence" type="success" size="small">命中 {{ askPreview.evidenceCount }} 条</el-tag>
          <el-tag v-else type="warning" size="small">无有效依据</el-tag>
        </div>
        <div v-if="askPreview.queryVariants?.length" class="query-variants">
          <span v-for="item in askPreview.queryVariants" :key="item" class="query-chip">{{ item }}</span>
        </div>
        <el-alert
          v-if="!askPreview.hasEvidence"
          type="warning"
          show-icon
          :closable="false"
          :title="askPreview.lowConfidenceReason || '当前问题没有命中有效资料，系统不会调用模型生成无依据答案'"
        />
        <div v-if="askPreview.references?.length" class="hit-list hit-list--compact">
          <div v-for="(item, index) in askPreview.references" :key="item.chunkId || index" class="hit-card">
            <div class="hit-head hit-head--stack">
              <div class="hit-source-title">[资料{{ index + 1 }}] {{ formatReferenceTitle(item) }}</div>
              <div class="hit-source-meta">
                <span>相似度：{{ formatScore(item.score) }}</span>
                </div>
            </div>
            <div class="hit-content">{{ referencePreview(item) }}</div>
          </div>
        </div>
      </div>

      <el-alert
        v-if="askDialog.asked && askLowConfidence"
        class="ask-alert"
        type="warning"
        show-icon
        :closable="false"
        title="当前知识库未检索到相关资料，系统已停止无依据生成"
      />

      <el-alert
        v-if="askLastError"
        class="ask-alert"
        type="error"
        show-icon
        :closable="false"
        :title="askLastError"
      />

      <div v-if="askAnswer" class="answer-box" :class="{ 'answer-box--warning': askLowConfidence }">
        <div class="answer-title">
          <span>AI回答</span>
          <el-tag v-if="askLowConfidence" type="warning" size="small">低置信度</el-tag>
          <el-tag v-else-if="askEvidenceCount" type="success" size="small">引用 {{ askEvidenceCount }} 条资料</el-tag>
        </div>
        <div class="answer-content">{{ askAnswer }}</div>
      </div>

      <div v-if="askAnswer" class="feedback-box">
        <div class="answer-title">问答反馈</div>
        <el-radio-group v-model="askFeedbackForm.feedbackType">
          <el-radio-button label="USEFUL">有用</el-radio-button>
          <el-radio-button label="USELESS">无用</el-radio-button>
          <el-radio-button label="CITATION_WRONG">引用错误</el-radio-button>
          <el-radio-button label="INCOMPLETE">答案不完整</el-radio-button>
          <el-radio-button label="NO_EVIDENCE">无依据</el-radio-button>
        </el-radio-group>
        <el-input
          v-model="askFeedbackForm.reason"
          class="feedback-reason"
          maxlength="500"
          show-word-limit
          placeholder="可填写问题原因，便于后续优化知识库或测试集"
        />
        <el-button type="primary" :loading="askDialog.feedbackSaving" @click="saveAskFeedback">提交反馈</el-button>
      </div>

      <div v-if="askAnswerCheck" class="check-box">
        <div class="answer-title">
          <span>答案自检</span>
          <el-tag :type="checkTagType(askAnswerCheck.status)" size="small">{{ askAnswerCheck.status || '-' }} / {{ askAnswerCheck.score ?? '-' }}分</el-tag>
        </div>
        <div v-if="askAnswerCheck.issues?.length" class="check-list">
          <div v-for="item in askAnswerCheck.issues" :key="item">{{ item }}</div>
        </div>
        <div v-if="askAnswerCheck.suggestions?.length" class="check-list muted">
          <div v-for="item in askAnswerCheck.suggestions" :key="item">建议：{{ item }}</div>
        </div>
      </div>

      <div v-if="askTaskId && askAnswer" class="review-box">
        <el-select v-model="askReviewForm.reviewStatus" style="width: 180px">
          <el-option label="待确认" value="PENDING" />
          <el-option label="已确认" value="CONFIRMED" />
          <el-option label="需修改" value="NEED_MODIFY" />
          <el-option label="已修改" value="MODIFIED" />
          <el-option label="已废弃" value="DISCARDED" />
        </el-select>
        <el-input v-model="askReviewForm.reviewOpinion" placeholder="客户修改意见 / 内部确认意见" />
        <el-button :loading="askDialog.reviewSaving" @click="saveAskReview">保存确认状态</el-button>
      </div>

      <el-empty
        v-if="askDialog.asked && !askDialog.loading && !askAnswer && !askReferences.length"
        description="暂未生成回答，请确认知识库文件已解析入库，或换一个问题再试"
      />

      <div v-if="askReferences.length" class="hit-list">
        <div class="answer-title">引用来源</div>
        <div v-for="(item, index) in askReferences" :key="item.chunkId || index" class="hit-card">
          <div class="hit-head hit-head--stack">
            <div class="hit-source-title">[资料{{ index + 1 }}] {{ formatReferenceTitle(item) }}</div>
            <div class="hit-source-meta">
              <span>相似度：{{ formatScore(item.score) }}</span>
              <span v-if="formatReferenceMeta(item)">{{ formatReferenceMeta(item) }}</span>
            </div>
          </div>
          <div class="hit-content">{{ referencePreview(item) }}</div>
        </div>
      </div>
    </el-dialog>

    <el-dialog v-model="qualityDialog.visible" title="解析质量报告" width="760px" destroy-on-close>
      <el-descriptions :column="2" border>
        <el-descriptions-item label="文件名">{{ qualityDialog.row?.fileName || '-' }}</el-descriptions-item>
        <el-descriptions-item label="解析质量">{{ qualityLabel(qualityDialog.row || {}) }}</el-descriptions-item>
        <el-descriptions-item label="文本长度">{{ qualityDialog.row?.parseTextLength || 0 }}</el-descriptions-item>
        <el-descriptions-item label="状态">{{ fileStatusLabel(qualityDialog.row || {}) }}</el-descriptions-item>
      </el-descriptions>
      <pre class="json-preview">{{ prettyJson(qualityDialog.row?.parseQualityJson) }}</pre>
    </el-dialog>

  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from '@/plugins/element-plus-api'
import {
  ChatLineRound,
  Document,
  FolderOpened,
  MoreFilled,
  Plus,
  Refresh,
  Search,
  Tickets,
  Upload,
  UploadFilled
} from '@element-plus/icons-vue'
import { useAuthStore } from '@/stores/auth'
import { pageEnterprises } from '@/api/enterprise'
import FileUploadBox from '@/components/FileUploadBox.vue'
import { createRequestId } from '@/utils/requestId'
import { createSerialPoller } from '@/utils/serialPoller'
import {
  createKnowledgeBase,
  createKnowledgeFile,
  deleteKnowledgeBase,
  deleteKnowledgeFile,
  getAskTask,
  pageKnowledgeBases,
  pageKnowledgeFiles,
  previewAskKnowledge,
  rebuildKnowledgeFile,
  searchKnowledge,
  submitAskTask,
  submitKnowledgeAskFeedback,
  updateAskTaskReview,
  updateKnowledgeBase,
  updateKnowledgeBaseStatus
} from '@/api/knowledge'

const auth = useAuthStore()

const ROLE_SUPER_ADMIN = 'SUPERADMIN'
const ROLE_PLATFORM_ADMIN = 'PLATFORMADMIN'
const ROLE_ENTERPRISE_ADMIN = 'ENTERPRISEADMIN'

const baseLoading = ref(false)
const baseAppendLoading = ref(false)
const fileLoading = ref(false)
const enterpriseLoading = ref(false)
const keyword = ref('')
const bases = ref([])
const files = ref([])
const enterprises = ref([])
const selectedBase = ref(null)
const baseListScrollbar = ref()
const baseFormRef = ref()
const timer = ref(null)
const enterpriseKeywordTimer = ref(null)
const pollingTimer = ref(null)
const askTaskTimer = ref(null)
const askTaskPolling = ref(false)
const rebuildingIds = ref(new Set())

const basePager = reactive({
  page: 1,
  size: 20,
  total: 0
})

const baseDialog = reactive({
  visible: false,
  isEdit: false,
  id: null
})

const uploadDialog = reactive({
  visible: false
})

const searchDialog = reactive({
  visible: false,
  loading: false,
  searched: false
})

const askDialog = reactive({
  visible: false,
  loading: false,
  previewLoading: false,
  reviewSaving: false,
  feedbackSaving: false,
  asked: false
})

const searchForm = reactive({
  query: '',
  topK: 5
})

const ASK_TOP_K_MAX = 5

const askForm = reactive({
  question: '',
  topK: 5
})

const searchResult = ref([])
const askAnswer = ref('')
const askReferences = ref([])
const askLowConfidence = ref(false)
const askEvidenceCount = ref(0)
const askAnswerCheck = ref(null)
const askTaskId = ref('')
const askLastError = ref('')
const askSessionBaseId = ref('')

const askPreview = reactive({
  searched: false,
  hasEvidence: false,
  evidenceCount: 0,
  lowConfidenceReason: '',
  queryVariants: [],
  references: []
})

const askReviewForm = reactive({
  reviewStatus: 'PENDING',
  reviewOpinion: '',
  finalAnswer: ''
})

const askFeedbackForm = reactive({
  feedbackType: 'USEFUL',
  reason: ''
})

const qualityDialog = reactive({
  visible: false,
  row: null
})


const baseForm = reactive({
  enterpriseId: '',
  kbName: '',
  kbType: 'company_profile',
  description: '',
  status: 1
})

const currentRoleCodes = computed(() => normalizeRoleList(auth.user?.roles || auth.user?.roleCodes || []))
const canManagePlatform = computed(() => {
  return currentRoleCodes.value.includes(ROLE_SUPER_ADMIN) || currentRoleCodes.value.includes(ROLE_PLATFORM_ADMIN)
})
const isEnterpriseAdmin = computed(() => currentRoleCodes.value.includes(ROLE_ENTERPRISE_ADMIN))
const currentEnterpriseId = computed(() => auth.user?.enterpriseId || '')
const currentUserId = computed(() => auth.user?.id || '')

// 普通用户可以创建和维护自己的个人知识库；企业知识库由企业管理员维护。
const canCreateKnowledge = computed(() => true)
const canManageSelectedBase = computed(() => canManageKnowledgeBase(selectedBase.value))

function canManageKnowledgeBase(base) {
  if (canManagePlatform.value) return true
  if (!base?.id) return false
  if (base.enterpriseId) {
    return isEnterpriseAdmin.value && String(base.enterpriseId) === String(currentEnterpriseId.value)
  }
  return String(base.userId || '') === String(currentUserId.value)
}

const hasProcessingFiles = computed(() => files.value.some(isFileProcessing))
const baseNoMore = computed(() => basePager.total > 0 && bases.value.length >= basePager.total)
const askSessionDirty = computed(() => hasAskSessionState())

const baseRules = computed(() => {
  const rules = {
    kbName: [{ required: true, message: '请输入知识库名称', trigger: 'blur' }]
  }

  if (canManagePlatform.value) {
    rules.enterpriseId = [{ required: true, message: '请选择所属企业', trigger: 'change' }]
  }

  return rules
})


onMounted(() => {
  loadBases()
  loadEnterprises()
})

onBeforeUnmount(() => {
  clearTimeout(timer.value)
  clearTimeout(enterpriseKeywordTimer.value)
  stopFilePolling()
  stopAskTaskPolling()
})

function normalizeRoleCode(value = '') {
  return String(value)
    .trim()
    .toUpperCase()
    .replace(/^ROLE[_-]?/, '')
    .replace(/[^A-Z0-9]/g, '')
}

function normalizeRoleList(values = []) {
  if (!Array.isArray(values)) return []
  return values.map((item) => {
    if (typeof item === 'string') return normalizeRoleCode(item)
    return normalizeRoleCode(item?.roleCode || item?.code || item?.authority || item?.name || '')
  }).filter(Boolean)
}

function kbTypeLabel(value) {
  const map = {
    company_profile: '企业资料',
    qualification: '企业资质',
    case_study: '案例业绩',
    tech_standard: '技术标准',
    laws: '法律法规',
    other: '其他'
  }
  return map[value] || value || '-'
}

function onKeywordInput() {
  clearTimeout(timer.value)
  timer.value = setTimeout(() => {
    basePager.page = 1
    bases.value = []
    loadBases()
  }, 300)
}

async function loadEnterprises(keyword = '') {
  if (!canManagePlatform.value) {
    enterprises.value = []
    return
  }

  enterpriseLoading.value = true
  try {
    const res = await pageEnterprises({
      current: 1,
      size: 20,
      pageNum: 1,
      pageSize: 20,
      status: 1,
      keyword: keyword || undefined
    })
    enterprises.value = res?.records || []
  } catch (e) {
    enterprises.value = []
  } finally {
    enterpriseLoading.value = false
  }
}

function remoteSearchEnterprises(keyword = '') {
  if (!canManagePlatform.value) return
  clearTimeout(enterpriseKeywordTimer.value)
  enterpriseKeywordTimer.value = setTimeout(() => loadEnterprises(keyword), 300)
}

function onEnterpriseVisibleChange(visible) {
  if (visible && canManagePlatform.value && enterprises.value.length === 0) {
    loadEnterprises()
  }
}

function ensureEnterpriseOption(id, name) {
  if (!canManagePlatform.value || !id) return
  const exists = enterprises.value.some((item) => String(item.id) === String(id))
  if (!exists) {
    enterprises.value = [{ id, enterpriseName: name || String(id) }].concat(enterprises.value)
  }
}

async function loadBases(selectId, options = {}) {
  const append = Boolean(options.append)
  if ((append && baseNoMore.value) || baseLoading.value || baseAppendLoading.value) return

  const pageToLoad = append ? basePager.page + 1 : 1
  if (append) {
    baseAppendLoading.value = true
  } else {
    baseLoading.value = true
  }

  try {
    const res = await pageKnowledgeBases({
      current: pageToLoad,
      size: basePager.size,
      pageNum: pageToLoad,
      pageSize: basePager.size,
      keyword: keyword.value?.trim() || undefined
    })

    const records = res?.records || []
    basePager.page = pageToLoad
    basePager.total = Number(res?.total || 0)

    if (append) {
      const exists = new Set(bases.value.map((item) => String(item.id)))
      bases.value = bases.value.concat(records.filter((item) => item?.id && !exists.has(String(item.id))))
      return
    }

    bases.value = records

    // 首次进入知识库页面时不默认选中第一条知识库。
    // 明确传入 selectId（例如新建后、上传后刷新）才自动定位；否则只保留用户原本已经选中的知识库。
    const explicitSelectId = selectId ? String(selectId) : ''
    const currentSelectedId = selectedBase.value?.id ? String(selectedBase.value.id) : ''
    const targetId = explicitSelectId || currentSelectedId
    const next = targetId
      ? bases.value.find((item) => String(item.id) === String(targetId))
      : null

    if (next) {
      selectBase(next)
    } else {
      selectedBase.value = null
      files.value = []
    }
  } finally {
    if (append) {
      baseAppendLoading.value = false
    } else {
      baseLoading.value = false
    }
  }
}

function onBaseListScroll() {
  const el = baseListScrollbar.value?.wrapRef
  if (!el || baseLoading.value || baseAppendLoading.value || baseNoMore.value) return
  const remain = el.scrollHeight - el.scrollTop - el.clientHeight
  if (remain <= 80) {
    loadBases(null, { append: true })
  }
}

function selectBase(row) {
  if (!row) return
  const previousId = selectedBase.value?.id ? String(selectedBase.value.id) : ''
  const nextId = row?.id ? String(row.id) : ''
  selectedBase.value = row
  if (previousId && nextId && previousId !== nextId) {
    resetAskSession({ clearQuestion: true, stopPolling: true })
  } else if (!askSessionBaseId.value && nextId) {
    askSessionBaseId.value = nextId
  }
  loadFiles()
}

async function loadFiles() {
  if (!selectedBase.value?.id) return

  fileLoading.value = true
  try {
    const res = await pageKnowledgeFiles({
      current: 1,
      size: 50,
      pageNum: 1,
      pageSize: 50,
      knowledgeBaseId: selectedBase.value.id
    })

    files.value = res?.records || []
    refreshFilePolling()
  } finally {
    fileLoading.value = false
  }
}

function resetBaseForm(row = {}) {
  baseForm.enterpriseId = row.enterpriseId || ''
  baseForm.kbName = row.kbName || ''
  baseForm.kbType = row.kbType || 'company_profile'
  baseForm.description = row.description || ''
  baseForm.status = row.status === 0 ? 0 : 1
}

function openCreateBase() {
  if (!canCreateKnowledge.value) {
    ElMessage.warning('当前账号不能新建知识库')
    return
  }

  baseDialog.isEdit = false
  baseDialog.id = null
  resetBaseForm({})
  baseDialog.visible = true
}

function openEditBase(row) {
  if (!canManageKnowledgeBase(row)) {
    ElMessage.warning('当前知识库不可编辑')
    return
  }

  baseDialog.isEdit = true
  baseDialog.id = row.id
  resetBaseForm(row)
  baseDialog.visible = true
}

async function submitBase() {
  const editingBase = bases.value.find((item) => String(item.id || '') === String(baseDialog.id || '')) || selectedBase.value
  if (baseDialog.isEdit && !canManageKnowledgeBase(editingBase)) {
    ElMessage.warning('当前知识库不可保存')
    return
  }
  if (!baseDialog.isEdit && !canCreateKnowledge.value) {
    ElMessage.warning('当前账号不能新建知识库')
    return
  }

  await baseFormRef.value?.validate()

  const payload = {
    enterpriseId: baseForm.enterpriseId || null,
    kbName: baseForm.kbName,
    kbType: baseForm.kbType,
    description: baseForm.description,
    status: baseForm.status
  }

  let savedId = baseDialog.id

  if (baseDialog.isEdit) {
    await updateKnowledgeBase(baseDialog.id, payload)
    ElMessage.success('知识库已修改')
  } else {
    savedId = await createKnowledgeBase(payload)
    ElMessage.success('知识库已创建，现在可以添加文件')
  }

  baseDialog.visible = false
  await loadBases(savedId)
}

async function toggleBaseStatus(row) {
  if (!canManageKnowledgeBase(row)) {
    ElMessage.warning('当前知识库不可修改状态')
    return
  }

  const nextStatus = Number(row.status) === 1 ? 0 : 1
  const actionText = nextStatus === 1 ? '启用' : '停用'

  await ElMessageBox.confirm(`确认${actionText}知识库「${row.kbName}」吗？`, '提示', {
    type: nextStatus === 1 ? 'success' : 'warning'
  })

  await updateKnowledgeBaseStatus(row.id, { status: nextStatus })
  ElMessage.success(`${actionText}成功`)
  await loadBases(row.id)
}

async function deleteBase(row) {
  if (!canManageKnowledgeBase(row)) {
    ElMessage.warning('当前知识库不可删除')
    return
  }

  await ElMessageBox.confirm(`确定删除知识库「${row.kbName}」吗？如果下面已有文件，后端会拒绝删除。`, '删除确认', {
    type: 'warning'
  })

  await deleteKnowledgeBase(row.id)
  ElMessage.success('删除成功')

  if (String(selectedBase.value?.id || '') === String(row.id || '')) {
    selectedBase.value = null
    files.value = []
  }

  await loadBases()
}

async function handleBaseCommand(command, row) {
  if (command === 'edit') {
    openEditBase(row)
    return
  }
  if (command === 'toggle') {
    await toggleBaseStatus(row)
    return
  }
  if (command === 'delete') {
    await deleteBase(row)
  }
}

function openUploadDialog() {
  if (!canManageSelectedBase.value) {
    ElMessage.warning('当前知识库不能添加文件')
    return
  }

  if (!selectedBase.value?.id) {
    ElMessage.warning('请先选择知识库')
    return
  }

  uploadDialog.visible = true
}

async function onKnowledgeFileUploaded(file) {
  if (!canManageSelectedBase.value) {
    ElMessage.warning('当前知识库不能添加文件')
    return
  }

  if (!selectedBase.value?.id) return

  const fileId = file?.id || file?.fileId
  if (!fileId) {
    ElMessage.error('上传成功但没有返回文件ID')
    return
  }

  await createKnowledgeFile({
    knowledgeBaseId: selectedBase.value.id,
    fileId
  })

  ElMessage.success('文件已添加到当前知识库，正在解析入库')
  uploadDialog.visible = false

  await loadFiles()
  await loadBases(selectedBase.value.id)
  startFilePolling()
}

async function rebuildFile(row) {
  if (!canManageSelectedBase.value) {
    ElMessage.warning('当前知识库不能重新入库')
    return
  }

  await ElMessageBox.confirm(`确定重新解析并向量化「${row.fileName || row.id}」吗？`, '重新入库', {
    type: 'warning'
  })

  setRebuilding(row.id, true)
  try {
    await rebuildKnowledgeFile(row.id, true)
    ElMessage.success('已提交重新入库任务，系统会自动刷新状态')
    await loadFiles()
    startFilePolling()
  } finally {
    setRebuilding(row.id, false)
  }
}

function isFileProcessing(row = {}) {
  return Number(row.parseStatus) === 1 || Number(row.embeddingStatus) === 1
}

function isRebuilding(row = {}) {
  return rebuildingIds.value.has(row.id)
}

function setRebuilding(id, value) {
  const next = new Set(rebuildingIds.value)
  if (value) next.add(id)
  else next.delete(id)
  rebuildingIds.value = next
}

function startFilePolling() {
  if (pollingTimer.value || !selectedBase.value?.id) return
  pollingTimer.value = createSerialPoller(async () => {
    if (!selectedBase.value?.id) {
      pollingTimer.value = null
      return false
    }
    await loadFiles()
    await loadBases(selectedBase.value.id)
    return true
  }, {
    interval: ({ elapsedMs }) => elapsedMs < 60000 ? 5000 : 10000,
    maxBackoff: 30000,
    immediate: false,
    onError() {
      // 解析入库状态查询异常自动退避，避免请求堆积。
    }
  })
  pollingTimer.value.start()
}

function stopFilePolling() {
  pollingTimer.value?.stop()
  pollingTimer.value = null
}

function refreshFilePolling() {
  if (files.value.some(isFileProcessing)) {
    startFilePolling()
  } else {
    stopFilePolling()
  }
}

function openSearchDialog() {
  if (!selectedBase.value?.id) {
    ElMessage.warning('请先选择知识库')
    return
  }
  searchDialog.visible = true
  searchDialog.searched = false
  searchResult.value = []
}

function openAskDialog() {
  if (!selectedBase.value?.id) {
    ElMessage.warning('请先选择知识库')
    return
  }
  const baseId = currentKnowledgeBaseId()
  askDialog.visible = true

  // 问答任务是异步执行的，弹窗关闭不等于取消任务。
  // 重新打开弹窗时必须保留正在执行的任务、已预览依据、已生成回答或失败原因。
  if (askSessionBaseId.value && askSessionBaseId.value !== baseId) {
    resetAskSession({ clearQuestion: true, stopPolling: true })
    return
  }
  if (!askSessionBaseId.value) {
    askSessionBaseId.value = baseId
  }
}

async function submitSearch() {
  if (!searchForm.query.trim()) {
    ElMessage.warning('请输入检索问题')
    return
  }

  searchDialog.loading = true
  try {
    const res = await searchKnowledge({
      knowledgeBaseIds: [selectedBase.value.id],
      query: searchForm.query,
      topK: searchForm.topK
    })
    searchResult.value = res?.hits || []
    searchDialog.searched = true
    if (searchResult.value.length) {
      ElMessage.success(`检索完成，命中 ${searchResult.value.length} 个片段`)
    } else {
      ElMessage.warning('未检索到相关片段，请确认文件已解析入库，或换一个关键词再试')
    }
  } finally {
    searchDialog.loading = false
  }
}

function currentKnowledgeBaseId() {
  return selectedBase.value?.id ? String(selectedBase.value.id) : ''
}

function hasAskSessionState() {
  return Boolean(
    askDialog.loading ||
    askDialog.previewLoading ||
    askDialog.asked ||
    askTaskId.value ||
    askAnswer.value ||
    askReferences.value.length ||
    askPreview.searched ||
    askLastError.value
  )
}

function resetAskSession(options = {}) {
  const { clearQuestion = false, stopPolling = true } = options
  if (stopPolling) {
    stopAskTaskPolling()
  }
  askDialog.loading = false
  askDialog.previewLoading = false
  askDialog.asked = false
  askAnswer.value = ''
  askReferences.value = []
  askLowConfidence.value = false
  askEvidenceCount.value = 0
  askAnswerCheck.value = null
  askTaskId.value = ''
  askLastError.value = ''
  resetAskPreview()
  askReviewForm.reviewStatus = 'PENDING'
  askReviewForm.reviewOpinion = ''
  askReviewForm.finalAnswer = ''
  askFeedbackForm.feedbackType = 'USEFUL'
  askFeedbackForm.reason = ''
  if (clearQuestion) {
    askForm.question = ''
    askForm.topK = 5
  }
  askSessionBaseId.value = currentKnowledgeBaseId()
}

function startNewAskSession() {
  if (askDialog.loading || askDialog.previewLoading) {
    ElMessage.warning('当前问答任务正在执行，请等待完成后再开始新问题')
    return
  }
  resetAskSession({ clearQuestion: true, stopPolling: true })
}

function normalizeAskTopK() {
  const value = Number(askForm.topK || 1)
  const normalized = Math.min(Math.max(Number.isFinite(value) ? Math.floor(value) : 1, 1), ASK_TOP_K_MAX)
  askForm.topK = normalized
  return normalized
}

function resetAskPreview() {
  askPreview.searched = false
  askPreview.hasEvidence = false
  askPreview.evidenceCount = 0
  askPreview.lowConfidenceReason = ''
  askPreview.queryVariants = []
  askPreview.references = []
}

async function previewAskEvidence() {
  if (!askForm.question.trim()) {
    ElMessage.warning('请输入问题')
    return
  }
  if (askDialog.loading) {
    ElMessage.warning('当前问答任务正在执行，请等待完成后再预览')
    return
  }
  askSessionBaseId.value = currentKnowledgeBaseId()
  askLastError.value = ''
  askDialog.asked = false
  askAnswer.value = ''
  askAnswerCheck.value = null
  askLowConfidence.value = false
  askEvidenceCount.value = 0
  askTaskId.value = ''
  askDialog.previewLoading = true
  try {
    const res = await previewAskKnowledge({
      knowledgeBaseIds: [selectedBase.value.id],
      question: askForm.question,
      topK: normalizeAskTopK()
    })
    askPreview.searched = true
    askPreview.hasEvidence = Boolean(res?.hasEvidence)
    askPreview.evidenceCount = Number(res?.evidenceCount || 0)
    askPreview.lowConfidenceReason = res?.lowConfidenceReason || ''
    askPreview.queryVariants = res?.queryVariants || []
    askPreview.references = res?.references || []
    askReferences.value = askPreview.references
    if (askPreview.hasEvidence) {
      ElMessage.success(`已命中 ${askPreview.evidenceCount} 条有效依据`)
    } else {
      ElMessage.warning('当前问题未命中有效依据，不会调用模型生成无依据答案')
    }
  } finally {
    askDialog.previewLoading = false
  }
}

async function submitAskTaskFlow() {
  if (!askForm.question.trim()) {
    ElMessage.warning('请输入问题')
    return
  }
  if (!askPreview.searched) {
    await previewAskEvidence()
  }
  if (!askPreview.hasEvidence) {
    ElMessage.warning('当前没有有效依据，已停止生成')
    return
  }
  askSessionBaseId.value = currentKnowledgeBaseId()
  askDialog.loading = true
  askDialog.asked = true
  askLastError.value = ''
  askAnswer.value = ''
  askAnswerCheck.value = null
  let submitted = false
  try {
    const res = await submitAskTask({
      knowledgeBaseIds: [selectedBase.value.id],
      question: askForm.question,
      topK: normalizeAskTopK(),
      requestId: createRequestId('kb_ask_task')
    })
    askTaskId.value = res?.taskId || ''
    if (!askTaskId.value) {
      ElMessage.error('问答任务提交失败：未返回任务ID')
      return
    }
    submitted = true
    startAskTaskPolling()
  } finally {
    if (!submitted) askDialog.loading = false
  }
}

function startAskTaskPolling() {
  stopAskTaskPolling()
  askTaskTimer.value = createSerialPoller(pollAskTask, {
    interval: ({ elapsedMs }) => elapsedMs < 60000 ? 4000 : 6000,
    maxBackoff: 20000,
    onError() {
      // pollAskTask 负责错误提示和终止，轮询器只保证请求串行。
    }
  })
  askTaskTimer.value.start()
}

function stopAskTaskPolling() {
  askTaskTimer.value?.stop()
  askTaskTimer.value = null
}

async function pollAskTask() {
  if (!askTaskId.value || askTaskPolling.value) return
  askTaskPolling.value = true
  try {
    const res = await getAskTask(askTaskId.value)
    const preview = res?.preview
    if (preview) {
      askPreview.searched = true
      askPreview.hasEvidence = Boolean(preview.hasEvidence)
      askPreview.evidenceCount = Number(preview.evidenceCount || 0)
      askPreview.lowConfidenceReason = preview.lowConfidenceReason || ''
      askPreview.queryVariants = preview.queryVariants || []
      askPreview.references = preview.references || []
    }
    const response = res?.response
    if (response) {
      applyAskResponse(response)
    }
    const status = String(res?.status || '').toUpperCase()
    if (['SUCCESS', 'FAILED', 'CANCELLED'].includes(status)) {
      stopAskTaskPolling()
      askDialog.loading = false
      if (status === 'FAILED') {
        askLastError.value = safeAskTaskError(res?.errorMsg)
        ElMessage.error(askLastError.value)
      } else if (status === 'CANCELLED') {
        askLastError.value = '知识问答任务已取消'
        ElMessage.warning(askLastError.value)
      } else if (askAnswer.value) {
        if (askDialog.visible) {
          ElMessage.success(`知识问答已生成，引用 ${askEvidenceCount.value} 条资料`)
        } else {
          ElMessage.success('知识问答已生成，重新打开问答窗口可查看结果')
        }
      }
    }
  } catch (e) {
    stopAskTaskPolling()
    askDialog.loading = false
    askLastError.value = '获取知识问答任务状态失败，请稍后重试'
  } finally {
    askTaskPolling.value = false
  }
}


function safeAskTaskError(message) {
  const text = String(message || '').trim()
  if (!text) return 'AI服务调用异常，请稍后重试'
  if (text.length > 80) return 'AI服务调用异常，请稍后重试'
  if (/request_id|requestId|trace|Exception|Error:|java\.|stack|timeout|DashScope|百炼|Chat接口|model|Connection reset|SocketException|HTTP状态码|调用失败|调用异常/i.test(text)) {
    return 'AI服务调用异常，请稍后重试'
  }
  return text
}

function applyAskResponse(res = {}) {
  askLastError.value = ''
  askAnswer.value = res?.answer || ''
  askReferences.value = res?.references || []
  askLowConfidence.value = Boolean(res?.lowConfidence)
  askEvidenceCount.value = Number(res?.evidenceCount || 0)
  askAnswerCheck.value = res?.answerCheck || null
  askReviewForm.finalAnswer = askAnswer.value
  askDialog.asked = true
}

async function saveAskReview() {
  if (!askTaskId.value) return
  askDialog.reviewSaving = true
  try {
    await updateAskTaskReview(askTaskId.value, {
      reviewStatus: askReviewForm.reviewStatus,
      reviewOpinion: askReviewForm.reviewOpinion,
      finalAnswer: askReviewForm.finalAnswer || askAnswer.value
    })
    ElMessage.success('确认状态已保存')
  } finally {
    askDialog.reviewSaving = false
  }
}

async function saveAskFeedback() {
  if (!askAnswer.value) {
    ElMessage.warning('暂无可反馈的回答')
    return
  }
  askDialog.feedbackSaving = true
  try {
    await submitKnowledgeAskFeedback({
      requestId: askTaskId.value || '',
      knowledgeBaseIds: selectedBase.value?.id ? [selectedBase.value.id] : [],
      question: askForm.question,
      answer: askAnswer.value,
      feedbackType: askFeedbackForm.feedbackType,
      reason: askFeedbackForm.reason,
      lowConfidence: askLowConfidence.value,
      evidenceCount: askEvidenceCount.value,
      referenceJson: JSON.stringify((askReferences.value || []).slice(0, 10).map((item, index) => ({
        index: index + 1,
        chunkId: item.chunkId,
        fileName: item.fileName,
        score: item.score,
        sourceRef: item.sourceRef,
        pageStart: item.pageStart,
        pageEnd: item.pageEnd
      })))
    })
    ElMessage.success('反馈已提交')
    askFeedbackForm.reason = ''
  } finally {
    askDialog.feedbackSaving = false
  }
}

async function deleteFile(row) {
  if (!canManageSelectedBase.value) {
    ElMessage.warning('当前知识库不能删除文件')
    return
  }

  await ElMessageBox.confirm(`确定从当前知识库删除文件「${row.fileName || row.id}」吗？`, '删除确认', {
    type: 'warning'
  })

  await deleteKnowledgeFile(row.id)
  ElMessage.success('文件记录已删除')

  await loadFiles()
  await loadBases(selectedBase.value?.id)
}

function fileStatusLabel(row = {}) {
  const parseStatus = Number(row.parseStatus)
  const embeddingStatus = Number(row.embeddingStatus)
  if (parseStatus === 3 || embeddingStatus === 3) return '入库失败'
  if (parseStatus === 1 || embeddingStatus === 1) return '解析中'
  if (parseStatus === 2 && embeddingStatus === 2) return '解析成功'
  if (parseStatus === 2) return '待向量化'
  return '未解析'
}

function fileStatusClass(row = {}) {
  const label = fileStatusLabel(row)
  if (label === '解析成功') return 'success'
  if (label === '解析中' || label === '待向量化') return 'processing'
  if (label === '入库失败') return 'danger'
  return 'waiting'
}

function isFileParseSuccessWithIndexError(row = {}) {
  return fileStatusLabel(row) === '解析成功' && Boolean(String(row.errorMsg || '').trim())
}

function hasFileStatusTip(row = {}) {
  if (isFileProcessing(row)) return false
  return Boolean(String(row.errorMsg || '').trim())
}

function fileStatusTipLabel(row = {}) {
  return isFileParseSuccessWithIndexError(row) ? '索引异常' : '错误'
}

function fileStatusTipTagType(row = {}) {
  return isFileParseSuccessWithIndexError(row) ? 'warning' : 'danger'
}

function fileStatusTip(row = {}) {
  const errorMsg = String(row.errorMsg || '').trim()
  if (!errorMsg) return ''
  if (isFileProcessing(row)) return ''
  if (isFileParseSuccessWithIndexError(row)) {
    return '文件内容已解析成功，但检索索引同步异常；可能影响检索和问答命中。请检查 OpenSearch 配置或点击重新入库。'
  }
  return errorMsg
}

function formatFileSize(size) {
  const value = Number(size || 0)
  if (value < 1024) return `${value} B`
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(2)} KB`
  if (value < 1024 * 1024 * 1024) return `${(value / 1024 / 1024).toFixed(2)} MB`
  return `${(value / 1024 / 1024 / 1024).toFixed(2)} GB`
}

function formatReferenceTitle(item = {}) {
  return item.citation || buildReferenceParts(item).join(' · ') || item.fileName || `文件#${item.knowledgeFileId}`
}

function buildReferenceParts(item = {}) {
  const parts = []
  if (item.fileName) parts.push(item.fileName)
  if (item.sourceRef) parts.push(item.sourceRef)
  else if (item.pageNo && item.pageEndNo && String(item.pageNo) !== String(item.pageEndNo)) parts.push(`第 ${item.pageNo}-${item.pageEndNo} 页`)
  else if (item.pageNo) parts.push(`第 ${item.pageNo} 页`)
  else if (item.slideNo) parts.push(`幻灯片 ${item.slideNo}`)
  else if (item.sheetName) parts.push(`工作表：${item.sheetName}`)
  if (item.sectionTitle && !parts.some((part) => String(part).includes(item.sectionTitle))) parts.push(item.sectionTitle)
  return parts.filter(Boolean)
}

function formatReferenceMeta(item = {}) {
  const meta = []
  if (item.chunkIndex !== undefined && item.chunkIndex !== null) meta.push(`切片 ${item.chunkIndex}`)
  if (item.retrievalSource) meta.push(item.retrievalSource)
  if (item.blockType) meta.push(item.blockType)
  return meta.join(' · ')
}

function referencePreview(item = {}) {
  return item.contentPreview || item.content || ''
}



function openQualityDialog(row) {
  qualityDialog.row = row || null
  qualityDialog.visible = true
}

function qualityLabel(row = {}) {
  const level = String(row.parseQualityLevel || '').toUpperCase()
  const score = row.parseQualityScore === undefined || row.parseQualityScore === null ? '-' : row.parseQualityScore
  const map = { HIGH: '高', MEDIUM: '中', LOW: '低' }
  if (!level && score === '-') return '待解析'
  return `${map[level] || level || '-'} / ${score}`
}

function prettyJson(value) {
  if (!value) return '暂无解析质量报告。'
  try {
    const obj = typeof value === 'string' ? JSON.parse(value) : value
    return JSON.stringify(obj, null, 2)
  } catch (e) {
    return String(value)
  }
}

function checkTagType(status) {
  const value = String(status || '').toUpperCase()
  if (value === 'PASS') return 'success'
  if (value === 'WARN') return 'warning'
  return 'danger'
}

function formatScore(score) {
  const value = Number(score || 0)
  return value.toFixed(4)
}

function formatTime(value) {
  if (!value) return '-'
  return String(value).replace('T', ' ').slice(0, 19)
}
</script>

<style scoped>
.kb-page-wrap {
  height: 100%;
  padding: 0;
}

.kb-shell {
  display: grid;
  grid-template-columns: 292px minmax(0, 1fr);
  gap: 12px;
  width: 100%;
  height: 100%;
  min-height: 0;
}

.kb-sidebar,
.kb-main {
  min-width: 0;
  min-height: 0;
  background: #fff;
  border: 1px solid #e7edf7;
  box-shadow: 0 18px 44px rgba(31, 41, 55, 0.05);
}

.kb-sidebar {
  display: flex;
  flex-direction: column;
  padding: 16px 12px 12px;
  border-radius: 14px;
}

.kb-sidebar-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.kb-sidebar-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 17px;
  font-weight: 800;
  color: #111827;
}

.kb-search {
  margin-bottom: 12px;
}

.kb-search :deep(.el-input__wrapper) {
  height: 38px;
  border-radius: 6px;
  box-shadow: 0 0 0 1px #d9e2ef inset;
}

.kb-list-scroll {
  flex: 1;
  min-height: 0;
}

.kb-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 0 2px 8px 0;
}

.kb-card {
  padding: 12px 12px;
  border: 1px solid transparent;
  border-radius: 8px;
  background: #f8fbff;
  cursor: pointer;
  transition: all 0.18s ease;
}

.kb-card:hover {
  background: #f0f6ff;
  border-color: #d9e8ff;
}

.kb-card.active {
  background: #edf4ff;
  border-color: #cbdcff;
}

.kb-card-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.kb-card-name {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  color: #111827;
  font-weight: 800;
}

.kb-card-name span {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.folder-icon {
  color: #f59e0b;
  font-size: 18px;
  flex-shrink: 0;
}

.kb-more {
  width: 24px;
  height: 24px;
  padding: 0;
  color: #64748b;
}

.kb-card-meta {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 10px;
  padding-left: 24px;
  color: #6b7280;
  font-size: 12px;
}

.kb-card-tags {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  margin-top: 10px;
  padding-left: 24px;
}

.kb-mini-tag {
  display: inline-flex;
  align-items: center;
  height: 22px;
  padding: 0 8px;
  border-radius: 6px;
  background: #e8f2ff;
  color: #2563eb;
  font-size: 12px;
}

.kb-mini-tag.muted-tag {
  background: #f3f4f6;
  color: #6b7280;
}

.kb-list-empty,
.kb-list-end {
  padding: 16px 0 8px;
  color: #8a95a8;
  text-align: center;
  font-size: 13px;
}

.kb-sidebar-footer {
  padding-top: 12px;
}

.new-base-btn {
  width: 100%;
  height: 42px;
  border: none;
  border-radius: 5px;
  background: linear-gradient(90deg, #2563eb, #7c3aed);
  font-weight: 700;
}

.kb-main {
  display: flex;
  flex-direction: column;
  padding: 22px 22px 18px;
  border-radius: 14px;
  overflow: hidden;
}

.kb-detail-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 20px;
  padding-bottom: 18px;
  border-bottom: 1px solid #edf1f7;
}

.kb-title-block {
  min-width: 0;
  flex: 1;
}

.kb-detail-title {
  color: #111827;
  font-size: 24px;
  font-weight: 900;
  line-height: 1.28;
}

.kb-detail-sub {
  margin-top: 8px;
  color: #64748b;
  font-size: 16px;
  line-height: 1.5;
  word-break: break-all;
}

.kb-detail-actions {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-shrink: 0;
}

.kb-detail-actions .el-button {
  height: 40px;
  padding: 0 22px;
  border-radius: 7px;
  font-size: 16px;
  font-weight: 700;
}

.kb-detail-actions .el-button--primary {
  height: 44px;
  min-width: 138px;
  border-radius: 8px;
  background: #2f6bff;
  box-shadow: 0 8px 18px rgba(47, 107, 255, 0.18);
}

.kb-upload-card {
  display: flex;
  min-height: 108px;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: 8px;
  padding: 18px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.18s ease;
}

.kb-upload-card:hover {
  transform: translateY(-1px);
  box-shadow: 0 12px 24px rgba(37, 99, 235, 0.08);
}

.kb-upload-card.primary {
  background: linear-gradient(135deg, #edf4ff, #f4f8ff);
}

.kb-upload-card.purple {
  background: linear-gradient(135deg, #f3eaff, #f8f2ff);
}

.kb-upload-card .el-icon {
  color: #4d79ff;
  font-size: 18px;
}

.kb-file-section {
  display: flex;
  flex: 1;
  min-height: 0;
  flex-direction: column;
  padding-top: 0;
}

.kb-table-head {
  display: grid;
  grid-template-columns: 1fr auto auto;
  align-items: center;
  gap: 10px;
  height: 48px;
  padding: 0 12px;
  background: #f8fafc;
  border-radius: 6px 6px 0 0;
  border: 1px solid #eef2f7;
  border-bottom: none;
}

.kb-table-title {
  color: #111827;
  font-weight: 800;
}

.kb-table-summary {
  color: #7a869a;
  font-size: 13px;
}

.refresh-file-btn {
  width: 32px;
  height: 32px;
  padding: 0;
}

.kb-file-table {
  flex: 1;
}

.kb-file-table :deep(.el-table__header-wrapper th.el-table__cell) {
  background: #f7f7f8;
  color: #8a94a6;
  font-weight: 800;
}

.kb-file-table :deep(.el-table__cell) {
  border-color: #f0f2f6;
}

.file-name-cell {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.file-doc-icon {
  color: #2f7cff;
  font-size: 16px;
  flex-shrink: 0;
}

.file-name-text {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.file-state {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: #64748b;
  font-size: 14px;
}

.state-dot {
  width: 6px;
  height: 6px;
  border-radius: 999px;
  background: currentColor;
}

.file-state.success {
  color: #16a34a;
}

.file-state.processing {
  color: #f59e0b;
}

.file-state.danger {
  color: #ef4444;
}

.file-state.waiting {
  color: #8a94a6;
}

.error-tag {
  margin-left: 6px;
}

.compact-actions {
  justify-content: flex-end;
}

.kb-empty-panel {
  position: relative;
  display: flex;
  flex: 1;
  min-height: 0;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  padding: 32px;
  text-align: center;
  overflow: hidden;
}

.empty-hero {
  position: absolute;
  top: 0;
  width: min(720px, 62%);
  height: 170px;
  border-radius: 0 0 28px 28px;
  background:
    radial-gradient(circle at 82% 48%, rgba(95, 125, 255, 0.18) 0 18px, transparent 19px),
    radial-gradient(circle at 88% 25%, rgba(100, 221, 255, 0.35) 0 8px, transparent 9px),
    linear-gradient(135deg, #eef6ff, #f9fbff);
  opacity: 0.95;
}

.empty-title {
  position: relative;
  margin-top: 58px;
  color: #1f2937;
  font-size: 28px;
  font-weight: 500;
}

.empty-desc {
  position: relative;
  width: min(560px, 90%);
  margin-top: 16px;
  color: #8a94a6;
  font-size: 14px;
  line-height: 1.8;
}

.empty-feature-row {
  position: relative;
  display: grid;
  grid-template-columns: minmax(0, 1fr) 96px minmax(0, 1fr) 96px minmax(0, 1fr);
  align-items: center;
  width: min(760px, 96%);
  margin-top: 48px;
}

.empty-feature {
  display: flex;
  align-items: center;
  flex-direction: column;
}

.feature-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  border-radius: 14px;
  color: #fff;
  box-shadow: 0 12px 24px rgba(47, 107, 255, 0.18);
}

.feature-icon.blue {
  background: linear-gradient(135deg, #4f8cff, #2f6bff);
}

.feature-icon.purple {
  background: linear-gradient(135deg, #8b7cff, #4f6dff);
}

.feature-icon.cyan {
  background: linear-gradient(135deg, #89b6ff, #6f7cff);
}

.feature-icon .el-icon {
  font-size: 24px;
}

.feature-line {
  height: 1px;
  background: #dce4f1;
}

.feature-title {
  margin-top: 24px;
  color: #5c6473;
  font-size: 18px;
  font-weight: 700;
}

.feature-desc {
  margin-top: 14px;
  color: #8a94a6;
  font-size: 14px;
  line-height: 1.7;
}

.empty-new-btn {
  position: relative;
  width: 170px;
  height: 42px;
  margin-top: 52px;
  border: none;
  border-radius: 5px;
  background: linear-gradient(90deg, #2563eb, #7c3aed);
  font-weight: 800;
}

.dialog-actions {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 12px;
}

.hit-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-height: 440px;
  overflow: auto;
}

.hit-card {
  padding: 12px;
  border: 1px solid var(--border);
  border-radius: 10px;
  background: #f8fafc;
}

.hit-head {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 8px;
  color: var(--text-sub);
  font-size: 13px;
}

.hit-head--stack {
  flex-direction: column;
  gap: 4px;
}

.hit-source-title {
  color: var(--text-main);
  font-weight: 800;
  line-height: 1.5;
}

.hit-source-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  color: var(--text-sub);
}

.hit-content {
  color: var(--text-main);
  line-height: 1.7;
  white-space: pre-wrap;
}

.ask-alert {
  margin-bottom: 12px;
}

.answer-box {
  padding: 14px;
  margin-bottom: 14px;
  border: 1px solid #bfdbfe;
  border-radius: 12px;
  background: #eff6ff;
}

.answer-box--warning {
  border-color: #fde68a;
  background: #fffbeb;
}

.answer-title {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
  font-weight: 800;
}

.answer-content {
  line-height: 1.8;
  white-space: pre-wrap;
}

@media (max-width: 1280px) {
  .kb-shell {
    grid-template-columns: 270px minmax(0, 1fr);
  }

  .kb-detail-head {
    flex-direction: column;
  }

  .kb-detail-actions {
    width: 100%;
    justify-content: flex-end;
  }
}

@media (max-width: 980px) {
  .kb-shell {
    grid-template-columns: 1fr;
  }

  .kb-sidebar {
    min-height: 320px;
  }


  .empty-feature-row {
    grid-template-columns: 1fr;
    gap: 20px;
  }

  .feature-line {
    display: none;
  }
}
.preview-box,
.check-box,
.feedback-box,
.review-box {
  margin-top: 12px;
  padding: 12px;
  border: 1px solid #e7edf7;
  border-radius: 8px;
  background: #f8fbff;
}

.query-variants {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin: 8px 0 10px;
}

.query-chip {
  padding: 3px 8px;
  border-radius: 999px;
  background: #eef4ff;
  color: #2554a6;
  font-size: 12px;
}

.check-list {
  display: grid;
  gap: 6px;
  margin-top: 8px;
  color: #374151;
  line-height: 1.6;
}

.check-list.muted {
  color: #6b7280;
}

.feedback-box {
  display: grid;
  gap: 10px;
}

.feedback-reason {
  max-width: 100%;
}

.review-box {
  display: grid;
  grid-template-columns: 180px minmax(0, 1fr) auto;
  gap: 8px;
  align-items: center;
}

.json-preview {
  margin-top: 12px;
  padding: 12px;
  max-height: 360px;
  overflow: auto;
  border-radius: 8px;
  background: #0f172a;
  color: #dbeafe;
  font-size: 12px;
  line-height: 1.6;
}

.analysis-tabs {
  margin-top: 10px;
}

.hit-list--compact {
  max-height: 320px;
  overflow: auto;
}

</style>

