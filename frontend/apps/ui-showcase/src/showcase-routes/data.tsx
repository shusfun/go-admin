import {
  AppVirtualList,
  Avatar,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CommitList,
  DataTableSection,
  DefinitionList,
  DetailGrid,
  DetailItem,
  IconGrid,
  Image,
  InlineNotice,
  KeyValueCard,
  LogViewer,
  Pagination,
  Progress,
  StatStrip,
  StatusBadge,
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
  TaskStatusCard,
  DetailSplitTablePattern,
  GroupedMetricTablePattern,
  WorkbenchWideTablePattern,
} from "@go-admin/ui-admin";
import { Bell, Database, Shield, UserRound } from "lucide-react";
import { useState } from "react";
import {
  ShowcaseDocPage,
  commits,
  detailItems,
  tableRows,
  type ShowcaseCategory,
  type ShowcaseRoute,
} from "./shared";

const demoAvatarImage = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(`
  <svg xmlns="http://www.w3.org/2000/svg" width="320" height="320" viewBox="0 0 320 320">
    <defs>
      <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#dbeafe" />
        <stop offset="100%" stop-color="#bfdbfe" />
      </linearGradient>
    </defs>
    <rect width="320" height="320" rx="48" fill="url(#bg)" />
    <circle cx="160" cy="122" r="56" fill="#1d4ed8" opacity="0.14" />
    <path d="M92 256c20-44 54-66 102-66s82 22 102 66" fill="#1d4ed8" opacity="0.18" />
    <text x="160" y="145" text-anchor="middle" font-size="72" font-weight="700" font-family="Arial, sans-serif" fill="#1d4ed8">GA</text>
  </svg>
`)}`;

const demoImageSource = {
  path: demoAvatarImage,
  size: 512,
  variants: [
    { path: demoAvatarImage, size: 128 },
    { path: demoAvatarImage, size: 256 },
  ],
};

function TablePage() {
  const [page, setPage] = useState(1);

  return (
    <ShowcaseDocPage
      apiItems={[
        { description: "表格根节点。", name: "Table", type: "HTMLTableElement wrapper" },
        { description: "表头区域。", name: "TableHeader", type: "thead wrapper" },
        { description: "表体区域。", name: "TableBody", type: "tbody wrapper" },
        { description: "行节点。", name: "TableRow", type: "tr wrapper" },
        { description: "列表头单元格。", name: "TableHead", type: "th wrapper" },
        { description: "列表体单元格。", name: "TableCell", type: "td wrapper" },
      ]}
      categoryLabel="数据展示"
      demos={[
        {
          code: `<Table>
  <TableHeader>...</TableHeader>
  <TableBody>...</TableBody>
</Table>`,
          content: (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>编号</TableHead>
                  <TableHead>姓名</TableHead>
                  <TableHead>角色</TableHead>
                  <TableHead>状态</TableHead>
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
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ),
          description: "标准表头 + 表体结构，适合作为所有列表页起点。",
          title: "基础表格",
        },
        {
          code: `<Table>
  <TableBody>
    <TableRow>
      <TableCell>...</TableCell>
      <TableCell><StatusBadge status="运行中" /></TableCell>
      <TableCell><Button variant="outline">查看</Button></TableCell>
    </TableRow>
  </TableBody>
</Table>`,
          content: (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>服务</TableHead>
                  <TableHead>版本</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead>操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell>order-api</TableCell>
                  <TableCell>v2.3.1</TableCell>
                  <TableCell>
                    <StatusBadge status="运行中" />
                  </TableCell>
                  <TableCell>
                    <Button size="sm" type="button" variant="outline">
                      查看
                    </Button>
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>gateway</TableCell>
                  <TableCell>v1.9.0</TableCell>
                  <TableCell>
                    <StatusBadge status="停用" />
                  </TableCell>
                  <TableCell>
                    <Button size="sm" type="button" variant="outline">
                      查看
                    </Button>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          ),
          description: "状态列与操作列是后台列表最常见的组合。",
          title: "状态与操作列",
        },
        {
          code: `<DataTableSection title="用户列表" description="当前共 3 条记录。">
  <Table>...</Table>
  <Pagination page={page} totalPages={6} showPager onPageChange={setPage} />
</DataTableSection>`,
          content: (
            <DataTableSection description="当前共 3 条记录。" title="用户列表">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>编号</TableHead>
                    <TableHead>姓名</TableHead>
                    <TableHead>角色</TableHead>
                    <TableHead>更新时间</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tableRows.map((row) => (
                    <TableRow key={`${row.id}-detail`}>
                      <TableCell>{row.id}</TableCell>
                      <TableCell>{row.name}</TableCell>
                      <TableCell>{row.role}</TableCell>
                      <TableCell>{row.updatedAt}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <Pagination onPageChange={setPage} page={page} showPager totalPages={6} />
            </DataTableSection>
          ),
          description: "表格、统计说明和分页组合成完整的数据区块。",
          title: "完整布局",
        },
      ]}
      description="Table 用于标准化后台表格结构，适合和 DataTableSection、Pagination 配合使用。"
      notes={["表格列较多时，保持列宽和状态列语义统一。", "业务层负责数据获取和排序，不把状态机塞进 Table 本身。"]}
      title="Table"
    />
  );
}

function PaginationPage() {
  const [basicPage, setBasicPage] = useState(3);
  const [backgroundPage, setBackgroundPage] = useState(8);
  const [compactPage, setCompactPage] = useState(2);
  const [advancedPage, setAdvancedPage] = useState(5);
  const [advancedPageSize, setAdvancedPageSize] = useState(20);
  const totalRecords = 248;

  return (
    <ShowcaseDocPage
      apiItems={[
        { description: "当前页码，组件以受控方式渲染。", name: "page", required: true, type: "number" },
        { description: "总页数；不传时可由 total + pageSize 推导。", name: "totalPages", type: "number" },
        { description: "总条数，用于展示总数并推导总页数。", name: "total", type: "number" },
        { defaultValue: "10", description: "每页条数。", name: "pageSize", type: "number" },
        { description: "每页条数候选项。", name: "pageSizes", type: "number[]" },
        { description: "页码切换回调，新页面优先使用。", name: "onPageChange", type: "(page: number) => void" },
        { description: "每页条数变化回调。", name: "onPageSizeChange", type: "(pageSize: number) => void" },
        { description: "旧接口上一页回调，兼容现有业务页。", name: "onPrevious", type: "() => void" },
        { description: "旧接口下一页回调，兼容现有业务页。", name: "onNext", type: "() => void" },
        { defaultValue: '"default"', description: "尺寸。", name: "size", type: '"large" | "default" | "small"' },
        { defaultValue: "false", description: "背景态，用于更接近 Element Plus 的块状翻页观感。", name: "background", type: "boolean" },
        { defaultValue: "false", description: "是否禁用整组分页。", name: "disabled", type: "boolean" },
        { defaultValue: "false", description: "是否显示页码按钮。", name: "showPager", type: "boolean" },
        { defaultValue: "false", description: "是否显示快速跳页输入。", name: "showQuickJumper", type: "boolean" },
        { defaultValue: "false", description: "是否显示总条数。", name: "showTotal", type: "boolean" },
        { defaultValue: "7", description: "页码按钮数量阈值，过多时自动省略。", name: "pagerCount", type: "number" },
      ]}
      categoryLabel="数据展示"
      demos={[
        {
          code: `const [page, setPage] = useState(3);
