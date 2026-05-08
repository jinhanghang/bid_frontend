<template>
  <div class="solution-shell" :class="shellClass">
    <aside class="solution-list-card">
      <div class="list-title">
        <el-icon><Menu /></el-icon>
        <span>我的方案</span>
      </div>
      <el-input
        v-model="listQuery.keyword"
        class="solution-search"
        placeholder="搜索方案"
        clearable
        :prefix-icon="Search"
        @input="onSearchInput"
      />
      <el-scrollbar class="solution-list-scroll">
        <div v-if="solutions.length" class="solution-list">
          <div
            v-for="item in solutions"
            :key="item.id"
            class="solution-card"
            :class="{ active: currentSolution?.id === item.id }"
            @click="loadDetail(item.id)"
          >
            <div class="solution-card-name">
              <el-icon><Document /></el-icon>
              <span>{{ item.solutionName }}</span>
            </div>
            <div class="solution-card-time">创建于{{ formatDateTime(item.createTime) }}</div>
            <div class="solution-card-tags">
              <el-tag size="small" type="primary">{{ levelLabel(item.aiLevel) }}</el-tag>
              <el-tag size="small" type="info">{{ statusLabel(item.status) }}</el-tag>
            </div>
            <div class="solution-card-actions">
              <el-tooltip content="编辑" placement="top">
                <el-button circle size="small" type="danger" :icon="EditPen" @click.stop="loadDetail(item.id)" />
              </el-tooltip>
              <el-tooltip content="删除" placement="top">
                <el-button circle size="small" type="info" :icon="Delete" @click.stop="onDeleteSolution(item)" />
              </el-tooltip>
            </div>
          </div>
          <div class="no-more">——没有更多方案了——</div>
        </div>
        <el-empty v-else description="暂无方案，您可先新建方案" :image-size="110" />
      </el-scrollbar>
      <el-button class="new-btn" type="primary" @click="startCreate">新建方案</el-button>
    </aside>

    <section class="solution-main-card">
      <template v-if="mode === 'home'">
        <div class="home-panel">
          <h1>AI方案</h1>
          <p class="home-desc">根据招标方的采购需求、服务需求、技术要求等，配合评分标准或用户自定义约束条件，智能撰写技术方案、服务方案及其他需求方案。</p>
          <div class="mode-cards">
            <div class="mode-card pink" @click="startCreate('QUICK')">
              <h3>快速编写模式</h3>
              <p>上传招标文件后自动识别采购需求、服务需求、技术要求，快速生成目录和正文。</p>
              <div class="mode-ill">AI</div>
            </div>
            <div class="mode-card blue" @click="startCreate('SCORE')">
              <h3>快捷评分模式</h3>
              <p>在采购需求基础上结合评分标准，生成更贴合评审要点的方案目录。</p>
              <div class="mode-ill">AI</div>
            </div>
            <div class="mode-card purple" @click="startCreate('CUSTOM')">
              <h3>定制评分模式</h3>
              <p>支持补充章节要求、编写方向、评分项约束，生成更精准的方案结构。</p>
              <div class="mode-ill">AI</div>
            </div>
          </div>
          <el-button type="primary" class="home-new-btn" @click="startCreate">新建方案</el-button>
        </div>
      </template>

      <template v-else-if="mode === 'create'">
        <div class="create-panel">
          <div class="create-header">
            <el-button :icon="ArrowLeft" @click="mode = currentSolution ? 'detail' : 'home'">退出新建</el-button>
            <el-steps :active="createStep" align-center class="steps">
              <el-step title="选择方案类型" />
              <el-step title="录入基础信息" />
              <el-step title="生成预览目录" />
              <el-step title="调整总字数" />
              <el-step title="生成方案" />
            </el-steps>
          </div>
          <div class="create-body">
            <div class="create-left">
              <div class="form-section">
                <div class="form-label required">方案类型：</div>
                <div class="type-grid">
                  <el-select v-model="createForm.solutionType" placeholder="服务" class="type-select">
                    <el-option label="服务" value="SERVICE" />
                    <el-option label="工程" value="ENGINEERING" />
                    <el-option label="货物" value="GOODS" />
                    <el-option label="监理" value="SUPERVISION" />
                    <el-option label="IT信息" value="IT" />
                    <el-option label="其他" value="OTHER" />
                  </el-select>
                  <el-select v-model="createForm.solutionSubType" placeholder="不限" class="type-select">
                    <el-option label="不限" value="不限" />
                    <el-option v-for="sub in subTypes" :key="sub" :label="sub" :value="sub" />
                  </el-select>
                </div>
              </div>

              <div class="form-section">
                <div class="form-label required">选择AI：</div>
                <div class="ai-levels">
                  <div
                    v-for="level in aiLevels"
                    :key="level.value"
                    class="ai-level-card"
                    :class="{ active: createForm.aiLevel === level.value }"
                    @click="createForm.aiLevel = level.value"
                  >
                    <strong>{{ level.label }}</strong>
                    <span>{{ level.desc }}</span>
                    <small>将消耗字数套餐，无次数限制</small>
                  </div>
                </div>
              </div>

              <div class="form-section">
                <div class="form-label">智能读取：</div>
                <el-upload
                  class="tender-upload"
                  drag
                  :auto-upload="false"
                  :show-file-list="false"
                  accept=".doc,.docx,.pdf,.txt,.md"
                  :on-change="handleTenderFileChange"
                >
                  <template v-if="parseTask">
                    <el-icon class="upload-icon"><Document /></el-icon>
                    <div class="upload-name">{{ parseTask.fileName }}</div>
                    <div class="upload-status" :class="parseTask.status?.toLowerCase()">
                      {{ parseTask.message || statusLabel(parseTask.status) }} {{ parseTask.progress || 0 }}%
                    </div>
                  </template>
                  <template v-else>
                    <el-icon class="upload-icon"><UploadFilled /></el-icon>
                    <div>上传单个招标文件（Word/PDF/TXT）智能读取标书信息</div>
                    <small>温馨提示：解析标书前将清空基础信息表单</small>
                  </template>
                </el-upload>
              </div>

              <div class="form-section">
                <div class="form-label required">方案名称：</div>
                <el-input v-model="createForm.solutionName" placeholder="请填写方案名称" />
              </div>

              <div class="form-section">
                <div class="inline-title">
                  <span class="required">采购需求：</span>
                  <el-button size="small" :loading="parseLoading" @click="reExtractFromParse">从招标文件重新提取</el-button>
                </div>
                <el-input v-model="requirementForm.purchaseRequirement" type="textarea" :rows="8" maxlength="100000" show-word-limit placeholder="请上传招标文件后自动提取，也可手工粘贴采购需求" />
              </div>

              <div class="form-section">
                <div class="inline-title">
                  <span>评分标准 / 技术评分项：</span>
                  <el-button size="small" @click="scoreDialogVisible = true">查看/编辑评分项</el-button>
                </div>
                <el-input v-model="requirementForm.scoreRequirement" type="textarea" :rows="5" maxlength="100000" show-word-limit placeholder="评分标准：没有评分项时可留空，系统会按采购需求生成目录" />
              </div>

              <div class="form-section">
                <div class="form-label required">目录要求：</div>
                <el-radio-group v-model="outlineForm.outlineMode" class="outline-mode">
                  <el-radio-button label="SCORE_ITEM">评分项</el-radio-button>
                  <el-radio-button label="CUSTOM_CHAPTER">定制章</el-radio-button>
                  <el-radio-button label="REQUIREMENT">按采购需求生成</el-radio-button>
                </el-radio-group>
                <el-input v-model="requirementForm.outlineRequirement" type="textarea" :rows="4" maxlength="100000" show-word-limit placeholder="可补充目录要求，例如必须包含项目背景、系统功能、交付计划、运维保障等" />
              </div>
            </div>

            <div class="create-right">
              <div class="preview-head">
                <strong>预览目录 {{ outlineLeafCount }}</strong>
                <span>一键差异化目录可改变标题内容，减少查重隐患</span>
              </div>
              <el-scrollbar class="preview-scroll">
                <el-empty v-if="!previewOutlines.length" description="暂无目录，请在左侧输入目录要求，点击下方生成按钮" />
                <OutlineTree v-else :nodes="previewOutlines" simple />
              </el-scrollbar>
              <div class="preview-actions">
                <el-button type="primary" :loading="outlineGenerating" :disabled="!canClickGenerateOutline" @click="onGenerateOutline">{{ generateOutlineButtonText }}</el-button>
              </div>
            </div>
          </div>
        </div>
      </template>

      <template v-else-if="currentSolution">
        <div class="detail-panel">
          <div class="detail-top">
            <div>
              <h2>{{ currentSolution.solutionName }}</h2>
              <div class="stats-row">
                <span>目标字数：<b class="red">{{ currentSolution.targetWordCount || 0 }}</b> 字</span>
                <span>生成字数：<b class="green">{{ currentSolution.actualWordCount || 0 }}</b> 字</span>
                <span>预计页数：<b class="red">{{ currentSolution.estimatePages || 0 }}</b> 页</span>
                <span>预估页数：<b class="green">{{ currentSolution.actualPages || 0 }}</b> 页</span>
              </div>
              <div class="note">注：页数仅供参考，实际请以导出结果为准</div>
            </div>
            <el-button :icon="editMode ? Close : EditPen" :disabled="!canEditOutline" @click="toggleEditMode">{{ editMode ? '退出编辑' : '编辑' }}</el-button>
          </div>

          <template v-if="editMode">
            <div class="edit-tabs">
              <button :class="{ active: editTab === 'word' }" @click="editTab = 'word'">修改字数</button>
              <button :class="{ active: editTab === 'direction' }" @click="editTab = 'direction'">编写方向</button>
              <button :class="{ active: editTab === 'add' }" @click="editTab = 'add'">新增节点</button>
              <button :class="{ active: editTab === 'delete' }" @click="editTab = 'delete'">删除节点</button>
              <button :class="{ active: editTab === 'sort' }" @click="editTab = 'sort'">节点排序</button>
            </div>
            <el-scrollbar class="edit-scroll">
              <section v-if="editTab === 'word'" class="edit-section">
                <OutlineTree :nodes="currentSolution.outlines" mode="word" @word-change="onNodeWordChange" @batch-word="onBatchWord" />
              </section>

              <section v-else-if="editTab === 'direction'" class="edit-section direction-section">
                <div class="overall-card">
                  <div class="card-title">
                    <span>方案整体编写要求</span>
                    <div>
                      <el-button size="small" type="primary" plain @click="streamOverallDirection">AI帮写</el-button>
                      <el-button size="small" type="primary" @click="onSaveOverallRequirement">保存</el-button>
                    </div>
                  </div>
                  <el-input v-model="overallWritingRequirement" type="textarea" :rows="4" maxlength="10000" show-word-limit placeholder="请输入方案整体编写要求，例如禁止使用某些称谓、语言风格、格式要求等" />
                </div>
                <WritingDirectionEditor
                  :nodes="currentSolution.outlines"
                  :streaming-id="streamingOutlineId"
                  @ai-write="onAiWriteDirection"
                  @save="onSaveWritingConfig"
                />
              </section>

              <section v-else-if="editTab === 'add'" class="edit-section">
                <OutlineTree :nodes="currentSolution.outlines" mode="add" @add-node="openAddNodeDialog" />
              </section>

              <section v-else-if="editTab === 'delete'" class="edit-section">
                <div class="delete-bar">
                  <el-button type="danger" :disabled="!deleteIds.length" @click="onDeleteNodes">删除选中项</el-button>
                </div>
                <OutlineTree :nodes="currentSolution.outlines" mode="delete" v-model:selected="deleteIds" />
              </section>

              <section v-else class="edit-section">
                <OutlineTree :nodes="currentSolution.outlines" mode="sort" @move="onMoveNode" />
              </section>
            </el-scrollbar>
          </template>

          <template v-else>
            <el-scrollbar class="detail-scroll">
              <el-progress :percentage="generatePercent" :show-text="false" color="#ff4d4f" />
              <OutlineTree :nodes="currentSolution.outlines" mode="generate" @section-generate="openSectionDialog" />
            </el-scrollbar>
            <div class="detail-actions">
              <el-button size="large" :disabled="!canRewriteAll" @click="onRewriteFull" :loading="fullGenerating || hasRunningTask">重编全文</el-button>
              <el-button size="large" type="primary" :disabled="!canGenerate" @click="onGenerateFull" :loading="fullGenerating || hasRunningTask">开始生成</el-button>
              <el-button size="large" type="success" :disabled="!canExport" @click="onExportWord">导出Word</el-button>
            </div>
          </template>
        </div>
      </template>
    </section>

    <section v-if="showRightPreview" class="right-preview-card">
      <div v-if="selectedSection?.section?.content" class="section-preview">
        <h3>{{ selectedSection.title }}</h3>
        <pre>{{ selectedSection.section.content }}</pre>
      </div>
      <div v-else class="right-home">
        <h1>AI方案</h1>
        <p>右侧用于预览目录、查看章节正文和生成结果。正文生成后，可点击章节查看内容。</p>
      </div>
    </section>

    <el-dialog v-model="wordPresetVisible" title="预设篇幅" width="720px" append-to-body>
      <div class="preset-box">
        <div class="preset-row">
          <span>自动分配</span>
          <el-button :type="wordPreset.mode === 'AUTO' ? 'primary' : 'default'" @click="wordPreset.mode = 'AUTO'">自由发挥</el-button>
        </div>
        <div class="preset-row">
          <span>精致小页数</span>
          <el-button v-for="n in [300, 600, 900]" :key="n" :type="wordPreset.wordCount === n ? 'primary' : 'default'" @click="setPreset('FIXED', n)">每段{{ n }}字</el-button>
        </div>
        <div class="preset-row">
          <span>常规中篇幅</span>
          <el-button v-for="n in [1200, 1800, 2700, 3600, 4500]" :key="n" :type="wordPreset.wordCount === n ? 'primary' : 'default'" @click="setPreset('FIXED', n)">每段{{ n }}字</el-button>
        </div>
        <div class="preset-row">
          <span>丰富大篇幅</span>
          <el-button v-for="n in [5400, 6300, 7200, 8100, 9000, 9900]" :key="n" :type="wordPreset.wordCount === n ? 'primary' : 'default'" @click="setPreset('FIXED', n)">每段{{ n }}字</el-button>
        </div>
      </div>
      <template #footer>
        <el-button @click="wordPresetVisible = false">取消</el-button>
        <el-button type="primary" :loading="wordPresetSaving" @click="onApplyWordPreset">确认并完成新建</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="scoreDialogVisible" title="评分项" width="860px" append-to-body>
      <div class="score-dialog-body">
        <div>
          <div class="dialog-label">完整评分标准</div>
          <el-input v-model="requirementForm.scoreRequirement" type="textarea" :rows="16" placeholder="本次提供的招标信息中未包含评分标准时，可手动补充" />
        </div>
        <div>
          <div class="dialog-label">技术评分项</div>
          <el-input v-model="requirementForm.technicalScoreItems" type="textarea" :rows="16" placeholder="技术评分项用于生成更贴合技术标的目录" />
        </div>
      </div>
      <template #footer>
        <el-button @click="scoreDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="scoreDialogVisible = false">使用技术评分项</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="addNodeVisible" title="新增目录节点" width="520px" append-to-body>
      <el-form label-width="90px">
        <el-form-item label="标题">
          <el-input v-model="addNodeForm.title" placeholder="请输入节点标题" />
        </el-form-item>
        <el-form-item label="插入方式">
          <el-radio-group v-model="addNodeForm.insertType">
            <el-radio-button label="CHILD">作为子节点</el-radio-button>
            <el-radio-button label="SIBLING_AFTER">作为同级后节点</el-radio-button>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="目标字数">
          <el-select v-model="addNodeForm.targetWordCount">
            <el-option v-for="n in wordOptions" :key="n" :label="`${n}字`" :value="n" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="addNodeVisible = false">取消</el-button>
        <el-button type="primary" @click="onAddNode">保存</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="sectionDialogVisible" title="单章节生成" width="720px" append-to-body>
      <el-form label-width="90px" class="section-form">
        <el-form-item label="标题">
          <el-input v-model="sectionForm.title" />
        </el-form-item>
        <el-form-item label="单段字数">
          <el-select v-model="sectionForm.targetWordCount" style="width: 180px">
            <el-option v-for="n in wordOptions" :key="n" :label="`${n}字`" :value="n" />
          </el-select>
        </el-form-item>
        <el-form-item label="图表数量">
          <el-radio-group v-model="sectionForm.chartLevel">
            <el-radio-button label="NONE">无</el-radio-button>
            <el-radio-button label="LESS">较少</el-radio-button>
            <el-radio-button label="NORMAL">一般</el-radio-button>
            <el-radio-button label="MORE">较多</el-radio-button>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="表格数量">
          <el-radio-group v-model="sectionForm.tableLevel">
            <el-radio-button label="NONE">无</el-radio-button>
            <el-radio-button label="LESS">较少</el-radio-button>
            <el-radio-button label="NORMAL">一般</el-radio-button>
            <el-radio-button label="MORE">较多</el-radio-button>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="图片数量">
          <el-radio-group v-model="sectionForm.imageLevel">
            <el-radio-button label="NONE">无</el-radio-button>
            <el-radio-button label="LESS">较少</el-radio-button>
            <el-radio-button label="NORMAL">一般</el-radio-button>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="编写方向">
          <el-input v-model="sectionForm.writingDirection" type="textarea" :rows="5" maxlength="10000" show-word-limit />
        </el-form-item>
        <el-form-item label="编写要求">
          <el-input v-model="sectionForm.writingRequirement" type="textarea" :rows="3" maxlength="10000" show-word-limit placeholder="请输入本章节特殊编写要求" />
        </el-form-item>
        <el-form-item label="写作风格">
          <el-radio-group v-model="sectionForm.writingStyle">
            <el-radio-button label="GENERAL">通用型</el-radio-button>
            <el-radio-button label="DATA">数据型</el-radio-button>
            <el-radio-button label="CONCISE">简约型</el-radio-button>
            <el-radio-button label="PRACTICAL">实用型</el-radio-button>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="流式结果">
          <el-input v-model="sectionStreamingText" type="textarea" :rows="8" readonly placeholder="点击生成本段后，这里会实时输出" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="sectionDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="sectionGenerating" @click="onGenerateSection">生成本段</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { computed, defineComponent, h, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { ElButton, ElCheckbox, ElIcon, ElInput, ElMessage, ElMessageBox, ElOption, ElSelect, ElTag } from 'element-plus'
