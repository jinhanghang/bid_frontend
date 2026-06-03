# AI项目前端上下文说明（给 ChatGPT / 开发助手优先阅读）

> 目的：以后每次上传前端项目后，先阅读本文件，快速了解前端技术栈、路由、接口封装、页面交互约定和与后端的对接边界，避免把已经确认过的交互和权限规则改丢。  
> 本文件参考后端 `AI_PROJECT_CONTEXT.md`，并按当前最新 `ai_bid_docker.zip`、前端代码和用户提供的 Git 提交日志截图重新校准。校准日期：2026-05-29。
> 最新口径：`/prompt-template` 模块已删除；大数据列表/左侧列表必须首屏小分页、滚动追加或底部分页；企业下拉不得全量加载，必须远程分页搜索；AI方案、AI文档、AI标书技术方案导出优先走异步导出任务；SSE/轮询需要支持取消、退避和页面隐藏暂停。

---

## 0. 2026-05-29 当前前端核对与本次修正

本节优先级高于后面旧说明。后续继续改前端时，先按本节判断当前状态。

### 0.1 已核对到的当前前端状态

- `src/layout/AdminLayout.vue` 当前右上角下拉入口已使用“用户管理”，不是“管理后台/后台管理”。
- `AdminLayout.vue` 中 `showMemberAdminEntry` 只允许超级管理员、平台管理员显示“会员运营”；企业管理员不显示“会员运营”。
- `src/views/member/admin/index.vue` 的“用户额度”页签已使用 `PageFooterPager` 和 `accountPager`，不再固定 `current:1,size:100` 查询用户额度。
- 资料库 `src/views/bid/companyMaterials/index.vue` 已改为左侧列表首屏 20 条、滚动追加下一页、上一页数据保留。
- 资料库已改为调用 `/enterprise/page` 做企业筛选分页查询，不再用 `/enterprise/list?status=1` 全量加载企业。
- AI标书项目左侧列表已使用 `projectPager.size=20`，首屏 20 条并支持滚动追加。
- 知识库左侧列表已使用 `basePager.size=20`，首屏 20 条并支持滚动追加。

### 0.2 本次前端补齐修正

- 资料库页面模板中已绑定 `remoteSearchEnterprises`、`onEnterpriseVisibleChange`，但当前代码缺少对应函数；本次已补齐，否则企业下拉远程搜索会报未定义。
- 资料库新建/编辑表单里的“所属企业”选择也改成远程分页搜索，并在选中/编辑资料详情后补齐当前企业选项，避免只加载前 20 条时下拉无法显示当前企业名称。
- AI标书“新建项目”的企业选择从 `/enterprise/list` 改为 `/enterprise/page`，首屏 20 条，支持远程搜索；项目负责人候选用户从 200 条收口为 50 条。
- 知识库“新建/编辑知识库”的企业选择从 `/enterprise/list` 改为 `/enterprise/page`，首屏 20 条，支持远程搜索；知识库文件单次查询从 200 条收口为 50 条。

### 0.3 前端禁止回退项

- 不要在页面初始化时调用 `/enterprise/list?status=1` 加载全部企业。企业选择统一远程分页搜索。
- 不要把资料库、AI标书、知识库左侧列表改回一次性拉 50/100/200 条甚至全量。
- 不要在资料库页面进入时默认打开第一条资料；保持先展示空态/引导，让用户自行选择。
- 不要把“用户管理”文案改回“管理后台”或“后台管理”。
- 不要让企业管理员看到“会员运营”。
- 模型管理页面不要展示温度、最大 Token 等参数列或字段，除非用户重新确认。

## 1. 项目基本信息

- 项目定位：`ai-bid` 平台前端管理端 / 业务工作台。
- 前端技术栈：Vue 3、Vite、Pinia、Vue Router、Element Plus、Axios。
- 入口文件：`src/main.js`
- 根组件：`src/App.vue`
- 路由文件：`src/router/index.js`
- 布局组件：`src/layout/AdminLayout.vue`
- API Base：`import.meta.env.VITE_API_BASE || '/ai_bid/api'`
- 默认后端接口前缀：`/ai_bid/api`

注意：当前上传包已包含 `package.json`，脚本为 `npm run build` / `npm run dev`，依赖版本仍以项目实际文件为准。