<Pagination page={page} totalPages={12} showPager onPageChange={setPage} />`,
          content: <Pagination onPageChange={setBasicPage} page={basicPage} showPager totalPages={12} />,
          description: "默认页码翻页，适合服务端分页列表或标准表格区域。",
          title: "基础页码",
        },
        {
          code: `<div className="grid gap-4">
  <Pagination background page={page} totalPages={18} showPager onPageChange={setPage} />
  <Pagination background page={2} size="small" totalPages={9} showPager onPageChange={setCompactPage} />
  <Pagination background disabled page={4} totalPages={12} showPager />
</div>`,
          content: (
            <div className="grid gap-4">
              <Pagination background onPageChange={setBackgroundPage} page={backgroundPage} showPager totalPages={18} />
              <Pagination background onPageChange={setCompactPage} page={compactPage} showPager size="small" totalPages={9} />
              <Pagination background disabled page={4} showPager totalPages={12} />
            </div>
          ),
          description: "背景态、小尺寸、禁用态作为同一套分页能力输出。",
          title: "状态与尺寸",
        },
        {
          code: `<Pagination
  background
  page={page}
  pageSize={pageSize}
  pageSizes={[10, 20, 30, 50]}
  showPager
  showQuickJumper
  showTotal
  total={248}
  onPageChange={setPage}
  onPageSizeChange={setPageSize}
/>`,
          content: (
            <Pagination
              background
              onPageChange={setAdvancedPage}
              onPageSizeChange={(nextPageSize) => {
                setAdvancedPageSize(nextPageSize);
                setAdvancedPage(1);
              }}
              page={advancedPage}
              pageSize={advancedPageSize}
              pageSizes={[10, 20, 30, 50]}
              pagerCount={5}
              showPager
              showQuickJumper
              showTotal
              size="small"
              total={totalRecords}
            />
          ),
          description: "总数、页容量切换、快速跳页统一组合，阅读顺序接近 Element Plus。",
          title: "完整布局",
        },
      ]}
      description="Pagination 按 Element Plus 的常见分页模型组织能力，支持页码按钮、背景态、总数、每页条数切换与快速跳转，同时保留旧的前后翻页回调。"
      notes={[
        "当列表需要明确总数、页码跳转与页容量切换时，直接使用这一套组合开关，不要让业务页自己拼分页条。",
        "旧页面如果只依赖 page / totalPages / onPrevious / onNext，仍然可以继续工作；新页面优先使用 onPageChange。",
        "总页数未知或天然无限滚动的场景不要硬套 Pagination，应该回到加载更多或虚拟列表模式。",
      ]}
      title="Pagination"
    />
  );
}

function DataTableSectionPage() {
  const [page, setPage] = useState(2);

  return (
    <ShowcaseDocPage
      apiItems={[
        { description: "区块标题。", name: "title", required: true, type: "ReactNode" },
        { description: "区块说明。", name: "description", type: "ReactNode" },
        { description: "表格与分页等内容区。", name: "children", required: true, type: "ReactNode" },
      ]}
      categoryLabel="页面模式"
      demos={[
        {
          code: `<DataTableSection title="用户列表" description="当前共 3 条记录。">
  <Table>...</Table>
</DataTableSection>`,
          content: (
            <DataTableSection description="把标题、数据说明和列表内容收成同一个数据区块。" title="用户列表">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>编号</TableHead>
                    <TableHead>姓名</TableHead>
                    <TableHead>角色</TableHead>
                    <TableHead>状态</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tableRows.map((row) => (
                    <TableRow key={`section-${row.id}`}>
                      <TableCell>{row.id}</TableCell>
                      <TableCell>{row.name}</TableCell>
                      <TableCell>{row.role}</TableCell>
                      <TableCell>
                        <StatusBadge status={row.status} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </DataTableSection>
          ),
          description: "最小形态下就是“标题 + 数据区”，适合标准列表页主内容块。",
          title: "基础数据区块",
        },
        {
          code: `<DataTableSection title="发布记录" description="当前共 36 条结果。">
  <Table>...</Table>
  <Pagination page={page} totalPages={6} showPager onPageChange={setPage} />
