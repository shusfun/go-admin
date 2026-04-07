# CLAUDE.md

本文件为 Claude Code (claude.ai/code) 在本目录中工作时提供指引。

## 包：@suiyuan/types

前端共享 TypeScript 类型定义包。定义所有 API 请求/响应的接口，无运行时代码。

## 类型分类

### 基础类型
- `ClientType` — 客户端类型（`"admin"` | `"mobile-user"`）
- `ApiEnvelope<T>` — API 响应信封（`{ code, data, msg }`）
- `PagePayload<T>` — 分页响应（`{ list, count, pageIndex, pageSize }`）
- `QueryPayload` — 分页查询参数
- `DeletePayload` — 删除操作参数

### 认证相关
- `LoginPayload` / `LoginResult` / `CaptchaResponse` — 登录流程
- `AppSession` — 会话（token, expireAt, tenantCode, clientType）
- `TenantContext` — 租户上下文
- `InfoResponse` / `ProfileResponse` — 用户信息和个人资料

### 系统管理资源
- `SysUserRecord` / `SysRoleRecord` / `SysMenuRecord` / `SysDeptRecord` — 用户/角色/菜单/部门
- `SysPostRecord` / `SysConfigRecord` / `SysApiRecord` — 岗位/配置/API
- `SysDictTypeRecord` / `SysDictDataRecord` — 字典类型/数据
- `SysLoginLogRecord` / `SysOperaLogRecord` — 登录日志/操作日志
- `SysJobRecord` / `SysJobLogRecord` — 定时任务/任务日志

### 菜单树
- `RawMenuItem` — 后端原始菜单结构（含 `children` 递归）
- `AppMenuNode` — 前端转换后的菜单节点（含 `fullPath`）
- `TreeOptionNode` — 树选择器节点
- `RoleMenuTreeResponse` / `RoleDeptTreeResponse` — 角色关联的菜单树/部门树

### 运维 (Ops)
- `OpsTaskType` / `OpsTaskStatus` — 任务类型和状态枚举
- `OpsEnvironmentItem` — 环境信息（含健康状态、待部署提交、运行中任务）
- `OpsTaskListItem` / `OpsTaskDetail` — 任务列表项/详情
- `OpsStatusEvent` / `OpsLogEvent` / `OpsDoneEvent` / `OpsErrorEvent` — SSE 事件类型
- `ServerMonitorInfo` — 服务器监控指标

## 无依赖

本包无任何外部依赖，是依赖链的最底层。

## 开发命令

```bash
pnpm build       # tsc 编译
pnpm typecheck   # 类型检查
```
