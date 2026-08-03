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
            <div class="doc-head-actions">
              <el-button :icon="Refresh" @click="refreshWorkflow">刷新状态</el-button>
              <el-button type="primary" plain :disabled="!selectedProject?.id" @click="openTenderAnalysisDialog">招标文件分析</el-button>
            </div>
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
            <el-empty description="当前项目尚未解析，请进入技术方案，选择AI等级后在“智能读取”区域点击开始解析">
              <el-button
                type="primary"
                :loading="readTenderLoading"
                @click="startReadTenderForSelected"
              >
                去技术方案解析
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
              <p>结合招标文件解析结果和企业资料档案，自动生成资格、商务响应及基础表单初稿。</p>
            </div>
            <div class="bid-doc-actions">
              <el-button :icon="Refresh" @click="refreshBidDocument">刷新</el-button>
              <el-button plain @click="openTenderAnalysisDialog">招标文件分析</el-button>
              <el-button plain @click="openCompanyMaterialSelector">选择资料档案</el-button>
              <el-button
                type="primary"
                :loading="bidDocumentFilling"
                :disabled="!canFillBidDocument"
                @click="smartFillBidDocument"
              >智能填空</el-button>
              <el-button
                plain
                :loading="bidDocumentExporting"
                :disabled="!bidDocumentDraft.trim()"
                @click="exportBidDocumentWordFile"
              >导出Word</el-button>
              <el-button
                plain
                :loading="bidDocumentExporting"
                :disabled="!bidDocumentDraft.trim()"
                @click="exportBidDocumentMarkdownFile"
              >导出Markdown</el-button>
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
            <div class="bid-doc-status-card" :class="{ success: bidDocumentReviewForm.reviewStatus === 'CONFIRMED' }">
              <strong>客户确认</strong>
              <span>{{ bidDocumentReviewStatusText(bidDocumentReviewForm.reviewStatus) }}</span>
              <p>{{ bidDocumentReviewForm.reviewOpinion || '保存客户确认状态和修改意见，作为后续定稿依据。' }}</p>
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

          <div class="bid-doc-analysis-grid">
            <div class="bid-doc-analysis-card">
              <div class="analysis-card-head">
                <strong>评分项响应矩阵</strong>
                <el-button link type="primary" @click="openTenderAnalysisDialog">查看分析</el-button>
              </div>
              <el-table :data="bidDocAnalysis?.scoreMatrix || []" class="ui-table" max-height="220" empty-text="暂无评分项分析，请先执行招标文件分析">
                <el-table-column prop="itemName" label="评分项" min-width="130" show-overflow-tooltip />
                <el-table-column prop="responseStatus" label="状态" width="105" />
                <el-table-column prop="riskLevel" label="风险" width="80" />
              </el-table>
            </div>
            <div class="bid-doc-analysis-card">
              <div class="analysis-card-head">
                <strong>缺失资料清单</strong>
                <span>用于客户补资料</span>
              </div>
              <el-table :data="bidDocAnalysis?.missingMaterials || []" class="ui-table" max-height="220" empty-text="暂无缺失资料分析">
                <el-table-column prop="itemName" label="资料" min-width="130" show-overflow-tooltip />
                <el-table-column prop="responseStatus" label="状态" width="105" />
                <el-table-column prop="suggestion" label="建议" min-width="150" show-overflow-tooltip />
              </el-table>
            </div>
            <div class="bid-doc-analysis-card">
              <div class="analysis-card-head">
                <strong>偏离表初稿</strong>
                <span>默认需人工确认</span>
              </div>
              <el-table :data="bidDocAnalysis?.deviationTable || []" class="ui-table" max-height="220" empty-text="暂无偏离表分析">
                <el-table-column prop="itemName" label="事项" min-width="130" show-overflow-tooltip />
                <el-table-column prop="responseStatus" label="响应" width="105" />
                <el-table-column prop="riskLevel" label="风险" width="80" />
              </el-table>
            </div>
          </div>

          <div class="bid-doc-review-card">
            <div class="review-card-head">
              <div>
                <strong>客户确认 / 修改意见</strong>
                <p>客户确认过的内容将保存为最终内容；需修改时先记录意见，后续可按意见重新生成或人工调整。</p>
              </div>
              <el-button type="primary" plain :loading="bidDocumentReviewSaving" :disabled="!bidDocumentDraft.trim()" @click="saveBidDocumentReview">保存确认状态</el-button>
            </div>
            <el-form label-position="top" class="bid-doc-review-form">
              <el-form-item label="确认状态">
                <el-select v-model="bidDocumentReviewForm.reviewStatus" style="width: 240px">
                  <el-option label="待确认" value="PENDING" />
                  <el-option label="已确认" value="CONFIRMED" />
                  <el-option label="需修改" value="NEED_MODIFY" />
                  <el-option label="已修改" value="MODIFIED" />
                  <el-option label="已废弃" value="DISCARDED" />
                </el-select>
              </el-form-item>
              <el-form-item label="客户修改意见">
                <el-input v-model="bidDocumentReviewForm.reviewOpinion" type="textarea" :rows="3" maxlength="2000" show-word-limit placeholder="例如：资质说明需要补充证书编号；售后服务承诺需要按客户要求调整。" />
              </el-form-item>
            </el-form>
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
          <div class="bid-tech-header">
            <el-button plain @click="activeDoc = ''">退出技术方案</el-button>
            <div class="bid-tech-steps">
              <span v-for="step in techSteps" :key="step.value" class="bid-tech-step" :class="{ active: technicalActiveStep >= step.value, current: technicalActiveStep === step.value }">
                <b>{{ step.value }}</b>{{ step.label }}
              </span>
            </div>
          </div>


          <el-alert
            v-if="technicalWorkflowAlertData"
            class="bid-tech-workflow-alert"
            :type="technicalWorkflowAlertData.type"
            :title="technicalWorkflowAlertData.title"
            show-icon
            :closable="false"
          />

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
                    <span>目标总字数 / 长文档拆分：</span>
                    <el-tag size="small" type="info">可选</el-tag>
                  </div>
                  <div class="tech-target-row">
                    <el-input-number
                      v-model="technicalForm.targetTotalWordCount"
                      :min="0"
                      :max="200000"
                      :step="10000"
                      controls-position="right"
                      placeholder="不填则按普通目录生成"
                    />
                    <el-select v-model="technicalForm.longOutlinePreset" placeholder="快速选择" class="tech-target-select">
                      <el-option label="不启用" :value="0" />
                      <el-option label="5万字初稿" :value="50000" />
                      <el-option label="10万字初稿" :value="100000" />
                      <el-option label="20万字初稿" :value="200000" />
                    </el-select>
                  </div>
                  <div class="tech-field-tip">填写后，目录生成会提前拆成 800~1500 字/节的末级章节，便于后续并行生成 5万~20万字初稿。</div>
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
                    <div class="tech-detail-top-main">
                      <div class="tech-detail-title-row">
                        <h2>{{ technicalForm.solutionName || selectedProject?.projectName || '技术方案' }}</h2>
                        <div class="tech-detail-title-tools">
                          <div v-if="technicalGenerationTimingVisible && !technicalGenerationTimingActive" class="tech-generation-timing-summary tech-generation-timing-summary--compact">
                            <span>{{ technicalGenerationTimingLabel }}</span>
                            <b>{{ technicalGenerationElapsedText }}</b>
                            <small>{{ technicalGenerationTimingStatusText }}</small>
                          </div>
                          <el-button
                            class="tech-detail-edit-btn"
                            :icon="technicalEditMode ? Close : EditPen"
                            :disabled="!canEditTechnicalOutline"
                            @click="toggleTechnicalEditMode"
                          >
                            {{ technicalEditMode ? '退出编辑' : '编辑' }}
                          </el-button>
                        </div>
                      </div>
                      <div v-if="showTechnicalStats" class="tech-detail-stats">
                        <span>目标字数：<b class="red">{{ technicalTargetWordCount }}</b> 字</span>
                        <span>生成字数：<b class="green">{{ technicalActualWordCount }}</b> 字</span>
                        <span>预计页数：<b class="red">{{ technicalTargetPageCount }}</b> 页</span>
                        <span>预估页数：<b class="green">{{ technicalActualPageCount }}</b> 页</span>
                      </div>
                      <div v-if="showTechnicalStats" class="tech-stat-note">注：页数仅供参考，实际请以导出结果为准</div>
                    </div>
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
                        <div v-if="technicalGenerationTimingVisible" class="tech-generation-live-time">
                          <span>生成用时</span>
                          <b>{{ technicalGenerationElapsedText }}</b>
                        </div>
                        <p>系统正在结合采购需求、评分标准和编写方向生成目录，生成完成后页面会自动显示，无需手工刷新。</p>
                      </div>
                      <el-empty v-else-if="!technicalOutlines.length" description="暂无目录，请在左侧完善采购需求，点击下方生成按钮" />
                      <template v-else>
                        <div v-if="isTechnicalRunningByBackend || hasOtherAiTaskRunning || isCurrentTechnicalContentTimingActive" class="tech-task-status-card" :class="{ waiting: isTechnicalTaskWaiting || (isCurrentTechnicalContentTimingActive && !isTechnicalRunningByBackend), running: isTechnicalTaskRunning, conflict: hasOtherAiTaskRunning }">
                          <div class="tech-task-status-main">
                            <el-tag size="small" :type="hasOtherAiTaskRunning ? 'warning' : ((isTechnicalTaskWaiting || !isTechnicalRunningByBackend) ? 'info' : 'primary')">{{ hasOtherAiTaskRunning ? '任务占用' : ((isTechnicalTaskWaiting || !isTechnicalRunningByBackend) ? '排队中' : '执行中') }}</el-tag>
                            <div>
                              <strong>{{ hasOtherAiTaskRunning ? '已有其他 AI 长任务正在执行' : (isTechnicalRunningByBackend ? technicalRunningTaskTypeLabel : technicalGenerationTimingLabel) }}</strong>
                              <p>{{ hasOtherAiTaskRunning ? '请等待当前用户其他 AI 任务完成后再发起新的技术方案生成。' : (isTechnicalRunningByBackend ? technicalRunningTaskMessage : '任务正在提交，系统会自动更新生成状态和用时。') }}</p>
                              <small>{{ isTechnicalRunningByBackend ? technicalRunningTaskTip : '关闭或切换页面不会中断后台任务。' }}</small>
                            </div>
                          </div>
                          <div v-if="!hasOtherAiTaskRunning" class="tech-task-status-side">
                            <div class="tech-task-status-metrics">
                              <span v-if="isTechnicalRunningByBackend">{{ technicalRunningTaskProgress }}%</span>
                              <small v-if="technicalGenerationTimingVisible">用时 {{ technicalGenerationElapsedText }}</small>
                            </div>
                            <el-button v-if="isTechnicalRunningByBackend" size="small" plain type="danger" :loading="technicalTaskCanceling" @click="cancelCurrentTechnicalTask">{{ technicalTaskCanceling ? '正在终止...' : '终止生成' }}</el-button>
                          </div>
                        </div>
                        <el-progress
                          :percentage="technicalGeneratePercent"
                          :show-text="false"
                          color="#ff4d4f"
                          class="solution-like-progress"
                        />
                        <OutlineTree
                          :nodes="technicalOutlines"
                          mode="generate"
                          :selected-id="selectedTechnicalLeaf?.id"
                          @preview="selectTechnicalLeaf"
                          @section-generate="openTechnicalSectionDialog"
                        />
                      </template>
                    </el-scrollbar>

                    <div class="tech-preview-actions detail-actions-like-solution">
                      <el-button class="detail-action-btn" size="large" plain :disabled="!technicalSolution?.id" @click="openTechnicalRequirementExtractDrawer">评分项/需求解析</el-button>
                      <el-button class="detail-action-btn" size="large" plain :disabled="!technicalSolution?.id" @click="openTechnicalQualityCheckDrawer">质量检查</el-button>
                      <el-button class="detail-action-btn" size="large" plain :disabled="!technicalSolution?.id" @click="openTechnicalWordCountDrawer">字数检查</el-button>
                      <el-button class="detail-action-btn" size="large" plain :disabled="!technicalSolution?.id" @click="openTechnicalReviewDrawer">AI审稿</el-button>
                      <el-button class="detail-action-btn" size="large" plain :disabled="!technicalSolution?.id || isTechnicalRunningByBackend" @click="openTechnicalVersionDialog">历史版本</el-button>
                      <el-button v-if="technicalRetryableLeafCount > 0" class="detail-action-btn" size="large" type="warning" plain :disabled="!canRetryTechnicalFailedSections" @click="openTechnicalFullGenerateDialog('RETRY_FAILED')" :loading="fullGenerating || isTechnicalRunningByBackend">重试失败章节({{ technicalRetryableLeafCount }})</el-button>
                      <el-button class="detail-action-btn" size="large" type="primary" plain :disabled="!canRewriteTechnicalAll" @click="openTechnicalFullGenerateDialog('REWRITE')" :loading="fullGenerating || isTechnicalRunningByBackend">{{ isTechnicalRewriteRunning ? '重编中...' : '重编全文' }}</el-button>
                      <el-button
                        v-if="isTechnicalRunningByBackend"
                        class="detail-action-btn"
                        size="large"
                        type="danger"
                        :loading="technicalTaskCanceling"
                        :disabled="technicalTaskCanceling"
                        @click="cancelCurrentTechnicalTask"
                      >{{ technicalTaskCanceling ? '正在终止...' : '终止生成' }}</el-button>
                      <el-button
                        v-else
                        class="detail-action-btn"
                        size="large"
                        type="primary"
                        :disabled="!canGenerateTechnicalContent"
                        @click="openTechnicalFullGenerateDialog('GENERATE')"
                        :loading="fullGenerating"
                      >{{ technicalGenerateButtonText }}</el-button>
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
                        <el-button size="small" plain :disabled="!canInsertTechnicalImage" @click="openTechnicalImagePicker">插入配图</el-button>
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
                          :disabled="!canInsertTechnicalImage"
                          @click="openTechnicalImagePicker"
                        >
                          插入配图
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
                    ref="technicalSectionEditorRef"
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
                  <SectionContentPreview
                    v-else
                    class="section-content-preview"
                    :content="selectedTechnicalLeafDisplayContent"
                    :editable="canEditTechnicalSectionContent && !isTechnicalRunningByBackend"
                    @update-width="updateTechnicalImageWidth"
                    @update-align="updateTechnicalImageAlign"
                    @edit-caption="editTechnicalImageCaption"
                    @delete-reference="deleteTechnicalImageReference"
                  />
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
                  <el-button type="primary" :loading="isCurrentTechnicalOutlineGenerating" :disabled="isCurrentTechnicalOutlineGenerating" @click="generateTechnicalOutline">
                    {{ isCurrentTechnicalOutlineGenerating ? '目录生成中' : (isParseSuccess ? '生成目录' : '先解析再生成目录') }}
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
          placeholder="所属企业（可不选，留空为个人空间）"
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
          :placeholder="createDialog.enterpriseId ? '请选择项目负责人' : '个人空间默认当前账号'"
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
        <div class="create-space-tip">
          不选择企业时，项目保存到当前账号的个人空间；选择企业后，必须指定该企业的项目负责人。
        </div>
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

    <el-dialog
      v-model="wordPresetVisible"
      title="设置技术方案篇幅"
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
        <el-button @click="wordPresetVisible = false">暂不设置</el-button>
        <el-button type="primary" :loading="wordPresetSaving" :disabled="!wordPresetSelectionValid" @click="applyTechnicalWordPreset">{{ wordPresetNextAction ? '确认并继续生成' : '确认设置' }}</el-button>
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
          <el-select v-model="technicalAddNodeForm.targetWordCount" placeholder="请选择目标字数" clearable>
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
        <el-form-item label="生成模式：">
          <el-radio-group v-model="fullGenerateForm.generationProfile" class="style-radio-grid">
            <el-radio-button label="FAST">快速</el-radio-button>
            <el-radio-button label="STANDARD">标准</el-radio-button>
            <el-radio-button label="QUALITY">高质量</el-radio-button>
          </el-radio-group>
          <div class="form-tip">快速模式减少增强步骤；高质量模式增加检索、质检和有限重试。</div>
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


    <el-drawer
      v-model="technicalRequirementExtractVisible"
      title="评分项 / 需求解析"
      size="58%"
      destroy-on-close
      class="requirement-extract-drawer"
    >
      <div class="requirement-extract-wrap" v-loading="technicalRequirementExtractLoading">
        <div class="requirement-extract-toolbar">
          <div>
            <div class="requirement-extract-title">招标文件结构化解析结果</div>
            <div class="requirement-extract-desc">用于目录生成、章节绑定和正文生成；修改采购需求或评分标准后可重新解析。</div>
          </div>
          <div class="requirement-extract-actions">
            <el-button :disabled="!technicalRequirementExtract?.hasExtract" @click="openTechnicalExtractSummaryDialog">编辑摘要</el-button>
            <el-button :disabled="!technicalRequirementExtract?.hasExtract" @click="openTechnicalScoreItemDialog()">新增评分项</el-button>
            <el-button :disabled="!technicalRequirementExtract?.hasExtract" @click="openTechnicalRequirementItemDialog()">新增要求</el-button>
            <el-button :loading="technicalRequirementOutlineSyncing" :disabled="!technicalRequirementExtract?.hasExtract || !technicalSolution?.id || isTechnicalRunningByBackend" @click="onSyncTechnicalRequirementExtractToOutline">同步到章节</el-button>
            <el-button type="primary" :loading="technicalRequirementExtractRebuilding" :disabled="!technicalSolution?.id" @click="onRebuildTechnicalRequirementExtract">重新解析</el-button>
          </div>
        </div>

        <el-empty v-if="!technicalRequirementExtract?.hasExtract" :description="technicalRequirementExtractEmptyDescription" :image-size="120" />

        <template v-else>
          <div class="requirement-extract-summary">
            <div class="summary-stat-card">
              <span>评分项</span>
              <strong>{{ technicalRequirementExtract.scoreItemCount || 0 }}</strong>
            </div>
            <div class="summary-stat-card">
              <span>要求明细</span>
              <strong>{{ technicalRequirementExtract.requirementItemCount || 0 }}</strong>
            </div>
            <div class="summary-stat-card wide">
              <span>解析状态</span>
              <strong>{{ technicalRequirementExtract.extract?.parseStatus || '-' }}</strong>
              <small>{{ technicalRequirementExtract.extract?.parseMessage || '' }}</small>
            </div>
          </div>

          <div v-if="technicalRequirementTypeCountTags.length" class="requirement-type-tags">
            <el-tag v-for="item in technicalRequirementTypeCountTags" :key="item.type" :type="requirementTypeTagType(item.type)" effect="light">
              {{ requirementTypeLabel(item.type) }}：{{ item.count }}
            </el-tag>
          </div>

          <el-descriptions class="extract-desc-box" :column="2" border>
            <el-descriptions-item label="项目名称">{{ technicalRequirementExtract.extract?.projectName || '-' }}</el-descriptions-item>
            <el-descriptions-item label="采购人/招标人">{{ technicalRequirementExtract.extract?.buyerName || '-' }}</el-descriptions-item>
            <el-descriptions-item label="预算/最高限价">{{ technicalRequirementExtract.extract?.budgetAmount || '-' }}</el-descriptions-item>
            <el-descriptions-item label="工期/服务期">{{ technicalRequirementExtract.extract?.periodRequirement || '-' }}</el-descriptions-item>
            <el-descriptions-item label="投标截止">{{ technicalRequirementExtract.extract?.bidDeadline || '-' }}</el-descriptions-item>
            <el-descriptions-item label="更新时间">{{ formatDateTime(technicalRequirementExtract.extract?.updateTime || technicalRequirementExtract.extract?.createTime) }}</el-descriptions-item>
          </el-descriptions>

          <el-collapse class="extract-collapse" model-value="score">
            <el-collapse-item title="结构化摘要" name="summary">
              <div class="summary-text-grid">
                <div v-for="item in technicalRequirementSummaryItems" :key="item.key" class="summary-text-item">
                  <strong>{{ item.label }}</strong>
                  <p>{{ item.value || '未提取' }}</p>
                </div>
              </div>
            </el-collapse-item>

            <el-collapse-item title="评分项" name="score">
              <el-table class="ui-table" :data="technicalRequirementExtract.scoreItems || []" border stripe size="small" empty-text="暂无评分项">
                <el-table-column label="序号" type="index" width="70" align="center" />
                <el-table-column prop="itemName" label="评分项" min-width="140" show-overflow-tooltip />
                <el-table-column prop="scoreText" label="分值" width="100" show-overflow-tooltip />
                <el-table-column prop="requirementText" label="评分要求" min-width="240" show-overflow-tooltip />
                <el-table-column prop="responseStrategy" label="响应策略" min-width="240" show-overflow-tooltip />
                <el-table-column prop="suggestedChapter" label="建议章节" min-width="160" show-overflow-tooltip />
                <el-table-column label="操作" width="120" fixed="right" align="center">
                  <template #default="{ row }">
                    <el-button link type="primary" size="small" @click="openTechnicalScoreItemDialog(row)">编辑</el-button>
                    <el-button link type="danger" size="small" @click="onDeleteTechnicalScoreItem(row)">删除</el-button>
                  </template>
                </el-table-column>
              </el-table>
            </el-collapse-item>

            <el-collapse-item title="要求明细" name="requirement">
              <el-table class="ui-table" :data="technicalRequirementExtract.requirementItems || []" border stripe size="small" empty-text="暂无要求明细">
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
                    <el-button link type="primary" size="small" @click="openTechnicalRequirementItemDialog(row)">编辑</el-button>
                    <el-button link type="danger" size="small" @click="onDeleteTechnicalRequirementItem(row)">删除</el-button>
                  </template>
                </el-table-column>
              </el-table>
            </el-collapse-item>
          </el-collapse>
        </template>
      </div>
    </el-drawer>

    <el-drawer
      v-model="technicalQualityCheckVisible"
      title="章节质量检查"
      size="60%"
      destroy-on-close
      class="quality-check-drawer"
    >
      <div class="quality-check-wrap" v-loading="technicalQualityCheckLoading">
        <div class="quality-check-toolbar">
          <div>
            <div class="quality-check-title">章节质量评分与风险复核</div>
            <div class="quality-check-desc">数据来自最近一次章节生成/重编时写入的质量事件日志；重新生成章节后可刷新查看。</div>
          </div>
          <el-button type="primary" plain :disabled="!technicalSolution?.id" :loading="technicalQualityCheckLoading" @click="loadTechnicalQualityCheck">刷新</el-button>
        </div>
        <div class="quality-stat-grid">
          <div v-for="item in technicalQualityStatCards" :key="item.label" class="quality-stat-card">
            <span>{{ item.label }}</span>
            <strong>{{ item.value }}</strong>
            <small>{{ item.desc }}</small>
          </div>
        </div>
        <el-alert
          v-if="technicalQualityCheckData.noQualityLogSections"
          class="quality-alert"
          type="warning"
          :closable="false"
          show-icon
          title="部分章节暂无质量检查记录"
          :description="`还有 ${technicalQualityCheckData.noQualityLogSections || 0} 个章节没有质量日志。通常是尚未生成，或生成时未开启质量检查。`"
        />
        <el-table
          class="ui-table quality-table"
          :data="technicalQualityItems"
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
            <template #default="{ row }">{{ row.hasQualityLog ? `${row.actionVerbHits || 0}/${row.deliverableHits || 0}/${row.verificationHits || 0}` : '-' }}</template>
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
      v-model="technicalWordCountVisible"
      title="字数检查与重复内容"
      size="58%"
      destroy-on-close
      class="quality-check-drawer"
    >
      <div class="quality-check-wrap" v-loading="technicalWordCountLoading">
        <div class="quality-check-toolbar">
          <div>
            <div class="quality-check-title">目标字数与生成字数</div>
            <div class="quality-check-desc">仅展示用户可理解的字数信息，不展示 Token、费用、模型调用次数等内部数据。</div>
          </div>
          <div class="toolbar-actions">
            <el-button plain :disabled="!technicalSolution?.id" @click="loadTechnicalWordCountStats">刷新</el-button>
            <el-button type="warning" plain :disabled="!technicalDuplicateCheckData?.recommendCompress || isTechnicalRunningByBackend" :loading="technicalDuplicateCompressing" @click="onCompressTechnicalDuplicates">一键压缩重复</el-button>
          </div>
        </div>
        <div class="quality-stat-grid">
          <div class="quality-stat-card"><span>目标字数</span><strong>{{ technicalWordCountStats.targetWordCount || 0 }}</strong><small>方案目标</small></div>
          <div class="quality-stat-card"><span>生成字数</span><strong>{{ technicalWordCountStats.actualWordCount || 0 }}</strong><small>当前正文</small></div>
          <div class="quality-stat-card"><span>完成度</span><strong>{{ technicalWordCountStats.ratioPercent || 0 }}%</strong><small>{{ technicalWordCountStats.summary || '-' }}</small></div>
          <div class="quality-stat-card"><span>重复段落</span><strong>{{ technicalDuplicateCheckData.duplicateParagraphCount || 0 }}</strong><small>{{ technicalDuplicateCheckData.summary || '未检查' }}</small></div>
        </div>
        <el-alert v-if="technicalWordCountStats.overSections" type="warning" show-icon :closable="false" class="quality-alert" :title="`发现 ${technicalWordCountStats.overSections} 个章节超出目标字数`" description="建议优先压缩重复背景、通用口号和同义反复，保留评分响应、措施、交付物和验收依据。" />
        <el-table class="ui-table quality-table" :data="technicalWordCountStats.items || []" border stripe size="small" empty-text="暂无字数数据">
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
      v-model="technicalReviewVisible"
      title="AI二次审稿"
      size="58%"
      destroy-on-close
      class="quality-check-drawer"
    >
      <div class="quality-check-wrap" v-loading="technicalReviewLoading">
        <div class="quality-check-toolbar">
          <div>
            <div class="quality-check-title">全文统一口径与审稿建议</div>
            <div class="quality-check-desc">用于正式导出前检查术语、工期、人员、交付物、服务承诺、重复内容和风险表达。</div>
          </div>
          <el-button type="primary" :disabled="!technicalSolution?.id || isTechnicalRunningByBackend" :loading="technicalReviewLoading" @click="runTechnicalAiReviewNow">开始审稿</el-button>
        </div>
        <el-descriptions v-if="technicalConsistencyPackage" :column="1" border class="extract-summary">
          <el-descriptions-item label="统一术语">{{ technicalConsistencyPackage.unifiedTerms || '-' }}</el-descriptions-item>
          <el-descriptions-item label="统一工期">{{ technicalConsistencyPackage.unifiedPeriod || '-' }}</el-descriptions-item>
          <el-descriptions-item label="统一人员">{{ technicalConsistencyPackage.unifiedPersonnel || '-' }}</el-descriptions-item>
          <el-descriptions-item label="统一交付物">{{ technicalConsistencyPackage.unifiedDeliverables || '-' }}</el-descriptions-item>
          <el-descriptions-item label="服务承诺">{{ technicalConsistencyPackage.unifiedServiceCommitment || '-' }}</el-descriptions-item>
          <el-descriptions-item label="风险边界">{{ technicalConsistencyPackage.unifiedRiskBoundary || '-' }}</el-descriptions-item>
        </el-descriptions>
        <template v-if="technicalReviewResult">
          <div class="quality-stat-grid">
            <div class="quality-stat-card"><span>审稿得分</span><strong>{{ technicalReviewResult.overallScore ?? '-' }}</strong><small>{{ technicalReviewResult.summary || '-' }}</small></div>
            <div class="quality-stat-card"><span>风险等级</span><strong>{{ technicalReviewResult.riskLevel || '-' }}</strong><small>LOW / MEDIUM / HIGH</small></div>
            <div class="quality-stat-card"><span>问题数量</span><strong>{{ (technicalReviewResult.issues || []).length }}</strong><small>建议逐项处理</small></div>
          </div>
          <el-table class="ui-table quality-table" :data="technicalReviewResult.issues || []" border stripe size="small" empty-text="暂无审稿问题">
            <el-table-column prop="severity" label="等级" width="100" align="center" />
            <el-table-column prop="title" label="问题" min-width="160" show-overflow-tooltip />
            <el-table-column prop="description" label="说明" min-width="220" show-overflow-tooltip />
            <el-table-column prop="suggestion" label="修改建议" min-width="260" show-overflow-tooltip />
          </el-table>
          <el-input v-if="technicalReviewResult.aiReviewText" class="review-textarea" type="textarea" :rows="12" readonly :model-value="technicalReviewResult.aiReviewText" />
        </template>
      </div>
    </el-drawer>

    <el-dialog v-model="technicalExtractSummaryDialogVisible" title="编辑结构化摘要" width="860px" append-to-body destroy-on-close>
      <el-form label-width="120px" class="requirement-edit-form">
        <el-row :gutter="12">
          <el-col :span="12"><el-form-item label="项目名称"><el-input v-model="technicalExtractSummaryForm.projectName" maxlength="300" /></el-form-item></el-col>
          <el-col :span="12"><el-form-item label="采购人"><el-input v-model="technicalExtractSummaryForm.buyerName" maxlength="300" /></el-form-item></el-col>
          <el-col :span="12"><el-form-item label="预算/限价"><el-input v-model="technicalExtractSummaryForm.budgetAmount" maxlength="120" /></el-form-item></el-col>
          <el-col :span="12"><el-form-item label="工期/服务期"><el-input v-model="technicalExtractSummaryForm.periodRequirement" maxlength="500" /></el-form-item></el-col>
          <el-col :span="12"><el-form-item label="投标截止"><el-input v-model="technicalExtractSummaryForm.bidDeadline" maxlength="120" /></el-form-item></el-col>
        </el-row>
        <el-form-item label="技术摘要"><el-input v-model="technicalExtractSummaryForm.technicalSummary" type="textarea" :rows="3" maxlength="3000" show-word-limit /></el-form-item>
        <el-form-item label="商务摘要"><el-input v-model="technicalExtractSummaryForm.businessSummary" type="textarea" :rows="3" maxlength="3000" show-word-limit /></el-form-item>
        <el-form-item label="服务/交付摘要"><el-input v-model="technicalExtractSummaryForm.serviceSummary" type="textarea" :rows="3" maxlength="3000" show-word-limit /></el-form-item>
        <el-form-item label="资格摘要"><el-input v-model="technicalExtractSummaryForm.qualificationSummary" type="textarea" :rows="3" maxlength="3000" show-word-limit /></el-form-item>
        <el-form-item label="风险摘要"><el-input v-model="technicalExtractSummaryForm.riskSummary" type="textarea" :rows="3" maxlength="3000" show-word-limit /></el-form-item>
        <el-form-item label="否决/禁止项"><el-input v-model="technicalExtractSummaryForm.forbiddenSummary" type="textarea" :rows="3" maxlength="3000" show-word-limit /></el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="technicalExtractSummaryDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="technicalExtractSummarySaving" @click="onSaveTechnicalExtractSummary">保存</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="technicalScoreItemDialogVisible" :title="technicalScoreItemEditingId ? '编辑评分项' : '新增评分项'" width="760px" append-to-body destroy-on-close>
      <el-form label-width="96px" class="requirement-edit-form">
        <el-row :gutter="12">
          <el-col :span="14"><el-form-item label="评分项"><el-input v-model="technicalScoreItemForm.itemName" maxlength="300" placeholder="例如：项目实施方案" /></el-form-item></el-col>
          <el-col :span="10"><el-form-item label="分值"><el-input v-model="technicalScoreItemForm.scoreText" maxlength="120" placeholder="例如：15分" /></el-form-item></el-col>
          <el-col :span="14"><el-form-item label="建议章节"><el-input v-model="technicalScoreItemForm.suggestedChapter" maxlength="300" placeholder="例如：项目实施方案" /></el-form-item></el-col>
          <el-col :span="10"><el-form-item label="排序"><el-input-number v-model="technicalScoreItemForm.sortNo" :min="1" :max="9999" style="width: 100%" /></el-form-item></el-col>
        </el-row>
        <el-form-item label="评分要求"><el-input v-model="technicalScoreItemForm.requirementText" type="textarea" :rows="5" maxlength="2000" show-word-limit /></el-form-item>
        <el-form-item label="响应策略"><el-input v-model="technicalScoreItemForm.responseStrategy" type="textarea" :rows="5" maxlength="2000" show-word-limit /></el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="technicalScoreItemDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="technicalScoreItemSaving" @click="onSaveTechnicalScoreItem">保存</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="technicalRequirementItemDialogVisible" :title="technicalRequirementItemEditingId ? '编辑要求明细' : '新增要求明细'" width="820px" append-to-body destroy-on-close>
      <el-form label-width="104px" class="requirement-edit-form">
        <el-row :gutter="12">
          <el-col :span="8">
            <el-form-item label="要求类型">
              <el-select v-model="technicalRequirementItemForm.requirementType" style="width: 100%">
                <el-option v-for="item in requirementTypeOptions" :key="item.value" :label="item.label" :value="item.value" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="风险等级">
              <el-select v-model="technicalRequirementItemForm.riskLevel" style="width: 100%">
                <el-option v-for="item in riskLevelOptions" :key="item.value" :label="item.label" :value="item.value" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="8"><el-form-item label="强制响应"><el-switch v-model="technicalRequirementItemForm.mandatory" active-text="是" inactive-text="否" /></el-form-item></el-col>
          <el-col :span="16"><el-form-item label="要求标题"><el-input v-model="technicalRequirementItemForm.requirementTitle" maxlength="300" /></el-form-item></el-col>
          <el-col :span="8"><el-form-item label="排序"><el-input-number v-model="technicalRequirementItemForm.sortNo" :min="1" :max="9999" style="width: 100%" /></el-form-item></el-col>
          <el-col :span="24"><el-form-item label="建议章节"><el-input v-model="technicalRequirementItemForm.suggestedChapter" maxlength="300" /></el-form-item></el-col>
        </el-row>
        <el-form-item label="要求内容"><el-input v-model="technicalRequirementItemForm.requirementText" type="textarea" :rows="5" maxlength="2000" show-word-limit /></el-form-item>
        <el-form-item label="建议响应"><el-input v-model="technicalRequirementItemForm.suggestedResponse" type="textarea" :rows="5" maxlength="2000" show-word-limit /></el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="technicalRequirementItemDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="technicalRequirementItemSaving" @click="onSaveTechnicalRequirementItem">保存</el-button>
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

    <el-dialog v-model="tenderAnalysisDialog.visible" title="招标文件分析" width="1080px" append-to-body destroy-on-close>
      <div class="tender-analysis-intro">
        <div>
          <strong>分析当前 AI标书项目</strong>
          <p>基于所选知识库资料生成关键信息、评分矩阵、缺失资料和偏离表初稿。分析结果会保存到当前项目，后续投标文件和技术方案可继续复用。</p>
        </div>
        <div class="tender-analysis-actions">
          <el-button @click="openKnowledgeSelector('tenderAnalysis')">选择知识库</el-button>
          <el-button type="primary" :loading="tenderAnalysisDialog.loading" @click="runProjectTenderAnalysis">开始分析</el-button>
        </div>
      </div>

      <div v-if="selectedTenderAnalysisKnowledgeBases.length" class="selected-kb-list analysis-kb-list">
        <el-tag
          v-for="kb in selectedTenderAnalysisKnowledgeBases"
          :key="kb.id"
          closable
          @close="removeSelectedKnowledgeBase(kb.id, 'tenderAnalysis')"
        >
          {{ kb.kbName }}
        </el-tag>
      </div>
      <el-alert
        v-else
        class="analysis-alert"
        type="warning"
        :closable="false"
        show-icon
        title="当前项目未选择分析来源知识库，请先选择包含招标文件或招标资料的知识库。"
      />

      <el-tabs v-if="tenderAnalysis" class="analysis-tabs">
        <el-tab-pane label="关键信息">
          <el-table class="ui-table" :data="tenderAnalysis.keyInfo || []" max-height="420">
            <el-table-column prop="fieldName" label="字段" width="150" />
            <el-table-column prop="value" label="识别结果" min-width="240" show-overflow-tooltip />
            <el-table-column prop="confidence" label="置信度" width="100" />
            <el-table-column prop="citation" label="来源" min-width="220" show-overflow-tooltip />
          </el-table>
        </el-tab-pane>
        <el-tab-pane label="评分矩阵">
          <el-table class="ui-table" :data="tenderAnalysis.scoreMatrix || []" max-height="420">
            <el-table-column prop="itemName" label="事项" width="170" show-overflow-tooltip />
            <el-table-column prop="requirement" label="要求/依据" min-width="260" show-overflow-tooltip />
            <el-table-column prop="responseStatus" label="状态" width="140" />
            <el-table-column prop="riskLevel" label="风险" width="90" />
            <el-table-column prop="suggestion" label="建议" min-width="260" show-overflow-tooltip />
            <el-table-column prop="citation" label="来源" min-width="180" show-overflow-tooltip />
          </el-table>
        </el-tab-pane>
        <el-tab-pane label="缺失资料">
          <el-table class="ui-table" :data="tenderAnalysis.missingMaterials || []" max-height="420">
            <el-table-column prop="itemName" label="事项" width="170" show-overflow-tooltip />
            <el-table-column prop="requirement" label="要求/依据" min-width="260" show-overflow-tooltip />
            <el-table-column prop="responseStatus" label="状态" width="140" />
            <el-table-column prop="riskLevel" label="风险" width="90" />
            <el-table-column prop="suggestion" label="建议" min-width="260" show-overflow-tooltip />
            <el-table-column prop="citation" label="来源" min-width="180" show-overflow-tooltip />
          </el-table>
        </el-tab-pane>
        <el-tab-pane label="偏离表初稿">
          <el-table class="ui-table" :data="tenderAnalysis.deviationTable || []" max-height="420">
            <el-table-column prop="itemName" label="事项" width="170" show-overflow-tooltip />
            <el-table-column prop="requirement" label="要求/依据" min-width="260" show-overflow-tooltip />
            <el-table-column prop="responseStatus" label="状态" width="140" />
            <el-table-column prop="riskLevel" label="风险" width="90" />
            <el-table-column prop="suggestion" label="建议" min-width="260" show-overflow-tooltip />
            <el-table-column prop="citation" label="来源" min-width="180" show-overflow-tooltip />
          </el-table>
        </el-tab-pane>
        <el-tab-pane label="建议">
          <div class="check-list">
            <div v-for="item in tenderAnalysis.suggestions || []" :key="item">{{ item }}</div>
          </div>
        </el-tab-pane>
      </el-tabs>
      <el-empty v-else description="选择知识库后点击开始分析。分析结果为初稿，正式投标前必须人工核对招标文件原文。" />
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

    <ImageLibraryPicker
      v-model="imagePickerVisible"
      :chapter-title="selectedTechnicalLeaf?.title || ''"
      :enterprise-id="selectedProject?.enterpriseId || auth.enterpriseId || ''"
      @insert="insertTechnicalImage"
    />

  </div>
