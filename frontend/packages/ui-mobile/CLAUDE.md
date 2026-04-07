# CLAUDE.md

本文件为 Claude Code (claude.ai/code) 在本目录中工作时提供指引。

## 包：@suiyuan/ui-mobile

移动端 H5 布局组件库。提供 mobile-h5 应用使用的通用 UI 组件。

## 导出组件

| 组件 | 用途 |
|------|------|
| `MobileShell` | 移动端主布局外壳 |
| `MobileHero` | 页面顶部英雄区（eyebrow + 标题 + 描述） |
| `ActionTile` | 操作入口卡片（标题 + 详情） |
| `SurfaceCard` | 通用内容卡片（标题 + 描述 + 子内容） |
| `BottomTabBar` | 底部标签栏导航（基于 React Router `NavLink`） |

## 导出入口

- `./src/index.tsx` — 组件导出
- `./src/styles.css` — 组件样式（通过 `@suiyuan/ui-mobile/styles.css` 导入）

## 依赖

- `react` / `react-router-dom` — React 和路由

## 与 ui-admin 的区别

本包不依赖 `@suiyuan/types`，组件更轻量，面向移动端触屏交互设计（底部 Tab 导航替代侧边栏、卡片式布局替代表格式布局）。

## 开发命令

```bash
pnpm build       # tsc 编译
pnpm typecheck   # 类型检查
```
