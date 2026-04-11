import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  AdminPageStack,
  AdminTwoColumn,
  AppScrollbar,
  AppVirtualList,
  AsyncActionButton,
  Badge,
  Button,
  Card,
  CardContent,
  ConfirmDialog,
  FilterPanel,
  FormActions,
  FormDialog,
  FormField,
  Input,
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
  Toolbar,
  TreeTableSection,
  toast,
} from "@go-admin/ui-admin";
import { createApiClient, toUserFacingErrorMessage } from "@go-admin/api";
import type { SysDeptRecord } from "@go-admin/types";

type FlatDeptRecord = SysDeptRecord & { level: number };

type DeptDraft = {
  deptId?: number;
  parentId: number;
  deptName: string;
  sort: number;
  leader: string;
  phone: string;
  email: string;
  status: number;
};

const statusOptions = [
  { value: "", label: "全部状态" },
  { value: "2", label: "正常" },
  { value: "1", label: "停用" },
];

function createDeptDraft(parentId = 0, source?: Partial<SysDeptRecord>): DeptDraft {
  return {
    deptId: source?.deptId,
    parentId: source?.parentId ?? parentId,
    deptName: source?.deptName || "",
    sort: source?.sort ?? 0,
    leader: source?.leader || "",
    phone: source?.phone || "",
    email: source?.email || "",
    status: source?.status ?? 2,
  };
}

