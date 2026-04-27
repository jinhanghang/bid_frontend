<template>
  <div class="page">
    <div class="page-body workbench-layout">
      <div class="card workbench-card">
        <div class="section-title">通用AI生成</div>
        <div class="form-tip">
          对应后端接口：POST /ai/generate。可用于标书、可研、合同、环评、交评等场景。
        </div>

        <el-form :model="form" label-width="130px" class="workbench-form">
          <el-form-item label="业务类型">
            <el-select v-model="form.bizType" style="width: 100%">
              <el-option label="标书 bid" value="bid" />
              <el-option label="可研 feasibility" value="feasibility" />
              <el-option label="决策评估 decision" value="decision" />
              <el-option label="合同 contract" value="contract" />
              <el-option label="环评 eia" value="eia" />
              <el-option label="交评 tia" value="tia" />
            </el-select>
          </el-form-item>

          <el-form-item label="关联业务ID">
            <el-input-number v-model="form.bizId" controls-position="right" style="width: 100%" />
          </el-form-item>

          <el-form-item label="Prompt模板ID">
            <el-input-number v-model="form.promptTemplateId" controls-position="right" style="width: 100%" />
          </el-form-item>

          <el-row :gutter="12">
            <el-col :span="12">
              <el-form-item label="模型服务商">
                <el-input v-model="form.modelProvider" placeholder="不填用默认模型" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="模型名称">
                <el-input v-model="form.modelName" placeholder="不填用默认模型" />
              </el-form-item>
            </el-col>
          </el-row>

          <el-form-item label="项目名称">
            <el-input v-model="form.projectName" />
          </el-form-item>

          <el-row :gutter="12">
            <el-col :span="12">
              <el-form-item label="项目编号">
                <el-input v-model="form.projectCode" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="项目类型">
                <el-input v-model="form.projectType" placeholder="工程 / 服务 / 采购等" />
              </el-form-item>
            </el-col>
          </el-row>

          <el-form-item label="招标方/客户">
            <el-input v-model="form.clientName" />
          </el-form-item>

          <el-row :gutter="12">
            <el-col :span="12">
              <el-form-item label="预算金额">
                <el-input-number v-model="form.budgetAmount" :min="0" :precision="2" controls-position="right" style="width: 100%" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="工期天数">
                <el-input-number v-model="form.periodDays" :min="0" controls-position="right" style="width: 100%" />
              </el-form-item>
            </el-col>
          </el-row>

          <el-form-item label="知识库ID">
            <JsonEditor v-model="form.knowledgeIds" :rows="4" placeholder="例如：[1,2,3]" />
          </el-form-item>

          <el-form-item label="动态变量">
            <JsonEditor v-model="form.variables" :rows="7" placeholder='例如：{"company_name":"某某公司","service_year":"3年"}' />
          </el-form-item>

          <el-form-item label="额外要求">
            <el-input v-model="form.extraRequirement" type="textarea" :rows="5" />
          </el-form-item>

          <el-row :gutter="12">
            <el-col :span="12">
              <el-form-item label="温度参数">
                <el-input-number v-model="form.temperature" :min="0" :max="2" :step="0.1" controls-position="right" style="width: 100%" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="最大Token">
                <el-input-number v-model="form.maxTokens" :min="1000" :max="50000" controls-position="right" style="width: 100%" />
              </el-form-item>
            </el-col>
          </el-row>

          <el-button type="primary" :loading="loading" @click="submitGenerate">开始生成</el-button>
          <el-button @click="reset">重置</el-button>
        </el-form>
      </div>

      <div class="card result-card">
        <div class="section-title">生成结果</div>
        <div class="result-meta">
          <span>任务ID：{{ result.taskId || '-' }}</span>
          <span>结果ID：{{ result.resultId || '-' }}</span>
          <span>状态：{{ result.status || '-' }}</span>
        </div>
        <div v-if="result.contentHtml" class="markdown-box" v-html="result.contentHtml"></div>
        <div v-else-if="result.contentMarkdown" class="markdown-box">{{ result.contentMarkdown }}</div>
        <el-empty v-else description="暂无生成结果" />
      </div>
    </div>
  </div>
</template>

<script setup>
import { reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { generateAi } from '@/api/ai'
import JsonEditor from '@/components/JsonEditor.vue'
import { parseJsonLoose } from '@/utils/format'

const loading = ref(false)
const result = reactive({})

const form = reactive({
  bizType: 'bid',
  bizId: undefined,
  promptTemplateId: undefined,
  modelProvider: '',
  modelName: '',
  projectName: '',
  projectCode: '',
  projectType: '',
  clientName: '',
  budgetAmount: 0,
  periodDays: 0,
  knowledgeIds: '[]',
  variables: '{}',
  extraRequirement: '',
  temperature: 0.7,
  maxTokens: 8192
})

function reset() {
  Object.assign(form, {
    bizType: 'bid',
    bizId: undefined,
    promptTemplateId: undefined,
    modelProvider: '',
    modelName: '',
    projectName: '',
    projectCode: '',
    projectType: '',
    clientName: '',
    budgetAmount: 0,
    periodDays: 0,
    knowledgeIds: '[]',
    variables: '{}',
    extraRequirement: '',
    temperature: 0.7,
    maxTokens: 8192
  })
  for (const key of Object.keys(result)) delete result[key]
}

async function submitGenerate() {
  if (!form.bizType) {
    ElMessage.warning('请选择业务类型')
    return
  }
  loading.value = true
  try {
    const payload = {
      ...form,
      bizId: form.bizId || undefined,
      promptTemplateId: form.promptTemplateId || undefined,
      modelProvider: form.modelProvider || undefined,
      modelName: form.modelName || undefined,
      knowledgeIds: parseJsonLoose(form.knowledgeIds, []),
      variables: parseJsonLoose(form.variables, {})
    }
    const res = await generateAi(payload)
    Object.assign(result, res || {})
    ElMessage.success('生成完成')
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.workbench-layout {
  display: grid;
  grid-template-columns: 520px minmax(0, 1fr);
  gap: 16px;
}

.workbench-card,
.result-card {
  padding: 18px;
}

.section-title {
  font-size: 18px;
  font-weight: 800;
}

.workbench-form {
  margin-top: 16px;
}

.result-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin: 12px 0;
  color: var(--text-sub);
  font-size: 13px;
}

@media (max-width: 1100px) {
  .workbench-layout {
    grid-template-columns: 1fr;
  }
}
</style>
