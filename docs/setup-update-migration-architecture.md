# Setup / 更新 / 启动迁移 架构落地文档

> 目标：把 `首次安装 -> git pull 更新 -> 重启服务 -> 自动迁移 -> 运维展示` 这条链收敛成一套可实现、可 review、可验收的统一规范，避免后续继续“边修边补”。

## 1. 范围

本文档只定义以下链路：

- 首次安装：`Setup Wizard`
- 后续更新：`git pull`
- 生效方式：重启后端服务
- 数据库迁移：后端启动阶段按配置执行幂等迁移检查
- 运维展示：后台 `Ops` 页面与任务日志

本文档**不**涵盖：

- 下载制品式自更新
- 二进制热替换
- 多版本回滚系统
- 非 Git 仓库的更新模式

## 2. 架构结论

本项目后续统一采用下面这套模型：

1. 代码更新唯一方式是 `git pull`
2. 首次安装唯一入口是 `Setup Wizard`
3. 后续 schema 升级唯一主路径是“后端启动时按配置做幂等迁移检查”
4. `pnpm repo:migrate` 只保留为保底命令，不再是主流程
5. 运维页只能描述真实行为，不能把“可选配置”描述成“默认事实”

## 3. 唯一真相源

### 3.1 安装环境真相源

`Setup Wizard` 的 `environment` 是首次安装配置落盘的唯一真相源。

`Setup Wizard` 的管理员账号也是首次安装阶段的唯一真相源。

允许值只包含：

- `dev`
- `test`
- `prod`

禁止：

- 空值直接写盘
- 任意自定义字符串写盘
- 前后端分别推断环境导致不一致
- 基础种子数据继续预置可登录管理员账号

### 3.2 更新方式真相源

运维更新的唯一真相源是任务执行器里的 Git 流程：

```text
git pull --ff-only
-> 重启服务
-> 健康检查
```

不允许在运维页、README、帮助文案里把该流程表述成“发布包升级”或“应用自更新”。

### 3.3 迁移执行真相源

迁移执行的唯一真相源是后端启动配置：

`settings.extend.runtime.autoMigrateOnStart`

语义如下：

- `true`：后端每次启动与热更新重启都执行幂等迁移检查
- `false`：后端启动跳过自动迁移，需显式执行 `go-admin migrate` / `pnpm repo:migrate`

## 4. 生命周期状态流

### 4.1 首次安装

```text
后端启动
-> 检查 config/.installed
-> 不存在
-> 进入 Setup Wizard 模式
-> 前端读取 /api/v1/setup/status
-> 展示默认值 + 环境标识
-> 用户提交 database + admin + environment
-> 后端校验输入
-> 初始化数据库
-> 创建管理员
-> 按 environment 生成 settings
-> 写入 .installed
-> 退出进程
-> 由 air / docker / systemd 重启
```

### 4.2 日常开发

```text
pnpm repo:service:start backend
-> air 启动/重启后端
-> 读取 settings.pg.yml
-> 若 autoMigrateOnStart=true
-> 执行幂等迁移检查
-> 服务继续启动
```

### 4.3 后续更新

```text
git pull --ff-only
-> 重启后端服务
-> 启动阶段读取配置
-> 若 autoMigrateOnStart=true
-> 执行幂等迁移检查
-> 健康检查通过
-> 更新完成
```

## 5. 配置策略

### 5.1 环境到配置的映射

| 环境 | application.mode | autoMigrateOnStart | 说明 |
| --- | --- | --- | --- |
| `dev` | `dev` | `true` | 本地开发默认自动迁移 |
| `test` | `test` | `true` | 测试环境允许重启即迁移 |
| `prod` | `prod` | `false` | 生产默认关闭自动迁移 |

### 5.2 Setup 落盘规则

`Setup Wizard` 落盘时必须满足：

1. `application.mode` 由提交的 `environment` 决定
2. `autoMigrateOnStart` 由 `environment` 派生，不能写死
3. 后端不得自行把“无配置文件”直接推断成 `dev` 并落盘到生产配置

### 5.3 前端默认值规则

前端 `setup/status` 的 `defaults.environment` 只能来自后端真实返回。

如果后端没有返回 `defaults.environment`：

- 前端可以展示兜底视觉默认值
- 但**不能**把一个硬编码环境直接提交回安装接口

换句话说：

- UI fallback 允许存在
- 安装提交的环境值不允许靠前端猜

