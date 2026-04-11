import { useEffect, useId, useMemo, useRef, useState, type ComponentProps, type HTMLAttributes, type KeyboardEvent as ReactKeyboardEvent, type MouseEvent as ReactMouseEvent, type PropsWithChildren, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { NavLink, useNavigate } from "react-router-dom";
import { useTheme, type ThemeMode } from "@go-admin/design-tokens";
import {
  Activity,
  BarChart3,
  BookMarked,
  BriefcaseBusiness,
  Bug,
  ChevronDown,
  Clock3,
  Compass,
  FileCode2,
  FileJson2,
  FolderKanban,
  GitBranch,
  Hammer,
  History,
  LayoutDashboard,
  LayoutGrid,
  Logs,
  LogOut,
  MoonStar,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  Server,
  Settings2,
  ShieldEllipsis,
  Sun,
  SunMoon,
  Table2,
  UploadCloud,
  UserRound,
  Users,
  Wrench,
  type LucideIcon,
} from "lucide-react";

import type { AppMenuNode, ImageAsset } from "@go-admin/types";

import {
  AdvancedFilterPanel,
  AppScrollbar,
  Backtop,
  Image,
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
  EmptyLogState,
  EmptyState,
  FormField,
  FilterBar,
  FormActions,
  Input,
  DateRangePicker,
  type DateRangePickerValue,
  Popover,
  PopoverContent,
  PopoverTrigger,
  ReadonlyCodeBlock,
  Select,
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

const SIDEBAR_KEY = "go-admin-sidebar-collapsed";
const NAV_KEY = "go-admin-nav-open";

const MENU_ICON_MAP: Record<string, LucideIcon> = {
  "api-doc": FileJson2,
  "api-server": Server,
  "app-group-fill": LayoutGrid,
  bug: Bug,
  build: Hammer,
  code: FileCode2,
  dashboard: LayoutDashboard,
  "dev-tools": Hammer,
  druid: Activity,
  education: BookMarked,
  guide: Compass,
  job: FolderKanban,
  logininfor: History,
  log: Logs,
  pass: BriefcaseBusiness,
  peoples: Users,
  skill: ShieldEllipsis,
  swagger: FileJson2,
  "system-tools": Settings2,
  "time-range": Clock3,
  tree: GitBranch,
  "tree-table": Table2,
  upload: UploadCloud,
  user: UserRound,
  "line-chart": BarChart3,
};

function resolveMenuIcon(icon: string) {
  return MENU_ICON_MAP[icon.trim().toLowerCase()] ?? LayoutGrid;
}

function SidebarMenuIcon({ className, icon }: { className?: string; icon: string }) {
  const Icon = resolveMenuIcon(icon);
  return (
    <span className={cn("inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg", className)}>
      <Icon className="h-3.5 w-3.5" strokeWidth={2.1} />
    </span>
  );
}

function BrandIdentityFrame({
  compact = false,
  logo,
  title = "统一后台工作台",
}: {
  compact?: boolean;
  logo?: string | ImageAsset | null;
  title?: string;
}) {
  const normalizedTitle = title.trim() || "统一后台工作台";
  const markText = normalizedTitle.replace(/\s+/g, "").slice(0, 2) || "GA";

  return (
    <div
      className={cn(
        "relative flex shrink-0 items-center justify-center overflow-hidden border border-border/70 bg-gradient-to-br from-background via-background to-secondary/70 shadow-sm",
        compact ? "ui-admin-rounded-control h-10 w-10" : "ui-admin-rounded-panel h-14 w-14",
      )}
    >
      {logo ? (
        <div className="flex h-full w-full items-center justify-center bg-background/90 p-2">
          <Image alt={normalizedTitle} className="h-full w-full object-contain" src={logo} />
        </div>
      ) : (
        <span className={cn("font-semibold tracking-[0.14em] text-primary", compact ? "text-[10px]" : "text-sm")}>{markText}</span>
      )}
    </div>
  );
}

function SidebarBrandMark({ logo, title = "统一后台工作台" }: { logo?: string | ImageAsset | null; title?: string }) {
  return <BrandIdentityFrame compact logo={logo} title={title} />;
}

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

export function AppFrameShell({
  backgroundClassName,
  children,
  contentClassName,
  contentInnerClassName,
  desktopSidebar,
  desktopSidebarClassName = "lg:flex lg:w-80",
  header,
  mobileBar,
  mobileDrawerClassName,
  mobileSidebar,
  rootClassName,
}: PropsWithChildren<{
  backgroundClassName?: string;
  contentClassName?: string;
  contentInnerClassName?: string;
  desktopSidebar: ReactNode;
  desktopSidebarClassName?: string;
  header?: ReactNode;
  mobileBar?: (controls: { closeSidebar: () => void; openSidebar: () => void }) => ReactNode;
  mobileDrawerClassName?: string;
  mobileSidebar?: ReactNode | ((controls: { closeSidebar: () => void }) => ReactNode);
  rootClassName?: string;
}>) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const contentViewportId = `app-frame-content-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const closeSidebar = () => setMobileOpen(false);
  const resolvedMobileSidebar =
    typeof mobileSidebar === "function" ? mobileSidebar({ closeSidebar }) : (mobileSidebar ?? desktopSidebar);

  return (
    <TooltipProvider delayDuration={120}>
      <div className={cn("h-[100dvh] overflow-hidden bg-background text-foreground", backgroundClassName)}>
        <div className={cn("flex h-full min-h-0", rootClassName)}>
          <div className={cn("hidden shrink-0", desktopSidebarClassName)}>{desktopSidebar}</div>
          <Drawer className={mobileDrawerClassName} onOpenChange={setMobileOpen} open={mobileOpen}>
            {resolvedMobileSidebar}
          </Drawer>
          <div className="flex min-h-0 min-w-0 flex-1 flex-col relative">
            {mobileBar ? mobileBar({ closeSidebar, openSidebar: () => setMobileOpen(true) }) : null}
            <AppScrollbar
              className="min-h-0 flex-1"
              rootSlot={<main className="min-w-0 flex flex-col relative" />}
              viewportClassName="go-admin-shell-content-scroll-root h-full"
              viewportProps={{ id: contentViewportId }}
            >
              {header}
              <div className={cn("flex-1", contentClassName)}>
                <div className={cn("mx-auto min-h-full w-full", contentInnerClassName)}>{children}</div>
              </div>
            </AppScrollbar>
            <Backtop draggable maxDragOffset={300} target={`#${contentViewportId}`} visibilityHeight={160} />
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const nextTheme: ThemeMode = theme === "light" ? "dark" : theme === "dark" ? "system" : "light";

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
    <Button
      aria-label={`切换主题，当前为${theme === "light" ? "浅色" : theme === "dark" ? "深色" : "跟随系统"}，点击后切换到${
        nextTheme === "light" ? "浅色" : nextTheme === "dark" ? "深色" : "跟随系统"
      }`}
      onClick={() => setTheme(nextTheme)}
      size="icon"
      title={`当前主题：${theme === "light" ? "浅色" : theme === "dark" ? "深色" : "跟随系统"}`}
      type="button"
      variant="outline"
    >
      {renderIcon(theme)}
    </Button>
  );
}

