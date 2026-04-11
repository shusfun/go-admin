import { actionsRoutes } from "./actions";
import { dataRoutes } from "./data";
import { feedbackRoutes } from "./feedback";
import { formsRoutes } from "./forms";
import { docsRoutes, layoutRoutes } from "./layouts";
import { OverviewPage } from "./overview";
import type { PreviewKind } from "./overview-previews";
import { toApiAnchorId, type DocCategory as ShowcaseDocCategory, type DocEntry as ShowcaseDocEntry, type ShowcaseRoute } from "./shared";

export type CategoryKey =
  | "overview"
  | "shells"
  | "navigation"
  | "patterns"
  | "forms"
  | "data"
  | "feedback"
  | "foundation"
  | "docs";

type RouteMeta = {
  categoryKey: CategoryKey;
  exportNames: string[];
  featured?: boolean;
  keywords?: string[];
  previewKind: PreviewKind;
};

type SupplementalEntry = {
  categoryKey: CategoryKey;
  exportNames: string[];
  keywords?: string[];
  ownerRoute: string;
  previewKind?: PreviewKind;
  summaryKey?: string;
  title: string;
};

const categoryConfig: Record<CategoryKey, Pick<ShowcaseDocCategory, "descriptionKey" | "key" | "labelKey">> = {
  overview: {
    descriptionKey: "showcase.category.overview.description",
    key: "overview",
    labelKey: "showcase.category.overview.label",
  },
  shells: {
    descriptionKey: "showcase.category.shells.description",
    key: "shells",
    labelKey: "showcase.category.shells.label",
  },
  navigation: {
    descriptionKey: "showcase.category.navigation.description",
    key: "navigation",
    labelKey: "showcase.category.navigation.label",
  },
  patterns: {
    descriptionKey: "showcase.category.patterns.description",
    key: "patterns",
    labelKey: "showcase.category.patterns.label",
  },
  forms: {
    descriptionKey: "showcase.category.forms.description",
    key: "forms",
    labelKey: "showcase.category.forms.label",
  },
  data: {
    descriptionKey: "showcase.category.data.description",
    key: "data",
    labelKey: "showcase.category.data.label",
  },
  feedback: {
    descriptionKey: "showcase.category.feedback.description",
    key: "feedback",
    labelKey: "showcase.category.feedback.label",
  },
  foundation: {
    descriptionKey: "showcase.category.foundation.description",
    key: "foundation",
    labelKey: "showcase.category.foundation.label",
  },
  docs: {
    descriptionKey: "showcase.category.docs.description",
    key: "docs",
    labelKey: "showcase.category.docs.label",
  },
};

const categoryOrder: CategoryKey[] = ["overview", "shells", "navigation", "patterns", "forms", "data", "feedback", "foundation", "docs"];

const overviewRoute: ShowcaseRoute = {
  component: OverviewPage,
  label: "Overview",
  path: "/overview",
  shortLabel: "OVR",
  summaryKey: "showcase.overview.summary",
};

const allRoutes: ShowcaseRoute[] = [overviewRoute, ...actionsRoutes, ...formsRoutes, ...feedbackRoutes, ...dataRoutes, ...layoutRoutes, ...docsRoutes];

