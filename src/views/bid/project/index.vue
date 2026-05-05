<template>
  <div class="page">
    <div class="page-body project-page">
      <!-- 左侧：项目列表 -->
      <div class="card card--table project-left">
        <div class="list-head">
          <div class="list-head__left">
            <el-input
              v-model="keyword"
              class="filter-input"
              placeholder="按项目编号 / 项目名称 / 招标单位 / 投标单位自动查询"
              clearable
              @input="onKeywordInput"
            />
          </div>
          <div class="list-head__right">
            <el-button class="table-icon-btn" text :icon="Refresh" @click="loadProjects" />
            <el-button type="primary" :icon="Plus" @click="openCreateProject">新建项目</el-button>
          </div>
        </div>

        <el-table
          class="ui-table"
          :data="projects"
          border
          stripe
          highlight-current-row
          height="calc(100vh - 224px)"
          v-loading="projectLoading"
          @current-change="selectProject"
        >
          <el-table-column prop="projectCode" label="项目编号" min-width="150" show-overflow-tooltip />
          <el-table-column prop="projectName" label="项目名称" min-width="200" show-overflow-tooltip />
          <el-table-column prop="clientName" label="招标单位" min-width="160" show-overflow-tooltip />
          <el-table-column prop="bidderName" label="投标单位" min-width="160" show-overflow-tooltip />
          <el-table-column prop="budgetAmount" label="预算金额" width="120">
            <template #default="{ row }">
              {{ formatMoney(row.budgetAmount) }}
            </template>
          </el-table-column>
          <el-table-column prop="bidOpenTime" label="开标时间" width="170" />
          <el-table-column prop="status" label="状态" width="110">
            <template #default="{ row }">
              <el-tag :type="projectStatusMap[row.status]?.type || 'info'" effect="light">
                {{ projectStatusMap[row.status]?.label || row.status || '-' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="ownerFullName" label="负责人" width="110" show-overflow-tooltip>
            <template #default="{ row }">
              {{ row.ownerFullName || row.creatorFullName || '-' }}
            </template>
          </el-table-column>
          <el-table-column prop="createTime" label="创建时间" width="170" />
          <el-table-column label="操作" width="240" fixed="right">
            <template #default="{ row }">
              <div class="table-actions">
                <el-button link type="primary" @click.stop="selectProject(row)">详情</el-button>
                <el-button link type="primary" @click.stop="openEditProject(row)">编辑</el-button>
                <el-button link type="warning" :disabled="!canArchiveProject(row)" @click.stop="archiveProject(row)">归档</el-button>
                <el-button link type="danger" :disabled="!canDeleteProject(row)" @click.stop="deleteProjectRow(row)">删除</el-button>
              </div>
            </template>
          </el-table-column>
        </el-table>

        <PageFooterPager
          v-model:page="projectPager.page"
          v-model:size="projectPager.size"
          :total="projectPager.total"
          @change="loadProjects"
        />
      </div>

      <!-- 右侧：项目详情 / 资料 / 知识库 / 生成记录 -->
      <div class="card card--table project-right">
        <template v-if="selectedProject">
          <div class="project-header">
            <div>
              <div class="project-title">
                {{ selectedProject.projectName }}
              </div>
              <div class="project-sub">
                {{ selectedProject.projectCode }}
                <span v-if="selectedProject.enterpriseName"> · {{ selectedProject.enterpriseName }}</span>
                <span v-if="selectedProject.clientName"> · 招标单位：{{ selectedProject.clientName }}</span>
              </div>
            </div>
            <div class="project-header__actions">
              <el-button :icon="Edit" :disabled="!canEditProject(selectedProject)" @click="openEditProject(selectedProject)">编辑项目</el-button>
              <el-button type="success" :icon="MagicStick" :disabled="!canGenerateProject(selectedProject)" @click="goGenerateWorkbench(selectedProject)">AI生成</el-button>
              <el-button type="primary" :icon="Upload" :disabled="!canUploadMaterial(selectedProject)" @click="openUploadMaterial">上传资料</el-button>
            </div>
          </div>

          <div class="project-flow">
            <div
              v-for="(step, index) in flowSteps"
              :key="step.key"
              class="flow-item"
              :class="{
                active: index === currentFlowIndex,
                done: index < currentFlowIndex,
                disabled: selectedProject.status === 'CANCELLED'
              }"
            >
              <div class="flow-dot">{{ index + 1 }}</div>
              <div class="flow-text">
                <strong>{{ step.title }}</strong>
                <span>{{ step.desc }}</span>
              </div>
            </div>
          </div>

          <el-alert
            v-if="projectFlowTip"
            class="flow-tip"
            :title="projectFlowTip"
            :type="projectFlowTipType"
            show-icon
            :closable="false"
          />

          <div class="generate-check-card" v-loading="projectGenerateCheckLoading">
            <div class="generate-check-head">
              <div>
                <div class="section-title">生成前检查</div>
                <div class="section-desc">
                  {{ projectGenerateCheck ? `准备度 ${projectGenerateCheck.percent || 0}% · ${projectGenerateCheck.passedCount || 0}/${projectGenerateCheck.totalCount || 0} 项通过` : '正在检查当前项目生成条件' }}
                </div>
              </div>
              <div class="generate-check-actions">
                <el-progress
                  :percentage="projectGenerateCheck?.percent || 0"
                  :status="readinessProgressStatus(projectGenerateCheck)"
                  style="width: 160px"
                />
                <el-button :icon="Refresh" @click="loadProjectGenerateCheck">重新检查</el-button>
              </div>
            </div>

            <div v-if="projectGenerateCheck?.items?.length" class="generate-check-grid">
              <div
                v-for="item in projectGenerateCheck.items"
                :key="item.key"
                class="generate-check-item"
                :class="`is-${item.level || 'info'}`"
              >
                <div class="check-main">
                  <strong>{{ item.name }}</strong>
                  <span>{{ item.message }}</span>
                </div>
                <el-tag :type="readinessTagType(item)" effect="light">
                  {{ item.passed ? '通过' : '待处理' }}
                </el-tag>
              </div>
            </div>

            <el-alert
              v-if="projectGenerateCheck?.suggestions?.length"
              class="check-alert"
              type="warning"
              show-icon
              :closable="false"
            >
              <template #title>
                {{ projectGenerateCheck.suggestions.join('；') }}
              </template>
            </el-alert>
          </div>

          <el-tabs v-model="activeTab" class="project-tabs">
            <el-tab-pane label="基础信息" name="info">
              <el-descriptions :column="2" border>
                <el-descriptions-item label="项目编号">
                  {{ selectedProject.projectCode || '-' }}
                </el-descriptions-item>
                <el-descriptions-item label="状态">
                  <el-tag :type="projectStatusMap[selectedProject.status]?.type || 'info'" effect="light">
                    {{ projectStatusMap[selectedProject.status]?.label || selectedProject.status || '-' }}
                  </el-tag>
                </el-descriptions-item>
                <el-descriptions-item label="项目名称">
                  {{ selectedProject.projectName || '-' }}
                </el-descriptions-item>
                <el-descriptions-item label="项目类型">
                  {{ projectTypeLabel(selectedProject.projectType) }}
                </el-descriptions-item>
                <el-descriptions-item label="标书模板">
                  <div v-if="selectedProject.bidTemplateId">
                    <el-tag :type="bidTemplateTypeTag(selectedProject.bidTemplateType)" effect="light">
                      {{ bidTemplateTypeLabel(selectedProject.bidTemplateType) }}
                    </el-tag>
                    <span class="template-name">{{ selectedProject.bidTemplateName || `模板ID：${selectedProject.bidTemplateId}` }}</span>
                    <el-tag
                      v-if="Number(selectedProject.bidTemplateFileExists) !== 1"
                      type="danger"
                      effect="light"
                      size="small"
                    >
                      文件丢失
                    </el-tag>
                  </div>
                  <span v-else>未指定，导出时使用默认模板</span>
                </el-descriptions-item>
                <el-descriptions-item label="所属企业">
                  {{ selectedProject.enterpriseName || '-' }}
                </el-descriptions-item>
                <el-descriptions-item label="负责人">
                  {{ selectedProject.ownerFullName || selectedProject.creatorFullName || '-' }}
                </el-descriptions-item>
                <el-descriptions-item label="招标单位">
                  {{ selectedProject.clientName || '-' }}
                </el-descriptions-item>
                <el-descriptions-item label="投标单位">
                  {{ selectedProject.bidderName || '-' }}
                </el-descriptions-item>
                <el-descriptions-item label="预算金额">
                  {{ formatMoney(selectedProject.budgetAmount) }}
                </el-descriptions-item>
                <el-descriptions-item label="工期天数">
                  {{ selectedProject.periodDays || '-' }}
                </el-descriptions-item>
                <el-descriptions-item label="投标截止时间">
                  {{ selectedProject.tenderDeadline || '-' }}
                </el-descriptions-item>
                <el-descriptions-item label="开标时间">
                  {{ selectedProject.bidOpenTime || '-' }}
                </el-descriptions-item>
                <el-descriptions-item label="资料数量">
                  {{ selectedProject.materialCount || 0 }}
                </el-descriptions-item>
                <el-descriptions-item label="绑定知识库">
                  {{ selectedProject.knowledgeCount || 0 }} 个
                </el-descriptions-item>
                <el-descriptions-item label="备注" :span="2">
                  {{ selectedProject.remark || '-' }}
                </el-descriptions-item>
              </el-descriptions>

              <el-alert
                title="项目资料和知识库绑定完成后，可点击右上角“AI生成”进入生成工作台。当前没有向量检索时，生成时建议先不引用知识库。"
                type="success"
                show-icon
                :closable="false"
                style="margin-top: 14px"
              />
            </el-tab-pane>

            <el-tab-pane label="项目资料" name="materials">
              <div class="section-head">
                <div class="section-title">项目资料</div>
                <el-button type="primary" :icon="Upload" :disabled="!canUploadMaterial(selectedProject)" @click="openUploadMaterial">上传资料</el-button>
              </div>

              <el-table
                class="ui-table"
                :data="materials"
                border
                stripe
                height="calc(100vh - 352px)"
                v-loading="materialLoading"
              >
                <el-table-column prop="materialType" label="资料分类" width="120">
                  <template #default="{ row }">
                    {{ materialTypeLabel(row.materialType) }}
                  </template>
                </el-table-column>
                <el-table-column prop="fileName" label="文件名" min-width="230" show-overflow-tooltip>
                  <template #default="{ row }">
                    {{ row.fileName || row.originalName || '-' }}
                  </template>
                </el-table-column>
                <el-table-column prop="fileExt" label="扩展名" width="90" />
                <el-table-column prop="fileSize" label="大小" width="110">
                  <template #default="{ row }">
                    {{ formatFileSize(row.fileSize) }}
                  </template>
                </el-table-column>
                <el-table-column prop="uploadFullName" label="上传人" width="110" show-overflow-tooltip />
                <el-table-column prop="createTime" label="上传时间" width="170" />
                <el-table-column label="操作" width="230" fixed="right">
                  <template #default="{ row }">
                    <div class="table-actions">
                      <el-button v-if="row.fileUrl" link type="primary" @click="openFile(row)">查看</el-button>
                      <el-button link type="success" @click="openAddToKnowledge(row)">加入知识库</el-button>
                      <el-button link type="danger" :disabled="!canUploadMaterial(selectedProject)" @click="deleteMaterialRow(row)">删除</el-button>
                    </div>
                  </template>
                </el-table-column>
              </el-table>
            </el-tab-pane>

            <el-tab-pane label="绑定知识库" name="knowledge">
              <div class="section-head">
                <div>
                  <div class="section-title">绑定知识库</div>
                  <div class="section-desc">
                    后续 AI 章节生成时，会优先从这里绑定的知识库中检索资料。
                  </div>
                </div>
                <el-button type="primary" :icon="Edit" :disabled="!canEditProject(selectedProject)" @click="openEditProject(selectedProject)">
                  调整绑定
                </el-button>
              </div>

              <el-table
                class="ui-table"
                :data="selectedKnowledgeBases"
                border
                stripe
                height="calc(100vh - 352px)"
              >
                <el-table-column prop="kbName" label="知识库名称" min-width="220" show-overflow-tooltip />
                <el-table-column prop="enterpriseName" label="所属企业" min-width="160" show-overflow-tooltip />
                <el-table-column prop="kbType" label="类型" width="120">
                  <template #default="{ row }">
                    {{ kbTypeLabel(row.kbType) }}
                  </template>
                </el-table-column>
                <el-table-column prop="fileCount" label="文件数" width="90" />
                <el-table-column prop="status" label="状态" width="90">
                  <template #default="{ row }">
                    <el-tag :type="Number(row.status) === 1 ? 'success' : 'info'" effect="light">
                      {{ Number(row.status) === 1 ? '正常' : '停用' }}
                    </el-tag>
                  </template>
                </el-table-column>
                <el-table-column prop="createTime" label="创建时间" width="170" />
              </el-table>
            </el-tab-pane>

            <el-tab-pane label="生成记录" name="generateRecords">
              <div class="section-head">
                <div>
                  <div class="section-title">生成记录</div>
                  <div class="section-desc">
                    当前项目下的技术标、商务标、完整标书生成历史。
                  </div>
                </div>
                <div class="section-actions">
                  <el-button :icon="Refresh" @click="loadGenerateRecords">刷新</el-button>
                  <el-button type="success" :icon="MagicStick" :disabled="!canGenerateProject(selectedProject)" @click="goGenerateWorkbench(selectedProject)">
                    继续生成
                  </el-button>
                </div>
              </div>

              <el-table
                class="ui-table"
                :data="generateRecords"
                border
                stripe
                height="calc(100vh - 352px)"
                v-loading="generateRecordLoading"
                empty-text="当前项目暂无生成记录，请点击右上角“AI生成”"
              >
                <el-table-column label="生成类型" width="110">
                  <template #default="{ row }">
                    <el-tag :type="generateTypeTag(row.bizType)" effect="light">
                      {{ generateTypeLabel(row.bizType) }}
                    </el-tag>
                  </template>
                </el-table-column>
                <el-table-column prop="title" label="结果标题" min-width="230" show-overflow-tooltip />
                <el-table-column prop="auditStatus" label="状态" width="100">
                  <template #default="{ row }">
                    <el-tag :type="resultStatusTag(row.auditStatus)" effect="light">
                      {{ resultStatusLabel(row.auditStatus) }}
                    </el-tag>
                  </template>
                </el-table-column>
                <el-table-column prop="createTime" label="生成时间" width="170" />
                <el-table-column label="操作" width="330" fixed="right">
                  <template #default="{ row }">
                    <div class="table-actions">
                      <el-button link type="primary" :icon="View" @click="openGenerateResult(row)">查看</el-button>
                      <el-button link type="primary" :icon="CopyDocument" @click="copyGenerateMarkdown(row)">复制</el-button>
                      <el-button link type="success" :icon="Download" @click="exportGenerateWord(row)">导出Word</el-button>
                      <el-button link type="success" :icon="Download" @click="exportGenerateMarkdown(row)">导出Markdown</el-button>
                    </div>
                  </template>
                </el-table-column>
              </el-table>
            </el-tab-pane>
          </el-tabs>
        </template>

        <el-empty v-else description="请先新建或选择一个标书项目">
          <el-button type="primary" :icon="Plus" @click="openCreateProject">新建项目</el-button>
        </el-empty>
      </div>
    </div>

    <!-- 新建/编辑项目 -->
    <el-dialog
      v-model="projectDialog.visible"
      :title="projectDialog.isEdit ? '编辑标书项目' : '新建标书项目'"
      width="840px"
      destroy-on-close
    >
      <el-form ref="projectFormRef" :model="projectForm" :rules="projectRules" label-width="130px">
        <el-form-item v-if="canManagePlatform" label="所属企业" prop="enterpriseId">
          <el-select
            v-model="projectForm.enterpriseId"
            placeholder="请选择企业"
            filterable
            clearable
            style="width: 100%"
            @change="onProjectEnterpriseChange"
          >
            <el-option
              v-for="item in enterprises"
              :key="item.id"
              :label="item.enterpriseName"
              :value="item.id"
            />
          </el-select>
        </el-form-item>

        <el-form-item label="项目名称" prop="projectName">
          <el-input v-model="projectForm.projectName" placeholder="请输入项目名称" />
        </el-form-item>

        <el-form-item label="项目类型">
          <el-select v-model="projectForm.projectType" placeholder="请选择项目类型" clearable style="width: 100%">
            <el-option label="工程施工" value="CONSTRUCTION" />
            <el-option label="货物采购" value="GOODS" />
            <el-option label="服务采购" value="SERVICE" />
            <el-option label="信息化项目" value="IT" />
            <el-option label="其他" value="OTHER" />
          </el-select>
        </el-form-item>

        <el-form-item label="招标单位">
          <el-input v-model="projectForm.clientName" placeholder="请输入招标单位" />
        </el-form-item>

        <el-form-item label="投标单位">
          <el-input v-model="projectForm.bidderName" placeholder="默认可填写当前企业名称" />
        </el-form-item>

        <el-form-item label="预算金额">
          <el-input-number
            v-model="projectForm.budgetAmount"
            :min="0"
            :precision="2"
            :step="1000"
            style="width: 100%"
            placeholder="请输入预算金额"
          />
        </el-form-item>

        <el-form-item label="投标截止时间">
          <el-date-picker
            v-model="projectForm.tenderDeadline"
            type="datetime"
            value-format="YYYY-MM-DDTHH:mm:ss"
            placeholder="请选择投标截止时间"
            style="width: 100%"
          />
        </el-form-item>

        <el-form-item label="开标时间">
          <el-date-picker
            v-model="projectForm.bidOpenTime"
            type="datetime"
            value-format="YYYY-MM-DDTHH:mm:ss"
            placeholder="请选择开标时间"
            style="width: 100%"
          />
        </el-form-item>

        <el-form-item label="工期天数">
          <el-input-number
            v-model="projectForm.periodDays"
            :min="0"
            :step="1"
            style="width: 100%"
            placeholder="请输入工期天数"
          />
        </el-form-item>

        <el-form-item label="标书模板">
          <el-select
            v-model="projectForm.bidTemplateId"
            filterable
            clearable
            placeholder="请选择标书模板；不选则导出时自动使用默认模板"
            style="width: 100%"
          >
            <el-option
              v-for="item in bidTemplateOptions"
              :key="item.id"
              :label="bidTemplateOptionLabel(item)"
              :value="item.id"
            >
              <div class="template-option">
                <span>{{ item.templateName }}</span>
                <span class="template-option__meta">
                  {{ bidTemplateTypeLabel(item.templateType) }} · {{ bidTemplateScopeLabel(item.templateScope) }}
                  <template v-if="Number(item.defaultFlag) === 1"> · 默认</template>
                </span>
              </div>
            </el-option>
          </el-select>
          <div class="form-tip">
            当前仅显示启用且 Word 文件存在的模板；不选择时导出 Word 会按企业默认模板、平台默认模板自动匹配。
          </div>
        </el-form-item>

        <el-form-item label="绑定知识库">
          <el-select
            v-model="projectForm.knowledgeIds"
            multiple
            filterable
            clearable
            placeholder="请选择知识库，可多选"
            style="width: 100%"
          >
            <el-option
              v-for="item in knowledgeOptions"
              :key="item.id"
              :label="item.kbName"
              :value="item.id"
            />
          </el-select>
        </el-form-item>

        <el-form-item v-if="projectDialog.isEdit" label="项目状态">
          <el-select v-model="projectForm.status" style="width: 100%">
            <el-option label="草稿" value="DRAFT" />
            <el-option label="资料已准备" value="MATERIAL_READY" />
            <el-option label="生成中" value="GENERATING" />
            <el-option label="已生成" value="GENERATED" />
            <el-option label="已导出" value="EXPORTED" />
            <el-option label="已归档" value="ARCHIVED" />
            <el-option label="已取消" value="CANCELLED" />
            <el-option label="生成失败" value="FAILED" />
          </el-select>
        </el-form-item>

        <el-form-item label="备注">
          <el-input v-model="projectForm.remark" type="textarea" :rows="4" placeholder="请输入备注" />
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="projectDialog.visible = false">取消</el-button>
        <el-button type="primary" @click="submitProject">保存</el-button>
      </template>
    </el-dialog>

    <!-- 上传项目资料 -->
    <el-dialog
      v-model="materialDialog.visible"
      :title="`上传项目资料：${selectedProject?.projectName || ''}`"
      width="720px"
      destroy-on-close
    >
      <el-form label-width="120px">
        <el-form-item label="资料分类">
          <el-select v-model="materialForm.materialType" style="width: 100%">
            <el-option label="招标文件" value="TENDER_DOC" />
            <el-option label="商务资料" value="BUSINESS_DOC" />
            <el-option label="技术资料" value="TECH_DOC" />
            <el-option label="报价资料" value="QUOTE_DOC" />
            <el-option label="图纸/CAD" value="DRAWING" />
            <el-option label="合同资料" value="CONTRACT_DOC" />
            <el-option label="其他资料" value="OTHER" />
          </el-select>
        </el-form-item>

        <el-form-item label="选择文件">
          <FileUploadBox
            v-if="selectedProject"
            module-type="project_material"
            :biz-id="selectedProject.id"
            :private-flag="true"
            @success="onMaterialUploaded"
          />
        </el-form-item>
      </el-form>

      <div class="form-tip">
        注意：一个项目只能存在一个“招标文件”，其他资料可以上传多个。
      </div>
    </el-dialog>

    <!-- 加入知识库 -->
    <el-dialog
      v-model="knowledgeDialog.visible"
      title="加入知识库"
      width="560px"
      destroy-on-close
    >
      <el-form label-width="110px">
        <el-form-item label="项目资料">
          <el-input :model-value="knowledgeDialog.material?.fileName || knowledgeDialog.material?.originalName || ''" disabled />
        </el-form-item>

        <el-form-item label="选择知识库">
          <el-select
            v-model="knowledgeDialog.knowledgeBaseId"
            placeholder="请选择知识库"
            filterable
            clearable
            style="width: 100%"
          >
            <el-option
              v-for="item in knowledgeOptions"
              :key="item.id"
              :label="item.kbName"
              :value="item.id"
            />
          </el-select>
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="knowledgeDialog.visible = false">取消</el-button>
        <el-button type="primary" @click="submitAddToKnowledge">确定</el-button>
      </template>
    </el-dialog>

    <!-- 查看生成结果 -->
    <el-dialog
      v-model="generateResultDialog.visible"
      :title="generateResultDialog.result?.title || '生成结果'"
      width="980px"
      destroy-on-close
    >
      <template v-if="generateResultDialog.result">
        <div class="result-dialog-head">
          <div>
            <el-tag :type="generateTypeTag(generateResultDialog.result.bizType)" effect="light">
              {{ generateTypeLabel(generateResultDialog.result.bizType) }}
            </el-tag>
            <span class="result-dialog-time">{{ generateResultDialog.result.createTime || '-' }}</span>
          </div>
          <div class="result-dialog-actions">
            <el-button :icon="CopyDocument" @click="copyGenerateMarkdown(generateResultDialog.result)">
              复制Markdown
            </el-button>
            <el-button :icon="Download" :loading="exportingWord" @click="exportGenerateWord(generateResultDialog.result)">
              导出Word
            </el-button>
            <el-button :icon="Download" :loading="exportingMarkdown" @click="exportGenerateMarkdown(generateResultDialog.result)">
              导出Markdown
            </el-button>
            <el-button type="primary" plain @click="goFullResultPage(generateResultDialog.result)">
              完整页面
            </el-button>
          </div>
        </div>

        <el-tabs v-model="generateResultDialog.activeTab">
          <el-tab-pane label="预览" name="preview">
            <div
              v-if="generateResultDialog.result.contentHtml"
              class="markdown-box result-preview"
              v-html="generateResultDialog.result.contentHtml"
            ></div>
            <div v-else class="markdown-box result-preview">
              {{ generateResultDialog.result.contentMarkdown || '暂无内容' }}
            </div>
          </el-tab-pane>
          <el-tab-pane label="Markdown源码" name="markdown">
            <el-input
              :model-value="generateResultDialog.result.contentMarkdown || ''"
              type="textarea"
              :rows="22"
              readonly
              resize="none"
            />
          </el-tab-pane>
        </el-tabs>
      </template>
    </el-dialog>

    <WordExportTemplateDialog
      v-model="wordExportDialog.visible"
      :result="wordExportDialog.result"
      @success="onWordExportSuccess"
    />
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { CopyDocument, Download, Edit, MagicStick, Plus, Refresh, Upload, View } from '@element-plus/icons-vue'
import { useAuthStore } from '@/stores/auth'
import { listEnterprises } from '@/api/enterprise'
import { listKnowledgeBases } from '@/api/knowledge'
import { listBidTemplates } from '@/api/bidTemplate'
import {
  downloadExportFile,
  exportMarkdown,
  getAiGenerateResult,
  pageAiGenerateResults
} from '@/api/ai'
import {
  addProjectMaterialToKnowledge,
  createBidProject,
  createProjectMaterial,
  deleteBidProject,
  deleteProjectMaterial,
  getBidProject,
  getBidProjectGenerateCheck,
  pageBidProjects,
  pageProjectMaterials,
  updateBidProject,
  updateBidProjectStatus
} from '@/api/bidProject'
import FileUploadBox from '@/components/FileUploadBox.vue'
import PageFooterPager from '@/components/PageFooterPager.vue'
import WordExportTemplateDialog from '@/components/WordExportTemplateDialog.vue'

const auth = useAuthStore()
const router = useRouter()
const route = useRoute()

const ROLE_SUPER_ADMIN = 'SUPERADMIN'
const ROLE_PLATFORM_ADMIN = 'PLATFORMADMIN'

const projectLoading = ref(false)
const materialLoading = ref(false)
const generateRecordLoading = ref(false)
const exportingWord = ref(false)
const exportingMarkdown = ref(false)
const projects = ref([])
const materials = ref([])
const generateRecords = ref([])
const enterprises = ref([])
const knowledgeOptions = ref([])
const bidTemplateOptions = ref([])
const keyword = ref('')
const selectedProject = ref(null)
const projectGenerateCheck = ref(null)
const projectGenerateCheckLoading = ref(false)
const activeTab = ref('info')
const projectFormRef = ref()
const timer = ref(null)

const projectPager = reactive({
  page: 1,
  size: 10,
  total: 0
})

const projectDialog = reactive({
  visible: false,
  isEdit: false,
  id: null
})

const projectForm = reactive({
  enterpriseId: '',
  projectName: '',
  projectType: '',
  clientName: '',
  bidderName: '',
  budgetAmount: null,
  tenderDeadline: '',
  bidOpenTime: '',
  periodDays: null,
  ownerUserId: null,
  bidTemplateId: null,
  knowledgeIds: [],
  status: 'DRAFT',
  remark: ''
})

const materialDialog = reactive({
  visible: false
})

const materialForm = reactive({
  materialType: 'TENDER_DOC'
})

const knowledgeDialog = reactive({
  visible: false,
  material: null,
  knowledgeBaseId: ''
})

const generateResultDialog = reactive({
  visible: false,
  activeTab: 'preview',
  result: null
})

const wordExportDialog = reactive({
  visible: false,
  result: null
})

const currentRoleCodes = computed(() => normalizeRoleList(auth.user?.roles || auth.user?.roleCodes || []))
const canManagePlatform = computed(() => {
  return currentRoleCodes.value.includes(ROLE_SUPER_ADMIN) || currentRoleCodes.value.includes(ROLE_PLATFORM_ADMIN)
})

const selectedKnowledgeBases = computed(() => {
  const ids = selectedProject.value?.knowledgeIdList || []
  return knowledgeOptions.value.filter((item) => ids.map(String).includes(String(item.id)))
})


const flowSteps = [
  { key: 'info', title: '项目信息', desc: '完善基础信息' },
  { key: 'material', title: '资料准备', desc: '上传项目资料' },
  { key: 'generate', title: 'AI生成', desc: '生成标书内容' },
  { key: 'export', title: '文件导出', desc: '导出Word/Markdown' },
  { key: 'archive', title: '项目归档', desc: '完成归档' }
]

const currentFlowIndex = computed(() => resolveFlowIndex(selectedProject.value?.status))

const projectFlowTip = computed(() => {
  const status = selectedProject.value?.status
  const map = {
    DRAFT: '当前项目处于草稿状态。建议先上传招标文件或项目资料，再进行 AI 生成。',
    MATERIAL_READY: '项目资料已准备，可以进入 AI 生成工作台生成技术标、商务标或完整标书。',
    GENERATING: '项目正在生成中，请等待生成完成。生成中不允许编辑、删除或归档。',
    GENERATED: '项目已生成标书内容，可以在“生成记录”中查看并导出文件。',
    EXPORTED: '项目已导出文件，可以在“导出记录”或“文件资源”中下载和管理文件。',
    ARCHIVED: '项目已归档，当前为只读状态。',
    FAILED: '项目生成失败，可以重新进入 AI 生成工作台再次生成。',
    CANCELLED: '项目已取消，建议仅保留查看。'
  }
  return map[status] || ''
})

const projectFlowTipType = computed(() => {
  const status = selectedProject.value?.status
  if (status === 'FAILED' || status === 'CANCELLED') return 'error'
  if (status === 'GENERATING') return 'warning'
  if (status === 'ARCHIVED' || status === 'EXPORTED' || status === 'GENERATED') return 'success'
  return 'info'
})

const projectRules = computed(() => {
  const rules = {
    projectName: [{ required: true, message: '请输入项目名称', trigger: 'blur' }]
  }

  if (canManagePlatform.value) {
    rules.enterpriseId = [{ required: true, message: '请选择所属企业', trigger: 'change' }]
  }

  return rules
})

const projectStatusMap = {
  DRAFT: { label: '草稿', type: 'info' },
  MATERIAL_READY: { label: '资料已准备', type: 'success' },
  GENERATING: { label: '生成中', type: 'warning' },
  GENERATED: { label: '已生成', type: 'success' },
  EXPORTED: { label: '已导出', type: 'success' },
  ARCHIVED: { label: '已归档', type: 'info' },
  CANCELLED: { label: '已取消', type: 'danger' },
  FAILED: { label: '生成失败', type: 'danger' }
}

onMounted(async () => {
  await loadEnterprises()
  await loadKnowledgeOptions(auth.user?.enterpriseId || undefined)
  await loadBidTemplateOptions(auth.user?.enterpriseId || undefined)

  const queryProjectId = route.query.projectId ? Number(route.query.projectId) : null
  if (route.query.tab) {
    activeTab.value = String(route.query.tab)
  }

  await loadProjects(queryProjectId || undefined)
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

function resolveFlowIndex(status) {
  const map = {
    DRAFT: 0,
    MATERIAL_READY: 1,
    GENERATING: 2,
    GENERATED: 2,
    FAILED: 2,
    EXPORTED: 3,
    ARCHIVED: 4,
    CANCELLED: 0
  }
  return map[status] ?? 0
}

function canEditProject(row) {
  if (!row) return false
  return !['GENERATING', 'ARCHIVED', 'CANCELLED'].includes(String(row.status || '').toUpperCase())
}

function canUploadMaterial(row) {
  if (!row) return false
  return !['GENERATING', 'ARCHIVED', 'CANCELLED'].includes(String(row.status || '').toUpperCase())
}

function canGenerateProject(row) {
  if (!row) return false
  return !['GENERATING', 'ARCHIVED', 'CANCELLED'].includes(String(row.status || '').toUpperCase())
}

function canArchiveProject(row) {
  if (!row) return false
  return ['GENERATED', 'EXPORTED'].includes(String(row.status || '').toUpperCase())
}

function canDeleteProject(row) {
  if (!row) return false
  return !['GENERATING', 'ARCHIVED'].includes(String(row.status || '').toUpperCase())
}

function onKeywordInput() {
  clearTimeout(timer.value)
  timer.value = setTimeout(() => {
    projectPager.page = 1
    loadProjects()
  }, 300)
}

async function loadEnterprises() {
  if (!canManagePlatform.value) {
    enterprises.value = []
    return
  }

  try {
    enterprises.value = await listEnterprises({ status: 1 })
  } catch (e) {
    enterprises.value = []
  }
}

async function loadKnowledgeOptions(enterpriseId) {
  try {
    const params = { status: 1 }
    if (enterpriseId) {
      params.enterpriseId = enterpriseId
    }
    knowledgeOptions.value = await listKnowledgeBases(params)
  } catch (e) {
    knowledgeOptions.value = []
  }
}

async function loadBidTemplateOptions(enterpriseId) {
  try {
    const [platformTemplates, enterpriseTemplates] = await Promise.all([
      listBidTemplates({
        status: 1,
        templateScope: 'PLATFORM',
        pageNum: 1,
        pageSize: 200
      }),
      enterpriseId
        ? listBidTemplates({
          status: 1,
          templateScope: 'ENTERPRISE',
          enterpriseId,
          pageNum: 1,
          pageSize: 200
        })
        : Promise.resolve([])
    ])

    const merged = [...(enterpriseTemplates || []), ...(platformTemplates || [])]
    bidTemplateOptions.value = merged.filter((item) => Number(item.fileExists) === 1)
  } catch (e) {
    bidTemplateOptions.value = []
  }
}

async function loadProjects(selectId) {
  projectLoading.value = true
  try {
    const res = await pageBidProjects({
      current: projectPager.page,
      size: projectPager.size,
      pageNum: projectPager.page,
      pageSize: projectPager.size,
      keyword: keyword.value || undefined
    })

    projects.value = res?.records || []
    projectPager.total = Number(res?.total || 0)

    const next = selectId
      ? projects.value.find((item) => String(item.id) === String(selectId))
      : selectedProject.value
        ? projects.value.find((item) => String(item.id) === String(selectedProject.value.id))
        : projects.value[0]

    if (next) {
      await selectProject(next)
    } else if (selectId) {
      try {
        const detail = await getBidProject(selectId)
        await selectProject(detail)
      } catch (e) {
        selectedProject.value = null
        materials.value = []
        generateRecords.value = []
      }
    } else {
      selectedProject.value = null
      materials.value = []
      generateRecords.value = []
    }
  } finally {
    projectLoading.value = false
  }
}

async function selectProject(row) {
  if (!row) return

  selectedProject.value = await getBidProject(row.id)
  activeTab.value = route.query.tab ? String(route.query.tab) : 'info'

  if (selectedProject.value?.enterpriseId) {
    await loadKnowledgeOptions(selectedProject.value.enterpriseId)
    await loadBidTemplateOptions(selectedProject.value.enterpriseId)
  } else {
    await loadKnowledgeOptions()
    await loadBidTemplateOptions()
  }

  await loadMaterials()
  await loadGenerateRecords()
  await loadProjectGenerateCheck()
}

async function loadProjectGenerateCheck() {
  if (!selectedProject.value?.id) {
    projectGenerateCheck.value = null
    return
  }

  projectGenerateCheckLoading.value = true
  try {
    projectGenerateCheck.value = await getBidProjectGenerateCheck(selectedProject.value.id)
  } catch (e) {
    projectGenerateCheck.value = null
  } finally {
    projectGenerateCheckLoading.value = false
  }
}

function readinessTagType(item) {
  if (item?.passed) return 'success'
  if (item?.level === 'error') return 'danger'
  if (item?.level === 'warning') return 'warning'
  return 'info'
}

function readinessProgressStatus(check) {
  if (!check) return undefined
  if (check.canGenerate === false) return 'exception'
  if ((check.percent || 0) >= 85) return 'success'
  if ((check.percent || 0) < 50) return 'warning'
  return undefined
}

async function loadMaterials() {
  if (!selectedProject.value?.id) return

  materialLoading.value = true
  try {
    const res = await pageProjectMaterials({
      current: 1,
      size: 200,
      pageNum: 1,
      pageSize: 200,
      projectId: selectedProject.value.id
    })

    materials.value = res?.records || []
  } finally {
    materialLoading.value = false
  }
}

async function loadGenerateRecords() {
  if (!selectedProject.value?.id) {
    generateRecords.value = []
    return
  }

  generateRecordLoading.value = true
  try {
    const res = await pageAiGenerateResults({
      current: 1,
      size: 200,
      pageNum: 1,
      pageSize: 200,
      bizId: selectedProject.value.id,
      bizTypes: 'bid,bid_tech,bid_business,bid_full'
    })

    generateRecords.value = res?.records || []
  } finally {
    generateRecordLoading.value = false
  }
}

async function openGenerateResult(row) {
  if (!row?.id) {
    ElMessage.warning('生成结果ID为空')
    return
  }

  const detail = await getAiGenerateResult(row.id)
  generateResultDialog.result = detail
  generateResultDialog.activeTab = 'preview'
  generateResultDialog.visible = true
}

async function copyGenerateMarkdown(row) {
  let markdown = row?.contentMarkdown
  if (!markdown && row?.id) {
    const detail = await getAiGenerateResult(row.id)
    markdown = detail?.contentMarkdown
  }

  if (!markdown) {
    ElMessage.warning('暂无可复制内容')
    return
  }

  await navigator.clipboard.writeText(markdown)
  ElMessage.success('已复制Markdown内容')
}

function exportGenerateWord(row) {
  if (!row?.id) {
    ElMessage.warning('生成结果ID为空')
    return
  }

  wordExportDialog.result = {
    ...row,
    projectName: row.projectName || selectedProject.value?.projectName,
    projectCode: row.projectCode || selectedProject.value?.projectCode,
    bizId: row.bizId || selectedProject.value?.id
  }
  wordExportDialog.visible = true
}

async function onWordExportSuccess(file) {
  await downloadExportedFile(file)
  await loadGenerateRecords()
  await loadProjects(selectedProject.value?.id)
}

async function exportGenerateMarkdown(row) {
  if (!row?.id) {
    ElMessage.warning('生成结果ID为空')
    return
  }

  exportingMarkdown.value = true
  try {
    const file = await exportMarkdown(row.id)
    await downloadExportedFile(file)
    ElMessage.success('Markdown已开始下载')
    await loadGenerateRecords()
    await loadProjects(selectedProject.value?.id)
  } finally {
    exportingMarkdown.value = false
  }
}

async function downloadExportedFile(file) {
  if (!file?.id) {
    ElMessage.error('导出成功但没有返回文件ID，无法下载')
    return
  }

  const blob = await downloadExportFile(file.id)
  downloadBlob(blob, file.originalName || file.fileName || '导出文件')
}

function downloadBlob(blob, fileName) {
  const url = window.URL.createObjectURL(blob)
  const link = document.createElement('a')

  link.href = url
  link.download = sanitizeFileName(fileName)
  link.style.display = 'none'

  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)

  window.URL.revokeObjectURL(url)
}

function sanitizeFileName(fileName) {
  return String(fileName || '导出文件')
    .replace(/[\\/:*?"<>|]/g, '_')
    .trim() || '导出文件'
}

function goFullResultPage(row) {
  if (!row?.id) {
    router.push('/ai/results')
    return
  }

  router.push({
    path: '/ai/results',
    query: { resultId: row.id }
  })
}

function resetProjectForm(row = {}) {
  projectForm.enterpriseId = row.enterpriseId || (!canManagePlatform.value ? auth.user?.enterpriseId || '' : '')
  projectForm.projectName = row.projectName || ''
  projectForm.projectType = row.projectType || ''
  projectForm.clientName = row.clientName || ''
  projectForm.bidderName = row.bidderName || auth.user?.enterpriseName || ''
  projectForm.budgetAmount = row.budgetAmount ?? null
  projectForm.tenderDeadline = toDateTimePickerValue(row.tenderDeadline)
  projectForm.bidOpenTime = toDateTimePickerValue(row.bidOpenTime)
  projectForm.periodDays = row.periodDays ?? null
  projectForm.ownerUserId = row.ownerUserId || null
  projectForm.bidTemplateId = row.bidTemplateId || null
  projectForm.knowledgeIds = Array.isArray(row.knowledgeIdList) ? row.knowledgeIdList : []
  projectForm.status = String(row.status || 'DRAFT').toUpperCase()
  projectForm.remark = row.remark || ''
}

async function openCreateProject() {
  projectDialog.isEdit = false
  projectDialog.id = null
  resetProjectForm({})

  if (!canManagePlatform.value) {
    projectForm.enterpriseId = auth.user?.enterpriseId || projectForm.enterpriseId
    if (auth.user?.enterpriseName) {
      projectForm.bidderName = auth.user.enterpriseName
    }
  }

  await loadKnowledgeOptions(projectForm.enterpriseId || undefined)
  await loadBidTemplateOptions(projectForm.enterpriseId || undefined)
  projectDialog.visible = true
}

async function openEditProject(row) {
  if (!canEditProject(row)) {
    ElMessage.warning('当前项目状态不允许编辑')
    return
  }

  const detail = await getBidProject(row.id)
  projectDialog.isEdit = true
  projectDialog.id = detail.id
  resetProjectForm(detail)

  await loadKnowledgeOptions(detail.enterpriseId || undefined)
  await loadBidTemplateOptions(detail.enterpriseId || undefined)
  projectDialog.visible = true
}

async function onProjectEnterpriseChange(value) {
  projectForm.knowledgeIds = []
  projectForm.bidTemplateId = null
  await loadKnowledgeOptions(value || undefined)
  await loadBidTemplateOptions(value || undefined)

  const enterprise = enterprises.value.find((item) => String(item.id) === String(value))
  if (enterprise && !projectForm.bidderName) {
    projectForm.bidderName = enterprise.enterpriseName
  }
}

async function submitProject() {
  await projectFormRef.value?.validate()

  const payload = {
    enterpriseId: projectForm.enterpriseId || null,
    projectName: projectForm.projectName,
    projectType: projectForm.projectType || null,
    clientName: projectForm.clientName || null,
    bidderName: projectForm.bidderName || null,
    budgetAmount: projectForm.budgetAmount === '' ? null : projectForm.budgetAmount,
    tenderDeadline: projectForm.tenderDeadline || null,
    bidOpenTime: projectForm.bidOpenTime || null,
    periodDays: projectForm.periodDays === '' ? null : projectForm.periodDays,
    ownerUserId: projectForm.ownerUserId || null,
    bidTemplateId: projectForm.bidTemplateId || null,
    knowledgeIds: Array.isArray(projectForm.knowledgeIds)
      ? projectForm.knowledgeIds.map((id) => Number(id)).filter((id) => !Number.isNaN(id))
      : [],
    remark: projectForm.remark || null
  }

  let savedId = projectDialog.id

  if (projectDialog.isEdit) {
    payload.status = String(projectForm.status || 'DRAFT').toUpperCase()
    await updateBidProject(projectDialog.id, payload)
    ElMessage.success('项目已修改')
  } else {
    savedId = await createBidProject(payload)
    ElMessage.success('项目已创建')
  }

  projectDialog.visible = false
  await loadProjects(savedId)
}

async function archiveProject(row) {
  if (!canArchiveProject(row)) {
    ElMessage.warning('项目生成或导出后才能归档')
    return
  }

  await ElMessageBox.confirm(`确认归档项目「${row.projectName}」吗？`, '提示', {
    type: 'warning'
  })

  await updateBidProjectStatus(row.id, { status: 'ARCHIVED' })
  ElMessage.success('项目已归档')
  await loadProjects(row.id)
}

async function deleteProjectRow(row) {
  if (!canDeleteProject(row)) {
    ElMessage.warning('当前项目状态不允许删除')
    return
  }

  await ElMessageBox.confirm(`确认删除项目「${row.projectName}」吗？如果项目下已有资料，后端会拒绝删除。`, '删除确认', {
    type: 'warning'
  })

  await deleteBidProject(row.id)
  ElMessage.success('项目已删除')

  if (selectedProject.value?.id === row.id) {
    selectedProject.value = null
    materials.value = []
    generateRecords.value = []
  }

  await loadProjects()
}

function openUploadMaterial() {
  if (!selectedProject.value?.id) {
    ElMessage.warning('请先选择项目')
    return
  }
  if (!canUploadMaterial(selectedProject.value)) {
    ElMessage.warning('当前项目状态不允许上传资料')
    return
  }

  materialForm.materialType = materials.value.some((item) => item.materialType === 'TENDER_DOC')
    ? 'BUSINESS_DOC'
    : 'TENDER_DOC'

  materialDialog.visible = true
}

async function onMaterialUploaded(file) {
  const fileId = file?.id || file?.fileId
  if (!fileId) {
    ElMessage.error('上传成功但没有返回文件ID')
    return
  }

  await createProjectMaterial({
    projectId: selectedProject.value.id,
    fileId,
    materialType: materialForm.materialType
  })

  ElMessage.success('项目资料已添加')
  materialDialog.visible = false

  await loadMaterials()
  await loadProjects(selectedProject.value.id)
}

function openFile(row) {
  if (!row.fileUrl) {
    ElMessage.warning('文件访问地址为空')
    return
  }

  window.open(row.fileUrl, '_blank')
}

async function deleteMaterialRow(row) {
  if (!canUploadMaterial(selectedProject.value)) {
    ElMessage.warning('当前项目状态不允许删除资料')
    return
  }

  await ElMessageBox.confirm(`确认删除资料「${row.fileName || row.originalName || row.id}」吗？`, '删除确认', {
    type: 'warning'
  })

  await deleteProjectMaterial(row.id)
  ElMessage.success('资料已删除')

  await loadMaterials()
  await loadProjectGenerateCheck()
  await loadProjects(selectedProject.value?.id)
}

function openAddToKnowledge(row) {
  if (!knowledgeOptions.value.length) {
    ElMessage.warning('当前没有可用知识库，请先创建知识库')
    return
  }

  knowledgeDialog.material = row
  knowledgeDialog.knowledgeBaseId = ''
  knowledgeDialog.visible = true
}

async function submitAddToKnowledge() {
  if (!knowledgeDialog.material?.id) {
    ElMessage.warning('请选择项目资料')
    return
  }

  if (!knowledgeDialog.knowledgeBaseId) {
    ElMessage.warning('请选择知识库')
    return
  }

  await addProjectMaterialToKnowledge(knowledgeDialog.material.id, {
    knowledgeBaseId: knowledgeDialog.knowledgeBaseId
  })

  ElMessage.success('资料已加入知识库')
  knowledgeDialog.visible = false
}

function goGenerateWorkbench(row) {
  if (!row?.id) {
    ElMessage.warning('请先选择项目')
    return
  }
  if (!canGenerateProject(row)) {
    ElMessage.warning('当前项目状态不允许发起 AI 生成')
    return
  }

  if (projectGenerateCheck.value && projectGenerateCheck.value.canGenerate === false) {
    ElMessage.warning('项目基础信息未通过生成前检查，请先处理后再生成')
    return
  }

  router.push({
    path: '/ai/workbench',
    query: { projectId: row.id }
  })
}


function generateTypeLabel(value) {
  const map = {
    bid_tech: '技术标',
    bid_business: '商务标',
    bid_full: '完整标书',
    bid: '标书'
  }
  return map[String(value || '').toLowerCase()] || value || '-'
}

function generateTypeTag(value) {
  const map = {
    bid_tech: 'primary',
    bid_business: 'success',
    bid_full: 'warning',
    bid: 'info'
  }
  return map[String(value || '').toLowerCase()] || 'info'
}

function resultStatusLabel(value) {
  const map = {
    pending: '待审核',
    approved: '已通过',
    rejected: '已驳回'
  }
  return map[String(value || '').toLowerCase()] || value || '-'
}

function resultStatusTag(value) {
  const map = {
    pending: 'warning',
    approved: 'success',
    rejected: 'danger'
  }
  return map[String(value || '').toLowerCase()] || 'info'
}

function projectTypeLabel(value) {
  const map = {
    CONSTRUCTION: '工程施工',
    GOODS: '货物采购',
    SERVICE: '服务采购',
    IT: '信息化项目',
    OTHER: '其他'
  }
  return map[value] || value || '-'
}

function materialTypeLabel(value) {
  const map = {
    TENDER_DOC: '招标文件',
    BUSINESS_DOC: '商务资料',
    TECH_DOC: '技术资料',
    QUOTE_DOC: '报价资料',
    DRAWING: '图纸/CAD',
    CONTRACT_DOC: '合同资料',
    OTHER: '其他资料'
  }
  return map[value] || value || '-'
}

function bidTemplateOptionLabel(item) {
  if (!item) return ''
  const tags = [
    bidTemplateTypeLabel(item.templateType),
    bidTemplateScopeLabel(item.templateScope)
  ]
  if (Number(item.defaultFlag) === 1) {
    tags.push('默认')
  }
  return `${item.templateName}（${tags.filter(Boolean).join(' / ')}）`
}

function bidTemplateTypeLabel(value) {
  const map = {
    TECH: '技术标',
    BUSINESS: '商务标',
    FULL: '完整标书',
    COMMON: '通用标书'
  }
  return map[value] || value || '-'
}

function bidTemplateTypeTag(value) {
  const map = {
    TECH: 'primary',
    BUSINESS: 'success',
    FULL: 'warning',
    COMMON: 'info'
  }
  return map[value] || 'info'
}

function bidTemplateScopeLabel(value) {
  return value === 'PLATFORM' ? '平台模板' : '企业模板'
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

function formatMoney(value) {
  if (value === null || value === undefined || value === '') {
    return '-'
  }

  const number = Number(value)
  if (Number.isNaN(number)) {
    return value
  }

  return number.toLocaleString('zh-CN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })
}

function formatFileSize(size) {
  const value = Number(size || 0)
  if (value < 1024) return `${value} B`
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(2)} KB`
  if (value < 1024 * 1024 * 1024) return `${(value / 1024 / 1024).toFixed(2)} MB`
  return `${(value / 1024 / 1024 / 1024).toFixed(2)} GB`
}

function toDateTimePickerValue(value) {
  if (!value) return ''
  return String(value).replace(' ', 'T')
}
</script>

<style scoped>
.project-page {
  display: grid;
  grid-template-columns: minmax(620px, 1fr) minmax(0, 1fr);
  gap: 16px;
}

.project-left,
.project-right {
  min-width: 0;
}

.project-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}

.project-header__actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.project-title {
  font-size: 18px;
  font-weight: 800;
  color: var(--text-main);
}

.project-sub {
  margin-top: 6px;
  color: var(--text-sub);
  line-height: 1.5;
}

.project-flow {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 10px;
  margin: 12px 0;
}

.flow-item {
  display: flex;
  gap: 10px;
  align-items: center;
  padding: 10px;
  border-radius: 12px;
  border: 1px solid var(--border);
  background: #f8fafc;
  transition: all 0.18s ease;
}

.flow-item.done {
  border-color: #93c5fd;
  background: #eff6ff;
}

.flow-item.active {
  border-color: #2563eb;
  background: #dbeafe;
  box-shadow: 0 8px 18px rgba(37, 99, 235, 0.08);
}

.flow-item.disabled {
  opacity: 0.65;
}

.flow-dot {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  border-radius: 999px;
  background: #e5e7eb;
  color: #4b5563;
  font-weight: 800;
  flex-shrink: 0;
}

.flow-item.done .flow-dot,
.flow-item.active .flow-dot {
  background: #2563eb;
  color: #fff;
}

.flow-text {
  min-width: 0;
}

.flow-text strong {
  display: block;
  color: var(--text-main);
  font-size: 13px;
  line-height: 1.2;
}

.flow-text span {
  display: block;
  margin-top: 4px;
  color: var(--text-sub);
  font-size: 12px;
  line-height: 1.2;
}

.flow-tip {
  margin-bottom: 12px;
}


.generate-check-card {
  margin: 14px 0;
  padding: 14px;
  border: 1px solid var(--border);
  border-radius: 16px;
  background: #f8fafc;
}

.generate-check-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 14px;
}

.generate-check-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.generate-check-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
  margin-top: 12px;
}

.generate-check-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px;
  border-radius: 12px;
  background: #fff;
  border: 1px solid #e5e7eb;
}

.generate-check-item.is-error {
  border-color: #fecaca;
  background: #fff7f7;
}

.generate-check-item.is-warning {
  border-color: #fde68a;
  background: #fffbeb;
}

.check-main {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.check-main strong {
  color: var(--text-main);
}

.check-main span {
  color: var(--text-sub);
  font-size: 12px;
  line-height: 1.5;
}

.check-alert {
  margin-top: 12px;
}

@media (max-width: 1180px) {
  .generate-check-grid {
    grid-template-columns: 1fr;
  }
}

.project-tabs {
  min-height: 0;
}

.section-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}

.section-title {
  font-size: 15px;
  font-weight: 800;
  color: var(--text-main);
}

.section-desc {
  margin-top: 4px;
  color: var(--text-sub);
  line-height: 1.5;
}

.table-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  white-space: nowrap;
}

.section-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.result-dialog-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}

.result-dialog-time {
  margin-left: 8px;
  color: var(--text-sub);
}

.result-dialog-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 8px;
}

.result-preview {
  height: 520px;
  overflow: auto;
}


.template-name {
  margin-left: 8px;
  margin-right: 8px;
}

.template-option {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  width: 100%;
}

.template-option__meta {
  color: var(--text-sub);
  font-size: 12px;
  flex-shrink: 0;
}

.form-tip {
  color: var(--text-sub);
  font-size: 13px;
  line-height: 1.6;
}

@media (max-width: 1280px) {
  .project-page {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 920px) {
  .project-flow {
    grid-template-columns: 1fr;
  }
}
</style>