---

## 2. 目录结构

```text
src
├── api                 # 后端接口封装
├── components          # 通用组件
├── config              # 通用 CRUD 页面配置、状态映射
├── layout              # 后台主布局
├── router              # 路由与路由守卫
├── stores              # Pinia 登录态 / 用户态
├── styles              # 全局样式与阿里云风格表格样式
├── utils               # request、storage、format、导出弹窗等工具
└── views               # 业务页面
```

重要文件：

- `src/utils/request.js`：Axios 实例、Token 注入、统一响应解包、错误提示、登录过期处理。
- `src/utils/storage.js`：Token、用户、菜单本地缓存。
- `src/stores/auth.js`：登录态、当前用户、角色编码、权限、菜单。
- `src/router/index.js`：静态路由、角色权限、企业绑定校验。
- `src/layout/AdminLayout.vue`：产品侧栏、顶部用户区、剩余字数、公司审批入口。
- `src/config/moduleConfigs.js`：通用 CRUD 页面配置。
- `src/utils/wordExportDialog.js`：Word/PDF 导出样式配置弹窗。

---

## 3. 全局前端约定

### 3.1 ID 规则

- 后端新增数据主键统一按 UUID 字符串处理。
- 前端禁止对业务 ID 使用 `Number(id)`。
- ID 比较统一使用字符串比较：`String(a) === String(b)`。
- 路由参数、接口参数、表格 `row-key` 均按字符串处理。

### 3.2 请求与响应

- 所有普通 HTTP 请求优先使用 `src/utils/request.js`。
- `request.js` 默认 `baseURL` 为 `VITE_API_BASE`，未配置时为 `/ai_bid/api`。
- 请求拦截器从 `storage` 读取 token，并注入：`Authorization: Bearer <token>`。
- 后端统一返回结构：`{ code, message, data }`。
- 响应拦截器规则：
  - `code === 0`：返回 `data`。
  - `code !== 0`：弹出业务错误，并 reject。
  - 文件流或特殊返回保持原样。
  - `401`：清理登录状态，跳转 `/login`。
  - `403`：默认提示“没有权限访问该功能”。
- 支持 `silentError: true`，用于轮询、徽标数量等不应干扰用户的请求。

### 3.3 AI 错误提示

`request.js` 对 AI 模块错误做了业务化处理：

- AI方案、AI文档、AI标书技术方案的原始模型错误、堆栈、超长异常，前端统一显示：`AI任务执行失败，请稍后重试或检查模型配置/额度`。
- Word/PDF 导出不是普通 AI 生成任务，不能被统一替换成 AI 任务失败。
- PDF 导出失败时统一显示：`PDF导出失败，请联系管理员查看导出日志`。

### 3.4 长耗时请求

- AI生成、解析、导出属于长耗时接口。
- 相关 API 中使用 `timeout: 0` 的请求不能随意改回默认超时。
- AI方案、AI标书技术方案的单章节生成和 AI帮写方向使用 `fetch + ReadableStream` 处理 SSE。
- SSE 请求必须支持 `AbortController.signal`，页面离开、重新生成、关闭弹窗或任务完成时要主动取消 reader。
- SSE 事件约定：
  - `event: message`：正文增量。
  - `event: error`：错误。
  - `event: done`：后端完成；前端会取消 reader 并触发完成回调。
- Word/PDF 导出优先使用异步导出任务接口，前端轮询导出状态，成功后通过文件资源 ID 下载。
- 轮询请求应使用 `silentError: true`，避免任务状态查询失败时频繁弹窗干扰用户。

### 3.5 UI 风格

- Element Plus 作为基础组件库。
- 管理端整体为左侧窄侧栏 + 顶部用户区 + 内容区布局。
- 列表页统一使用 toolbar、card、`ui-table`、底部分页。
- 表格表头不换行，由 `src/styles/theme-aliyun.css` 统一控制。
- 搜索默认只保留一个 `keyword` 模糊搜索，输入后防抖筛选，不要轻易增加复杂筛选项。
- 图片/附件预览统一使用 Element Plus `<el-image>`，应开启：
  - `:preview-teleported="true"`
  - `:z-index="3000"` 或同等级高层级
  - 正确传入 `:preview-src-list`
  - 正确传入 `:initial-index`

