# CLAUDE.md

本文件为 Claude Code (claude.ai/code) 在本目录中工作时提供指引。

## 应用：@suiyuan/mobile-h5

移动端 H5 单页应用，面向普通用户。

## 技术栈

React 19 + Vite + React Router v7 + TanStack React Query + react-hook-form + zod

## 开发命令

```bash
pnpm dev         # 启动 Vite 开发服务器（或从根目录运行 pnpm dev:mobile）
pnpm build       # 生产构建
pnpm typecheck   # TypeScript 类型检查
```

## 目录结构

```
src/
  main.tsx       # 应用入口
  app.tsx        # 根组件，路由配置
  pages/         # 页面组件
    home-page.tsx      # 首页
    login-page.tsx     # 登录页
    profile-page.tsx   # 个人资料页
    status-page.tsx    # 状态页
  styles.css     # 全局样式
```

## 依赖的内部包

- `@suiyuan/api` — HTTP 请求客户端
- `@suiyuan/auth` — 会话管理
- `@suiyuan/core` — 业务工具
- `@suiyuan/design-tokens` — 主题色
- `@suiyuan/types` — TypeScript 类型
- `@suiyuan/ui-mobile` — 移动端布局组件

## 与 admin-web 的区别

- 使用 `@suiyuan/ui-mobile` 而非 `@suiyuan/ui-admin`
- API 前缀为 `/app-api/v1/`（ClientType 为 `"mobile-user"`）
- 页面较少，聚焦普通用户功能
