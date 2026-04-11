# 定制与改名

本文档面向“把当前仓库当脚手架派生新项目”的场景。

## 1. 定制的核心原则

- 先确认新项目的品牌、包名、部署前缀，再开始批量替换
- 默认优先做干净替换，不额外保留旧品牌兼容层
- 统一走仓库已有能力，不手工到处搜改品牌字符串

## 2. 推荐操作顺序

### 2.1 预览品牌重命名

```bash
pnpm repo:rename -- 新品牌 --dry-run
```

该命令会预览当前仓库中哪些文件会被替换。

### 2.2 执行品牌重命名

```bash
pnpm repo:rename -- 新品牌 --verify
```

它会统一更新：

- 仓库根 `package.json.name`
- 工作区 scope / 品牌文案
- 仓库内已纳入规则的品牌字符串

### 2.3 重新初始化安装态

如果你希望以“新项目初始状态”重新安装一遍：

```bash
pnpm repo:reinit
```

## 3. 需要重点检查的定制点

| 位置 | 说明 |
| --- | --- |
| `package.json` | 仓库根名称，影响默认项目名前缀 |
| `frontend/apps/admin-web/src/lib/app-branding.ts` | 后台默认品牌文案 |
| `frontend/packages/design-tokens/` | 品牌色与主题 Token |
| `config/settings*.yml` | 默认应用名、端口、数据库连接等 |
| `README.md` 与 `docs/` | 对外说明文案 |

## 4. 什么时候需要同步改文档

以下情况建议同步更新 `docs/scaffold/`：

- 仓库默认启动方式变化
- Setup Wizard 步骤变化
- repo CLI 命令或参数变化
- 新增新的一级目录职责
- 新项目派生流程发生变化

## 5. 定制完成后的建议校验

```bash
pnpm repo:verify all
pnpm repo:openapi
go test ./...
```

如果只是验证改名影响范围，至少执行：

```bash
pnpm repo:verify frontend
pnpm repo:verify backend
```
