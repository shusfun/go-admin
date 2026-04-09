import { useEffect, useState, type HTMLAttributes, type PropsWithChildren, type ReactNode } from "react";
import { NavLink } from "react-router-dom";
import { useTheme, type ThemeMode } from "@suiyuan/design-tokens";
import { ChevronDown, LogOut, MoonStar, PanelLeftClose, PanelLeftOpen, Sun, SunMoon, UserRound } from "lucide-react";

import type { AppMenuNode } from "@suiyuan/types";

import {
  Badge,
  Breadcrumb,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Checkbox,
  DetailGrid,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  Drawer,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  EmptyLogState,
  EmptyState,
  FormActions,
  ReadonlyCodeBlock,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./primitives";
import { cn } from "./lib/utils";

const SIDEBAR_KEY = "suiyuan-admin-sidebar-collapsed";
const NAV_KEY = "suiyuan-admin-nav-open";

function readStoredBoolean(key: string, fallback: boolean) {
  if (typeof window === "undefined") {
    return fallback;
  }
  const stored = window.localStorage.getItem(key);
  if (stored === null) {
    return fallback;
  }
  return stored === "true";
}

function readStoredArray(key: string) {
  if (typeof window === "undefined") {
    return [] as string[];
  }
  try {
    const stored = window.localStorage.getItem(key);
    return stored ? (JSON.parse(stored) as string[]) : [];
  } catch {
    return [];
  }
}

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  function renderIcon(value: ThemeMode) {
    if (value === "light") {
      return <Sun className="h-4 w-4" />;
    }
    if (value === "dark") {
      return <MoonStar className="h-4 w-4" />;
    }
    return <SunMoon className="h-4 w-4" />;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="icon" type="button" variant="outline">
          {renderIcon(theme)}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => setTheme("light")}>浅色主题</DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("dark")}>深色主题</DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("system")}>跟随系统</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function SectionCard({
  children,
  description,
  title,
}: PropsWithChildren<{ description?: string; title: string }>) {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description ? <CardDescription>{description}</CardDescription> : null}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

export function MetricGrid({ children }: PropsWithChildren) {
  return <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">{children}</div>;
}

