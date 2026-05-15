<template>
  <div class="ai-bid-page">
    <aside class="project-pane">
      <div class="pane-title">我的项目</div>
      <el-input
        v-model="keyword"
        class="project-search"
        placeholder="搜索项目"
        clearable
        :prefix-icon="Search"
        @input="onKeywordInput"
      />

      <el-scrollbar class="project-scroll" v-loading="projectLoading">
        <div v-if="projects.length" class="project-list">
          <div
            v-for="project in projects"
            :key="project.id"
            class="project-card"
            :class="{ active: String(selectedProject?.id || '') === String(project.id) }"
          >
            <div class="project-main" @click="selectProject(project.id)">
              <span class="project-dot" :class="statusDotClass(project)" />
              <div class="project-info">
                <div class="project-name">{{ project.projectName || '未命名项目' }}</div>
                <div class="project-time">{{ project.createTime || '-' }}</div>
              </div>
              <el-button
                class="project-delete-btn"
                text
                circle
                :icon="Delete"
                title="删除项目"
                @click.stop="confirmDeleteProject(project)"
              />
              <el-button
                class="project-fold-btn"
                text
                circle
                title="展开/收起"
                @click.stop="toggleProjectFold(project)"
              >
                <el-icon class="fold-icon" :class="{ collapsed: !isProjectExpanded(project) }"><ArrowDown /></el-icon>
              </el-button>
            </div>

            <div v-if="isProjectExpanded(project)" class="doc-list">
              <div
                v-for="doc in workflowDocuments"
                :key="doc.type"
                class="doc-row"
                :class="{ active: activeDoc === doc.type, disabled: doc.enabled === false }"
                @click.stop="openDocument(doc)"
              >
                <div class="doc-icon">docx</div>
                <div class="doc-info">
                  <div class="doc-title">{{ doc.title }}</div>
                  <div class="doc-tags">
                    <el-tag size="small" effect="light">{{ doc.tag }}</el-tag>
                    <el-tag size="small" :type="doc.statusType || 'info'" effect="light">{{ doc.statusLabel }}</el-tag>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>
        <div v-else class="empty-project">
          <div class="empty-illustration">AI</div>
          <p>暂无项目，您可先新建项目</p>
        </div>
      </el-scrollbar>

      <el-button class="new-project-btn" type="primary" @click="openCreateProject">新建项目</el-button>
    </aside>

    <section class="workspace">
      <template v-if="!activeDoc">
        <div class="hero">
          <h1>AI标书</h1>
          <p>
            一键智能解析招标文件，精准识别提取采购需求及评分标准，步骤式生成技术或服务方案，
            原样式抽离组合招标文件中的模板文档，生成高质量商务标文件，快速完成高质量标书制作任务。
          </p>
        </div>

        <div class="feature-grid">
          <div class="feature-card feature-blue" @click="openDocumentByType('PARSE_REPORT')">
            <h3>招标信息解读</h3>
            <p>智能解析招标文件，生成大纲式招标解读及详细招标关键点，帮助用户快速解读招标项目信息。</p>
            <div class="feature-img">AI</div>
          </div>
          <div class="feature-card feature-red" @click="openDocumentByType('TECHNICAL_SOLUTION')">
            <h3>技术标创作</h3>
            <p>智能提取招标文件中的采购需求及评分标准，结合资料与知识库，快速撰写高质量技术或服务方案。</p>
            <div class="feature-img">AI</div>
          </div>
          <div class="feature-card feature-cyan" @click="openDocumentByType('BID_DOCUMENT')">
            <h3>商务标智能填写</h3>
            <p>智能抽取招标文件中的模板文件，结合资料库中的供应商信息，实现商务标文件智能填空。</p>
            <div class="feature-img">AI</div>
          </div>
        </div>

        <el-button class="hero-new-btn" type="primary" @click="openCreateProject">新建项目</el-button>
      </template>

      <template v-else-if="activeDoc === 'PARSE_REPORT'">
        <div class="doc-workspace">
          <div class="doc-head">
            <div>
              <h2>解析报告</h2>
              <p>从招标文件中提取项目基础信息、采购需求、评分标准、废标风险和关键条款。</p>
            </div>
            <el-button :icon="Refresh" @click="refreshWorkflow">刷新状态</el-button>
          </div>

          <div v-if="isParseRunning" class="parse-running">
            <el-progress :percentage="parseProgress" :stroke-width="10" />
            <p>{{ workflow?.parseTask?.message || '正在解析招标文件，请稍候...' }}</p>
          </div>

          <div v-else-if="isParseSuccess" class="report-panel">
            <div class="report-meta">
              <el-tag type="success" effect="light">解析成功</el-tag>
              <span>文件：{{ selectedProject?.tenderFileName || workflow?.parseTask?.fileName || '-' }}</span>
              <span>完成时间：{{ selectedProject?.parseTime || '-' }}</span>
            </div>
            <pre class="report-text">{{ parseReportText || '暂无解析报告内容' }}</pre>
          </div>

          <div v-else class="parse-pending">
            <el-empty description="当前项目尚未解析，请点击开始读标">
              <el-button
                type="primary"
                :loading="readTenderLoading"
                @click="startReadTenderForSelected"
              >
                {{ String(selectedProject?.parseStatus || '').toUpperCase() === 'FAILED' ? '重新读标' : '开始读标' }}
              </el-button>
            </el-empty>
          </div>
        </div>
      </template>

      <template v-else-if="activeDoc === 'BID_DOCUMENT'">
        <div class="doc-workspace bid-doc-workspace">
          <div class="word-toolbar">
            <strong>投标文件</strong>
            <el-select v-model="supplierId" placeholder="请选择供应商" clearable style="width: 220px">
              <el-option label="请先维护供应商信息" value="__placeholder" disabled />
            </el-select>
            <el-button type="primary" plain @click="smartFillBidDocument">智能填空</el-button>
          </div>
          <div class="word-menu">文件　首页　插入　绘图　布局　视图</div>
          <div class="word-editor">
            <div class="paper">
              <h2>投标文件</h2>
              <p class="paper-tip">第一阶段先提供供应商选择与商务资料填充入口，完整 Word 智能填空后续接入。</p>
              <p>项目名称：{{ selectedProject?.projectName || '-' }}</p>
              <p>招标文件：{{ selectedProject?.tenderFileName || workflow?.parseTask?.fileName || '-' }}</p>
              <p>解析状态：{{ parseStatusLabel }}</p>
            </div>
          </div>
        </div>
      </template>

      <template v-else-if="activeDoc === 'TECHNICAL_SOLUTION'">
        <div class="bid-tech-panel">
          <div v-if="!technicalGeneratedView" class="bid-tech-header">
            <el-button plain @click="activeDoc = ''">退出技术方案</el-button>
            <div class="bid-tech-steps">
              <span v-for="step in techSteps" :key="step.value" class="bid-tech-step" :class="{ active: technicalStep >= step.value }">
                <b>{{ step.value }}</b>{{ step.label }}
              </span>
            </div>
          </div>


          <div class="bid-tech-body" :class="{ generated: technicalGeneratedView }">
            <div class="bid-tech-left">
              <template v-if="!technicalGeneratedView">
                <div class="tech-form-section">
                  <div class="tech-label required">方案类型：</div>
                  <div class="tech-type-row">
                    <el-select v-model="technicalForm.solutionType" placeholder="服务" class="tech-select">
                      <el-option label="服务" value="SERVICE" />
                      <el-option label="工程" value="ENGINEERING" />
                      <el-option label="货物" value="GOODS" />
                      <el-option label="监理" value="SUPERVISION" />
                      <el-option label="IT信息" value="IT" />
                      <el-option label="其他" value="OTHER" />
                    </el-select>
                    <el-select v-model="technicalForm.solutionSubType" placeholder="不限" class="tech-select">
                      <el-option label="不限" value="不限" />
                      <el-option label="系统集成" value="系统集成" />
                      <el-option label="软件开发" value="软件开发" />
                      <el-option label="运维服务" value="运维服务" />
                      <el-option label="设备采购" value="设备采购" />
                    </el-select>
                  </div>
                </div>

                <div class="tech-form-section">
                  <div class="tech-label required">选择AI：</div>
                  <div class="tech-ai-levels">
                    <div
                      v-for="level in aiLevels"
                      :key="level.value"
                      class="tech-ai-card"
                      :class="{ active: technicalForm.aiLevel === level.value }"
                      @click="technicalForm.aiLevel = level.value"
                    >
                      <strong>{{ level.label }}</strong>
                      <p>{{ level.desc }}</p>
                      <span>将消耗字数套餐，无次数限制</span>
                    </div>
                  </div>
                </div>

                <div class="tech-form-section">
                  <div class="tech-label">智能读取：</div>
                  <div class="tech-read-card" :class="{ success: isParseSuccess, running: isParseRunning }">
                    <el-icon class="tech-read-icon"><Document /></el-icon>
                    <div class="tech-read-file">{{ selectedProject?.tenderFileName || workflow?.parseTask?.fileName || '当前项目已上传招标文件' }}</div>
                    <div class="tech-read-status">
                      <template v-if="isParseRunning">{{ workflow?.parseTask?.message || '正在解析招标文件' }} {{ parseProgress || 0 }}%</template>
                      <template v-else-if="isParseSuccess">解析报告已完成，已自动带入采购需求和评分标准</template>
                      <template v-else>尚未读标，可先手工录入采购需求，也可以直接点击下方按钮开始解析</template>
                    </div>
                    <div class="tech-read-actions">
                      <el-button
                        v-if="!isParseSuccess"
                        type="primary"
                        plain
                        :loading="readTenderLoading"
                        :disabled="isParseRunning"
                        @click="startReadTenderFromTechnical"
                      >
                        {{ String(selectedProject?.parseStatus || '').toUpperCase() === 'FAILED' ? '重新解析' : (isParseRunning ? '解析中' : '开始解析') }}
                      </el-button>
                      <el-button v-else type="success" plain disabled>已解析</el-button>
                    </div>
                  </div>
                </div>

                <div class="tech-form-section">
                  <div class="tech-label required">方案名称：</div>
                  <el-input v-model="technicalForm.solutionName" placeholder="请填写方案名称" />
                </div>

                <div class="tech-form-section">
                  <div class="tech-label">生成目录编写方向：</div>
                  <el-input
                    v-model="technicalForm.outlineWritingDirection"
                    type="textarea"
                    :rows="3"
                    maxlength="10000"
                    show-word-limit
                    placeholder="生成目录时使用，例如：重点突出无人值守流程、减少人工干预、风险防控、系统对接、落地交付能力等"
                  />
                </div>

                <div class="tech-form-section">
                  <div class="tech-inline-title">
                    <span class="required">采购需求：</span>
                    <el-button size="small" :disabled="!isParseSuccess" @click="extractTechnicalRequirement">从解析报告重新提取</el-button>
                  </div>
                  <el-input
                    v-model="technicalForm.purchaseRequirement"
                    type="textarea"
                    :rows="8"
                    maxlength="100000"
                    show-word-limit
                    placeholder="可从解析报告自动提取，也可以手工粘贴采购需求、技术要求、服务要求等内容"
                  />
                </div>

                <div class="tech-form-section">
                  <div class="tech-inline-title">
                    <span>评分标准 / 技术评分项：</span>
                    <el-tag v-if="isParseSuccess" size="small" type="success">已读取解析报告</el-tag>
                  </div>
                  <el-input
                    v-model="technicalForm.scoreRequirement"
                    type="textarea"
                    :rows="5"
                    maxlength="100000"
                    show-word-limit
                    placeholder="评分标准：没有评分项时可留空，系统会按采购需求生成目录"
                  />
                </div>

                <div class="tech-form-section">
                  <div class="tech-label required">目录要求：</div>
                  <el-radio-group v-model="technicalForm.outlineMode" class="tech-outline-mode">
                    <el-radio-button label="SCORE_ITEM">评分项</el-radio-button>
                    <el-radio-button label="CUSTOM_CHAPTER">定制章</el-radio-button>
                    <el-radio-button label="REQUIREMENT">按采购需求生成</el-radio-button>
                  </el-radio-group>
                  <el-input
                    v-model="technicalForm.outlineRequirement"
                    type="textarea"
                    :rows="4"
                    maxlength="100000"
                    show-word-limit
                    placeholder="可补充目录要求，例如必须包含项目背景、系统功能、交付计划、运维保障、数据安全等"
                  />
                </div>

                <div class="tech-form-section">
                  <div class="tech-inline-title">
                    <span>引用知识库：</span>
                    <el-tag size="small" type="info">生成正文时使用</el-tag>
                  </div>
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
                    <div v-else class="selected-kb-empty">未选择知识库，生成正文时不引用知识库资料</div>
                  </div>
                </div>
              </template>

              <template v-else>
                <div class="tech-detail-panel ai-solution-like-detail">
                  <div class="tech-detail-top">
                    <div>
                      <h2>{{ technicalForm.solutionName || selectedProject?.projectName || '技术方案' }}</h2>
                      <div v-if="showTechnicalStats" class="tech-detail-stats">
                        <span>目标字数：<b class="red">{{ technicalTargetWordCount }}</b> 字</span>
                        <span>生成字数：<b class="green">{{ technicalActualWordCount }}</b> 字</span>
                        <span>预计页数：<b class="red">{{ technicalTargetPageCount }}</b> 页</span>
                        <span>预估页数：<b class="green">{{ technicalActualPageCount }}</b> 页</span>
                      </div>
                      <div v-if="showTechnicalStats" class="tech-stat-note">注：页数仅供参考，实际请以导出结果为准</div>
                    </div>
                    <el-button
                      :icon="technicalEditMode ? Close : EditPen"
                      :disabled="!canEditTechnicalOutline"
                      @click="toggleTechnicalEditMode"
                    >
                      {{ technicalEditMode ? '退出编辑' : '编辑' }}
                    </el-button>
                  </div>

                  <template v-if="technicalEditMode">
                    <div class="edit-tabs">
                      <button :class="{ active: technicalEditTab === 'word' }" @click="technicalEditTab = 'word'">修改字数</button>
                      <button :class="{ active: technicalEditTab === 'direction' }" @click="technicalEditTab = 'direction'">编写方向</button>
                      <button :class="{ active: technicalEditTab === 'add' }" @click="technicalEditTab = 'add'">新增节点</button>
                      <button :class="{ active: technicalEditTab === 'delete' }" @click="technicalEditTab = 'delete'">删除节点</button>
                      <button :class="{ active: technicalEditTab === 'sort' }" @click="technicalEditTab = 'sort'">节点排序</button>
                    </div>
                    <el-scrollbar class="edit-scroll">
                      <section v-if="technicalEditTab === 'word'" class="edit-section">
                        <OutlineTree :nodes="technicalOutlines" mode="word" @word-change="onTechnicalNodeWordChange" @batch-word="onTechnicalBatchWord" />
                      </section>

                      <section v-else-if="technicalEditTab === 'direction'" class="edit-section direction-section">
                        <div class="overall-card">
                          <div class="card-title">
                            <span>方案整体编写要求</span>
                            <div>
                              <el-button size="small" type="primary" plain @click="streamTechnicalOverallDirection">AI帮写</el-button>
                              <el-button size="small" type="primary" @click="onSaveTechnicalOverallRequirement">保存</el-button>
                            </div>
                          </div>
                          <el-input
                            v-model="technicalOverallWritingRequirement"
                            type="textarea"
                            :rows="4"
                            maxlength="10000"
                            show-word-limit
                            placeholder="请输入方案整体编写要求，例如禁止使用某些称谓、语言风格、格式要求等"
                          />
                        </div>
                        <WritingDirectionEditor
                          :nodes="technicalOutlines"
                          :streaming-id="technicalStreamingOutlineId"
                          @ai-write="onTechnicalAiWriteDirection"
                          @save="onTechnicalSaveWritingConfig"
                        />
                      </section>

                      <section v-else-if="technicalEditTab === 'add'" class="edit-section">
                        <OutlineTree :nodes="technicalOutlines" mode="add" @add-node="openTechnicalAddNodeDialog" />
                      </section>

                      <section v-else-if="technicalEditTab === 'delete'" class="edit-section">
                        <div class="delete-bar">
                          <el-button type="danger" :disabled="!technicalDeleteIds.length" @click="onTechnicalDeleteNodes">删除选中项</el-button>
                        </div>
                        <OutlineTree :nodes="technicalOutlines" mode="delete" v-model:selected="technicalDeleteIds" />
                      </section>

                      <section v-else class="edit-section">
                        <OutlineTree :nodes="technicalOutlines" mode="sort" @move="onTechnicalMoveNode" />
                      </section>
                    </el-scrollbar>
                  </template>

                  <template v-else>
                    <el-scrollbar class="tech-detail-outline-scroll">
                      <div v-if="isCurrentTechnicalOutlineGenerating" class="tech-outline-loading compact">
                        <el-icon class="is-loading"><Loading /></el-icon>
                        <strong>正在生成技术方案目录</strong>
                        <p>系统正在结合采购需求、评分标准和编写方向生成目录，请不要重复点击。</p>
                      </div>
                      <el-empty v-else-if="!technicalOutlines.length" description="暂无目录，请在左侧输入目录要求，点击下方生成按钮" />
                      <template v-else>
                        <el-progress
                          :percentage="technicalGeneratePercent"
                          :show-text="false"
                          color="#ff4d4f"
                          class="solution-like-progress"
                        />
                        <OutlineTree
                          :nodes="technicalOutlines"
                          mode="generate"
                          @preview="selectTechnicalLeaf"
                          @section-generate="openTechnicalSectionDialog"
                        />
                      </template>
                    </el-scrollbar>

                    <div v-if="technicalOutlines.length && !isCurrentTechnicalOutlineGenerating" class="tech-outline-next-tip">
                      {{ technicalStep >= 5 ? '正文生成完成后，可点击章节查看结果，也可导出 Word。切换页面不会丢失生成进度。' : '目录已生成。请先设置篇幅，再开始生成正文。切换页面不会丢失结果。' }}
                    </div>

                    <div class="tech-preview-actions detail-actions-like-solution">
                      <el-button size="large" :disabled="!canRewriteTechnicalAll" @click="openTechnicalFullGenerateDialog('REWRITE')" :loading="fullGenerating || isTechnicalRunningByBackend">重编全文</el-button>
                      <el-button size="large" type="primary" :disabled="!canGenerateTechnicalContent" @click="openTechnicalFullGenerateDialog('GENERATE')" :loading="fullGenerating || isTechnicalRunningByBackend">{{ technicalGenerateButtonText }}</el-button>
                      <el-button size="large" type="success" :loading="exportingWord" :disabled="!canExportTechnicalWord" @click="exportTechnicalWord">导出Word</el-button>
                    </div>
                  </template>
                </div>
              </template>
            </div>

            <div class="bid-tech-right">
              <template v-if="technicalGeneratedView">
                <div v-if="selectedTechnicalLeafContent" class="section-preview tech-section-preview">
                  <div class="section-preview-head">
                    <h3>{{ selectedTechnicalLeaf ? selectedTechnicalLeaf.title : '结果预览' }}</h3>
                    <div class="section-preview-actions">
                      <template v-if="technicalSectionContentEditMode">
                        <el-button size="small" :disabled="technicalSectionContentSaving" @click="cancelEditTechnicalSectionContent">取消</el-button>
                        <el-button size="small" type="primary" :loading="technicalSectionContentSaving" @click="saveTechnicalSectionContent">保存</el-button>
                      </template>
                      <el-button
                        v-else
                        size="small"
                        type="primary"
                        plain
                        :icon="EditPen"
                        :disabled="!canEditTechnicalSectionContent"
                        @click="startEditTechnicalSectionContent"
                      >
                        编辑
                      </el-button>
                    </div>
                  </div>
                  <el-input
                    v-if="technicalSectionContentEditMode"
                    v-model="technicalSectionContentDraft"
                    class="section-content-editor"
                    type="textarea"
                    :autosize="{ minRows: 24 }"
                    maxlength="200000"
                    show-word-limit
                    placeholder="请输入章节正文内容"
                  />
                  <div v-else class="section-content-preview">{{ selectedTechnicalLeafContent }}</div>
                </div>
                <div v-else class="result-main-empty">
                  <el-empty :description="selectedTechnicalLeaf ? '当前章节尚未生成正文，可点击目录行右侧生成本段' : '右侧用于预览章节正文。生成完成后会自动选中第一个已生成章节。'" :image-size="120" />
                </div>
              </template>

              <template v-else>
                <div class="tech-preview-head">
                  <strong>预览目录 {{ technicalOutlineLeafCount }}</strong>
                  </div>
                <el-scrollbar class="tech-preview-scroll">
                  <el-empty description="暂无目录，请在左侧输入目录要求，点击下方生成按钮" />
                </el-scrollbar>
                <div class="tech-preview-actions">
                  <el-button :type="technicalMode === 'PRECISE' ? 'primary' : 'default'" plain :disabled="isCurrentTechnicalOutlineGenerating" @click="technicalMode = 'PRECISE'">精准模式</el-button>
                  <el-button :type="technicalMode === 'RICH' ? 'primary' : 'default'" plain :disabled="isCurrentTechnicalOutlineGenerating" @click="technicalMode = 'RICH'">丰富模式</el-button>
                  <el-button type="primary" :loading="isCurrentTechnicalOutlineGenerating" :disabled="isCurrentTechnicalOutlineGenerating" @click="generateTechnicalOutline">
                    {{ isCurrentTechnicalOutlineGenerating ? '目录生成中' : '生成目录' }}
                  </el-button>
                </div>
              </template>
            </div>
          </div>
        </div>
      </template>
    </section>

    <el-dialog v-model="createDialog.visible" title="新建项目" width="680px" destroy-on-close>
      <el-upload
        ref="uploadRef"
        class="tender-upload"
        drag
        action="#"
        :auto-upload="false"
        :limit="1"
        :file-list="uploadFiles"
        :show-file-list="false"
        :on-change="onTenderFileChange"
        :on-exceed="onTenderFileExceed"
        :on-remove="onTenderFileRemove"
        accept=".doc,.docx,.pdf,.DOC,.DOCX,.PDF"
      >
        <el-icon class="upload-icon"><UploadFilled /></el-icon>
        <div class="el-upload__text">拖拽文件至此或<em>点击选择招标文件</em></div>
        <template #tip>
          <div class="upload-tip">单次上传文件数量不超过1，仅允许 .doc、.docx、.pdf 格式，单文件大小不超过50MB</div>
        </template>
      </el-upload>

      <div v-if="uploadFiles.length" class="selected-file">
        <el-icon><Document /></el-icon>
        <span>{{ uploadFiles[0].name }}</span>
      </div>

      <template #footer>
        <el-button @click="closeCreateDialog">取消</el-button>
        <el-button type="primary" :loading="createDialog.loading" @click="uploadTenderOnly">创建项目</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="wordPresetVisible" title="设置技术方案篇幅" width="760px" append-to-body class="word-preset-dialog">
      <div class="word-preset-panel">
        <div class="preset-tip">
          <strong>目录已生成完成</strong>
          <span>请选择每个末级章节的目标字数。设置后可直接开始生成正文。</span>
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
              <button v-for="n in [300, 600, 900]" :key="n" type="button" :class="{ active: wordPreset.mode === 'FIXED' && wordPreset.wordCount === n }" @click="setWordPreset('FIXED', n)">{{ n }}字</button>
            </div>
          </div>
          <div class="preset-group-card">
            <div class="preset-group-title">常规版</div>
            <div class="preset-group-desc">适合正式投标方案初稿</div>
            <div class="preset-word-grid">
              <button v-for="n in [1200, 1800, 2700, 3600, 4500]" :key="n" type="button" :class="{ active: wordPreset.mode === 'FIXED' && wordPreset.wordCount === n }" @click="setWordPreset('FIXED', n)">{{ n }}字</button>
            </div>
          </div>
          <div class="preset-group-card">
            <div class="preset-group-title">详细版</div>
            <div class="preset-group-desc">适合需要展开实施细节</div>
            <div class="preset-word-grid">
              <button v-for="n in [5400, 6300, 7200, 8100, 9000, 9900]" :key="n" type="button" :class="{ active: wordPreset.mode === 'FIXED' && wordPreset.wordCount === n }" @click="setWordPreset('FIXED', n)">{{ n }}字</button>
            </div>
          </div>
        </div>
      </div>
      <template #footer>
        <el-button @click="wordPresetVisible = false">取消</el-button>
        <el-button type="primary" :loading="wordPresetSaving" @click="applyTechnicalWordPreset">确认设置</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="technicalAddNodeVisible" title="新增目录节点" width="520px" append-to-body>
      <el-form label-width="90px">
        <el-form-item label="标题">
          <el-input v-model="technicalAddNodeForm.title" placeholder="请输入节点标题" />
        </el-form-item>
        <el-form-item label="插入方式">
          <el-radio-group v-model="technicalAddNodeForm.insertType">
            <el-radio-button label="CHILD">作为子节点</el-radio-button>
            <el-radio-button label="SIBLING_AFTER">作为同级后节点</el-radio-button>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="目标字数">
          <el-select v-model="technicalAddNodeForm.targetWordCount">
            <el-option v-for="n in wordOptions" :key="n" :label="`${n}字`" :value="n" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="technicalAddNodeVisible = false">取消</el-button>
        <el-button type="primary" @click="onTechnicalAddNode">保存</el-button>
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
        <el-button type="primary" :loading="sectionGenerating" @click="generateTechnicalSection">生成本段</el-button>
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
        <el-button type="primary" :loading="fullGenerating || isTechnicalRunningByBackend" @click="confirmTechnicalFullGenerate">开始生成</el-button>
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
import { computed, defineComponent, h, nextTick, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElButton, ElCheckbox, ElInput, ElMessage, ElMessageBox, ElOption, ElSelect, ElTag, genFileId } from 'element-plus'
import { listKnowledgeBases } from '@/api/knowledge'
import { ArrowDown, Close, Delete, Document, EditPen, Loading, Plus, Refresh, Search, SortDown, SortUp, UploadFilled } from '@element-plus/icons-vue'
import {
  enterBidDocument,
  applyBidProjectTechnicalWordPreset,
  deleteBidProject,
  enterTechnicalSolution,
  exportBidProjectTechnicalWord,
  generateBidProjectTechnicalFull,
  generateBidProjectTechnicalOutline,
  getBidProjectTechnicalTask,
  getBidProjectTechnicalSolution,
  getBidProjectWorkflow,
  downloadFileResource,
  pageBidProjects,
  rewriteBidProjectTechnicalFull,
  startReadTenderProject,
  streamBidProjectTechnicalSection,
  streamBidProjectTechnicalWritingDirection,
  uploadTenderProject,
  saveBidProjectTechnicalOverallWritingRequirement,
  updateBidProjectTechnicalOutlineWordCount,
  batchUpdateBidProjectTechnicalOutlineWordCount,
  updateBidProjectTechnicalWritingConfig,
  addBidProjectTechnicalOutlineNode,
  deleteBidProjectTechnicalOutlineNodes,
  moveBidProjectTechnicalOutlineNode,
  updateBidProjectTechnicalSectionContent
} from '@/api/bidProject'

