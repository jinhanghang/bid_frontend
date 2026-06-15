# AI项目前端上下文说明（给 ChatGPT / 开发助手优先阅读）

> 目的：以后每次上传前端项目后，先阅读本文件，快速了解前端技术栈、路由、接口封装、页面交互约定和与后端的对接边界，避免把已经确认过的交互和权限规则改丢。  
> 本文件参考后端 `AI_PROJECT_CONTEXT.md`，并按当前最新 `ai_bid_docker.zip`、前端代码和用户提供的 Git 提交日志截图重新校准。校准日期：2026-06-04。
> 最新口径：`/prompt-template` 模块已删除；大数据列表/左侧列表必须首屏小分页、滚动追加或底部分页；企业下拉不得全量加载，必须远程分页搜索；AI方案、AI文档、AI标书技术方案导出优先走异步导出任务；SSE/轮询需要支持取消、退避和页面隐藏暂停；AI方案、AI文档、AI标书技术方案不默认选择 AI 等级，必须由用户显式选择。

---

## 0.0.2 2026-06-12 项目接管与近期前端漏同步口径

本节为当前前端最新维护基准。后续修改前端前，先看根目录 `PROJECT_CONTROL.md`，再看本文件。`PROJECT_CONTROL.md` 负责总控和验收，本文件负责前端详细交互口径。

- 当前用户本地明确状态：错误提示优化 **v1 已应用**；错误提示优化 **v2 增量包需要确认是否已覆盖**。未确认 v2 覆盖前，不要把 v2 中知识库失败原因脱敏、导出任务失败脱敏、边缘页面 catch 去重等能力误判为已上线。
- 前端后续不允许无边界“全部优化”。每次修改必须先列出要改页面/API/工具文件、是否影响路由、登录态、角色权限、企业绑定、分页、任务轮询和构建结果。
- 项目文档只维护 `PROJECT_CONTROL.md`、`AI_PROJECT_CONTEXT.md`、`AI_FRONTEND_CONTEXT.md`；后续不再单独维护 `CHANGELOG_AI.md`。

### 0.0.2.8 第四步安全权限前端口径

- 本次第四步不改前端路由和菜单，只同步文档口径。
- 后端已限制普通用户直接访问管理端会员订单和管理端额度流水接口；前端仍保持普通用户不展示会员运营入口。
- 企业管理员即使通过接口访问管理端订单/额度流水，也只能看到本企业数据；平台管理员和超级管理员看全局。
- 不再维护独立 `CHANGELOG_AI.md`，前端相关口径统一记录在本文件。

### 0.0.2.1 错误提示 v1/v2 前端口径

- `src/utils/request.js` 继续作为普通 HTTP 请求唯一入口，负责 token 注入、统一解包、401 跳转、403 提示、安全错误展示和重复提示控制。
- `src/utils/errorNotify.js` 用于页面级 catch 兜底，避免和全局 request 拦截器重复弹窗。
- `src/utils/streamError.js` 用于 AI 流式接口和 SSE 错误解析，禁止直接展示 JSON、HTML、Java Exception、SQL、第三方 request_id、accessKey、token、服务器路径。
- `src/api/aiSolution.js`、`src/api/bidProject.js` 的 `fetch + ReadableStream` 失败时必须走 `streamError` 安全化处理，不能 `throw new Error(text)`。
- `event:error` 收到后也要安全化显示，不能把后端原始 `data` 直接弹给用户。
- 任务中心、知识库问答、导出任务、AI复审等页面展示失败原因前应做脱敏；v2 增量未覆盖前，这些页面仍需重点复查。

### 0.0.2.2 AI 标书技术方案前端口径

- AI标书、AI方案、AI文档页面都不能给 `aiLevel` 写默认值，必须由用户显式选择。
- 技术方案单章节生成不再默认 300 字；新增目录节点不再默认 300 字；方案篇幅弹窗空值不再显示 300。
- 当章节目标字数为空或小于等于 0 时，前端应提示用户先设置目标字数，不能悄悄按 300 生成。
- 技术方案目录/章节生成失败后，前端必须恢复按钮、loading、轮询状态和本地任务缓存，避免页面卡住。
- `Connection reset`、`request timed out`、模型限流、模型 Key 缺失等失败都展示安全业务提示，不展示第三方原始内容。
- 生成目录、全文生成、单章生成时，需要保留用户当前选择的知识库，不要因为详情回填为空就清空 `knowledgeIds`。

