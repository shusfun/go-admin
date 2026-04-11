import {
  AdminPageStack,
  AdminShell,
  AdminSidebar,
  AdminThreeColumn,
  Anchor,
  AdminTopbar,
  AdminTwoColumn,
  AppFrameShell,
  AppScrollbar,
  AuthLayout,
  AuthPanel,
  Backtop,
  Badge,
  BrandBlock,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  DateRangePicker,
  type DateRangePickerValue,
  DefinitionList,
  DetailItem,
  DetailPane,
  DocsApiTable,
  DocsDemoCard,
  DocsSection,
  DocsShell,
  DocsSidebar,
  FilterPanel,
  FormActions,
  FormField,
  GlobalSearch,
  IdentityCard,
  InlineNotice,
  Input,
  KeyValueCard,
  ListPane,
  Loading,
  MasterDetailLayout,
  MetricCard,
  MetricGrid,
  PageHeader,
  ProgressSteps,
  RowActions,
  SectionCard,
  Select,
  ThemeToggle,
  Toolbar,
  TreeNav,
  TreeSelectorPanel,
  TreeTableSection,
  Watermark,
  WizardLayout,
  toast,
} from "@go-admin/ui-admin";
import { useState } from "react";
import {
  ShowcaseDocPage,
  detailItems,
  mockMenuTree,
  selectOptions,
  treeNodes,
  type ShowcaseCategory,
  type ShowcaseRoute,
} from "./shared";

function FilterPanelPage() {
  const [selectedCluster, setSelectedCluster] = useState("shanghai");
  const [selectedStatus, setSelectedStatus] = useState("running");
  const [range, setRange] = useState<DateRangePickerValue>(["2026-04-01", "2026-04-08"]);

  return (
    <ShowcaseDocPage
      apiItems={[
        { defaultValue: '"筛选与操作"', description: "面板标题。", name: "title", type: "string" },
        { description: "面板说明。", name: "description", type: "string" },
        { description: "筛选内容与工具栏。", name: "children", required: true, type: "ReactNode" },
      ]}
      categoryLabel="后台布局"
      demos={[
        {
          code: `<FilterPanel title="筛选与操作" description="组合搜索区和工具栏。">
  <div className="grid gap-4 lg:grid-cols-3">...</div>
  <Toolbar>...</Toolbar>
</FilterPanel>`,
          content: (
            <FilterPanel description="统一搜索项间距、按钮位置和表格前置说明。" title="筛选与操作">
              <div className="grid gap-4 lg:grid-cols-3">
                <FormField label="关键词">
                  <Input placeholder="按服务名、负责人或环境过滤" />
                </FormField>
                <FormField label="部署集群">
                  <Select onValueChange={setSelectedCluster} options={selectOptions} value={selectedCluster} />
                </FormField>
                <FormField label="时间范围">
                  <DateRangePicker onChange={setRange} value={range} valueFormat="YYYY-MM-DD" />
                </FormField>
              </div>
              <Toolbar>
                <Button type="button">查询</Button>
                <Button onClick={() => toast.message("这里可以接查询重置逻辑")} type="button" variant="outline">
                  重置
                </Button>
              </Toolbar>
            </FilterPanel>
          ),
          description: "列表页最常见的筛选骨架：字段区 + 操作区。",
          title: "基础筛选区",
        },
        {
          code: `<FilterPanel title="快速筛选" description="顶部空间紧凑时的单行布局。">
  <Toolbar>
    <FormField className="min-w-[220px] flex-1" label="关键词">...</FormField>
    <FormField className="min-w-[200px] flex-1" label="集群">...</FormField>
    <FormActions className="self-end">...</FormActions>
  </Toolbar>
</FilterPanel>`,
          content: (
            <FilterPanel description="紧凑筛选条，适合顶部空间有限的列表页。" title="快速筛选">
              <Toolbar>
                <FormField className="min-w-[220px] flex-1" label="关键词">
                  <Input placeholder="服务名 / 负责人" />
                </FormField>
                <FormField className="min-w-[200px] flex-1" label="集群">
                  <Select onValueChange={setSelectedCluster} options={selectOptions} value={selectedCluster} />
                </FormField>
                <FormActions className="self-end">
                  <Button type="button">查询</Button>
                  <Button type="button" variant="outline">重置</Button>
                </FormActions>
              </Toolbar>
            </FilterPanel>
          ),
          description: "同一组件可承接更紧凑的行内筛选布局。",
          title: "紧凑变体",
        },
        {
          code: `<FilterPanel title="状态筛选" description="带状态与日期范围的组合筛选。">
  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">...</div>
  <RowActions>...</RowActions>
</FilterPanel>`,
          content: (
            <FilterPanel description="适合任务列表这类具备状态维度的场景。" title="状态 + 时间组合">
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <FormField label="任务状态">
                  <Select
                    onValueChange={setSelectedStatus}
                    options={[
                      { label: "运行中", value: "running" },
                      { label: "待执行", value: "pending" },
                      { label: "失败", value: "failed" },
                    ]}
                    value={selectedStatus}
                  />
                </FormField>
                <FormField label="部署集群">
                  <Select onValueChange={setSelectedCluster} options={selectOptions} value={selectedCluster} />
                </FormField>
                <FormField className="md:col-span-2" label="时间范围">
                  <DateRangePicker onChange={setRange} value={range} valueFormat="YYYY-MM-DD" />
                </FormField>
              </div>
              <RowActions>
                <Button type="button">应用筛选</Button>
                <Button type="button" variant="outline">
                  清空条件
                </Button>
                <Button type="button" variant="ghost">
                  保存为视图
                </Button>
              </RowActions>
            </FilterPanel>
          ),
          description: "常见于带状态流转的列表页，强调组合条件和快速动作。",
          title: "状态筛选布局",
        },
        {
          code: `<div className="space-y-4">
  <PageHeader ... />
  <FilterPanel ... />
  <SectionCard ... />
</div>`,
          content: (
            <div className="space-y-4">
              <PageHeader
                actions={
                  <Button type="button" variant="outline">
                    导出筛选结果
                  </Button>
                }
                breadcrumbs={[{ label: "后台" }, { label: "发布中心" }]}
                description="发布记录按环境、状态和时间维度统一过滤。"
                title="发布记录"
              />
              <FilterPanel description="筛选区放在头部下方，作为数据区前置步骤。" title="筛选条件">
                <div className="grid gap-4 lg:grid-cols-3">
                  <FormField label="关键词">
                    <Input placeholder="任务名 / 发布单号" />
                  </FormField>
                  <FormField label="状态">
                    <Select
                      onValueChange={setSelectedStatus}
                      options={[
                        { label: "运行中", value: "running" },
                        { label: "待执行", value: "pending" },
                        { label: "失败", value: "failed" },
                      ]}
                      value={selectedStatus}
                    />
                  </FormField>
                  <FormField label="集群">
                    <Select onValueChange={setSelectedCluster} options={selectOptions} value={selectedCluster} />
                  </FormField>
                </div>
                <Toolbar>
                  <Button type="button">查询</Button>
                  <Button type="button" variant="outline">
                    重置
                  </Button>
                </Toolbar>
              </FilterPanel>
              <SectionCard description="筛选结果概览建议紧跟筛选区。" title="结果统计">
                <DefinitionList columns={3}>
                  <DetailItem label="命中记录" value="36" />
                  <DetailItem label="运行中" value="8" />
                  <DetailItem label="待审批" value="5" />
                </DefinitionList>
              </SectionCard>
            </div>
          ),
          description: "更接近后台文档中的“头部 + 筛选 + 结果摘要”完整结构。",
          title: "完整页面组合",
        },
      ]}
      description="FilterPanel 统一搜索区结构、留白和操作按钮位置，是后台列表页的骨架组件。"
      notes={["列表页优先复用 FilterPanel，而不是每页自己拼搜索区。", "筛选字段不要过多，超过两行应考虑折叠策略。"]}
      title="FilterPanel"
    />
  );
}

