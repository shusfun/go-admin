# CLAUDE.md

本文件为 Claude Code (claude.ai/code) 在本目录中工作时提供指引。

## 包：@suiyuan/ui-admin

PC 端管理后台布局组件库。提供 admin-web 应用使用的通用 UI 组件。

## 导出组件

| 组件 | 用途 |
|------|------|
| `AdminShell` | 主布局外壳（侧边栏 + 主内容区） |
| `BrandBlock` | 品牌标识区（标题 + 口号） |
| `IdentityCard` | 用户身份卡片（头像、名称、角色、租户） |
| `TreeNav` | 递归菜单导航树（基于 `AppMenuNode[]`，使用 React Router `NavLink`） |
| `MetricGrid` / `MetricCard` | 指标网格布局 / 单个指标卡片 |
| `SectionCard` | 分区卡片（标题 + 描述 + 内容） |

## 导出入口

- `./src/index.tsx` — 组件导出
- `./src/styles.css` — 组件样式（通过 `@suiyuan/ui-admin/styles.css` 导入）

## 依赖

- `react` / `react-router-dom` — React 和路由
- `@suiyuan/types` — `AppMenuNode` 类型

## 开发命令

```bash
pnpm build       # tsc 编译
pnpm typecheck   # 类型检查
```
