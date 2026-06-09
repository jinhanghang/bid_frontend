<template>
  <div class="ai-doc-page">
    <aside class="doc-sidebar">
      <div class="side-head">
        <div>
          <h3>AI文档生成</h3>
          <p>可研 / 合同 / 环评 / 交评</p>
        </div>
        <el-button type="primary" size="small" :icon="Plus" :disabled="isOperationLocked" @click="resetWorkspace">新建</el-button>
      </div>

      <el-input
        v-model="query.keyword"
        class="side-search"
        clearable
        placeholder="搜索文档"
        :prefix-icon="Search"
        :disabled="false"
        @input="onSearchInput"
        @clear="reloadDocumentsFirstPage"
      />

      <el-scrollbar ref="docListScrollbar" class="doc-list-scroll" v-loading="loading && documents.length === 0" @scroll="onDocumentListScroll">
        <div v-if="documents.length" class="doc-list">
          <div
            v-for="item in documents"
            :key="item.id"
            class="doc-item"
            :class="{ active: currentDoc?.id === item.id }"
            @click="loadDetail(item.id)"
          >
            <div class="doc-item-title">
              <el-icon><Document /></el-icon>
              <span>{{ item.solutionName }}</span>
            </div>
            <div class="doc-item-meta">
              <el-tag size="small" type="primary">{{ docTypeLabel(item.solutionType) }}</el-tag>
              <el-tag size="small" :type="statusTagType(item.status)">{{ statusLabel(item.status) }}</el-tag>
            </div>
            <div class="doc-item-bottom">
              <span>{{ formatDateTime(item.updateTime || item.createTime) }}</span>
              <el-button link type="danger" :disabled="isOperationLocked" @click.stop="onDelete(item)">删除</el-button>
            </div>
          </div>
          <div v-if="documents.length" class="doc-list-load-state">
            <span v-if="appendLoading">正在加载更多...</span>
            <span v-else-if="documentNoMore">—没有更多AI文档了—</span>
            <span v-else>下滑加载更多</span>
          </div>
        </div>
        <el-empty v-else-if="!loading" description="暂无AI文档" :image-size="100" />
      </el-scrollbar>
    </aside>

    <main class="doc-main">
      <template v-if="!currentDoc">
        <div class="home-panel">
          <h1>AI文档</h1>
          <p class="home-desc">选择文档类型后进入工作台，基础信息、生成要求、参考资料统一在弹窗中填写，页面只保留大纲、正文和生成操作。</p>
          <div class="type-grid">
            <div
              v-for="type in documentTypes"
              :key="type.type"
              class="type-card"
              :class="{ locked: isOperationLocked }"
              @click="createNew(type)"
            >
              <h3>{{ type.title }}</h3>
              <p>{{ type.description }}</p>
              <div class="type-ill">AI</div>
            </div>
          </div>
          <el-button type="primary" class="home-new-btn" :disabled="isOperationLocked" @click="documentTypes[0] && createNew(documentTypes[0])">新建文档</el-button>
        </div>
      </template>

      <template v-else>
        <section class="work-header">
          <div>
            <div class="breadcrumb-line">
              <el-button link :icon="ArrowLeft" :disabled="isOperationLocked" @click="resetWorkspace">返回类型选择</el-button>
              <span>/</span>
              <span>{{ docTypeLabel(currentDoc.solutionType) }}</span>
            </div>
            <h2>{{ currentDoc.solutionName }}</h2>
            <div class="summary-tags">
              <el-tag type="primary">{{ docTypeLabel(currentDoc.solutionType) }}</el-tag>
              <el-tag :type="statusTagType(currentDoc.status)">{{ statusLabel(currentDoc.status) }}</el-tag>
              <el-tag type="success">目标 {{ currentDoc.targetWordCount || 0 }} 字</el-tag>
              <el-tag type="warning">已生成 {{ currentDoc.actualWordCount || 0 }} 字</el-tag>
            </div>
            <AiModelTrace scene-code="SOLUTION_SECTION_GENERATE" scene-name="AI文档章节生成" :ai-level="currentDoc.aiLevel || form.aiLevel" />
          </div>
          <div class="header-actions">
            <el-button type="primary" plain :disabled="isOperationLocked" @click="openFormDialog">填写/编辑信息</el-button>
            <el-button :icon="Refresh" :loading="detailLoading" @click="refreshCurrent">刷新</el-button>
            <el-button plain :disabled="!currentDoc?.id || isOperationLocked" @click="openDocumentWordCountDrawer">字数/重复检查</el-button>
            <el-button plain :disabled="!currentDoc?.id || isOperationLocked" @click="openDocumentQualityCheckDrawer">质量检查</el-button>
            <el-button plain :disabled="!currentDoc?.id || isOperationLocked" @click="openDocumentReviewDrawer">AI审稿</el-button>
            <el-button type="success" :loading="exportLoading" :disabled="!canExport || isOperationLocked" @click="onExport">导出</el-button>
          </div>
        </section>

        <section class="generate-dock compact-generate-dock">
          <div class="generate-dock-main">
            <div class="generate-dock-icon">
              <el-icon><MagicStick /></el-icon>
            </div>
            <div class="generate-dock-text">
              <div class="generate-dock-title">
                <span>{{ hasRunningTask ? (runningTask?.message || '全文生成中') : '全文生成' }}</span>
                <span v-if="runningTask" class="generate-progress-pill">{{ runningTask.progress || 0 }}%</span>
              </div>
            </div>
            <el-tooltip
              placement="top"
              effect="light"
              content="确认大纲和每节字数后生成正文；基础信息在右上角维护。"
            >
              <el-icon class="dock-info-icon"><InfoFilled /></el-icon>
            </el-tooltip>
          </div>
          <div class="generate-dock-tools">
            <div class="word-preset-box">
              <span>每节</span>
              <el-select v-model="wordPreset.wordCount" class="word-mini-select" :disabled="!hasOutline || isOperationLocked">
                <el-option v-for="n in wordOptions" :key="n" :label="`${n} 字`" :value="n" />
              </el-select>
            </div>
            <el-button :disabled="!hasOutline || isOperationLocked" :loading="wordSaving" @click="onApplyWordPreset">应用</el-button>
            <el-button type="primary" :loading="fullGenerating" :disabled="!hasOutline || isOperationLocked" @click="onGenerateFull(false)">生成全文</el-button>
            <el-button plain :loading="fullGenerating" :disabled="!hasOutline || isOperationLocked" @click="onGenerateFull(true)">重编</el-button>
          </div>
          <el-progress
            v-if="runningTask"
            class="task-progress"
            :percentage="runningTask.progress || 0"
            :status="progressStatus"
            :show-text="false"
            :stroke-width="4"
          />
        </section>

        <el-alert
          v-if="isOutlineGenerating"
          class="outline-running-alert"
          type="warning"
          show-icon
          :closable="false"
          title="大纲正在生成中，请稍候，生成完成后会自动刷新。"
        />

        <section class="result-grid">
          <div class="outline-panel">
            <div class="panel-title">
              <span>文档大纲</span>
              <el-tag size="small">{{ leafNodes.length }} 节</el-tag>
            </div>
            <div class="outline-scroll">
              <el-empty
                v-if="!outlineTree.length"
                :description="isOutlineGenerating ? '大纲正在生成中，生成完成后会自动显示' : '暂无大纲，请点击填写/编辑信息后生成大纲'"
              />
              <OutlineNodeList v-else :nodes="outlineTree" :active-id="activeNode?.id" :locked="false" @select="selectNode" />
            </div>
          </div>

          <div class="section-panel">
            <template v-if="activeNode">
              <div class="section-head compact-section-head">
                <div class="section-title-line">
                  <h3>{{ activeNode.title }}</h3>
                  <el-tooltip
                    v-if="sectionPromptText"
                    placement="top-start"
                    effect="light"
                    popper-class="section-guidance-tooltip"
                  >
                    <template #content>
                      <div class="guidance-tooltip-content">{{ sectionPromptText }}</div>
                    </template>
                    <el-icon class="section-info-icon"><InfoFilled /></el-icon>
                  </el-tooltip>
                  <span class="inline-meta">目标 {{ activeNode.targetWordCount || 0 }} 字</span>
                  <span class="inline-meta">已写 {{ activeNode.actualWordCount || activeNode?.section?.wordCount || 0 }} 字</span>
                  <span class="inline-meta" :class="activeNode?.section?.content ? 'done' : 'todo'">{{ activeNode?.section?.content ? '已生成' : '未生成' }}</span>
                </div>
                <div class="section-actions">
                  <el-button :loading="sectionGenerating" :disabled="isOperationLocked" @click="onRegenerateSection">重写本章</el-button>
                  <el-button type="primary" :loading="sectionSaving" :disabled="isOperationLocked" @click="onSaveSection">保存正文</el-button>
                </div>
              </div>

              <el-input
                v-model="sectionDraft"
                class="section-editor"
                type="textarea"
                resize="none"
                placeholder="章节正文生成后会显示在这里，也可以手工编辑后保存"
                :readonly="isOperationLocked"
              />
            </template>
            <el-empty v-else description="请选择一个末级章节查看正文" />
          </div>
        </section>
      </template>
    </main>

    <el-dialog
      v-model="formDialogVisible"
      class="doc-form-dialog"
      width="min(960px, 92vw)"
      top="4vh"
      append-to-body
      :close-on-click-modal="false"
      :title="currentDoc ? `填写AI文档信息 - ${currentDoc.solutionName || ''}` : '填写AI文档信息'"
    >
      <el-scrollbar class="dialog-scroll">
        <el-form label-position="top" class="doc-form" :disabled="isOperationLocked">
          <div class="dialog-section-title">基础信息</div>
          <div class="form-row-two">
            <el-form-item label="文档标题" required>
              <el-input v-model="form.documentTitle" placeholder="请输入文档标题" />
            </el-form-item>
            <el-form-item label="项目名称">
              <el-input v-model="form.projectName" placeholder="请输入项目名称" />
            </el-form-item>
          </div>

          <div v-if="currentFields.length" class="dynamic-field-grid">
            <template v-for="field in currentFields" :key="field.prop">
              <el-form-item
                :label="field.label"
                :required="field.required"
                :class="{ 'wide-field': field.type === 'textarea' }"
              >
                <el-input
                  v-if="field.type === 'textarea'"
                  v-model="formData[field.prop]"
                  type="textarea"
                  :rows="3"
                  maxlength="5000"
                  show-word-limit
                  :placeholder="field.placeholder"
                />
                <el-input v-else v-model="formData[field.prop]" :placeholder="field.placeholder" />
              </el-form-item>
            </template>
          </div>

          <div class="dialog-section-title">生成要求</div>
          <el-form-item label="主要生成要求">
            <el-input
              v-model="form.mainRequirement"
              type="textarea"
              :rows="4"
              maxlength="20000"
              show-word-limit
              placeholder="补充你希望AI重点生成的内容、边界、口径和注意事项"
            />
          </el-form-item>

          <div class="form-row-two">
            <el-form-item label="目录要求">
              <el-input
                v-model="form.outlineRequirement"
                type="textarea"
                :rows="4"
                maxlength="10000"
                show-word-limit
                placeholder="例如：目录必须包含项目概况、风险分析、结论建议等"
              />
            </el-form-item>
            <el-form-item label="整体编写方向">
              <el-input
                v-model="form.overallWritingRequirement"
                type="textarea"
                :rows="4"
                maxlength="10000"
                show-word-limit
                placeholder="例如：语言正式、突出可落地、避免绝对化结论"
              />
            </el-form-item>
          </div>

          <div class="form-row-two">
            <el-form-item label="AI等级">
              <el-select v-model="form.aiLevel" class="full-select" placeholder="请选择AI等级" clearable>
                <el-option label="基础版" value="BASIC" />
                <el-option label="标准版" value="STANDARD" />
                <el-option label="旗舰版" value="FLAGSHIP" />
              </el-select>
            </el-form-item>
            <el-form-item label="写作风格">
              <el-select v-model="form.writingStyle" class="full-select">
                <el-option label="专业正式" value="PROFESSIONAL" />
                <el-option label="通用规范" value="GENERAL" />
                <el-option label="简洁清晰" value="CONCISE" />
              </el-select>
            </el-form-item>
          </div>

          <div class="dialog-section-title">参考资料</div>
          <el-upload
            drag
            :auto-upload="false"
            :show-file-list="false"
            accept=".doc,.docx,.pdf,.txt,.md"
            :disabled="isOperationLocked"
            :on-change="onReferenceChange"
            class="reference-upload"
          >
            <template v-if="parseTask">
              <el-icon class="upload-icon"><Document /></el-icon>
              <div class="upload-title">{{ parseTask.fileName }}</div>
              <div class="upload-status">{{ parseTask.message || statusLabel(parseTask.status) }} {{ parseTask.progress || 0 }}%</div>
            </template>
            <template v-else>
              <el-icon class="upload-icon"><UploadFilled /></el-icon>
              <div class="upload-title">上传参考资料</div>
              <p>支持 Word / PDF / TXT / Markdown，上传后自动解析并作为生成参考</p>
            </template>
          </el-upload>

          <el-form-item class="reference-note" label="资料使用说明">
            <el-input
              v-model="form.referenceRequirement"
              type="textarea"
              :rows="4"
              maxlength="10000"
              show-word-limit
              placeholder="例如以模板为格式参考、以项目资料为事实依据等"
            />
          </el-form-item>

          <div class="dialog-section-title">章节篇幅</div>
          <div class="dialog-word-row">
            <el-radio-group v-model="wordPreset.mode">
              <el-radio-button label="FIXED">统一字数</el-radio-button>
              <el-radio-button label="AUTO">自动分配</el-radio-button>
            </el-radio-group>
            <el-select v-model="wordPreset.wordCount" class="word-select">
              <el-option v-for="n in wordOptions" :key="n" :label="`${n} 字/节`" :value="n" />
            </el-select>
          </div>
        </el-form>
      </el-scrollbar>
      <template #footer>
        <div class="dialog-footer-actions">
          <el-button @click="formDialogVisible = false">取消</el-button>
        <el-button :loading="saving" :disabled="isOperationLocked" @click="onSaveFormDialog">保存草稿</el-button>
        <el-button
          type="primary"
          :loading="isOutlineGenerating"
          :disabled="hasOutline || isOutlineGenerating || isOperationLocked"
          @click="onGenerateOutline"
        >
          {{ isOutlineGenerating ? '大纲生成中' : '保存并生成大纲' }}
        </el-button>
        </div>
      </template>
    </el-dialog>

    <el-dialog v-model="wordPresetDialogVisible" title="设置文档篇幅" width="620px" append-to-body class="word-preset-dialog">
      <div class="word-preset-panel">
        <div class="preset-tip">
          <strong>大纲已生成完成</strong>
          <span>请选择每个末级章节的目标字数，确认后再开始生成正文。</span>
        </div>
        <div class="dialog-word-row dialog-word-row--standalone">
          <el-radio-group v-model="wordPreset.mode">
            <el-radio-button label="FIXED">统一字数</el-radio-button>
            <el-radio-button label="AUTO">自动分配</el-radio-button>
          </el-radio-group>
          <el-select v-model="wordPreset.wordCount" class="word-select">
            <el-option v-for="n in wordOptions" :key="n" :label="`${n} 字/节`" :value="n" />
          </el-select>
        </div>
      </div>
      <template #footer>
        <el-button @click="wordPresetDialogVisible = false">稍后设置</el-button>
        <el-button type="primary" :loading="wordSaving" @click="confirmDocumentWordPreset">确认设置</el-button>
      </template>
    </el-dialog>

    <el-drawer
      v-model="docQualityCheckVisible"
      title="AI文档质量检查"
      size="60%"
      destroy-on-close
      class="quality-check-drawer"
    >
      <div class="quality-check-wrap" v-loading="docQualityCheckLoading">
        <div class="quality-check-toolbar">
          <div>
            <div class="quality-check-title">章节质量评分与风险复核</div>
            <div class="quality-check-desc">数据来自最近一次章节生成/重编时写入的质量事件日志；重新生成章节后可刷新查看。</div>
          </div>
          <el-button type="primary" plain :disabled="!currentDoc?.id" :loading="docQualityCheckLoading" @click="loadDocumentQualityCheck">刷新</el-button>
        </div>

        <div class="quality-stat-grid">
          <div v-for="item in docQualityStatCards" :key="item.label" class="quality-stat-card">
            <span>{{ item.label }}</span>
            <strong>{{ item.value }}</strong>
            <small>{{ item.desc }}</small>
          </div>
        </div>

        <el-alert
          v-if="docQualityCheckData.noQualityLogSections"
          class="quality-alert"
          type="warning"
          :closable="false"
          show-icon
          title="部分章节暂无质量检查记录"
          :description="`还有 ${docQualityCheckData.noQualityLogSections || 0} 个章节没有质量日志。通常是尚未生成，或生成时未开启质量检查。`"
        />

        <el-table
          class="ui-table quality-table"
          :data="docQualityItems"
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
      v-model="docWordCountVisible"
      title="字数检查与重复内容"
      size="58%"
      destroy-on-close
      class="quality-check-drawer"
    >
      <div class="quality-check-wrap" v-loading="docWordCountLoading">
        <div class="quality-check-toolbar">
          <div>
            <div class="quality-check-title">目标字数、生成字数与重复内容</div>
            <div class="quality-check-desc">仅展示用户可理解的字数和重复段落信息，不展示 Token、费用、模型调用次数等内部数据。</div>
          </div>
          <div class="toolbar-actions">
            <el-button plain :disabled="!currentDoc?.id" @click="loadDocumentWordCountStats">刷新</el-button>
            <el-button type="warning" plain :disabled="!docDuplicateCheckData?.recommendCompress || isOperationLocked" :loading="docDuplicateCompressing" @click="onCompressDocumentDuplicates">一键压缩重复</el-button>
          </div>
        </div>

        <div class="quality-stat-grid">
          <div class="quality-stat-card"><span>目标字数</span><strong>{{ docWordCountStats.targetWordCount || 0 }}</strong><small>文档目标</small></div>
          <div class="quality-stat-card"><span>生成字数</span><strong>{{ docWordCountStats.actualWordCount || 0 }}</strong><small>当前正文</small></div>
          <div class="quality-stat-card"><span>完成度</span><strong>{{ docWordCountStats.ratioPercent || 0 }}%</strong><small>{{ docWordCountStats.summary || '-' }}</small></div>
          <div class="quality-stat-card"><span>重复段落</span><strong>{{ docDuplicateCheckData.duplicateParagraphCount || 0 }}</strong><small>{{ docDuplicateCheckData.summary || '未检查' }}</small></div>
        </div>

        <el-alert v-if="docWordCountStats.overSections" type="warning" show-icon :closable="false" class="quality-alert" :title="`发现 ${docWordCountStats.overSections} 个章节超出目标字数`" description="建议优先压缩重复背景、通用口号和同义反复，保留核心结论、依据、措施和交付物。" />

        <el-table class="ui-table quality-table" :data="docWordCountStats.items || []" border stripe size="small" empty-text="暂无字数数据">
          <el-table-column label="序号" type="index" width="70" align="center" />
          <el-table-column prop="path" label="章节" min-width="220" show-overflow-tooltip />
          <el-table-column prop="targetWordCount" label="目标" width="90" align="center" />
          <el-table-column prop="actualWordCount" label="生成" width="90" align="center" />
          <el-table-column prop="ratioPercent" label="比例" width="90" align="center"><template #default="{ row }">{{ row.ratioPercent || 0 }}%</template></el-table-column>
          <el-table-column prop="status" label="状态" width="120" align="center"><template #default="{ row }"><el-tag size="small" :type="wordStatusTagType(row.status)">{{ row.status }}</el-tag></template></el-table-column>
          <el-table-column prop="suggestion" label="建议" min-width="220" show-overflow-tooltip />
        </el-table>

        <el-divider content-position="left">重复段落明细</el-divider>
        <el-alert v-if="!docDuplicateCheckData?.recommendCompress" type="success" show-icon :closable="false" class="quality-alert" :title="docDuplicateCheckData?.summary || '未发现明显重复内容'" />
        <el-table v-else class="ui-table quality-table" :data="docDuplicateItems" border stripe size="small" empty-text="暂无重复段落明细">
          <el-table-column prop="preview" label="重复内容预览" min-width="260" show-overflow-tooltip />
          <el-table-column prop="repeatCount" label="重复次数" width="100" align="center" />
          <el-table-column label="涉及章节" min-width="260" show-overflow-tooltip>
            <template #default="{ row }">{{ duplicateSectionsText(row.sections) }}</template>
          </el-table-column>
        </el-table>
      </div>
    </el-drawer>

    <AiReviewDrawer
      v-model="docReviewVisible"
      title="AI文档二次审稿"
      biz-type="AI_DOCUMENT"
      :biz-id="currentDoc?.id || ''"
      :consistency-package="docConsistencyPackage"
      :review-result="docReviewResult"
      :loading="docReviewLoading"
      :disabled="!currentDoc?.id || isOperationLocked"
      :ai-level="currentDoc?.aiLevel || form.aiLevel"
      @run-review="runDocumentAiReviewNow"
    />

  </div>
