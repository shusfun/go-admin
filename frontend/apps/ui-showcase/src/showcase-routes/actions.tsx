import { Bell, Settings2 } from "lucide-react";
import { useState } from "react";

import {
  AsyncActionButton,
  Badge,
  Breadcrumb,
  Button,
  RowActions,
  StatusBadge,
  ThemeToggle,
  toast,
} from "@go-admin/ui-admin";

import {
  ShowcaseDocPage,
  type ShowcaseCategory,
  type ShowcaseRoute,
} from "./shared";

function ButtonPage() {
  const [busy, setBusy] = useState(false);

  async function runAsyncDemo() {
    setBusy(true);
    await new Promise((resolve) => window.setTimeout(resolve, 1200));
    setBusy(false);
    toast.success("异步操作已完成");
  }

  return (
    <ShowcaseDocPage
      apiItems={[
        {
          defaultValue: '"primary"',
          description: "按钮类型，按 Element Plus 风格区分主操作、默认操作、成功、警告、危险、信息、文本与链接。",
          name: "variant",
          type: '"primary" | "default" | "success" | "warning" | "danger" | "info" | "text" | "link"',
        },
        { defaultValue: '"default"', description: "按钮尺寸。", name: "size", type: '"large" | "default" | "small"' },
        { defaultValue: "false", description: "浅色按钮态，适合次级强调。", name: "plain", type: "boolean" },
        { defaultValue: "false", description: "描边按钮态。", name: "outlined", type: "boolean" },
        { defaultValue: "false", description: "圆角胶囊按钮。", name: "round", type: "boolean" },
        { defaultValue: "false", description: "圆形图标按钮。", name: "circle", type: "boolean" },
        { defaultValue: "false", description: "是否禁用按钮。", name: "disabled", type: "boolean" },
        { description: "点击事件。", name: "onClick", type: "(event) => void" },
        { defaultValue: "false", description: "是否以 Slot 子节点方式渲染。", name: "asChild", type: "boolean" },
        { defaultValue: "false", description: "异步按钮是否进入 loading 态。", name: "loading", type: "boolean" },
      ]}
      categoryLabel="基础能力"
      demos={[
        {
          code: `<RowActions>
  <Button variant="primary">主要按钮</Button>
  <Button variant="default">默认按钮</Button>
  <Button variant="success">成功按钮</Button>
  <Button variant="warning">警告按钮</Button>
  <Button variant="danger">危险按钮</Button>
  <Button variant="info">信息按钮</Button>
  <Button variant="text">文本按钮</Button>
  <Button variant="link">链接按钮</Button>
</RowActions>`,
          content: (
            <RowActions>
              <Button type="button" variant="primary">主要按钮</Button>
              <Button type="button" variant="default">默认按钮</Button>
              <Button type="button" variant="success">成功按钮</Button>
              <Button type="button" variant="warning">警告按钮</Button>
              <Button type="button" variant="danger">危险按钮</Button>
              <Button type="button" variant="info">信息按钮</Button>
              <Button type="button" variant="text">文本按钮</Button>
              <Button type="button" variant="link">链接按钮</Button>
            </RowActions>
          ),
          description: "基础类型矩阵，覆盖后台常用操作语义。",
          title: "基础用法",
        },
        {
          code: `<RowActions>
  <Button plain variant="primary">朴素按钮</Button>
  <Button outlined variant="success">描边按钮</Button>
  <Button round variant="warning">圆角按钮</Button>
  <Button circle variant="info"><Settings2 className="h-4 w-4" /></Button>
</RowActions>`,
          content: (
            <RowActions>
              <Button plain type="button" variant="primary">朴素按钮</Button>
              <Button outlined type="button" variant="success">描边按钮</Button>
              <Button round type="button" variant="warning">圆角按钮</Button>
              <Button circle type="button" variant="info"><Settings2 className="h-4 w-4" /></Button>
              <Button circle outlined type="button" variant="danger"><Bell className="h-4 w-4" /></Button>
            </RowActions>
          ),
          description: "通过 plain / outlined / round / circle 组合表达层级和形态。",
          title: "变体组合",
        },
        {
          code: `<RowActions>
  <Button size="large">Large</Button>
  <Button size="default">Default</Button>
  <Button size="small">Small</Button>
  <AsyncActionButton loading={busy}>提交中</AsyncActionButton>
  <Button disabled variant="danger">禁用按钮</Button>
</RowActions>`,
          content: (
            <RowActions>
              <Button size="large" type="button" variant="primary">Large</Button>
              <Button size="default" type="button" variant="primary">Default</Button>
              <Button size="small" type="button" variant="primary">Small</Button>
              <AsyncActionButton loading={busy} onClick={() => void runAsyncDemo()} type="button" variant="primary">
                提交中
              </AsyncActionButton>
              <Button disabled type="button" variant="danger">禁用按钮</Button>
            </RowActions>
          ),
          description: "覆盖尺寸、异步 loading 与禁用状态。",
          title: "尺寸与状态",
        },
        {
          code: `<div className="flex flex-wrap items-center gap-3">
  <Button variant="primary">保存</Button>
  <Button variant="default">取消</Button>
  <Button variant="text">查看操作日志</Button>
  <Button variant="link">更多配置</Button>
  <Button circle outlined variant="default"><Bell className="h-4 w-4" /></Button>
</div>`,
          content: (
            <div className="flex flex-wrap items-center gap-3">
              <Button type="button" variant="primary">保存</Button>
              <Button type="button" variant="default">取消</Button>
              <Button type="button" variant="text">查看操作日志</Button>
              <Button type="button" variant="link">更多配置</Button>
              <Button circle outlined type="button" variant="default"><Bell className="h-4 w-4" /></Button>
            </div>
          ),
          description: "表单页常见主次动作组合：主操作、次操作、文本链接和图标入口。",
          title: "场景组合",
        },
      ]}
      description="Button 以 Element Plus 的按钮语义为基准，统一主按钮、默认按钮、状态按钮、浅色态、描边态、圆角态和图标态。"
      notes={[
        "优先通过 variant 和 plain / outlined / round / circle 组合表达层级，不要业务页自己拼颜色。",
        "异步请求统一走 AsyncActionButton，列表和表单页都保持同一套 loading 反馈。",
        "文本与链接按钮只做低权重动作，不要替代主按钮承担关键提交链路。",
      ]}
      title="Button"
    />
  );
}