### 3.6 高并发前端交互约定

- 全文生成、重编全文、解析、导出按钮必须做防重复点击，提交后立即进入 loading/disabled 状态。
- 全文生成和重编全文请求体需要传 `requestId`，由 `src/utils/requestId.js` 生成或复用，配合后端幂等。
- 轮询统一遵循：页面隐藏暂停、页面恢复继续、失败退避、任务完成停止、组件卸载清理定时器。
- 运行中任务不要每轮刷新完整列表，只查任务详情；完成后再刷新详情或列表。
- 页面切换回来后，要根据后端任务详情恢复状态，不能只依赖前端内存状态。
- 导出任务状态以 `pending / running / success / failed / file_deleted` 为主要口径，成功后通过 `fileId` 下载。
- 任务不存在、任务已清理、文件已删除等情况应做业务化提示或静默清理，不能把后端内部异常原样展示给用户。

---

## 4. 登录态、角色与路由权限

### 4.1 当前角色编码

路由和布局统一使用规范化后的角色编码：

- `SUPERADMIN`：超级管理员
- `PLATFORMADMIN`：平台管理员
- `ENTERPRISEADMIN`：企业管理员
- `NORMALUSER`：普通用户

规范化函数会处理大小写、`ROLE_` 前缀和特殊字符。新增角色判断时应复用同一口径，不要直接用后端原始字符串做脆弱判断。

### 4.2 登录态处理

- 登录接口在 `src/api/auth.js`。
- Pinia Store：`src/stores/auth.js`。
- 登录成功后保存：token、user、permissions、menus。
- 刷新页面时先从 localStorage 恢复，再按需调用 `/auth/me`。
- 退出登录即使后端失败，也必须清理前端本地登录状态。

### 4.3 路由守卫

`src/router/index.js` 路由守卫规则：

- `meta.public` 页面无需登录，目前主要是 `/login`。
- 未登录访问业务页，跳转 `/login?redirect=<fullPath>`。
- 无用户信息时调用 `auth.loadMe()`。
- `meta.roles` 存在时，当前用户角色需命中任一允许角色。
- `meta.requiresBusiness` 存在时，超级管理员/平台管理员可直接访问；其他用户必须有 `enterpriseId`。
- 不满足权限时跳转 `/dashboard`。

---

## 5. 当前路由基线

### 5.1 公共路由

| 路径 | 页面 | 说明 |
|---|---|---|
| `/login` | `views/login/index.vue` | 登录页，public |
| `/dashboard` | `views/dashboard/index.vue` | 首页 |

### 5.2 主业务路由

| 路径 | 页面 | 说明 |
|---|---|---|
| `/ai/solutions` | `views/ai/solutions/index.vue` | AI方案，要求业务身份 |
| `/ai/documents` | `views/ai/documents/index.vue` | AI文档生成，要求业务身份 |
| `/ai-bid` | `views/bid/project/index.vue` | AI标书，要求业务身份 |
| `/knowledge/bases` | `views/knowledge/base/index.vue` | 知识库，要求业务身份 |
| `/materials` | `views/bid/companyMaterials/index.vue` | 资料库，要求业务身份 |
| `/tender/notice` | `views/tender/notice/index.vue` | 标讯商机，要求业务身份 |
| `/download-center` | `views/download/index.vue` | 下载中心，要求业务身份 |
| `/recycle-bin` | `views/recycle/index.vue` | 回收站，要求业务身份 |
| `/member-center` | `views/member/center/index.vue` | 会员中心 |

### 5.3 管理路由