</DataTableSection>`,
          content: (
            <DataTableSection description="完整模式里通常会把表格、分页和说明文字放在同一个区块中。" title="发布记录">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>服务</TableHead>
                    <TableHead>版本</TableHead>
                    <TableHead>负责人</TableHead>
                    <TableHead>状态</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell>gateway</TableCell>
                    <TableCell>v2.4.1</TableCell>
                    <TableCell>张三</TableCell>
                    <TableCell><StatusBadge status="运行中" /></TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>order-api</TableCell>
                    <TableCell>v2.3.9</TableCell>
                    <TableCell>李四</TableCell>
                    <TableCell><StatusBadge status="停用" /></TableCell>
                  </TableRow>
                </TableBody>
              </Table>
              <Pagination onPageChange={setPage} page={page} showPager totalPages={6} />
            </DataTableSection>
          ),
          description: "分页和列表说明跟着 DataTableSection 走，可以减少页面层重复拼装。",
          title: "表格 + 分页组合",
        },
      ]}
      description="DataTableSection 用来承接标题、说明、表格与分页，是后台列表页最稳定的主内容容器。"
      notes={[
        "列表页优先先有数据区块，再谈表格细节，不要直接把 Table 裸放在页面里。",
        "分页、统计说明和空态应跟随同一个数据区块收口。",
      ]}
      title="DataTableSection"
    />
  );
}

function TabsPage() {
  return (
    <ShowcaseDocPage
      apiItems={[
        { description: "标签页根节点。", name: "Tabs", type: "Radix Root" },
        { description: "标签栏容器。", name: "TabsList", type: "Radix List" },
        { description: "单个标签按钮。", name: "TabsTrigger", type: "Radix Trigger" },
        { description: "标签页内容区。", name: "TabsContent", type: "Radix Content" },
        { description: "当前激活值。", name: "value / defaultValue", type: "string" },
      ]}
      categoryLabel="数据展示"
      demos={[
        {
          code: `<Tabs defaultValue="overview">
  <TabsList>
    <TabsTrigger value="overview">概览</TabsTrigger>
    <TabsTrigger value="logs">日志</TabsTrigger>
  </TabsList>
</Tabs>`,
          content: (
            <Tabs defaultValue="overview">
              <TabsList>
                <TabsTrigger value="overview">概览</TabsTrigger>
                <TabsTrigger value="metrics">指标</TabsTrigger>
                <TabsTrigger value="logs">日志</TabsTrigger>
              </TabsList>
              <TabsContent value="overview">
                <InlineNotice title="视图说明">标签页适合组织同一业务对象的多维内容。</InlineNotice>
              </TabsContent>
              <TabsContent value="metrics">
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
          ),
          description: "覆盖标签切换与内容分层的标准场景。",
          title: "基础标签页",
        },
        {
          code: `<Tabs defaultValue="active">
  <TabsList>
    <TabsTrigger value="active">运行中</TabsTrigger>
    <TabsTrigger disabled value="archived">历史归档</TabsTrigger>
  </TabsList>
</Tabs>`,
          content: (
            <Tabs defaultValue="active">
              <TabsList>
                <TabsTrigger value="active">运行中</TabsTrigger>
                <TabsTrigger value="pending">待发布</TabsTrigger>
                <TabsTrigger disabled value="archived">
                  历史归档
                </TabsTrigger>
              </TabsList>
              <TabsContent value="active">
                <InlineNotice title="运行中">当前存在 3 个活跃任务。</InlineNotice>
              </TabsContent>
              <TabsContent value="pending">
                <InlineNotice title="待发布" type="warning">
                  有 2 个计划等待审批。
                </InlineNotice>
              </TabsContent>
            </Tabs>
          ),
          description: "禁用页签用于明确“当前不可访问但存在”的内容。",
          title: "禁用与状态",
        },
      ]}
      description="Tabs 用于切分同一页面下的平级内容区域，展示基础页签、禁用页签和内容分层。"
      notes={["标签页内容必须语义平级。", "如果每个标签都很重，优先独立路由而不是塞在 Tabs 里。"]}
      title="Tabs"
    />
  );
}

function ProgressPage() {
  return (
    <ShowcaseDocPage
      apiItems={[
        { description: "当前进度百分比。", name: "percentage", required: true, type: "number" },
        { defaultValue: '"default"', description: "进度条语义状态。", name: "status", type: '"default" | "success" | "warning" | "danger" | "info"' },
        { defaultValue: '"default"', description: "尺寸。", name: "size", type: '"large" | "default" | "small"' },
        { defaultValue: "true", description: "是否显示右侧百分比文字。", name: "showText", type: "boolean" },
        { defaultValue: "false", description: "是否显示不定进度态。", name: "indeterminate", type: "boolean" },
        { description: "标题、说明和自定义文本。", name: "label / description / text", type: "ReactNode" },
      ]}
      categoryLabel="数据展示"
      demos={[
        {
          code: `<div className="grid gap-4">
  <Progress label="发布镜像" percentage={28} />
  <Progress label="灰度验证" percentage={64} status="warning" />
  <Progress label="生产完成" percentage={100} status="success" />
</div>`,
          content: (
            <div className="grid gap-4">
              <Progress description="镜像构建和制品上传。" label="发布镜像" percentage={28} />
              <Progress description="正在等待观测指标稳定。" label="灰度验证" percentage={64} status="warning" />
              <Progress description="流水线已收口。" label="生产完成" percentage={100} status="success" />
            </div>
          ),
          description: "基础百分比状态，适合任务、上传和流程推进。",
          title: "基础进度",
        },
        {
          code: `<div className="grid gap-4">
  <Progress percentage={16} size="small" status="info" />
  <Progress percentage={52} status="danger" />
  <Progress indeterminate percentage={78} text="处理中" />
</div>`,
          content: (
            <div className="grid gap-4">
              <Progress description="同步索引" percentage={16} size="small" status="info" />
              <Progress description="校验失败，等待补偿。" percentage={52} status="danger" />
              <Progress description="后端轮询中。" indeterminate label="审批流转" percentage={78} text="处理中" />
            </div>
          ),
          description: "覆盖尺寸、风险态和不定进度态。",
          title: "状态与尺寸",
        },
        {
          code: `<div className="grid gap-4 md:grid-cols-2">
  <Card>...<Progress percentage={72} /></Card>
  <Card>...<Progress percentage={35} status="warning" /></Card>