function CardPage() {
  return (
    <ShowcaseDocPage
      apiItems={[
        { defaultValue: "false", description: "是否为激活态。", name: "active", type: "boolean" },
        { defaultValue: "false", description: "是否为提升态。", name: "elevated", type: "boolean" },
        { description: "头部、内容、底部插槽。", name: "CardHeader / CardContent / CardFooter", type: "ReactNode" },
      ]}
      categoryLabel="后台布局"
      demos={[
        {
          code: `<div className="grid gap-4 md:grid-cols-2">
  <Card>...</Card>
  <Card active={true}>...</Card>
</div>`,
          content: (
            <div className="grid gap-4 xl:grid-cols-3">
              <Card>
                <CardHeader>
                  <CardTitle>默认卡片</CardTitle>
                  <CardDescription>商务内敛克制的常态卡片设计</CardDescription>
                </CardHeader>
                <CardContent className="h-20 text-sm text-muted-foreground">边距紧凑，适合多面板平铺式后台。</CardContent>
                <CardFooter>
                  <Button size="sm" type="button" variant="outline">
                    管理资源
                  </Button>
                </CardFooter>
              </Card>

              <Card active={true}>
                <CardHeader>
                  <CardTitle className="text-primary">活跃卡片</CardTitle>
                  <CardDescription>用于业务突出展示，鼠标 Hover 也能看到 SVG 跑马效果</CardDescription>
                </CardHeader>
                <CardContent className="h-20 text-sm text-muted-foreground">加上 active 属性后，会嵌入一层低消耗 SVG 动效。</CardContent>
                <CardFooter>
                  <Button size="sm" type="button">
                    优先操作
                  </Button>
                </CardFooter>
              </Card>

              <Card elevated>
                <CardHeader>
                  <CardTitle>提升态卡片</CardTitle>
                  <CardDescription>用于首页概览、重点摘要和二级入口卡片。</CardDescription>
                </CardHeader>
                <CardContent className="h-20 text-sm text-muted-foreground">通过 elevated 提升阴影与信息层级。</CardContent>
                <CardFooter>
                  <Button outlined size="small" type="button" variant="info">
                    查看详情
                  </Button>
                </CardFooter>
              </Card>
            </div>
          ),
          description: "默认、激活、提升态三种容器语义。",
          title: "状态矩阵",
        },
        {
          code: `<div className="grid gap-4 md:grid-cols-2">
  <Card>...</Card>
  <Card active elevated>...</Card>
</div>`,
          content: (
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>信息卡</CardTitle>
                  <CardDescription>适合承接说明与静态信息。</CardDescription>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">中等密度场景优先用默认卡片。</CardContent>
              </Card>
              <Card active elevated>
                <CardHeader>
                  <CardTitle>选中项卡片</CardTitle>
                  <CardDescription>用于列表中的当前项高亮。</CardDescription>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">active + elevated 可叠加使用。</CardContent>
              </Card>
            </div>
          ),
          description: "适配列表“当前项”与详情面板的组合布局。",
          title: "组合用法",
        },
        {
          code: `<div className="grid gap-4 xl:grid-cols-3">
  <Card elevated>资源概览</Card>
  <Card>发布进度</Card>
  <Card active>告警信息</Card>
</div>`,
          content: (
            <div className="grid gap-4 xl:grid-cols-3">
              <Card elevated>
                <CardHeader>
                  <CardTitle>资源概览</CardTitle>
                  <CardDescription>适合作为仪表盘第一屏摘要。</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-3 text-sm text-muted-foreground">
                  <div className="flex items-center justify-between">
                    <span>在线实例</span>
                    <strong className="text-foreground">128</strong>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>平均耗时</span>
                    <strong className="text-foreground">183ms</strong>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>发布进度</CardTitle>
                  <CardDescription>卡片可承接流程摘要。</CardDescription>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">当前批次 3/5，预估完成时间 22:45。</CardContent>
                <CardFooter>
                  <Button size="sm" type="button" variant="outline">
                    查看流水线
                  </Button>
                </CardFooter>
              </Card>
              <Card active>
                <CardHeader>
                  <CardTitle>告警信息</CardTitle>
                  <CardDescription>当前需要关注的异常项。</CardDescription>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  检测到 2 条风险告警，建议优先处理数据库连接池波动。
                </CardContent>
                <CardFooter>
                  <Button size="sm" type="button">
                    立即处理
                  </Button>
                </CardFooter>
              </Card>
            </div>
          ),
          description: "接近仪表盘场景的完整卡片分区布局。",
          title: "完整看板布局",
        },
      ]}
      description="Card 作为后台基础容器，统一普通态、提升态和激活态的容器语义。"
      notes={["Card 适合承接模块化信息，不要把整页都塞进一个大卡片。", "只有确实存在选中语义时才使用 active。"]}
      title="Card"
    />
  );
}

function SectionCardPage() {
  const [selectedAudience, setSelectedAudience] = useState("tenant-admin");

  return (
    <ShowcaseDocPage
      apiItems={[
        { description: "分区标题。", name: "title", required: true, type: "string" },
        { description: "分区说明。", name: "description", type: "string" },
        { description: "分区内容。", name: "children", required: true, type: "ReactNode" },
      ]}
      categoryLabel="后台布局"
      demos={[
        {
          code: `<SectionCard title="操作说明" description="用于承接说明性内容。">
  ...
</SectionCard>`,
          content: (
            <SectionCard description="用于承接说明性内容、规则说明或页面介绍。" title="操作说明">
              <div className="space-y-2 text-sm leading-7 text-muted-foreground">
                <p>优先复用共享组件，不在业务页重复封装同一类按钮、弹层和状态块。</p>
                <p>保持视觉语言和间距统一。</p>
              </div>
            </SectionCard>
          ),
          description: "承接规则文本、注意事项和轻提示内容。",
          title: "说明区块",
        },
        {
          code: `<SectionCard title="说明 + 操作组合" description="可直接承接操作区与表单字段。">
  <div className="grid gap-4 md:grid-cols-2">...</div>
  <FormActions>...</FormActions>
</SectionCard>`,
          content: (
            <SectionCard description="可直接承接操作区与表单字段。" title="说明 + 操作组合">
              <div className="grid gap-4 md:grid-cols-2">
                <FormField label="发布窗口">
                  <Input placeholder="例如：23:00-23:30" />
                </FormField>
                <FormField label="通知频道">
                  <Select onValueChange={() => undefined} options={selectOptions} placeholder="选择机房频道" />
                </FormField>
              </div>
              <FormActions>
                <Button type="button" variant="outline">
                  取消
                </Button>
                <Button type="button">保存</Button>
              </FormActions>
            </SectionCard>
          ),
          description: "不仅能写说明，也能承接轻量配置动作。",
          title: "组合布局",
        },
        {
          code: `<div className="grid gap-4 xl:grid-cols-2">
  <SectionCard title="发布规则">...</SectionCard>
  <SectionCard title="通知策略">...</SectionCard>
</div>`,
          content: (
            <div className="grid gap-4 xl:grid-cols-2">
              <SectionCard description="建议与发布流程同屏展示，减少上下跳转。" title="发布规则">
                <div className="space-y-2 text-sm text-muted-foreground">
                  <p>1. 工作日 20:00 后允许高风险发布。</p>
                  <p>2. 生产发布前必须完成预发回归。</p>
                  <p>3. 回滚策略需提前录入并通过审批。</p>
                </div>
              </SectionCard>
              <SectionCard description="通知策略与规则并列展示，便于一次性确认。" title="通知策略">
                <div className="grid gap-4">
                  <FormField label="通知对象">
                    <Select
                      onValueChange={setSelectedAudience}
                      options={[
                        { label: "租户管理员", value: "tenant-admin" },
                        { label: "发布工程师", value: "release" },
                        { label: "系统管理员", value: "admin" },
                      ]}
                      value={selectedAudience}
                    />
                  </FormField>
                  <FormField label="Webhook 地址">
                    <Input placeholder="https://hooks.example.com/release" />
                  </FormField>
                </div>
              </SectionCard>
            </div>
          ),
          description: "同层级并列分区是 SectionCard 的高频落地方式。",
          title: "并列分区布局",
        },
        {
          code: `<div className="space-y-4">
  <PageHeader ... />
  <SectionCard ... />
  <SectionCard ... />
</div>`,
          content: (
            <div className="space-y-4">
              <PageHeader
                breadcrumbs={[{ label: "后台" }, { label: "发布中心" }, { label: "发布策略" }]}
                description="策略页面由多个 SectionCard 组织说明与配置。"
                title="发布策略配置"
              />
              <SectionCard description="先说明边界，再让用户填写配置。" title="策略说明">
                <p className="text-sm leading-7 text-muted-foreground">
                  SectionCard 适合把“规则文本、输入项、动作按钮”组织为可维护的分段文档结构。
                </p>
              </SectionCard>
              <SectionCard description="将配置动作收束在分区内，避免页面动作散落。" title="执行动作">
                <FormActions>
                  <Button type="button" variant="outline">
                    预览策略
                  </Button>
                  <Button type="button">保存并生效</Button>
                </FormActions>
              </SectionCard>
            </div>
          ),
          description: "接近 Element Plus 文档中“说明 + 配置 + 动作”的完整章节结构。",
          title: "完整文档结构",
        },
      ]}
      description="SectionCard 适合说明块、规则块和页面内的中等密度内容组织。"
      notes={["说明性内容优先落到 SectionCard，不要直接裸放段落。", "卡片内仍然保持内容克制，避免变成第二个长页面。"]}
      title="SectionCard"
    />
  );
}

function ProgressStepsPage() {
  return (
    <ShowcaseDocPage
      apiItems={[
        {
          description: "步骤数组。",
          name: "items",
          required: true,
          type: 'Array<{ label: ReactNode; description?: ReactNode; meta?: ReactNode; state: "success" | "running" | "pending" | "failed" }>',
        },
      ]}
      categoryLabel="后台布局"
      demos={[
        {
          code: `<ProgressSteps items={[...]} />`,
          content: (
            <ProgressSteps
              items={[
                { description: "构建与推送镜像已经完成。", label: "构建镜像", meta: "12:30", state: "success" },
                { description: "正在将版本发布到预发环境。", label: "发布预发", meta: "12:36", state: "running" },
                { description: "等待测试同学确认核心链路。", label: "人工验收", meta: "待执行", state: "pending" },
                { description: "只有确认后才允许生产发布。", label: "生产发布", meta: "待执行", state: "pending" },
              ]}
            />
          ),
          description: "典型发布流程的运行态展示。",
          title: "基础流程",
        },
        {
          content: (
            <ProgressSteps
              items={[
                { description: "权限同步完成。", label: "预检查", meta: "10:05", state: "success" },
                { description: "环境连通校验失败。", label: "连接验证", meta: "10:06", state: "failed" },
                { description: "需人工确认后重试。", label: "人工介入", meta: "等待", state: "pending" },
              ]}
            />
          ),
          description: "错误态流程也应保持同一视觉结构。",
          title: "异常流程",
        },
      ]}
      description="ProgressSteps 适合展示流程状态、部署流水线和审核步骤。"
      notes={["步骤条更适合有明确顺序的过程型界面。", "步骤文案要短，详细日志不要塞在 meta 里。"]}
      title="ProgressSteps"
    />
  );
}