const router = useRouter()

const keyword = ref('')
const projectLoading = ref(false)
const projects = ref([])
const selectedProject = ref(null)
const expandedProjectId = ref('')
const workflow = ref(null)
const activeDoc = ref('')
const uploadFiles = ref([])
const uploadRef = ref()
const supplierId = ref('')
const readTenderLoading = ref(false)
const timer = ref(null)
const poller = ref(null)
const technicalOutlinePoller = ref(null)
const technicalOutlinePendingProjectId = ref('')
const technicalTaskPoller = ref(null)
const technicalTaskPending = reactive({ projectId: '', taskId: '' })
const TECH_OUTLINE_PENDING_KEY = 'ai_bid_technical_outline_pending_project_id'
const TECH_TASK_PENDING_KEY = 'ai_bid_technical_task_pending'
const lastAutoExtractParseKey = ref('')
const wordPresetVisible = ref(false)
const wordPresetSaving = ref(false)
const fullGenerating = ref(false)
const exportingWord = ref(false)
const wordPreset = reactive({ mode: 'FIXED', wordCount: 300 })
const selectedTechnicalLeaf = ref(null)
const technicalEditMode = ref(false)
const technicalEditTab = ref('word')
const technicalDeleteIds = ref([])
const technicalAddNodeVisible = ref(false)
const technicalAddBaseNode = ref(null)
const technicalAddNodeForm = reactive({ title: '', insertType: 'CHILD', targetWordCount: 300 })
const technicalOverallWritingRequirement = ref('')
const technicalStreamingOutlineId = ref(null)
const technicalSectionContentEditMode = ref(false)
const technicalSectionContentDraft = ref('')
const technicalSectionContentSaving = ref(false)
const sectionNode = ref(null)
const sectionDialogVisible = ref(false)
const sectionGenerating = ref(false)
const sectionStreamingText = ref('')
const wordOptions = [300, 600, 900, 1200, 1800, 2700, 3600, 4500, 5400, 6300, 7200, 8100, 9000, 9900]
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

const fullGenerateForm = reactive({
  knowledgeIds: [],
  blindBidEnabled: false,
  blindBidRequirement: '',
  writingStyle: 'GENERAL'
})
const fullGenerateSettingVisible = ref(false)
const fullGenerateAction = ref('GENERATE')
const knowledgeSelectorVisible = ref(false)
const knowledgeLoading = ref(false)
const knowledgeKeyword = ref('')
const knowledgeBaseList = ref([])
const tempSelectedKnowledgeIds = ref([])
const knowledgeSelectorTarget = ref('full')
const selectedKnowledgeBaseCache = ref([])
const selectedKnowledgeBases = computed(() => buildSelectedKnowledgeBases(fullGenerateForm.knowledgeIds || []))
const selectedSectionKnowledgeBases = computed(() => buildSelectedKnowledgeBases(parseKnowledgeIds(sectionForm.knowledgeIds)))

const createDialog = reactive({
  visible: false,
  loading: false
})

const techSteps = [
  { value: 1, label: '选择方案类型' },
  { value: 2, label: '录入基础信息' },
  { value: 3, label: '生成预览目录' },
  { value: 4, label: '调整总字数' },
  { value: 5, label: '生成方案' }
]
const aiLevels = [
  { value: 'BASIC', label: '基础版', desc: '快速生成基础内容，满足常规投标需求。' },
  { value: 'STANDARD', label: '标准版', desc: '深度优化逻辑结构，提升方案专业水准。' },
  { value: 'PREMIUM', label: '旗舰版', desc: '精准对标评分项，增强中标表达。' }
]
const technicalStep = ref(1)
const technicalMode = ref('PRECISE')
const technicalGeneratingOutline = ref(false)
const technicalSolution = ref(null)
const technicalOutlines = ref([])
const isCurrentTechnicalOutlineGenerating = computed(() => {
  return technicalGeneratingOutline.value
    && String(technicalOutlinePendingProjectId.value || '') === String(selectedProject.value?.id || '')
})
const technicalForm = reactive({
  solutionType: 'SERVICE',
  solutionSubType: '不限',
  aiLevel: 'BASIC',
  solutionName: '',
  outlineWritingDirection: '',
  purchaseRequirement: '',
  scoreRequirement: '',
  outlineMode: 'SCORE_ITEM',
  outlineRequirement: ''
})


function resetTechnicalWorkspace() {
  // 切换项目 / 新建项目后必须清空技术方案临时态，避免上一个项目的采购需求、评分标准、目录继续残留。
  technicalStep.value = 1
  technicalMode.value = 'PRECISE'
  technicalSolution.value = null
  technicalOutlines.value = []
  selectedTechnicalLeaf.value = null
  sectionNode.value = null
  sectionDialogVisible.value = false
  sectionStreamingText.value = ''
  lastAutoExtractParseKey.value = ''
  Object.assign(technicalForm, {
    solutionType: 'SERVICE',
    solutionSubType: '不限',
    aiLevel: 'BASIC',
    solutionName: '',
    outlineWritingDirection: '',
    purchaseRequirement: '',
    scoreRequirement: '',
    outlineMode: 'SCORE_ITEM',
    outlineRequirement: ''
  })
  Object.assign(fullGenerateForm, {
    knowledgeIds: [],
    blindBidEnabled: false,
    blindBidRequirement: '',
    writingStyle: 'GENERAL'
  })
}

const workflowDocuments = computed(() => workflow.value?.documents || defaultDocuments(selectedProject.value))
const parseReportText = computed(() => workflow.value?.parseReportText || selectedProject.value?.parseReportText || '')
const parseProgress = computed(() => Number(workflow.value?.parseTask?.progress || 0))
const isParseRunning = computed(() => ['PARSING', 'EXTRACTING'].includes(String(workflow.value?.parseTask?.status || selectedProject.value?.parseStatus || '').toUpperCase()))
const isParseSuccess = computed(() => String(selectedProject.value?.parseStatus || '').toUpperCase() === 'SUCCESS' || String(workflow.value?.parseTask?.status || '').toUpperCase() === 'SUCCESS')
const parseStatusLabel = computed(() => {
  const doc = workflowDocuments.value.find((item) => item.type === 'PARSE_REPORT')
  return doc?.statusLabel || '-'
})
const technicalOutlineLeafCount = computed(() => {
  let count = 0
  technicalOutlines.value.forEach((chapter) => {
    ;(chapter.children || []).forEach((section) => {
      count += (section.children || []).length
    })
  })
  return count
})

