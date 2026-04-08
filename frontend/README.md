# Frontend Workspace

## 目录

- `apps/admin-web`：后台管理前端
- `apps/mobile-h5`：移动端用户前端
- `packages/api`：接口请求与响应解包
- `packages/auth`：登录态与 token 存储
- `packages/core`：租户与菜单适配工具
- `packages/design-tokens`：设计变量
- `packages/ui-admin`：后台组件
- `packages/ui-mobile`：移动组件

## 常用命令

在仓库根目录执行：

```bash
make init
make infra-up
make dev-backend
make dev-admin
make dev-mobile
pnpm typecheck
pnpm test
pnpm build
```

## 环境变量

两个应用都支持：

- `VITE_API_BASE_URL`：正式 API 地址，留空时走同源
- `VITE_PROXY_TARGET`：本地开发代理地址，默认 `http://127.0.0.1:18123`
- `VITE_TENANT_CODE`：本地开发时的租户回退值，默认 `local`

本地开发推荐先执行：

```bash
make infra-up
make dev-backend
make dev-admin
```

- Docker 项目前缀默认取仓库根 `package.json.name`，当前仓库默认值为 `go-admin`
- `make infra-up`、`make reinit` 等命令都会读取同一个前缀
- 如需覆盖，可在执行命令前设置 `PROJECT_PREFIX=你的前缀`
- 如需回到全新安装状态，再执行 `make reinit`

生产环境推荐按域名或子域部署，由前端自动识别租户编码。

## Setup Wizard

- Setup Wizard 依赖独立部署的 `apps/admin-web`，后端在 setup 模式下只暴露 `/api/v1/setup/*` API。
- 首次安装前，请确认 `VITE_API_BASE_URL` 指向目标后端服务，否则前端无法驱动初始化流程。
- 后端是否进入 setup 模式只由配置目录中的 `.installed` 决定，不再根据示例 `settings.yml` 自动跳过。
