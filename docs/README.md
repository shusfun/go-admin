# 文档中心

`docs/` 现按“脚手架入口 + 专题设计 + 自动生成产物”三层组织，优先从脚手架文档开始阅读，再按需要深入专题文档。

## 1. 脚手架入口

适合首次接手仓库、准备二开、梳理开发流程的同学：

- [脚手架总览](./scaffold/README.md)
- [快速开始](./scaffold/quick-start.md)
- [项目结构](./scaffold/project-structure.md)
- [开发工作流](./scaffold/development-workflow.md)
- [定制与改名](./scaffold/customization.md)

推荐阅读顺序：

1. 先看 [快速开始](./scaffold/quick-start.md)，跑通本地启动链路
2. 再看 [项目结构](./scaffold/project-structure.md)，理解目录职责和扩展落点
3. 日常开发时参考 [开发工作流](./scaffold/development-workflow.md)
4. 需要做品牌化、改名、复用脚手架时再看 [定制与改名](./scaffold/customization.md)

## 2. 专题设计文档

这些文档保留为详细设计或调研资料，不替代脚手架入口：

- [Setup / 更新 / 启动迁移 架构落地文档](./setup-update-migration-architecture.md)
  - 定义 Setup Wizard、`git pull` 更新、启动自动迁移的唯一真相源
- [运维服务一期 - 实施方案](./ops-service-v1-spec.md)
  - 定义 `app/ops/` 的一期实现边界、模型、接口与执行流程
- [前端国际化后续待办](./frontend-i18n-todo.md)
  - 记录前端国际化的后续拆解与执行顺序
- [Admin 后台 UI/UX 规范](./admin/admin-ui-spec.md)
  - 后台前端实现规范与设计约束
- [宽表竞品调研 v2](./admin/admin-table-layout-research.md)
  - 后台宽表场景的产品调研与布局结论

## 3. 自动生成与参考产物

- [admin_swagger.json](./admin/admin_swagger.json)
- [admin_swagger.yaml](./admin/admin_swagger.yaml)
- [admin_docs.go](./admin/admin_docs.go)

说明：

- `docs/admin/admin_swagger.*` 与 `docs/admin/admin_docs.go` 属于生成产物，变更接口后通过 `pnpm repo:openapi` 或 `go generate` 重新生成
- 这类文件可作为接口参考，但不适合作为脚手架阅读入口

## 4. 文档维护约定

- 面向“如何接手项目、如何从模板开始二开”的内容，优先放在 `docs/scaffold/`
- 面向单一业务、单一专题、单一设计决策的内容，放在 `docs/` 或 `docs/admin/`
- 自动生成文件继续保留在 `docs/admin/`
- 若专题文档与脚手架文档冲突，以专题中的“唯一真相源”说明为准，并回写脚手架文档入口
