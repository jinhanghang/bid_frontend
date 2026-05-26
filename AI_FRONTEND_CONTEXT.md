# AI项目前端上下文说明（给 ChatGPT / 开发助手优先阅读）

> 目的：以后每次上传前端项目后，先阅读本文件，快速了解前端技术栈、路由、接口封装、页面交互约定和与后端的对接边界，避免把已经确认过的交互和权限规则改丢。  
> 本文件参考后端 `AI_PROJECT_CONTEXT.md` 生成，并按当前上传的 `frontend.zip` 校准。校准日期：2026-05-26。

---

## 1. 项目基本信息

- 项目定位：`ai-bid` 平台前端管理端 / 业务工作台。
- 前端技术栈：Vue 3、Vite、Pinia、Vue Router、Element Plus、Axios。
- 入口文件：`src/main.js`
- 根组件：`src/App.vue`
- 路由文件：`src/router/index.js`
- 布局组件：`src/layout/AdminLayout.vue`
- API Base：`import.meta.env.VITE_API_BASE || '/ai_bid/api'`
- 默认后端接口前缀：`/ai_bid/api`

注意：本次上传的前端压缩包未包含 `package.json`，因此依赖版本、脚本命令以实际工程仓库为准，不要在文档或代码里臆造具体版本号。

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
- SSE 事件约定：
  - `event: message`：正文增量。
  - `event: error`：错误。
  - `event: done`：后端完成；前端会取消 reader 并触发完成回调。

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
| `/ai/prompts` | `views/ai/prompts/index.vue` | 超级管理员、平台管理员 |
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
| `api/promptTemplate.js` | Prompt 模板；当前上传后端未发现对应 Controller，保留前需确认后端接口 |

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
- 导出长耗时请求保持 `timeout: 0`。
- 导出成功后通常进入下载中心或直接下载文件资源。

---

## 11. 当前前后端对接注意事项

### 11.1 Prompt 模板接口

前端存在：

- `src/views/ai/prompts/index.vue`
- `src/api/promptTemplate.js`
- 路由：`/ai/prompts`
- 接口：`/prompt-template/page`、`/prompt-template/{id}`、新增、修改、删除

但当前上传的后端代码中未发现 `/prompt-template` Controller 或模块。后续处理方式二选一：

1. 如果 Prompt 模板功能需要保留，补齐后端模块与权限。
2. 如果暂不启用，隐藏路由和入口，避免平台管理员点开后接口 404。

### 11.2 AI标书技术方案整体编写要求接口

前端存在：

- `saveBidProjectTechnicalOverallWritingRequirement(projectId, overallWritingRequirement)`
- 调用：`PUT /bid-project/{id}/technical-solution/overall-writing-requirement`

当前上传的后端 `BidProjectController` 未暴露该路径。后端现有类似接口是：

- `PUT /ai-solution/{id}/overall-writing-requirement`

如果技术方案需要项目包装口径，应补：

- `PUT /bid-project/{id}/technical-solution/overall-writing-requirement`
- 校验项目权限、项目归属、内部方案归属。
- 日志文案写“AI标书技术方案”。

---

## 12. 修改代码时的硬性注意事项

1. 不要把任何业务 ID 转成数字。
2. 不要改变 `request.js` 的统一解包口径，除非同步改所有 API 调用。
3. 不要把 AI 长耗时接口的 `timeout: 0` 改回默认超时。
4. 不要把 AI标书技术方案操作改成直接调用 `/ai-solution/outline/...`。
5. 不要恢复全文生成后的自动压缩逻辑。
6. 不要在导出弹窗里增加“全文 / 当前章节”等导出范围。
7. 不要在模型管理页面展示温度、最大 Token 等参数字段。
8. 不要把 AI文档工作台改回大表单铺页面。
9. 不要让生成中页面还能重复点击生成、导出、编辑、删除等危险操作。
10. 修改大型 Vue 页面时，尽量给完整文件，避免只给片段导致上下文丢失。
11. 新增路由时同步考虑 `meta.roles`、`meta.requiresBusiness` 和左侧菜单是否需要展示。
12. 新增接口封装时优先放入 `src/api`，不要在页面里散写 URL。
13. 新增通用管理页面时优先评估能否走 `moduleConfigs.js` + `GenericCrudView`。

---

## 13. 下次上传前端项目后的建议处理流程

如果用户上传本前端项目，请优先：

1. 读取本文件 `AI_FRONTEND_CONTEXT.md`。
2. 如同时上传后端，读取后端 `AI_PROJECT_CONTEXT.md`。
3. 再看用户本次具体问题。
4. 对照路由、API 封装、页面交互，不要只按记忆修改。
5. 判断是否会影响后端接口、权限、数据范围、长任务状态。
6. 只修改和问题相关的文件。
7. 如果需要打包，优先只打包修改文件。
8. 回复时说明改了哪些文件、解决什么问题、是否需要后端同步、是否需要重启或重新构建。
