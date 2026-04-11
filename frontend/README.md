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

## 主题接入

- `@go-admin/design-tokens/base.css`：基础 reset、全局基础行为与结构 token 兜底值，不携带品牌色视觉。
- `@go-admin/design-tokens/default-theme.css`：仓库当前默认主题，现有应用显式引入它。
- `@go-admin/design-tokens/host-theme-template.css`：宿主项目主题模板，按同名 token 提供值即可接管组件库样式。
- `@go-admin/design-tokens/theme.css`：兼容入口，等价于 `base.css + default-theme.css`。

宿主项目推荐入口顺序：

```css
@import "@go-admin/design-tokens/base.css";
@import "./your-host-theme.css";
```

当前仓库内的 `apps/admin-web` 已按这个模式接入，主题定义位于 `apps/admin-web/src/admin-host-theme.css`。

说明：
- `base.css` 会为圆角、阴影、字体等结构 token 提供默认兜底，保证组件在宿主主题漏项时仍可渲染。
- 宿主主题仍应按 `host-theme-template.css` 显式覆盖同名 token，避免出现“组件能显示但风格不一致”。

## 常用命令

在仓库根目录执行：

```bash
pnpm repo:deps all
pnpm repo:setup
pnpm repo:infra:start
pnpm repo:service:start backend
pnpm repo:service:start:backend
pnpm repo:service:start admin
pnpm repo:service:start mobile
pnpm repo:build backend
pnpm typecheck
pnpm test
pnpm build
```

## 局部滚动规范

- 局部滚动区域默认使用公共滚动组件，不直接以 `overflow-y-auto`、`overflow-x-auto`、`overflow-auto` 作为实现。
- `apps/admin-web` 优先通过 `@go-admin/ui-admin` 公共组件获得滚动行为；`apps/mobile-h5` 优先通过 `@go-admin/ui-mobile` 公共组件承接布局。
- 页面主内容区和浏览器窗口滚动保持原生，不纳入统一滚动组件规则。
- 若页面主内容区必须显式声明原生滚动，请在代码旁标注 `scroll-rule: allow-page-content-overflow`，避免检查脚本误报。
- 仓库提供滚动规则检查脚本，提交前可执行 `pnpm check:local-scrollbars`。

## 环境变量

两个应用都支持：

- `VITE_API_BASE_URL`：正式 API 地址，留空时走同源
- `VITE_PROXY_TARGET`：本地开发代理地址，默认 `http://127.0.0.1:18123`
- `VITE_TENANT_CODE`：本地开发时的租户回退值，默认 `local`

本地开发推荐先执行：

```bash
pnpm repo:deps all
pnpm repo:infra:start
pnpm repo:service:start backend
pnpm repo:service:start admin
```

这些 `pnpm repo:*` 命令会直接执行 `tools/repo-cli/src/*.mjs`，不依赖额外的 CLI 编译步骤。
- 后端默认优先使用仓库内 `./.tmp/bin/air` 做热更新，首次启动会自动准备
- `pnpm repo:service:start backend` 与 `pnpm repo:service:start:backend` 等价

- Docker 项目前缀默认取仓库根 `package.json.name`，当前仓库默认值为 `go-admin`
- `pnpm repo:infra:start`、`pnpm repo:reinit` 等命令都会读取同一个前缀
- 如需覆盖，可使用 `pnpm run repo -- --project-prefix 你的前缀 ...`
- 如需回到全新安装状态，再执行 `pnpm repo:reinit`

生产环境推荐按域名或子域部署，由前端自动识别租户编码。

## UI Showcase 静态部署

- 当前演示地址：<https://shusfun.github.io/go-admin/>
- 深链接示例：<https://shusfun.github.io/go-admin/#/data/virtual-list>
- `apps/ui-showcase` 的生产构建默认使用 `HashRouter`，适合 GitHub Pages 这类无服务端路由回退的静态托管。
- 构建时会优先读取 `VITE_SHOWCASE_BASE`，未显式指定时若检测到 `GITHUB_REPOSITORY`，会自动推导仓库 Pages 的子路径 base。
- 若你把展示站部署到 GitHub 用户页别名根路径，可设置 `VITE_SHOWCASE_BASE=/`。
- 若部署目标支持 SPA rewrite，且你希望保留无 hash URL，可额外设置 `VITE_SHOWCASE_ROUTER_MODE=browser`。

示例：

```bash
# 仓库 Pages，例如 https://shusfun.github.io/go-admin/
pnpm --filter @go-admin/ui-showcase build

# 用户页别名根路径，例如 https://shusfun.github.io/
VITE_SHOWCASE_BASE=/ pnpm --filter @go-admin/ui-showcase build

# 支持 rewrite 的站点，保留 BrowserRouter
VITE_SHOWCASE_BASE=/docs/ VITE_SHOWCASE_ROUTER_MODE=browser pnpm --filter @go-admin/ui-showcase build
```

## Setup Wizard

- Setup Wizard 依赖独立部署的 `apps/admin-web`，后端在 setup 模式下只暴露 `/api/v1/setup/*` API。
- 首次安装前，请确认 `VITE_API_BASE_URL` 指向目标后端服务，否则前端无法驱动初始化流程。
- 后端是否进入 setup 模式只由配置目录中的 `.installed` 决定，不再根据示例 `settings.yml` 自动跳过。
