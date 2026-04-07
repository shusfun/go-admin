# 运维服务一期 - 实施方案

> 本文档是面向实施者的完整技术规格，可直接按本文档编码实现。

## 1. 项目背景

本项目基于 [go-admin](https://github.com/go-admin-team/go-admin)，技术栈：

- Go + Gin + GORM + JWT + Casbin
- 代码结构：`app/{module}/apis/`、`app/{module}/models/`、`app/{module}/service/`、`app/{module}/service/dto/`、`app/{module}/router/`
- API 层嵌入 `api.Api`，使用 `e.MakeContext(c).MakeOrm().Bind().MakeService().Errors` 链式调用
- Service 层嵌入 `service.Service`，通过 `e.Orm` 操作数据库
- Model 层嵌入 `models.ControlBy` + `models.ModelTime`
- 权限检查：`rolekey == "admin"` 跳过 Casbin 鉴权（见 `common/middleware/permission.go`）
- 路由注册：在 router 包的 `init()` 中 append 到 `routerCheckRole` 切片
- 配置扩展：`config/extend.go` 的 `Extend` 结构体 + `config/settings.yml` 的 `extend` 段

## 2. 目标

在当前后端新增一个"运维服务"模块（`app/ops/`），供前端调用，支持 dev / test / prod 三个环境的前后端发布与后端重启。仅 admin 角色可使用。

**前端约定**：一期前端发布只支持 `React + Vite + pnpm` 项目。

**核心体验**：admin 打开页面 → 看到环境状态 → 点一下按钮 → 看到分步进度和实时日志 → 完成。全程零表单、零输入。

---

## 3. 环境配置（YAML，不入库）

环境配置写在 `config/settings.yml` 的 `extend.ops` 段，不存数据库。改配置重启生效。

### 3.1 配置结构

在 `config/extend.go` 中扩展 `Extend` 结构体：

```go
// config/extend.go
type Extend struct {
    AMap AMap
    Ops  OpsConfig `yaml:"ops"`
}

type OpsConfig struct {
    TaskTimeoutSeconds int              `yaml:"taskTimeoutSeconds"` // 全局任务超时，单位秒
    Environments       []OpsEnvironment `yaml:"environments"`
}

type OpsEnvironment struct {
    Key                string `yaml:"key"`               // dev / test / prod
    Name               string `yaml:"name"`              // 显示名称，如"开发环境"
    Enabled            bool   `yaml:"enabled"`           // 是否启用
    Domain             string `yaml:"domain"`            // 展示域名，如 https://dev.example.com
    ConfirmName        bool   `yaml:"confirmName"`       // 是否需要输入环境名确认（prod 设 true）
    TaskTimeoutSeconds int    `yaml:"taskTimeoutSeconds"` // 环境级超时覆盖，单位秒

    Backend  OpsBackendTarget  `yaml:"backend"`
    Frontend OpsFrontendTarget `yaml:"frontend"`
}

type OpsBackendTarget struct {
    RepoDir      string `yaml:"repoDir"`      // 后端仓库绝对路径
    ComposeFile  string `yaml:"composeFile"`   // docker-compose 文件路径，默认 repoDir/docker-compose.yml
    ServiceName  string `yaml:"serviceName"`   // compose service 名称
    HealthURL    string `yaml:"healthURL"`     // 健康检查 URL，如 http://localhost:8000/api/v1/health
}

type OpsFrontendTarget struct {
    RepoDir      string `yaml:"repoDir"`      // 前端仓库绝对路径
    DistDir      string `yaml:"distDir"`      // 构建产物相对目录，默认 "dist"
    PublishDir   string `yaml:"publishDir"`   // 静态文件发布绝对路径
    ReloadNginx  bool   `yaml:"reloadNginx"`  // 是否在发布后执行 nginx -s reload
}
```

### 3.2 settings.yml 示例

```yaml
extend:
  ops:
    taskTimeoutSeconds: 900
    environments:
      - key: dev
        name: 开发环境
        enabled: true
        domain: https://dev.example.com
        confirmName: false
        taskTimeoutSeconds: 900
        backend:
          repoDir: /data/projects/backend-dev
          serviceName: backend
          healthURL: http://localhost:8001/api/v1/health
        frontend:
          repoDir: /data/projects/frontend-dev
          distDir: dist
          publishDir: /data/www/dev
          reloadNginx: true

      - key: test
        name: 测试环境
        enabled: true
        domain: https://test.example.com
        confirmName: false
        backend:
          repoDir: /data/projects/backend-test
          serviceName: backend
          healthURL: http://localhost:8002/api/v1/health
        frontend:
          repoDir: /data/projects/frontend-test
          distDir: dist
          publishDir: /data/www/test
          reloadNginx: true

      - key: prod
        name: 生产环境
        enabled: true
        domain: https://www.example.com
        confirmName: true
        backend:
          repoDir: /data/projects/backend-prod
          serviceName: backend
          healthURL: http://localhost:8000/api/v1/health
        frontend:
          repoDir: /data/projects/frontend-prod
          distDir: dist
          publishDir: /data/www/prod
          reloadNginx: true
```

---

## 4. 数据模型（仅一张表）

只建一张 `ops_task` 表，日志直接存 text 字段。单任务日志最多保留 `1MB`，超出后截断旧内容，仅保留最新日志。

### 4.1 Model 定义

```go
// app/ops/models/ops_task.go
package models

import (
    "go-admin/common/models"
    "time"
)

type OpsTask struct {
    models.Model                          // Id int

    Env        string     `json:"env" gorm:"size:20;index;comment:环境标识"`
    Type       string     `json:"type" gorm:"size:30;index;comment:任务类型"`
    Status     string     `json:"status" gorm:"size:20;index;comment:任务状态"`
    Step       int        `json:"step" gorm:"comment:当前步骤序号(从1开始)"`
    TotalSteps int        `json:"totalSteps" gorm:"comment:总步骤数"`
    StepName   string     `json:"stepName" gorm:"size:100;comment:当前步骤名称"`
    Summary    string     `json:"summary" gorm:"size:500;comment:执行摘要"`
    ErrMsg     string     `json:"errMsg" gorm:"size:1000;comment:错误信息"`
    Suggestion string     `json:"suggestion" gorm:"size:500;comment:失败建议"`
    Commits    string     `json:"commits" gorm:"type:text;comment:本次包含的提交列表JSON"`
    Log        string     `json:"log" gorm:"type:text;comment:完整日志"`
    StartedAt  *time.Time `json:"startedAt" gorm:"comment:开始时间"`
    FinishedAt *time.Time `json:"finishedAt" gorm:"comment:结束时间"`

    models.ControlBy                      // CreateBy, UpdateBy
    models.ModelTime                      // CreatedAt, UpdatedAt, DeletedAt
}

func (OpsTask) TableName() string {
    return "ops_task"
}

func (e *OpsTask) Generate() models.ActiveRecord {
    o := *e
    return &o
}

func (e *OpsTask) GetId() interface{} {
    return e.Id
}
```

### 4.2 任务类型常量

```go
const (
    TaskTypeDeployBackend  = "deploy_backend"
    TaskTypeDeployFrontend = "deploy_frontend"
    TaskTypeDeployAll      = "deploy_all"
    TaskTypeRestart        = "restart_backend"
)
```

### 4.3 任务状态常量

```go
const (
    TaskStatusQueued    = "queued"
    TaskStatusRunning   = "running"
    TaskStatusSuccess   = "success"
    TaskStatusFailed    = "failed"
    TaskStatusCancelled = "cancelled"
)
```

### 4.4 数据库迁移

在 `cmd/migrate/migration/` 下新增迁移文件，使用 GORM AutoMigrate 创建 `ops_task` 表。

---

## 5. API 接口设计

所有接口挂在 `/api/v1/ops` 下，使用 JWT 认证 + admin 角色校验。

### 5.1 接口列表

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/v1/ops/environments | 返回环境列表（含状态、上次发布时间、待发布提交数） |
| POST | /api/v1/ops/tasks | 创建任务（参数只有 env + type + 可选 confirmName） |
| GET | /api/v1/ops/tasks | 任务列表（分页，可按 env/type/status 筛选） |
| GET | /api/v1/ops/tasks/:id | 任务详情 |
| POST | /api/v1/ops/tasks/:id/cancel | 取消 queued/running 任务 |
| GET | /api/v1/ops/tasks/:id/stream | SSE 推送任务进度和日志增量 |

**注意**：列表接口不返回 `log` 字段；日志只在详情接口和 SSE 中出现。

### 5.2 GET /api/v1/ops/environments

返回前端渲染环境卡片所需的全部信息。

**响应示例**：

```json
{
  "code": 200,
  "data": [
    {
      "key": "dev",
      "name": "开发环境",
      "enabled": true,
      "domain": "https://dev.example.com",
      "confirmName": false,
      "status": "healthy",
      "lastDeploy": {
        "type": "deploy_all",
        "status": "success",
        "finishedAt": "2026-04-07T10:30:00+08:00"
      },
      "pendingCommits": {
        "backend": {
          "count": 3,
          "recent": [
            {
              "hash": "abc1234",
              "message": "修复登录页样式"
            }
          ],
          "commits": [
            {
              "hash": "abc1234",
              "message": "修复登录页样式"
            },
            {
              "hash": "def5678",
              "message": "新增用户导出功能"
            }
          ]
        },
        "frontend": {
          "count": 5,
          "recent": [],
          "commits": []
        }
      },
      "runningTask": null,
      "actions": ["deploy_backend", "deploy_frontend", "deploy_all", "restart_backend"]
    }
  ],
  "msg": "查询成功"
}
```

**实现逻辑**：
1. 遍历 `config.ExtConfig.Ops.Environments`
2. 对每个环境：
   - 查 `ops_task` 表最近一条完成的任务 → `lastDeploy`
   - 查 `ops_task` 表是否有 `status=running` 或 `status=queued` 的任务 → `runningTask`
  - 对后端和前端 repoDir 获取待发布提交；`git fetch --prune` 结果在进程内缓存 60 秒，并用 singleflight 合并并发请求
  - `pendingCommits.count` 返回总数，`pendingCommits.recent` 固定返回最近 10 条，`pendingCommits.commits` 返回完整待发布提交列表，供 prod 确认弹窗直接展示
  - 对 `healthURL` 发 HTTP GET 检查是否返回 200 → `status`（超时 3 秒，失败则 `unhealthy`）
  - 环境检查并行执行，避免慢环境拖垮整个列表
3. 返回列表

### 5.3 POST /api/v1/ops/tasks

创建并异步执行一个任务。

**请求体**：

```json
{
  "env": "dev",
  "type": "deploy_backend",
  "confirmName": ""
}
```

- `env`：必填，必须是配置中存在且 `enabled=true` 的环境
- `type`：必填，必须是 `deploy_backend` / `deploy_frontend` / `deploy_all` / `restart_backend`
- `confirmName`：仅当环境 `confirmName=true` 时必填，值必须等于环境的 `key`（如 "prod"）
- prod 前端必须先展示完整提交列表，再允许提交确认

**校验规则**：
1. 环境不存在或未启用 → 400 "环境不存在或未启用"
2. 任务类型不合法 → 400 "不支持的任务类型"
3. `confirmName` 配置为 true 但未传或不匹配 → 400 "请输入环境名称确认"
4. 该环境已有 running/queued 状态的任务 → 409 "该环境有正在执行的任务，请等待完成"
5. 校验通过 → 创建任务记录（status=queued），启动 goroutine 异步执行，返回任务 ID

**响应示例**：

```json
{
  "code": 200,
  "data": {
    "id": 42
  },
  "msg": "任务已创建"
}
```

### 5.4 GET /api/v1/ops/tasks

任务列表，分页。

**查询参数**：
- `env`：可选，按环境筛选
- `type`：可选，按类型筛选
- `status`：可选，按状态筛选
- `pageIndex`：页码，默认 1
- `pageSize`：每页条数，默认 10

**注意**：列表接口不返回 `log` 字段（太大），只返回摘要信息。

### 5.5 GET /api/v1/ops/tasks/:id

任务详情，包含完整日志和提交列表。

### 5.6 GET /api/v1/ops/tasks/:id/stream

SSE（Server-Sent Events）实时推送任务进度。

**实现要点**：
- 使用 Gin 的 `c.SSEvent()` + `http.Flusher`
- 设置 Header：`Content-Type: text/event-stream`、`Cache-Control: no-cache`、`Connection: keep-alive`
- 前端通过 `@microsoft/fetch-event-source` 连接，避免原生 `EventSource` 无法稳定携带鉴权头的问题

**推送事件类型**：

1. `status` - 任务状态变更
```
event: status
data: {"status": "running", "step": 2, "totalSteps": 4, "stepName": "构建镜像"}
```

2. `log` - 日志增量
```
event: log
data: {"line": "> docker compose up -d backend\n"}
```

3. `done` - 任务结束
```
event: done
data: {"status": "success", "summary": "发布完成", "duration": "1m23s", "domain": "https://dev.example.com"}
```

4. `error` - 任务失败
```
event: error
data: {"status": "failed", "step": 2, "stepName": "构建镜像", "errMsg": "exit code 1", "suggestion": "请检查代码修复编译问题后重试"}
```

**断线重连**：
- 前端传 `Last-Event-ID` header 或 `?lastLogOffset=N` 参数
- 后端从该偏移量开始推送日志，实现断线补齐

### 5.7 POST /api/v1/ops/tasks/:id/cancel

- `queued`：立即落库为 `cancelled`，释放环境锁，并通过 SSE 推送取消终态
- `running`：调用任务 `context.CancelFunc`，由执行器感知后落库为 `cancelled`
- 已结束任务返回冲突错误，避免前端误以为还能取消

---

## 6. 执行器（Executor）

### 6.1 架构

```
app/ops/
├── apis/
│   └── ops.go              // API handler（继承 api.Api）
├── models/
│   └── ops_task.go          // OpsTask model
├── service/
│   ├── ops_task.go          // 任务 CRUD service
│   └── executor.go          // 执行器核心逻辑
├── service/dto/
│   └── ops.go               // 请求/响应 DTO
└── router/
    └── ops.go               // 路由注册
```

### 6.2 执行器核心

`executor.go` 是核心，负责执行部署动作并推送进度。

```go
// app/ops/service/executor.go

// TaskRunner 管理任务的异步执行
type TaskRunner struct {
    db     *gorm.DB
    config config.OpsEnvironment
}

// 每个正在执行的任务有一个 TaskContext
type TaskContext struct {
    TaskID     int
    Env        config.OpsEnvironment
    EventCh    chan TaskEvent   // 推送事件到 SSE handler
    CancelFunc context.CancelFunc
}

// TaskEvent 是推送给 SSE 的事件
type TaskEvent struct {
    Type string      // "status" / "log" / "done" / "error"
    Data interface{}
}
```

**全局任务管理器**（进程级单例）：

```go
var taskManager = &TaskManager{
    running: make(map[string]*TaskContext), // key = env
    mu:      sync.RWMutex{},
}

type TaskManager struct {
    running map[string]*TaskContext
    mu      sync.RWMutex
    subs    map[int][]chan TaskEvent  // taskID -> SSE 订阅者列表
    subsMu  sync.RWMutex
}
```

- `running` map 实现同一环境互斥：同一时间只允许一个环境有一个 running 任务
- `subs` map 管理 SSE 订阅者：任务的事件会广播给所有订阅该任务的 SSE 连接
- 服务启动时应把历史遗留的 `queued/running` 任务标记为 `cancelled`，避免重启后卡死
- 进程关闭时使用 `signal.NotifyContext(SIGINT, SIGTERM)` 统一取消任务，再等待任务 goroutine 收尾，避免留下孤儿子进程和脏锁

### 6.3 部署步骤定义

每种任务类型对应固定的步骤列表：

**deploy_backend（4 步）**：

| 步骤 | 名称 | 动作 | 失败建议 |
|------|------|------|----------|
| 1 | 拉取代码 | `cd {repoDir} && git pull --ff-only` | 请检查 Git 仓库状态和网络连接 |
| 2 | 构建镜像 | `cd {repoDir} && docker compose -f {composeFile} build {serviceName}` | 请检查代码修复编译问题后重试 |
| 3 | 重启服务 | `cd {repoDir} && docker compose -f {composeFile} up -d {serviceName}` | 请检查 Docker 和 Compose 配置 |
| 4 | 健康检查 | HTTP GET {healthURL}，重试 10 次，间隔 3 秒 | 服务启动失败，请检查日志 |

**deploy_frontend（5 步）**：

| 步骤 | 名称 | 动作 | 失败建议 |
|------|------|------|----------|
| 1 | 拉取代码 | `cd {repoDir} && git pull --ff-only` | 请检查 Git 仓库状态和网络连接 |
| 2 | 安装依赖 | `cd {repoDir} && pnpm install --frozen-lockfile` | 请检查 pnpm、锁文件和网络连接 |
| 3 | 构建项目 | `cd {repoDir} && NODE_OPTIONS=--max-old-space-size=1024 pnpm build` | 请检查代码修复构建问题后重试 |
| 4 | 发布文件 | 清空 `{publishDir}` 旧内容后同步 `dist/` | 请检查目标目录权限 |
| 5 | 重载 Nginx | 如 `reloadNginx=true`，固定执行 `nginx -s reload` | 请检查 Nginx 配置 |

**deploy_all（先后端再前端）**：
- 执行 deploy_backend 的全部步骤（步骤 1~4）
- 再执行 deploy_frontend 的全部步骤（步骤 5~9）
- 总计 9 步，任一步失败即停止

**restart_backend（2 步）**：

| 步骤 | 名称 | 动作 | 失败建议 |
|------|------|------|----------|
| 1 | 重启服务 | `docker compose -f {composeFile} restart {serviceName}` | 请检查 Docker 服务状态 |
| 2 | 健康检查 | HTTP GET {healthURL}，重试 10 次，间隔 3 秒 | 服务启动失败，请检查日志 |

### 6.4 执行约束

- 任务上下文统一带超时控制：
  - `deploy_backend` / `deploy_frontend` / `deploy_all` 默认 900 秒
  - `restart_backend` 默认 300 秒
  - 环境级配置优先，其次全局配置，最后落到默认值
- 日志实时推送仍按行广播给 SSE，但数据库改为每 500ms 批量刷一次；任务结束、失败、取消时强制刷盘
- 单任务日志上限固定 1MB，只保留最新内容
- 同一次任务里若前面已经为仓库执行过 `git fetch --prune`，后续部署步骤只做 upstream/脏工作区校验，不重复 fetch
- 健康检查重试过程必须写日志，例如 `第 3/10 次重试失败`

### 6.4 命令执行方式

**关键：不使用 `sh -c` 拼接任意命令，而是用结构化调用。**

```go
// 执行单个命令步骤
func (r *TaskRunner) runCmd(ctx context.Context, dir string, name string, args ...string) (string, error) {
    cmd := exec.CommandContext(ctx, name, args...)
    cmd.Dir = dir

    // 合并 stdout + stderr，实时推送到 SSE
    pipe, _ := cmd.StdoutPipe()
    cmd.Stderr = cmd.Stdout

    cmd.Start()

    scanner := bufio.NewScanner(pipe)
    var output strings.Builder
    for scanner.Scan() {
        line := scanner.Text()
        output.WriteString(line + "\n")
        // 推送日志行到 SSE
        r.pushLog(line)
        // 同时追加到 DB 的 log 字段
        r.appendLog(line)
    }

    err := cmd.Wait()
    return output.String(), err
}
```

命令白名单：只允许执行以下命令前缀：
- `git pull --ff-only`
- `docker compose build`
- `docker compose up -d`
- `docker compose restart`
- `pnpm install --frozen-lockfile`
- `NODE_OPTIONS=--max-old-space-size=1024 pnpm build`
- 固定目录同步
- `nginx -s reload`

### 6.5 提交列表获取

在任务开始前，获取本次将要拉取的提交列表：

```go
// 获取待拉取的提交
func getNewCommits(repoDir string) ([]CommitInfo, error) {
    // 1. git fetch
    exec.Command("git", "fetch").Dir = repoDir
    // 2. git log HEAD..origin/<current-branch> --oneline --format="%H|%s"
    // 3. 解析返回
}

type CommitInfo struct {
    Hash    string `json:"hash"`
    Message string `json:"message"`
}
```

将结果 JSON 序列化后写入 `ops_task.commits` 字段。

---

## 7. SSE 实现细节

### 7.1 API Handler

```go
func (e OpsApi) Stream(c *gin.Context) {
    taskID := // 从路径获取
    lastOffset := // 从 query 或 Last-Event-ID 获取

    c.Header("Content-Type", "text/event-stream")
    c.Header("Cache-Control", "no-cache")
    c.Header("Connection", "keep-alive")
    c.Header("X-Accel-Buffering", "no")  // 禁用 Nginx 缓冲

    // 1. 先从 DB 读取已有日志，从 lastOffset 开始补发
    // 2. 订阅 taskManager 的事件频道
    // 3. 循环监听事件，写 SSE
    // 4. 客户端断开或任务结束时退出

    ch := taskManager.Subscribe(taskID)
    defer taskManager.Unsubscribe(taskID, ch)

    for {
        select {
        case event, ok := <-ch:
            if !ok {
                return
            }
            c.SSEvent(event.Type, event.Data)
            flusher.Flush()
        case <-c.Request.Context().Done():
            return
        }
    }
}
```

### 7.2 注意事项

- WriteTimeout 要足够长：SSE 连接需要保持，当前 `settings.yml` 的 `writertimeout: 2`（2 秒）**太短**。
- 一期固定方案：保持单进程，在 SSE handler 中使用 `http.Flusher` + 15 秒心跳，并把全局 `writertimeout` 调大到 `300` 秒。

---

## 8. 路由注册

### 8.1 路由文件

```go
// app/ops/router/ops.go
package router

import (
    "github.com/gin-gonic/gin"
    jwt "github.com/go-admin-team/go-admin-core/sdk/pkg/jwtauth"
    "go-admin/app/ops/apis"
    "go-admin/common/middleware"
)

func init() {
    routerCheckRole = append(routerCheckRole, registerOpsRouter)
}

func registerOpsRouter(v1 *gin.RouterGroup, authMiddleware *jwt.GinJWTMiddleware) {
    api := apis.OpsApi{}

    // 所有运维接口需要 JWT 认证 + 角色校验（admin 会自动放行）
    r := v1.Group("/ops").Use(authMiddleware.MiddlewareFunc()).Use(middleware.AuthCheckRole())
    {
        r.GET("/environments", api.GetEnvironments)
        r.POST("/tasks", api.CreateTask)
        r.GET("/tasks", api.GetTaskList)
        r.GET("/tasks/:id", api.GetTask)
        r.GET("/tasks/:id/stream", api.Stream)
    }
}
```

### 8.2 AppRouters 注册

在 `cmd/api/` 下新建 `ops.go`：

```go
// cmd/api/ops.go
package api

import (
    opsRouter "go-admin/app/ops/router"
)

func init() {
    AppRouters = append(AppRouters, opsRouter.InitRouter)
}
```

同时需要在 `app/ops/router/` 下创建 `init_router.go` 和 `router.go`，参照 `app/other/router/` 的模式。

---

## 9. Admin 角色校验

不需要额外中间件。现有的 `middleware.AuthCheckRole()` 已经实现了 admin 放行逻辑（`common/middleware/permission.go:24`）：

```go
if v["rolekey"] == "admin" {
    res = true
    c.Next()
    return
}
```

运维接口全部挂在需要 `AuthCheckRole()` 的路由组下，非 admin 用户会被 Casbin 拒绝（因为不会给非 admin 配运维接口权限），从而实现"仅 admin 可用"。

---

## 10. 文件清单

需要新建的文件：

```
app/ops/
├── apis/
│   └── ops.go               // API handler
├── models/
│   └── ops_task.go           // OpsTask model + 常量
├── service/
│   ├── ops_task.go           // 任务 CRUD service
│   ├── executor.go           // 执行器（步骤执行 + 命令运行）
│   └── task_manager.go       // 全局任务管理器（并发控制 + SSE 订阅）
├── service/dto/
│   └── ops.go                // CreateTaskReq, TaskListReq 等 DTO
└── router/
    ├── init_router.go        // InitRouter() 入口
    ├── router.go             // routerCheckRole 注册表
    └── ops.go                // 路由定义

cmd/api/
└── ops.go                    // AppRouters 注册

config/
└── extend.go                 // 扩展 Extend 结构体（加 Ops 字段）

cmd/migrate/migration/
└── xxxx_ops_task.go           // 数据库迁移
```

需要修改的文件：

```
config/extend.go              // 加 OpsConfig 结构体
config/settings.yml            // 加 extend.ops 配置段（示例）
```

---

## 11. 前端对接要点

此段供前端开发参考。

### 11.1 页面结构

```
运维管理页面
├── 环境卡片列表（调 GET /environments 渲染）
│   ├── 环境名 + 状态指示灯（绿/红）
│   ├── 上次发布时间
│   ├── 待发布提交数（可展开查看提交列表）
│   ├── 操作按钮组
│   └── 快捷访问链接
└── 任务执行弹窗（点按钮后弹出）
    ├── 步骤进度条（Step 1/4 拉取代码 ✅ → Step 2/4 构建镜像 🔄 → ...）
    ├── 实时日志滚动区域
    └── 完成/失败结果展示
```

### 11.2 SSE 连接

```javascript
import { fetchEventSource } from '@microsoft/fetch-event-source';

await fetchEventSource('/api/v1/ops/tasks/42/stream', {
  headers: {
    Authorization: 'Bearer xxx',
  },
  onmessage(event) {
    const data = JSON.parse(event.data);
    if (event.event === 'status') {
      // 更新步骤进度条
    }
    if (event.event === 'log') {
      // 追加日志
    }
    if (event.event === 'done' || event.event === 'error') {
      // 结束后关闭弹窗状态
    }
  },
});
```

**注意**：一期前端固定使用 `@microsoft/fetch-event-source`，通过 `Authorization` header 传 JWT，不再要求后端兼容 query token。

### 11.3 prod 确认交互

prod 环境点击操作按钮后，弹出确认对话框：
- 显示"即将发布到生产环境"警告
- 从 `GET /environments` 返回的 `pendingCommits.backend.commits` / `pendingCommits.frontend.commits` 中展示本次完整提交列表
- 要求输入环境名称 "prod" 确认
- 输入正确后才发请求，`confirmName` 字段传 "prod"

---

## 12. 注意事项

1. **WriteTimeout**：一期固定采用“单进程 + 全局调大到 300 秒 + SSE 心跳”的方案，不再拆独立 server。

2. **并发控制**：同一环境同时只允许一个任务运行，用 `taskManager.running` map 加锁实现。不同环境的任务可以并行。

3. **Git 操作安全**：
   - 只执行 `git pull --ff-only`，不切分支
   - 先 `git fetch` 再对比提交，不自动 merge
   - 仓库有未提交变更时禁止发布
   - 仓库未配置 upstream 时禁止发布

4. **ComposeFile 默认值**：如果配置未指定 `composeFile`，默认使用 `{repoDir}/docker-compose.yml`

5. **前端约束**：一期仅支持 `React + Vite + pnpm` 项目，执行前校验 `package.json`、`pnpm-lock.yaml`、`vite.config.*` 是否存在。

6. **日志追加策略**：任务执行中可逐行写日志，但必须限制单任务日志总量不超过 `1MB`。

7. **优雅停机**：进程收到 SIGTERM 时，等待正在执行的任务完成（或设置超时强制取消），避免任务状态卡在 running。

8. **安全红线**：
   - 不允许前端传脚本、分支、路径、容器名
   - 所有执行命令从配置中读取，不拼接任何用户输入
   - 命令执行使用 `exec.Command` 结构化调用，不经过 shell 解释器

---

## 13. 前端 UI / UX 设计规格

> 本节描述前端页面的结构、交互逻辑和视觉规则，直接按此实现。

### 13.1 整体布局

运维页面是一个独立的菜单项，整页内容为**环境卡片列表**，无侧边面板，无复杂导航。

```
┌─────────────────────────────────────────────────────────┐
│  运维管理                                                 │
├──────────────┬──────────────┬──────────────────────────┤
│  开发环境     │  测试环境     │  生产环境                   │
│  (卡片)      │  (卡片)      │  (卡片)                    │
└──────────────┴──────────────┴──────────────────────────┘
│  最近任务列表（折叠，默认收起，点击展开）                        │
└─────────────────────────────────────────────────────────┘
```

- 三个环境卡片横向排列，等宽，响应式（小屏时竖向堆叠）
- 卡片之间无优先级之分，视觉权重相同
- 页面进入时立即调用 `GET /environments` 加载数据，显示 loading 骨架屏

---

### 13.2 环境卡片

#### 结构

```
┌──────────────────────────────────────┐
│  ● 开发环境              dev          │  ← 标题行：状态点 + 名称 + key 标签
│                                       │
│  上次发布: deploy_all · 30 分钟前      │  ← 上次发布信息（没有时显示"从未发布"）
│                                       │
│  后端  3 个新提交  ↓                   │  ← 待发布提交数，点击展开提交列表
│  前端  5 个新提交  ↓                   │
│                                       │
│  [ 发布后端 ]  [ 发布前端 ]            │  ← 操作按钮
│  [ 全部发布 ]  [ 重启后端 ]            │
└──────────────────────────────────────┘
```

#### 状态指示灯（左上角圆点）

| 状态 | 颜色 | 含义 |
|------|------|------|
| 绿色实心 | #52c41a | 健康，无任务运行 |
| 蓝色脉冲动画 | #1890ff | 有任务正在执行 |
| 红色实心 | #ff4d4f | 健康检查失败 |
| 灰色实心 | #d9d9d9 | 环境已禁用 |

#### 待发布提交数

- `0 个新提交`：灰色文字，不可点击展开
- `N 个新提交`（N > 0）：蓝色文字 + 下箭头，点击在卡片内展开提交列表
- 展开后显示 `pendingCommits.recent` 中最近 10 条提交，格式：`abc1234 修复登录页样式`（hash 前 7 位 + 提交信息）
- `pendingCommits.commits` 保留完整列表，仅用于 prod 确认对话框；超过 10 条时卡片区域显示"共 N 条，仅展示最近 10 条"

#### 操作按钮

- 按钮文字：发布后端 / 发布前端 / 全部发布 / 重启后端
- 按钮类型：默认为 `default` 样式，"全部发布"用 `primary` 样式突出显示
- 当该环境有任务正在运行时：四个按钮全部 disabled，并在卡片顶部出现一条蓝色进度条（indeterminate）
- disabled 状态下 hover 提示：「正在执行任务，请等待完成」

#### 正在运行中的状态

如果 `GET /environments` 返回 `runningTask != null`，卡片切换为运行中态：

```
┌──────────────────────────────────────┐
│  ◉ 开发环境              dev          │  ← 蓝色脉冲圆点
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │  ← 蓝色 indeterminate 进度条
│                                       │
│  正在执行: 全部发布 · 步骤 3/9 重启服务  │
│                                       │
│  [ 查看进度 ]                          │  ← 点击打开执行弹窗
│                                       │
│  [ 发布后端 ]  [ 发布前端 ]  (disabled) │
│  [ 全部发布 ]  [ 重启后端 ]  (disabled) │
└──────────────────────────────────────┘
```

---

### 13.3 点击操作按钮后的流程

#### 非 prod 环境（confirmName = false）

1. 点击按钮 → **直接**调用 `POST /tasks`，不弹确认框
2. 请求成功后打开**执行弹窗**，自动连接该任务的 SSE 流
3. 环境卡片进入"运行中"状态

#### prod 环境（confirmName = true）

1. 点击按钮 → 弹出**确认对话框**（见 13.4），从 `pendingCommits.commits` 先展示完整提交列表
2. 用户填写确认，点确认 → 调用 `POST /tasks`
3. 成功后打开执行弹窗

---

### 13.4 prod 确认对话框

```
┌─────────────────────────────────────────┐
│  ⚠️  确认发布到生产环境                    │
│                                          │
│  本次将包含以下提交：                       │
│  · abc1234  修复登录页样式                │
│  · def5678  新增用户导出功能              │
│  · ...（共 12 条）                       │
│                                          │
│  请输入环境标识 prod 以确认：              │
│  ┌──────────────────────────┐            │
│  │                          │            │
│  └──────────────────────────┘            │
│                                          │
│               [ 取消 ]  [ 确认发布 ]      │
└─────────────────────────────────────────┘
```

- 对话框打开时输入框自动 focus
- 输入内容不等于 "prod" 时，「确认发布」按钮保持 disabled
- 输入正确后按钮变为可点击（primary 样式）
- 点「取消」或点遮罩关闭，不发请求

---

### 13.5 执行弹窗

点击操作按钮（或"查看进度"）后弹出此弹窗，弹窗宽度 700px，不可通过点击遮罩关闭（防止误操作）。

#### 运行中状态

```
┌─────────────────────────────────────────────────┐
│  全部发布 · 开发环境                         [×]  │  ← 右上角 X 仅关闭弹窗，任务继续运行
│                                                   │
│  步骤进度                                          │
│  ✅ 1/9  拉取后端代码         3s                   │
│  ✅ 2/9  构建后端镜像         45s                  │
│  🔄 3/9  重启后端服务         运行中...             │  ← 当前步骤蓝色高亮 + spinner
│  ⬚  4/9  后端健康检查                              │  ← 未执行：灰色
│  ⬚  5/9  拉取前端代码                              │
│  ⬚  6/9  安装前端依赖                              │
│  ⬚  7/9  构建前端项目                              │
│  ⬚  8/9  发布前端文件                              │
│  ⬚  9/9  重载 Nginx                               │
│                                                   │
│  ┌─ 实时日志 ─────────────────────────────────┐   │
│  │ [10:32:01] > docker compose up -d backend  │   │
│  │ [10:32:02] Recreating backend_1 ...        │   │
│  │ [10:32:03] Done.                           │   │
│  └────────────────────────────────────────────┘   │  ← 日志区域固定高度 240px，自动滚动到底
│                                                   │
│                              [ 取消任务 ]          │
└─────────────────────────────────────────────────┘
```

#### 步骤图标说明

| 图标 | 状态 |
|------|------|
| ✅ | 已完成 |
| 🔄（spinner） | 执行中（蓝色） |
| ❌ | 失败（红色） |
| ⬚ | 未执行（灰色） |

#### 日志区域

- 固定高度 240px，内容超出后自动滚动到最新行
- 每行前缀显示时间戳 `[HH:mm:ss]`（前端在收到日志时打上本地时间，不依赖后端）
- 字体：等宽字体（monospace），字号 12px，深色背景（#1e1e1e），浅色文字（#d4d4d4）
- 用户手动向上滚动时，暂停自动滚动；用户滚回底部时，恢复自动滚动

---

### 13.6 执行成功状态

```
┌─────────────────────────────────────────────────┐
│  全部发布 · 开发环境                         [×]  │
│                                                   │
│        ✅  发布成功                                │
│            耗时 1 分 23 秒                        │
│                                                   │
│  ✅ 1/9  拉取后端代码         3s                   │
│  ✅ 2/9  构建后端镜像         45s                  │
│  ✅ 3/9  重启后端服务         12s                  │
│  ✅ 4/9  后端健康检查         5s                   │
│  ✅ 5/9  拉取前端代码         2s                   │
│  ✅ 6/9  安装前端依赖         18s                  │
│  ✅ 7/9  构建前端项目         30s                  │
│  ✅ 8/9  发布前端文件         1s                   │
│  ✅ 9/9  重载 Nginx           1s                   │
│                                                   │
│  本次包含 3 个提交:                                │
│  · abc1234  修复登录页样式                         │
│  · def5678  新增用户导出功能                       │
│  · ghi9012  更新依赖版本                           │
│                                                   │
│                               [ 关闭 ]            │
└─────────────────────────────────────────────────┘
```

- 弹窗头部变为绿色背景
- 每个步骤显示实际耗时
- 底部展示本次包含的提交列表

---

### 13.7 执行失败状态

```
┌─────────────────────────────────────────────────┐
│  全部发布 · 开发环境                         [×]  │
│                                                   │
│        ❌  发布失败                                │
│            停在第 7 步「构建前端项目」              │
│                                                   │
│  ✅ 1/9  拉取后端代码         3s                   │
│  ...                                              │
│  ✅ 6/9  安装前端依赖         18s                  │
│  ❌ 7/9  构建前端项目         (失败)               │  ← 红色高亮
│  ⬛ 8/9  发布前端文件         (跳过)               │  ← 后续步骤标记为跳过
│  ⬛ 9/9  重载 Nginx           (跳过)               │
│                                                   │
│  ┌─ 错误信息 ──────────────────────────────────┐  │
│  │ ERROR: src/main.ts:12 - Cannot find module  │  │
│  └─────────────────────────────────────────────┘  │  ← 只显示最后几行错误日志
│                                                   │
│  💡 请检查代码修复构建问题后重试                    │  ← 建议文字，灰底黄字
│                                                   │
│                      [ 查看完整日志 ]  [ 关闭 ]    │
└─────────────────────────────────────────────────┘
```

- 弹窗头部变为红色背景
- 失败步骤红色高亮，后续步骤显示"跳过"
- 错误信息区域只展示最后 10 行日志（关键错误通常在末尾）
- 「查看完整日志」展开完整日志区域（与运行中的日志区域样式相同）

---

### 13.8 最近任务列表

页面底部有一个可折叠的任务历史区域，默认折叠。

展开后显示最近 20 条任务：

```
最近任务 ▲
┌─────┬────────┬──────────┬────────┬──────────────────┬──────────┐
│ ID  │ 环境   │ 类型     │ 状态   │ 时间             │ 操作     │
├─────┼────────┼──────────┼────────┼──────────────────┼──────────┤
│ 42  │ dev    │ 全部发布  │ ✅成功 │ 30 分钟前        │ 查看日志 │
│ 41  │ test   │ 发布后端  │ ❌失败 │ 2 小时前         │ 查看日志 │
│ 40  │ prod   │ 重启后端  │ ✅成功 │ 3 天前           │ 查看日志 │
└─────┴────────┴──────────┴────────┴──────────────────┴──────────┘
```

- 「查看日志」点击后打开一个只读的日志弹窗（复用执行弹窗的步骤 + 日志样式，但无操作按钮）
- 任务类型展示中文名：deploy_all → 全部发布，以此类推
- 时间显示相对时间（30 分钟前、2 小时前），hover 显示完整时间

---

### 13.9 交互状态总结

| 场景 | 操作按钮 | 卡片外观 | 可做的事 |
|------|----------|----------|----------|
| 正常，无任务 | 全部可点击 | 正常 | 随时发布 |
| 本环境有任务运行 | 全部 disabled | 蓝色进度条 + 显示"查看进度" | 只能查看进度 |
| 其他环境有任务运行 | 全部可点击 | 正常 | 不影响本环境操作 |
| 环境健康检查失败 | 全部可点击（仍可发布修复） | 红色状态灯 | 操作不限制，仅提示 |
| 环境已禁用 | 全部 disabled | 灰色，半透明 | 无法操作 |

---

### 13.10 轮询刷新

环境卡片数据不是实时推送的，采用**定时轮询**：

- 页面加载后立即请求一次
- 之后每 **30 秒**轮询一次 `GET /environments`
- 当有任务正在运行时，改为每 **5 秒**轮询一次（更快感知步骤变化）
- 用户手动点击刷新图标可立即触发一次请求

注意：执行弹窗内的进度是通过 SSE 实时推送的，不依赖轮询。