const technicalLeafNodes = computed(() => flattenTechnicalLeaves(technicalOutlines.value))
const technicalFinishedLeafCount = computed(() => technicalLeafNodes.value.filter(isTechnicalLeafDone).length)
const technicalGeneratePercent = computed(() => {
  const total = technicalLeafNodes.value.length
  if (!total) return 0
  return Math.round((technicalFinishedLeafCount.value / total) * 100)
})
const technicalTargetWordCount = computed(() => {
  const fromSolution = Number(technicalSolution.value?.targetWordCount || technicalSolution.value?.targetWords || 0)
  if (fromSolution > 0) return fromSolution
  return technicalLeafNodes.value.reduce((sum, node) => sum + Number(node.wordCount || node.targetWordCount || 0), 0)
})
const technicalActualWordCount = computed(() => {
  const fromSolution = Number(technicalSolution.value?.actualWordCount || technicalSolution.value?.generatedWordCount || technicalSolution.value?.generatedWords || 0)
  if (fromSolution > 0) return fromSolution
  return technicalLeafNodes.value.reduce((sum, node) => sum + Number(node.actualWordCount || 0), 0)
})
function estimatePageCount(words) {
  const count = Number(words || 0)
  if (count <= 0) return 0
  return Math.max(1, Math.round(count / 600))
}
const technicalTargetPageCount = computed(() => {
  const fromSolution = Number(technicalSolution.value?.estimatedPageCount || technicalSolution.value?.targetPageCount || 0)
  return fromSolution > 0 ? fromSolution : estimatePageCount(technicalTargetWordCount.value)
})
const technicalActualPageCount = computed(() => {
  const fromSolution = Number(technicalSolution.value?.actualPageCount || technicalSolution.value?.generatedPageCount || 0)
  return fromSolution > 0 ? fromSolution : estimatePageCount(technicalActualWordCount.value)
})
const showTechnicalStats = computed(() => {
  return technicalOutlines.value.length > 0
    || technicalTargetWordCount.value > 0
    || technicalActualWordCount.value > 0
})
const technicalGeneratedView = computed(() => {
  return technicalOutlines.value.length > 0
    || isCurrentTechnicalOutlineGenerating.value
    || technicalStep.value >= 3
    || fullGenerating.value
    || isTechnicalRunningByBackend.value
})
const selectedTechnicalLeafContent = computed(() => getTechnicalLeafContent(selectedTechnicalLeaf.value))
const canEditTechnicalOutline = computed(() => {
  return technicalOutlines.value.length > 0
    && !isCurrentTechnicalOutlineGenerating.value
    && !fullGenerating.value
    && !isTechnicalRunningByBackend.value
})
const canEditTechnicalSectionContent = computed(() => {
  return !!selectedTechnicalLeaf.value?.id
    && !!selectedTechnicalLeafContent.value
    && !fullGenerating.value
    && !isTechnicalRunningByBackend.value
    && !sectionGenerating.value
})
const canGenerateTechnicalContent = computed(() => {
  return !!selectedProject.value?.id
    && technicalOutlines.value.length > 0
    && !isCurrentTechnicalOutlineGenerating.value
    && !fullGenerating.value
    && !isTechnicalRunningByBackend.value
})
const canRewriteTechnicalAll = computed(() => {
  return canGenerateTechnicalContent.value && technicalFinishedLeafCount.value > 0
})
const canExportTechnicalWord = computed(() => {
  if (!technicalOutlines.value.length) return false
  if (fullGenerating.value || isTechnicalRunningByBackend.value) return false
  if (technicalSolution.value?.canExport === true) return true
  return technicalLeafNodes.value.length > 0 && technicalLeafNodes.value.every(isTechnicalLeafDone)
})
const isTechnicalRunningByBackend = computed(() => {
  const status = String(technicalSolution.value?.runningTask?.status || '').toUpperCase()
  return ['WAITING', 'RUNNING'].includes(status)
})
const technicalGenerateButtonText = computed(() => {
  if (fullGenerating.value || isTechnicalRunningByBackend.value) return '生成中'
  if (technicalFinishedLeafCount.value > 0 && technicalFinishedLeafCount.value < technicalLeafNodes.value.length) return '继续生成'
  if (technicalFinishedLeafCount.value === technicalLeafNodes.value.length && technicalLeafNodes.value.length > 0) return '重新生成'
  return '开始生成'
})

onMounted(async () => {
  await loadProjects()
  startPolling()
  restoreTechnicalOutlinePending()
  restoreTechnicalTaskPending()
})

onBeforeUnmount(() => {
  clearTimeout(timer.value)
  clearInterval(poller.value)
  clearInterval(technicalOutlinePoller.value)
  clearInterval(technicalTaskPoller.value)
})

function defaultDocuments(project) {
  const parseStatus = String(project?.parseStatus || 'WAIT_PARSE').toUpperCase()
  return [
    doc('PARSE_REPORT', '解析报告', '招标解读', parseStatus, true),
    doc('BID_DOCUMENT', '投标文件', '商务标', project?.bidDocStatus || 'WAIT_PARSE', true),
    doc('TECHNICAL_SOLUTION', '技术方案', '方案', project?.technicalStatus || 'WAIT_PARSE', true)
  ]
}

function doc(type, title, tag, status, enabled) {
  return {
    type,
    title,
    tag,
    status,
    enabled,
    statusLabel: statusLabel(type, status),
    statusType: statusType(status)
  }
}

function statusLabel(type, status) {
  const value = String(status || '').toUpperCase()
  if (type === 'PARSE_REPORT') {
    if (value === 'SUCCESS') return '解析成功'
    if (value === 'PARSING' || value === 'EXTRACTING') return '解析中'
    if (value === 'FAILED') return '解析失败'
    return '待解析'
  }
  if (value === 'DONE') return '已完成'
  if (value === 'WAIT_CREATE') return '待制作'
  if (value === 'FILLING') return '制作中'
  if (value === 'GENERATING') return '生成中'
  if (value === 'PARTIAL') return '部分完成'
  if (value === 'FAILED') return '失败'
  return '待解析'
}

function statusType(status) {
  const value = String(status || '').toUpperCase()
  if (value === 'SUCCESS' || value === 'DONE') return 'success'
  if (value === 'PARSING' || value === 'EXTRACTING' || value === 'FILLING' || value === 'GENERATING') return 'warning'
  if (value === 'FAILED') return 'danger'
  if (value === 'WAIT_CREATE') return 'primary'
  return 'info'
}

function statusDotClass(project) {
  const value = String(project?.parseStatus || '').toUpperCase()
  if (value === 'SUCCESS') return 'success'
  if (value === 'PARSING' || value === 'EXTRACTING') return 'warning'
  if (value === 'FAILED') return 'danger'
  return ''
}

function onKeywordInput() {
  clearTimeout(timer.value)
  timer.value = setTimeout(loadProjects, 300)
}

async function loadProjects(selectId) {
  projectLoading.value = true
  try {
    const res = await pageBidProjects({
      current: 1,
      size: 100,
      pageNum: 1,
      pageSize: 100,
      keyword: keyword.value || undefined
    })
    projects.value = res?.records || []
    const id = selectId || selectedProject.value?.id || projects.value[0]?.id
    if (id) {
      await selectProject(id, false)
    } else {
      selectedProject.value = null
      expandedProjectId.value = ''
      workflow.value = null
      activeDoc.value = ''
      resetTechnicalWorkspace()
    }
  } finally {
    projectLoading.value = false
  }
}

async function selectProject(id, resetDoc = true) {
  if (!id) return
  const oldProjectId = selectedProject.value?.id
  const projectChanged = String(oldProjectId || '') !== String(id || '')
  if (projectChanged) {
    resetTechnicalWorkspace()
  }

  workflow.value = await getBidProjectWorkflow(id)
  selectedProject.value = workflow.value?.project || projects.value.find((item) => String(item.id) === String(id)) || null
  expandedProjectId.value = selectedProject.value?.id ? String(selectedProject.value.id) : ''
  if (String(technicalOutlinePendingProjectId.value || '') === String(id)) {
    technicalGeneratingOutline.value = true
  }
  if (resetDoc) activeDoc.value = ''
  const index = projects.value.findIndex((item) => String(item.id) === String(id))
  if (index >= 0 && selectedProject.value) {
    projects.value.splice(index, 1, { ...projects.value[index], ...selectedProject.value })
  }
  autoFillTechnicalRequirementAfterParse(false)
}


function isProjectExpanded(project) {
  return String(selectedProject.value?.id || '') === String(project?.id || '')
    && String(expandedProjectId.value || '') === String(project?.id || '')
}

async function toggleProjectFold(project) {
  if (!project?.id) return
  const projectId = String(project.id)

  // 当前项目：只控制展开/收起，不重新加载，不影响右侧正在编辑/生成的页面。
  if (String(selectedProject.value?.id || '') === projectId) {
    expandedProjectId.value = String(expandedProjectId.value || '') === projectId ? '' : projectId
    return
  }

  // 其他项目：先选中并展开。
  await selectProject(project.id, true)
  expandedProjectId.value = projectId
}

async function refreshWorkflow() {
  if (!selectedProject.value?.id) return
  await selectProject(selectedProject.value.id, false)
  autoFillTechnicalRequirementAfterParse(false)
}

function openCreateProject() {
  resetUploadFile()
  createDialog.visible = true
  nextTick(() => {
    uploadRef.value?.clearFiles?.()
  })
}

function closeCreateDialog() {
  createDialog.visible = false
  resetUploadFile()
}

function resetUploadFile() {
  uploadFiles.value = []
  uploadRef.value?.clearFiles?.()
}

function onTenderFileChange(file, fileList) {
  // 只保留最后一次选择的文件，避免同一个文件重复显示、重复提交。
  uploadFiles.value = fileList.slice(-1)
}

function onTenderFileExceed(files) {
  // Element Plus limit=1 时再次选择文件会触发 exceed。
  // 这里按产品习惯处理为：新文件替换旧文件，而不是追加第二个文件。
  const file = files?.[0]
  if (!file) return
  uploadRef.value?.clearFiles?.()
  file.uid = genFileId()
  uploadRef.value?.handleStart?.(file)
}

function onTenderFileRemove(file, fileList) {
  uploadFiles.value = fileList.slice(-1)
}

async function uploadTenderOnly() {
  const file = uploadFiles.value[0]?.raw
  if (!file) {
    ElMessage.warning('请先选择招标文件')
    return
  }
  createDialog.loading = true
  try {
    const formData = new FormData()
    formData.append('file', file)
    const res = await uploadTenderProject(formData)
    ElMessage.success('项目已创建，请点击解析报告中的“开始读标”进行解析')
    createDialog.visible = false
    resetUploadFile()
    await loadProjects(res?.project?.id)
    activeDoc.value = ''
  } finally {
    createDialog.loading = false
  }
}

async function startReadTenderForSelected() {
  if (!selectedProject.value?.id) {
    ElMessage.warning('请先选择项目')
    return
  }
  readTenderLoading.value = true
  try {
    workflow.value = await startReadTenderProject(selectedProject.value.id)
    selectedProject.value = workflow.value?.project || selectedProject.value
    ElMessage.success('已开始读标')
    activeDoc.value = 'PARSE_REPORT'
    await loadProjects(selectedProject.value.id)
  } finally {
    readTenderLoading.value = false
  }
}

async function startReadTenderFromTechnical() {
  if (!selectedProject.value?.id) {
    ElMessage.warning('请先选择项目')
    return
  }
  const currentDoc = activeDoc.value || 'TECHNICAL_SOLUTION'
  readTenderLoading.value = true
  try {
    workflow.value = await startReadTenderProject(selectedProject.value.id)
    selectedProject.value = workflow.value?.project || selectedProject.value
    ElMessage.success('已开始解析')
    await loadProjects(selectedProject.value.id)
    activeDoc.value = currentDoc
    autoFillTechnicalRequirementAfterParse(false)
  } finally {
    readTenderLoading.value = false
  }
}

async function openDocument(doc) {
  if (!selectedProject.value?.id) return

  // 这三个子项没有固定先后顺序，但“解析报告”和“投标文件”依赖读标结果：
  // 1. 解析报告：可以随时打开，解析中显示进度，解析成功显示报告；
  // 2. 投标文件：必须等读标成功后才能进入商务标智能填充；
  // 3. 技术方案：允许先进入，后续可以人工补充需求或等解析完成后自动带入。
  const parseStatus = String(selectedProject.value?.parseStatus || workflow.value?.project?.parseStatus || '').toUpperCase()
  const parseDone = parseStatus === 'SUCCESS'
  const parseRunning = ['PARSING', 'EXTRACTING'].includes(parseStatus)

  if (doc.type === 'BID_DOCUMENT' && !parseDone) {
    ElMessage.warning(parseRunning ? '招标文件正在解析中，请解析完成后再进入投标文件' : '请先完成招标文件解析，再进入投标文件')
    activeDoc.value = 'PARSE_REPORT'
    return
  }

  if (doc.type === 'BID_DOCUMENT') {
    workflow.value = await enterBidDocument(selectedProject.value.id)
    selectedProject.value = workflow.value.project
  }
  if (doc.type === 'TECHNICAL_SOLUTION') {
    workflow.value = await enterTechnicalSolution(selectedProject.value.id)
    selectedProject.value = workflow.value.project
    await loadTechnicalSolution()
    hydrateTechnicalSolutionForm()
  }
  activeDoc.value = doc.type
}

function openDocumentByType(type) {
  if (!selectedProject.value?.id) {
    ElMessage.warning('请先新建或选择一个项目')
    return
  }
  const doc = workflowDocuments.value.find((item) => item.type === type)
  if (doc) openDocument(doc)
}

async function confirmDeleteProject(project) {
  if (!project?.id) return
  try {
    await ElMessageBox.confirm(
      `确认删除项目“${project.projectName || '未命名项目'}”吗？删除后该项目将从列表中移除。`,
      '删除确认',
      {
        confirmButtonText: '删除',
        cancelButtonText: '取消',
        type: 'warning',
        confirmButtonClass: 'el-button--danger'
      }
    )
  } catch (e) {
    return
  }
  await deleteBidProject(project.id)
  ElMessage.success('项目已删除')
  if (String(selectedProject.value?.id || '') === String(project.id)) {
    selectedProject.value = null
    expandedProjectId.value = ''
    workflow.value = null
    activeDoc.value = ''
    resetTechnicalWorkspace()
  }
  await loadProjects()
}

function smartFillBidDocument() {
  if (!supplierId.value) {
    ElMessageBox.alert('智能填空功能需要提供供应商信息，请先前往资料库维护供应商信息。', '温馨提示', {
      confirmButtonText: '确认'
    })
    return
  }
  ElMessage.info('第一阶段暂不生成完整 Word，后续接入商务标智能填空')
}

async function loadTechnicalSolution() {
  if (!selectedProject.value?.id) return
  try {
    technicalSolution.value = await getBidProjectTechnicalSolution(selectedProject.value.id)
    hydrateTechnicalOutlinesFromSolution(technicalSolution.value)
    syncTechnicalOverallRequirement()
  } catch (e) {
    technicalSolution.value = null
    technicalOutlines.value = []
  }
}

function hydrateTechnicalOutlinesFromSolution(solution) {
  const outlines = getTechnicalOutlinesFromSolution(solution)
  technicalOutlines.value = outlines.map(mapSolutionOutlineNode)
  if (technicalOutlines.value.length) {
    // 已经有目录时，直接进入“调整总字数”阶段；如果已有正文，则进入“生成方案”阶段。
    const leaves = flattenTechnicalLeaves(technicalOutlines.value)
    const hasContent = leaves.some(isTechnicalLeafDone)
    technicalStep.value = Math.max(technicalStep.value, hasContent ? 5 : 4)
    syncSelectedTechnicalLeaf()
    if (!selectedTechnicalLeaf.value && hasContent) selectFirstGeneratedTechnicalLeaf()
  } else {
    selectedTechnicalLeaf.value = null
    technicalSectionContentEditMode.value = false
    technicalSectionContentDraft.value = ''
  }
  syncTechnicalOverallRequirement()
}

function mapSolutionOutlineNode(node) {
  return {
    ...node,
    id: node.id,
    title: node.title,
    wordCount: Number(node.targetWordCount || node.wordCount || 0),
    targetWordCount: Number(node.targetWordCount || node.wordCount || 0),
    actualWordCount: Number(node.actualWordCount || node.section?.actualWordCount || 0),
    contentStatus: node.contentStatus || node.section?.generateStatus,
    writingDirection: node.writingDirection || node.section?.writingDirection || '',
    writingRequirement: node.writingRequirement || node.section?.writingRequirement || '',
    writingStyle: node.writingStyle || node.section?.writingStyle || 'GENERAL',
    knowledgeIds: node.knowledgeIds || node.section?.knowledgeIds || '',
    fileResourceIds: node.fileResourceIds || '',
    section: node.section || null,
    children: (node.children || []).map(mapSolutionOutlineNode)
  }
}

