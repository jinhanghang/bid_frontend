import { createRouter, createWebHistory } from 'vue-router'
import { clearAuthStorage, getToken } from '@/utils/storage'
import { useAuthStore } from '@/stores/auth'

const AdminLayout = () => import('@/layout/AdminLayout.vue')
const Login = () => import('@/views/login/index.vue')
const Dashboard = () => import('@/views/dashboard/index.vue')
const GenericCrudView = () => import('@/views/common/GenericCrudView.vue')
const BidProject = () => import('@/views/bid/project/chat.vue')
const BidProjectLegacy = () => import('@/views/bid/project/index.vue')
const TemplateVariableManage = () => import('@/views/bid/templateVariables/index.vue')
const CompanyMaterialManage = () => import('@/views/bid/companyMaterials/index.vue')
const MaterialLibraryLayout = () => import('@/views/material/MaterialLibraryLayout.vue')
const ImageLibraryManage = () => import('@/views/material/image/index.vue')
const AiDocument = () => import('@/views/ai/documents/chat.vue')
const AiTasks = () => import('@/views/ai/tasks/index.vue')
const DownloadCenter = () => import('@/views/download/index.vue')
const RecycleBin = () => import('@/views/recycle/index.vue')
const UserManage = () => import('@/views/system/user/index.vue')
const EnterpriseManage = () => import('@/views/system/enterprise/index.vue')
const EnterpriseApply = () => import('@/views/system/enterpriseApply/index.vue')
const KnowledgeBase = () => import('@/views/knowledge/base/index.vue')
const NoticeManage = () => import('@/views/tender/notice/index.vue')
const MemberCenter = () => import('@/views/member/center/index.vue')
const MemberAdmin = () => import('@/views/member/admin/index.vue')

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
      { path: 'ai-bid/workbench', component: BidProjectLegacy, meta: { title: 'AI标书专业工作台', requiresBusiness: true } },
      {
        path: 'materials',
        component: MaterialLibraryLayout,
        redirect: '/materials/company',
        meta: { title: '资料库', requiresBusiness: true },
        children: [
          { path: 'company', component: CompanyMaterialManage, meta: { title: '企业资料', requiresBusiness: true } },
          { path: 'images', component: ImageLibraryManage, meta: { title: '图片库', requiresBusiness: true } },
          { path: 'knowledge', component: KnowledgeBase, meta: { title: '知识库', requiresBusiness: true } }
        ]
      },
      { path: 'download-center', component: DownloadCenter, meta: { title: '下载中心', requiresBusiness: true } },
      { path: 'recycle-bin', component: RecycleBin, meta: { title: '回收站', requiresBusiness: true } },
      { path: 'member-center', component: MemberCenter, meta: { title: '会员中心' } },
      { path: 'member/admin', component: MemberAdmin, meta: { title: '会员运营', roles: [ROLE_SUPER_ADMIN, ROLE_PLATFORM_ADMIN] } },

      { path: 'bid/projects', redirect: '/ai-bid' },
      { path: 'bid/template-variables', component: TemplateVariableManage, meta: { title: '模板变量', roles: [ROLE_SUPER_ADMIN, ROLE_PLATFORM_ADMIN, ROLE_ENTERPRISE_ADMIN] } },
      { path: 'bid/company-materials', redirect: '/materials/company' },

      { path: 'ai/solutions', redirect: '/ai-bid' },
      { path: 'ai/documents', component: AiDocument, meta: { title: 'AI文档生成', requiresBusiness: true } },
      { path: 'ai/tasks', component: AiTasks, meta: { title: 'AI任务中心' } },
      { path: 'ai/models', component: GenericCrudView, meta: { title: '模型配置', configKey: 'aiModel', roles: [ROLE_SUPER_ADMIN] } },
      { path: 'ai/exports', redirect: '/download-center' },

      { path: 'tender/notice', component: NoticeManage, meta: { title: '标讯商机',  requiresBusiness: true } },

      { path: 'knowledge/bases', redirect: '/materials/knowledge' },
      { path: 'knowledge/files', component: GenericCrudView, meta: { title: '知识库文件', configKey: 'knowledgeFile', requiresBusiness: true } },

      { path: 'system/users', component: UserManage, meta: { title: '用户管理', roles: [ROLE_SUPER_ADMIN, ROLE_PLATFORM_ADMIN, ROLE_ENTERPRISE_ADMIN] } },
      { path: 'system/roles', component: GenericCrudView, meta: { title: '角色管理', configKey: 'role', roles: [ROLE_SUPER_ADMIN] } },
      { path: 'system/menus', component: GenericCrudView, meta: { title: '菜单管理', configKey: 'menu', roles: [ROLE_SUPER_ADMIN] } },
      { path: 'system/enterprises', component: EnterpriseManage, meta: { title: '企业管理', roles: [ROLE_SUPER_ADMIN, ROLE_PLATFORM_ADMIN] } },
      { path: 'system/enterprise-profile', component: EnterpriseManage, meta: { title: '企业资料', currentOnly: true, roles: [ROLE_ENTERPRISE_ADMIN] } },
      { path: 'system/enterprise-apply', component: EnterpriseApply, meta: { title: '企业申请' } },
      { path: 'system/enterprise-apply-audit', component: EnterpriseApply, meta: { title: '公司审批', audit: true, roles: [ROLE_SUPER_ADMIN, ROLE_PLATFORM_ADMIN, ROLE_ENTERPRISE_ADMIN] } },
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
    return { path: '/login', query: { redirect: to.fullPath } }
  }

  const auth = useAuthStore()
  if (!auth.user?.id) {
    try {
      await auth.loadMe()
    } catch (e) {
      clearAuthStorage()
      auth.token = ''
      auth.user = null
      auth.menus = []
      auth.permissions = []
      return { path: '/login', query: { expired: '1', redirect: to.fullPath } }
    }
  }

  const roleCodes = normalizeRoleList(auth.user?.roles || auth.user?.roleCodes || [])
  const isSuperAdmin = roleCodes.includes(ROLE_SUPER_ADMIN)
  const isPlatformAdmin = roleCodes.includes(ROLE_PLATFORM_ADMIN)

  if (Array.isArray(to.meta.roles) && to.meta.roles.length > 0) {
    const allowRoles = to.meta.roles.map(normalizeRoleCode)
    if (!roleCodes.some((roleCode) => allowRoles.includes(roleCode))) {
      return '/dashboard'
    }
  }

  // 平台管理员负责企业审核，不要求绑定企业；其余人员必须先完成企业申请并审核通过。
  const enterpriseWhiteList = ['/system/enterprise-apply']
  const enterpriseStatus = String(auth.enterpriseAccessStatus || '').trim().toUpperCase()
  const needsEnterprise = !isSuperAdmin && !isPlatformAdmin && (
    !auth.enterpriseId
    || auth.needCompleteEnterprise
    || enterpriseStatus === 'UNBOUND'
    || enterpriseStatus === 'DISABLED'
  )
  if (needsEnterprise && !enterpriseWhiteList.includes(to.path)) {
    return { path: '/system/enterprise-apply', query: { required: '1' } }
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
