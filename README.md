# AI标书后台管理系统前端

这是根据你上传的后端 `bid` 项目从 0 生成的 Vue3 前端工程。

## 技术栈

- Vue 3
- Vite
- Element Plus
- Vue Router
- Pinia
- Axios

## 后端适配结果

后端项目中确认到：

| 项目 | 前端适配 |
|---|---|
| 后端服务端口 | `8080` |
| API 前缀 | `/ai_bid/api` |
| 返回格式 | `{ code, message, data }` |
| 成功状态 | `code === 0` |
| 分页返回 | `data.total / data.records / data.pageNum / data.pageSize` |
| JWT Header | `Authorization: Bearer token` |
| 登录接口 | `POST /auth/login` |
| 验证码接口 | `GET /auth/captcha` |
| 当前用户 | `GET /auth/me` |
| 文件上传 | `POST /files/upload` |

## 已生成页面

### 登录认证

- 登录页
- 图形验证码
- token 保存
- Axios 自动携带 `Authorization: Bearer token`
- 401 自动回登录页

### 标书业务

- 标书项目
- 标书模板
- 模板变量
- 标书项目 AI 生成
- 项目资料上传
- Markdown 内容预览/编辑
- Word / Markdown 导出

### AI能力

- 通用 AI 生成工作台
- Prompt 模板管理
- AI 模型配置
- AI 生成任务
- AI 生成结果
- 文档导出记录

### 一键中标

- 招标数据源
- 招标公告
- 一键报备

### 知识库

- 知识库
- 知识库文件

### 系统管理

- 用户管理
- 角色管理
- 菜单管理
- 企业管理
- 文件资源
- 系统配置
- 字典类型
- 字典数据

## 启动方式

先启动后端 Spring Boot 项目，确认后端端口是 `8080`。

然后启动前端：

```bash
cd ai-bid-web
npm install
npm run dev
```

打开：

```txt
http://localhost:5173
```

## 修改后端地址

开发环境修改 `.env.development`：

```env
VITE_DEV_PROXY_TARGET=http://localhost:8080
VITE_API_BASE=/ai_bid/api
```

生产环境修改 `.env.production`：

```env
VITE_API_BASE=/ai_bid/api
```

## 目录说明

```txt
src/
  api/                 接口封装
  components/          通用组件
  config/              模块字段配置、状态映射
  layout/              后台整体布局
  router/              路由
  stores/              Pinia 状态
  styles/              全局样式
  utils/               请求、存储、格式化工具
  views/               页面
```

## 重要说明

1. 后端很多普通模块都是标准 CRUD 接口：`/page`、`/list`、`GET /{id}`、`POST`、`PUT /{id}`、`DELETE /{id}`，所以前端使用了 `CrudPage.vue` 通用页面。
2. 用户管理接口比较特殊，后端是 `/system/user/page` 且分页参数是 `pageNum/pageSize`，所以单独生成了用户管理页面。
3. 标书项目涉及 AI 生成、文件上传、内容预览、导出，所以单独生成了专用页面。
4. 如果后端某些 Controller 的路径你后面改了，只需要改 `src/config/moduleConfigs.js` 里的 `baseUrl`。
5. 普通 CRUD 接口目前后端分页只接收 `current/size`，所以前端虽然提供 keyword，但实际后端没有写条件的模块会出现“当前页内筛选”。用户管理接口已按后端 DTO 传 `keyword`。
