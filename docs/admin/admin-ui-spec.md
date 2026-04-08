# Admin 后台 UI/UX 规范

> 本文档是 `frontend/apps/admin-web` 与 `frontend/packages/ui-admin` 的统一实现规范。目标不是描述排期或实施步骤，而是定义后台页面、组件、主题、布局和交互的硬性标准。

## 1. 目标与范围

### 1.1 重构目标

- 后台整体切换为 `Tailwind CSS v3 + shadcn/ui` 的实现底座。
- 统一后台页面风格、组件语义、布局骨架和交互反馈，不允许页面各自维护独立样式体系。
- 视觉气质参考 OpenAI 的克制、留白、排版优先，但不照搬营销页表现。
- 布局纪律参考企业后台范式，页面与弹层以 `grid` 为主，局部对齐与操作区使用 `flex`，数据主体保持原生 `table` 语义。
- 主题系统支持 `light / dark / system` 三态，默认跟随系统主题，允许用户手动切换并持久化。
- 所有组件优先考虑 CSS 性能、可见性一致性、跨平台兼容性与长期维护成本。

### 1.2 本次范围

- 应用壳层：后台整体骨架、侧边栏、顶区、内容区、登录页、弹层体系。
- 基础组件层：按钮、输入类控件、选择器、表格、弹层、通知、分页、空态、加载态等。
- 页面模板层：仪表盘、CRUD 列表页、配置页、日志页、详情页、工具页。
- 共享包层：`frontend/packages/ui-admin` 重构为后台共享组件与布局入口。

### 1.3 不在本次范围

- `mobile-h5` 与 `ui-mobile` 不在本次重构范围。
- 后端接口、菜单权限模型、业务流程逻辑不做结构性变更。
- 不保留旧 CSS class 的长期兼容层，迁移完成后应逐步删除旧 `styles.css` 依赖。

## 2. 当前后台页面与分层

### 2.1 当前页面范围

当前后台入口位于 `frontend/apps/admin-web/src/app.tsx`，已接入的核心页面包括：

- 登录与初始化：登录页、安装向导
- 首页与个人：仪表盘、个人中心
- 系统管理：用户、菜单、角色、部门、岗位、字典、配置、参数设置、API
- 日志与任务：登录日志、操作日志、定时任务、任务日志
- 工具与开发：Swagger、代码生成、构建工具、服务监控、运维服务
- 兜底展示：模块占位页

### 2.2 当前共享组件现状

`frontend/packages/ui-admin` 当前仅包含较薄的展示组件：

- `AdminShell`
- `BrandBlock`
- `IdentityCard`
- `TreeNav`
- `MetricGrid`
- `MetricCard`
- `SectionCard`

这些组件仍依赖集中式 CSS，尚未形成真正可复用的后台设计系统。

## 3. 设计原则

### 3.1 视觉原则

- 走浅色主界面，深色作为主题切换模式，不以深色为默认。
- 风格关键词：克制、精密、清晰、安静、留白、排版优先。
- 不使用大面积玻璃态、复杂模糊、多层渐变、持续背景动画。
- 背景与氛围优先由 SVG 承担，CSS 只负责基础布局与状态样式。
- 图标、边框、文字、分隔线必须在明暗主题下保持稳定可见性。

### 3.2 交互原则

- 企业后台优先信息效率和稳定性，不追求营销式动效。
- Hover 只做增强，不作为唯一信息入口。
- 删除、停用、重置密码等危险操作必须统一确认流程和视觉语义。
- 所有加载、成功、失败、空数据、禁用、只读状态必须有统一表现。

### 3.3 工程原则

- 直接接管 shadcn 的语义变量名，不再引入第二套并行主题变量名。
- 所有颜色、字号、间距、圆角、阴影、层级必须从 token 体系获取。
- 组件层不允许随意写具体灰阶、魔法 `z-index`、零散阴影值。
- 样式以原子类和共享变体为主，避免回到大块页面级 CSS。

## 4. 主题与 Token 体系

### 4.1 主题模式

- 支持 `light`、`dark`、`system` 三态。
- 默认值为 `system`。
- 手动选择写入 `localStorage`。
- 根节点同步：
  - `class="dark"` 或默认浅色 class
  - `data-theme`
  - `color-scheme`
- React 挂载前执行主题初始化脚本，避免首屏闪烁。

### 4.2 语义颜色变量

直接使用 shadcn 变量名承载主题值，至少包含：

- `--background`
- `--foreground`
- `--card`
- `--card-foreground`
- `--popover`
- `--popover-foreground`
- `--primary`
- `--primary-foreground`
- `--secondary`
- `--secondary-foreground`
- `--muted`
- `--muted-foreground`
- `--accent`
- `--accent-foreground`
- `--destructive`
- `--destructive-foreground`
- `--border`
- `--input`
- `--ring`