function hydrateTechnicalSolutionForm() {
  const projectName = selectedProject.value?.projectName || '技术方案'
  const solution = technicalSolution.value || {}
  const requirement = solution.requirement || {}
  technicalForm.solutionName = solution.solutionName || (projectName.includes('技术方案') ? projectName : `${projectName}技术方案`)
  technicalForm.solutionType = solution.solutionType || technicalForm.solutionType
  technicalForm.solutionSubType = solution.solutionSubType || technicalForm.solutionSubType
  technicalForm.aiLevel = solution.aiLevel || technicalForm.aiLevel
  technicalForm.outlineWritingDirection = solution.overallWritingRequirement || technicalForm.outlineWritingDirection
  technicalForm.purchaseRequirement = requirement.purchaseRequirement || technicalForm.purchaseRequirement
  technicalForm.scoreRequirement = requirement.scoreRequirement || requirement.technicalScoreItems || technicalForm.scoreRequirement
  technicalForm.outlineRequirement = requirement.outlineRequirement || technicalForm.outlineRequirement
  extractTechnicalRequirement(false, false)
  technicalStep.value = technicalOutlines.value.length ? 4 : (technicalForm.purchaseRequirement ? 2 : 1)
}

function extractTechnicalRequirement(showMessage = true, force = true) {
  const task = workflow.value?.parseTask || {}
  const report = parseReportText.value || ''
  const purchase = task.purchaseRequirement || task.technicalRequirement || task.serviceRequirement || ''
  const score = task.scoreRequirement || task.technicalScoreItems || ''

  // 手动点击“从解析报告重新提取”时强制覆盖；
  // 自动解析完成回填时只补空字段，避免覆盖用户已经手工调整过的内容。
  if (force || !String(technicalForm.purchaseRequirement || '').trim()) {
    technicalForm.purchaseRequirement = purchase || report || technicalForm.purchaseRequirement
  }
  if (force || !String(technicalForm.scoreRequirement || '').trim()) {
    technicalForm.scoreRequirement = score || technicalForm.scoreRequirement
  }

  if (showMessage) {
    if (technicalForm.purchaseRequirement) ElMessage.success('已从解析报告提取采购需求')
    else ElMessage.warning('暂无可提取的解析结果，可先手工填写采购需求')
  }
}

function autoFillTechnicalRequirementAfterParse(showMessage = true) {
  if (activeDoc.value !== 'TECHNICAL_SOLUTION') return
  if (!isParseSuccess.value || !selectedProject.value?.id) return

  const key = [
    selectedProject.value.id,
    selectedProject.value.parseTime || workflow.value?.parseTask?.updateTime || workflow.value?.parseTask?.completeTime || 'SUCCESS'
  ].join(':')

  const beforePurchase = String(technicalForm.purchaseRequirement || '').trim()
  const beforeScore = String(technicalForm.scoreRequirement || '').trim()
  extractTechnicalRequirement(false, false)
  const afterPurchase = String(technicalForm.purchaseRequirement || '').trim()
  const afterScore = String(technicalForm.scoreRequirement || '').trim()

  if (afterPurchase || afterScore) {
    technicalStep.value = Math.max(technicalStep.value, 2)
  }

  const changed = beforePurchase !== afterPurchase || beforeScore !== afterScore
  if (showMessage && changed && lastAutoExtractParseKey.value !== key) {
    lastAutoExtractParseKey.value = key
    ElMessage.success('解析完成，已自动带入采购需求和评分标准')
  }
}

async function generateTechnicalOutline() {
  if (!selectedProject.value?.id) {
    ElMessage.warning('请先选择项目')
    return
  }
  if (!technicalForm.solutionName?.trim()) {
    ElMessage.warning('请先填写方案名称')
    return
  }
  if (!technicalForm.purchaseRequirement?.trim()) {
    ElMessage.warning('请先填写采购需求，或先完成解析报告后重新提取')
    return
  }

  const projectId = selectedProject.value.id
  technicalGeneratingOutline.value = true
  markTechnicalOutlinePending(projectId)
  // 点击生成目录后，立即切换到“生成预览目录”步骤，并在右侧显示生成中状态，避免用户误以为页面卡住。
  technicalStep.value = Math.max(technicalStep.value, 3)

  try {
    const res = await generateBidProjectTechnicalOutline(projectId, {
      solutionName: technicalForm.solutionName,
      solutionType: technicalForm.solutionType,
      solutionSubType: technicalForm.solutionSubType,
      aiLevel: technicalForm.aiLevel,
      writingStyle: 'GENERAL',
      outlineWritingDirection: technicalForm.outlineWritingDirection,
      purchaseRequirement: technicalForm.purchaseRequirement,
      scoreRequirement: technicalForm.scoreRequirement,
      outlineMode: technicalForm.outlineMode,
      outlineRequirement: technicalForm.outlineRequirement
    })

    // 如果用户在生成期间切换了项目，不要把返回结果写到别的项目页面。
    if (String(selectedProject.value?.id || '') === String(projectId)) {
      technicalSolution.value = res
      hydrateTechnicalOutlinesFromSolution(res)
      // 有些接口返回的是保存成功后的方案摘要，目录树可能需要再查一次详情才能拿到。
      if (!technicalOutlines.value.length) {
        await loadTechnicalSolution()
      }
      if (technicalOutlines.value.length) {
        technicalStep.value = 4
        wordPresetVisible.value = true
        ElMessage.success('技术方案目录已生成，请继续调整总字数')
      } else {
        ElMessage.warning('目录生成请求已完成，但没有读取到目录数据，系统将继续自动检测生成结果')
      }
      await refreshWorkflow()
    }

    // 不管当前是否还停留在技术方案页，都启动一次结果检测。
    await checkTechnicalOutlineReady(projectId, false)
  } finally {
    if (!technicalOutlines.value.length && technicalOutlinePendingProjectId.value) {
      // 后端可能已经在继续处理，前端不强行结束生成态，交给轮询恢复。
      startTechnicalOutlinePolling(technicalOutlinePendingProjectId.value)
    } else {
      technicalGeneratingOutline.value = false
    }
  }
}


function normalizeKnowledgeIds(ids = []) {
  return (Array.isArray(ids) ? ids : parseKnowledgeIds(ids))
    .map((id) => Number(id))
    .filter((id) => Number.isFinite(id) && id > 0)
}

function parseKnowledgeIds(value) {
  if (Array.isArray(value)) return normalizeKnowledgeIds(value)
  if (value === null || value === undefined || value === '') return []
  if (typeof value === 'number') return Number.isFinite(value) ? [value] : []
  if (typeof value === 'string') {
    const text = value.trim()
    if (!text) return []
    try {
      const parsed = JSON.parse(text)
      if (Array.isArray(parsed)) return normalizeKnowledgeIds(parsed)
    } catch (e) {}
    return text.split(',').map((item) => Number(String(item).trim())).filter((id) => Number.isFinite(id) && id > 0)
  }
  return []
}

function stringifyKnowledgeIds(ids = []) {
  return normalizeKnowledgeIds(ids).join(',')
}

function buildSelectedKnowledgeBases(ids = []) {
  const idList = normalizeKnowledgeIds(ids)
  const map = new Map()
  selectedKnowledgeBaseCache.value.forEach((item) => map.set(Number(item.id), item))
  knowledgeBaseList.value.forEach((item) => map.set(Number(item.id), item))
  return idList.map((id) => map.get(Number(id)) || { id, kbName: `知识库#${id}` }).filter(Boolean)
}

function getCurrentKnowledgeIdsByTarget(target = knowledgeSelectorTarget.value) {
  return target === 'section'
    ? parseKnowledgeIds(sectionForm.knowledgeIds)
    : normalizeKnowledgeIds(fullGenerateForm.knowledgeIds)
}

function setCurrentKnowledgeIdsByTarget(ids = [], target = knowledgeSelectorTarget.value) {
  const normalized = normalizeKnowledgeIds(ids)
  if (target === 'section') {
    sectionForm.knowledgeIds = stringifyKnowledgeIds(normalized)
  } else {
    fullGenerateForm.knowledgeIds = normalized
  }
}

function goKnowledgeBasePage() {
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
  setCurrentKnowledgeIdsByTarget(tempSelectedKnowledgeIds.value, knowledgeSelectorTarget.value)
  const cacheMap = new Map()
  selectedKnowledgeBaseCache.value.forEach((item) => cacheMap.set(Number(item.id), item))
  knowledgeBaseList.value.forEach((item) => {
    if (tempSelectedKnowledgeIds.value.map(Number).includes(Number(item.id))) cacheMap.set(Number(item.id), item)
  })
  selectedKnowledgeBaseCache.value = [...cacheMap.values()]
  knowledgeSelectorVisible.value = false
}

function removeSelectedKnowledgeBase(id, target = 'full') {
  const removeId = Number(id)
  const next = getCurrentKnowledgeIdsByTarget(target).filter((item) => Number(item) !== removeId)
  setCurrentKnowledgeIdsByTarget(next, target)
}

function openWordPresetDialog() {
  if (!technicalOutlines.value.length) {
    ElMessage.warning('请先生成目录')
    return
  }
  wordPresetVisible.value = true
}

function setWordPreset(mode, wordCount) {
  wordPreset.mode = mode
  wordPreset.wordCount = wordCount
}

async function applyTechnicalWordPreset() {
  if (!selectedProject.value?.id) return
  if (!technicalOutlines.value.length) {
    ElMessage.warning('请先生成目录')
    return
  }
  wordPresetSaving.value = true
  try {
    technicalSolution.value = await applyBidProjectTechnicalWordPreset(selectedProject.value.id, {
      mode: wordPreset.mode,
      wordCount: wordPreset.wordCount
    })
    hydrateTechnicalOutlinesFromSolution(technicalSolution.value)
    technicalStep.value = 4
    wordPresetVisible.value = false
    await refreshWorkflow()
    ElMessage.success('篇幅已设置，可以开始生成正文')
  } finally {
    wordPresetSaving.value = false
  }
}

function openTechnicalFullGenerateDialog(action = 'GENERATE') {
  if (!canGenerateTechnicalContent.value) {
    if (!technicalOutlines.value.length) ElMessage.warning('请先生成目录')
    return
  }
  fullGenerateAction.value = action
  fullGenerateSettingVisible.value = true
}

async function confirmTechnicalFullGenerate() {
  fullGenerateSettingVisible.value = false
  await startTechnicalFullGenerate(fullGenerateAction.value === 'REWRITE', true)
}

async function startTechnicalFullGenerate(rewrite = false, skipConfirm = false) {
  if (!selectedProject.value?.id) {
    ElMessage.warning('请先选择项目')
    return
  }
  if (!technicalOutlines.value.length) {
    ElMessage.warning('请先生成目录')
    return
  }
  if (rewrite && !skipConfirm) {
    try {
      await ElMessageBox.confirm('重编全文将覆盖已有技术方案正文，是否继续？', '确认重编', { type: 'warning' })
    } catch (e) {
      return
    }
  }

  fullGenerating.value = true
  technicalStep.value = 5
  try {
    const selectedKnowledgeIds = normalizeKnowledgeIds(fullGenerateForm.knowledgeIds)
    const payload = {
      writingStyle: fullGenerateForm.writingStyle || 'GENERAL',
      useKnowledge: selectedKnowledgeIds.length > 0,
      knowledgeIds: stringifyKnowledgeIds(selectedKnowledgeIds),
      anonymous: !!fullGenerateForm.blindBidEnabled,
      anonymousRequirement: fullGenerateForm.blindBidRequirement || ''
    }
    const task = rewrite
      ? await rewriteBidProjectTechnicalFull(selectedProject.value.id, payload)
      : await generateBidProjectTechnicalFull(selectedProject.value.id, payload)

    if (task?.id) {
      markTechnicalTaskPending(selectedProject.value.id, task.id)
      pollTechnicalGenerationTask(selectedProject.value.id, task.id, false)
    }
    await refreshWorkflow()
    await loadTechnicalSolution()
  } catch (e) {
    fullGenerating.value = false
  }
}

function markTechnicalTaskPending(projectId, taskId) {
  if (!projectId || !taskId) return
  technicalTaskPending.projectId = String(projectId)
  technicalTaskPending.taskId = String(taskId)
  localStorage.setItem(TECH_TASK_PENDING_KEY, JSON.stringify({ projectId: String(projectId), taskId: String(taskId) }))
  startTechnicalTaskPolling(projectId, taskId)
}

function clearTechnicalTaskPending(projectId, taskId) {
  if (String(technicalTaskPending.projectId || '') === String(projectId || '')
    && String(technicalTaskPending.taskId || '') === String(taskId || '')) {
    technicalTaskPending.projectId = ''
    technicalTaskPending.taskId = ''
    localStorage.removeItem(TECH_TASK_PENDING_KEY)
  }
  clearInterval(technicalTaskPoller.value)
}

function restoreTechnicalTaskPending() {
  const raw = localStorage.getItem(TECH_TASK_PENDING_KEY)
  if (!raw) return
  try {
    const data = JSON.parse(raw)
    if (data?.projectId && data?.taskId) {
      technicalTaskPending.projectId = String(data.projectId)
      technicalTaskPending.taskId = String(data.taskId)
      fullGenerating.value = true
      startTechnicalTaskPolling(data.projectId, data.taskId)
    }
  } catch (e) {
    localStorage.removeItem(TECH_TASK_PENDING_KEY)
  }
}

function startTechnicalTaskPolling(projectId, taskId) {
  clearInterval(technicalTaskPoller.value)
  technicalTaskPoller.value = setInterval(() => {
    pollTechnicalGenerationTask(projectId, taskId, true)
  }, 3000)
}

async function pollTechnicalGenerationTask(projectId, taskId, silent = true) {
  if (!projectId || !taskId) return
  try {
    const task = await getBidProjectTechnicalTask(projectId, taskId)
    const status = String(task?.status || '').toUpperCase()
    if (['WAITING', 'RUNNING'].includes(status)) {
      fullGenerating.value = true
      if (String(selectedProject.value?.id || '') === String(projectId || '')) {
        await loadTechnicalSolution()
        await refreshWorkflow()
      }
      return
    }

    clearTechnicalTaskPending(projectId, taskId)
    fullGenerating.value = false

    if (String(selectedProject.value?.id || '') === String(projectId || '')) {
      await loadTechnicalSolution()
      await refreshWorkflow()
      technicalStep.value = 5
      selectFirstGeneratedTechnicalLeaf()
    }

    if (!silent) {
      if (status === 'FAILED') ElMessage.error(task?.errorMessage || task?.message || '生成失败')
      else if (status === 'PARTIAL') ElMessage.warning(task?.message || '部分章节未生成完成，请继续生成或重编失败章节')
      else if (status === 'CANCELED') ElMessage.warning(task?.message || '生成已取消')
      else ElMessage.success(task?.message || '技术方案正文生成完成')
    }
  } catch (e) {
    clearTechnicalTaskPending(projectId, taskId)
    fullGenerating.value = false
  }
}

async function exportTechnicalWord() {
  if (!selectedProject.value?.id) return
  if (!canExportTechnicalWord.value) {
    ElMessage.warning(fullGenerating.value || isTechnicalRunningByBackend.value ? '技术方案正在生成，完成后再导出' : '仍有章节未生成完成，暂不能导出')
    return
  }
  exportingWord.value = true
  try {
    const file = await exportBidProjectTechnicalWord(selectedProject.value.id)
    await refreshWorkflow()
    await loadTechnicalSolution()
    if (!file?.id) {
      ElMessage.warning('导出成功，但未返回文件ID，请到下载中心查看')
      return
    }
    const blob = await downloadFileResource(file.id)
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = file.originalName || `${technicalForm.solutionName || selectedProject.value.projectName || '技术方案'}-导出.docx`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.URL.revokeObjectURL(url)
    ElMessage.success('导出成功')
  } finally {
    exportingWord.value = false
  }
}

function markTechnicalOutlinePending(projectId) {
  if (!projectId) return
  const id = String(projectId)
  technicalOutlinePendingProjectId.value = id
  technicalGeneratingOutline.value = true
  localStorage.setItem(TECH_OUTLINE_PENDING_KEY, id)
  startTechnicalOutlinePolling(id)
}

