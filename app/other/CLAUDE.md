# CLAUDE.md

本文件为 Claude Code (claude.ai/code) 在本目录中工作时提供指引。

## 模块：app/other

辅助工具模块，包含文件上传和服务器监控两部分功能。

## 目录结构

```
apis/
  file.go                # 文件上传接口
  sys_server_monitor.go  # 服务器监控接口（CPU、内存、磁盘、Go 协程等信息）
router/
  file.go                # 文件上传路由
  monitor.go             # 服务器监控路由
  sys_server_monitor.go  # 监控接口路由
  init_router.go         # 路由引导
```

## 关键功能

- **文件上传**：支持多种存储后端（本地、阿里云 OSS、七牛云、华为云 OBS），存储配置在 `common/storage/` 和 `common/file_store/` 中实现。
- **服务器监控**：使用 `shirou/gopsutil` 采集系统信息，返回 CPU、内存、磁盘、Go 运行时等指标。