import { ArrowLeft, Close, Delete, Document, EditPen, Menu, Plus, Search, SortDown, SortUp, UploadFilled } from '@element-plus/icons-vue'
import {
  addOutlineNode,
  applyWordCountPreset,
  batchUpdateOutlineWordCount,
  createSolution,
  deleteOutlineNodes,
  deleteSolution,
  exportWord,
  generateFull,
  generateOutline,
  getGenerationTask,
  getParseTask,
  getSolution,
  moveOutlineNode,
  pageSolutions,
  rewriteFull,
  saveOverallWritingRequirement,
  saveRequirement,
  streamSection,
  streamWritingDirection,
  updateOutlineWordCount,
  updateWritingConfig,
  uploadAndParseTenderFile
} from '@/api/aiSolution'

const mode = ref('home')
const loading = ref(false)
const solutions = ref([])
const currentSolution = ref(null)
const selectedSection = ref(null)
const listQuery = reactive({ pageNum: 1, pageSize: 20, keyword: '' })
let searchTimer = null
let parseTimer = null
let taskTimer = null

const createStep = ref(0)
const parseTask = ref(null)
const parseLoading = ref(false)
const outlineGenerating = ref(false)
const previewOutlines = computed(() => currentSolution.value?.outlines || [])
const outlineLeafCount = computed(() => flattenLeaf(previewOutlines.value).length)
const parseDone = computed(() => parseTask.value?.status === 'SUCCESS')
const canClickGenerateOutline = computed(() => {
  return !outlineGenerating.value
    && !parseLoading.value
    && parseDone.value
    && !!createForm.solutionName?.trim()
    && !!requirementForm.purchaseRequirement?.trim()
})
const generateOutlineButtonText = computed(() => {
  if (outlineGenerating.value) return '生成中'
  if (!parseTask.value?.id) return '请先上传标书'
  if (parseTask.value.status === 'FAILED') return '解析失败，无法生成'
  if (!parseDone.value) return '解析完成后生成目录'
  return '生成目录'
})
const scoreDialogVisible = ref(false)
const wordPresetVisible = ref(false)
const wordPresetSaving = ref(false)
const wordPreset = reactive({ mode: 'FIXED', wordCount: 300 })
const editMode = ref(false)
const editTab = ref('word')
const deleteIds = ref([])
const addNodeVisible = ref(false)
const addBaseNode = ref(null)
const addNodeForm = reactive({ title: '', insertType: 'CHILD', targetWordCount: 300 })
const streamingOutlineId = ref(null)
const fullGenerating = ref(false)
const sectionDialogVisible = ref(false)
const sectionGenerating = ref(false)
const sectionNode = ref(null)
const sectionStreamingText = ref('')
const overallWritingRequirement = ref('')