## 6. 接口契约

### 6.1 `GET /api/v1/setup/status`

返回结构至少包含：

```json
{
  "needs_setup": true,
  "step": "welcome",
  "defaults": {
    "environment": "dev",
    "database": {
      "host": "127.0.0.1",
      "port": 15432,
      "user": "go_admin_dev",
      "password": "go_admin_dev",
      "dbname": "go_admin_dev"
    },
    "admin": {
      "username": "admin",
      "email": "",
      "phone": ""
    }
  }
}
```

要求：

- `defaults.environment` 必须始终返回
- 允许值只能是 `dev/test/prod`

### 6.2 `POST /api/v1/setup/install`

请求结构：

```json
{
  "environment": "dev",
  "database": {
    "host": "127.0.0.1",
    "port": 15432,
    "user": "go_admin_dev",
    "password": "go_admin_dev",
    "dbname": "go_admin_dev"
  },
  "admin": {
    "username": "admin",
    "password": "admin123",
    "email": "",
    "phone": ""
  }
}
```

后端要求：

1. 校验 `environment` 非空
2. 校验 `environment in {dev,test,prod}`
3. 用校验后的环境值落盘配置

## 7. 运维页规范

运维页的语言必须与真实执行链一致。

### 7.1 允许的表述

- 更新后端
- 更新前端
- 全部更新
- 重启后端
- 待更新提交
- 最近一次更新

### 7.2 禁止的表述

- 发布后端
- 发布前端
- 全部发布
- 从未发布
- 自动迁移一定会执行

### 7.3 自动迁移文案规则

运维页只能写条件句：

```text
若当前后端配置开启启动迁移，更新或重启后会自动执行幂等迁移检查。
```

不能写成：

```text
更新后会自动迁移。
```

## 8. 日志与错误语义

### 8.1 后端更新任务日志

后端任务在“重启服务”步骤前应明确写入日志：

```text
[info] 重启后端服务，服务启动阶段会按配置自动执行幂等迁移检查
```

### 8.2 健康检查失败提示

健康检查失败时，应把可能原因收敛到：

- 启动迁移失败
- 配置错误
- 应用初始化失败

### 8.3 启动迁移日志级别

启动迁移路径不得无条件开启 `db.Debug()`。

理由：

- 主启动链路不应强制刷 SQL
- 是否输出 DB 级日志应继续遵循现有 logger 配置

## 9. 保底命令定位

`pnpm repo:migrate` / `go-admin migrate` 的定位：

- 生产保底
- CI / 运维显式执行
- 故障恢复与排查

不再作为主流程要求用户记忆。

## 10. 验收标准

### 10.1 Setup

1. 全新本地安装
   - `status.defaults.environment=dev`
   - 安装后生成 `mode=dev`
   - `autoMigrateOnStart=true`

2. 全新测试环境安装
   - `status.defaults.environment=test`
   - 安装后生成 `mode=test`
   - `autoMigrateOnStart=true`

3. 全新生产安装
   - `status.defaults.environment=prod`
   - 安装后生成 `mode=prod`
   - `autoMigrateOnStart=false`

### 10.2 更新链

1. `git pull` 后重启，且配置为 `autoMigrateOnStart=true`
   - 启动日志显示迁移检查
   - 服务正常通过健康检查

2. `git pull` 后重启，且配置为 `autoMigrateOnStart=false`
   - 启动阶段不执行自动迁移
   - 服务正常启动

### 10.3 运维展示

1. Ops 页面所有按钮均使用“更新”语义
2. Ops 页面只使用条件句描述自动迁移
3. 任务成功摘要按类型显示：
   - 后端更新完成
   - 前端更新完成
   - 代码更新完成
   - 后端重启完成

## 11. 当前实现差距

在后续编码前，必须先对照本文档排查并收敛以下问题：

1. setup/status 是否始终返回可信的 `defaults.environment`
2. install 接口是否对白名单环境做严格校验
3. 首次生产安装是否仍可能被错误推断为 `dev`
4. README / 规格文档 / 运维页文案是否与本文档一致

## 12. 后续实施顺序

建议按以下顺序推进，而不是再次分散修补：

1. 修正 setup 环境真相源
2. 修正 install 接口白名单校验
3. 修正前端 fallback 与提交流
4. 修正 README / ops 规格文档
5. 最后再做一次端到端 review