</div>`,
          content: (
            <div className="grid gap-4 md:grid-cols-2">
              <TaskStatusCard
                description="核心服务正在预发灰度。"
                items={detailItems}
                status="运行中"
                title="订单服务发布"
                actions={<Progress description="当前已完成 72% 任务步骤。" percentage={72} showText={false} />}
              />
              <TaskStatusCard
                description="仍有人工审批未通过。"
                items={detailItems}
                status="queued"
                title="权限回收任务"
                actions={<Progress description="当前等待审批，流程推进较慢。" percentage={35} showText={false} status="warning" />}
              />
            </div>
          ),
          description: "进度条可嵌入卡片、表单和任务摘要，而不是只放在独立页头。",
          title: "组合场景",
        },
      ]}
      description="Progress 用于表达百分比推进和过程态，适合上传、流水线、审批和长任务。"
      notes={[
        "进度条只表达推进程度，不承担错误详情和操作入口。",
        "当进度无法精确计算时，优先使用 indeterminate，而不是伪造百分比。",
      ]}
      title="Progress"
    />
  );
}

function StatStripPage() {
  return (
    <ShowcaseDocPage
      apiItems={[
        { description: "统计项数组。", name: "items", required: true, type: 'Array<{ label: ReactNode; value: ReactNode }>' },
        { description: "可直接嵌入 Tabs、Card 或概览页头部。", name: "children usage", type: "layout pattern" },
      ]}
      categoryLabel="页面模式"
      demos={[
        {
          code: `<StatStrip
  items={[
    { label: "执行批次", value: "32" },
    { label: "平均时长", value: "1.8m" },
    { label: "错误数", value: "0" },
    { label: "回滚次数", value: "1" },
  ]}
/>`,
          content: (
            <StatStrip
              items={[
                { label: "执行批次", value: "32" },
                { label: "平均时长", value: "1.8m" },
                { label: "错误数", value: "0" },
                { label: "回滚次数", value: "1" },
              ]}
            />
          ),
          description: "把一组轻量关键指标收成一条统计带，适合页头下方或标签内容区。",
          title: "基础统计带",
        },
        {
          code: `<Card>
  <CardHeader>...</CardHeader>
  <CardContent>
    <StatStrip items={[...]} />
  </CardContent>
</Card>`,
          content: (
            <Card>
              <CardHeader>
                <CardTitle>发布窗口摘要</CardTitle>
                <CardDescription>适合作为任务页或详情页顶部的轻量信息带。</CardDescription>
              </CardHeader>
              <CardContent>
                <StatStrip
                  items={[
                    { label: "负责人", value: "张三" },
                    { label: "当前环境", value: "staging" },
                    { label: "待审批", value: "2" },
                    { label: "预计完成", value: "21:40" },
                  ]}
                />
              </CardContent>
            </Card>
          ),
          description: "当信息密度高但不值得做成卡片矩阵时，StatStrip 更轻。",
          title: "嵌入详情头部",
        },
      ]}
      description="StatStrip 用于在页头、标签页和详情顶部快速展示一排稳定的关键统计，不需要拆成多张卡片。"
      notes={[
        "更适合低层级的稳定指标，不要把复杂交互和说明文本塞进统计带。",
        "当指标需要单独强调或数量不均衡时，优先改用 MetricCard。",
      ]}
      title="StatStrip"
    />
  );
}

function AvatarPage() {
  return (
    <ShowcaseDocPage
      apiItems={[
        { description: "头像图片地址。", name: "src", type: "string" },
        { description: "姓名或回退文案，会生成首字母。", name: "name / fallback", type: "ReactNode" },
        { defaultValue: '"default"', description: "尺寸。", name: "size", type: '"large" | "default" | "small" | number' },
        { defaultValue: '"circle"', description: "形状。", name: "shape", type: '"circle" | "square"' },
        { description: "在线状态点。", name: "status", type: '"online" | "offline" | "busy" | "warning"' },
        { defaultValue: "false", description: "是否显示描边。", name: "bordered", type: "boolean" },
      ]}
      categoryLabel="数据展示"
      demos={[
        {
          code: `<div className="flex flex-wrap gap-3">
  <Avatar name="张三" size="large" />
  <Avatar name="Li Si" />
  <Avatar name="王五" size="small" />
</div>`,
          content: (
            <div className="flex flex-wrap gap-3">
              <Avatar bordered name="张三" size="large" />
              <Avatar name="Li Si" />
              <Avatar name="王五" size="small" />
            </div>
          ),
          description: "基础头像支持不同尺寸和自动首字母回退。",
          title: "尺寸矩阵",
        },
        {
          code: `<div className="flex flex-wrap gap-3">
  <Avatar name="Ops" status="online" />
  <Avatar name="QA" shape="square" status="busy" />
  <Avatar fallback={<Bell className="h-4 w-4" />} status="warning" />
</div>`,
          content: (
            <div className="flex flex-wrap gap-3">
              <Avatar name="Ops" status="online" />
              <Avatar bordered name="QA" shape="square" status="busy" />
              <Avatar fallback={<Bell className="h-4 w-4" />} status="warning" />
            </div>
          ),
          description: "状态点和方形头像更适合成员列表、环境看板和资产卡片。",
          title: "状态与形状",
        },
        {
          code: `<div className="grid gap-3">
  <div className="flex items-center gap-3 rounded-surface border p-3">
    <Avatar name="张三" status="online" />
    <div>...</div>
  </div>
