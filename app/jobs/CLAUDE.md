# CLAUDE.md

本文件为 Claude Code (claude.ai/code) 在本目录中工作时提供指引。

## 模块：app/jobs

定时任务调度模块。基于 `robfig/cron/v3` 实现 cron 任务的注册、启动、停止和日志记录。

## 目录结构

```
apis/        # Gin 处理函数（sys_job.go — 任务增删改查及启停控制）
models/      # GORM 模型（sys_job.go 定义任务，sys_job_log.go 定义执行日志）
router/      # 路由注册（sys_job.go、sys_job_log.go 分别注册任务和日志端点）
service/     # 业务逻辑层
  dto/       # 任务相关的请求/响应 DTO
```

## 关键文件

- `jobbase.go` — 定义 `JobCore` 接口和任务执行基础设施
- `job_log.go` — 任务执行日志的写入逻辑
- `examples.go` — 示例任务实现，可作为新任务的参考模板
- `type.go` — 任务类型的常量和枚举定义

## 启动流程

任务调度在 `cmd/api/server.go` 中通过 `jobs.InitJob()` 和 `jobs.Setup(db)` 初始化。服务启动时从数据库加载已注册的任务并添加到 cron 调度器。

## 新增定时任务

1. 在本模块中实现 `JobCore` 接口
2. 在 `InitJob()` 中注册任务处理函数
3. 通过 API 或数据库配置 cron 表达式和调用目标