function clearTechnicalOutlinePending(projectId) {
  const id = projectId ? String(projectId) : technicalOutlinePendingProjectId.value
  if (!id || String(technicalOutlinePendingProjectId.value || '') === id) {
    technicalOutlinePendingProjectId.value = ''
    localStorage.removeItem(TECH_OUTLINE_PENDING_KEY)
  }
  clearInterval(technicalOutlinePoller.value)
}

function restoreTechnicalOutlinePending() {
  const id = localStorage.getItem(TECH_OUTLINE_PENDING_KEY)
  if (!id) return
  technicalOutlinePendingProjectId.value = id
  technicalGeneratingOutline.value = true
  startTechnicalOutlinePolling(id)
}

function startTechnicalOutlinePolling(projectId) {
  if (!projectId) return
  clearInterval(technicalOutlinePoller.value)
  technicalOutlinePoller.value = setInterval(() => {
    checkTechnicalOutlineReady(projectId, true)
  }, 3000)
}

async function checkTechnicalOutlineReady(projectId, silent = true) {
  if (!projectId) return false
  try {
    const solution = await getBidProjectTechnicalSolution(projectId)
    const outlines = getTechnicalOutlinesFromSolution(solution)
    if (!outlines.length) return false

    clearTechnicalOutlinePending(projectId)

    if (String(selectedProject.value?.id || '') === String(projectId)) {
      technicalSolution.value = solution
      technicalOutlines.value = outlines.map(mapSolutionOutlineNode)
      technicalStep.value = Math.max(technicalStep.value, 4)
      technicalGeneratingOutline.value = false
      if (!silent && technicalFinishedLeafCount.value === 0) wordPresetVisible.value = true
      await refreshWorkflow()
    }

    if (!silent) {
      ElMessage.success('技术方案目录已生成，请继续调整总字数')
    }
    return true
  } catch (e) {
    return false
  }
}

function getTechnicalOutlinesFromSolution(solution) {
  if (!solution) return []
  if (Array.isArray(solution)) return solution
  const outlines = solution.outlines || solution.outlineList || solution.outlineTree || solution.outlineNodes || []
  return Array.isArray(outlines) ? outlines : []
}

function flattenTechnicalLeaves(nodes = []) {
  const list = []
  ;(nodes || []).forEach((node) => {
    const children = node.children || []
    if (children.length) {
      list.push(...flattenTechnicalLeaves(children))
    } else {
      list.push(node)
    }
  })
  return list
}

function isTechnicalLeafDone(node) {
  const status = String(node?.contentStatus || node?.section?.generateStatus || '').toUpperCase()
  const content = getTechnicalLeafContent(node)
  return status === 'SUCCESS' || (String(content || '').trim().length > 20 && Number(node?.actualWordCount || node?.section?.actualWordCount || 0) > 0)
}

function technicalNodeStatusLabel(node) {
  const status = String(node?.contentStatus || node?.section?.generateStatus || '').toUpperCase()
  if (status === 'SUCCESS' || isTechnicalLeafDone(node)) return '已完成'
  if (status === 'GENERATING' || status === 'LOCKED') return '生成中'
  if (status === 'FAILED') return '失败'
  if (status === 'STALE') return '待重编'
  return '未生成'
}

function technicalNodeStatusType(node) {
  const status = String(node?.contentStatus || node?.section?.generateStatus || '').toUpperCase()
  if (status === 'SUCCESS' || isTechnicalLeafDone(node)) return 'success'
  if (status === 'GENERATING' || status === 'LOCKED') return 'warning'
  if (status === 'FAILED') return 'danger'
  return 'info'
}

function getTechnicalLeafContent(node) {
  if (!node) return ''
  return node.section?.content
    || node.section?.contentMarkdown
    || node.section?.contentHtml
    || node.content
    || node.contentMarkdown
    || ''
}

function selectTechnicalLeaf(node) {
  selectedTechnicalLeaf.value = node || null
  technicalSectionContentEditMode.value = false
  technicalSectionContentDraft.value = getTechnicalLeafContent(node) || ''
}

function syncSelectedTechnicalLeaf() {
  if (!selectedTechnicalLeaf.value?.id) return
  const latest = findTechnicalOutlineNodeById(technicalOutlines.value, selectedTechnicalLeaf.value.id)
  if (latest) selectedTechnicalLeaf.value = latest
  else selectedTechnicalLeaf.value = null
}

function syncTechnicalOverallRequirement() {
  technicalOverallWritingRequirement.value = technicalSolution.value?.overallWritingRequirement
    || technicalForm.outlineWritingDirection
    || ''
}

function toggleTechnicalEditMode() {
  if (!canEditTechnicalOutline.value) return
  technicalEditMode.value = !technicalEditMode.value
  if (technicalEditMode.value) {
    technicalEditTab.value = 'word'
    syncTechnicalOverallRequirement()
  }
}

async function reloadTechnicalAfterOutlineEdit(successMsg) {
  await loadTechnicalSolution()
  await refreshWorkflow()
  if (successMsg) ElMessage.success(successMsg)
}

async function onTechnicalNodeWordChange({ node, value }) {
  if (!node?.id) return
  await updateBidProjectTechnicalOutlineWordCount(node.id, Number(value || 0))
  node.targetWordCount = Number(value || 0)
  node.wordCount = Number(value || 0)
  await reloadTechnicalAfterOutlineEdit('字数已保存')
}

async function onTechnicalBatchWord({ node, value }) {
  if (!node?.id) return
  await batchUpdateBidProjectTechnicalOutlineWordCount(node.id, Number(value || 0))
  await reloadTechnicalAfterOutlineEdit('下级章节字数已批量修改')
}

async function onSaveTechnicalOverallRequirement() {
  const solutionId = technicalSolution.value?.id
  if (!solutionId) {
    ElMessage.warning('当前技术方案缺少方案ID')
    return
  }
  await saveBidProjectTechnicalOverallWritingRequirement(solutionId, technicalOverallWritingRequirement.value || '')
  technicalForm.outlineWritingDirection = technicalOverallWritingRequirement.value || ''
  await reloadTechnicalAfterOutlineEdit('整体编写要求已保存')
}

async function streamTechnicalOverallDirection() {
  if (!technicalOutlines.value.length) {
    ElMessage.warning('请先生成目录')
    return
  }
  const firstLeaf = flattenTechnicalLeaves(technicalOutlines.value)[0]
  if (!firstLeaf?.id) {
    ElMessage.warning('没有可参考的章节')
    return
  }
  technicalOverallWritingRequirement.value = ''
  technicalStreamingOutlineId.value = firstLeaf.id
  try {
    await streamBidProjectTechnicalWritingDirection(firstLeaf.id, {
      title: technicalForm.solutionName || selectedProject.value?.projectName || '技术方案',
      overall: true
    }, {
      onMessage(chunk) {
        technicalOverallWritingRequirement.value += chunk
      },
      onError(message) {
        ElMessage.error(message || 'AI帮写失败')
      }
    })
  } finally {
    technicalStreamingOutlineId.value = null
  }
}

async function onTechnicalAiWriteDirection(node) {
  if (!node?.id) return
  node.writingDirection = ''
  technicalStreamingOutlineId.value = node.id
  try {
    await streamBidProjectTechnicalWritingDirection(node.id, {
      title: node.title,
      overallWritingRequirement: technicalOverallWritingRequirement.value || technicalForm.outlineWritingDirection || ''
    }, {
      onMessage(chunk) {
        node.writingDirection = `${node.writingDirection || ''}${chunk}`
      },
      onError(message) {
        ElMessage.error(message || 'AI帮写失败')
      }
    })
  } finally {
    technicalStreamingOutlineId.value = null
  }
}

async function onTechnicalSaveWritingConfig(node) {
  if (!node?.id) return
  await updateBidProjectTechnicalWritingConfig(node.id, {
    title: node.title,
    writingDirection: node.writingDirection || '',
    writingRequirement: node.writingRequirement || '',
    writingStyle: node.writingStyle || 'GENERAL'
  })
  await reloadTechnicalAfterOutlineEdit('编写配置已保存')
}

function openTechnicalAddNodeDialog(node) {
  if (!node?.id) return
  technicalAddBaseNode.value = node
  technicalAddNodeForm.title = ''
  technicalAddNodeForm.insertType = 'CHILD'
  technicalAddNodeForm.targetWordCount = 300
  technicalAddNodeVisible.value = true
}

async function onTechnicalAddNode() {
  if (!technicalAddBaseNode.value?.id) return
  if (!technicalAddNodeForm.title?.trim()) {
    ElMessage.warning('请输入节点标题')
    return
  }
  await addBidProjectTechnicalOutlineNode(technicalAddBaseNode.value.id, {
    ...technicalAddNodeForm,
    title: technicalAddNodeForm.title.trim()
  })
  technicalAddNodeVisible.value = false
  await reloadTechnicalAfterOutlineEdit('节点已新增')
}

async function onTechnicalDeleteNodes() {
  if (!technicalDeleteIds.value.length) return
  try {
    await ElMessageBox.confirm('删除节点后，其下所有子节点及已生成正文将一并删除，是否继续？', '确认删除', { type: 'warning' })
  } catch (e) {
    return
  }
  await deleteBidProjectTechnicalOutlineNodes(technicalDeleteIds.value)
  technicalDeleteIds.value = []
  await reloadTechnicalAfterOutlineEdit('节点已删除')
}

async function onTechnicalMoveNode({ node, direction }) {
  if (!node?.id) return
  await moveBidProjectTechnicalOutlineNode(node.id, direction)
  await reloadTechnicalAfterOutlineEdit('排序已更新')
}

function startEditTechnicalSectionContent() {
  if (!canEditTechnicalSectionContent.value) return
  technicalSectionContentDraft.value = selectedTechnicalLeafContent.value || ''
  technicalSectionContentEditMode.value = true
}

function cancelEditTechnicalSectionContent() {
  technicalSectionContentDraft.value = selectedTechnicalLeafContent.value || ''
  technicalSectionContentEditMode.value = false
}

async function saveTechnicalSectionContent() {
  if (!selectedTechnicalLeaf.value?.id) return
  technicalSectionContentSaving.value = true
  try {
    await updateBidProjectTechnicalSectionContent(selectedTechnicalLeaf.value.id, technicalSectionContentDraft.value || '')
    await loadTechnicalSolution()
    const latest = findTechnicalOutlineNodeById(technicalOutlines.value, selectedTechnicalLeaf.value.id)
    selectedTechnicalLeaf.value = latest || selectedTechnicalLeaf.value
    technicalSectionContentEditMode.value = false
    ElMessage.success('正文已保存')
  } finally {
    technicalSectionContentSaving.value = false
  }
}

function selectFirstGeneratedTechnicalLeaf() {
  const leaf = technicalLeafNodes.value.find(isTechnicalLeafDone) || technicalLeafNodes.value[0]
  if (leaf) selectedTechnicalLeaf.value = leaf
}

function findTechnicalOutlineNodeById(nodes = [], id) {
  for (const node of nodes || []) {
    if (String(node.id || '') === String(id || '')) return node
    const child = findTechnicalOutlineNodeById(node.children || [], id)
    if (child) return child
  }
  return null
}