| 路径 | 页面 | 权限 |
|---|---|---|
| `/member/admin` | `views/member/admin/index.vue` | 超级管理员、平台管理员 |
| `/bid/template-variables` | `views/bid/templateVariables/index.vue` | 超级管理员、平台管理员、企业管理员 |
| `/ai/models` | `views/common/GenericCrudView.vue` + `configKey=aiModel` | 超级管理员 |
| `/knowledge/files` | `views/common/GenericCrudView.vue` + `configKey=knowledgeFile` | 业务身份 |
| `/system/users` | `views/system/user/index.vue` | 超级管理员、平台管理员、企业管理员 |
| `/system/roles` | 通用 CRUD | 超级管理员 |
| `/system/menus` | 通用 CRUD | 超级管理员 |
| `/system/enterprises` | `views/system/enterprise/index.vue` | 超级管理员、平台管理员 |
| `/system/enterprise-profile` | `views/system/enterprise/index.vue` | 企业管理员，仅当前企业 |
| `/system/enterprise-apply` | `views/system/enterpriseApply/index.vue` | 企业申请 |
| `/system/enterprise-apply-audit` | `views/system/enterpriseApply/index.vue` | 公司审批，超级管理员、平台管理员、企业管理员 |
| `/system/configs` | 通用 CRUD | 超级管理员 |
| `/system/dict-types` | 通用 CRUD | 超级管理员 |
| `/system/dict-data` | 通用 CRUD | 超级管理员 |

---

## 6. 布局与导航约定

文件：`src/layout/AdminLayout.vue`

### 6.1 左侧产品菜单

当前固定菜单：

- 首页：`/dashboard`
- AI方案：`/ai/solutions`
- AI文档：`/ai/documents`
- AI标书：`/ai-bid`
- 知识库：`/knowledge/bases`
- 资料库：`/materials`
- 标讯商机：`/tender/notice`
- 下载中心：`/download-center`
- 回收站：`/recycle-bin`

新增主业务页时，应优先判断是否需要进入左侧产品菜单；不要把管理后台入口塞到主产品菜单里。

### 6.2 顶部用户区

顶部显示：

- 当前页面标题。
- 剩余总字数，点击进入会员中心。
- “立即充值”按钮，进入会员中心。
- “刷新用户”按钮，重新拉取 `/auth/me`、额度和审批数量。
- 用户下拉菜单。

### 6.3 公司审批入口

- 超级管理员、平台管理员、企业管理员可见。
- 普通用户不可见。
- 跳转路径：`/system/enterprise-apply-audit`。
- 待审核数量接口：`GET /enterprise-apply/audit-pending-count`。
- 该接口使用 `silentError: true`，失败不打扰用户。

---

## 7. API 文件说明

| 文件 | 对接模块 |
|---|---|
| `api/auth.js` | 登录、短信登录、验证码、注册、忘记密码、修改密码、当前用户 |
| `api/dashboard.js` | 首页统计 |
| `api/file.js` | 文件上传 |
| `api/downloadCenter.js` | 下载中心分页、下载、删除 |
| `api/recycleBin.js` | 回收站分页、恢复、永久删除 |
| `api/aiSolution.js` | AI方案完整工作台、SSE、导出、版本 |
| `api/aiDocument.js` | AI文档类型、工作台、解析、生成、导出 |
| `api/aiModel.js` | AI模型配置 |
| `api/bidProject.js` | AI标书、项目资料、投标文件、技术方案项目包装接口、SSE、导出 |
| `api/companyMaterial.js` | 企业资料档案 |
| `api/templateVariable.js` | 模板变量 |
| `api/knowledge.js` | 知识库、知识文件、重建、检索、问答 |
| `api/enterprise.js` | 企业管理 |
| `api/enterpriseApply.js` | 企业申请、公司审批 |
| `api/systemUser.js` | 系统用户管理 |
| `api/member.js` | 会员中心和会员运营 |
| `api/tenderNotice.js` | 标讯商机 |
| `api/crud.js` | 通用 CRUD 工厂 |

---

## 8. 通用 CRUD 配置

文件：`src/config/moduleConfigs.js`

当前通用配置包括：

- `role`：角色管理，baseUrl `/sys-role`
- `menu`：菜单管理，baseUrl `/sys-menu`
- `aiModel`：AI模型配置，baseUrl `/ai-model-config`
- `knowledgeFile`：知识库文件，baseUrl `/knowledge-file`
- `systemConfig`：系统配置，baseUrl `/sys-config`
- `dictType`：字典类型，baseUrl `/sys-dict-type`
- `dictData`：字典数据，baseUrl `/sys-dict-data`

通用 CRUD 页面：

- `views/common/CrudPage.vue`
- `views/common/GenericCrudView.vue`

注意：