function LoadingPage() {
  return (
    <ShowcaseDocPage
      apiItems={[
        { defaultValue: '"default"', description: "尺寸。", name: "size", type: '"large" | "default" | "small"' },
        { defaultValue: "false", description: "是否展示块级加载容器。", name: "block", type: "boolean" },
      ]}
      categoryLabel="后台布局"
      demos={[
        {
          code: `<Loading block label="正在同步后台上下文" size="large" />`,
          content: (
            <div className="grid gap-4">
              <Loading label="用于展示过程型状态" />
              <Loading block label="正在同步后台上下文" size="large" />
              <Loading label="刷新列表中" size="small" />
            </div>
          ),
          description: "行内与块级两种加载形态，覆盖大多数操作反馈。",
          title: "基础形态",
        },
        {
          code: `<div className="grid gap-3 md:grid-cols-2">
  <Card>...<Loading size="small" /></Card>
  <Card>...<Loading block /></Card>
</div>`,
          content: (
            <div className="grid gap-3 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>卡片局部加载</CardTitle>
                </CardHeader>
                <CardContent>
                  <Loading label="读取指标中" size="small" />
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>区域加载</CardTitle>
                </CardHeader>
                <CardContent>
                  <Loading block label="正在刷新发布记录" />
                </CardContent>
              </Card>
            </div>
          ),
          description: "在不同容器中保持一致的加载反馈。",
          title: "组合布局",
        },
        {
          code: `<SectionCard title="列表请求状态">
  <Loading block label="正在拉取筛选结果..." />
</SectionCard>`,
          content: (
            <SectionCard description="列表重新请求期间的块级反馈。" title="数据区加载">
              <Loading block label="正在拉取筛选结果..." />
            </SectionCard>
          ),
          description: "用于替代表格区域的空白闪烁，保持页面结构稳定。",
          title: "数据区加载",
        },
        {
          code: `<div className="space-y-4">
  <PageHeader ... />
  <FilterPanel ... />
  <Loading block label="正在初始化页面..." size="large" />
</div>`,
          content: (
            <div className="space-y-4">
              <PageHeader
                description="页面首次加载时展示结构化上下文，而不是白屏。"
                kicker="Deployment"
                title="发布工作台"
              />
              <FilterPanel description="请求完成后会加载筛选结果。" title="筛选条件">
                <Toolbar>
                  <Button disabled type="button">
                    查询
                  </Button>
                  <Button disabled type="button" variant="outline">
                    重置
                  </Button>
                </Toolbar>
              </FilterPanel>
              <Loading block label="正在初始化页面..." size="large" />
            </div>
          ),
          description: "页面级加载示例，强调“保留结构 + 局部加载”而不是整页遮罩。",
          title: "页面级加载流程",
        },
      ]}
      description="Loading 用于展示过程状态和系统初始化反馈，保证空白页不会显得像卡死，并统一支持行内态和块级态。"
      notes={["页面级 loading 文案要说明正在做什么。", "短时操作不要滥用全局 loading，优先局部反馈。"]}
      title="Loading"
    />
  );
}

function PageHeaderPage() {
  const [activeTab, setActiveTab] = useState("overview");

  return (
    <ShowcaseDocPage
      apiItems={[
        { description: "页面标题。", name: "title", required: true, type: "ReactNode" },
        { description: "页面说明。", name: "description", type: "ReactNode" },
        { description: "顶部眉标。", name: "kicker", type: "ReactNode" },
        { description: "面包屑。", name: "breadcrumbs", type: 'Array<{ href?: string; label: string }>' },
        { description: "右侧操作区。", name: "actions", type: "ReactNode" },
      ]}
      categoryLabel="后台布局"
      demos={[
        {
          code: `<PageHeader
  kicker="Release Center"
  title="发布工作台"
  description="负责版本发布、回滚和流程控制。"
  actions={<RowActions>...</RowActions>}
</PageHeader>`,
          content: (
            <PageHeader
              actions={
                <RowActions>
                  <Button type="button">新建发布</Button>
                  <Button type="button" variant="outline">
                    导出报告
                  </Button>
                </RowActions>
              }
              breadcrumbs={[{ label: "后台" }, { label: "发布中心" }]}
              description="负责版本发布、回滚和流程控制。"
              kicker="Release Center"
              title="发布工作台"
            />
          ),
          description: "标准页面头：标题、描述、面包屑、全局操作。",
          title: "基础头部",
        },
        {
          code: `<PageHeader
  title="作业 #J-20260409"
  breadcrumbs={[...]}
  actions={<Button variant="outline">返回列表</Button>}
/>`,
          content: (
            <PageHeader
              actions={
                <Button type="button" variant="outline">
                  返回列表
                </Button>
              }
              breadcrumbs={[{ href: "/", label: "后台" }, { label: "作业中心" }, { label: "作业详情" }]}
              description="用于展示只读详情信息和当前阶段。"
              title="作业 #J-20260409"
            />
          ),
          description: "详情页可使用更克制的操作区。",
          title: "详情页变体",
        },
        {
          code: `<div className="space-y-4">
  <PageHeader ... />
  <SectionCard title="指标概览">...</SectionCard>
</div>`,
          content: (
            <div className="space-y-4">
              <PageHeader
                actions={
                  <RowActions>
                    <Button type="button" variant="outline">
                      切换环境
                    </Button>
                    <Button type="button">新建任务</Button>
                  </RowActions>
                }
                breadcrumbs={[{ label: "后台" }, { label: "任务中心" }]}
                description="任务中心首页示例，Header 下直接承接页面一级摘要。"
                kicker="Task Center"
                title="任务总览"
              />
              <SectionCard description="顶部摘要区通常承接关键指标或待办信息。" title="指标概览">
                <DefinitionList columns={3}>
                  <DetailItem label="运行中任务" value="12" />
                  <DetailItem label="待审批" value="4" />
                  <DetailItem label="失败重试" value="1" />
                </DefinitionList>
              </SectionCard>
            </div>
          ),
          description: "展示 Header 在首页场景中的完整承接关系。",
          title: "首页布局组合",
        },
        {
          code: `<div className="space-y-4">
  <PageHeader ... />
  <RowActions>...</RowActions>
</div>`,
          content: (
            <div className="space-y-4">
              <PageHeader
                actions={
                  <RowActions>
                    <Button
                      onClick={() => {
                        setActiveTab("overview");
                        toast.message("已切换到概览视图");
                      }}
                      type="button"
                      variant={activeTab === "overview" ? "default" : "outline"}
                    >
                      概览
                    </Button>
                    <Button
                      onClick={() => {
                        setActiveTab("logs");
                        toast.message("已切换到日志视图");
                      }}
                      type="button"
                      variant={activeTab === "logs" ? "default" : "outline"}
                    >
                      日志
                    </Button>
                  </RowActions>
                }
                breadcrumbs={[{ label: "后台" }, { label: "作业中心" }, { label: "作业详情" }]}
                description="Header 右侧也可承接视图级切换，但不承接字段筛选。"
                title="作业 #J-20260409"
              />
              <SectionCard description="示例中模拟不同视图内容区。" title="当前视图">
                <p className="text-sm text-muted-foreground">
                  {activeTab === "overview" ? "当前展示概览信息，包括执行状态与关键指标。" : "当前展示日志信息，包含部署过程与错误输出。"}
                </p>
              </SectionCard>
            </div>
          ),
          description: "强化页面级动作与局部内容区的边界。",
          title: "动作与视图切换",
        },
      ]}
      description="PageHeader 负责统一页面标题、说明、面包屑和页面级操作区。"
      notes={["页面头部的信息层级要稳定，避免每页随意调整。", "页面级操作只放全局按钮，不要把局部筛选塞进 Header。"]}
      title="PageHeader"
    />
  );
}

function TreeSelectorPanelPage() {
  const [checkedIds, setCheckedIds] = useState<number[]>([11, 22]);

  return (
    <ShowcaseDocPage
      apiItems={[
        { description: "树节点数据。", name: "nodes", required: true, type: 'Array<{ id: number; label: string; children?: TreeLikeNode[] }>' },
        { description: "当前选中 ID。", name: "checkedIds", required: true, type: "number[]" },
        { description: "选中变化回调。", name: "onChange", required: true, type: "(next: number[]) => void" },
        { description: "标题和说明。", name: "title / description", type: "ReactNode" },
      ]}
      categoryLabel="后台布局"
      demos={[
        {
          code: `<TreeSelectorPanel
  checkedIds={checkedIds}
  nodes={treeNodes}
  onChange={setCheckedIds}
  title="菜单权限树"
/>`,
          content: (
            <AdminThreeColumn>
              <TreeSelectorPanel checkedIds={checkedIds} description="统一权限树勾选体验。" nodes={treeNodes} onChange={setCheckedIds} title="菜单权限树" />
              <TreeTableSection description="右侧说明可搭配授权结果表格。" title="当前选中节点">
                <DefinitionList columns={1}>
                  {checkedIds.map((id) => (
                    <DetailItem key={id} label={`节点 ${id}`} value="已选中" />
                  ))}
                </DefinitionList>
              </TreeTableSection>
            </AdminThreeColumn>
          ),
          description: "基础双栏授权布局：左侧树选择，右侧结果说明。",
          title: "基础骨架",
        },
        {
          content: (
            <AdminPageStack>
              <TreeSelectorPanel checkedIds={checkedIds} description="更紧凑的角色权限编辑场景。" nodes={treeNodes} onChange={setCheckedIds} title="角色权限树" />
              <TreeTableSection description="分栏外可继续承接摘要表格或审计信息。" title="权限摘要">
                <DefinitionList columns={2}>
                  <DetailItem label="已选节点数" value={String(checkedIds.length)} />
                  <DetailItem label="操作模式" value="批量授权" />
                </DefinitionList>
              </TreeTableSection>
            </AdminPageStack>
          ),
          description: "同一组件可用于上下堆叠的内容流，不强依赖左右分栏。",
          title: "堆叠变体",
        },
      ]}
      description="TreeSelectorPanel 与 TreeTableSection 适合角色权限、菜单授权、资源树等结构化选择场景。"
      notes={["树选择是家族组件，列表展示和勾选交互要一起验证。", "选中态和半选态必须稳定，不允许节点间状态错乱。"]}
      title="TreeSelectorPanel"
    />
  );
}