const routeMetaByLabel: Record<string, RouteMeta> = {
  Overview: { categoryKey: "overview", exportNames: [], previewKind: "layout" },
  AppFrameShell: { categoryKey: "shells", exportNames: ["AppFrameShell", "AdminAppShell"], featured: true, previewKind: "layout" },
  AdminShell: { categoryKey: "shells", exportNames: ["AdminShell", "AdminPageStack", "AdminTwoColumn", "AdminThreeColumn"], featured: true, previewKind: "layout" },
  DocsShell: { categoryKey: "shells", exportNames: ["DocsShell"], previewKind: "layout" },
  PageHeader: { categoryKey: "navigation", exportNames: ["PageHeader"], previewKind: "layout" },
  Breadcrumb: { categoryKey: "navigation", exportNames: ["Breadcrumb"], previewKind: "breadcrumb" },
  ThemeToggle: { categoryKey: "navigation", exportNames: ["ThemeToggle"], previewKind: "theme" },
  GlobalSearch: { categoryKey: "navigation", exportNames: ["GlobalSearch"], featured: true, previewKind: "input" },
  "Admin Navigation": { categoryKey: "navigation", exportNames: ["AdminTopbar", "AdminSidebar", "TreeNav"], previewKind: "tree" },
  "Brand & Identity": { categoryKey: "navigation", exportNames: ["BrandBlock", "IdentityCard"], previewKind: "brand" },
  Anchor: { categoryKey: "navigation", exportNames: ["Anchor"], previewKind: "layout" },
  Backtop: { categoryKey: "navigation", exportNames: ["Backtop"], previewKind: "watermark" },
  FilterPanel: { categoryKey: "patterns", exportNames: ["FilterPanel"], previewKind: "form" },
  Toolbar: { categoryKey: "patterns", exportNames: ["Toolbar", "FilterBar", "AdvancedFilterPanel", "AdvancedFilterWorkbench"], previewKind: "form" },
  DataTableSection: { categoryKey: "patterns", exportNames: ["DataTableSection"], previewKind: "table" },
  SectionCard: { categoryKey: "patterns", exportNames: ["SectionCard"], previewKind: "layout" },
  ProgressSteps: { categoryKey: "patterns", exportNames: ["ProgressSteps"], previewKind: "steps" },
  Loading: { categoryKey: "patterns", exportNames: ["Loading"], previewKind: "loading" },
  MetricCard: { categoryKey: "patterns", exportNames: ["MetricCard"], previewKind: "metric" },
  MetricGrid: { categoryKey: "patterns", exportNames: ["MetricGrid"], previewKind: "metric" },
  StatStrip: { categoryKey: "patterns", exportNames: ["StatStrip"], previewKind: "metric" },
  TreeSelectorPanel: { categoryKey: "patterns", exportNames: ["TreeSelectorPanel", "TreeTableSection"], previewKind: "tree" },
  MasterDetailLayout: { categoryKey: "patterns", exportNames: ["MasterDetailLayout", "ListPane", "DetailPane"], featured: true, previewKind: "layout" },
  AuthLayout: { categoryKey: "patterns", exportNames: ["AuthLayout", "AuthPanel"], previewKind: "auth" },
  WizardLayout: { categoryKey: "patterns", exportNames: ["WizardLayout", "WizardSteps"], previewKind: "steps" },
  "Wide Table Patterns": {
    categoryKey: "patterns",
    exportNames: ["WorkbenchWideTablePattern", "DetailSplitTablePattern", "GroupedMetricTablePattern", "WideTablePatternGallery"],
    featured: true,
    previewKind: "table",
  },
  Calendar: { categoryKey: "forms", exportNames: ["Calendar"], previewKind: "calendar" },
  Form: { categoryKey: "forms", exportNames: ["Form", "FormSection"], previewKind: "form" },
  Input: { categoryKey: "forms", exportNames: ["Input"], previewKind: "input" },
  Textarea: { categoryKey: "forms", exportNames: ["Textarea"], previewKind: "form" },
  Select: { categoryKey: "forms", exportNames: ["Select"], previewKind: "input" },
  Combobox: { categoryKey: "forms", exportNames: ["Combobox"], previewKind: "choice" },
  DatePicker: { categoryKey: "forms", exportNames: ["DatePicker"], previewKind: "calendar" },
  DateRangePicker: { categoryKey: "forms", exportNames: ["DateRangePicker"], previewKind: "calendar" },
  FormField: { categoryKey: "forms", exportNames: ["FormField", "Label", "HelpText", "FieldError"], previewKind: "form" },
  Switch: { categoryKey: "forms", exportNames: ["Switch"], previewKind: "choice" },
  Checkbox: { categoryKey: "forms", exportNames: ["Checkbox"], previewKind: "choice" },
  RadioGroup: { categoryKey: "forms", exportNames: ["RadioGroup", "RadioGroupItem"], previewKind: "choice" },
  ImageCaptchaField: { categoryKey: "forms", exportNames: ["ImageCaptchaField"], featured: true, previewKind: "form" },
  Upload: { categoryKey: "forms", exportNames: ["Upload"], previewKind: "upload" },
  Card: { categoryKey: "data", exportNames: ["Card", "CardHeader", "CardTitle", "CardDescription", "CardContent", "CardFooter"], previewKind: "layout" },
  Table: { categoryKey: "data", exportNames: ["Table", "TableHeader", "TableBody", "TableRow", "TableHead", "TableCell"], previewKind: "table" },
  Pagination: { categoryKey: "data", exportNames: ["Pagination"], previewKind: "pagination" },
  Tabs: { categoryKey: "data", exportNames: ["Tabs", "TabsList", "TabsTrigger", "TabsContent"], previewKind: "tabs" },
  Progress: { categoryKey: "data", exportNames: ["Progress"], previewKind: "progress" },
  Avatar: { categoryKey: "data", exportNames: ["Avatar"], previewKind: "avatar" },
  Image: { categoryKey: "data", exportNames: ["Image", "normalizeImageSource", "resolveImageVariantSize", "buildImageVariantSource"], previewKind: "avatar" },
  Icon: { categoryKey: "data", exportNames: ["Icon", "IconGrid"], previewKind: "icon" },
  LogViewer: { categoryKey: "data", exportNames: ["LogViewer", "ReadonlyCodeBlock"], previewKind: "log" },
  AppVirtualList: { categoryKey: "data", exportNames: ["AppVirtualList", "AppScrollbar"], previewKind: "table" },
  DetailGrid: { categoryKey: "data", exportNames: ["DefinitionList", "DetailItem", "DetailGrid"], previewKind: "table" },
  KeyValueCard: { categoryKey: "data", exportNames: ["KeyValueCard"], previewKind: "table" },
  TaskStatusCard: { categoryKey: "data", exportNames: ["TaskStatusCard"], previewKind: "metric" },
  CommitList: { categoryKey: "data", exportNames: ["CommitList"], previewKind: "log" },
  InlineNotice: { categoryKey: "feedback", exportNames: ["InlineNotice"], previewKind: "notice" },
  EmptyState: { categoryKey: "feedback", exportNames: ["EmptyState", "EmptyBlock", "EmptyLogState"], previewKind: "empty" },
  "Error Pages": { categoryKey: "feedback", exportNames: ["Error404", "Error500", "ErrorActions", "ErrorFooterLink"], previewKind: "empty" },
  Skeleton: { categoryKey: "feedback", exportNames: ["Skeleton"], previewKind: "skeleton" },
  ToastViewport: { categoryKey: "feedback", exportNames: ["ToastViewport", "toast"], previewKind: "toast" },
  ConfirmDialog: { categoryKey: "feedback", exportNames: ["ConfirmDialog"], previewKind: "dialog" },
  ConfirmActionDialog: { categoryKey: "feedback", exportNames: ["ConfirmActionDialog"], previewKind: "dialog" },
  FormDialog: { categoryKey: "feedback", exportNames: ["FormDialog"], previewKind: "dialog" },
  DetailDialog: { categoryKey: "feedback", exportNames: ["DetailDialog"], previewKind: "dialog" },
  Dialog: { categoryKey: "feedback", exportNames: ["Dialog", "DialogContent", "DialogHeader", "DialogTitle", "DialogDescription"], previewKind: "dialog" },
  "Dialog Primitives": { categoryKey: "feedback", exportNames: ["DialogTrigger", "DialogPortal", "DialogOverlay", "DialogClose"], previewKind: "dialog" },
  Drawer: { categoryKey: "feedback", exportNames: ["Drawer"], previewKind: "dialog" },
  Popover: { categoryKey: "feedback", exportNames: ["Popover", "PopoverTrigger", "PopoverAnchor", "PopoverContent"], previewKind: "popover" },
  Tooltip: { categoryKey: "feedback", exportNames: ["TooltipProvider", "Tooltip", "TooltipTrigger", "TooltipContent"], previewKind: "popover" },
  DropdownMenu: { categoryKey: "feedback", exportNames: ["DropdownMenu", "DropdownMenuTrigger", "DropdownMenuContent", "DropdownMenuItem"], previewKind: "popover" },
  Button: { categoryKey: "foundation", exportNames: ["Button", "AsyncActionButton", "RowActions"], previewKind: "button" },
  Badge: { categoryKey: "foundation", exportNames: ["Badge"], previewKind: "badge" },
  StatusBadge: { categoryKey: "foundation", exportNames: ["StatusBadge"], previewKind: "status" },
  "Docs Blocks": { categoryKey: "docs", exportNames: ["DocsSection", "DocsDemoCard", "DocsApiTable", "DocsSidebar"], previewKind: "layout" },
  Watermark: { categoryKey: "docs", exportNames: ["Watermark"], previewKind: "watermark" },
};

