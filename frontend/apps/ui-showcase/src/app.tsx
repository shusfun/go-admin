import { useState } from "react";

import {
  AsyncActionButton,
  Badge,
  Button,
  Checkbox,
  Combobox,
  ConfirmDialog,
  DataTableSection,
  DatePicker,
  DateRange,
  DateRangePicker,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DocsApiTable,
  DocsDemoCard,
  DocsSection,
  DocsShell,
  DocsSidebar,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  FilterPanel,
  FormActions,
  FormDialog,
  FormField,
  InlineNotice,
  Input,
  Loading,
  LogViewer,
  MetricCard,
  MetricGrid,
  PageHeader,
  Pagination,
  ProgressSteps,
  RadioGroup,
  RadioGroupItem,
  RowActions,
  SectionCard,
  Select,
  StatStrip,
  StatusBadge,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Textarea,
  ThemeToggle,
  Toolbar,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
  toast,
} from "@suiyuan/ui-admin";

const navItems = [
  { id: "overview", label: "快速预览" },
  { id: "actions", label: "基础操作" },
  { id: "forms", label: "表单录入" },
  { id: "feedback", label: "反馈与浮层" },
  { id: "data", label: "数据展示" },
  { id: "layout", label: "后台布局" },
];

const selectOptions = [
  { label: "华东机房", value: "shanghai" },
  { label: "华南机房", value: "shenzhen" },
  { label: "北美节点", value: "virginia" },
];

const roleOptions = [
  { label: "系统管理员", value: "admin" },
  { label: "租户管理员", value: "tenant-admin" },
  { label: "审计人员", value: "auditor" },
  { label: "发布工程师", value: "release" },
];

const stats = [
  { detail: "独立子项目，后续可以单独 build 和部署。", label: "项目定位", value: "独立站点" },
  { detail: "直接消费 @suiyuan/ui-admin 和 design tokens。", label: "组件来源", value: "共享包" },
  { detail: "修改 TSX/CSS 后直接走 Vite 热更新。", label: "开发体验", value: "HMR" },
  { detail: "第一版先覆盖常见组件和后台组合件。", label: "当前范围", value: "v1" },
];

const tableRows = [
  { id: "USR-1024", name: "张三", role: "系统管理员", status: "正常", updatedAt: "2026-04-08 21:36" },
  { id: "USR-1025", name: "李四", role: "审计人员", status: "停用", updatedAt: "2026-04-08 19:12" },
  { id: "USR-1026", name: "王五", role: "发布工程师", status: "运行中", updatedAt: "2026-04-08 17:48" },
];

