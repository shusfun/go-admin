import { type ReactNode, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useI18n } from "@suiyuan/i18n";
import {
  Button,
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
  RowActions,
  Select,
  StatusBadge,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Textarea,
  Toolbar,
  toast,
} from "@suiyuan/ui-admin";
import type { PagePayload, QueryPayload } from "@suiyuan/types";

type Column<T> = {
  label: string;
  render: (row: T) => ReactNode;
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
};

function defaultDraftFactory() {
  return {};
}

export function CrudDataPage<T extends object>({
  title,
  description,
  queryKey,
  columns,
  searchFields = [],
  formFields = [],
  fetcher,
  createItem,
  updateItem,
  deleteItem,
  createDraft = defaultDraftFactory,
  toDraft,
  getRowId,
  renderAside,
  rowActions,
}: CrudDataPageProps<T>) {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const [pageIndex, setPageIndex] = useState(1);
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [draft, setDraft] = useState<Record<string, unknown>>(createDraft());
  const [editingId, setEditingId] = useState<number | string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<T | null>(null);

  const params = useMemo<QueryPayload>(() => ({ ...filters, pageIndex, pageSize: 20 }), [filters, pageIndex]);

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
      toast.success(editingId !== null ? t("admin.crud.saveSuccess.update") : t("admin.crud.saveSuccess.create"));
      setDialogOpen(false);
      setEditingId(null);
      setDraft(createDraft());
      await queryClient.invalidateQueries({ queryKey: ["admin-page", queryKey] });
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : t("admin.crud.saveError"));
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
      toast.success(t("admin.crud.deleteSuccess"));
      setDeleteTarget(null);
      await queryClient.invalidateQueries({ queryKey: ["admin-page", queryKey] });
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : t("admin.crud.deleteError"));
    },
  });

  const list = listQuery.data?.list || [];
  const total = listQuery.data?.count || 0;
  const totalPages = Math.max(1, Math.ceil(total / 20));

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
        kicker="Admin Module"
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
                {t("admin.crud.actions.create")}
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
            <Table>
              <TableHeader>
                <TableRow>
                  {columns.map((column) => (
                    <TableHead key={column.label}>{column.label}</TableHead>
                  ))}
                  {(rowActions || createItem || updateItem || deleteItem) ? <TableHead>{t("admin.common.actions")}</TableHead> : null}
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.length ? (
                  list.map((item) => (
                    <TableRow key={String(getRowId(item))}>
                      {columns.map((column) => (
                        <TableCell key={column.label}>
                          {typeof column.render(item) === "string" &&
                          ["状态", "结果", "健康状态"].some((keyword) => column.label.includes(keyword)) ? (
                            <StatusBadge status={String(column.render(item))} />
                          ) : (
                            column.render(item)
                          )}
                        </TableCell>
                      ))}
                      {(rowActions || createItem || updateItem || deleteItem) ? (
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
                    <TableCell className="py-8" colSpan={columns.length + 1}>
                      <EmptyBlock description={t("admin.crud.empty.description")} title={t("admin.crud.empty.title")} />
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
            <Pagination onNext={() => setPageIndex((current) => current + 1)} onPrevious={() => setPageIndex((current) => current - 1)} page={pageIndex} totalPages={totalPages} />
          </>
        ) : null}
      </DataTableSection>

      {dialogOpen && formFields.length > 0 ? (
        <FormDialog
          description={t("admin.crud.dialog.description")}
          onOpenChange={setDialogOpen}
          open={dialogOpen}
          title={editingId !== null ? t("admin.crud.dialog.editTitle") : t("admin.crud.dialog.createTitle")}
        >
          <div className="flex min-h-0 flex-1 flex-col">
            <div className="min-h-0 flex-1 overflow-y-auto pr-1">
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
            </div>
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