export function DeptsPage({ api }: { api: ReturnType<typeof createApiClient> }) {
  const queryClient = useQueryClient();
  const [deptNameFilter, setDeptNameFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogTitle, setDialogTitle] = useState("新增部门");
  const [dialogLoading, setDialogLoading] = useState(false);
  const [draft, setDraft] = useState<DeptDraft>(createDeptDraft());
  const [deleteTarget, setDeleteTarget] = useState<FlatDeptRecord | null>(null);

  const deptQuery = useQuery({
    queryKey: ["admin-page", "depts-tree", deptNameFilter, statusFilter],
    queryFn: () =>
      api.admin.listDepts({
        deptName: deptNameFilter || undefined,
        status: statusFilter || undefined,
      }),
  });
  const saveMutation = useMutation({
    mutationFn: async (payload: DeptDraft) => {
      const nextPayload = {
        deptId: payload.deptId,
        parentId: payload.parentId,
        deptName: payload.deptName,
        sort: payload.sort,
        leader: payload.leader,
        phone: payload.phone,
        email: payload.email,
        status: payload.status,
      };
      if (payload.deptId) {
        await api.admin.updateDept(nextPayload as { deptId: number });
        return "updated";
      }
      await api.admin.createDept(nextPayload);
      return "created";
    },
    onSuccess: async (mode) => {
      toast.success(mode === "created" ? "部门已创建" : "部门已更新");
      closeDialog();
      await queryClient.invalidateQueries({ queryKey: ["admin-page", "depts-tree"] });
    },
    onError: (error) => {
      toast.error(toUserFacingErrorMessage(error, "部门保存失败"));
    },
  });
  const deleteMutation = useMutation({
    mutationFn: async (deptId: number) => api.admin.deleteDepts({ ids: [deptId] }),
    onSuccess: async () => {
      toast.success("部门已删除");
      await queryClient.invalidateQueries({ queryKey: ["admin-page", "depts-tree"] });
    },
    onError: (error) => {
      toast.error(toUserFacingErrorMessage(error, "部门删除失败"));
    },
  });

  const rows = useMemo(() => flattenDeptTree(deptQuery.data || []), [deptQuery.data]);
  const parentOptions = useMemo(() => {
    const root: FlatDeptRecord = {
      deptId: 0,
      parentId: 0,
      deptPath: "/0/",
      deptName: "顶级部门",
      sort: 0,
      leader: "",
      phone: "",
      email: "",
      status: 2,
      level: 0,
    };

    return [root, ...rows]
      .filter((item) => {
        if (!draft.deptId || item.deptId === 0) {
          return true;
        }
        return item.deptId !== draft.deptId && !item.deptPath.includes(`/${draft.deptId}/`);
      })
      .map((item) => ({
        value: String(item.deptId),
        label: `${"　".repeat(item.level)}${item.deptName}`,
      }));
  }, [draft.deptId, rows]);

  function closeDialog() {
    setDialogOpen(false);
    setDialogLoading(false);
    setDraft(createDeptDraft());
  }

  function openCreateDialog(parent?: FlatDeptRecord) {
    setDialogTitle(parent ? `新增子部门 · ${parent.deptName}` : "新增部门");
    setDraft(createDeptDraft(parent?.deptId || 0));
    setDialogOpen(true);
  }

  async function openEditDialog(item: FlatDeptRecord) {
    setDialogOpen(true);
    setDialogLoading(true);
    try {
      const detail = await api.admin.getDept(item.deptId);
      setDialogTitle(`编辑部门 · ${detail.deptName}`);
      setDraft(createDeptDraft(detail.parentId, detail));
    } catch (error) {
      toast.error(toUserFacingErrorMessage(error, "部门详情加载失败"));
      closeDialog();
      return;
    }
    setDialogLoading(false);
  }

  return (
    <AdminPageStack>
      <PageHeader
        actions={
          <Button onClick={() => openCreateDialog()} type="button">
            新增部门
          </Button>
        }
        description="管理组织架构与部门层级。"
        kicker="管理台"
        title="部门管理"
      />

      <FilterPanel>
        <div className="grid gap-4 md:grid-cols-2">
          <FormField label="部门名称">
            <Input onChange={(event) => setDeptNameFilter(event.target.value)} placeholder="按部门名称过滤" value={deptNameFilter} />
          </FormField>
          <FormField label="状态">
            <Select onValueChange={setStatusFilter} options={statusOptions} value={statusFilter} />
          </FormField>
        </div>
        <Toolbar>
          <Button onClick={() => void queryClient.invalidateQueries({ queryKey: ["admin-page", "depts-tree"] })} type="button" variant="outline">
            刷新数据
          </Button>
        </Toolbar>
      </FilterPanel>

      <TreeTableSection description={`当前共 ${rows.length} 个部门节点。`} title="部门树">
        <div className="flex flex-wrap items-center gap-2 rounded-[1.25rem] border border-border/70 bg-secondary/20 px-4 py-3 text-sm text-muted-foreground">
          <Badge tone="muted">节点 {rows.length}</Badge>
          <Badge tone="info">层级信息前置</Badge>
          <Badge tone="primary">中小屏改为树卡片</Badge>
        </div>
        <div className="hidden xl:block">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>部门名称</TableHead>
                <TableHead>负责人</TableHead>
                <TableHead>手机号</TableHead>
                <TableHead>邮箱</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.deptId}>
                  <TableCell>{`${"　".repeat(row.level)}${row.deptName}`}</TableCell>
                  <TableCell>{row.leader || "-"}</TableCell>
                  <TableCell>{row.phone || "-"}</TableCell>
                  <TableCell>{row.email || "-"}</TableCell>
                  <TableCell>
                    <StatusBadge status={row.status === 2 ? "正常" : "停用"} />
                  </TableCell>
                  <TableCell>
                    <RowActions>
                      <Button onClick={() => void openEditDialog(row)} size="sm" type="button" variant="outline">
                        编辑
                      </Button>
                      <Button onClick={() => openCreateDialog(row)} size="sm" type="button" variant="outline">
                        新增子级
                      </Button>
                      <Button onClick={() => setDeleteTarget(row)} size="sm" type="button" variant="destructive">
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
            empty={<div className="px-4 py-8 text-sm text-muted-foreground">暂无部门节点。</div>}
            estimatedItemSize={156}
            getItemKey={(item) => item.deptId}
            items={rows}
            overscan={4}
          >
            {(row) => (
              <Card className="rounded-none border-x-0 border-t-0 shadow-none first:rounded-t-[1.25rem] last:rounded-b-[1.25rem] last:border-b">
                <CardContent className="grid gap-4 px-4 py-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="grid gap-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-base font-semibold text-foreground">{row.deptName}</span>
                        <Badge tone="muted">层级 {row.level + 1}</Badge>
                      </div>
                      <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                        <span>负责人 {row.leader || "-"}</span>
                        <span>{row.phone || "-"}</span>
                        <span>{row.email || "-"}</span>
                      </div>
                    </div>
                    <StatusBadge status={row.status === 2 ? "正常" : "停用"} />
                  </div>
                  <RowActions className="justify-end border-t border-border/70 pt-3">
                    <Button onClick={() => void openEditDialog(row)} size="sm" type="button" variant="outline">
                      编辑
                    </Button>
                    <Button onClick={() => openCreateDialog(row)} size="sm" type="button" variant="outline">
                      新增子级
                    </Button>
                    <Button onClick={() => setDeleteTarget(row)} size="sm" type="button" variant="destructive">
                      删除
                    </Button>
                  </RowActions>
                </CardContent>
              </Card>
            )}
          </AppVirtualList>
        </div>
      </TreeTableSection>

      <FormDialog
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) {
            closeDialog();
          }
        }}
        open={dialogOpen}
        title={dialogTitle}
      >
        {dialogLoading ? (
          <div className="flex flex-1 items-center py-6 text-sm text-muted-foreground">正在加载部门详情...</div>
        ) : (
          <div className="flex min-h-0 flex-1 flex-col">
            <AppScrollbar className="min-h-0 flex-1" viewportClassName="pr-1">
              <div className="grid gap-4 md:grid-cols-2">
                <FormField label="上级部门">
                  <Select onValueChange={(value) => setDraft((current) => ({ ...current, parentId: Number(value) }))} options={parentOptions} value={String(draft.parentId)} />
                </FormField>
                <FormField label="部门名称">
                  <Input onChange={(event) => setDraft((current) => ({ ...current, deptName: event.target.value }))} value={draft.deptName} />
                </FormField>
                <FormField label="负责人">
                  <Input onChange={(event) => setDraft((current) => ({ ...current, leader: event.target.value }))} value={draft.leader} />
                </FormField>
                <FormField label="显示排序">
                  <Input onChange={(event) => setDraft((current) => ({ ...current, sort: Number(event.target.value) }))} type="number" value={String(draft.sort)} />
                </FormField>
                <FormField label="手机号">
                  <Input onChange={(event) => setDraft((current) => ({ ...current, phone: event.target.value }))} value={draft.phone} />
                </FormField>
                <FormField label="邮箱">
                  <Input onChange={(event) => setDraft((current) => ({ ...current, email: event.target.value }))} value={draft.email} />
                </FormField>
                <FormField label="状态">
                  <Select onValueChange={(value) => setDraft((current) => ({ ...current, status: Number(value) }))} options={statusOptions.filter((item) => item.value)} value={String(draft.status)} />
                </FormField>
              </div>
            </AppScrollbar>
            <FormActions className="mt-4 shrink-0 border-t border-border pt-4">
              <AsyncActionButton
                disabled={!draft.deptName.trim() || !draft.leader.trim()}
                loading={saveMutation.isPending}
                onClick={() => saveMutation.mutate(draft)}
                type="button"
              >
                保存部门
              </AsyncActionButton>
              <Button onClick={closeDialog} type="button" variant="outline">
                取消
              </Button>
            </FormActions>
          </div>
        )}
      </FormDialog>

      <ConfirmDialog
        description={deleteTarget ? `删除部门「${deleteTarget.deptName}」后不可恢复。` : ""}
        onConfirm={async () => {
          if (!deleteTarget) {
            return;
          }
          await deleteMutation.mutateAsync(deleteTarget.deptId);
          setDeleteTarget(null);
        }}
        open={deleteTarget !== null}
        setOpen={(open) => {
          if (!open) {
            setDeleteTarget(null);
          }
        }}
        title="确认删除该部门？"
      />
    </AdminPageStack>
  );
}

function flattenDeptTree(items: SysDeptRecord[], level = 0): FlatDeptRecord[] {
  return items.flatMap((item) => [{ ...item, level }, ...flattenDeptTree(item.children || [], level + 1)]);
}
