import { type ReactNode, useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { toUserFacingErrorMessage } from "@go-admin/api";
import { useI18n } from "@go-admin/i18n";
import {
  AppScrollbar,
  AppVirtualList,
  Badge,
  Button,
  Card,
  CardContent,
  Checkbox,
  ConfirmDialog,
  DataTableSection,
  EmptyBlock,
  FilterPanel,
  FormActions,
  FormDialog,
  FormField,
  Input,
  Loading,
  PageHeader,
  Pagination,
  Popover,
  PopoverContent,
  PopoverTrigger,
  RowActions,
  Select,
  StatusBadge,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Tabs,
  TabsList,
  TabsTrigger,
  Textarea,
  Toolbar,
  toast,
} from "@go-admin/ui-admin";
import type { PagePayload, QueryPayload } from "@go-admin/types";

type Column<T> = {
  key?: string;
  label: string;
  render: (row: T) => ReactNode;
  alwaysVisible?: boolean;
};

type SearchField = {
  key: string;
  label: string;
  placeholder: string;
};

type FormFieldType = {
  key: string;
  label: string;
  type?: "text" | "password" | "number" | "textarea" | "select";
  placeholder?: string;
  options?: Array<{
    label: string;
    value: string | number;
  }>;
};

type CrudDataPageProps<T extends object> = {
  title: string;
  description: string;
  queryKey: string;
  columns: Array<Column<T>>;
  searchFields?: SearchField[];
  formFields?: FormFieldType[];
  fetcher: (params: QueryPayload) => Promise<PagePayload<T>>;
  createItem?: (payload: Record<string, unknown>) => Promise<unknown>;
  updateItem?: (payload: Record<string, unknown>) => Promise<unknown>;
  deleteItem?: (payload: Record<string, unknown>) => Promise<unknown>;
  createDraft?: () => Record<string, unknown>;
  toDraft?: (item: T) => Record<string, unknown>;
  getRowId: (item: T) => number | string;
  renderAside?: () => ReactNode;
  rowActions?: (item: T) => ReactNode;
  viewPresets?: Array<{
    key: string;
    label: string;
    description?: string;
    columnKeys: string[];
  }>;
  labels?: {
    createAction?: string;
    createTitle?: string;
    editTitle?: string;
    createSuccess?: string;
    updateSuccess?: string;
    saveError?: string;
    deleteSuccess?: string;
    deleteError?: string;
  };
};

const EMPTY_SEARCH_FIELDS: SearchField[] = [];
const EMPTY_FORM_FIELDS: FormFieldType[] = [];
const EMPTY_VIEW_PRESETS: NonNullable<CrudDataPageProps<object>["viewPresets"]> = [];

function defaultDraftFactory() {
  return {};
}

function isStatusLabel(label: string) {
  return ["状态", "结果", "健康状态"].some((keyword) => label.includes(keyword));
}

function isSameStringArray(left: string[], right: string[]) {
  if (left === right) {
    return true;
  }

  if (left.length !== right.length) {
    return false;
  }

  return left.every((item, index) => item === right[index]);
}

function renderColumnValue<T extends object>(column: Column<T>, item: T) {
  const value = column.render(item);

  if (typeof value === "string" && isStatusLabel(column.label)) {
    return <StatusBadge status={value} />;
  }

  if (value === null || value === undefined || value === "") {
    return "-";
  }

  return value;
}

function getColumnKey<T extends object>(column: Column<T>, index: number) {
  return column.key || `${index}:${column.label}`;
}

export function CrudDataPage<T extends object>({
  title,
  description,
  queryKey,
  columns,
  searchFields = EMPTY_SEARCH_FIELDS,
  formFields = EMPTY_FORM_FIELDS,
  fetcher,
  createItem,
  updateItem,
  deleteItem,
  createDraft = defaultDraftFactory,
  toDraft,
  getRowId,
  renderAside,
  rowActions,
  viewPresets = EMPTY_VIEW_PRESETS as NonNullable<CrudDataPageProps<T>["viewPresets"]>,
  labels,
}: CrudDataPageProps<T>) {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const [pageIndex, setPageIndex] = useState(1);
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [draft, setDraft] = useState<Record<string, unknown>>(createDraft());
  const [editingId, setEditingId] = useState<number | string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<T | null>(null);
  const [activeViewKey, setActiveViewKey] = useState(viewPresets[0]?.key || "all");
  const [visibleColumnKeys, setVisibleColumnKeys] = useState<string[]>([]);

  const params = useMemo<QueryPayload>(() => ({ ...filters, pageIndex, pageSize: 20 }), [filters, pageIndex]);
  const normalizedColumns = useMemo(
    () =>
      columns.map((column, index) => ({
        ...column,
        key: getColumnKey(column, index),
      })),
    [columns],
  );
  const defaultVisibleColumnKeys = useMemo(() => {
    const preset = viewPresets.find((item) => item.key === activeViewKey);
    if (preset) {
      return normalizedColumns
        .filter((column, index) => index === 0 || preset.columnKeys.includes(column.key))
        .map((column) => column.key);
    }
    return normalizedColumns.map((column) => column.key);
  }, [activeViewKey, normalizedColumns, viewPresets]);

  const listQuery = useQuery({
    queryKey: ["admin-page", queryKey, params],
    queryFn: () => fetcher(params),
  });

  const saveMutation = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      if (editingId !== null && updateItem) {
        return updateItem(payload);
      }
      if (createItem) {
        return createItem(payload);
      }
      return null;
    },
    onSuccess: async () => {
      toast.success(
        editingId !== null
          ? (labels?.updateSuccess ?? t("admin.crud.saveSuccess.update"))
          : (labels?.createSuccess ?? t("admin.crud.saveSuccess.create")),
      );
      setDialogOpen(false);
      setEditingId(null);
      setDraft(createDraft());
      await queryClient.invalidateQueries({ queryKey: ["admin-page", queryKey] });
    },
    onError: (error) => {
      toast.error(toUserFacingErrorMessage(error, labels?.saveError ?? t("admin.crud.saveError")));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      if (!deleteItem) {
        return null;
      }
      return deleteItem(payload);
    },
    onSuccess: async () => {
      toast.success(labels?.deleteSuccess ?? t("admin.crud.deleteSuccess"));
      setDeleteTarget(null);
      await queryClient.invalidateQueries({ queryKey: ["admin-page", queryKey] });
    },
    onError: (error) => {
      toast.error(toUserFacingErrorMessage(error, labels?.deleteError ?? t("admin.crud.deleteError")));
    },
  });

  const list = listQuery.data?.list || [];
  const total = listQuery.data?.count || 0;
  const totalPages = Math.max(1, Math.ceil(total / 20));
  const visibleColumns = normalizedColumns.filter((column) => visibleColumnKeys.includes(column.key));
  const primaryColumn = visibleColumns[0];
  const secondaryColumn = visibleColumns[1];
  const statusColumn = visibleColumns.find((column) => isStatusLabel(column.label));
  const detailColumns = visibleColumns.filter((column) => column !== primaryColumn && column !== secondaryColumn && column !== statusColumn);
  const summaryColumns = detailColumns.slice(0, 3);
  const hasActions = Boolean(rowActions || createItem || updateItem || deleteItem);
  const activeView = viewPresets.find((item) => item.key === activeViewKey);

  useEffect(() => {
    setActiveViewKey((current) => {
      if (viewPresets.length === 0) {
        return "all";
      }
      return viewPresets.some((item) => item.key === current) ? current : viewPresets[0].key;
    });
  }, [viewPresets]);

  useEffect(() => {
    setVisibleColumnKeys((current) => (isSameStringArray(current, defaultVisibleColumnKeys) ? current : defaultVisibleColumnKeys));
  }, [defaultVisibleColumnKeys]);

  function toggleColumnVisibility(columnKey: string, checked: boolean) {
    setVisibleColumnKeys((current) => {
      if (checked) {
        return normalizedColumns
          .filter((column) => current.includes(column.key) || column.key === columnKey)
          .map((column) => column.key);
      }
      return current.filter((item) => item !== columnKey);
    });
  }

  function openCreateDialog() {
    setEditingId(null);
    setDraft(createDraft());
    setDialogOpen(true);
  }

  function openEditDialog(item: T) {
    setEditingId(getRowId(item));
    setDraft(toDraft ? toDraft(item) : { ...(item as Record<string, unknown>) });
    setDialogOpen(true);
  }

  return (
    <div className="grid gap-6">
      <PageHeader
        description={description}
        kicker="管理台"
        title={title}
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]">
        <FilterPanel description={t("admin.crud.filter.description")}>
          {searchFields.length ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {searchFields.map((field) => (
                <FormField key={field.key} label={field.label}>
                  <Input
                    onChange={(event) => {
                      setPageIndex(1);
                      setFilters((current) => ({
                        ...current,
                        [field.key]: event.target.value,
                      }));
                    }}
                    placeholder={field.placeholder}
                    value={filters[field.key] || ""}
                  />
                </FormField>
              ))}
            </div>
          ) : null}
          <Toolbar>
            {createItem ? (
              <Button onClick={openCreateDialog} type="button">
                {labels?.createAction ?? t("admin.crud.actions.create")}
              </Button>
            ) : null}
            <Button
              onClick={() => void queryClient.invalidateQueries({ queryKey: ["admin-page", queryKey] })}
              type="button"
              variant="outline"
            >
              {t("admin.crud.actions.refresh")}
            </Button>
          </Toolbar>
        </FilterPanel>

        {renderAside ? renderAside() : null}
      </div>

      <DataTableSection description={t("admin.crud.list.description", undefined, { count: total })} title={t("admin.crud.list.title")}>
        {listQuery.isLoading ? <Loading label={t("admin.crud.loading")} /> : null}
        {listQuery.isError ? (
          <EmptyBlock description={t("admin.crud.loadError.description")} title={t("admin.crud.loadError.title")} />
        ) : null}
        {!listQuery.isLoading && !listQuery.isError ? (
          <>
            <div className="grid gap-4">
              <div className="grid gap-3 rounded-[1.25rem] border border-border/70 bg-secondary/20 px-4 py-3 text-sm text-muted-foreground">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone="muted">共 {total} 条</Badge>
                    <Badge tone="primary">{activeView?.label || "完整字段"}</Badge>
                    <Badge tone="info">中小屏虚拟化</Badge>
                  </div>
                  <span>{activeView?.description || "桌面端保留完整表格，便于横向比对字段；中小屏自动切换为虚拟化卡片列表。"}</span>
                </div>
                {viewPresets.length || normalizedColumns.length > 1 ? (
                  <div className="flex flex-col gap-3 border-t border-border/70 pt-3 xl:flex-row xl:items-center xl:justify-between">
                    {viewPresets.length ? (
                      <div className="grid gap-2">
                        <Tabs onValueChange={setActiveViewKey} value={activeViewKey}>
                          <TabsList className="h-auto flex-wrap justify-start">
                            {viewPresets.map((preset) => (
                              <TabsTrigger key={preset.key} value={preset.key}>
                                {preset.label}
                              </TabsTrigger>
                            ))}
                          </TabsList>
                        </Tabs>
                        {activeView?.description ? <span className="text-xs text-muted-foreground">{activeView.description}</span> : null}
                      </div>
                    ) : <span className="text-xs text-muted-foreground">当前展示全部字段，可按业务需要手动隐藏次要列。</span>}
                    {normalizedColumns.length > 1 ? (
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button type="button" variant="outline">
                            列设置 · {visibleColumns.length}/{normalizedColumns.length}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent align="end" className="grid w-[18rem] gap-2 p-3">
                          <div className="flex items-center justify-between gap-3">
                            <div className="grid gap-0.5">
                              <span className="text-sm font-medium text-foreground">显示字段</span>
                              <span className="text-xs text-muted-foreground">首列保持常驻，避免摘要信息丢失。</span>
                            </div>
                            <Button
                              onClick={() => setVisibleColumnKeys(defaultVisibleColumnKeys)}
                              size="sm"
                              type="button"
                              variant="ghost"
                            >
                              恢复默认
                            </Button>
                          </div>
                          <div className="grid gap-2">
                            {normalizedColumns.map((column, index) => {
                              const locked = index === 0 || Boolean(column.alwaysVisible);
                              const checked = visibleColumnKeys.includes(column.key);
                              return (
                                <label className="flex items-center gap-3 rounded-xl border border-border/70 px-3 py-2 text-sm" key={column.key}>
                                  <Checkbox
                                    checked={checked}
                                    disabled={locked}
                                    onCheckedChange={(value) => toggleColumnVisibility(column.key, value === true)}
                                  />
                                  <span className="flex-1 text-foreground">{column.label}</span>
                                  {locked ? <Badge tone="muted">固定</Badge> : null}
                                </label>
                              );
                            })}
                          </div>
                        </PopoverContent>
                      </Popover>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </div>

            <div className="hidden xl:grid gap-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    {visibleColumns.map((column) => (
                      <TableHead key={column.label}>{column.label}</TableHead>
                    ))}
                    {hasActions ? <TableHead>{t("admin.common.actions")}</TableHead> : null}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {list.length ? (
                    list.map((item) => (
                      <TableRow key={String(getRowId(item))}>
                        {visibleColumns.map((column) => (
                          <TableCell className={column === primaryColumn ? "min-w-[180px]" : undefined} key={column.label}>
                            {renderColumnValue(column, item)}
                          </TableCell>
                        ))}
                        {hasActions ? (
                          <TableCell>
                            <RowActions>
                              {updateItem ? (
                                <Button onClick={() => openEditDialog(item)} size="sm" type="button" variant="outline">
                                  {t("admin.crud.actions.edit")}
                                </Button>
                              ) : null}
                              {deleteItem ? (
                                <Button onClick={() => setDeleteTarget(item)} size="sm" type="button" variant="destructive">
                                  {t("admin.crud.actions.delete")}
                                </Button>
                              ) : null}
                              {rowActions ? rowActions(item) : null}
                            </RowActions>
                          </TableCell>
                        ) : null}
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell className="py-8" colSpan={visibleColumns.length + (hasActions ? 1 : 0)}>
                        <EmptyBlock description={t("admin.crud.empty.description")} title={t("admin.crud.empty.title")} />
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            <div className="grid gap-4 xl:hidden">
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-[1.25rem] border border-border/70 bg-secondary/20 px-4 py-3 text-sm text-muted-foreground">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone="muted">共 {total} 条</Badge>
                  <Badge tone="success">虚拟列表</Badge>
                  <Badge tone="info">中小屏重排</Badge>
                </div>
                <span>主信息前置，低频字段折叠到卡片明细，避免继续横向堆列。</span>
              </div>
              {list.length ? (
                <AppVirtualList
                  className="max-h-[34rem]"
                  contentClassName="grid"
                  estimatedItemSize={176}
                  getItemKey={(item) => String(getRowId(item))}
                  items={list}
                  overscan={4}
                >
                  {(item) => (
                    <Card className="rounded-none border-x-0 border-t-0 shadow-none first:rounded-t-[1.25rem] last:rounded-b-[1.25rem] last:border-b">
                      <CardContent className="grid gap-4 px-4 py-4">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="grid gap-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-base font-semibold text-foreground">{primaryColumn ? renderColumnValue(primaryColumn, item) : String(getRowId(item))}</span>
                              {secondaryColumn ? (
                                <span className="text-sm text-muted-foreground">{renderColumnValue(secondaryColumn, item)}</span>
                              ) : null}
                            </div>
                            {summaryColumns.length ? (
                              <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                                {summaryColumns.map((column) => (
                                  <span key={column.label} className="inline-flex items-center gap-1 rounded-full border border-border/70 bg-secondary/35 px-2.5 py-1">
                                    <span className="font-medium text-foreground">{column.label}</span>
                                    <span>{renderColumnValue(column, item)}</span>
                                  </span>
                                ))}
                              </div>
                            ) : null}
                          </div>
                          {statusColumn ? (
                            <div className="flex items-start">
                              {renderColumnValue(statusColumn, item)}
                            </div>
                          ) : null}
                        </div>

                        <div className="grid gap-3 md:grid-cols-2">
                          {detailColumns.map((column) => (
                            <div className="grid gap-1" key={column.label}>
                              <span className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">{column.label}</span>
                              <div className="text-sm leading-6 text-foreground">{renderColumnValue(column, item)}</div>
                            </div>
                          ))}
                        </div>

                        {hasActions ? (
                          <RowActions className="justify-end border-t border-border/70 pt-3">
                            {updateItem ? (
                              <Button onClick={() => openEditDialog(item)} size="sm" type="button" variant="outline">
                                {t("admin.crud.actions.edit")}
                              </Button>
                            ) : null}
                            {deleteItem ? (
                              <Button onClick={() => setDeleteTarget(item)} size="sm" type="button" variant="destructive">
                                {t("admin.crud.actions.delete")}
                              </Button>
                            ) : null}
                            {rowActions ? rowActions(item) : null}
                          </RowActions>
                        ) : null}
                      </CardContent>
                    </Card>
                  )}
                </AppVirtualList>
              ) : (
                <EmptyBlock description={t("admin.crud.empty.description")} title={t("admin.crud.empty.title")} />
              )}
            </div>
            <Pagination onNext={() => setPageIndex((current) => current + 1)} onPrevious={() => setPageIndex((current) => current - 1)} page={pageIndex} totalPages={totalPages} />
          </>
        ) : null}
      </DataTableSection>

      {dialogOpen && formFields.length > 0 ? (
        <FormDialog
          description={t("admin.crud.dialog.description")}
          onOpenChange={setDialogOpen}
          open={dialogOpen}
          title={
            editingId !== null
              ? (labels?.editTitle ?? t("admin.crud.dialog.editTitle"))
              : (labels?.createTitle ?? t("admin.crud.dialog.createTitle"))
          }
        >
          <div className="flex min-h-0 flex-1 flex-col">
            <AppScrollbar className="min-h-0 flex-1" viewportClassName="px-1 py-1">
              <div className="grid gap-4 md:grid-cols-2">
                {formFields.map((field) => (
                  <FormField
                    className={field.type === "textarea" ? "md:col-span-2" : undefined}
                    key={field.key}
                    label={field.label}
                  >
                    {field.type === "textarea" ? (
                      <Textarea
                        onChange={(event) =>
                          setDraft((current) => ({
                            ...current,
                            [field.key]: event.target.value,
                          }))
                        }
                        placeholder={field.placeholder}
                        rows={4}
                        value={String(draft[field.key] ?? "")}
                      />
                    ) : field.type === "select" ? (
                      <Select
                        onValueChange={(value) => {
                          const selectedOption = (field.options || []).find((option) => String(option.value) === value);
                          setDraft((current) => ({
                            ...current,
                            [field.key]: selectedOption ? selectedOption.value : value,
                          }));
                        }}
                        options={field.options || []}
                        placeholder={field.placeholder || t("admin.crud.selectPlaceholder")}
                        value={String(draft[field.key] ?? "")}
                      />
                    ) : (
                      <Input
                        onChange={(event) =>
                          setDraft((current) => ({
                            ...current,
                            [field.key]: field.type === "number" ? Number(event.target.value) : event.target.value,
                          }))
                        }
                        placeholder={field.placeholder}
                        type={field.type || "text"}
                        value={String(draft[field.key] ?? "")}
                      />
                    )}
                  </FormField>
                ))}
              </div>
            </AppScrollbar>
            <FormActions className="mt-4 shrink-0 border-t border-border pt-4">
            <Button
              disabled={saveMutation.isPending}
              onClick={() => saveMutation.mutate(draft)}
              type="button"
            >
              {saveMutation.isPending ? t("admin.crud.actions.saving") : t("admin.crud.actions.save")}
            </Button>
            <Button
              onClick={() => {
                setDialogOpen(false);
                setEditingId(null);
                setDraft(createDraft());
              }}
              type="button"
              variant="outline"
            >
              {t("admin.crud.actions.cancel")}
            </Button>
            </FormActions>
          </div>
        </FormDialog>
      ) : null}

      <ConfirmDialog
        description={t("admin.crud.confirm.description")}
        onConfirm={async () => {
          if (!deleteTarget) {
            return;
          }
          await deleteMutation.mutateAsync({ ids: [getRowId(deleteTarget)] });
        }}
        open={deleteTarget !== null}
        setOpen={(open) => {
          if (!open) {
            setDeleteTarget(null);
          }
        }}
        title={t("admin.crud.confirm.title")}
      />
    </div>
  );
}
