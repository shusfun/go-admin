import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  AdminPageStack,
  AdminTwoColumn,
  AsyncActionButton,
  Button,
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
} from "@suiyuan/ui-admin";
import { createApiClient } from "@suiyuan/api";
import type { SysDeptRecord } from "@suiyuan/types";

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
      toast.error(error instanceof Error ? error.message : "部门保存失败");
    },
  });
  const deleteMutation = useMutation({
    mutationFn: async (deptId: number) => api.admin.deleteDepts({ ids: [deptId] }),
    onSuccess: async () => {
      toast.success("部门已删除");
      await queryClient.invalidateQueries({ queryKey: ["admin-page", "depts-tree"] });
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "部门删除失败");
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
      toast.error(error instanceof Error ? error.message : "部门详情加载失败");
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
        description="部门树已经切换到统一树表与表单弹层，组织结构维护不再依赖旧页面样式和自定义 modal。"
        kicker="Admin Module"
        title="部门管理"
      />

      <AdminTwoColumn>
        <FilterPanel description="当前继续保留树表形态，优先保证与用户、角色、岗位的组织关联稳定。">
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

        <FilterPanel description="父部门选择会自动排除当前节点及其后代，避免形成循环树。" title="收口说明">
          <div className="space-y-2 text-sm leading-7 text-muted-foreground">
            <p>新增与编辑都会刷新整棵部门树，不在前端做局部拼接补丁。</p>
            <p>页面仍沿用后端既有字段，不额外引入自定义部门属性。</p>
            <p>树结构、新增子级、删除确认统一收敛到 `ui-admin` 组件，不再保留旧按钮类名。</p>
          </div>
        </FilterPanel>
      </AdminTwoColumn>

      <TreeTableSection description={`当前共 ${rows.length} 个部门节点。`} title="部门树">
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
      </TreeTableSection>

      <FormDialog
        description="部门树结构由后端维护路径，前端只负责录入业务字段。"
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
            <div className="min-h-0 flex-1 overflow-y-auto pr-1">
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
            </div>
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