- 模型配置页面不能展示温度、最大 Token 等参数字段。
- 模型类型当前只保留 `chat` 和 `rerank` 入口，不展示 Embedding 类型模型入口。
- 新增通用 CRUD 时，优先补 `moduleConfigs.js`，不要复制大段重复页面。

---

## 9. 主要页面说明

### 9.1 AI方案页面

文件：`src/views/ai/solutions/index.vue`

核心能力：

- 方案列表与详情工作台。
- 上传并解析需求 / 招标文件。
- 保存需求和整体编写要求。
- 生成目录。
- 设置篇幅。
- 修改单节点字数、批量修改字数。
- 保存章节标题、编写方向、编写要求。
- 新增 / 删除 / 移动目录节点。
- AI帮写编写方向，SSE 增量输出。
- 单章节流式生成，SSE 增量输出。
- 全文生成 / 重编全文。
- 手动编辑章节正文，支持 Ctrl + S 保存。
- 历史版本列表、详情、整版恢复、单章恢复。
- Word / PDF 导出。

重要约定：

- 全文生成阶段不再强制压缩字数。
- 章节偏长只做提示，不自动压缩。
- 生成中应禁用生成、导出、编辑、删除等危险操作。
- 生成任务应支持轮询恢复。
- `getGenerationTask` 使用 `silentError: true`，任务不存在时应静默清理本地任务缓存。

### 9.2 AI文档页面

文件：`src/views/ai/documents/index.vue`

核心能力：

- 左侧文档列表 + 右侧工作台。
- 文档类型加载。
- 创建文档。
- 基础资料弹窗维护。
- 参考资料上传。
- 解析任务轮询。
- 生成大纲。
- 设置篇幅。
- 生成正文 / 重编全文。
- 任务轮询。
- Word / PDF 导出。
- 删除文档。

重要交互：

- 基础资料不铺在页面上，统一放弹窗。
- 弹窗标题和底部按钮固定，中间表单独立滚动。
- 文档大纲参考 AI方案目录样式。
- 文档大纲区域可以单独竖向滚动。
- 整体页面不要出现大滚动条。
- 当前章节提示内容放在信息图标悬浮提示中。
- 生成中除刷新外，其他操作全部禁用。
- 生成中需要实时刷新任务进度、章节状态、字数和当前正文。

### 9.3 AI标书页面

文件：`src/views/bid/project/index.vue`

核心能力：

- 标书项目列表与工作台。
- 上传招标文件并创建项目，不立即读标。
- 给已有项目补传 / 替换招标文件。
- 开始读标解析。
- 从解析结果自动回填基础信息，只补空字段。
- 企业资料档案关联 / 解除关联。
- 项目资料管理与加入知识库。
- 投标文件智能填空：进入、详情、填空、保存。
- 技术方案：进入、详情、目录生成、篇幅设置、全文生成、重编全文、任务查询、章节配置、目录维护、SSE 流式生成、历史版本、导出 Word/PDF。

硬性约定：

- AI标书技术方案必须调用 `/bid-project/{id}/technical-solution/...` 项目包装接口。
- 不能直接调用 `/ai-solution/outline/...` 操作标书技术方案章节。
- 前端 `requireProjectId(projectId)` 缺少项目 ID 会抛错，禁止继续操作。
- 日志和 UI 文案必须写“AI标书技术方案”，不能写成“AI方案”。

### 9.4 资料库页面

文件：`src/views/bid/companyMaterials/index.vue`

职责：

- 企业资料档案维护。
- 资质、业绩、简介等资料维护。
- 附件上传与绑定。
- 普通用户只能查看，不能新增、编辑、删除或上传附件。

### 9.5 知识库页面

文件：`src/views/knowledge/base/index.vue`

职责：

- 知识库列表、创建、修改、状态、删除。
- 知识库文件列表、上传、删除。
- 文件重建切片 / 向量。
- 知识库检索。
- 知识库问答。

约定：

- 知识库按企业隔离。
- ID 按 UUID 字符串处理。
- 企业没有知识库时不能看到其他企业数据。

### 9.6 标讯商机页面

文件：`src/views/tender/notice/index.vue`

职责与交互：

- 独立卡片式列表，不使用普通表格样式。
- 支持 keyword 模糊搜索。
- 列表不展示原文按钮。
- 详情抽屉中去掉打开原文、复制链接、详情链接、联系电话。
- 联系人放到“采购信息”里。

