import { createRouter, createWebHistory } from 'vue-router'
import { getToken } from '@/utils/storage'
import { useAuthStore } from '@/stores/auth'

const AdminLayout = () => import('@/layout/AdminLayout.vue')
const Login = () => import('@/views/login/index.vue')
const Dashboard = () => import('@/views/dashboard/index.vue')
const GenericCrudView = () => import('@/views/common/GenericCrudView.vue')
const BidProject = () => import('@/views/bid/project/index.vue')
const BidTemplateManage = () => import('@/views/bid/templates/index.vue')
const TemplateVariableManage = () => import('@/views/bid/templateVariables/index.vue')
const CompanyMaterialManage = () => import('@/views/bid/companyMaterials/index.vue')
const AiWorkbench = () => import('@/views/ai/workbench/index.vue')
const AiSolution = () => import('@/views/ai/solutions/index.vue')
const AiPromptManage = () => import('@/views/ai/prompts/index.vue')
const AiTaskManage = () => import('@/views/ai/tasks/index.vue')
const AiResultManage = () => import('@/views/ai/results/index.vue')
const DownloadCenter = () => import('@/views/download/index.vue')
const RecycleBin = () => import('@/views/recycle/index.vue')
const UserManage = () => import('@/views/system/user/index.vue')
const EnterpriseManage = () => import('@/views/system/enterprise/index.vue')
const EnterpriseApply = () => import('@/views/system/enterpriseApply/index.vue')
const FileResourceManage = () => import('@/views/system/file/index.vue')
const KnowledgeBase = () => import('@/views/knowledge/base/index.vue')
const ProductPlaceholder = () => import('@/views/common/ProductPlaceholder.vue')

const ROLE_SUPER_ADMIN = 'SUPERADMIN'
const ROLE_PLATFORM_ADMIN = 'PLATFORMADMIN'
const ROLE_ENTERPRISE_ADMIN = 'ENTERPRISEADMIN'
const ROLE_NORMAL_USER = 'NORMALUSER'