</template>

<script setup>
import { computed, defineComponent, h, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElButton, ElIcon, ElMessage, ElMessageBox, ElTag, ElTooltip } from '@/plugins/element-plus-api'
import { ArrowLeft, Document, InfoFilled, MagicStick, Plus, Refresh, Search, UploadFilled } from '@element-plus/icons-vue'
import {
  applyDocumentWordCountPreset,
  createDocument,
  deleteDocument,
  startDocumentExportTask,
  getDocumentExportTask,
  getDocumentExportCheck,
  generateDocumentFull,
  generateDocumentOutline,
  getDocument,
  getDocumentGenerateCheck,
  getDocumentGenerationTask,
  getDocumentParseTask,
  getDocumentQualityCheck,
  getDocumentWordCountStats,
  getDocumentConsistencyPackage,
  getDocumentDuplicateCheck,
  compressDocumentDuplicateSections,
  reviewDocumentByAi,
  listDocumentTypes,
  pageDocuments,
  rewriteDocumentFull,
  saveDocumentForm,
  uploadDocumentReference,
  autoFillDocumentFromReference
} from '@/api/aiDocument'
import { downloadFileResource, getCurrentUserRunningAiTask, streamSection, updateSectionContent } from '@/api/aiSolution'
import { formatDateTime } from '@/utils/format'
import { openWordExportDialog } from '@/utils/wordExportDialog'
import AiReviewDrawer from '@/components/ai/AiReviewDrawer.vue'
import AiModelTrace from '@/components/ai/AiModelTrace.vue'

const router = useRouter()

const loading = ref(false)
const appendLoading = ref(false)
const documentTypes = ref([])
const documents = ref([])
const currentDoc = ref(null)
const detailLoading = ref(false)
const saving = ref(false)
const outlineLoading = ref(false)
const wordSaving = ref(false)
const wordPresetDialogVisible = ref(false)
const fullGenerating = ref(false)
const exportLoading = ref(false)
const sectionGenerating = ref(false)
const sectionSaving = ref(false)
const formDialogVisible = ref(false)
const parseTask = ref(null)
const autoFillRunning = ref(false)
const autoFillDoneTaskIds = new Set()
const runningTask = ref(null)
const globalRunningTask = ref(null)
const activeNode = ref(null)
const sectionDraft = ref('')
const docQualityCheckVisible = ref(false)
const docQualityCheckLoading = ref(false)
const docQualityCheckData = ref({ items: [] })
const docWordCountVisible = ref(false)
const docWordCountLoading = ref(false)
const docWordCountStats = ref({ items: [] })
const docDuplicateCheckData = ref({ duplicates: [] })
const docDuplicateCompressing = ref(false)
const docReviewVisible = ref(false)
const docReviewLoading = ref(false)
const docReviewResult = ref(null)
const docConsistencyPackage = ref(null)

const query = reactive({ pageNum: 1, pageSize: 20, keyword: '' })
const docListScrollbar = ref()
const documentPager = reactive({ page: 1, size: 20, total: 0 })
const form = reactive({
  documentType: 'FEASIBILITY',
  documentTitle: '',
  projectName: '',
  aiLevel: '',
  writingStyle: 'PROFESSIONAL',
  mainRequirement: '',
  referenceRequirement: '',
  outlineRequirement: '',
  overallWritingRequirement: ''
})
const formData = reactive({})
const wordPreset = reactive({ mode: 'FIXED', wordCount: 900 })
const wordOptions = [300, 600, 900, 1200, 1800, 2400, 3000]

let searchTimer = null
let parseTimer = null
let taskTimer = null
let outlineTimer = null
let globalTaskTimer = null

const currentType = computed(() => documentTypes.value.find((item) => item.type === form.documentType) || documentTypes.value[0])
const currentFields = computed(() => (currentType.value?.fields || []).filter((field) => !isBasicDuplicateField(field)))
const outlineTree = computed(() => currentDoc.value?.outlines || [])
const leafNodes = computed(() => flattenLeaves(outlineTree.value))
const hasOutline = computed(() => outlineTree.value.length > 0)
const isOutlineGenerating = computed(() => outlineLoading.value || isOutlineGeneratingStatus(currentDoc.value?.status))
const hasRunningTask = computed(() => ['WAITING', 'RUNNING'].includes(String(runningTask.value?.status || '').toUpperCase()))
const isGlobalAiTaskRunning = computed(() => ['WAITING', 'RUNNING'].includes(String(globalRunningTask.value?.status || '').toUpperCase()))
const isGlobalAiTaskForCurrentDoc = computed(() => {
  const currentId = String(currentDoc.value?.id || '')
  return !!currentId && String(globalRunningTask.value?.solutionId || '') === currentId
})
const hasOtherAiTaskRunning = computed(() => isGlobalAiTaskRunning.value && !isGlobalAiTaskForCurrentDoc.value)
const isOperationLocked = computed(() => Boolean(isOutlineGenerating.value || hasRunningTask.value || hasOtherAiTaskRunning.value || fullGenerating.value || sectionGenerating.value || isDocumentGeneratingStatus(currentDoc.value?.status)))
const canExport = computed(() => currentDoc.value?.canExport === true || (leafNodes.value.length > 0 && leafNodes.value.every((node) => node?.section?.content)))
const progressStatus = computed(() => {
  const status = String(runningTask.value?.status || '').toUpperCase()
  if (status === 'SUCCESS') return 'success'
  if (status === 'FAILED' || status === 'PARTIAL') return 'exception'
  return undefined
})
const sectionPromptText = computed(() => (activeNode.value?.writingDirection || activeNode.value?.writingRequirement || '').trim())
const documentNoMore = computed(() => documentPager.total > 0 && documents.value.length >= documentPager.total)
const docQualityItems = computed(() => docQualityCheckData.value?.items || [])
const docQualityStatCards = computed(() => {
  const data = docQualityCheckData.value || {}
  return [
    { label: '章节总数', value: data.totalSections || 0, desc: '当前目录末级章节' },
    { label: '已检查', value: data.checkedSections || 0, desc: '已有质量日志章节' },
    { label: '平均分', value: data.averageScore || 0, desc: '仅统计已检查章节' },
    { label: '需重编', value: data.rewriteSections || 0, desc: '低于最低质量线' },
    { label: '需关注', value: data.attentionSections || 0, desc: '建议人工复核' },
    { label: '优秀/可用', value: `${data.excellentSections || 0}/${data.usableSections || 0}`, desc: '优秀 / 可用章节' }
  ]
})
const docDuplicateItems = computed(() => docDuplicateCheckData.value?.duplicates || [])

const activeStep = computed(() => {
  const status = String(currentDoc.value?.status || '').toUpperCase()
  if (canExport.value) return 4
  if (['CONTENT_GENERATING', 'CONTENT_PARTIAL', 'CONTENT_READY', 'DONE'].includes(status)) return 3
  if (['WORD_COUNT_SET'].includes(status)) return 2
  if (hasOutline.value || ['OUTLINE_READY'].includes(status)) return 1
  return 0
})