function MasterDetailLayoutPage() {
  return (
    <ShowcaseDocPage
      apiItems={[
        { description: "主从布局容器。", name: "MasterDetailLayout", type: "ReactNode wrapper" },
        { description: "左侧列表区。", name: "ListPane", type: "ReactNode wrapper" },
        { description: "右侧详情区。", name: "DetailPane", type: "ReactNode wrapper" },
      ]}
      categoryLabel="后台布局"
      demos={[
        {
          code: `<MasterDetailLayout>
  <ListPane>...</ListPane>
  <DetailPane>...</DetailPane>
</MasterDetailLayout>`,
          content: (
            <MasterDetailLayout>
              <ListPane>
                <Card>
                  <CardHeader>
                    <CardTitle>服务列表</CardTitle>
                  </CardHeader>
                  <CardContent className="grid gap-2">
                    <Button type="button" variant="secondary">
                      ops-worker
                    </Button>
                    <Button type="button" variant="ghost">
                      auth-service
                    </Button>
                    <Button type="button" variant="ghost">
                      report-engine
                    </Button>
                  </CardContent>
                </Card>
              </ListPane>
              <DetailPane>
                <KeyValueCard description="当前选中服务的详情。" items={detailItems} title="服务详情" />
              </DetailPane>
            </MasterDetailLayout>
          ),
          description: "标准主从布局：左侧列表切换，右侧展示完整详情。",
          title: "基础主从",
        },
        {
          content: (
            <AdminPageStack>
              <MasterDetailLayout>
                <ListPane>
                  <Card>
                    <CardHeader>
                      <CardTitle>环境分组</CardTitle>
                    </CardHeader>
                    <CardContent className="grid gap-2">
                      <Button type="button" variant="secondary">
                        生产环境
                      </Button>
                      <Button type="button" variant="ghost">
                        灰度环境
                      </Button>
                    </CardContent>
                  </Card>
                </ListPane>
                <DetailPane>
                  <SectionCard description="面向移动端时，详情区可作为独立块堆叠展示。" title="环境配置摘要">
                    <p className="text-sm text-muted-foreground">支持按环境切换参数，保留相同的主从语义结构。</p>
                  </SectionCard>
                </DetailPane>
              </MasterDetailLayout>
            </AdminPageStack>
          ),
          description: "在更紧凑页面中仍复用主从组件，避免改写布局语义。",
          title: "紧凑变体",
        },
      ]}
      description="MasterDetailLayout、ListPane、DetailPane 用于主从布局，例如左侧列表右侧详情。"
      notes={["主从布局适合对象切换频繁的后台场景。", "左侧列表宽度要稳定，右侧详情优先承接完整上下文。"]}
      title="MasterDetailLayout"
    />
  );
}

function AuthLayoutPage() {
  return (
    <ShowcaseDocPage
      apiItems={[
        { description: "页面标题。", name: "title", required: true, type: "ReactNode" },
        { description: "页面说明。", name: "description", type: "ReactNode" },
        { description: "左侧说明区。", name: "aside", type: "ReactNode" },
        { description: "表单主体。", name: "children", required: true, type: "ReactNode" },
        { description: "表单承接容器。", name: "AuthPanel", type: "ReactNode wrapper" },
      ]}
      categoryLabel="后台布局"
      demos={[
        {
          code: `<AuthLayout title="统一后台登录" description="..." aside={<Card>...</Card>}>
  <AuthPanel title="登录">...</AuthPanel>
</AuthLayout>`,
          content: (
            <div className="overflow-hidden rounded-2xl border border-border">
              <AuthLayout
                aside={
                  <KeyValueCard
                    description="适合放置帮助信息或环境摘要。"
                    items={[
                      { label: "接入方式", value: "统一认证" },
                      { label: "支持租户", value: "多租户" },
                    ]}
                    title="说明"
                  />
                }
                description="同一套布局可用于登录、找回密码和初始引导。"
                title="统一后台登录"
              >
                <AuthPanel description="请输入管理员账号和密码。" title="登录">
                  <div className="grid gap-4">
                    <FormField label="用户名">
                      <Input placeholder="请输入用户名" />
                    </FormField>
                    <FormField label="密码">
                      <Input placeholder="请输入密码" type="password" />
                    </FormField>
                    <FormActions>
                      <Button type="button">登录</Button>
                    </FormActions>
                  </div>
                </AuthPanel>
              </AuthLayout>
            </div>
          ),
          description: "标准登录页骨架：左侧说明 + 右侧表单容器。",
          title: "基础登录布局",
        },
        {
          content: (
            <div className="overflow-hidden rounded-2xl border border-border">
              <AuthLayout
                description="移动端下自动退化为单栏，减少视觉负担。"
                title="重置管理员密码"
              >
                <AuthPanel description="系统会发送验证码到管理员邮箱。" title="验证身份">
                  <div className="grid gap-4">
                    <FormField label="邮箱">
                      <Input placeholder="admin@example.com" />
                    </FormField>
                    <FormField label="验证码">
                      <Input placeholder="请输入 6 位验证码" />
                    </FormField>
                    <FormActions>
                      <Button type="button">下一步</Button>
                      <Button type="button" variant="outline">返回登录</Button>
                    </FormActions>
                  </div>
                </AuthPanel>
              </AuthLayout>
            </div>
          ),
          description: "无侧栏场景依旧复用同一结构，适合密码找回等流程。",
          title: "移动优先变体",
        },
      ]}
      description="AuthLayout 与 AuthPanel 组成鉴权类页面骨架，适合登录、注册、找回密码等场景。"
      notes={["大屏下左右双栏，小屏下自然折叠为单栏。", "表单部分始终通过 AuthPanel 承接，避免每页单独造壳。"]}
      title="AuthLayout"
    />
  );
}

function WizardLayoutPage() {
  return (
    <ShowcaseDocPage
      apiItems={[
        { description: "当前步骤索引。", name: "currentStep", required: true, type: "number" },
        { description: "步骤数组。", name: "steps", required: true, type: 'Array<{ label: ReactNode; description?: ReactNode }>' },
        { description: "标题与说明。", name: "title / description", required: true, type: "ReactNode" },
        { description: "步骤内容。", name: "children", required: true, type: "ReactNode" },
      ]}
      categoryLabel="后台布局"
      demos={[
        {
          code: `<WizardLayout currentStep={1} steps={[...]} title="安装向导">...</WizardLayout>`,
          content: (
            <div className="overflow-hidden rounded-2xl border border-border">
              <WizardLayout
                currentStep={1}
                description="分步配置数据库、管理员账号和站点信息。"
                steps={[
                  { label: "数据库配置", description: "连接存储资源" },
                  { label: "管理员账号", description: "创建首个管理员" },
                  { label: "初始化完成", description: "进入系统工作台" },
                ]}
                title="安装向导"
              >
                <div className="grid gap-4">
                  <FormField label="管理员账号">
                    <Input placeholder="请输入账号" />
                  </FormField>
                  <FormField label="管理员密码">
                    <Input placeholder="请输入密码" type="password" />
                  </FormField>
                </div>
              </WizardLayout>
            </div>
          ),
          description: "标准三步流程布局，顶部步骤条 + 当前步骤表单。",
          title: "基础向导",
        },
        {
          content: (
            <div className="overflow-hidden rounded-2xl border border-border">
              <WizardLayout
                currentStep={2}
                description="末步可展示摘要和下一步入口。"
                steps={[
                  { label: "连接资源", description: "绑定数据库与缓存" },
                  { label: "权限配置", description: "分配初始角色" },
                  { label: "确认完成", description: "校验并发布" },
                ]}
                title="接入流程"
              >
                <SectionCard description="所有资源配置已完成，可直接进入控制台。" title="确认信息">
                  <DefinitionList columns={2}>
                    <DetailItem label="数据库" value="已连通" />
                    <DetailItem label="缓存" value="已连通" />
                    <DetailItem label="初始角色" value="系统管理员" />
                    <DetailItem label="状态" value="可上线" />
                  </DefinitionList>
                </SectionCard>
              </WizardLayout>
            </div>
          ),
          description: "步骤页不仅承接表单，也可承接摘要和确认型内容。",
          title: "确认页变体",
        },
      ]}
      description="WizardSteps 与 WizardLayout 用于分步流程页面，适合安装向导、接入流程和复杂配置。"
      notes={["步骤条需要稳定反馈当前阶段。", "步骤页内容应聚焦当前一步，避免整套表单堆到一个页面。"]}
      title="WizardLayout"
    />
  );
}

function DocsBlocksPage() {
  return (
    <ShowcaseDocPage
      apiItems={[
        { description: "文档分区容器。", name: "DocsSection", type: "section wrapper" },
        { description: "文档示例卡。", name: "DocsDemoCard", type: "demo card wrapper" },
        { description: "文档 API 表。", name: "DocsApiTable", type: "api table wrapper" },
        { description: "文档导航侧栏。", name: "DocsSidebar", type: "sidebar wrapper" },
      ]}
      categoryLabel="文档骨架"
      demos={[
        {
          code: `<DocsSection id="usage" title="基础用法">
  <DocsDemoCard title="按钮示例" code="<Button />">...</DocsDemoCard>
  <DocsApiTable items={[...]} />
</DocsSection>`,
          content: (
            <AdminPageStack>
              <DocsSection description="文档块用于组织说明、示例和 API。" id="docs-blocks" title="文档块组合">
                <DocsDemoCard code={`<Button type="button">立即执行</Button>`} description="示例块支持代码折叠。" title="按钮示例">
                  <Button type="button">立即执行</Button>
                </DocsDemoCard>
                <DocsApiTable
                  items={[
                    { name: "title", type: "ReactNode", defaultValue: "-", required: true, description: "文档块标题。" },
                    { name: "code", type: "string", defaultValue: "-", description: "代码示例内容。" },
                  ]}
                  title="DocsDemoCard API"
                />
              </DocsSection>
              <DocsSidebar
                badge={<Badge>Docs</Badge>}
                description="侧边文档导航适合说明页、帮助中心和展示站。"
                items={[
                  { href: "#docs-blocks", label: "文档块组合", meta: "示例 + API" },
                  { href: "#api", label: "接口表", meta: "属性与说明" },
                ]}
                title="DocsSidebar"
              />
            </AdminPageStack>
          ),
          description: "基础文档结构：分区、示例卡、API 表和侧栏导航。",
          title: "基础骨架",
        },
        {
          content: (
            <DocsSection description="多个 Demo 区块按章节连续编排，贴近组件文档写法。" id="docs-blocks-sections" title="多章节文档">
              <DocsDemoCard title="紧凑示例">
                <Button size="sm" type="button" variant="outline">小尺寸操作</Button>
              </DocsDemoCard>
              <DocsDemoCard title="组合示例">
                <div className="grid gap-3 sm:grid-cols-2">
                  <Button type="button">主要动作</Button>
                  <Button type="button" variant="secondary">次要动作</Button>
                </div>
              </DocsDemoCard>
            </DocsSection>
          ),
          description: "同一页面可拆成多个文档区块，避免“全怼在一起”的展示方式。",
          title: "多区块编排",
        },
      ]}
      description="DocsSidebar、DocsSection、DocsDemoCard、DocsApiTable 是文档页自身的基础块，admin 和 showcase 都可以复用。"
      notes={["文档块只负责文档结构，不承载业务判断。", "展示站和后台说明页应复用同一组文档块。"]}
      title="Docs Blocks"
    />
  );
}

