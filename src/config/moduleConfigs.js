import { enableMap } from '@/config/statusMaps'

const knowledgeBaseOptionSource = { baseUrl: '/knowledge-base', label: 'kbName', value: 'id', key: 'knowledgeBase' }

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

  systemConfig: {
    title: '系统配置',
    baseUrl: '/sys-config',
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
    baseUrl: '/sys-dict-type',
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
    baseUrl: '/sys-dict-data',
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