function BadgePage() {
  return (
    <ShowcaseDocPage
      apiItems={[
        { defaultValue: '"primary"', description: "标签类型。", name: "type", type: '"primary" | "success" | "warning" | "danger" | "info" | "default"' },
        { defaultValue: '"light"', description: "标签视觉效果。", name: "effect", type: '"light" | "solid" | "plain"' },
        { defaultValue: '"default"', description: "标签尺寸。", name: "size", type: '"default" | "small"' },
      ]}
      categoryLabel="基础能力"
      demos={[
        {
          code: `<RowActions>
  <Badge type="primary">默认标签</Badge>
  <Badge type="success">成功</Badge>
  <Badge type="warning">警告</Badge>
  <Badge type="danger">危险</Badge>
</RowActions>`,
          content: (
            <RowActions>
              <Badge type="primary">默认标签</Badge>
              <Badge type="success">成功</Badge>
              <Badge type="warning">警告</Badge>
              <Badge type="danger">危险</Badge>
              <Badge type="info">信息</Badge>
              <Badge type="default">普通</Badge>
            </RowActions>
          ),
          description: "基础语义类型。",
          title: "基础类型",
        },
        {
          code: `<RowActions>
  <Badge effect="solid" type="primary">Solid</Badge>
  <Badge effect="plain" type="warning">Plain</Badge>
  <Badge effect="solid" size="small" type="info">Small</Badge>
</RowActions>`,
          content: (
            <RowActions>
              <Badge effect="solid" type="primary">Solid</Badge>
              <Badge effect="solid" type="success">Solid</Badge>
              <Badge effect="plain" type="warning">Plain</Badge>
              <Badge effect="plain" type="danger">Plain</Badge>
              <Badge effect="solid" size="small" type="info">Small</Badge>
            </RowActions>
          ),
          description: "effect 与 size 组合控制层级与密度。",
          title: "效果与尺寸",
        },
        {
          code: `<div className="flex flex-wrap items-center gap-2">
  <Badge type="default">开发环境</Badge>
  <Badge effect="solid" type="success">已上线</Badge>
  <Badge effect="plain" type="warning">需复核</Badge>
  <Badge size="small" type="info">v2.6.3</Badge>
</div>`,
          content: (
            <div className="flex flex-wrap items-center gap-2">
              <Badge type="default">开发环境</Badge>
              <Badge effect="solid" type="success">已上线</Badge>
              <Badge effect="plain" type="warning">需复核</Badge>
              <Badge size="small" type="info">v2.6.3</Badge>
            </div>
          ),
          description: "常见标签场景：环境、版本、流程提醒等轻量标记。",
          title: "业务标签场景",
        },
      ]}
      description="Badge 对齐 Element Plus 的标签型组件能力，使用 type + effect 组合表达标签色彩和层级。"
      notes={[
        "标签负责轻量语义，不负责完整业务状态机。",
        "列表页里的业务状态推荐交给 StatusBadge，Badge 更适合标签、环境和分类。",
        "同一视图内尽量控制不超过 2 种 effect，避免视觉噪音。",
      ]}
      title="Badge"
    />
  );
}

