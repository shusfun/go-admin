# Repository Guidelines

## Project Structure & Module Organization
`go-admin` 是一个按业务域组织的 Go 后端项目。核心业务代码位于 `app/`，其中 `app/admin`、`app/jobs`、`app/other` 分别承载不同模块；命令入口和启动流程位于 `cmd/`；通用中间件、模型、存储、DTO 与响应封装集中在 `common/`。运行配置和初始化 SQL 在 `config/`，Swagger 生成文件在 `docs/admin/`，静态资源在 `static/`，代码模板在 `template/`，仓库级测试与生成测试样例在 `test/`。

## Build, Test, and Development Commands
- `go mod tidy`：提交前同步并清理模块依赖。
- `make build`：构建主程序，输出 `./go-admin`。
- `go build -tags sqlite3 -o go-admin .`：需要 SQLite 时使用该命令本地编译。
- `./go-admin migrate -c config/settings.yml`：初始化或迁移数据库资源。
- `./go-admin server -c config/settings.yml`：本地启动 API 服务。
- `./go-admin server -c config/settings.yml -a true`：启动时自动补齐缺失的 `sys_api` 记录。
- `go test ./...`：运行全部 Go 测试。
- `go generate`：重新生成 Swagger 等派生文件。

## Coding Style & Naming Conventions
评审前统一执行 `gofmt`。包名保持小写，导出标识符使用 `PascalCase`，内部函数与变量使用 `camelCase`，文件名遵循 `sys_user.go` 这类下划线风格。按现有边界放置代码：接口处理放在 `app/*/apis`，路由放在 `app/*/router`，公共逻辑放在 `common/`。配置文件命名沿用现有模式，例如 `settings.yml`、`settings.sqlite.yml`。

## Testing Guidelines
测试基于 Go 内置 `testing` 包。优先将测试写在目标包旁边的 `*_test.go` 文件中，现有示例包括 `common/file_store/*_test.go` 和 `test/gen_test.go`。新增存储、代码生成或工具类逻辑时，应补充针对性的单元测试。当前 CI 未强制覆盖率门槛，因此提交前至少本地执行一次 `go test ./...`，并在 PR 中说明未覆盖的路径或限制。

## Commit & Pull Request Guidelines
近期提交主要使用简洁的 Conventional Commit 前缀，如 `fix:`、`refactor:`、`docs:`、`chore:`。提交标题应使用祈使句，并聚焦单一改动。PR 默认基于 `master` 发起，需关联 issue，说明问题背景与解决方案；涉及界面或交互变更时补充截图或 GIF。合并前按仓库模板填写变更说明，并确认文档、示例和类型定义是否受影响。

## Security & Configuration Tips
不要在 `config/settings*.yml` 中提交真实密钥、数据库口令或存储凭证。执行迁移、启动服务或运行 Docker 部署命令前，先检查数据库、日志路径和对象存储配置，避免误连生产环境。
