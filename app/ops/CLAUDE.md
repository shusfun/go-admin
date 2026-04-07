# CLAUDE.md

本文件为 Claude Code (claude.ai/code) 在本目录中工作时提供指引。

## 模块：app/ops

运维任务执行模块。支持后端部署、前端部署、全量部署、后端重启等操作，任务执行过程通过 SSE（Server-Sent Events）实时推流日志给前端。

## 目录结构

```
apis/        # Gin 处理函数（ops.go — 环境列表、任务创建/查询/取消、SSE 推流）
models/      # GORM 模型（ops_task.go — 任务记录，含状态、步骤、日志等字段）
router/      # 路由注册
service/     # 业务逻辑层
  dto/       # 请求/响应 DTO
  executor.go       # 任务执行器 — 执行具体的部署/重启脚本
  executor_test.go  # 执行器单元测试
  task_manager.go   # 任务管理器 — 任务生命周期管理、并发控制、优雅关闭
  task_manager_test.go
```

## 关键设计

- **TaskManager**：单例模式，在 `cmd/api/server.go` 中通过 `opsService.GetTaskManager()` 获取。管理任务队列、并发限制、优雅关闭（服务停止时等待运行中的任务完成）。
- **SSE 推流**：`/admin-api/v1/ops/tasks/:id/stream` 端点通过 SSE 推送 `status`、`log`、`done`、`error` 四种事件类型。
- **任务类型**：`deploy_backend`、`deploy_frontend`、`deploy_all`、`restart_backend`。
- **环境管理**：通过 `config/settings.yml` 中的 `settings.extend.ops.environments` 配置多环境信息。
- **超时控制**：`settings.extend.ops.taskTimeoutSeconds` 配置任务超时时间（默认 900 秒）。

## 运行测试

```bash
go test ./app/ops/service/...
```