function AppFrameShellPage() {
  return (
    <ShowcaseDocPage
      apiItems={[
        { description: "桌面端侧栏。", name: "desktopSidebar", required: true, type: "ReactNode" },
        { description: "桌面端侧栏宽度和显示规则。", name: "desktopSidebarClassName", type: "string" },
        { description: "桌面端/通用页头。", name: "header", type: "ReactNode" },
        { description: "移动端顶部操作条。", name: "mobileBar", type: "({ openSidebar, closeSidebar }) => ReactNode" },
        { description: "移动端抽屉内容。", name: "mobileSidebar", type: "ReactNode | ({ closeSidebar }) => ReactNode" },
        { description: "内容区样式。", name: "contentClassName / contentInnerClassName / rootClassName", type: "string" },
      ]}
      categoryLabel="文档骨架"
      demos={[
        {
          code: `<AppFrameShell
  desktopSidebar={<Sidebar />}
  header={<Header />}
  mobileBar={({ openSidebar }) => ...}
>
  {children}
</AppFrameShell>`,
          content: (
            <div className="overflow-hidden rounded-2xl border border-border">
              <AppFrameShell
                contentClassName="p-4"
                contentInnerClassName="grid gap-4"
                desktopSidebar={
                  <div className="flex h-full flex-col border-r border-border bg-card p-4">
                    <p className="text-sm font-semibold text-foreground">导航区</p>
                    <p className="mt-2 text-sm text-muted-foreground">桌面端独立侧栏</p>
                  </div>
                }
                desktopSidebarClassName="md:flex md:w-56"
                header={<div className="hidden items-center justify-between border-b border-border bg-background px-4 py-3 md:flex"><span className="text-sm font-medium text-foreground">顶栏</span><ThemeToggle /></div>}
                mobileBar={({ openSidebar }) => (
                  <div className="flex items-center justify-between border-b border-border bg-background px-4 py-3 md:hidden">
                    <Button onClick={openSidebar} size="icon" type="button" variant="outline">
                      <span className="text-lg leading-none">≡</span>
                    </Button>
                    <span className="text-sm font-medium text-foreground">移动顶栏</span>
                    <ThemeToggle />
                  </div>
                )}
                mobileSidebar={<div className="flex h-full flex-col bg-card p-4 text-sm text-muted-foreground">移动端抽屉导航</div>}
                rootClassName="min-h-[26rem]"
              >
                <Card>
                  <CardHeader>
                    <CardTitle>内容区</CardTitle>
                  </CardHeader>
                  <CardContent>桌面端与移动端都由同一层壳组件承接。</CardContent>
                </Card>
              </AppFrameShell>
            </div>
          ),
          description: "基础壳层：固定桌面侧栏、独立头部、移动抽屉导航。",
          title: "基础壳层",
        },
        {
          content: (
            <div className="overflow-hidden rounded-2xl border border-border">
              <AppFrameShell
                contentClassName="px-4 pb-4 pt-3"
                contentInnerClassName="grid gap-3"
                desktopSidebar={
                  <div className="flex h-full flex-col border-r border-border bg-card p-3 text-sm">
                    <p className="font-medium text-foreground">项目导航</p>
                    <p className="mt-1 text-muted-foreground">展示紧凑模式下的壳层密度。</p>
                  </div>
                }
                desktopSidebarClassName="lg:flex lg:w-52"
                mobileBar={({ openSidebar }) => (
                  <div className="flex items-center justify-between border-b border-border px-3 py-2 lg:hidden">
                    <Button onClick={openSidebar} size="icon" type="button" variant="outline">
                      <span className="text-lg leading-none">≡</span>
                    </Button>
                    <span className="text-sm font-medium text-foreground">紧凑布局</span>
                    <ThemeToggle />
                  </div>
                )}
                mobileSidebar={<div className="flex h-full flex-col bg-card p-4 text-sm text-muted-foreground">移动端导航列表</div>}
                rootClassName="min-h-[22rem]"
              >
                <SectionCard description="顶部空间更紧凑，适合信息密度高的后台页面。" title="紧凑内容流">
                  <p className="text-sm text-muted-foreground">保持统一壳结构，不改业务页面内部语义。</p>
                </SectionCard>
              </AppFrameShell>
            </div>
          ),
          description: "紧凑模式可以降低头部和容器占用面积，适配高密度后台页。",
          title: "紧凑密度变体",
        },
      ]}
      description="AppFrameShell 是当前后台和展示站共用的大结构骨架，负责左右分区、移动抽屉和内容层。"
      notes={["这是最外层壳组件，控制桌面与移动的结构差异。", "业务页不应该各自重复实现侧栏、顶栏和内容壳。"]}
      title="AppFrameShell"
    />
  );
}

function MetricGridPage() {
  return (
    <ShowcaseDocPage
      apiItems={[
        { description: "指标卡子节点。", name: "children", required: true, type: "ReactNode" },
        { description: "单个指标标签。", name: "MetricCard.label", required: true, type: "string" },
        { description: "单个指标值。", name: "MetricCard.value", required: true, type: "string" },
        { description: "单个指标说明。", name: "MetricCard.detail", required: true, type: "string" },
      ]}
      categoryLabel="后台布局"
      demos={[
        {
          code: `<MetricGrid>
  <MetricCard label="服务数" value="18" detail="当前受管服务总数" />
</MetricGrid>`,
          content: (
            <MetricGrid>
              <MetricCard detail="当前受管服务总数" label="服务数" value="18" />
              <MetricCard detail="待处理工单数量" label="待办" value="7" />
              <MetricCard detail="昨日发布成功率" label="成功率" value="99.2%" />
              <MetricCard detail="本周新增租户数" label="新增租户" value="12" />
            </MetricGrid>
          ),
          description: "基础指标矩阵，适合工作台首页概览。",
          title: "基础指标块",
        },
        {
          content: (
            <AdminPageStack>
              <MetricGrid>
                <MetricCard detail="相较昨日 +12%" label="调用量" value="28.4K" />
                <MetricCard detail="处理时延 P95" label="平均耗时" value="183ms" />
                <MetricCard detail="近一小时告警数" label="告警" value="2" />
              </MetricGrid>
              <SectionCard description="指标矩阵下方承接解释区，形成文档式组合。" title="口径说明">
                <p className="text-sm text-muted-foreground">所有指标都应明确统计周期与采样口径，避免误解读。</p>
              </SectionCard>
            </AdminPageStack>
          ),
          description: "组合布局示例：指标卡 + 说明块，贴近真实文档页结构。",
          title: "组合布局",
        },
      ]}
      description="MetricGrid 与 MetricCard 用于后台首页和概览页的指标矩阵展示。"
      notes={["指标卡表达概览信息，不承接复杂交互。", "指标数量较多时保持统一字段结构。"]}
      title="MetricGrid"
    />
  );
}

function AdminShellPage() {
  return (
    <ShowcaseDocPage
      apiItems={[
        { description: "侧边说明区。", name: "sidebar", required: true, type: "ReactNode" },
        { description: "内容区。", name: "children", required: true, type: "ReactNode" },
        { description: "内容层辅助栅格。", name: "AdminPageStack / AdminTwoColumn / AdminThreeColumn", type: "ReactNode wrapper" },
      ]}
      categoryLabel="文档骨架"
      demos={[
        {
          code: `<AdminShell sidebar={<Sidebar />}>
  <AdminPageStack>
    <AdminTwoColumn>...</AdminTwoColumn>
    <AdminThreeColumn>...</AdminThreeColumn>
  </AdminPageStack>
</AdminShell>`,
          content: (
            <div className="overflow-hidden rounded-2xl border border-border bg-background">
              <AdminShell
                sidebar={
                  <Card>
                    <CardHeader>
                      <CardTitle>侧边说明</CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm text-muted-foreground">这里用于承接辅助说明、快捷入口或帮助文档。</CardContent>
                  </Card>
                }
              >
                <AdminPageStack>
                  <AdminTwoColumn>
                    <Card><CardContent className="p-5">双栏布局 A</CardContent></Card>
                    <Card><CardContent className="p-5">双栏布局 B</CardContent></Card>
                  </AdminTwoColumn>
                  <AdminThreeColumn>
                    <Card><CardContent className="p-5">主内容区</CardContent></Card>
                    <Card><CardContent className="p-5">右侧辅助区</CardContent></Card>
                  </AdminThreeColumn>
                </AdminPageStack>
              </AdminShell>
            </div>
          ),
          description: "基础后台内容层：侧栏说明 + 双栏/三栏组合。",
          title: "基础内容层",
        },
        {
          content: (
            <div className="overflow-hidden rounded-2xl border border-border bg-background">
              <AdminShell
                sidebar={
                  <SectionCard description="移动端会自然折叠到内容流前部。" title="侧栏摘要">
                    <p className="text-sm text-muted-foreground">保持组件语义一致，不在页面中手写栅格规则。</p>
                  </SectionCard>
                }
              >
                <AdminPageStack>
                  <AdminTwoColumn>
                    <SectionCard description="适配不同屏宽下的阅读节奏。" title="内容块 1">
                      <p className="text-sm text-muted-foreground">结构组件负责列数变化。</p>
                    </SectionCard>
                    <SectionCard description="文档式编排建议每块信息闭环。" title="内容块 2">
                      <p className="text-sm text-muted-foreground">避免在单块中堆积过多交互。</p>
                    </SectionCard>
                  </AdminTwoColumn>
                </AdminPageStack>
              </AdminShell>
            </div>
          ),
          description: "强调响应式下的阅读布局，保证后台与展示站结构一致。",
          title: "响应式变体",
        },
      ]}
      description="AdminShell、AdminPageStack、AdminTwoColumn、AdminThreeColumn 组成后台页内容层布局。"
      notes={["页面栅格统一由这些结构件承接，避免业务页各自拼列布局。", "双栏和三栏布局都应由结构组件决定，不要临时硬写 class。"]}
      title="AdminShell"
    />
  );
}

