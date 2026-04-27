import { enableMap, aiTaskStatusMap, approvalStatusMap, tenderStatusMap } from '@/config/statusMaps'

const enterpriseOptionSource = { baseUrl: '/enterprise', label: 'enterpriseName', value: 'id', key: 'enterprise' }
const bidTemplateOptionSource = { baseUrl: '/bid-template', label: 'templateName', value: 'id', key: 'bidTemplate' }
const promptTemplateOptionSource = { baseUrl: '/prompt-template', label: 'name', value: 'id', key: 'promptTemplate' }
const knowledgeBaseOptionSource = { baseUrl: '/knowledge-base', label: 'kbName', value: 'id', key: 'knowledgeBase' }
const tenderSourceOptionSource = { baseUrl: '/tender-source', label: 'sourceName', value: 'id', key: 'tenderSource' }

export const moduleConfigs = {
  role: {
    title: '角色管理',
    baseUrl: '/sys-role',
    keywordPlaceholder: '按角色名称 / 角色编码查询',
    searchFields: ['roleName', 'roleCode', 'remark'],
    columns: [
      { prop: 'id', label: 'ID', width: 90 },
      { prop: 'roleName', label: '角色名称', minWidth: 150 },
      { prop: 'roleCode', label: '角色编码', minWidth: 150 },
      { prop: 'sortNo', label: '排序', width: 90 },
      { prop: 'status', label: '状态', width: 90, type: 'status', map: enableMap },
      { prop: 'remark', label: '备注', minWidth: 180 },
      { prop: 'createTime', label: '创建时间', width: 170 }
    ],
    formFields: [
      { prop: 'roleName', label: '角色名称', required: true },
      { prop: 'roleCode', label: '角色编码', required: true },
      { prop: 'sortNo', label: '排序', type: 'number', default: 0 },
      { prop: 'status', label: '状态', type: 'select', default: 1, options: [{ label: '正常', value: 1 }, { label: '停用', value: 0 }] },
      { prop: 'remark', label: '备注', type: 'textarea' }
    ]
  },

  menu: {
    title: '菜单管理',
    baseUrl: '/sys-menu',
    keywordPlaceholder: '按菜单名 / 路由 / 权限标识查询',
    searchFields: ['menuName', 'path', 'permissionCode', 'component'],
    columns: [
      { prop: 'id', label: 'ID', width: 90 },
      { prop: 'parentId', label: '父级ID', width: 100 },
      { prop: 'menuName', label: '菜单名称', minWidth: 150 },
      { prop: 'menuType', label: '类型', width: 100 },
      { prop: 'path', label: '路由', minWidth: 180 },
      { prop: 'component', label: '组件', minWidth: 180 },
      { prop: 'permissionCode', label: '权限标识', minWidth: 180 },
      { prop: 'sortNo', label: '排序', width: 90 },
      { prop: 'visible', label: '显示', width: 90, type: 'status', map: { 1: ['显示', 'success'], 0: ['隐藏', 'info'] } },
      { prop: 'status', label: '状态', width: 90, type: 'status', map: enableMap }
    ],
    formFields: [
      { prop: 'parentId', label: '父级ID', type: 'number', default: 0 },
      { prop: 'menuName', label: '菜单名称', required: true },
      { prop: 'menuType', label: '菜单类型', type: 'select', default: 'menu', options: [
        { label: '目录', value: 'dir' }, { label: '菜单', value: 'menu' }, { label: '按钮', value: 'button' }, { label: '接口', value: 'api' }
      ] },
      { prop: 'path', label: '前端路由' },
      { prop: 'component', label: '前端组件' },
      { prop: 'permissionCode', label: '权限标识' },
      { prop: 'icon', label: '图标' },
      { prop: 'sortNo', label: '排序', type: 'number', default: 0 },
      { prop: 'visible', label: '是否显示', type: 'select', default: 1, options: [{ label: '显示', value: 1 }, { label: '隐藏', value: 0 }] },
      { prop: 'status', label: '状态', type: 'select', default: 1, options: [{ label: '正常', value: 1 }, { label: '停用', value: 0 }] }
    ]
  },

  enterprise: {
    title: '企业管理',
    baseUrl: '/enterprise',
    keywordPlaceholder: '按企业名称 / 联系人 / 电话查询',
    searchFields: ['enterpriseName', 'creditCode', 'contactName', 'contactPhone'],
    columns: [
      { prop: 'id', label: 'ID', width: 90 },
      { prop: 'enterpriseName', label: '企业名称', minWidth: 220 },
      { prop: 'creditCode', label: '信用代码', minWidth: 180 },
      { prop: 'legalPerson', label: '法人', width: 120 },
      { prop: 'contactName', label: '联系人', width: 120 },
      { prop: 'contactPhone', label: '联系电话', width: 140 },
      { prop: 'status', label: '状态', width: 90, type: 'status', map: enableMap },
      { prop: 'createTime', label: '创建时间', width: 170 }
    ],
    formFields: [
      { prop: 'enterpriseName', label: '企业名称', required: true },
      { prop: 'creditCode', label: '统一社会信用代码' },
      { prop: 'legalPerson', label: '法定代表人' },
      { prop: 'contactName', label: '联系人' },
      { prop: 'contactPhone', label: '联系电话' },
      { prop: 'email', label: '邮箱' },
      { prop: 'address', label: '企业地址', type: 'textarea' },
      { prop: 'status', label: '状态', type: 'select', default: 1, options: [{ label: '正常', value: 1 }, { label: '停用', value: 0 }] },
      { prop: 'remark', label: '备注', type: 'textarea' }
    ]
  },

  promptTemplate: {
    title: 'Prompt模板管理',
    baseUrl: '/prompt-template',
    keywordPlaceholder: '按模板名称 / 场景 / 模型查询',
    searchFields: ['name', 'scene', 'modelProvider', 'modelName', 'remark'],
    columns: [
      { prop: 'id', label: 'ID', width: 90 },
      { prop: 'name', label: '模板名称', minWidth: 180 },
      { prop: 'scene', label: '场景', width: 140 },
      { prop: 'modelProvider', label: '模型服务商', width: 130 },
      { prop: 'modelName', label: '模型名称', width: 150 },
      { prop: 'versionNo', label: '版本', width: 90 },
      { prop: 'status', label: '状态', width: 90, type: 'status', map: enableMap },
      { prop: 'createTime', label: '创建时间', width: 170 }
    ],
    formWidth: '900px',
    formFields: [
      { prop: 'name', label: '模板名称', required: true },
      { prop: 'scene', label: '业务场景', type: 'select', default: 'BID_TECH', options: [
        { label: '标书技术方案', value: 'BID_TECH' },
        { label: '标书商务部分', value: 'BID_BUSINESS' },
        { label: '可研报告', value: 'FEASIBILITY' },
        { label: '决策评估', value: 'DECISION' },
        { label: '合同文本', value: 'CONTRACT' },
        { label: '环评', value: 'EIA' },
        { label: '交评', value: 'TIA' }
      ] },
      { prop: 'content', label: 'Prompt内容', type: 'textarea', rows: 12, required: true },
      { prop: 'modelProvider', label: '推荐模型服务商' },
      { prop: 'modelName', label: '推荐模型' },
      { prop: 'versionNo', label: '版本号', default: 'V1.0' },
      { prop: 'status', label: '状态', type: 'select', default: 1, options: [{ label: '启用', value: 1 }, { label: '禁用', value: 0 }] },
      { prop: 'remark', label: '备注', type: 'textarea' }
    ]
  },

  templateVariable: {
    title: '模板变量管理',
    baseUrl: '/template-variable',
    keywordPlaceholder: '按变量Key / 变量名称查询',
    searchFields: ['variableKey', 'variableLabel', 'inputType', 'remark'],
    columns: [
      { prop: 'id', label: 'ID', width: 90 },
      { prop: 'templateId', label: '所属模板', width: 160, type: 'optionLabel', optionSource: bidTemplateOptionSource },
      { prop: 'variableKey', label: '变量Key', minWidth: 160 },
      { prop: 'variableLabel', label: '变量名称', minWidth: 160 },
      { prop: 'inputType', label: '输入类型', width: 120 },
      { prop: 'requiredFlag', label: '必填', width: 90, type: 'status', map: { 1: ['是', 'danger'], 0: ['否', 'info'] } },
      { prop: 'sortNo', label: '排序', width: 90 }
    ],
    formFields: [
      { prop: 'templateId', label: '所属模板', type: 'select', required: true, optionSource: bidTemplateOptionSource },
      { prop: 'variableKey', label: '变量Key', required: true },
      { prop: 'variableLabel', label: '变量名称', required: true },
      { prop: 'inputType', label: '输入类型', type: 'select', default: 'text', options: [
        { label: '文本', value: 'text' }, { label: '多行文本', value: 'textarea' }, { label: '数字', value: 'number' },
        { label: '日期', value: 'date' }, { label: '下拉', value: 'select' }, { label: '文件', value: 'file' }
      ] },
      { prop: 'requiredFlag', label: '是否必填', type: 'select', default: 0, options: [{ label: '是', value: 1 }, { label: '否', value: 0 }] },
      { prop: 'defaultValue', label: '默认值' },
      { prop: 'optionJson', label: '选项JSON', type: 'json', rows: 5 },
      { prop: 'sortNo', label: '排序', type: 'number', default: 0 },
      { prop: 'remark', label: '备注', type: 'textarea' }
    ]
  },

  bidTemplate: {
    title: '标书模板管理',
    baseUrl: '/bid-template',
    keywordPlaceholder: '按模板名称 / 类型查询',
    searchFields: ['templateName', 'templateType', 'description'],
    columns: [
      { prop: 'id', label: 'ID', width: 90 },
      { prop: 'templateName', label: '模板名称', minWidth: 220 },
      { prop: 'templateType', label: '模板类型', minWidth: 160 },
      { prop: 'description', label: '说明', minWidth: 220 },
      { prop: 'sortNo', label: '排序', width: 90 },
      { prop: 'status', label: '状态', width: 90, type: 'status', map: enableMap },
      { prop: 'createTime', label: '创建时间', width: 170 }
    ],
    formFields: [
      { prop: 'templateName', label: '模板名称', required: true },
      { prop: 'templateType', label: '模板类型', type: 'select', default: 'government_procurement', options: [
        { label: '政府采购', value: 'government_procurement' },
        { label: '工程类', value: 'engineering' },
        { label: '服务类', value: 'service' },
        { label: '自定义', value: 'custom' }
      ] },
      { prop: 'fileId', label: '模板文件', type: 'fileUpload', moduleType: 'bid_template', tip: '这里上传的是模板文件，保存到 fileId 字段；fileId 是文件资源表的主键，不是标书模板表的主键。' },
      { prop: 'description', label: '模板描述', type: 'textarea' },
      { prop: 'sortNo', label: '排序', type: 'number', default: 0 },
      { prop: 'status', label: '状态', type: 'select', default: 1, options: [{ label: '启用', value: 1 }, { label: '停用', value: 0 }] }
    ]
  },

  aiModel: {
    title: 'AI模型配置',
    baseUrl: '/ai-model-config',
    keywordPlaceholder: '按服务商 / 模型名称查询',
    searchFields: ['provider', 'modelName', 'modelType', 'remark'],
    columns: [
      { prop: 'id', label: 'ID', width: 90 },
      { prop: 'provider', label: '服务商', width: 130 },
      { prop: 'modelName', label: '模型名称', minWidth: 170 },
      { prop: 'modelType', label: '类型', width: 100 },
      { prop: 'temperature', label: '温度', width: 90 },
      { prop: 'maxTokens', label: '最大Token', width: 110 },
      { prop: 'sortNo', label: '排序', width: 90 },
      { prop: 'status', label: '状态', width: 90, type: 'status', map: enableMap }
    ],
    formFields: [
      { prop: 'provider', label: '服务商', required: true },
      { prop: 'modelName', label: '模型名称', required: true },
      { prop: 'apiBase', label: 'API地址' },
      { prop: 'apiKeyRef', label: '密钥引用' },
      { prop: 'modelType', label: '模型类型', type: 'select', default: 'chat', options: [
        { label: 'Chat', value: 'chat' }, { label: 'Embedding', value: 'embedding' }, { label: 'Rerank', value: 'rerank' }
      ] },
      { prop: 'temperature', label: '温度参数', type: 'number', default: 0.7 },
      { prop: 'maxTokens', label: '最大Token', type: 'number', default: 8192 },
      { prop: 'sortNo', label: '排序', type: 'number', default: 0 },
      { prop: 'status', label: '状态', type: 'select', default: 1, options: [{ label: '启用', value: 1 }, { label: '停用', value: 0 }] },
      { prop: 'remark', label: '备注', type: 'textarea' }
    ]
  },

  aiTask: {
    title: 'AI生成任务',
    baseUrl: '/ai-generate-task',
    readonly: true,
    keywordPlaceholder: '按任务号 / 业务类型 / 状态查询',
    searchFields: ['taskNo', 'bizType', 'status', 'modelName', 'errorMsg'],
    columns: [
      { prop: 'id', label: 'ID', width: 90 },
      { prop: 'taskNo', label: '任务编号', minWidth: 180 },
      { prop: 'bizType', label: '业务类型', width: 110 },
      { prop: 'bizId', label: '业务ID', width: 100 },
      { prop: 'modelProvider', label: '服务商', width: 120 },
      { prop: 'modelName', label: '模型', width: 150 },
      { prop: 'status', label: '状态', width: 100, type: 'status', map: aiTaskStatusMap },
      { prop: 'tokensInput', label: '输入Token', width: 110 },
      { prop: 'tokensOutput', label: '输出Token', width: 110 },
      { prop: 'wordCount', label: '字数', width: 90 },
      { prop: 'createTime', label: '创建时间', width: 170 }
    ],
    formFields: []
  },

  aiResult: {
    title: 'AI生成结果',
    baseUrl: '/ai-generate-result',
    readonly: true,
    keywordPlaceholder: '按标题 / 业务类型查询',
    searchFields: ['title', 'bizType', 'auditStatus'],
    columns: [
      { prop: 'id', label: 'ID', width: 90 },
      { prop: 'taskId', label: '任务ID', width: 100 },
      { prop: 'bizType', label: '业务类型', width: 110 },
      { prop: 'bizId', label: '业务ID', width: 100 },
      { prop: 'title', label: '结果标题', minWidth: 240 },
      { prop: 'versionNo', label: '版本', width: 90 },
      { prop: 'auditStatus', label: '审核状态', width: 110, type: 'status' },
      { prop: 'createTime', label: '创建时间', width: 170 }
    ],
    formWidth: '900px',
    formFields: [
      { prop: 'taskId', label: '任务ID', type: 'number', required: true },
      { prop: 'bizType', label: '业务类型', required: true },
      { prop: 'bizId', label: '业务ID', type: 'number' },
      { prop: 'title', label: '结果标题' },
      { prop: 'contentMarkdown', label: 'Markdown内容', type: 'textarea', rows: 14 },
      { prop: 'contentHtml', label: 'HTML内容', type: 'textarea', rows: 10 },
      { prop: 'fileId', label: '文件ID', type: 'number' },
      { prop: 'versionNo', label: '版本号', type: 'number', default: 1 },
      { prop: 'auditStatus', label: '审核状态', type: 'select', default: 'pending', options: [
        { label: '待审核', value: 'pending' }, { label: '通过', value: 'approved' }, { label: '驳回', value: 'rejected' }
      ] }
    ]
  },

  documentExport: {
    title: '文档导出记录',
    baseUrl: '/document-export',
    readonly: true,
    keywordPlaceholder: '按业务类型 / 状态查询',
    searchFields: ['bizType', 'exportType', 'status', 'fileUrl', 'errorMsg'],
    columns: [
      { prop: 'id', label: 'ID', width: 90 },
      { prop: 'bizType', label: '业务类型', width: 120 },
      { prop: 'bizId', label: '业务ID', width: 100 },
      { prop: 'exportType', label: '导出类型', width: 110 },
      { prop: 'fileId', label: '文件ID', width: 100 },
      { prop: 'fileUrl', label: '文件地址', minWidth: 220, type: 'link' },
      { prop: 'status', label: '状态', width: 100, type: 'status' },
      { prop: 'createTime', label: '创建时间', width: 170 }
    ],
    formFields: []
  },

  tenderSource: {
    title: '招标数据源',
    baseUrl: '/tender-source',
    keywordPlaceholder: '按数据源名称 / 编码查询',
    searchFields: ['sourceName', 'sourceCode', 'baseUrl', 'sourceType'],
    columns: [
      { prop: 'id', label: 'ID', width: 90 },
      { prop: 'sourceName', label: '数据源名称', minWidth: 180 },
      { prop: 'sourceCode', label: '编码', width: 140 },
      { prop: 'baseUrl', label: '基础URL', minWidth: 240, type: 'link' },
      { prop: 'sourceType', label: '类型', width: 110 },
      { prop: 'crawlEnabled', label: '爬虫', width: 90, type: 'status', map: { 1: ['启用', 'success'], 0: ['停用', 'info'] } },
      { prop: 'status', label: '状态', width: 90, type: 'status', map: enableMap }
    ],
    formFields: [
      { prop: 'sourceName', label: '数据源名称', required: true },
      { prop: 'sourceCode', label: '数据源编码', required: true },
      { prop: 'baseUrl', label: '基础URL', required: true },
      { prop: 'sourceType', label: '来源类型', default: 'website' },
      { prop: 'crawlEnabled', label: '是否启用爬虫', type: 'select', default: 1, options: [{ label: '启用', value: 1 }, { label: '停用', value: 0 }] },
      { prop: 'crawlIntervalMin', label: '抓取间隔分钟', type: 'number', default: 60 },
      { prop: 'status', label: '状态', type: 'select', default: 1, options: [{ label: '正常', value: 1 }, { label: '停用', value: 0 }] },
      { prop: 'remark', label: '备注', type: 'textarea' }
    ]
  },

  tenderNotice: {
    title: '招标公告',
    baseUrl: '/tender-notice',
    keywordPlaceholder: '按公告标题 / 招标编号 / 采购人查询',
    searchFields: ['noticeTitle', 'tenderNo', 'purchaser', 'agency', 'province', 'city'],
    columns: [
      { prop: 'id', label: 'ID', width: 90 },
      { prop: 'noticeTitle', label: '公告标题', minWidth: 280 },
      { prop: 'tenderNo', label: '招标编号', minWidth: 150 },
      { prop: 'purchaser', label: '采购人', minWidth: 160 },
      { prop: 'budgetAmount', label: '预算金额', width: 130, type: 'money' },
      { prop: 'province', label: '省份', width: 90 },
      { prop: 'city', label: '城市', width: 90 },
      { prop: 'publishDate', label: '发布日期', width: 120 },
      { prop: 'deadline', label: '截止时间', width: 170 },
      { prop: 'status', label: '状态', width: 100, type: 'status', map: tenderStatusMap }
    ],
    formWidth: '900px',
    formFields: [
      { prop: 'sourceId', label: '数据源', type: 'select', optionSource: tenderSourceOptionSource },
      { prop: 'sourceCode', label: '数据源编码' },
      { prop: 'noticeTitle', label: '公告标题', required: true },
      { prop: 'tenderNo', label: '招标编号' },
      { prop: 'purchaser', label: '招标方/采购人' },
      { prop: 'agency', label: '代理机构' },
      { prop: 'budgetAmount', label: '预算金额', type: 'number' },
      { prop: 'province', label: '省份' },
      { prop: 'city', label: '城市' },
      { prop: 'district', label: '区县' },
      { prop: 'industry', label: '行业分类' },
      { prop: 'noticeType', label: '公告类型' },
      { prop: 'tenderScope', label: '招标范围', type: 'textarea' },
      { prop: 'qualificationRequirements', label: '资质要求', type: 'textarea' },
      { prop: 'publishDate', label: '发布日期', type: 'date' },
      { prop: 'deadline', label: '截止时间', type: 'datetime' },
      { prop: 'openBidTime', label: '开标时间', type: 'datetime' },
      { prop: 'sourceUrl', label: '原文链接' },
      { prop: 'contentText', label: '正文文本', type: 'textarea', rows: 8 },
      { prop: 'contentHash', label: '内容Hash', required: true },
      { prop: 'status', label: '状态', default: 'new' }
    ]
  },

  tenderReport: {
    title: '一键报备',
    baseUrl: '/tender-report',
    keywordPlaceholder: '按报备编号 / 项目名称查询',
    searchFields: ['reportNo', 'projectName', 'approvalStatus', 'materialStatus'],
    columns: [
      { prop: 'id', label: 'ID', width: 90 },
      { prop: 'reportNo', label: '报备编号', minWidth: 160 },
      { prop: 'tenderNoticeId', label: '公告ID', width: 100 },
      { prop: 'projectName', label: '项目名称', minWidth: 260 },
      { prop: 'approvalStatus', label: '审批状态', width: 110, type: 'status', map: approvalStatusMap },
      { prop: 'approvalTime', label: '审批时间', width: 170 },
      { prop: 'smsNotifyStatus', label: '短信', width: 90 },
      { prop: 'materialStatus', label: '资料状态', width: 100 },
      { prop: 'createTime', label: '创建时间', width: 170 }
    ],
    formFields: [
      { prop: 'reportNo', label: '报备编号', required: true },
      { prop: 'tenderNoticeId', label: '招标公告ID', type: 'number', required: true },
      { prop: 'enterpriseId', label: '报备企业', type: 'select', optionSource: enterpriseOptionSource },
      { prop: 'userId', label: '报备人', hidden: true, defaultFromCurrentUser: 'id' },
      { prop: 'projectName', label: '报备项目名称', required: true },
      { prop: 'reportReason', label: '报备说明', type: 'textarea' },
      { prop: 'oaInstanceId', label: 'OA实例ID' },
      { prop: 'oaFormId', label: 'OA表单ID' },
      { prop: 'approvalStatus', label: '审批状态', default: 'draft' },
      { prop: 'smsNotifyStatus', label: '短信通知状态', default: 'none' },
      { prop: 'materialStatus', label: '资料状态', default: 'none' }
    ]
  },

  knowledgeBase: {
    title: '知识库',
    baseUrl: '/knowledge-base',
    keywordPlaceholder: '按知识库名称 / 类型查询',
    searchFields: ['kbName', 'kbType', 'description'],
    columns: [
      { prop: 'id', label: 'ID', width: 90 },
      { prop: 'kbName', label: '知识库名称', minWidth: 200 },
      { prop: 'kbType', label: '类型', width: 120 },
      { prop: 'description', label: '描述', minWidth: 220 },
      { prop: 'status', label: '状态', width: 90, type: 'status', map: enableMap },
      { prop: 'createTime', label: '创建时间', width: 170 }
    ],
    formFields: [
      { prop: 'enterpriseId', label: '所属企业', type: 'select', optionSource: enterpriseOptionSource },
      { prop: 'kbName', label: '知识库名称', required: true },
      { prop: 'kbType', label: '知识库类型', type: 'select', default: 'bid', options: [
        { label: '标书知识库', value: 'bid' },
        { label: '企业资料库', value: 'enterprise' },
        { label: '行业资料库', value: 'industry' },
        { label: '通用资料库', value: 'common' }
      ] },
      { prop: 'description', label: '描述', type: 'textarea' },
      { prop: 'status', label: '状态', type: 'select', default: 1, options: [{ label: '正常', value: 1 }, { label: '停用', value: 0 }] }
    ]
  },

  knowledgeFile: {
    title: '知识库文件',
    baseUrl: '/knowledge-file',
    keywordPlaceholder: '按文件名 / 解析状态查询',
    searchFields: ['originalName', 'parseStatus', 'fileExt'],
    columns: [
      { prop: 'id', label: 'ID', width: 90 },
      { prop: 'knowledgeBaseId', label: '所属知识库', width: 160, type: 'optionLabel', optionSource: knowledgeBaseOptionSource },
      { prop: 'originalName', label: '文件名', minWidth: 220 },
      { prop: 'fileExt', label: '扩展名', width: 90 },
      { prop: 'parseStatus', label: '解析状态', width: 110 },
      { prop: 'chunkCount', label: '切片数', width: 90 },
      { prop: 'createTime', label: '创建时间', width: 170 }
    ],
    formFields: [
      { prop: 'knowledgeBaseId', label: '所属知识库', type: 'select', required: true, optionSource: knowledgeBaseOptionSource },
      { prop: 'fileId', label: '知识库文件', type: 'fileUpload', required: true, moduleType: 'knowledge_base', tip: '上传成功后会把文件资源ID写入 fileId；正常用户建议在“知识库”页面内给指定知识库添加文件。' },
      { prop: 'originalName', label: '原始文件名' },
      { prop: 'fileExt', label: '扩展名' },
      { prop: 'parseStatus', label: '解析状态', default: 'pending' },
      { prop: 'chunkCount', label: '切片数', type: 'number' },
      { prop: 'parseError', label: '解析错误', type: 'textarea' }
    ]
  },

  fileResource: {
    title: '文件资源',
    baseUrl: '/file-resource',
    readonly: true,
    keywordPlaceholder: '按原始文件名 / 模块 / 扩展名查询',
    searchFields: ['originalName', 'moduleType', 'fileExt', 'storageType'],
    columns: [
      { prop: 'id', label: 'ID', width: 90 },
      { prop: 'moduleType', label: '模块', width: 130 },
      { prop: 'bizId', label: '业务ID', width: 100 },
      { prop: 'originalName', label: '原始文件名', minWidth: 220 },
      { prop: 'fileExt', label: '扩展名', width: 90 },
      { prop: 'fileSize', label: '大小', width: 120, type: 'fileSize' },
      { prop: 'storageType', label: '存储', width: 100 },
      { prop: 'fileUrl', label: '访问地址', minWidth: 220, type: 'link' },
      { prop: 'createTime', label: '创建时间', width: 170 }
    ],
    formFields: []
  },

  systemConfig: {
    title: '系统配置',
    baseUrl: '/system-config',
    keywordPlaceholder: '按配置键 / 分组查询',
    searchFields: ['configKey', 'configGroup', 'remark'],
    columns: [
      { prop: 'id', label: 'ID', width: 90 },
      { prop: 'configKey', label: '配置键', minWidth: 180 },
      { prop: 'configGroup', label: '分组', width: 120 },
      { prop: 'valueType', label: '值类型', width: 100 },
      { prop: 'encrypted', label: '加密', width: 90, type: 'status', map: { 1: ['是', 'danger'], 0: ['否', 'info'] } },
      { prop: 'remark', label: '备注', minWidth: 180 }
    ],
    formFields: [
      { prop: 'configKey', label: '配置键', required: true },
      { prop: 'configValue', label: '配置值', type: 'textarea' },
      { prop: 'configGroup', label: '配置分组' },
      { prop: 'valueType', label: '值类型', default: 'string' },
      { prop: 'encrypted', label: '是否加密', type: 'select', default: 0, options: [{ label: '是', value: 1 }, { label: '否', value: 0 }] },
      { prop: 'remark', label: '备注', type: 'textarea' }
    ]
  },

  dictType: {
    title: '字典类型',
    baseUrl: '/dict-type',
    keywordPlaceholder: '按字典名称 / 编码查询',
    searchFields: ['dictCode', 'dictName'],
    columns: [
      { prop: 'id', label: 'ID', width: 90 },
      { prop: 'dictName', label: '字典名称', minWidth: 160 },
      { prop: 'dictCode', label: '字典编码', minWidth: 160 },
      { prop: 'status', label: '状态', width: 90, type: 'status', map: enableMap },
      { prop: 'remark', label: '备注', minWidth: 180 }
    ],
    formFields: [
      { prop: 'dictName', label: '字典名称', required: true },
      { prop: 'dictCode', label: '字典编码', required: true },
      { prop: 'status', label: '状态', type: 'select', default: 1, options: [{ label: '正常', value: 1 }, { label: '停用', value: 0 }] },
      { prop: 'remark', label: '备注', type: 'textarea' }
    ]
  },

  dictData: {
    title: '字典数据',
    baseUrl: '/dict-data',
    keywordPlaceholder: '按字典编码 / 标签 / 值查询',
    searchFields: ['dictCode', 'dataLabel', 'dataValue'],
    columns: [
      { prop: 'id', label: 'ID', width: 90 },
      { prop: 'dictCode', label: '字典编码', minWidth: 150 },
      { prop: 'dataLabel', label: '字典标签', minWidth: 150 },
      { prop: 'dataValue', label: '字典值', minWidth: 150 },
      { prop: 'sortNo', label: '排序', width: 90 },
      { prop: 'status', label: '状态', width: 90, type: 'status', map: enableMap }
    ],
    formFields: [
      { prop: 'dictCode', label: '字典编码', required: true },
      { prop: 'dataLabel', label: '字典标签', required: true },
      { prop: 'dataValue', label: '字典值', required: true },
      { prop: 'sortNo', label: '排序', type: 'number', default: 0 },
      { prop: 'status', label: '状态', type: 'select', default: 1, options: [{ label: '正常', value: 1 }, { label: '停用', value: 0 }] },
      { prop: 'remark', label: '备注', type: 'textarea' }
    ]
  }
}