const createForm = reactive({
  solutionMode: 'QUICK',
  solutionType: 'SERVICE',
  solutionSubType: '不限',
  aiLevel: 'BASIC',
  writingStyle: 'GENERAL',
  solutionName: ''
})

const requirementForm = reactive({
  purchaseRequirement: '',
  technicalRequirement: '',
  serviceRequirement: '',
  scoreRequirement: '',
  technicalScoreItems: '',
  otherRequirement: '',
  outlineRequirement: ''
})

const sectionForm = reactive({
  title: '',
  targetWordCount: 300,
  chartLevel: 'NONE',
  tableLevel: 'NONE',
  imageLevel: 'NONE',
  knowledgeIds: '',
  fileResourceIds: '',
  writingDirection: '',
  writingRequirement: '',
  writingStyle: 'GENERAL',
  overwrite: true
})

const aiLevels = [
  { label: '基础版', value: 'BASIC', desc: '快速生成基础内容，满足常规投标需求。' },
  { label: '标准版', value: 'STANDARD', desc: '深度优化逻辑结构，提升文案专业水准。' },
  { label: '旗舰版', value: 'FLAGSHIP', desc: '精准对标评分项，增强中标表达。' }
]

const wordOptions = [300, 600, 900, 1200, 1800, 2700, 3600, 4500, 5400, 6300, 7200, 8100, 9000, 9900]
const subTypeMap = {
  SERVICE: ['物业管理', '审计服务', '广告印刷', '车辆维修', '医疗服务', '咨询服务'],
  ENGINEERING: ['房建工程', '拆除工程', '水利工程', '市政工程', '电信工程'],
  GOODS: ['食堂采购', '安防设备', '百货采购', '建筑采购', '水果采购', '生活用品', '办公设备'],
  SUPERVISION: ['房建监理', '市政监理', '水利监理'],
  IT: ['软件开发', '信息安全', '系统集成'],
  OTHER: ['其他']
}
const subTypes = computed(() => subTypeMap[createForm.solutionType] || [])
const generatePercent = computed(() => {
  const target = currentSolution.value?.targetWordCount || 0
  const actual = currentSolution.value?.actualWordCount || 0
  if (!target) return 0
  return Math.min(100, Math.round((actual * 100) / target))
})

