import { createRouter, createWebHistory } from 'vue-router'
import { getToken } from '@/utils/storage'

const AdminLayout = () => import('@/layout/AdminLayout.vue')
const Login = () => import('@/views/login/index.vue')
const Dashboard = () => import('@/views/dashboard/index.vue')
const GenericCrudView = () => import('@/views/common/GenericCrudView.vue')
const BidProject = () => import('@/views/bid/project/index.vue')
const AiWorkbench = () => import('@/views/ai/workbench/index.vue')
const UserManage = () => import('@/views/system/user/index.vue')
const EnterpriseManage = () => import('@/views/system/enterprise/index.vue')
const FileResourceManage = () => import('@/views/system/file/index.vue')
const KnowledgeBase = () => import('@/views/knowledge/base/index.vue')

const routes = [
  { path: '/login', component: Login, meta: { title: '登录', public: true } },
  {
    path: '/',
    component: AdminLayout,
    redirect: '/dashboard',
    children: [
      { path: 'dashboard', component: Dashboard, meta: { title: '工作台' } },

      { path: 'bid/projects', component: BidProject, meta: { title: '标书项目' } },
      { path: 'bid/templates', component: GenericCrudView, meta: { title: '标书模板', configKey: 'bidTemplate' } },
      { path: 'bid/template-variables', component: GenericCrudView, meta: { title: '模板变量', configKey: 'templateVariable' } },

      { path: 'ai/workbench', component: AiWorkbench, meta: { title: 'AI生成工作台' } },
      { path: 'ai/prompts', component: GenericCrudView, meta: { title: 'Prompt模板', configKey: 'promptTemplate' } },
      { path: 'ai/models', component: GenericCrudView, meta: { title: '模型配置', configKey: 'aiModel' } },
      { path: 'ai/tasks', component: GenericCrudView, meta: { title: '生成任务', configKey: 'aiTask' } },
      { path: 'ai/results', component: GenericCrudView, meta: { title: '生成结果', configKey: 'aiResult' } },
      { path: 'ai/exports', component: GenericCrudView, meta: { title: '导出记录', configKey: 'documentExport' } },

      { path: 'tender/sources', component: GenericCrudView, meta: { title: '招标数据源', configKey: 'tenderSource' } },
      { path: 'tender/notices', component: GenericCrudView, meta: { title: '招标公告', configKey: 'tenderNotice' } },
      { path: 'tender/reports', component: GenericCrudView, meta: { title: '一键报备', configKey: 'tenderReport' } },

      { path: 'knowledge/bases', component: KnowledgeBase, meta: { title: '知识库' } },
      { path: 'knowledge/files', component: GenericCrudView, meta: { title: '知识库文件', configKey: 'knowledgeFile' } },

      { path: 'system/users', component: UserManage, meta: { title: '用户管理' } },
      { path: 'system/roles', component: GenericCrudView, meta: { title: '角色管理', configKey: 'role' } },
      { path: 'system/menus', component: GenericCrudView, meta: { title: '菜单管理', configKey: 'menu' } },
      { path: 'system/enterprises', component: EnterpriseManage, meta: { title: '企业管理' } },
      { path: 'system/enterprise-profile', component: EnterpriseManage, meta: { title: '企业资料', currentOnly: true } },
      { path: 'system/files', component: FileResourceManage, meta: { title: '文件资源' } },
      { path: 'system/configs', component: GenericCrudView, meta: { title: '系统配置', configKey: 'systemConfig' } },
      { path: 'system/dict-types', component: GenericCrudView, meta: { title: '字典类型', configKey: 'dictType' } },
      { path: 'system/dict-data', component: GenericCrudView, meta: { title: '字典数据', configKey: 'dictData' } }
    ]
  },
  { path: '/:pathMatch(.*)*', redirect: '/dashboard' }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

router.beforeEach((to) => {
  if (to.meta.public) return true
  if (!getToken()) return `/login?redirect=${encodeURIComponent(to.fullPath)}`
  return true
})

export default router