function AdminNavigationPage() {
  return (
    <ShowcaseDocPage
      apiItems={[
        { description: "当前路径。", name: "AdminSidebar.currentPath / TreeNav.currentPath", required: true, type: "string" },
        { description: "菜单树。", name: "menuTree", required: true, type: "AppMenuNode[]" },
        { description: "折叠态。", name: "collapsed", type: "boolean" },
        { description: "导航触发回调。", name: "onNavigate / setCollapsed / onLogout", type: "function" },
        { description: "用户摘要。", name: "avatar / name / roleName", type: "string" },
      ]}
      categoryLabel="文档骨架"
      demos={[
        {
          code: `<AdminTopbar ... />
<AdminSidebar ... />
<TreeNav ... />`,
          content: (
            <div className="grid gap-6">
              <AdminTopbar
                breadcrumbs={[{ href: "/", label: "后台" }, { label: "组件展示站" }]}
                pageTitle="发布控制台"
                tenantCode="local"
              />
              <AdminThreeColumn>
                <AdminSidebar
                  avatar=""
                  collapsed={false}
                  currentPath="/system/users"
                  menuTree={mockMenuTree}
                  name="张三"
                  onLogout={() => {
                    toast.message("这里只做导航展示");
                  }}
                  onNavigate={() => undefined}
                  roleName="系统管理员"
                  setCollapsed={() => undefined}
                />
                <Card>
                  <CardHeader>
                    <CardTitle>TreeNav 独立展示</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <TreeNav currentPath="/system/users" menuTree={mockMenuTree} onNavigate={() => undefined} />
                  </CardContent>
                </Card>
              </AdminThreeColumn>
            </div>
          ),
          description: "完整导航层展示：顶栏、侧栏、树形菜单配合。",
          title: "基础导航层",
        },
        {
          content: (
            <AdminPageStack>
              <Card>
                <CardHeader>
                  <CardTitle>仅树形导航</CardTitle>
                  <CardDescription>用于内容页左侧局部目录，不需要完整侧栏时使用。</CardDescription>
                </CardHeader>
                <CardContent>
                  <TreeNav currentPath="/system/menus" menuTree={mockMenuTree} onNavigate={() => undefined} />
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>折叠侧栏预览</CardTitle>
                </CardHeader>
                <CardContent>
                  <AdminSidebar
                    avatar=""
                    collapsed
                    currentPath="/system/users"
                    menuTree={mockMenuTree}
                    name="张三"
                    onLogout={() => undefined}
                    onNavigate={() => undefined}
                    roleName="系统管理员"
                    setCollapsed={() => undefined}
                  />
                </CardContent>
              </Card>
            </AdminPageStack>
          ),
          description: "补充分栏与折叠态文档，便于对齐多导航场景的 UX。",
          title: "折叠与局部导航",
        },
      ]}
      description="BrandBlock、AdminTopbar、TreeNav、AdminSidebar 组成后台的导航层与用户区。"
      notes={["导航层表达全局结构，不承接业务内容。", "菜单树、顶栏和用户卡应保持统一交互和视觉节奏。"]}
      title="Admin Navigation"
    />
  );
}

function BrandIdentityPage() {
  return (
    <ShowcaseDocPage
      apiItems={[
        { description: "品牌块。", name: "BrandBlock", type: "brand section" },
        { description: "头像。", name: "IdentityCard.avatar", type: "string" },
        { description: "姓名、角色、租户。", name: "IdentityCard.name / roleName / tenantCode", type: "string" },
      ]}
      categoryLabel="文档骨架"
      demos={[
        {
          code: `<BrandBlock />
<IdentityCard avatar="" name="张三" roleName="系统管理员" tenantCode="local" />`,
          content: (
            <div className="grid gap-4 md:max-w-sm">
              <BrandBlock />
              <IdentityCard avatar="" name="张三" roleName="系统管理员" tenantCode="local" />
            </div>
          ),
          description: "基础品牌与身份区块，适合侧栏顶部。",
          title: "基础品牌块",
        },
        {
          content: (
            <AdminTwoColumn>
              <Card>
                <CardHeader>
                  <CardTitle>品牌信息</CardTitle>
                </CardHeader>
                <CardContent>
                  <BrandBlock />
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>当前身份</CardTitle>
                </CardHeader>
                <CardContent>
                  <IdentityCard avatar="" name="李四" roleName="运维管理员" tenantCode="prod-cn" />
                </CardContent>
              </Card>
            </AdminTwoColumn>
          ),
          description: "分栏展示品牌与身份，可用于设置页或用户中心。",
          title: "分栏变体",
        },
      ]}
      description="BrandBlock 与 IdentityCard 是后台侧栏中的品牌与身份区块。"
      notes={["品牌块负责系统识别，不承担导航。", "身份卡只展示用户摘要，不叠加过多操作。"]}
      title="Brand & Identity"
    />
  );
}

function DocsShellPage() {
  return (
    <ShowcaseDocPage
      apiItems={[
        { description: "左侧文档侧栏。", name: "sidebar", required: true, type: "ReactNode" },
        { description: "头部区域。", name: "header", type: "ReactNode" },
        { description: "移动端顶部操作条。", name: "mobileBar", type: "({ openSidebar, closeSidebar }) => ReactNode" },
        { description: "移动端抽屉内容。", name: "mobileSidebar", type: "ReactNode | ({ closeSidebar }) => ReactNode" },
        { description: "壳层与内容区样式。", name: "className / contentClassName / contentInnerClassName / rootClassName / sidebarClassName", type: "string" },
      ]}
      categoryLabel="文档骨架"
      demos={[
        {
          code: `<DocsShell sidebar={<Sidebar />} header={<Header />}>
  <DocsSection ... />
</DocsShell>`,
          content: (
            <div className="overflow-hidden rounded-2xl border border-border bg-background">
              <DocsShell
                contentClassName="p-4"
                contentInnerClassName="grid gap-4"
                header={<div className="hidden items-center justify-between border-b border-border px-4 py-3 xl:flex"><span className="text-sm font-medium text-foreground">文档头部</span><ThemeToggle /></div>}
                mobileBar={({ openSidebar }) => (
                  <div className="flex items-center justify-between border-b border-border px-4 py-3 xl:hidden">
                    <Button onClick={openSidebar} size="icon" type="button" variant="outline">
                      <span className="text-lg leading-none">≡</span>
                    </Button>
                    <span className="text-sm font-medium text-foreground">文档站</span>
                    <ThemeToggle />
                  </div>
                )}
                mobileSidebar={<div className="flex h-full flex-col bg-card p-4 text-sm text-muted-foreground">移动端文档侧栏</div>}
                rootClassName="min-h-[28rem]"
                sidebar={
                  <div className="flex h-full flex-col border-r border-border bg-card p-4">
                    <p className="text-sm font-semibold text-foreground">文档侧栏</p>
                    <p className="mt-2 text-sm text-muted-foreground">左侧目录与分组导航。</p>
                  </div>
                }
                sidebarClassName="xl:flex xl:w-56"
              >
                <DocsSection description="正文区由文档块承接。" id="docs-shell-preview" title="文档内容">
                  <DocsDemoCard code={`<Button>运行操作</Button>`} title="示例块">
                    <Button type="button">运行操作</Button>
                  </DocsDemoCard>
                </DocsSection>
              </DocsShell>
            </div>
          ),
          description: "基础文档壳层：固定侧栏 + 头部 + 正文区。",
          title: "基础文档壳",
        },
        {
          content: (
            <div className="overflow-hidden rounded-2xl border border-border bg-background">
              <DocsShell
                contentClassName="px-3 pb-3 pt-2"
                contentInnerClassName="grid gap-3"
                mobileBar={({ openSidebar }) => (
                  <div className="flex items-center justify-between border-b border-border px-3 py-2 lg:hidden">
                    <Button onClick={openSidebar} size="icon" type="button" variant="outline">
                      <span className="text-lg leading-none">≡</span>
                    </Button>
                    <span className="text-sm font-medium text-foreground">移动文档</span>
                    <ThemeToggle />
                  </div>
                )}
                mobileSidebar={<div className="flex h-full flex-col bg-card p-4 text-sm text-muted-foreground">移动目录</div>}
                rootClassName="min-h-[24rem]"
                sidebar={
                  <DocsSidebar
                    description="目录按分类分组，贴近 Element Plus 的文档导航体验。"
                    items={[
                      { href: "#intro", label: "介绍", meta: "Overview" },
                      { href: "#usage", label: "基础用法", meta: "Usage" },
                      { href: "#api", label: "API", meta: "Props" },
                    ]}
                    title="组件目录"
                  />
                }
                sidebarClassName="lg:flex lg:w-60"
              >
                <DocsSection id="intro" title="介绍">
                  <p className="text-sm text-muted-foreground">正文区支持多个文档章节连续布局。</p>
                </DocsSection>
                <DocsSection id="usage" title="基础用法">
                  <DocsDemoCard title="移动优先示例">
                    <Button type="button" variant="secondary">查看详情</Button>
                  </DocsDemoCard>
                </DocsSection>
              </DocsShell>
            </div>
          ),
          description: "补充移动优先与目录侧栏组合，验证响应式文档体验。",
          title: "响应式文档页",
        },
      ]}
      description="DocsShell 是展示站和说明页使用的结构层，负责侧栏、头部和正文区的协同布局。"
      notes={["文档站必须通过 DocsShell 进入，不再各自拼壳。", "桌面端应保证左侧独立、右侧独立滚动，移动端自然退化成抽屉。"]}
      title="DocsShell"
    />
  );
}