const showRightPreview = computed(() => mode.value === 'detail' && !!currentSolution.value)
const shellClass = computed(() => ({
  'with-preview': showRightPreview.value,
  'no-preview': !showRightPreview.value
}))
const hasRunningTask = computed(() => {
  const status = currentSolution.value?.runningTask?.status
  return status === 'WAITING' || status === 'RUNNING'
})
const canEditOutline = computed(() => currentSolution.value?.canEditOutline !== false && !hasRunningTask.value)
const canGenerate = computed(() => currentSolution.value?.canGenerate !== false && !hasRunningTask.value)
const canRewriteAll = computed(() => currentSolution.value?.canRewriteAll !== false && !hasRunningTask.value)
const canExport = computed(() => currentSolution.value?.canExport === true && !hasRunningTask.value)

watch(() => createForm.solutionType, () => {
  createForm.solutionSubType = '不限'
})

onMounted(async () => {
  await loadList()
})

onBeforeUnmount(() => {
  clearTimeout(searchTimer)
  clearInterval(parseTimer)
  clearInterval(taskTimer)
})

async function loadList() {
  loading.value = true
  try {
    const res = await pageSolutions(listQuery)
    solutions.value = (res?.records || []).filter((item) => item?.deleted !== 1 && item?.status !== 'DELETED')
    if (!currentSolution.value && mode.value !== 'create' && solutions.value.length) {
      await loadDetail(solutions.value[0].id)
    }
  } finally {
    loading.value = false
  }
}

function onSearchInput() {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(loadList, 300)
}

async function loadDetail(id) {
  const data = await getSolution(id)
  applySolutionDetail(data)
  selectedSection.value = null
  mode.value = 'detail'
  resumeRunningTaskIfNeeded()
}

function applySolutionDetail(data) {
  currentSolution.value = data
  overallWritingRequirement.value = data?.overallWritingRequirement || ''
  fullGenerating.value = !!data?.runningTask && ['WAITING', 'RUNNING'].includes(data.runningTask.status)
}

function resumeRunningTaskIfNeeded() {
  const task = currentSolution.value?.runningTask
  if (task?.id && ['WAITING', 'RUNNING'].includes(task.status)) {
    pollGenerationTask(task.id)
  }
}

function startCreate(solutionMode = 'QUICK') {
  mode.value = 'create'
  createStep.value = 0
  parseTask.value = null
  createForm.solutionMode = solutionMode
  createForm.solutionType = 'SERVICE'
  createForm.solutionSubType = '不限'
  createForm.aiLevel = 'BASIC'
  createForm.writingStyle = 'GENERAL'
  createForm.solutionName = ''
  Object.assign(requirementForm, {
    purchaseRequirement: '', technicalRequirement: '', serviceRequirement: '', scoreRequirement: '', technicalScoreItems: '', otherRequirement: '', outlineRequirement: ''
  })
  currentSolution.value = null
}

async function handleTenderFileChange(uploadFile) {
  if (!uploadFile?.raw) return
  parseLoading.value = true
  createStep.value = 1
  try {
    const task = await uploadAndParseTenderFile(uploadFile.raw, {
      solutionMode: createForm.solutionMode,
      solutionType: createForm.solutionType,
      solutionSubType: createForm.solutionSubType,
      aiLevel: createForm.aiLevel,
      writingStyle: createForm.writingStyle
    })
    parseTask.value = task
    currentSolution.value = null
    pollParseTask(task.id)
  } catch (e) {
    parseLoading.value = false
  }
}

