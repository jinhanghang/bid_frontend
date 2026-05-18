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
              <el-tag size="small" type="info">{{ solutionCardStatusLabel(item) }}</el-tag>
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
      <el-button class="new-btn" type="primary" :loading="creatingDraft" @click="startCreate('QUICK')">新建方案</el-button>
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
          <el-button type="primary" class="home-new-btn" :loading="creatingDraft" @click="startCreate('QUICK')">新建方案</el-button>
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

              <div class="form-section outline-direction-section">
                <div class="form-label">生成目录编写方向：</div>
                <el-input
                  v-model="outlineForm.writingDirection"
                  type="textarea"
                  :rows="3"
                  maxlength="10000"
                  show-word-limit
                  placeholder="生成目录时使用，例如：重点突出无人值守流程、减少人工干预、风险防控、系统对接、落地交付能力等"
                />
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
              <OutlineTree :nodes="currentSolution.outlines" mode="generate" @preview="selectSectionPreview" @section-generate="openSectionDialog" />
            </el-scrollbar>
            <div class="detail-actions">
              <el-button size="large" :disabled="!canRewriteAll" @click="openFullGenerateDialog('REWRITE')" :loading="fullGenerating || hasRunningTask">重编全文</el-button>
              <el-button size="large" type="primary" :disabled="!canGenerate" @click="openFullGenerateDialog('GENERATE')" :loading="fullGenerating || hasRunningTask">{{ generateActionText }}</el-button>
              <el-tooltip
                :disabled="canExport || exportLoading"
                content="仍有章节未生成完成，需全部章节完成后才能导出"
                placement="top"
              >
                <span>
                  <el-button
                    size="large"
                    type="success"
                    :disabled="!canExport || exportLoading"
                    :loading="exportLoading"
                    @click="onExport"
                  >
                    {{ exportButtonText }}
                  </el-button>
                </span>
              </el-tooltip>
            </div>
          </template>
        </div>
      </template>
    </section>

    <section v-if="showRightPreview" class="right-preview-card">
      <div v-if="selectedSectionSolutionId === currentSolution?.id && selectedSectionDisplayContent" class="section-preview">
        <div class="section-preview-head">
          <div class="section-preview-title">
            <h3>{{ selectedSection.title }}</h3>
            <div class="section-preview-meta">
              <span :class="['word-health-text', wordHealthClass(selectedSection)]">{{ sectionContentEditMode ? sectionEditorWordCount : outlineActualWordCount(selectedSection) }} / {{ outlineTargetWordCount(selectedSection) || '-' }} 字</span>
              <el-tag v-if="!sectionContentEditMode && wordHealthLabel(selectedSection)" size="small" :type="wordHealthType(selectedSection)" effect="light">{{ wordHealthLabel(selectedSection) }}</el-tag>
              <el-tag v-if="sectionContentEditMode" size="small" :type="sectionContentDirty ? 'warning' : 'info'" effect="light">{{ sectionContentDirty ? '有未保存修改' : '编辑中' }}</el-tag>
              <el-tag v-else size="small" :type="sectionStatusType(selectedSection)">{{ sectionStatusLabel(selectedSection) }}</el-tag>
            </div>
          </div>
          <div class="section-preview-actions">
            <template v-if="sectionContentEditMode">
              <el-button size="small" :disabled="sectionContentSaving" @click="cancelEditSectionContent">取消</el-button>
              <el-button size="small" type="primary" :loading="sectionContentSaving" :disabled="!sectionContentDirty" @click="saveSectionContent">保存</el-button>
            </template>
            <template v-else>
              <el-button
                size="small"
                plain
                :disabled="!selectedSectionDisplayContent || !!sectionOptimizing"
                @click="copySectionContent"
              >
                复制正文
              </el-button>
              <el-button
                size="small"
                plain
                :loading="sectionOptimizing === 'POLISH'"
                :disabled="!canOptimizeSectionContent"
                @click="optimizeSection('POLISH')"
              >
                润色本章
              </el-button>
              <el-button
                size="small"
                plain
                :loading="sectionOptimizing === 'EXPAND'"
                :disabled="!canOptimizeSectionContent"
                @click="optimizeSection('EXPAND')"
              >
                扩写本章
              </el-button>
              <el-button
                size="small"
                plain
                :loading="sectionOptimizing === 'SHRINK'"
                :disabled="!canOptimizeSectionContent"
                @click="optimizeSection('SHRINK')"
              >
                缩写本章
              </el-button>
              <el-button
                size="small"
                plain
                :loading="sectionOptimizing === 'REWRITE'"
                :disabled="!canOptimizeSectionContent"
                @click="optimizeSection('REWRITE')"
              >
                重写本章
              </el-button>
              <el-button
                size="small"
                type="primary"
                plain
                :icon="EditPen"
                :disabled="!canEditSectionContent"
                @click="startEditSectionContent"
              >
                编辑
              </el-button>
            </template>
          </div>
        </div>
        <el-input
          v-if="sectionContentEditMode"
          v-model="sectionContentDraft"
          class="section-content-editor"
          type="textarea"
          :autosize="{ minRows: 24 }"
          maxlength="200000"
          show-word-limit
          placeholder="请输入章节正文内容"
          @keydown.ctrl.s.prevent="saveSectionContent"
          @keydown.meta.s.prevent="saveSectionContent"
        />
        <div v-if="sectionContentEditMode" class="section-editor-tip">已启用手动编辑，按 Ctrl + S 可快速保存；切换章节或取消时会提醒是否放弃未保存修改。</div>
        <div v-else class="section-content-preview">{{ selectedSectionDisplayContent }}</div>
      </div>
      <div v-else class="right-home">
        <h1>AI方案</h1>
        <p>右侧用于预览目录、查看章节正文和生成结果。正文生成后，可点击章节查看内容。</p>
      </div>
    </section>

    <el-dialog v-model="wordPresetVisible" title="设置方案篇幅" width="760px" append-to-body class="word-preset-dialog">
      <div class="word-preset-panel">
        <div class="preset-tip">
          <strong>目录已生成完成</strong>
          <span>请选择每个末级章节的目标字数。后续仍可在“编辑 - 修改字数”里单独调整。</span>
        </div>

        <div class="preset-auto-card" :class="{ active: wordPreset.mode === 'AUTO' }" @click="wordPreset.mode = 'AUTO'">
          <div>
            <strong>自动分配</strong>
            <span>系统按章节顺序自动错开字数，适合先快速生成一版。</span>
          </div>
          <el-tag :type="wordPreset.mode === 'AUTO' ? 'primary' : 'info'" effect="light">自由发挥</el-tag>
        </div>

        <div class="preset-groups">
          <div class="preset-group-card">
            <div class="preset-group-title">精简版</div>
            <div class="preset-group-desc">适合先看结构和表达方向</div>
            <div class="preset-word-grid small">
              <button
                v-for="n in [300, 600, 900]"
                :key="n"
                type="button"
                :class="{ active: wordPreset.mode === 'FIXED' && wordPreset.wordCount === n }"
                @click="setPreset('FIXED', n)"
              >
                {{ n }}字
              </button>
            </div>
          </div>

          <div class="preset-group-card">
            <div class="preset-group-title">常规版</div>
            <div class="preset-group-desc">适合正式投标方案初稿</div>
            <div class="preset-word-grid">
              <button
                v-for="n in [1200, 1800, 2700, 3600, 4500]"
                :key="n"
                type="button"
                :class="{ active: wordPreset.mode === 'FIXED' && wordPreset.wordCount === n }"
                @click="setPreset('FIXED', n)"
              >
                {{ n }}字
              </button>
            </div>
          </div>

          <div class="preset-group-card">
            <div class="preset-group-title">详细版</div>
            <div class="preset-group-desc">适合需要展开大量实施细节</div>
            <div class="preset-word-grid">
              <button
                v-for="n in [5400, 6300, 7200, 8100, 9000, 9900]"
                :key="n"
                type="button"
                :class="{ active: wordPreset.mode === 'FIXED' && wordPreset.wordCount === n }"
                @click="setPreset('FIXED', n)"
              >
                {{ n }}字
              </button>
            </div>
          </div>
        </div>
      </div>
      <template #footer>
        <el-button @click="wordPresetVisible = false">稍后设置</el-button>
        <el-button type="primary" :loading="wordPresetSaving" @click="onApplyWordPreset">确认并进入方案</el-button>
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
        <el-form-item label="知识库：">
          <div class="knowledge-setting">
            <div class="knowledge-actions">
              <el-button @click="goKnowledgeBasePage">上传</el-button>
              <el-button @click="openKnowledgeSelector('section')">从知识库选择</el-button>
            </div>
            <div v-if="selectedSectionKnowledgeBases.length" class="selected-kb-list">
              <el-tag
                v-for="kb in selectedSectionKnowledgeBases"
                :key="kb.id"
                closable
                @close="removeSelectedKnowledgeBase(kb.id, 'section')"
              >
                {{ kb.kbName }}
              </el-tag>
            </div>
            <div v-else class="selected-kb-empty">未选择知识库，本段生成时不引用知识库资料</div>
          </div>
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

    <el-dialog v-model="fullGenerateSettingVisible" title="方案设置" width="640px" append-to-body>
      <el-form label-width="90px" class="full-generate-form">
        <el-form-item label="知识库：">
          <div class="knowledge-setting">
            <div class="knowledge-actions">
              <el-button @click="goKnowledgeBasePage">上传</el-button>
              <el-button @click="openKnowledgeSelector('full')">从知识库选择</el-button>
            </div>
            <div v-if="selectedKnowledgeBases.length" class="selected-kb-list">
              <el-tag
                v-for="kb in selectedKnowledgeBases"
                :key="kb.id"
                closable
                @close="removeSelectedKnowledgeBase(kb.id, 'full')"
              >
                {{ kb.kbName }}
              </el-tag>
            </div>
            <div v-else class="selected-kb-empty">未选择知识库，生成时不引用知识库资料</div>
          </div>
        </el-form-item>
        <el-form-item label="暗标：">
          <div class="blind-setting">
            <el-switch v-model="fullGenerateForm.blindBidEnabled" />
            <el-input
              v-if="fullGenerateForm.blindBidEnabled"
              v-model="fullGenerateForm.blindBidRequirement"
              class="blind-rule-input"
              type="textarea"
              :rows="5"
              maxlength="2000"
              show-word-limit
              placeholder="请输入暗标要求"
            />
          </div>
        </el-form-item>
        <el-form-item label="写作风格：">
          <el-radio-group v-model="fullGenerateForm.writingStyle" class="style-radio-grid">
            <el-radio-button label="GENERAL">通用型</el-radio-button>
            <el-radio-button label="DATA">数据型</el-radio-button>
            <el-radio-button label="CONCISE">简约型</el-radio-button>
            <el-radio-button label="PRACTICAL">实用型</el-radio-button>
          </el-radio-group>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="fullGenerateSettingVisible = false">取消</el-button>
        <el-button type="primary" :loading="fullGenerating" @click="confirmFullGenerate">开始生成</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="knowledgeSelectorVisible" title="选择知识库" width="680px" append-to-body>
      <div class="knowledge-selector">
        <div class="knowledge-search-row">
          <el-input
            v-model="knowledgeKeyword"
            clearable
            placeholder="请输入知识库名称"
            @keyup.enter="loadKnowledgeBases"
          >
            <template #prefix>
              <el-icon><Search /></el-icon>
            </template>
          </el-input>
          <el-button type="primary" plain @click="loadKnowledgeBases">搜索</el-button>
        </div>

        <el-checkbox-group v-model="tempSelectedKnowledgeIds" class="knowledge-check-list">
          <div
            v-for="kb in knowledgeBaseList"
            :key="kb.id"
            class="knowledge-check-card"
          >
            <el-checkbox :label="kb.id">
              <div class="kb-info">
                <div class="kb-name">{{ kb.kbName }}</div>
                <div class="kb-meta">
                  文件 {{ kb.fileCount || 0 }} 个 · 分片 {{ kb.chunkCount || 0 }} 个
                  <span v-if="kb.description"> · {{ kb.description }}</span>
                </div>
              </div>
            </el-checkbox>
          </div>
        </el-checkbox-group>

        <el-empty
          v-if="!knowledgeLoading && !knowledgeBaseList.length"
          description="暂无可用知识库，请先上传知识库文件"
        />
      </div>
      <template #footer>
        <el-button @click="knowledgeSelectorVisible = false">取消</el-button>
        <el-button type="primary" :loading="knowledgeLoading" @click="confirmKnowledgeSelection">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { computed, defineComponent, h, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ElButton, ElCheckbox, ElIcon, ElInput, ElMessage, ElMessageBox, ElNotification, ElOption, ElSelect, ElTag, ElTooltip } from 'element-plus'