const docAnchorItems = [
  { href: "#docs-anchor-intro", title: "介绍", description: "组件定位与适用场景" },
  { href: "#docs-anchor-usage", title: "基础用法", description: "默认锚点导航结构" },
  { href: "#docs-anchor-api", title: "API", description: "关键属性与边界说明" },
];

function GlobalSearchPage() {
  const [basicOpen, setBasicOpen] = useState(false);
  const [headerOpen, setHeaderOpen] = useState(false);
  const searchItems = [
    { id: "layout-docs", title: "DocsShell", description: "文档页结构层", section: "组件文档", keywords: ["docs", "shell"] },
    { id: "filter-panel", title: "FilterPanel", description: "列表筛选骨架", section: "后台布局", keywords: ["filter", "toolbar"] },
    { id: "button", title: "Button", description: "按钮矩阵与动作语义", section: "基础操作", keywords: ["primary", "danger"] },
    { id: "permission", title: "权限配置", description: "角色权限管理入口", section: "后台入口", keywords: ["role", "permission"] },
  ];

  return (
    <ShowcaseDocPage
      apiItems={[
        { description: "搜索条目数组。", name: "items", required: true, type: "GlobalSearchItem[]" },
        { defaultValue: '"全局搜索"', description: "触发按钮文案。", name: "triggerLabel", type: "string" },
        { defaultValue: '"全局搜索"', description: "弹层标题。", name: "title", type: "string" },
        { defaultValue: '"搜索组件、页面或命令"', description: "输入框占位文案。", name: "placeholder", type: "string" },
        { description: "弹层显隐回调。", name: "onOpenChange", type: "(open: boolean) => void" },
        { description: "选择项回调。", name: "onSelect", type: "(item: GlobalSearchItem) => void" },
      ]}
      categoryLabel="文档骨架"
      demos={[
        {
          code: `const [open, setOpen] = useState(false);
<Button onClick={() => setOpen(true)}>搜索组件</Button>
<GlobalSearch items={items} enableHotkeys onOpenChange={setOpen} open={open} />`,
          content: (
            <RowActions>
              <Button onClick={() => setBasicOpen(true)} type="button" variant="outline">
                搜索组件
              </Button>
              <GlobalSearch
                enableHotkeys
                items={searchItems}
                onOpenChange={setBasicOpen}
                onSelect={(item) => toast.message(`选中了 ${String(item.title)}`)}
                open={basicOpen}
              />
            </RowActions>
          ),
          description: "基础全局搜索入口，支持按钮触发和 `Ctrl/Cmd + K` 唤起。",
          title: "基础入口",
        },
        {
          code: `const [open, setOpen] = useState(false);
<PageHeader
  actions={<Button onClick={() => setOpen(true)}>检索页面</Button>}
  title="发布中心"
/>
<GlobalSearch items={items} onOpenChange={setOpen} open={open} />`,
          content: (
            <PageHeader
              actions={
                <>
                  <Button onClick={() => setHeaderOpen(true)} type="button" variant="outline">
                    检索页面
                  </Button>
                  <GlobalSearch
                    items={searchItems}
                    onOpenChange={setHeaderOpen}
                    onSelect={(item) => toast.message(`准备跳转到 ${String(item.title)}`)}
                    open={headerOpen}
                  />
                </>
              }
              breadcrumbs={[{ label: "后台" }, { label: "发布中心" }]}
              description="把全局搜索放到顶栏动作区，作为后台统一入口。"
              title="发布中心"
            />
          ),
          description: "放进顶栏或页面头部时，适合作为统一检索与跳转入口。",
          title: "顶栏集成",
        },
        {
          code: `<GlobalSearch
  items={[
    { id: "docs", title: "DocsShell", section: "组件文档" },
    { id: "admin", title: "权限配置", section: "后台入口" },
  ]}
/>`,
          content: (
            <SectionCard description="条目支持按 section 自动分组，贴近文档站和后台混合搜索体验。" title="分组结果">
              <p className="text-sm leading-7 text-muted-foreground">
                当前搜索面板会先按 `section` 分组，再按关键字过滤。实际接入时可以把组件文档、后台页面和快捷命令统一沉淀到一套搜索索引里。
              </p>
            </SectionCard>
          ),
          description: "文档页、后台入口和动作命令可以落在同一个搜索面板里，再由分组区分结果来源。",
          title: "分组与命令",
        },
      ]}
      description="GlobalSearch 用于统一承接文档检索、后台页面跳转和命令入口，适合作为顶栏级搜索能力。"
      notes={[
        "组件只负责搜索面板和结果分组，真正的跳转、埋点和权限过滤由业务层控制。",
        "搜索结果文案要短，关键词由业务层补齐，不要在前端临时拼接低质量标签。",
      ]}
      title="GlobalSearch"
    />
  );
}

function AnchorPage() {
  return (
    <ShowcaseDocPage
      apiItems={[
        { description: "锚点数组。", name: "items", required: true, type: 'Array<{ href: string; title: ReactNode; description?: ReactNode }>' },
        { defaultValue: '"页面导航"', description: "导航标题。", name: "title", type: "ReactNode" },
        { defaultValue: "96", description: "滚动偏移量。", name: "offset", type: "number" },
        { description: "当前激活项。", name: "activeHref", type: "string" },
        { description: "切换回调。", name: "onChange", type: "(href: string) => void" },
      ]}
      categoryLabel="文档骨架"
      demos={[
        {
          code: `<div className="grid gap-6 xl:grid-cols-[260px_minmax(0,1fr)]">
  <Anchor items={items} />
  <div className="grid gap-6">
    <SectionCard id="intro" ... />
  </div>
</div>`,
          content: (
            <div className="grid gap-6 xl:grid-cols-[260px_minmax(0,1fr)]">
              <Anchor items={docAnchorItems} />
              <div className="grid gap-6">
                <SectionCard description="Anchor 负责长页面内的就地定位。" title="介绍">
                  <div className="text-sm leading-7 text-muted-foreground" id="docs-anchor-intro">
                    用于帮助中心、组件文档页、设置页等长内容场景，避免用户在同页迷路。
                  </div>
                </SectionCard>
                <SectionCard description="搭配结构化章节使用效果最好。" title="基础用法">
                  <div className="text-sm leading-7 text-muted-foreground" id="docs-anchor-usage">
                    锚点标题要简短稳定，保证目录阅读负担低，正文再承接完整说明。
                  </div>
                </SectionCard>
                <SectionCard description="API 与提示类章节也可以继续挂进目录。" title="API">
                  <div className="text-sm leading-7 text-muted-foreground" id="docs-anchor-api">
                    目录项数量过多时，应回到信息架构本身，不要无限增加锚点层级。
                  </div>
                </SectionCard>
              </div>
            </div>
          ),
          description: "标准目录布局：左侧 Anchor，右侧连续章节。",
          title: "基础目录",
        },
        {
          code: `<Anchor
  title="设置目录"
  items={[
    { href: "#basic", title: "基础设置" },
    { href: "#security", title: "安全策略" },
  ]}
/>`,
          content: (
            <div className="grid gap-6 md:grid-cols-[240px_minmax(0,1fr)]">
              <Anchor
                items={[
                  { href: "#settings-basic", title: "基础设置", description: "命名、时区、语言" },
                  { href: "#settings-security", title: "安全策略", description: "权限、风控、审计" },
                ]}
                title="设置目录"
              />
              <div className="grid gap-4">
                <Card id="settings-basic">
                  <CardHeader>
                    <CardTitle>基础设置</CardTitle>
                    <CardDescription>系统命名、时区和语言偏好。</CardDescription>
                  </CardHeader>
                </Card>
                <Card id="settings-security">
                  <CardHeader>
                    <CardTitle>安全策略</CardTitle>
                    <CardDescription>双因子认证、会话时长与审计策略。</CardDescription>
                  </CardHeader>
                </Card>
              </div>
            </div>
          ),
          description: "除了文档站，也适合设置页和帮助中心的同页定位。",
          title: "设置页场景",
        },
      ]}
      description="Anchor 用于长页面目录导航，适合文档站、帮助页和设置页的同页跳转。"
      notes={[
        "Anchor 适合 3-8 个稳定章节，章节太多时应优先拆页而不是堆锚点。",
        "目录标题只负责定位，不承担状态提示和操作按钮。",
      ]}
      title="Anchor"
    />
  );
}