function pollParseTask(taskId) {
  clearInterval(parseTimer)
  parseTimer = setInterval(async () => {
    try {
      const task = await getParseTask(taskId)
      parseTask.value = task
      createStep.value = 1
      if (task.solutionName) createForm.solutionName = task.solutionName
      requirementForm.purchaseRequirement = task.purchaseRequirement || requirementForm.purchaseRequirement
      requirementForm.technicalRequirement = task.technicalRequirement || requirementForm.technicalRequirement
      requirementForm.serviceRequirement = task.serviceRequirement || requirementForm.serviceRequirement
      requirementForm.scoreRequirement = task.scoreRequirement || requirementForm.scoreRequirement
      requirementForm.technicalScoreItems = task.technicalScoreItems || requirementForm.technicalScoreItems
      requirementForm.otherRequirement = task.otherRequirement || requirementForm.otherRequirement
      if (task.status === 'SUCCESS') {
        clearInterval(parseTimer)
        parseLoading.value = false
        createStep.value = 2
        // 解析完成后仍不创建方案，用户点击“生成目录”时再创建方案并显示到左侧列表。
        ElMessage.success('标书解析完成')
      } else if (task.status === 'FAILED') {
        clearInterval(parseTimer)
        parseLoading.value = false
        ElMessage.error(task.errorMessage || '解析失败')
      }
    } catch (e) {
      clearInterval(parseTimer)
      parseLoading.value = false
    }
  }, 1500)
}

async function reExtractFromParse() {
  if (!parseTask.value?.id) {
    ElMessage.warning('请先上传并解析招标文件')
    return
  }
  const task = await getParseTask(parseTask.value.id)
  requirementForm.purchaseRequirement = task.purchaseRequirement || requirementForm.purchaseRequirement
  ElMessage.success('已从解析结果重新回填')
}

async function onGenerateOutline() {
  if (!parseTask.value?.id) {
    ElMessage.warning('请先上传招标文件并等待解析完成')
    return
  }

  if (parseTask.value.status !== 'SUCCESS') {
    if (parseTask.value.status === 'FAILED') {
      ElMessage.error(parseTask.value.errorMessage || '标书解析失败，不能生成目录，请重新上传或重新解析')
    } else {
      ElMessage.warning('标书正在解析中，请等待解析完成后再生成目录')
    }
    return
  }

  if (!requirementForm.purchaseRequirement?.trim()) {
    ElMessage.warning('采购需求不能为空')
    return
  }
  if (!createForm.solutionName?.trim()) {
    ElMessage.warning('方案名称不能为空')
    return
  }
  outlineGenerating.value = true
  try {
    let solutionId = currentSolution.value?.id

    // 正确流程：上传标书只创建解析任务；点击“生成目录”时才真正创建方案，
    // 创建成功后左侧“我的方案”列表才显示该方案。
    if (!solutionId) {
      const created = await createSolution({
        solutionName: createForm.solutionName,
        solutionMode: createForm.solutionMode,
        solutionType: createForm.solutionType,
        solutionSubType: createForm.solutionSubType,
        aiLevel: createForm.aiLevel,
        writingStyle: createForm.writingStyle,
        parseTaskId: parseTask.value?.id
      })
      currentSolution.value = created
      solutionId = created.id
      await loadList()
    }

    await saveRequirement(solutionId, requirementForm)
    const data = await generateOutline(solutionId, outlineForm)
    currentSolution.value = data
    createStep.value = 3
    await loadList()
    wordPresetVisible.value = true
    ElMessage.success('目录生成完成，请设置篇幅')
  } finally {
    outlineGenerating.value = false
  }
}

function setPreset(modeValue, wordCount) {
  wordPreset.mode = modeValue
  wordPreset.wordCount = wordCount
}

async function onApplyWordPreset() {
  if (!currentSolution.value?.id) return
  wordPresetSaving.value = true
  try {
    const data = await applyWordCountPreset(currentSolution.value.id, wordPreset)
    currentSolution.value = data
    wordPresetVisible.value = false
    createStep.value = 4
    mode.value = 'detail'
    await loadList()
    ElMessage.success('新建完成')
  } finally {
    wordPresetSaving.value = false
  }
}

function toggleEditMode() {
  if (!canEditOutline.value) {
    ElMessage.warning(currentSolution.value?.runningMessage || '当前方案有任务正在执行，暂不能编辑')
    return
  }
  editMode.value = !editMode.value
  if (editMode.value) editTab.value = 'word'
}

async function refreshCurrent() {
  if (!currentSolution.value?.id) return
  const data = await getSolution(currentSolution.value.id)
  applySolutionDetail(data)
  resumeRunningTaskIfNeeded()
}

async function onNodeWordChange({ node, value }) {
  await updateOutlineWordCount(node.id, value)
  await refreshCurrent()
}

async function onBatchWord({ node, value }) {
  await batchUpdateOutlineWordCount(node.id, value)
  await refreshCurrent()
  ElMessage.success('批量修改成功')
}

async function onSaveOverallRequirement() {
  await saveOverallWritingRequirement(currentSolution.value.id, overallWritingRequirement.value)
  await refreshCurrent()
  ElMessage.success('保存成功')
}

async function streamOverallDirection() {
  overallWritingRequirement.value = '方案禁止使用“我们”和“我”等称谓；方案应使用正式、专业、可执行的投标表达；内容应紧扣招标文件采购需求和评分项。'
}

async function onAiWriteDirection(node) {
  streamingOutlineId.value = node.id
  node.writingDirection = ''
  try {
    await streamWritingDirection(node.id, { style: node.writingStyle || 'GENERAL' }, {
      onMessage(chunk) {
        node.writingDirection += chunk
      },
      onError(message) {
        ElMessage.error(message || 'AI帮写失败')
      }
    })
    await refreshCurrent()
  } finally {
    streamingOutlineId.value = null
  }
}

async function onSaveWritingConfig(node) {
  await updateWritingConfig(node.id, {
    title: node.title,
    writingDirection: node.writingDirection,
    writingRequirement: node.writingRequirement,
    writingStyle: node.writingStyle,
    chartLevel: node.chartLevel,
    tableLevel: node.tableLevel,
    imageLevel: node.imageLevel
  })
  await refreshCurrent()
  ElMessage.success('保存成功')
}

function openAddNodeDialog(node) {
  addBaseNode.value = node
  addNodeForm.title = ''
  addNodeForm.insertType = 'CHILD'
  addNodeForm.targetWordCount = 300
  addNodeVisible.value = true
}

async function onAddNode() {
  if (!addNodeForm.title?.trim()) {
    ElMessage.warning('请输入节点标题')
    return
  }
  await addOutlineNode(addBaseNode.value.id, addNodeForm)
  addNodeVisible.value = false
  await refreshCurrent()
  ElMessage.success('新增成功')
}