const OutlineNodeList = defineComponent({
  name: 'OutlineNodeList',
  props: {
    nodes: { type: Array, default: () => [] },
    activeId: { type: [String, Number], default: null },
    level: { type: Number, default: 0 },
    locked: { type: Boolean, default: false }
  },
  emits: ['select'],
  setup(props, { emit }) {
    const statusLabel = (node) => node?.section?.content ? '已生成' : '待生成'
    const statusType = (node) => node?.section?.content ? 'success' : 'info'
    const nodeBadgeText = (depth, isLeaf) => {
      if (isLeaf) return '条'
      if (depth === 0) return '章'
      return '节'
    }
    const renderNode = (node, depth = props.level) => {
      const children = Array.isArray(node.children) ? node.children : []
      const hasChildren = children.length > 0
      const isLeaf = !hasChildren
      const active = String(props.activeId || '') === String(node.id || '')
      const actual = Number(node.actualWordCount || node.section?.wordCount || 0)
      const target = Number(node.targetWordCount || 0)
      const title = h('span', { class: ['tree-title', hasChildren ? 'parent' : 'leaf'] }, node.title || '未命名章节')
      const controls = []
      if (isLeaf) {
        controls.push(h('span', { class: 'count-text' }, `${actual || 0}/${target || 0}字`))
        controls.push(h(ElTag, { size: 'small', type: statusType(node), effect: 'light' }, () => statusLabel(node)))
      }
      return h('div', { class: 'tree-node-wrap' }, [
        h('div', {
          class: ['tree-row', `level-${depth}`, isLeaf ? 'clickable generate-row' : 'parent-row', { active, locked: props.locked }],
          style: { paddingLeft: `${depth * 14}px` },
          onClick: () => { if (!props.locked && isLeaf) emit('select', node) }
        }, [
          h('span', { class: 'tree-toggle' }, hasChildren ? '▾' : ''),
          h('span', { class: ['tree-badge', isLeaf ? 'leaf-badge' : (depth === 0 ? 'chapter-badge' : 'section-badge')] }, nodeBadgeText(depth, isLeaf)),
          title,
          h('div', { class: ['tree-controls', isLeaf ? 'generate-controls' : ''] }, controls)
        ]),
        hasChildren ? h('div', { class: 'tree-children' }, children.map((child) => renderNode(child, depth + 1))) : null
      ])
    }
    return () => h('div', { class: 'outline-tree' }, props.nodes.map((node) => renderNode(node, props.level)))
  }
})

onMounted(async () => {
  await loadGlobalRunningTask()
  await loadTypes()
  await loadDocuments()
  startGlobalTaskPolling()
})