function openTechnicalSectionDialog(node) {
  if (!node?.id) {
    ElMessage.warning('当前目录节点缺少ID，请重新生成目录后再试')
    return
  }
  if (fullGenerating.value || isTechnicalRunningByBackend.value) {
    ElMessage.warning('全文正在生成中，请完成后再单独重编章节')
    return
  }
  sectionNode.value = node
  selectedTechnicalLeaf.value = node
  Object.assign(sectionForm, {
    title: node.title,
    targetWordCount: Number(node.targetWordCount || node.wordCount || 300),
    chartLevel: 'NONE',
    tableLevel: 'NONE',
    imageLevel: 'NONE',
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

async function generateTechnicalSection() {
  if (!sectionNode.value?.id) return
  sectionGenerating.value = true
  sectionStreamingText.value = ''
  try {
    await streamBidProjectTechnicalSection(sectionNode.value.id, {
      ...sectionForm,
      knowledgeIds: stringifyKnowledgeIds(sectionForm.knowledgeIds),
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
    await loadTechnicalSolution()
    await refreshWorkflow()
    const latest = findTechnicalOutlineNodeById(technicalOutlines.value, sectionNode.value.id)
    selectedTechnicalLeaf.value = latest || selectedTechnicalLeaf.value
    technicalStep.value = Math.max(technicalStep.value, 5)
    ElMessage.success('本段生成完成')
  } finally {
    sectionGenerating.value = false
  }
}


function buildDefaultTechnicalOutlines() {
  const rich = technicalMode.value === 'RICH'
  const baseWordCount = rich ? 500 : 300
  return [
    {
      title: '第一章 技术方案完整性',
      children: [
        {
          title: '第一节 功能覆盖范围',
          children: [
            { title: '车辆预约与进厂核验', wordCount: baseWordCount },
            { title: '自动称重与皮重管理', wordCount: baseWordCount },
            { title: '毛重采集与净重计算', wordCount: baseWordCount },
            { title: '异常记录与处理机制', wordCount: baseWordCount }
          ]
        },
        {
          title: '第二节 系统架构',
          children: [
            { title: 'B/S架构设计', wordCount: baseWordCount },
            { title: '系统模块划分', wordCount: baseWordCount },
            { title: '高可用性与扩展性设计', wordCount: baseWordCount },
            { title: '数据安全与防护措施', wordCount: baseWordCount }
          ]
        }
      ]
    },
    {
      title: '第二章 实施计划与风险控制',
      children: [
        {
          title: '第一节 实施阶段',
          children: [
            { title: '项目启动与需求确认', wordCount: baseWordCount },
            { title: '系统部署与接口联调', wordCount: baseWordCount },
            { title: '现场测试与试运行', wordCount: baseWordCount }
          ]
        },
        {
          title: '第二节 风险识别与控制策略',
          children: [
            { title: '技术实施风险管控', wordCount: baseWordCount },
            { title: '数据迁移和接口风险控制', wordCount: baseWordCount },
            { title: '用户培训与验收保障', wordCount: baseWordCount }
          ]
        }
      ]
    },
    {
      title: '第三章 运维服务能力',
      children: [
        {
          title: '第一节 售后服务体系',
          children: [
            { title: '服务组织与响应机制', wordCount: baseWordCount },
            { title: '巡检维护与问题闭环', wordCount: baseWordCount },
            { title: '培训计划与持续改进', wordCount: baseWordCount }
          ]
        }
      ]
    }
  ]
}

function startPolling() {
  clearInterval(poller.value)
  poller.value = setInterval(async () => {
    if (!selectedProject.value?.id) return
    const hasParsing = projects.value.some((item) => ['PARSING', 'EXTRACTING'].includes(String(item.parseStatus || '').toUpperCase())) || isParseRunning.value
    if (!hasParsing) return
    const beforeSuccess = isParseSuccess.value
    await selectProject(selectedProject.value.id, false)
    await loadProjects(selectedProject.value.id)
    if (!beforeSuccess && isParseSuccess.value) {
      autoFillTechnicalRequirementAfterParse(true)
    } else {
      autoFillTechnicalRequirementAfterParse(false)
    }
  }, 3000)
}

function isOutlineGenerated(node) {
  return isTechnicalLeafDone(node)
}

function isOutlineFailed(node) {
  const status = String(node?.contentStatus || node?.section?.generateStatus || '').toUpperCase()
  return status === 'FAILED'
}

function outlineActualWordCount(node) {
  return Number(node?.actualWordCount || node?.section?.actualWordCount || 0)
}

function outlineTargetWordCount(node) {
  return Number(node?.targetWordCount || node?.wordCount || node?.section?.targetWordCount || 0)
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
          controls.push(h(ElSelect, { modelValue: node.targetWordCount || node.wordCount || 300, size: 'small', class: 'word-select', onChange: (v) => emit('word-change', { node, value: v }) }, () => wordOptions.map((n) => h(ElOption, { key: n, label: `${n}字`, value: n }))))
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
        controls.push(h('span', { class: 'count-text' }, `${outlineActualWordCount(node)} / ${outlineTargetWordCount(node)}字`))
        if (generated) {
          controls.push(h(ElTag, { size: 'small', type: 'success', effect: 'light' }, () => '已完成'))
          controls.push(h(ElButton, { size: 'small', type: 'warning', plain: true, onClick: (event) => { event.stopPropagation(); emit('section-generate', node) } }, () => '重编'))
        } else if (failed) {
          controls.push(h(ElTag, { size: 'small', type: 'danger', effect: 'light' }, () => '失败'))
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
  props: { nodes: { type: Array, default: () => [] }, streamingId: { type: [Number, String], default: null } },
  emits: ['ai-write', 'save'],
  setup(props, { emit }) {
    const renderNode = (node, depth = 0) => {
      const hasChildren = node.children?.length
      const children = hasChildren ? node.children.map((child) => renderNode(child, depth + 1)) : []
      const editor = !hasChildren ? h('div', { class: 'direction-editor', style: { marginLeft: `${depth * 20 + 28}px` } }, [
        h('div', { class: 'mini-card-title' }, [
          h('span', null, '编写方向：'),
          h(ElButton, { size: 'small', type: 'primary', loading: String(props.streamingId || '') === String(node.id || ''), onClick: () => emit('ai-write', node) }, () => 'AI帮写')
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
.ai-bid-page {
  display: grid;
  grid-template-columns: 268px minmax(0, 1fr);
  gap: 12px;
  width: 100%;
  height: 100%;
}

.project-pane,
.workspace {
  min-width: 0;
  min-height: 0;
  border-radius: 18px;
  background: #fff;
}

.project-pane {
  display: flex;
  flex-direction: column;
  padding: 14px;
}

.pane-title {
  font-size: 16px;
  font-weight: 800;
  color: #1f2937;
  margin-bottom: 14px;
}

.project-search {
  margin-bottom: 12px;
}

.project-scroll {
  flex: 1;
  min-height: 0;
}

.project-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.project-card {
  border: 1px solid #eef2ff;
  border-radius: 12px;
  overflow: hidden;
  background: #fff;
  transition: all 0.18s ease;
}

.project-card.active {
  border-color: #4f8cff;
  box-shadow: 0 10px 24px rgba(37, 99, 235, 0.1);
}

.project-main {
  position: relative;
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 12px 10px;
  cursor: pointer;
}

.project-dot {
  width: 10px;
  height: 10px;
  margin-top: 5px;
  border-radius: 50%;
  background: #ef4444;
  flex-shrink: 0;
}

.project-dot.success { background: #22c55e; }
.project-dot.warning { background: #f59e0b; }
.project-dot.danger { background: #ef4444; }

.project-info {
  min-width: 0;
  flex: 1;
}

.project-name {
  overflow: hidden;
  color: #2563eb;
  font-weight: 700;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.project-time {
  margin-top: 4px;
  color: #8a98ad;
  font-size: 12px;
}

.project-fold-btn,
.project-delete-btn {
  width: 26px;
  height: 26px;
  margin-top: -4px;
  color: #94a3b8;
}

.project-fold-btn {
  opacity: 1;
}

.fold-icon {
  color: #94a3b8;
  transition: transform 0.18s ease;
}

.fold-icon.collapsed {
  transform: rotate(-90deg);
}

.project-delete-btn {
  opacity: 0;
}

.project-card:hover .project-delete-btn,
.project-card.active .project-delete-btn {
  opacity: 1;
}

.project-delete-btn:hover {
  color: #ef4444;
  background: #fee2e2;
}

.project-fold-btn:hover {
  color: #2563eb;
  background: #eff6ff;
}

.doc-list {
  border-top: 1px solid #edf2f7;
  background: #f8fbff;
}

.doc-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 11px 12px;
  cursor: pointer;
  border-bottom: 1px solid #edf2f7;
}

.doc-row:hover,
.doc-row.active {
  background: #eaf2ff;
}

.doc-row.disabled {
  opacity: 0.75;
}

.doc-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: linear-gradient(135deg, #60a5fa, #2563eb);
  color: #fff;
  font-size: 10px;
  font-weight: 800;
}

.doc-info {
  min-width: 0;
}

.doc-title {
  color: #334155;
  font-weight: 700;
}

.doc-tags {
  display: flex;
  gap: 5px;
  margin-top: 4px;
}

.export-project-btn {
  width: calc(100% - 20px);
  margin: 10px;
}

.empty-project {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 260px;
  color: #8a98ad;
}

.empty-illustration {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 86px;
  height: 86px;
  border-radius: 28px;
  background: #eef5ff;
  color: #9bbcff;
  font-weight: 900;
  font-size: 28px;
}

.new-project-btn {
  width: 100%;
  height: 42px;
  border: 0;
  background: linear-gradient(90deg, #3b73ff, #7c4dff);
}

.workspace {
  position: relative;
  overflow: hidden;
  padding: 28px 40px;
}

.hero {
  max-width: 760px;
  margin: 40px auto 60px;
  text-align: center;
}

.hero h1 {
  margin: 0 0 20px;
  color: #1f2937;
  font-size: 32px;
}

.hero p {
  color: #4b5563;
  line-height: 2;
  font-size: 16px;
}

.feature-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 28px;
  max-width: 1120px;
  margin: 0 auto;
}

.feature-card {
  min-height: 300px;
  padding: 28px;
  border-radius: 24px;
  cursor: pointer;
  overflow: hidden;
  transition: all 0.2s ease;
}

.feature-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 18px 40px rgba(37, 99, 235, 0.12);
}

.feature-card h3 {
  margin: 0 0 18px;
  color: #1f2937;
  font-size: 22px;
}

.feature-card p {
  color: #475569;
  line-height: 1.8;
}

.feature-blue { background: #f1f5ff; }
.feature-red { background: #fff1f2; }
.feature-cyan { background: #eef8ff; }

.feature-img {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 72px;
  height: 72px;
  margin-top: 58px;
  border-radius: 22px;
  background: rgba(255,255,255,0.78);
  color: #3b82f6;
  font-size: 28px;
  font-weight: 900;
  box-shadow: 0 12px 28px rgba(37, 99, 235, 0.12);
}

.hero-new-btn {
  display: block;
  width: 150px;
  height: 44px;
  margin: 58px auto 0;
  border: 0;
  background: linear-gradient(90deg, #3b73ff, #7c4dff);
}

.doc-workspace {
  height: 100%;
  min-height: 0;
  overflow: auto;
}

.doc-head {
  display: flex;
  justify-content: space-between;
  gap: 18px;
  margin-bottom: 18px;
}

.doc-head h2 {
  margin: 0 0 8px;
  color: #1f2937;
}

.doc-head p {
  margin: 0;
  color: #64748b;
}

.parse-running {
  max-width: 720px;
  margin: 120px auto 0;
  text-align: center;
}

.parse-pending {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 360px;
}

.report-panel {
  padding: 18px;
  border-radius: 16px;
  background: #f8fafc;
  border: 1px solid #e5e7eb;
}

.report-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: center;
  color: #64748b;
  margin-bottom: 16px;
}

.report-text {
  min-height: 520px;
  padding: 18px;
  border-radius: 14px;
  background: #fff;
  white-space: pre-wrap;
  word-break: break-word;
  line-height: 1.8;
  color: #1f2937;
  border: 1px solid #e5e7eb;
}

.bid-doc-workspace {
  padding: 0;
  background: #eef2f7;
}

.word-toolbar {
  display: flex;
  align-items: center;
  gap: 10px;
  height: 48px;
  padding: 0 14px;
  background: #fff;
  border-bottom: 1px solid #e5e7eb;
}

.word-menu {
  height: 32px;
  padding: 6px 14px;
  color: #374151;
  background: #fff;
  border-bottom: 1px solid #e5e7eb;
}

.word-editor {
  height: calc(100% - 80px);
  overflow: auto;
  padding: 38px;
}

.paper {
  width: 760px;
  min-height: 920px;
  margin: 0 auto;
  padding: 70px;
  background: #fff;
  box-shadow: 0 8px 22px rgba(15, 23, 42, 0.12);
  color: #111827;
}

.paper h2 {
  text-align: center;
  margin-bottom: 32px;
}

.paper-tip {
  color: #64748b;
}

.tech-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 48%;
  gap: 14px;
  height: 100%;
  min-height: 0;
}

.tech-form,
.outline-preview {
  min-height: 0;
  overflow: auto;
  border-radius: 16px;
  background: #fff;
}

.step-bar {
  display: flex;
  gap: 14px;
  padding: 8px 0 18px;
  border-bottom: 1px solid #edf2f7;
}

.step {
  color: #8a98ad;
  font-weight: 700;
}

.step.active {
  color: #246bfe;
}

.form-section {
  margin-top: 18px;
}

.required-label {
  margin-bottom: 10px;
  color: #111827;
  font-weight: 800;
}

.required-label::before {
  content: '*';
  margin-right: 4px;
  color: #ef4444;
}

.type-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
}

.ai-card-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

.ai-card {
  padding: 16px;
  border-radius: 12px;
  border: 1px solid #dbe3ef;
  background: #fff;
}

.ai-card.active {
  border-color: #3b82f6;
  background: #eff6ff;
}

.ai-card h3 {
  margin: 0 0 8px;
}

.ai-card p {
  min-height: 48px;
  margin: 0 0 10px;
  color: #475569;
  line-height: 1.6;
}

.ai-card span {
  display: block;
  margin: 0 -16px -16px;
  padding: 9px;
  text-align: center;
  color: #64748b;
  background: #e8eefb;
}

.outline-preview {
  display: flex;
  flex-direction: column;
  border-left: 1px solid #e5e7eb;
}

.outline-head {
  display: flex;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid #e5e7eb;
}

.outline-head span {
  color: #f59e0b;
  font-size: 13px;
}

.outline-empty {
  flex: 1;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding-top: 52px;
  color: #a0aec0;
  background: #fbfdff;
}

.outline-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding: 14px 16px;
  border-top: 1px solid #e5e7eb;
}


.bid-tech-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  margin: -28px -40px;
  background: #fff;
}

.bid-tech-header {
  display: flex;
  align-items: center;
  gap: 14px;
  height: 54px;
  padding: 0 12px;
  border-bottom: 1px solid #e5e7eb;
}

.bid-tech-steps {
  display: flex;
  align-items: center;
  gap: 28px;
  flex: 1;
  min-width: 0;
}

.bid-tech-step {
  position: relative;
  display: flex;
  align-items: center;
  gap: 6px;
  color: #94a3b8;
  font-weight: 700;
  white-space: nowrap;
}

.bid-tech-step:not(:last-child)::after {
  content: '';
  width: 72px;
  height: 1px;
  margin-left: 12px;
  background: #d9dee8;
}

.bid-tech-step b {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  color: #fff;
  background: #cbd5e1;
}

.bid-tech-step.active {
  color: #2563eb;
}

.bid-tech-step.active b {
  background: #2f6df6;
}

.bid-tech-stats {
  padding: 14px 22px 12px;
  border-bottom: 1px solid #e5e7eb;
  background: #fff;
}

.tech-stat-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(220px, 1fr));
  gap: 8px 72px;
  max-width: 760px;
}

.tech-stat-item {
  display: flex;
  align-items: baseline;
  gap: 6px;
  color: #334155;
  font-size: 18px;
  font-weight: 700;
}

.tech-stat-item strong {
  font-size: 22px;
  font-weight: 900;
}

.tech-stat-item strong.danger {
  color: #ef4444;
}

.tech-stat-item strong.success {
  color: #16a34a;
}

.tech-stat-item em {
  color: #111827;
  font-style: normal;
  font-weight: 800;
}

.tech-stat-tip {
  margin-top: 8px;
  color: #94a3b8;
  font-size: 16px;
}

.bid-tech-body {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 48%;
  flex: 1;
  min-height: 0;
}

.bid-tech-left {
  min-width: 0;
  overflow: auto;
  padding: 22px 22px 80px;
  border-right: 1px solid #e5e7eb;
}

.bid-tech-right {
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
  background: #fbfdff;
}

.tech-form-section {
  margin-bottom: 20px;
}

.tech-label,
.tech-inline-title {
  margin-bottom: 10px;
  color: #111827;
  font-weight: 800;
}

.tech-label.required::before,
.tech-inline-title .required::before {
  content: '*';
  margin-right: 4px;
  color: #ef4444;
}

.tech-inline-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.tech-type-row {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 260px));
  gap: 12px;
}

.tech-select {
  width: 100%;
}

.tech-ai-levels {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

.tech-ai-card {
  overflow: hidden;
  cursor: pointer;
  border: 1px solid #dbe3ef;
  border-radius: 12px;
  background: #fff;
  transition: all 0.18s ease;
}

.tech-ai-card.active {
  border-color: #3b82f6;
  background: #eff6ff;
  box-shadow: 0 10px 22px rgba(37, 99, 235, 0.08);
}

.tech-ai-card strong {
  display: block;
  padding: 16px 16px 0;
  color: #1f2937;
  font-size: 17px;
}

.tech-ai-card p {
  min-height: 54px;
  margin: 8px 0 12px;
  padding: 0 16px;
  color: #475569;
  line-height: 1.55;
}

.tech-ai-card span {
  display: block;
  padding: 10px;
  color: #64748b;
  text-align: center;
  background: #e8eefb;
}

.tech-read-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 136px;
  border: 1px dashed #9bbcff;
  border-radius: 12px;
  background: #fbfdff;
  color: #64748b;
}

.tech-read-card.success {
  border-color: #86efac;
  background: #f0fdf4;
}

.tech-read-card.running {
  border-color: #fbbf24;
  background: #fffbeb;
}

.tech-read-icon {
  color: #3b82f6;
  font-size: 36px;
}

.tech-read-file {
  margin-top: 8px;
  color: #475569;
  font-weight: 700;
}

.tech-read-status {
  margin-top: 6px;
  color: #64748b;
  font-size: 13px;
}

.tech-read-actions {
  margin-top: 14px;
}

.tech-outline-mode {
  margin-bottom: 10px;
}

.tech-preview-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  height: 46px;
  padding: 0 16px;
  border-bottom: 1px solid #e5e7eb;
  background: #fff;
}

.tech-preview-head span {
  color: #f59e0b;
  font-size: 13px;
}

.tech-preview-scroll {
  flex: 1;
  min-height: 0;
}


.tech-outline-loading {
  min-height: 420px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  color: #4b5563;
  text-align: center;
}

.tech-outline-loading .el-icon {
  font-size: 34px;
  color: #2563eb;
}

.tech-outline-loading strong {
  font-size: 18px;
  color: #1f2937;
}

.tech-outline-loading p {
  max-width: 420px;
  margin: 0;
  line-height: 1.7;
  font-size: 14px;
  color: #64748b;
}

.tech-outline-tree {
  padding: 18px 20px 80px;
  color: #1f2937;
}

.outline-lv1,
.outline-lv2,
.outline-lv3 {
  display: flex;
  align-items: center;
  min-height: 32px;
  border-bottom: 1px dashed #edf2f7;
}

.outline-lv1 {
  font-size: 18px;
  font-weight: 900;
}

.outline-lv2 {
  padding-left: 22px;
  font-size: 16px;
  font-weight: 800;
}

.outline-lv3 {
  justify-content: space-between;
  padding-left: 48px;
  color: #475569;
}

.outline-lv3 em {
  color: #16a34a;
  font-style: normal;
  font-weight: 800;
}

.tech-outline-next-tip {
  padding: 10px 16px 0;
  font-size: 13px;
  color: #64748b;
  background: #fff;
}

.tech-preview-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding: 14px 16px;
  border-top: 1px solid #e5e7eb;
  background: #fff;
}

.tender-upload :deep(.el-upload-dragger) {
  height: 310px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.upload-icon {
  color: #94a3b8;
  font-size: 58px;
}

.upload-tip {
  margin-top: 10px;
  color: #64748b;
  text-align: center;
}

.selected-file {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 14px;
  color: #475569;
}

@media (max-width: 1280px) {
  .feature-grid,
  .tech-layout {
    grid-template-columns: 1fr;
  }
}

.tech-stats-inline {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 6px 16px;
  padding: 12px 16px;
  border-bottom: 1px solid #edf2f7;
  background: #fff;
  color: #334155;
  font-size: 13px;
}

.tech-stats-inline b {
  font-size: 16px;
  font-weight: 900;
}

.tech-stats-inline .red,
.tech-stats-inline b.red {
  color: #ef4444;
}

.tech-stats-inline .green,
.tech-stats-inline b.green {
  color: #16a34a;
}

.tech-stats-inline em {
  grid-column: 1 / -1;
  color: #94a3b8;
  font-style: normal;
}

.sticky-status {
  margin: 0;
  border-width: 0 0 1px;
  border-radius: 0;
  background: #fff;
}

.tech-leaf-row {
  cursor: pointer;
  transition: background 0.16s ease;
}

.tech-leaf-row:hover,
.tech-leaf-row.active {
  background: #eef6ff;
}

.tech-result-preview {
  margin: 10px 16px 0;
  border: 1px solid #e5e7eb;
  border-radius: 14px;
  overflow: hidden;
  background: #fff;
}

.result-preview-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  min-height: 42px;
  padding: 0 14px;
  border-bottom: 1px solid #edf2f7;
}

.result-preview-head strong {
  color: #1f2937;
}

.result-preview-head span {
  min-width: 0;
  overflow: hidden;
  color: #64748b;
  font-size: 13px;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.result-preview-body {
  max-height: 260px;
  overflow: auto;
  padding: 14px;
}

.result-preview-body pre {
  margin: 0;
  white-space: pre-wrap;
  word-break: break-word;
  line-height: 1.8;
  color: #1f2937;
  font-family: inherit;
}

.result-preview-empty {
  padding: 10px 0;
}

.section-form :deep(.el-form-item__label) {
  font-weight: 700;
}

.selected-kb-empty {
  width: 100%;
  padding: 10px 12px;
  border-radius: 10px;
  background: #f8fafc;
  color: #64748b;
  font-size: 13px;
}

/* ============================================================
   v26 修复：v25 折叠按钮补丁覆盖了 v24 的字体样式。
   这里放在 style 最末尾，专门覆盖 AI标书技术方案生成后区域，
   使标题、字数统计、正文预览继续贴近 AI方案详情页。
   ============================================================ */
.ai-bid-page .bid-tech-body.generated .tech-detail-top {
  padding: 18px 20px 12px !important;
}

.ai-bid-page .bid-tech-body.generated .tech-detail-top h2 {
  margin: 0 0 12px !important;
  font-size: 18px !important;
  line-height: 1.35 !important;
  font-weight: 800 !important;
  color: #06152b !important;
}

.ai-bid-page .bid-tech-body.generated .tech-detail-stats {
  display: grid !important;
  grid-template-columns: repeat(2, minmax(180px, 1fr)) !important;
  gap: 8px 40px !important;
  color: #334155 !important;
  font-size: 14px !important;
  line-height: 1.5 !important;
  font-weight: 500 !important;
}

.ai-bid-page .bid-tech-body.generated .tech-detail-stats b,
.ai-bid-page .bid-tech-body.generated .tech-detail-stats b.red,
.ai-bid-page .bid-tech-body.generated .tech-detail-stats b.green {
  font-size: inherit !important;
  line-height: inherit !important;
  font-weight: 700 !important;
}

.ai-bid-page .bid-tech-body.generated .tech-detail-stats .red {
  color: #ff4d4f !important;
}

.ai-bid-page .bid-tech-body.generated .tech-detail-stats .green {
  color: #16b91f !important;
}

.ai-bid-page .bid-tech-body.generated .tech-stat-note {
  margin-top: 10px !important;
  color: #94a3b8 !important;
  font-size: 14px !important;
  line-height: 1.5 !important;
  font-weight: 400 !important;
}

.ai-bid-page .bid-tech-body.generated .tech-result-panel.solution-like-result-panel {
  padding: 28px 32px !important;
  background: #fff !important;
}

.ai-bid-page .bid-tech-body.generated .solution-like-result-title {
  margin: 0 0 18px !important;
  font-size: 22px !important;
  line-height: 1.45 !important;
  font-weight: 800 !important;
  color: #06152b !important;
}

.ai-bid-page .bid-tech-body.generated .solution-like-result-body {
  height: calc(100vh - 190px) !important;
  padding: 0 !important;
  border: none !important;
  background: transparent !important;
}

.ai-bid-page .bid-tech-body.generated .solution-like-result-body pre {
  margin: 0 !important;
  font-size: 18px !important;
  line-height: 1.9 !important;
  color: #0f2747 !important;
  font-family: inherit !important;
  white-space: pre-wrap !important;
  word-break: break-word !important;
  overflow-wrap: anywhere !important;
}

</style>

<style scoped>
/* 追加：AI标书技术方案后续步骤样式。重复定义的类不会影响原布局，仅补充新区域。 */
.tech-generate-status {
  margin: 0 0 14px;
  padding: 14px;
  border-radius: 12px;
  background: #f8fbff;
  border: 1px solid #e5efff;
}

.tech-generate-summary {
  margin-top: 8px;
  color: #64748b;
  font-size: 13px;
}

.tech-leaf-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.tech-leaf-row > span {
  min-width: 0;
  flex: 1;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.tech-leaf-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.tech-leaf-meta em {
  color: #16a34a;
  font-style: normal;
  font-weight: 700;
}

.word-preset-panel {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.preset-tip,
.preset-auto-card,
.preset-group-card {
  border: 1px solid #e5e7eb;
  border-radius: 14px;
  background: #fff;
}

.preset-tip {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 14px 16px;
  background: #f8fbff;
}

.preset-tip strong {
  color: #1f2937;
  font-size: 15px;
}

.preset-tip span,
.preset-group-desc,
.preset-auto-card span {
  color: #64748b;
  font-size: 13px;
}

.preset-auto-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 16px;
  cursor: pointer;
}

.preset-auto-card.active {
  border-color: #3b82f6;
  background: #eff6ff;
}

.preset-auto-card > div {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.preset-groups {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
}

.preset-group-card {
  padding: 14px;
}

.preset-group-title {
  color: #1f2937;
  font-weight: 800;
}

.preset-word-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
  margin-top: 12px;
}

.preset-word-grid.small {
  grid-template-columns: repeat(1, minmax(0, 1fr));
}

.preset-word-grid button {
  height: 34px;
  border: 1px solid #dbe4f0;
  border-radius: 9px;
  background: #fff;
  color: #334155;
  cursor: pointer;
}

.preset-word-grid button.active {
  border-color: #3b82f6;
  background: #2563eb;
  color: #fff;
}
/* ============================================================
   v26 修复：v25 折叠按钮补丁覆盖了 v24 的字体样式。
   这里放在 style 最末尾，专门覆盖 AI标书技术方案生成后区域，
   使标题、字数统计、正文预览继续贴近 AI方案详情页。
   ============================================================ */
.ai-bid-page .bid-tech-body.generated .tech-detail-top {
  padding: 18px 20px 12px !important;
}

.ai-bid-page .bid-tech-body.generated .tech-detail-top h2 {
  margin: 0 0 12px !important;
  font-size: 18px !important;
  line-height: 1.35 !important;
  font-weight: 800 !important;
  color: #06152b !important;
}

.ai-bid-page .bid-tech-body.generated .tech-detail-stats {
  display: grid !important;
  grid-template-columns: repeat(2, minmax(180px, 1fr)) !important;
  gap: 8px 40px !important;
  color: #334155 !important;
  font-size: 14px !important;
  line-height: 1.5 !important;
  font-weight: 500 !important;
}

.ai-bid-page .bid-tech-body.generated .tech-detail-stats b,
.ai-bid-page .bid-tech-body.generated .tech-detail-stats b.red,
.ai-bid-page .bid-tech-body.generated .tech-detail-stats b.green {
  font-size: inherit !important;
  line-height: inherit !important;
  font-weight: 700 !important;
}

.ai-bid-page .bid-tech-body.generated .tech-detail-stats .red {
  color: #ff4d4f !important;
}

.ai-bid-page .bid-tech-body.generated .tech-detail-stats .green {
  color: #16b91f !important;
}

.ai-bid-page .bid-tech-body.generated .tech-stat-note {
  margin-top: 10px !important;
  color: #94a3b8 !important;
  font-size: 14px !important;
  line-height: 1.5 !important;
  font-weight: 400 !important;
}

.ai-bid-page .bid-tech-body.generated .tech-result-panel.solution-like-result-panel {
  padding: 28px 32px !important;
  background: #fff !important;
}

.ai-bid-page .bid-tech-body.generated .solution-like-result-title {
  margin: 0 0 18px !important;
  font-size: 22px !important;
  line-height: 1.45 !important;
  font-weight: 800 !important;
  color: #06152b !important;
}

.ai-bid-page .bid-tech-body.generated .solution-like-result-body {
  height: calc(100vh - 190px) !important;
  padding: 0 !important;
  border: none !important;
  background: transparent !important;
}

.ai-bid-page .bid-tech-body.generated .solution-like-result-body pre {
  margin: 0 !important;
  font-size: 18px !important;
  line-height: 1.9 !important;
  color: #0f2747 !important;
  font-family: inherit !important;
  white-space: pre-wrap !important;
  word-break: break-word !important;
  overflow-wrap: anywhere !important;
}

</style>

<style scoped>
/* v18：技术方案进入目录/正文阶段后，按 AI方案详情页布局展示：左侧目录，右侧结果预览。 */
.bid-tech-body.generated {
  grid-template-columns: minmax(0, 50%) minmax(0, 50%);
}

.bid-tech-body.generated .bid-tech-left {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  padding: 0;
}

.bid-tech-body.generated .bid-tech-right {
  background: #fff;
}

.tech-detail-panel {
  display: flex;
  flex-direction: column;
  min-height: 0;
  height: 100%;
  background: #fff;
}

.tech-detail-top {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  padding: 18px 22px 12px;
  border-bottom: 1px solid #edf2f7;
  background: #fff;
}

.tech-detail-top h2 {
  margin: 0 0 10px;
  color: #111827;
  font-size: 20px;
  font-weight: 900;
}

.tech-detail-stats {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px 28px;
  color: #334155;
  font-size: 15px;
  font-weight: 700;
}

.tech-detail-stats b {
  font-size: 20px;
  font-weight: 900;
}

.tech-detail-stats .red {
  color: #ef4444;
}

.tech-detail-stats .green {
  color: #16a34a;
}

.tech-stat-note {
  margin-top: 8px;
  color: #94a3b8;
  font-size: 13px;
}

.tech-detail-outline-head {
  flex-shrink: 0;
}

.tech-detail-panel .tech-generate-status {
  margin: 12px 16px;
  flex-shrink: 0;
}

.tech-detail-outline-scroll {
  flex: 1;
  min-height: 0;
}

.tech-outline-loading.compact {
  min-height: 280px;
}

.tech-result-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  background: #fff;
}

.result-main-head {
  height: 52px;
  flex-shrink: 0;
  padding: 0 18px;
}

.result-main-body {
  flex: 1;
  max-height: none;
  overflow: auto;
  padding: 22px 28px;
}

.result-main-body pre {
  font-size: 15px;
  line-height: 1.9;
}

.result-main-empty {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(180deg, #fbfdff 0%, #fff 100%);
}

.knowledge-setting {
  width: 100%;
}

.knowledge-actions {
  display: flex;
  gap: 10px;
  margin-bottom: 10px;
}

.selected-kb-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  min-height: 34px;
  padding: 8px 10px;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  background: #fff;
}

.knowledge-selector {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.knowledge-search-row {
  display: flex;
  gap: 10px;
}

.knowledge-check-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  max-height: 360px;
  overflow: auto;
}

.knowledge-check-card {
  padding: 12px 14px;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  background: #fff;
}

.knowledge-check-card:hover {
  border-color: #93c5fd;
  background: #f8fbff;
}

.kb-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.kb-name {
  color: #1f2937;
  font-weight: 800;
}

.kb-meta {
  color: #64748b;
  font-size: 13px;
}
/* ============================================================
   v26 修复：v25 折叠按钮补丁覆盖了 v24 的字体样式。
   这里放在 style 最末尾，专门覆盖 AI标书技术方案生成后区域，
   使标题、字数统计、正文预览继续贴近 AI方案详情页。
   ============================================================ */
.ai-bid-page .bid-tech-body.generated .tech-detail-top {
  padding: 18px 20px 12px !important;
}

.ai-bid-page .bid-tech-body.generated .tech-detail-top h2 {
  margin: 0 0 12px !important;
  font-size: 18px !important;
  line-height: 1.35 !important;
  font-weight: 800 !important;
  color: #06152b !important;
}

.ai-bid-page .bid-tech-body.generated .tech-detail-stats {
  display: grid !important;
  grid-template-columns: repeat(2, minmax(180px, 1fr)) !important;
  gap: 8px 40px !important;
  color: #334155 !important;
  font-size: 14px !important;
  line-height: 1.5 !important;
  font-weight: 500 !important;
}

.ai-bid-page .bid-tech-body.generated .tech-detail-stats b,
.ai-bid-page .bid-tech-body.generated .tech-detail-stats b.red,
.ai-bid-page .bid-tech-body.generated .tech-detail-stats b.green {
  font-size: inherit !important;
  line-height: inherit !important;
  font-weight: 700 !important;
}

.ai-bid-page .bid-tech-body.generated .tech-detail-stats .red {
  color: #ff4d4f !important;
}

.ai-bid-page .bid-tech-body.generated .tech-detail-stats .green {
  color: #16b91f !important;
}

.ai-bid-page .bid-tech-body.generated .tech-stat-note {
  margin-top: 10px !important;
  color: #94a3b8 !important;
  font-size: 14px !important;
  line-height: 1.5 !important;
  font-weight: 400 !important;
}

.ai-bid-page .bid-tech-body.generated .tech-result-panel.solution-like-result-panel {
  padding: 28px 32px !important;
  background: #fff !important;
}

.ai-bid-page .bid-tech-body.generated .solution-like-result-title {
  margin: 0 0 18px !important;
  font-size: 22px !important;
  line-height: 1.45 !important;
  font-weight: 800 !important;
  color: #06152b !important;
}

.ai-bid-page .bid-tech-body.generated .solution-like-result-body {
  height: calc(100vh - 190px) !important;
  padding: 0 !important;
  border: none !important;
  background: transparent !important;
}

.ai-bid-page .bid-tech-body.generated .solution-like-result-body pre {
  margin: 0 !important;
  font-size: 18px !important;
  line-height: 1.9 !important;
  color: #0f2747 !important;
  font-family: inherit !important;
  white-space: pre-wrap !important;
  word-break: break-word !important;
  overflow-wrap: anywhere !important;
}

</style>

<style scoped>
.tech-detail-kb {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  padding: 10px 16px;
  border-bottom: 1px solid #edf2f7;
  background: #fbfdff;
  color: #334155;
  font-size: 13px;
}

.tech-detail-kb > span {
  font-weight: 800;
}

.tech-detail-kb > em {
  color: #94a3b8;
  font-style: normal;
}

.selected-kb-list.compact {
  flex: 1;
  min-width: 220px;
  min-height: 30px;
  padding: 4px 8px;
}
/* ============================================================
   v26 修复：v25 折叠按钮补丁覆盖了 v24 的字体样式。
   这里放在 style 最末尾，专门覆盖 AI标书技术方案生成后区域，
   使标题、字数统计、正文预览继续贴近 AI方案详情页。
   ============================================================ */
.ai-bid-page .bid-tech-body.generated .tech-detail-top {
  padding: 18px 20px 12px !important;
}

.ai-bid-page .bid-tech-body.generated .tech-detail-top h2 {
  margin: 0 0 12px !important;
  font-size: 18px !important;
  line-height: 1.35 !important;
  font-weight: 800 !important;
  color: #06152b !important;
}

.ai-bid-page .bid-tech-body.generated .tech-detail-stats {
  display: grid !important;
  grid-template-columns: repeat(2, minmax(180px, 1fr)) !important;
  gap: 8px 40px !important;
  color: #334155 !important;
  font-size: 14px !important;
  line-height: 1.5 !important;
  font-weight: 500 !important;
}

.ai-bid-page .bid-tech-body.generated .tech-detail-stats b,
.ai-bid-page .bid-tech-body.generated .tech-detail-stats b.red,
.ai-bid-page .bid-tech-body.generated .tech-detail-stats b.green {
  font-size: inherit !important;
  line-height: inherit !important;
  font-weight: 700 !important;
}

.ai-bid-page .bid-tech-body.generated .tech-detail-stats .red {
  color: #ff4d4f !important;
}

.ai-bid-page .bid-tech-body.generated .tech-detail-stats .green {
  color: #16b91f !important;
}

.ai-bid-page .bid-tech-body.generated .tech-stat-note {
  margin-top: 10px !important;
  color: #94a3b8 !important;
  font-size: 14px !important;
  line-height: 1.5 !important;
  font-weight: 400 !important;
}

.ai-bid-page .bid-tech-body.generated .tech-result-panel.solution-like-result-panel {
  padding: 28px 32px !important;
  background: #fff !important;
}

.ai-bid-page .bid-tech-body.generated .solution-like-result-title {
  margin: 0 0 18px !important;
  font-size: 22px !important;
  line-height: 1.45 !important;
  font-weight: 800 !important;
  color: #06152b !important;
}

.ai-bid-page .bid-tech-body.generated .solution-like-result-body {
  height: calc(100vh - 190px) !important;
  padding: 0 !important;
  border: none !important;
  background: transparent !important;
}

.ai-bid-page .bid-tech-body.generated .solution-like-result-body pre {
  margin: 0 !important;
  font-size: 18px !important;
  line-height: 1.9 !important;
  color: #0f2747 !important;
  font-family: inherit !important;
  white-space: pre-wrap !important;
  word-break: break-word !important;
  overflow-wrap: anywhere !important;
}

</style>


<style scoped>
/* v19：目录/正文阶段严格贴近 AI方案详情页：无步骤条，左目录右结果，知识库进入“方案设置”弹窗。 */
.bid-tech-body.generated {
  height: 100%;
}

.tech-detail-top > .el-button {
  flex-shrink: 0;
  align-self: flex-start;
}

.detail-actions-like-solution {
  justify-content: stretch;
  gap: 14px;
  padding: 14px 16px;
}

.detail-actions-like-solution .el-button {
  flex: 1;
  height: 44px;
  font-size: 15px;
  font-weight: 800;
}

.full-generate-form .knowledge-setting {
  width: 100%;
}

.blind-setting {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.blind-rule-input {
  width: 100%;
}

.style-radio-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(110px, 1fr));
  gap: 10px;
  width: 100%;
}

.style-radio-grid :deep(.el-radio-button__inner) {
  width: 100%;
}

/* AI标书-技术方案：生成后布局按 AI方案详情页压缩成“左目录 + 右结果” */
.solution-like-progress-wrap {
  padding: 8px 0 14px;
  border-bottom: 1px solid #eef2f8;
}

.solution-like-progress-meta {
  display: flex;
  align-items: center;
  gap: 18px;
  margin-bottom: 8px;
  color: #7b8798;
  font-size: 13px;
}

.solution-like-progress :deep(.el-progress-bar__outer) {
  background: #edf1f7;
}

.solution-like-progress :deep(.el-progress-bar__inner) {
  background: linear-gradient(90deg, #ff4d4f, #ff5f6d);
}

.solution-like-result-panel {
  padding: 34px 34px 28px;
}

.solution-like-result-title {
  margin-bottom: 24px;
  font-size: 20px;
  font-weight: 800;
  color: #162033;
}

.solution-like-result-body {
  height: calc(100vh - 190px);
  padding: 0;
  border: none;
  background: transparent;
}

.solution-like-result-body pre {
  font-size: 16px;
  line-height: 2.05;
  color: #29364a;
}

/* ============================================================
   v26 修复：v25 折叠按钮补丁覆盖了 v24 的字体样式。
   这里放在 style 最末尾，专门覆盖 AI标书技术方案生成后区域，
   使标题、字数统计、正文预览继续贴近 AI方案详情页。
   ============================================================ */
.ai-bid-page .bid-tech-body.generated .tech-detail-top {
  padding: 18px 20px 12px !important;
}

.ai-bid-page .bid-tech-body.generated .tech-detail-top h2 {
  margin: 0 0 12px !important;
  font-size: 18px !important;
  line-height: 1.35 !important;
  font-weight: 800 !important;
  color: #06152b !important;
}

.ai-bid-page .bid-tech-body.generated .tech-detail-stats {
  display: grid !important;
  grid-template-columns: repeat(2, minmax(180px, 1fr)) !important;
  gap: 8px 40px !important;
  color: #334155 !important;
  font-size: 14px !important;
  line-height: 1.5 !important;
  font-weight: 500 !important;
}

.ai-bid-page .bid-tech-body.generated .tech-detail-stats b,
.ai-bid-page .bid-tech-body.generated .tech-detail-stats b.red,
.ai-bid-page .bid-tech-body.generated .tech-detail-stats b.green {
  font-size: inherit !important;
  line-height: inherit !important;
  font-weight: 700 !important;
}

.ai-bid-page .bid-tech-body.generated .tech-detail-stats .red {
  color: #ff4d4f !important;
}

.ai-bid-page .bid-tech-body.generated .tech-detail-stats .green {
  color: #16b91f !important;
}

.ai-bid-page .bid-tech-body.generated .tech-stat-note {
  margin-top: 10px !important;
  color: #94a3b8 !important;
  font-size: 14px !important;
  line-height: 1.5 !important;
  font-weight: 400 !important;
}

.ai-bid-page .bid-tech-body.generated .tech-result-panel.solution-like-result-panel {
  padding: 28px 32px !important;
  background: #fff !important;
}

.ai-bid-page .bid-tech-body.generated .solution-like-result-title {
  margin: 0 0 18px !important;
  font-size: 22px !important;
  line-height: 1.45 !important;
  font-weight: 800 !important;
  color: #06152b !important;
}

.ai-bid-page .bid-tech-body.generated .solution-like-result-body {
  height: calc(100vh - 190px) !important;
  padding: 0 !important;
  border: none !important;
  background: transparent !important;
}

.ai-bid-page .bid-tech-body.generated .solution-like-result-body pre {
  margin: 0 !important;
  font-size: 18px !important;
  line-height: 1.9 !important;
  color: #0f2747 !important;
  font-family: inherit !important;
  white-space: pre-wrap !important;
  word-break: break-word !important;
  overflow-wrap: anywhere !important;
}



/* ============================================================
   v27：目录树区域严格贴近 AI方案详情页。
   只调整目录区样式，不改操作流程、不改接口、不改折叠/删除逻辑。
   ============================================================ */
.ai-bid-page .bid-tech-body.generated .solution-like-progress-wrap {
  padding: 12px 20px 12px !important;
  border-bottom: 0 !important;
  background: #fff !important;
  flex-shrink: 0 !important;
}

.ai-bid-page .bid-tech-body.generated .solution-like-progress-meta {
  display: none !important;
}

.ai-bid-page .bid-tech-body.generated .solution-like-progress :deep(.el-progress-bar__outer) {
  height: 6px !important;
  border-radius: 999px !important;
  background: #edf1f7 !important;
}

.ai-bid-page .bid-tech-body.generated .solution-like-progress :deep(.el-progress-bar__inner) {
  border-radius: 999px !important;
  background: #ff4d4f !important;
}

.ai-bid-page .bid-tech-body.generated .tech-detail-outline-scroll {
  flex: 1 !important;
  min-height: 0 !important;
  padding: 0 20px 0 !important;
  box-sizing: border-box !important;
}

.ai-bid-page .bid-tech-body.generated .tech-outline-tree {
  padding: 0 0 80px !important;
  color: #334155 !important;
  font-size: 15px !important;
  line-height: 1.45 !important;
}

.ai-bid-page .bid-tech-body.generated .outline-lv1,
.ai-bid-page .bid-tech-body.generated .outline-lv2,
.ai-bid-page .bid-tech-body.generated .outline-lv3 {
  display: flex !important;
  align-items: center !important;
  min-height: 36px !important;
  border-bottom: 1px dashed #e5e7eb !important;
  box-sizing: border-box !important;
}

.ai-bid-page .bid-tech-body.generated .outline-lv1 {
  padding-left: 0 !important;
  color: #334155 !important;
  font-size: 15px !important;
  font-weight: 700 !important;
}

.ai-bid-page .bid-tech-body.generated .outline-lv2 {
  padding-left: 20px !important;
  color: #334155 !important;
  font-size: 15px !important;
  font-weight: 700 !important;
}

.ai-bid-page .bid-tech-body.generated .outline-lv3 {
  justify-content: space-between !important;
  gap: 8px !important;
  padding-left: 40px !important;
  color: #6b7280 !important;
  font-size: 15px !important;
  font-weight: 400 !important;
}

.ai-bid-page .bid-tech-body.generated .outline-lv1::before,
.ai-bid-page .bid-tech-body.generated .outline-lv2::before,
.ai-bid-page .bid-tech-body.generated .outline-lv3::before {
  display: inline-block !important;
  width: 16px !important;
  margin-right: 8px !important;
  color: #ef4444 !important;
  text-align: center !important;
  flex-shrink: 0 !important;
}

.ai-bid-page .bid-tech-body.generated .outline-lv1::before,
.ai-bid-page .bid-tech-body.generated .outline-lv2::before {
  content: '▾' !important;
  font-size: 12px !important;
}

.ai-bid-page .bid-tech-body.generated .outline-lv3::before {
  content: '•' !important;
  font-size: 14px !important;
}

.ai-bid-page .bid-tech-body.generated .tech-leaf-row > span {
  flex: 1 !important;
  min-width: 0 !important;
  overflow: hidden !important;
  text-overflow: ellipsis !important;
  white-space: nowrap !important;
  color: inherit !important;
  font-size: inherit !important;
  font-weight: inherit !important;
}

.ai-bid-page .bid-tech-body.generated .tech-leaf-meta {
  display: flex !important;
  align-items: center !important;
  gap: 8px !important;
  flex-shrink: 0 !important;
}

.ai-bid-page .bid-tech-body.generated .tech-leaf-meta em {
  min-width: 82px !important;
  color: #22c55e !important;
  font-size: 15px !important;
  line-height: 1.4 !important;
  font-style: normal !important;
  font-weight: 700 !important;
  text-align: right !important;
}

.ai-bid-page .bid-tech-body.generated .tech-leaf-meta :deep(.el-tag) {
  height: 24px !important;
  padding: 0 8px !important;
  font-size: 12px !important;
  font-weight: 400 !important;
}

.ai-bid-page .bid-tech-body.generated .tech-leaf-meta :deep(.el-button) {
  height: 24px !important;
  padding: 0 4px !important;
  font-size: 12px !important;
  font-weight: 400 !important;
}

.ai-bid-page .bid-tech-body.generated .tech-leaf-row:hover,
.ai-bid-page .bid-tech-body.generated .tech-leaf-row.active {
  background: #f8fafc !important;
}

.ai-bid-page .bid-tech-body.generated .tech-outline-next-tip {
  padding: 8px 20px 0 !important;
  color: #64748b !important;
  font-size: 13px !important;
  background: #fff !important;
  border-top: 0 !important;
  flex-shrink: 0 !important;
}


/* AI标书技术方案编辑区：直接复用 AI方案页面的交互样式 */
.ai-solution-like-detail {
  height: 100%;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.edit-tabs {
  height: 54px;
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  border-bottom: 1px solid #e5e7eb;
  flex-shrink: 0;
}
.edit-tabs button {
  border: 0;
  background: #fff;
  font-size: 16px;
  cursor: pointer;
  position: relative;
}
.edit-tabs button.active {
  color: #2f6bff;
  font-weight: 700;
}
.edit-tabs button.active::after {
  content: '';
  position: absolute;
  left: 24%;
  right: 24%;
  bottom: 0;
  height: 3px;
  background: #2f6bff;
  border-radius: 3px 3px 0 0;
}
.edit-scroll {
  flex: 1;
  padding: 14px 18px;
}
.edit-section {
  min-height: 100%;
}
.delete-bar {
  text-align: center;
  margin: 10px 0 18px;
}
.overall-card {
  background: #f7f8fa;
  padding: 12px;
  border-radius: 12px;
  margin-bottom: 14px;
}
.card-title,
.mini-card-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 8px;
  font-weight: 700;
}
.mini-card-title.second {
  margin-top: 10px;
}
.outline-tree {
  color: #334155;
  font-size: 15px;
}
.tree-row {
  display: flex;
  align-items: center;
  min-height: 36px;
  border-bottom: 1px dashed #e5e7eb;
  gap: 8px;
}
.tree-row.clickable {
  cursor: pointer;
}
.tree-row.clickable:hover {
  background: #f8fafc;
}
.tree-dot {
  width: 16px;
  color: #ef4444;
  text-align: center;
  flex-shrink: 0;
}
.tree-title {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.tree-title.parent {
  color: #334155;
  font-weight: 700;
}
.tree-title.leaf {
  color: #6b7280;
  font-weight: 400;
}
.tree-controls {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  flex-shrink: 0;
}
.word-select {
  width: 104px;
}
.count-text {
  min-width: 88px;
  color: #22c55e;
  font-weight: 700;
  text-align: right;
}
.direction-editor {
  background: #fff;
  border-radius: 10px;
  padding: 12px;
  margin-bottom: 10px;
  box-shadow: 0 1px 5px rgba(15, 23, 42, .06);
}
.title-input {
  flex: 1;
}
.section-preview {
  height: 100%;
  padding: 28px 32px;
  box-sizing: border-box;
  background: #fff;
}
.section-preview-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 18px;
}
.section-preview-head h3 {
  margin: 0;
  color: #06152b;
  font-size: 22px;
  line-height: 1.45;
  font-weight: 800;
}
.section-preview-actions {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}
.section-content-preview {
  font-size: 18px;
  line-height: 1.9;
  color: #0f2747;
  white-space: pre-wrap;
  word-break: break-word;
  overflow-wrap: anywhere;
}
.section-content-editor :deep(.el-textarea__inner) {
  font-size: 16px;
  line-height: 1.8;
  color: #0f2747;
}
.ai-bid-page .bid-tech-body.generated {
  grid-template-columns: minmax(500px, 0.95fr) minmax(560px, 1.25fr) !important;
}
.ai-bid-page .bid-tech-body.generated .tech-detail-outline-scroll {
  flex: 1;
  min-height: 0;
  padding: 12px 20px 0 !important;
  box-sizing: border-box;
}
.ai-bid-page .bid-tech-body.generated .solution-like-progress {
  margin-bottom: 14px;
}
</style>

<style scoped>
/* ============================================================
   AI标书技术方案编辑树样式修复
   说明：OutlineTree / WritingDirectionEditor 是当前 SFC 内部 defineComponent 组件，
   普通 scoped 选择器不会穿透到子组件内部渲染出来的 .tree-row / .tree-title。
   所以这里必须使用 :deep()，否则会出现目录树变成普通文字、控件挤在一起的问题。
   ============================================================ */
.ai-bid-page .tech-detail-panel.ai-solution-like-detail :deep(.outline-tree),
.ai-bid-page .tech-detail-panel.ai-solution-like-detail :deep(.writing-direction-tree) {
  font-size: 15px !important;
  color: #334155 !important;
}

.ai-bid-page .tech-detail-panel.ai-solution-like-detail :deep(.tree-node-wrap) {
  width: 100% !important;
}

.ai-bid-page .tech-detail-panel.ai-solution-like-detail :deep(.tree-row) {
  display: flex !important;
  align-items: center !important;
  gap: 8px !important;
  min-height: 36px !important;
  border-bottom: 1px dashed #e5e7eb !important;
  color: #6b7280 !important;
  box-sizing: border-box !important;
}

.ai-bid-page .tech-detail-panel.ai-solution-like-detail :deep(.tree-row.clickable) {
  cursor: pointer !important;
}

.ai-bid-page .tech-detail-panel.ai-solution-like-detail :deep(.tree-row.clickable:hover) {
  background: #f8fafc !important;
}

.ai-bid-page .tech-detail-panel.ai-solution-like-detail :deep(.tree-dot) {
  width: 16px !important;
  min-width: 16px !important;
  text-align: center !important;
  color: #ef4444 !important;
  flex-shrink: 0 !important;
}

.ai-bid-page .tech-detail-panel.ai-solution-like-detail :deep(.tree-title) {
  flex: 1 !important;
  min-width: 0 !important;
  overflow: hidden !important;
  text-overflow: ellipsis !important;
  white-space: nowrap !important;
}

.ai-bid-page .tech-detail-panel.ai-solution-like-detail :deep(.tree-title.parent) {
  color: #334155 !important;
  font-weight: 700 !important;
}

.ai-bid-page .tech-detail-panel.ai-solution-like-detail :deep(.tree-title.leaf) {
  color: #6b7280 !important;
  font-weight: 400 !important;
}

.ai-bid-page .tech-detail-panel.ai-solution-like-detail :deep(.tree-controls) {
  margin-left: auto !important;
  display: flex !important;
  align-items: center !important;
  justify-content: flex-end !important;
  gap: 8px !important;
  flex-shrink: 0 !important;
}

.ai-bid-page .tech-detail-panel.ai-solution-like-detail :deep(.word-select) {
  width: 110px !important;
}

.ai-bid-page .tech-detail-panel.ai-solution-like-detail :deep(.count-text) {
  color: #22c55e !important;
  min-width: 78px !important;
  text-align: right !important;
  font-weight: 700 !important;
}

.ai-bid-page .tech-detail-panel.ai-solution-like-detail :deep(.simple-level) {
  color: #9ca3af !important;
  font-size: 12px !important;
}

.ai-bid-page .tech-detail-panel.ai-solution-like-detail :deep(.direction-editor) {
  background: #fff !important;
  border-radius: 10px !important;
  padding: 12px !important;
  margin-bottom: 10px !important;
  box-shadow: 0 1px 5px rgba(15, 23, 42, .06) !important;
}

.ai-bid-page .tech-detail-panel.ai-solution-like-detail :deep(.direction-node) {
  width: 100% !important;
}

.ai-bid-page .tech-detail-panel.ai-solution-like-detail :deep(.title-input) {
  flex: 1 !important;
  min-width: 0 !important;
}

.ai-bid-page .tech-detail-panel.ai-solution-like-detail :deep(.mini-card-title) {
  display: flex !important;
  align-items: center !important;
  justify-content: space-between !important;
  gap: 10px !important;
  margin-bottom: 8px !important;
  font-weight: 700 !important;
}

.ai-bid-page .tech-detail-panel.ai-solution-like-detail :deep(.mini-card-title.second) {
  margin-top: 12px !important;
}
</style>