async function onDeleteNodes() {
  await ElMessageBox.confirm('删除节点后，其下所有子节点及已生成正文将一并删除，是否继续？', '确认删除', { type: 'warning' })
  await deleteOutlineNodes(deleteIds.value)
  deleteIds.value = []
  await refreshCurrent()
  ElMessage.success('删除成功')
}

async function onMoveNode({ node, direction }) {
  await moveOutlineNode(node.id, direction)
  await refreshCurrent()
}

async function onGenerateFull() {
  if (!currentSolution.value?.outlines?.length) {
    ElMessage.warning('请先生成目录')
    return
  }
  if (!canGenerate.value) {
    ElMessage.warning(currentSolution.value?.runningMessage || '当前状态暂不能生成')
    return
  }
  fullGenerating.value = true
  try {
    const task = await generateFull(currentSolution.value.id)
    pollGenerationTask(task.id)
    await refreshCurrent()
  } catch (e) {
    fullGenerating.value = false
  }
}

async function onRewriteFull() {
  if (!canRewriteAll.value) {
    ElMessage.warning(currentSolution.value?.runningMessage || '当前状态暂不能重编')
    return
  }
  await ElMessageBox.confirm('重编全文将覆盖已有章节内容，是否继续？', '确认重编', { type: 'warning' })
  fullGenerating.value = true
  try {
    const task = await rewriteFull(currentSolution.value.id)
    pollGenerationTask(task.id)
    await refreshCurrent()
  } catch (e) {
    fullGenerating.value = false
  }
}

function pollGenerationTask(taskId) {
  if (!taskId) return
  clearInterval(taskTimer)

  const tick = async () => {
    try {
      const task = await getGenerationTask(taskId)
      await refreshCurrent()
      if (['WAITING', 'RUNNING'].includes(task.status)) {
        fullGenerating.value = true
        return
      }

      clearInterval(taskTimer)
      taskTimer = null
      fullGenerating.value = false

      if (task.status === 'FAILED') {
        ElMessage.error(task.errorMessage || task.message || '生成失败')
      } else {
        ElMessage.success(task.message || '生成完成')
      }
    } catch (e) {
      clearInterval(taskTimer)
      taskTimer = null
      fullGenerating.value = false
    }
  }

  tick()
  taskTimer = setInterval(tick, 2000)
}

function openSectionDialog(node) {
  sectionNode.value = node
  selectedSection.value = node
  Object.assign(sectionForm, {
    title: node.title,
    targetWordCount: node.targetWordCount || 300,
    chartLevel: node.chartLevel || 'NONE',
    tableLevel: node.tableLevel || 'NONE',
    imageLevel: node.imageLevel || 'NONE',
    knowledgeIds: node.knowledgeIds || '',
    fileResourceIds: node.fileResourceIds || '',
    writingDirection: node.writingDirection || '',
    writingRequirement: node.writingRequirement || '',
    writingStyle: node.writingStyle || 'GENERAL',
    overwrite: true
  })
  sectionStreamingText.value = ''
  sectionDialogVisible.value = true
}

async function onGenerateSection() {
  if (!sectionNode.value?.id) return
  if (hasRunningTask.value) {
    ElMessage.warning(currentSolution.value?.runningMessage || '当前方案有任务正在执行')
    return
  }
  sectionGenerating.value = true
  sectionStreamingText.value = ''
  try {
    await streamSection(sectionNode.value.id, sectionForm, {
      onMessage(chunk) {
        sectionStreamingText.value += chunk
      },
      onError(message) {
        ElMessage.error(message || '生成失败')
      }
    })
    await refreshCurrent()
    ElMessage.success('本段生成完成')
  } finally {
    sectionGenerating.value = false
  }
}

async function onDeleteSolution(item) {
  if (!item?.id) return
  await ElMessageBox.confirm(`确定删除方案“${item.solutionName || ''}”吗？删除后该方案将从列表中移除。`, '确认删除', { type: 'warning' })
  await deleteSolution(item.id)
  solutions.value = solutions.value.filter((solution) => solution.id !== item.id)
  if (currentSolution.value?.id === item.id) {
    currentSolution.value = null
    selectedSection.value = null
    editMode.value = false
    mode.value = solutions.value.length ? 'detail' : 'home'
    if (solutions.value.length) {
      await loadDetail(solutions.value[0].id)
    }
  }
  await loadList()
  ElMessage.success('删除成功')
}

async function onExportWord() {
  if (!canExport.value) {
    ElMessage.warning(hasRunningTask.value ? '当前方案正在生成，完成后再导出' : '暂无可导出的正文')
    return
  }
  const file = await exportWord(currentSolution.value.id)
  await refreshCurrent()
  ElMessage.success('导出成功')
  if (file?.fileUrl) window.open(file.fileUrl, '_blank')
}

function flattenLeaf(nodes = []) {
  const arr = []
  const walk = (list) => list.forEach((n) => {
    if (n.children?.length) walk(n.children)
    else arr.push(n)
  })
  walk(nodes)
  return arr
}

function formatDateTime(value) {
  if (!value) return ''
  return String(value).replace('T', ' ').slice(0, 19)
}

function levelLabel(value) {
  return { BASIC: '基础', STANDARD: '标准', FLAGSHIP: '旗舰' }[value] || '基础'
}

function statusLabel(value) {
  const map = {
    DRAFT: '草稿', FILE_PARSING: '解析中', INFO_READY: '已解析', OUTLINE_GENERATING: '目录中', OUTLINE_READY: '目录完成', WORD_COUNT_SET: '已设篇幅', CONTENT_GENERATING: '生成中', CONTENT_PARTIAL: '部分完成', CONTENT_READY: '已完成', DONE: '已完成', FAILED: '失败', SUCCESS: '成功', PARSING: '解析中', EXTRACTING: '提取中'
  }
  return map[value] || value || '-'
}

