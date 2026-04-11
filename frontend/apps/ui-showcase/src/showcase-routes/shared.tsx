import { type ReactElement, type ReactNode } from "react";
import { useI18n } from "@go-admin/i18n";
import { DocsApiTable, DocsDemoCard } from "@go-admin/ui-admin";

import { translateShowcaseCategoryLabel } from "../i18n/showcase";
import type { PreviewKind } from "./overview-previews";

export type ShowcaseApiItem = {
  anchorAliases?: string[];
  defaultValue?: string;
  description: string;
  name: string;
  required?: boolean;
  type: string;
};

export type DocRoute = {
  component: () => ReactElement;
  label: string;
  path: string;
  shortLabel: string;
  summaryKey: string;
};

export type ShowcaseRoute = DocRoute;

export type ShowcaseCategory = {
  descriptionKey: string;
  items: ShowcaseRoute[];
  key: string;
  labelKey: string;
};

export type DocEntry = {
  categoryKey: string;
  exportNames?: string[];
  featured?: boolean;
  href: string;
  id: string;
  keywords?: string[];
  ownerRoute: string;
  previewKind: PreviewKind;
  shortLabel?: string;
  summaryKey: string;
  title: string;
};

export type DocCategory = {
  descriptionKey: string;
  items: DocEntry[];
  key: string;
  labelKey: string;
  routes: DocRoute[];
};

export type ShowcaseDemoSection = {
  code?: string;
  content: ReactNode;
  description?: ReactNode;
  id?: string;
  title: ReactNode;
};

function toStableId(value: string, fallback: string) {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return normalized || fallback;
}

function toSectionId(value: ReactNode, fallback: string) {
  const raw = typeof value === "string" ? value : fallback;
  return toStableId(raw, fallback);
}

export function toApiAnchorId(name: string) {
  return `api-${toStableId(name, "entry")}`;
}

export function ShowcasePreviewCard({
  children,
  code,
  description,
  id,
  title,
}: {
  children: ReactNode;
  code?: string;
  description?: ReactNode;
  id: string;
  title: ReactNode;
}) {
  return (
    <section className="showcase-doc-block" id={id}>
      <DocsDemoCard code={code} description={description} title={title}>
        {children}
      </DocsDemoCard>
    </section>
  );
}

export function ShowcaseApiTable({
  items,
  title,
}: {
  items: ShowcaseApiItem[];
  title?: ReactNode;
}) {
  const { t } = useI18n();

  return (
    <section className="showcase-doc-block" id="api">
      <div aria-hidden className="sr-only">
        {items.flatMap((item) => [item.name, ...(item.anchorAliases ?? [])]).map((anchorName) => (
          <span id={toApiAnchorId(anchorName)} key={anchorName} />
        ))}
      </div>
      <DocsApiTable
        description={t("showcase.shared.api.description")}
        items={items}
        title={title ?? t("showcase.shared.api.title")}
      />
    </section>
  );
}

export function ShowcasePage({
  apiItems,
  categoryLabel,
  code,
  description,
  notes,
  preview,
  title,
}: {
  apiItems?: ShowcaseApiItem[];
  categoryLabel: string;
  code: string;
  description: ReactNode;
  notes: string[];
  preview: ReactNode;
  title: string;
}) {
  const { t } = useI18n();

  return (
    <ShowcaseDocPage
      apiItems={apiItems}
      categoryLabel={categoryLabel}
      demos={[{ code, content: preview, description: t("showcase.shared.demo.defaultDescription"), title: t("showcase.shared.demo.defaultTitle") }]}
      description={description}
      notes={notes}
      title={title}
    />
  );
}