export function App() {
  const [busy, setBusy] = useState(false);
  const [selectedCluster, setSelectedCluster] = useState("shanghai");
  const [selectedRole, setSelectedRole] = useState("tenant-admin");
  const [enabled, setEnabled] = useState(true);
  const [approved, setApproved] = useState(false);
  const [env, setEnv] = useState("staging");
  const [date, setDate] = useState<Date | undefined>(new Date("2026-04-08"));
  const [range, setRange] = useState<DateRange | undefined>({
    from: new Date("2026-04-01"),
    to: new Date("2026-04-08"),
  });
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  async function runAsyncDemo() {
    setBusy(true);
    await new Promise((resolve) => window.setTimeout(resolve, 1200));
    setBusy(false);
    toast.success("异步操作已完成");
  }

  return (
    <DocsShell
      sidebar={
        <DocsSidebar
          actions={
            <>
              <ThemeToggle />
              <Button onClick={() => toast.message("当前是展示站模式")} size="sm" type="button" variant="outline">
                测试消息
              </Button>
            </>
          }
          badge={<Badge>Suiyuan UI</Badge>}
          description="左侧导航，右侧预览与代码，开发时直接热更新，部署时单独构建。"
          footer={
            <>
              <p className="text-sm font-semibold text-foreground">全局工具</p>
              <p className="text-xs leading-6 text-muted-foreground">默认端口 26175，可通过 `pnpm dev:showcase` 启动。</p>
            </>
          }
          items={navItems.map((item) => ({ href: `#${item.id}`, label: item.label }))}
          title="组件展示站"
        />
      }
    >
          <PageHeader
            actions={
              <RowActions>
                <Button onClick={() => toast.success("可以继续补 API 表和搜索")} type="button">
                  添加能力
                </Button>
                <ThemeToggle />
              </RowActions>
            }
            breadcrumbs={[{ label: "Frontend" }, { label: "UI Showcase" }]}
            description="这不是后台页面，而是独立的组件文档站。当前版本先把常用组件和后台复合组件展示出来，后续可以继续加 API 文档、源码映射和搜索。"
            kicker="Component Documentation"
            title="像 Element Plus 那样维护自己的组件展示页"
          />

          <section className="grid gap-4" id="overview">
            <MetricGrid>
              {stats.map((item) => (
                <MetricCard detail={item.detail} key={item.label} label={item.label} value={item.value} />
              ))}
            </MetricGrid>
            <InlineNotice title="当前策略">
              先做文档站骨架和高频组件示例，保持轻量；复杂的 API 自动生成和源码抽取，放到下一轮。
            </InlineNotice>
          </section>

          <DocsSection description="先覆盖最常见的按钮、状态和操作入口。" id="actions" title="基础操作">
            <DocsDemoCard
              code={`<RowActions>
  <Button>主按钮</Button>
  <Button variant="secondary">次按钮</Button>
  <Button variant="outline">描边按钮</Button>
  <Button variant="ghost">幽灵按钮</Button>
  <Button variant="destructive">危险按钮</Button>
  <AsyncActionButton loading={busy}>异步动作</AsyncActionButton>
</RowActions>`}
              description="按钮矩阵和状态徽标是后台里最基础的一层。"
              title="按钮家族"
            >
              <RowActions>
                <Button type="button">主按钮</Button>
                <Button type="button" variant="secondary">
                  次按钮
                </Button>
                <Button type="button" variant="outline">
                  描边按钮
                </Button>
                <Button type="button" variant="ghost">
                  幽灵按钮
                </Button>
                <Button type="button" variant="destructive">
                  危险按钮
                </Button>
                <AsyncActionButton loading={busy} onClick={() => void runAsyncDemo()} type="button" variant="outline">
                  异步动作
                </AsyncActionButton>
              </RowActions>
            </DocsDemoCard>

            <DocsApiTable
              description="展示页自身优先复用共享组件，缺的文档组件也沉淀到共享包里。"
              items={[
                { defaultValue: "\"default\"", description: "按钮视觉风格。", name: "variant", type: "\"default\" | \"secondary\" | \"outline\" | \"ghost\" | \"destructive\" | \"link\"" },
                { defaultValue: "\"default\"", description: "按钮尺寸。", name: "size", type: "\"default\" | \"sm\" | \"lg\" | \"icon\"" },
                { defaultValue: "false", description: "是否以 Slot 子节点方式渲染。", name: "asChild", type: "boolean" },
                { defaultValue: "false", description: "异步按钮是否进入 loading 态。", name: "loading", type: "boolean" },
                { defaultValue: "\"处理中...\"", description: "异步按钮加载文案。", name: "loadingLabel", type: "ReactNode" },
              ]}
              title="Button / AsyncActionButton API"
            />

            <DocsDemoCard
              code={`<RowActions>
  <Badge>默认</Badge>
  <Badge tone="success">成功</Badge>
  <Badge tone="warning">运行中</Badge>
  <Badge tone="danger">失败</Badge>
  <StatusBadge status="正常" />
  <StatusBadge status="停用" />
</RowActions>`}
              description="用来统一状态语义和颜色映射。"
              title="状态语义"
            >
              <RowActions>
                <Badge>默认</Badge>
                <Badge tone="success">成功</Badge>
                <Badge tone="warning">运行中</Badge>
                <Badge tone="danger">失败</Badge>
                <StatusBadge status="正常" />
                <StatusBadge status="停用" />
                <StatusBadge status="运行中" />
              </RowActions>
            </DocsDemoCard>
          </DocsSection>

          <DocsSection description="录入类控件需要一起观察对齐、留白和交互状态。" id="forms" title="表单录入">
            <DocsDemoCard
              code={`<div className="grid gap-4">
  <FormField label="服务名称"><Input /></FormField>
  <FormField label="说明"><Textarea /></FormField>
  <FormField label="部署集群"><Select ... /></FormField>
</div>`}
              description="基础输入和下拉选择。"
              title="基础输入"
            >
              <div className="grid gap-4">
                <FormField label="服务名称">
                  <Input placeholder="请输入服务名称" value="ops-worker" />
                </FormField>
                <FormField label="变更说明">
                  <Textarea placeholder="补充说明..." value="这次发布只更新任务执行模块，不调整权限模型。" />
                </FormField>
                <FormField label="部署集群">
                  <Select onValueChange={setSelectedCluster} options={selectOptions} value={selectedCluster} />
                </FormField>
              </div>
            </DocsDemoCard>

            <DocsDemoCard
              code={`<Combobox options={roleOptions} value={role} onSelect={setRole} />
<DatePicker value={date} onChange={setDate} />
<DateRangePicker value={range} onChange={setRange} />`}
              description="搜索型选择器和日期控件。"
              title="搜索与日期"
            >
              <div className="grid gap-4">
                <FormField label="负责人角色">
                  <Combobox onSelect={setSelectedRole} options={roleOptions} value={selectedRole} />
                </FormField>
                <div className="grid gap-4 lg:grid-cols-2">
                  <FormField label="发布时间">
                    <DatePicker onChange={setDate} value={date} />
                  </FormField>
                  <FormField label="观察窗口">
                    <DateRangePicker onChange={setRange} value={range} />
                  </FormField>
                </div>
                <label className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-background px-4 py-3">
                  <span className="text-sm font-medium text-foreground">启用发布提醒</span>
                  <Switch checked={enabled} onCheckedChange={setEnabled} />
                </label>
                <label className="flex items-center gap-3 rounded-2xl border border-border bg-background px-4 py-3">
                  <Checkbox checked={approved} onCheckedChange={(value) => setApproved(value === true)} />
                  <span className="text-sm font-medium text-foreground">上线前必须审批</span>
                </label>
                <RadioGroup onValueChange={setEnv} value={env}>
                  <label className="flex items-center gap-3 rounded-2xl border border-border bg-background px-4 py-3">
                    <RadioGroupItem value="dev" />
                    <span className="text-sm text-foreground">开发环境</span>
                  </label>
                  <label className="flex items-center gap-3 rounded-2xl border border-border bg-background px-4 py-3">
                    <RadioGroupItem value="staging" />
                    <span className="text-sm text-foreground">预发环境</span>
                  </label>
                  <label className="flex items-center gap-3 rounded-2xl border border-border bg-background px-4 py-3">
                    <RadioGroupItem value="prod" />
                    <span className="text-sm text-foreground">生产环境</span>
                  </label>
                </RadioGroup>
              </div>
            </DocsDemoCard>

            <DocsApiTable
              items={[
                { defaultValue: "-", description: "下拉选项列表。", name: "options", required: true, type: "Array<{ label: string; value: string | number }>" },
                { defaultValue: "\"请选择\"", description: "Select 输入为空时展示的占位文案。", name: "placeholder", type: "string" },
                { defaultValue: "-", description: "值变更回调。", name: "onValueChange / onSelect", required: true, type: "(value: string) => void" },
                { defaultValue: "-", description: "当前选中值。", name: "value", type: "string" },
                { defaultValue: "-", description: "日期或日期范围值。", name: "value (DatePicker)", type: "Date | DateRange | undefined" },
              ]}
              title="Select / Combobox / DatePicker API"
            />
          </DocsSection>

          <DocsSection description="弹层、提示和轻交互浮层决定了后台体验是否顺手。" id="feedback" title="反馈与浮层">
            <DocsDemoCard
              code={`<InlineNotice tone="warning" title="发布窗口即将关闭">
  当前版本需要在 20 分钟内完成审批和灰度验证。
</InlineNotice>`}
              description="适合轻量提醒，不必每次都上弹窗。"
              title="提示条"
            >
              <div className="grid gap-3">
                <InlineNotice title="信息提示">展示页中的所有示例都直接来自共享 UI 包。</InlineNotice>
                <InlineNotice tone="warning" title="发布窗口即将关闭">
                  当前版本需要在 20 分钟内完成审批和灰度验证。
                </InlineNotice>
                <InlineNotice tone="danger" title="校验失败">
                  当前环境缺少审批人，请先补齐流程配置。
                </InlineNotice>
              </div>
            </DocsDemoCard>

            <DocsDemoCard
              code={`<>
  <ConfirmDialog open={open} setOpen={setOpen} ... />
  <FormDialog open={dialogOpen} onOpenChange={setDialogOpen} ... />
  <Dialog open={baseOpen} onOpenChange={setBaseOpen}>...</Dialog>
</>`}
              description="确认框、表单弹窗和基础 Dialog 同时放，方便统一使用方式。"
              title="弹层家族"
            >
              <RowActions>
                <Button onClick={() => setConfirmOpen(true)} type="button">
                  打开确认框
                </Button>
                <Button onClick={() => setFormDialogOpen(true)} type="button" variant="outline">
                  打开表单弹窗
                </Button>
                <Button onClick={() => setDialogOpen(true)} type="button" variant="secondary">
                  打开基础 Dialog
                </Button>
              </RowActions>
              <ConfirmDialog
                description="这个动作只用于演示反馈，不会真正发起请求。"
                onConfirm={() => {
                  toast.success("已确认发布");
                }}
                open={confirmOpen}
                setOpen={setConfirmOpen}
                title="确认发布到生产环境？"
              />
              <FormDialog
                description="这种封装更适合复杂表单。"
                onOpenChange={setFormDialogOpen}
                open={formDialogOpen}
                title="新建发布计划"
              >
                <div className="grid gap-4">
                  <FormField label="计划名称">
                    <Input placeholder="例如：夜间灰度发布" />
                  </FormField>
                  <FormField label="说明">
                    <Textarea placeholder="补充发布范围与回滚策略" />
                  </FormField>
                  <FormActions>
                    <Button onClick={() => setFormDialogOpen(false)} type="button" variant="outline">
                      取消
                    </Button>
                    <Button
                      onClick={() => {
                        setFormDialogOpen(false);
                        toast.success("发布计划已创建");
                      }}
                      type="button"
                    >
                      提交
                    </Button>
                  </FormActions>
                </div>
              </FormDialog>
              <Dialog onOpenChange={setDialogOpen} open={dialogOpen}>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>基础 Dialog</DialogTitle>
                    <DialogDescription>更灵活，适合完全自定义内容。</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-3 text-sm leading-7 text-muted-foreground">
                    <p>如果某个业务页不适合直接用 FormDialog，可以退回基础 Dialog 自己拼。</p>
                    <p>展示页同时放两种写法，后续更容易统一团队使用方式。</p>
                  </div>
                </DialogContent>
              </Dialog>
            </DocsDemoCard>

            <DocsDemoCard
              code={`<TooltipProvider>
  <Tooltip>
    <TooltipTrigger asChild><Button variant="outline">Hover</Button></TooltipTrigger>
    <TooltipContent>查看额外说明</TooltipContent>
  </Tooltip>
</TooltipProvider>`}
              description="工具提示、下拉菜单和 Toast 属于高频轻交互。"
              title="轻量浮层"
            >
              <div className="flex flex-wrap items-center gap-3">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button type="button" variant="outline">
                        Hover 查看提示
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>这里适合放精简说明。</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button type="button" variant="secondary">
                      打开菜单
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start">
                    <DropdownMenuItem onClick={() => toast.success("已复制配置模板")}>复制模板</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => toast.message("这里可以接更多快捷操作")}>更多操作</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <Button onClick={() => toast.success("Toast 反馈工作正常")} type="button">
                  触发 Toast
                </Button>
              </div>
            </DocsDemoCard>

            <DocsApiTable
              items={[
                { defaultValue: "-", description: "是否打开弹层。", name: "open", required: true, type: "boolean" },
                { defaultValue: "-", description: "弹层显隐变化回调。", name: "setOpen / onOpenChange", required: true, type: "(open: boolean) => void" },
                { defaultValue: "-", description: "确认操作回调。", name: "onConfirm", type: "() => void | Promise<void>" },
                { defaultValue: "\"确认\"", description: "确认按钮文案。", name: "actionLabel", type: "ReactNode" },
                { defaultValue: "\"取消\"", description: "取消按钮文案。", name: "cancelLabel", type: "ReactNode" },
              ]}
              title="ConfirmDialog / FormDialog API"
            />
          </DocsSection>

          <DocsSection description="这一组重点看数据密度和信息组织方式。" id="data" title="数据展示">
            <DocsDemoCard
              code={`<DataTableSection title="用户列表" description="当前共 3 条记录。">
  <Table>...</Table>
  <Pagination page={1} totalPages={8} onPrevious={noop} onNext={noop} />
</DataTableSection>`}
              description="表格和分页是后台最容易重复造轮子的地方。"
              title="表格与分页"
            >
              <DataTableSection description="当前共 3 条记录。" title="用户列表">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>编号</TableHead>
                      <TableHead>姓名</TableHead>
                      <TableHead>角色</TableHead>
                      <TableHead>状态</TableHead>
                      <TableHead>更新时间</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tableRows.map((row) => (
                      <TableRow key={row.id}>
                        <TableCell>{row.id}</TableCell>
                        <TableCell>{row.name}</TableCell>
                        <TableCell>{row.role}</TableCell>
                        <TableCell>
                          <StatusBadge status={row.status} />
                        </TableCell>
                        <TableCell>{row.updatedAt}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <div className="mt-4">
                  <Pagination onNext={() => toast.message("这里只做静态演示")} onPrevious={() => toast.message("这里只做静态演示")} page={1} totalPages={8} />
                </div>
              </DataTableSection>
            </DocsDemoCard>

            <DocsDemoCard
              code={`<Tabs defaultValue="overview">
  <TabsList>
    <TabsTrigger value="overview">概览</TabsTrigger>
    <TabsTrigger value="logs">日志</TabsTrigger>
  </TabsList>
  <TabsContent value="overview"><StatStrip items={[...]} /></TabsContent>
  <TabsContent value="logs"><LogViewer log="..." /></TabsContent>
</Tabs>`}
              description="标签页、统计条和日志组件一起看，更接近真实后台页面。"
              title="标签、统计与日志"
            >
              <Tabs defaultValue="overview">
                <TabsList>
                  <TabsTrigger value="overview">概览</TabsTrigger>
                  <TabsTrigger value="logs">日志</TabsTrigger>
                </TabsList>
                <TabsContent value="overview">
                  <StatStrip
                    items={[
                      { label: "执行批次", value: "32" },
                      { label: "平均时长", value: "1.8m" },
                      { label: "错误数", value: "0" },
                      { label: "回滚次数", value: "1" },
                    ]}
                  />
                </TabsContent>
                <TabsContent value="logs">
                  <LogViewer
                    description="适合接入流式日志、部署日志或审计日志。"
                    log={`[21:32:01] prepare release assets\n[21:32:04] upload package to staging\n[21:32:09] run smoke test\n[21:32:15] finish with success`}
                    title="实时日志"
                  />
                </TabsContent>
              </Tabs>
            </DocsDemoCard>

            <DocsApiTable
              items={[
                { defaultValue: "-", description: "分页当前页。", name: "page", required: true, type: "number" },
                { defaultValue: "-", description: "分页总页数。", name: "totalPages", required: true, type: "number" },
                { defaultValue: "-", description: "上一页回调。", name: "onPrevious", required: true, type: "() => void" },
                { defaultValue: "-", description: "下一页回调。", name: "onNext", required: true, type: "() => void" },
                { defaultValue: "\"实时日志\"", description: "日志查看器标题。", name: "title (LogViewer)", type: "ReactNode" },
              ]}
              title="Pagination / LogViewer API"
            />
          </DocsSection>

          <DocsSection description="后台里更有价值的是这些复合组件，它们决定页面骨架和组织方式。" id="layout" title="后台布局">
            <DocsDemoCard
              code={`<FilterPanel title="筛选与操作" description="组合搜索区和工具栏。">
  <div className="grid gap-4 lg:grid-cols-3">...</div>
  <Toolbar>
    <Button>查询</Button>
    <Button variant="outline">重置</Button>
  </Toolbar>
</FilterPanel>`}
              description="FilterPanel 和 Toolbar 是后台页面里最值得抽出来的组合件之一。"
              title="筛选区模板"
            >
              <FilterPanel description="统一搜索项间距、按钮位置和表格前置说明。" title="筛选与操作">
                <div className="grid gap-4 lg:grid-cols-3">
                  <FormField label="关键词">
                    <Input placeholder="按服务名、负责人或环境过滤" />
                  </FormField>
                  <FormField label="部署集群">
                    <Select onValueChange={setSelectedCluster} options={selectOptions} value={selectedCluster} />
                  </FormField>
                  <FormField label="时间范围">
                    <DateRangePicker onChange={setRange} value={range} />
                  </FormField>
                </div>
                <Toolbar>
                  <Button type="button">查询</Button>
                  <Button onClick={() => toast.message("这里可以接查询重置逻辑")} type="button" variant="outline">
                    重置
                  </Button>
                </Toolbar>
              </FilterPanel>
            </DocsDemoCard>

            <DocsDemoCard
              code={`<>
  <SectionCard title="迁移原则" description="用于承接说明性内容。">...</SectionCard>
  <ProgressSteps items={[...]} />
  <Loading label="用于展示过程型状态" />
</>`}
              description="说明卡片、流程条和状态块可以直接拼出后台页面骨架。"
              title="页面骨架拼装"
            >
              <div className="grid gap-5">
                <SectionCard description="用于承接说明性内容、规则说明或页面介绍。" title="迁移原则">
                  <div className="space-y-2 text-sm leading-7 text-muted-foreground">
                    <p>优先复用共享组件，不在业务页重复封装同一类按钮、弹层和状态块。</p>
                    <p>先把视觉语言和间距统一，再谈更复杂的自动化文档能力。</p>
                    <p>展示站后续可以继续补 API 表、源码映射和组件搜索。</p>
                  </div>
                </SectionCard>
                <ProgressSteps
                  items={[
                    { description: "构建与推送镜像已经完成。", label: "构建镜像", meta: "12:30", state: "success" },
                    { description: "正在将版本发布到预发环境。", label: "发布预发", meta: "12:36", state: "running" },
                    { description: "等待测试同学确认核心链路。", label: "人工验收", meta: "待执行", state: "pending" },
                    { description: "只有确认后才允许生产发布。", label: "生产发布", meta: "待执行", state: "pending" },
                  ]}
                />
                <Loading label="用于展示过程型状态" />
              </div>
            </DocsDemoCard>

            <DocsApiTable
              items={[
                { defaultValue: "\"筛选与操作\"", description: "筛选面板标题。", name: "title (FilterPanel)", type: "string" },
                { defaultValue: "-", description: "筛选面板说明。", name: "description", type: "string | ReactNode" },
                { defaultValue: "-", description: "页面头部操作区。", name: "actions (PageHeader)", type: "ReactNode" },
                { defaultValue: "-", description: "步骤列表。", name: "items (ProgressSteps)", required: true, type: "Array<{ label; state; description?; meta? }>" },
                { defaultValue: "-", description: "过程型加载文案。", name: "label (Loading)", type: "string" },
              ]}
              title="布局复合组件 API"
            />
          </DocsSection>
    </DocsShell>
  );
}