import { ArrowLeft, Close, Delete, Document, EditPen, Menu, Plus, Search, SortDown, SortUp, UploadFilled } from '@element-plus/icons-vue'
import {
  addOutlineNode,
  applyWordCountPreset,
  batchUpdateOutlineWordCount,
  createSolution,
  deleteOutlineNodes,
  deleteSolution,
  downloadFileResource,
  exportPdf,
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
  updateSectionContent,
  updateWritingConfig,
  uploadAndParseTenderFile
} from '@/api/aiSolution'
import { listKnowledgeBases } from '@/api/knowledge'

const router = useRouter()
const mode = ref('home')
const loading = ref(false)
const solutions = ref([])
const currentSolution = ref(null)
const activeSolutionId = ref(null)
const detailRequestSeq = ref(0)
const selectedSection = ref(null)
const selectedSectionSolutionId = ref(null)
const listQuery = reactive({ pageNum: 1, pageSize: 20, keyword: '' })
let searchTimer = null
let parseTimer = null
let taskTimer = null
let outlineTimer = null
const notifiedTaskIds = new Set()

const createStep = ref(0)
const parseTask = ref(null)
const parseLoading = ref(false)
const outlineGenerating = ref(false)
const creatingDraft = ref(false)
const previewOutlinesLocal = ref([])
const previewOutlines = computed(() => mode.value === 'create' ? previewOutlinesLocal.value : (currentSolution.value?.outlines || []))
const outlineLeafCount = computed(() => flattenLeaf(previewOutlines.value).length)
const parseDone = computed(() => parseTask.value?.status === 'SUCCESS')
const outlineFinishedStatuses = ['OUTLINE_READY', 'WORD_COUNT_SET', 'CONTENT_GENERATING', 'CONTENT_PARTIAL', 'CONTENT_READY', 'DONE']
const outlineGeneratingStatuses = ['OUTLINE_GENERATING']
const hasOutlineFromBackend = computed(() => Array.isArray(currentSolution.value?.outlines) && currentSolution.value.outlines.length > 0)
const isOutlineGeneratingByBackend = computed(() => outlineGeneratingStatuses.includes(currentSolution.value?.status))
const isOutlineFinishedByBackend = computed(() => hasOutlineFromBackend.value || outlineFinishedStatuses.includes(currentSolution.value?.status))
const canClickGenerateOutline = computed(() => {
  return !!currentSolution.value?.id
    && !outlineGenerating.value
    && !parseLoading.value
    && !isOutlineGeneratingByBackend.value
    && !isOutlineFinishedByBackend.value
    && parseDone.value
    && !!createForm.solutionName?.trim()
    && !!requirementForm.purchaseRequirement?.trim()
})
const generateOutlineButtonText = computed(() => {
  if (outlineGenerating.value || isOutlineGeneratingByBackend.value) return '目录生成中'
  if (isOutlineFinishedByBackend.value) return '目录已生成'
  if (!currentSolution.value?.id) return '正在创建草稿'
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
const fullGenerateSettingVisible = ref(false)
const fullGenerateAction = ref('GENERATE')
const fullGenerateForm = reactive({
  blindBidEnabled: true,
  blindBidRequirement: '输出内容中不得出现投标人的名称、企业标识、人员名称、企业独享的符号或图案等任何可识别投标人身份的信息',
  writingStyle: 'GENERAL',
  knowledgeIds: [],
  fileResourceIds: [],
  chartLevel: 'NONE',
  tableLevel: 'NONE',
  imageLevel: 'NONE',
  autoImageLevel: 'NONE'
})
const knowledgeSelectorVisible = ref(false)
const knowledgeLoading = ref(false)
const knowledgeKeyword = ref('')
const knowledgeBaseList = ref([])
const tempSelectedKnowledgeIds = ref([])
const knowledgeSelectorTarget = ref('full')
const selectedKnowledgeBaseCache = ref([])
const selectedKnowledgeBases = computed(() => buildSelectedKnowledgeBases(fullGenerateForm.knowledgeIds || []))
const selectedSectionKnowledgeBases = computed(() => buildSelectedKnowledgeBases(parseKnowledgeIds(sectionForm.knowledgeIds)))
const sectionDialogVisible = ref(false)
const sectionGenerating = ref(false)
const sectionNode = ref(null)
const sectionStreamingText = ref('')
const sectionOptimizing = ref('')
const sectionOptimizingNodeId = ref('')
const overallWritingRequirement = ref('')
const sectionContentEditMode = ref(false)
const sectionContentSaving = ref(false)
const sectionContentDraft = ref('')
const exportLoading = ref(false)

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

const outlineForm = reactive({
  outlineMode: 'SCORE_ITEM',
  writingDirection: ''
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
const leafGenerationStat = computed(() => {
  const leaves = flattenLeaf(currentSolution.value?.outlines || [])
  const total = leaves.length

  // 注意：同一个章节可能出现“section 已有成功正文，但 outline 旧状态还是 FAILED”的历史漂移。
  // 这种情况下前端应该以真实正文为准，不能同时把它算成已完成和失败，
  // 否则底部按钮会一直显示“重试未完成章节”。
  const doneLeaves = leaves.filter(isOutlineGenerated)
  const doneIds = new Set(doneLeaves.map((item) => item.id))
  const failedLeaves = leaves.filter((item) => !doneIds.has(item.id) && isOutlineFailed(item))
  const done = doneLeaves.length
  const failed = failedLeaves.length
  return { total, done, failed, pending: Math.max(0, total - done - failed) }
})

const generatePercent = computed(() => {
  const stat = leafGenerationStat.value
  if (stat.total) {
    return Math.min(100, Math.round((stat.done * 100) / stat.total))
  }
  const target = currentSolution.value?.targetWordCount || 0
  const actual = currentSolution.value?.actualWordCount || 0
  if (!target) return 0
  return Math.min(100, Math.round((actual * 100) / target))
})

const showRightPreview = computed(() => mode.value === 'detail' && !!currentSolution.value)
const selectedSectionContent = computed(() => selectedSection.value?.section?.content || '')
const sectionContentDirty = computed(() => normalizeSectionContent(sectionContentDraft.value) !== normalizeSectionContent(selectedSectionContent.value))
const sectionEditorWordCount = computed(() => countTextWords(sectionContentDraft.value || ''))
const selectedSectionDisplayContent = computed(() => {
  const streaming = String(sectionStreamingText.value || '')
  if (isSectionOptimizing(selectedSection.value) && streaming.trim()) {
    return streaming
  }
  return selectedSectionContent.value
})
const canEditSectionContent = computed(() => {
  return !!selectedSection.value?.id
    && selectedSectionSolutionId.value === currentSolution.value?.id
    && !!selectedSectionContent.value
    && !hasRunningTask.value
    && !sectionGenerating.value
    && !sectionOptimizing.value
})
const canOptimizeSectionContent = computed(() => {
  return !!selectedSection.value?.id
    && selectedSectionSolutionId.value === currentSolution.value?.id
    && !!selectedSectionContent.value
    && !sectionContentEditMode.value
    && !hasRunningTask.value
    && !sectionGenerating.value
    && !sectionOptimizing.value
})
const shellClass = computed(() => ({
  'with-preview': showRightPreview.value,
  'no-preview': !showRightPreview.value
}))
const hasRunningTask = computed(() => {
  const status = currentSolution.value?.runningTask?.status
  return status === 'WAITING' || status === 'RUNNING'
})
const canEditOutline = computed(() => currentSolution.value?.canEditOutline !== false && !hasRunningTask.value)
const canRewriteAll = computed(() => currentSolution.value?.canRewriteAll !== false && !hasRunningTask.value)
const allLeafGenerated = computed(() => leafGenerationStat.value.total > 0 && leafGenerationStat.value.done === leafGenerationStat.value.total)
const canGenerate = computed(() => currentSolution.value?.canGenerate !== false && !hasRunningTask.value && !allLeafGenerated.value)
const canExport = computed(() => currentSolution.value?.canExport === true && allLeafGenerated.value && !hasRunningTask.value)
const generateActionText = computed(() => {
  const stat = leafGenerationStat.value
  if (stat.total > 0 && stat.done === stat.total) return '已全部生成'
  if (stat.total > 0 && stat.failed > 0) return '重试未完成章节'
  if (stat.total > 0 && stat.done > 0 && stat.done < stat.total) return '继续生成'
  return '开始生成'
})
const exportButtonText = computed(() => exportLoading.value ? '正在导出' : '导出')

watch(() => createForm.solutionType, () => {
  createForm.solutionSubType = '不限'
})

watch(
  () => [selectedSection.value?.id, selectedSection.value?.section?.content],
  () => {
    if (!sectionContentEditMode.value) {
      sectionContentDraft.value = selectedSection.value?.section?.content || ''
    }
  }
)

onMounted(async () => {
  await loadList()
})

onBeforeUnmount(() => {
  clearTimeout(searchTimer)
  clearInterval(parseTimer)
  clearInterval(taskTimer)
  clearInterval(outlineTimer)
})

async function loadList() {
  loading.value = true
  try {
    const res = await pageSolutions(listQuery)
    solutions.value = (res?.records || []).filter((item) => item?.deleted !== 1 && item?.status !== 'DELETED')

    if (!currentSolution.value && mode.value !== 'create' && solutions.value.length) {
      await loadDetail(solutions.value[0].id)
    }

    if (!solutions.value.length && mode.value !== 'create') {
      currentSolution.value = null
      activeSolutionId.value = null
      selectedSection.value = null
      selectedSectionSolutionId.value = null
      mode.value = 'home'
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
  const solutionId = Number(id)
  const seq = ++detailRequestSeq.value
  activeSolutionId.value = solutionId
  selectedSection.value = null
  selectedSectionSolutionId.value = null
  sectionContentEditMode.value = false
  sectionContentDraft.value = ''
  sectionNode.value = null
  sectionDialogVisible.value = false

  try {
    const data = await getSolution(solutionId)
    if (seq !== detailRequestSeq.value || activeSolutionId.value !== solutionId) return
    applySolutionDetail(data)
    applyModeByBackendState(data)

    resumeRunningTaskIfNeeded()
    resumeParseTaskIfNeeded()
    resumeOutlineTaskIfNeeded()
  } catch (e) {
    if (seq === detailRequestSeq.value) {
      ElMessage.error('方案详情加载失败，请稍后刷新后重试')
    }
  }
}

function applyModeByBackendState(data) {
  const hasOutline = Array.isArray(data?.outlines) && data.outlines.length > 0
  const status = data?.status

  if (hasOutline || outlineFinishedStatuses.includes(status)) {
    mode.value = 'detail'
    editMode.value = false
    return
  }

  if (outlineGeneratingStatuses.includes(status)) {
    mode.value = 'create'
    editMode.value = false
    createStep.value = Math.max(createStep.value, 2)
    return
  }

  if (['DRAFT', 'FILE_PARSING', 'PARSING', 'PARSE_FAILED', 'INFO_READY'].includes(status)) {
    mode.value = 'create'
    editMode.value = false
    return
  }

  mode.value = 'detail'
}

function applySolutionDetail(data) {
  if (data?.id && !activeSolutionId.value) activeSolutionId.value = Number(data.id)
  currentSolution.value = data
  overallWritingRequirement.value = data?.overallWritingRequirement || ''
  fullGenerating.value = !!data?.runningTask && ['WAITING', 'RUNNING'].includes(data.runningTask.status)

  if (data) {
    syncSolutionCard(data)
    syncSelectedSectionAfterDetail(data)
    createForm.solutionMode = data.solutionMode || createForm.solutionMode || 'QUICK'
    createForm.solutionType = data.solutionType || createForm.solutionType || 'SERVICE'
    createForm.solutionSubType = data.solutionSubType || createForm.solutionSubType || '不限'
    createForm.aiLevel = data.aiLevel || createForm.aiLevel || 'BASIC'
    createForm.writingStyle = data.writingStyle || createForm.writingStyle || 'GENERAL'
    createForm.solutionName = data.solutionName || ''
    outlineForm.writingDirection = data.overallWritingRequirement || outlineForm.writingDirection || ''

    const req = data.requirement || {}
    requirementForm.purchaseRequirement = req.purchaseRequirement || ''
    requirementForm.technicalRequirement = req.technicalRequirement || ''
    requirementForm.serviceRequirement = req.serviceRequirement || ''
    requirementForm.scoreRequirement = req.scoreRequirement || ''
    requirementForm.technicalScoreItems = req.technicalScoreItems || ''
    requirementForm.otherRequirement = req.otherRequirement || ''
    requirementForm.outlineRequirement = req.outlineRequirement || ''

    parseTask.value = data.latestParseTask || null
    previewOutlinesLocal.value = data.outlines || []
    // 详情恢复时，从当前方案节点读取已绑定知识库，避免切换页面后丢失。
    fullGenerateForm.knowledgeIds = collectSolutionKnowledgeIds(data)
    createStep.value = calcCreateStep(data, parseTask.value)
  }
}

function resumeRunningTaskIfNeeded() {
  const task = currentSolution.value?.runningTask
  if (task?.id && ['WAITING', 'RUNNING'].includes(task.status)) {
    pollGenerationTask(task.id)
  }
}

function resumeParseTaskIfNeeded() {
  const task = parseTask.value
  if (task?.id && ['WAITING', 'PARSING', 'EXTRACTING'].includes(task.status)) {
    parseLoading.value = true
    pollParseTask(task.id)
  } else {
    parseLoading.value = false
  }
}

function resumeOutlineTaskIfNeeded() {
  if (currentSolution.value?.id && outlineGeneratingStatuses.includes(currentSolution.value?.status)) {
    pollOutlineStatus(currentSolution.value.id)
  } else {
    clearInterval(outlineTimer)
    outlineTimer = null
  }
}

function pollOutlineStatus(solutionId) {
  clearInterval(outlineTimer)

  const tick = async () => {
    try {
      const data = await getSolution(solutionId)
      if (activeSolutionId.value && activeSolutionId.value !== Number(solutionId)) return
      applySolutionDetail(data)
      applyModeByBackendState(data)

      if (outlineGeneratingStatuses.includes(data?.status)) {
        return
      }

      clearInterval(outlineTimer)
      outlineTimer = null
      await loadList()

      if ((Array.isArray(data?.outlines) && data.outlines.length > 0) || outlineFinishedStatuses.includes(data?.status)) {
        ElMessage.success('目录生成完成')
      }
    } catch (e) {
      clearInterval(outlineTimer)
      outlineTimer = null
    }
  }

  tick()
  outlineTimer = setInterval(tick, 2000)
}

function calcCreateStep(solution, task) {
  if (solution?.outlines?.length || outlineFinishedStatuses.includes(solution?.status)) return 3
  if (outlineGeneratingStatuses.includes(solution?.status)) return 2
  if (task?.status === 'SUCCESS') return 2
  if (task?.id) return 1
  return 0
}

async function startCreate(solutionMode = 'QUICK') {
  clearInterval(parseTimer)
  clearInterval(taskTimer)
  clearInterval(outlineTimer)
  parseTimer = null
  taskTimer = null
  outlineTimer = null

  mode.value = 'create'
  createStep.value = 0
  parseTask.value = null
  parseLoading.value = false
  outlineGenerating.value = false
  wordPresetVisible.value = false
  currentSolution.value = null
  activeSolutionId.value = null
  selectedSection.value = null
  selectedSectionSolutionId.value = null
  sectionContentEditMode.value = false
  sectionContentDraft.value = ''
  editMode.value = false
  previewOutlinesLocal.value = []

  createForm.solutionMode = solutionMode
  createForm.solutionType = 'SERVICE'
  createForm.solutionSubType = '不限'
  createForm.aiLevel = 'BASIC'
  createForm.writingStyle = 'GENERAL'
  createForm.solutionName = '新建AI方案'
  outlineForm.outlineMode = 'SCORE_ITEM'
  outlineForm.writingDirection = ''

  Object.assign(requirementForm, {
    purchaseRequirement: '',
    technicalRequirement: '',
    serviceRequirement: '',
    scoreRequirement: '',
    technicalScoreItems: '',
    otherRequirement: '',
    outlineRequirement: ''
  })

  creatingDraft.value = true
  try {
    const draft = await createSolution({
      solutionName: createForm.solutionName,
      solutionMode: createForm.solutionMode,
      solutionType: createForm.solutionType,
      solutionSubType: createForm.solutionSubType,
      aiLevel: createForm.aiLevel,
      writingStyle: createForm.writingStyle
    })
    applySolutionDetail(draft)
    mode.value = 'create'
    await loadList()
  } catch (e) {
    mode.value = solutions.value.length ? 'detail' : 'home'
  } finally {
    creatingDraft.value = false
  }
}

async function handleTenderFileChange(uploadFile) {
  if (!uploadFile?.raw) return

  if (!currentSolution.value?.id) {
    ElMessage.warning('草稿方案尚未创建完成，请稍后再上传')
    return
  }

  parseLoading.value = true
  createStep.value = 1
  parseTask.value = null
  previewOutlinesLocal.value = []

  // 用户重新上传标书时，先用文件名立即回填方案名称。
  // 后端解析完成后如果识别出了更合适的方案名称，会再次同步刷新。
  applySolutionNameFromParse(uploadFile.name || uploadFile.raw?.name)

  Object.assign(requirementForm, {
    purchaseRequirement: '',
    technicalRequirement: '',
    serviceRequirement: '',
    scoreRequirement: '',
    technicalScoreItems: '',
    otherRequirement: '',
    outlineRequirement: requirementForm.outlineRequirement || ''
  })

  try {
    const task = await uploadAndParseTenderFile(uploadFile.raw, {
      solutionId: currentSolution.value.id,
      solutionMode: createForm.solutionMode,
      solutionType: createForm.solutionType,
      solutionSubType: createForm.solutionSubType,
      aiLevel: createForm.aiLevel,
      writingStyle: createForm.writingStyle
    })

    parseTask.value = task
    applySolutionNameFromParse(task)
    await refreshCurrent()
    applySolutionNameFromParse(task)
    mode.value = 'create'
    pollParseTask(task.id)
  } catch (e) {
    parseLoading.value = false
  }
}

function pollParseTask(taskId) {
  clearInterval(parseTimer)

  const tick = async () => {
    try {
      const task = await getParseTask(taskId)
      parseTask.value = task
      createStep.value = 1

      applySolutionNameFromParse(task)
      requirementForm.purchaseRequirement = task.purchaseRequirement || requirementForm.purchaseRequirement
      requirementForm.technicalRequirement = task.technicalRequirement || requirementForm.technicalRequirement
      requirementForm.serviceRequirement = task.serviceRequirement || requirementForm.serviceRequirement
      requirementForm.scoreRequirement = task.scoreRequirement || requirementForm.scoreRequirement
      requirementForm.technicalScoreItems = task.technicalScoreItems || requirementForm.technicalScoreItems
      requirementForm.otherRequirement = task.otherRequirement || requirementForm.otherRequirement

      if (task.status === 'SUCCESS') {
        clearInterval(parseTimer)
        parseTimer = null
        parseLoading.value = false
        createStep.value = 2
        if (task.solutionId) {
          await refreshCurrent()
          applySolutionNameFromParse(task)
          await loadList()
          mode.value = 'create'
        }
        ElMessage.success('标书解析完成')
      } else if (['FAILED', 'CANCELED'].includes(task.status)) {
        clearInterval(parseTimer)
        parseTimer = null
        parseLoading.value = false

        if (task.status === 'CANCELED') {
          ElMessage.warning(task.errorMessage || '解析任务已取消')
        } else if (task.purchaseRequirement || task.solutionName || task.scoreRequirement) {
          ElMessage.warning('部分内容已提取，但解析任务未成功，请重新上传标书后再生成目录')
        } else {
          ElMessage.error(task.errorMessage || '解析失败')
        }
      }
    } catch (e) {
      clearInterval(parseTimer)
      parseTimer = null
      parseLoading.value = false
    }
  }

  tick()
  parseTimer = setInterval(tick, 1500)
}

async function reExtractFromParse() {
  if (!parseTask.value?.id) {
    ElMessage.warning('请先上传并解析招标文件')
    return
  }

  const task = await getParseTask(parseTask.value.id)

  applySolutionNameFromParse(task)
  requirementForm.purchaseRequirement = task.purchaseRequirement || requirementForm.purchaseRequirement
  requirementForm.technicalRequirement = task.technicalRequirement || requirementForm.technicalRequirement
  requirementForm.serviceRequirement = task.serviceRequirement || requirementForm.serviceRequirement
  requirementForm.scoreRequirement = task.scoreRequirement || requirementForm.scoreRequirement
  requirementForm.technicalScoreItems = task.technicalScoreItems || requirementForm.technicalScoreItems
  requirementForm.otherRequirement = task.otherRequirement || requirementForm.otherRequirement

  ElMessage.success('已从解析结果重新回填')
}

function buildRequirementPayload() {
  return {
    ...requirementForm,
    solutionName: createForm.solutionName,
    solutionType: createForm.solutionType,
    solutionSubType: createForm.solutionSubType,
    aiLevel: createForm.aiLevel,
    writingStyle: createForm.writingStyle
  }
}

async function onGenerateOutline() {
  if (!currentSolution.value?.id) {
    ElMessage.warning('草稿方案尚未创建完成，请稍后再试')
    return
  }

  const latest = await getSolution(currentSolution.value.id)
  applySolutionDetail(latest)
  applyModeByBackendState(latest)
  resumeOutlineTaskIfNeeded()

  if (outlineGeneratingStatuses.includes(latest?.status)) {
    ElMessage.warning('目录正在生成中，请稍后刷新查看')
    return
  }

  if ((Array.isArray(latest?.outlines) && latest.outlines.length > 0) || outlineFinishedStatuses.includes(latest?.status)) {
    ElMessage.warning('目录已经生成，请不要重复生成')
    return
  }

  if (!parseTask.value?.id) {
    ElMessage.warning('请先上传招标文件并等待解析完成')
    return
  }

  if (parseTask.value.status !== 'SUCCESS') {
    if (parseTask.value.status === 'FAILED') {
      ElMessage.error(parseTask.value.errorMessage || '标书解析失败，不能生成目录，请重新上传标书')
    } else if (parseTask.value.status === 'CANCELED') {
      ElMessage.warning('解析任务已取消，请重新上传标书')
    } else {
      ElMessage.warning('标书正在解析中，请等待解析完成后再生成目录')
    }
    return
  }

  if (!createForm.solutionName?.trim()) {
    ElMessage.warning('方案名称不能为空')
    return
  }

  if (!requirementForm.purchaseRequirement?.trim()) {
    ElMessage.warning('采购需求不能为空')
    return
  }

  outlineGenerating.value = true

  try {
    const solutionId = currentSolution.value.id

    await saveRequirement(solutionId, buildRequirementPayload())
    const writingDirection = (outlineForm.writingDirection || '').trim()
    if (writingDirection) {
      await saveOverallWritingRequirement(solutionId, writingDirection)
    }
    const data = await generateOutline(solutionId, {
      outlineMode: outlineForm.outlineMode,
      writingStyle: createForm.writingStyle,
      extraRequirement: requirementForm.outlineRequirement,
      outlineRequirement: requirementForm.outlineRequirement,
      writingDirection
    })

    applySolutionDetail(data)
    previewOutlinesLocal.value = data?.outlines || []
    createStep.value = 3
    mode.value = 'detail'
    clearInterval(outlineTimer)
    outlineTimer = null

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

async function refreshCurrent(expectedSolutionId = currentSolution.value?.id) {
  const solutionId = Number(expectedSolutionId)
  if (!solutionId) return
  const data = await getSolution(solutionId)
  if (activeSolutionId.value && activeSolutionId.value !== solutionId) return
  applySolutionDetail(data)
  resumeRunningTaskIfNeeded()
  resumeParseTaskIfNeeded()
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
    // 第一版暂不支持图表、表格、插图，保存编写配置时也固定为 NONE。
    chartLevel: 'NONE',
    tableLevel: 'NONE',
    imageLevel: 'NONE'
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

function parseKnowledgeIds(value) {
  if (Array.isArray(value)) {
    return [...new Set(value.map((id) => Number(id)).filter(Boolean))]
  }
  if (value === undefined || value === null || value === '') return []

  const text = String(value).trim()
  if (!text) return []

  // 后端会把章节知识库保存为 JSON 字符串，例如：[1,2]。
  // 这里必须先按 JSON 解析，否则 collectSolutionKnowledgeIds 会读不到历史选择。
  if (text.startsWith('[')) {
    try {
      const arr = JSON.parse(text)
      if (Array.isArray(arr)) {
        return [...new Set(arr.map((id) => Number(id)).filter(Boolean))]
      }
    } catch (e) {
      // 解析失败时继续按逗号字符串兜底。
    }
  }

  return [...new Set(text.replace(/[\[\]]/g, '').split(/[,，;；\s]+/).map((id) => Number(id)).filter(Boolean))]
}

function stringifyKnowledgeIds(ids = []) {
  return [...new Set((ids || []).map((id) => Number(id)).filter(Boolean))].join(',')
}

function buildSelectedKnowledgeBases(ids = []) {
  const idList = parseKnowledgeIds(ids)
  const map = new Map()
  selectedKnowledgeBaseCache.value.forEach((item) => map.set(Number(item.id), item))
  knowledgeBaseList.value.forEach((item) => map.set(Number(item.id), item))
  return idList.map((id) => map.get(Number(id)) || { id, kbName: `知识库#${id}` }).filter(Boolean)
}

function collectSolutionKnowledgeIds(solution = currentSolution.value) {
  const ids = []
  const walk = (nodes = []) => {
    nodes.forEach((node) => {
      ids.push(...parseKnowledgeIds(node.knowledgeIds))
      if (node.children?.length) walk(node.children)
    })
  }
  walk(solution?.outlines || [])
  return [...new Set(ids.map((id) => Number(id)).filter(Boolean))]
}

function getCurrentKnowledgeIdsByTarget(target = knowledgeSelectorTarget.value) {
  return target === 'section'
    ? parseKnowledgeIds(sectionForm.knowledgeIds)
    : parseKnowledgeIds(fullGenerateForm.knowledgeIds)
}

function setCurrentKnowledgeIdsByTarget(ids = [], target = knowledgeSelectorTarget.value) {
  const normalized = [...new Set((ids || []).map((id) => Number(id)).filter(Boolean))]
  if (target === 'section') {
    sectionForm.knowledgeIds = stringifyKnowledgeIds(normalized)
  } else {
    fullGenerateForm.knowledgeIds = normalized
  }
}

function goKnowledgeBasePage() {
  fullGenerateSettingVisible.value = false
  sectionDialogVisible.value = false
  knowledgeSelectorVisible.value = false
  router.push('/knowledge/bases')
}

async function openKnowledgeSelector(target = 'full') {
  knowledgeSelectorTarget.value = target
  tempSelectedKnowledgeIds.value = getCurrentKnowledgeIdsByTarget(target)
  knowledgeSelectorVisible.value = true
  await loadKnowledgeBases()
}

async function loadKnowledgeBases() {
  knowledgeLoading.value = true
  try {
    const list = await listKnowledgeBases({
      keyword: knowledgeKeyword.value,
      status: 1
    })
    knowledgeBaseList.value = Array.isArray(list) ? list : []
  } finally {
    knowledgeLoading.value = false
  }
}

function confirmKnowledgeSelection() {
  const ids = [...new Set((tempSelectedKnowledgeIds.value || []).map((id) => Number(id)).filter(Boolean))]
  setCurrentKnowledgeIdsByTarget(ids)

  const cacheMap = new Map()
  selectedKnowledgeBaseCache.value.forEach((item) => cacheMap.set(Number(item.id), item))
  knowledgeBaseList.value.forEach((item) => {
    if (ids.includes(Number(item.id))) {
      cacheMap.set(Number(item.id), item)
    }
  })
  selectedKnowledgeBaseCache.value = [...new Set([
    ...parseKnowledgeIds(fullGenerateForm.knowledgeIds),
    ...parseKnowledgeIds(sectionForm.knowledgeIds)
  ])].map((id) => cacheMap.get(Number(id))).filter(Boolean)

  knowledgeSelectorVisible.value = false
}

function removeSelectedKnowledgeBase(id, target = 'full') {
  const removeId = Number(id)
  const next = getCurrentKnowledgeIdsByTarget(target).filter((item) => Number(item) !== removeId)
  setCurrentKnowledgeIdsByTarget(next, target)
  tempSelectedKnowledgeIds.value = tempSelectedKnowledgeIds.value.filter((item) => Number(item) !== removeId)
  selectedKnowledgeBaseCache.value = selectedKnowledgeBaseCache.value.filter((item) => Number(item.id) !== removeId)
}

function openFullGenerateDialog(action = 'GENERATE') {
  if (!currentSolution.value?.outlines?.length) {
    ElMessage.warning('请先生成目录')
    return
  }

  if (action === 'REWRITE' && !canRewriteAll.value) {
    ElMessage.warning(currentSolution.value?.runningMessage || '当前状态暂不能重编')
    return
  }

  if (action !== 'REWRITE' && !canGenerate.value) {
    ElMessage.warning(currentSolution.value?.runningMessage || '当前状态暂不能生成')
    return
  }

  fullGenerateAction.value = action
  fullGenerateForm.writingStyle = currentSolution.value?.writingStyle || createForm.writingStyle || 'GENERAL'
  fullGenerateForm.knowledgeIds = collectSolutionKnowledgeIds(currentSolution.value)
  fullGenerateForm.chartLevel = 'NONE'
  fullGenerateForm.tableLevel = 'NONE'
  fullGenerateForm.imageLevel = 'NONE'
  fullGenerateForm.autoImageLevel = 'NONE'
  fullGenerateSettingVisible.value = true
}

async function confirmFullGenerate() {
  if (fullGenerateAction.value === 'REWRITE') {
    await ElMessageBox.confirm('重编全文将覆盖已有章节内容，是否继续？', '确认重编', { type: 'warning' })
  }

  fullGenerateSettingVisible.value = false
  await startFullGenerate(fullGenerateAction.value === 'REWRITE')
}

async function startFullGenerate(rewrite = false) {
  fullGenerating.value = true
  try {
    const selectedKbIds = parseKnowledgeIds(fullGenerateForm.knowledgeIds)
    const payload = {
      writingStyle: fullGenerateForm.writingStyle,
      useKnowledge: selectedKbIds.length > 0,
      // 后端 DTO 当前是 String，这里统一传逗号字符串，避免 JSON 数组反序列化成 String 失败。
      knowledgeIds: stringifyKnowledgeIds(selectedKbIds),
      fileResourceIds: stringifyKnowledgeIds(fullGenerateForm.fileResourceIds),
      anonymous: fullGenerateForm.blindBidEnabled,
      anonymousRequirement: fullGenerateForm.blindBidRequirement,
      // 第一版暂不支持图表、表格、插图，全文生成也固定为 NONE。
      chartLevel: 'NONE',
      tableLevel: 'NONE',
      imageLevel: 'NONE',
      autoImageLevel: 'NONE'
    }

    const task = rewrite
      ? await rewriteFull(currentSolution.value.id, payload)
      : await generateFull(currentSolution.value.id, payload)

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

      if (['WAITING', 'RUNNING'].includes(task.status)) {
        fullGenerating.value = true
        await refreshCurrent()
        await loadList()
        return
      }

      clearInterval(taskTimer)
      taskTimer = null
      fullGenerating.value = false

      // 后端任务刚落 SUCCESS 时，方案状态和统计可能还在最后一次事务刷新中。
      // 等一小会儿再重新拉详情和列表，避免页面仍显示旧状态。
      await sleep(600)
      await refreshCurrent()
      await loadList()

      if (!notifiedTaskIds.has(task.id)) {
        notifiedTaskIds.add(task.id)
        if (task.status === 'FAILED') {
          ElMessage.error(task.errorMessage || task.message || '生成失败')
        } else if (task.status === 'CANCELED') {
          ElMessage.warning(task.message || '生成已取消')
        } else if (task.status === 'PARTIAL') {
          ElMessage.warning(task.errorMessage || task.message || '部分章节未生成完成，请查看失败章节后重试')
        } else {
          ElMessage.success(task.message || '生成完成')
        }
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

async function confirmDiscardSectionContentChanges() {
  if (!sectionContentEditMode.value || !sectionContentDirty.value) return true
  try {
    await ElMessageBox.confirm('当前章节正文有未保存修改，是否放弃这些修改？', '未保存修改', {
      type: 'warning',
      confirmButtonText: '放弃修改',
      cancelButtonText: '继续编辑'
    })
    return true
  } catch (e) {
    return false
  }
}

async function selectSectionPreview(node) {
  if (!node || !currentSolution.value?.id) return
  const canLeave = await confirmDiscardSectionContentChanges()
  if (!canLeave) return
  selectedSection.value = node
  selectedSectionSolutionId.value = currentSolution.value.id
  sectionContentEditMode.value = false
  sectionContentDraft.value = node.section?.content || ''
}

function startEditSectionContent() {
  if (!canEditSectionContent.value) {
    ElMessage.warning(currentSolution.value?.runningMessage || '当前方案有任务正在执行，暂不能修改正文')
    return
  }
  sectionContentDraft.value = selectedSection.value?.section?.content || ''
  sectionContentEditMode.value = true
}

async function cancelEditSectionContent() {
  const canLeave = await confirmDiscardSectionContentChanges()
  if (!canLeave) return
  sectionContentDraft.value = selectedSection.value?.section?.content || ''
  sectionContentEditMode.value = false
}

function normalizeSectionContent(value) {
  return String(value || '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
}

async function saveSectionContent() {
  if (!selectedSection.value?.id) {
    ElMessage.warning('请先选择要修改的章节')
    return
  }
  const content = normalizeSectionContent(sectionContentDraft.value)
  if (!sectionContentDirty.value) {
    ElMessage.info('正文没有修改，无需保存')
    return
  }
  if (!content.trim()) {
    ElMessage.warning('正文内容不能为空')
    return
  }
  sectionContentSaving.value = true
  try {
    const outlineId = selectedSection.value.id
    await updateSectionContent(outlineId, content)
    sectionContentEditMode.value = false
    await refreshCurrent()
    selectedSectionSolutionId.value = currentSolution.value?.id || null
    selectedSection.value = findOutlineNodeById(currentSolution.value?.outlines || [], outlineId) || selectedSection.value
    sectionContentDraft.value = selectedSection.value?.section?.content || ''
    await loadList()
    ElMessage.success('正文保存成功')
  } finally {
    sectionContentSaving.value = false
  }
}

async function copySectionContent() {
  const content = String(selectedSectionDisplayContent.value || '').trim()
  if (!content) {
    ElMessage.warning('当前章节暂无正文可复制')
    return
  }
  const title = String(selectedSection.value?.title || '').trim()
  const text = title ? `${title}

${content}` : content
  try {
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(text)
    } else {
      fallbackCopyText(text)
    }
    ElMessage.success('章节正文已复制')
  } catch (e) {
    try {
      fallbackCopyText(text)
      ElMessage.success('章节正文已复制')
    } catch (err) {
      ElMessage.error('复制失败，请手动选择正文复制')
    }
  }
}

function fallbackCopyText(text) {
  const textarea = document.createElement('textarea')
  textarea.value = text
  textarea.setAttribute('readonly', 'readonly')
  textarea.style.position = 'fixed'
  textarea.style.left = '-9999px'
  textarea.style.top = '-9999px'
  document.body.appendChild(textarea)
  textarea.select()
  document.execCommand('copy')
  document.body.removeChild(textarea)
}

function optimizeActionLabel(type) {
  if (type === 'EXPAND') return '扩写'
  if (type === 'SHRINK') return '缩写'
  if (type === 'REWRITE') return '重写'
  return '润色'
}

function countTextWords(text) {
  const value = String(text || '').trim()
  if (!value) return 0
  const chinese = (value.match(/[\u4e00-\u9fa5]/g) || []).length
  const english = (value.replace(/[\u4e00-\u9fa5]/g, ' ').match(/[A-Za-z0-9]+/g) || []).length
  return chinese + english
}

function sectionOptimizeTargetWordCount(type, node, content) {
  const current = Number(node?.actualWordCount || node?.section?.actualWordCount || 0)
  const target = Number(node?.targetWordCount || node?.section?.targetWordCount || 0)
  const base = target > 0 ? target : (current > 0 ? current : countTextWords(content))
  if (type === 'EXPAND') return Math.max(600, Math.round(base * 1.35))
  if (type === 'SHRINK') return Math.max(300, Math.round(base * 0.65))
  return Math.max(300, base || 600)
}

function sectionOptimizeInstruction(type, title, content, targetWordCount) {
  const name = String(title || '当前章节').trim()
  const body = String(content || '').trim()
  const target = Number(targetWordCount || 0) > 0 ? Number(targetWordCount || 0) : 600
  if (type === 'EXPAND') {
    return `请对“${name}”进行扩写。要求：1. 保留原文核心观点和投标响应逻辑；2. 增加实施步骤、保障措施、交付成果、风险控制、服务承诺等内容；3. 语言正式、专业、可直接放入方案文件；4. 目标字数约 ${target} 字；5. 只输出扩写后的章节正文，不要解释。\n\n【已有正文】\n${body}`
  }
  if (type === 'SHRINK') {
    return `请对“${name}”进行缩写。要求：1. 保留关键响应点、技术措施和承诺事项；2. 删除重复、空泛和口号化表达；3. 逻辑清晰、表达凝练；4. 目标字数约 ${target} 字；5. 只输出缩写后的章节正文，不要解释。\n\n【已有正文】\n${body}`
  }
  if (type === 'REWRITE') {
    return `请重新撰写“${name}”。要求：1. 结合招标文件采购需求、评分标准和当前方案定位；2. 参考原文思路但不要机械复述；3. 内容要更正式、更完整、更适合投标/方案文件；4. 目标字数约 ${target} 字；5. 只输出重写后的章节正文，不要解释。\n\n【原章节正文】\n${body}`
  }
  return `请对“${name}”进行润色。要求：1. 不改变原文核心意思和承诺边界；2. 优化语句、逻辑衔接和专业表达；3. 去掉口语化、重复和空泛内容；4. 保持正式严谨风格；5. 只输出润色后的章节正文，不要解释。\n\n【已有正文】\n${body}`
}

async function optimizeSection(type = 'POLISH') {
  if (!canOptimizeSectionContent.value || !selectedSection.value?.id) return
  const node = selectedSection.value
  const content = String(selectedSectionContent.value || '').trim()
  if (!content) {
    ElMessage.warning('当前章节暂无正文')
    return
  }
  const targetWordCount = sectionOptimizeTargetWordCount(type, node, content)
  const label = optimizeActionLabel(type)
  sectionOptimizing.value = type
  sectionOptimizingNodeId.value = String(node.id || '')
  sectionStreamingText.value = ''
  sectionContentEditMode.value = false
  try {
    await streamSection(node.id, {
      title: node.title,
      targetWordCount,
      chartLevel: 'NONE',
      tableLevel: 'NONE',
      imageLevel: 'NONE',
      knowledgeIds: node.knowledgeIds || sectionForm.knowledgeIds || '',
      fileResourceIds: node.fileResourceIds || '',
      writingDirection: node.writingDirection || '',
      writingRequirement: sectionOptimizeInstruction(type, node.title, content, targetWordCount),
      writingStyle: node.writingStyle || sectionForm.writingStyle || 'GENERAL',
      overwrite: true
    }, {
      onMessage(chunk) {
        sectionStreamingText.value += chunk
      },
      onError(message) {
        ElMessage.error(message || `${label}失败`)
      }
    })
    await refreshCurrent()
    selectedSectionSolutionId.value = currentSolution.value?.id || null
    selectedSection.value = findOutlineNodeById(currentSolution.value?.outlines || [], node.id) || selectedSection.value
    sectionContentDraft.value = selectedSection.value?.section?.content || ''
    await loadList()
    ElMessage.success(`${label}完成`)
  } finally {
    sectionOptimizing.value = ''
    sectionOptimizingNodeId.value = ''
    sectionStreamingText.value = ''
  }
}

function openSectionDialog(node) {
  sectionNode.value = node
  selectedSection.value = node
  selectedSectionSolutionId.value = currentSolution.value?.id || null
  const nodeKnowledgeIds = parseKnowledgeIds(node.knowledgeIds)
  const fallbackKnowledgeIds = nodeKnowledgeIds.length ? nodeKnowledgeIds : collectSolutionKnowledgeIds(currentSolution.value)
  Object.assign(sectionForm, {
    title: node.title,
    targetWordCount: node.targetWordCount || 300,
    // 第一版暂不支持图表、表格、插图，前端固定传 NONE，避免弹出无效配置。
    chartLevel: 'NONE',
    tableLevel: 'NONE',
    imageLevel: 'NONE',
    knowledgeIds: stringifyKnowledgeIds(fallbackKnowledgeIds),
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
    await streamSection(sectionNode.value.id, {
      ...sectionForm,
      // 第一版暂不生成图表、表格、插图。
      chartLevel: 'NONE',
      tableLevel: 'NONE',
      imageLevel: 'NONE'
    }, {
      onMessage(chunk) {
        sectionStreamingText.value += chunk
      },
      onError(message) {
        ElMessage.error(message || '生成失败')
      }
    })
    await refreshCurrent()
    selectedSectionSolutionId.value = currentSolution.value?.id || null
    selectedSection.value = findOutlineNodeById(currentSolution.value?.outlines || [], sectionNode.value.id) || selectedSection.value
    sectionContentDraft.value = selectedSection.value?.section?.content || ''
    sectionContentEditMode.value = false
    ElMessage.success('本段生成完成')
  } finally {
    sectionGenerating.value = false
  }
}

async function onDeleteSolution(item) {
  if (!item?.id) return

  let latest = null
  try {
    latest = await getSolution(item.id)
  } catch (e) {
    latest = item
  }
  const running = ['WAITING', 'RUNNING'].includes(latest?.runningTask?.status) || latest?.status === 'CONTENT_GENERATING'
  const message = running
    ? `方案“${item.solutionName || ''}”正在生成中，删除后会取消后台任务并移除该方案，是否继续？`
    : `确定删除方案“${item.solutionName || ''}”吗？删除后该方案将从列表中移除。`

  await ElMessageBox.confirm(message, '确认删除', { type: 'warning' })
  await deleteSolution(item.id)
  solutions.value = solutions.value.filter((solution) => solution.id !== item.id)
  if (currentSolution.value?.id === item.id) {
    currentSolution.value = null
    selectedSection.value = null
    selectedSectionSolutionId.value = null
    editMode.value = false
    mode.value = solutions.value.length ? 'detail' : 'home'
    if (solutions.value.length) {
      await loadDetail(solutions.value[0].id)
    }
  }
  await loadList()
  ElMessage.success('删除成功')
}


function notifySolutionExportSuccess(file, fallbackName) {
  const fileName = file?.originalName || fallbackName || '导出文件'
  ElNotification({
    title: '导出成功',
    type: 'success',
    duration: 8000,
    message: h('div', { class: 'word-export-success-notice' }, [
      h('div', { class: 'word-export-success-name' }, fileName),
      h('div', { class: 'word-export-success-tip' }, '文件已开始下载，同时已写入下载中心。'),
      h(ElButton, {
        size: 'small',
        type: 'primary',
        plain: true,
        class: 'word-export-success-btn',
        onClick: () => router.push('/download-center')
      }, () => '查看下载中心')
    ])
  })
}

async function chooseExportFormat() {
  try {
    await ElMessageBox.confirm(
      h('div', { class: 'export-format-tip' }, [
        h('p', '请选择导出文件格式：'),
        h('p', { class: 'export-format-sub' }, 'Word 方便继续编辑，PDF 方便定稿分发。')
      ]),
      '选择导出格式',
      {
        confirmButtonText: 'Word',
        cancelButtonText: 'PDF',
        distinguishCancelAndClose: true,
        closeOnClickModal: true,
        closeOnPressEscape: true,
        type: 'info'
      }
    )
    return 'word'
  } catch (action) {
    return action === 'cancel' ? 'pdf' : ''
  }
}

async function onExport() {
  if (exportLoading.value) {
    return
  }

  if (!canExport.value) {
    ElMessage.warning(hasRunningTask.value ? '当前方案正在生成，完成后再导出' : '暂无可导出的正文')
    return
  }

  if (!currentSolution.value?.id) {
    ElMessage.warning('请先选择要导出的方案')
    return
  }

  const confirmed = await confirmSolutionExportBeforeDownload()
  if (!confirmed) return

  const format = await chooseExportFormat()
  if (!format) return

  const solutionId = currentSolution.value.id
  const solutionName = currentSolution.value?.solutionName || 'AI方案'

  exportLoading.value = true
  try {
    const file = format === 'pdf' ? await exportPdf(solutionId) : await exportWord(solutionId)
    await refreshCurrent(solutionId)
    await loadList()

    if (!file?.id) {
      ElMessage.warning('导出成功，但未返回文件ID，请到文件资源中查看')
      return
    }

    const blob = await downloadFileResource(file.id)
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = file.originalName || `${solutionName}-导出.${format === 'pdf' ? 'pdf' : 'docx'}`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.URL.revokeObjectURL(url)
    notifySolutionExportSuccess(file, a.download)
  } finally {
    exportLoading.value = false
  }
}

function syncSolutionCard(data) {
  if (!data?.id) return
  const index = solutions.value.findIndex((item) => item.id === data.id)
  if (index >= 0) {
    solutions.value[index] = {
      ...solutions.value[index],
      solutionName: data.solutionName,
      status: data.status,
      aiLevel: data.aiLevel,
      targetWordCount: data.targetWordCount,
      actualWordCount: data.actualWordCount
    }
  }
}

function fileBaseName(fileName) {
  const name = String(fileName || '').split(/[\\/]/).pop().trim()
  if (!name) return ''
  return name.replace(/\.[^.]+$/, '')
}

function applySolutionNameFromParse(value) {
  const name = typeof value === 'string'
    ? fileBaseName(value)
    : (value?.solutionName || fileBaseName(value?.fileName))

  if (!name) return

  createForm.solutionName = name

  if (currentSolution.value?.id) {
    currentSolution.value = {
      ...currentSolution.value,
      solutionName: name
    }
    syncSolutionCard({
      ...currentSolution.value,
      solutionName: name
    })
  }
}

function syncSelectedSectionAfterDetail(data) {
  if (!data?.outlines?.length) {
    selectedSection.value = null
    selectedSectionSolutionId.value = null
    sectionContentEditMode.value = false
    sectionContentDraft.value = ''
    return
  }

  // 切换方案时不要沿用上一个方案的章节选中状态。
  if (selectedSection.value?.id && selectedSectionSolutionId.value === data.id) {
    const latest = findOutlineNodeById(data.outlines, selectedSection.value.id)
    if (latest) {
      selectedSection.value = latest
      if (!sectionContentEditMode.value) {
        sectionContentDraft.value = latest.section?.content || ''
      }
      return
    }
  }

  const firstGenerated = findFirstGeneratedLeaf(data.outlines)
  if (firstGenerated) {
    selectedSection.value = firstGenerated
    selectedSectionSolutionId.value = data.id
    if (!sectionContentEditMode.value) {
      sectionContentDraft.value = firstGenerated.section?.content || ''
    }
  } else {
    selectedSection.value = null
    selectedSectionSolutionId.value = null
    sectionContentEditMode.value = false
    sectionContentDraft.value = ''
  }
}

function findOutlineNodeById(nodes = [], id) {
  for (const node of nodes) {
    if (node.id === id) return node
    const child = findOutlineNodeById(node.children || [], id)
    if (child) return child
  }
  return null
}

function findFirstGeneratedLeaf(nodes = []) {
  for (const node of nodes) {
    if (node.children?.length) {
      const child = findFirstGeneratedLeaf(node.children)
      if (child) return child
    } else if (node.section?.content) {
      return node
    }
  }
  return null
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
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

function isOutlineGenerated(node) {
  if (!node) return false
  const sectionOk = node.section?.generateStatus === 'SUCCESS' && !!String(node.section?.content || '').trim()
  return node.contentStatus === 'SUCCESS' || sectionOk
}

function isOutlineFailed(node) {
  if (!node) return false
  return node.contentStatus === 'FAILED' || node.section?.generateStatus === 'FAILED'
}

function outlineActualWordCount(node) {
  return node?.actualWordCount || node?.section?.actualWordCount || 0
}

function outlineTargetWordCount(node) {
  return node?.targetWordCount || node?.section?.targetWordCount || 0
}

function wordHealthClass(node) {
  if (!node || !isOutlineGenerated(node)) return ''
  const actual = Number(outlineActualWordCount(node) || 0)
  const target = Number(outlineTargetWordCount(node) || 0)
  if (!actual || !target) return ''
  const ratio = actual / target
  if (ratio < 0.7) return 'too-short'
  if (ratio > 1.35) return 'too-long'
  return 'normal'
}

function wordHealthLabel(node) {
  const cls = wordHealthClass(node)
  if (cls === 'too-short') return '偏短'
  if (cls === 'too-long') return '偏长'
  if (cls === 'normal') return '字数正常'
  return ''
}

function wordHealthType(node) {
  const cls = wordHealthClass(node)
  if (cls === 'too-short' || cls === 'too-long') return 'warning'
  if (cls === 'normal') return 'success'
  return 'info'
}

function isSectionOptimizing(node) {
  return !!sectionOptimizing.value
    && !!sectionOptimizingNodeId.value
    && String(node?.id || '') === String(sectionOptimizingNodeId.value || '')
}

function sectionStatusLabel(node) {
  if (isSectionOptimizing(node)) return `${optimizeActionLabel(sectionOptimizing.value)}中`
  if (isOutlineGenerated(node)) return '已完成'
  const status = String(node?.contentStatus || node?.section?.generateStatus || '').toUpperCase()
  if (status === 'GENERATING' || status === 'LOCKED') return '生成中'
  if (status === 'FAILED') return '失败'
  if (status === 'STALE') return '待重编'
  return '未生成'
}

function sectionStatusType(node) {
  if (isSectionOptimizing(node)) return 'warning'
  if (isOutlineGenerated(node)) return 'success'
  const status = String(node?.contentStatus || node?.section?.generateStatus || '').toUpperCase()
  if (status === 'GENERATING' || status === 'LOCKED') return 'warning'
  if (status === 'FAILED') return 'danger'
  return 'info'
}


function briefSolutionNodeList(nodes = []) {
  return nodes
    .slice(0, 5)
    .map((item) => item?.title || item?.sectionTitle || '未命名章节')
    .join('、') + (nodes.length > 5 ? ' 等' : '')
}

function buildSolutionExportWarnings() {
  const leaves = flattenLeaf(currentSolution.value?.outlines || [])
  const warnings = []
  if (!leaves.length) {
    warnings.push('当前方案还没有生成目录，导出的 Word 可能为空。')
    return warnings
  }

  const unfinished = leaves.filter((item) => !isOutlineGenerated(item))
  const emptyContent = leaves.filter((item) => isOutlineGenerated(item) && !String(item?.section?.content || '').trim())
  const noTargetWord = leaves.filter((item) => !Number(outlineTargetWordCount(item) || 0))
  const tooShort = leaves.filter((item) => {
    if (!isOutlineGenerated(item)) return false
    const target = Number(outlineTargetWordCount(item) || 0)
    const actual = Number(outlineActualWordCount(item) || 0)
    if (target <= 0 || actual <= 0) return false
    return actual < Math.max(80, Math.round(target * 0.6))
  })

  if (unfinished.length) {
    warnings.push(`仍有 ${unfinished.length} 个章节未生成完成：${briefSolutionNodeList(unfinished)}`)
  }
  if (emptyContent.length) {
    warnings.push(`发现 ${emptyContent.length} 个章节正文为空：${briefSolutionNodeList(emptyContent)}`)
  }
  if (noTargetWord.length) {
    warnings.push(`发现 ${noTargetWord.length} 个章节未设置目标字数：${briefSolutionNodeList(noTargetWord)}`)
  }
  if (tooShort.length) {
    warnings.push(`发现 ${tooShort.length} 个章节生成字数明显偏少：${briefSolutionNodeList(tooShort)}`)
  }

  return warnings
}

async function confirmSolutionExportBeforeDownload() {
  const warnings = buildSolutionExportWarnings()
  if (!warnings.length) return true
  try {
    await ElMessageBox.confirm(
      h('div', { class: 'solution-export-check-message' }, [
        h('p', { class: 'solution-export-check-title' }, '导出前检查发现以下问题：'),
        h('ul', { class: 'solution-export-check-list' }, warnings.map((item, index) => h('li', { key: index }, item))),
        h('p', { class: 'solution-export-check-tip' }, '可以返回处理后再导出，也可以继续导出当前版本。')
      ]),
      '导出前检查',
      {
        type: 'warning',
        confirmButtonText: '继续导出',
        cancelButtonText: '返回处理'
      }
    )
    return true
  } catch (e) {
    return false
  }
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
    DRAFT: '草稿', FILE_PARSING: '解析中', INFO_READY: '已解析', OUTLINE_GENERATING: '目录中', OUTLINE_READY: '目录完成', WORD_COUNT_SET: '已设篇幅', CONTENT_GENERATING: '生成中', CONTENT_PARTIAL: '部分完成', CONTENT_READY: '已完成', DONE: '已完成', FAILED: '失败', PARSE_FAILED: '解析失败', SUCCESS: '成功', PARTIAL: '部分完成', PARSING: '解析中', EXTRACTING: '提取中', CANCELED: '已取消'
  }
  return map[value] || value || '-'
}

function solutionCardStatusLabel(item) {
  // 列表接口只返回主表状态，正在查看的方案详情里有章节真实状态。
  // 当前方案的左侧卡片优先按详情章节计算，避免主表状态还没刷新时一直显示“部分完成”。
  if (item?.id && currentSolution.value?.id === item.id) {
    if (hasRunningTask.value) return '生成中'
    const stat = leafGenerationStat.value
    if (stat.total > 0 && stat.done === stat.total) return '已完成'
    if (stat.total > 0 && (stat.done > 0 || stat.failed > 0)) return '部分完成'
  }
  return statusLabel(item?.status)
}

const OutlineTree = defineComponent({
  name: 'OutlineTree',
  props: {
    nodes: { type: Array, default: () => [] },
    mode: { type: String, default: 'view' },
    simple: { type: Boolean, default: false },
    selected: { type: Array, default: () => [] }
  },
  emits: ['word-change', 'batch-word', 'add-node', 'update:selected', 'move', 'preview', 'section-generate'],
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
        const generated = isOutlineGenerated(node)
        const failed = isOutlineFailed(node)
        const optimizing = isSectionOptimizing(node)
        controls.push(h('span', { class: ['count-text', failed ? 'failed' : '', wordHealthClass(node)] }, `${outlineActualWordCount(node)} / ${outlineTargetWordCount(node)}`))
        if (optimizing) {
          controls.push(h(ElTag, { size: 'small', type: 'warning', effect: 'light' }, () => `${optimizeActionLabel(sectionOptimizing.value)}中`))
          controls.push(h(ElButton, { size: 'small', type: 'warning', plain: true, loading: true, disabled: true }, () => '处理中'))
        } else if (generated) {
          controls.push(h(ElTag, { size: 'small', type: 'success', effect: 'light' }, () => '已完成'))
          controls.push(h(ElButton, { size: 'small', type: 'warning', plain: true, onClick: (event) => { event.stopPropagation(); emit('section-generate', node) } }, () => '重编'))
        } else if (failed) {
          const errorMessage = node.errorMessage || node.section?.errorMessage || '章节生成失败，请点击“重试”重新生成'
          controls.push(h(ElTooltip, { content: errorMessage, placement: 'top', 'show-after': 200 }, { default: () => h(ElTag, { size: 'small', type: 'danger', effect: 'light' }, () => '失败') }))
          controls.push(h(ElButton, { size: 'small', type: 'danger', plain: true, onClick: (event) => { event.stopPropagation(); emit('section-generate', node) } }, () => '重试'))
        } else {
          controls.push(h(ElTag, { size: 'small', type: 'info', effect: 'light' }, () => '未生成'))
          controls.push(h(ElButton, { size: 'small', type: 'primary', plain: true, onClick: (event) => { event.stopPropagation(); emit('section-generate', node) } }, () => '生成'))
        }
      }
      if (props.simple && !hasChildren) controls.push(h('span', { class: 'simple-level' }, node.headingType || 'H4'))
      return h('div', { class: 'tree-node-wrap' }, [
        h('div', { class: ['tree-row', `level-${depth}`, props.mode === 'generate' && !hasChildren ? 'clickable' : ''], style: { paddingLeft: `${depth * 20}px` }, onClick: () => { if (props.mode === 'generate' && !hasChildren) emit('preview', node) } }, [checkbox, h('span', { class: 'tree-dot' }, hasChildren ? '▾' : '•'), title, h('div', { class: 'tree-controls' }, controls)]),
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
.section-preview {
  height: 100%;
  padding: 24px 28px;
  overflow: hidden;
  background: #fff;
  display: flex;
  flex-direction: column;
  min-height: 0;
  box-sizing: border-box;
}
.section-preview-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 18px;
  flex-shrink: 0;
}
.section-preview-head h3 {
  margin: 0;
  font-size: 22px;
  line-height: 1.45;
  font-weight: 800;
  color: #06152b;
}
.section-preview-title {
  min-width: 0;
  flex: 1 1 auto;
}
.section-preview-meta {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 8px;
  color: #64748b;
  font-size: 13px;
}
.section-preview-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  flex-wrap: wrap;
  flex-shrink: 0;
}
.section-content-preview {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  margin: 0;
  font-size: 18px;
  line-height: 1.9;
  color: #0f2747;
  font-family: inherit;
  white-space: pre-wrap;
  word-break: break-word;
  overflow-wrap: anywhere;
  letter-spacing: 0;
}
.section-content-editor {
  flex: 1;
  min-height: 0;
}
.section-content-editor :deep(.el-textarea__inner) {
  height: 100% !important;
  min-height: 620px !important;
  font-size: 18px;
  line-height: 1.9;
  color: #0f2747;
  font-family: inherit;
  white-space: pre-wrap;
  word-break: break-word;
  overflow-wrap: anywhere;
  letter-spacing: 0;
  resize: vertical;
  box-sizing: border-box;
}
.score-dialog-body { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
.dialog-label { font-weight: 700; margin-bottom: 8px; }
.word-preset-panel { display: flex; flex-direction: column; gap: 14px; }
.preset-tip { display: flex; flex-direction: column; gap: 6px; padding: 14px 16px; border-radius: 12px; background: #f8fbff; border: 1px solid #dbeafe; color: #475569; }
.preset-tip strong { color: #1f2937; font-size: 16px; }
.preset-auto-card { display: flex; align-items: center; justify-content: space-between; gap: 14px; padding: 14px 16px; border: 1px solid #e5e7eb; border-radius: 12px; cursor: pointer; background: #fff; }
.preset-auto-card strong, .preset-group-title { display: block; color: #1f2937; font-weight: 700; margin-bottom: 4px; }
.preset-auto-card span, .preset-group-desc { color: #94a3b8; font-size: 13px; line-height: 1.5; }
.preset-auto-card.active { border-color: #2f6bff; background: #f1f6ff; box-shadow: 0 8px 20px rgba(47, 107, 255, .08); }
.preset-groups { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; }
.preset-group-card { border: 1px solid #e5e7eb; border-radius: 12px; padding: 14px; background: #fff; min-width: 0; }
.preset-word-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; margin-top: 12px; }
.preset-word-grid.small { grid-template-columns: 1fr; }
.preset-word-grid button { height: 34px; border: 1px solid #dbe3ef; border-radius: 8px; background: #fff; color: #475569; cursor: pointer; }
.preset-word-grid button:hover { border-color: #2f6bff; color: #2f6bff; }
.preset-word-grid button.active { border-color: #2f6bff; background: #2f6bff; color: #fff; }
.outline-direction-section :deep(.el-textarea__inner) { min-height: 92px !important; }
.section-form :deep(.el-form-item) { margin-bottom: 14px; }
:deep(.outline-tree) { font-size: 15px; }
:deep(.tree-row) { display: flex; align-items: center; gap: 8px; min-height: 36px; border-bottom: 1px dashed #e5e7eb; color: #6b7280; }
:deep(.tree-title.parent) { font-weight: 700; color: #334155; }
:deep(.tree-title.leaf) { color: #6b7280; }
:deep(.tree-dot) { color: #ef4444; width: 16px; text-align: center; }
:deep(.tree-controls) { margin-left: auto; display: flex; align-items: center; gap: 8px; }
:deep(.word-select) { width: 110px; }
:deep(.count-text) { color: #22c55e; min-width: 78px; text-align: right; }
:deep(.count-text.too-short), :deep(.count-text.too-long) { color: #f59e0b; }
:deep(.count-text.failed) { color: #ef4444; }
.word-health-text { font-weight: 700; color: #16a34a; }
.word-health-text.too-short,
.word-health-text.too-long { color: #d97706; }
.word-health-text.normal { color: #16a34a; }
:deep(.simple-level) { color: #9ca3af; font-size: 12px; }
:deep(.direction-editor) { background: #fff; border-radius: 10px; padding: 12px; margin-bottom: 10px; box-shadow: 0 1px 5px rgba(15, 23, 42, .06); }
:deep(.title-input) { flex: 1; }
.full-generate-form :deep(.el-form-item) { margin-bottom: 18px; }
.blind-setting { width: 100%; }
.blind-rule-input { margin-top: 10px; }
.style-radio-grid { display: grid; grid-template-columns: repeat(3, minmax(120px, 1fr)); gap: 10px; width: 100%; }
.style-radio-grid :deep(.el-radio-button__inner) { width: 100%; }
.knowledge-setting {
  width: 100%;
}

.knowledge-actions {
  display: flex;
  gap: 12px;
  margin-bottom: 10px;
}

.selected-kb-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.selected-kb-empty {
  color: #9aa4b2;
  font-size: 13px;
}

.knowledge-selector {
  min-height: 360px;
}

.knowledge-search-row {
  display: grid;
  grid-template-columns: 1fr 92px;
  gap: 12px;
  margin-bottom: 18px;
}

.knowledge-check-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  max-height: 360px;
  overflow-y: auto;
}

.knowledge-check-card {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 12px;
  background: #fff;
}

.knowledge-check-card:hover {
  border-color: #2f6bff;
  background: #f8fbff;
}

.kb-info {
  display: inline-flex;
  flex-direction: column;
  gap: 4px;
  vertical-align: middle;
}

.kb-name {
  color: #1f2937;
  font-weight: 600;
}

.kb-meta {
  max-width: 520px;
  color: #94a3b8;
  font-size: 12px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

@media (max-width: 1280px) { .solution-shell, .solution-shell.with-preview { grid-template-columns: 260px minmax(0, 1fr); } .right-preview-card { display: none; } .create-body { grid-template-columns: 1fr; } .create-left { border-right: 0; } }
:deep(.tree-row.clickable) { cursor: pointer; }
:deep(.tree-row.clickable:hover) { background: #f8fafc; }

.solution-export-check-message {
  color: #303133;
  line-height: 1.7;
}

.solution-export-check-title {
  margin: 0 0 8px;
  font-weight: 700;
}

.solution-export-check-list {
  margin: 0;
  padding-left: 18px;
  color: #606266;
}

.solution-export-check-tip {
  margin: 10px 0 0;
  color: #909399;
}

</style>


<style scoped>
.word-export-success-notice {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.word-export-success-name {
  max-width: 280px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: #1f2937;
  font-weight: 600;
}
.word-export-success-tip {
  color: #64748b;
  font-size: 13px;
}
.word-export-success-btn {
  align-self: flex-start;
}
</style>


<style scoped>
.section-editor-tip {
  margin-top: 8px;
  font-size: 12px;
  line-height: 20px;
  color: #8a95a8;
}
</style>
