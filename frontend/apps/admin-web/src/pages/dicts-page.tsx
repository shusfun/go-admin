import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";

import {
  AdminPageStack,
  AppVirtualList,
  AsyncActionButton,
  Badge,
  Button,
  Card,
  CardContent,
  ConfirmDialog,
  DataTableSection,
  DetailPane,
  FilterPanel,
  FormActions,
  FormDialog,
  FormField,
  Input,
  ListPane,
  MasterDetailLayout,
  PageHeader,
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
} from "@go-admin/ui-admin";
import { createApiClient, toUserFacingErrorMessage } from "@go-admin/api";
import type { SysDictDataRecord, SysDictTypeRecord } from "@go-admin/types";

type DictTypeDraft = {
  id?: number;
  dictName: string;
  dictType: string;
  status: number;
  remark: string;
};

type DictDataDraft = {
  dictCode?: number;
  dictSort: number;
  dictLabel: string;
  dictValue: string;
  dictType: string;
  cssClass: string;
  listClass: string;
  isDefault: string;
  status: number;
  remark: string;
};

const statusOptions = [
  { value: "2", label: "正常" },
  { value: "1", label: "停用" },
];

const defaultOptions = [
  { value: "N", label: "否" },
  { value: "Y", label: "是" },
];

function createTypeDraft(source?: Partial<SysDictTypeRecord>): DictTypeDraft {
  return {
    id: source?.id,
    dictName: source?.dictName || "",
    dictType: source?.dictType || "",
    status: source?.status ?? 2,
    remark: source?.remark || "",
  };
}

function createDataDraft(dictType = "", source?: Partial<SysDictDataRecord>): DictDataDraft {
  return {
    dictCode: source?.dictCode,
    dictSort: source?.dictSort ?? 0,
    dictLabel: source?.dictLabel || "",
    dictValue: source?.dictValue || "",
    dictType: source?.dictType || dictType,
    cssClass: source?.cssClass || "",
    listClass: source?.listClass || "",
    isDefault: source?.isDefault || "N",
    status: source?.status ?? 2,
    remark: source?.remark || "",
  };
}