onBeforeUnmount(() => {
  clearTimeout(searchTimer)
  clearInterval(parseTimer)
  clearInterval(taskTimer)
  clearInterval(outlineTimer)
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

async function loadTypes() {
  documentTypes.value = await listDocumentTypes()
  if (!documentTypes.value.length) documentTypes.value = fallbackTypes()
}

async function loadDocuments(options = {}) {
  const append = Boolean(options.append)
  if ((append && documentNoMore.value) || loading.value || appendLoading.value) return

  const pageToLoad = append ? documentPager.page + 1 : 1
  if (append) {
    appendLoading.value = true
  } else {
    loading.value = true
  }

  try {
    const res = await pageDocuments({
      ...query,
      current: pageToLoad,
      size: documentPager.size,
      pageNum: pageToLoad,
      pageSize: documentPager.size,
      keyword: query.keyword?.trim() || undefined
    })
    const records = (res?.records || []).filter(isVisibleDocument)
    documentPager.page = pageToLoad
    documentPager.total = Number(res?.total || 0)

    if (append) {
      const exists = new Set(documents.value.map((item) => String(item.id)))
      documents.value = documents.value.concat(records.filter((item) => item?.id && !exists.has(String(item.id))))
      return
    }

    // 删除后的 AI文档只应出现在“回收站”，不能继续显示在当前工作台左侧列表。
    // 这里前端再做一层兜底过滤，避免历史数据或接口缓存把 DELETED/PURGED 状态带回来。
    documents.value = records
  } finally {
    if (append) {
      appendLoading.value = false
    } else {
      loading.value = false
    }
  }
}

function isVisibleDocument(item) {
  if (!item) return false
  const status = String(item.status || '').toUpperCase()
  return item.deleted !== 1 && status !== 'DELETED' && status !== 'PURGED'
}

function reloadDocumentsFirstPage() {
  documentPager.page = 1
  documents.value = []
  loadDocuments()
}

function onSearchInput() {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(reloadDocumentsFirstPage, 300)
}

function onDocumentListScroll() {
  const el = docListScrollbar.value?.wrapRef
  if (!el || loading.value || appendLoading.value || documentNoMore.value) return
  const remain = el.scrollHeight - el.scrollTop - el.clientHeight
  if (remain <= 80) {
    loadDocuments({ append: true })
  }
}

function resetWorkspace() {
  if (isOperationLocked.value) return
  clearInterval(outlineTimer)
  outlineTimer = null
  currentDoc.value = null
  activeNode.value = null
  sectionDraft.value = ''
  parseTask.value = null
  runningTask.value = null
  formDialogVisible.value = false
}

async function createNew(type) {
  if (isOperationLocked.value) return
  const draft = await createDocument({
    documentType: type.type,
    documentTitle: type.title.replace('生成', ''),
    aiLevel: null,
    writingStyle: 'PROFESSIONAL'
  })
  await loadDocuments()
  applyDoc(draft)
  formDialogVisible.value = true
}

async function loadDetail(id) {
  // AI文档全文生成属于后台任务，页面必须允许用户切换文档查看进度或历史内容。
  // 只锁定新建、编辑、删除、生成、保存等写操作，不锁定左侧文档查看。
  detailLoading.value = true
  try {
    const data = await getDocument(id)
    applyDoc(data)
    if (shouldOpenFormDialog(data)) formDialogVisible.value = true
  } finally {
    detailLoading.value = false
  }
}


function openFormDialog() {
  if (isOperationLocked.value) return
  if (!currentDoc.value?.id) return
  formDialogVisible.value = true
}

function shouldOpenFormDialog(data) {
  if (!data) return false
  const status = String(data.status || '').toUpperCase()
  const outlines = Array.isArray(data.outlines) ? data.outlines : []
  return !outlines.length && ['DRAFT', 'INFO_READY'].includes(status)
}

async function refreshCurrent() {
  if (!currentDoc.value?.id) return
  detailLoading.value = true
  try {
    const data = await getDocument(currentDoc.value.id)
    applyDoc(data)
    await loadDocuments()
  } finally {
    detailLoading.value = false
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

function wordStatusTagType(status) {
  if (status === '字数正常') return 'success'
  if (status === '略超字数' || status === '明显偏短') return 'warning'
  if (status === '明显超字数') return 'danger'
  return 'info'
}

function duplicateSectionsText(sections = []) {
  return (sections || []).map((item) => item.path || item.title || item.outlineId).filter(Boolean).join('；') || '-'
}

async function openDocumentQualityCheckDrawer() {
  if (!currentDoc.value?.id) return
  docQualityCheckVisible.value = true
  await loadDocumentQualityCheck()
}

async function loadDocumentQualityCheck() {
  if (!docQualityCheckVisible.value || !currentDoc.value?.id) return
  docQualityCheckLoading.value = true
  try {
    docQualityCheckData.value = normalizeQualityCheckPayload(await getDocumentQualityCheck(currentDoc.value.id))
  } catch (e) {
    ElMessage.error(e?.message || '加载质量检查失败')
  } finally {
    docQualityCheckLoading.value = false
  }
}

async function openDocumentWordCountDrawer() {
  if (!currentDoc.value?.id) return
  docWordCountVisible.value = true
  await loadDocumentWordCountStats()
}

async function loadDocumentWordCountStats() {
  if (!docWordCountVisible.value || !currentDoc.value?.id) return
  docWordCountLoading.value = true
  try {
    const [wordRes, duplicateRes] = await Promise.all([
      getDocumentWordCountStats(currentDoc.value.id),
      getDocumentDuplicateCheck(currentDoc.value.id)
    ])
    docWordCountStats.value = wordRes || { items: [] }
    docDuplicateCheckData.value = duplicateRes || { duplicates: [] }
  } catch (e) {
    ElMessage.error(e?.message || '加载字数检查失败')
  } finally {
    docWordCountLoading.value = false
  }
}

async function onCompressDocumentDuplicates() {
  if (!currentDoc.value?.id) return
  await ElMessageBox.confirm('系统将删除跨章节重复段落，保留首次出现内容。该操作不会新增事实内容，是否继续？', '一键压缩重复内容', {
    type: 'warning', confirmButtonText: '开始压缩', cancelButtonText: '取消'
  })
  docDuplicateCompressing.value = true
  try {
    const updated = await compressDocumentDuplicateSections(currentDoc.value.id)
    applyDoc(updated)
    ElMessage.success('重复内容已压缩')
    await loadDocumentWordCountStats()
  } catch (e) {
    ElMessage.error(e?.message || '压缩重复内容失败')
  } finally {
    docDuplicateCompressing.value = false
  }
}

async function openDocumentReviewDrawer() {
  if (!currentDoc.value?.id) return
  docReviewVisible.value = true
  docReviewResult.value = null
  docReviewLoading.value = true
  try {
    docConsistencyPackage.value = await getDocumentConsistencyPackage(currentDoc.value.id)
  } catch (e) {
    ElMessage.error(e?.message || '加载全文统一口径失败')
  } finally {
    docReviewLoading.value = false
  }
}

async function runDocumentAiReviewNow() {
  if (!currentDoc.value?.id) return
  docReviewLoading.value = true
  try {
    docReviewResult.value = await reviewDocumentByAi(currentDoc.value.id)
    if (docReviewResult.value?.reviewRecordId) {
      ElMessage.success('AI二次审稿完成，审稿记录已保存')
    } else {
      ElMessage.warning('AI二次审稿完成，但审稿记录未保存，请检查增量SQL和后端日志')
    }
  } catch (e) {
    ElMessage.error(e?.message || 'AI二次审稿失败')
  } finally {
    docReviewLoading.value = false
  }
}

// 全文生成中需要轻量刷新右侧正文和左侧大纲。
// 这里不打开 detailLoading，避免每 2.5 秒页面闪一下。
async function refreshCurrentLight(options = {}) {
  const docId = options.docId || currentDoc.value?.id
  if (!docId) return
  const data = await getDocument(docId)
  if (currentDoc.value?.id && String(currentDoc.value.id) !== String(docId)) return
  applyDoc(data, options)
}

function applyDoc(data, options = {}) {
  const previousActiveId = activeNode.value?.id
  currentDoc.value = data
  runningTask.value = data?.runningTask || null
  form.documentType = data?.solutionType || 'FEASIBILITY'
  form.documentTitle = data?.solutionName || docTypeLabel(form.documentType)
  form.projectName = ''
  form.aiLevel = data?.aiLevel || ''
  form.writingStyle = data?.writingStyle || 'PROFESSIONAL'
  form.mainRequirement = data?.requirement?.purchaseRequirement || ''
  form.referenceRequirement = data?.requirement?.serviceRequirement || ''
  form.outlineRequirement = data?.requirement?.outlineRequirement || ''
  form.overallWritingRequirement = data?.overallWritingRequirement || ''
  parseTask.value = data?.latestParseTask || parseTask.value
  Object.keys(formData).forEach((key) => delete formData[key])
  fillFormDataFromSummary(data?.requirement?.technicalRequirement || '')
  form.projectName = String(formData.projectName || data?.solutionName || '')
  ensureCurrentFields()
  scheduleAutoFillForCurrentDoc()
  const leaves = leafNodes.value
  const previousNode = leaves.find((node) => String(node?.id || '') === String(previousActiveId || ''))
  const latestGeneratedNode = [...leaves].reverse().find((node) => node?.section?.content)

  // 全文生成轮询刷新时保留用户正在查看的章节，不再因为其他章节新生成而自动切走。
  // 只有首次进入、当前选中章节不存在时，才默认选中最新已生成章节或第一节。
  activeNode.value = previousNode
    || latestGeneratedNode
    || leaves[0]
    || null
  sectionDraft.value = activeNode.value?.section?.content || ''
  if (!options.skipTaskPolling) resumeTaskPolling()
  resumeParsePolling()
  if (!options.skipOutlinePolling) resumeOutlinePolling()
}


function isBasicDuplicateField(field) {
  const prop = String(field?.prop || '').trim().toLowerCase()
  const label = String(field?.label || '').trim()
  return ['documenttitle', 'solutionname', 'projectname'].includes(prop) || ['文档标题', '项目名称'].includes(label)
}

function ensureCurrentFields() {
  currentFields.value.forEach((field) => {
    if (formData[field.prop] === undefined) formData[field.prop] = ''
  })
}

function fillFormDataFromSummary(summary) {
  String(summary || '').split('\n').forEach((line) => {
    const match = line.match(/^[-•]\s*([^：:]+)[：:]\s*(.*)$/)
    if (match) formData[match[1].trim()] = match[2].trim()
  })
}

function validateForm() {
  if (!form.aiLevel) {
    ElMessage.warning('请先选择AI等级')
    return false
  }
  if (!form.documentTitle?.trim()) {
    ElMessage.warning('请填写文档标题')
    return false
  }
  for (const field of currentFields.value) {
    if (!field.required) continue
    const value = String(formData[field.prop] || '').trim()
    if (!value) {
      ElMessage.warning(`请填写${field.label}`)
      return false
    }
    if (isWeakFormValue(field, value)) {
      ElMessage.warning(`请补充有效的${field.label}`)
      return false
    }
  }
  return true
}

function buildFormPayload() {
  return {
    documentType: form.documentType,
    documentTitle: form.documentTitle,
    projectName: form.projectName,
    aiLevel: form.aiLevel,
    writingStyle: form.writingStyle,
    formData: { ...formData },
    mainRequirement: form.mainRequirement,
    referenceRequirement: form.referenceRequirement,
    outlineRequirement: form.outlineRequirement,
    overallWritingRequirement: form.overallWritingRequirement
  }
}

async function saveFormOnly() {
  if (isOperationLocked.value) return false
  if (!currentDoc.value?.id) return false
  if (requiredMissingFields().length) {
    await tryAutoFillFromLatestParseTask({ force: true, silent: true })
  }
  if (!validateForm()) return false
  saving.value = true
  try {
    await saveDocumentForm(currentDoc.value.id, buildFormPayload())
    await refreshCurrent()
    ElMessage.success('草稿已保存')
    return true
  } finally {
    saving.value = false
  }
}

async function onSaveFormDialog() {
  const ok = await saveFormOnly()
  if (ok) formDialogVisible.value = false
}

async function onReferenceChange(uploadFile) {
  if (isOperationLocked.value) return
  if (!uploadFile?.raw || !currentDoc.value?.id) return
  if (!form.aiLevel) {
    ElMessage.warning('请先选择AI等级')
    return
  }
  parseTask.value = null
  const task = await uploadDocumentReference(currentDoc.value.id, uploadFile.raw, {
    documentType: form.documentType,
    aiLevel: form.aiLevel,
    writingStyle: form.writingStyle
  })
  parseTask.value = task
  pollParseTask(task.id)
  const status = String(task?.status || '').toUpperCase()
  if (['WAITING', 'PARSING', 'EXTRACTING'].includes(status)) {
    ElMessage.info(task?.message || '解析任务已在排队或执行中，请等待完成')
  } else {
    ElMessage.success('资料已上传，正在解析')
  }
}

function resumeParsePolling() {
  clearInterval(parseTimer)
  if (parseTask.value?.id && !['SUCCESS', 'FAILED', 'CANCELED'].includes(String(parseTask.value.status || '').toUpperCase())) {
    pollParseTask(parseTask.value.id)
  }
}

function pollParseTask(taskId) {
  clearInterval(parseTimer)
  const tick = async () => {
    if (document.hidden) return
    try {
      const task = await getDocumentParseTask(taskId)
      parseTask.value = task
      const status = String(task.status || '').toUpperCase()
      if (['SUCCESS', 'FAILED', 'CANCELED'].includes(status)) {
        clearInterval(parseTimer)
        parseTimer = null
        if (status === 'SUCCESS') {
          await autoFillAfterParseSuccess(taskId)
        }
      }
    } catch (e) {
      // Polling should not block the page when the network jitters.
    }
  }
  tick()
  parseTimer = setInterval(tick, 2500)
}


async function autoFillAfterParseSuccess(taskId) {
  await tryAutoFillFromLatestParseTask({ taskId, force: true, silent: false, successPrefix: '资料解析完成' })
}

function latestSuccessfulParseTaskId() {
  const candidates = [parseTask.value, currentDoc.value?.latestParseTask]
  for (const task of candidates) {
    const status = String(task?.status || '').toUpperCase()
    if (task?.id && status === 'SUCCESS') return task.id
  }
  return ''
}

function shouldAutoFillCurrentDoc() {
  return !!currentDoc.value?.id && !!latestSuccessfulParseTaskId() && requiredMissingFields().length > 0
}

function scheduleAutoFillForCurrentDoc() {
  const taskId = latestSuccessfulParseTaskId()
  if (!taskId || autoFillDoneTaskIds.has(String(taskId)) || autoFillRunning.value) return
  if (!shouldAutoFillCurrentDoc()) return
  window.setTimeout(() => {
    const latestTaskId = latestSuccessfulParseTaskId()
    if (!latestTaskId || autoFillDoneTaskIds.has(String(latestTaskId)) || autoFillRunning.value) return
    if (!shouldAutoFillCurrentDoc()) return
    tryAutoFillFromLatestParseTask({ taskId: latestTaskId, force: false, silent: true })
  }, 0)
}

async function tryAutoFillFromLatestParseTask(options = {}) {
  if (!currentDoc.value?.id || autoFillRunning.value) return false
  const taskId = options.taskId || latestSuccessfulParseTaskId()
  if (!taskId) return false
  if (!options.force && autoFillDoneTaskIds.has(String(taskId))) return false
  autoFillRunning.value = true
  try {
    const updated = await autoFillDocumentFromReference(
      currentDoc.value.id,
      { taskId },
      { silentError: !!options.silent }
    )
    autoFillDoneTaskIds.add(String(taskId))
    applyDoc(updated)
    await loadDocuments()
    const missing = requiredMissingFields()
    if (!options.silent) {
      const prefix = options.successPrefix || '参考资料识别完成'
      if (missing.length) {
        ElMessage.warning(`${prefix}，已自动填充部分内容，请补充：${missing.join('、')}`)
      } else {
        ElMessage.success(`${prefix}，已自动填充表单内容`)
      }
    }
    return true
  } catch (e) {
    autoFillDoneTaskIds.add(String(taskId))
    await refreshCurrent()
    if (!options.silent) {
      ElMessage.warning('资料解析完成，但自动填充失败，请手工补充后再生成大纲')
    }
    return false
  } finally {
    autoFillRunning.value = false
  }
}

function requiredMissingFields() {
  const missing = []
  if (!form.documentTitle?.trim()) missing.push('文档标题')
  currentFields.value.forEach((field) => {
    if (!field.required) return
    const value = String(formData[field.prop] || '').trim()
    if (!value || isWeakFormValue(field, value)) {
      missing.push(field.label)
    }
  })
  return missing
}

function isWeakFormValue(field, value) {
  const prop = String(field?.prop || '').trim()
  const compact = String(value || '').replace(/\s+/g, '')
  if (!compact) return true
  if (/请输入|请填写|示例|例如|如：|如:|确认意见|审核意见|评审意见|目录要求|整体编写方向|补充你希望|章节篇幅|自动分配/.test(compact)) return true
  if (/投标文件格式要求|工期质量要求|商务报价要求|评分办法|评标办法|投标人须知|废标条款|资格审查|形式评审|响应性评审/.test(compact)) return true
  if (['constructionContent', 'content', 'scope', 'pollution', 'roads'].includes(prop)) {
    return compact.length < 18 || /^(建设内容|主要建设内容|项目内容|服务内容|招标范围|承包范围|工程概况)[。.:：]*$/.test(compact)
  }
  if (['builder', 'partyA', 'partyB'].includes(prop)) {
    return compact.length > 80 || /确认意见|单位确认|盖章|签字/.test(compact) || /^(建设单位|甲方|乙方|采购人|招标人)[。.:：]*$/.test(compact)
  }
  if (prop === 'period') {
    return compact.length > 80 || /质量要求|商务报价|评分|评标|格式要求/.test(compact) || /^(工期|建设周期|实施周期)[。.:：]*$/.test(compact)
  }
  if (['investment', 'amount'].includes(prop)) {
    return /^(金额|投资金额|总投资|合同金额|报价)[。.:：]*$/.test(compact)
  }
  if (prop === 'location') {
    return /^(项目地点|建设地点|工程地点|项目位置)[。.:：]*$/.test(compact)
  }
  return false
}

function isOutlineGeneratingStatus(status) {
  return String(status || '').toUpperCase() === 'OUTLINE_GENERATING'
}

function isDocumentGeneratingStatus(status) {
  return ['OUTLINE_GENERATING', 'CONTENT_GENERATING', 'FULL_GENERATING', 'REGENERATING', 'GENERATING'].includes(String(status || '').toUpperCase())
}

function resumeOutlinePolling(forceDocId) {
  clearInterval(outlineTimer)
  const docId = forceDocId || currentDoc.value?.id
  if (!docId) return
  if (!forceDocId && !isOutlineGeneratingStatus(currentDoc.value?.status)) return

  const tick = async () => {
    if (document.hidden) return
    try {
      if (currentDoc.value?.id && String(currentDoc.value.id) !== String(docId)) {
        clearInterval(outlineTimer)
        outlineTimer = null
        return
      }
      const data = await getDocument(docId)
      applyDoc(data, { skipOutlinePolling: true })
      await loadDocuments()
      if (!isOutlineGeneratingStatus(data?.status)) {
        clearInterval(outlineTimer)
        outlineTimer = null
        if ((data?.outlines || []).length) {
          ElMessage.success('大纲生成完成')
        }
      }
    } catch (e) {
      // 轮询只负责刷新状态，接口异常由全局请求拦截器提示，这里避免定时器抛出未捕获异常。
    }
  }

  outlineTimer = setInterval(tick, 3000)
}

function formatDocumentGenerateCheckIssues(data = {}) {
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

async function onGenerateOutline() {
  await loadGlobalRunningTask()
  if (hasOtherAiTaskRunning.value) {
    ElMessage.warning('已有其他AI生成任务正在执行，请等待完成后再操作')
    return
  }
  if (isOperationLocked.value && !isOutlineGenerating.value) return
  if (!currentDoc.value?.id) return
  if (isOutlineGenerating.value) {
    ElMessage.warning('大纲正在生成中，请等待完成')
    return
  }
  if (requiredMissingFields().length) {
    await tryAutoFillFromLatestParseTask({ force: true, silent: true })
  }
  if (!validateForm()) return
  outlineLoading.value = true
  try {
    await saveDocumentForm(currentDoc.value.id, buildFormPayload())
    const docId = currentDoc.value.id
    const generateCheck = await getDocumentGenerateCheck(docId)
    if (generateCheck && generateCheck.canGenerateOutline === false) {
      await ElMessageBox.alert(formatDocumentGenerateCheckIssues(generateCheck), '生成前检查未通过', { type: 'warning' })
      return
    }
    resumeOutlinePolling(docId)
    const data = await generateDocumentOutline(docId, {
      outlineMode: 'DOCUMENT',
      writingStyle: form.writingStyle,
      outlineRequirement: form.outlineRequirement,
      extraRequirement: form.outlineRequirement,
      writingDirection: form.overallWritingRequirement
    })
    applyDoc(data)
    await refreshCurrent()
    await loadDocuments()
    formDialogVisible.value = false
    wordPresetDialogVisible.value = true
    ElMessage.success('大纲已生成，请设置篇幅')
  } finally {
    outlineLoading.value = false
  }
}

async function confirmDocumentWordPreset() {
  await onApplyWordPreset({ fromDialog: true })
}

async function onApplyWordPreset(options = {}) {
  if (isOperationLocked.value) return
  if (!currentDoc.value?.id) return
  wordSaving.value = true
  try {
    const data = await applyDocumentWordCountPreset(currentDoc.value.id, wordPreset)
    applyDoc(data)
    await loadDocuments()
    if (options?.fromDialog) wordPresetDialogVisible.value = false
    ElMessage.success('篇幅已应用')
  } finally {
    wordSaving.value = false
  }
}

async function onGenerateFull(rewrite) {
  await loadGlobalRunningTask()
  if (hasOtherAiTaskRunning.value) {
    ElMessage.warning('已有其他AI生成任务正在执行，请等待完成后再操作')
    return
  }
  if (isOperationLocked.value) return
  if (!currentDoc.value?.id) return
  await saveDocumentForm(currentDoc.value.id, buildFormPayload())
  const generateCheck = await getDocumentGenerateCheck(currentDoc.value.id)
  if (generateCheck && generateCheck.canGenerateFull === false) {
    await ElMessageBox.alert(formatDocumentGenerateCheckIssues(generateCheck), '生成前检查未通过', { type: 'warning' })
    return
  }
  fullGenerating.value = true
  try {
    const task = rewrite
      ? await rewriteDocumentFull(currentDoc.value.id, { writingStyle: form.writingStyle })
      : await generateDocumentFull(currentDoc.value.id, { writingStyle: form.writingStyle })
    runningTask.value = task
    globalRunningTask.value = task
    pollGenerationTask(task.id)
  } finally {
    fullGenerating.value = false
  }
}

function resumeTaskPolling() {
  clearInterval(taskTimer)
  const task = currentDoc.value?.runningTask || runningTask.value
  if (task?.id && ['WAITING', 'RUNNING'].includes(String(task.status || '').toUpperCase())) {
    pollGenerationTask(task.id)
  }
}

function pollGenerationTask(taskId) {
  clearInterval(taskTimer)
  const tick = async () => {
    if (document.hidden) return
    try {
      const task = await getDocumentGenerationTask(taskId)
      const status = String(task.status || '').toUpperCase()
      const taskDocId = String(task?.solutionId || task?.documentId || task?.bizId || '')
      const currentDocId = String(currentDoc.value?.id || '')
      const isTaskForCurrentDoc = !taskDocId || !currentDocId || taskDocId === currentDocId
      globalRunningTask.value = ['WAITING', 'RUNNING'].includes(status) ? task : null
      runningTask.value = isTaskForCurrentDoc ? task : (currentDoc.value?.runningTask || null)

      // 后台生成任务可以继续轮询，但用户切换到其他文档查看时，不要用该任务刷新/污染当前文档详情。
      if (isTaskForCurrentDoc) {
        await refreshCurrentLight({ docId: currentDocId || taskDocId, skipOutlinePolling: true, skipTaskPolling: true, preferLatestGenerated: true })
      }
      await loadDocuments()

      if (!['WAITING', 'RUNNING'].includes(status)) {
        clearInterval(taskTimer)
        taskTimer = null
        runningTask.value = isTaskForCurrentDoc ? task : null
        if (isTaskForCurrentDoc) {
          await refreshCurrentLight({ docId: currentDocId || taskDocId, skipOutlinePolling: true, skipTaskPolling: true, preferLatestGenerated: true })
        }
        await loadDocuments()
        if (status === 'SUCCESS') ElMessage.success('全文生成完成')
        else if (status === 'PARTIAL') ElMessage.warning('生成完成，但存在失败章节，请检查后重试')
        else if (status === 'FAILED') ElMessage.error('全文生成失败，请稍后重试或联系管理员')
      }
    } catch (e) {
      // 轮询异常不打断页面，避免短暂网络抖动导致实时刷新停止。
    }
  }
  tick()
  taskTimer = setInterval(tick, 2500)
}

function selectNode(node) {
  // 生成中也允许查看已生成章节或切换章节；保存/重写等写操作仍由按钮锁定。
  activeNode.value = node
  sectionDraft.value = node?.section?.content || ''
}

async function onRegenerateSection() {
  await loadGlobalRunningTask()
  if (hasOtherAiTaskRunning.value) {
    ElMessage.warning('已有其他AI生成任务正在执行，请等待完成后再操作')
    return
  }
  if (isOperationLocked.value) return
  if (!activeNode.value?.id) return
  sectionGenerating.value = true
  sectionDraft.value = ''
  try {
    await streamSection(activeNode.value.id, {
      title: activeNode.value.title,
      targetWordCount: activeNode.value.targetWordCount || wordPreset.wordCount,
      writingStyle: form.writingStyle,
      writingDirection: activeNode.value.writingDirection,
      writingRequirement: activeNode.value.writingRequirement,
      overwrite: true,
      chartLevel: 'NONE',
      tableLevel: 'NONE',
      imageLevel: 'NONE'
    }, {
      onMessage(chunk) {
        sectionDraft.value += chunk
      },
      onError(message) {
        ElMessage.error('章节生成失败，请稍后重试')
      }
    })
    await refreshCurrent()
    ElMessage.success('章节已重写')
  } finally {
    sectionGenerating.value = false
  }
}

async function onSaveSection() {
  if (isOperationLocked.value) return
  if (!activeNode.value?.id) return
  sectionSaving.value = true
  try {
    await updateSectionContent(activeNode.value.id, sectionDraft.value)
    await refreshCurrent()
    ElMessage.success('章节正文已保存')
  } finally {
    sectionSaving.value = false
  }
}

async function chooseExportOptions() {
  return await openWordExportDialog({
    format: 'word',
    styleCode: 'BID_OFFICIAL',
    showFormat: true
  })
}

async function onExport() {
  if (isOperationLocked.value) return
  if (!currentDoc.value?.id) return
  const confirmed = await confirmDocumentExportBeforeDownload()
  if (!confirmed) return
  const exportOptions = await chooseExportOptions()
  if (!exportOptions) return
  const format = exportOptions.format
  const request = {
    styleCode: exportOptions.styleCode,
    generateCatalog: true,
    beautifyTable: true,
    keepBold: true,
    pageNumber: true
  }
  exportLoading.value = true
  try {
    const started = await startDocumentExportTask(currentDoc.value.id, format, request)
    const task = await waitDocumentExportTask(started?.id)
    if (!task?.fileId) {
      ElMessage.warning('导出成功，但未返回文件ID，请到下载中心查看')
      return
    }
    const blob = await downloadFileResource(task.fileId)
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = task.originalName || `${currentDoc.value.solutionName || 'AI文档'}-导出.${format === 'pdf' ? 'pdf' : 'docx'}`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.URL.revokeObjectURL(url)
    await refreshCurrent()
    await loadDocuments()
    ElMessage.success(`${format === 'pdf' ? 'PDF' : 'Word'}已导出，并写入下载中心`)
  } finally {
    exportLoading.value = false
  }
}


async function confirmDocumentExportBeforeDownload() {
  if (!currentDoc.value?.id) return false
  let check = null
  try {
    check = await getDocumentExportCheck(currentDoc.value.id)
  } catch (e) {
    try {
      await ElMessageBox.confirm('服务端导出前检查暂不可用。请确认文档正文完整后再导出。', '导出前检查', {
        type: 'warning',
        confirmButtonText: '继续导出',
        cancelButtonText: '返回处理'
      })
      return true
    } catch (ignored) {
      return false
    }
  }
  const errors = check?.errors || []
  const warnings = check?.warnings || []
  const suggestions = check?.suggestions || []
  if (check?.canExport === false) {
    await ElMessageBox.alert(
      h('div', { class: 'doc-export-check-message' }, [
        h('p', { class: 'doc-export-check-title' }, `导出前检查未通过（完成度 ${check.percent || 0}%）`),
        h('ul', { class: 'doc-export-check-list' }, (errors.length ? errors : warnings).map((item, index) => h('li', { key: index }, item))),
        suggestions.length ? h('p', { class: 'doc-export-check-tip' }, suggestions.join('；')) : null
      ]),
      '导出前检查',
      { type: 'warning', confirmButtonText: '返回处理' }
    )
    return false
  }
  if (!warnings.length) return true
  try {
    await ElMessageBox.confirm(
      h('div', { class: 'doc-export-check-message' }, [
        h('p', { class: 'doc-export-check-title' }, `导出前检查发现以下问题（完成度 ${check.percent || 0}%）`),
        h('ul', { class: 'doc-export-check-list' }, warnings.map((item, index) => h('li', { key: index }, item))),
        h('p', { class: 'doc-export-check-tip' }, suggestions.length ? suggestions.join('；') : '可以返回处理后再导出，也可以继续导出当前版本。')
      ]),
      '导出前检查',
      { type: 'warning', confirmButtonText: '继续导出', cancelButtonText: '返回处理' }
    )
    return true
  } catch (e) {
    return false
  }
}

async function waitDocumentExportTask(exportId) {
  if (!exportId) throw new Error('导出任务创建失败，请稍后重试')
  for (let i = 0; i < 180; i += 1) {
    const task = await getDocumentExportTask(exportId)
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

async function onDelete(item) {
  if (isOperationLocked.value) return
  await ElMessageBox.confirm(`确定删除“${item.solutionName || ''}”吗？删除后可在回收站恢复。`, '删除确认', { type: 'warning' })
  await deleteDocument(item.id)
  // 删除成功后立即从左侧列表移除；该记录后续只在回收站展示。
  documents.value = documents.value.filter((doc) => String(doc.id || '') !== String(item.id || ''))
  if (currentDoc.value?.id === item.id) resetWorkspace()
  await loadDocuments()
  ElMessage.success('已删除，记录已进入回收站')
}

function flattenLeaves(nodes = []) {
  const result = []
  const walk = (list) => {
    ;(list || []).forEach((node) => {
      if (node.children?.length) walk(node.children)
      else result.push(node)
    })
  }
  walk(nodes)
  return result
}

function statusLabel(status) {
  const map = {
    DRAFT: '草稿',
    INFO_READY: '信息就绪',
    FILE_PARSING: '资料解析中',
    OUTLINE_GENERATING: '大纲生成中',
    OUTLINE_READY: '大纲已生成',
    WORD_COUNT_SET: '已设篇幅',
    CONTENT_GENERATING: '正文生成中',
    CONTENT_PARTIAL: '部分完成',
    CONTENT_READY: '正文完成',
    DONE: '已完成',
    DELETED: '已删除',
    FAILED: '失败'
  }
  return map[String(status || '').toUpperCase()] || status || '未知'
}

function statusTagType(status) {
  const value = String(status || '').toUpperCase()
  if (['DONE', 'CONTENT_READY'].includes(value)) return 'success'
  if (['CONTENT_GENERATING', 'OUTLINE_GENERATING', 'FILE_PARSING'].includes(value)) return 'warning'
  if (['FAILED', 'PARSE_FAILED'].includes(value)) return 'danger'
  return 'info'
}

function docTypeLabel(type) {
  const found = documentTypes.value.find((item) => item.type === type)
  if (found) return found.shortTitle || found.title
  const map = { FEASIBILITY: '可研报告', CONTRACT: '商务合同', EIA: '环评报告', TIA: '交评报告' }
  return map[type] || 'AI文档'
}

function fallbackTypes() {
  return [
    { type: 'FEASIBILITY', title: 'AI可行性研究报告生成', shortTitle: '可研报告', description: '生成可研报告草稿', fields: [] },
    { type: 'CONTRACT', title: 'AI商务合同生成', shortTitle: '商务合同', description: '生成商务合同草稿', fields: [] },
    { type: 'EIA', title: 'AI环境影响评价生成', shortTitle: '环评报告', description: '生成环评报告草稿', fields: [] },
    { type: 'TIA', title: 'AI交通影响评价生成', shortTitle: '交评报告', description: '生成交评报告草稿', fields: [] }
  ]
}
</script>

<style scoped>
.ai-doc-page {
  display: grid;
  grid-template-columns: 300px minmax(0, 1fr);
  gap: 14px;
  height: calc(100vh - 76px);
  min-height: 660px;
}

.doc-sidebar,
.doc-main,
.hero-card,
.flow-card,
.left-panel,
.right-panel,
.outline-panel,
.section-panel {
  border: 1px solid #e5ebf5;
  border-radius: 18px;
  background: #fff;
  box-shadow: 0 10px 28px rgba(15, 23, 42, 0.05);
}

.doc-sidebar {
  display: flex;
  flex-direction: column;
  padding: 14px;
  min-width: 0;
}

.side-head {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  align-items: flex-start;
}

.side-head h3 {
  margin: 0;
  font-size: 18px;
  color: #172033;
}

.side-head p,
.hero-card p,
.generate-box p,
.section-head p {
  margin: 6px 0 0;
  color: #718096;
  font-size: 13px;
}

.side-search {
  margin: 14px 0;
}

.doc-list-scroll {
  flex: 1;
  min-height: 0;
}

.doc-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.doc-list-load-state {
  padding: 16px 0 6px;
  color: #8a95a8;
  text-align: center;
  font-size: 13px;
}

.doc-item {
  padding: 12px;
  border-radius: 14px;
  border: 1px solid #edf2fb;
  cursor: pointer;
  transition: all .18s ease;
}

.doc-item:hover,
.doc-item.active {
  border-color: #8ab4ff;
  background: #f7fbff;
  box-shadow: 0 8px 18px rgba(37, 99, 235, 0.08);
}

.doc-item-title {
  display: flex;
  gap: 8px;
  align-items: center;
  font-weight: 700;
  color: #1f2a44;
}

.doc-item-title span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.doc-item-meta,
.summary-tags,
.generate-actions,
.header-actions,
.section-actions {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}

.doc-item-meta {
  margin-top: 10px;
}

.doc-item-bottom {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 8px;
  color: #94a3b8;
  font-size: 12px;
}

.doc-main {
  min-width: 0;
  padding: 14px;
  overflow: auto;
  background: linear-gradient(180deg, #ffffff 0%, #f6f9ff 100%);
}

.hero-card {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 28px;
  min-height: 170px;
  background: linear-gradient(135deg, #f7fbff, #eef5ff);
}

.eyebrow {
  color: #246bfe !important;
  font-weight: 800;
  letter-spacing: 2px;
}

.hero-card h1 {
  margin: 8px 0 0;
  font-size: 30px;
  color: #14213d;
}

.hero-ill {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 120px;
  height: 120px;
  border-radius: 36px;
  background: linear-gradient(135deg, #246bfe, #7c3aed);
  color: #fff;
  font-size: 30px;
  font-weight: 900;
  box-shadow: 0 18px 40px rgba(37, 99, 235, .22);
}

.type-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;
  margin-top: 14px;
}

.type-card {
  min-height: 180px;
  padding: 18px;
  border: 1px solid #e5ebf5;
  border-radius: 18px;
  background: #fff;
  cursor: pointer;
  transition: all .18s ease;
}

.type-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 16px 34px rgba(37, 99, 235, .13);
  border-color: #8ab4ff;
}

.type-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 42px;
  height: 42px;
  border-radius: 14px;
  background: #edf5ff;
  color: #246bfe;
  font-size: 20px;
}

.type-card h3 {
  margin: 14px 0 8px;
  color: #172033;
}

.type-card p {
  min-height: 42px;
  color: #718096;
  font-size: 13px;
  line-height: 1.6;
}

.work-header,
.flow-card {
  margin-bottom: 14px;
}

.work-header {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: center;
  padding: 6px 2px 0;
}

.breadcrumb-line {
  display: flex;
  align-items: center;
  gap: 6px;
  color: #7b8794;
  font-size: 13px;
}

.work-header h2 {
  margin: 8px 0;
  color: #172033;
}

.flow-card {
  padding: 16px 12px;
}

.workspace-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.1fr) minmax(360px, .9fr);
  gap: 14px;
}

.left-panel,
.right-panel,
.outline-panel,
.section-panel {
  padding: 16px;
}

.panel-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14px;
  font-size: 16px;
  font-weight: 800;
  color: #172033;
}

.form-row-two {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.full-select,
.word-select {
  width: 100%;
}

.panel-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding-top: 10px;
  border-top: 1px dashed #e5ebf5;
}

.reference-upload :deep(.el-upload-dragger) {
  border-radius: 16px;
  background: #f8fbff;
}

.upload-icon {
  font-size: 32px;
  color: #246bfe;
}

.upload-title {
  margin-top: 8px;
  font-weight: 800;
  color: #1f2a44;
}

.upload-status {
  margin-top: 6px;
  color: #246bfe;
}

.reference-note {
  margin-top: 12px;
}

.setting-box,
.generate-box {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 14px;
  padding: 14px;
  border-radius: 16px;
  background: #f8fbff;
  border: 1px solid #edf2fb;
}

.setting-title {
  font-weight: 800;
  color: #1f2a44;
}

.risk-alert {
  margin-top: 14px;
}

.result-grid {
  display: grid;
  grid-template-columns: 380px minmax(0, 1fr);
  gap: 14px;
  margin-top: 14px;
  min-height: 460px;
}

.outline-scroll {
  height: 410px;
}

.outline-node {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 36px;
  padding: 6px 8px;
  border-radius: 10px;
  color: #243047;
}

.outline-node.leaf {
  cursor: pointer;
}

.outline-node:hover,
.outline-node.active {
  background: #edf5ff;
  color: #246bfe;
}

.outline-title {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.outline-node small {
  color: #94a3b8;
}

.section-panel {
  min-width: 0;
}

.section-head {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: flex-start;
  margin-bottom: 12px;
}

.section-head h3 {
  margin: 0;
  color: #172033;
}

.section-editor :deep(.el-textarea__inner) {
  height: 370px;
  line-height: 1.8;
  border-radius: 14px;
}

@media (max-width: 1400px) {
  .type-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .workspace-grid,
  .result-grid {
    grid-template-columns: 1fr;
  }
}
.outline-running-alert {
  margin-top: 12px;
}


/* 兼容 Element Plus teleported dialog：class 可能挂在 el-dialog 或 overlay 上。 */
:deep(.doc-form-dialog.el-dialog),
:deep(.doc-form-dialog .el-dialog) {
  max-height: 88vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

:deep(.doc-form-dialog.el-dialog .el-dialog__body),
:deep(.doc-form-dialog .el-dialog__body) {
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

:deep(.doc-form-dialog.el-dialog .el-dialog__footer),
:deep(.doc-form-dialog .el-dialog__footer) {
  border-top: 1px solid #edf2fb;
  background: #fff;
}

.doc-item.locked,
.type-card.locked,
.tree-row.locked {
  cursor: not-allowed;
}

.doc-item.locked,
.type-card.locked {
  opacity: .72;
}

.tree-row.locked {
  pointer-events: none;
}

</style>

<!-- 页面重构补充样式：基础信息收进弹窗，主页面只保留概览、操作、大纲和正文。 -->
<style scoped>
.home-panel {
  min-height: calc(100vh - 120px);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 40px 56px;
}

.home-panel h1 {
  margin: 0;
  font-size: 34px;
  color: #172033;
}

.home-desc {
  max-width: 760px;
  margin: 14px auto 34px;
  color: #637083;
  line-height: 1.8;
}

.home-new-btn {
  margin-top: 28px;
  min-width: 150px;
  height: 42px;
}

.type-ill {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 58px;
  height: 58px;
  margin-top: 34px;
  border-radius: 16px;
  background: #fff;
  color: #3b82f6;
  font-size: 26px;
  font-weight: 900;
  box-shadow: 0 18px 36px rgba(37, 99, 235, .12);
}

.doc-summary-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;
  margin-bottom: 14px;
}

.summary-card {
  min-height: 112px;
  padding: 18px;
  border: 1px solid #e5ebf5;
  border-radius: 18px;
  background: #fff;
  box-shadow: 0 10px 28px rgba(15, 23, 42, 0.04);
}

.summary-card span {
  display: block;
  color: #68758a;
  font-size: 13px;
}

.summary-card strong {
  display: block;
  margin-top: 8px;
  color: #172033;
  font-size: 24px;
  line-height: 1.2;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.summary-card small {
  display: block;
  margin-top: 8px;
  color: #8b98aa;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.soft-blue { background: linear-gradient(135deg, #f6faff, #eef5ff); }
.soft-green { background: linear-gradient(135deg, #f7fffb, #effaf5); }
.soft-orange { background: linear-gradient(135deg, #fffaf4, #fff4e8); }
.soft-purple { background: linear-gradient(135deg, #fbf8ff, #f3edff); }

.action-card {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 14px;
  align-items: center;
  margin-bottom: 14px;
  padding: 16px;
  border: 1px solid #e5ebf5;
  border-radius: 18px;
  background: #fff;
  box-shadow: 0 10px 28px rgba(15, 23, 42, 0.04);
}

.action-left strong {
  color: #172033;
  font-size: 17px;
}

.action-left p {
  margin: 6px 0 0;
  color: #718096;
  font-size: 13px;
}

.action-right {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
  justify-content: flex-end;
}

.word-mini-select {
  width: 150px;
}

.task-progress {
  grid-column: 1 / -1;
}

.dialog-scroll {
  max-height: 64vh;
  padding-right: 10px;
}

.doc-form-dialog :deep(.el-dialog__body) {
  padding-top: 8px;
}

.dialog-section-title {
  display: flex;
  align-items: center;
  margin: 8px 0 14px;
  color: #172033;
  font-size: 16px;
  font-weight: 800;
}

.dialog-section-title::before {
  content: '';
  width: 4px;
  height: 16px;
  margin-right: 8px;
  border-radius: 999px;
  background: #246bfe;
}

.dialog-word-row {
  display: grid;
  grid-template-columns: 1fr 220px;
  gap: 14px;
  align-items: center;
  padding-bottom: 8px;
}

.result-grid {
  min-height: 520px;
}

.outline-scroll {
  height: 470px;
}

.section-editor :deep(.el-textarea__inner) {
  height: 430px;
}

@media (max-width: 1500px) {
  .doc-summary-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .action-card {
    grid-template-columns: 1fr;
  }

  .action-right {
    justify-content: flex-start;
  }
}
/* AI文档工作台样式优化：删除流程/统计大块后，聚焦大纲与正文。 */
.work-header {
  margin-bottom: 14px;
  padding: 18px 20px;
  border: 1px solid #e5ebf5;
  border-radius: 18px;
  background: linear-gradient(135deg, #ffffff 0%, #f7fbff 100%);
  box-shadow: 0 10px 28px rgba(15, 23, 42, 0.04);
}

.action-card {
  margin-bottom: 14px;
}

.result-grid {
  grid-template-columns: 390px minmax(0, 1fr);
  min-height: calc(100vh - 300px);
  margin-top: 0;
}

.outline-panel,
.section-panel {
  min-height: calc(100vh - 300px);
}

.outline-panel {
  padding: 16px 14px;
}

.outline-scroll {
  height: calc(100vh - 370px);
  min-height: 420px;
}

.outline-tree {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.outline-node {
  position: relative;
  min-height: 34px;
  padding: 6px 8px;
  border: 1px solid transparent;
  border-radius: 10px;
  transition: all .16s ease;
}

.outline-node.leaf:hover,
.outline-node.leaf.active {
  border-color: #bfdbfe;
  background: #eff6ff;
  color: #1d4ed8;
}

.outline-node:not(.leaf) {
  color: #475569;
  font-weight: 700;
}

.outline-title {
  font-size: 14px;
}

.section-panel {
  display: flex;
  flex-direction: column;
  padding: 18px;
}

.section-title-block {
  min-width: 0;
}

.section-kicker {
  margin-bottom: 6px;
  color: #2563eb;
  font-size: 13px;
  font-weight: 800;
}

.section-meta-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 8px;
}

.section-direction {
  max-width: 720px;
  color: #64748b;
  font-size: 13px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.section-editor {
  flex: 1;
  min-height: 0;
}

.section-editor :deep(.el-textarea__inner) {
  height: calc(100vh - 470px);
  min-height: 420px;
  padding: 16px;
  background: #fbfdff;
  font-size: 15px;
  line-height: 1.9;
}

.doc-form-dialog :deep(.el-dialog) {
  max-height: 88vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.doc-form-dialog :deep(.el-dialog__body) {
  flex: 1;
  min-height: 0;
  overflow: hidden;
  padding: 8px 18px 0;
}

.doc-form-dialog :deep(.el-dialog__footer) {
  padding: 12px 18px 16px;
  border-top: 1px solid #edf2fb;
  background: #fff;
}

.dialog-scroll {
  max-height: calc(88vh - 142px);
  padding-right: 12px;
}

.doc-form {
  padding-bottom: 12px;
}

.dynamic-field-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0 14px;
}

.dynamic-field-grid .wide-field {
  grid-column: 1 / -1;
}

.doc-form :deep(.el-form-item) {
  margin-bottom: 14px;
}

.doc-form :deep(.el-textarea__inner) {
  resize: vertical;
}

.dialog-footer-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

@media (max-width: 1400px) {
  .result-grid {
    grid-template-columns: 360px minmax(0, 1fr);
  }
}

@media (max-width: 1100px) {
  .result-grid,
  .dynamic-field-grid,
  .form-row-two {
    grid-template-columns: 1fr;
  }
}

/* 兼容 Element Plus teleported dialog：class 可能挂在 el-dialog 或 overlay 上。 */
:deep(.doc-form-dialog.el-dialog),
:deep(.doc-form-dialog .el-dialog) {
  max-height: 88vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

:deep(.doc-form-dialog.el-dialog .el-dialog__body),
:deep(.doc-form-dialog .el-dialog__body) {
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

:deep(.doc-form-dialog.el-dialog .el-dialog__footer),
:deep(.doc-form-dialog .el-dialog__footer) {
  border-top: 1px solid #edf2fb;
  background: #fff;
}

</style>


<!-- 大纲与正文阅读体验优化：拆分标题、状态、字数和编写要求，避免文字挤在一行。 -->
<style scoped>
.outline-panel {
  padding: 18px;
}

.panel-title {
  padding-bottom: 12px;
  border-bottom: 1px solid #eef3fb;
}

.outline-scroll {
  height: calc(100vh - 382px);
  min-height: 430px;
  padding-right: 4px;
}

.outline-tree {
  gap: 8px;
}

.outline-node-wrap {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.outline-node {
  display: grid;
  grid-template-columns: 30px minmax(0, 1fr);
  align-items: flex-start;
  gap: 10px;
  min-height: auto;
  padding: 10px 12px;
  border: 1px solid transparent;
  border-radius: 14px;
  color: #1f2a44;
}

.outline-node.outline-chapter {
  background: #f8fafc;
  border-color: #edf2f7;
  font-weight: 800;
}

.outline-node.outline-leaf {
  cursor: pointer;
  background: #ffffff;
  border-color: #eef3fb;
}

.outline-node.outline-leaf:hover,
.outline-node.outline-leaf.active {
  border-color: #93c5fd;
  background: linear-gradient(135deg, #eff6ff 0%, #ffffff 100%);
  box-shadow: 0 8px 18px rgba(37, 99, 235, .08);
  transform: translateY(-1px);
}

.outline-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 9px;
  font-size: 13px;
  font-weight: 800;
  flex-shrink: 0;
}

.chapter-badge {
  color: #475569;
  background: #e2e8f0;
}

.leaf-badge {
  color: #16a34a;
  background: #dcfce7;
}

.outline-content {
  min-width: 0;
}

.outline-main-line {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 10px;
  align-items: start;
  gap: 8px;
}

.outline-title {
  display: block;
  min-width: 0;
  overflow: visible;
  white-space: normal;
  text-overflow: clip;
  line-height: 1.45;
  font-size: 14px;
  color: #1e293b;
  word-break: break-word;
}

.outline-node.outline-chapter .outline-title {
  font-size: 15px;
  color: #0f172a;
}

.outline-meta-line {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 7px;
  color: #94a3b8;
  font-size: 12px;
  font-weight: 500;
}

.outline-word-pill {
  padding: 2px 7px;
  border-radius: 999px;
  background: #f1f5f9;
  color: #64748b;
}

.outline-state-text.done {
  color: #16a34a;
}

.outline-state-text.todo {
  color: #f59e0b;
}

.outline-status-dot {
  width: 8px;
  height: 8px;
  margin-top: 7px;
  border-radius: 999px;
  background: #cbd5e1;
}

.outline-status-dot.done {
  background: #22c55e;
  box-shadow: 0 0 0 3px rgba(34, 197, 94, .12);
}

.outline-status-dot.todo {
  background: #f59e0b;
  box-shadow: 0 0 0 3px rgba(245, 158, 11, .12);
}

.section-panel {
  padding: 20px;
  background: linear-gradient(180deg, #ffffff 0%, #fbfdff 100%);
}

.section-head {
  align-items: flex-start;
  padding-bottom: 14px;
  border-bottom: 1px solid #eef3fb;
}

.section-title-block h3 {
  margin: 0;
  color: #0f172a;
  font-size: 22px;
  line-height: 1.35;
  word-break: break-word;
}

.section-kicker {
  display: inline-flex;
  align-items: center;
  height: 24px;
  padding: 0 10px;
  margin-bottom: 8px;
  border-radius: 999px;
  background: #eff6ff;
  color: #2563eb;
  font-size: 12px;
  font-weight: 800;
}

.section-meta-row {
  gap: 8px;
  margin-top: 10px;
}

.section-meta-pill {
  display: inline-flex;
  align-items: center;
  height: 24px;
  padding: 0 9px;
  border-radius: 999px;
  background: #f1f5f9;
  color: #64748b;
  font-size: 12px;
  font-weight: 700;
}

.section-meta-pill.done {
  background: #dcfce7;
  color: #15803d;
}

.section-meta-pill.todo {
  background: #fef3c7;
  color: #b45309;
}

.section-guidance {
  display: grid;
  grid-template-columns: 76px minmax(0, 1fr);
  gap: 12px;
  margin: 14px 0;
  padding: 14px;
  border: 1px solid #dbeafe;
  border-radius: 14px;
  background: #f8fbff;
}

.guidance-label {
  color: #2563eb;
  font-size: 13px;
  font-weight: 800;
  white-space: nowrap;
}

.guidance-text {
  color: #475569;
  font-size: 14px;
  line-height: 1.75;
  white-space: pre-wrap;
  word-break: break-word;
}

.editor-label-row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin: 4px 0 8px;
  color: #172033;
  font-size: 15px;
  font-weight: 800;
}

.editor-label-row small {
  color: #94a3b8;
  font-size: 12px;
  font-weight: 500;
}

.section-editor :deep(.el-textarea__inner) {
  padding: 18px 20px;
  border-color: #dbe4f0;
  border-radius: 16px;
  background: #ffffff;
  color: #1f2937;
  font-size: 15px;
  line-height: 1.95;
  letter-spacing: .2px;
  box-shadow: inset 0 1px 2px rgba(15, 23, 42, .03);
}

.section-editor :deep(.el-textarea__inner:focus) {
  border-color: #93c5fd;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, .08);
}

.word-preset-panel {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.preset-tip {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 14px 16px;
  border: 1px solid #dbeafe;
  border-radius: 12px;
  background: #eff6ff;
  color: #1e3a8a;
}

.preset-tip strong {
  font-size: 15px;
}

.preset-tip span {
  color: #475569;
  line-height: 1.6;
}

.dialog-word-row--standalone {
  justify-content: space-between;
}

@media (max-width: 1200px) {
  .section-guidance {
    grid-template-columns: 1fr;
  }
}
</style>


<!-- AI文档大纲与正文区域最终样式：参考 AI方案目录树，固定右侧状态列，当前章节提示改为信息图标悬浮展示。 -->
<style scoped>
.outline-panel {
  padding: 18px 20px;
}

.panel-title {
  padding-bottom: 12px;
  border-bottom: 1px solid #eef3fb;
}

.outline-scroll {
  height: calc(100vh - 362px);
  min-height: 430px;
  padding-right: 4px;
}

.outline-tree {
  font-size: 14px;
  color: #334155;
}

.tree-node-wrap {
  width: 100%;
}

.tree-row {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 38px;
  box-sizing: border-box;
  border-bottom: 1px dashed #edf2f7;
  color: #64748b;
  transition: background .15s ease, color .15s ease;
}

.tree-row.parent-row {
  min-height: 40px;
  color: #334155;
}

.tree-row.generate-row {
  min-height: 40px;
  padding-right: 0;
  cursor: pointer;
}

.tree-row.generate-row:hover,
.tree-row.generate-row.active {
  background: #f8fafc;
}

.tree-row.generate-row.active {
  color: #2563eb;
}

.tree-dot {
  width: 16px;
  flex: 0 0 16px;
  text-align: center;
  color: #ef4444;
  font-size: 13px;
  line-height: 1;
}

.tree-title {
  flex: 1 1 auto;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  line-height: 22px;
}

.tree-title.parent {
  font-size: 15px;
  font-weight: 800;
  color: #1f2937;
}

.tree-title.leaf {
  font-size: 14px;
  font-weight: 400;
  color: #64748b;
}

.tree-row.active .tree-title.leaf {
  color: #2563eb;
  font-weight: 700;
}

.tree-controls {
  margin-left: auto;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  flex-shrink: 0;
}

.tree-controls:empty {
  display: none;
}

.tree-controls.generate-controls {
  width: 168px;
  min-width: 168px;
  display: grid;
  grid-template-columns: 96px 64px;
  column-gap: 8px;
  align-items: center;
  justify-items: end;
}

.tree-controls.generate-controls .count-text {
  display: inline-flex;
  align-items: center;
  justify-content: flex-end;
  width: 96px;
  min-width: 96px;
  color: #64748b;
  font-size: 13px;
  font-weight: 700;
  line-height: 22px;
  white-space: nowrap;
  word-break: keep-all;
}

.tree-controls.generate-controls .el-tag {
  width: 60px;
  justify-content: center;
  padding: 0 6px;
  font-size: 12px;
}

.section-panel {
  padding: 20px 22px;
  background: linear-gradient(180deg, #ffffff 0%, #fbfdff 100%);
}

.section-head {
  align-items: flex-start;
  gap: 16px;
  padding-bottom: 16px;
  border-bottom: 1px solid #eef3fb;
}

.section-title-block {
  min-width: 0;
}

.section-title-row {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  min-width: 0;
}

.section-title-row h3 {
  margin: 0;
  color: #0f172a;
  font-size: 22px;
  line-height: 1.35;
  word-break: break-word;
}

.section-info-icon {
  flex: 0 0 auto;
  margin-top: 6px;
  color: #3b82f6;
  cursor: help;
  font-size: 17px;
}

.section-info-icon:hover {
  color: #1d4ed8;
}

.section-kicker {
  display: inline-flex;
  align-items: center;
  height: 24px;
  padding: 0 10px;
  margin-bottom: 8px;
  border-radius: 999px;
  background: #eff6ff;
  color: #2563eb;
  font-size: 12px;
  font-weight: 800;
}

.section-meta-row {
  gap: 8px;
  margin-top: 10px;
}

.section-meta-pill {
  display: inline-flex;
  align-items: center;
  height: 24px;
  padding: 0 9px;
  border-radius: 999px;
  background: #f1f5f9;
  color: #64748b;
  font-size: 12px;
  font-weight: 700;
}

.section-meta-pill.done {
  background: #dcfce7;
  color: #15803d;
}

.section-meta-pill.todo {
  background: #fef3c7;
  color: #b45309;
}

.editor-label-row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin: 16px 0 10px;
  color: #172033;
  font-size: 15px;
  font-weight: 800;
}

.editor-label-row small {
  color: #94a3b8;
  font-size: 12px;
  font-weight: 500;
}

.section-editor :deep(.el-textarea__inner) {
  padding: 18px 20px;
  border-color: #dbe4f0;
  border-radius: 16px;
  background: #ffffff;
  color: #1f2937;
  font-size: 15px;
  line-height: 1.95;
  letter-spacing: .2px;
  box-shadow: inset 0 1px 2px rgba(15, 23, 42, .03);
}

.section-editor :deep(.el-textarea__inner:focus) {
  border-color: #93c5fd;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, .08);
}
</style>

<style>
.section-guidance-tooltip {
  max-width: 520px;
  border: 1px solid #dbeafe !important;
  border-radius: 12px !important;
  box-shadow: 0 14px 36px rgba(15, 23, 42, .16) !important;
}

.guidance-tooltip-content {
  max-width: 500px;
  color: #334155;
  font-size: 13px;
  line-height: 1.75;
  white-space: pre-wrap;
  word-break: break-word;
}
</style>

<!-- AI文档工作台最终细化：目录按 AI方案树形目录展示，去掉内部滚动条，生成区收敛为工具条。 -->
<style scoped>
.work-header {
  margin-bottom: 12px;
  padding: 18px 22px;
  border: 1px solid #e6eef8;
  border-radius: 18px;
  background: linear-gradient(135deg, #ffffff 0%, #f8fbff 100%);
  box-shadow: 0 10px 26px rgba(15, 23, 42, .04);
}

.generate-dock {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 14px;
  padding: 14px 16px;
  border: 1px solid #e6eef8;
  border-radius: 18px;
  background: #fff;
  box-shadow: 0 10px 24px rgba(15, 23, 42, .04);
}

.generate-dock-main {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
}

.generate-dock-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 38px;
  height: 38px;
  border-radius: 14px;
  color: #2563eb;
  background: linear-gradient(135deg, #eff6ff 0%, #eef2ff 100%);
  box-shadow: inset 0 0 0 1px #dbeafe;
  flex-shrink: 0;
}

.generate-dock-title {
  color: #172033;
  font-size: 15px;
  font-weight: 800;
  line-height: 1.3;
}

.generate-dock-desc {
  margin-top: 3px;
  color: #7b8794;
  font-size: 12px;
  line-height: 1.5;
}

.generate-dock-tools {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
}

.word-preset-box {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  height: 34px;
  padding: 0 8px 0 12px;
  border: 1px solid #e5ebf5;
  border-radius: 10px;
  background: #f8fbff;
  color: #64748b;
  font-size: 12px;
  font-weight: 700;
}

.word-mini-select {
  width: 104px;
}

.word-mini-select :deep(.el-select__wrapper) {
  min-height: 26px;
  border: 0;
  box-shadow: none;
  background: transparent;
}

.generate-dock .task-progress {
  position: absolute;
  left: 16px;
  right: 16px;
  bottom: -1px;
}

.generate-dock .task-progress :deep(.el-progress-bar__outer) {
  height: 3px !important;
  border-radius: 999px;
  background: transparent;
}

.result-grid {
  display: grid;
  grid-template-columns: minmax(430px, .96fr) minmax(560px, 1.55fr);
  align-items: stretch;
  gap: 14px;
  margin-top: 0;
  min-height: 0;
}

.outline-panel,
.section-panel {
  border: 1px solid #e6eef8;
  border-radius: 18px;
  background: #fff;
  box-shadow: 0 10px 24px rgba(15, 23, 42, .04);
}

.outline-panel {
  padding: 18px 20px;
  align-self: start;
}

.panel-title {
  margin-bottom: 12px;
  padding-bottom: 12px;
  border-bottom: 1px solid #eef3fb;
  color: #172033;
  font-size: 17px;
  font-weight: 900;
}

.outline-scroll {
  height: auto !important;
  max-height: none !important;
  min-height: 0 !important;
  overflow: visible !important;
  padding-right: 0 !important;
}

.outline-tree {
  display: block;
  width: 100%;
  color: #334155;
  font-size: 14px;
}

.tree-node-wrap {
  width: 100%;
}

.tree-children {
  width: 100%;
}

.tree-row {
  display: grid !important;
  grid-template-columns: 16px minmax(0, 1fr);
  align-items: center;
  column-gap: 8px;
  min-height: 34px;
  padding-top: 4px;
  padding-bottom: 4px;
  padding-right: 6px;
  border-bottom: 1px dashed #edf2f7;
  border-radius: 8px;
  box-sizing: border-box;
  color: #64748b;
  transition: background .15s ease, color .15s ease, box-shadow .15s ease;
}

.tree-row.generate-row {
  grid-template-columns: 16px minmax(0, 1fr) 138px;
  min-height: 36px;
  cursor: pointer;
}

.tree-row.parent-row {
  color: #334155;
  background: transparent;
}

.tree-row.generate-row:hover,
.tree-row.generate-row.active {
  background: #f8fbff;
  box-shadow: inset 3px 0 0 #3b82f6;
}

.tree-row.generate-row.active .tree-title.leaf {
  color: #2563eb;
  font-weight: 800;
}

.tree-dot {
  width: 16px;
  color: #ef4444;
  font-size: 13px;
  text-align: center;
  line-height: 1;
}

.tree-title {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  line-height: 22px;
}

.tree-title.parent {
  color: #1f2937;
  font-size: 14px;
  font-weight: 800;
}

.tree-title.leaf {
  color: #475569;
  font-size: 14px;
  font-weight: 500;
}

.tree-controls {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 6px;
  min-width: 0;
  margin-left: 0 !important;
}

.tree-controls:empty {
  display: none;
}

.tree-controls.generate-controls {
  width: 138px !important;
  min-width: 138px !important;
  display: grid !important;
  grid-template-columns: 74px 58px !important;
  column-gap: 6px;
  align-items: center;
  justify-items: end;
}

.count-text {
  display: inline-flex;
  justify-content: flex-end;
  width: 74px;
  color: #64748b;
  font-size: 12px;
  font-weight: 700;
  white-space: nowrap;
}

.tree-controls.generate-controls :deep(.el-tag) {
  max-width: 58px;
  height: 22px;
  padding: 0 6px;
  border-radius: 999px;
  font-size: 12px;
}

.section-panel {
  padding: 22px 24px;
  min-width: 0;
}

.section-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  padding-bottom: 16px;
  border-bottom: 1px solid #eef3fb;
}

.section-kicker {
  display: inline-flex;
  align-items: center;
  height: 24px;
  padding: 0 10px;
  border-radius: 999px;
  color: #2563eb;
  background: #eff6ff;
  font-size: 12px;
  font-weight: 800;
}

.section-title-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 10px;
}

.section-title-row h3 {
  margin: 0;
  color: #0f172a;
  font-size: 22px;
  line-height: 1.35;
  font-weight: 900;
}

.section-info-icon {
  color: #3b82f6;
  cursor: help;
  flex-shrink: 0;
}

.section-meta-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  margin-top: 12px;
}

.section-meta-pill {
  display: inline-flex;
  align-items: center;
  height: 24px;
  padding: 0 10px;
  border-radius: 999px;
  background: #f1f5f9;
  color: #64748b;
  font-size: 12px;
  font-weight: 800;
}

.section-meta-pill.done {
  color: #15803d;
  background: #dcfce7;
}

.section-meta-pill.todo {
  color: #b45309;
  background: #fef3c7;
}

.section-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
}

.editor-label-row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin: 20px 0 10px;
  color: #172033;
  font-size: 15px;
  font-weight: 900;
}

.editor-label-row small {
  color: #94a3b8;
  font-size: 12px;
  font-weight: 500;
}

.section-editor :deep(.el-textarea__inner) {
  min-height: 410px !important;
  padding: 18px 20px;
  border-color: #dbe4f0;
  border-radius: 16px;
  background: #fff;
  color: #1f2937;
  font-size: 15px;
  line-height: 1.95;
  letter-spacing: .2px;
  box-shadow: inset 0 1px 2px rgba(15, 23, 42, .03);
}

@media (max-width: 1400px) {
  .result-grid {
    grid-template-columns: minmax(390px, .9fr) minmax(500px, 1.4fr);
  }

  .tree-row.generate-row {
    grid-template-columns: 16px minmax(0, 1fr) 124px;
  }

  .tree-controls.generate-controls {
    width: 124px !important;
    min-width: 124px !important;
    grid-template-columns: 68px 50px !important;
  }

  .count-text {
    width: 68px;
  }
}

@media (max-width: 1180px) {
  .generate-dock {
    align-items: flex-start;
    flex-direction: column;
  }

  .generate-dock-tools {
    width: 100%;
    flex-wrap: wrap;
  }

  .result-grid {
    grid-template-columns: 1fr;
  }
}
</style>

<!-- AI文档工作台最终减法：去掉整体页面滚动条，目录按 AI方案行式目录展示，当前章节压缩到单行。 -->
<style>
.ai-doc-page {
  height: calc(100vh - 76px) !important;
  min-height: 0 !important;
  overflow: hidden !important;
}

.ai-doc-page .doc-sidebar {
  min-height: 0 !important;
  overflow: hidden !important;
}

.ai-doc-page .doc-main {
  display: flex !important;
  flex-direction: column !important;
  min-height: 0 !important;
  overflow: hidden !important;
  padding: 14px !important;
}

.ai-doc-page .work-header {
  flex: 0 0 auto !important;
  margin-bottom: 10px !important;
  padding: 14px 18px !important;
  border-radius: 18px !important;
}

.ai-doc-page .work-header h2 {
  margin: 4px 0 8px !important;
  line-height: 1.25 !important;
}

.ai-doc-page .compact-generate-dock {
  flex: 0 0 auto !important;
  min-height: 46px !important;
  margin-bottom: 10px !important;
  padding: 10px 14px !important;
  border-radius: 16px !important;
}

.ai-doc-page .generate-dock-icon {
  width: 30px !important;
  height: 30px !important;
  border-radius: 10px !important;
}

.ai-doc-page .generate-dock-title {
  font-size: 14px !important;
  white-space: nowrap !important;
}

.ai-doc-page .generate-dock-desc {
  display: none !important;
}

.ai-doc-page .dock-info-icon {
  color: #3b82f6;
  cursor: help;
}

.ai-doc-page .word-preset-box {
  height: 32px !important;
  padding: 0 8px !important;
  border-radius: 9px !important;
}

.ai-doc-page .word-mini-select {
  width: 92px !important;
}

.ai-doc-page .generate-dock-tools .el-button {
  height: 32px !important;
  padding: 0 14px !important;
}

.ai-doc-page .result-grid {
  flex: 1 1 auto !important;
  display: grid !important;
  grid-template-columns: minmax(440px, .92fr) minmax(0, 1.58fr) !important;
  gap: 12px !important;
  min-height: 0 !important;
  height: auto !important;
  margin-top: 0 !important;
  overflow: hidden !important;
}

.ai-doc-page .outline-panel,
.ai-doc-page .section-panel {
  min-height: 0 !important;
  overflow: hidden !important;
  border-radius: 18px !important;
}

.ai-doc-page .outline-panel {
  display: flex !important;
  flex-direction: column !important;
  padding: 16px 18px !important;
}

.ai-doc-page .panel-title {
  flex: 0 0 auto !important;
  margin-bottom: 10px !important;
  padding-bottom: 10px !important;
}

.ai-doc-page .outline-scroll {
  flex: 1 1 auto !important;
  height: auto !important;
  max-height: none !important;
  min-height: 0 !important;
  overflow-y: auto !important;
  overflow-x: hidden !important;
  padding-right: 2px !important;
  scrollbar-width: none !important;
}

.ai-doc-page .outline-scroll::-webkit-scrollbar {
  width: 0 !important;
  height: 0 !important;
}

.ai-doc-page .outline-tree {
  display: block !important;
  width: 100% !important;
  font-size: 14px !important;
  color: #334155 !important;
}

.ai-doc-page .tree-node-wrap,
.ai-doc-page .tree-children {
  width: 100% !important;
}

.ai-doc-page .tree-row {
  display: grid !important;
  grid-template-columns: 16px 28px minmax(0, 1fr) !important;
  align-items: center !important;
  column-gap: 7px !important;
  min-height: 34px !important;
  padding-top: 3px !important;
  padding-right: 8px !important;
  padding-bottom: 3px !important;
  border-radius: 10px !important;
  border-bottom: 0 !important;
  color: #475569 !important;
  box-sizing: border-box !important;
  transition: background .16s ease, box-shadow .16s ease, color .16s ease !important;
}

.ai-doc-page .tree-row + .tree-children {
  margin-top: 2px !important;
}

.ai-doc-page .tree-row.generate-row {
  grid-template-columns: 16px 28px minmax(0, 1fr) 132px !important;
  cursor: pointer !important;
}

.ai-doc-page .tree-row.parent-row {
  margin-top: 2px !important;
  background: transparent !important;
}

.ai-doc-page .tree-row.generate-row:hover,
.ai-doc-page .tree-row.generate-row.active {
  background: #f3f8ff !important;
  box-shadow: inset 3px 0 0 #3b82f6 !important;
}

.ai-doc-page .tree-toggle {
  width: 16px !important;
  color: #94a3b8 !important;
  font-size: 12px !important;
  text-align: center !important;
}

.ai-doc-page .tree-badge {
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
  width: 26px !important;
  height: 22px !important;
  border-radius: 7px !important;
  font-size: 12px !important;
  font-weight: 800 !important;
  line-height: 1 !important;
}

.ai-doc-page .tree-badge.chapter-badge {
  color: #2563eb !important;
  background: #eaf2ff !important;
}

.ai-doc-page .tree-badge.section-badge {
  color: #7c3aed !important;
  background: #f3e8ff !important;
}

.ai-doc-page .tree-badge.leaf-badge {
  color: #16a34a !important;
  background: #dcfce7 !important;
}

.ai-doc-page .tree-title {
  display: block !important;
  min-width: 0 !important;
  overflow: hidden !important;
  text-overflow: ellipsis !important;
  white-space: nowrap !important;
  line-height: 22px !important;
}

.ai-doc-page .tree-title.parent {
  color: #1e293b !important;
  font-size: 14px !important;
  font-weight: 800 !important;
}

.ai-doc-page .tree-title.leaf {
  color: #475569 !important;
  font-size: 14px !important;
  font-weight: 500 !important;
}

.ai-doc-page .tree-row.generate-row.active .tree-title.leaf {
  color: #2563eb !important;
  font-weight: 800 !important;
}

.ai-doc-page .tree-controls {
  display: flex !important;
  align-items: center !important;
  justify-content: flex-end !important;
  min-width: 0 !important;
  margin-left: 0 !important;
}

.ai-doc-page .tree-controls:empty {
  display: none !important;
}

.ai-doc-page .tree-controls.generate-controls {
  width: 132px !important;
  min-width: 132px !important;
  display: grid !important;
  grid-template-columns: 70px 56px !important;
  gap: 6px !important;
  align-items: center !important;
  justify-items: end !important;
}

.ai-doc-page .count-text {
  display: inline-flex !important;
  justify-content: flex-end !important;
  width: 70px !important;
  color: #64748b !important;
  font-size: 12px !important;
  font-weight: 700 !important;
  white-space: nowrap !important;
}

.ai-doc-page .tree-controls.generate-controls .el-tag {
  width: 54px !important;
  height: 22px !important;
  justify-content: center !important;
  padding: 0 5px !important;
  border-radius: 999px !important;
  font-size: 12px !important;
}

.ai-doc-page .section-panel {
  display: flex !important;
  flex-direction: column !important;
  padding: 18px 20px !important;
}

.ai-doc-page .compact-section-head {
  flex: 0 0 auto !important;
  display: flex !important;
  align-items: center !important;
  justify-content: space-between !important;
  gap: 12px !important;
  padding-bottom: 12px !important;
  margin-bottom: 12px !important;
  border-bottom: 1px solid #eef3fb !important;
}

.ai-doc-page .section-title-line {
  min-width: 0 !important;
  display: flex !important;
  align-items: center !important;
  gap: 8px !important;
  flex-wrap: nowrap !important;
}

.ai-doc-page .section-title-line h3 {
  max-width: 420px !important;
  margin: 0 !important;
  overflow: hidden !important;
  text-overflow: ellipsis !important;
  white-space: nowrap !important;
  color: #0f172a !important;
  font-size: 20px !important;
  line-height: 1.35 !important;
  font-weight: 900 !important;
}

.ai-doc-page .section-info-icon {
  flex: 0 0 auto !important;
  margin: 0 !important;
  color: #3b82f6 !important;
  cursor: help !important;
  font-size: 16px !important;
}

.ai-doc-page .inline-meta {
  display: inline-flex !important;
  align-items: center !important;
  height: 22px !important;
  padding: 0 8px !important;
  border-radius: 999px !important;
  background: #f1f5f9 !important;
  color: #64748b !important;
  font-size: 12px !important;
  font-weight: 800 !important;
  white-space: nowrap !important;
}

.ai-doc-page .inline-meta.done {
  color: #15803d !important;
  background: #dcfce7 !important;
}

.ai-doc-page .inline-meta.todo {
  color: #b45309 !important;
  background: #fef3c7 !important;
}

.ai-doc-page .section-actions {
  flex: 0 0 auto !important;
  display: flex !important;
  gap: 8px !important;
}

.ai-doc-page .section-actions .el-button {
  height: 32px !important;
  padding: 0 14px !important;
}

.ai-doc-page .editor-label-row {
  display: none !important;
}

.ai-doc-page .section-editor {
  flex: 1 1 auto !important;
  display: flex !important;
  min-height: 0 !important;
}

.ai-doc-page .section-editor .el-textarea__inner {
  height: 100% !important;
  min-height: 0 !important;
  padding: 16px 18px !important;
  border-color: #dbe4f0 !important;
  border-radius: 16px !important;
  background: #fff !important;
  color: #1f2937 !important;
  font-size: 15px !important;
  line-height: 1.9 !important;
  letter-spacing: .2px !important;
  resize: none !important;
}

.ai-doc-page .section-editor .el-textarea__inner:focus {
  border-color: #93c5fd !important;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, .08) !important;
}

@media (max-width: 1400px) {
  .ai-doc-page .result-grid {
    grid-template-columns: minmax(410px, .9fr) minmax(0, 1.45fr) !important;
  }

  .ai-doc-page .section-title-line h3 {
    max-width: 340px !important;
  }
}

@media (max-width: 1180px) {
  .ai-doc-page .result-grid {
    grid-template-columns: 1fr !important;
  }

  .ai-doc-page .section-title-line {
    flex-wrap: wrap !important;
  }
}
</style>


<!-- 本次补丁：文档大纲和填写资料弹窗分别使用独立滚动条，整体页面仍不滚动。 -->
<style>
/* 文档大纲：单独滚动，显示滚动条，不再隐藏。 */
.ai-doc-page .outline-panel {
  display: flex !important;
  flex-direction: column !important;
  min-height: 0 !important;
  overflow: hidden !important;
}

.ai-doc-page .outline-scroll {
  flex: 1 1 auto !important;
  min-height: 0 !important;
  height: auto !important;
  max-height: none !important;
  overflow-y: auto !important;
  overflow-x: hidden !important;
  padding-right: 8px !important;
  scrollbar-width: thin !important;
  scrollbar-color: #c8d3e3 transparent !important;
}

.ai-doc-page .outline-scroll::-webkit-scrollbar {
  width: 8px !important;
  height: 8px !important;
}

.ai-doc-page .outline-scroll::-webkit-scrollbar-track {
  background: transparent !important;
}

.ai-doc-page .outline-scroll::-webkit-scrollbar-thumb {
  border-radius: 999px !important;
  background: #c8d3e3 !important;
  border: 2px solid #fff !important;
}

.ai-doc-page .outline-scroll::-webkit-scrollbar-thumb:hover {
  background: #94a3b8 !important;
}

/* 填写资料弹窗：标题和底部按钮固定，中间内容独立滚动。 */
.doc-form-dialog.el-dialog,
.doc-form-dialog .el-dialog {
  max-height: 88vh !important;
  display: flex !important;
  flex-direction: column !important;
  overflow: hidden !important;
}

.doc-form-dialog.el-dialog .el-dialog__header,
.doc-form-dialog .el-dialog__header {
  flex: 0 0 auto !important;
}

.doc-form-dialog.el-dialog .el-dialog__body,
.doc-form-dialog .el-dialog__body {
  flex: 1 1 auto !important;
  min-height: 0 !important;
  overflow: hidden !important;
  padding: 8px 18px 0 !important;
}

.doc-form-dialog.el-dialog .dialog-scroll,
.doc-form-dialog .dialog-scroll {
  height: calc(88vh - 150px) !important;
  max-height: calc(88vh - 150px) !important;
  padding-right: 8px !important;
}

.doc-form-dialog.el-dialog .dialog-scroll .el-scrollbar__wrap,
.doc-form-dialog .dialog-scroll .el-scrollbar__wrap {
  overflow-x: hidden !important;
  overflow-y: auto !important;
}

.doc-form-dialog.el-dialog .dialog-scroll .el-scrollbar__view,
.doc-form-dialog .dialog-scroll .el-scrollbar__view {
  padding-right: 4px !important;
}

.doc-form-dialog.el-dialog .dialog-scroll .el-scrollbar__bar.is-vertical,
.doc-form-dialog .dialog-scroll .el-scrollbar__bar.is-vertical {
  opacity: 1 !important;
  right: 0 !important;
}

.doc-form-dialog.el-dialog .el-dialog__footer,
.doc-form-dialog .el-dialog__footer {
  flex: 0 0 auto !important;
  padding: 12px 18px 16px !important;
  border-top: 1px solid #edf2fb !important;
  background: #fff !important;
}

@media (max-height: 760px) {
  .doc-form-dialog.el-dialog .dialog-scroll,
  .doc-form-dialog .dialog-scroll {
    height: calc(88vh - 132px) !important;
    max-height: calc(88vh - 132px) !important;
  }
}
</style>

<!-- 本次补丁：强制文档大纲区域使用固定剩余高度，并显示独立竖向滚动条。 -->
<style>
/* 工作台整体固定在当前视口内，不能把页面本身撑出滚动条。 */
.ai-doc-page {
  height: calc(100vh - 76px) !important;
  min-height: 0 !important;
  overflow: hidden !important;
}

.ai-doc-page .doc-main {
  height: 100% !important;
  min-height: 0 !important;
  overflow: hidden !important;
  display: flex !important;
  flex-direction: column !important;
}

/* 让“大纲 + 正文”区域只占剩余空间，不能被大纲内容撑高。 */
.ai-doc-page .result-grid {
  flex: 1 1 0 !important;
  height: 0 !important;
  min-height: 0 !important;
  overflow: hidden !important;
  align-items: stretch !important;
}

.ai-doc-page .outline-panel,
.ai-doc-page .section-panel {
  height: 100% !important;
  min-height: 0 !important;
  overflow: hidden !important;
}

.ai-doc-page .outline-panel {
  display: flex !important;
  flex-direction: column !important;
}

.ai-doc-page .outline-panel .panel-title {
  flex: 0 0 auto !important;
}

/* 关键：大纲列表本身固定为剩余高度，内容超出时这里滚动。 */
.ai-doc-page .outline-scroll {
  flex: 1 1 0 !important;
  height: 0 !important;
  min-height: 0 !important;
  max-height: none !important;
  overflow-y: scroll !important;
  overflow-x: hidden !important;
  padding-right: 10px !important;
  scrollbar-width: thin !important;
  scrollbar-color: #b8c5d8 transparent !important;
}

.ai-doc-page .outline-scroll::-webkit-scrollbar {
  width: 8px !important;
  height: 8px !important;
}

.ai-doc-page .outline-scroll::-webkit-scrollbar-track {
  background: transparent !important;
}

.ai-doc-page .outline-scroll::-webkit-scrollbar-thumb {
  border-radius: 999px !important;
  background: #b8c5d8 !important;
  border: 2px solid #fff !important;
}

.ai-doc-page .outline-scroll::-webkit-scrollbar-thumb:hover {
  background: #8fa1b8 !important;
}

.ai-doc-page .outline-tree {
  padding-bottom: 14px !important;
}
</style>

<!-- AI文档生成工具条进度样式修复：进度百分比改为标题旁边的小徽标，底部进度条不再把 0% 挤到按钮下面。 -->
<style scoped>
.generate-dock-title {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  white-space: nowrap;
}

.generate-progress-pill {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 22px;
  min-width: 42px;
  padding: 0 9px;
  border-radius: 999px;
  background: #eff6ff;
  color: #2563eb;
  font-size: 12px;
  font-weight: 800;
  line-height: 1;
  box-shadow: inset 0 0 0 1px #bfdbfe;
}

.generate-dock .task-progress {
  left: 18px;
  right: 18px;
  bottom: 0;
  line-height: 0;
}

.generate-dock .task-progress :deep(.el-progress__text) {
  display: none !important;
}

.generate-dock .task-progress :deep(.el-progress-bar) {
  padding-right: 0 !important;
  margin-right: 0 !important;
}

.generate-dock-tools :deep(.el-button.is-disabled),
.generate-dock-tools :deep(.el-select.is-disabled .el-select__wrapper) {
  opacity: .72;
}
</style>


<style scoped>
.quality-check-wrap {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.quality-check-toolbar {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid #edf2f7;
}

.toolbar-actions {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.quality-check-title {
  font-size: 16px;
  font-weight: 800;
  color: #1f2937;
}

.quality-check-desc {
  margin-top: 4px;
  font-size: 13px;
  line-height: 1.7;
  color: #64748b;
}

.quality-stat-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

.quality-stat-card {
  min-width: 0;
  padding: 14px 16px;
  border: 1px solid #e6eef8;
  border-radius: 14px;
  background: linear-gradient(180deg, #f8fbff 0%, #ffffff 100%);
}

.quality-stat-card span {
  display: block;
  font-size: 12px;
  color: #64748b;
}

.quality-stat-card strong {
  display: block;
  margin-top: 6px;
  font-size: 24px;
  line-height: 1.2;
  color: #1d4ed8;
}

.quality-stat-card small {
  display: block;
  margin-top: 4px;
  color: #94a3b8;
  line-height: 1.4;
}

.quality-alert {
  margin: 0;
}

.quality-score-cell {
  display: grid;
  grid-template-columns: 1fr 36px;
  align-items: center;
  gap: 8px;
}

.quality-score-cell strong {
  font-size: 13px;
  color: #1f2937;
}

.quality-risk-tags {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 4px;
}

.quality-problem-text {
  display: flex;
  flex-direction: column;
  gap: 3px;
  line-height: 1.5;
}

.quality-problem-text strong {
  color: #1f2937;
}

.quality-problem-text span,
.muted-text {
  color: #94a3b8;
}

.review-textarea {
  margin-top: 12px;
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

.word-preset-panel {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.preset-tip {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 14px 16px;
  border: 1px solid #dbeafe;
  border-radius: 12px;
  background: #eff6ff;
  color: #1e3a8a;
}

.preset-tip strong {
  font-size: 15px;
}

.preset-tip span {
  color: #475569;
  line-height: 1.6;
}

.dialog-word-row--standalone {
  justify-content: space-between;
}

@media (max-width: 1200px) {
  .quality-stat-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>

<style scoped>
.doc-export-check-message { line-height: 1.7; }
.doc-export-check-title { margin: 0 0 8px; font-weight: 700; }
.doc-export-check-list { margin: 0; padding-left: 18px; }
.doc-export-check-tip { margin: 8px 0 0; color: #64748b; }
</style>