</template>

<script setup>
import { defineComponent, h } from 'vue'
import { ElButton, ElCheckbox, ElInput, ElOption, ElSelect, ElTag } from '@/plugins/element-plus-api'
import ImageLibraryPicker from '@/components/ImageLibraryPicker.vue'
import SectionContentPreview from '@/components/SectionContentPreview.vue'
import { ArrowDown, Close, Delete, Document, EditPen, Loading, Plus, Refresh, Search, SortDown, SortUp, UploadFilled } from '@element-plus/icons-vue'
import { useBidProjectPage } from './composables/useBidProjectPage'

const {
  router, auth, keyword, projectLoading, projectAppendLoading, projects, selectedProject, projectListScrollbar,
  projectPager, expandedProjectId, workflow, activeDoc, uploadFiles, uploadRef, technicalTenderInputRef, technicalTenderUploading,
  readTenderLoading, autoFillLoading, bidDocumentLoading, bidDocumentFilling, bidDocumentSaving, bidDocumentReviewSaving, bidDocumentExporting, bidDocumentDraft,
  bidDocumentReviewForm, bidDocumentDetail, companyMaterialOptions, companyMaterialDialog, tenderAnalysisDialog, tenderAnalysis, tenderAnalysisKnowledgeIds, enterpriseOptions,
  ownerUserOptions, enterpriseLoading, enterpriseKeywordTimer, timer, poller, technicalOutlinePoller, technicalOutlinePendingProjectId, technicalTaskPoller,
  technicalTaskPending, technicalTaskPollingBusy, technicalTaskPollErrorCount, technicalTaskPollTick, technicalTaskLastFinishedNodes, technicalTaskLastDetailRefreshAt, technicalTaskCanceling, technicalTaskTerminalNotifiedIds,
  globalAiRunningTask, globalAiTaskPoller, GLOBAL_AI_TASK_POLL_INTERVAL_MS, GLOBAL_AI_TASK_MIN_INTERVAL_MS, TECHNICAL_TASK_POLL_INTERVAL_MS, TECHNICAL_OUTLINE_POLL_INTERVAL_MS, globalAiRunningTaskPromise, lastGlobalAiRunningTaskAt,
  technicalSolutionRequestPromise, technicalSolutionRequestProjectId, workflowRefreshPromise, workflowRefreshProjectId, technicalOutlinePollingBusy, technicalOutlinePollErrorCount, technicalSolutionLoadErrorCount, TECH_OUTLINE_PENDING_KEY,
  TECH_TASK_PENDING_KEY, TECH_GENERATION_TIMING_KEY, technicalGenerationClock, technicalGenerationTiming, lastAutoExtractParseKey, wordPresetVisible, wordPresetSaving, wordPresetNextAction, fullGenerating, exportingWord, wordPreset,
  wordPresetSelectionValid, selectedTechnicalLeaf, technicalAutoPreviewFollow, technicalManualSelectedLeafId, technicalEditMode, technicalEditTab, technicalDeleteIds, technicalAddNodeVisible,
  technicalAddBaseNode, technicalAddNodeForm, technicalOverallWritingRequirement, technicalStreamingOutlineId, technicalSectionContentEditMode, technicalSectionContentDraft, technicalSectionContentSaving, technicalSectionEditorRef,
  imagePickerVisible, sectionNode, sectionDialogVisible, sectionGenerating, sectionOptimizing, sectionOptimizingNodeId, sectionStreamingText, technicalShortenDialogVisible,
  technicalShortenTargetMode, technicalShortenCustomWordCount, technicalShortenPresetOptions, wordOptions, sectionForm, DEFAULT_BLIND_BID_REQUIREMENT, fullGenerateForm, fullGenerateSettingVisible,
  fullGenerateAction, knowledgeSelectorVisible, knowledgeLoading, knowledgeKeyword, knowledgeBaseList, tempSelectedKnowledgeIds, knowledgeSelectorTarget, selectedKnowledgeBaseCache,
  selectedKnowledgeBases, selectedSectionKnowledgeBases, selectedTenderAnalysisKnowledgeBases, technicalVersionDialogVisible, technicalVersionLoading, technicalVersionRestoring, technicalVersionList, selectedTechnicalVersion,
  selectedTechnicalVersionSnapshot, technicalRequirementExtractVisible, technicalRequirementExtractLoading, technicalRequirementExtractRebuilding, technicalRequirementOutlineSyncing, technicalRequirementExtract, technicalExtractSummaryDialogVisible, technicalExtractSummarySaving,
  technicalScoreItemDialogVisible, technicalScoreItemSaving, technicalScoreItemEditingId, technicalRequirementItemDialogVisible, technicalRequirementItemSaving, technicalRequirementItemEditingId, technicalExtractSummaryForm, technicalScoreItemForm,
  technicalRequirementItemForm, technicalQualityCheckVisible, technicalQualityCheckLoading, technicalQualityCheckData, technicalWordCountVisible, technicalWordCountLoading, technicalWordCountStats, technicalDuplicateCheckData,
  technicalDuplicateCompressing, technicalReviewVisible, technicalReviewLoading, technicalConsistencyPackage, technicalReviewResult, technicalRequirementExtractTimer, requirementTypeOptions, riskLevelOptions,
  createDialog, techSteps, aiLevels, technicalSubTypeMap, technicalStep, technicalMode, technicalGeneratingOutline, technicalSolution,
  technicalOutlines, isCurrentTechnicalOutlineGenerating, technicalForm, technicalSubTypes, resetTechnicalWorkspace, resetBidDocumentWorkspace, workflowDocuments, parseReportText,
  parseProgress, hasTenderFile, tenderFileDisplayName, isParseRunning, isParseSuccess, parseStatusLabel, isPlatformUser, hasCompanyMaterial,
  bidDocumentContent, bidDocAnalysis, bidDocumentStatusLabel, canFillBidDocument, technicalOutlineLeafCount, technicalLeafNodes, technicalFinishedLeafCount, technicalRetryableLeafNodes,
  technicalRetryableLeafCount, canRetryTechnicalFailedSections, technicalGeneratePercent, technicalTargetWordCount, technicalActualWordCount, estimatePageCount, technicalTargetPageCount, technicalActualPageCount,
  showTechnicalStats, technicalWorkflowState, technicalActiveStep, technicalWorkflowStatusText, technicalWorkflowAlertData, technicalGeneratedView, selectedTechnicalLeafContent, technicalSectionContentDirty,
  technicalSectionEditorWordCount, selectedTechnicalLeafDisplayContent, canEditTechnicalOutline, canCopyTechnicalSection, canEditTechnicalSectionContent, canInsertTechnicalImage, canOptimizeTechnicalSection, canGenerateTechnicalContent,
  canRewriteTechnicalAll, canExportTechnicalWord, isGlobalAiTaskRunning, isGlobalAiTaskForCurrentTechnicalSolution, technicalRunningTask, technicalRunningTaskStatus, isTechnicalTaskWaiting, isTechnicalTaskRunning,
  isTechnicalRunningByBackend, hasOtherAiTaskRunning, isTechnicalRewriteRunning, technicalRunningTaskTypeLabel, technicalRunningTaskProgress, technicalRunningTaskMessage, technicalRunningTaskTip,
  technicalGenerationTimingVisible, technicalGenerationTimingActive, isCurrentTechnicalContentTimingActive, technicalGenerationElapsedMs, technicalGenerationElapsedText, technicalGenerationTimingLabel, technicalGenerationTimingStatusText, isTechnicalBusy,
  projectNoMore, technicalGenerateButtonText, technicalRequirementExtractEmptyDescription, technicalRequirementTypeCountTags, technicalRequirementSummaryItems, technicalQualityItems, technicalQualityStatCards, currentTechnicalSolutionId,
  normalizeRequirementExtractPayload, normalizeQualityCheckPayload, openTechnicalRequirementExtractDrawer, loadTechnicalRequirementExtract, startTechnicalRequirementExtractPolling, onRebuildTechnicalRequirementExtract, onSyncTechnicalRequirementExtractToOutline, openTechnicalExtractSummaryDialog,
  onSaveTechnicalExtractSummary, openTechnicalScoreItemDialog, nextTechnicalScoreItemSortNo, onSaveTechnicalScoreItem, onDeleteTechnicalScoreItem, openTechnicalRequirementItemDialog, nextTechnicalRequirementItemSortNo, onSaveTechnicalRequirementItem,
  onDeleteTechnicalRequirementItem, openTechnicalQualityCheckDrawer, loadTechnicalQualityCheck, openTechnicalWordCountDrawer, loadTechnicalWordCountStats, onCompressTechnicalDuplicates, openTechnicalReviewDrawer, runTechnicalAiReviewNow,
  safePercent, qualityLevelTagType, qualityProgressStatus, issueSeverityTagType, qualityRowClassName, wordStatusTagType, requirementTypeLabel, requirementTypeTagType,
  handleBidProjectVisibilityChange, startGlobalAiTaskPolling, loadGlobalAiRunningTask, technicalDisplayStatus, patchSelectedProjectTechnicalStatus, buildWorkflowDocuments, defaultDocuments, doc,
  statusLabel, statusType, statusDotClass, projectStatusSummary, onKeywordInput, loadProjects, onProjectListScroll, selectProject,
  isProjectExpanded, toggleProjectFold, refreshWorkflow, defaultTenderAnalysisKnowledgeIds, openTenderAnalysisDialog, runProjectTenderAnalysis, openCreateProject, loadCreateEnterprises,
  remoteSearchCreateEnterprises, onCreateEnterpriseVisibleChange, onCreateEnterpriseChange, closeCreateDialog, resetUploadFile, onTenderFileChange, onTenderFileExceed, onTenderFileRemove,
  uploadTenderOnly, triggerTechnicalTenderUpload, onTechnicalTenderFileChange, startReadTenderForSelected, startReadTenderFromTechnical, autoFillProjectBasicInfo, openDocument, openDocumentByType,
  confirmDeleteProject, loadBidDocumentDetail, refreshBidDocument, openCompanyMaterialSelector, confirmCompanyMaterialBind, unbindSelectedCompanyMaterial, smartFillBidDocument, saveBidDocumentDraft,
  hydrateBidDocumentReviewForm, bidDocumentReviewStatusText, saveBidDocumentReview, exportBidDocumentWordFile, exportBidDocumentMarkdownFile, materialTypeLabel, loadTechnicalSolution, hydrateTechnicalOutlinesFromSolution,
  mapSolutionOutlineNode, syncTechnicalOutlineTree, technicalOutlineTreeSignature, reconcileTechnicalOutlineArray, reconcileTechnicalOutlineNode, normalizeAiLevel, requireSelectedTechnicalAiLevel, hydrateTechnicalSolutionForm,
  extractTechnicalRequirement, autoFillTechnicalRequirementAfterParse, generateTechnicalOutline, normalizeId, uniqueIds, normalizeKnowledgeIds, parseKnowledgeIds, stringifyKnowledgeIds,
  buildSelectedKnowledgeBases, collectTechnicalFullGenerateKnowledgeIds, getCurrentKnowledgeIdsByTarget, setCurrentKnowledgeIdsByTarget, goKnowledgeBasePage, openKnowledgeSelector, loadKnowledgeBases, confirmKnowledgeSelection,
  removeSelectedKnowledgeBase, openWordPresetDialog, technicalNeedsWordPreset, technicalNeedsWordPresetForAction, resetWordPresetSelection, setWordPreset, buildSectionWordPresetAction, isSectionWordPresetAction,
  parseSectionWordPresetAction, applyTechnicalWordPreset, handleFullGenerateBlindChange, resetFullGenerateBlindSetting, openTechnicalFullGenerateDialog, confirmTechnicalFullGenerate, fullGeneratePreferenceText, mergePreferenceIntoRequirement,
  applyTechnicalFullGeneratePreferences, startTechnicalFullGenerate, markTechnicalTaskPending, clearTechnicalTaskPending, restoreTechnicalTaskPending, startTechnicalTaskPolling, technicalTaskTypeLabel, safeTechnicalTaskMessage,
  cancelCurrentTechnicalTask, pollTechnicalGenerationTask, notifyTechnicalTaskTerminal, technicalLeafTitle, briefTechnicalNodeList, buildTechnicalExportWarnings, confirmTechnicalExportBeforeDownload, notifyTechnicalWordExportSuccess,
  chooseExportFormat, escapeHtml, internalInfoHtml, showTechnicalWordCountCheck, showTechnicalQualityCheck, showTechnicalDuplicateCheck, reviewTechnicalByAi, exportTechnical,
  waitTechnicalExportTask, sleep, isGenerationTimingActiveStatus, parseGenerationTimestamp, formatGenerationDuration, persistTechnicalGenerationTiming, restoreTechnicalGenerationTiming, beginTechnicalGenerationTiming, ensureTechnicalGenerationTiming,
  syncTechnicalGenerationTimingFromTask, finishTechnicalGenerationTiming, finishTechnicalGenerationTimingFromTask, syncTechnicalGenerationStateFromSolution, markTechnicalOutlinePending, clearTechnicalOutlinePending, restoreTechnicalOutlinePending, startTechnicalOutlinePolling, isTechnicalOutlineGeneratingStatus, technicalOutlineFailureMessage,
  technicalOutlinesNeedWordPreset, checkTechnicalOutlineReady, getTechnicalOutlinesFromSolution, flattenTechnicalLeaves, isTechnicalNodeOptimizing, isTechnicalLeafDone, technicalNodeStatusLabel, technicalNodeStatusType,
  getTechnicalLeafContent, contentSignature, setTechnicalLeafContentLocal, markTechnicalManualSelection, clearTechnicalManualSelection, selectTechnicalLeaf, syncSelectedTechnicalLeaf, syncTechnicalOverallRequirement,
  toggleTechnicalEditMode, reloadTechnicalAfterOutlineEdit, onTechnicalNodeWordChange, onTechnicalBatchWord, onSaveTechnicalOverallRequirement, streamTechnicalOverallDirection, onTechnicalAiWriteDirection, onTechnicalSaveWritingConfig,
  openTechnicalAddNodeDialog, onTechnicalAddNode, onTechnicalDeleteNodes, onTechnicalMoveNode, normalizeSectionContent, startEditTechnicalSectionContent, confirmDiscardTechnicalSectionContentChanges, cancelEditTechnicalSectionContent,
  copyTechnicalSectionContent, fallbackCopyText, SECTION_OPTIMIZE_REQUIREMENT_MARKER, sectionStoredWritingRequirement, sectionOptimizeInstruction, sectionOptimizeWritingRequirement, sectionOptimizeTargetWordCount, optimizeActionLabel,
  maxAcceptableFrontendWords, openTechnicalShortenDialog, confirmTechnicalShortenSection, optimizeTechnicalSection, countTextWords, formatDateTime, parseVersionSnapshot, currentTechnicalSectionWordCount,
  openTechnicalVersionDialog, selectTechnicalVersion, onRestoreTechnicalVersion, onRestoreTechnicalVersionSection, openTechnicalImagePicker, insertTechnicalImage, buildImageMarker, buildTechnicalImageMarker,
  sanitizeImageCaption, normalizeImageWidth, normalizeImageAlign, parseTechnicalImageMarker, findTechnicalImageLineIndex, applyTechnicalImageMarkerChange, collectTechnicalImageMarkers, mergePreservedTechnicalImages,
  restoreTechnicalImagesIfNeeded, focusTechnicalSectionEditor, updateTechnicalImageWidth, updateTechnicalImageAlign, editTechnicalImageCaption, deleteTechnicalImageReference, saveTechnicalSectionContent, selectFirstGeneratedTechnicalLeaf,
  selectLatestTechnicalPreviewLeaf, findTechnicalOutlineNodeById, openTechnicalSectionDialog, generateTechnicalSection, startPolling, isOutlineGenerated, isOutlineFailed, isTechnicalLeafRetryable,
  outlineActualWordCount, outlineTargetWordCount, technicalWordHealthClass, technicalWordHealthLabel, technicalWordHealthType
} = useBidProjectPage()