</div>`,
          content: (
            <div className="grid gap-3">
              <div className="flex items-center gap-3 rounded-surface border border-border/70 bg-card p-3">
                <Avatar bordered name="张三" status="online" />
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-foreground">张三</div>
                  <div className="text-xs text-muted-foreground">系统管理员 · 在线</div>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-surface border border-border/70 bg-card p-3">
                <Avatar name="李四" shape="square" status="busy" />
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-foreground">李四</div>
                  <div className="text-xs text-muted-foreground">发布工程师 · 审批中</div>
                </div>
              </div>
            </div>
          ),
          description: "典型成员摘要卡，不需要业务页自己再包一层头像样式。",
          title: "列表场景",
        },
      ]}
      description="Avatar 用于表达用户、服务账号和环境主体，支持回退文案、形状、尺寸和在线状态点。"
      notes={[
        "没有稳定图片源时，优先传 name 让组件自己生成回退内容。",
        "状态点只表达在线/忙碌等轻状态，复杂权限语义交给 Badge 或 StatusBadge。",
      ]}
      title="Avatar"
    />
  );
}

function IconPage() {
  const [selectedIcon, setSelectedIcon] = useState("database");
  const iconItems = [
    { key: "database", icon: <Database className="h-5 w-5" />, label: "Database", description: "数据源、表结构、存储能力", meta: "data" },
    { key: "shield", icon: <Shield className="h-5 w-5" />, label: "Shield", description: "权限、审批、风险确认", meta: "security" },
    { key: "user", icon: <UserRound className="h-5 w-5" />, label: "User", description: "成员、租户和身份", meta: "identity" },
    { key: "bell", icon: <Bell className="h-5 w-5" />, label: "Bell", description: "通知、告警和提醒", meta: "feedback" },
  ];

  return (
    <ShowcaseDocPage
      apiItems={[
        { description: "图标项数组。", name: "items", required: true, type: 'Array<{ key: string; icon: ReactNode; label: ReactNode; description?: ReactNode; meta?: ReactNode }>' },
        { defaultValue: "4", description: "网格列数。", name: "columns", type: "2 | 3 | 4 | 5 | 6" },
        { description: "点击选择回调。", name: "onSelect", type: "(item) => void" },
        { description: "当前选中图标 key。", name: "selectedKey", type: "string" },
      ]}
      categoryLabel="数据展示"
      demos={[
        {
          code: `<IconGrid columns={4} items={iconItems} />`,
          content: <IconGrid columns={4} items={iconItems} />,
          description: "基础图标目录，适合展示可用图标语义和命名。",
          title: "基础图标目录",
        },
        {
          code: `<IconGrid columns={2} items={iconItems} selectedKey={selectedIcon} onSelect={(item) => setSelectedIcon(item.key)} />`,
          content: <IconGrid columns={2} items={iconItems} onSelect={(item) => setSelectedIcon(item.key)} selectedKey={selectedIcon} />,
          description: "支持选中态，适合图标选择器和配置页。",
          title: "选中态",
        },
        {
          code: `<div className="grid gap-4 md:grid-cols-[minmax(0,1.1fr)_18rem]">
  <IconGrid ... />
  <SectionCard ... />
</div>`,
          content: (
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_18rem]">
              <IconGrid columns={2} items={iconItems} onSelect={(item) => setSelectedIcon(item.key)} selectedKey={selectedIcon} />
              <KeyValueCard
                description="选中图标可以直接用于导航、状态卡和告警区。"
                items={[
                  { label: "当前 key", value: selectedIcon },
                  { label: "推荐场景", value: iconItems.find((item) => item.key === selectedIcon)?.description ?? "-" },
                ]}
                title="图标详情"
              />
            </div>
          ),
          description: "图标目录和说明侧栏组合，接近设计系统中的资产页体验。",
          title: "资产选择场景",
        },
      ]}
      description="IconGrid 用于承接后台图标目录、图标选择器和语义说明，而不是业务页自己零散摆放图标。"
      notes={[
        "图标组件只承接展示和选择，不替代业务动作按钮。",
        "命名应与业务语义对齐，避免同一功能换多种图标表达。",
      ]}
      title="Icon"
    />
  );
}

function ImagePage() {
  return (
    <ShowcaseDocPage
      apiItems={[
        { description: "图片源，可传字符串或带 variants 的资源对象。", name: "src", required: true, type: "string | ImageAsset" },
        { description: "加载失败时的兜底图片。", name: "fallbackSrc", type: "string" },
        { description: "可选的尺寸档位列表。", name: "variantSizes", type: "number[]" },
        { description: "原生图片属性。", name: "alt / className / loading", type: "ImgHTMLAttributes<HTMLImageElement>" },
      ]}
      categoryLabel="页面模式"
      demos={[
        {
          code: `<Image alt="Go Admin avatar" className="h-20 w-20 rounded-2xl object-cover" src={demoImageSource} />`,
          content: <Image alt="Go Admin avatar" className="h-20 w-20 rounded-2xl object-cover" src={demoImageSource} />,
          description: "组件支持直接传入资源对象，后续可根据渲染尺寸自动选择合适档位。",
          title: "资源对象模式",
        },
        {
          code: `<div className="grid gap-4 md:grid-cols-2">
  <Image alt="封面图" className="aspect-[4/3] w-full rounded-2xl object-cover" src={demoAvatarImage} />
  <Card>...</Card>
</div>`,
          content: (
            <div className="grid gap-4 md:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
              <Image alt="封面图" className="aspect-[4/3] w-full rounded-2xl object-cover border border-border/70" src={demoAvatarImage} />
              <Card>
                <CardHeader>
                  <CardTitle>图片承接规范</CardTitle>
                  <CardDescription>统一通过 Image 接组件内头像、封面、Logo 和文档示意图。</CardDescription>
                </CardHeader>
                <CardContent className="text-sm leading-7 text-muted-foreground">
                  当宿主站点后续接入多尺寸资源时，页面层不需要再单独处理变体路径拼接。
                </CardContent>
              </Card>
            </div>
          ),
          description: "同一个组件既可承接头像，也可承接文档和卡片中的较大图像。",
          title: "内容区图片",
        },
      ]}
      description="Image 统一封装后台里的图片展示逻辑，支持普通路径、资源对象和多尺寸变体选择。"
      notes={[
        "页面层不要自己拼接图片变体路径，统一交给 Image 与资源对象能力承接。",
        "头像、封面和品牌图都优先使用同一个组件，避免不同页面行为漂移。",
      ]}
      title="Image"
    />
  );
}

function LogViewerPage() {
  const successLog = `[21:32:01] prepare release assets
[21:32:04] upload package to staging
[21:32:09] run smoke test
[21:32:15] finish with success`;
  const errorLog = `[22:01:01] start deploy pipeline
[22:01:09] run pre-check failed
[22:01:10] reason: missing permission monitor:service:list
[22:01:11] rollback scheduled`;

  return (
    <ShowcaseDocPage
      apiItems={[
        { description: "日志标题。", name: "title", required: true, type: "ReactNode" },
        { description: "日志内容。", name: "log", required: true, type: "string" },
        { description: "补充说明。", name: "description", type: "ReactNode" },
      ]}
      categoryLabel="数据展示"
      demos={[
        {
          code: `<LogViewer title="实时日志" log={logText} />`,
          content: <LogViewer description="适合接入流式日志、部署日志或审计日志。" log={successLog} title="实时日志" />,
          description: "基础日志窗口用于承接流式文本输出。",
          title: "基础日志",
        },
        {
          code: `<div className="grid gap-4">
  <LogViewer title="成功流水" log={successLog} />
  <LogViewer title="失败流水" log={errorLog} />