export type GlobalSearchItem = {
  description?: string;
  href?: string;
  icon?: ReactNode;
  id: string;
  keywords?: string[];
  section?: string;
  shortcut?: string;
  title: string;
};

export function GlobalSearch({
  className,
  defaultOpen = false,
  description = "用于快速定位页面、组件和后台入口。",
  emptyLabel = "没有匹配结果",
  items,
  onOpenChange,
  onSelect,
  placeholder = "搜索组件、页面或命令",
  title = "全局搜索",
  triggerLabel = "全局搜索",
}: {
  className?: string;
  defaultOpen?: boolean;
  description?: string;
  emptyLabel?: string;
  items: GlobalSearchItem[];
  onOpenChange?: (open: boolean) => void;
  onSelect?: (item: GlobalSearchItem) => void;
  placeholder?: string;
  title?: string;
  triggerLabel?: string;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const editable = target?.tagName === "INPUT" || target?.tagName === "TEXTAREA" || target?.isContentEditable;

      if (editable) {
        return;
      }

      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen(true);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const filteredItems = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    if (!keyword) {
      return items;
    }

    return items.filter((item) =>
      [item.title, item.description ?? "", item.section ?? "", ...(item.keywords ?? [])].some((value) => value.toLowerCase().includes(keyword)),
    );
  }, [items, query]);

  const groupedItems = useMemo(() => {
    return filteredItems.reduce<Record<string, GlobalSearchItem[]>>((groups, item) => {
      const key = item.section ?? "未分组";
      groups[key] = groups[key] ?? [];
      groups[key].push(item);
      return groups;
    }, {});
  }, [filteredItems]);

  function updateOpen(nextOpen: boolean) {
    setOpen(nextOpen);
    onOpenChange?.(nextOpen);
    if (!nextOpen) {
      setQuery("");
    }
  }

  function handleSelect(item: GlobalSearchItem) {
    onSelect?.(item);
    updateOpen(false);
    if (item.href && typeof window !== "undefined") {
      window.location.href = item.href;
    }
  }

  return (
    <>
      <Button className={className} onClick={() => updateOpen(true)} type="button" variant="outline">
        <Search className="h-4 w-4" />
        <span>{triggerLabel}</span>
        <span className="rounded-full border border-border/70 bg-secondary/40 px-2 py-0.5 text-[11px] text-muted-foreground">⌘K</span>
      </Button>
      <Dialog onOpenChange={updateOpen} open={open}>
        <DialogContent aria-describedby="global-search-description" className="w-[min(94vw,42rem)] p-0">
          <DialogTitle className="sr-only">{title}</DialogTitle>
          <DialogDescription className="sr-only" id="global-search-description">
            {description}
          </DialogDescription>
          <div className="grid gap-4 p-4">
            <div className="grid gap-3 border-b border-border/70 pb-4">
              <div className="text-[11px] font-medium text-muted-foreground">{title}</div>
              <Input
                autoFocus
                onChange={(event) => setQuery(event.target.value)}
                placeholder={placeholder}
                prefix={<Search className="h-4 w-4" />}
                value={query}
              />
            </div>
            <AppScrollbar className="max-h-[26rem]">
              {filteredItems.length ? (
                <div className="grid gap-4">
                  {Object.entries(groupedItems).map(([section, groupItems]) => (
                    <div className="grid gap-2" key={section}>
                      <div className="px-1 text-[11px] font-medium text-muted-foreground">{section}</div>
                      <div className="grid gap-2">
                        {groupItems.map((item) => (
                          <button
                            className="ui-admin-panel-surface ui-admin-panel-surface--flat ui-admin-rounded-control grid gap-1 px-4 py-3 text-left transition-colors hover:border-primary/30 hover:bg-primary/5"
                            key={item.id}
                            onClick={() => handleSelect(item)}
                            type="button"
                          >
                            <div className="flex items-center justify-between gap-3">
                              <div className="flex min-w-0 items-center gap-3">
                                {item.icon ? <span className="inline-flex shrink-0 text-primary">{item.icon}</span> : null}
                                <div className="truncate text-sm font-semibold text-foreground">{item.title}</div>
                              </div>
                              {item.shortcut ? <span className="text-[11px] text-muted-foreground">{item.shortcut}</span> : null}
                            </div>
                            {item.description ? <div className="text-sm leading-6 text-muted-foreground">{item.description}</div> : null}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState
                  description="换个关键词，或者直接从左侧分类导航进入。"
                  scene="search"
                  title={emptyLabel}
                />
              )}
            </AppScrollbar>
          </div>
        </DialogContent>
      </Dialog>
    </>
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
      <CardContent className="space-y-3 p-4">
        <p className="text-[11px] font-medium text-muted-foreground">{label}</p>
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
  const [actionNode, setActionNode] = useState<HTMLElement | null>(null);
  const [descNode, setDescNode] = useState<HTMLElement | null>(null);

  useEffect(() => {
    setActionNode(document.getElementById("admin-topbar-actions-portal"));
    setDescNode(document.getElementById("admin-topbar-description-portal"));
  }, []);

  return (
    <>
      {actions && actionNode ? createPortal(actions, actionNode) : null}
      {(description || kicker) && descNode
        ? createPortal(
            <div className="flex items-center gap-3 border-l border-border/40 pl-4 text-xs text-muted-foreground md:text-sm">
              {kicker ? <span className="rounded bg-secondary/50 px-1.5 py-0.5 font-medium">{kicker}</span> : null}
              {description ? <span className="line-clamp-1 max-w-[500px]">{description}</span> : null}
            </div>,
            descNode,
          )
        : null}
    </>
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

type AdvancedFilterWorkbenchButtonVariant = ComponentProps<typeof Button>["variant"];
type AdvancedFilterWorkbenchButtonSize = ComponentProps<typeof Button>["size"];

export type AdvancedFilterWorkbenchAction = {
  className?: string;
  disabled?: boolean;
  icon?: ReactNode;
  key: string;
  label: ReactNode;
  onClick?: () => void;
  size?: AdvancedFilterWorkbenchButtonSize;
  type?: "button" | "submit";
  variant?: AdvancedFilterWorkbenchButtonVariant;
};

type AdvancedFilterWorkbenchFieldBase = {
  className?: string;
  controlClassName?: string;
  key: string;
  label?: ReactNode;
};

export type AdvancedFilterWorkbenchField =
  | (AdvancedFilterWorkbenchFieldBase & {
      clearable?: boolean;
      kind: "input";
      onChange?: (value: string) => void;
      placeholder?: string;
      prefix?: ReactNode;
      value?: string;
    })
  | (AdvancedFilterWorkbenchFieldBase & {
      clearable?: boolean;
      kind: "select";
      onChange?: (value: string) => void;
      options: Array<{ label: string; value: string | number }>;
      placeholder?: string;
      value?: string;
    })
  | (AdvancedFilterWorkbenchFieldBase & {
      endPlaceholder?: string;
      kind: "dateRange";
      onChange?: (value?: DateRangePickerValue) => void;
      startPlaceholder?: string;
      value?: DateRangePickerValue;
    });

export type AdvancedFilterWorkbenchSummary = {
  count?: number | string;
  countLabel?: ReactNode;
  hint?: ReactNode;
};

const ADVANCED_FILTER_WORKBENCH_FOOTER_CLASSNAME =
  "flex flex-col gap-3 border-t pt-3 md:col-span-2 xl:col-span-3 sm:flex-row sm:items-center sm:justify-between [border-color:var(--ui-admin-border-subtle)]";

const ADVANCED_FILTER_SUMMARY_BADGE_CLASSNAME =
  "inline-flex items-center gap-1 rounded-control border border-primary/20 bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary";

function renderAdvancedFilterWorkbenchField(field: AdvancedFilterWorkbenchField) {
  const control =
    field.kind === "input" ? (
      <Input
        className={field.controlClassName}
        clearable={field.clearable}
        onChange={(event) => field.onChange?.(event.target.value)}
        placeholder={field.placeholder}
        prefix={field.prefix}
        value={field.value ?? ""}
      />
    ) : field.kind === "select" ? (
      <Select
        clearable={field.clearable}
        onValueChange={(value) => field.onChange?.(value)}
        options={field.options}
        placeholder={field.placeholder}
        value={field.value}
      />
    ) : (
      <DateRangePicker
        className={field.controlClassName}
        endPlaceholder={field.endPlaceholder}
        onChange={(value) => field.onChange?.(value)}
        startPlaceholder={field.startPlaceholder}
        value={field.value}
      />
    );

  if (field.label) {
    return (
      <FormField className={field.className} key={field.key} label={field.label}>
        {control}
      </FormField>
    );
  }

  return (
    <div className={field.className} key={field.key}>
      {control}
    </div>
  );
}

function renderAdvancedFilterWorkbenchActions(actions: AdvancedFilterWorkbenchAction[]) {
  return actions.map((action) => (
    <Button
      className={action.className}
      disabled={action.disabled}
      key={action.key}
      onClick={action.onClick}
      size={action.size}
      type={action.type ?? "button"}
      variant={action.variant}
    >
      {action.icon}
      {action.label}
    </Button>
  ));
}

export function AdvancedFilterWorkbench({
  advancedFields = [],
  appliedAdvancedCount = 0,
  className,
  defaultOpen = false,
  footerActions = [],
  isOpen,
  onOpenChange,
  panelClassName,
  primaryFields,
  summary,
  toggleLabel = "高级筛选",
  topActions = [],
}: {
  advancedFields?: AdvancedFilterWorkbenchField[];
  appliedAdvancedCount?: number;
  className?: string;
  defaultOpen?: boolean;
  footerActions?: AdvancedFilterWorkbenchAction[];
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  panelClassName?: string;
  primaryFields: AdvancedFilterWorkbenchField[];
  summary?: AdvancedFilterWorkbenchSummary;
  toggleLabel?: ReactNode;
  topActions?: AdvancedFilterWorkbenchAction[];
}) {
  const [innerOpen, setInnerOpen] = useState(defaultOpen);
  const panelId = `advanced-filter-workbench-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const open = isOpen ?? innerOpen;
  const hasAdvancedSection = advancedFields.length > 0 || Boolean(summary) || footerActions.length > 0;
  const hasFooter = Boolean(summary) || footerActions.length > 0;

  function handleOpenChange(nextOpen: boolean) {
    if (isOpen === undefined) {
      setInnerOpen(nextOpen);
    }
    onOpenChange?.(nextOpen);
  }

  return (
    <div
      className={cn(
        "ui-admin-panel-surface ui-admin-panel-surface--elevated ui-admin-panel-surface--feature p-3 md:p-4",
        className,
      )}
    >
      <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-start">
        <FilterBar className="justify-start">
          {primaryFields.map(renderAdvancedFilterWorkbenchField)}
          {hasAdvancedSection ? (
            <Button
              aria-controls={panelId}
              aria-expanded={open}
              onClick={() => handleOpenChange(!open)}
              type="button"
              variant={open || appliedAdvancedCount > 0 ? "secondary" : "outline"}
            >
              <Settings2 className="h-3.5 w-3.5" />
              {toggleLabel}
              {appliedAdvancedCount > 0 ? (
                <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-semibold leading-none text-primary-foreground">
                  {appliedAdvancedCount}
                </span>
              ) : null}
              <ChevronDown className={cn("h-3.5 w-3.5 transition-transform duration-200", open && "rotate-180")} />
            </Button>
          ) : null}
        </FilterBar>
        {topActions.length ? <RowActions className="justify-end xl:self-start">{renderAdvancedFilterWorkbenchActions(topActions)}</RowActions> : null}
      </div>
      {hasAdvancedSection ? (
        <div id={panelId}>
          <AdvancedFilterPanel isOpen={open} className={cn("md:grid-cols-2 xl:grid-cols-3", panelClassName)}>
            {advancedFields.map(renderAdvancedFilterWorkbenchField)}
            {hasFooter ? (
              <div className={ADVANCED_FILTER_WORKBENCH_FOOTER_CLASSNAME}>
                <div className="flex min-w-0 flex-wrap items-center gap-2.5">
                  {summary?.count !== undefined ? (
                    <span className={ADVANCED_FILTER_SUMMARY_BADGE_CLASSNAME}>
                      <span className="font-bold tabular-nums">{summary.count}</span>
                      <span>{summary.countLabel ?? "条结果"}</span>
                    </span>
                  ) : null}
                  {summary?.hint ? <span className="text-xs text-muted-foreground">{summary.hint}</span> : null}
                </div>
                {footerActions.length ? <RowActions className="justify-end">{renderAdvancedFilterWorkbenchActions(footerActions)}</RowActions> : null}
              </div>
            ) : null}
          </AdvancedFilterPanel>
        </div>
      ) : null}
    </div>
  );
}

export function DataTableSection({
  children,
  description,
  title,
}: PropsWithChildren<{ description?: ReactNode; title: ReactNode }>) {
  return (
    <SectionCard description={typeof description === "string" ? description : undefined} title={String(title)}>
      {typeof description === "string" ? null : description}
      <AppScrollbar className="w-full" viewportClassName="pb-1">
        {children}
      </AppScrollbar>
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
	size = "default",
	title,
}: PropsWithChildren<{
	description?: ReactNode;
	onOpenChange: (open: boolean) => void;
	open: boolean;
	size?: "default" | "wide" | "fullscreen";
	title: ReactNode;
}>) {
	const descriptionId = useId();
	const sizeClassName =
		size === "fullscreen"
			? "left-0 top-0 h-[100dvh] w-[100vw] max-h-none max-w-none translate-x-0 translate-y-0 rounded-none border-0"
			: size === "wide"
				? "w-[min(98vw,72rem)]"
				: "w-[min(96vw,52rem)]";

	return (
		<Dialog onOpenChange={onOpenChange} open={open}>
			<DialogContent
				aria-describedby={description ? descriptionId : undefined}
				className={cn("flex max-h-[calc(100dvh-2rem)] flex-col overflow-hidden p-0", sizeClassName)}
			>
				<DialogHeader className="shrink-0 px-6 pb-0 pt-6 pr-12">
					<DialogTitle>{title}</DialogTitle>
					{description ? <DialogDescription id={descriptionId}>{description}</DialogDescription> : null}
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
  const descriptionId = useId();

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent aria-describedby={description ? descriptionId : undefined} className="flex max-h-[calc(100dvh-2rem)] w-[min(96vw,44rem)] flex-col overflow-hidden p-0">
        <DialogHeader className="shrink-0 px-6 pb-0 pt-6 pr-12">
          <DialogTitle>{title}</DialogTitle>
          {description ? <DialogDescription id={descriptionId}>{description}</DialogDescription> : null}
        </DialogHeader>
        <AppScrollbar className="min-h-0 flex-1" viewportClassName="px-6 pb-6 pt-4">
          {children}
        </AppScrollbar>
      </DialogContent>
    </Dialog>
  );
}

export function AdminTopbar({
  breadcrumbs,
  pageTitle,
  tenantCode,
  topbarActions,
}: {
  breadcrumbs: Array<{ href?: string; label: string }>;
  pageTitle: string;
  tenantCode: string;
  topbarActions?: ReactNode;
}) {
  return (
    <header className="sticky top-0 z-20 hidden items-center justify-between gap-4 border-b border-border/40 bg-background/60 px-5 py-3 backdrop-blur-md supports-[backdrop-filter]:bg-background/40 md:flex md:px-6">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-3">
          <h2 className="text-base font-semibold text-foreground md:text-lg">{pageTitle}</h2>
          <Badge tone="muted">租户 {tenantCode}</Badge>
        </div>
        <div id="admin-topbar-description-portal" className="empty:hidden" />
      </div>
      <div className="flex items-center gap-2">
        <div id="admin-topbar-actions-portal" className="flex items-center gap-2 empty:hidden" />
        {topbarActions}
        <div className="admin-topbar-theme-toggle">
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}

export function BrandBlock({
  description,
  kicker,
  logo,
  title = "统一后台工作台",
}: {
  description?: ReactNode;
  kicker?: ReactNode;
  logo?: string | ImageAsset | null;
  title?: ReactNode;
}) {
  return (
    <div className="ui-admin-panel-surface ui-admin-panel-surface--feature ui-admin-rounded-feature bg-gradient-to-br from-background via-background to-secondary/35 p-4">
      <div className="flex items-start gap-3.5">
        <BrandIdentityFrame logo={logo} title={String(title)} />
        <div className={cn("min-w-0", kicker || description ? "space-y-2" : "flex min-h-14 items-center")}>
          {kicker ? (
            <div className="inline-flex rounded-full border border-border/70 bg-secondary/55 px-2.5 py-1 text-[11px] font-semibold tracking-[0.18em] text-muted-foreground">
              {kicker}
            </div>
          ) : null}
          <div className="space-y-1">
            <h1 className="text-lg font-semibold leading-tight tracking-tight text-foreground">{title}</h1>
            {description ? <p className="text-sm leading-6 text-muted-foreground">{description}</p> : null}
          </div>
        </div>
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
  avatar: string | ImageAsset | null;
  name: string;
  roleName: string;
  tenantCode: string;
}) {
  return (
    <Card className="overflow-hidden border-border/80 bg-secondary/50">
      <CardContent className="flex items-center gap-4 p-4">
        <div className="ui-admin-rounded-panel flex h-12 w-12 items-center justify-center overflow-hidden bg-background text-sm font-semibold text-foreground shadow-sm">
          {avatar ? <Image alt={name} className="h-full w-full object-cover" src={avatar} /> : name.slice(0, 1)}
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

function getVisibleChildren(node: AppMenuNode[]) {
  return node.filter((child) => !child.hidden);
}

function normalizeNavPath(path: string) {
  if (path === "/") {
    return "/";
  }
  return path.replace(/\/$/, "");
}

function isNodeActive(node: AppMenuNode, currentPath: string): boolean {
  const normalizedCurrentPath = normalizeNavPath(currentPath);
  const normalizedNodePath = normalizeNavPath(node.fullPath);

  if (normalizedNodePath === normalizedCurrentPath) {
    return true;
  }

  return getVisibleChildren(node.children).some((child) => isNodeActive(child, currentPath));
}

function isNodeExactActive(node: AppMenuNode, currentPath: string): boolean {
  return normalizeNavPath(node.fullPath) === normalizeNavPath(currentPath);
}

function getSidebarItemTone({ active, current }: { active: boolean; current: boolean }) {
  if (current) {
    return "font-medium text-primary";
  }

  if (active) {
    return "text-primary";
  }

  return "text-muted-foreground hover:text-foreground";
}

function SidebarNavItemContent({
  active,
  collapsed,
  current,
  icon,
  label,
  trailing,
}: {
  active: boolean;
  collapsed: boolean;
  current?: boolean;
  icon: string;
  label: string;
  trailing?: ReactNode;
}) {
  const textTone = active || current ? "text-primary" : "text-inherit";

  return (
    <>
      <SidebarMenuIcon
        className={cn("ui-admin-sidebar-item-icon bg-transparent transition-colors", collapsed && "h-8 w-8")}
        icon={icon}
      />
      {!collapsed ? <span className={cn("ui-admin-sidebar-item-label min-w-0 flex-1 truncate text-left transition-colors", textTone)}>{label}</span> : null}
      {!collapsed && trailing ? <span className={cn("ui-admin-sidebar-item-arrow shrink-0 transition-colors", textTone)}>{trailing}</span> : null}
    </>
  );
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
  setOpenKeys: React.Dispatch<React.SetStateAction<string[]>>;
  node: AppMenuNode;
}) {
  if (node.hidden) {
    return null;
  }

  const visibleChildren = getVisibleChildren(node.children);
  const hasChildren = visibleChildren.length > 0;
  const isOpen = openKeys.includes(node.fullPath);
  const isActive = isNodeActive(node, currentPath);
  const isCurrent = isNodeExactActive(node, currentPath);
  const [flyoutOpen, setFlyoutOpen] = useState(false);
  const closeTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (closeTimerRef.current !== null) {
        window.clearTimeout(closeTimerRef.current);
      }
    };
  }, []);

  function toggleOpen() {
    setOpenKeys((current) =>
      current.includes(node.fullPath)
        ? current.filter((item) => item !== node.fullPath)
        : [...current, node.fullPath],
    );
  }

  function openFlyout() {
    if (closeTimerRef.current !== null) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
    setFlyoutOpen(true);
  }

  function scheduleFlyoutClose() {
    if (closeTimerRef.current !== null) {
      window.clearTimeout(closeTimerRef.current);
    }
    closeTimerRef.current = window.setTimeout(() => {
      setFlyoutOpen(false);
      closeTimerRef.current = null;
    }, 120);
  }

  if (collapsed && hasChildren) {
    return (
      <div className="grid gap-1">
        <Popover onOpenChange={setFlyoutOpen} open={flyoutOpen}>
          <PopoverTrigger asChild>
            <button
              aria-expanded={flyoutOpen}
              aria-haspopup="menu"
              aria-label={node.title}
              data-active={isActive ? "true" : "false"}
              data-current={isCurrent ? "true" : "false"}
              data-open={!isActive && flyoutOpen ? "true" : "false"}
              className={cn(
                "ui-admin-sidebar-item group flex h-9 w-full items-center justify-center rounded-md px-0 transition-colors",
                getSidebarItemTone({ active: isActive, current: isCurrent }),
              )}
              onClick={() => setFlyoutOpen((current) => !current)}
              onFocus={openFlyout}
              onMouseEnter={openFlyout}
              onMouseLeave={scheduleFlyoutClose}
              type="button"
            >
              <SidebarNavItemContent active={isActive} collapsed current={isCurrent} icon={node.icon} label={node.title} />
            </button>
          </PopoverTrigger>
          <PopoverContent
            align="start"
            className="w-56 rounded-md border-border/80 p-1"
            onFocus={openFlyout}
            onMouseEnter={openFlyout}
            onMouseLeave={scheduleFlyoutClose}
            side="right"
            sideOffset={10}
          >
            <div className="px-3 pb-1.5 pt-1 text-[11px] text-muted-foreground">{node.title}</div>
            <div className="grid gap-1">
              {visibleChildren.map((child) => (
                <SidebarNavNode
                  collapsed={false}
                  currentPath={currentPath}
                  key={child.fullPath}
                  node={child}
                  onNavigate={() => {
                    setFlyoutOpen(false);
                    onNavigate();
                  }}
                  openKeys={openKeys}
                  setOpenKeys={setOpenKeys}
                />
              ))}
            </div>
          </PopoverContent>
        </Popover>
      </div>
    );
  }

  return (
    <div className="grid gap-1">
      {hasChildren ? (
        <button
          aria-expanded={isOpen}
          data-active={isActive ? "true" : "false"}
          data-current={isCurrent ? "true" : "false"}
          data-open={!isActive && !isCurrent && isOpen ? "true" : "false"}
          className={cn(
            "ui-admin-sidebar-item flex h-9 w-full min-w-0 items-center gap-2.5 rounded-md px-3 py-0 text-sm transition-colors",
            getSidebarItemTone({ active: isActive, current: isCurrent }),
          )}
          onClick={toggleOpen}
          type="button"
        >
          <SidebarNavItemContent
            active={isActive}
            collapsed={false}
            current={isCurrent}
            icon={node.icon}
            label={node.title}
            trailing={<ChevronDown className={cn("h-4 w-4 shrink-0 transition-transform", isOpen ? "rotate-180" : "")} />}
          />
        </button>
      ) : (
        <Tooltip>
          <TooltipTrigger asChild>
            <NavLink
              aria-label={collapsed ? node.title : undefined}
              data-active={isActive ? "true" : "false"}
              data-current={isCurrent ? "true" : "false"}
              data-open="false"
              className={cn(
                "ui-admin-sidebar-item group flex h-9 min-w-0 items-center gap-2.5 rounded-md px-3 py-0 text-sm transition-colors",
                getSidebarItemTone({ active: isActive, current: isCurrent }),
                collapsed && "h-9 justify-center px-0",
              )}
              onClick={onNavigate}
              to={node.fullPath}
            >
              <SidebarNavItemContent active={isActive} collapsed={collapsed} current={isCurrent} icon={node.icon} label={node.title} />
            </NavLink>
          </TooltipTrigger>
          {collapsed ? <TooltipContent side="right">{node.title}</TooltipContent> : null}
        </Tooltip>
      )}
      {hasChildren && isOpen && !collapsed ? (
        <div className="ml-3 grid gap-1 border-l border-border pl-3">
          {visibleChildren.map((child) => (
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

function SidebarUtilityLink({
  collapsed,
  currentPath,
  icon: Icon,
  label,
  onNavigate,
  to,
}: {
  collapsed: boolean;
  currentPath: string;
  icon: LucideIcon;
  label: string;
  onNavigate: () => void;
  to: string;
}) {
  const isCurrent = normalizeNavPath(currentPath) === normalizeNavPath(to);
  const textTone = isCurrent ? "text-primary" : "text-inherit";

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <NavLink
          aria-label={collapsed ? label : undefined}
          data-active={isCurrent ? "true" : "false"}
          data-current={isCurrent ? "true" : "false"}
          data-open="false"
          className={cn(
            "ui-admin-sidebar-item group flex h-9 min-w-0 items-center gap-2.5 rounded-md px-3 py-0 text-sm transition-colors",
            getSidebarItemTone({ active: isCurrent, current: isCurrent }),
            collapsed && "h-9 justify-center px-0",
          )}
          onClick={onNavigate}
          to={to}
        >
          <span
            className={cn(
              "ui-admin-sidebar-item-icon inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-transparent transition-colors",
              isCurrent ? "text-primary" : "text-muted-foreground",
            )}
          >
            <Icon className="h-3.5 w-3.5" strokeWidth={2.1} />
          </span>
          {!collapsed ? <span className={cn("ui-admin-sidebar-item-label min-w-0 flex-1 truncate transition-colors", textTone)}>{label}</span> : null}
        </NavLink>
      </TooltipTrigger>
      {collapsed ? <TooltipContent side="right">{label}</TooltipContent> : null}
    </Tooltip>
  );
}

function SidebarAccountRow({
  avatar,
  collapsed,
  name,
  onNavigate,
  onLogout,
  roleName,
}: {
  avatar: string | ImageAsset | null;
  collapsed: boolean;
  name: string;
  onNavigate?: () => void;
  onLogout: () => void;
  roleName: string;
}) {
  const navigate = useNavigate();
  const roleLabel = roleName || "未分配角色";

  function openProfile() {
    navigate("/profile");
    onNavigate?.();
  }

  function handleProfileKeyDown(event: ReactKeyboardEvent<HTMLDivElement>) {
    if (event.key !== "Enter" && event.key !== " ") {
      return;
    }
    event.preventDefault();
    openProfile();
  }

  function handleLogoutClick(event: ReactMouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();
    onLogout();
  }

  if (collapsed) {
    return (
      <div className="grid justify-items-center gap-2 pt-1">
        <Tooltip>
          <TooltipTrigger asChild>
            <div
              aria-label={`${name}，${roleLabel}`}
            className="ui-admin-rounded-control flex h-8 w-8 cursor-pointer items-center justify-center overflow-hidden bg-secondary/65 text-xs font-semibold text-foreground transition-colors hover:bg-secondary/85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
              onClick={openProfile}
              onKeyDown={handleProfileKeyDown}
              role="link"
              tabIndex={0}
            >
              {avatar ? <Image alt={name} className="h-full w-full object-cover" src={avatar} /> : name.slice(0, 1)}
            </div>
          </TooltipTrigger>
          <TooltipContent side="right">
            <div className="grid gap-0.5">
              <span>{name}</span>
              <span className="text-[11px] opacity-80">{roleLabel}</span>
            </div>
          </TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button className="ui-admin-rounded-control h-8 w-8" onClick={handleLogoutClick} size="icon" type="button" variant="ghost">
              <LogOut className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">退出登录</TooltipContent>
        </Tooltip>
      </div>
    );
  }

  return (
    <div
      className="ui-admin-rounded-control flex cursor-pointer items-center gap-2.5 border border-border/70 bg-secondary/35 px-2.5 py-2 transition-colors hover:bg-secondary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
      onClick={openProfile}
      onKeyDown={handleProfileKeyDown}
      role="link"
      tabIndex={0}
    >
      <div className="ui-admin-rounded-control flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden bg-background text-xs font-semibold text-foreground shadow-sm">
        {avatar ? <Image alt={name} className="h-full w-full object-cover" src={avatar} /> : name.slice(0, 1)}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-foreground">{name}</p>
        <p className="truncate text-xs text-muted-foreground">{roleLabel}</p>
      </div>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button className="h-8 w-8 rounded-lg" onClick={handleLogoutClick} size="icon" type="button" variant="ghost">
            <LogOut className="h-3.5 w-3.5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>退出登录</TooltipContent>
      </Tooltip>
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
      {!sidebarCollapsed ? <p className="px-2 text-[11px] font-semibold text-muted-foreground">导航</p> : null}
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
  avatar,
  brandDescription,
  brandKicker,
  brandLogo,
  brandTitle,
  collapsed,
  currentPath,
  menuTree,
  name,
  onLogout,
  onNavigate,
  roleName,
  setCollapsed,
}: {
  avatar: string | ImageAsset | null;
  brandDescription?: ReactNode;
  brandKicker?: ReactNode;
  brandLogo?: string | ImageAsset | null;
  brandTitle?: string;
  collapsed: boolean;
  currentPath: string;
  menuTree: AppMenuNode[];
  name: string;
  onLogout: () => void;
  onNavigate: () => void;
  roleName: string;
  setCollapsed: (collapsed: boolean) => void;
}) {
  return (
    <TooltipProvider delayDuration={120}>
      <aside
        className={cn(
          "hidden h-[100dvh] flex-col border-r border-border bg-card md:flex",
          collapsed ? "w-16 px-2.5 py-3" : "w-[18.5rem] px-4 py-5",
        )}
      >
        <div className={cn("gap-3", collapsed ? "grid justify-items-center" : "flex items-start justify-between")}>
          {collapsed ? (
            <SidebarBrandMark logo={brandLogo} title={brandTitle} />
          ) : (
            <BrandBlock description={brandDescription} kicker={brandKicker} logo={brandLogo} title={brandTitle} />
          )}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button onClick={() => setCollapsed(!collapsed)} size="icon" type="button" variant="ghost">
                {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
              </Button>
            </TooltipTrigger>
            <TooltipContent side={collapsed ? "right" : "bottom"}>{collapsed ? "展开侧栏" : "折叠侧栏"}</TooltipContent>
          </Tooltip>
        </div>
        <AppScrollbar className="mt-5 min-h-0 flex-1" viewportClassName="pr-1">
          <TreeNav currentPath={currentPath} menuTree={menuTree} onNavigate={onNavigate} sidebarCollapsed={collapsed} />
        </AppScrollbar>
        <div className="mt-5 grid gap-2 border-t border-border/80 pt-4">
          <SidebarUtilityLink collapsed={collapsed} currentPath={currentPath} icon={Wrench} label="运维服务" onNavigate={onNavigate} to="/ops-service" />
          <SidebarAccountRow avatar={avatar} collapsed={collapsed} name={name} onNavigate={onNavigate} onLogout={onLogout} roleName={roleName} />
        </div>
      </aside>
    </TooltipProvider>
  );
}

export function AdminAppShell({
  avatar,
  brandDescription,
  brandKicker,
  brandLogo,
  brandTitle,
  children,
  currentPath,
  menuTree,
  onLogout,
  tenantCode,
  topbarActions,
  userName,
  userRole,
}: PropsWithChildren<{
  avatar: string | ImageAsset | null;
  brandDescription?: ReactNode;
  brandKicker?: ReactNode;
  brandLogo?: string | ImageAsset | null;
  brandTitle?: string;
  currentPath: string;
  menuTree: AppMenuNode[];
  onLogout: () => void;
  tenantCode: string;
  topbarActions?: ReactNode;
  userName: string;
  userRole: string;
}>) {
  const [collapsed, setCollapsed] = useState(() => readStoredBoolean(SIDEBAR_KEY, false));

  useEffect(() => {
    window.localStorage.setItem(SIDEBAR_KEY, String(collapsed));
  }, [collapsed]);

  const trail = getNodeTrail(menuTree, currentPath);
  const currentNode = trail.at(-1);
  const breadcrumbs = [{ href: "/", label: "后台" }, ...trail.map((node) => ({ href: node.fullPath, label: node.title }))];
  const pageTitle = currentNode?.title || (currentPath === "/ops-service" ? "运维服务" : currentPath === "/profile" ? "个人中心" : "控制台");

  return (
    <AppFrameShell
      contentClassName="p-4 md:px-5 md:py-5"
      contentInnerClassName="grid max-w-[1440px] gap-4"
      desktopSidebar={
        <AdminSidebar
          avatar={avatar}
          brandDescription={brandDescription}
          brandKicker={brandKicker}
          brandLogo={brandLogo}
          brandTitle={brandTitle}
          collapsed={collapsed}
          currentPath={currentPath}
          menuTree={menuTree}
          name={userName}
          onLogout={onLogout}
          onNavigate={() => undefined}
          roleName={userRole}
          setCollapsed={setCollapsed}
        />
      }
      desktopSidebarClassName="md:flex"
      header={
        <AdminTopbar
          breadcrumbs={breadcrumbs}
          pageTitle={pageTitle}
          tenantCode={tenantCode}
          topbarActions={topbarActions}
        />
      }
      mobileBar={({ openSidebar }) => (
        <div className="flex items-center justify-between border-b border-border px-4 py-3 md:hidden">
          <Button onClick={openSidebar} size="icon" type="button" variant="outline">
            <PanelLeftOpen className="h-4 w-4" />
          </Button>
          <p className="font-semibold text-foreground">{pageTitle}</p>
          <ThemeToggle />
        </div>
      )}
      mobileSidebar={({ closeSidebar }) => (
        <div className="flex h-full flex-col gap-4">
          <BrandBlock description={brandDescription} kicker={brandKicker} logo={brandLogo} title={brandTitle} />
          <AppScrollbar className="min-h-0 flex-1" viewportClassName="pr-1">
            <TreeNav currentPath={currentPath} menuTree={menuTree} onNavigate={closeSidebar} />
          </AppScrollbar>
          <div className="grid gap-2 border-t border-border/80 pt-4">
            <SidebarUtilityLink collapsed={false} currentPath={currentPath} icon={Wrench} label="运维服务" onNavigate={closeSidebar} to="/ops-service" />
            <SidebarAccountRow avatar={avatar} collapsed={false} name={userName} onNavigate={closeSidebar} onLogout={onLogout} roleName={userRole} />
          </div>
        </div>
      )}
    >
      {children}
    </AppFrameShell>
  );
}

export function AdminShell({ children, sidebar }: PropsWithChildren<{ sidebar: ReactNode }>) {
  return (
    <div className="grid min-h-[100dvh] gap-4 px-4 py-4 lg:grid-cols-[18rem_minmax(0,1fr)]">
      <div>{sidebar}</div>
      <div>{children}</div>
    </div>
  );
}

export function AdminPageStack({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("grid gap-4", className)} {...props} />;
}

export function AdminTwoColumn({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("grid gap-4 xl:grid-cols-2", className)} {...props} />;
}

export function AdminThreeColumn({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("grid gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]", className)} {...props} />;
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
      <AppScrollbar className={cn("w-full", className)} viewportClassName="pb-1">
        {children}
      </AppScrollbar>
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
      <label className={cn("flex items-start gap-3 rounded-surface border border-border/60 bg-background px-4 py-3", disabled && "opacity-60")}>
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
	className,
	description,
	disabled = false,
	emptyLabel = "暂无可选节点",
	nodes,
	onChange,
	scrollClassName,
	title,
}: {
	checkedIds: number[];
	className?: string;
	description?: ReactNode;
	disabled?: boolean;
	emptyLabel?: ReactNode;
	nodes: TreeLikeNode[];
	onChange: (next: number[]) => void;
	scrollClassName?: string;
	title: ReactNode;
}) {
	return (
		<Card className={cn("flex h-full min-h-0 flex-col", className)}>
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
			<CardContent className="flex min-h-0 flex-1 flex-col gap-4">
				<Badge tone="muted">当前选中 {checkedIds.length} 项</Badge>
				{nodes.length ? (
					<AppScrollbar className={cn("min-h-0 flex-1 max-h-[24rem]", scrollClassName)} viewportClassName="pr-1">
						<ul className="grid gap-3">
							{nodes.map((node) => (
								<TreeSelectorNode checkedIds={checkedIds} disabled={disabled} key={node.id} node={node} onChange={onChange} />
              ))}
            </ul>
          </AppScrollbar>
        ) : (
          <EmptyState description={emptyLabel} title="没有可展示的树节点" />
        )}
      </CardContent>
    </Card>
  );
}

export function MasterDetailLayout({ children, className }: PropsWithChildren<{ className?: string }>) {
  return <div className={cn("grid gap-4 xl:grid-cols-[minmax(300px,360px)_minmax(0,1fr)]", className)}>{children}</div>;
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
    <div className={cn("ui-admin-panel-surface ui-admin-rounded-panel grid gap-4 p-4", className)}>
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
    success: "border-[hsl(var(--ui-admin-success)/0.2)] bg-[hsl(var(--ui-admin-success)/0.1)]",
  };
  const badgeClass: Record<string, string> = {
    failed: "bg-destructive text-destructive-foreground",
    pending: "bg-secondary text-secondary-foreground",
    running: "bg-primary text-primary-foreground",
    skipped: "bg-secondary text-secondary-foreground",
    success: "bg-[hsl(var(--ui-admin-success))] text-[hsl(var(--ui-admin-success-foreground))]",
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
        <div className={cn("grid gap-2 rounded-surface border px-4 py-3", stateClass[item.state])} key={`${String(item.label)}-${index}`}>
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
          <CardContent className="space-y-2 p-4">
            <p className="text-[11px] font-medium text-muted-foreground">{item.label}</p>
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
              <div className="grid gap-1 rounded-surface border border-border/70 bg-secondary/30 px-4 py-3" key={`${commit.hash}-${commit.message}`}>
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
  kicker = "管理入口",
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
          <div className={cn("rounded-surface border px-4 py-3", index === currentStep ? "border-primary/30 bg-primary/10" : "border-border bg-secondary/20")} key={`${String(step.label)}-${index}`}>
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
    <AuthPanel description={description} kicker="初始化引导" title={title}>
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
  contentClassName,
  contentInnerClassName,
  header,
  mobileBar,
  mobileDrawerClassName,
  mobileSidebar,
  rootClassName,
  sidebar,
  sidebarClassName,
}: PropsWithChildren<{
  className?: string;
  contentClassName?: string;
  contentInnerClassName?: string;
  header?: ReactNode;
  mobileBar?: (controls: { closeSidebar: () => void; openSidebar: () => void }) => ReactNode;
  mobileDrawerClassName?: string;
  mobileSidebar?: ReactNode | ((controls: { closeSidebar: () => void }) => ReactNode);
  rootClassName?: string;
  sidebar: ReactNode;
  sidebarClassName?: string;
}>) {
  return (
    <AppFrameShell
      backgroundClassName={className}
      contentClassName={cn("px-4 py-5 md:px-6 md:py-6", contentClassName)}
      contentInnerClassName={cn("grid max-w-[1680px] gap-8", contentInnerClassName)}
      desktopSidebar={<div className="h-full">{sidebar}</div>}
      desktopSidebarClassName={cn("xl:flex xl:w-[20rem] xl:shrink-0", sidebarClassName)}
      header={header}
      mobileBar={mobileBar}
      mobileDrawerClassName={mobileDrawerClassName}
      mobileSidebar={
        typeof mobileSidebar === "function"
          ? ({ closeSidebar }) => <div className="h-full">{mobileSidebar({ closeSidebar })}</div>
          : <div className="h-full">{mobileSidebar ?? sidebar}</div>
      }
      rootClassName={rootClassName}
    >
      {children}
    </AppFrameShell>
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
              className="rounded-control border border-transparent px-3 py-2 transition-colors hover:bg-secondary/80 hover:text-foreground"
              href={item.href}
              key={item.href}
            >
              <div className="font-medium text-foreground">{item.label}</div>
              {item.meta ? <div className="mt-1 text-xs leading-5 text-muted-foreground">{item.meta}</div> : null}
            </a>
          ))}
        </nav>
        {footer ? <div className="grid gap-3 rounded-surface border border-border/70 bg-secondary/30 p-4">{footer}</div> : null}
      </CardContent>
    </Card>
  );
}

export type AnchorItem = {
  description?: ReactNode;
  href: string;
  title: ReactNode;
};

export function Anchor({
  activeHref,
  className,
  items,
  offset = 96,
  onChange,
  title = "页面导航",
}: {
  activeHref?: string;
  className?: string;
  items: AnchorItem[];
  offset?: number;
  onChange?: (href: string) => void;
  title?: ReactNode;
}) {
  const [internalActiveHref, setInternalActiveHref] = useState(activeHref ?? items[0]?.href ?? "");
  const resolvedActiveHref = activeHref ?? internalActiveHref;

  useEffect(() => {
    if (activeHref !== undefined) {
      setInternalActiveHref(activeHref);
      return;
    }

    if (typeof window === "undefined") {
      return;
    }

    const syncHash = () => setInternalActiveHref(window.location.hash || items[0]?.href || "");
    syncHash();
    window.addEventListener("hashchange", syncHash);
    return () => window.removeEventListener("hashchange", syncHash);
  }, [activeHref, items]);

  function handleNavigate(href: string) {
    if (typeof window !== "undefined") {
      const target = href.startsWith("#") ? document.getElementById(href.slice(1)) : document.querySelector<HTMLElement>(href);
      if (target) {
        const top = target.getBoundingClientRect().top + window.scrollY - offset;
        window.history.replaceState(null, "", href);
        window.scrollTo({ behavior: "smooth", top });
      }
    }

    if (activeHref === undefined) {
      setInternalActiveHref(href);
    }
    onChange?.(href);
  }

  return (
    <Card className={cn("sticky top-24", className)}>
      <CardHeader>
        <CardTitle className="text-sm">{title}</CardTitle>
        <CardDescription>用于文档页、长详情页和设置页的同页定位导航。</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-2">
        {items.map((item) => (
          <a
            className={cn(
              "ui-admin-rounded-control grid gap-1 border border-transparent px-3 py-2 transition-colors",
              resolvedActiveHref === item.href ? "border-primary/20 bg-primary/8 text-foreground" : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground",
            )}
            href={item.href}
            key={item.href}
            onClick={(event) => {
              event.preventDefault();
              handleNavigate(item.href);
            }}
          >
            <span className="text-sm font-medium">{item.title}</span>
            {item.description ? <span className="text-xs leading-5 text-muted-foreground">{item.description}</span> : null}
          </a>
        ))}
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
          <div className="ui-admin-rounded-feature border border-dashed border-[color:var(--ui-admin-border-strong)] bg-[var(--ui-admin-surface-panel-muted)] p-5">{children}</div>
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
      <AppScrollbar className={cn("w-full", className)} viewportClassName="pb-1">
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
      </AppScrollbar>
    </SectionCard>
  );
}

export { EmptyState, FormActions };