### 0.0.2.3 企业申请、未绑定企业与个人空间前端口径

- 登录返回的 `needCompleteEnterprise` 仅历史兼容，不能再弹旧的“完善企业信息”窗口。
- 未绑定企业用户进入业务页时，需要根据后端权限和路由口径判断：允许的个人空间功能正常展示，不允许的企业级功能给出明确引导去提交企业申请。
- 企业申请页面必须支持“注册新企业”和“加入已有企业”；已有待审核申请、已绑定企业、企业停用、企业重复等错误应展示后端安全业务提示。
- 超级管理员/平台管理员没有企业 ID 是正常状态，页面不能误导为“请先加入企业”。

### 0.0.2.4 分页 / 下拉 / 大数据列表口径

- 企业下拉统一远程分页搜索，不要页面初始化全量调用 `/enterprise/list?status=1`。
- 资料库、AI标书项目、知识库、用户额度、任务中心、导出中心等大数据列表必须首屏小分页、滚动追加或底部分页。
- 企业下拉滚动到底应自动加载下一页，不能只查首屏导致后面的企业永远选不到。
- 过渡动画、滚动追加、列表刷新要避免整屏卡顿；数据追加时尽量保留已加载记录，不要每次重置列表造成闪烁。
- 用户额度列表、企业列表、知识库文件列表不能固定拉 100/200 条作为“临时方便”。

### 0.0.2.5 会员额度 / 消耗统计前端口径

- 额度展示需要让用户能理解免费额度、付费额度、预占额度、已消耗额度、剩余额度的来源。
- “付费剩余”不能只展示一个数字，后续页面说明或 tooltip 应解释其计算口径。
- 额度不足、套餐过期、模型未配置、AI 服务失败应分别给出不同业务提示，不要全部显示为“AI任务执行失败”。
- 会员运营入口仍只对超级管理员和平台管理员开放，企业管理员不显示。

### 0.0.2.6 小程序补充口径（如当前交付包含小程序包）

- 小程序 `tabBar` 只保留“主页”和“我的”两个页签。
- 图标使用本地图片，放到项目静态资源目录，通过 `app.json` 的 `iconPath` / `selectedIconPath` 配置。
- 小程序列表页继续保持一个 `keyword` 搜索、分页防抖、加载锁和卡片式列表，不要回退为复杂筛选或全量查询。
- 个人信息页手机号不可修改；退出登录必须清空本地所有登录缓存。


---

## 0. 2026-05-29 当前前端核对与本次修正

本节优先级高于后面旧说明。后续继续改前端时，先按本节判断当前状态。

### 0.0 2026-06-04 本轮补充口径

- AI方案、AI文档、AI标书技术方案新建草稿时 `aiLevel` 保持空值，页面生成/上传前必须提醒用户先选择 AI 等级。
- 普通业务页面不展示“服务商/模型名称”等模型明细，只展示用户需要选择和理解的 AI 等级、场景等业务信息。
- AI复审抽屉不使用全屏遮罩锁定页面，历史记录查询走后端统一前缀接口 `/ai_bid/api/ai-review-record`。
- AI方案知识库选择需要在“节点编辑、整体生成、切换步骤/刷新详情”之间尽量保留用户已选状态，不能因详情回填为空就清掉当前选择。
- JMeter 用 `ai_level` 参数模拟用户显式选择 AI 等级；前端自身不要把 `STANDARD/BASIC` 写成默认值。

### 0.0.1 2026-06-08 知识库 RAG 商用增强前端口径

本节为知识库页面后续维护的最新基准。后续修改 `src/views/knowledge/base/index.vue`、`src/api/knowledge.js` 时，不要把以下交互回退。