</div>`,
          content: (
            <div className="grid gap-4">
              <LogViewer description="最近一次成功发布记录。" log={successLog} title="成功流水" />
              <LogViewer description="失败示例，建议搭配顶部告警条。" log={errorLog} title="失败流水" />
            </div>
          ),
          description: "同一页面可同时展示不同阶段日志，便于比对。",
          title: "状态对比",
        },
      ]}
      description="LogViewer 用于承接部署日志、任务日志和审计日志等流式文本内容。"
      notes={["日志页重点是可读性和滚动体验，不要额外堆视觉元素。", "日志过滤、搜索和流式更新由业务层包裹实现。"]}
      title="LogViewer"
    />
  );
}

function DetailGridPage() {
  return (
    <ShowcaseDocPage
      apiItems={[
        { description: "详情项数组。", name: "items", required: true, type: 'Array<{ label: ReactNode; value: ReactNode }>' },
        { defaultValue: "2", description: "列数。", name: "columns", type: "1 | 2 | 3" },
        { description: "额外样式类。", name: "className", type: "string" },
      ]}
      categoryLabel="数据展示"
      demos={[
        {
          code: `<DefinitionList columns={2}>
  <DetailItem label="租户" value="local" />
  <DetailItem label="负责人" value="张三" />
</DefinitionList>`,
          content: (
            <DefinitionList columns={2}>
              <DetailItem label="租户" value="local" />
              <DetailItem label="负责人" value="张三" />
              <DetailItem label="环境" value="staging" />
              <DetailItem label="区域" value="华东机房" />
            </DefinitionList>
          ),
          description: "DefinitionList + DetailItem 适合最小键值信息块。",
          title: "基础键值",
        },
        {
          code: `<DetailGrid items={detailItems} />
<DetailGrid columns={3} items={detailItems} />`,
          content: (
            <div className="grid gap-4">
              <DetailGrid items={detailItems} />
              <DetailGrid columns={3} items={detailItems} />
            </div>
          ),
          description: "DetailGrid 支持列数调整，适配不同信息密度。",
          title: "网格布局",
        },
        {
          code: `<KeyValueCard title="发布详情" description="用于承接一组稳定的详情键值。" items={detailItems} />`,
          content: <KeyValueCard description="用于承接一组稳定的详情键值。" items={detailItems} title="发布详情" />,
          description: "KeyValueCard 可直接落地为详情页中的独立卡片。",
          title: "卡片组合",
        },
      ]}
      description="DefinitionList、DetailItem、DetailGrid 和 KeyValueCard 组成后台详情展示的基础族。"
      notes={["详情展示统一用 DetailGrid 体系，避免详情页自己拼栅格。", "值字段里如有状态，直接放 Badge 或 StatusBadge。"]}
      title="DetailGrid"
    />
  );
}

function TaskStatusCardPage() {
  return (
    <ShowcaseDocPage
      apiItems={[
        { description: "卡片标题。", name: "title", required: true, type: "ReactNode" },
        { description: "业务状态。", name: "status", required: true, type: "string" },
        { description: "详情项数组。", name: "items", required: true, type: 'Array<{ label: ReactNode; value: ReactNode }>' },
        { description: "补充说明与操作区。", name: "description / actions", type: "ReactNode" },
      ]}
      categoryLabel="数据展示"
      demos={[
        {
          code: `<TaskStatusCard
  title="部署任务"
  status="运行中"
  items={[...]}
/>`,
          content: (
            <TaskStatusCard
              actions={
                <Button type="button" variant="outline">
                  查看日志
                </Button>
              }
              description="当前版本正在预发环境灰度发布。"
              items={detailItems}
              status="运行中"
              title="部署任务"
            />
          ),
          description: "标准状态卡适合承接“状态 + 关键详情 + 单动作”。",
          title: "基础状态卡",
        },
        {
          code: `<div className="grid gap-4">
  <TaskStatusCard status="运行中" ... />
  <TaskStatusCard status="停用" ... />
</div>`,
          content: (
            <div className="grid gap-4">
              <TaskStatusCard
                actions={
                  <Button type="button" variant="outline">
                    查看详情
                  </Button>
                }
                description="任务执行正常。"
                items={detailItems}
                status="运行中"
                title="发布任务 #A-1024"
              />
              <TaskStatusCard
                actions={
                  <Button type="button" variant="outline">
                    重新执行
                  </Button>
                }
                description="任务因权限缺失被中断。"
                items={detailItems}
                status="停用"
                title="发布任务 #A-1025"
              />
            </div>
          ),
          description: "并列展示多状态卡片，适合作为任务看板区域。",
          title: "状态组合",
        },
      ]}
      description="TaskStatusCard 用于承接任务状态和关键信息，是状态型卡片的组合件。"
      notes={["状态卡应同时表达总体状态和关键上下文。", "操作区只放任务级动作，不要塞二级筛选。"]}
      title="TaskStatusCard"
    />
  );
}

function KeyValueCardPage() {
  return (
    <ShowcaseDocPage
      apiItems={[
        { description: "卡片标题。", name: "title", required: true, type: "ReactNode" },
        { description: "卡片说明。", name: "description", type: "ReactNode" },
        { description: "键值项数组。", name: "items", required: true, type: 'Array<{ label: ReactNode; value: ReactNode }>' },
      ]}
      categoryLabel="数据展示"
      demos={[
        {
          code: `<KeyValueCard
  title="发布详情"
  description="用于承接一组稳定的详情键值。"
  items={detailItems}
/>`,
          content: <KeyValueCard description="用于承接一组稳定的详情键值。" items={detailItems} title="发布详情" />,
          description: "最适合详情页右侧面板、弹窗摘要和主从布局里的固定说明块。",
          title: "基础卡片",
        },
        {
          code: `<div className="grid gap-4 md:grid-cols-2">
  <KeyValueCard ... />
  <TaskStatusCard ... />