function StatusBadgePage() {
  return (
    <ShowcaseDocPage
      apiItems={[
        { description: "业务状态原文。", name: "status", required: true, type: "string" },
      ]}
      categoryLabel="导航与身份"
      demos={[
        {
          code: `<RowActions>
  <StatusBadge status="正常" />
  <StatusBadge status="停用" />
  <StatusBadge status="运行中" />
  <StatusBadge status="失败" />
</RowActions>`,
          content: (
            <RowActions>
              <StatusBadge status="正常" />
              <StatusBadge status="停用" />
              <StatusBadge status="运行中" />
              <StatusBadge status="失败" />
            </RowActions>
          ),
          description: "中文状态映射。",
          title: "业务状态映射",
        },
        {
          code: `<RowActions>
  <StatusBadge status="healthy" />
  <StatusBadge status="queued" />
  <StatusBadge status="failed" />
</RowActions>`,
          content: (
            <RowActions>
              <StatusBadge status="healthy" />
              <StatusBadge status="queued" />
              <StatusBadge status="failed" />
            </RowActions>
          ),
          description: "英文状态兼容映射。",
          title: "英文状态兼容",
        },
        {
          code: `<div className="grid gap-2">
  <div className="flex items-center justify-between rounded-surface border border-border bg-card px-3 py-2">
    <span className="text-sm text-foreground">订单同步任务</span>
    <StatusBadge status="运行中" />
  </div>
  <div className="flex items-center justify-between rounded-surface border border-border bg-card px-3 py-2">
    <span className="text-sm text-foreground">审计归档任务</span>
    <StatusBadge status="queued" />
  </div>
  <div className="flex items-center justify-between rounded-surface border border-border bg-card px-3 py-2">
    <span className="text-sm text-foreground">权限回收任务</span>
    <StatusBadge status="failed" />
  </div>
</div>`,
          content: (
            <div className="grid gap-2">
              <div className="flex items-center justify-between rounded-surface border border-border bg-card px-3 py-2">
                <span className="text-sm text-foreground">订单同步任务</span>
                <StatusBadge status="运行中" />
              </div>
              <div className="flex items-center justify-between rounded-surface border border-border bg-card px-3 py-2">
                <span className="text-sm text-foreground">审计归档任务</span>
                <StatusBadge status="queued" />
              </div>
              <div className="flex items-center justify-between rounded-surface border border-border bg-card px-3 py-2">
                <span className="text-sm text-foreground">权限回收任务</span>
                <StatusBadge status="failed" />
              </div>
            </div>
          ),
          description: "表格/列表行中的典型状态列呈现方式。",
          title: "列表场景",
        },
      ]}
      description="StatusBadge 内置常见状态到颜色的映射，适合列表和表格里的业务状态字段。"
      notes={[
        "优先传后端已有状态文本，减少前端二次映射。",
        "中英文状态可以并存，但建议在业务层逐步收敛到统一术语。",
        "状态组件只表达结果，不承担执行入口和交互按钮。",
      ]}
      title="StatusBadge"
    />
  );
}