要求：

- 每个表面色必须配套前景色。
- 禁止组件只定义背景不定义前景。
- `border`、`input`、`ring` 必须分层，不混用。

### 4.3 非颜色 Token

必须同步定义以下尺度：

- Typography scale：页面标题、区块标题、正文、说明文字、表头、表单标签、按钮、辅助文本
- Spacing scale：页面边距、区块间距、表单间距、弹窗内边距、表格单元格内边距
- Radius scale：输入框、按钮、卡片、标签、弹层、头像容器
- Shadow scale：默认无阴影，最多保留少量轻层级阴影
- Z-index scale：header、sidebar、dropdown、popover、dialog、toast、overlay

## 5. 布局与响应式规范

### 5.1 一级布局

- 应用壳层使用 `grid`。
- 主布局以左侧导航 + 右侧内容区为基础。
- 主轨道统一使用 `minmax(0, 1fr)`，避免被内容撑爆。
- 应用根容器同时提供 `min-height: 100vh` 与 `min-height: 100dvh` 回退。

### 5.2 Grid 防御规则

所有需要伸缩和滚动的区域必须显式处理：

- 横向内容容器默认检查 `min-width: 0`
- 纵向滚动容器默认检查 `min-height: 0`
- 需要滚动的内容区必须有明确高度来源
- 数据表格外层单独负责横向滚动

### 5.3 页面模板

后台页面统一拆为以下区域：

- `PageHeader`：标题、描述、面包屑、主操作
- `FilterPanel`：搜索条件、筛选器、批量操作
- `ContentSection`：表格、详情卡片、图表、表单块
- `FooterActions`：分页、提交按钮、辅助说明

复杂页面优先由模板组合，不允许页面自行发明新骨架。

### 5.4 侧边栏行为

- 桌面端：固定左侧 sidebar，支持折叠。
- 中等宽度：默认折叠为窄栏或 icon rail，支持展开。
- 小屏：侧边栏切换为 overlay drawer。
- 当前激活路由、树节点展开状态、侧边栏折叠状态应持久化。
- 侧边栏、顶区、内容区使用统一层级，不允许各页面覆盖壳层行为。

### 5.5 响应式策略

- 桌面与大平板为主要使用场景。
- 中小屏保证可访问、可操作，但不追求与桌面等量信息密度。
- 搜索区、表单区、详情区可从多列降到单列。
- 表格保留 `table` 语义，不切换为卡片流；窄屏以横向滚动为主。
- Dialog 在窄屏下降宽、降边距，但仍维持 `header / content / footer` 结构。

## 6. 弹层、滚动与可见性规范

### 6.1 Dialog 结构

所有弹窗统一三段式：

- `header`
- `content`
- `footer`

要求：

- 容器使用 `grid-template-rows: auto minmax(0, 1fr) auto`
- `max-height` 不得超过视口
- 仅 `content` 区滚动
- 标题、关闭操作、主次按钮位置一致

### 6.2 可见性约束

明暗主题下必须逐项校验：

- 页面默认文字
- 卡片文字
- 次要说明文字
- 分隔线
- 输入边框
- 表格线
- hover 背景与 hover 文字
- selected 状态
- disabled 状态
- focus ring

禁止依赖裸色值类名到处拼接 `light/dark` 色阶解决问题，必须走语义 token。

## 7. SVG、图标与动效规范

### 7.1 SVG 规范

- 需要响应主题、状态、hover 的 SVG：使用 inline SVG 或 React SVG 组件。
- 纯装饰、固定颜色、无需联动的 SVG：允许静态文件引用。
- 不允许混合导致“一部分 SVG 能换主题、一部分不能换”的不一致情况。

### 7.2 图标规范

- 默认图标库使用 `lucide-react`。
- 图标颜色统一走 `currentColor`。
- 统一尺寸梯度，例如 14 / 16 / 18 / 20。
- 不允许页面自行维护多套图标库和不规则尺寸。

### 7.3 动效规范

- 动效只用于页面进入、弹窗过渡、hover 反馈、加载反馈。
- 优先使用 `opacity`、`transform`。
- 避免持续背景动画、复杂滤镜动画和大范围 CSS3 特效。
- 所有 transition/animation 默认使用 `motion-safe:`。
- 需要降级时提供 `motion-reduce:` 回退。

## 8. 组件体系

### 8.1 第一批基础组件

以下组件必须作为首批迁移基础设施同步到位：

- `Button`
- `Input`
- `Textarea`
- `Select`
- `Combobox / CommandPaletteSelect`
- `Checkbox`
- `RadioGroup`
- `Switch`
- `Dialog`
- `Drawer`
- `Table`
- `Badge`
- `Form`
- `Toast / Notification`
- `DropdownMenu`
- `Pagination`
- `Tabs`
- `Breadcrumb`
- `DatePicker / DateRangePicker`
- `Tooltip`
- `Popover`
- `Alert / ConfirmDialog`
- `EmptyState`
- `Loading / Skeleton`

