# CLAUDE.md

本文件为 Claude Code (claude.ai/code) 在本目录中工作时提供指引。

## 模块：app/other

辅助工具模块，包含文件上传、代码生成和服务器监控三部分功能。

## 目录结构

```
apis/
  file.go                # 文件上传接口
  sys_server_monitor.go  # 服务器监控接口（CPU、内存、磁盘、Go 协程等信息）
  tools/                 # 代码生成工具相关的处理函数
models/
  tools/                 # 代码生成相关的数据模型（读取数据库表结构）
router/
  file.go                # 文件上传路由
  gen_router.go          # 代码生成路由
  monitor.go             # 服务器监控路由
  sys_server_monitor.go  # 监控接口路由
  init_router.go         # 路由引导
service/
  dto/                   # 请求/响应 DTO
```

## 关键功能

- **文件上传**：支持多种存储后端（本地、阿里云 OSS、七牛云、华为云 OBS），存储配置在 `common/storage/` 和 `common/file_store/` 中实现。
- **代码生成**：根据数据库表结构自动生成 CRUD 代码（Go 后端 + 前端），模板文件在项目根目录 `template/` 中。生成目标路径通过 `config/settings.yml` 中的 `settings.gen.frontpath` 配置。
- **服务器监控**：使用 `shirou/gopsutil` 采集系统信息，返回 CPU、内存、磁盘、Go 运行时等指标。