- 知识库页面顶部操作入口保留：`检索测试`、`知识问答`、`添加文件`；自动测试入口已删除。
- 知识问答默认流程为：输入问题 → `先预览依据` → 用户确认命中资料 → `确认依据并生成回答` → 后端问答任务轮询 → 展示 AI 回答、引用来源、答案自检和确认状态。
- 当前问题未命中有效依据时，前端必须禁用或阻止生成，提示“不会调用模型生成无依据答案”，不能自动走同步问答或让模型自由发挥。
- 问答任务前端默认调用：
  - `previewAskKnowledge` 对应 `/knowledge-vector/ask/preview`；
  - `submitAskTask` 对应 `/knowledge-vector/ask/tasks`；
  - `getAskTask` 对应 `/knowledge-vector/ask/tasks/{taskId}`；
  - `updateAskTaskReview` 对应 `/knowledge-vector/ask/tasks/{taskId}/review`。
- 问答轮询必须有并发锁和卸载清理，避免接口慢时多个状态查询叠加；组件销毁时必须停止问答任务轮询和文件解析轮询。
- 问答结果必须展示 `答案自检`，包括 `PASS/WARN/FAIL`、分数、问题和建议。自检不通过时，不应把答案包装成完全可信内容。
- 问答结果必须支持客户确认闭环：`待确认/已确认/需修改/已修改/已废弃`，并允许填写客户修改意见和最终答案。
- 检索测试、证据预览、最终引用来源都应展示短摘要 `contentPreview`，不要在卡片里直接铺开超长 `content`。
- 引用来源必须展示文件名、页码/章节/工作表/幻灯片、切片序号、召回来源等元数据，并提供“打开原文”按钮。当前实现通过 `knowledgeFileId` 匹配文件列表中的 `fileUrl` 打开原文件；PDF 精确定位页码属于后续增强，不要删掉现有打开原文能力。
- 知识库文件列表必须展示 `解析质量` 列，点击后显示 `parseQualityScore/parseQualityLevel/parseQualityJson`。质量报告用于解释“上传成功但问不出来”的原因。
- `招标分析` 弹窗调用 `analyzeTenderKnowledge`，展示关键信息、评分矩阵、缺失资料、偏离表初稿和建议。所有结果都作为初稿展示，页面文案要保留人工核对提示。
- `src/api/knowledge.js` 保留同步 `askKnowledge` 兼容旧调用，但知识库页面默认走任务接口，不再把同步 `/ask` 作为主流程。


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

---

## 0.18 2026-06-03 AI方案 / AI文档 / AI标书技术方案统一检查与审稿入口

本次同步 AI方案、AI文档、AI标书技术方案的生成后检查、审稿和导出口径。后续前端修改时不要只改 AI方案页面。

### 0.18.1 普通用户页面展示边界

普通前端页面可以展示：

- 目标字数、生成字数、完成度、超字数章节、偏短章节。
- 质量检查结果、问题等级、建议重编/复核提示。
- 重复检查结果和一键压缩重复内容入口。
- AI审稿摘要、风险等级、修改建议。

普通前端页面不展示：

- Token 数、费用、模型调用次数。
- RAG、chunk、向量召回、Rerank、Embedding、OpenSearch、相似度、检索命中详情。
- 模型内部参数、温度、最大 Token 等。

### 0.18.2 AI文档页面同步能力

AI文档详情页新增/保留：

- 字数检查。
- 质量检查。
- 重复检查和一键压缩重复内容。
- AI审稿。
- Word/PDF 正式导出默认不携带内部审稿/质量/检索信息。

### 0.18.3 AI标书技术方案页面同步能力

AI标书技术方案页面新增/保留：

- 字数检查。
- 质量检查。
- 重复检查和一键压缩重复内容。
- AI审稿。
- Word/PDF 正式导出默认不输出评分响应矩阵和系统痕迹。

AI标书技术方案前端所有操作必须继续调用 `/bid-project/{id}/technical-solution/...` 包装接口，不能直接调用 `/ai-solution/...`。

## v12 首页个人空间显示边界修复

