# CLAUDE.md

本文件为 Claude Code (claude.ai/code) 在本目录中工作时提供指引。

## 包：@suiyuan/auth

前端会话管理包。负责 Token 的存储、读取、过期判断和格式化。

## 核心导出

- `createSessionManager(clientType)` — 创建会话管理器，基于 `localStorage` 按 `clientType` 隔离存储（key 为 `suiyuan:session:{clientType}`）
  - `.read()` — 读取当前会话
  - `.write(session)` — 写入会话
  - `.clear()` — 清除会话
- `isSessionExpired(session)` — 判断会话是否已过期
- `toAuthorizationToken(session)` — 格式化为 `Bearer {token}` 字符串

## 依赖

- `@suiyuan/types` — `AppSession` 和 `ClientType` 类型定义

## 开发命令

```bash
pnpm build       # tsc 编译
pnpm typecheck   # 类型检查
```
