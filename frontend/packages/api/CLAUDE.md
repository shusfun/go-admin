# CLAUDE.md

本文件为 Claude Code (claude.ai/code) 在本目录中工作时提供指引。

## 包：@suiyuan/api

前端 HTTP 请求客户端层。封装所有与后端 API 的通信逻辑。

## 核心导出

- `createApiClient(options)` — 工厂函数，创建带有自动认证、Token 刷新、错误处理的 API 客户端
- `ApiError` — 自定义错误类，包含 `code` 和 `message`

## 客户端结构

`createApiClient` 返回的对象按业务域分组：

| 命名空间 | 用途 |
|---------|------|
| `auth`   | 登录、登出、获取验证码 |
| `system` | 获取用户信息、个人资料、菜单角色 |
| `admin`  | 用户/角色/菜单/部门/岗位/字典/配置/API/日志等全部管理端 CRUD |
| `jobs`   | 定时任务和任务日志的 CRUD、启停控制 |
| `ops`    | 运维环境列表、任务创建/查询/取消、SSE 任务推流 |

## 关键机制

- **自动 Token 刷新**：请求拦截器在检测到 Session 过期时自动调用 `/refresh_token`，刷新后重试原请求。
- **响应解包**：`unwrapEnvelope<T>` 解包 `{ code, data, msg }` 信封格式，code 非 200 抛 `ApiError`。
- **SSE 推流**：`ops.connectTaskStream()` 使用 `@microsoft/fetch-event-source` 实现运维任务的实时日志推流，返回取消函数。
- **API 前缀**：根据 `clientType` 自动选择 `/admin-api/v1` 或 `/app-api/v1`。

## 依赖

- `axios` — HTTP 客户端
- `@microsoft/fetch-event-source` — SSE 支持
- `@suiyuan/auth` — Token 工具函数
- `@suiyuan/types` — 请求/响应类型定义

## 开发命令

```bash
pnpm build       # tsc 编译
pnpm typecheck   # 类型检查
```
