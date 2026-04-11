# 脚手架总览

本仓库已经不只是一个单点后端项目，而是一套可直接复用的全栈管理后台脚手架，核心能力包括：

- Go 后端：`Gin + GORM + Casbin + JWT`
- React 前端：`admin-web + mobile-h5 + ui-showcase`
- 仓库级开发 CLI：统一通过 `pnpm repo:*` 管理依赖、服务、构建、校验、重置
- 安装向导：首次启动通过 `Setup Wizard` 完成数据库与管理员初始化
- 品牌重命名：支持通过 `pnpm repo:rename` 做项目级品牌替换
- OpenAPI 联动：后端 Swagger 可同步到前端类型与 API Client

## 1. 这套脚手架解决什么问题

它主要解决四件事：

1. 新项目不再手工拼装后端、后台前端、移动端和脚本
2. 新环境不再靠人工改配置文件和初始化 SQL
3. 日常开发不再散落在 `go build`、`pnpm`、`docker compose`、`swagger` 的多套命令里
4. 项目改名、重置、接口同步、开发基础设施启动都有统一入口

## 2. 推荐阅读路径

- 跑项目：看 [快速开始](./quick-start.md)
- 看目录：看 [项目结构](./project-structure.md)
- 做日常开发：看 [开发工作流](./development-workflow.md)
- 做品牌化或基于当前仓库派生新项目：看 [定制与改名](./customization.md)

## 3. 关键约定

- 首次安装唯一入口是 `Setup Wizard`
- 默认开发流程统一走 `pnpm repo:*`
- 后端更新主路径是 `git pull -> 重启服务 -> 按配置执行幂等迁移检查`
- `pnpm repo:migrate` 仍保留，但属于保底命令，不是默认主流程
- `docs/admin/admin_swagger.*` 是生成产物，不建议直接当作项目说明文档阅读

## 4. 适用角色

- 新接手项目的开发同学
- 需要基于当前仓库派生业务项目的团队
- 负责前后端联调、环境初始化、接口同步的同学
- 需要在现有骨架上新增模块、页面、配置扩展的同学

## 5. 什么时候看专题文档

- 需要明确安装、更新、迁移的真实规则时，查看 [../setup-update-migration-architecture.md](../setup-update-migration-architecture.md)
- 需要实现或调整运维模块时，查看 [../ops-service-v1-spec.md](../ops-service-v1-spec.md)
- 需要做后台视觉与布局统一时，查看 [../admin/admin-ui-spec.md](../admin/admin-ui-spec.md)