### 9.7 系统用户页面

文件：`src/views/system/user/index.vue`

职责：

- 用户分页、创建、编辑、删除、状态修改。
- 分配角色。
- 重置密码。
- 企业管理员操作用户时，企业和角色规则以后端为准。

### 9.8 企业 / 企业申请页面

文件：

- `src/views/system/enterprise/index.vue`
- `src/views/system/enterpriseApply/index.vue`

职责：

- 企业管理。
- 当前企业资料。
- 用户提交加入 / 注册企业申请。
- 管理员审核企业申请。
- 右上角公司审批徽标数量展示。

### 9.9 会员页面

文件：

- `src/views/member/center/index.vue`
- `src/views/member/admin/index.vue`

职责：

- 用户侧查看剩余额度、套餐、订单、额度日志。
- 平台侧查看会员账户、调整额度、订单管理、确认支付、额度日志。
- 顶部全局显示剩余总字数，点击进入会员中心。

### 9.10 下载中心与回收站

文件：

- `src/views/download/index.vue`
- `src/views/recycle/index.vue`

约定：

- 下载中心只展示真实可下载导出结果。
- 删除下载中心记录需要后端同步清理文件资源与导出记录。
- 回收站永久删除需要真实删除 OSS 文件和数据库记录。

---

## 10. Word / PDF 导出前端约定

工具文件：`src/utils/wordExportDialog.js`

- 导出入口可区分 Word/PDF。
- 导出弹窗只保留导出样式选择及必要设置。
- 不增加“全文 / 当前章节”等导出范围选择。
- PDF 和 Word 使用同一套固定导出样式口径。
- AI方案、AI文档、AI标书技术方案导出优先走异步任务。
- 创建导出任务后前端轮询任务状态，成功后使用返回的 `fileId` 走文件资源下载。
- 导出任务状态口径：`pending / running / success / failed / file_deleted`。
- 导出轮询应静默处理短暂失败，避免连续弹错误；最终失败再显示业务提示。
- 同步导出接口仍可保留兼容，但页面层不要优先调用同步导出阻塞请求线程。

当前异步导出接口：

```text
POST /ai-solution/{id}/export-task/{format}
GET  /ai-solution/export-task/{exportId}

POST /ai-document/{id}/export-task/{format}
GET  /ai-document/export-task/{exportId}

POST /bid-project/{id}/technical-solution/export-task/{format}
GET  /bid-project/{id}/technical-solution/export-task/{exportId}
```

---

## 11. 当前前后端对接注意事项

### 11.1 Prompt 模板模块

`/prompt-template` 已按确认口径删除：

- 已删除 `src/api/promptTemplate.js`。
- 已删除 `src/views/ai/prompts/index.vue`。
- 已删除 `/ai/prompts` 路由和相关 import。
- 后端不再补 `PromptTemplateController`。

后续未重新确认前，不要恢复该模块。

### 11.2 AI标书技术方案整体编写要求接口

已使用项目包装接口：

```text
PUT /bid-project/{id}/technical-solution/overall-writing-requirement
```

前端方法：

```text
saveBidProjectTechnicalOverallWritingRequirement(projectId, overallWritingRequirement)
```

该接口由后端校验项目权限、项目归属、内部方案归属。AI标书技术方案不要直接调用 `/ai-solution/{id}/overall-writing-requirement`。

### 11.3 JMeter 压测资料

后端 `src/test/jmeter` 已按完整 JMeter 包重新生成。前端无需合并其中 SQL。JMeter 包内 SQL 仅作为压测初始化和清理工具，不属于前端项目内容。

---

## 12. 修改代码时的硬性注意事项

