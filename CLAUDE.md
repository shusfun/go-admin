# CLAUDE.md

本文件为 Claude Code (claude.ai/code) 在本仓库中工作时提供指引。

## 项目概览

go-admin 是一个基于 **Go (Gin + GORM + Casbin)** 后端和 **React 19 + TypeScript** 前端的全栈 RBAC 权限管理系统。仓库采用 monorepo 结构：Go 业务模块在 `app/` 下，前端工作区（pnpm monorepo）在 `frontend/` 下。

## 构建与开发命令

### 后端 (Go 1.24)

```bash
# 构建
make build                                      # CGO_ENABLED=0，输出 ./go-admin
go build -tags sqlite3 -o go-admin .            # 需要 SQLite 时使用

# 运行
./go-admin server -c config/settings.yml        # 启动 API 服务（默认端口 8000）
./go-admin server -c config/settings.yml -a true # 启动并自动同步 sys_api 记录
./go-admin migrate -c config/settings.yml       # 数据库迁移

# 测试与工具
go test ./...                                   # 运行全部测试
go mod tidy                                     # 提交前同步依赖
go generate                                     # 重新生成 Swagger 文档
gofmt -w .                                      # 提交前格式化
```

### 前端 (pnpm 10, Node.js)

```bash
pnpm install                    # 安装全部工作区依赖
pnpm dev:admin                  # 启动 admin-web 开发服务器
pnpm dev:mobile                 # 启动 mobile-h5 开发服务器
pnpm build                      # 构建所有包和应用
pnpm test                       # 运行全部测试 (vitest)
pnpm typecheck                  # 全工作区 TypeScript 类型检查
```

运行单个包的测试：
```bash
pnpm --filter @suiyuan/core test
```

### Docker

```bash
make build-linux                # docker build -t go-admin:latest
make run                        # docker-compose up -d
make stop                       # docker-compose down
```

## 架构

### 后端结构

后端是一个单 Go 二进制程序，多个业务模块共享同一个 Gin 引擎。入口：`main.go` -> `cmd/cobra.go` -> 子命令 (`server`, `migrate`, `config`, `version`, `app`)。

```
app/
  admin/    # 核心 RBAC：用户、角色、菜单、部门、岗位、字典、配置、日志
  jobs/     # 定时任务调度 (robfig/cron)，任务日志
  ops/      # 运维任务执行（部署、重启），支持 SSE 实时推流
  other/    # 文件上传、代码生成（根据数据库表结构）、服务器监控
cmd/        # Cobra CLI 子命令；cmd/api/server.go 是主服务入口
common/     # 公共层：中间件、模型、DTO、数据库初始化、文件存储、响应封装
config/     # YAML 配置文件 + 初始化 SQL
```

每个 `app/*` 模块遵循相同的内部布局：
- `apis/` — Gin 处理函数
- `models/` — GORM 模型定义
- `router/` — 路由注册（`init_router.go` 引导，按资源拆分文件注册路由组）
- `service/` — 业务逻辑层（含 `dto/` 子包存放请求/响应结构体）

核心框架：Gin（HTTP）、GORM（ORM，支持 MySQL/PostgreSQL/SQLite/SQLServer）、Casbin（RBAC 策略）、JWT 认证、Swagger (swaggo)。

### 前端结构

pnpm workspace monorepo，包含两个应用和七个共享包。

```
frontend/
  apps/
    admin-web/   # PC 端管理后台 — React 19 + Vite + React Router + TanStack Query
    mobile-h5/   # 移动端 H5 — 同技术栈，不同 UI 组件
  packages/
    api/             # Axios HTTP 客户端工厂 (createApiClient)，ops SSE 推流
    auth/            # 会话管理（localStorage）、Token 刷新、过期检查
    core/            # 业务工具函数（菜单树构建、租户解析）
    design-tokens/   # 品牌色 Token + CSS 自定义属性
    types/           # 共享 TypeScript 接口（所有 API 请求/响应类型）
    ui-admin/        # PC 端布局组件（AdminShell、TreeNav、MetricCard 等）
    ui-mobile/       # 移动端布局组件（MobileShell、BottomTabBar 等）
```

依赖流向：`types` <- `auth` <- `api` <- 应用；`core` <- 应用；`design-tokens` <- 应用；`ui-admin` <- `admin-web`；`ui-mobile` <- `mobile-h5`。

### API 约定

- 管理端接口：`/admin-api/v1/...`
- 移动端接口：`/app-api/v1/...`
- 响应信封格式：`{ code: number, data: T, msg: string }` — code 200 表示成功，401 表示未授权
- 认证方式：`Authorization` 头携带 JWT Bearer Token，附加 `X-Client-Type` 和 `X-Tenant-Code` 自定义请求头

## 编码规范

### Go
- 包名小写，导出标识符 `PascalCase`，内部标识符 `camelCase`。
- 文件名：`sys_user.go`（snake_case）。
- 提交前执行 `gofmt` 格式化。
- 处理函数放 `app/*/apis`，路由放 `app/*/router`，共享逻辑放 `common/`。
- 配置文件命名：`settings.yml`、`settings.sqlite.yml`、`settings.pg.yml`。

### TypeScript / React
- 所有包使用 ESM（`"type": "module"`）。
- 包从 `src/index.ts`（或 `.tsx`）导出，本地开发无需构建（Vite 直接解析 workspace 源码）。
- 表单：react-hook-form + zod 校验。
- 数据获取：TanStack React Query。

## 配置说明

主配置文件：`config/settings.yml`。通过 `settings.database.driver` 支持多种数据库（mysql、sqlite3、postgres、sqlserver）。扩展配置在 `settings.extend` 中，如 ops 任务超时、环境列表等。完整配置参见 `config/settings.full.yml`。

## 提交规范

使用 Conventional Commits：`fix:`、`refactor:`、`docs:`、`chore:`。祈使语气，单一目的。PR 默认基于 `master` 分支发起。