const OutlineTree = defineComponent({
  name: 'OutlineTree',
  props: {
    nodes: { type: Array, default: () => [] },
    mode: { type: String, default: 'view' },
    simple: { type: Boolean, default: false },
    selected: { type: Array, default: () => [] },
    selectedId: { type: [String, Number], default: '' }
  },
  emits: ['word-change', 'batch-word', 'add-node', 'update:selected', 'move', 'preview', 'section-generate'],
  setup(props, { emit }) {
    const nodeKey = (node, depth = 0) => String(node?.id || `${depth}-${node?.title || 'node'}`)
    const renderNode = (node, depth = 0) => {
      const hasChildren = node.children?.length
      const key = nodeKey(node, depth)
      const checkbox = props.mode === 'delete'
        ? h(ElCheckbox, {
          modelValue: props.selected.includes(node.id),
          'onUpdate:modelValue': (checked) => {
            const next = checked ? [...props.selected, node.id] : props.selected.filter((id) => id !== node.id)
            emit('update:selected', next)
          }
        })
        : null
      const isSelected = props.mode === 'generate' && !hasChildren && String(props.selectedId || '') === String(node.id || '')
      const title = h('span', { class: ['tree-title', hasChildren ? 'parent' : 'leaf'] }, node.title)
      const controls = []
      if (props.mode === 'word') {
        if (hasChildren) {
          controls.push(h(ElSelect, { modelValue: null, size: 'small', class: 'word-select', placeholder: '批量修改', onChange: (v) => emit('batch-word', { node, value: v }) }, () => wordOptions.map((n) => h(ElOption, { key: n, label: `${n}字`, value: n }))))
        } else {
          controls.push(h(ElSelect, { modelValue: Number(node.targetWordCount || node.wordCount || 0) > 0 ? Number(node.targetWordCount || node.wordCount || 0) : null, size: 'small', class: 'word-select', placeholder: '请选择', onChange: (v) => emit('word-change', { node, value: v }) }, () => wordOptions.map((n) => h(ElOption, { key: n, label: `${n}字`, value: n }))))
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
      return h('div', { class: 'tree-node-wrap', key }, [
        h('div', { key: `${key}-row`, class: ['tree-row', `level-${depth}`, props.mode === 'generate' && !hasChildren ? 'clickable generate-row' : '', isSelected ? 'selected' : ''], style: { paddingLeft: `${depth * 20}px` }, onClick: () => { if (props.mode === 'generate' && !hasChildren) emit('preview', node) } }, [checkbox, h('span', { class: 'tree-dot' }, hasChildren ? '▾' : '•'), title, h('div', { class: ['tree-controls', props.mode === 'generate' && !hasChildren ? 'generate-controls' : ''] }, controls)]),
        hasChildren ? h('div', { key: `${key}-children`, class: 'tree-children' }, node.children.map((child) => renderNode(child, depth + 1))) : null
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
    const nodeKey = (node, depth = 0) => String(node?.id || `${depth}-${node?.title || 'node'}`)
    const renderNode = (node, depth = 0) => {
      const hasChildren = node.children?.length
      const key = nodeKey(node, depth)
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
      return h('div', { class: 'direction-node', key }, [
        h('div', { key: `${key}-row`, class: 'tree-row', style: { paddingLeft: `${depth * 20}px` } }, [h('span', { class: 'tree-dot' }, hasChildren ? '▾' : '•'), h(ElInput, { modelValue: node.title, class: 'title-input', 'onUpdate:modelValue': (v) => { node.title = v } }), h(ElButton, { size: 'small', onClick: () => emit('save', node) }, () => '保存')]),
        editor,
        children
      ])
    }
    return () => h('div', { class: 'writing-direction-tree' }, props.nodes.map((node) => renderNode(node, 0)))
  }
})
</script>

<style scoped src="./index.scoped.css"></style>