</div>`,
          content: (
            <div className="grid gap-4 md:grid-cols-2">
              <KeyValueCard
                description="当前选中服务的静态基础信息。"
                items={[
                  { label: "服务名", value: "gateway" },
                  { label: "负责人", value: "张三" },
                  { label: "环境", value: "staging" },
                  { label: "最近发布", value: "2026-04-09 21:30" },
                ]}
                title="服务详情"
              />
              <Card>
                <CardHeader>
                  <CardTitle>组合方式</CardTitle>
                  <CardDescription>通常与状态卡、日志块或备注卡并列出现。</CardDescription>
                </CardHeader>
                <CardContent className="text-sm leading-7 text-muted-foreground">
                  KeyValueCard 负责稳定键值，不承担长文本和过程信息。
                </CardContent>
              </Card>
            </div>
          ),
          description: "详情页里让 KeyValueCard 专注承接稳定字段，能显著降低布局复杂度。",
          title: "详情区组合",
        },
      ]}
      description="KeyValueCard 是 DetailGrid 体系上的卡片封装，适合把一组稳定的详情键值收成单独信息块。"
      notes={[
        "长文本、日志和动态过程不要继续塞在 KeyValueCard 里，应该交给其他详情块处理。",
        "字段数量过多时优先拆成多张卡片，而不是把单卡越拉越长。",
      ]}
      title="KeyValueCard"
    />
  );
}

function CommitListPage() {
  return (
    <ShowcaseDocPage
      apiItems={[
        { description: "提交数组。", name: "commits", required: true, type: 'Array<{ hash: string; message: string }>' },
        { description: "标题与说明。", name: "title / description", required: true, type: "ReactNode" },
        { description: "空态文案。", name: "emptyLabel", type: "ReactNode" },
      ]}
      categoryLabel="数据展示"
      demos={[
        {
          code: `<CommitList title="最近提交" commits={commits} />`,
          content: <CommitList commits={commits} description="当前版本关联的最近提交。" title="最近提交" />,
          description: "展示版本关联提交，适合发布详情和变更摘要页。",
          title: "基础提交列表",
        },
        {
          code: `<CommitList title="最近提交" commits={[]} emptyLabel="暂无关联提交" />`,
          content: (
            <div className="grid gap-4">
              <CommitList commits={[]} description="当前版本还没有关联代码提交。" emptyLabel="暂无关联提交" title="空态示例" />
              <CommitList commits={commits.slice(0, 2)} description="仅展示最近两条关键提交。" title="精简列表" />
            </div>
          ),
          description: "空态和精简模式都由组件本身承接，不需要业务页重写。",
          title: "空态与精简",
        },
      ]}
      description="CommitList 适合展示版本关联提交、变更摘要和交付记录。"
      notes={["提交列表适合只读汇总，不承担复杂筛选。", "hash、标题和状态信息应该一眼看清。"]}
      title="CommitList"
    />
  );
}

function VirtualListPage() {
  const services = Array.from({ length: 160 }, (_, index) => ({
    id: `svc-${index + 1}`,
    latency: 40 + (index % 9) * 12,
    name: `ops-worker-${String(index + 1).padStart(3, "0")}`,
    owner: ["平台组", "风控组", "订单组", "审计组"][index % 4],
  }));

  return (
    <ShowcaseDocPage
      apiItems={[
        { description: "列表数据数组。", name: "items", required: true, type: "readonly Item[]" },
        { defaultValue: "56", description: "初始估算高度；渲染后会被真实内容高度覆盖。", name: "estimatedItemSize", type: "number" },
        { description: "按项返回更精细的预估高度，适合不等高场景。", name: "getEstimatedItemSize", type: "(item, index) => number" },
        { defaultValue: "4", description: "上下额外渲染的缓冲项数量。", name: "overscan", type: "number" },
        { description: "滚动容器根节点插槽，适合直接塞一个 HTML 容器。", name: "rootSlot", type: "ReactElement" },
        { description: "无数据时的空态内容。", name: "empty", type: "ReactNode" },
        { description: "单项渲染函数。", name: "children", required: true, type: "(item, index) => ReactNode" },
      ]}
      categoryLabel="数据展示"
      demos={[
        {
          code: `const services = Array.from({ length: 160 }, (_, index) => ({ id: index, name: \`ops-worker-\${index}\` }));

<AppVirtualList
  estimatedItemSize={72}
  items={services}
  rootSlot={<section className="h-80 rounded-2xl border border-border bg-card" />}
  viewportClassName="p-3"
>
  {(item) => <article className="flex h-full items-center rounded-xl border px-4">{item.name}</article>}
</AppVirtualList>`,
          content: (
            <AppVirtualList
              estimatedItemSize={72}
              getItemKey={(item) => item.id}
              items={services}
              rootSlot={<section className="h-80 rounded-2xl border border-border bg-card shadow-sm" />}
              viewportClassName="p-3"
            >
              {(item, index) => (
                <article className="flex items-center justify-between rounded-xl border border-border/70 bg-background px-4 py-3 shadow-sm">
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-foreground">{item.name}</p>
                    <p className="text-xs text-muted-foreground">{item.owner} 负责维护</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">P95 延迟</p>
                    <p className="text-sm font-semibold text-foreground">{item.latency} ms</p>
                    <p className="text-[11px] text-muted-foreground">#{String(index + 1).padStart(3, "0")}</p>
                  </div>
                </article>
              )}
            </AppVirtualList>
          ),
          description: "组件先用估算高度完成初次布局，随后按真实内容高度重排。根容器通过 rootSlot 直接接一个 HTML 节点。",
          title: "rootSlot 容器插槽",
        },
        {
          code: `<AppVirtualList
  empty={<div className="rounded-xl border border-dashed px-4 py-8 text-sm text-muted-foreground">暂无任务</div>}
  estimatedItemSize={56}
  items={[]}
  rootSlot={<section className="h-48 rounded-2xl border border-border bg-card" />}
  viewportClassName="p-3"
>
  {(item) => <div>{item.name}</div>}
</AppVirtualList>`,
          content: (
            <Card>
              <CardHeader>
                <CardTitle>空态承接</CardTitle>
                <CardDescription>无数据时不需要页面层额外判断，直接让组件承接空态。</CardDescription>
              </CardHeader>
              <CardContent>
                <AppVirtualList
                  empty={<div className="rounded-xl border border-dashed border-border px-4 py-8 text-sm text-muted-foreground">当前没有待处理任务</div>}
                  estimatedItemSize={56}
                  items={[]}
                  rootSlot={<section className="h-48 rounded-2xl border border-border bg-background" />}
                  viewportClassName="p-3"
                >
                  {() => <div />}
                </AppVirtualList>
              </CardContent>
            </Card>
          ),
          description: "组件直接承接空态，可以减少业务页在滚动容器外再包一层判断。",
          title: "空态兜底",
        },
      ]}
      description="AppVirtualList 是 `AppScrollbar` 之上的动态高度虚拟滚动能力，目标是让后台长列表只靠一个容器插槽和一个渲染函数就能接入。"
      notes={["estimatedItemSize 只是首屏估算值，真实位置以后续测量结果为准。", "高度变化发生在当前视口上方时，组件会按锚点修正 scrollTop，尽量避免跳动。", "rootSlot 负责外层滚动容器，列表内容仍建议在 children 中输出清晰的单项结构。"]}
      title="AppVirtualList"
    />
  );
}