export function DictsPage({ api }: { api: ReturnType<typeof createApiClient> }) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const params = useParams<{ dictId?: string }>();
  const [typeKeyword, setTypeKeyword] = useState("");
  const [dataKeyword, setDataKeyword] = useState("");
  const [selectedTypeId, setSelectedTypeId] = useState<number | null>(params.dictId ? Number(params.dictId) : null);
  const [typeDialogOpen, setTypeDialogOpen] = useState(false);
  const [dataDialogOpen, setDataDialogOpen] = useState(false);
  const [typeDraft, setTypeDraft] = useState<DictTypeDraft>(createTypeDraft());
  const [dataDraft, setDataDraft] = useState<DictDataDraft>(createDataDraft());
  const [typeDeleteTarget, setTypeDeleteTarget] = useState<SysDictTypeRecord | null>(null);
  const [dataDeleteTarget, setDataDeleteTarget] = useState<SysDictDataRecord | null>(null);

  const typesQuery = useQuery({
    queryKey: ["admin-page", "dict-types", typeKeyword],
    queryFn: () =>
      api.admin.listDictTypes({
        pageIndex: 1,
        pageSize: 200,
        dictName: typeKeyword || undefined,
      }),
  });
  const selectedType = useMemo(
    () => (typesQuery.data?.list || []).find((item) => item.id === selectedTypeId) || null,
    [selectedTypeId, typesQuery.data],
  );
  const dataQuery = useQuery({
    enabled: Boolean(selectedType?.dictType),
    queryKey: ["admin-page", "dict-data", selectedType?.dictType, dataKeyword],
    queryFn: () =>
      api.admin.listDictData({
        dictType: selectedType?.dictType,
        dictLabel: dataKeyword || undefined,
        pageIndex: 1,
        pageSize: 200,
      }),
  });

  const typeMutation = useMutation({
    mutationFn: async (payload: DictTypeDraft) => {
      const nextPayload = {
        id: payload.id,
        dictName: payload.dictName,
        dictType: payload.dictType,
        status: payload.status,
        remark: payload.remark,
      };
      if (payload.id) {
        await api.admin.updateDictType(nextPayload as { id: number });
        return "updated";
      }
      await api.admin.createDictType(nextPayload);
      return "created";
    },
    onSuccess: async (mode) => {
      toast.success(mode === "created" ? "字典类型已创建" : "字典类型已更新");
      setTypeDialogOpen(false);
      setTypeDraft(createTypeDraft());
      await queryClient.invalidateQueries({ queryKey: ["admin-page", "dict-types"] });
    },
    onError: (error) => {
      toast.error(toUserFacingErrorMessage(error, "字典类型保存失败"));
    },
  });
  const dataMutation = useMutation({
    mutationFn: async (payload: DictDataDraft) => {
      const nextPayload = {
        dictCode: payload.dictCode,
        dictSort: payload.dictSort,
        dictLabel: payload.dictLabel,
        dictValue: payload.dictValue,
        dictType: payload.dictType,
        cssClass: payload.cssClass,
        listClass: payload.listClass,
        isDefault: payload.isDefault,
        status: payload.status,
        remark: payload.remark,
      };
      if (payload.dictCode) {
        await api.admin.updateDictData(nextPayload as { dictCode: number });
        return "updated";
      }
      await api.admin.createDictData(nextPayload);
      return "created";
    },
    onSuccess: async (mode) => {
      toast.success(mode === "created" ? "字典数据已创建" : "字典数据已更新");
      setDataDialogOpen(false);
      setDataDraft(createDataDraft(selectedType?.dictType || ""));
      await queryClient.invalidateQueries({ queryKey: ["admin-page", "dict-data"] });
    },
    onError: (error) => {
      toast.error(toUserFacingErrorMessage(error, "字典数据保存失败"));
    },
  });
  const typeDeleteMutation = useMutation({
    mutationFn: async (id: number) => api.admin.deleteDictTypes({ ids: [id] }),
    onSuccess: async (_, id) => {
      toast.success("字典类型已删除");
      if (selectedTypeId === id) {
        setSelectedTypeId(null);
        navigate("/admin/dict");
      }
      await queryClient.invalidateQueries({ queryKey: ["admin-page", "dict-types"] });
    },
    onError: (error) => {
      toast.error(toUserFacingErrorMessage(error, "字典类型删除失败"));
    },
  });
  const dataDeleteMutation = useMutation({
    mutationFn: async (dictCode: number) => api.admin.deleteDictData({ ids: [dictCode] }),
    onSuccess: async () => {
      toast.success("字典数据已删除");
      await queryClient.invalidateQueries({ queryKey: ["admin-page", "dict-data"] });
    },
    onError: (error) => {
      toast.error(toUserFacingErrorMessage(error, "字典数据删除失败"));
    },
  });

  useEffect(() => {
    if (params.dictId) {
      setSelectedTypeId(Number(params.dictId));
      return;
    }
    if (!selectedTypeId && (typesQuery.data?.list || []).length > 0) {
      setSelectedTypeId(typesQuery.data?.list[0]?.id || null);
    }
  }, [params.dictId, selectedTypeId, typesQuery.data]);

  function selectType(item: SysDictTypeRecord) {
    setSelectedTypeId(item.id);
    navigate(`/admin/dict/data/${item.id}`);
  }

  function openCreateTypeDialog() {
    setTypeDraft(createTypeDraft());
    setTypeDialogOpen(true);
  }

  function openEditTypeDialog(item: SysDictTypeRecord) {
    setTypeDraft(createTypeDraft(item));
    setTypeDialogOpen(true);
  }

  function openCreateDataDialog() {
    if (!selectedType) {
      toast.error("请先选择字典类型");
      return;
    }
    setDataDraft(createDataDraft(selectedType.dictType));
    setDataDialogOpen(true);
  }

  function openEditDataDialog(item: SysDictDataRecord) {
    setDataDraft(createDataDraft(selectedType?.dictType || "", item));
    setDataDialogOpen(true);
  }

  return (
    <AdminPageStack>
      <PageHeader
        actions={
          <Button onClick={openCreateTypeDialog} type="button">
            新增字典类型
          </Button>
        }
        description="管理系统字典类型与字典数据。"
        kicker="管理台"
        title="字典管理"
      />

      <MasterDetailLayout>
        <ListPane>
          <FilterPanel>
            <FormField label="字典名称">
              <Input onChange={(event) => setTypeKeyword(event.target.value)} placeholder="按名称过滤" value={typeKeyword} />
            </FormField>
            <Toolbar>
              <Button onClick={openCreateTypeDialog} type="button">
                新增类型
              </Button>
            </Toolbar>
            <div className="grid gap-3">
              {(typesQuery.data?.list || []).map((item) => {
                const active = selectedTypeId === item.id;
                return (
                  <div className="rounded-2xl border border-border/70 bg-card p-4 shadow-sm" key={item.id}>
                    <button
                      className={`grid w-full gap-1 rounded-xl p-0 text-left ${active ? "text-primary" : "text-foreground"}`}
                      onClick={() => selectType(item)}
                      type="button"
                    >
                      <span className="text-sm font-semibold">{item.dictName}</span>
                      <span className="text-xs text-muted-foreground">{item.dictType}</span>
                    </button>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <StatusBadge status={item.status === 2 ? "正常" : "停用"} />
                      <Button onClick={() => openEditTypeDialog(item)} size="sm" type="button" variant="outline">
                        编辑
                      </Button>
                      <Button onClick={() => setTypeDeleteTarget(item)} size="sm" type="button" variant="destructive">
                        删除
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </FilterPanel>
        </ListPane>

        <DetailPane>
          <FilterPanel description={selectedType ? `当前类型：${selectedType.dictName} / ${selectedType.dictType}` : "请先从左侧选择字典类型。"} title="字典数据操作">
            <FormField label="数据标签">
              <Input onChange={(event) => setDataKeyword(event.target.value)} placeholder="按标签过滤" value={dataKeyword} />
            </FormField>
            <Toolbar>
              <Button disabled={!selectedType} onClick={openCreateDataDialog} type="button">
                新增数据
              </Button>
            </Toolbar>
          </FilterPanel>

          <DataTableSection description={selectedType ? `当前共 ${(dataQuery.data?.list || []).length} 条数据。` : "右侧仅展示当前字典类型的数据。"} title="字典数据">
            <div className="flex flex-wrap items-center gap-2 rounded-[1.25rem] border border-border/70 bg-secondary/20 px-4 py-3 text-sm text-muted-foreground">
              <Badge tone="muted">数据 {dataQuery.data?.list?.length || 0}</Badge>
              <Badge tone="info">右侧详情承接编辑</Badge>
              <Badge tone="primary">中小屏使用数据卡片</Badge>
            </div>
            <div className="hidden xl:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>标签</TableHead>
                    <TableHead>值</TableHead>
                    <TableHead>排序</TableHead>
                    <TableHead>默认</TableHead>
                    <TableHead>状态</TableHead>
                    <TableHead>操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(dataQuery.data?.list || []).map((item) => (
                    <TableRow key={item.dictCode}>
                      <TableCell>{item.dictLabel}</TableCell>
                      <TableCell>{item.dictValue}</TableCell>
                      <TableCell>{item.dictSort}</TableCell>
                      <TableCell>{item.isDefault === "Y" ? "是" : "否"}</TableCell>
                      <TableCell>
                        <StatusBadge status={item.status === 2 ? "正常" : "停用"} />
                      </TableCell>
                      <TableCell>
                        <RowActions>
                          <Button onClick={() => openEditDataDialog(item)} size="sm" type="button" variant="outline">
                            编辑
                          </Button>
                          <Button onClick={() => setDataDeleteTarget(item)} size="sm" type="button" variant="destructive">
                            删除
                          </Button>
                        </RowActions>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <div className="xl:hidden">
              <AppVirtualList
                className="max-h-[34rem]"
                contentClassName="grid"
                empty={<div className="px-4 py-8 text-sm text-muted-foreground">当前字典类型下暂无数据。</div>}
                estimatedItemSize={148}
                getItemKey={(item) => item.dictCode || item.dictValue}
                items={dataQuery.data?.list || []}
                overscan={4}
              >
                {(item) => (
                  <Card className="rounded-none border-x-0 border-t-0 shadow-none first:rounded-t-[1.25rem] last:rounded-b-[1.25rem] last:border-b">
                    <CardContent className="grid gap-4 px-4 py-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="grid gap-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-base font-semibold text-foreground">{item.dictLabel}</span>
                            {item.isDefault === "Y" ? <Badge tone="primary">默认</Badge> : null}
                          </div>
                          <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                            <span>值 {item.dictValue}</span>
                            <span>排序 {item.dictSort}</span>
                          </div>
                        </div>
                        <StatusBadge status={item.status === 2 ? "正常" : "停用"} />
                      </div>
                      <RowActions className="justify-end border-t border-border/70 pt-3">
                        <Button onClick={() => openEditDataDialog(item)} size="sm" type="button" variant="outline">
                          编辑
                        </Button>
                        <Button onClick={() => setDataDeleteTarget(item)} size="sm" type="button" variant="destructive">
                          删除
                        </Button>
                      </RowActions>
                    </CardContent>
                  </Card>
                )}
              </AppVirtualList>
            </div>
          </DataTableSection>
        </DetailPane>
      </MasterDetailLayout>

      <FormDialog onOpenChange={setTypeDialogOpen} open={typeDialogOpen} title={typeDraft.id ? "编辑字典类型" : "新增字典类型"}>
        <div className="grid gap-4">
          <FormField label="字典名称">
            <Input onChange={(event) => setTypeDraft((current) => ({ ...current, dictName: event.target.value }))} value={typeDraft.dictName} />
          </FormField>
          <FormField label="字典类型">
            <Input onChange={(event) => setTypeDraft((current) => ({ ...current, dictType: event.target.value }))} value={typeDraft.dictType} />
          </FormField>
          <FormField label="状态">
            <Select onValueChange={(value) => setTypeDraft((current) => ({ ...current, status: Number(value) }))} options={statusOptions} value={String(typeDraft.status)} />
          </FormField>
          <FormField label="备注">
            <Textarea onChange={(event) => setTypeDraft((current) => ({ ...current, remark: event.target.value }))} rows={3} value={typeDraft.remark} />
          </FormField>
          <FormActions>
            <AsyncActionButton
              disabled={!typeDraft.dictName.trim() || !typeDraft.dictType.trim()}
              loading={typeMutation.isPending}
              onClick={() => typeMutation.mutate(typeDraft)}
              type="button"
            >
              保存类型
            </AsyncActionButton>
            <Button onClick={() => setTypeDialogOpen(false)} type="button" variant="outline">
              取消
            </Button>
          </FormActions>
        </div>
      </FormDialog>

      <FormDialog onOpenChange={setDataDialogOpen} open={dataDialogOpen} title={dataDraft.dictCode ? "编辑字典数据" : "新增字典数据"}>
        <div className="grid gap-4 md:grid-cols-2">
          <FormField label="所属字典">
            <Input disabled value={dataDraft.dictType} />
          </FormField>
          <FormField label="排序">
            <Input onChange={(event) => setDataDraft((current) => ({ ...current, dictSort: Number(event.target.value) }))} type="number" value={String(dataDraft.dictSort)} />
          </FormField>
          <FormField label="标签">
            <Input onChange={(event) => setDataDraft((current) => ({ ...current, dictLabel: event.target.value }))} value={dataDraft.dictLabel} />
          </FormField>
          <FormField label="值">
            <Input onChange={(event) => setDataDraft((current) => ({ ...current, dictValue: event.target.value }))} value={dataDraft.dictValue} />
          </FormField>
          <FormField label="样式类">
            <Input onChange={(event) => setDataDraft((current) => ({ ...current, cssClass: event.target.value }))} value={dataDraft.cssClass} />
          </FormField>
          <FormField label="列表类">
            <Input onChange={(event) => setDataDraft((current) => ({ ...current, listClass: event.target.value }))} value={dataDraft.listClass} />
          </FormField>
          <FormField label="默认值">
            <Select onValueChange={(value) => setDataDraft((current) => ({ ...current, isDefault: value }))} options={defaultOptions} value={dataDraft.isDefault} />
          </FormField>
          <FormField label="状态">
            <Select onValueChange={(value) => setDataDraft((current) => ({ ...current, status: Number(value) }))} options={statusOptions} value={String(dataDraft.status)} />
          </FormField>
          <FormField className="md:col-span-2" label="备注">
            <Textarea onChange={(event) => setDataDraft((current) => ({ ...current, remark: event.target.value }))} rows={3} value={dataDraft.remark} />
          </FormField>
          <div className="md:col-span-2">
            <FormActions>
              <AsyncActionButton
                disabled={!dataDraft.dictLabel.trim() || !dataDraft.dictValue.trim()}
                loading={dataMutation.isPending}
                onClick={() => dataMutation.mutate(dataDraft)}
                type="button"
              >
                保存数据
              </AsyncActionButton>
              <Button onClick={() => setDataDialogOpen(false)} type="button" variant="outline">
                取消
              </Button>
            </FormActions>
          </div>
        </div>
      </FormDialog>

      <ConfirmDialog
        description={typeDeleteTarget ? `删除字典类型「${typeDeleteTarget.dictName}」后不可恢复。` : ""}
        onConfirm={async () => {
          if (!typeDeleteTarget) {
            return;
          }
          await typeDeleteMutation.mutateAsync(typeDeleteTarget.id);
          setTypeDeleteTarget(null);
        }}
        open={typeDeleteTarget !== null}
        setOpen={(open) => {
          if (!open) {
            setTypeDeleteTarget(null);
          }
        }}
        title="确认删除该字典类型？"
      />

      <ConfirmDialog
        description={dataDeleteTarget ? `删除字典数据「${dataDeleteTarget.dictLabel}」后不可恢复。` : ""}
        onConfirm={async () => {
          if (!dataDeleteTarget) {
            return;
          }
          await dataDeleteMutation.mutateAsync(dataDeleteTarget.dictCode);
          setDataDeleteTarget(null);
        }}
        open={dataDeleteTarget !== null}
        setOpen={(open) => {
          if (!open) {
            setDataDeleteTarget(null);
          }
        }}
        title="确认删除该字典数据？"
      />
    </AdminPageStack>
  );
}