const routes = [
  { path: '/login', component: Login, meta: { title: '登录', public: true } },
  {
    path: '/',
    component: AdminLayout,
    redirect: '/dashboard',
    children: [
      { path: 'dashboard', component: Dashboard, meta: { title: '首页' } },
      { path: 'ai-bid', component: BidProject, meta: { title: 'AI标书', requiresBusiness: true } },
      { path: 'ai-quality', component: ProductPlaceholder, meta: { title: 'AI质检', productName: 'AI质检', productDesc: '用于检查投标文件响应完整性、废标风险、格式规范和评分项覆盖情况。' } },
      { path: 'solution-duplicate', component: ProductPlaceholder, meta: { title: '方案查重', productName: '方案查重', productDesc: '用于检查方案重复率、相似片段和可降重内容。' } },
      { path: 'materials', component: CompanyMaterialManage, meta: { title: '资料库', requiresBusiness: true } },
      { path: 'download-center', component: DownloadCenter, meta: { title: '下载中心', requiresBusiness: true } },
      { path: 'recycle-bin', component: RecycleBin, meta: { title: '回收站', requiresBusiness: true } },

      { path: 'bid/projects', redirect: '/ai-bid' },
      { path: 'bid/templates', component: BidTemplateManage, meta: { title: '标书模板', roles: [ROLE_SUPER_ADMIN, ROLE_PLATFORM_ADMIN, ROLE_ENTERPRISE_ADMIN] } },
      { path: 'bid/template-variables', component: TemplateVariableManage, meta: { title: '模板变量', roles: [ROLE_SUPER_ADMIN, ROLE_PLATFORM_ADMIN, ROLE_ENTERPRISE_ADMIN] } },
      { path: 'bid/company-materials', component: CompanyMaterialManage, meta: { title: '资料库', requiresBusiness: true } },

      { path: 'ai/workbench', component: AiWorkbench, meta: { title: 'AI生成工作台', requiresBusiness: true } },
      { path: 'ai/solutions', component: AiSolution, meta: { title: 'AI方案', requiresBusiness: true } },
      { path: 'ai/prompts', component: AiPromptManage, meta: { title: 'Prompt模板', roles: [ROLE_SUPER_ADMIN, ROLE_PLATFORM_ADMIN] } },
      { path: 'ai/models', component: GenericCrudView, meta: { title: '模型配置', configKey: 'aiModel', roles: [ROLE_SUPER_ADMIN] } },
      { path: 'ai/tasks', component: AiTaskManage, meta: { title: '生成任务', requiresBusiness: true } },
      { path: 'ai/results', component: AiResultManage, meta: { title: '生成结果', requiresBusiness: true } },
      { path: 'ai/exports', redirect: '/download-center' },

      { path: 'tender/sources', component: GenericCrudView, meta: { title: '招标数据源', configKey: 'tenderSource', requiresBusiness: true } },
      { path: 'tender/notices', component: GenericCrudView, meta: { title: '标讯商机', configKey: 'tenderNotice', requiresBusiness: true } },
      { path: 'tender/reports', component: GenericCrudView, meta: { title: '一键报备', configKey: 'tenderReport', requiresBusiness: true } },

      { path: 'knowledge/bases', component: KnowledgeBase, meta: { title: '知识库', requiresBusiness: true } },
      { path: 'knowledge/files', component: GenericCrudView, meta: { title: '知识库文件', configKey: 'knowledgeFile', requiresBusiness: true } },

      { path: 'system/users', component: UserManage, meta: { title: '用户管理', roles: [ROLE_SUPER_ADMIN, ROLE_PLATFORM_ADMIN, ROLE_ENTERPRISE_ADMIN] } },
      { path: 'system/roles', component: GenericCrudView, meta: { title: '角色管理', configKey: 'role', roles: [ROLE_SUPER_ADMIN] } },
      { path: 'system/menus', component: GenericCrudView, meta: { title: '菜单管理', configKey: 'menu', roles: [ROLE_SUPER_ADMIN] } },
      { path: 'system/enterprises', component: EnterpriseManage, meta: { title: '企业管理', roles: [ROLE_SUPER_ADMIN, ROLE_PLATFORM_ADMIN] } },
      { path: 'system/enterprise-profile', component: EnterpriseManage, meta: { title: '企业资料', currentOnly: true, roles: [ROLE_ENTERPRISE_ADMIN] } },
      { path: 'system/enterprise-apply', component: EnterpriseApply, meta: { title: '企业申请' } },
      { path: 'system/enterprise-apply-audit', component: EnterpriseApply, meta: { title: '企业申请审核', audit: true, roles: [ROLE_SUPER_ADMIN, ROLE_PLATFORM_ADMIN, ROLE_ENTERPRISE_ADMIN] } },
      { path: 'system/files', component: FileResourceManage, meta: { title: '文件资源', roles: [ROLE_SUPER_ADMIN] } },
      { path: 'system/configs', component: GenericCrudView, meta: { title: '系统配置', configKey: 'systemConfig', roles: [ROLE_SUPER_ADMIN] } },
      { path: 'system/dict-types', component: GenericCrudView, meta: { title: '字典类型', configKey: 'dictType', roles: [ROLE_SUPER_ADMIN] } },
      { path: 'system/dict-data', component: GenericCrudView, meta: { title: '字典数据', configKey: 'dictData', roles: [ROLE_SUPER_ADMIN] } }
    ]
  },
  { path: '/:pathMatch(.*)*', redirect: '/dashboard' }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

router.beforeEach(async (to) => {
  if (to.meta.public) return true

  if (!getToken()) {
    return `/login?redirect=${encodeURIComponent(to.fullPath)}`
  }

  const auth = useAuthStore()
  if (!auth.user?.id) {
    try {
      await auth.loadMe()
    } catch (e) {
      return `/login?redirect=${encodeURIComponent(to.fullPath)}`
    }
  }

  const roleCodes = normalizeRoleList(auth.user?.roles || auth.user?.roleCodes || [])
  const isSuperAdmin = roleCodes.includes(ROLE_SUPER_ADMIN)
  const isPlatformAdmin = roleCodes.includes(ROLE_PLATFORM_ADMIN)
  const hasPlatformBusinessScope = isSuperAdmin || isPlatformAdmin
  const hasEnterprise = Boolean(auth.user?.enterpriseId)

  if (Array.isArray(to.meta.roles) && to.meta.roles.length > 0) {
    const allowRoles = to.meta.roles.map(normalizeRoleCode)
    if (!roleCodes.some((roleCode) => allowRoles.includes(roleCode))) {
      return '/dashboard'
    }
  }

  if (to.meta.requiresBusiness && !hasPlatformBusinessScope && !hasEnterprise) {
    return '/dashboard'
  }

  return true
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
  
export default router