1. 不要把任何业务 ID 转成数字。
2. 不要改变 `request.js` 的统一解包口径，除非同步改所有 API 调用。
3. 不要把 AI 长耗时接口的 `timeout: 0` 改回默认超时。
4. 不要把 AI标书技术方案操作改成直接调用 `/ai-solution/outline/...` 或 `/ai-solution/{id}/overall-writing-requirement`。
5. 不要恢复全文生成后的自动压缩逻辑。
6. 不要在导出弹窗里增加“全文 / 当前章节”等导出范围。
7. 不要在模型管理页面展示温度、最大 Token 等参数字段。
8. 不要把 AI文档工作台改回大表单铺页面。
9. 不要让生成中页面还能重复点击生成、导出、编辑、删除等危险操作。
10. 修改大型 Vue 页面时，尽量给完整文件，避免只给片段导致上下文丢失。
11. 新增路由时同步考虑 `meta.roles`、`meta.requiresBusiness` 和左侧菜单是否需要展示。
12. 新增接口封装时优先放入 `src/api`，不要在页面里散写 URL。
13. 新增通用管理页面时优先评估能否走 `moduleConfigs.js` + `GenericCrudView`。
14. `/prompt-template` 已删除，未重新确认前不要恢复路由、页面或 API 封装。
15. 异步导出和任务轮询相关页面必须在组件卸载时清理定时器和取消未完成请求。

---

## 13. 本轮前端修改基线

本轮修改文件重点：

```text
src/utils/requestId.js
src/api/aiSolution.js
src/api/aiDocument.js
src/api/bidProject.js
src/router/index.js
src/views/ai/solutions/index.vue
src/views/ai/documents/index.vue
src/views/bid/project/index.vue
src/views/knowledge/base/index.vue
```

主要口径：

- 删除 `/prompt-template` 相关前端代码。
- AI全文生成/重编请求传 `requestId`，配合后端幂等。
- AI方案、AI文档、AI标书技术方案导出改为异步任务优先。
- SSE 支持 `AbortController` 取消。
- 轮询降低频率并支持页面隐藏暂停、失败退避、任务完成清理。
- ID 比较继续按 `String(a) === String(b)`。

---

## 14. 下次上传前端项目后的建议处理流程

如果用户上传本前端项目，请优先：

1. 读取本文件 `AI_FRONTEND_CONTEXT.md`。
2. 如同时上传后端，读取后端 `AI_PROJECT_CONTEXT.md`。
3. 再看用户本次具体问题。
4. 对照路由、API 封装、页面交互，不要只按记忆修改。
5. 判断是否会影响后端接口、权限、数据范围、长任务状态。
6. 只修改和问题相关的文件。
7. 如果需要打包，优先只打包修改文件。
8. 回复时说明改了哪些文件、解决什么问题、是否需要后端同步、是否需要重启或重新构建。

## 2026-06-02 AI方案 / AI标书目录阶段知识库传参口径

本轮前端已补齐目录生成阶段的知识库选择和传参：

1. AI方案页面在“生成目录编写方向”下方新增“目录知识库”选择区；生成目录接口 `/ai-solution/{id}/outline/generate` 必须传 `knowledgeIds`。
2. AI标书项目页的技术方案生成目录区域新增“目录知识库”选择区；接口 `/bid-project/{id}/technical-solution/outline/generate` 必须传 `knowledgeIds`。
3. 目录阶段选择的知识库用于后端 RAG 召回，后端会把该批知识库同步到末级章节，保证后续全文生成、单章生成能够沿用同一批知识库资料。
4. 后续不要再只在“全文生成设置”或“单章节生成”里传知识库；目录阶段也必须传，否则目录会偏模板化。
5. 知识库 ID 均按 UUID 字符串处理，不允许转 Number。

## 0.6 2026-06-02 AI方案结构化解析结果前端展示口径

本阶段在 AI方案详情页增加“评分项/需求解析”入口，用于查看后端第十五阶段生成的结构化评分项和要求明细。

### 已接入接口

- `getRequirementExtract(id)`：读取当前方案已有结构化解析结果。
- `rebuildRequirementExtract(id)`：按当前采购需求、技术要求、服务要求、评分标准重新解析。

### 页面行为

- 详情页底部操作区增加“评分项/需求解析”按钮。
- 点击后打开抽屉，展示：
  - 评分项数量、要求明细数量、解析状态；
  - 要求类型分布；
  - 项目名称、采购人/招标人、预算、工期、截止时间；
  - 技术/商务/服务/资格/风险/否决摘要；
  - 评分项表格；
  - 要求明细表格。
- “重新解析”会失效旧解析结果并重新调用后端 AI 结构化解析。

### 后续约束

