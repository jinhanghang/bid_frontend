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

      <el-scrollbar ref="projectListScrollbar" class="project-scroll" v-loading="projectLoading && projects.length === 0" @scroll="onProjectListScroll">
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
                <div class="project-status-summary">{{ projectStatusSummary(project) }}</div>
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
          <div v-if="projects.length" class="project-list-load-state">
            <span v-if="projectAppendLoading">正在加载更多...</span>
            <span v-else-if="projectNoMore">—没有更多项目了—</span>
            <span v-else>下滑加载更多</span>
          </div>
        </div>
        <div v-else-if="!projectLoading" class="empty-project">
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

            <div class="auto-fill-basic-card">
              <div>
                <strong>项目信息自动回填</strong>
                <p>从解析结果中识别项目名称、采购人、预算金额、投标截止时间、开标时间、工期等信息，只补充当前为空的字段。</p>
              </div>
              <el-button
                type="primary"
                plain
                :loading="autoFillLoading"
                @click="autoFillProjectBasicInfo"
              >
                自动回填项目信息
              </el-button>
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
          <div class="doc-head bid-doc-head">
            <div>
              <h2>投标文件</h2>
              <p>先关联企业资料档案，再结合解析报告自动生成商务标基础内容。</p>
            </div>
            <div class="bid-doc-actions">
              <el-button :icon="Refresh" @click="refreshBidDocument">刷新</el-button>
              <el-button plain @click="openCompanyMaterialSelector">选择资料档案</el-button>
              <el-button
                type="primary"
                :loading="bidDocumentFilling"
                :disabled="!canFillBidDocument"
                @click="smartFillBidDocument"
              >智能填空</el-button>
            </div>
          </div>

          <div class="bid-doc-status-grid">
            <div class="bid-doc-status-card" :class="{ success: isParseSuccess }">
              <strong>招标解析</strong>
              <span>{{ parseStatusLabel }}</span>
              <p>{{ isParseSuccess ? '已完成读标，可用于商务标填空。' : '请先在解析报告中完成读标。' }}</p>
            </div>
            <div class="bid-doc-status-card" :class="{ success: hasCompanyMaterial }">
              <strong>企业资料</strong>
              <span>{{ selectedProject?.companyMaterialName || '未关联' }}</span>
              <p>{{ hasCompanyMaterial ? '将作为商务标和技术方案生成的企业资料来源。' : '请从资料库选择当前项目所属企业的资料档案。' }}</p>
            </div>
            <div class="bid-doc-status-card" :class="{ success: bidDocumentContent }">
              <strong>智能填空</strong>
              <span>{{ bidDocumentStatusLabel }}</span>
              <p>{{ bidDocumentContent ? '已生成内容，可继续调整并保存。' : '生成后将在下方显示 Markdown 内容。' }}</p>
            </div>
          </div>

          <div class="company-material-ref-card">
            <div>
              <strong>企业资料引用</strong>
              <p v-if="hasCompanyMaterial">
                已关联：{{ selectedProject?.companyMaterialName }}
                <span v-if="selectedProject?.companyMaterialEnterpriseName">（{{ selectedProject.companyMaterialEnterpriseName }}）</span>
              </p>
              <p v-else>当前项目尚未关联企业资料档案，商务标智能填空会缺少企业资质、业绩、人员、财务等信息。</p>
            </div>
            <div class="company-material-actions">
              <el-button type="primary" plain @click="openCompanyMaterialSelector">{{ hasCompanyMaterial ? '更换资料' : '选择资料' }}</el-button>
              <el-button v-if="hasCompanyMaterial" type="danger" plain @click="unbindSelectedCompanyMaterial">解除关联</el-button>
            </div>
          </div>

          <div class="bid-doc-editor-card">
            <div class="bid-doc-editor-head">
              <div>
                <strong>投标文件智能填空结果</strong>
                <p>第一版以 Markdown 形式保存商务标基础内容，后续可接 Word 导出和在线编辑。</p>
              </div>
              <el-button
                type="primary"
                plain
                :loading="bidDocumentSaving"
                :disabled="!bidDocumentDraft.trim()"
                @click="saveBidDocumentDraft"
              >保存内容</el-button>
            </div>
            <el-input
              v-model="bidDocumentDraft"
              type="textarea"
              :rows="18"
              maxlength="200000"
              show-word-limit
              placeholder="点击“智能填空”后，系统会根据解析报告和企业资料生成投标文件基础内容。"
            />
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
                      <el-option v-for="sub in technicalSubTypes" :key="sub" :label="sub" :value="sub" />
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
                    </div>
                  </div>
                </div>

                <div class="tech-form-section">
                  <div class="tech-label">智能读取：</div>
                  <div class="tech-read-card" :class="{ success: isParseSuccess, running: isParseRunning, empty: !hasTenderFile }">
                    <el-icon class="tech-read-icon"><Document /></el-icon>
                    <div class="tech-read-file">{{ tenderFileDisplayName }}</div>
                    <div class="tech-read-status">
                      <template v-if="!hasTenderFile">当前项目未上传招标文件，请先上传招标文件，或选择上传流程创建的项目</template>
                      <template v-else-if="isParseRunning">{{ workflow?.parseTask?.message || '正在解析招标文件' }} {{ parseProgress || 0 }}%</template>
                      <template v-else-if="isParseSuccess">解析报告已完成，已自动带入采购需求和评分标准</template>
                      <template v-else>尚未读标，可先手工录入采购需求，也可以直接点击下方按钮开始解析</template>
                    </div>
                    <div class="tech-read-actions">
                      <input
                        ref="technicalTenderInputRef"
                        class="hidden-file-input"
                        type="file"
                        accept=".doc,.docx,.pdf,.DOC,.DOCX,.PDF"
                        @change="onTechnicalTenderFileChange"
                      />
                      <el-button
                        v-if="!hasTenderFile"
                        type="primary"
                        plain
                        :loading="technicalTenderUploading"
                        :disabled="!selectedProject?.id"
                        @click="triggerTechnicalTenderUpload"
                      >
                        上传招标文件
                      </el-button>
                      <el-button
                        v-else-if="!isParseSuccess"
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
                  <div class="tech-inline-title">
                    <span>生成目录参考知识库：</span>
                    <el-tag v-if="selectedKnowledgeBases.length" size="small" type="primary">已选 {{ selectedKnowledgeBases.length }} 个</el-tag>
                  </div>
                  <div class="knowledge-setting">
                    <div class="knowledge-actions">
                      <el-button :disabled="isCurrentTechnicalOutlineGenerating" @click="goKnowledgeBasePage">上传</el-button>
                      <el-button :disabled="isCurrentTechnicalOutlineGenerating" @click="openKnowledgeSelector('full')">从知识库选择</el-button>
                    </div>
                    <div v-if="selectedKnowledgeBases.length" class="selected-kb-list">
                      <el-tag
                        v-for="kb in selectedKnowledgeBases"
                        :key="kb.id"
                        :closable="!isCurrentTechnicalOutlineGenerating"
                        @close="removeSelectedKnowledgeBase(kb.id, 'full')"
                      >
                        {{ kb.kbName }}
                      </el-tag>
                    </div>
                    <div v-else class="selected-kb-empty">未选择知识库，生成目录时不会额外引用知识库资料</div>
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
                      <el-empty v-else-if="!technicalOutlines.length" description="暂无目录，请在左侧完善采购需求，点击下方生成按钮" />
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
                      {{ technicalStep >= 5 ? '正文生成完成后，可点击章节查看结果，也可导出 Word 或 PDF。切换页面不会丢失生成进度。' : '目录已生成。请先设置篇幅，再开始生成正文。切换页面不会丢失结果。' }}
                    </div>

                    <div class="tech-preview-actions detail-actions-like-solution">
                      <el-button class="detail-action-btn" size="large" plain :disabled="!technicalSolution?.id || isTechnicalBusy" @click="openTechnicalVersionDialog">历史版本</el-button>
                      <el-button class="detail-action-btn" size="large" plain :disabled="!technicalSolution?.id || isTechnicalBusy" @click="showTechnicalWordCountCheck">字数检查</el-button>
                      <el-button class="detail-action-btn" size="large" plain :disabled="!technicalSolution?.id || isTechnicalBusy" @click="showTechnicalQualityCheck">质量检查</el-button>
                      <el-button class="detail-action-btn" size="large" plain :disabled="!technicalSolution?.id || isTechnicalBusy" @click="showTechnicalDuplicateCheck">重复检查</el-button>
                      <el-button class="detail-action-btn" size="large" plain :disabled="!technicalSolution?.id || isTechnicalBusy" @click="reviewTechnicalByAi">AI审稿</el-button>
                      <el-button class="detail-action-btn" size="large" type="primary" plain :disabled="!canRewriteTechnicalAll" @click="openTechnicalFullGenerateDialog('REWRITE')" :loading="fullGenerating || isTechnicalRunningByBackend">{{ isTechnicalRewriteRunning ? '重编中...' : '重编全文' }}</el-button>
                      <el-button class="detail-action-btn" size="large" type="primary" :disabled="!canGenerateTechnicalContent" @click="openTechnicalFullGenerateDialog('GENERATE')" :loading="fullGenerating || isTechnicalRunningByBackend">{{ technicalGenerateButtonText }}</el-button>
                      <el-button class="detail-action-btn" size="large" type="primary" plain :loading="exportingWord" :disabled="!canExportTechnicalWord" @click="exportTechnical">导出</el-button>
                    </div>
                  </template>
                </div>
              </template>
            </div>

            <div class="bid-tech-right">
              <template v-if="technicalGeneratedView">
                <div v-if="selectedTechnicalLeafDisplayContent" class="section-preview tech-section-preview">
                  <div class="section-preview-head">
                    <div class="section-preview-title">
                      <h3>{{ selectedTechnicalLeaf ? selectedTechnicalLeaf.title : '结果预览' }}</h3>
                      <div v-if="selectedTechnicalLeaf" class="section-preview-meta">
                        <span :class="['word-health-text', technicalWordHealthClass(selectedTechnicalLeaf)]">{{ technicalSectionContentEditMode ? technicalSectionEditorWordCount : outlineActualWordCount(selectedTechnicalLeaf) }} / {{ outlineTargetWordCount(selectedTechnicalLeaf) || '-' }} 字</span>
                        <el-tag v-if="!technicalSectionContentEditMode && technicalWordHealthLabel(selectedTechnicalLeaf)" size="small" :type="technicalWordHealthType(selectedTechnicalLeaf)" effect="light">{{ technicalWordHealthLabel(selectedTechnicalLeaf) }}</el-tag>
                        <el-tag v-if="technicalSectionContentEditMode" size="small" :type="technicalSectionContentDirty ? 'warning' : 'info'" effect="light">{{ technicalSectionContentDirty ? '有未保存修改' : '编辑中' }}</el-tag>
                        <el-tag v-else size="small" :type="technicalNodeStatusType(selectedTechnicalLeaf)">{{ technicalNodeStatusLabel(selectedTechnicalLeaf) }}</el-tag>
                      </div>
                    </div>
                    <div class="section-preview-actions">
                      <template v-if="technicalSectionContentEditMode">
                        <el-button size="small" :disabled="technicalSectionContentSaving" @click="cancelEditTechnicalSectionContent">取消</el-button>
                        <el-button size="small" type="primary" :loading="technicalSectionContentSaving" :disabled="!technicalSectionContentDirty" @click="saveTechnicalSectionContent">保存</el-button>
                      </template>
                      <template v-else>
                        <el-button
                          size="small"
                          plain
                          :disabled="!canCopyTechnicalSection"
                          @click="copyTechnicalSectionContent"
                        >
                          复制正文
                        </el-button>
                        <el-button
                          size="small"
                          plain
                          :loading="sectionOptimizing === 'POLISH'"
                          :disabled="!canOptimizeTechnicalSection"
                          @click="optimizeTechnicalSection('POLISH')"
                        >
                          润色本章
                        </el-button>
                        <el-button
                          size="small"
                          plain
                          :loading="sectionOptimizing === 'EXPAND'"
                          :disabled="!canOptimizeTechnicalSection"
                          @click="optimizeTechnicalSection('EXPAND')"
                        >
                          扩写本章
                        </el-button>
                        <el-button
                          size="small"
                          plain
                          :loading="sectionOptimizing === 'SHRINK'"
                          :disabled="!canOptimizeTechnicalSection"
                          @click="openTechnicalShortenDialog"
                        >
                          缩写本章
                        </el-button>
                        <el-button
                          size="small"
                          plain
                          :loading="sectionOptimizing === 'REWRITE'"
                          :disabled="!canOptimizeTechnicalSection"
                          @click="optimizeTechnicalSection('REWRITE')"
                        >
                          重写本章
                        </el-button>
                        <el-button
                          size="small"
                          type="primary"
                          plain
                          :icon="EditPen"
                          :disabled="!canEditTechnicalSectionContent"
                          @click="startEditTechnicalSectionContent"
                        >
                          编辑
                        </el-button>
                      </template>
                    </div>
                  </div>
                  <el-alert
                    v-if="isTechnicalRewriteRunning"
                    class="rewrite-preview-alert"
                    type="warning"
                    :closable="false"
                    show-icon
                    title="当前正在重编全文，以下内容可能是上一版正文，新内容生成成功后会自动覆盖。"
                  />
                  <el-input
                    v-if="technicalSectionContentEditMode"
                    v-model="technicalSectionContentDraft"
                    class="section-content-editor"
                    type="textarea"
                    :autosize="{ minRows: 24 }"
                    maxlength="200000"
                    show-word-limit
                    placeholder="请输入章节正文内容"
                    @keydown.ctrl.s.prevent="saveTechnicalSectionContent"
                    @keydown.meta.s.prevent="saveTechnicalSectionContent"
                  />
                  <div v-if="technicalSectionContentEditMode" class="section-editor-tip">已启用手动编辑，按 Ctrl + S 可快速保存；切换章节或取消时会提醒是否放弃未保存修改。</div>
                  <div v-else class="section-content-preview">{{ selectedTechnicalLeafDisplayContent }}</div>
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
                  <el-empty description="暂无目录，请在左侧完善采购需求，点击下方生成按钮" />
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
      <div v-if="isPlatformUser" class="create-admin-fields">
        <el-select
          v-model="createDialog.enterpriseId"
          filterable
          remote
          reserve-keyword
          clearable
          :remote-method="remoteSearchCreateEnterprises"
          :loading="enterpriseLoading"
          placeholder="请选择所属企业"
          class="create-admin-select"
          @visible-change="onCreateEnterpriseVisibleChange"
          @change="onCreateEnterpriseChange"
        >
          <el-option
            v-for="item in enterpriseOptions"
            :key="item.id"
            :label="item.enterpriseName || item.name"
            :value="item.id"
          />
        </el-select>
        <el-select
          v-model="createDialog.ownerUserId"
          filterable
          clearable
          placeholder="请选择项目负责人"
          class="create-admin-select"
          :disabled="!createDialog.enterpriseId"
        >
          <el-option
            v-for="item in ownerUserOptions"
            :key="item.id"
            :label="item.fullName || item.username || item.phone"
            :value="item.id"
          />
        </el-select>
      </div>

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

    <el-dialog v-model="technicalShortenDialogVisible" title="缩写本章" width="460px" append-to-body>
      <el-form label-width="90px">
        <el-form-item label="目标字数">
          <el-radio-group v-model="technicalShortenTargetMode" class="shorten-target-group">
            <el-radio-button v-for="n in technicalShortenPresetOptions" :key="n" :label="String(n)">{{ n }}字</el-radio-button>
            <el-radio-button label="CUSTOM">自定义</el-radio-button>
          </el-radio-group>
        </el-form-item>
        <el-form-item v-if="technicalShortenTargetMode === 'CUSTOM'" label="自定义">
          <el-input-number v-model="technicalShortenCustomWordCount" :min="100" :max="20000" :step="50" controls-position="right" />
        </el-form-item>
        <el-alert
          title="缩写本章会对当前章节最多重写 3 次。若仍略超目标字数，系统会保存最接近目标的版本。"
          type="info"
          show-icon
          :closable="false"
        />
      </el-form>
      <template #footer>
        <el-button @click="technicalShortenDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="sectionOptimizing === 'SHRINK'" @click="confirmTechnicalShortenSection">开始缩写</el-button>
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
                :closable="!isCurrentTechnicalOutlineGenerating"
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
        <el-button type="primary" :loading="fullGenerating || isTechnicalRunningByBackend" @click="confirmTechnicalFullGenerate">开始生成</el-button>
      </template>
    </el-dialog>


    <el-dialog v-model="technicalVersionDialogVisible" title="技术方案历史版本" width="960px" append-to-body class="version-dialog">
      <div class="version-layout">
        <div class="version-list-panel" v-loading="technicalVersionLoading">
          <div
            v-for="item in technicalVersionList"
            :key="item.id"
            :class="['version-card', String(selectedTechnicalVersion?.id || '') === String(item.id || '') ? 'active' : '']"
            @click="selectTechnicalVersion(item)"
          >
            <div class="version-card-title">V{{ item.versionNo }} {{ item.versionName || '' }}</div>
            <div class="version-card-meta">{{ formatDateTime(item.createdAt) }} · {{ item.totalWords || 0 }} 字 · {{ item.sectionCount || 0 }} 章</div>
            <div class="version-card-remark">{{ item.remark || '自动保存快照' }}</div>
          </div>
          <el-empty v-if="!technicalVersionLoading && !technicalVersionList.length" description="暂无历史版本，重编全文或恢复前会自动保存" />
        </div>
        <div class="version-preview-panel">
          <template v-if="selectedTechnicalVersion">
            <div class="version-preview-head">
              <div>
                <div class="version-preview-title">V{{ selectedTechnicalVersion.versionNo }} 快照预览</div>
                <div class="version-preview-desc">{{ selectedTechnicalVersionSnapshot.solutionName || technicalSolution?.solutionName || '技术方案' }}</div>
              </div>
              <el-button type="primary" :loading="technicalVersionRestoring" :disabled="isTechnicalRunningByBackend" @click="onRestoreTechnicalVersion(selectedTechnicalVersion)">恢复此版本</el-button>
            </div>
            <div class="version-compare-tip">恢复前系统会再次保存当前技术方案快照，恢复后会覆盖当前章节正文，并标记技术方案成果待更新。</div>
            <el-scrollbar class="version-section-scroll">
              <div v-for="section in selectedTechnicalVersionSnapshot.sections" :key="section.outlineId || section.id" class="version-section-item">
                <div class="version-section-head">
                  <div>
                    <div class="version-section-title">{{ section.title || '未命名章节' }}</div>
                    <div class="version-section-meta">历史版本：{{ section.actualWordCount || countTextWords(section.content || '') }} 字；当前版本：{{ currentTechnicalSectionWordCount(section.outlineId) }} 字</div>
                  </div>
                  <el-button size="small" plain :loading="technicalVersionRestoring" :disabled="isTechnicalRunningByBackend" @click="onRestoreTechnicalVersionSection(section)">恢复本章</el-button>
                </div>
                <div class="version-section-content">{{ section.content || '暂无正文' }}</div>
              </div>
              <el-empty v-if="!selectedTechnicalVersionSnapshot.sections.length" description="该版本没有章节正文快照" />
            </el-scrollbar>
          </template>
          <el-empty v-else description="请选择左侧历史版本查看快照" />
        </div>
      </div>
    </el-dialog>

    <el-dialog v-model="companyMaterialDialog.visible" title="选择企业资料档案" width="760px" append-to-body>
      <div class="company-material-selector" v-loading="companyMaterialDialog.loading">
        <el-alert
          v-if="!selectedProject?.enterpriseId"
          title="当前项目未设置所属企业，请先完善项目所属企业后再关联企业资料。"
          type="warning"
          show-icon
          :closable="false"
        />
        <div v-else class="company-material-option-list">
          <div
            v-for="item in companyMaterialOptions"
            :key="item.id"
            class="company-material-option"
            :class="{ active: String(companyMaterialDialog.selectedId || '') === String(item.id) }"
            @click="companyMaterialDialog.selectedId = item.id"
          >
            <div>
              <strong>{{ item.title }}</strong>
              <p>{{ materialTypeLabel(item.materialType) }} · {{ item.enterpriseName || '-' }}</p>
              <span>{{ item.remark || item.content || '暂无摘要' }}</span>
            </div>
            <el-tag :type="item.status === 1 ? 'success' : 'info'" effect="light">{{ item.status === 1 ? '启用' : '停用' }}</el-tag>
          </div>
          <el-empty v-if="!companyMaterialDialog.loading && !companyMaterialOptions.length" description="当前项目所属企业暂无可用企业资料档案" />
        </div>
      </div>
      <template #footer>
        <el-button @click="companyMaterialDialog.visible = false">取消</el-button>
        <el-button type="primary" :loading="companyMaterialDialog.saving" :disabled="!companyMaterialDialog.selectedId" @click="confirmCompanyMaterialBind">确定关联</el-button>
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
import { computed, defineComponent, h, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { ElButton, ElCheckbox, ElInput, ElMessage, ElMessageBox, ElNotification, ElOption, ElSelect, ElTag, genFileId } from 'element-plus'
import { listKnowledgeBases } from '@/api/knowledge'
import { pageEnterprises } from '@/api/enterprise'
import { pageUsers } from '@/api/systemUser'
import { ArrowDown, Close, Delete, Document, EditPen, Loading, Plus, Refresh, Search, SortDown, SortUp, UploadFilled } from '@element-plus/icons-vue'
import {
  enterBidDocument,
  bindBidProjectCompanyMaterial,
  fillBidDocument,
  getBidDocument,
  listBidProjectCompanyMaterialOptions,
  saveBidDocument,
  unbindBidProjectCompanyMaterial,
  autoFillBidProjectBasicInfo,
  applyBidProjectTechnicalWordPreset,
  deleteBidProject,
  enterTechnicalSolution,
  startBidProjectTechnicalExportTask,
  getBidProjectTechnicalExportTask,
  generateBidProjectTechnicalFull,
  generateBidProjectTechnicalOutline,
  getBidProjectTechnicalTask,
  getBidProjectTechnicalSolution,
  getBidProjectTechnicalVersion,
  listBidProjectTechnicalVersions,
  restoreBidProjectTechnicalVersion,
  restoreBidProjectTechnicalVersionSection,
  getBidProjectWorkflow,
  downloadFileResource,
  pageBidProjects,
  rewriteBidProjectTechnicalFull,
  startReadTenderProject,
  streamBidProjectTechnicalSection,
  streamBidProjectTechnicalWritingDirection,
  uploadTenderProject,
  uploadTenderToExistingProject,
  saveBidProjectTechnicalOverallWritingRequirement,
  updateBidProjectTechnicalOutlineWordCount,
  batchUpdateBidProjectTechnicalOutlineWordCount,
  updateBidProjectTechnicalWritingConfig,
  addBidProjectTechnicalOutlineNode,
  deleteBidProjectTechnicalOutlineNodes,
  moveBidProjectTechnicalOutlineNode,
  updateBidProjectTechnicalSectionContent,
  getBidProjectTechnicalQualityCheck,
  getBidProjectTechnicalWordCountStats,
  getBidProjectTechnicalDuplicateCheck,
  compressBidProjectTechnicalDuplicateSections,
  reviewBidProjectTechnicalByAi
} from '@/api/bidProject'
import { getCurrentUserRunningAiTask } from '@/api/aiSolution'

const router = useRouter()
const auth = useAuthStore()

const keyword = ref('')
const projectLoading = ref(false)
const projectAppendLoading = ref(false)
const projects = ref([])
const selectedProject = ref(null)
const projectListScrollbar = ref()
const projectPager = reactive({ page: 1, size: 20, total: 0 })
const expandedProjectId = ref('')
const workflow = ref(null)
const activeDoc = ref('')
const uploadFiles = ref([])
const uploadRef = ref()
const technicalTenderInputRef = ref()
const technicalTenderUploading = ref(false)
const readTenderLoading = ref(false)
const autoFillLoading = ref(false)
const bidDocumentLoading = ref(false)
const bidDocumentFilling = ref(false)
const bidDocumentSaving = ref(false)
const bidDocumentDraft = ref('')
const bidDocumentDetail = ref(null)
const companyMaterialOptions = ref([])
const companyMaterialDialog = reactive({ visible: false, loading: false, saving: false, selectedId: null })
const enterpriseOptions = ref([])
const ownerUserOptions = ref([])
const enterpriseLoading = ref(false)
const enterpriseKeywordTimer = ref(null)
const timer = ref(null)
const poller = ref(null)
const technicalOutlinePoller = ref(null)
const technicalOutlinePendingProjectId = ref('')
const technicalTaskPoller = ref(null)
const technicalTaskPending = reactive({ projectId: '', taskId: '' })
const technicalTaskPollingBusy = ref(false)
const technicalTaskPollErrorCount = ref(0)
const technicalTaskPollTick = ref(0)
const globalAiRunningTask = ref(null)
let globalAiTaskPoller = null
const technicalSolutionLoadErrorCount = ref(0)
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
const sectionOptimizing = ref('')
const sectionOptimizingNodeId = ref('')
const sectionStreamingText = ref('')
const technicalShortenDialogVisible = ref(false)
const technicalShortenTargetMode = ref('300')
const technicalShortenCustomWordCount = ref(300)
const technicalShortenPresetOptions = [300, 600, 900, 1200]
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

const DEFAULT_BLIND_BID_REQUIREMENT = '输出内容中不得出现投标人的名称、企业标识、人员名称、企业独享的符号或图案等任何可识别投标人身份的信息。不得在页眉、页脚、正文、表格、图片说明、附件名称中出现可识别投标人身份的信息。'

const fullGenerateForm = reactive({
  knowledgeIds: [],
  blindBidEnabled: false,
  blindBidRequirement: '',
  writingStyle: 'GENERAL',
  contentDepth: 'STANDARD'
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

const technicalVersionDialogVisible = ref(false)
const technicalVersionLoading = ref(false)
const technicalVersionRestoring = ref(false)
const technicalVersionList = ref([])
const selectedTechnicalVersion = ref(null)
const selectedTechnicalVersionSnapshot = computed(() => parseVersionSnapshot(selectedTechnicalVersion.value?.snapshotJson))

const createDialog = reactive({
  visible: false,
  loading: false,
  enterpriseId: null,
  ownerUserId: null
})

const techSteps = [
  { value: 1, label: '选择方案类型' },
  { value: 2, label: '录入基础信息' },
  { value: 3, label: '生成预览目录' },
  { value: 4, label: '调整总字数' },
  { value: 5, label: '生成方案' }
]
const aiLevels = [
  { value: 'BASIC', label: '基础版', desc: '标准生成质量，适合常规文档与快速出稿。' },
  { value: 'STANDARD', label: '标准版', desc: '标准生成质量，增加关键质量校验与结构优化。' },
  { value: 'FLAGSHIP', label: '旗舰版', desc: '标准生成质量，增强评分项对齐和审稿建议。' }
]

// AI标书项目复用 AI方案引擎，方案类型不能只在界面上显示。
// 这里让二级类型跟随一级类型变化，避免选择“工程”时还只能选“系统集成/软件开发”等 IT 子类型。
const technicalSubTypeMap = {
  SERVICE: ['物业管理', '审计服务', '广告印刷', '车辆维修', '医疗服务', '咨询服务', '运维服务'],
  ENGINEERING: ['房建工程', '拆除工程', '水利工程', '市政工程', '电信工程', '装饰装修工程', '园林绿化工程'],
  GOODS: ['食堂采购', '安防设备', '百货采购', '建筑采购', '水果采购', '生活用品', '办公设备', '设备采购'],
  SUPERVISION: ['房建监理', '市政监理', '水利监理'],
  IT: ['软件开发', '信息安全', '系统集成', '运维服务'],
  OTHER: ['其他']
}
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
  aiLevel: '',
  solutionName: '',
  outlineWritingDirection: '',
  purchaseRequirement: '',
  scoreRequirement: '',
  knowledgeIds: [],
  outlineMode: 'SCORE_ITEM',
  outlineRequirement: ''
})
const technicalSubTypes = computed(() => technicalSubTypeMap[technicalForm.solutionType] || [])

watch(() => technicalForm.solutionType, () => {
  const allowed = technicalSubTypes.value || []
  if (technicalForm.solutionSubType !== '不限' && !allowed.includes(technicalForm.solutionSubType)) {
    technicalForm.solutionSubType = '不限'
  }
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
  sectionOptimizing.value = ''
  sectionOptimizingNodeId.value = ''
  lastAutoExtractParseKey.value = ''
  Object.assign(technicalForm, {
    solutionType: 'SERVICE',
    solutionSubType: '不限',
    aiLevel: '',
    solutionName: '',
    outlineWritingDirection: '',
    purchaseRequirement: '',
    scoreRequirement: '',
    knowledgeIds: [],
    outlineMode: 'SCORE_ITEM',
    outlineRequirement: ''
  })
  resetBidDocumentWorkspace()
}

function resetBidDocumentWorkspace() {
  bidDocumentDetail.value = null
  bidDocumentDraft.value = ''
  companyMaterialOptions.value = []
  Object.assign(companyMaterialDialog, { visible: false, loading: false, saving: false, selectedId: null })
}

const workflowDocuments = computed(() => workflow.value?.documents || defaultDocuments(selectedProject.value))
const parseReportText = computed(() => workflow.value?.parseReportText || selectedProject.value?.parseReportText || '')
const parseProgress = computed(() => Number(workflow.value?.parseTask?.progress || 0))
const hasTenderFile = computed(() => Boolean(
  selectedProject.value?.tenderFileId
  || selectedProject.value?.tenderFileName
  || workflow.value?.project?.tenderFileId
  || workflow.value?.project?.tenderFileName
  || workflow.value?.parseTask?.fileResourceId
  || workflow.value?.parseTask?.fileName
))
const tenderFileDisplayName = computed(() =>
  selectedProject.value?.tenderFileName
  || workflow.value?.project?.tenderFileName
  || workflow.value?.parseTask?.fileName
  || '尚未上传招标文件'
)
const isParseRunning = computed(() => ['PARSING', 'EXTRACTING'].includes(String(workflow.value?.parseTask?.status || selectedProject.value?.parseStatus || '').toUpperCase()))
const isParseSuccess = computed(() => String(selectedProject.value?.parseStatus || '').toUpperCase() === 'SUCCESS' || String(workflow.value?.parseTask?.status || '').toUpperCase() === 'SUCCESS')
const parseStatusLabel = computed(() => {
  const doc = workflowDocuments.value.find((item) => item.type === 'PARSE_REPORT')
  return doc?.statusLabel || '-'
})
const isPlatformUser = computed(() => {
  const roles = auth.roleCodes || []
  return roles.includes('SUPERADMIN') || roles.includes('PLATFORMADMIN') || roles.includes('SUPER_ADMIN') || roles.includes('PLATFORM_ADMIN')
})
const hasCompanyMaterial = computed(() => Boolean(selectedProject.value?.companyMaterialId))
const bidDocumentContent = computed(() => bidDocumentDetail.value?.content || selectedProject.value?.contentMarkdown || '')
const bidDocumentStatusLabel = computed(() => {
  const status = String(bidDocumentDetail.value?.bidDocStatus || selectedProject.value?.bidDocStatus || '').toUpperCase()
  if (status === 'DONE') return '已生成'
  if (status === 'FILLING') return '生成中'
  if (status === 'FAILED') return '生成失败'
  if (status === 'WAIT_CREATE') return '待填空'
  return '待解析'
})
const canFillBidDocument = computed(() => isParseSuccess.value && hasCompanyMaterial.value && !bidDocumentFilling.value)
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
  const task = technicalSolution.value?.runningTask
  if (task && ['WAITING', 'RUNNING'].includes(String(task.status || '').toUpperCase())) {
    return Math.min(100, Math.max(0, Number(task.progress || 0)))
  }
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
const technicalSectionContentDirty = computed(() => normalizeSectionContent(technicalSectionContentDraft.value) !== normalizeSectionContent(selectedTechnicalLeafContent.value))
const technicalSectionEditorWordCount = computed(() => countTextWords(technicalSectionContentDraft.value || ''))
const selectedTechnicalLeafDisplayContent = computed(() => {
  const streaming = String(sectionStreamingText.value || '')
  if (isTechnicalNodeOptimizing(selectedTechnicalLeaf.value) && streaming.trim()) {
    return streaming
  }
  return selectedTechnicalLeafContent.value
})
const canEditTechnicalOutline = computed(() => {
  return technicalOutlines.value.length > 0
    && !isCurrentTechnicalOutlineGenerating.value
    && !isTechnicalBusy.value
})
const canCopyTechnicalSection = computed(() => {
  return !!selectedTechnicalLeaf.value?.id
    && !!selectedTechnicalLeafDisplayContent.value
    && !isTechnicalBusy.value
})
const canEditTechnicalSectionContent = computed(() => {
  return !!selectedTechnicalLeaf.value?.id
    && !!selectedTechnicalLeafContent.value
    && !isTechnicalBusy.value
    && !sectionGenerating.value
    && !sectionOptimizing.value
})
const canOptimizeTechnicalSection = computed(() => {
  return !!selectedTechnicalLeaf.value?.id
    && !!selectedTechnicalLeafContent.value
    && !technicalSectionContentEditMode.value
    && !isTechnicalBusy.value
    && !sectionGenerating.value
    && !sectionOptimizing.value
})
const canGenerateTechnicalContent = computed(() => {
  const allGenerated = technicalLeafNodes.value.length > 0 && technicalLeafNodes.value.every(isTechnicalLeafDone)
  return !!selectedProject.value?.id
    && technicalOutlines.value.length > 0
    && !allGenerated
    && !isCurrentTechnicalOutlineGenerating.value
    && !isTechnicalBusy.value
})
const canRewriteTechnicalAll = computed(() => {
  return !!selectedProject.value?.id
    && technicalOutlines.value.length > 0
    && technicalFinishedLeafCount.value > 0
    && !isCurrentTechnicalOutlineGenerating.value
    && !isTechnicalBusy.value
})
const canExportTechnicalWord = computed(() => {
  if (!technicalOutlines.value.length) return false
  if (isTechnicalBusy.value) return false
  if (technicalSolution.value?.canExport === true) return true
  return technicalLeafNodes.value.length > 0 && technicalLeafNodes.value.every(isTechnicalLeafDone)
})
const isTechnicalRunningByBackend = computed(() => {
  const status = String(technicalSolution.value?.runningTask?.status || '').toUpperCase()
  return ['WAITING', 'RUNNING'].includes(status)
})
const isGlobalAiTaskRunning = computed(() => ['WAITING', 'RUNNING'].includes(String(globalAiRunningTask.value?.status || '').toUpperCase()))
const isGlobalAiTaskForCurrentTechnicalSolution = computed(() => {
  const currentSolutionId = String(technicalSolution.value?.id || '')
  return !!currentSolutionId && String(globalAiRunningTask.value?.solutionId || '') === currentSolutionId
})
const hasOtherAiTaskRunning = computed(() => isGlobalAiTaskRunning.value && !isGlobalAiTaskForCurrentTechnicalSolution.value)
const isTechnicalRewriteRunning = computed(() => {
  const task = technicalSolution.value?.runningTask
  return !!task && String(task.taskType || '').toUpperCase() === 'REWRITE_FULL' && ['WAITING', 'RUNNING'].includes(String(task.status || '').toUpperCase())
})
const isTechnicalBusy = computed(() => {
  return technicalGeneratingOutline.value
    || isCurrentTechnicalOutlineGenerating.value
    || fullGenerating.value
    || isTechnicalRunningByBackend.value
    || hasOtherAiTaskRunning.value
    || sectionGenerating.value
    || !!sectionOptimizing.value
    || technicalSectionContentSaving.value
})
const projectNoMore = computed(() => projectPager.total > 0 && projects.value.length >= projectPager.total)

const technicalGenerateButtonText = computed(() => {
  const task = technicalSolution.value?.runningTask
  if (task && ['WAITING', 'RUNNING'].includes(String(task.status || '').toUpperCase())) {
    return String(task.taskType || '').toUpperCase() === 'REWRITE_FULL' ? '重编中...' : '生成中...'
  }
  if (fullGenerating.value || isTechnicalRunningByBackend.value) return '生成中...'
  if (technicalFinishedLeafCount.value > 0 && technicalFinishedLeafCount.value < technicalLeafNodes.value.length) return '继续生成'
  if (technicalFinishedLeafCount.value === technicalLeafNodes.value.length && technicalLeafNodes.value.length > 0) return '已全部生成'
  return '开始生成'
})

onMounted(async () => {
  await loadGlobalAiRunningTask()
  await loadProjects()
  startPolling()
  startGlobalAiTaskPolling()
  restoreTechnicalOutlinePending()
  restoreTechnicalTaskPending()
})

onBeforeUnmount(() => {
  clearTimeout(timer.value)
  clearTimeout(enterpriseKeywordTimer.value)
  clearInterval(poller.value)
  clearInterval(technicalOutlinePoller.value)
  clearInterval(technicalTaskPoller.value)
  clearInterval(globalAiTaskPoller)
})

function startGlobalAiTaskPolling() {
  clearInterval(globalAiTaskPoller)
  globalAiTaskPoller = setInterval(() => {
    if (!document.hidden) loadGlobalAiRunningTask()
  }, 5000)
}

async function loadGlobalAiRunningTask() {
  try {
    globalAiRunningTask.value = await getCurrentUserRunningAiTask()
  } catch (e) {
    globalAiRunningTask.value = null
  }
}

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

function projectStatusSummary(project) {
  if (!project) return '解析：待解析｜技术：待制作'
  return `解析：${statusLabel('PARSE_REPORT', project.parseStatus)}｜技术：${statusLabel('TECHNICAL_SOLUTION', project.technicalStatus)}`
}

function onKeywordInput() {
  clearTimeout(timer.value)
  timer.value = setTimeout(() => {
    projectPager.page = 1
    projects.value = []
    loadProjects()
  }, 300)
}

async function loadProjects(selectId, options = {}) {
  const append = Boolean(options.append)
  if ((append && projectNoMore.value) || projectLoading.value || projectAppendLoading.value) return

  const pageToLoad = append ? projectPager.page + 1 : 1
  if (append) {
    projectAppendLoading.value = true
  } else {
    projectLoading.value = true
  }

  try {
    const res = await pageBidProjects({
      current: pageToLoad,
      size: projectPager.size,
      pageNum: pageToLoad,
      pageSize: projectPager.size,
      keyword: keyword.value?.trim() || undefined
    })
    const records = res?.records || []
    projectPager.page = pageToLoad
    projectPager.total = Number(res?.total || 0)

    if (append) {
      const exists = new Set(projects.value.map((item) => String(item.id)))
      projects.value = projects.value.concat(records.filter((item) => item?.id && !exists.has(String(item.id))))
      return
    }

    projects.value = records

    // 首次进入 AI标书页面时不自动选中第一个项目，也不自动展开左侧项目文件下拉。
    // 只有以下两种情况才选中项目：
    // 1. 新建/上传/刷新等业务动作明确传入 selectId；
    // 2. 用户原本已经选中的项目仍在当前列表中。
    const explicitSelectId = selectId ? String(selectId) : ''
    const currentSelectedId = selectedProject.value?.id ? String(selectedProject.value.id) : ''
    const currentStillExists = currentSelectedId
      ? projects.value.some((item) => String(item.id) === currentSelectedId)
      : false
    const id = explicitSelectId || (currentStillExists ? currentSelectedId : '')

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
    if (append) {
      projectAppendLoading.value = false
    } else {
      projectLoading.value = false
    }
  }
}

function onProjectListScroll() {
  const el = projectListScrollbar.value?.wrapRef
  if (!el || projectLoading.value || projectAppendLoading.value || projectNoMore.value) return
  const remain = el.scrollHeight - el.scrollTop - el.clientHeight
  if (remain <= 80) {
    loadProjects(null, { append: true })
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

async function openCreateProject() {
  resetUploadFile()
  createDialog.enterpriseId = null
  createDialog.ownerUserId = null
  createDialog.visible = true
  if (isPlatformUser.value) {
    await loadCreateEnterprises()
  }
  nextTick(() => {
    uploadRef.value?.clearFiles?.()
  })
}

async function loadCreateEnterprises(keyword = '') {
  if (!isPlatformUser.value) {
    enterpriseOptions.value = []
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
    enterpriseOptions.value = res?.records || []
  } finally {
    enterpriseLoading.value = false
  }
}

function remoteSearchCreateEnterprises(keyword = '') {
  if (!isPlatformUser.value) return
  clearTimeout(enterpriseKeywordTimer.value)
  enterpriseKeywordTimer.value = setTimeout(() => loadCreateEnterprises(keyword), 300)
}

function onCreateEnterpriseVisibleChange(visible) {
  if (visible && isPlatformUser.value && enterpriseOptions.value.length === 0) {
    loadCreateEnterprises()
  }
}

async function onCreateEnterpriseChange(value) {
  createDialog.ownerUserId = null
  ownerUserOptions.value = []
  if (!value) return
  const res = await pageUsers({ pageNum: 1, pageSize: 50, enterpriseId: value, status: 1 })
  ownerUserOptions.value = res?.records || []
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
    if (isPlatformUser.value) {
      if (!createDialog.enterpriseId) {
        ElMessage.warning('请选择所属企业')
        return
      }
      if (!createDialog.ownerUserId) {
        ElMessage.warning('请选择项目负责人')
        return
      }
      formData.append('enterpriseId', createDialog.enterpriseId)
      formData.append('ownerUserId', createDialog.ownerUserId)
    }
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


function triggerTechnicalTenderUpload() {
  if (!selectedProject.value?.id) {
    ElMessage.warning('请先选择项目')
    return
  }
  technicalTenderInputRef.value?.click?.()
}

async function onTechnicalTenderFileChange(event) {
  const file = event?.target?.files?.[0]
  if (event?.target) {
    event.target.value = ''
  }
  if (!file) return
  if (!selectedProject.value?.id) {
    ElMessage.warning('请先选择项目')
    return
  }

  const name = String(file.name || '').toLowerCase()
  if (!name.endsWith('.doc') && !name.endsWith('.docx') && !name.endsWith('.pdf')) {
    ElMessage.warning('仅支持上传 .doc、.docx、.pdf 招标文件')
    return
  }

  const maxSize = 50 * 1024 * 1024
  if (file.size > maxSize) {
    ElMessage.warning('招标文件不能超过 50MB')
    return
  }

  technicalTenderUploading.value = true
  try {
    const formData = new FormData()
    formData.append('file', file)
    const res = await uploadTenderToExistingProject(selectedProject.value.id, formData)
    workflow.value = res
    selectedProject.value = res?.project || selectedProject.value
    ElMessage.success('招标文件已上传，请点击“开始解析”')
    await loadProjects(selectedProject.value.id)
    activeDoc.value = 'TECHNICAL_SOLUTION'
  } finally {
    technicalTenderUploading.value = false
  }
}

async function startReadTenderForSelected() {
  if (!selectedProject.value?.id) {
    ElMessage.warning('请先选择项目')
    return
  }
  if (!hasTenderFile.value) {
    ElMessage.warning('当前项目未上传招标文件，请先上传招标文件')
    return
  }
  readTenderLoading.value = true
  try {
    workflow.value = await startReadTenderProject(selectedProject.value.id)
    selectedProject.value = workflow.value?.project || selectedProject.value
    const status = String(workflow.value?.parseTask?.status || selectedProject.value?.parseStatus || '').toUpperCase()
    if (['WAITING', 'PARSING', 'EXTRACTING'].includes(status)) {
      ElMessage.info(workflow.value?.parseTask?.message || '读标解析任务已在排队或执行中')
    } else {
      ElMessage.success('已开始读标')
    }
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
  if (!hasTenderFile.value) {
    ElMessage.warning('当前项目未上传招标文件，请先上传招标文件')
    return
  }
  const currentDoc = activeDoc.value || 'TECHNICAL_SOLUTION'
  readTenderLoading.value = true
  try {
    workflow.value = await startReadTenderProject(selectedProject.value.id)
    selectedProject.value = workflow.value?.project || selectedProject.value
    const status = String(workflow.value?.parseTask?.status || selectedProject.value?.parseStatus || '').toUpperCase()
    if (['WAITING', 'PARSING', 'EXTRACTING'].includes(status)) {
      ElMessage.info(workflow.value?.parseTask?.message || '读标解析任务已在排队或执行中')
    } else {
      ElMessage.success('已开始解析')
    }
    await loadProjects(selectedProject.value.id)
    activeDoc.value = currentDoc
    autoFillTechnicalRequirementAfterParse(false)
  } finally {
    readTenderLoading.value = false
  }
}

async function autoFillProjectBasicInfo() {
  if (!selectedProject.value?.id) {
    ElMessage.warning('请先选择项目')
    return
  }
  if (!isParseSuccess.value) {
    ElMessage.warning('请先完成解析报告')
    return
  }

  try {
    await ElMessageBox.confirm(
      '系统将从解析结果中识别项目信息，并只补充当前为空的字段；已手工填写的内容不会被覆盖。是否继续？',
      '自动回填项目信息',
      {
        confirmButtonText: '开始回填',
        cancelButtonText: '取消',
        type: 'info'
      }
    )
  } catch (e) {
    return
  }

  autoFillLoading.value = true
  try {
    workflow.value = await autoFillBidProjectBasicInfo(selectedProject.value.id)
    selectedProject.value = workflow.value?.project || selectedProject.value
    const index = projects.value.findIndex((item) => String(item.id) === String(selectedProject.value?.id))
    if (index >= 0 && selectedProject.value) {
      projects.value.splice(index, 1, { ...projects.value[index], ...selectedProject.value })
    }
    hydrateTechnicalSolutionForm()
    ElMessage.success('已根据解析结果回填项目信息')
  } finally {
    autoFillLoading.value = false
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
    await loadBidDocumentDetail()
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

async function loadBidDocumentDetail() {
  if (!selectedProject.value?.id) return
  bidDocumentLoading.value = true
  try {
    bidDocumentDetail.value = await getBidDocument(selectedProject.value.id)
    bidDocumentDraft.value = bidDocumentDetail.value?.content || ''
  } finally {
    bidDocumentLoading.value = false
  }
}

async function refreshBidDocument() {
  await refreshWorkflow()
  await loadBidDocumentDetail()
}

async function openCompanyMaterialSelector() {
  if (!selectedProject.value?.id) {
    ElMessage.warning('请先选择项目')
    return
  }
  if (!selectedProject.value.enterpriseId) {
    ElMessage.warning('当前项目未设置所属企业，请先完善项目所属企业')
    return
  }
  companyMaterialDialog.visible = true
  companyMaterialDialog.loading = true
  companyMaterialDialog.selectedId = selectedProject.value.companyMaterialId || null
  try {
    companyMaterialOptions.value = await listBidProjectCompanyMaterialOptions(selectedProject.value.id)
  } finally {
    companyMaterialDialog.loading = false
  }
}

async function confirmCompanyMaterialBind() {
  if (!selectedProject.value?.id || !companyMaterialDialog.selectedId) return
  companyMaterialDialog.saving = true
  try {
    workflow.value = await bindBidProjectCompanyMaterial(selectedProject.value.id, {
      companyMaterialId: companyMaterialDialog.selectedId
    })
    selectedProject.value = workflow.value?.project || selectedProject.value
    companyMaterialDialog.visible = false
    await loadProjects(selectedProject.value.id)
    await loadBidDocumentDetail()
    ElMessage.success('已关联企业资料档案')
  } finally {
    companyMaterialDialog.saving = false
  }
}

async function unbindSelectedCompanyMaterial() {
  if (!selectedProject.value?.id) return
  try {
    await ElMessageBox.confirm('确认解除当前项目关联的企业资料档案吗？解除后投标文件和技术方案生成将不再引用该资料。', '解除关联', {
      confirmButtonText: '解除',
      cancelButtonText: '取消',
      type: 'warning'
    })
  } catch (e) {
    return
  }
  workflow.value = await unbindBidProjectCompanyMaterial(selectedProject.value.id)
  selectedProject.value = workflow.value?.project || selectedProject.value
  await loadProjects(selectedProject.value.id)
  ElMessage.success('已解除关联')
}

async function smartFillBidDocument() {
  if (!isParseSuccess.value) {
    ElMessage.warning('请先完成招标文件解析')
    return
  }
  if (!hasCompanyMaterial.value) {
    ElMessage.warning('请先关联企业资料档案后再进行投标文件智能填空')
    return
  }
  bidDocumentFilling.value = true
  try {
    bidDocumentDetail.value = await fillBidDocument(selectedProject.value.id)
    bidDocumentDraft.value = bidDocumentDetail.value?.content || ''
    await refreshWorkflow()
    ElMessage.success('投标文件智能填空完成')
  } finally {
    bidDocumentFilling.value = false
  }
}

async function saveBidDocumentDraft() {
  if (!selectedProject.value?.id) return
  if (!bidDocumentDraft.value.trim()) {
    ElMessage.warning('投标文件内容不能为空')
    return
  }
  bidDocumentSaving.value = true
  try {
    bidDocumentDetail.value = await saveBidDocument(selectedProject.value.id, { content: bidDocumentDraft.value })
    await refreshWorkflow()
    ElMessage.success('投标文件内容已保存')
  } finally {
    bidDocumentSaving.value = false
  }
}

function materialTypeLabel(type) {
  const map = {
    COMPANY_PROFILE: '企业信息',
    QUALIFICATION: '资质证书',
    PERSON_CERT: '人员证书',
    CASE: '企业业绩',
    HONOR: '荣誉奖项',
    AFTER_SALE: '服务承诺',
    TEAM: '项目成员',
    OTHER: '其他资料'
  }
  return map[String(type || '').toUpperCase()] || '其他资料'
}

async function loadTechnicalSolution() {
  if (!selectedProject.value?.id) return
  try {
    technicalSolution.value = await getBidProjectTechnicalSolution(selectedProject.value.id)
    technicalSolutionLoadErrorCount.value = 0
    hydrateTechnicalOutlinesFromSolution(technicalSolution.value)
    syncTechnicalOverallRequirement()
  } catch (e) {
    // 查询超时/网络抖动时保留旧目录和旧任务状态，不清空页面。
    // 清空会造成“切换页面后生成状态没了”的错觉。
    technicalSolutionLoadErrorCount.value += 1
    if (!technicalSolution.value && !technicalOutlines.value.length) {
      technicalSolution.value = null
      technicalOutlines.value = []
    }
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

function normalizeAiLevel(value) {
  const text = String(value || '').trim().toUpperCase()
  if (text === 'PREMIUM') return 'FLAGSHIP'
  if (['BASIC', 'STANDARD', 'FLAGSHIP'].includes(text)) return text
  return ''
}

function requireSelectedTechnicalAiLevel() {
  if (!technicalForm.aiLevel && !technicalSolution.value?.aiLevel) {
    ElMessage.warning('请先选择AI等级')
    return false
  }
  return true
}

function hydrateTechnicalSolutionForm() {
  const projectName = selectedProject.value?.projectName || '技术方案'
  const solution = technicalSolution.value || {}
  const requirement = solution.requirement || {}
  technicalForm.solutionName = solution.solutionName || (projectName.includes('技术方案') ? projectName : `${projectName}技术方案`)
  technicalForm.solutionType = solution.solutionType || technicalForm.solutionType
  technicalForm.solutionSubType = solution.solutionSubType || technicalForm.solutionSubType
  technicalForm.aiLevel = normalizeAiLevel(solution.aiLevel) || technicalForm.aiLevel || ''
  technicalForm.outlineWritingDirection = solution.overallWritingRequirement || technicalForm.outlineWritingDirection
  technicalForm.purchaseRequirement = requirement.purchaseRequirement || technicalForm.purchaseRequirement
  technicalForm.scoreRequirement = requirement.scoreRequirement || requirement.technicalScoreItems || technicalForm.scoreRequirement
  technicalForm.outlineRequirement = requirement.outlineRequirement || technicalForm.outlineRequirement || ''
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
  if (!requireSelectedTechnicalAiLevel()) return
  await loadGlobalAiRunningTask()
  if (hasOtherAiTaskRunning.value) {
    ElMessage.warning('已有其他AI生成任务正在执行，请等待完成后再操作')
    return
  }
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
    const selectedOutlineKnowledgeIds = collectTechnicalFullGenerateKnowledgeIds()
    technicalForm.knowledgeIds = selectedOutlineKnowledgeIds
    const res = await generateBidProjectTechnicalOutline(projectId, {
      solutionName: technicalForm.solutionName,
      solutionType: technicalForm.solutionType,
      solutionSubType: technicalForm.solutionSubType,
      aiLevel: normalizeAiLevel(technicalForm.aiLevel) || normalizeAiLevel(technicalSolution.value?.aiLevel),
      writingStyle: 'GENERAL',
      outlineWritingDirection: technicalForm.outlineWritingDirection,
      purchaseRequirement: technicalForm.purchaseRequirement,
      scoreRequirement: technicalForm.scoreRequirement,
      outlineMode: technicalForm.outlineMode,
      outlineRequirement: technicalForm.outlineRequirement,
      knowledgeIds: stringifyKnowledgeIds(selectedOutlineKnowledgeIds)
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


function normalizeId(id) {
  const text = String(id ?? '').trim()
  if (!text || text === 'null' || text === 'undefined' || text === 'NaN') return ''
  return text
}

function uniqueIds(ids = []) {
  return [...new Set((Array.isArray(ids) ? ids : []).map((id) => normalizeId(id)).filter(Boolean))]
}

function normalizeKnowledgeIds(ids = []) {
  return Array.isArray(ids) ? uniqueIds(ids) : parseKnowledgeIds(ids)
}

function parseKnowledgeIds(value) {
  if (Array.isArray(value)) return uniqueIds(value)
  if (value === null || value === undefined || value === '') return []
  if (typeof value === 'number') return Number.isFinite(value) ? [String(value)] : []
  if (typeof value === 'string') {
    const text = value.trim()
    if (!text) return []
    try {
      const parsed = JSON.parse(text)
      if (Array.isArray(parsed)) return uniqueIds(parsed)
    } catch (e) {}
    return uniqueIds(text.replace(/[\[\]"']/g, '').split(/[,，;；\s]+/))
  }
  return []
}

function stringifyKnowledgeIds(ids = []) {
  return normalizeKnowledgeIds(ids).join(',')
}

function buildSelectedKnowledgeBases(ids = []) {
  const idList = normalizeKnowledgeIds(ids)
  const map = new Map()
  selectedKnowledgeBaseCache.value.forEach((item) => map.set(normalizeId(item.id), item))
  knowledgeBaseList.value.forEach((item) => map.set(normalizeId(item.id), item))
  return idList.map((id) => map.get(normalizeId(id)) || { id, kbName: `知识库#${id}` }).filter(Boolean)
}

function collectTechnicalFullGenerateKnowledgeIds() {
  const ids = []

  // AI标书项目本身可以绑定知识库，重编全文时要默认带出来。
  ids.push(...normalizeKnowledgeIds(technicalForm.knowledgeIds || []))
  ids.push(...normalizeKnowledgeIds(fullGenerateForm.knowledgeIds || []))
  ids.push(...normalizeKnowledgeIds(selectedProject.value?.knowledgeIdList || []))
  ids.push(...normalizeKnowledgeIds(selectedProject.value?.knowledgeIds || ''))
  ids.push(...normalizeKnowledgeIds(workflow.value?.knowledgeIds || ''))
  ids.push(...normalizeKnowledgeIds(workflow.value?.knowledgeIdList || []))

  // 技术方案本质上复用 AI方案，历史章节上可能已经保存过知识库选择。
  const walk = (nodes = []) => {
    nodes.forEach((node) => {
      ids.push(...normalizeKnowledgeIds(node.knowledgeIds || ''))
      ids.push(...normalizeKnowledgeIds(node.section?.knowledgeIds || ''))
      if (node.children?.length) walk(node.children)
    })
  }
  walk(technicalOutlines.value || [])
  walk(technicalSolution.value?.outlines || [])

  return uniqueIds(ids)
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
  setCurrentKnowledgeIdsByTarget(tempSelectedKnowledgeIds.value, knowledgeSelectorTarget.value)
  const selectedIds = uniqueIds(tempSelectedKnowledgeIds.value || [])
  const cacheMap = new Map()
  selectedKnowledgeBaseCache.value.forEach((item) => cacheMap.set(normalizeId(item.id), item))
  knowledgeBaseList.value.forEach((item) => {
    const itemId = normalizeId(item.id)
    if (selectedIds.includes(itemId)) cacheMap.set(itemId, item)
  })
  selectedKnowledgeBaseCache.value = [...cacheMap.values()]
  knowledgeSelectorVisible.value = false
}

function removeSelectedKnowledgeBase(id, target = 'full') {
  const removeId = normalizeId(id)
  const next = getCurrentKnowledgeIdsByTarget(target).filter((item) => normalizeId(item) !== removeId)
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

function openTechnicalFullGenerateDialog(action = 'GENERATE') {
  if (!requireSelectedTechnicalAiLevel()) return
  const isRewrite = String(action || '').toUpperCase() === 'REWRITE'
  const allowed = isRewrite ? canRewriteTechnicalAll.value : canGenerateTechnicalContent.value
  if (!allowed) {
    if (!technicalOutlines.value.length) ElMessage.warning('请先生成目录')
    else if (hasOtherAiTaskRunning.value) ElMessage.warning('已有其他AI生成任务正在执行，请等待完成后再操作')
    else if (isTechnicalBusy.value) ElMessage.warning('技术方案正在生成中，完成后再操作')
    else if (isRewrite) ElMessage.warning('暂无可重编的章节')
    return
  }
  fullGenerateAction.value = action
  resetFullGenerateBlindSetting()
  fullGenerateForm.writingStyle = technicalSolution.value?.writingStyle || fullGenerateForm.writingStyle || 'GENERAL'
  fullGenerateForm.contentDepth = fullGenerateForm.contentDepth || 'STANDARD'
  fullGenerateForm.knowledgeIds = collectTechnicalFullGenerateKnowledgeIds()
  fullGenerateSettingVisible.value = true
}

async function confirmTechnicalFullGenerate() {
  fullGenerateSettingVisible.value = false
  await startTechnicalFullGenerate(fullGenerateAction.value === 'REWRITE', true)
}

function fullGeneratePreferenceText() {
  const lines = []
  const depth = String(fullGenerateForm.contentDepth || 'STANDARD').toUpperCase()
  if (depth === 'BRIEF') lines.push('内容深度：简洁版，表达聚焦、避免冗长铺陈，但关键响应点不能缺失。')
  else if (depth === 'DETAILED') lines.push('内容深度：详细版，充分展开实施路径、方法步骤、保障措施、交付成果和风险控制。')
  else lines.push('内容深度：标准版，兼顾专业性、可读性和落地性。')
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
  if (!preferenceText) return original
  return `${original ? original + '\n\n' : ''}${marker}\n${preferenceText}`
}

async function applyTechnicalFullGeneratePreferences() {
  const preferenceText = fullGeneratePreferenceText()
  if (!preferenceText || !technicalLeafNodes.value.length) return
  const leaves = technicalLeafNodes.value.filter((node) => node?.id)
  for (const node of leaves) {
    const nextRequirement = mergePreferenceIntoRequirement(node.writingRequirement || node.section?.writingRequirement || '', preferenceText)
    await updateBidProjectTechnicalWritingConfig(selectedProject.value?.id, node.id, {
      title: node.title,
      targetWordCount: Number(node.targetWordCount || node.wordCount || 300),
      writingDirection: node.writingDirection || '',
      writingRequirement: nextRequirement,
      writingStyle: fullGenerateForm.writingStyle || node.writingStyle || 'GENERAL'
    })
  }
  await loadTechnicalSolution()
}

async function startTechnicalFullGenerate(rewrite = false, skipConfirm = false) {
  if (!requireSelectedTechnicalAiLevel()) return
  await loadGlobalAiRunningTask()
  if (hasOtherAiTaskRunning.value) {
    ElMessage.warning('已有其他AI生成任务正在执行，请等待完成后再操作')
    return
  }
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
      await ElMessageBox.confirm('系统会先自动保存当前技术方案版本，再基于当前目录重编全文。新内容生成成功后会覆盖当前章节正文，失败时可从历史版本恢复。是否开始？', '确认重编全文', { type: 'warning', confirmButtonText: '开始重编', cancelButtonText: '取消' })
    } catch (e) {
      return
    }
  }

  fullGenerating.value = true
  technicalStep.value = 5
  try {
    await applyTechnicalFullGeneratePreferences()
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
      globalAiRunningTask.value = task
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
  technicalTaskPollErrorCount.value = 0
  technicalTaskPollTick.value = 0
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
      technicalTaskPollErrorCount.value = 0
      technicalTaskPollTick.value = 0
      fullGenerating.value = true
      startTechnicalTaskPolling(data.projectId, data.taskId)
    }
  } catch (e) {
    localStorage.removeItem(TECH_TASK_PENDING_KEY)
  }
}

function startTechnicalTaskPolling(projectId, taskId) {
  clearInterval(technicalTaskPoller.value)
  pollTechnicalGenerationTask(projectId, taskId, true)
  technicalTaskPoller.value = setInterval(() => {
    pollTechnicalGenerationTask(projectId, taskId, true)
  }, 5000)
}

async function pollTechnicalGenerationTask(projectId, taskId, silent = true) {
  if (!projectId || !taskId || technicalTaskPollingBusy.value) return
  if (document.hidden) return
  technicalTaskPollingBusy.value = true
  try {
    const task = await getBidProjectTechnicalTask(projectId, taskId)
    globalAiRunningTask.value = ['WAITING', 'RUNNING'].includes(String(task?.status || '').toUpperCase()) ? task : null
    technicalTaskPollErrorCount.value = 0
    const status = String(task?.status || '').toUpperCase()
    if (['WAITING', 'RUNNING'].includes(status)) {
      fullGenerating.value = true
      technicalTaskPollTick.value += 1
      if (String(selectedProject.value?.id || '') === String(projectId || '')) {
        await loadTechnicalSolution()
        selectLatestTechnicalPreviewLeaf()
        if (technicalTaskPollTick.value % 4 === 0) {
          await refreshWorkflow()
        }
      }
      return
    }

    clearTechnicalTaskPending(projectId, taskId)
    globalAiRunningTask.value = null
    fullGenerating.value = false

    if (String(selectedProject.value?.id || '') === String(projectId || '')) {
      await loadTechnicalSolution()
      await refreshWorkflow()
      technicalStep.value = 5
      selectFirstGeneratedTechnicalLeaf()
    }

    if (!silent) {
      if (status === 'FAILED') ElMessage.error('生成失败，请稍后重试')
      else if (status === 'PARTIAL') ElMessage.warning(task?.message || '部分章节未生成完成，请继续生成或重编失败章节')
      else if (status === 'CANCELED') ElMessage.warning(task?.message || '生成已取消')
      else ElMessage.success(task?.message || '技术方案正文生成完成')
    }
  } catch (e) {
    // 生成中的查询接口偶发超时，不能把本地“生成中”状态清掉。
    // 否则用户切换菜单回来，会误以为后台任务没了，但实际上后端还在继续生成。
    const status = e?.response?.status
    technicalTaskPollErrorCount.value += 1
    fullGenerating.value = true
    if (status === 404) {
      clearTechnicalTaskPending(projectId, taskId)
      fullGenerating.value = false
      return
    }
    if (!silent && technicalTaskPollErrorCount.value === 1) {
      ElMessage.warning('生成任务仍在后台执行，状态查询暂时失败，系统会继续自动刷新')
    }
  } finally {
    technicalTaskPollingBusy.value = false
  }
}


function technicalLeafTitle(node) {
  return String(node?.title || node?.name || node?.outlineTitle || '未命名章节').trim()
}

function briefTechnicalNodeList(nodes, limit = 5) {
  const list = (nodes || []).slice(0, limit).map((node) => `「${technicalLeafTitle(node)}」`)
  const remain = Math.max(0, (nodes || []).length - limit)
  return remain > 0 ? `${list.join('、')} 等 ${nodes.length} 个章节` : list.join('、')
}

function buildTechnicalExportWarnings() {
  const leaves = technicalLeafNodes.value || []
  if (!leaves.length) return ['当前没有可导出的技术方案章节。']

  const warnings = []
  const unfinished = leaves.filter((node) => !isTechnicalLeafDone(node))
  const emptyContent = leaves.filter((node) => !String(getTechnicalLeafContent(node) || '').trim())
  const noTargetWord = leaves.filter((node) => Number(node?.targetWordCount || node?.wordCount || 0) <= 0)
  const tooShort = leaves.filter((node) => {
    if (!isTechnicalLeafDone(node)) return false
    const target = Number(node?.targetWordCount || node?.wordCount || 0)
    const actual = Number(node?.actualWordCount || node?.section?.actualWordCount || 0)
    if (target <= 0 || actual <= 0) return false
    return actual < Math.max(80, Math.round(target * 0.6))
  })

  if (unfinished.length) {
    warnings.push(`仍有 ${unfinished.length} 个章节未生成完成：${briefTechnicalNodeList(unfinished)}`)
  }
  if (emptyContent.length) {
    warnings.push(`发现 ${emptyContent.length} 个章节正文为空：${briefTechnicalNodeList(emptyContent)}`)
  }
  if (noTargetWord.length) {
    warnings.push(`发现 ${noTargetWord.length} 个章节未设置目标字数：${briefTechnicalNodeList(noTargetWord)}`)
  }
  if (tooShort.length) {
    warnings.push(`发现 ${tooShort.length} 个章节生成字数明显偏少：${briefTechnicalNodeList(tooShort)}`)
  }

  return warnings
}

async function confirmTechnicalExportBeforeDownload() {
  const warnings = buildTechnicalExportWarnings()
  if (!warnings.length) return true
  try {
    await ElMessageBox.confirm(
      h('div', { class: 'technical-export-check-message' }, [
        h('p', { class: 'technical-export-check-title' }, '导出前检查发现以下问题：'),
        h('ul', { class: 'technical-export-check-list' }, warnings.map((item, index) => h('li', { key: index }, item))),
        h('p', { class: 'technical-export-check-tip' }, '可以返回处理后再导出，也可以继续导出当前版本。')
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


function notifyTechnicalWordExportSuccess(file, fallbackName) {
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

function internalInfoHtml(title, lines = []) {
  return `<div style="line-height:1.8"><b>${title}</b><br/>${lines.filter(Boolean).map(i => String(i)).join('<br/>')}</div>`
}

async function showTechnicalWordCountCheck() {
  if (!selectedProject.value?.id) return
  const data = await getBidProjectTechnicalWordCountStats(selectedProject.value.id)
  await ElMessageBox.alert(internalInfoHtml('技术方案字数检查', [
    data?.summary,
    `目标字数：${data?.targetWordCount || 0}`,
    `生成字数：${data?.actualWordCount || 0}`,
    `超字数章节：${data?.overSections || 0}`,
    `偏短章节：${data?.shortSections || 0}`
  ]), '字数检查', { dangerouslyUseHTMLString: true })
}

async function showTechnicalQualityCheck() {
  if (!selectedProject.value?.id) return
  const data = await getBidProjectTechnicalQualityCheck(selectedProject.value.id)
  await ElMessageBox.alert(internalInfoHtml('技术方案质量检查', [
    `平均分：${data?.averageScore || 0}`,
    `已检查章节：${data?.checkedSections || 0}/${data?.totalSections || 0}`,
    `需关注章节：${data?.attentionSections || 0}`,
    `建议重编章节：${data?.rewriteSections || 0}`
  ]), '质量检查', { dangerouslyUseHTMLString: true })
}

async function showTechnicalDuplicateCheck() {
  if (!selectedProject.value?.id) return
  const data = await getBidProjectTechnicalDuplicateCheck(selectedProject.value.id)
  if (!data?.recommendCompress) {
    ElMessage.success(data?.summary || '未发现明显重复内容')
    return
  }
  await ElMessageBox.confirm(internalInfoHtml('技术方案重复检查', [data?.summary, `预计可压缩：${data?.estimatedRemovableWords || 0} 字`, '是否一键压缩重复内容？']), '重复检查', { dangerouslyUseHTMLString: true, confirmButtonText: '一键压缩', cancelButtonText: '暂不处理' })
  const updated = await compressBidProjectTechnicalDuplicateSections(selectedProject.value.id)
  technicalSolution.value = updated
  ElMessage.success('重复内容已压缩')
  await loadTechnicalSolution()
}

async function reviewTechnicalByAi() {
  if (!selectedProject.value?.id) return
  const data = await reviewBidProjectTechnicalByAi(selectedProject.value.id)
  await ElMessageBox.alert(internalInfoHtml('AI审稿', [
    data?.summary,
    `审稿得分：${data?.overallScore || 0}`,
    `风险等级：${data?.riskLevel || '-'}`,
    ...(Array.isArray(data?.issues) ? data.issues.slice(0, 6).map(i => `${i.title || ''}：${i.suggestion || ''}`) : [])
  ]), 'AI二次审稿', { dangerouslyUseHTMLString: true })
}

async function exportTechnical() {
  if (!selectedProject.value?.id) return
  if (!canExportTechnicalWord.value) {
    ElMessage.warning(fullGenerating.value || isTechnicalRunningByBackend.value ? '技术方案正在生成，完成后再导出' : '仍有章节未生成完成，暂不能导出')
    return
  }
  const confirmed = await confirmTechnicalExportBeforeDownload()
  if (!confirmed) return
  const format = await chooseExportFormat()
  if (!format) return
  exportingWord.value = true
  try {
    const started = await startBidProjectTechnicalExportTask(selectedProject.value.id, format)
    const task = await waitTechnicalExportTask(selectedProject.value.id, started?.id)
    await refreshWorkflow()
    await loadTechnicalSolution()
    if (!task?.fileId) {
      ElMessage.warning('导出成功，但未返回文件ID，请到下载中心查看')
      return
    }
    const blob = await downloadFileResource(task.fileId)
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = task.originalName || `${technicalForm.solutionName || selectedProject.value.projectName || '技术方案'}-导出.${format === 'pdf' ? 'pdf' : 'docx'}`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.URL.revokeObjectURL(url)
    notifyTechnicalWordExportSuccess({ id: task.fileId, originalName: task.originalName }, a.download)
  } finally {
    exportingWord.value = false
  }
}

async function waitTechnicalExportTask(projectId, exportId) {
  if (!exportId) throw new Error('导出任务创建失败，请稍后重试')
  for (let i = 0; i < 180; i += 1) {
    const task = await getBidProjectTechnicalExportTask(projectId, exportId)
    const status = String(task?.status || '').toLowerCase()
    if (status === 'success') return task
    if (status === 'failed') throw new Error(task?.errorMsg || '导出失败，请稍后重试')
    await sleep(i < 6 ? 2000 : 5000)
  }
  throw new Error('导出任务仍在执行，请稍后到下载中心查看')
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
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
  }, 5000)
}

async function checkTechnicalOutlineReady(projectId, silent = true) {
  if (!projectId || document.hidden) return false
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

function isTechnicalNodeOptimizing(node) {
  return !!sectionOptimizing.value
    && !!sectionOptimizingNodeId.value
    && String(node?.id || '') === String(sectionOptimizingNodeId.value || '')
}

function isTechnicalLeafDone(node) {
  const outlineStatus = String(node?.contentStatus || '').toUpperCase()
  if (['GENERATING', 'STALE', 'FAILED', 'LOCKED'].includes(outlineStatus)) return false
  const sectionStatus = String(node?.section?.generateStatus || '').toUpperCase()
  const content = getTechnicalLeafContent(node)
  return outlineStatus === 'SUCCESS'
    || sectionStatus === 'SUCCESS'
    || (String(content || '').trim().length > 20 && Number(node?.actualWordCount || node?.section?.actualWordCount || 0) > 0)
}

function technicalNodeStatusLabel(node) {
  if (isTechnicalNodeOptimizing(node)) return `${optimizeActionLabel(sectionOptimizing.value)}中`
  const status = String(node?.contentStatus || '').toUpperCase()
  if (isTechnicalRewriteRunning.value) {
    if (status === 'GENERATING' || status === 'LOCKED') return '重编中'
    if (status === 'SUCCESS') return '已重编'
    if (status === 'FAILED') return '失败'
    return '待重编'
  }
  const mergedStatus = status || String(node?.section?.generateStatus || '').toUpperCase()
  if (mergedStatus === 'SUCCESS' || isTechnicalLeafDone(node)) return '已完成'
  if (mergedStatus === 'GENERATING' || mergedStatus === 'LOCKED') return '生成中'
  if (mergedStatus === 'FAILED') return '失败'
  if (mergedStatus === 'STALE') return '待重编'
  return '未生成'
}

function technicalNodeStatusType(node) {
  if (isTechnicalNodeOptimizing(node)) return 'warning'
  const status = String(node?.contentStatus || '').toUpperCase()
  if (isTechnicalRewriteRunning.value) {
    if (status === 'SUCCESS') return 'success'
    if (status === 'GENERATING' || status === 'LOCKED') return 'warning'
    if (status === 'FAILED') return 'danger'
    return 'info'
  }
  const mergedStatus = status || String(node?.section?.generateStatus || '').toUpperCase()
  if (mergedStatus === 'SUCCESS' || isTechnicalLeafDone(node)) return 'success'
  if (mergedStatus === 'GENERATING' || mergedStatus === 'LOCKED') return 'warning'
  if (mergedStatus === 'FAILED') return 'danger'
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

async function selectTechnicalLeaf(node) {
  const canLeave = await confirmDiscardTechnicalSectionContentChanges()
  if (!canLeave) return
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
  await updateBidProjectTechnicalOutlineWordCount(selectedProject.value?.id, node.id, Number(value || 0))
  node.targetWordCount = Number(value || 0)
  node.wordCount = Number(value || 0)
  await reloadTechnicalAfterOutlineEdit('字数已保存')
}

async function onTechnicalBatchWord({ node, value }) {
  if (!node?.id) return
  await batchUpdateBidProjectTechnicalOutlineWordCount(selectedProject.value?.id, node.id, Number(value || 0))
  await reloadTechnicalAfterOutlineEdit('下级章节字数已批量修改')
}

async function onSaveTechnicalOverallRequirement() {
  const solutionId = technicalSolution.value?.id
  if (!solutionId) {
    ElMessage.warning('当前技术方案缺少方案ID')
    return
  }
  await saveBidProjectTechnicalOverallWritingRequirement(selectedProject.value?.id, technicalOverallWritingRequirement.value || '')
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
    await streamBidProjectTechnicalWritingDirection(selectedProject.value?.id, firstLeaf.id, {
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
    await streamBidProjectTechnicalWritingDirection(selectedProject.value?.id, node.id, {
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
  await updateBidProjectTechnicalWritingConfig(selectedProject.value?.id, node.id, {
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
  await addBidProjectTechnicalOutlineNode(selectedProject.value?.id, technicalAddBaseNode.value.id, {
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
  await deleteBidProjectTechnicalOutlineNodes(selectedProject.value?.id, technicalDeleteIds.value)
  technicalDeleteIds.value = []
  await reloadTechnicalAfterOutlineEdit('节点已删除')
}

async function onTechnicalMoveNode({ node, direction }) {
  if (!node?.id) return
  await moveBidProjectTechnicalOutlineNode(selectedProject.value?.id, node.id, direction)
  await reloadTechnicalAfterOutlineEdit('排序已更新')
}

function normalizeSectionContent(value) {
  return String(value || '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
}

function startEditTechnicalSectionContent() {
  if (!canEditTechnicalSectionContent.value) return
  technicalSectionContentDraft.value = selectedTechnicalLeafContent.value || ''
  technicalSectionContentEditMode.value = true
}

async function confirmDiscardTechnicalSectionContentChanges() {
  if (!technicalSectionContentEditMode.value || !technicalSectionContentDirty.value) return true
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

async function cancelEditTechnicalSectionContent() {
  const canLeave = await confirmDiscardTechnicalSectionContentChanges()
  if (!canLeave) return
  technicalSectionContentDraft.value = selectedTechnicalLeafContent.value || ''
  technicalSectionContentEditMode.value = false
}

async function copyTechnicalSectionContent() {
  if (!canCopyTechnicalSection.value) {
    ElMessage.warning('技术方案正在生成中，完成后再复制正文')
    return
  }
  const content = String(selectedTechnicalLeafDisplayContent.value || '').trim()
  if (!content) {
    ElMessage.warning('当前章节暂无正文可复制')
    return
  }

  const title = String(selectedTechnicalLeaf.value?.title || '').trim()
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


const SECTION_OPTIMIZE_REQUIREMENT_MARKER = '【本次单章处理要求】'

function sectionStoredWritingRequirement(node) {
  return String(node?.writingRequirement || node?.section?.writingRequirement || '').split(SECTION_OPTIMIZE_REQUIREMENT_MARKER)[0].trim()
}

function sectionOptimizeInstruction(type, title, content, targetWordCount) {
  const name = String(title || '当前章节').trim()
  const body = String(content || '').trim()
  const target = Number(targetWordCount || 0) > 0 ? Number(targetWordCount || 0) : 600
  if (type === 'EXPAND') {
    return `请对“${name}”进行扩写。要求：1. 保留原文核心观点和投标响应逻辑；2. 增加实施步骤、保障措施、交付成果、风险控制、服务承诺等内容；3. 语言正式、专业、可直接放入投标文件；4. 目标字数约 ${target} 字；5. 只输出扩写后的章节正文，不要解释。\n\n【已有正文】\n${body}`
  }
  if (type === 'SHRINK') {
    return `请对“${name}”进行缩写。要求：1. 保留关键响应点、技术措施和承诺事项；2. 删除重复、空泛和口号化表达；3. 逻辑清晰、表达凝练；4. 目标字数约 ${target} 字；5. 只输出缩写后的章节正文，不要解释。\n\n【已有正文】\n${body}`
  }
  if (type === 'REWRITE') {
    return `请重新撰写“${name}”。要求：1. 结合招标文件采购需求和评分标准；2. 参考原文思路但不要机械复述；3. 内容要更正式、更完整、更适合投标文件；4. 目标字数约 ${target} 字；5. 只输出重写后的章节正文，不要解释。\n\n【原章节正文】\n${body}`
  }
  return `请对“${name}”进行润色。要求：1. 不改变原文核心意思和承诺边界；2. 优化语句、逻辑衔接和专业表达；3. 去掉口语化、重复和空泛内容；4. 保持投标文件正式严谨风格；5. 只输出润色后的章节正文，不要解释。\n\n【已有正文】\n${body}`
}

function sectionOptimizeWritingRequirement(type, node, content, targetWordCount) {
  const storedRequirement = sectionStoredWritingRequirement(node)
  const optimizeInstruction = sectionOptimizeInstruction(type, node?.title, content, targetWordCount)
  return `${storedRequirement ? storedRequirement + '\n\n' : ''}${SECTION_OPTIMIZE_REQUIREMENT_MARKER}\n${optimizeInstruction}`
}

function sectionOptimizeTargetWordCount(type, node, content) {
  const current = Number(node?.actualWordCount || node?.section?.actualWordCount || 0)
  const target = Number(node?.targetWordCount || node?.wordCount || node?.section?.targetWordCount || 0)
  const base = target > 0 ? target : (current > 0 ? current : countTextWords(content))
  if (type === 'EXPAND') return Math.max(600, Math.round(base * 1.35))
  if (type === 'SHRINK') return Math.max(300, Math.round(base * 0.65))
  return Math.max(300, base || 600)
}

function optimizeActionLabel(type) {
  if (type === 'EXPAND') return '扩写'
  if (type === 'SHRINK') return '缩写'
  if (type === 'REWRITE') return '重写'
  return '润色'
}

function maxAcceptableFrontendWords(targetWordCount) {
  const target = Math.max(1, Number(targetWordCount || 0))
  return target < 500 ? target + 80 : Math.round(target * 1.15)
}

function openTechnicalShortenDialog() {
  if (!canOptimizeTechnicalSection.value || !selectedTechnicalLeaf.value?.id) return
  const node = selectedTechnicalLeaf.value
  const suggested = Number(node?.targetWordCount || node?.wordCount || node?.section?.targetWordCount || 300)
  const target = suggested > 0 ? suggested : 300
  technicalShortenTargetMode.value = technicalShortenPresetOptions.includes(target) ? String(target) : 'CUSTOM'
  technicalShortenCustomWordCount.value = target
  technicalShortenDialogVisible.value = true
}

async function confirmTechnicalShortenSection() {
  const target = technicalShortenTargetMode.value === 'CUSTOM' ? Number(technicalShortenCustomWordCount.value) : Number(technicalShortenTargetMode.value)
  if (!target || target <= 0) {
    ElMessage.warning('请输入有效目标字数')
    return
  }
  technicalShortenDialogVisible.value = false
  await optimizeTechnicalSection('SHRINK', target)
}

async function optimizeTechnicalSection(type = 'POLISH', customTargetWordCount = null) {
  await loadGlobalAiRunningTask()
  if (hasOtherAiTaskRunning.value) {
    ElMessage.warning('已有其他AI生成任务正在执行，请等待完成后再操作')
    return
  }
  if (!canOptimizeTechnicalSection.value || !selectedTechnicalLeaf.value?.id) return
  const node = selectedTechnicalLeaf.value
  const content = String(selectedTechnicalLeafDisplayContent.value || '').trim()
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
  technicalSectionContentEditMode.value = false
  try {
    await streamBidProjectTechnicalSection(selectedProject.value?.id, node.id, {
      title: node.title,
      targetWordCount,
      action: type === 'SHRINK' ? 'SHORTEN' : type,
      sourceContent: content,
      maxRewriteAttempts: type === 'SHRINK' ? 3 : undefined,
      chartLevel: 'NONE',
      tableLevel: 'NONE',
      imageLevel: 'NONE',
      knowledgeIds: stringifyKnowledgeIds(node.knowledgeIds || sectionForm.knowledgeIds || ''),
      fileResourceIds: node.fileResourceIds || '',
      writingDirection: node.writingDirection || '',
      writingRequirement: sectionOptimizeWritingRequirement(type, node, content, targetWordCount),
      writingStyle: node.writingStyle || fullGenerateForm.writingStyle || 'GENERAL',
      overwrite: true
    }, {
      onMessage(chunk) {
        sectionStreamingText.value += chunk
      },
      onError(message) {
        ElMessage.error(message || `${label}失败`)
      }
    })
    await loadTechnicalSolution()
    await refreshWorkflow()
    const latest = findTechnicalOutlineNodeById(technicalOutlines.value, node.id)
    selectedTechnicalLeaf.value = latest || selectedTechnicalLeaf.value
    technicalStep.value = Math.max(technicalStep.value, 5)
    const latestActual = outlineActualWordCount(selectedTechnicalLeaf.value) || countTextWords(getTechnicalLeafContent(selectedTechnicalLeaf.value) || '')
    if (type === 'SHRINK' && latestActual > maxAcceptableFrontendWords(targetWordCount)) {
      ElMessage.warning(`缩写完成，已尽量压缩，当前 ${latestActual} 字，仍略超目标 ${targetWordCount} 字`)
    } else {
      ElMessage.success(`${label}完成`)
    }
  } finally {
    sectionOptimizing.value = ''
    sectionOptimizingNodeId.value = ''
  }
}

function countTextWords(text) {
  const value = String(text || '').trim()
  if (!value) return 0
  const chinese = (value.match(/[\u4e00-\u9fa5]/g) || []).length
  const english = (value.replace(/[\u4e00-\u9fa5]/g, ' ').match(/[A-Za-z0-9]+/g) || []).length
  return chinese + english
}

function formatDateTime(value) {
  if (!value) return ''
  return String(value).replace('T', ' ').slice(0, 19)
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

function currentTechnicalSectionWordCount(outlineId) {
  if (!outlineId) return 0
  const node = findTechnicalOutlineNodeById(technicalOutlines.value || [], outlineId)
  return outlineActualWordCount(node) || countTextWords(getTechnicalLeafContent(node))
}

async function openTechnicalVersionDialog() {
  if (!selectedProject.value?.id || !technicalSolution.value?.id) {
    ElMessage.warning('请先生成技术方案')
    return
  }
  technicalVersionDialogVisible.value = true
  technicalVersionLoading.value = true
  selectedTechnicalVersion.value = null
  try {
    technicalVersionList.value = await listBidProjectTechnicalVersions(selectedProject.value.id)
    if (technicalVersionList.value.length) {
      await selectTechnicalVersion(technicalVersionList.value[0])
    }
  } finally {
    technicalVersionLoading.value = false
  }
}

async function selectTechnicalVersion(item) {
  if (!item?.id || !selectedProject.value?.id) return
  selectedTechnicalVersion.value = item
  if (!item.snapshotJson) {
    const detail = await getBidProjectTechnicalVersion(selectedProject.value.id, item.id)
    const index = technicalVersionList.value.findIndex((v) => String(v.id || '') === String(item.id || ''))
    if (index >= 0) technicalVersionList.value[index] = { ...technicalVersionList.value[index], ...detail }
    selectedTechnicalVersion.value = { ...item, ...detail }
  }
}

async function onRestoreTechnicalVersion(item) {
  if (!selectedProject.value?.id || !item?.id) return
  try {
    await ElMessageBox.confirm(
      `确认恢复到 V${item.versionNo}？系统会先自动保存当前技术方案快照，然后用该版本覆盖当前章节正文。`,
      '恢复技术方案历史版本',
      { type: 'warning', confirmButtonText: '恢复版本', cancelButtonText: '取消' }
    )
    technicalVersionRestoring.value = true
    technicalSolution.value = await restoreBidProjectTechnicalVersion(selectedProject.value.id, item.id)
    hydrateTechnicalOutlinesFromSolution(technicalSolution.value)
    await refreshWorkflow()
    technicalVersionDialogVisible.value = false
    ElMessage.success('技术方案历史版本已恢复')
  } catch (e) {
    // 取消或业务异常交给全局拦截器处理。
  } finally {
    technicalVersionRestoring.value = false
  }
}

async function onRestoreTechnicalVersionSection(section) {
  if (!selectedProject.value?.id || !selectedTechnicalVersion.value?.id || !section?.outlineId) return
  try {
    await ElMessageBox.confirm(
      `确认只恢复“${section.title || '当前章节'}”？系统会先保存当前技术方案快照，然后用历史版本覆盖该章节正文。`,
      '恢复技术方案单章节',
      { type: 'warning', confirmButtonText: '恢复本章', cancelButtonText: '取消' }
    )
    technicalVersionRestoring.value = true
    technicalSolution.value = await restoreBidProjectTechnicalVersionSection(selectedProject.value.id, selectedTechnicalVersion.value.id, section.outlineId)
    hydrateTechnicalOutlinesFromSolution(technicalSolution.value)
    await refreshWorkflow()
    ElMessage.success('章节已恢复')
  } catch (e) {
    // 取消或业务异常交给全局拦截器处理。
  } finally {
    technicalVersionRestoring.value = false
  }
}

async function saveTechnicalSectionContent() {
  if (!selectedTechnicalLeaf.value?.id) return
  const content = normalizeSectionContent(technicalSectionContentDraft.value)
  if (!technicalSectionContentDirty.value) {
    ElMessage.info('正文没有修改，无需保存')
    return
  }
  if (!content.trim()) {
    ElMessage.warning('正文内容不能为空')
    return
  }
  technicalSectionContentSaving.value = true
  try {
    await updateBidProjectTechnicalSectionContent(selectedProject.value?.id, selectedTechnicalLeaf.value.id, content)
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

function selectLatestTechnicalPreviewLeaf() {
  const leaves = technicalLeafNodes.value || []
  if (!leaves.length) return

  // 全文生成时每秒刷新一次目录。优先让右侧预览自动跟随“正在生成”的章节；
  // 如果当前没有正在生成的章节，则选中最后一个已有正文的章节，让用户不用一直盯着空白页。
  const generating = leaves.find((node) => ['GENERATING', 'LOCKED'].includes(String(node?.contentStatus || '').toUpperCase()))
  const generated = [...leaves].reverse().find(isTechnicalLeafDone)
  const target = generating || generated || leaves[0]
  if (target?.id && String(selectedTechnicalLeaf.value?.id || '') !== String(target.id || '')) {
    selectedTechnicalLeaf.value = target
  }
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
  if (hasOtherAiTaskRunning.value) {
    ElMessage.warning('已有其他AI生成任务正在执行，请等待完成后再操作')
    return
  }
  if (isTechnicalBusy.value) {
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
  await loadGlobalAiRunningTask()
  if (hasOtherAiTaskRunning.value) {
    ElMessage.warning('已有其他AI生成任务正在执行，请等待完成后再操作')
    return
  }
  if (!sectionNode.value?.id) return
  sectionGenerating.value = true
  sectionStreamingText.value = ''
  try {
    await streamBidProjectTechnicalSection(selectedProject.value?.id, sectionNode.value.id, {
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
        ElMessage.error('生成失败，请稍后重试')
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


function startPolling() {
  clearInterval(poller.value)
  poller.value = setInterval(async () => {
    if (document.hidden) return
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
  }, 5000)
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

function technicalWordHealthClass(node) {
  if (!node || !isOutlineGenerated(node)) return ''
  const actual = Number(outlineActualWordCount(node) || 0)
  const target = Number(outlineTargetWordCount(node) || 0)
  if (!actual || !target) return ''
  const ratio = actual / target
  if (ratio < 0.7) return 'too-short'
  if (ratio > 1.35) return 'too-long'
  return 'normal'
}

function technicalWordHealthLabel(node) {
  const cls = technicalWordHealthClass(node)
  if (cls === 'too-short') return '偏短'
  if (cls === 'too-long') return '偏长'
  if (cls === 'normal') return '字数正常'
  return ''
}

function technicalWordHealthType(node) {
  const cls = technicalWordHealthClass(node)
  if (cls === 'too-short' || cls === 'too-long') return 'warning'
  if (cls === 'normal') return 'success'
  return 'info'
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
        const operationDisabled = isTechnicalBusy.value
        const generated = isOutlineGenerated(node)
        const failed = isOutlineFailed(node)
        const optimizing = isTechnicalNodeOptimizing(node)
        controls.push(h('span', { class: ['count-text', failed ? 'failed' : '', technicalWordHealthClass(node)] }, `${outlineActualWordCount(node)} / ${outlineTargetWordCount(node)}字`))
        if (optimizing) {
          controls.push(h(ElTag, { size: 'small', type: 'warning', effect: 'light' }, () => `${optimizeActionLabel(sectionOptimizing.value)}中`))
          controls.push(h(ElButton, { size: 'small', type: 'warning', plain: true, loading: true, disabled: true }, () => '处理中'))
        } else if (generated) {
          controls.push(h(ElTag, { size: 'small', type: 'success', effect: 'light' }, () => '已完成'))
          controls.push(h(ElButton, { size: 'small', type: 'warning', plain: true, disabled: operationDisabled, onClick: (event) => { event.stopPropagation(); if (operationDisabled) return; emit('section-generate', node) } }, () => operationDisabled ? '锁定' : '重编'))
        } else if (failed) {
          controls.push(h(ElTag, { size: 'small', type: 'danger', effect: 'light' }, () => '失败'))
          controls.push(h(ElButton, { size: 'small', type: 'danger', plain: true, disabled: operationDisabled, onClick: (event) => { event.stopPropagation(); if (operationDisabled) return; emit('section-generate', node) } }, () => operationDisabled ? '锁定' : '重试'))
        } else {
          controls.push(h(ElTag, { size: 'small', type: 'info', effect: 'light' }, () => '未生成'))
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

.project-list-load-state {
  padding: 16px 0 6px;
  color: #8a95a8;
  text-align: center;
  font-size: 13px;
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

.auto-fill-basic-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 16px;
  padding: 14px 16px;
  border: 1px solid #bfdbfe;
  border-radius: 14px;
  background: #eff6ff;
}

.auto-fill-basic-card strong {
  display: block;
  margin-bottom: 4px;
  color: #1e3a8a;
}

.auto-fill-basic-card p {
  margin: 0;
  color: #475569;
  line-height: 1.6;
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
  padding: 18px;
  background: #f5f7fb;
  overflow: auto;
}

.bid-doc-head {
  margin-bottom: 14px;
}

.bid-doc-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.bid-doc-status-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
  margin-bottom: 14px;
}

.bid-doc-status-card,
.company-material-ref-card,
.bid-doc-editor-card {
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 16px;
  box-shadow: 0 8px 22px rgba(15, 23, 42, 0.04);
}

.bid-doc-status-card {
  padding: 16px;
}

.bid-doc-status-card strong {
  display: block;
  margin-bottom: 8px;
  color: #0f172a;
}

.bid-doc-status-card span {
  color: #2563eb;
  font-weight: 700;
}

.bid-doc-status-card p {
  margin: 8px 0 0;
  color: #64748b;
  line-height: 1.6;
}

.bid-doc-status-card.success {
  border-color: #bbf7d0;
  background: #f0fdf4;
}

.company-material-ref-card {
  display: flex;
  justify-content: space-between;
  gap: 14px;
  padding: 18px;
  margin-bottom: 14px;
}

.company-material-ref-card strong,
.bid-doc-editor-head strong {
  display: block;
  margin-bottom: 6px;
  color: #0f172a;
}

.company-material-ref-card p,
.bid-doc-editor-head p {
  margin: 0;
  color: #64748b;
  line-height: 1.6;
}

.company-material-actions {
  display: flex;
  gap: 8px;
  align-items: center;
  flex-shrink: 0;
}

.bid-doc-editor-card {
  padding: 18px;
}

.bid-doc-editor-head {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}

.company-material-selector {
  min-height: 220px;
}

.company-material-option-list {
  display: grid;
  gap: 10px;
}

.company-material-option {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding: 14px;
  border: 1px solid #e5e7eb;
  border-radius: 14px;
  cursor: pointer;
  background: #fff;
}

.company-material-option.active {
  border-color: #2563eb;
  background: #eff6ff;
}

.company-material-option strong {
  color: #0f172a;
}

.company-material-option p {
  margin: 6px 0;
  color: #475569;
}

.company-material-option span {
  display: -webkit-box;
  color: #64748b;
  line-height: 1.5;
  overflow: hidden;
  -webkit-box-orient: vertical;
}

.create-admin-fields {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-bottom: 14px;
}

.create-admin-select {
  width: 100%;
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

.tech-strategy-note,
.tech-form-tip {
  margin-top: 8px;
  color: #64748b;
  font-size: 12px;
  line-height: 1.6;
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

.tech-read-card.empty {
  border-color: #fecaca;
  background: #fff7f7;
}

.tech-read-card.empty .tech-read-icon,
.tech-read-card.empty .tech-read-file {
  color: #ef4444;
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
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  margin-top: 14px;
}

.tech-read-actions .el-button {
  min-width: 118px;
  height: 34px;
  border-radius: 8px;
  font-weight: 600;
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



.project-status-summary {
  margin-top: 4px;
  color: #8c8c8c;
  font-size: 12px;
  line-height: 1.3;
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
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
  padding: 12px 20px;
  border-top: 1px solid #e5e7eb;
  background: #fff;
}

.detail-actions-like-solution .detail-action-btn {
  width: 100%;
  height: 42px;
  font-size: 15px;
  font-weight: 700;
  margin-left: 0 !important;
}
.detail-actions-like-solution :deep(.el-button + .el-button) { margin-left: 0 !important; }

.rewrite-preview-alert {
  margin: 12px 0;
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
.count-text.too-short,
.count-text.too-long {
  color: #f59e0b;
}
.count-text.failed {
  color: #ef4444;
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
.section-preview-title {
  min-width: 0;
  flex: 1 1 auto;
}
.section-preview-title h3 {
  margin: 0;
  color: #06152b;
  font-size: 22px;
  line-height: 1.45;
  font-weight: 800;
  word-break: break-all;
}
.section-preview-meta {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 8px;
  font-size: 13px;
  color: #64748b;
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
  display: inline-flex !important;
  align-items: center !important;
  justify-content: flex-end !important;
  flex-shrink: 0 !important;
  white-space: nowrap !important;
  word-break: keep-all !important;
  color: #22c55e !important;
  min-width: 82px !important;
  text-align: right !important;
  font-weight: 700 !important;
}

.ai-bid-page .tech-detail-panel.ai-solution-like-detail :deep(.count-text.too-short),
.ai-bid-page .tech-detail-panel.ai-solution-like-detail :deep(.count-text.too-long) {
  color: #f59e0b !important;
}

.ai-bid-page .tech-detail-panel.ai-solution-like-detail :deep(.count-text.failed) {
  color: #ef4444 !important;
}

.word-health-text {
  display: inline-flex;
  align-items: center;
  flex-shrink: 0;
  white-space: nowrap;
  word-break: keep-all;
  font-weight: 700;
  color: #16a34a;
}
.word-health-text.too-short,
.word-health-text.too-long {
  color: #d97706;
}
.word-health-text.normal {
  color: #16a34a;
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

<style scoped>
/* 统一 AI标书技术方案生成页样式：对齐 AI方案的目录树、字数列、状态列和右侧正文预览 */
.ai-bid-page .tech-detail-panel.ai-solution-like-detail .tech-detail-top {
  padding: 18px 20px;
  border-bottom: 1px solid #e5e7eb;
}

.ai-bid-page .tech-detail-panel.ai-solution-like-detail .tech-detail-top h2 {
  margin: 0 0 12px;
  font-size: 18px;
  line-height: 1.4;
  font-weight: 800;
  color: #111827;
}

.ai-bid-page .tech-detail-panel.ai-solution-like-detail .tech-detail-stats {
  grid-template-columns: repeat(2, minmax(180px, 1fr));
  gap: 8px 40px;
  font-size: 14px;
  font-weight: 400;
  color: #334155;
}

.ai-bid-page .tech-detail-panel.ai-solution-like-detail .tech-detail-stats b {
  font-size: 16px;
  font-weight: 800;
}

.ai-bid-page .tech-detail-panel.ai-solution-like-detail :deep(.outline-tree) {
  font-size: 14px !important;
  color: #334155 !important;
}

.ai-bid-page .tech-detail-panel.ai-solution-like-detail :deep(.tree-row) {
  min-height: 38px !important;
}

.ai-bid-page .tech-detail-panel.ai-solution-like-detail :deep(.tree-row.generate-row) {
  min-height: 40px !important;
  padding-right: 0 !important;
}

.ai-bid-page .tech-detail-panel.ai-solution-like-detail :deep(.tree-title) {
  flex: 1 1 auto !important;
  min-width: 0 !important;
  overflow: hidden !important;
  text-overflow: ellipsis !important;
  white-space: nowrap !important;
  line-height: 22px !important;
}

.ai-bid-page .tech-detail-panel.ai-solution-like-detail :deep(.tree-title.parent) {
  font-size: 15px !important;
  font-weight: 800 !important;
  color: #1f2937 !important;
}

.ai-bid-page .tech-detail-panel.ai-solution-like-detail :deep(.tree-title.leaf) {
  font-size: 14px !important;
  font-weight: 400 !important;
  color: #64748b !important;
}

.ai-bid-page .tech-detail-panel.ai-solution-like-detail :deep(.tree-controls.generate-controls) {
  width: 220px !important;
  min-width: 220px !important;
  display: grid !important;
  grid-template-columns: 100px 62px 48px !important;
  column-gap: 6px !important;
  align-items: center !important;
  justify-items: end !important;
  flex-shrink: 0 !important;
}

.ai-bid-page .tech-detail-panel.ai-solution-like-detail :deep(.tree-controls.generate-controls .count-text) {
  display: inline-flex !important;
  align-items: center !important;
  justify-content: flex-end !important;
  width: 100px !important;
  min-width: 100px !important;
  font-size: 13px !important;
  font-weight: 700 !important;
  line-height: 22px !important;
  white-space: nowrap !important;
  word-break: keep-all !important;
}

.ai-bid-page .tech-detail-panel.ai-solution-like-detail :deep(.tree-controls.generate-controls .el-tag) {
  width: 58px !important;
  justify-content: center !important;
  padding: 0 6px !important;
  font-size: 12px !important;
}

.ai-bid-page .tech-detail-panel.ai-solution-like-detail :deep(.tree-controls.generate-controls .el-button) {
  width: 46px !important;
  min-width: 46px !important;
  height: 26px !important;
  margin-left: 0 !important;
  padding: 0 !important;
  font-size: 12px !important;
}

.ai-bid-page .bid-tech-right .section-preview {
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
  padding: 24px 28px;
}

.ai-bid-page .bid-tech-right .section-preview-title h3 {
  font-size: 22px;
  line-height: 1.45;
}

.ai-bid-page .bid-tech-right .section-content-preview {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  margin: 0;
  font-size: 17px;
  line-height: 1.9;
}
.hidden-file-input {
  display: none !important;
}
</style>