const OutlineTree = defineComponent({
  name: 'OutlineTree',
  props: {
    nodes: { type: Array, default: () => [] },
    mode: { type: String, default: 'view' },
    simple: { type: Boolean, default: false },
    selected: { type: Array, default: () => [] }
  },
  emits: ['word-change', 'batch-word', 'add-node', 'update:selected', 'move', 'section-generate'],
  setup(props, { emit }) {
    const renderNode = (node, depth = 0) => {
      const hasChildren = node.children?.length
      const checkbox = props.mode === 'delete'
        ? h(ElCheckbox, {
          modelValue: props.selected.includes(node.id),
          'onUpdate:modelValue': (checked) => {
            const next = checked ? [...props.selected, node.id] : props.selected.filter((id) => id !== node.id)
            emit('update:selected', next)
          }
        })
        : null
      const title = h('span', { class: ['tree-title', hasChildren ? 'parent' : 'leaf'] }, node.title)
      const controls = []
      if (props.mode === 'word') {
        if (hasChildren) {
          controls.push(h(ElSelect, { modelValue: 300, size: 'small', class: 'word-select', placeholder: '批量修改', onChange: (v) => emit('batch-word', { node, value: v }) }, () => wordOptions.map((n) => h(ElOption, { key: n, label: `${n}字`, value: n }))))
        } else {
          controls.push(h(ElSelect, { modelValue: node.targetWordCount || 300, size: 'small', class: 'word-select', onChange: (v) => emit('word-change', { node, value: v }) }, () => wordOptions.map((n) => h(ElOption, { key: n, label: `${n}字`, value: n }))))
        }
      }
      if (props.mode === 'add') controls.push(h(ElButton, { link: true, icon: Plus, onClick: () => emit('add-node', node) }))
      if (props.mode === 'sort') {
        controls.push(h(ElButton, { link: true, icon: SortUp, onClick: () => emit('move', { node, direction: 'UP' }) }))
        controls.push(h(ElButton, { link: true, icon: SortDown, onClick: () => emit('move', { node, direction: 'DOWN' }) }))
      }
      if (props.mode === 'generate' && !hasChildren) {
        controls.push(h('span', { class: 'count-text' }, `${node.actualWordCount || 0} / ${node.targetWordCount || 0}`))
        controls.push(h(ElButton, { size: 'small', type: node.contentStatus === 'SUCCESS' ? 'warning' : 'primary', plain: true, onClick: () => emit('section-generate', node) }, () => node.contentStatus === 'SUCCESS' ? '重编' : '生成'))
      }
      if (props.simple && !hasChildren) controls.push(h('span', { class: 'simple-level' }, node.headingType || 'H4'))
      return h('div', { class: 'tree-node-wrap' }, [
        h('div', { class: ['tree-row', `level-${depth}`], style: { paddingLeft: `${depth * 20}px` } }, [checkbox, h('span', { class: 'tree-dot' }, hasChildren ? '▾' : '•'), title, h('div', { class: 'tree-controls' }, controls)]),
        hasChildren ? h('div', { class: 'tree-children' }, node.children.map((child) => renderNode(child, depth + 1))) : null
      ])
    }
    return () => h('div', { class: 'outline-tree' }, props.nodes.map((node) => renderNode(node, 0)))
  }
})

const WritingDirectionEditor = defineComponent({
  name: 'WritingDirectionEditor',
  props: { nodes: { type: Array, default: () => [] }, streamingId: { type: Number, default: null } },
  emits: ['ai-write', 'save'],
  setup(props, { emit }) {
    const renderNode = (node, depth = 0) => {
      const hasChildren = node.children?.length
      const children = hasChildren ? node.children.map((child) => renderNode(child, depth + 1)) : []
      const editor = !hasChildren ? h('div', { class: 'direction-editor', style: { marginLeft: `${depth * 20 + 28}px` } }, [
        h('div', { class: 'mini-card-title' }, [
          h('span', null, '编写方向：'),
          h(ElButton, { size: 'small', type: 'primary', loading: props.streamingId === node.id, onClick: () => emit('ai-write', node) }, () => 'AI帮写')
        ]),
        h(ElInput, { modelValue: node.writingDirection || '', type: 'textarea', rows: 6, maxlength: 10000, showWordLimit: true, 'onUpdate:modelValue': (v) => { node.writingDirection = v } }),
        h('div', { class: 'mini-card-title second' }, [
          h('span', null, '编写要求：'),
          h(ElButton, { size: 'small', type: 'primary', onClick: () => emit('save', node) }, () => '保存')
        ]),
        h(ElInput, { modelValue: node.writingRequirement || '', type: 'textarea', rows: 3, maxlength: 10000, showWordLimit: true, placeholder: '请输入编写要求', 'onUpdate:modelValue': (v) => { node.writingRequirement = v } })
      ]) : null
      return h('div', { class: 'direction-node' }, [
        h('div', { class: 'tree-row', style: { paddingLeft: `${depth * 20}px` } }, [h('span', { class: 'tree-dot' }, hasChildren ? '▾' : '•'), h(ElInput, { modelValue: node.title, class: 'title-input', 'onUpdate:modelValue': (v) => { node.title = v } }), h(ElButton, { size: 'small', onClick: () => emit('save', node) }, () => '保存')]),
        editor,
        children
      ])
    }
    return () => h('div', { class: 'writing-direction-tree' }, props.nodes.map((node) => renderNode(node, 0)))
  }
})
</script>

