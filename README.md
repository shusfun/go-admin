
# go-admin

<img align="right" width="320" src="https://doc-image.zhangwj.com/img/go-admin.svg">

[![Build Status](https://github.com/wenjianzhang/go-admin/workflows/build/badge.svg)](https://github.com/go-admin-team/go-admin)
[![Release](https://img.shields.io/github/release/go-admin-team/go-admin.svg?style=flat-square)](https://github.com/go-admin-team/go-admin/releases)
[![License](https://img.shields.io/github/license/mashape/apistatus.svg)](https://github.com/go-admin-team/go-admin)

基于 **Go (Gin + GORM + Casbin)** 后端与 **React 19 + TypeScript** 前端的全栈 RBAC 权限管理系统。

首次部署无需手动编辑配置文件 —— 通过内置的 **Setup Wizard（安装向导）** 即可在浏览器中完成数据库、Redis 连接配置和管理员账号创建。

## 功能特性

- 遵循 RESTful API 设计规范
- 基于 Gin 框架，提供丰富的中间件支持（用户认证、跨域、访问日志、链路追踪等）
- 基于 Casbin 的 RBAC 访问控制模型
- JWT 认证
- Swagger 接口文档（基于 swaggo）
- 基于 GORM 的数据库存储，支持 PostgreSQL / MySQL / SQLite / SQL Server
- 代码生成工具 —— 根据数据表结构自动生成增删改查业务代码
- 运维任务执行 —— 支持 SSE 实时推流
- 定时任务调度（robfig/cron）
- **Setup Wizard** —— 浏览器引导式初始化安装

## 内置功能模块

| 模块 | 说明 |
|---|---|
| 用户管理 | 系统用户配置与维护 |
| 部门管理 | 组织架构（公司、部门、组），树形结构，支持数据权限 |
| 岗位管理 | 系统用户岗位配置 |
| 菜单管理 | 菜单、按钮权限、接口权限配置 |
| 角色管理 | 角色菜单权限分配，按组织划分数据范围 |
| 字典管理 | 维护系统常用固定数据 |
| 参数管理 | 动态配置系统公共参数 |
| 操作日志 | 系统正常操作与异常信息的记录与查询 |
| 登录日志 | 登录记录查询，包含登录异常 |
| 接口文档 | 根据业务代码自动生成 API 文档 |
| 代码生成 | 根据数据表结构生成完整 CRUD 业务，零代码实现基础功能 |
| 服务监控 | 查看服务器基本信息 |

## 项目结构

```
go-admin/
├── app/
│   ├── admin/          # 核心 RBAC：用户、角色、菜单、部门、岗位、字典、配置、日志
│   ├── jobs/           # 定时任务调度
│   ├── ops/            # 运维任务执行（部署、重启），SSE 实时推流
│   └── other/          # 文件上传、代码生成、服务器监控
├── cmd/                # Cobra CLI 子命令
├── common/             # 公共层：中间件、模型、DTO、数据库初始化、文件存储
│   └── setup/          # Setup Wizard 后端逻辑
├── config/             # YAML 配置文件 + 初始化 SQL
├── frontend/           # pnpm monorepo 前端工作区
│   ├── apps/
│   │   ├── admin-web/  # PC 端管理后台
│   │   └── mobile-h5/  # 移动端 H5
│   └── packages/
│       ├── api/        # Axios HTTP 客户端工厂
│       ├── auth/       # 会话管理（Token 存储与刷新）
│       ├── core/       # 业务工具函数
│       ├── design-tokens/  # 品牌色 Token + CSS 自定义属性
│       ├── types/      # 共享 TypeScript 接口
│       ├── ui-admin/   # PC 端布局组件
│       └── ui-mobile/  # 移动端布局组件
└── pnpm-workspace.yaml
```

## 环境要求

- **Go** 1.24+
- **Node.js** 18+
- **pnpm** 10+
- **PostgreSQL** 12+（推荐）或 MySQL 5.7+ / SQLite / SQL Server
- **Redis** 6+

## 快速开始

### 1. 获取代码

```bash
git clone https://github.com/go-admin-team/go-admin.git
cd go-admin
```

### 2. 构建 `devctl`

```bash
go build -o ./devctl ./tools/devctl
```

Windows 下会生成 `devctl.exe`，其余平台生成 `devctl`。后续开发流程统一通过这个工具执行。

### 3. 检查环境并安装依赖

```bash
./devctl doctor
./devctl deps all
```

### 4. 启动开发基础设施

```bash
./devctl service start postgres redis
```

默认会启动：

- PostgreSQL：`127.0.0.1:15432`
- Redis：`127.0.0.1:16379`

Docker 项目前缀默认取仓库根 `package.json.name`，当前仓库默认值为 `go-admin`。如果需要自定义容器前缀，可覆盖：

```bash
./devctl --project-prefix my-local-env service start postgres redis
```

### 5. 启动后端与前端

```bash
./devctl service start backend
./devctl service start admin
```

如需移动端开发：

```bash
./devctl service start mobile
```

`devctl service start backend` 默认读取 `config/settings.pg.yml`，与本地 PostgreSQL / Redis 开发基础设施配套。

- Windows / macOS：`backend`、`admin`、`mobile` 默认在独立终端窗口启动
- Linux：本地服务保持在当前终端体系内运行，不依赖额外图形窗口
- `postgres` / `redis` 始终通过 `docker compose up -d` 后台运行

首次启动时，后端检测到系统未安装，会进入 **Setup Wizard 模式**：仅暴露 `/api/v1/setup/*` 路由，不连接数据库，等待前端引导完成初始化配置。

如果你更偏好交互式入口，可以直接打开 TUI：

```bash
./devctl tui
```

`devctl tui` 现在会显示服务面板、动作面板和输出面板，并支持：

- `Space` 勾选服务
- `Enter` 执行右侧动作栏当前高亮动作
- `Tab` 在服务面板与动作面板间切换
- `s/x/r/l/d/u/q` 直接触发启动、停止、重启、日志、自检、刷新、退出

所有受管服务日志和状态文件都会写入项目内的 `temp/devctl/`，便于直接排查：

- `temp/devctl/logs/<service>.log`
- `temp/devctl/state.json`

打开浏览器访问前端地址，系统会自动检测后端状态并显示 **Setup Wizard** 界面。

### 6. 完成安装向导

安装向导分为三个步骤：

1. **数据库配置** — 填写 PostgreSQL 连接信息，点击「测试连接」验证通过后进入下一步
2. **Redis 配置** — 填写 Redis 连接信息，点击「测试连接」验证通过后进入下一步
3. **管理员账号** — 设置管理员用户名、密码、邮箱（可选）、手机号（可选）

点击「开始安装」后，后端将自动：
- 生成 `config/settings.yml` 配置文件
- 创建数据库表并导入初始化数据
- 创建管理员账号
- 写入 `.installed` 锁文件
- 自动重启服务

重启完成后，前端自动跳转到登录页面，使用刚才设置的管理员账号登录即可。

### 7. 重置环境

```bash
./devctl reinit --yes
```

该命令会同时清理：

- 应用 compose 栈
- PostgreSQL / Redis 开发容器与数据卷
- `config/.installed`
- 本地构建产物与日志

如果前面使用过自定义前缀，重置时也要使用同一个前缀：

```bash
./devctl --project-prefix my-local-env reinit --yes
```

## Setup Wizard 说明

### 工作原理

系统采用**两阶段启动**模式：

```
后端启动 → 检测 NeedsSetup()
  ├─ YES → Setup 模式（轻量 Gin 服务，仅注册 /api/v1/setup/* 路由）
  │         前端检测 needs_setup=true → 显示安装向导
  │         完成安装 → 后端写入配置 → 自动重启
  └─ NO  → 正常模式（完整业务路由、数据库、队列、定时任务等）
           前端检测 needs_setup=false → 显示登录页
```

### 判定逻辑

`NeedsSetup()` 在以下**任一**条件满足时返回 `true`：
- `config/settings.yml` 文件不存在
- 同目录下的 `.installed` 锁文件不存在

### 注意事项

- Setup Wizard 仅暴露后端 API，Go 服务不托管前端静态文件。需要单独部署/启动前端应用
- 前端通过 `VITE_API_BASE_URL` 环境变量指向后端服务地址
- 安装接口受 `setupGuard` 中间件保护，系统安装完成后所有安装端点返回 403
- 容器部署时，需要持久化 `config/` 目录，确保生成的 `settings.yml` 和 `.installed` 在重启后保留
- 已有配置文件但缺少 `.installed` 锁文件的部署环境，升级后会被视为「未安装」状态

## 常用命令

### 后端 / 开发工具

```bash
go build -o ./devctl ./tools/devctl               # 构建 devctl 工具
./devctl doctor                                   # 检查 go/node/pnpm/docker/docker compose
./devctl env                                      # 打印当前端口、前缀、日志目录和状态文件
./devctl setup-status                             # 检查是否会进入 Setup Wizard
./devctl service start postgres redis             # 启动 PostgreSQL + Redis 开发基础设施
./devctl service start backend                    # 启动 API 服务（默认使用 config/settings.pg.yml）
./devctl service start admin                      # 启动 admin-web 开发服务器
./devctl service start mobile                     # 启动 mobile-h5 开发服务器
./devctl service stop all                         # 停止全部受管服务
./devctl reinit --yes                             # 重置应用栈、PG/Redis 数据卷与安装态
./devctl build backend                            # CGO_ENABLED=0，输出 ./go-admin
./devctl test backend                             # 运行后端测试
./devctl migrate                                  # 数据库迁移
./go-admin server -c config/settings.yml -a true  # 启动并自动同步 sys_api 记录
```

### 前端

```bash
./devctl deps frontend    # 安装 pnpm 工作区依赖
./devctl service start admin
./devctl service start mobile
./devctl openapi          # 生成 Swagger，并同步前端 client + types
./devctl test frontend    # 运行前端测试
pnpm build                # 构建所有包和应用
pnpm test                 # 运行全部测试 (vitest)
pnpm typecheck            # 全工作区 TypeScript 类型检查
```

### Docker

```bash
# 构建镜像
docker build -t go-admin:latest .

# 启动开发基础设施
./devctl service start postgres redis

# 启动应用容器
docker compose up -d

# 停止应用容器
docker compose down
```

容器首次启动时同样会进入 Setup Wizard 模式，通过浏览器完成安装即可。

`devctl` 与 `docker compose` 默认都读取仓库名推导出的项目名前缀，当前仓库默认值为 `go-admin`。如需覆盖，可以在命令前传入 `--project-prefix`。

### 交叉编译

```bash
# Linux
GOOS=linux GOARCH=amd64 go build -o go-admin .

# Windows
GOOS=windows GOARCH=amd64 go build -o go-admin.exe .
```

## API 约定

| 项目 | 说明 |
|---|---|
| 管理端接口 | `/admin-api/v1/...` |
| 移动端接口 | `/app-api/v1/...` |
| 安装向导接口 | `/api/v1/setup/...`（仅 Setup 模式可用） |
| 响应格式 | `{ code: number, data: T, msg: string }` — code 200 表示成功 |
| 认证方式 | `Authorization: Bearer <JWT>` + `X-Client-Type` + `X-Tenant-Code` 请求头 |

## 配置文件

主配置文件由 Setup Wizard 自动生成，存放于 `config/settings.yml`。手动配置可参考：

| 文件 | 说明 |
|---|---|
| `config/settings.full.yml` | 完整配置示例（含所有可用选项） |
| `config/settings.pg.yml` | PostgreSQL 配置示例 |
| `config/settings.sqlite.yml` | SQLite 配置示例 |
| `config/settings.demo.yml` | 容器内示例配置 |

## 致谢

- [gin](https://github.com/gin-gonic/gin)
- [casbin](https://github.com/casbin/casbin)
- [gorm](https://github.com/jinzhu/gorm)
- [gin-swagger](https://github.com/swaggo/gin-swagger)
- [React](https://react.dev)
- [TanStack Query](https://tanstack.com/query)
- [Vite](https://vite.dev)
- [ruoyi-vue](https://gitee.com/y_project/RuoYi-Vue)

## 许可证

[MIT](https://github.com/go-admin-team/go-admin/blob/master/LICENSE.md)

Copyright (c) 2022 wenjianzhang