function BacktopPage() {
  return (
    <ShowcaseDocPage
      apiItems={[
        { defaultValue: "240", description: "滚动超过该高度后显示。", name: "visibilityHeight", type: "number" },
        { description: "目标滚动容器选择器；不传时监听 window。", name: "target", type: "string" },
        { defaultValue: "32", description: "距离右侧的偏移。", name: "right", type: "number" },
        { defaultValue: "32", description: "距离底部的偏移。", name: "bottom", type: "number" },
        { defaultValue: "false", description: "是否允许在视口内纵向拖拽按钮位置。", name: "draggable", type: "boolean" },
        { defaultValue: "300", description: "纵向拖拽最大偏移，且不会被拖出当前视口。", name: "maxDragOffset", type: "number" },
        { defaultValue: "320", description: "滚动动画时长参数。", name: "duration", type: "number" },
      ]}
      categoryLabel="文档骨架"
      demos={[
        {
          code: `<div className="relative">
  <AppScrollbar className="h-80 rounded-2xl border border-border bg-card" viewportProps={{ id: "backtop-demo-pane" }} viewportClassName="p-4">
    ...
  </AppScrollbar>
  <Backtop target="#backtop-demo-pane" />
</div>`,
          content: (
            <div className="relative">
              <AppScrollbar
                className="h-80 rounded-2xl border border-border bg-card"
                viewportClassName="p-4"
                viewportProps={{ id: "backtop-demo-pane" }}
              >
                <div className="grid gap-4">
                  {Array.from({ length: 12 }, (_, index) => (
                    <SectionCard description={`内容区块 ${index + 1}`} key={index} title={`文档章节 ${index + 1}`}>
                      <p className="text-sm leading-7 text-muted-foreground">
                        返回顶部适合长文档、日志页和帮助中心。这里故意制造可滚动容器，验证 `target` 模式。
                      </p>
                    </SectionCard>
                  ))}
                </div>
              </AppScrollbar>
              <Backtop bottom={20} right={20} target="#backtop-demo-pane" visibilityHeight={120} />
            </div>
          ),
          description: "绑定滚动容器后，适合长日志、抽屉内容区和文档正文区域。",
          title: "容器滚动",
        },
        {
          code: `<Backtop bottom={24} right={24} visibilityHeight={120} />`,
          content: (
            <InlineNotice title="页面级返回顶部">
              展示站已经把 Backtop 注册到全局 content 区；当正文滚动超过阈值后显示，并支持在视口内上下拖拽 300px。
            </InlineNotice>
          ),
          description: "页面级与容器级的区别在于是否传入 `target`；展示站默认采用 content 容器注册。",
          title: "全局 content 注册",
        },
      ]}
      description="Backtop 在长页面或滚动容器中提供快速返回顶部的入口，适合文档站、日志页和长详情页。"
      notes={[
        "优先用于明显的长内容页，短页不应强行展示返回顶部按钮。",
        "在弹层、抽屉和局部滚动区使用时，一定传入 target，避免误滚动整个窗口。",
      ]}
      title="Backtop"
    />
  );
}

function WatermarkPage() {
  return (
    <ShowcaseDocPage
      apiItems={[
        { description: "水印文本。", name: "content", required: true, type: "string" },
        { defaultValue: '"rgba(100, 116, 139, 0.18)"', description: "水印颜色。", name: "color", type: "string" },
        { defaultValue: "15", description: "字体大小。", name: "fontSize", type: "number" },
        { defaultValue: "180 / 84", description: "水印块宽高。", name: "width / height", type: "number" },
        { defaultValue: "96 / 72", description: "横纵向间距。", name: "gapX / gapY", type: "number" },
        { defaultValue: "-18", description: "旋转角度。", name: "rotate", type: "number" },
      ]}
      categoryLabel="文档骨架"
      demos={[
        {
          code: `<Watermark content="GO ADMIN UI">
  <Card>...</Card>
</Watermark>`,
          content: (
            <Watermark content="GO ADMIN UI">
              <Card>
                <CardHeader>
                  <CardTitle>基础水印</CardTitle>
                  <CardDescription>适合内部预览、截图说明和测试环境页面。</CardDescription>
                </CardHeader>
                <CardContent className="text-sm leading-7 text-muted-foreground">
                  水印层不影响正文交互，适合作为背景辅助标识，而不是强行遮挡内容。
                </CardContent>
              </Card>
            </Watermark>
          ),
          description: "最常见的文本型水印，直接包裹页面内容或卡片区域。",
          title: "基础文本",
        },
        {
          code: `<Watermark content="INTERNAL PREVIEW" color="rgba(59, 130, 246, 0.18)" rotate={-12}>
  <SectionCard ... />
</Watermark>`,
          content: (
            <Watermark color="rgba(59, 130, 246, 0.18)" content="INTERNAL PREVIEW" fontSize={16} rotate={-12}>
              <SectionCard description="用于预发环境和内部评审快照。" title="预览态标识">
                <p className="text-sm leading-7 text-muted-foreground">通过颜色、旋转和密度控制水印存在感，避免喧宾夺主。</p>
              </SectionCard>
            </Watermark>
          ),
          description: "调整颜色和角度后，可以区分测试环境、内部预览和审计快照。",
          title: "环境区分",
        },
        {
          code: `<Watermark content="AUDIT LOG" gapX={72} gapY={56} width={150}>
  <div className="grid gap-3">...</div>
</Watermark>`,
          content: (
            <Watermark content="AUDIT LOG" gapX={72} gapY={56} width={150}>
              <div className="grid gap-3">
                <InlineNotice title="审计说明">截图和导出预览可叠加弱水印，降低误传风险。</InlineNotice>
                <DefinitionList columns={2}>
                  <DetailItem label="导出人" value="张三" />
                  <DetailItem label="导出时间" value="2026-04-09 21:30" />
                </DefinitionList>
              </div>
            </Watermark>
          ),
          description: "更密集的水印排布适合审计导出、截图预览和内部材料。",
          title: "密度调整",
        },
      ]}
      description="Watermark 为页面、卡片和预览区提供背景标识，适合内部预览、测试环境和审计导出。"
      notes={[
        "水印是背景辅助层，不应该遮挡文字和交互。",
        "如果页面已经有强视觉背景，水印应进一步减弱，不要叠加噪音。",
      ]}
      title="Watermark"
    />
  );
}

export const layoutRoutes: ShowcaseRoute[] = [
  { component: PageHeaderPage, label: "PageHeader", path: "/layout/page-header", shortLabel: "HDR", summaryKey: "showcase.route.layout.page-header.summary" },
  { component: FilterPanelPage, label: "FilterPanel", path: "/layout/filter-panel", shortLabel: "FLT", summaryKey: "showcase.route.layout.filter-panel.summary" },
  { component: CardPage, label: "Card", path: "/layout/card", shortLabel: "CRD", summaryKey: "showcase.route.layout.card.summary" },
  { component: SectionCardPage, label: "SectionCard", path: "/layout/section-card", shortLabel: "SEC", summaryKey: "showcase.route.layout.section-card.summary" },
  { component: ProgressStepsPage, label: "ProgressSteps", path: "/layout/progress-steps", shortLabel: "STP", summaryKey: "showcase.route.layout.progress-steps.summary" },
  { component: LoadingPage, label: "Loading", path: "/layout/loading", shortLabel: "LDG", summaryKey: "showcase.route.layout.loading.summary" },
  { component: MetricGridPage, label: "MetricGrid", path: "/layout/metric-grid", shortLabel: "MET", summaryKey: "showcase.route.layout.metric-grid.summary" },
  { component: TreeSelectorPanelPage, label: "TreeSelectorPanel", path: "/layout/tree-selector-panel", shortLabel: "TRE", summaryKey: "showcase.route.layout.tree-selector-panel.summary" },
  { component: MasterDetailLayoutPage, label: "MasterDetailLayout", path: "/layout/master-detail-layout", shortLabel: "MDL", summaryKey: "showcase.route.layout.master-detail-layout.summary" },
  { component: AuthLayoutPage, label: "AuthLayout", path: "/layout/auth-layout", shortLabel: "ATH", summaryKey: "showcase.route.layout.auth-layout.summary" },
  { component: WizardLayoutPage, label: "WizardLayout", path: "/layout/wizard-layout", shortLabel: "WZD", summaryKey: "showcase.route.layout.wizard-layout.summary" },
];

export const docsRoutes: ShowcaseRoute[] = [
  { component: DocsBlocksPage, label: "Docs Blocks", path: "/docs/docs-blocks", shortLabel: "DOC", summaryKey: "showcase.route.docs.docs-blocks.summary" },
  { component: DocsShellPage, label: "DocsShell", path: "/docs/docs-shell", shortLabel: "DSH", summaryKey: "showcase.route.docs.docs-shell.summary" },
  { component: GlobalSearchPage, label: "GlobalSearch", path: "/docs/global-search", shortLabel: "GSR", summaryKey: "showcase.route.docs.global-search.summary" },
  { component: AnchorPage, label: "Anchor", path: "/docs/anchor", shortLabel: "ANC", summaryKey: "showcase.route.docs.anchor.summary" },
  { component: BacktopPage, label: "Backtop", path: "/docs/backtop", shortLabel: "TOP", summaryKey: "showcase.route.docs.backtop.summary" },
  { component: WatermarkPage, label: "Watermark", path: "/docs/watermark", shortLabel: "WTM", summaryKey: "showcase.route.docs.watermark.summary" },
  { component: AppFrameShellPage, label: "AppFrameShell", path: "/docs/app-frame-shell", shortLabel: "APP", summaryKey: "showcase.route.docs.app-frame-shell.summary" },
  { component: AdminShellPage, label: "AdminShell", path: "/docs/admin-shell", shortLabel: "ADM", summaryKey: "showcase.route.docs.admin-shell.summary" },
  { component: AdminNavigationPage, label: "Admin Navigation", path: "/docs/admin-navigation", shortLabel: "NAV", summaryKey: "showcase.route.docs.admin-navigation.summary" },
  { component: BrandIdentityPage, label: "Brand & Identity", path: "/docs/brand-identity", shortLabel: "IDN", summaryKey: "showcase.route.docs.brand-identity.summary" },
];

export const layoutCategory: ShowcaseCategory = {
  descriptionKey: "showcase.category.layout.description",
  key: "layout",
  labelKey: "showcase.category.layout.label",
  items: layoutRoutes,
};

export const docsCategory: ShowcaseCategory = {
  descriptionKey: "showcase.category.docs.description",
  key: "docs",
  labelKey: "showcase.category.docs.label",
  items: docsRoutes,
};
