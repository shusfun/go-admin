# CLAUDE.md

本文件为 Claude Code (claude.ai/code) 在本目录中工作时提供指引。

## 应用：@suiyuan/admin-web

PC 端管理后台单页应用。

## 技术栈

React 19 + Vite + React Router v7 + TanStack React Query + react-hook-form + zod

## 开发命令

```bash
pnpm dev         # 启动 Vite 开发服务器（或从根目录运行 pnpm dev:admin）
pnpm build       # 生产构建
pnpm typecheck   # TypeScript 类型检查
```

## 目录结构

```
src/
  main.tsx           # 应用入口
  app.tsx            # 根组件，路由配置
  pages/             # 页面组件（一个文件对应一个页面）
  components/        # 可复用的 UI 组件（含 crud-data-page 通用 CRUD 页面）
  styles.css         # 全局样式
```

## 页面清单

登录页、仪表盘、用户管理、角色管理、菜单管理、部门管理、岗位管理、字典管理、配置管理、API 管理、登录日志、操作日志、定时任务、任务日志、运维部署、服务器监控、代码生成、Swagger 文档、构建工具、个人资料等。

## 依赖的内部包

- `@suiyuan/api` — HTTP 请求客户端
- `@suiyuan/auth` — 会话管理
- `@suiyuan/core` — 业务工具（菜单树构建等）
- `@suiyuan/design-tokens` — 主题色
- `@suiyuan/types` — TypeScript 类型
- `@suiyuan/ui-admin` — PC 端布局组件