export function MetricCard({
  detail,
  label,
  value,
}: {
  detail: string;
  label: string;
  value: string;
}) {
  return (
    <Card className="overflow-hidden">
      <CardContent className="space-y-3 p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">{label}</p>
        <div className="text-3xl font-semibold tracking-tight text-foreground">{value}</div>
        <p className="text-sm leading-6 text-muted-foreground">{detail}</p>
      </CardContent>
    </Card>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const tone =
    status === "成功" || status === "正常" || status === "healthy" || status === "success"
      ? "success"
      : status === "失败" || status === "停用" || status === "failed"
        ? "danger"
        : status === "运行中" || status === "queued" || status === "running"
          ? "warning"
          : "muted";

  return <Badge tone={tone}>{status}</Badge>;
}

export function RowActions({ children, className }: PropsWithChildren<{ className?: string }>) {
  return <div className={cn("flex flex-wrap items-center gap-2", className)}>{children}</div>;
}

export function PageHeader({
  actions,
  breadcrumbs,
  description,
  kicker,
  title,
}: {
  actions?: ReactNode;
  breadcrumbs?: Array<{ href?: string; label: string }>;
  description?: ReactNode;
  kicker?: ReactNode;
  title: ReactNode;
}) {
  return (
    <div className="grid gap-4 rounded-[1.75rem] border border-border bg-card px-6 py-5 shadow-[var(--shadow-card)]">
      {breadcrumbs?.length ? <Breadcrumb items={breadcrumbs} /> : null}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-2">
          {kicker ? <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">{kicker}</p> : null}
          <h1 className="text-2xl font-semibold tracking-tight text-foreground md:text-3xl">{title}</h1>
          {description ? <div className="max-w-3xl text-sm leading-7 text-muted-foreground">{description}</div> : null}
        </div>
        {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
      </div>
    </div>
  );
}

export function FilterPanel({
  children,
  description,
  title = "筛选与操作",
}: PropsWithChildren<{ description?: string; title?: string }>) {
  return (
    <SectionCard description={description} title={title}>
      <div className="grid gap-4">{children}</div>
    </SectionCard>
  );
}

export function Toolbar({ children }: PropsWithChildren) {
  return <div className="flex flex-wrap items-center gap-3">{children}</div>;
}

export function DataTableSection({
  children,
  description,
  title,
}: PropsWithChildren<{ description?: ReactNode; title: ReactNode }>) {
  return (
    <SectionCard description={typeof description === "string" ? description : undefined} title={String(title)}>
      {typeof description === "string" ? null : description}
      <div className="overflow-x-auto">{children}</div>
    </SectionCard>
  );
}

export function EmptyBlock({
  action,
  description,
  title,
}: {
  action?: ReactNode;
  description: ReactNode;
  title: ReactNode;
}) {
  return <EmptyState action={action} description={description} title={title} />;
}

export function FormDialog({
  children,
  description,
  onOpenChange,
  open,
  title,
}: PropsWithChildren<{ description?: ReactNode; onOpenChange: (open: boolean) => void; open: boolean; title: ReactNode }>) {
  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="flex max-h-[calc(100dvh-2rem)] w-[min(96vw,52rem)] flex-col overflow-hidden p-0">
        <DialogHeader className="shrink-0 px-6 pb-0 pt-6 pr-12">
          <DialogTitle>{title}</DialogTitle>
          {description ? <DialogDescription>{description}</DialogDescription> : null}
        </DialogHeader>
        <div className="flex min-h-0 flex-1 flex-col px-6 pb-6 pt-4">{children}</div>
      </DialogContent>
    </Dialog>
  );
}

export function DetailDialog({
  children,
  description,
  onOpenChange,
  open,
  title,
}: PropsWithChildren<{ description?: ReactNode; onOpenChange: (open: boolean) => void; open: boolean; title: ReactNode }>) {
  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="flex max-h-[calc(100dvh-2rem)] w-[min(96vw,44rem)] flex-col overflow-hidden p-0">
        <DialogHeader className="shrink-0 px-6 pb-0 pt-6 pr-12">
          <DialogTitle>{title}</DialogTitle>
          {description ? <DialogDescription>{description}</DialogDescription> : null}
        </DialogHeader>
        <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-6 pt-4">{children}</div>
      </DialogContent>
    </Dialog>
  );
}

export function AdminTopbar({
  breadcrumbs,
  onLogout,
  pageTitle,
  tenantCode,
  userLabel,
}: {
  breadcrumbs: Array<{ href?: string; label: string }>;
  onLogout: () => void;
  pageTitle: string;
  tenantCode: string;
  userLabel: string;
}) {
  return (
    <header className="sticky top-0 z-20 hidden items-center justify-between gap-4 border-b border-border bg-background/92 px-5 py-4 backdrop-blur supports-[backdrop-filter]:bg-background/75 md:flex md:px-8">
      <div className="grid gap-2">
        <Breadcrumb items={breadcrumbs} />
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold text-foreground">{pageTitle}</h2>
          <Badge tone="muted">租户 {tenantCode}</Badge>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <ThemeToggle />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button className="gap-2" type="button" variant="outline">
              <UserRound className="h-4 w-4" />
              <span className="hidden sm:inline">{userLabel}</span>
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onLogout}>
              <LogOut className="mr-2 h-4 w-4" />
              退出登录
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}

export function BrandBlock() {
  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">Suiyuan Admin</p>
      <div className="space-y-1">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">统一后台工作台</h1>
        <p className="text-sm leading-6 text-muted-foreground">Tailwind + shadcn 风格重建后的后台交互骨架。</p>
      </div>
    </div>
  );
}

