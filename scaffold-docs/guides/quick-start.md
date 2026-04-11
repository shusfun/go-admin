# 快速开始

本文档面向第一次运行这套脚手架的开发者，目标是用最短路径跑通“依赖检查 -> 基础设施 -> 服务启动 -> 安装向导”。

## 1. 环境要求

- Go `1.24+`
- Node.js `18+`
- pnpm `10+`
- PostgreSQL `12+`，或 MySQL / SQLite / SQL Server
- 如使用容器化开发，需准备 Docker / Docker Compose

## 2. 推荐启动顺序

在仓库根目录执行：

```bash
pnpm repo:doctor
pnpm repo:deps all
pnpm repo:infra:start
pnpm repo:service:start backend
pnpm repo:service:start admin
```

如果需要移动端：

```bash
pnpm repo:service:start mobile
```

## 3. 首次安装链路

后端首次启动时，如果检测到当前配置目录下不存在 `.installed` 锁文件，会进入 `Setup Wizard` 模式。

安装向导完成两件事：

1. 填写数据库连接信息并测试连接
2. 创建管理员账号并提交安装

安装成功后，系统会自动：

- 生成当前环境使用的配置文件
- 初始化数据库表和基础数据
- 创建管理员账号
- 写入 `.installed`
- 退出并等待 `air` / 容器 / 服务管理器拉起

补充约定：

- `dev/test` 默认开启启动自动迁移
- `prod` 默认关闭启动自动迁移
- 环境值由安装向导提交内容决定，不由前端猜测

## 4. 常用命令

```bash
pnpm repo:env
pnpm repo:setup-status
pnpm repo:infra:status
pnpm repo:service:status backend
pnpm repo:service:logs backend
pnpm repo:openapi
pnpm repo:verify backend
pnpm repo:verify frontend
pnpm repo:build backend
```

说明：

- 服务日志和状态文件位于 `temp/repo-cli/`
- OpenAPI 同步后会更新 `docs/admin-swagger/admin_swagger.json` 与前端类型
- 后端默认优先使用仓库内 `./.tmp/bin/air` 做热更新

## 5. 重置与重新初始化

如果希望回到“像新项目一样重新安装”的状态，可使用：

```bash
pnpm repo:reinit
```

它会清理本地产物、安装锁、repo CLI 运行时状态和开发环境数据。执行前应确认当前数据是否还需要保留。

## 6. 需要继续深入时

- 想看目录职责：转到 [项目结构](./project-structure.md)
- 想看日常开发命令流：转到 [开发工作流](./development-workflow.md)
- 想做品牌改名和模板复用：转到 [定制与改名](./customization.md)