const supplementalEntries: SupplementalEntry[] = [
  { categoryKey: "foundation", exportNames: ["FormActions"], ownerRoute: "Toolbar", title: "FormActions" },
];

function getRouteMeta(route: ShowcaseRoute) {
  const meta = routeMetaByLabel[route.label];
  if (!meta) {
    throw new Error(`Missing showcase route metadata for ${route.label}`);
  }
  return meta;
}

function getRoute(label: string) {
  const route = allRoutes.find((item) => item.label === label);
  if (!route) {
    throw new Error(`Missing showcase route: ${label}`);
  }
  return route;
}

function createRouteEntry(route: ShowcaseRoute): ShowcaseDocEntry {
  const meta = getRouteMeta(route);
  return {
    categoryKey: meta.categoryKey,
    exportNames: meta.exportNames,
    featured: meta.featured,
    href: route.path,
    id: route.path,
    keywords: [route.label, route.shortLabel, ...(meta.keywords ?? []), ...meta.exportNames],
    ownerRoute: route.label,
    previewKind: meta.previewKind,
    shortLabel: route.shortLabel,
    summaryKey: route.summaryKey,
    title: route.label,
  };
}

function createSupplementalEntry(config: SupplementalEntry): ShowcaseDocEntry {
  const ownerRoute = getRoute(config.ownerRoute);
  const ownerMeta = getRouteMeta(ownerRoute);
  return {
    categoryKey: config.categoryKey,
    exportNames: config.exportNames,
    href: `${ownerRoute.path}#${toApiAnchorId(config.title)}`,
    id: `${ownerRoute.path}:${config.title}`,
    keywords: [config.title, config.ownerRoute, ...(config.keywords ?? []), ...config.exportNames],
    ownerRoute: config.ownerRoute,
    previewKind: config.previewKind ?? ownerMeta.previewKind,
    summaryKey: config.summaryKey ?? ownerRoute.summaryKey,
    title: config.title,
  };
}

