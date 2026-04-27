# 后端接口分析记录

根据上传的后端项目分析，当前后端是 Spring Boot 3 + MyBatis-Plus + Spring Security + JWT。

## 一、统一接口规则

### API 前缀

后端 `application.yml`：

```yaml
app:
  api-prefix: /ai_bid/api
```

所以前端 `VITE_API_BASE=/ai_bid/api`。

### 返回格式

`Result<T>`：

```json
{
  "code": 0,
  "message": "success",
  "data": {}
}
```

### 分页格式

`PageResult<T>`：

```json
{
  "total": 0,
  "records": [],
  "pageNum": 1,
  "pageSize": 10,
  "pages": 0
}
```

### JWT

后端 `JwtAuthenticationFilter` 从请求头读取：

```txt
Authorization: Bearer token
```

### 放行接口

后端 Security 放行：

```txt
/ai_bid/api/auth/**
/swagger-ui.html
/swagger-ui/**
/v3/api-docs/**
```

## 二、认证接口

| 功能 | 方法 | 地址 |
|---|---|---|
| 验证码 | GET | `/auth/captcha` |
| 登录 | POST | `/auth/login` |
| 注册 | POST | `/auth/register` |
| 退出 | POST | `/auth/logout` |
| 当前用户 | GET | `/auth/me` |

登录入参：

```json
{
  "account": "admin",
  "username": "",
  "password": "123456",
  "captchaKey": "",
  "captchaCode": ""
}
```

登录返回：

```json
{
  "tokenType": "Bearer",
  "token": "",
  "expiresIn": 86400,
  "userId": 1,
  "username": "admin",
  "fullName": "",
  "phone": "",
  "roles": [],
  "permissions": [],
  "menus": []
}
```

## 三、核心业务接口

### 标书项目

| 功能 | 方法 | 地址 |
|---|---|---|
| 分页 | GET | `/bid-project/page?current=1&size=10` |
| 列表 | GET | `/bid-project/list` |
| 详情 | GET | `/bid-project/{id}` |
| 新增 | POST | `/bid-project` |
| 修改 | PUT | `/bid-project/{id}` |
| 删除 | DELETE | `/bid-project/{id}` |

### AI生成

| 功能 | 方法 | 地址 |
|---|---|---|
| 通用生成 | POST | `/ai/generate` |
| 按标书项目生成 | POST | `/ai/bid-project/{projectId}/generate` |
| AI连通测试 | POST | `/ai/test` |
| 导出Word | POST | `/ai/export/word/{resultId}` |
| 导出Markdown | POST | `/ai/export/markdown/{resultId}` |

### 文件上传

| 功能 | 方法 | 地址 |
|---|---|---|
| 上传文件 | POST | `/files/upload` |

上传参数：

```txt
file: MultipartFile
moduleType: other / tender_material / bid_export 等
bizId: 业务ID
privateFlag: true/false
```

## 四、数据库核心表字段

### t_bid_project

| 字段 | 说明 |
|---|---|
| id | 主键 |
| enterprise_id | 所属企业ID |
| user_id | 创建用户ID |
| project_name | 项目名称 |
| project_code | 项目编号 |
| bid_template_id | 标书业务模板ID |
| prompt_template_id | Prompt模板ID |
| knowledge_ids | 引用知识库ID列表 |
| project_type | 项目类型 |
| client_name | 招标方/客户名称 |
| budget_amount | 预算金额 |
| period_days | 工期天数 |
| status | draft/generating/completed/failed/archived |
| generated_file_id | 生成文件ID |
| file_url | 生成文件URL |
| content_markdown | 最后生成的Markdown内容 |

### t_prompt_template

| 字段 | 说明 |
|---|---|
| id | 主键 |
| name | 模板名称 |
| scene | 场景 |
| content | Prompt模板内容 |
| model_provider | 推荐模型服务商 |
| model_name | 推荐模型 |
| version_no | 版本 |
| status | 状态 |

### t_ai_generate_task / t_ai_generate_result

用于记录 AI 生成任务和结果，前端已生成只读或可编辑管理页。

## 五、前端实现取舍

1. 标书项目和用户管理是业务复杂页面，单独写页面。
2. 普通标准 CRUD 模块用 `CrudPage.vue + moduleConfigs.js` 配置生成，后续维护只改配置。
3. 所有列表页采用一个 keyword 输入框，自动防抖查询。
4. 表格统一使用 `class="ui-table"`。
5. 分页统一用 `PageFooterPager`，放在同一个 card 底部。