function BreadcrumbPage() {
  return (
    <ShowcaseDocPage
      apiItems={[
        { description: "路径数组。", name: "items", required: true, type: 'Array<{ href?: string; label: string }>' },
        { defaultValue: "最后一项", description: "末级节点通常只展示文案，不再提供 href。", name: "items[n].href", type: "string | undefined" },
        { description: "节点显示文本。", name: "items[n].label", required: true, type: "string" },
      ]}
      categoryLabel="基础能力"
      demos={[
        {
          code: `<Breadcrumb items={[{ href: "/", label: "后台" }, { label: "组件展示站" }]} />`,
          content: <Breadcrumb items={[{ href: "/", label: "后台" }, { label: "组件展示站" }]} />,
          description: "最小路径表达。",
          title: "基础用法",
        },
        {
          code: `<Breadcrumb items={[{ href: "/", label: "后台" }, { href: "/docs", label: "设计系统" }, { label: "Breadcrumb" }]} />`,
          content: <Breadcrumb items={[{ href: "/", label: "后台" }, { href: "/docs", label: "设计系统" }, { label: "Breadcrumb" }]} />,
          description: "带中间跳转节点的完整层级。",
          title: "多级路径",
        },
        {
          code: `<div className="grid gap-3 rounded-surface border border-border bg-card p-4">
  <Breadcrumb items={[{ href: "/", label: "后台" }, { href: "/service", label: "服务管理" }, { label: "订单同步任务详情" }]} />
  <h3 className="text-base font-semibold text-foreground">订单同步任务详情</h3>
</div>`,
          content: (
            <div className="grid gap-3 rounded-surface border border-border bg-card p-4">
              <Breadcrumb items={[{ href: "/", label: "后台" }, { href: "/service", label: "服务管理" }, { label: "订单同步任务详情" }]} />
              <h3 className="text-base font-semibold text-foreground">订单同步任务详情</h3>
            </div>
          ),
          description: "详情页顶部常见组合：面包屑 + 页面标题。",
          title: "页面头部场景",
        },
      ]}
      description="Breadcrumb 用于表示页面层级关系，适合详情页和工具页顶部。"
      notes={[
        "最后一项一般不再跳转，避免用户误认为还能继续下钻。",
        "面包屑只表达层级，不承担标题、副标题和状态信息。",
        "路径层级建议控制在 2-4 层，过长时应考虑信息架构调整。",
      ]}
      title="Breadcrumb"
    />
  );
}

function ThemeTogglePage() {
  return (
    <ShowcaseDocPage
      apiItems={[
        { description: "无显式 props，点击后在浅色/深色/系统主题间轮换。", name: "props", type: "none" },
        { description: "主题状态持久化与读取由 design-tokens 主题能力负责。", name: "behavior", type: "internal" },
      ]}
      categoryLabel="导航与身份"
      demos={[
        {
          code: `<ThemeToggle />`,
          content: <ThemeToggle />,
          description: "单按钮轮换浅色、深色、系统主题。",
          title: "基础用法",
        },
        {
          code: `<RowActions>
  <ThemeToggle />
  <Button variant="default" outlined>辅助操作</Button>
</RowActions>`,
          content: (
            <RowActions>
              <ThemeToggle />
              <Button outlined type="button" variant="default">辅助操作</Button>
            </RowActions>
          ),
          description: "与顶栏操作区组合时的密度和对齐方式。",
          title: "与操作区组合",
        },
        {
          code: `<div className="flex items-center justify-between rounded-surface border border-border bg-card px-4 py-3">
  <div className="grid gap-1">
    <span className="text-sm font-medium text-foreground">主题偏好</span>
    <span className="text-xs text-muted-foreground">单击按钮即可切换显示模式</span>
  </div>
  <ThemeToggle />
</div>`,
          content: (
            <div className="flex items-center justify-between rounded-surface border border-border bg-card px-4 py-3">
              <div className="grid gap-1">
                <span className="text-sm font-medium text-foreground">主题偏好</span>
                <span className="text-xs text-muted-foreground">单击按钮即可切换显示模式</span>
              </div>
              <ThemeToggle />
            </div>
          ),
          description: "设置页或用户偏好卡片中的典型放置方式。",
          title: "设置场景",
        },
      ]}
      description="ThemeToggle 通过单按钮点击轮换浅色、深色和跟随系统三种全局主题。"
      notes={[
        "主题切换属于全局动作，通常位于顶栏、设置页或文档站页头。",
        "切换入口建议全站保持同一位置，避免用户反复寻找。",
        "该组件是直接点击即切换，不需要额外下拉菜单。",
      ]}
      title="ThemeToggle"
    />
  );
}

export const actionsRoutes: ShowcaseRoute[] = [
  { component: ButtonPage, label: "Button", path: "/foundation/button", shortLabel: "BTN", summaryKey: "showcase.route.actions.button.summary" },
  { component: BadgePage, label: "Badge", path: "/foundation/badge", shortLabel: "TAG", summaryKey: "showcase.route.actions.badge.summary" },
  { component: BreadcrumbPage, label: "Breadcrumb", path: "/navigation/breadcrumb", shortLabel: "BRD", summaryKey: "showcase.route.actions.breadcrumb.summary" },
  { component: StatusBadgePage, label: "StatusBadge", path: "/foundation/status-badge", shortLabel: "STS", summaryKey: "showcase.route.actions.status-badge.summary" },
  { component: ThemeTogglePage, label: "ThemeToggle", path: "/navigation/theme-toggle", shortLabel: "THM", summaryKey: "showcase.route.actions.theme-toggle.summary" },
];

export const actionsCategory: ShowcaseCategory = {
  descriptionKey: "showcase.category.actions.description",
  key: "actions",
  labelKey: "showcase.category.actions.label",
  items: actionsRoutes,
};