function isRouteEntry(entry: ShowcaseDocEntry, routePaths: Set<string>) {
  return routePaths.has(entry.href);
}

const routeEntries = allRoutes.map(createRouteEntry);
const routeLabels = new Set(allRoutes.map((route) => route.label));

function createAutoHelperEntries(route: ShowcaseRoute) {
  const meta = getRouteMeta(route);
  return meta.exportNames
    .filter((exportName) => exportName !== route.label && !routeLabels.has(exportName))
    .map((exportName) =>
      createSupplementalEntry({
        categoryKey: meta.categoryKey,
        exportNames: [exportName],
        ownerRoute: route.label,
        previewKind: meta.previewKind,
        title: exportName,
      }),
    );
}

const helperEntries = [...routeEntries.flatMap((route) => createAutoHelperEntries(getRoute(route.ownerRoute))), ...supplementalEntries.map(createSupplementalEntry)];

function buildCategory(key: CategoryKey): ShowcaseDocCategory {
  const routes = routeEntries
    .filter((entry) => entry.categoryKey === key)
    .map((entry) => getRoute(entry.ownerRoute));
  const routePaths = new Set(routes.map((route) => route.path));
  const items = [...routeEntries, ...helperEntries]
    .filter((entry) => entry.categoryKey === key)
    .sort((left, right) => {
      const leftRouteEntry = isRouteEntry(left, routePaths);
      const rightRouteEntry = isRouteEntry(right, routePaths);
      if (leftRouteEntry !== rightRouteEntry) {
        return leftRouteEntry ? -1 : 1;
      }
      return left.title.localeCompare(right.title, "zh-CN");
    });

  return {
    ...categoryConfig[key],
    items,
    routes,
  };
}

export const showcaseRoutes = allRoutes;
export const showcaseEntries = [...routeEntries, ...helperEntries];
export const showcaseCategories = categoryOrder.map(buildCategory);
export const showcaseFeaturedEntries = showcaseEntries.filter((entry) => entry.featured);
export const showcaseRouteMap = new Map(showcaseRoutes.map((route) => [route.path, route]));
export const showcaseEntryMap = new Map(showcaseEntries.map((entry) => [entry.id, entry]));
export const showcaseExportCoverage = Array.from(new Set(showcaseEntries.flatMap((entry) => entry.exportNames ?? []))).sort((left, right) => left.localeCompare(right, "en"));
