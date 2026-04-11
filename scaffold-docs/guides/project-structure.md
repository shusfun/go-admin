# 项目结构

本文档说明这套脚手架的目录职责，以及新增能力时应该落到哪里。

## 1. 仓库一级目录

| 目录 | 作用 |
| --- | --- |
| `app/` | 后端业务模块，按域拆分，例如 `admin`、`jobs`、`ops`、`other` |
| `cmd/` | Cobra 命令入口、数据库迁移、启动流程 |
| `common/` | 公共中间件、模型、DTO、数据库初始化、文件存储、Setup 公共能力 |
| `config/` | YAML 配置、初始化 SQL、扩展配置 |
| `frontend/` | 前端 pnpm monorepo，含后台、移动端、共享包 |
| `tools/repo-cli/` | 仓库级开发 CLI 的源码 |
| `docs/` | 需求文档目录，`docs/admin-swagger/` 保留 Swagger 生成产物 |
| `scaffold-docs/` | 脚手架说明、开发指南、专题设计文档 |
| `template/` | 后端代码生成所需模板文件 |
| `test/` | 仓库级测试与生成测试样例 |

## 2. 后端分层约定

后端业务代码以 `app/<module>/` 组织，常见落点如下：

| 目录 | 作用 |
| --- | --- |
| `app/<module>/models` | 数据模型 |
| `app/<module>/service` | 业务逻辑 |
| `app/<module>/service/dto` | 请求、响应 DTO |
| `app/<module>/apis` | HTTP 接口处理 |
| `app/<module>/router` | 路由注册 |

新增一个后端业务模块时，优先遵循下面的最小落点：

1. 在 `app/<module>/models` 定义模型
2. 在 `app/<module>/service` 编排业务逻辑
3. 在 `app/<module>/apis` 暴露接口
4. 在 `app/<module>/router` 注册路由
5. 若涉及建表或结构变更，在 `cmd/migrate/migration/` 新增迁移

## 3. 前端分层约定

`frontend/` 是工作区模式：

| 目录 | 作用 |
| --- | --- |
| `frontend/apps/admin-web` | PC 管理后台 |
| `frontend/apps/mobile-h5` | 移动端 H5 |
| `frontend/apps/ui-showcase` | UI 组件与样式展示 |
| `frontend/packages/api` | OpenAPI 同步后的 API client 与接口封装 |
| `frontend/packages/auth` | 鉴权与会话 |
| `frontend/packages/core` | 通用业务工具函数 |
| `frontend/packages/design-tokens` | 品牌和主题 Token |
| `frontend/packages/ui-admin` | PC 后台共享 UI |
| `frontend/packages/ui-mobile` | 移动端共享 UI |
| `frontend/packages/types` | 共享 TypeScript 类型 |

新增前端页面或能力时，建议遵循：

1. 页面放在对应 `apps/*`
2. 公共组件沉淀到 `packages/ui-*`
3. API 类型优先从 `packages/api` 获取，不手写重复类型
4. 主题、品牌、样式 Token 优先沉淀到 `packages/design-tokens`

## 4. 配置与安装相关目录

- `config/settings*.yml`：运行配置
- `config/.installed`：安装锁文件
- `common/setup/`：Setup Wizard 后端逻辑
- `frontend/apps/admin-web/src/pages/setup-wizard-page.tsx`：安装向导前端页

这一组目录共同构成“首次安装 -> 配置落盘 -> 自动重启”的脚手架安装链路。

## 5. 开发辅助与生成产物

- `tools/repo-cli/`：统一封装依赖安装、服务启动、日志查看、OpenAPI 同步、重置、改名等流程
- `docs/admin-swagger/admin_swagger.*`：后端接口生成产物
- `template/*.template`：后端代码生成模板

## 6. 文档分层

- 脚手架入口文档：`scaffold-docs/guides/`
- 专题设计文档：`scaffold-docs/specs/`、`scaffold-docs/admin/`
- 需求文档：`docs/`
- 自动生成参考：`docs/admin-swagger/admin_swagger.*`

如果遇到“目录看懂了，但不知道平时怎么开发”，下一步请看 [开发工作流](./development-workflow.md)。