export function ShowcaseDocPage({
  apiItems,
  categoryLabel,
  demos,
  description,
  notes = [],
  title,
}: {
  apiItems?: ShowcaseApiItem[];
  categoryLabel: string;
  demos: ShowcaseDemoSection[];
  description: ReactNode;
  notes?: string[];
  title: string;
}) {
  const { t } = useI18n();
  const sections = demos.map((demo, index) => ({
    ...demo,
    id: demo.id ?? `demo-${index + 1}-${toSectionId(demo.title, `section-${index + 1}`)}`,
  }));

  return (
    <article className="showcase-doc-page">
      <header className="showcase-doc-page__header">
        <p className="showcase-doc-page__eyebrow">{translateShowcaseCategoryLabel(categoryLabel, t)}</p>
        <h1 className="showcase-doc-page__title">{title}</h1>
        <div className="showcase-doc-page__description">{description}</div>
        <div className="showcase-doc-page__meta">
          <span>{t("showcase.shared.meta.examples", undefined, { count: sections.length })}</span>
          {apiItems?.length ? <span>{t("showcase.shared.meta.apiItems", undefined, { count: apiItems.length })}</span> : null}
          {notes.length ? <span>{t("showcase.shared.meta.notes", undefined, { count: notes.length })}</span> : null}
        </div>
        <nav aria-label={t("showcase.shared.category.docs", undefined, { title })} className="showcase-doc-outline">
          {sections.map((demo, index) => (
            <a className="showcase-doc-outline__link" href={`#${demo.id}`} key={demo.id}>
              <span className="showcase-doc-outline__index">{String(index + 1).padStart(2, "0")}</span>
              <span>{demo.title}</span>
            </a>
          ))}
          {apiItems?.length ? (
            <a className="showcase-doc-outline__link" href="#api">
              <span className="showcase-doc-outline__index">{t("showcase.shared.api.title")}</span>
              <span>{t("showcase.shared.api.link")}</span>
            </a>
          ) : null}
        </nav>
      </header>

      {sections.map((demo) => (
        <ShowcasePreviewCard code={demo.code} description={demo.description} id={demo.id} key={demo.id} title={demo.title}>
          {demo.content}
        </ShowcasePreviewCard>
      ))}

      {notes.length ? (
        <section className="showcase-doc-block">
          <div className="showcase-doc-section">
            <h2 className="showcase-doc-section__title">{t("showcase.shared.notes.title")}</h2>
            <p className="showcase-doc-section__description">{t("showcase.shared.notes.description")}</p>
          </div>
          <div className="showcase-doc-notes">
            <ul>
              {notes.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        </section>
      ) : null}

      {apiItems ? <ShowcaseApiTable items={apiItems} title={`${title} ${t("showcase.shared.api.title")}`} /> : null}
    </article>
  );
}

export const selectOptions = [
  { label: "华东机房", value: "shanghai" },
  { label: "华南机房", value: "shenzhen" },
  { label: "北美节点", value: "virginia" },
];

export const roleOptions = [
  { label: "系统管理员", value: "admin" },
  { label: "租户管理员", value: "tenant-admin" },
  { label: "审计人员", value: "auditor" },
  { label: "发布工程师", value: "release" },
];

export const tableRows = [
  { id: "USR-1024", name: "张三", role: "系统管理员", status: "正常", updatedAt: "2026-04-08 21:36" },
  { id: "USR-1025", name: "李四", role: "审计人员", status: "停用", updatedAt: "2026-04-08 19:12" },
  { id: "USR-1026", name: "王五", role: "发布工程师", status: "运行中", updatedAt: "2026-04-08 17:48" },
];

export const treeNodes = [
  {
    id: 1,
    label: "系统管理",
    children: [
      { id: 11, label: "用户管理" },
      { id: 12, label: "角色管理" },
    ],
  },
  {
    id: 2,
    label: "监控中心",
    children: [
      { id: 21, label: "服务概览" },
      { id: 22, label: "运行日志" },
    ],
  },
];

export const detailItems = [
  { label: "租户", value: "local" },
  { label: "负责人", value: "张三" },
  { label: "发布时间", value: "2026-04-09 10:30" },
  { label: "状态", value: "运行中" },
];

export const commits = [
  { hash: "4c8912a", message: "feat: 调整后台筛选区布局并统一按钮层级" },
  { hash: "18e2ffc", message: "refactor: 收敛共享组件变体命名" },
  { hash: "b761da9", message: "docs: 更新展示站组件示例" },
];

export const mockMenuTree = [
  {
    id: 1,
    title: "系统管理",
    icon: "",
    path: "/system",
    fullPath: "/system",
    menuType: "M",
    permission: "",
    hidden: false,
    breadcrumb: "false",
    component: "Layout",
    children: [
      {
        id: 11,
        title: "用户管理",
        icon: "",
        path: "users",
        fullPath: "/system/users",
        menuType: "C",
        permission: "sys:user:list",
        hidden: false,
        breadcrumb: "false",
        component: "users-page",
        children: [],
      },
      {
        id: 12,
        title: "角色管理",
        icon: "",
        path: "roles",
        fullPath: "/system/roles",
        menuType: "C",
        permission: "sys:role:list",
        hidden: false,
        breadcrumb: "false",
        component: "roles-page",
        children: [],
      },
    ],
  },
  {
    id: 2,
    title: "监控中心",
    icon: "",
    path: "/monitor",
    fullPath: "/monitor",
    menuType: "M",
    permission: "",
    hidden: false,
    breadcrumb: "false",
    component: "Layout",
    children: [
      {
        id: 21,
        title: "服务概览",
        icon: "",
        path: "services",
        fullPath: "/monitor/services",
        menuType: "C",
        permission: "monitor:service:list",
        hidden: false,
        breadcrumb: "false",
        component: "service-page",
        children: [],
      },
    ],
  },
];