function WideTablePatternsPage() {
  return (
    <ShowcaseDocPage
      apiItems={[
        { description: "标准业务列表方案，包含视图 tabs、横向滚动、sticky 身份列和虚拟化开关。", name: "WorkbenchWideTablePattern", required: true, type: "React component" },
        { description: "日志/工单型方案，主列表摘要化，详情信息移入右侧详情栏。", name: "DetailSplitTablePattern", required: true, type: "React component" },
        { description: "分组盘点型方案，按区域或阶段切块，每组内部支持宽表和虚拟化。", name: "GroupedMetricTablePattern", required: true, type: "React component" },
      ]}
      categoryLabel="数据展示"
      demos={[
        {
          code: `<WorkbenchWideTablePattern />`,
          content: <WorkbenchWideTablePattern />,
          description: "适合订单、用户、商品这类标准 CRUD 工作台。中等宽度下单元格自动换行，小屏保留横向滚动而不把页面整体拖宽。",
          title: "方案 A · 工作台宽表",
        },
        {
          code: `<DetailSplitTablePattern />`,
          content: <DetailSplitTablePattern />,
          description: "适合日志、审批、工单。主列表只保留扫读信息，长文本、备注和原始负载都在详情栏里承接。",
          title: "方案 B · 列表 + 详情栏",
        },
        {
          code: `<GroupedMetricTablePattern />`,
          content: <GroupedMetricTablePattern />,
          description: "适合区域经营盘点、履约看板、分阶段报表。组头先给语义，再在组内横向比指标。",
          title: "方案 C · 分组宽表",
        },
      ]}
      description="这页不是在展示单个低阶表格控件，而是在展示三种更接近真实 B 端后台的宽表骨架：工作台宽表、列表 + 详情栏、分组宽表。三套方案都已经接了虚拟化开关，并针对中等宽度做了换行与重排处理。"
      notes={[
        "宽表先做视图分流，再谈虚拟化；虚拟化只解决性能，不解决信息架构。",
        "身份列优先做复合单元格，减少 1 到 3 个散列，避免在中屏时直接爆宽。",
        "日志、备注、原始负载不应该继续占主表列，应该通过详情栏、展开区或独立详情承接。",
      ]}
      title="Wide Table Patterns"
    />
  );
}

export const dataRoutes: ShowcaseRoute[] = [
  { component: TablePage, label: "Table", path: "/data/table", shortLabel: "TBL", summaryKey: "showcase.route.data.table.summary" },
  { component: DataTableSectionPage, label: "DataTableSection", path: "/patterns/data-table-section", shortLabel: "DTS", summaryKey: "showcase.route.patterns.data-table-section.summary" },
  { component: PaginationPage, label: "Pagination", path: "/data/pagination", shortLabel: "PAG", summaryKey: "showcase.route.data.pagination.summary" },
  { component: TabsPage, label: "Tabs", path: "/data/tabs", shortLabel: "TAB", summaryKey: "showcase.route.data.tabs.summary" },
  { component: ProgressPage, label: "Progress", path: "/data/progress", shortLabel: "PRG", summaryKey: "showcase.route.data.progress.summary" },
  { component: StatStripPage, label: "StatStrip", path: "/patterns/stat-strip", shortLabel: "STR", summaryKey: "showcase.route.patterns.stat-strip.summary" },
  { component: AvatarPage, label: "Avatar", path: "/data/avatar", shortLabel: "AVT", summaryKey: "showcase.route.data.avatar.summary" },
  { component: ImagePage, label: "Image", path: "/data/image", shortLabel: "IMG", summaryKey: "showcase.route.data.image.summary" },
  { component: IconPage, label: "Icon", path: "/data/icon", shortLabel: "ICN", summaryKey: "showcase.route.data.icon.summary" },
  { component: LogViewerPage, label: "LogViewer", path: "/data/log-viewer", shortLabel: "LOG", summaryKey: "showcase.route.data.log-viewer.summary" },
  { component: VirtualListPage, label: "AppVirtualList", path: "/data/virtual-list", shortLabel: "VTL", summaryKey: "showcase.route.data.virtual-list.summary" },
  { component: WideTablePatternsPage, label: "Wide Table Patterns", path: "/patterns/wide-table-patterns", shortLabel: "WDT", summaryKey: "showcase.route.data.wide-table-patterns.summary" },
  { component: DetailGridPage, label: "DetailGrid", path: "/data/detail-grid", shortLabel: "DTL", summaryKey: "showcase.route.data.detail-grid.summary" },
  { component: KeyValueCardPage, label: "KeyValueCard", path: "/data/key-value-card", shortLabel: "KVC", summaryKey: "showcase.route.data.key-value-card.summary" },
  { component: TaskStatusCardPage, label: "TaskStatusCard", path: "/data/task-status-card", shortLabel: "TSK", summaryKey: "showcase.route.data.task-status-card.summary" },
  { component: CommitListPage, label: "CommitList", path: "/data/commit-list", shortLabel: "CMT", summaryKey: "showcase.route.data.commit-list.summary" },
];

export const dataCategory: ShowcaseCategory = {
  descriptionKey: "showcase.category.data.description",
  key: "data",
  labelKey: "showcase.category.data.label",
  items: dataRoutes,
};
