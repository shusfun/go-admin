# CLAUDE.md

本文件为 Claude Code (claude.ai/code) 在本目录中工作时提供指引。

## 模块：app/admin

核心 RBAC 管理模块。负责所有系统管理资源：用户、角色、菜单、部门、岗位、字典（类型+数据）、配置、API 记录、登录日志、操作日志。

## 目录结构

```
apis/        # Gin 处理函数 — 每个资源一个文件（sys_user.go、sys_role.go ...）
models/      # GORM 模型 + 数据库操作（查询、作用域、数据权限过滤）
router/      # 路由组 — init_router.go 引导，按资源文件注册端点
service/     # 业务逻辑层
  dto/       # 每个资源的请求/响应 DTO
```

## 关键模式

- **Handler 模式**：每个 API 处理函数嵌入 go-admin-core 的 `api.Api`，提供 `GetOrm()`、`GetLogger()`、`MakeContext()` 等辅助方法。使用 `p.Bind(...)` 绑定参数，用 `e.OK(...)` 或 `e.Error(...)` 响应。
- **数据权限**：`models/datascope.go` 实现基于 Casbin 的数据权限过滤。角色的 `dataScope` 值控制查询范围（全部数据、仅本部门、本部门及子部门、仅本人）。
- **Casbin 集成**：`models/casbin_rule.go` 在角色/菜单变更时同步权限策略到 Casbin。
- **数据库初始化**：`models/initdb.go` 负责所有 admin 模型的自动迁移。
- **验证码**：`apis/captcha.go` 生成 base64 验证码图片用于登录。
- **路由注册**：`router/init_router.go` 中的 `InitRouter()` 通过 Go `init()` 函数在导入时追加到 `cmd/api.AppRouters`。

## API 前缀

所有管理端接口前缀为 `/admin-api/v1/`。路由文件与 REST 资源对应（如 `sys_user.go` -> `/admin-api/v1/sys-user`）。

## 新增资源步骤

1. 在 `models/` 中定义 GORM 模型
2. 在 `service/dto/` 中创建 DTO
3. 在 `service/` 中编写业务方法
4. 在 `apis/` 中添加处理函数
5. 在 `router/` 中注册路由，并在 `router/init_router.go` 中引入