- 后续如果支持人工编辑评分项和要求，应基于后端结构化表接口实现，不要回退到只编辑大段文本。
- 前端只展示业务字段，不展示 rawJson、Prompt、chunk、向量、相关度等内部实现信息。

## 0.5 2026-06-02 AI方案结构化解析结果人工调整口径

AI方案详情页“评分项 / 需求解析”抽屉已支持人工调整：

1. 可编辑结构化摘要字段：项目名称、采购人、预算、工期、投标截止、技术摘要、商务摘要、服务/交付摘要、资格摘要、风险摘要、否决/禁止项。
2. 可新增、编辑、删除评分项，字段包括评分项、分值、评分要求、响应策略、建议章节、排序。
3. 可新增、编辑、删除要求明细，字段包括要求类型、标题、内容、是否强制响应、风险等级、建议响应、建议章节、排序。
4. 操作保存后后端返回新的完整结构化结果，前端直接刷新抽屉数据。
5. “重新解析”仍保留，但会失效旧人工调整结果，需要用户确认后执行。
6. 后续 AI方案前端继续修改时，不要移除该人工调整入口；这是避免 AI 结构化解析误判、漏判的兜底机制。

## 0.8 结构化评分项/要求同步到章节

- AI方案详情页“评分项/需求解析”抽屉新增“同步到章节”按钮。
- 点击后调用 `POST /ai_bid/api/ai-solution/{id}/requirement-extract/sync-outline`，把当前评分项/要求明细同步到目录末级章节。
- 目录树末级章节显示“绑定 x评/x求”标签，鼠标悬浮可查看绑定摘要。
- 同步不会自动改写已生成正文；用户需要重编全文或单章重编，正文才会使用最新绑定内容。

## 0.8 2026-06-02 AI方案章节质量检查前端展示

本阶段在 AI方案详情页补齐“质量检查”入口，用于展示后端章节质量评分和风险复核结果。

确认口径：
1. AI方案详情页底部操作区新增“质量检查”按钮。
2. 点击后打开抽屉，调用 GET /ai-solution/{id}/quality-check。
3. 抽屉展示质量汇总卡片：章节总数、已检查、平均分、需重编、需关注、优秀/可用。
4. 表格展示每章质量评分、等级、问题等级、证据覆盖率、动作/交付/验收、强事实风险、内部痕迹风险、格式风险、主要问题和处理建议。
5. 页面只展示和提示，不直接自动重写章节；需要修改仍走原有“单章重编 / 重编全文”。

## 0.8 2026-06-03 AI方案整合版前端口径：字数检查、去重压缩、AI审稿

本阶段前端新增 AI方案正式验证前的辅助入口，但不展示 Token、费用、模型调用次数、RAG命中详情、Rerank、Embedding 等内部数据。

已确认展示口径：

1. 模型档位仍只显示“基础版 / 标准版 / 旗舰版”。
2. 不新增“省Token / 标准 / 高质量”下拉框；Token策略由后端根据模型档位自动映射。
3. 前端只展示用户能理解的信息：目标字数、生成字数、完成比例、章节字数状态、是否建议压缩/扩写/重编。
4. AI方案详情页增加“字数检查”：展示方案总字数、章节字数状态、重复段落数量和重复压缩入口。
5. AI方案详情页增加“AI审稿”：展示全文统一口径包、审稿得分、风险等级、问题列表和审稿建议。
6. “一键压缩重复”只删除跨章节重复段落，不新增事实内容。已生成正文发生变化后应刷新详情和字数检查。
7. 质量检查、评分项/需求解析、同步到章节、字数检查、AI审稿属于正式导出前的辅助工具，按钮集中在 AI方案详情底部操作区。

## 0.28 2026-06-03 正式导出与内部评审页面口径

前端普通用户导出 Word/PDF 时默认走正式标书模式 FORMAL_BID，不展示也不传递评分响应矩阵、Token 用量、RAG 命中、内部章节绑定等调试信息。正式导出按钮仍保持简单，不增加“Token/费用/内部矩阵”等普通用户不可理解选项。

评分项/需求解析、质量检查、字数检查、AI审稿等功能继续作为页面内辅助检查工具，不默认写入正式标书导出文件。如未来需要导出内部评审报告，应单独使用 INTERNAL_REVIEW 模式，并明确标识为内部资料。
