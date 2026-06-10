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
        :disabled="isCreateFormLocked"
        @input="onSearchInput"
      />
      <el-scrollbar ref="solutionListScrollbar" class="solution-list-scroll" v-loading="loading && solutions.length === 0" @scroll="onSolutionListScroll">
        <div v-if="solutions.length" class="solution-list">
          <div
            v-for="item in solutions"
            :key="item.id"
            class="solution-card"
            :class="{ active: String(currentSolution?.id || '') === String(item.id || '') }"
            @click="onSolutionCardClick(item)"
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
                <el-button circle size="small" type="danger" :icon="EditPen" :disabled="isCreateFormLocked" @click.stop="loadDetail(item.id)" />
              </el-tooltip>
              <el-tooltip content="删除" placement="top">
                <el-button circle size="small" type="info" :icon="Delete" :disabled="isCreateFormLocked" @click.stop="onDeleteSolution(item)" />
              </el-tooltip>
            </div>
          </div>
          <div class="no-more">
            <span v-if="appendLoading">正在加载更多...</span>
            <span v-else-if="solutionNoMore">——没有更多方案了——</span>
            <span v-else>下滑加载更多</span>
          </div>
        </div>
        <el-empty v-else-if="!loading" description="暂无方案，您可先新建方案" :image-size="110" />
      </el-scrollbar>
      <el-button class="new-btn" type="primary" :loading="creatingDraft" :disabled="isCreateFormLocked" @click="startCreate('QUICK')">新建方案</el-button>
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
            <el-button :icon="ArrowLeft" :disabled="isCreateFormLocked" @click="exitCreateMode">退出新建</el-button>
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
                  <el-select v-model="createForm.solutionType" placeholder="服务" class="type-select" :disabled="isCreateFormLocked">
                    <el-option label="服务" value="SERVICE" />
                    <el-option label="工程" value="ENGINEERING" />
                    <el-option label="货物" value="GOODS" />
                    <el-option label="监理" value="SUPERVISION" />
                    <el-option label="IT信息" value="IT" />
                    <el-option label="其他" value="OTHER" />
                  </el-select>
                  <el-select v-model="createForm.solutionSubType" placeholder="不限" class="type-select" :disabled="isCreateFormLocked">
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
                    :class="{ active: createForm.aiLevel === level.value, disabled: isCreateFormLocked }"
                    @click="setCreateAiLevel(level.value)"
                  >
                    <strong>{{ level.label }}</strong>
                    <span>{{ level.desc }}</span>
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
                  :disabled="isCreateFormLocked"
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
                <el-input v-model="createForm.solutionName" placeholder="请填写方案名称" :disabled="isCreateFormLocked" />
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
                  :disabled="isCreateFormLocked"
                />
              </div>

              <div class="form-section">
                <div class="form-label">目录知识库：</div>
                <div class="knowledge-setting">
                  <div class="knowledge-actions">
                    <el-button :disabled="isCreateFormLocked" @click="goKnowledgeBasePage">上传</el-button>
                    <el-button :disabled="isCreateFormLocked" @click="openKnowledgeSelector('outline')">从知识库选择</el-button>
                  </div>
                  <div v-if="selectedOutlineKnowledgeBases.length" class="selected-kb-list">
                    <el-tag
                      v-for="kb in selectedOutlineKnowledgeBases"
                      :key="kb.id"
                      :closable="!isCreateFormLocked"
                      @close="removeSelectedKnowledgeBase(kb.id, 'outline')"
                    >
                      {{ kb.kbName }}
                    </el-tag>
                  </div>
                  <div v-else class="selected-kb-empty">未选择知识库，目录会主要按采购需求和评分项生成</div>
                </div>
              </div>

              <div class="form-section">
                <div class="inline-title">
                  <span class="required">采购需求：</span>
                  <el-button size="small" :loading="parseLoading" :disabled="isCreateFormLocked" @click="reExtractFromParse">从招标文件重新提取</el-button>
                </div>
                <el-input v-model="requirementForm.purchaseRequirement" type="textarea" :rows="12" maxlength="100000" show-word-limit placeholder="请上传招标文件后自动提取，也可手工粘贴采购需求" :disabled="isCreateFormLocked" />
              </div>

              <div class="form-section">
                <div class="inline-title">
                  <span>评分标准 / 技术评分项：</span>
                  <el-button size="small" :disabled="isCreateFormLocked" @click="scoreDialogVisible = true">查看/编辑评分项</el-button>
                </div>
                <el-input v-model="requirementForm.scoreRequirement" type="textarea" :rows="9" maxlength="100000" show-word-limit placeholder="评分标准：没有评分项时可留空，系统会按采购需求生成目录" :disabled="isCreateFormLocked" />
              </div>

            </div>

            <div class="create-right">
              <div class="preview-head">
                <strong>预览目录 {{ outlineLeafCount }}</strong>
              </div>
              <el-scrollbar class="preview-scroll">
                <el-alert
                  v-if="isCreateFormLocked"
                  class="outline-lock-alert"
                  type="warning"
                  show-icon
                  :closable="false"
                  title="目录生成中，左侧基础信息已锁定，请等待生成完成后再调整。"
                />
                <el-empty v-if="!previewOutlines.length" description="暂无目录，请在左侧完善采购需求，点击下方生成按钮" />
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

          <el-alert
            v-if="recoveryNoticeText"
            class="recovery-alert"
            type="warning"
            show-icon
            :closable="false"
            :title="recoveryNoticeText"
          />

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
              <div v-if="runningTaskText" class="task-running-tip">{{ runningTaskText }}</div>
              <OutlineTree :nodes="currentSolution.outlines" mode="generate" @preview="selectSectionPreview" @section-generate="openSectionDialog" />
            </el-scrollbar>
            <div class="detail-actions">
              <el-button class="detail-action-btn" size="large" plain :disabled="!currentSolution?.id" @click="openRequirementExtractDrawer">评分项/需求解析</el-button>
              <el-button class="detail-action-btn" size="large" plain :disabled="!currentSolution?.id" @click="openQualityCheckDrawer">质量检查</el-button>
              <el-button class="detail-action-btn" size="large" plain :disabled="!currentSolution?.id" @click="openWordCountDrawer">字数检查</el-button>
              <el-button class="detail-action-btn" size="large" plain :disabled="!currentSolution?.id" @click="openReviewDrawer">AI审稿</el-button>
              <el-button class="detail-action-btn" size="large" plain :disabled="!currentSolution?.id || hasRunningTask" @click="openVersionDialog">历史版本</el-button>
              <el-button class="detail-action-btn" size="large" type="primary" plain :disabled="!canRewriteAll" @click="openFullGenerateDialog('REWRITE')" :loading="fullGenerating || hasRunningTask">{{ isRewriteRunning ? '重编中...' : '重编全文' }}</el-button>
              <el-button class="detail-action-btn" size="large" type="primary" :disabled="!canGenerate" @click="openFullGenerateDialog('GENERATE')" :loading="fullGenerating || hasRunningTask">{{ generateActionText }}</el-button>
              <el-tooltip
                :disabled="canExport || exportLoading"
                content="仍有章节未生成完成，需全部章节完成后才能导出"
                placement="top"
              >
                <span class="detail-action-wrap">
                  <el-button
                    class="detail-action-btn"
                    size="large"
                    type="primary"
                    plain
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

    <el-drawer
      v-model="qualityCheckVisible"
      title="章节质量检查"
      size="60%"
      destroy-on-close
      class="quality-check-drawer"
    >
      <div class="quality-check-wrap" v-loading="qualityCheckLoading">
        <div class="quality-check-toolbar">
          <div>
            <div class="quality-check-title">章节质量评分与风险复核</div>
            <div class="quality-check-desc">数据来自最近一次章节生成/重编时写入的质量事件日志；重新生成章节后可刷新查看。</div>
          </div>
          <el-button type="primary" plain :disabled="!currentSolution?.id" :loading="qualityCheckLoading" @click="loadQualityCheck">刷新</el-button>
        </div>

        <div class="quality-stat-grid">
          <div v-for="item in qualityStatCards" :key="item.label" class="quality-stat-card">
            <span>{{ item.label }}</span>
            <strong>{{ item.value }}</strong>
            <small>{{ item.desc }}</small>
          </div>
        </div>

        <el-alert
          v-if="qualityCheckData.noQualityLogSections"
          class="quality-alert"
          type="warning"
          :closable="false"
          show-icon
          title="部分章节暂无质量检查记录"
          :description="`还有 ${qualityCheckData.noQualityLogSections || 0} 个章节没有质量日志。通常是尚未生成，或生成时未开启质量检查。`"
        />

        <el-table
          class="ui-table quality-table"
          :data="qualityItems"
          border
          stripe
          size="small"
          empty-text="暂无质量检查数据"
          :row-class-name="qualityRowClassName"
        >
          <el-table-column label="序号" type="index" width="70" align="center" />
          <el-table-column prop="title" label="章节" min-width="180" show-overflow-tooltip />
          <el-table-column label="质量评分" width="130" align="center">
            <template #default="{ row }">
              <div v-if="row.hasQualityLog" class="quality-score-cell">
                <el-progress :percentage="safePercent(row.score)" :stroke-width="8" :show-text="false" :status="qualityProgressStatus(row.score)" />
                <strong>{{ row.score ?? '-' }}</strong>
              </div>
              <span v-else class="muted-text">未检查</span>
            </template>
          </el-table-column>
          <el-table-column label="等级" width="100" align="center">
            <template #default="{ row }">
              <el-tag size="small" :type="qualityLevelTagType(row.qualityLevel, row.score)" effect="light">{{ row.qualityLevel || '未检查' }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="问题等级" width="100" align="center">
            <template #default="{ row }">
              <el-tag size="small" :type="issueSeverityTagType(row.issueSeverity)" effect="light">{{ row.issueSeverity || '-' }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="证据覆盖" width="100" align="center">
            <template #default="{ row }">{{ row.hasQualityLog ? `${row.evidenceCoveragePercent || 0}%` : '-' }}</template>
          </el-table-column>
          <el-table-column label="动作/交付/验收" width="130" align="center">
            <template #default="{ row }">
              {{ row.hasQualityLog ? `${row.actionVerbHits || 0}/${row.deliverableHits || 0}/${row.verificationHits || 0}` : '-' }}
            </template>
          </el-table-column>
          <el-table-column label="风险" width="150" align="center">
            <template #default="{ row }">
              <div class="quality-risk-tags">
                <el-tag v-if="row.factRiskHits" size="small" type="danger" effect="light">强事实 {{ row.factRiskHits }}</el-tag>
                <el-tag v-if="row.internalTraceLeakHits" size="small" type="danger" effect="light">内部痕迹 {{ row.internalTraceLeakHits }}</el-tag>
                <el-tag v-if="row.formatRiskHits" size="small" type="warning" effect="light">格式 {{ row.formatRiskHits }}</el-tag>
                <span v-if="!row.factRiskHits && !row.internalTraceLeakHits && !row.formatRiskHits" class="muted-text">-</span>
              </div>
            </template>
          </el-table-column>
          <el-table-column label="主要问题 / 建议" min-width="280" show-overflow-tooltip>
            <template #default="{ row }">
              <div class="quality-problem-text">
                <strong>{{ row.problem || '无明显问题' }}</strong>
                <span>{{ row.suggestion || row.structureAdvice || row.typeAdvice || row.executionChecklist || '' }}</span>
              </div>
            </template>
          </el-table-column>
          <el-table-column label="处理建议" width="110" align="center" fixed="right">
            <template #default="{ row }">
              <el-tag v-if="row.recommendRewrite" size="small" type="danger">建议重编</el-tag>
              <el-tag v-else-if="row.recommendReview" size="small" type="warning">人工复核</el-tag>
              <el-tag v-else-if="row.hasQualityLog" size="small" type="success">可用</el-tag>
              <el-tag v-else size="small" type="info">待生成</el-tag>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </el-drawer>


    <el-drawer
      v-model="wordCountVisible"
      title="字数检查与重复内容"
      size="58%"
      destroy-on-close
      class="quality-check-drawer"
    >
      <div class="quality-check-wrap" v-loading="wordCountLoading">
        <div class="quality-check-toolbar">
          <div>
            <div class="quality-check-title">目标字数与生成字数</div>
            <div class="quality-check-desc">仅展示用户可理解的字数信息，不展示 Token、费用、模型调用次数等内部数据。</div>
          </div>
          <div class="toolbar-actions">
            <el-button plain :disabled="!currentSolution?.id" @click="loadWordCountStats">刷新</el-button>
            <el-button type="warning" plain :disabled="!duplicateCheckData?.recommendCompress || hasRunningTask" :loading="duplicateCompressing" @click="onCompressDuplicates">一键压缩重复</el-button>
          </div>
        </div>
        <div class="quality-stat-grid">
          <div class="quality-stat-card"><span>目标字数</span><strong>{{ wordCountStats.targetWordCount || 0 }}</strong><small>方案目标</small></div>
          <div class="quality-stat-card"><span>生成字数</span><strong>{{ wordCountStats.actualWordCount || 0 }}</strong><small>当前正文</small></div>
          <div class="quality-stat-card"><span>完成度</span><strong>{{ wordCountStats.ratioPercent || 0 }}%</strong><small>{{ wordCountStats.summary || '-' }}</small></div>
          <div class="quality-stat-card"><span>重复段落</span><strong>{{ duplicateCheckData.duplicateParagraphCount || 0 }}</strong><small>{{ duplicateCheckData.summary || '未检查' }}</small></div>
        </div>
        <el-alert v-if="wordCountStats.overSections" type="warning" show-icon :closable="false" class="quality-alert" :title="`发现 ${wordCountStats.overSections} 个章节超出目标字数`" description="建议优先压缩重复背景、通用口号和同义反复，保留评分响应、措施、交付物和验收依据。" />
        <el-table class="ui-table quality-table" :data="wordCountStats.items || []" border stripe size="small" empty-text="暂无字数数据">
          <el-table-column label="序号" type="index" width="70" align="center" />
          <el-table-column prop="path" label="章节" min-width="220" show-overflow-tooltip />
          <el-table-column prop="targetWordCount" label="目标" width="90" align="center" />
          <el-table-column prop="actualWordCount" label="生成" width="90" align="center" />
          <el-table-column prop="ratioPercent" label="比例" width="90" align="center"><template #default="{ row }">{{ row.ratioPercent || 0 }}%</template></el-table-column>
          <el-table-column prop="status" label="状态" width="120" align="center"><template #default="{ row }"><el-tag size="small" :type="wordStatusTagType(row.status)">{{ row.status }}</el-tag></template></el-table-column>
          <el-table-column prop="suggestion" label="建议" min-width="220" show-overflow-tooltip />
        </el-table>
      </div>
    </el-drawer>

    <el-drawer
      v-model="reviewVisible"
      title="AI二次审稿"
      size="58%"
      destroy-on-close
      class="quality-check-drawer"
    >
      <div class="quality-check-wrap" v-loading="reviewLoading">
        <div class="quality-check-toolbar">
          <div>
            <div class="quality-check-title">全文统一口径与审稿建议</div>
            <div class="quality-check-desc">用于正式导出前检查术语、工期、人员、交付物、服务承诺、重复内容和风险表达。</div>
          </div>
          <el-button type="primary" :disabled="!currentSolution?.id || hasRunningTask" :loading="reviewLoading" @click="runAiReviewNow">开始审稿</el-button>
        </div>
        <el-descriptions v-if="consistencyPackage" :column="1" border class="extract-summary">
          <el-descriptions-item label="统一术语">{{ consistencyPackage.unifiedTerms || '-' }}</el-descriptions-item>
          <el-descriptions-item label="统一工期">{{ consistencyPackage.unifiedPeriod || '-' }}</el-descriptions-item>
          <el-descriptions-item label="统一人员">{{ consistencyPackage.unifiedPersonnel || '-' }}</el-descriptions-item>
          <el-descriptions-item label="统一交付物">{{ consistencyPackage.unifiedDeliverables || '-' }}</el-descriptions-item>
          <el-descriptions-item label="服务承诺">{{ consistencyPackage.unifiedServiceCommitment || '-' }}</el-descriptions-item>
          <el-descriptions-item label="风险边界">{{ consistencyPackage.unifiedRiskBoundary || '-' }}</el-descriptions-item>
        </el-descriptions>
        <template v-if="reviewResult">
          <div class="quality-stat-grid">
            <div class="quality-stat-card"><span>审稿得分</span><strong>{{ reviewResult.overallScore ?? '-' }}</strong><small>{{ reviewResult.summary || '-' }}</small></div>
            <div class="quality-stat-card"><span>风险等级</span><strong>{{ reviewResult.riskLevel || '-' }}</strong><small>LOW / MEDIUM / HIGH</small></div>
            <div class="quality-stat-card"><span>问题数量</span><strong>{{ (reviewResult.issues || []).length }}</strong><small>建议逐项处理</small></div>
          </div>
          <el-table class="ui-table quality-table" :data="reviewResult.issues || []" border stripe size="small" empty-text="暂无审稿问题">
            <el-table-column prop="severity" label="等级" width="100" align="center" />
            <el-table-column prop="title" label="问题" min-width="160" show-overflow-tooltip />
            <el-table-column prop="description" label="说明" min-width="220" show-overflow-tooltip />
            <el-table-column prop="suggestion" label="修改建议" min-width="260" show-overflow-tooltip />
          </el-table>
          <el-input v-if="reviewResult.aiReviewText" class="review-textarea" type="textarea" :rows="12" readonly :model-value="reviewResult.aiReviewText" />
        </template>
      </div>
    </el-drawer>

    <el-drawer
      v-model="requirementExtractVisible"
      title="评分项 / 需求解析"
      size="58%"
      destroy-on-close
      class="requirement-extract-drawer"
    >
      <div class="requirement-extract-wrap" v-loading="requirementExtractLoading">
        <div class="requirement-extract-toolbar">
          <div>
            <div class="requirement-extract-title">招标文件结构化解析结果</div>
            <div class="requirement-extract-desc">用于目录生成、章节绑定和正文生成；修改采购需求或评分标准后可重新解析。</div>
          </div>
          <div class="requirement-extract-actions">
            <el-button :disabled="!requirementExtract?.hasExtract" @click="openExtractSummaryDialog">编辑摘要</el-button>
            <el-button :disabled="!requirementExtract?.hasExtract" @click="openScoreItemDialog()">新增评分项</el-button>
            <el-button :disabled="!requirementExtract?.hasExtract" @click="openRequirementItemDialog()">新增要求</el-button>
            <el-button :loading="requirementOutlineSyncing" :disabled="!requirementExtract?.hasExtract || !currentSolution?.id || hasRunningTask" @click="onSyncRequirementExtractToOutline">同步到章节</el-button>
            <el-button type="primary" :loading="requirementExtractRebuilding" :disabled="!currentSolution?.id" @click="onRebuildRequirementExtract">重新解析</el-button>
          </div>
        </div>

        <el-empty v-if="!requirementExtract?.hasExtract" :description="requirementExtractEmptyDescription" :image-size="120" />

        <template v-else>
          <div class="requirement-extract-summary">
            <div class="summary-stat-card">
              <span>评分项</span>
              <strong>{{ requirementExtract.scoreItemCount || 0 }}</strong>
            </div>
            <div class="summary-stat-card">
              <span>要求明细</span>
              <strong>{{ requirementExtract.requirementItemCount || 0 }}</strong>
            </div>
            <div class="summary-stat-card wide">
              <span>解析状态</span>
              <strong>{{ requirementExtract.extract?.parseStatus || '-' }}</strong>
              <small>{{ requirementExtract.extract?.parseMessage || '' }}</small>
            </div>
          </div>

          <div v-if="requirementTypeCountTags.length" class="requirement-type-tags">
            <el-tag v-for="item in requirementTypeCountTags" :key="item.type" :type="requirementTypeTagType(item.type)" effect="light">
              {{ requirementTypeLabel(item.type) }}：{{ item.count }}
            </el-tag>
          </div>

          <el-descriptions class="extract-desc-box" :column="2" border>
            <el-descriptions-item label="项目名称">{{ requirementExtract.extract?.projectName || '-' }}</el-descriptions-item>
            <el-descriptions-item label="采购人/招标人">{{ requirementExtract.extract?.buyerName || '-' }}</el-descriptions-item>
            <el-descriptions-item label="预算/最高限价">{{ requirementExtract.extract?.budgetAmount || '-' }}</el-descriptions-item>
            <el-descriptions-item label="工期/服务期">{{ requirementExtract.extract?.periodRequirement || '-' }}</el-descriptions-item>
            <el-descriptions-item label="投标截止">{{ requirementExtract.extract?.bidDeadline || '-' }}</el-descriptions-item>
            <el-descriptions-item label="更新时间">{{ formatDateTime(requirementExtract.extract?.updateTime || requirementExtract.extract?.createTime) }}</el-descriptions-item>
          </el-descriptions>

          <el-collapse class="extract-collapse" model-value="score">
            <el-collapse-item title="结构化摘要" name="summary">
              <div class="summary-text-grid">
                <div v-for="item in requirementSummaryItems" :key="item.key" class="summary-text-item">
                  <strong>{{ item.label }}</strong>
                  <p>{{ item.value || '未提取' }}</p>
                </div>
              </div>
            </el-collapse-item>

            <el-collapse-item title="评分项" name="score">
              <el-table class="ui-table" :data="requirementExtract.scoreItems || []" border stripe size="small" empty-text="暂无评分项">
                <el-table-column label="序号" type="index" width="70" align="center" />
                <el-table-column prop="itemName" label="评分项" min-width="140" show-overflow-tooltip />
                <el-table-column prop="scoreText" label="分值" width="100" show-overflow-tooltip />
                <el-table-column prop="requirementText" label="评分要求" min-width="240" show-overflow-tooltip />
                <el-table-column prop="responseStrategy" label="响应策略" min-width="240" show-overflow-tooltip />
                <el-table-column prop="suggestedChapter" label="建议章节" min-width="160" show-overflow-tooltip />
                <el-table-column label="操作" width="120" fixed="right" align="center">
                  <template #default="{ row }">
                    <el-button link type="primary" size="small" @click="openScoreItemDialog(row)">编辑</el-button>
                    <el-button link type="danger" size="small" @click="onDeleteScoreItem(row)">删除</el-button>
                  </template>
                </el-table-column>
              </el-table>
            </el-collapse-item>

            <el-collapse-item title="要求明细" name="requirement">
              <el-table class="ui-table" :data="requirementExtract.requirementItems || []" border stripe size="small" empty-text="暂无要求明细">
                <el-table-column label="序号" type="index" width="70" align="center" />
                <el-table-column label="类型" width="110">
                  <template #default="{ row }">
                    <el-tag size="small" :type="requirementTypeTagType(row.requirementType)" effect="light">{{ requirementTypeLabel(row.requirementType) }}</el-tag>
                  </template>
                </el-table-column>
                <el-table-column prop="requirementTitle" label="标题" min-width="140" show-overflow-tooltip />
                <el-table-column label="强制" width="80" align="center">
                  <template #default="{ row }">{{ row.mandatory === 1 ? '是' : '否' }}</template>
                </el-table-column>
                <el-table-column prop="riskLevel" label="风险等级" width="100" show-overflow-tooltip />
                <el-table-column prop="requirementText" label="要求内容" min-width="260" show-overflow-tooltip />
                <el-table-column prop="suggestedResponse" label="建议响应" min-width="240" show-overflow-tooltip />
                <el-table-column prop="suggestedChapter" label="建议章节" min-width="160" show-overflow-tooltip />
                <el-table-column label="操作" width="120" fixed="right" align="center">
                  <template #default="{ row }">
                    <el-button link type="primary" size="small" @click="openRequirementItemDialog(row)">编辑</el-button>
                    <el-button link type="danger" size="small" @click="onDeleteRequirementItem(row)">删除</el-button>
                  </template>
                </el-table-column>
              </el-table>
            </el-collapse-item>
          </el-collapse>
        </template>
      </div>
    </el-drawer>

    <el-dialog v-model="extractSummaryDialogVisible" title="编辑结构化摘要" width="860px" append-to-body destroy-on-close>
      <el-form label-width="120px" class="requirement-edit-form">
        <el-row :gutter="12">
          <el-col :span="12"><el-form-item label="项目名称"><el-input v-model="extractSummaryForm.projectName" maxlength="300" /></el-form-item></el-col>
          <el-col :span="12"><el-form-item label="采购人"><el-input v-model="extractSummaryForm.buyerName" maxlength="300" /></el-form-item></el-col>
          <el-col :span="12"><el-form-item label="预算/限价"><el-input v-model="extractSummaryForm.budgetAmount" maxlength="120" /></el-form-item></el-col>
          <el-col :span="12"><el-form-item label="工期/服务期"><el-input v-model="extractSummaryForm.periodRequirement" maxlength="500" /></el-form-item></el-col>
          <el-col :span="12"><el-form-item label="投标截止"><el-input v-model="extractSummaryForm.bidDeadline" maxlength="120" /></el-form-item></el-col>
        </el-row>
        <el-form-item label="技术摘要"><el-input v-model="extractSummaryForm.technicalSummary" type="textarea" :rows="3" maxlength="3000" show-word-limit /></el-form-item>
        <el-form-item label="商务摘要"><el-input v-model="extractSummaryForm.businessSummary" type="textarea" :rows="3" maxlength="3000" show-word-limit /></el-form-item>
        <el-form-item label="服务/交付摘要"><el-input v-model="extractSummaryForm.serviceSummary" type="textarea" :rows="3" maxlength="3000" show-word-limit /></el-form-item>
        <el-form-item label="资格摘要"><el-input v-model="extractSummaryForm.qualificationSummary" type="textarea" :rows="3" maxlength="3000" show-word-limit /></el-form-item>
        <el-form-item label="风险摘要"><el-input v-model="extractSummaryForm.riskSummary" type="textarea" :rows="3" maxlength="3000" show-word-limit /></el-form-item>
        <el-form-item label="否决/禁止项"><el-input v-model="extractSummaryForm.forbiddenSummary" type="textarea" :rows="3" maxlength="3000" show-word-limit /></el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="extractSummaryDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="extractSummarySaving" @click="onSaveExtractSummary">保存</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="scoreItemDialogVisible" :title="scoreItemEditingId ? '编辑评分项' : '新增评分项'" width="760px" append-to-body destroy-on-close>
      <el-form label-width="96px" class="requirement-edit-form">
        <el-row :gutter="12">
          <el-col :span="14"><el-form-item label="评分项"><el-input v-model="scoreItemForm.itemName" maxlength="300" placeholder="例如：项目实施方案" /></el-form-item></el-col>
          <el-col :span="10"><el-form-item label="分值"><el-input v-model="scoreItemForm.scoreText" maxlength="120" placeholder="例如：15分" /></el-form-item></el-col>
          <el-col :span="14"><el-form-item label="建议章节"><el-input v-model="scoreItemForm.suggestedChapter" maxlength="300" placeholder="例如：项目实施方案" /></el-form-item></el-col>
          <el-col :span="10"><el-form-item label="排序"><el-input-number v-model="scoreItemForm.sortNo" :min="1" :max="9999" style="width: 100%" /></el-form-item></el-col>
        </el-row>
        <el-form-item label="评分要求"><el-input v-model="scoreItemForm.requirementText" type="textarea" :rows="5" maxlength="2000" show-word-limit /></el-form-item>
        <el-form-item label="响应策略"><el-input v-model="scoreItemForm.responseStrategy" type="textarea" :rows="5" maxlength="2000" show-word-limit /></el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="scoreItemDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="scoreItemSaving" @click="onSaveScoreItem">保存</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="requirementItemDialogVisible" :title="requirementItemEditingId ? '编辑要求明细' : '新增要求明细'" width="820px" append-to-body destroy-on-close>
      <el-form label-width="104px" class="requirement-edit-form">
        <el-row :gutter="12">
          <el-col :span="8">
            <el-form-item label="要求类型">
              <el-select v-model="requirementItemForm.requirementType" style="width: 100%">
                <el-option v-for="item in requirementTypeOptions" :key="item.value" :label="item.label" :value="item.value" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="风险等级">
              <el-select v-model="requirementItemForm.riskLevel" style="width: 100%">
                <el-option v-for="item in riskLevelOptions" :key="item.value" :label="item.label" :value="item.value" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="8"><el-form-item label="强制响应"><el-switch v-model="requirementItemForm.mandatory" active-text="是" inactive-text="否" /></el-form-item></el-col>
          <el-col :span="16"><el-form-item label="要求标题"><el-input v-model="requirementItemForm.requirementTitle" maxlength="300" /></el-form-item></el-col>
          <el-col :span="8"><el-form-item label="排序"><el-input-number v-model="requirementItemForm.sortNo" :min="1" :max="9999" style="width: 100%" /></el-form-item></el-col>
          <el-col :span="24"><el-form-item label="建议章节"><el-input v-model="requirementItemForm.suggestedChapter" maxlength="300" /></el-form-item></el-col>
        </el-row>
        <el-form-item label="要求内容"><el-input v-model="requirementItemForm.requirementText" type="textarea" :rows="5" maxlength="2000" show-word-limit /></el-form-item>
        <el-form-item label="建议响应"><el-input v-model="requirementItemForm.suggestedResponse" type="textarea" :rows="5" maxlength="2000" show-word-limit /></el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="requirementItemDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="requirementItemSaving" @click="onSaveRequirementItem">保存</el-button>
      </template>
    </el-dialog>

    <section v-if="showRightPreview" class="right-preview-card">
      <div v-if="String(selectedSectionSolutionId || '') === String(currentSolution?.id || '') && selectedSectionDisplayContent" class="section-preview">
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
                :disabled="!canCopySectionContent"
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
                @click="openShortenDialog"
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

    <el-dialog
      v-model="wordPresetVisible"
      title="设置方案篇幅"
      width="760px"
      append-to-body
      class="word-preset-dialog"
      :close-on-click-modal="false"
      :close-on-press-escape="false"
    >
      <div class="word-preset-panel">
        <div class="preset-tip">
          <strong>目录已生成完成</strong>
          <span>请选择每个末级章节的目标字数。系统不会再默认设置字数，确认后才会写入章节。</span>
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
        <el-button @click="wordPresetVisible = false">暂不设置</el-button>
        <el-button type="primary" :loading="wordPresetSaving" :disabled="!wordPresetSelectionValid" @click="onApplyWordPreset">{{ wordPresetNextAction ? '确认并继续生成' : '确认并进入方案' }}</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="scoreDialogVisible" title="评分项" width="860px" append-to-body>
      <div class="score-dialog-body">
        <div>
          <div class="dialog-label">完整评分标准</div>
          <el-input v-model="requirementForm.scoreRequirement" type="textarea" :rows="16" placeholder="本次提供的招标信息中未包含评分标准时，可手动补充" :disabled="isCreateFormLocked" />
        </div>
        <div>
          <div class="dialog-label">技术评分项</div>
          <el-input v-model="requirementForm.technicalScoreItems" type="textarea" :rows="16" placeholder="技术评分项用于生成更贴合技术标的目录" :disabled="isCreateFormLocked" />
        </div>
      </div>
      <template #footer>
        <el-button @click="scoreDialogVisible = false">取消</el-button>
        <el-button type="primary" :disabled="isCreateFormLocked" @click="scoreDialogVisible = false">使用技术评分项</el-button>
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

    <el-dialog v-model="shortenDialogVisible" title="缩写本章" width="460px" append-to-body>
      <el-form label-width="90px">
        <el-form-item label="目标字数">
          <el-radio-group v-model="shortenTargetMode" class="shorten-target-group">
            <el-radio-button v-for="n in shortenPresetOptions" :key="n" :label="String(n)">{{ n }}字</el-radio-button>
            <el-radio-button label="CUSTOM">自定义</el-radio-button>
          </el-radio-group>
        </el-form-item>
        <el-form-item v-if="shortenTargetMode === 'CUSTOM'" label="自定义">
          <el-input-number v-model="shortenCustomWordCount" :min="100" :max="20000" :step="50" controls-position="right" />
        </el-form-item>
        <el-alert
          title="缩写本章会对当前章节最多重写 3 次。若仍略超目标字数，系统会保存最接近目标的版本。"
          type="info"
          show-icon
          :closable="false"
        />
      </el-form>
      <template #footer>
        <el-button @click="shortenDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="sectionOptimizing === 'SHRINK'" @click="confirmShortenSection">开始缩写</el-button>
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
            <el-switch v-model="fullGenerateForm.blindBidEnabled" @change="handleFullGenerateBlindChange" />
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
        <el-form-item label="内容深度：">
          <el-radio-group v-model="fullGenerateForm.contentDepth" class="style-radio-grid">
            <el-radio-button label="BRIEF">简洁</el-radio-button>
            <el-radio-button label="STANDARD">标准</el-radio-button>
            <el-radio-button label="DETAILED">详细</el-radio-button>
          </el-radio-group>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="fullGenerateSettingVisible = false">取消</el-button>
        <el-button type="primary" :loading="fullGenerating" @click="confirmFullGenerate">开始生成</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="versionDialogVisible" title="历史版本" width="960px" append-to-body class="version-dialog">
      <div class="version-layout">
        <div class="version-list-panel" v-loading="versionLoading">
          <div
            v-for="item in versionList"
            :key="item.id"
            :class="['version-card', String(selectedVersion?.id || '') === String(item.id || '') ? 'active' : '']"
            @click="selectVersion(item)"
          >
            <div class="version-card-title">V{{ item.versionNo }} {{ item.versionName || '' }}</div>
            <div class="version-card-meta">{{ formatDateTime(item.createdAt) }} · {{ item.totalWords || 0 }} 字 · {{ item.sectionCount || 0 }} 章</div>
            <div class="version-card-remark">{{ item.remark || '自动保存快照' }}</div>
          </div>
          <el-empty v-if="!versionLoading && !versionList.length" description="暂无历史版本，重编全文或恢复前会自动保存" />
        </div>
        <div class="version-preview-panel">
          <template v-if="selectedVersion">
            <div class="version-preview-head">
              <div>
                <div class="version-preview-title">V{{ selectedVersion.versionNo }} 快照预览</div>
                <div class="version-preview-desc">{{ selectedVersionSnapshot.solutionName || currentSolution?.solutionName || 'AI方案' }}</div>
              </div>
              <el-button type="primary" :loading="versionRestoring" :disabled="hasRunningTask" @click="onRestoreVersion(selectedVersion)">恢复此版本</el-button>
            </div>
            <div class="version-compare-tip">恢复前系统会再次保存当前内容快照，恢复后会覆盖当前章节正文，并标记导出结果为待更新。</div>
            <el-scrollbar class="version-section-scroll">
              <div v-for="section in selectedVersionSnapshot.sections" :key="section.outlineId || section.id" class="version-section-item">
                <div class="version-section-head">
                  <div>
                    <div class="version-section-title">{{ section.title || '未命名章节' }}</div>
                    <div class="version-section-meta">历史版本：{{ section.actualWordCount || countTextWords(section.content || '') }} 字；当前版本：{{ currentSectionWordCount(section.outlineId) }} 字</div>
                  </div>
                  <el-button size="small" plain :loading="versionRestoring" :disabled="hasRunningTask" @click="onRestoreVersionSection(section)">恢复本章</el-button>
                </div>
                <div class="version-section-content">{{ section.content || '暂无正文' }}</div>
              </div>
              <el-empty v-if="!selectedVersionSnapshot.sections.length" description="该版本没有章节正文快照" />
            </el-scrollbar>
          </template>
          <el-empty v-else description="请选择左侧历史版本查看快照" />
        </div>
      </div>
    </el-dialog>

    <el-dialog v-model="knowledgeSelectorVisible" title="选择知识库" width="680px" append-to-body>
      <div class="knowledge-selector">
        <div class="knowledge-search-row">
          <el-input
            v-model="knowledgeKeyword"
            clearable
            placeholder="请输入知识库名称"
            :disabled="isKnowledgeSelectorLocked"
            @keyup.enter="loadKnowledgeBases"
          >
            <template #prefix>
              <el-icon><Search /></el-icon>
            </template>
          </el-input>
          <el-button type="primary" plain :disabled="isKnowledgeSelectorLocked" @click="loadKnowledgeBases">搜索</el-button>
        </div>

        <el-checkbox-group v-model="tempSelectedKnowledgeIds" class="knowledge-check-list" :disabled="isKnowledgeSelectorLocked">
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
        <el-button type="primary" :loading="knowledgeLoading" :disabled="isKnowledgeSelectorLocked" @click="confirmKnowledgeSelection">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { computed, defineComponent, h, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ElButton, ElCheckbox, ElIcon, ElInput, ElMessage, ElMessageBox, ElNotification, ElOption, ElSelect, ElTag, ElTooltip } from '@/plugins/element-plus-api'
import { ArrowLeft, Close, Delete, Document, EditPen, Menu, Plus, Search, SortDown, SortUp, UploadFilled } from '@element-plus/icons-vue'
import {
  addOutlineNode,
  applyWordCountPreset,
  batchUpdateOutlineWordCount,
  createSolution,
  createRequirementItem,
  createRequirementScoreItem,
  deleteOutlineNodes,
  deleteRequirementItem,
  deleteRequirementScoreItem,
  deleteSolution,
  downloadFileResource,
  startSolutionExportTask,
  getSolutionExportTask,
  generateFull,
  generateOutline,
  getGenerationTask,
  getCurrentUserRunningAiTask,
  getParseTask,
  getSolutionVersion,
  listSolutionVersions,
  getSolution,
  getSolutionGenerateCheck,
  getSolutionQualityCheck,
  getSolutionWordCountStats,
  getSolutionConsistencyPackage,
  getSolutionDuplicateCheck,
  getSolutionExportCheck,
  compressSolutionDuplicateSections,
  runSolutionAiReview,
  getRequirementExtract,
  rebuildRequirementExtract,
  moveOutlineNode,
  pageSolutions,
  restoreSolutionVersion,
  restoreSolutionVersionSection,
  rewriteFull,
  saveOverallWritingRequirement,
  saveRequirement,
  streamSection,
  streamWritingDirection,
  syncRequirementExtractToOutline,
  updateOutlineWordCount,
  updateRequirementExtractSummary,
  updateRequirementItem,
  updateRequirementScoreItem,
  updateSectionContent,
  updateWritingConfig,
  uploadAndParseTenderFile
} from '@/api/aiSolution'
import { listKnowledgeBases } from '@/api/knowledge'
import { openWordExportDialog } from '@/utils/wordExportDialog'

const router = useRouter()
const mode = ref('home')
const loading = ref(false)
const appendLoading = ref(false)
const solutions = ref([])
const currentSolution = ref(null)
const activeSolutionId = ref(null)
const detailRequestSeq = ref(0)
const selectedSection = ref(null)
const selectedSectionSolutionId = ref(null)
const listQuery = reactive({ pageNum: 1, pageSize: 20, keyword: '' })
const solutionListScrollbar = ref()
const solutionPager = reactive({ page: 1, size: 20, total: 0 })
let searchTimer = null
let parseTimer = null
let taskTimer = null
let outlineTimer = null
let requirementExtractTimer = null
let globalTaskTimer = null
const notifiedTaskIds = new Set()
const SOLUTION_TASK_PENDING_KEY = 'ai_solution_generation_task_pending'
const solutionTaskPending = reactive({ solutionId: '', taskId: '' })
const solutionTaskPollingBusy = ref(false)
const solutionTaskPollErrorCount = ref(0)
const solutionTaskPollTick = ref(0)
const globalRunningTask = ref(null)

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
const isCreateFormLocked = computed(() => outlineGenerating.value || isOutlineGeneratingByBackend.value)
const isKnowledgeSelectorLocked = computed(() => isCreateFormLocked.value && knowledgeSelectorTarget.value === 'outline')
const isOutlineFinishedByBackend = computed(() => hasOutlineFromBackend.value || outlineFinishedStatuses.includes(currentSolution.value?.status))
const canClickGenerateOutline = computed(() => {
  const hasExistingOutline = isOutlineFinishedByBackend.value
  return !!currentSolution.value?.id
    && !outlineGenerating.value
    && !parseLoading.value
    && !isOutlineGeneratingByBackend.value
    && !hasRunningTask.value
    && (hasExistingOutline || parseDone.value)
    && !!createForm.solutionName?.trim()
    && !!requirementForm.purchaseRequirement?.trim()
})
const generateOutlineButtonText = computed(() => {
  if (outlineGenerating.value || isOutlineGeneratingByBackend.value) return '目录生成中'
  if (isOutlineFinishedByBackend.value) return '重新生成目录'
  if (!currentSolution.value?.id) return '正在创建草稿'
  if (!parseTask.value?.id) return '请先上传标书'
  if (parseTask.value.status === 'FAILED') return '解析失败，无法生成'
  if (!parseDone.value) return '解析完成后生成目录'
  return '生成目录'
})
const scoreDialogVisible = ref(false)
const requirementExtractVisible = ref(false)
const qualityCheckVisible = ref(false)
const wordCountVisible = ref(false)
const wordCountLoading = ref(false)
const wordCountStats = ref({ items: [] })
const duplicateCheckData = ref({ duplicates: [] })
const duplicateCompressing = ref(false)
const reviewVisible = ref(false)
const reviewLoading = ref(false)
const consistencyPackage = ref(null)
const reviewResult = ref(null)
const qualityCheckLoading = ref(false)
const qualityCheckData = ref({ items: [], totalSections: 0, checkedSections: 0, averageScore: 0, excellentSections: 0, usableSections: 0, attentionSections: 0, rewriteSections: 0, noQualityLogSections: 0 })
const requirementExtractLoading = ref(false)
const requirementExtractRebuilding = ref(false)
const requirementOutlineSyncing = ref(false)
const requirementExtract = ref({ hasExtract: false, extract: null, scoreItems: [], requirementItems: [], requirementTypeCounts: {} })
const requirementExtractEmptyDescription = computed(() => {
  if (requirementExtractLoading.value || requirementExtractRebuilding.value) return '结构化解析正在生成，请稍候'
  if (isOutlineGeneratingByBackend.value || outlineGenerating.value) return '目录生成中，评分项/需求解析将在后台自动补齐'
  if (isOutlineFinishedByBackend.value) return '结构化解析正在后台补齐，稍候会自动刷新；也可以点击“重新解析”立即生成'
  return '暂无结构化解析结果，请点击重新解析'
})
const extractSummaryDialogVisible = ref(false)
const extractSummarySaving = ref(false)
const scoreItemDialogVisible = ref(false)
const scoreItemSaving = ref(false)
const scoreItemEditingId = ref('')
const requirementItemDialogVisible = ref(false)
const requirementItemSaving = ref(false)
const requirementItemEditingId = ref('')
const extractSummaryForm = reactive({
  projectName: '',
  buyerName: '',
  budgetAmount: '',
  periodRequirement: '',
  bidDeadline: '',
  technicalSummary: '',
  businessSummary: '',
  serviceSummary: '',
  qualificationSummary: '',
  riskSummary: '',
  forbiddenSummary: ''
})
const scoreItemForm = reactive({
  itemName: '',
  scoreText: '',
  requirementText: '',
  responseStrategy: '',
  suggestedChapter: '',
  sortNo: 1
})
const requirementItemForm = reactive({
  requirementType: 'TECHNICAL',
  requirementTitle: '',
  requirementText: '',
  mandatory: false,
  riskLevel: 'LOW',
  suggestedResponse: '',
  suggestedChapter: '',
  sortNo: 1
})
const requirementTypeOptions = [
  { label: '技术要求', value: 'TECHNICAL' },
  { label: '商务要求', value: 'BUSINESS' },
  { label: '服务要求', value: 'SERVICE' },
  { label: '资格/资质/业绩', value: 'QUALIFICATION' },
  { label: '交付要求', value: 'DELIVERY' },
  { label: '验收要求', value: 'ACCEPTANCE' },
  { label: '风险/否决/偏离', value: 'RISK' },
  { label: '其他要求', value: 'OTHER' }
]
const riskLevelOptions = [
  { label: '低', value: 'LOW' },
  { label: '中', value: 'MEDIUM' },
  { label: '高', value: 'HIGH' }
]
const wordPresetVisible = ref(false)
const wordPresetSaving = ref(false)
const wordPresetNextAction = ref(null)
const wordPreset = reactive({ mode: '', wordCount: null })
const wordPresetSelectionValid = computed(() => wordPreset.mode === 'AUTO' || (wordPreset.mode === 'FIXED' && Number(wordPreset.wordCount || 0) > 0))
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
// 记录打开“全文生成设置”弹窗时绑定的方案，避免异步保存偏好期间切换方案后，生成请求落到当前新选中的方案上。
const fullGenerateTargetSolutionId = ref('')
const fullGenerateTargetSolutionSnapshot = ref(null)
const DEFAULT_BLIND_BID_REQUIREMENT = '输出内容中不得出现投标人的名称、企业标识、人员名称、企业独享的符号或图案等任何可识别投标人身份的信息。不得在页眉、页脚、正文、表格、图片说明、附件名称中出现可识别投标人身份的信息。'

const fullGenerateForm = reactive({
  blindBidEnabled: false,
  blindBidRequirement: '',
  writingStyle: 'GENERAL',
  contentDepth: 'STANDARD',
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
const selectedOutlineKnowledgeBases = computed(() => buildSelectedKnowledgeBases(parseKnowledgeIds(outlineForm.knowledgeIds)))
const selectedSectionKnowledgeBases = computed(() => buildSelectedKnowledgeBases(parseKnowledgeIds(sectionForm.knowledgeIds)))
const sectionDialogVisible = ref(false)
const sectionGenerating = ref(false)
const sectionNode = ref(null)
const sectionStreamingText = ref('')
const sectionOptimizing = ref('')
const sectionOptimizingNodeId = ref('')
const shortenDialogVisible = ref(false)
const shortenTargetMode = ref('300')
const shortenCustomWordCount = ref(300)
const shortenPresetOptions = [300, 600, 900, 1200]
const overallWritingRequirement = ref('')
const sectionContentEditMode = ref(false)
const sectionContentSaving = ref(false)
const sectionContentDraft = ref('')
const exportLoading = ref(false)
const versionDialogVisible = ref(false)
const versionLoading = ref(false)
const versionRestoring = ref(false)
const versionList = ref([])
const selectedVersion = ref(null)
const selectedVersionSnapshot = computed(() => parseVersionSnapshot(selectedVersion.value?.snapshotJson))

const createForm = reactive({
  solutionMode: 'QUICK',
  solutionType: 'SERVICE',
  solutionSubType: '不限',
  aiLevel: '',
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
  writingDirection: '',
  knowledgeIds: []
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
  { label: '基础版', value: 'BASIC', desc: '标准生成质量，适合常规文档与快速出稿。' },
  { label: '标准版', value: 'STANDARD', desc: '标准生成质量，增加关键质量校验与结构优化。' },
  { label: '旗舰版', value: 'FLAGSHIP', desc: '标准生成质量，增强评分项对齐和审稿建议。' }
]

function requireSelectedAiLevel() {
  if (!createForm.aiLevel) {
    ElMessage.warning('请先选择AI等级')
    return false
  }
  return true
}


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
  const task = currentSolution.value?.runningTask
  if (task && ['WAITING', 'RUNNING'].includes(task.status)) {
    return Math.min(100, Math.max(0, Number(task.progress || 0)))
  }
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
const requirementTypeCountTags = computed(() => {
  const counts = requirementExtract.value?.requirementTypeCounts || {}
  return Object.entries(counts).map(([type, count]) => ({ type, count }))
})

const qualityItems = computed(() => qualityCheckData.value?.items || [])

const qualityStatCards = computed(() => {
  const data = qualityCheckData.value || {}
  return [
    { label: '章节总数', value: data.totalSections || 0, desc: '当前目录末级章节' },
    { label: '已检查', value: data.checkedSections || 0, desc: '已有质量日志章节' },
    { label: '平均分', value: data.averageScore || 0, desc: '仅统计已检查章节' },
    { label: '需重编', value: data.rewriteSections || 0, desc: '低于最低质量线' },
    { label: '需关注', value: data.attentionSections || 0, desc: '建议人工复核' },
    { label: '优秀/可用', value: `${data.excellentSections || 0}/${data.usableSections || 0}`, desc: '优秀 / 可用章节' }
  ]
})

const requirementSummaryItems = computed(() => {
  const extract = requirementExtract.value?.extract || {}
  return [
    { key: 'technicalSummary', label: '技术摘要', value: extract.technicalSummary },
    { key: 'businessSummary', label: '商务摘要', value: extract.businessSummary },
    { key: 'serviceSummary', label: '服务摘要', value: extract.serviceSummary },
    { key: 'qualificationSummary', label: '资格摘要', value: extract.qualificationSummary },
    { key: 'riskSummary', label: '风险摘要', value: extract.riskSummary },
    { key: 'forbiddenSummary', label: '否决/禁止项', value: extract.forbiddenSummary }
  ]
})
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
const canCopySectionContent = computed(() => {
  return !!selectedSection.value?.id
    && String(selectedSectionSolutionId.value || '') === String(currentSolution.value?.id || '')
    && !!selectedSectionDisplayContent.value
    && !isSolutionBusy.value
})
const canEditSectionContent = computed(() => {
  return !!selectedSection.value?.id
    && String(selectedSectionSolutionId.value || '') === String(currentSolution.value?.id || '')
    && !!selectedSectionContent.value
    && !isSolutionBusy.value
    && !sectionGenerating.value
    && !sectionOptimizing.value
})
const canOptimizeSectionContent = computed(() => {
  return !!selectedSection.value?.id
    && String(selectedSectionSolutionId.value || '') === String(currentSolution.value?.id || '')
    && !!selectedSectionContent.value
    && !sectionContentEditMode.value
    && !isSolutionBusy.value
    && !hasOtherSolutionRunningTask.value
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
const runningSolutionStatuses = ['CONTENT_GENERATING']
function isSolutionGenerating(item) {
  if (!item) return false
  const taskStatus = String(item.runningTask?.status || '').toUpperCase()
  if (['WAITING', 'RUNNING'].includes(taskStatus)) return true
  return runningSolutionStatuses.includes(String(item.status || '').toUpperCase())
}
const isGlobalAiTaskRunning = computed(() => ['WAITING', 'RUNNING'].includes(String(globalRunningTask.value?.status || '').toUpperCase()))
const isGlobalAiTaskForCurrentSolution = computed(() => {
  const currentId = normalizeId(activeSolutionId.value || currentSolution.value?.id)
  return !!currentId && isSameId(globalRunningTask.value?.solutionId, currentId)
})
const hasOtherSolutionRunningTask = computed(() => {
  const currentId = normalizeId(activeSolutionId.value || currentSolution.value?.id)
  if (isGlobalAiTaskRunning.value && !isGlobalAiTaskForCurrentSolution.value) return true
  return solutions.value.some((item) => isSolutionGenerating(item) && !isSameId(item.id, currentId))
})
const otherSolutionRunningMessage = computed(() => hasOtherSolutionRunningTask.value ? '已有其他AI生成任务正在执行，请等待完成后再操作' : '')
const isRewriteRunning = computed(() => {
  const task = currentSolution.value?.runningTask
  return !!task && task.taskType === 'REWRITE_FULL' && ['WAITING', 'RUNNING'].includes(task.status)
})
const isSolutionBusy = computed(() => {
  return outlineGenerating.value
    || isOutlineGeneratingByBackend.value
    || fullGenerating.value
    || hasRunningTask.value
    || sectionGenerating.value
    || !!sectionOptimizing.value
    || sectionContentSaving.value
})
const runningTaskText = computed(() => {
  const task = currentSolution.value?.runningTask
  if (!task || !['WAITING', 'RUNNING'].includes(task.status)) return ''
  if (task.taskType === 'REWRITE_FULL') return `正在重编全文：${task.finishedNodes || 0} / ${task.totalNodes || 0} 章`
  if (task.taskType === 'GENERATE_FULL') return `正在生成全文：${task.finishedNodes || 0} / ${task.totalNodes || 0} 章`
  return task.message || '任务执行中'
})
const recoveryNoticeText = computed(() => {
  const solution = currentSolution.value
  if (!solution || hasRunningTask.value) return ''
  if (solution.recoveryMessage) return solution.recoveryMessage
  if (solution.recoveredAfterRestart) return '上次生成因服务重启或任务中断未完成，系统已恢复为可重试状态，请点击“重试未完成章节”继续生成。'
  const stat = leafGenerationStat.value
  if (stat.total > 0 && stat.failed > 0) {
    return '当前存在失败或未完成章节，可点击“重试未完成章节”继续生成。'
  }
  return ''
})
const canEditOutline = computed(() => currentSolution.value?.canEditOutline !== false && !isSolutionBusy.value)
const canRewriteAll = computed(() => currentSolution.value?.canRewriteAll !== false && !isSolutionBusy.value && !hasOtherSolutionRunningTask.value)
const allLeafGenerated = computed(() => leafGenerationStat.value.total > 0 && leafGenerationStat.value.done === leafGenerationStat.value.total)
const canGenerate = computed(() => currentSolution.value?.canGenerate !== false && !isSolutionBusy.value && !hasOtherSolutionRunningTask.value && !allLeafGenerated.value)
const canExport = computed(() => currentSolution.value?.canExport === true && allLeafGenerated.value && !isSolutionBusy.value)
const generateActionText = computed(() => {
  const task = currentSolution.value?.runningTask
  if (task && ['WAITING', 'RUNNING'].includes(task.status)) {
    if (task.taskType === 'REWRITE_FULL') return '重编中...'
    if (task.taskType === 'GENERATE_FULL') return '生成中...'
    return '处理中...'
  }
  const stat = leafGenerationStat.value
  if (stat.total > 0 && stat.done === stat.total) return '已全部生成'
  if (stat.total > 0 && stat.failed > 0) return '重试未完成章节'
  if (stat.total > 0 && stat.done > 0 && stat.done < stat.total) return '继续生成'
  return '开始生成'
})
const exportButtonText = computed(() => exportLoading.value ? '正在导出' : '导出')
const solutionNoMore = computed(() => solutionPager.total > 0 && solutions.value.length >= solutionPager.total)

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
  await loadGlobalRunningTask()
  await loadList()
  restoreSolutionTaskPending()
  startGlobalTaskPolling()
})

onBeforeUnmount(() => {
  clearTimeout(searchTimer)
  clearInterval(parseTimer)
  clearInterval(taskTimer)
  clearInterval(outlineTimer)
  clearInterval(requirementExtractTimer)
  clearInterval(globalTaskTimer)
})

function startGlobalTaskPolling() {
  clearInterval(globalTaskTimer)
  globalTaskTimer = setInterval(() => {
    if (!document.hidden) loadGlobalRunningTask()
  }, 5000)
}

async function loadGlobalRunningTask() {
  try {
    globalRunningTask.value = await getCurrentUserRunningAiTask()
  } catch (e) {
    globalRunningTask.value = null
  }
}

async function loadList(options = {}) {
  const append = Boolean(options.append)
  if ((append && solutionNoMore.value) || loading.value || appendLoading.value) return

  const pageToLoad = append ? solutionPager.page + 1 : 1
  if (append) {
    appendLoading.value = true
  } else {
    loading.value = true
  }

  try {
    const res = await pageSolutions({
      ...listQuery,
      current: pageToLoad,
      size: solutionPager.size,
      pageNum: pageToLoad,
      pageSize: solutionPager.size,
      keyword: listQuery.keyword?.trim() || undefined
    })
    const records = (res?.records || []).filter((item) => item?.deleted !== 1 && item?.status !== 'DELETED')
    solutionPager.page = pageToLoad
    solutionPager.total = Number(res?.total || 0)

    if (append) {
      const exists = new Set(solutions.value.map((item) => String(item.id)))
      solutions.value = solutions.value.concat(records.filter((item) => item?.id && !exists.has(String(item.id))))
      return
    }

    solutions.value = records
    await loadGlobalRunningTask()

    // 首次进入 AI方案页面时不默认选中第一条方案。
    // 保持右侧首页/空态，只有用户点击左侧方案卡片，或新建完成后，才进入方案详情。
    if (mode.value !== 'create') {
      const currentId = currentSolution.value?.id || activeSolutionId.value
      const currentStillExists = currentId
        ? solutions.value.some((item) => String(item.id) === String(currentId))
        : false

      if (!currentStillExists) {
        currentSolution.value = null
        activeSolutionId.value = null
        selectedSection.value = null
        selectedSectionSolutionId.value = null
        mode.value = 'home'
      }
    }
  } finally {
    if (append) {
      appendLoading.value = false
    } else {
      loading.value = false
    }
  }
}

function onSearchInput() {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    solutionPager.page = 1
    solutions.value = []
    loadList()
  }, 300)
}

function onSolutionListScroll() {
  const el = solutionListScrollbar.value?.wrapRef
  if (!el || loading.value || appendLoading.value || solutionNoMore.value) return
  const remain = el.scrollHeight - el.scrollTop - el.clientHeight
  if (remain <= 80) {
    loadList({ append: true })
  }
}

function requirementTypeLabel(type) {
  const map = {
    TECHNICAL: '技术',
    BUSINESS: '商务',
    SERVICE: '服务',
    QUALIFICATION: '资格',
    DELIVERY: '交付',
    ACCEPTANCE: '验收',
    RISK: '风险',
    OTHER: '其他'
  }
  return map[type] || type || '其他'
}

function requirementTypeTagType(type) {
  const map = {
    TECHNICAL: 'primary',
    BUSINESS: 'success',
    SERVICE: 'warning',
    QUALIFICATION: 'info',
    DELIVERY: 'success',
    ACCEPTANCE: 'primary',
    RISK: 'danger',
    OTHER: 'info'
  }
  return map[type] || 'info'
}


async function openQualityCheckDrawer() {
  if (!currentSolution.value?.id) return
  qualityCheckVisible.value = true
  await loadQualityCheck()
}

async function loadQualityCheck() {
  if (!qualityCheckVisible.value || !currentSolution.value?.id) return
  qualityCheckLoading.value = true
  try {
    qualityCheckData.value = normalizeQualityCheckPayload(await getSolutionQualityCheck(currentSolution.value.id))
  } finally {
    qualityCheckLoading.value = false
  }
}

function normalizeQualityCheckPayload(data) {
  return data || { items: [], totalSections: 0, checkedSections: 0, averageScore: 0, excellentSections: 0, usableSections: 0, attentionSections: 0, rewriteSections: 0, noQualityLogSections: 0 }
}

function safePercent(value) {
  const n = Number(value || 0)
  return Math.min(100, Math.max(0, Number.isFinite(n) ? n : 0))
}

function qualityLevelTagType(level, score) {
  const n = Number(score || 0)
  if (String(level || '').includes('重写') || n < 72) return 'danger'
  if (String(level || '').includes('关注') || n < 82) return 'warning'
  if (String(level || '').includes('优秀') || n >= 92) return 'success'
  return 'primary'
}

function qualityProgressStatus(score) {
  const n = Number(score || 0)
  if (n < 72) return 'exception'
  if (n < 82) return 'warning'
  if (n >= 92) return 'success'
  return ''
}

function issueSeverityTagType(value) {
  const v = String(value || '').toUpperCase()
  if (v === 'HIGH') return 'danger'
  if (v === 'MEDIUM') return 'warning'
  if (v === 'LOW') return 'info'
  return 'success'
}

function qualityRowClassName({ row }) {
  if (!row?.hasQualityLog) return 'quality-row-missing'
  if (row.recommendRewrite) return 'quality-row-rewrite'
  if (row.recommendReview) return 'quality-row-review'
  return ''
}


async function openWordCountDrawer() {
  if (!currentSolution.value?.id) return
  wordCountVisible.value = true
  await loadWordCountStats()
}

async function loadWordCountStats() {
  if (!wordCountVisible.value || !currentSolution.value?.id) return
  wordCountLoading.value = true
  try {
    const [wordRes, duplicateRes] = await Promise.all([
      getSolutionWordCountStats(currentSolution.value.id),
      getSolutionDuplicateCheck(currentSolution.value.id)
    ])
    wordCountStats.value = wordRes || { items: [] }
    duplicateCheckData.value = duplicateRes || { duplicates: [] }
  } catch (e) {
    ElMessage.error(e?.message || '加载字数检查失败')
  } finally {
    wordCountLoading.value = false
  }
}

async function onCompressDuplicates() {
  if (!currentSolution.value?.id) return
  await ElMessageBox.confirm('系统将删除跨章节重复段落，保留首次出现内容。该操作不会新增事实内容，是否继续？', '一键压缩重复内容', {
    type: 'warning', confirmButtonText: '开始压缩', cancelButtonText: '取消'
  })
  duplicateCompressing.value = true
  try {
    currentSolution.value = await compressSolutionDuplicateSections(currentSolution.value.id)
    ElMessage.success('重复内容已压缩')
    await loadWordCountStats()
  } catch (e) {
    ElMessage.error(e?.message || '压缩重复内容失败')
  } finally {
    duplicateCompressing.value = false
  }
}

async function openReviewDrawer() {
  if (!currentSolution.value?.id) return
  reviewVisible.value = true
  reviewResult.value = null
  reviewLoading.value = true
  try {
    consistencyPackage.value = await getSolutionConsistencyPackage(currentSolution.value.id)
  } catch (e) {
    ElMessage.error(e?.message || '加载全文统一口径失败')
  } finally {
    reviewLoading.value = false
  }
}

async function runAiReviewNow() {
  if (!currentSolution.value?.id) return
  reviewLoading.value = true
  try {
    reviewResult.value = await runSolutionAiReview(currentSolution.value.id)
    ElMessage.success('AI二次审稿完成')
  } catch (e) {
    ElMessage.error(e?.message || 'AI二次审稿失败')
  } finally {
    reviewLoading.value = false
  }
}

function wordStatusTagType(status) {
  if (status === '字数正常') return 'success'
  if (status === '略超字数' || status === '明显偏短') return 'warning'
  if (status === '明显超字数') return 'danger'
  return 'info'
}

async function openRequirementExtractDrawer() {
  if (!currentSolution.value?.id) return
  requirementExtractVisible.value = true
  await loadRequirementExtract()
  if (!requirementExtract.value?.hasExtract) {
    startRequirementExtractPolling()
  }
}

async function loadRequirementExtract() {
  if (!requirementExtractVisible.value || !currentSolution.value?.id) return
  requirementExtractLoading.value = true
  try {
    requirementExtract.value = normalizeRequirementExtractPayload(await getRequirementExtract(currentSolution.value.id))
  } finally {
    requirementExtractLoading.value = false
  }
}

function startRequirementExtractPolling() {
  clearInterval(requirementExtractTimer)
  let retry = 0
  const tick = async () => {
    if (!requirementExtractVisible.value || !currentSolution.value?.id) {
      clearInterval(requirementExtractTimer)
      requirementExtractTimer = null
      return
    }
    if (document.hidden) return
    retry += 1
    try {
      const data = normalizeRequirementExtractPayload(await getRequirementExtract(currentSolution.value.id))
      requirementExtract.value = data
      if (data?.hasExtract || retry >= 60) {
        clearInterval(requirementExtractTimer)
        requirementExtractTimer = null
      }
    } catch {
      if (retry >= 60) {
        clearInterval(requirementExtractTimer)
        requirementExtractTimer = null
      }
    }
  }
  requirementExtractTimer = setInterval(tick, 5000)
}

async function onRebuildRequirementExtract() {
  if (!currentSolution.value?.id) return
  try {
    await ElMessageBox.confirm('重新解析会失效旧的评分项/需求结构化结果，并按当前采购需求、技术要求、服务要求和评分标准重新生成。是否继续？', '重新解析确认', {
      type: 'warning',
      confirmButtonText: '重新解析',
      cancelButtonText: '取消'
    })
  } catch {
    return
  }
  requirementExtractRebuilding.value = true
  requirementExtractLoading.value = true
  try {
    requirementExtract.value = normalizeRequirementExtractPayload(await rebuildRequirementExtract(currentSolution.value.id))
    ElMessage.success('结构化解析已更新')
  } finally {
    requirementExtractRebuilding.value = false
    requirementExtractLoading.value = false
  }
}

async function onSyncRequirementExtractToOutline() {
  if (!currentSolution.value?.id) return
  try {
    await ElMessageBox.confirm('将当前评分项/要求同步到所有末级章节的编写要求中。已生成正文不会自动改写，后续重编或单章生成会使用最新绑定。是否继续？', '同步到章节确认', {
      type: 'warning',
      confirmButtonText: '同步到章节',
      cancelButtonText: '取消'
    })
  } catch {
    return
  }
  requirementOutlineSyncing.value = true
  try {
    const detail = await syncRequirementExtractToOutline(currentSolution.value.id)
    currentSolution.value = detail
    ElMessage.success('评分项/要求已同步到目录章节')
  } finally {
    requirementOutlineSyncing.value = false
  }
}


function normalizeRequirementExtractPayload(data) {
  return data || { hasExtract: false, extract: null, scoreItems: [], requirementItems: [], requirementTypeCounts: {} }
}

function openExtractSummaryDialog() {
  const extract = requirementExtract.value?.extract || {}
  Object.assign(extractSummaryForm, {
    projectName: extract.projectName || '',
    buyerName: extract.buyerName || '',
    budgetAmount: extract.budgetAmount || '',
    periodRequirement: extract.periodRequirement || '',
    bidDeadline: extract.bidDeadline || '',
    technicalSummary: extract.technicalSummary || '',
    businessSummary: extract.businessSummary || '',
    serviceSummary: extract.serviceSummary || '',
    qualificationSummary: extract.qualificationSummary || '',
    riskSummary: extract.riskSummary || '',
    forbiddenSummary: extract.forbiddenSummary || ''
  })
  extractSummaryDialogVisible.value = true
}

async function onSaveExtractSummary() {
  if (!currentSolution.value?.id) return
  extractSummarySaving.value = true
  try {
    requirementExtract.value = normalizeRequirementExtractPayload(await updateRequirementExtractSummary(currentSolution.value.id, { ...extractSummaryForm }))
    extractSummaryDialogVisible.value = false
    ElMessage.success('结构化摘要已保存')
  } finally {
    extractSummarySaving.value = false
  }
}

function openScoreItemDialog(row = null) {
  scoreItemEditingId.value = row?.id || ''
  Object.assign(scoreItemForm, {
    itemName: row?.itemName || '',
    scoreText: row?.scoreText || '',
    requirementText: row?.requirementText || '',
    responseStrategy: row?.responseStrategy || '',
    suggestedChapter: row?.suggestedChapter || '',
    sortNo: row?.sortNo || nextScoreItemSortNo()
  })
  scoreItemDialogVisible.value = true
}

function nextScoreItemSortNo() {
  const items = requirementExtract.value?.scoreItems || []
  const max = items.reduce((num, item) => Math.max(num, Number(item?.sortNo || 0)), 0)
  return max + 1
}

async function onSaveScoreItem() {
  if (!currentSolution.value?.id) return
  if (!String(scoreItemForm.itemName || '').trim() && !String(scoreItemForm.requirementText || '').trim()) {
    ElMessage.warning('评分项名称和评分要求至少填写一项')
    return
  }
  scoreItemSaving.value = true
  try {
    const payload = { ...scoreItemForm }
    requirementExtract.value = normalizeRequirementExtractPayload(scoreItemEditingId.value
      ? await updateRequirementScoreItem(currentSolution.value.id, scoreItemEditingId.value, payload)
      : await createRequirementScoreItem(currentSolution.value.id, payload))
    scoreItemDialogVisible.value = false
    ElMessage.success('评分项已保存')
  } finally {
    scoreItemSaving.value = false
  }
}

async function onDeleteScoreItem(row) {
  if (!currentSolution.value?.id || !row?.id) return
  try {
    await ElMessageBox.confirm('删除后该评分项不会继续参与目录和章节生成，是否继续？', '删除评分项', {
      type: 'warning',
      confirmButtonText: '删除',
      cancelButtonText: '取消'
    })
  } catch {
    return
  }
  requirementExtract.value = normalizeRequirementExtractPayload(await deleteRequirementScoreItem(currentSolution.value.id, row.id))
  ElMessage.success('评分项已删除')
}

function openRequirementItemDialog(row = null) {
  requirementItemEditingId.value = row?.id || ''
  Object.assign(requirementItemForm, {
    requirementType: row?.requirementType || 'TECHNICAL',
    requirementTitle: row?.requirementTitle || '',
    requirementText: row?.requirementText || '',
    mandatory: row?.mandatory === true || row?.mandatory === 1,
    riskLevel: row?.riskLevel || 'LOW',
    suggestedResponse: row?.suggestedResponse || '',
    suggestedChapter: row?.suggestedChapter || '',
    sortNo: row?.sortNo || nextRequirementItemSortNo()
  })
  requirementItemDialogVisible.value = true
}

function nextRequirementItemSortNo() {
  const items = requirementExtract.value?.requirementItems || []
  const max = items.reduce((num, item) => Math.max(num, Number(item?.sortNo || 0)), 0)
  return max + 1
}

async function onSaveRequirementItem() {
  if (!currentSolution.value?.id) return
  if (!String(requirementItemForm.requirementTitle || '').trim() && !String(requirementItemForm.requirementText || '').trim()) {
    ElMessage.warning('要求标题和要求内容至少填写一项')
    return
  }
  requirementItemSaving.value = true
  try {
    const payload = { ...requirementItemForm }
    requirementExtract.value = normalizeRequirementExtractPayload(requirementItemEditingId.value
      ? await updateRequirementItem(currentSolution.value.id, requirementItemEditingId.value, payload)
      : await createRequirementItem(currentSolution.value.id, payload))
    requirementItemDialogVisible.value = false
    ElMessage.success('要求明细已保存')
  } finally {
    requirementItemSaving.value = false
  }
}

async function onDeleteRequirementItem(row) {
  if (!currentSolution.value?.id || !row?.id) return
  try {
    await ElMessageBox.confirm('删除后该要求不会继续参与目录和章节生成，是否继续？', '删除要求明细', {
      type: 'warning',
      confirmButtonText: '删除',
      cancelButtonText: '取消'
    })
  } catch {
    return
  }
  requirementExtract.value = normalizeRequirementExtractPayload(await deleteRequirementItem(currentSolution.value.id, row.id))
  ElMessage.success('要求明细已删除')
}

function warnCreateFormLocked() {
  ElMessage.warning('目录生成中，基础信息已锁定，请等待生成完成后再操作')
}

function exitCreateMode() {
  if (isCreateFormLocked.value) {
    warnCreateFormLocked()
    return
  }
  mode.value = currentSolution.value ? 'detail' : 'home'
}

function setCreateAiLevel(value) {
  if (isCreateFormLocked.value) {
    warnCreateFormLocked()
    return
  }
  createForm.aiLevel = value
}

function onSolutionCardClick(item) {
  if (isCreateFormLocked.value && !isSameId(item?.id, currentSolution.value?.id)) {
    warnCreateFormLocked()
    return
  }
  loadDetail(item.id)
}

async function loadDetail(id) {
  const solutionId = normalizeId(id)
  if (!solutionId) return
  const seq = ++detailRequestSeq.value
  activeSolutionId.value = solutionId
  fullGenerating.value = false
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
  if (data?.id && !activeSolutionId.value) activeSolutionId.value = normalizeId(data.id)
  currentSolution.value = data
  overallWritingRequirement.value = data?.overallWritingRequirement || ''
  fullGenerating.value = !!data?.runningTask && ['WAITING', 'RUNNING'].includes(data.runningTask.status)

  if (data) {
    syncSolutionCard(data)
    syncSelectedSectionAfterDetail(data)
    createForm.solutionMode = data.solutionMode || createForm.solutionMode || 'QUICK'
    createForm.solutionType = data.solutionType || createForm.solutionType || 'SERVICE'
    createForm.solutionSubType = data.solutionSubType || createForm.solutionSubType || '不限'
    createForm.aiLevel = data.aiLevel || createForm.aiLevel || ''
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
  const solutionId = normalizeId(currentSolution.value?.id || task?.solutionId)
  if (task?.id && ['WAITING', 'RUNNING'].includes(task.status)) {
    setCurrentFullGenerating(solutionId, true)
    markSolutionTaskPending(solutionId, task.id)
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
    if (document.hidden) return
    try {
      const data = await getSolution(solutionId)
      if (activeSolutionId.value && String(activeSolutionId.value) !== String(solutionId)) return
      applySolutionDetail(data)
      applyModeByBackendState(data)

      if (outlineGeneratingStatuses.includes(data?.status)) {
        return
      }

      clearInterval(outlineTimer)
      outlineTimer = null
      await loadList()

      if ((Array.isArray(data?.outlines) && data.outlines.length > 0) || outlineFinishedStatuses.includes(data?.status)) {
        previewOutlinesLocal.value = data?.outlines || []
        createStep.value = 3
        mode.value = 'detail'
        const leaves = flattenLeaf(data?.outlines || [])
        const needWordPreset = leaves.length > 0 && leaves.some((node) => !Number(node?.targetWordCount || 0))
        if (needWordPreset) {
          resetWordPresetSelection()
          wordPresetNextAction.value = null
          wordPresetVisible.value = true
          ElMessage.success('目录生成完成，请设置篇幅')
        } else {
          ElMessage.success('目录生成完成')
        }
      } else {
        outlineGenerating.value = false
        ElMessage.error('目录生成失败或超时，请稍后重试')
      }
    } catch (e) {
      // 目录生成期间详情查询可能偶发失败，不能清掉“目录生成中”状态。
      // 后端任务仍可能在继续执行，保留轮询，下一次成功后再刷新页面。
      outlineGenerating.value = true
    }
  }

  tick()
  outlineTimer = setInterval(tick, 5000)
}

function calcCreateStep(solution, task) {
  if (solution?.outlines?.length || outlineFinishedStatuses.includes(solution?.status)) return 3
  if (outlineGeneratingStatuses.includes(solution?.status)) return 2
  if (task?.status === 'SUCCESS') return 2
  if (task?.id) return 1
  return 0
}

async function startCreate(solutionMode = 'QUICK') {
  if (isCreateFormLocked.value) {
    warnCreateFormLocked()
    return
  }
  clearInterval(parseTimer)
  clearInterval(taskTimer)
  clearInterval(outlineTimer)
  clearInterval(requirementExtractTimer)
  parseTimer = null
  taskTimer = null
  outlineTimer = null
  requirementExtractTimer = null

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
  createForm.aiLevel = ''
  createForm.writingStyle = 'GENERAL'
  createForm.solutionName = '新建AI方案'
  outlineForm.outlineMode = 'SCORE_ITEM'
  outlineForm.writingDirection = ''
  outlineForm.knowledgeIds = []

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
      aiLevel: createForm.aiLevel || null,
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
  if (isCreateFormLocked.value) {
    warnCreateFormLocked()
    return
  }
  if (!uploadFile?.raw) return
  if (!requireSelectedAiLevel()) return

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
      aiLevel: createForm.aiLevel || currentSolution.value?.aiLevel || null,
      writingStyle: createForm.writingStyle
    })

    parseTask.value = task
    applySolutionNameFromParse(task)
    await refreshCurrent()
    applySolutionNameFromParse(task)
    mode.value = 'create'
    const status = String(task?.status || '').toUpperCase()
    if (['WAITING', 'PARSING', 'EXTRACTING'].includes(status)) {
      ElMessage.info(task?.message || '解析任务已在排队或执行中，请等待完成')
    }
    pollParseTask(task.id)
  } catch (e) {
    parseLoading.value = false
  }
}

function pollParseTask(taskId) {
  clearInterval(parseTimer)

  const tick = async () => {
    if (document.hidden) return
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
  if (isCreateFormLocked.value) {
    warnCreateFormLocked()
    return
  }
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
    aiLevel: createForm.aiLevel || currentSolution.value?.aiLevel || null,
    writingStyle: createForm.writingStyle
  }
}

async function onGenerateOutline() {
  if (!requireSelectedAiLevel()) return

  if (!currentSolution.value?.id) {
    ElMessage.warning('草稿方案尚未创建完成，请稍后再试')
    return
  }

  // 这里必须先记住用户当前页面上选择的类型和 AI 等级。
  // 原来的逻辑会先 getSolution 再 applySolutionDetail，如果草稿表里还是 SERVICE/BASIC，
  // 就会把用户刚选的“工程-房建工程/旗舰版”覆盖回旧值，导致后面保存需求、生成目录仍按旧类型走。
  const selectedFormBeforeRefresh = {
    solutionType: createForm.solutionType,
    solutionSubType: createForm.solutionSubType,
    aiLevel: createForm.aiLevel || currentSolution.value?.aiLevel || null,
    writingStyle: createForm.writingStyle
  }

  const latest = await getSolution(currentSolution.value.id)
  applySolutionDetail(latest)
  if (selectedFormBeforeRefresh.solutionType) createForm.solutionType = selectedFormBeforeRefresh.solutionType
  if (selectedFormBeforeRefresh.solutionSubType) createForm.solutionSubType = selectedFormBeforeRefresh.solutionSubType
  if (selectedFormBeforeRefresh.aiLevel) createForm.aiLevel = selectedFormBeforeRefresh.aiLevel
  if (selectedFormBeforeRefresh.writingStyle) createForm.writingStyle = selectedFormBeforeRefresh.writingStyle
  applyModeByBackendState(latest)
  resumeOutlineTaskIfNeeded()

  if (outlineGeneratingStatuses.includes(latest?.status)) {
    ElMessage.warning('目录正在生成中，请稍后刷新查看')
    return
  }

  const regenerateOutline = (Array.isArray(latest?.outlines) && latest.outlines.length > 0) || outlineFinishedStatuses.includes(latest?.status)
  if (regenerateOutline) {
    try {
      await ElMessageBox.confirm('当前方案已经生成目录，重新生成会在新目录生成成功后覆盖旧目录及旧章节正文，是否继续？', '重新生成目录确认', {
        type: 'warning',
        confirmButtonText: '重新生成',
        cancelButtonText: '取消'
      })
    } catch {
      return
    }
  }

  if (!regenerateOutline) {
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
    const generateCheck = await getSolutionGenerateCheck(solutionId)
    if (generateCheck && generateCheck.canGenerateOutline === false) {
      await ElMessageBox.alert(formatGenerateCheckIssues(generateCheck), '生成前检查未通过', { type: 'warning' })
      return
    }
    const writingDirection = (outlineForm.writingDirection || '').trim()
    if (writingDirection) {
      await saveOverallWritingRequirement(solutionId, writingDirection)
    }
    const selectedOutlineKbIds = parseKnowledgeIds(outlineForm.knowledgeIds)
    const data = await generateOutline(solutionId, {
      outlineMode: outlineForm.outlineMode,
      writingStyle: createForm.writingStyle,
      extraRequirement: requirementForm.outlineRequirement,
      outlineRequirement: requirementForm.outlineRequirement,
      writingDirection,
      knowledgeIds: stringifyKnowledgeIds(selectedOutlineKbIds),
      regenerate: regenerateOutline
    })

    if (selectedOutlineKbIds.length && Array.isArray(data?.outlines)) {
      data.outlines = applyKnowledgeIdsToOutlineTree(data.outlines, selectedOutlineKbIds)
    }
    applySolutionDetail(data)
    previewOutlinesLocal.value = data?.outlines || []
    if (outlineGeneratingStatuses.includes(data?.status)) {
      createStep.value = Math.max(createStep.value, 2)
      mode.value = 'create'
      pollOutlineStatus(solutionId)
      ElMessage.success('目录生成已开始，完成后会自动刷新')
      return
    }
    createStep.value = 3
    mode.value = 'detail'
    clearInterval(outlineTimer)
    outlineTimer = null

    await loadList()

    resetWordPresetSelection()
    wordPresetNextAction.value = null
    wordPresetVisible.value = true
    ElMessage.success('目录生成完成，请设置篇幅')
  } finally {
    outlineGenerating.value = false
  }
}

function formatGenerateCheckIssues(data = {}) {
  const failed = Array.isArray(data.items) ? data.items.filter((item) => !item.passed) : []
  const lines = failed.map((item) => `【${item.name || item.key}】${item.message || '未通过'}`)
  const warnings = Array.isArray(data.warnings) ? data.warnings : []
  const suggestions = Array.isArray(data.suggestions) ? data.suggestions : []
  return [
    `准备度：${data.percent || 0}%`,
    ...lines,
    ...warnings.map((item) => `提醒：${item}`),
    ...suggestions.map((item) => `建议：${item}`)
  ].filter(Boolean).join('\n') || '当前资料未达到生成条件，请先补充必填信息。'
}

function resetWordPresetSelection() {
  wordPreset.mode = ''
  wordPreset.wordCount = null
}

function solutionNeedsWordPreset(solution = currentSolution.value) {
  const leaves = flattenLeaf(solution?.outlines || [])
  return leaves.length > 0 && leaves.some((node) => Number(node?.targetWordCount || 0) <= 0)
}

function openWordPresetDialog(nextAction = null) {
  resetWordPresetSelection()
  wordPresetNextAction.value = nextAction
  wordPresetVisible.value = true
}

function setPreset(modeValue, wordCount) {
  wordPreset.mode = modeValue
  wordPreset.wordCount = wordCount
}

async function onApplyWordPreset() {
  if (!currentSolution.value?.id) return
  if (!wordPresetSelectionValid.value) {
    ElMessage.warning('请先选择章节字数')
    return
  }
  wordPresetSaving.value = true
  try {
    const data = await applyWordCountPreset(currentSolution.value.id, wordPreset)
    currentSolution.value = data
    wordPresetVisible.value = false
    createStep.value = 4
    mode.value = 'detail'
    const nextAction = wordPresetNextAction.value
    wordPresetNextAction.value = null
    await loadList()
    if (nextAction) {
      ElMessage.success('字数已保存，请确认生成设置')
      await openFullGenerateDialog(nextAction)
    } else {
      ElMessage.success('字数已保存')
    }
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
  const solutionId = normalizeId(expectedSolutionId)
  if (!solutionId) return
  const data = await getSolution(solutionId)
  if (activeSolutionId.value && String(activeSolutionId.value) !== String(solutionId)) return
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

function normalizeId(id) {
  const text = String(id ?? '').trim()
  if (!text || text === 'null' || text === 'undefined' || text === 'NaN') return ''
  return text
}

function isSameId(a, b) {
  const left = normalizeId(a)
  const right = normalizeId(b)
  return !!left && !!right && left === right
}

function isActiveSolution(solutionId) {
  return isSameId(activeSolutionId.value || currentSolution.value?.id, solutionId)
}

function clonePlain(value) {
  if (!value) return null
  try {
    return JSON.parse(JSON.stringify(value))
  } catch (e) {
    return value
  }
}

function setCurrentFullGenerating(solutionId, generating) {
  if (isActiveSolution(solutionId)) {
    fullGenerating.value = !!generating
  }
}

function uniqueIds(ids = []) {
  return [...new Set((Array.isArray(ids) ? ids : []).map((id) => normalizeId(id)).filter(Boolean))]
}

function parseKnowledgeIds(value) {
  if (Array.isArray(value)) return uniqueIds(value)
  if (value === undefined || value === null || value === '') return []

  const text = String(value).trim()
  if (!text) return []

  // 后端会把章节知识库保存为 JSON 字符串，例如：["uuid"]。
  // ID 已统一为 UUID，不能再转 Number，否则会被转成 NaN 导致详情/知识库丢失。
  if (text.startsWith('[')) {
    try {
      const arr = JSON.parse(text)
      if (Array.isArray(arr)) return uniqueIds(arr)
    } catch (e) {
      // 解析失败时继续按逗号字符串兜底。
    }
  }

  return uniqueIds(text.replace(/[\[\]"']/g, '').split(/[,，;；\s]+/))
}

function stringifyKnowledgeIds(ids = []) {
  return uniqueIds(ids).join(',')
}

function buildSelectedKnowledgeBases(ids = []) {
  const idList = parseKnowledgeIds(ids)
  const map = new Map()
  selectedKnowledgeBaseCache.value.forEach((item) => map.set(normalizeId(item.id), item))
  knowledgeBaseList.value.forEach((item) => map.set(normalizeId(item.id), item))
  return idList.map((id) => map.get(normalizeId(id)) || { id, kbName: `知识库#${id}` }).filter(Boolean)
}

function collectSolutionKnowledgeIds(solution = currentSolution.value) {
  const ids = []
  ids.push(...parseKnowledgeIds(solution?.knowledgeIds || solution?.knowledgeIdList || ''))
  ids.push(...parseKnowledgeIds(outlineForm.knowledgeIds))
  ids.push(...parseKnowledgeIds(fullGenerateForm.knowledgeIds))
  const walk = (nodes = []) => {
    nodes.forEach((node) => {
      ids.push(...parseKnowledgeIds(node.knowledgeIds))
      if (node.children?.length) walk(node.children)
    })
  }
  walk(solution?.outlines || [])
  return uniqueIds(ids)
}

function applyKnowledgeIdsToOutlineTree(nodes = [], ids = []) {
  const text = stringifyKnowledgeIds(ids)
  if (!text) return nodes
  const walk = (items = []) => items.map((node) => {
    const next = { ...node }
    if (!next.knowledgeIds) next.knowledgeIds = text
    if (Array.isArray(next.children) && next.children.length) next.children = walk(next.children)
    return next
  })
  return walk(nodes)
}

function getCurrentKnowledgeIdsByTarget(target = knowledgeSelectorTarget.value) {
  if (target === 'section') return parseKnowledgeIds(sectionForm.knowledgeIds)
  if (target === 'outline') return parseKnowledgeIds(outlineForm.knowledgeIds)
  return parseKnowledgeIds(fullGenerateForm.knowledgeIds)
}

function setCurrentKnowledgeIdsByTarget(ids = [], target = knowledgeSelectorTarget.value) {
  const normalized = uniqueIds(ids)
  if (target === 'section') {
    sectionForm.knowledgeIds = stringifyKnowledgeIds(normalized)
  } else if (target === 'outline') {
    outlineForm.knowledgeIds = normalized
  } else {
    fullGenerateForm.knowledgeIds = normalized
  }
}

function goKnowledgeBasePage() {
  if (isCreateFormLocked.value && mode.value === 'create') {
    warnCreateFormLocked()
    return
  }
  fullGenerateSettingVisible.value = false
  sectionDialogVisible.value = false
  knowledgeSelectorVisible.value = false
  router.push('/knowledge/bases')
}

async function openKnowledgeSelector(target = 'full') {
  if (target === 'outline' && isCreateFormLocked.value) {
    warnCreateFormLocked()
    return
  }
  knowledgeSelectorTarget.value = target
  tempSelectedKnowledgeIds.value = getCurrentKnowledgeIdsByTarget(target)
  knowledgeSelectorVisible.value = true
  await loadKnowledgeBases()
}

async function loadKnowledgeBases() {
  knowledgeLoading.value = true
  try {
    const list = await listKnowledgeBases({
      pageNum: 1,
      pageSize: 20,
      keyword: knowledgeKeyword.value?.trim() || undefined,
      status: 1
    })
    knowledgeBaseList.value = Array.isArray(list) ? list : []
  } finally {
    knowledgeLoading.value = false
  }
}

function confirmKnowledgeSelection() {
  if (isKnowledgeSelectorLocked.value) {
    warnCreateFormLocked()
    return
  }
  const ids = uniqueIds(tempSelectedKnowledgeIds.value || [])
  setCurrentKnowledgeIdsByTarget(ids)

  const cacheMap = new Map()
  selectedKnowledgeBaseCache.value.forEach((item) => cacheMap.set(normalizeId(item.id), item))
  knowledgeBaseList.value.forEach((item) => {
    const itemId = normalizeId(item.id)
    if (ids.includes(itemId)) {
      cacheMap.set(itemId, item)
    }
  })
  selectedKnowledgeBaseCache.value = uniqueIds([
    ...parseKnowledgeIds(fullGenerateForm.knowledgeIds),
    ...parseKnowledgeIds(outlineForm.knowledgeIds),
    ...parseKnowledgeIds(sectionForm.knowledgeIds)
  ]).map((id) => cacheMap.get(normalizeId(id))).filter(Boolean)

  knowledgeSelectorVisible.value = false
}

function removeSelectedKnowledgeBase(id, target = 'full') {
  if (target === 'outline' && isCreateFormLocked.value) {
    warnCreateFormLocked()
    return
  }
  const removeId = normalizeId(id)
  const next = getCurrentKnowledgeIdsByTarget(target).filter((item) => normalizeId(item) !== removeId)
  setCurrentKnowledgeIdsByTarget(next, target)
  tempSelectedKnowledgeIds.value = tempSelectedKnowledgeIds.value.filter((item) => normalizeId(item) !== removeId)
  selectedKnowledgeBaseCache.value = selectedKnowledgeBaseCache.value.filter((item) => normalizeId(item.id) !== removeId)
}


function handleFullGenerateBlindChange(enabled) {
  if (enabled) {
    if (!String(fullGenerateForm.blindBidRequirement || '').trim()) {
      fullGenerateForm.blindBidRequirement = DEFAULT_BLIND_BID_REQUIREMENT
    }
  } else {
    fullGenerateForm.blindBidRequirement = ''
  }
}

function resetFullGenerateBlindSetting() {
  fullGenerateForm.blindBidEnabled = false
  fullGenerateForm.blindBidRequirement = ''
}

function fullGeneratePreferenceText() {
  const lines = []
  const depth = String(fullGenerateForm.contentDepth || 'STANDARD').toUpperCase()

  if (depth === 'BRIEF') {
    lines.push('内容深度：简洁版，表达聚焦、避免冗长铺陈，但关键响应点不能缺失。')
  } else if (depth === 'DETAILED') {
    lines.push('内容深度：详细版，充分展开实施路径、方法步骤、保障措施、交付成果和风险控制。')
  } else {
    lines.push('内容深度：标准版，兼顾专业性、可读性和落地性。')
  }

  if (fullGenerateForm.blindBidEnabled) {
    lines.push('暗标要求：全文不得出现投标单位名称、人员姓名、具体企业标识、联系方式等可能暴露身份的信息。')

    if (String(fullGenerateForm.blindBidRequirement || '').trim()) {
      lines.push(`暗标补充要求：${String(fullGenerateForm.blindBidRequirement || '').trim()}`)
    }
  }

  return lines.filter(Boolean).join('\n')
}

function mergePreferenceIntoRequirement(oldText, preferenceText) {
  const marker = '【本次全文生成偏好】'
  const original = String(oldText || '').split(marker)[0].trim()

  if (!preferenceText) {
    return original
  }

  return `${original ? original + '\n\n' : ''}${marker}\n${preferenceText}`
}

async function applySolutionFullGeneratePreferences(solutionSnapshot = currentSolution.value) {
  const preferenceText = fullGeneratePreferenceText()
  const solutionId = normalizeId(solutionSnapshot?.id)

  if (!preferenceText || !solutionSnapshot?.outlines?.length || !solutionId) {
    return
  }

  const leaves = flattenLeaf(solutionSnapshot.outlines).filter((node) => node?.id)
  let changed = false

  for (const node of leaves) {
    const currentRequirement = node.writingRequirement || node.section?.writingRequirement || ''
    const nextRequirement = mergePreferenceIntoRequirement(currentRequirement, preferenceText)
    const nextStyle = fullGenerateForm.writingStyle || node.writingStyle || 'GENERAL'

    if (
      String(currentRequirement || '').trim() === String(nextRequirement || '').trim()
      && String(node.writingStyle || 'GENERAL') === String(nextStyle || 'GENERAL')
    ) {
      continue
    }

    await updateWritingConfig(node.id, {
      title: node.title,
      writingDirection: node.writingDirection || '',
      writingRequirement: nextRequirement,
      writingStyle: nextStyle,
      chartLevel: 'NONE',
      tableLevel: 'NONE',
      imageLevel: 'NONE',
      knowledgeIds: node.knowledgeIds || '',
      fileResourceIds: node.fileResourceIds || ''
    })
    changed = true
  }

  // 只刷新打开弹窗时绑定的方案；如果用户已经切到其他方案，不能把当前方案状态覆盖掉。
  if (changed && isActiveSolution(solutionId)) {
    await refreshCurrent(solutionId)
  }
}


async function openFullGenerateDialog(action = 'GENERATE') {
  if (!createForm.aiLevel && !currentSolution.value?.aiLevel) {
    ElMessage.warning('请先选择AI等级')
    return
  }
  await loadGlobalRunningTask()
  if (hasOtherSolutionRunningTask.value) {
    ElMessage.warning(otherSolutionRunningMessage.value)
    return
  }
  if (!currentSolution.value?.outlines?.length) {
    ElMessage.warning('请先生成目录')
    return
  }

  if (action !== 'REWRITE' && solutionNeedsWordPreset(currentSolution.value)) {
    openWordPresetDialog(action)
    ElMessage.warning('请先设置每个末级章节的目标字数')
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
  fullGenerateTargetSolutionId.value = normalizeId(currentSolution.value?.id)
  fullGenerateTargetSolutionSnapshot.value = clonePlain(currentSolution.value)
  resetFullGenerateBlindSetting()
  fullGenerateForm.writingStyle = currentSolution.value?.writingStyle || createForm.writingStyle || 'GENERAL'
  fullGenerateForm.contentDepth = 'STANDARD'
  fullGenerateForm.knowledgeIds = collectSolutionKnowledgeIds(currentSolution.value)
  fullGenerateForm.chartLevel = 'NONE'
  fullGenerateForm.tableLevel = 'NONE'
  fullGenerateForm.imageLevel = 'NONE'
  fullGenerateForm.autoImageLevel = 'NONE'
  fullGenerateSettingVisible.value = true
}

async function confirmFullGenerate() {
  const targetSolutionId = normalizeId(fullGenerateTargetSolutionId.value || currentSolution.value?.id)
  if (!targetSolutionId) {
    ElMessage.warning('未找到要生成的方案，请重新选择方案后再生成')
    return
  }

  if (fullGenerateAction.value === 'REWRITE') {
    await ElMessageBox.confirm('系统会先自动保存当前版本，再基于当前目录重编全文。新内容生成成功后会覆盖当前章节正文，失败时可从历史版本恢复。是否开始？', '确认重编全文', { type: 'warning', confirmButtonText: '开始重编', cancelButtonText: '取消' })
  }

  fullGenerateSettingVisible.value = false
  await startFullGenerate(fullGenerateAction.value === 'REWRITE', targetSolutionId, fullGenerateTargetSolutionSnapshot.value)
}

async function startFullGenerate(rewrite = false, targetSolutionId = currentSolution.value?.id, solutionSnapshot = currentSolution.value) {
  await loadGlobalRunningTask()
  const solutionId = normalizeId(targetSolutionId)
  if (!solutionId) {
    ElMessage.warning('未找到要生成的方案，请重新选择方案后再生成')
    return
  }

  const generateCheck = await getSolutionGenerateCheck(solutionId)
  if (generateCheck && generateCheck.canGenerateFull === false) {
    await ElMessageBox.alert(formatGenerateCheckIssues(generateCheck), '生成前检查未通过', { type: 'warning' })
    return
  }

  setCurrentFullGenerating(solutionId, true)
  try {
    await applySolutionFullGeneratePreferences(solutionSnapshot || currentSolution.value)

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
      ? await rewriteFull(solutionId, payload)
      : await generateFull(solutionId, payload)

    if (task?.id) {
      globalRunningTask.value = task
      markSolutionTaskPending(solutionId, task.id)
      pollGenerationTask(task.id, false)
    }

    if (isActiveSolution(solutionId)) {
      await refreshCurrent(solutionId)
    } else {
      await loadList()
    }
  } catch (e) {
    setCurrentFullGenerating(solutionId, false)
  } finally {
    fullGenerateTargetSolutionId.value = ''
    fullGenerateTargetSolutionSnapshot.value = null
  }
}


function markSolutionTaskPending(solutionId, taskId) {
  if (!solutionId || !taskId) return
  solutionTaskPending.solutionId = String(solutionId)
  solutionTaskPending.taskId = String(taskId)
  solutionTaskPollErrorCount.value = 0
  solutionTaskPollTick.value = 0
  localStorage.setItem(SOLUTION_TASK_PENDING_KEY, JSON.stringify({ solutionId: String(solutionId), taskId: String(taskId) }))
  startSolutionTaskPolling(taskId)
}

function clearSolutionTaskPending(taskId) {
  if (String(solutionTaskPending.taskId || '') === String(taskId || '')) {
    solutionTaskPending.solutionId = ''
    solutionTaskPending.taskId = ''
    localStorage.removeItem(SOLUTION_TASK_PENDING_KEY)
  }
  clearInterval(taskTimer)
  taskTimer = null
}

function restoreSolutionTaskPending() {
  const raw = localStorage.getItem(SOLUTION_TASK_PENDING_KEY)
  if (!raw) return
  try {
    const data = JSON.parse(raw)
    if (data?.taskId) {
      const solutionId = normalizeId(data.solutionId || '')
      solutionTaskPending.solutionId = solutionId
      solutionTaskPending.taskId = String(data.taskId)
      solutionTaskPollErrorCount.value = 0
      solutionTaskPollTick.value = 0
      setCurrentFullGenerating(solutionId, true)
      startSolutionTaskPolling(data.taskId)
    }
  } catch (e) {
    localStorage.removeItem(SOLUTION_TASK_PENDING_KEY)
  }
}

function startSolutionTaskPolling(taskId) {
  clearInterval(taskTimer)
  pollGenerationTask(taskId, true)
  taskTimer = setInterval(() => {
    pollGenerationTask(taskId, true)
  }, 5000)
}

async function pollGenerationTask(taskId, silent = true) {
  if (!taskId || solutionTaskPollingBusy.value) return
  if (document.hidden) return
  solutionTaskPollingBusy.value = true
  try {
    const task = await getGenerationTask(taskId)
    globalRunningTask.value = ['WAITING', 'RUNNING'].includes(String(task?.status || '').toUpperCase()) ? task : null
    solutionTaskPollErrorCount.value = 0
    const status = String(task?.status || '').toUpperCase()
    const taskSolutionId = task?.solutionId || solutionTaskPending.solutionId

    if (['WAITING', 'RUNNING'].includes(status)) {
      setCurrentFullGenerating(taskSolutionId, true)
      solutionTaskPollTick.value += 1
      if (isActiveSolution(taskSolutionId)) {
        await refreshCurrent(taskSolutionId)
      }
      if (solutionTaskPollTick.value % 4 === 0) {
        await loadList()
      }
      return
    }

    clearSolutionTaskPending(taskId)
    setCurrentFullGenerating(taskSolutionId, false)

    // 后端任务刚落 SUCCESS 时，方案状态和统计可能还在最后一次事务刷新中。
    // 等一小会儿再重新拉详情和列表，避免页面仍显示旧状态。
    await sleep(600)
    if (isActiveSolution(taskSolutionId)) {
      await refreshCurrent(taskSolutionId)
    }
    await loadList()

    if (!silent && !notifiedTaskIds.has(task.id)) {
      notifiedTaskIds.add(task.id)
      if (status === 'FAILED') {
        ElMessage.error('生成失败，请稍后重试')
      } else if (status === 'CANCELED') {
        ElMessage.warning(task.message || '生成已取消')
      } else if (status === 'PARTIAL') {
        ElMessage.warning('部分章节未生成完成，请重试未完成章节')
      } else {
        ElMessage.success(task.message || '生成完成')
      }
    }
  } catch (e) {
    // 生成任务查询偶发超时/失败时，不能清掉“生成中”状态。
    // 后端异步任务仍可能在继续执行，保留 localStorage 任务记录并继续轮询。
    const status = e?.response?.status
    solutionTaskPollErrorCount.value += 1
    setCurrentFullGenerating(solutionTaskPending.solutionId, true)
    if (status === 404) {
      clearSolutionTaskPending(taskId)
      setCurrentFullGenerating(solutionTaskPending.solutionId, false)
      return
    }
    if (!silent && solutionTaskPollErrorCount.value === 1) {
      ElMessage.warning('生成任务仍在后台执行，状态查询暂时失败，系统会继续自动刷新')
    }
  } finally {
    solutionTaskPollingBusy.value = false
  }
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
  if (!canCopySectionContent.value) {
    ElMessage.warning(currentSolution.value?.runningMessage || '当前方案正在生成中，完成后再复制正文')
    return
  }
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

const SECTION_OPTIMIZE_REQUIREMENT_MARKER = '【本次单章处理要求】'

function sectionStoredWritingRequirement(node) {
  return String(node?.writingRequirement || node?.section?.writingRequirement || '').split(SECTION_OPTIMIZE_REQUIREMENT_MARKER)[0].trim()
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

function sectionOptimizeWritingRequirement(type, node, content, targetWordCount) {
  const storedRequirement = sectionStoredWritingRequirement(node)
  const optimizeInstruction = sectionOptimizeInstruction(type, node?.title, content, targetWordCount)
  return `${storedRequirement ? storedRequirement + '\n\n' : ''}${SECTION_OPTIMIZE_REQUIREMENT_MARKER}\n${optimizeInstruction}`
}

function maxAcceptableFrontendWords(targetWordCount) {
  const target = Math.max(1, Number(targetWordCount || 0))
  return target < 500 ? target + 80 : Math.round(target * 1.15)
}

function openShortenDialog() {
  if (!canOptimizeSectionContent.value || !selectedSection.value?.id) return
  const node = selectedSection.value
  const suggested = Number(node?.targetWordCount || node?.wordCount || node?.section?.targetWordCount || 300)
  const target = suggested > 0 ? suggested : 300
  shortenTargetMode.value = shortenPresetOptions.includes(target) ? String(target) : 'CUSTOM'
  shortenCustomWordCount.value = target
  shortenDialogVisible.value = true
}

async function confirmShortenSection() {
  const target = shortenTargetMode.value === 'CUSTOM' ? Number(shortenCustomWordCount.value) : Number(shortenTargetMode.value)
  if (!target || target <= 0) {
    ElMessage.warning('请输入有效目标字数')
    return
  }
  shortenDialogVisible.value = false
  await optimizeSection('SHRINK', target)
}

async function optimizeSection(type = 'POLISH', customTargetWordCount = null) {
  await loadGlobalRunningTask()
  if (hasOtherSolutionRunningTask.value) {
    ElMessage.warning(otherSolutionRunningMessage.value)
    return
  }
  if (!canOptimizeSectionContent.value || !selectedSection.value?.id) return
  const node = selectedSection.value
  const content = String(selectedSectionContent.value || '').trim()
  if (!content) {
    ElMessage.warning('当前章节暂无正文')
    return
  }
  const targetWordCount = Number(customTargetWordCount || 0) > 0
    ? Number(customTargetWordCount)
    : sectionOptimizeTargetWordCount(type, node, content)
  const label = optimizeActionLabel(type)
  sectionOptimizing.value = type
  sectionOptimizingNodeId.value = String(node.id || '')
  sectionStreamingText.value = ''
  sectionContentEditMode.value = false
  try {
    await streamSection(node.id, {
      title: node.title,
      targetWordCount,
      action: type === 'SHRINK' ? 'SHORTEN' : type,
      sourceContent: content,
      maxRewriteAttempts: type === 'SHRINK' ? 3 : undefined,
      chartLevel: 'NONE',
      tableLevel: 'NONE',
      imageLevel: 'NONE',
      knowledgeIds: node.knowledgeIds || sectionForm.knowledgeIds || '',
      fileResourceIds: node.fileResourceIds || '',
      writingDirection: node.writingDirection || '',
      writingRequirement: sectionOptimizeWritingRequirement(type, node, content, targetWordCount),
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
    const latestActual = outlineActualWordCount(selectedSection.value) || countTextWords(selectedSection.value?.section?.content || '')
    if (type === 'SHRINK' && latestActual > maxAcceptableFrontendWords(targetWordCount)) {
      ElMessage.warning(`缩写完成，已尽量压缩，当前 ${latestActual} 字，仍略超目标 ${targetWordCount} 字`)
    } else {
      ElMessage.success(`${label}完成`)
    }
  } finally {
    sectionOptimizing.value = ''
    sectionOptimizingNodeId.value = ''
    sectionStreamingText.value = ''
  }
}

async function openSectionDialog(node) {
  await loadGlobalRunningTask()
  if (hasOtherSolutionRunningTask.value) {
    ElMessage.warning(otherSolutionRunningMessage.value)
    return
  }
  if (isSolutionBusy.value) {
    ElMessage.warning(currentSolution.value?.runningMessage || '当前方案正在生成中，完成后再单独操作章节')
    return
  }
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
  await loadGlobalRunningTask()
  if (!sectionNode.value?.id) return
  if (hasOtherSolutionRunningTask.value) {
    ElMessage.warning(otherSolutionRunningMessage.value)
    return
  }
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
        ElMessage.error('生成失败，请稍后重试')
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
  solutions.value = solutions.value.filter((solution) => String(solution.id || '') !== String(item.id || ''))
  if (String(currentSolution.value?.id || '') === String(item.id || '')) {
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
  const fileName = file?.originalName || fallbackName || '导出文件.docx'
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

async function chooseSolutionExportOptions() {
  return await openWordExportDialog({
    format: 'word',
    styleCode: 'BID_OFFICIAL',
    showFormat: true
  })
}

async function onExport() {
  if (exportLoading.value) {
    return
  }

  if (!canExport.value) {
    ElMessage.warning(isSolutionBusy.value ? '当前方案正在生成，完成后再导出' : '暂无可导出的正文')
    return
  }

  if (!currentSolution.value?.id) {
    ElMessage.warning('请先选择要导出的方案')
    return
  }

  const confirmed = await confirmSolutionExportBeforeDownload()
  if (!confirmed) return

  const exportOptions = await chooseSolutionExportOptions()
  if (!exportOptions) return

  const format = exportOptions.format
  const request = {
    styleCode: exportOptions.styleCode,
    generateCatalog: true,
    beautifyTable: true,
    keepBold: true,
    pageNumber: true
  }
  const solutionId = currentSolution.value.id
  const solutionName = currentSolution.value?.solutionName || 'AI方案'

  exportLoading.value = true
  try {
    const started = await startSolutionExportTask(solutionId, format, request)
    const task = await waitSolutionExportTask(started?.id)
    await refreshCurrent(solutionId)
    await loadList()

    if (!task?.fileId) {
      ElMessage.warning('导出成功，但未返回文件ID，请到下载中心查看')
      return
    }

    const blob = await downloadFileResource(task.fileId)
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = task.originalName || `${solutionName}-导出.${format === 'pdf' ? 'pdf' : 'docx'}`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.URL.revokeObjectURL(url)
    notifySolutionExportSuccess({ id: task.fileId, originalName: task.originalName }, a.download)
  } finally {
    exportLoading.value = false
  }
}

async function waitSolutionExportTask(exportId) {
  if (!exportId) throw new Error('导出任务创建失败，请稍后重试')
  for (let i = 0; i < 180; i += 1) {
    const task = await getSolutionExportTask(exportId)
    const status = String(task?.status || '').toLowerCase()
    if (status === 'success') return task
    if (status === 'failed') throw new Error(task?.errorMsg || '导出失败，请稍后重试')
    await sleep(i < 6 ? 2000 : 5000)
  }
  throw new Error('导出任务仍在执行，请稍后到下载中心查看')
}


function syncSolutionCard(data) {
  if (!data?.id) return
  const index = solutions.value.findIndex((item) => String(item.id || '') === String(data.id || ''))
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
  if (selectedSection.value?.id && String(selectedSectionSolutionId.value || '') === String(data.id || '')) {
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
    if (String(node.id || '') === String(id || '')) return node
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
  const status = String(node.contentStatus || '').toUpperCase()
  // 重编全文时必须优先看目录节点的当前状态，不能被旧正文 SUCCESS 误判为已完成。
  if (['GENERATING', 'LOCKED', 'STALE', 'FAILED'].includes(status)) return false
  const sectionOk = node.section?.generateStatus === 'SUCCESS' && !!String(node.section?.content || '').trim()
  return status === 'SUCCESS' || sectionOk
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
  const status = String(node?.contentStatus || node?.section?.generateStatus || '').toUpperCase()
  if (isRewriteRunning.value) {
    if (status === 'GENERATING' || status === 'LOCKED') return '重编中'
    if (status === 'SUCCESS') return '已重编'
    if (status === 'FAILED') return '失败'
    return '待重编'
  }
  if (isOutlineGenerated(node)) return '已完成'
  if (status === 'GENERATING' || status === 'LOCKED') return '生成中'
  if (status === 'FAILED') return '失败'
  if (status === 'STALE') return '待重编'
  return '未生成'
}

function sectionStatusType(node) {
  if (isSectionOptimizing(node)) return 'warning'
  const status = String(node?.contentStatus || node?.section?.generateStatus || '').toUpperCase()
  if (isRewriteRunning.value) {
    if (status === 'SUCCESS') return 'success'
    if (status === 'FAILED') return 'danger'
    return 'warning'
  }
  if (isOutlineGenerated(node)) return 'success'
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
    warnings.push('当前方案还没有生成目录，导出的文件可能为空。')
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
  let serverCheck = null
  if (currentSolution.value?.id) {
    try {
      serverCheck = await getSolutionExportCheck(currentSolution.value.id)
    } catch (e) {
      warnings.push('服务端导出前检查暂不可用，建议稍后重试或确认正文完整后再导出。')
    }
  }
  const errors = serverCheck?.errors || []
  const serverWarnings = serverCheck?.warnings || []
  const suggestions = serverCheck?.suggestions || []
  const allWarnings = [...new Set([...warnings, ...serverWarnings])]
  if (serverCheck && serverCheck.canExport === false) {
    await ElMessageBox.alert(
      h('div', { class: 'solution-export-check-message' }, [
        h('p', { class: 'solution-export-check-title' }, `导出前检查未通过（完成度 ${serverCheck.percent || 0}%）`),
        h('ul', { class: 'solution-export-check-list' }, (errors.length ? errors : (serverWarnings.length ? serverWarnings : allWarnings)).map((item, index) => h('li', { key: index }, item))),
        suggestions.length ? h('p', { class: 'solution-export-check-tip' }, suggestions.join('；')) : null
      ]),
      '导出前检查',
      { type: 'warning', confirmButtonText: '返回处理' }
    )
    return false
  }
  if (!allWarnings.length) return true
  try {
    await ElMessageBox.confirm(
      h('div', { class: 'solution-export-check-message' }, [
        h('p', { class: 'solution-export-check-title' }, serverCheck ? `导出前检查发现以下问题（完成度 ${serverCheck.percent || 0}%）` : '导出前检查发现以下问题：'),
        h('ul', { class: 'solution-export-check-list' }, allWarnings.map((item, index) => h('li', { key: index }, item))),
        h('p', { class: 'solution-export-check-tip' }, suggestions.length ? suggestions.join('；') : '可以返回处理后再导出，也可以继续导出当前版本。')
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


function parseVersionSnapshot(snapshotJson) {
  if (!snapshotJson) return { sections: [], outlines: [] }
  try {
    const snapshot = typeof snapshotJson === 'string' ? JSON.parse(snapshotJson) : snapshotJson
    return {
      ...snapshot,
      outlines: Array.isArray(snapshot.outlines) ? snapshot.outlines : [],
      sections: Array.isArray(snapshot.sections) ? snapshot.sections : []
    }
  } catch (e) {
    return { sections: [], outlines: [] }
  }
}

async function openVersionDialog() {
  if (!currentSolution.value?.id) return
  versionDialogVisible.value = true
  versionLoading.value = true
  selectedVersion.value = null
  try {
    versionList.value = await listSolutionVersions(currentSolution.value.id)
    if (versionList.value.length) {
      await selectVersion(versionList.value[0])
    }
  } finally {
    versionLoading.value = false
  }
}

async function selectVersion(item) {
  if (!item?.id) return
  selectedVersion.value = item
  if (!item.snapshotJson) {
    const detail = await getSolutionVersion(item.id)
    const index = versionList.value.findIndex((v) => String(v.id || '') === String(item.id || ''))
    if (index >= 0) versionList.value[index] = { ...versionList.value[index], ...detail }
    selectedVersion.value = { ...item, ...detail }
  }
}


function currentSectionWordCount(outlineId) {
  if (!outlineId) return 0
  const node = findOutlineNodeById(currentSolution.value?.outlines || [], outlineId)
  return outlineActualWordCount(node) || countTextWords(node?.section?.content || '')
}

async function onRestoreVersion(item) {
  if (!currentSolution.value?.id || !item?.id) return
  try {
    await ElMessageBox.confirm(
      `确认恢复到 V${item.versionNo}？系统会先自动保存当前内容快照，然后用该版本覆盖当前章节正文。`,
      '恢复历史版本',
      {
        type: 'warning',
        confirmButtonText: '恢复版本',
        cancelButtonText: '取消'
      }
    )
    versionRestoring.value = true
    const data = await restoreSolutionVersion(currentSolution.value.id, item.id)
    applySolutionDetail(data)
    versionDialogVisible.value = false
    ElMessage.success('历史版本已恢复')
    await loadList()
  } catch (e) {
    if (e !== 'cancel') {
      // 业务错误由 request 拦截器统一提示，这里只兜底。
    }
  } finally {
    versionRestoring.value = false
  }
}


async function onRestoreVersionSection(section) {
  if (!currentSolution.value?.id || !selectedVersion.value?.id || !section?.outlineId) return
  try {
    await ElMessageBox.confirm(
      `确认只恢复“${section.title || '当前章节'}”？系统会先保存当前内容快照，然后用历史版本覆盖该章节正文。`,
      '恢复单章节',
      {
        type: 'warning',
        confirmButtonText: '恢复本章',
        cancelButtonText: '取消'
      }
    )
    versionRestoring.value = true
    const data = await restoreSolutionVersionSection(currentSolution.value.id, selectedVersion.value.id, section.outlineId)
    applySolutionDetail(data)
    ElMessage.success('章节已恢复')
    await loadList()
  } catch (e) {
    if (e !== 'cancel') {
      // request 拦截器会统一提示具体业务错误。
    }
  } finally {
    versionRestoring.value = false
  }
}

function formatDateTime(value) {
  if (!value) return ''
  return String(value).replace('T', ' ').slice(0, 19)
}

function levelLabel(value) {
  return { BASIC: '基础', STANDARD: '标准', FLAGSHIP: '旗舰' }[value] || '未选择'
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
  if (item?.id && String(currentSolution.value?.id || '') === String(item.id || '')) {
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
      const bindingTag = !hasChildren && node.structuredBindingFlag
        ? h(ElTooltip, { content: node.structuredBindingSummary || '已绑定结构化评分项/要求', placement: 'top', 'show-after': 200 }, {
          default: () => h(ElTag, { size: 'small', type: 'success', effect: 'light', class: 'binding-tag' }, () => `绑定 ${node.structuredScoreItemCount || 0}评/${node.structuredRequirementItemCount || 0}求`)
        })
        : null
      const title = h('span', { class: ['tree-title-wrap', hasChildren ? 'parent' : 'leaf'] }, [
        h('span', { class: ['tree-title', hasChildren ? 'parent' : 'leaf'] }, node.title),
        bindingTag
      ])
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
        const operationDisabled = isSolutionBusy.value
        const generated = isOutlineGenerated(node)
        const failed = isOutlineFailed(node)
        const optimizing = isSectionOptimizing(node)
        controls.push(h('span', { class: ['count-text', failed ? 'failed' : '', wordHealthClass(node)] }, `${outlineActualWordCount(node)} / ${outlineTargetWordCount(node)}字`))
        if (optimizing) {
          controls.push(h(ElTag, { size: 'small', type: 'warning', effect: 'light' }, () => `${optimizeActionLabel(sectionOptimizing.value)}中`))
          controls.push(h(ElButton, { size: 'small', type: 'warning', plain: true, loading: true, disabled: true }, () => '处理中'))
        } else if (generated) {
          controls.push(h(ElTag, { size: 'small', type: sectionStatusType(node), effect: 'light' }, () => sectionStatusLabel(node)))
          controls.push(h(ElButton, { size: 'small', type: 'warning', plain: true, disabled: operationDisabled, onClick: (event) => { event.stopPropagation(); if (operationDisabled) return; emit('section-generate', node) } }, () => operationDisabled ? '锁定' : '重编'))
        } else if (failed) {
          const errorMessage = '章节生成失败，请点击“重试”重新生成'
          controls.push(h(ElTooltip, { content: errorMessage, placement: 'top', 'show-after': 200 }, { default: () => h(ElTag, { size: 'small', type: sectionStatusType(node), effect: 'light' }, () => sectionStatusLabel(node)) }))
          controls.push(h(ElButton, { size: 'small', type: 'danger', plain: true, disabled: operationDisabled, onClick: (event) => { event.stopPropagation(); if (operationDisabled) return; emit('section-generate', node) } }, () => operationDisabled ? '锁定' : '重试'))
        } else {
          controls.push(h(ElTag, { size: 'small', type: sectionStatusType(node), effect: 'light' }, () => sectionStatusLabel(node)))
          controls.push(h(ElButton, { size: 'small', type: 'primary', plain: true, disabled: operationDisabled, onClick: (event) => { event.stopPropagation(); if (operationDisabled) return; emit('section-generate', node) } }, () => operationDisabled ? '锁定' : '生成'))
        }
      }
      if (props.simple && !hasChildren) controls.push(h('span', { class: 'simple-level' }, node.headingType || 'H4'))
      return h('div', { class: 'tree-node-wrap' }, [
        h('div', { class: ['tree-row', `level-${depth}`, props.mode === 'generate' && !hasChildren ? 'clickable generate-row' : ''], style: { paddingLeft: `${depth * 20}px` }, onClick: () => { if (props.mode === 'generate' && !hasChildren) emit('preview', node) } }, [checkbox, h('span', { class: 'tree-dot' }, hasChildren ? '▾' : '•'), title, h('div', { class: ['tree-controls', props.mode === 'generate' && !hasChildren ? 'generate-controls' : ''] }, controls)]),
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
.solution-shell {
  display: grid;
  grid-template-columns: 268px minmax(0, 1fr);
  gap: 12px;
  width: 100%;
  height: 100%;
}

.solution-shell.with-preview { grid-template-columns: 268px minmax(520px, 0.95fr) minmax(420px, 1.25fr); }
.solution-shell.no-preview .solution-main-card { min-width: 0; }
.solution-list-card, .solution-main-card, .right-preview-card { background: #fff; border-radius: 18px; overflow: hidden; }
.solution-list-card { display: flex; flex-direction: column; padding: 14px; }
.list-title { display: flex; align-items: center; gap: 8px; font-weight: 800; font-size: 16px; color: #1f2937; }
.solution-search { margin: 18px 0 12px; }
.solution-list-scroll { flex: 1; min-height: 0; }
.solution-card { position: relative; }
.solution-card-actions { position: absolute; right: 10px; top: 50%; transform: translateY(-50%); display: none; gap: 8px; }
.solution-card:hover .solution-card-actions { display: flex; }
.solution-card-name span { display: inline-block; max-width: 180px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.solution-card { padding: 14px 12px; border: 1px solid #eef2ff; border-radius: 12px; cursor: pointer; margin-bottom: 10px; background: #fff; transition: all 0.18s ease; }
.solution-card:hover { border-color: #c7d7ff; box-shadow: 0 10px 24px rgba(37, 99, 235, 0.08); }
.solution-card.active { border-color: #4f8cff; background: linear-gradient(135deg, #f8fbff 0%, #eef4ff 100%); box-shadow: 0 10px 24px rgba(37, 99, 235, 0.1); }
.solution-card-name { display: flex; align-items: center; gap: 6px; color: #2563eb; font-weight: 700; }
.solution-card-time { margin: 6px 0 8px 22px; color: #8a98ad; font-size: 12px; }
.solution-card-tags { display: flex; gap: 8px; margin-left: 22px; }
.no-more { text-align: center; color: #9aa4b2; margin: 18px 0; }
.new-btn { width: 100%; height: 42px; background: linear-gradient(90deg, #3b73ff, #7c4dff); border: 0; }
.solution-main-card, .right-preview-card { min-width: 0; }
.home-panel {
  height: 100%;
  min-height: 0;
  overflow: auto;
  padding: 60px 40px;
  background: #fff;
  box-sizing: border-box;
}
.home-panel h1 {
  margin: 0 0 20px;
  color: #1f2937;
  font-size: 32px;
  font-weight: 800;
  text-align: center;
}
.home-desc {
  max-width: 760px;
  margin: 0 auto;
  text-align: center;
  color: #4b5563;
  line-height: 2;
  font-size: 16px;
}
.mode-cards {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 28px;
  max-width: 1120px;
  margin: 60px auto 0;
}
.mode-card {
  min-height: 300px;
  padding: 28px;
  border-radius: 24px;
  cursor: pointer;
  position: relative;
  overflow: hidden;
  transition: all 0.2s ease;
  box-sizing: border-box;
}
.mode-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 18px 40px rgba(37, 99, 235, 0.12);
}
.mode-card h3 {
  margin: 0 0 18px;
  color: #1f2937;
  font-size: 22px;
  font-weight: 800;
}
.mode-card p {
  color: #475569;
  line-height: 1.8;
  font-size: 15px;
}
.mode-card.pink { background: #fff1f2; }
.mode-card.blue { background: #f1f5ff; }
.mode-card.purple { background: #f7f1ff; }
.mode-ill {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 72px;
  height: 72px;
  margin-top: 58px;
  border-radius: 22px;
  background: rgba(255, 255, 255, 0.78);
  color: #3b82f6;
  font-size: 28px;
  font-weight: 900;
  box-shadow: 0 12px 28px rgba(37, 99, 235, 0.12);
}
.home-new-btn {
  display: block;
  width: 150px;
  height: 44px;
  margin: 58px auto 0;
  background: linear-gradient(90deg, #3b73ff, #7c4dff);
  border: 0;
}
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
.ai-level-note { margin-top: 8px; color: #64748b; font-size: 12px; line-height: 1.6; }
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
.detail-actions {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
  padding: 12px 20px;
  border-top: 1px solid #e5e7eb;
  background: #fff;
}
.detail-action-wrap,
.detail-action-btn { width: 100%; }
.detail-action-btn {
  height: 42px;
  font-weight: 700;
  margin-left: 0 !important;
}
.detail-actions :deep(.el-button + .el-button) { margin-left: 0 !important; }
.detail-action-wrap :deep(.el-button) { margin-left: 0 !important; }
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

.outline-lock-alert {
  margin: 0 0 12px;
}

.ai-level-card.disabled {
  cursor: not-allowed;
  opacity: 0.62;
  background: #f8fafc;
}

.ai-level-card.disabled:hover {
  border-color: #e5e7eb;
  box-shadow: none;
  transform: none;
}

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

@media (max-width: 1280px) { .solution-shell, .solution-shell.with-preview { grid-template-columns: 268px minmax(0, 1fr); } .right-preview-card { display: none; } .create-body { grid-template-columns: 1fr; } .create-left { border-right: 0; } }
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



.requirement-extract-wrap {
  min-height: 320px;
}

.requirement-extract-toolbar {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  padding-bottom: 16px;
  border-bottom: 1px solid #e5e7eb;
  margin-bottom: 16px;
}

.requirement-extract-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  flex-wrap: wrap;
  gap: 8px;
}

.requirement-edit-form :deep(.el-form-item) {
  margin-bottom: 14px;
}

.requirement-edit-form :deep(.el-textarea__inner) {
  line-height: 1.7;
}

.requirement-extract-title {
  font-size: 18px;
  font-weight: 800;
  color: #1f2937;
  margin-bottom: 6px;
}

.requirement-extract-desc {
  font-size: 13px;
  color: #64748b;
  line-height: 1.6;
}

.requirement-extract-summary {
  display: grid;
  grid-template-columns: 160px 160px 1fr;
  gap: 12px;
  margin-bottom: 14px;
}

.summary-stat-card {
  min-height: 72px;
  padding: 14px 16px;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  background: #f8fafc;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 6px;
}

.summary-stat-card span {
  font-size: 13px;
  color: #64748b;
}

.summary-stat-card strong {
  font-size: 22px;
  color: #1f2937;
}

.summary-stat-card small {
  color: #64748b;
  line-height: 1.5;
}

.requirement-type-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 14px;
}

.extract-desc-box {
  margin-bottom: 16px;
}

.extract-collapse {
  border-top: 1px solid #e5e7eb;
}

.summary-text-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.summary-text-item {
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  padding: 12px 14px;
  background: #fff;
}

.summary-text-item strong {
  display: block;
  font-size: 14px;
  color: #1f2937;
  margin-bottom: 8px;
}

.summary-text-item p {
  margin: 0;
  color: #475569;
  line-height: 1.8;
  white-space: pre-wrap;
}


.quality-check-wrap {
  min-height: 360px;
}

.quality-check-toolbar {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  padding-bottom: 16px;
  border-bottom: 1px solid #e5e7eb;
  margin-bottom: 16px;
}

.quality-check-title {
  font-size: 18px;
  font-weight: 800;
  color: #1f2937;
  margin-bottom: 6px;
}

.quality-check-desc {
  font-size: 13px;
  color: #64748b;
  line-height: 1.6;
}

.quality-stat-grid {
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: 12px;
  margin-bottom: 14px;
}

.quality-stat-card {
  min-height: 76px;
  padding: 13px 14px;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  background: #f8fafc;
  display: flex;
  flex-direction: column;
  gap: 5px;
  justify-content: center;
}

.quality-stat-card span {
  font-size: 13px;
  color: #64748b;
}

.quality-stat-card strong {
  font-size: 22px;
  color: #1f2937;
}

.quality-stat-card small {
  color: #64748b;
  line-height: 1.45;
}

.quality-alert {
  margin-bottom: 14px;
}

.quality-score-cell {
  display: grid;
  grid-template-columns: 1fr 34px;
  align-items: center;
  gap: 8px;
}

.quality-score-cell strong {
  font-size: 14px;
  color: #1f2937;
}

.quality-risk-tags {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-wrap: wrap;
  gap: 4px;
}

.quality-problem-text {
  display: flex;
  flex-direction: column;
  gap: 4px;
  line-height: 1.55;
}

.quality-problem-text strong {
  color: #1f2937;
  font-weight: 700;
}

.quality-problem-text span,
.muted-text {
  color: #64748b;
}

.quality-table :deep(.quality-row-rewrite td) {
  background: #fff1f2 !important;
}

.quality-table :deep(.quality-row-review td) {
  background: #fffbeb !important;
}

.quality-table :deep(.quality-row-missing td) {
  background: #f8fafc !important;
}

@media (max-width: 1280px) {
  .quality-stat-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
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

.export-format-tip p {
  margin: 0;
  line-height: 24px;
}
.export-format-sub {
  color: #64748b;
  font-size: 13px;
}

.recovery-alert {
  margin: 10px 0 12px;
  border-radius: 10px;
}

.task-running-tip {
  margin: 10px 0 8px;
  padding: 8px 12px;
  border-radius: 10px;
  background: #fff7e6;
  color: #b26a00;
  font-size: 13px;
  border: 1px solid #ffe1a6;
}

.rewrite-preview-alert {
  margin-bottom: 12px;
}

.version-layout {
  display: grid;
  grid-template-columns: 300px minmax(0, 1fr);
  gap: 16px;
  min-height: 520px;
}

.version-list-panel {
  border-right: 1px solid #eef2f7;
  padding-right: 14px;
  max-height: 560px;
  overflow-y: auto;
}

.version-card {
  border: 1px solid #e5eaf3;
  border-radius: 12px;
  padding: 12px;
  margin-bottom: 10px;
  cursor: pointer;
  background: #fff;
}

.version-card:hover,
.version-card.active {
  border-color: #2f6bff;
  background: #f4f8ff;
}

.version-card-title {
  color: #0f172a;
  font-weight: 700;
  margin-bottom: 6px;
}

.version-card-meta,
.version-card-remark {
  color: #8492a6;
  font-size: 12px;
  line-height: 20px;
}

.version-preview-panel {
  min-width: 0;
}

.version-preview-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 10px;
}

.version-preview-title {
  color: #0f172a;
  font-weight: 800;
  font-size: 18px;
}

.version-preview-desc {
  color: #64748b;
  margin-top: 4px;
}

.version-compare-tip {
  margin: 8px 0 12px;
  padding: 10px 12px;
  border-radius: 10px;
  background: #f8fafc;
  color: #64748b;
  font-size: 13px;
}

.version-section-scroll {
  height: 450px;
}

.version-section-item {
  border: 1px solid #edf1f7;
  border-radius: 12px;
  padding: 12px;
  margin-bottom: 10px;
  background: #fff;
}

.version-section-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.version-section-title {
  font-weight: 700;
  color: #1f2937;
  margin-bottom: 4px;
}

.version-section-meta {
  font-size: 12px;
  color: #94a3b8;
  margin-bottom: 8px;
}

.version-section-content {
  max-height: 160px;
  overflow: hidden;
  white-space: pre-wrap;
  color: #334155;
  line-height: 1.7;
  font-size: 13px;
}


.quality-check-wrap {
  min-height: 360px;
}

.quality-check-toolbar {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  padding-bottom: 16px;
  border-bottom: 1px solid #e5e7eb;
  margin-bottom: 16px;
}

.quality-check-title {
  font-size: 18px;
  font-weight: 800;
  color: #1f2937;
  margin-bottom: 6px;
}

.quality-check-desc {
  font-size: 13px;
  color: #64748b;
  line-height: 1.6;
}

.quality-stat-grid {
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: 12px;
  margin-bottom: 14px;
}

.quality-stat-card {
  min-height: 76px;
  padding: 13px 14px;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  background: #f8fafc;
  display: flex;
  flex-direction: column;
  gap: 5px;
  justify-content: center;
}

.quality-stat-card span {
  font-size: 13px;
  color: #64748b;
}

.quality-stat-card strong {
  font-size: 22px;
  color: #1f2937;
}

.quality-stat-card small {
  color: #64748b;
  line-height: 1.45;
}

.quality-alert {
  margin-bottom: 14px;
}

.quality-score-cell {
  display: grid;
  grid-template-columns: 1fr 34px;
  align-items: center;
  gap: 8px;
}

.quality-score-cell strong {
  font-size: 14px;
  color: #1f2937;
}

.quality-risk-tags {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-wrap: wrap;
  gap: 4px;
}

.quality-problem-text {
  display: flex;
  flex-direction: column;
  gap: 4px;
  line-height: 1.55;
}

.quality-problem-text strong {
  color: #1f2937;
  font-weight: 700;
}

.quality-problem-text span,
.muted-text {
  color: #64748b;
}

.quality-table :deep(.quality-row-rewrite td) {
  background: #fff1f2 !important;
}

.quality-table :deep(.quality-row-review td) {
  background: #fffbeb !important;
}

.quality-table :deep(.quality-row-missing td) {
  background: #f8fafc !important;
}

@media (max-width: 1280px) {
  .quality-stat-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

</style>


<style scoped>
.section-editor-tip {
  margin-top: 8px;
  font-size: 12px;
  line-height: 20px;
  color: #8a95a8;
}

.quality-check-wrap {
  min-height: 360px;
}

.quality-check-toolbar {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  padding-bottom: 16px;
  border-bottom: 1px solid #e5e7eb;
  margin-bottom: 16px;
}

.quality-check-title {
  font-size: 18px;
  font-weight: 800;
  color: #1f2937;
  margin-bottom: 6px;
}

.quality-check-desc {
  font-size: 13px;
  color: #64748b;
  line-height: 1.6;
}

.quality-stat-grid {
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: 12px;
  margin-bottom: 14px;
}

.quality-stat-card {
  min-height: 76px;
  padding: 13px 14px;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  background: #f8fafc;
  display: flex;
  flex-direction: column;
  gap: 5px;
  justify-content: center;
}

.quality-stat-card span {
  font-size: 13px;
  color: #64748b;
}

.quality-stat-card strong {
  font-size: 22px;
  color: #1f2937;
}

.quality-stat-card small {
  color: #64748b;
  line-height: 1.45;
}

.quality-alert {
  margin-bottom: 14px;
}

.quality-score-cell {
  display: grid;
  grid-template-columns: 1fr 34px;
  align-items: center;
  gap: 8px;
}

.quality-score-cell strong {
  font-size: 14px;
  color: #1f2937;
}

.quality-risk-tags {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-wrap: wrap;
  gap: 4px;
}

.quality-problem-text {
  display: flex;
  flex-direction: column;
  gap: 4px;
  line-height: 1.55;
}

.quality-problem-text strong {
  color: #1f2937;
  font-weight: 700;
}

.quality-problem-text span,
.muted-text {
  color: #64748b;
}

.quality-table :deep(.quality-row-rewrite td) {
  background: #fff1f2 !important;
}

.quality-table :deep(.quality-row-review td) {
  background: #fffbeb !important;
}

.quality-table :deep(.quality-row-missing td) {
  background: #f8fafc !important;
}

@media (max-width: 1280px) {
  .quality-stat-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

</style>

<style scoped>
/* 统一 AI方案生成页目录树与右侧预览样式：固定状态列宽，避免字数、状态、按钮挤在一起 */
.solution-shell :deep(.outline-tree) {
  font-size: 14px;
  color: #334155;
}

.solution-shell :deep(.tree-node-wrap) {
  width: 100%;
}

.solution-shell :deep(.tree-row) {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 38px;
  box-sizing: border-box;
}

.solution-shell :deep(.tree-row.generate-row) {
  min-height: 40px;
  padding-right: 0;
}

.solution-shell :deep(.tree-title-wrap) {
  flex: 1 1 auto;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 8px;
  overflow: hidden;
}

.solution-shell :deep(.tree-title) {
  flex: 0 1 auto;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  line-height: 22px;
}

.solution-shell :deep(.binding-tag) {
  flex: 0 0 auto;
}

.solution-shell :deep(.tree-title.parent) {
  font-size: 15px;
  font-weight: 800;
  color: #1f2937;
}

.solution-shell :deep(.tree-title.leaf) {
  font-size: 14px;
  font-weight: 400;
  color: #64748b;
}

.solution-shell :deep(.tree-controls) {
  margin-left: auto;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  flex-shrink: 0;
}

.solution-shell :deep(.tree-controls:empty) {
  display: none;
}

.solution-shell :deep(.tree-controls.generate-controls) {
  width: 220px;
  min-width: 220px;
  display: grid;
  grid-template-columns: 100px 62px 48px;
  column-gap: 6px;
  align-items: center;
  justify-items: end;
}

.solution-shell :deep(.tree-controls.generate-controls .count-text) {
  display: inline-flex;
  align-items: center;
  justify-content: flex-end;
  width: 100px;
  min-width: 100px;
  font-size: 13px;
  font-weight: 700;
  line-height: 22px;
  white-space: nowrap;
  word-break: keep-all;
}

.solution-shell :deep(.tree-controls.generate-controls .el-tag) {
  width: 58px;
  justify-content: center;
  padding: 0 6px;
  font-size: 12px;
}

.solution-shell :deep(.tree-controls.generate-controls .el-button) {
  width: 46px;
  min-width: 46px;
  height: 26px;
  margin-left: 0 !important;
  padding: 0;
  font-size: 12px;
}

.solution-shell .section-preview {
  padding: 24px 28px;
}

.solution-shell .section-preview-head h3 {
  font-size: 22px;
  line-height: 1.45;
}

.solution-shell .section-content-preview {
  font-size: 17px;
  line-height: 1.9;
}

.quality-check-wrap {
  min-height: 360px;
}

.quality-check-toolbar {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  padding-bottom: 16px;
  border-bottom: 1px solid #e5e7eb;
  margin-bottom: 16px;
}

.quality-check-title {
  font-size: 18px;
  font-weight: 800;
  color: #1f2937;
  margin-bottom: 6px;
}

.quality-check-desc {
  font-size: 13px;
  color: #64748b;
  line-height: 1.6;
}

.quality-stat-grid {
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: 12px;
  margin-bottom: 14px;
}

.quality-stat-card {
  min-height: 76px;
  padding: 13px 14px;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  background: #f8fafc;
  display: flex;
  flex-direction: column;
  gap: 5px;
  justify-content: center;
}

.quality-stat-card span {
  font-size: 13px;
  color: #64748b;
}

.quality-stat-card strong {
  font-size: 22px;
  color: #1f2937;
}

.quality-stat-card small {
  color: #64748b;
  line-height: 1.45;
}

.quality-alert {
  margin-bottom: 14px;
}

.quality-score-cell {
  display: grid;
  grid-template-columns: 1fr 34px;
  align-items: center;
  gap: 8px;
}

.quality-score-cell strong {
  font-size: 14px;
  color: #1f2937;
}

.quality-risk-tags {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-wrap: wrap;
  gap: 4px;
}

.quality-problem-text {
  display: flex;
  flex-direction: column;
  gap: 4px;
  line-height: 1.55;
}

.quality-problem-text strong {
  color: #1f2937;
  font-weight: 700;
}

.quality-problem-text span,
.muted-text {
  color: #64748b;
}

.quality-table :deep(.quality-row-rewrite td) {
  background: #fff1f2 !important;
}

.quality-table :deep(.quality-row-review td) {
  background: #fffbeb !important;
}

.quality-table :deep(.quality-row-missing td) {
  background: #f8fafc !important;
}

@media (max-width: 1280px) {
  .quality-stat-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

</style>