### 8.2 后台业务壳组件

在基础组件之上，`ui-admin` 需要沉淀后台专属薄封装：

- `AdminAppShell`
- `AdminSidebar`
- `AdminTopbar`
- `PageHeader`
- `FilterPanel`
- `Toolbar`
- `DataTableSection`
- `RowActions`
- `StatusBadge`
- `FormDialog`
- `DetailDialog`
- `FormActions`
- `MetricCard`
- `EmptyBlock`

目标是让页面主要编排业务数据，而不是重复拼布局和交互外壳。

### 8.3 下拉与选项项规范

- 简单单选枚举优先使用 `Select`。
- 长列表、搜索型选择器使用 `Combobox` 或命令面板式选择器。
- `Combobox / CommandPaletteSelect` 属于第一批基础组件，不得延后到标准 CRUD 页面迁移之后。
- 不以原生 `<option>` 作为后台主要展示方案。
- 下拉项必须统一：
  - 默认背景与文字
  - hover 背景与文字
  - selected 背景与文字
  - disabled 文字
  - 分组标题
  - 分隔线
  - 弹层宽度跟随 trigger
  - 弹层最大高度不超视口

### 8.4 日期选择规范

- 日志页、任务页、审计页、统计筛选页的时间筛选统一使用 `DatePicker / DateRangePicker`。
- `DatePicker / DateRangePicker` 属于第一批基础组件，不得在日志类页面迁移时临时各写一套。
- 组件底座统一采用 `react-day-picker`，并通过 `Popover`、`Button`、`Input` 等后台基础组件封装成统一风格。
- 日期面板、范围高亮、禁用态、今天态、快捷范围、清空操作必须走统一 token，不允许组件内部写独立色值。
- 常见快捷范围至少支持：
  - 今天
  - 最近 7 天
  - 最近 30 天
  - 本月
- 范围筛选默认使用闭区间展示与提交格式，前后端时间格式约定需在页面接入前统一。
- 小屏下日期范围选择器允许降级为单列面板，但不改变交互语义。

## 9. 页面模板与迁移分组

### 9.1 页面类型分组

建议按模板复杂度拆分迁移：

- A 类：登录与初始化
  - 登录页
  - 安装向导
- B 类：首页与概览
  - 仪表盘
  - 个人中心
- C 类：标准 CRUD 列表页
  - 用户、部门、岗位、字典、配置、API、定时任务等
- D 类：结构复杂的编辑与授权页
  - 菜单、角色、配置设置
- E 类：日志与详情页
  - 登录日志、操作日志、任务日志
- F 类：工具与集成页
  - Swagger、构建工具、代码生成、服务监控、运维服务

### 9.2 迁移顺序

建议顺序：

1. 应用壳层、主题系统、图标系统、基础 token
2. 第一批基础组件与后台业务壳组件
3. 登录页、仪表盘、一个标准 CRUD 页、一个复杂弹窗页作为样板
4. 标准 CRUD 页面批量迁移
5. 菜单、角色、运维服务、安装向导等复杂页面迁移
6. 旧 CSS 清理与统一验收

### 9.3 页面验收要求

每个页面迁移后需满足：

- 不再依赖旧页面级 class 体系
- 主题切换后无文字、边框、分隔线不可见问题
- 窄屏与中屏下布局不崩
- 主要交互支持键盘访问
- 滚动区域明确，无溢出和双滚动混乱

## 10. 实施约束与验收标准

### 10.1 实施约束

- 不新增第二套并行 UI 变量名体系。
- 不允许页面临时写回大块 `styles.css` 作为长期方案。
- 不允许为了兼容短期需求保留大面积旧样式双轨运行。
- 不允许组件自行定义无规范来源的颜色、圆角、阴影、层级。

### 10.2 验收标准

- `admin-web` 页面统一收敛到同一套设计系统。
- `ui-admin` 成为后台共享组件与布局骨架入口。
- 明暗主题切换稳定，无明显可见性缺陷。
- 响应式与侧边栏行为符合统一规范。
- Dialog、Select、Table、Form 等核心组件在高频场景下表现一致。
- 样式性能可控，无大面积滤镜、模糊、复杂动画滥用。

## 11. 默认实现假设

- 实现底座为 `Tailwind CSS v3 + shadcn/ui + lucide-react`。
- 主题默认浅色，支持深色和系统跟随。
- 后台仍以桌面端为主，移动端仅保证可访问与可操作。
- 表格页面在小屏保持 `table` 语义和横向滚动，不切为卡片流。
- 需要变色的 SVG 一律组件化；纯装饰静态 SVG 才允许文件引用。
