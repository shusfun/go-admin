# 开发工作流

本文档描述基于当前脚手架的日常开发流程，目标是把常见动作收敛到统一命令和固定路径。

## 1. 每日开发最小流程

```bash
pnpm repo:infra:start
pnpm repo:service:start backend
pnpm repo:service:start admin
```

排查运行状态时常用：

```bash
pnpm repo:infra:status
pnpm repo:service:status backend
pnpm repo:service:logs backend
pnpm repo:env
```

## 2. 改后端接口时

建议顺序：

1. 在 `app/*` 内完成模型、DTO、service、api、router 改动
2. 如有结构变更，同步补充 `cmd/migrate/migration/`
3. 执行 `pnpm repo:openapi`，同步 Swagger 与前端 API 类型
4. 执行 `pnpm repo:verify backend`

结果会体现在：

- `docs/admin-swagger/admin_swagger.json`
- `docs/admin-swagger/admin_swagger.yaml`
- `frontend/packages/api/openapi/admin.json`
- 前端生成的 API client 与类型定义

## 3. 改前端页面时

建议顺序：

1. 页面代码放到 `frontend/apps/*`
2. 可复用组件抽到 `frontend/packages/ui-*`
3. 公共类型优先复用 `frontend/packages/api` 与 `frontend/packages/types`
4. 执行 `pnpm repo:verify frontend`，或至少执行 `pnpm typecheck`

如果是后台页面，建议同时对照：

- `scaffold-docs/admin/admin-ui-spec.md`
- `scaffold-docs/admin/admin-table-layout-research.md`

## 4. 改配置或初始化逻辑时

涉及以下链路时，要把 Setup 与启动迁移一起看：

- `config/settings*.yml`
- `common/setup/`
- `frontend/apps/admin-web/src/pages/setup-wizard-page.tsx`
- `cmd/migrate/migration/`

该类改动的专题约束以 [../specs/setup-update-migration-architecture.md](../specs/setup-update-migration-architecture.md) 为准。

## 5. 校验与构建

常用命令：

```bash
pnpm repo:verify backend
pnpm repo:verify frontend
pnpm repo:verify all
pnpm repo:build backend
pnpm build
go test ./...
```

建议：

- 改 Go 代码前后执行 `gofmt`
- 改接口后同步 OpenAPI
- 提交前至少跑对应范围的校验，不把验证责任留到下游

## 6. 需要回到初始态时

如果本地状态已经混乱，可以使用：

```bash
pnpm repo:reinit
```

该命令适合开发环境重置，不适合作为常规清理手段。
