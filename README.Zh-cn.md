# go-admin

  <img align="right" width="320" src="https://doc-image.zhangwj.com/img/go-admin.svg">


[![Build Status](https://github.com/shusfun/go-admin/workflows/build/badge.svg)](https://github.com/shusfun/go-admin)
[![Release](https://img.shields.io/github/release/shusfun/go-admin.svg?style=flat-square)](https://github.com/shusfun/go-admin/releases)
[![License](https://img.shields.io/github/license/shusfun/go-admin.svg?style=flat-square)](https://github.com/shusfun/go-admin)

[English](https://github.com/shusfun/go-admin/blob/master/README.md) | 简体中文

基于Gin + Vue + Element UI OR Arco Design OR Ant Design的前后端分离权限管理系统,系统初始化极度简单，只需要配置文件中，修改数据库连接，系统支持多指令操作，迁移指令可以让初始化数据库信息变得更简单，服务指令可以很简单的启动api服务

[在线文档](https://www.go-admin.pro)

[前端项目](https://github.com/go-admin-team/go-admin-ui)

[视频教程](https://space.bilibili.com/565616721/channel/detail?cid=125737)

## 🎬 在线体验

UI Showcase 演示：<https://shusfun.github.io/go-admin/>
> 静态托管默认使用 HashRouter，例如组件页可直接访问：<https://shusfun.github.io/go-admin/#/data/virtual-list>

Element UI vue体验：[https://vue2.go-admin.dev](https://vue2.go-admin.dev/#/login)
> ⚠️⚠️⚠️ 账号 / 密码： admin / 123456

Arco Design vue3 demo：[https://vue3.go-admin.dev](https://vue3.go-admin.dev/#/login)
> ⚠️⚠️⚠️ 账号 / 密码： admin / 123456

antd体验：[https://antd.go-admin.pro](https://antd.go-admin.pro/)
> ⚠️⚠️⚠️ 账号 / 密码： admin / 123456

## ✨ 特性

- 遵循 RESTful API 设计规范

- 基于 GIN WEB API 框架，提供了丰富的中间件支持（用户认证、跨域、访问日志、追踪ID等）

- 基于Casbin的 RBAC 访问控制模型

- JWT 认证

- 支持 Swagger 文档(基于swaggo)

- 基于 GORM 的数据库存储，可扩展多种类型数据库

- 配置文件简单的模型映射，快速能够得到想要的配置

- 代码生成工具

- 表单构建工具

- 多指令模式

- 多租户的支持

- TODO: 单元测试

## 🎁 内置

1. 多租户：系统默认支持多租户，按库分离，一个库一个租户。
1. 用户管理：用户是系统操作者，该功能主要完成系统用户配置。
2. 部门管理：配置系统组织机构（公司、部门、小组），树结构展现支持数据权限。
3. 岗位管理：配置系统用户所属担任职务。
4. 菜单管理：配置系统菜单，操作权限，按钮权限标识，接口权限等。
5. 角色管理：角色菜单权限分配、设置角色按机构进行数据范围权限划分。
6. 字典管理：对系统中经常使用的一些较为固定的数据进行维护。
7. 参数管理：对系统动态配置常用参数。
8. 操作日志：系统正常操作日志记录和查询；系统异常信息日志记录和查询。
9. 登录日志：系统登录日志记录查询包含登录异常。
1. 接口文档：根据业务代码自动生成相关的api接口文档。
1. 代码生成：根据数据表结构生成对应的增删改查相对应业务，全程可视化操作，让基本业务可以零代码实现。
1. 表单构建：自定义页面样式，拖拉拽实现页面布局。
1. 服务监控：查看一些服务器的基本信息。
1. 内容管理：demo功能，下设分类管理、内容管理。可以参考使用方便快速入门。
1. 定时任务：自动化任务，目前支持接口调用和函数调用。

## 📦 本地开发

### 环境要求

- Go 1.24+
- Node.js 18+
- pnpm 10+
- Docker Engine + Docker Compose

### 获取代码

```bash
git clone https://github.com/shusfun/go-admin.git
cd go-admin
```

### 推荐开发流

由于 `pnpm` 自身保留了 `repo` 子命令，带参数的仓库 CLI 请使用 `pnpm repo:*` 脚本，或使用 `pnpm run repo -- <command>` 形式调用。

```bash
pnpm repo:doctor
pnpm repo:deps all
pnpm repo:infra:start
pnpm repo:service:start backend
pnpm repo:service:start admin
```

这套流程会自动探测可用的开发基础设施：

- 若项目级 Docker 基础设施已在运行，优先复用 `15432 / 16379`
- 若检测到 Homebrew 全局 PostgreSQL，则优先复用 `5432`
- 实际探测结果可通过 `pnpm repo:infra:status` 查看

项目级 Docker 基础设施默认使用以下端口：

- 后端 API：`18123`
- 管理端：`26173`
- 移动端：`26174`
- PostgreSQL：`15432`
- Redis：`16379`

如果只想看当前实际配置，可以执行：

```bash
pnpm repo:env
```

### 容器前缀规则

- 所有 `docker compose` 相关命令都读取同一个项目名前缀
- 默认值来自仓库根 `package.json.name`
- 当前仓库默认值是 `go-admin`
- 如需覆盖，可在命令前传入 `--project-prefix`

```bash
pnpm run repo -- --project-prefix my-local-env infra start
pnpm run repo -- --project-prefix my-local-env reinit --yes
```

### 四个核心命令

```bash
pnpm repo:infra:start
pnpm repo:service:start backend
pnpm repo:service:start admin
pnpm repo:reinit
```

- `repo infra start`：自动探测并启动开发基础设施，优先复用当前可用的 Docker / Homebrew 服务
- `repo infra stop`：停止当前选中的开发基础设施来源
- `repo infra status`：查看当前基础设施来源、安装状态、运行状态和健康状态
- `repo service start backend`：启动后端，默认读取 `config/settings.pg.yml`
- `repo service start admin`：启动管理端开发服务器
- `repo reinit --yes`：按当前前缀清理应用栈、项目级 Docker 数据目录、安装锁和本地产物
- 所有受管服务日志和状态文件都会写到项目内 `temp/repo-cli/`：
  - `temp/repo-cli/logs/<service>.log`
  - `temp/repo-cli/state.json`

- Windows / macOS：`backend`、`admin`、`mobile` 默认在独立终端窗口启动
- Linux：本地服务保持在当前终端体系内运行，不依赖额外图形窗口

### Setup Wizard 说明

- 首次执行 `repo service start backend` 时，如果 `config/.installed` 不存在，后端会进入 Setup Wizard 模式
- Setup 模式下只暴露 `/api/v1/setup/*` 接口，不会托管前端静态资源
- 启动 `repo service start admin` 后，前端会自动检测安装状态并引导初始化数据库和管理员账号
- 安装完成后会写入当前启动使用的配置文件（默认 `config/settings.pg.yml`）与同目录下的 `.installed`
- 容器部署时请持久化 `config/` 目录，否则重启后会重新进入安装流程

### OpenAPI 到前端类型

```bash
pnpm repo:openapi
```

该命令会完成以下工作：

- 重新生成 `docs/admin/admin_swagger.json`
- 同步 OpenAPI 文件到 `frontend/packages/api/openapi/admin.json`
- 生成前端可直接使用的 API client 与类型定义
- 自动执行 `pnpm typecheck`

### 其他常用命令

```bash
pnpm repo:doctor
pnpm repo:deps all
pnpm repo:setup-status
pnpm repo:build backend
pnpm repo:migrate
pnpm repo:service:start mobile
pnpm repo:service:stop all
pnpm repo:verify backend
pnpm repo:rename -- go-admin --dry-run
```

## 📨 互动

<table>
   <tr>
    <td><img src="https://raw.githubusercontent.com/wenjianzhang/image/master/img/wx.png" width="180px"></td>
    <td><img src="https://doc-image.zhangwj.com/img/qrcode_for_gh_b798dc7db30c_258.jpg" width="180px"></td>
    <td><img src="https://raw.githubusercontent.com/wenjianzhang/image/master/img/qq2.png" width="200px"></td>
    <td><a href="https://space.bilibili.com/565616721">wenjianzhang</a></td>
  </tr>
  <tr>
    <td>微信</td>
    <td>公众号🔥🔥🔥</td>
    <td><a target="_blank" href="https://shang.qq.com/wpa/qunwpa?idkey=0f2bf59f5f2edec6a4550c364242c0641f870aa328e468c4ee4b7dbfb392627b"><img border="0" src="https://pub.idqqimg.com/wpa/images/group.png" alt="go-admin技术交流乙号" title="go-admin技术交流乙号"></a></td>
    <td>哔哩哔哩🔥🔥🔥</td>
  </tr>
</table>

## 💎 贡献者


<span style="margin: 0 5px;" ><a href="https://github.com/wenjianzhang" ><img src="https://images.weserv.nl/?url=avatars.githubusercontent.com/u/3890175?v=4&h=60&w=60&fit=cover&mask=circle&maxage=7d" /></a></span>
<span style="margin: 0 5px;" ><a href="https://github.com/G-Akiraka" ><img src="https://images.weserv.nl/?url=avatars.githubusercontent.com/u/45746659?s=64&v=4&w=60&fit=cover&mask=circle&maxage=7d" /></a></span>
<span style="margin: 0 5px;" ><a href="https://github.com/lwnmengjing" ><img src="https://images.weserv.nl/?url=avatars.githubusercontent.com/u/12806223?s=64&v=4&w=60&fit=cover&mask=circle&maxage=7d" /></a></span>
<span style="margin: 0 5px;" ><a href="https://github.com/bing127" ><img src="https://images.weserv.nl/?url=avatars.githubusercontent.com/u/31166183?s=60&v=4&w=60&fit=cover&mask=circle&maxage=7d" /></a></span>
<span style="margin: 0 5px;" ><a href="https://github.com/chengxiao" ><img src="https://images.weserv.nl/?url=avatars.githubusercontent.com/u/1379545?s=64&v=4&w=60&fit=cover&mask=circle&maxage=7d" /></a></span>
<span style="margin: 0 5px;" ><a href="https://github.com/NightFire0307" ><img src="https://images.weserv.nl/?url=avatars.githubusercontent.com/u/19854086?v=4&w=60&fit=cover&mask=circle&maxage=7d" /></a></span>
<span style="margin: 0 5px;" ><a href="https://github.com/appleboy" ><img src="https://images.weserv.nl/?url=avatars.githubusercontent.com/u/21979?s=64&v=4&w=60&fit=cover&mask=circle&maxage=7d" /></a></span>
<span style="margin: 0 5px;" ><a href="https://github.com/ninstein" ><img src="https://images.weserv.nl/?url=avatars.githubusercontent.com/u/580303?v=4&h=60&w=60&fit=cover&mask=circle&maxage=7d" /></a></span>
<span style="margin: 0 5px;" ><a href="https://github.com/kikiyou" ><img src="https://images.weserv.nl/?url=avatars.githubusercontent.com/u/17959053?s=64&v=4&w=60&fit=cover&mask=circle&maxage=7d" /></a></span>
<span style="margin: 0 5px;" ><a href="https://github.com/horizonzy" ><img src="https://images.weserv.nl/?url=avatars.githubusercontent.com/u/22524871?s=64&v=4&w=60&fit=cover&mask=circle&maxage=7d" /></a></span>
<span style="margin: 0 5px;" ><a href="https://github.com/Cassuis" ><img src="https://images.weserv.nl/?url=avatars.githubusercontent.com/u/48005724?s=64&v=4&w=60&fit=cover&mask=circle&maxage=7d" /></a></span>
<span style="margin: 0 5px;" ><a href="https://github.com/hqcchina" ><img src="https://images.weserv.nl/?url=avatars.githubusercontent.com/u/5179057?s=60&v=4&w=60&fit=cover&mask=circle&maxage=7d" /></a></span>
<span style="margin: 0 5px;" ><a href="https://github.com/nodece" ><img src="https://images.weserv.nl/?url=avatars.githubusercontent.com/u/16235121?s=60&v=4&w=60&fit=cover&mask=circle&maxage=7d" /></a></span>
<span style="margin: 0 5px;" ><a href="https://github.com/stephenzhang0713" ><img src="https://images.weserv.nl/?url=avatars.githubusercontent.com/u/18169290?s=60&v=4&w=60&fit=cover&mask=circle&maxage=7d" /></a></span>
<span style="margin: 0 5px;" ><a href="https://github.com/zhouxixi-dev" ><img src="https://images.weserv.nl/?url=avatars.githubusercontent.com/u/100399679?s=60&v=4&w=60&fit=cover&mask=circle&maxage=7d" /></a></span>
<span style="margin: 0 5px;" ><a href="https://github.com/Jalins" ><img src="https://images.weserv.nl/?url=avatars.githubusercontent.com/u/31172582?s=60&v=4&w=60&fit=cover&mask=circle&maxage=7d" /></a></span>
<span style="margin: 0 5px;" ><a href="https://github.com/wkf928592" ><img src="https://images.weserv.nl/?url=avatars.githubusercontent.com/u/6063351?s=60&v=4&w=60&fit=cover&mask=circle&maxage=7d" /></a></span>
<span style="margin: 0 5px;" ><a href="https://github.com/wxxiong6" ><img src="https://images.weserv.nl/?url=avatars.githubusercontent.com/u/6983441?s=60&v=4&w=60&fit=cover&mask=circle&maxage=7d" /></a></span>
<span style="margin: 0 5px;" ><a href="https://github.com/Silicon-He" ><img src="https://images.weserv.nl/?url=avatars.githubusercontent.com/u/52478309?s=60&v=4&w=60&fit=cover&mask=circle&maxage=7d" /></a></span>
<span style="margin: 0 5px;" ><a href="https://github.com/GizmoOAO" ><img src="https://images.weserv.nl/?url=avatars.githubusercontent.com/u/20385106?s=60&v=4&w=60&fit=cover&mask=circle&maxage=7d" /></a></span>
<span style="margin: 0 5px;" ><a href="https://github.com/bestgopher" ><img src="https://images.weserv.nl/?url=avatars.githubusercontent.com/u/36840497?s=60&v=4&w=60&fit=cover&mask=circle&maxage=7d" /></a></span>
<span style="margin: 0 5px;" ><a href="https://github.com/wxb1207" ><img src="https://images.weserv.nl/?url=avatars.githubusercontent.com/u/20775558?s=60&v=4&w=60&fit=cover&mask=circle&maxage=7d" /></a></span>
<span style="margin: 0 5px;" ><a href="https://github.com/misakichan" ><img src="https://images.weserv.nl/?url=avatars.githubusercontent.com/u/16569274?s=60&v=4&w=60&fit=cover&mask=circle&maxage=7d" /></a></span>
<span style="margin: 0 5px;" ><a href="https://github.com/zhuxuyang" ><img src="https://images.weserv.nl/?url=avatars.githubusercontent.com/u/19301024?s=60&v=4&w=60&fit=cover&mask=circle&maxage=7d" /></a></span>
<span style="margin: 0 5px;" ><a href="https://github.com/mss-boot" ><img src="https://images.weserv.nl/?url=avatars.githubusercontent.com/u/109259065?s=60&v=4&w=60&fit=cover&mask=circle&maxage=7d" /></a></span>
<span style="margin: 0 5px;" ><a href="https://github.com/AuroraV" ><img src="https://images.weserv.nl/?url=avatars.githubusercontent.com/u/37330199?s=60&v=4&w=60&fit=cover&mask=circle&maxage=7d" /></a></span>
<span style="margin: 0 5px;" ><a href="https://github.com/Vingurzhou" ><img src="https://images.weserv.nl/?url=avatars.githubusercontent.com/u/57127283?s=60&v=4&w=60&fit=cover&mask=circle&maxage=7d" /></a></span>
<span style="margin: 0 5px;" ><a href="https://github.com/haimait" ><img src="https://images.weserv.nl/?url=avatars.githubusercontent.com/u/40926384?s=60&v=4&w=60&fit=cover&mask=circle&maxage=7d" /></a></span>
<span style="margin: 0 5px;" ><a href="https://github.com/zyd" ><img src="https://images.weserv.nl/?url=avatars.githubusercontent.com/u/3446278?s=60&v=4&w=60&fit=cover&mask=circle&maxage=7d" /></a></span>
<span style="margin: 0 5px;" ><a href="https://github.com/infnan" ><img src="https://images.weserv.nl/?url=avatars.githubusercontent.com/u/38274826?s=60&v=4&w=60&fit=cover&mask=circle&maxage=7d" /></a></span>
<span style="margin: 0 5px;" ><a href="https://github.com/d1y" ><img src="https://images.weserv.nl/?url=avatars.githubusercontent.com/u/45585937?s=60&v=4&w=60&fit=cover&mask=circle&maxage=7d" /></a></span>
<span style="margin: 0 5px;" ><a href="https://github.com/qlijin" ><img src="https://images.weserv.nl/?url=avatars.githubusercontent.com/u/515900?s=60&v=4&w=60&fit=cover&mask=circle&maxage=7d" /></a></span>
<span style="margin: 0 5px;" ><a href="https://github.com/logtous
" ><img src="https://images.weserv.nl/?url=avatars.githubusercontent.com/u/88697234?s=60&v=4&w=60&fit=cover&mask=circle&maxage=7d" /></a></span>
<span style="margin: 0 5px;" ><a href="https://github.com/stepway
" ><img src="https://images.weserv.nl/?url=avatars.githubusercontent.com/u/9927079?s=60&v=4&w=60&fit=cover&mask=circle&maxage=7d" /></a></span>
<span style="margin: 0 5px;" ><a href="https://github.com/NaturalGao
" ><img src="https://images.weserv.nl/?url=avatars.githubusercontent.com/u/43291304?s=60&v=4&w=60&fit=cover&mask=circle&maxage=7d" /></a></span>
<span style="margin: 0 5px;" ><a href="https://github.com/DemoLiang
" ><img src="https://images.weserv.nl/?url=avatars.githubusercontent.com/u/23476007?s=60&v=4&w=60&fit=cover&mask=circle&maxage=7d" /></a></span>
<span style="margin: 0 5px;" ><a href="https://github.com/jfcg
" ><img src="https://images.weserv.nl/?url=avatars.githubusercontent.com/u/1410597?s=60&v=4&w=60&fit=cover&mask=circle&maxage=7d" /></a></span>
<span style="margin: 0 5px;" ><a href="https://github.com/Nicole0724
" ><img src="https://images.weserv.nl/?url=avatars.githubusercontent.com/u/10487328?s=60&v=4&w=60&fit=cover&mask=circle&maxage=7d" /></a></span>

## JetBrains 开源证书支持

`go-admin` 项目一直以来都是在 JetBrains 公司旗下的 GoLand 集成开发环境中进行开发，基于 **free JetBrains Open Source license(s)** 正版免费授权，在此表达我的谢意。

<a href="https://www.jetbrains.com/?from=kubeadm-ha" target="_blank"><img src="https://raw.githubusercontent.com/panjf2000/illustrations/master/jetbrains/jetbrains-variant-4.png" width="250" align="middle"/></a>

## 🤝 特别感谢

1. [ant-design](https://github.com/ant-design/ant-design)
2. [ant-design-pro](https://github.com/ant-design/ant-design-pro)
2. [arco-design](https://github.com/arco-design/arco-design)
2. [arco-design-pro](https://github.com/arco-design/arco-design-pro)
4. [gin](https://github.com/gin-gonic/gin)
5. [casbin](https://github.com/casbin/casbin)
6. [spf13/viper](https://github.com/spf13/viper)
7. [gorm](https://github.com/jinzhu/gorm)
8. [gin-swagger](https://github.com/swaggo/gin-swagger)
9. [jwt-go](https://github.com/dgrijalva/jwt-go)
10. [vue-element-admin](https://github.com/PanJiaChen/vue-element-admin)
11. [ruoyi-vue](https://gitee.com/y_project/RuoYi-Vue)
12. [form-generator](https://github.com/JakHuang/form-generator)


## 🤟 打赏

> 如果你觉得这个项目帮助到了你，你可以帮作者买一杯果汁表示鼓励 :tropical_drink:

<img class="no-margin" src="https://raw.githubusercontent.com/wenjianzhang/image/master/img/pay.png"  height="200px" >

## 🤝 链接

[Go开发者成长线路图](http://www.golangroadmap.com/)

## 🔑 License

[MIT](https://github.com/shusfun/go-admin/blob/master/LICENSE.md)

Copyright (c) 2024 wenjianzhang
