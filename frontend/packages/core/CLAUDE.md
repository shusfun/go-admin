# CLAUDE.md

本文件为 Claude Code (claude.ai/code) 在本目录中工作时提供指引。

## 包：@suiyuan/core

前端业务工具函数库，提供与 UI 无关的核心逻辑。

## 核心导出

### 菜单树工具（menu.ts）
- `adaptMenuTree(rawMenus)` — 将后端返回的 `RawMenuItem[]` 转换为前端 `AppMenuNode[]` 树。过滤掉 `menuType === "F"`（按钮）级别的节点，递归拼接 `fullPath`。
- `flattenMenuTree(tree)` — 将菜单树扁平化为一维数组
- `findMenuByPath(tree, pathname)` — 根据路径查找菜单节点
- `countVisibleMenus(tree)` / `countLeafMenus(tree)` — 统计可见菜单数/叶子菜单数

### 租户解析（tenant.ts）
- `deriveTenantCode(hostname, fallback)` — 从域名提取租户编码。规则：取域名第一段作为租户编码（如 `tenant1.example.com` -> `"tenant1"`），localhost/IP/二级以下域名返回 fallback 值。

## 测试

```bash
pnpm test                       # vitest run
```

测试文件：`src/menu.test.ts`

## 依赖

- `@suiyuan/types` — `RawMenuItem`、`AppMenuNode`、`TenantContext` 类型定义