<style scoped>
.solution-shell { display: grid; grid-template-columns: 270px minmax(0, 1fr); gap: 12px; height: calc(100vh - 82px); background: #eef3fb; }
.solution-shell.with-preview { grid-template-columns: 270px minmax(520px, 0.95fr) minmax(420px, 1.25fr); }
.solution-shell.no-preview .solution-main-card { min-width: 0; }
.solution-list-card, .solution-main-card, .right-preview-card { background: #fff; border-radius: 12px; overflow: hidden; }
.solution-list-card { display: flex; flex-direction: column; padding: 14px; }
.list-title { display: flex; align-items: center; gap: 8px; font-weight: 700; font-size: 17px; }
.solution-search { margin: 18px 0 12px; }
.solution-list-scroll { flex: 1; }
.solution-card { position: relative; }
.solution-card-actions { position: absolute; right: 10px; top: 50%; transform: translateY(-50%); display: none; gap: 8px; }
.solution-card:hover .solution-card-actions { display: flex; }
.solution-card-name span { display: inline-block; max-width: 180px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.solution-card { padding: 14px 12px; border: 1px solid transparent; border-radius: 8px; cursor: pointer; margin-bottom: 10px; background: rgba(248, 250, 255, .8); }
.solution-card.active { border-color: #2f6bff; background: linear-gradient(135deg, #f8fbff 0%, #eef4ff 100%); }
.solution-card-name { display: flex; align-items: center; gap: 6px; color: #2f6bff; font-weight: 600; }
.solution-card-time { margin: 6px 0 8px 22px; color: #6b7280; font-size: 13px; }
.solution-card-tags { display: flex; gap: 8px; margin-left: 22px; }
.no-more { text-align: center; color: #9aa4b2; margin: 18px 0; }
.new-btn { width: 100%; height: 42px; background: linear-gradient(90deg, #2f6bff, #8158ff); border: 0; }
.solution-main-card, .right-preview-card { min-width: 0; }
.home-panel { height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 30px; background: linear-gradient(135deg, #eff6ff 0%, #fff 45%, #f7f2ff 100%); }
.home-panel h1 { font-size: 28px; margin-bottom: 16px; }
.home-desc { max-width: 760px; text-align: center; color: #606b7b; line-height: 1.8; }
.mode-cards { display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; margin: 56px 0 32px; width: min(900px, 96%); }
.mode-card { min-height: 250px; padding: 28px; border-radius: 16px; cursor: pointer; position: relative; overflow: hidden; }
.mode-card h3 { margin: 0 0 18px; }
.mode-card p { color: #4b5563; line-height: 1.7; }
.mode-card.pink { background: #fff1f7; }
.mode-card.blue { background: #f1f6ff; }
.mode-card.purple { background: #f7f1ff; }
.mode-ill { position: absolute; right: 30px; bottom: 24px; width: 92px; height: 92px; border-radius: 28px; background: linear-gradient(135deg, #fff, #7c93ff); color: #fff; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 32px; box-shadow: 0 15px 30px rgba(68, 90, 220, .18); }
.home-new-btn { width: 150px; background: linear-gradient(90deg, #2f6bff, #8158ff); border: 0; }
.create-panel, .detail-panel { height: 100%; display: flex; flex-direction: column; }
.create-header { display: flex; align-items: center; gap: 16px; height: 54px; padding: 0 14px; border-bottom: 1px solid #e5e7eb; }
.steps { flex: 1; }
.create-body { display: grid; grid-template-columns: minmax(480px, 1fr) minmax(380px, .95fr); min-height: 0; flex: 1; }
.create-left { padding: 18px; overflow-y: auto; border-right: 1px solid #e5e7eb; }
.create-right { display: flex; flex-direction: column; min-width: 0; }
.form-section { margin-bottom: 18px; }
.form-label { font-weight: 700; margin-bottom: 10px; }
.required::before { content: '* '; color: #f04444; }
.type-grid { display: flex; gap: 12px; }
.type-select { flex: 1; }
.ai-levels { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
.ai-level-card { border: 1px solid #dbe3ef; border-radius: 8px; padding: 14px; cursor: pointer; display: flex; flex-direction: column; gap: 8px; color: #475569; }
.ai-level-card.active { border-color: #2f6bff; background: #edf4ff; }
.ai-level-card small { margin: 8px -14px -14px; padding: 8px; background: rgba(47, 107, 255, .12); text-align: center; }
.tender-upload :deep(.el-upload-dragger) { min-height: 150px; display: flex; flex-direction: column; align-items: center; justify-content: center; }
.upload-icon { font-size: 32px; color: #2f6bff; }
.upload-name { margin: 12px 0; color: #4b5563; font-size: 15px; }
.upload-status { color: #16a34a; }
.upload-status.failed { color: #ef4444; }
.inline-title { display: flex; align-items: center; gap: 12px; margin-bottom: 8px; font-weight: 700; }
.outline-mode { margin-bottom: 10px; display: block; }
.preview-head { display: flex; align-items: center; justify-content: space-between; height: 42px; padding: 0 14px; border-bottom: 1px solid #e5e7eb; }
.preview-head span { font-size: 13px; color: #f59e0b; }
.preview-scroll { flex: 1; padding: 12px; }
.preview-actions { display: flex; justify-content: flex-end; gap: 10px; padding: 12px; border-top: 1px solid #e5e7eb; }
.detail-top { display: flex; justify-content: space-between; padding: 18px 20px; border-bottom: 1px solid #e5e7eb; }
.detail-top h2 { margin: 0 0 12px; font-size: 18px; }
.stats-row { display: grid; grid-template-columns: repeat(2, minmax(180px, 1fr)); gap: 8px 40px; color: #334155; }
.red { color: #ff4d4f; } .green { color: #16b91f; }
.note { color: #94a3b8; margin-top: 10px; }
.detail-scroll { flex: 1; padding: 14px 20px; }
.detail-actions { display: grid; grid-template-columns: 1fr 1fr auto; gap: 10px; padding: 12px 20px; border-top: 1px solid #e5e7eb; }
.detail-actions .el-button:nth-child(2) { background: linear-gradient(90deg, #2f6bff, #8158ff); border: 0; }
.edit-tabs { height: 54px; display: grid; grid-template-columns: repeat(5, 1fr); border-bottom: 1px solid #e5e7eb; }
.edit-tabs button { border: 0; background: #fff; font-size: 16px; cursor: pointer; position: relative; }
.edit-tabs button.active { color: #2f6bff; font-weight: 700; }
.edit-tabs button.active::after { content: ''; position: absolute; left: 24%; right: 24%; bottom: 0; height: 3px; background: #2f6bff; border-radius: 3px 3px 0 0; }
.edit-scroll { flex: 1; padding: 14px 18px; }
.edit-section { min-height: 100%; }
.overall-card { background: #f5f5f6; border-radius: 12px; padding: 12px; margin-bottom: 16px; }
.card-title, .mini-card-title { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; font-weight: 700; }
.mini-card-title.second { margin-top: 12px; }
.delete-bar { display: flex; justify-content: center; padding: 10px 0 18px; }
.right-preview-card { background: linear-gradient(135deg, #eff6ff 0%, #fff 45%, #f7f2ff 100%); }
.right-home { height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; color: #475569; padding: 40px; }
.section-preview { height: 100%; padding: 24px; overflow-y: auto; background: #fff; }
.section-preview pre { white-space: pre-wrap; line-height: 1.8; color: #334155; font-family: inherit; }
.score-dialog-body { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
.dialog-label { font-weight: 700; margin-bottom: 8px; }
.preset-box { display: flex; flex-direction: column; gap: 18px; }
.preset-row { display: flex; align-items: center; flex-wrap: wrap; gap: 10px; }
.preset-row span { width: 100px; color: #64748b; }
.section-form :deep(.el-form-item) { margin-bottom: 14px; }
:deep(.outline-tree) { font-size: 15px; }
:deep(.tree-row) { display: flex; align-items: center; gap: 8px; min-height: 36px; border-bottom: 1px dashed #e5e7eb; color: #6b7280; }
:deep(.tree-title.parent) { font-weight: 700; color: #334155; }
:deep(.tree-title.leaf) { color: #6b7280; }
:deep(.tree-dot) { color: #ef4444; width: 16px; text-align: center; }
:deep(.tree-controls) { margin-left: auto; display: flex; align-items: center; gap: 8px; }
:deep(.word-select) { width: 110px; }
:deep(.count-text) { color: #22c55e; min-width: 78px; text-align: right; }
:deep(.simple-level) { color: #9ca3af; font-size: 12px; }
:deep(.direction-editor) { background: #fff; border-radius: 10px; padding: 12px; margin-bottom: 10px; box-shadow: 0 1px 5px rgba(15, 23, 42, .06); }
:deep(.title-input) { flex: 1; }
@media (max-width: 1280px) { .solution-shell, .solution-shell.with-preview { grid-template-columns: 260px minmax(0, 1fr); } .right-preview-card { display: none; } .create-body { grid-template-columns: 1fr; } .create-left { border-right: 0; } }
</style>