- 个人空间引导只允许影响“未绑定企业的普通用户”。
- 超级管理员、平台管理员、企业管理员、已绑定企业的普通用户，首页仍保持原有统计入口和业务展示口径，不显示个人空间引导。
- 首页角色判断兼容 roleCode、roles 字符串以及“超级管理员/平台管理员/企业管理员/普通用户”等中文角色名称，避免管理员被误判为未绑定企业普通用户。
- 未绑定企业普通用户首页展示个人标书项目、个人知识库、导出文件和企业申请入口；绑定企业后恢复企业空间展示。

## 2026-06-08 RAG / 招标分析前端口径

- 知识库页面不放“招标分析”入口，只保留资料管理和 RAG 调试能力。
- “招标文件分析”入口放在 `src/views/bid/project/index.vue`：解析报告区域、投标文件区域。
- 前端调用 `src/api/bidProject.js`：
  - `getBidProjectTenderAnalysis(id)`
  - `analyzeBidProjectTender(id, data)`
- 分析弹窗需允许选择知识库；没有选择知识库时不能开始分析。
- 分析结果是项目级结果，后续投标文件、技术方案、评分矩阵、缺失资料清单、偏离表都以项目结果为准。

## 2026-06-08 AI标书主流程 / 企业资料库 / 额度统计 / 安全检查前端口径

### AI标书投标文件页面

- `src/views/bid/project/index.vue` 的“投标文件”区域新增：评分项响应矩阵、缺失资料清单、偏离表初稿、客户确认/修改意见、导出 Word、导出 Markdown。
- 前端调用：
  - `reviewBidDocument(id, data)`
  - `exportBidDocumentWord(id, data)`
  - `exportBidDocumentMarkdown(id)`
- 导出成功后只提示文件已生成，后续下载仍走下载中心或后端受控下载，不直接打开 OSS 原始地址。
- 客户确认状态必须保留：待确认、已确认、需修改、已修改、已废弃。

### 企业资料库页面

- 资料库统计卡片已按用户要求下线，页面不展示总数、可用、即将到期、已入库等统计卡片。
- 前端不要调用 `getCompanyMaterialSummary`，也不要把统计卡片作为“缺失项”恢复。
- 资料列表继续展示可用状态；当前资料仍可通过“加入知识库”选择同企业知识库并触发入库。
- 前端调用保留：
  - `addCompanyMaterialToKnowledge(id, data)`
- 企业资料附件仍走 `FileUploadBox` 和后端文件服务；不要在页面直接拼 OSS 原始链接。

### 会员运营 / 模型管理页面

- `src/views/member/admin/index.vue` 新增两个管理页签：
  - 消耗统计：按日期、场景统计消耗字数、返还字数、净消耗、调用次数、用户排行。
  - 安全检查：仅超级管理员显示，查看后端安全检查报告。
- 前端调用：
  - `getQuotaUsageStats(params)`
  - `getSecurityAuditReport()`
- 模型管理页面继续不展示温度、最大 Token 等参数列；不要回退。


## 0.0.3 2026-06-15 本轮范围收口补充

- 企业资料库统计卡片已按用户要求下线；前端不要恢复总数、可用、即将到期、已入库等统计卡片，也不要继续调用 `getCompanyMaterialSummary`。
- 本轮明确不做小程序、名片、CAD、合同、财务同步、OA 审批。
- 标讯报备 / 一键中标报备本轮也先不做；前端不要新增“报备、跟进、忽略”等半流程按钮。后续等 OA 审批对接时，再统一补标讯报备入口、审批状态、回调状态展示和关联 AI 标书项目流程。
- 会员中心和会员运营页增加“付费剩余”说明：付费剩余=有效付费套餐、企业套餐、后台增加额度的剩余额度；不包含免费额度和 AI 任务失败后释放的预占额度。
- 会员运营用户额度表企业列使用 `enterpriseName`，不要回退为 `groupKey`。


## 0.0.4 2026-06-15 第三步：AI 任务中心前端筛选和失败展示口径

- AI 任务中心筛选项补充“知识库问答”，对应后端 `ASK` 任务分类。
- 失败原因仍必须经过 `normalizeStreamErrorMessage` 兜底后展示；即使后端历史数据里存在 Java Exception、SQL、HTML、request_id、DashScope/百炼原始响应，也不能原样显示给用户。
- 本次不新增小程序、OA 审批、合同、CAD、名片、财务同步相关入口。