export function IdentityCard({
  avatar,
  name,
  roleName,
  tenantCode,
}: {
  avatar: string;
  name: string;
  roleName: string;
  tenantCode: string;
}) {
  return (
    <Card className="overflow-hidden border-border/80 bg-secondary/50">
      <CardContent className="flex items-center gap-4 p-4">
        <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-2xl bg-background text-sm font-semibold text-foreground shadow-sm">
          {avatar ? <img alt={name} className="h-full w-full object-cover" src={avatar} /> : name.slice(0, 1)}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-foreground">{name}</p>
          <p className="truncate text-xs text-muted-foreground">{roleName || "未分配角色"}</p>
          <p className="truncate text-xs text-muted-foreground">租户 {tenantCode}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function getNodeTrail(nodes: AppMenuNode[], pathname: string, trail: AppMenuNode[] = []): AppMenuNode[] {
  for (const node of nodes) {
    const nextTrail = [...trail, node];
    if (node.fullPath === pathname) {
      return nextTrail;
    }
    if (node.children.length) {
      const childTrail = getNodeTrail(node.children, pathname, nextTrail);
      if (childTrail.length) {
        return childTrail;
      }
    }
  }
  return [];
}

function SidebarNavNode({
  collapsed,
  currentPath,
  onNavigate,
  openKeys,
  setOpenKeys,
  node,
}: {
  collapsed: boolean;
  currentPath: string;
  onNavigate: () => void;
  openKeys: string[];
  setOpenKeys: (next: string[]) => void;
  node: AppMenuNode;
}) {
  if (node.hidden) {
    return null;
  }

  const hasChildren = node.children.some((child) => !child.hidden);
  const isOpen = openKeys.includes(node.fullPath);

  return (
    <div className="grid gap-1">
      <div className="flex items-center gap-2">
        <NavLink
          className={({ isActive }) =>
            cn(
              "flex min-w-0 flex-1 items-center gap-3 rounded-2xl px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground",
              isActive || currentPath === node.fullPath ? "bg-primary/10 font-medium text-primary" : "",
            )
          }
          onClick={onNavigate}
          to={node.fullPath}
        >
          <span className={cn("truncate", collapsed && "sr-only")}>{node.title}</span>
        </NavLink>
        {hasChildren && !collapsed ? (
          <button
            className="rounded-xl p-1 text-muted-foreground hover:bg-secondary hover:text-foreground"
            onClick={() =>
              setOpenKeys(
                isOpen ? openKeys.filter((item) => item !== node.fullPath) : [...openKeys, node.fullPath],
              )
            }
            type="button"
          >
            <ChevronDown className={cn("h-4 w-4 transition-transform", isOpen ? "rotate-180" : "")} />
          </button>
        ) : null}
      </div>
      {hasChildren && isOpen && !collapsed ? (
        <div className="ml-3 grid gap-1 border-l border-border pl-3">
          {node.children.map((child) => (
            <SidebarNavNode
              collapsed={collapsed}
              currentPath={currentPath}
              key={child.fullPath}
              node={child}
              onNavigate={onNavigate}
              openKeys={openKeys}
              setOpenKeys={setOpenKeys}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function TreeNav({
  currentPath,
  menuTree,
  onNavigate,
  sidebarCollapsed = false,
}: {
  currentPath: string;
  menuTree: AppMenuNode[];
  onNavigate: () => void;
  sidebarCollapsed?: boolean;
}) {
  const [openKeys, setOpenKeys] = useState<string[]>(() => readStoredArray(NAV_KEY));

  useEffect(() => {
    window.localStorage.setItem(NAV_KEY, JSON.stringify(openKeys));
  }, [openKeys]);

  useEffect(() => {
    const trail = getNodeTrail(menuTree, currentPath);
    if (!trail.length) {
      return;
    }
    setOpenKeys((current) => {
      const next = new Set([...current, ...trail.map((item) => item.fullPath)]);
      return Array.from(next);
    });
  }, [currentPath, menuTree]);

  return (
    <div className="grid gap-2">
      {!sidebarCollapsed ? <p className="px-2 text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">导航</p> : null}
      {menuTree.filter((node) => !node.hidden).map((node) => (
        <SidebarNavNode
          collapsed={sidebarCollapsed}
          currentPath={currentPath}
          key={node.fullPath}
          node={node}
          onNavigate={onNavigate}
          openKeys={openKeys}
          setOpenKeys={setOpenKeys}
        />
      ))}
    </div>
  );
}

export function AdminSidebar({
  collapsed,
  currentPath,
  menuTree,
  onLogout,
  onNavigate,
  setCollapsed,
  userCard,
}: {
  collapsed: boolean;
  currentPath: string;
  menuTree: AppMenuNode[];
  onLogout: () => void;
  onNavigate: () => void;
  setCollapsed: (collapsed: boolean) => void;
  userCard: ReactNode;
}) {
  return (
    <aside
      className={cn(
        "hidden h-[100dvh] flex-col border-r border-border bg-card px-4 py-5 md:flex",
        collapsed ? "w-24" : "w-[18.5rem]",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        {!collapsed ? <BrandBlock /> : <div className="text-lg font-semibold text-foreground">SA</div>}
        <TooltipProvider delayDuration={150}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button onClick={() => setCollapsed(!collapsed)} size="icon" type="button" variant="ghost">
                {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
              </Button>
            </TooltipTrigger>
            <TooltipContent>{collapsed ? "展开侧栏" : "折叠侧栏"}</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
      <div className="mt-5">{collapsed ? null : userCard}</div>
      <div className="mt-5 min-h-0 flex-1 overflow-y-auto pr-1">
        <TreeNav currentPath={currentPath} menuTree={menuTree} onNavigate={onNavigate} sidebarCollapsed={collapsed} />
      </div>
      <div className="mt-5 grid gap-2">
        <NavLink className="rounded-2xl px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground" onClick={onNavigate} to="/ops-service">
          {collapsed ? "运" : "运维服务"}
        </NavLink>
        <NavLink className="rounded-2xl px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground" onClick={onNavigate} to="/profile">
          {collapsed ? "我" : "个人中心"}
        </NavLink>
        <Button className="justify-start" onClick={onLogout} type="button" variant="ghost">
          <LogOut className="h-4 w-4" />
          {!collapsed ? "退出登录" : null}
        </Button>
      </div>
    </aside>
  );
}

export function AdminAppShell({
  avatar,
  children,
  currentPath,
  menuTree,
  onLogout,
  tenantCode,
  userName,
  userRole,
}: PropsWithChildren<{
  avatar: string;
  currentPath: string;
  menuTree: AppMenuNode[];
  onLogout: () => void;
  tenantCode: string;
  userName: string;
  userRole: string;
}>) {
  const [collapsed, setCollapsed] = useState(() => readStoredBoolean(SIDEBAR_KEY, false));
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    window.localStorage.setItem(SIDEBAR_KEY, String(collapsed));
  }, [collapsed]);

  const trail = getNodeTrail(menuTree, currentPath);
  const currentNode = trail.at(-1);
  const breadcrumbs = [{ href: "/", label: "后台" }, ...trail.map((node) => ({ href: node.fullPath, label: node.title }))];
  const pageTitle = currentNode?.title || (currentPath === "/ops-service" ? "运维服务" : currentPath === "/profile" ? "个人中心" : "控制台");
  const userCard = <IdentityCard avatar={avatar} name={userName} roleName={userRole} tenantCode={tenantCode} />;

  return (
    <div className="min-h-[100dvh] bg-background text-foreground">
      <div className="flex min-h-[100dvh]">
        <AdminSidebar
          collapsed={collapsed}
          currentPath={currentPath}
          menuTree={menuTree}
          onLogout={onLogout}
          onNavigate={() => setMobileOpen(false)}
          setCollapsed={setCollapsed}
          userCard={userCard}
        />
        <Drawer onOpenChange={setMobileOpen} open={mobileOpen}>
          <div className="flex h-full flex-col gap-4">
            <BrandBlock />
            {userCard}
            <div className="min-h-0 flex-1 overflow-y-auto pr-1">
              <TreeNav currentPath={currentPath} menuTree={menuTree} onNavigate={() => setMobileOpen(false)} />
            </div>
          </div>
        </Drawer>
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex items-center justify-between border-b border-border px-4 py-3 md:hidden">
            <Button onClick={() => setMobileOpen(true)} size="icon" type="button" variant="outline">
              <PanelLeftOpen className="h-4 w-4" />
            </Button>
            <p className="font-semibold text-foreground">{pageTitle}</p>
            <ThemeToggle />
          </div>
          <AdminTopbar
            breadcrumbs={breadcrumbs}
            onLogout={onLogout}
            pageTitle={pageTitle}
            tenantCode={tenantCode}
            userLabel={userName}
          />
          <main className="min-w-0 flex-1 px-4 py-5 md:px-8 md:py-6">
            <div className="mx-auto grid max-w-[1440px] gap-6">{children}</div>
          </main>
        </div>
      </div>
    </div>
  );
}

export function AdminShell({ children, sidebar }: PropsWithChildren<{ sidebar: ReactNode }>) {
  return (
    <div className="grid min-h-[100dvh] gap-6 px-6 py-6 lg:grid-cols-[18rem_minmax(0,1fr)]">
      <div>{sidebar}</div>
      <div>{children}</div>
    </div>
  );
}

export function AdminPageStack({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("grid gap-6", className)} {...props} />;
}

export function AdminTwoColumn({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("grid gap-6 xl:grid-cols-2", className)} {...props} />;
}

export function AdminThreeColumn({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]", className)} {...props} />;
}

type TreeLikeNode = {
  id: number;
  label: string;
  children?: TreeLikeNode[];
};

function collectTreeIds(nodes: TreeLikeNode[]): number[] {
  return nodes.flatMap((node) => [node.id, ...collectTreeIds(node.children || [])]);
}

function collectTreeNodeIds(node: TreeLikeNode): number[] {
  return [node.id, ...collectTreeIds(node.children || [])];
}

function toggleTreeSelection(currentIds: number[], node: TreeLikeNode, checked: boolean) {
  const next = new Set(currentIds);
  for (const id of collectTreeNodeIds(node)) {
    if (checked) {
      next.add(id);
    } else {
      next.delete(id);
    }
  }
  return Array.from(next);
}

export function TreeTableSection({
  children,
  className,
  description,
  title,
}: PropsWithChildren<{ className?: string; description?: ReactNode; title: ReactNode }>) {
  return (
    <SectionCard description={typeof description === "string" ? description : undefined} title={String(title)}>
      {typeof description === "string" ? null : description}
      <div className={cn("overflow-x-auto", className)}>{children}</div>
    </SectionCard>
  );
}

function TreeSelectorNode({
  checkedIds,
  disabled,
  node,
  onChange,
}: {
  checkedIds: number[];
  disabled?: boolean;
  node: TreeLikeNode;
  onChange: (next: number[]) => void;
}) {
  const descendantIds = collectTreeNodeIds(node);
  const checkedCount = descendantIds.filter((id) => checkedIds.includes(id)).length;
  const checked = checkedCount === descendantIds.length && descendantIds.length > 0;
  const indeterminate = checkedCount > 0 && checkedCount < descendantIds.length;

  return (
    <li className="grid gap-3">
      <label className={cn("flex items-start gap-3 rounded-2xl border border-border/60 bg-background px-4 py-3", disabled && "opacity-60")}>
        <Checkbox
          checked={indeterminate ? "indeterminate" : checked}
          disabled={disabled}
          onCheckedChange={(value) => onChange(toggleTreeSelection(checkedIds, node, value === true))}
        />
        <span className="text-sm font-medium text-foreground">{node.label}</span>
      </label>
      {node.children?.length ? (
        <ul className="ml-4 grid gap-3 border-l border-border pl-4">
          {node.children.map((child) => (
            <TreeSelectorNode checkedIds={checkedIds} disabled={disabled} key={child.id} node={child} onChange={onChange} />
          ))}
        </ul>
      ) : null}
    </li>
  );
}

export function TreeSelectorPanel({
  checkedIds,
  description,
  disabled = false,
  emptyLabel = "暂无可选节点",
  nodes,
  onChange,
  title,
}: {
  checkedIds: number[];
  description?: ReactNode;
  disabled?: boolean;
  emptyLabel?: ReactNode;
  nodes: TreeLikeNode[];
  onChange: (next: number[]) => void;
  title: ReactNode;
}) {
  return (
    <Card className="h-full">
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <CardTitle>{title}</CardTitle>
            {description ? <CardDescription>{description}</CardDescription> : null}
          </div>
          <div className="flex items-center gap-2">
            <Button disabled={disabled || nodes.length === 0} onClick={() => onChange(collectTreeIds(nodes))} size="sm" type="button" variant="outline">
              全选
            </Button>
            <Button disabled={disabled || checkedIds.length === 0} onClick={() => onChange([])} size="sm" type="button" variant="ghost">
              清空
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="grid gap-4">
        <Badge tone="muted">当前选中 {checkedIds.length} 项</Badge>
        {nodes.length ? (
          <ul className="grid max-h-[24rem] gap-3 overflow-auto pr-1">
            {nodes.map((node) => (
              <TreeSelectorNode checkedIds={checkedIds} disabled={disabled} key={node.id} node={node} onChange={onChange} />
            ))}
          </ul>
        ) : (
          <EmptyState description={emptyLabel} title="没有可展示的树节点" />
        )}
      </CardContent>
    </Card>
  );
}

export function MasterDetailLayout({ children, className }: PropsWithChildren<{ className?: string }>) {
  return <div className={cn("grid gap-6 xl:grid-cols-[minmax(300px,360px)_minmax(0,1fr)]", className)}>{children}</div>;
}

export function ListPane({ children, className }: PropsWithChildren<{ className?: string }>) {
  return <div className={cn("min-w-0", className)}>{children}</div>;
}

export function DetailPane({ children, className }: PropsWithChildren<{ className?: string }>) {
  return <div className={cn("min-w-0", className)}>{children}</div>;
}

export function LogViewer({
  action,
  className,
  description,
  log,
  title = "实时日志",
}: {
  action?: ReactNode;
  className?: string;
  description?: ReactNode;
  log?: string;
  title?: ReactNode;
}) {
  return (
    <div className={cn("grid gap-4 rounded-3xl border border-border bg-card p-5 shadow-[var(--shadow-card)]", className)}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h3 className="text-base font-semibold text-foreground">{title}</h3>
          {description ? <p className="text-sm leading-6 text-muted-foreground">{description}</p> : null}
        </div>
        {action}
      </div>
      {log?.trim() ? <ReadonlyCodeBlock>{log}</ReadonlyCodeBlock> : <EmptyLogState />}
    </div>
  );
}

export function ProgressSteps({
  className,
  items,
}: {
  className?: string;
  items: Array<{ description?: ReactNode; label: ReactNode; meta?: ReactNode; state: "pending" | "running" | "success" | "failed" | "skipped" }>;
}) {
  const stateClass: Record<string, string> = {
    failed: "border-destructive/20 bg-destructive/10",
    pending: "border-border bg-secondary/40",
    running: "border-primary/20 bg-primary/10",
    skipped: "border-border bg-secondary/20 opacity-70",
    success: "border-emerald-500/20 bg-emerald-500/10",
  };
  const badgeClass: Record<string, string> = {
    failed: "bg-destructive text-destructive-foreground",
    pending: "bg-secondary text-secondary-foreground",
    running: "bg-primary text-primary-foreground",
    skipped: "bg-secondary text-secondary-foreground",
    success: "bg-emerald-600 text-white",
  };
  const stateLabel: Record<string, string> = {
    failed: "失败",
    pending: "等待",
    running: "执行中",
    skipped: "跳过",
    success: "完成",
  };

  return (
    <div className={cn("grid gap-3 md:grid-cols-2", className)}>
      {items.map((item, index) => (
        <div className={cn("grid gap-2 rounded-2xl border px-4 py-3", stateClass[item.state])} key={`${String(item.label)}-${index}`}>
          <div className="flex items-start gap-3">
            <span className={cn("inline-flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold", badgeClass[item.state])}>
              {index + 1}
            </span>
            <div className="min-w-0 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-semibold text-foreground">{item.label}</p>
                <Badge tone={item.state === "failed" ? "danger" : item.state === "running" ? "warning" : item.state === "success" ? "success" : "muted"}>
                  {stateLabel[item.state]}
                </Badge>
              </div>
              {item.description ? <p className="text-sm leading-6 text-muted-foreground">{item.description}</p> : null}
              {item.meta ? <div className="text-xs text-muted-foreground">{item.meta}</div> : null}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function StatStrip({
  className,
  items,
}: {
  className?: string;
  items: Array<{ label: ReactNode; value: ReactNode }>;
}) {
  return (
    <div className={cn("grid gap-4 md:grid-cols-2 xl:grid-cols-4", className)}>
      {items.map((item, index) => (
        <Card key={`${String(item.label)}-${index}`}>
          <CardContent className="space-y-2 p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">{item.label}</p>
            <p className="text-3xl font-semibold tracking-tight text-foreground">{item.value}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function TaskStatusCard({
  actions,
  className,
  description,
  items,
  status,
  title,
}: {
  actions?: ReactNode;
  className?: string;
  description?: ReactNode;
  items: Array<{ label: ReactNode; value: ReactNode }>;
  status: string;
  title: ReactNode;
}) {
  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <CardTitle>{title}</CardTitle>
              <StatusBadge status={status} />
            </div>
            {description ? <CardDescription>{description}</CardDescription> : null}
          </div>
          {actions}
        </div>
      </CardHeader>
      <CardContent>
        <DetailGrid items={items} />
      </CardContent>
    </Card>
  );
}

export function CommitList({
  className,
  commits,
  description,
  emptyLabel = "当前没有待展示的提交。",
  title,
}: {
  className?: string;
  commits: Array<{ hash: string; message: string }>;
  description?: ReactNode;
  emptyLabel?: ReactNode;
  title: ReactNode;
}) {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description ? <CardDescription>{description}</CardDescription> : null}
      </CardHeader>
      <CardContent>
        {commits.length ? (
          <div className="grid gap-3">
            {commits.map((commit) => (
              <div className="grid gap-1 rounded-2xl border border-border/70 bg-secondary/30 px-4 py-3" key={`${commit.hash}-${commit.message}`}>
                <div className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">{commit.hash.slice(0, 7)}</div>
                <p className="text-sm leading-6 text-foreground">{commit.message}</p>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState description={emptyLabel} title="暂无提交" />
        )}
      </CardContent>
    </Card>
  );
}

export function AuthLayout({
  aside,
  children,
  description,
  kicker = "Admin Access",
  title,
}: {
  aside?: ReactNode;
  children: ReactNode;
  description?: ReactNode;
  kicker?: ReactNode;
  title: ReactNode;
}) {
  return (
    <div className="grid min-h-[100dvh] bg-background lg:grid-cols-[minmax(0,1.1fr)_minmax(420px,620px)]">
      <section className="hidden border-r border-border bg-gradient-to-br from-primary/10 via-background to-accent/10 px-10 py-12 lg:flex lg:flex-col lg:justify-between">
        <div className="space-y-4">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-muted-foreground">{kicker}</p>
          <div className="space-y-3">
            <h1 className="max-w-2xl text-5xl font-semibold tracking-tight text-foreground">{title}</h1>
            {description ? <div className="max-w-2xl text-base leading-8 text-muted-foreground">{description}</div> : null}
          </div>
        </div>
        {aside}
      </section>
      <section className="grid place-items-center px-6 py-10">{children}</section>
    </div>
  );
}

export function AuthPanel({
  children,
  className,
  description,
  kicker,
  title,
}: PropsWithChildren<{ className?: string; description?: ReactNode; kicker?: ReactNode; title: ReactNode }>) {
  return (
    <Card className={cn("w-full max-w-2xl", className)}>
      <CardHeader>
        {kicker ? <p className="text-xs font-semibold uppercase tracking-[0.28em] text-muted-foreground">{kicker}</p> : null}
        <CardTitle className="text-3xl">{title}</CardTitle>
        {description ? <CardDescription>{description}</CardDescription> : null}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

export function WizardSteps({
  currentStep,
  steps,
}: {
  currentStep: number;
  steps: Array<{ description?: ReactNode; label: ReactNode }>;
}) {
  return (
    <div className="grid gap-3">
      <div className="grid grid-cols-[repeat(var(--step-count),minmax(0,1fr))] gap-2" style={{ ["--step-count" as string]: String(steps.length) }}>
        {steps.map((_, index) => (
          <div
            className={cn("h-2 rounded-full transition-colors", index <= currentStep ? "bg-primary" : "bg-secondary")}
            key={`wizard-line-${index}`}
          />
        ))}
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {steps.map((step, index) => (
          <div className={cn("rounded-2xl border px-4 py-3", index === currentStep ? "border-primary/30 bg-primary/10" : "border-border bg-secondary/20")} key={`${String(step.label)}-${index}`}>
            <p className="text-sm font-semibold text-foreground">
              {index + 1}. {step.label}
            </p>
            {step.description ? <p className="mt-1 text-sm leading-6 text-muted-foreground">{step.description}</p> : null}
          </div>
        ))}
      </div>
    </div>
  );
}

export function WizardLayout({
  children,
  currentStep,
  description,
  steps,
  title,
}: {
  children: ReactNode;
  currentStep: number;
  description?: ReactNode;
  steps: Array<{ description?: ReactNode; label: ReactNode }>;
  title: ReactNode;
}) {
  return (
    <AuthPanel description={description} kicker="Setup Wizard" title={title}>
      <div className="grid gap-6">
        <WizardSteps currentStep={currentStep} steps={steps} />
        {children}
      </div>
    </AuthPanel>
  );
}

export function DocsShell({
  children,
  className,
  sidebar,
}: PropsWithChildren<{ className?: string; sidebar: ReactNode }>) {
  return (
    <div className={cn("min-h-[100dvh] px-4 py-4 md:px-6 md:py-6", className)}>
      <div className="mx-auto grid max-w-[1680px] gap-6 xl:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="xl:sticky xl:top-6 xl:h-[calc(100dvh-3rem)]">{sidebar}</aside>
        <main className="grid gap-8">{children}</main>
      </div>
    </div>
  );
}

export function DocsSidebar({
  actions,
  badge,
  description,
  footer,
  items,
  title,
}: {
  actions?: ReactNode;
  badge?: ReactNode;
  description?: ReactNode;
  footer?: ReactNode;
  items: Array<{ href: string; label: ReactNode; meta?: ReactNode }>;
  title: ReactNode;
}) {
  return (
    <Card className="h-full bg-card/90 backdrop-blur">
      <CardContent className="grid h-full gap-4 p-5">
        <div className="space-y-3">
          {badge ? <div>{badge}</div> : null}
          <div className="space-y-2">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">{title}</h1>
            {description ? <div className="text-sm leading-6 text-muted-foreground">{description}</div> : null}
          </div>
        </div>
        {actions ? <div className="flex flex-wrap gap-3">{actions}</div> : null}
        <nav className="grid gap-2">
          {items.map((item) => (
            <a
              className="rounded-2xl border border-transparent px-4 py-3 text-sm text-muted-foreground transition-colors hover:border-border hover:bg-secondary/60 hover:text-foreground"
              href={item.href}
              key={item.href}
            >
              <div className="font-medium text-foreground">{item.label}</div>
              {item.meta ? <div className="mt-1 text-xs leading-5 text-muted-foreground">{item.meta}</div> : null}
            </a>
          ))}
        </nav>
        {footer ? <div className="grid gap-3 rounded-[1.5rem] border border-border/70 bg-secondary/30 p-4">{footer}</div> : null}
      </CardContent>
    </Card>
  );
}

export function DocsSection({
  children,
  className,
  columns = 2,
  description,
  id,
  kicker = "Section",
  title,
}: PropsWithChildren<{
  className?: string;
  columns?: 1 | 2;
  description?: ReactNode;
  id: string;
  kicker?: ReactNode;
  title: ReactNode;
}>) {
  return (
    <section className={cn("grid gap-6 scroll-mt-6", className)} id={id}>
      <div className="space-y-2">
        {kicker ? <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">{kicker}</p> : null}
        <h2 className="text-3xl font-semibold tracking-tight text-foreground">{title}</h2>
        {description ? <div className="max-w-3xl text-sm leading-7 text-muted-foreground">{description}</div> : null}
      </div>
      <div className={cn("grid gap-6", columns === 2 ? "xl:grid-cols-2" : "grid-cols-1")}>{children}</div>
    </section>
  );
}

export function DocsDemoCard({
  children,
  code,
  description,
  extra,
  title,
}: PropsWithChildren<{
  code?: string;
  description?: ReactNode;
  extra?: ReactNode;
  title: ReactNode;
}>) {
  const [showCode, setShowCode] = useState(false);

  return (
    <Card className="overflow-hidden">
      <CardContent className="grid gap-5 p-0">
        <div className="border-b border-border/70 px-6 py-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-1">
              <h3 className="text-lg font-semibold text-foreground">{title}</h3>
              {description ? <div className="text-sm leading-6 text-muted-foreground">{description}</div> : null}
            </div>
            {extra ? <div className="flex flex-wrap gap-2">{extra}</div> : null}
          </div>
        </div>
        <div className="grid gap-5 px-6 py-5">
          <div className="rounded-[1.5rem] border border-dashed border-border bg-secondary/25 p-5">{children}</div>
          {code ? (
            <>
              <div className="flex justify-end">
                <Button onClick={() => setShowCode((value) => !value)} size="sm" type="button" variant="outline">
                  {showCode ? "收起代码" : "查看代码"}
                </Button>
              </div>
              {showCode ? <ReadonlyCodeBlock title="TSX">{code}</ReadonlyCodeBlock> : null}
            </>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}

export function DocsApiTable({
  className,
  columns,
  description,
  items,
  title = "API",
}: {
  className?: string;
  columns?: Array<{ key: "name" | "type" | "default" | "required" | "description"; label: ReactNode }>;
  description?: ReactNode;
  items: Array<{
    defaultValue?: ReactNode;
    description: ReactNode;
    name: ReactNode;
    required?: boolean;
    type: ReactNode;
  }>;
  title?: ReactNode;
}) {
  const finalColumns = columns || [
    { key: "name" as const, label: "属性" },
    { key: "type" as const, label: "类型" },
    { key: "default" as const, label: "默认值" },
    { key: "required" as const, label: "必填" },
    { key: "description" as const, label: "说明" },
  ];

  return (
    <SectionCard description={typeof description === "string" ? description : undefined} title={String(title)}>
      {typeof description === "string" ? null : description}
      <div className={cn("overflow-x-auto", className)}>
        <Table>
          <TableHeader>
            <TableRow>
              {finalColumns.map((column) => (
                <TableHead key={String(column.key)}>{column.label}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item, index) => (
              <TableRow key={`${String(item.name)}-${index}`}>
                {finalColumns.map((column) => {
                  if (column.key === "name") {
                    return (
                      <TableCell key={`${index}-name`}>
                        <code className="text-xs font-semibold text-foreground">{item.name}</code>
                      </TableCell>
                    );
                  }
                  if (column.key === "type") {
                    return (
                      <TableCell key={`${index}-type`}>
                        <code className="text-xs text-muted-foreground">{item.type}</code>
                      </TableCell>
                    );
                  }
                  if (column.key === "default") {
                    return (
                      <TableCell key={`${index}-default`}>
                        <code className="text-xs text-muted-foreground">{item.defaultValue || "-"}</code>
                      </TableCell>
                    );
                  }
                  if (column.key === "required") {
                    return <TableCell key={`${index}-required`}>{item.required ? "是" : "否"}</TableCell>;
                  }
                  return <TableCell key={`${index}-description`}>{item.description}</TableCell>;
                })}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </SectionCard>
  );
}

export { EmptyState, FormActions };
