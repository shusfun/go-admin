import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  AdminPageStack,
  AdminTwoColumn,
  AsyncActionButton,
  Button,
  ConfirmDialog,
  DataTableSection,
  FilterPanel,
  FormActions,
  FormDialog,
  FormField,
  FormSection,
  Input,
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
  TreeSelectorPanel,
  toast,
} from "@suiyuan/ui-admin";
import { createApiClient } from "@suiyuan/api";
import type { SysRoleRecord, TreeOptionNode } from "@suiyuan/types";

type RoleDraft = {
  roleId?: number;
  roleName: string;
  roleKey: string;
  roleSort: number;
  status: string;
  flag: string;
  remark: string;
  admin: boolean;
  dataScope: string;
};

const statusLabels: Record<string, string> = {
  "1": "停用",
  "2": "正常",
};

const dataScopeLabels: Record<string, string> = {
  "1": "全部数据权限",
  "2": "自定数据权限",
  "3": "本部门数据权限",
  "4": "本部门及以下数据权限",
  "5": "仅本人数据权限",
};

const dataScopeOptions = [
  { value: "1", label: "全部数据权限" },
  { value: "2", label: "自定数据权限" },
  { value: "3", label: "本部门数据权限" },
  { value: "4", label: "本部门及以下数据权限" },
  { value: "5", label: "仅本人数据权限" },
];

const statusOptions = [
  { value: "", label: "全部状态" },
  { value: "2", label: "正常" },
  { value: "1", label: "停用" },
];

function createRoleDraft(source?: Partial<SysRoleRecord>): RoleDraft {
  return {
    roleId: source?.roleId,
    roleName: source?.roleName || "",
    roleKey: source?.roleKey || "",
    roleSort: source?.roleSort ?? 0,
    status: source?.status || "2",
    flag: source?.flag || "",
    remark: source?.remark || "",
    admin: source?.admin ?? false,
    dataScope: source?.dataScope || "1",
  };
}

export function RolesPage({ api }: { api: ReturnType<typeof createApiClient> }) {
  const queryClient = useQueryClient();
  const [pageIndex, setPageIndex] = useState(1);
  const [roleNameFilter, setRoleNameFilter] = useState("");
  const [roleKeyFilter, setRoleKeyFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogTitle, setDialogTitle] = useState("新增角色");
  const [dialogLoading, setDialogLoading] = useState(false);
  const [draft, setDraft] = useState<RoleDraft>(createRoleDraft());
  const [menuTree, setMenuTree] = useState<TreeOptionNode[]>([]);
  const [deptTree, setDeptTree] = useState<TreeOptionNode[]>([]);
  const [menuCheckedIds, setMenuCheckedIds] = useState<number[]>([]);
  const [deptCheckedIds, setDeptCheckedIds] = useState<number[]>([]);
  const [lockedMenuIds, setLockedMenuIds] = useState<number[]>([]);
  const [originalRoleKey, setOriginalRoleKey] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<SysRoleRecord | null>(null);
  const [statusTarget, setStatusTarget] = useState<SysRoleRecord | null>(null);

  const rolesQuery = useQuery({
    queryKey: ["admin-page", "roles", roleNameFilter, roleKeyFilter, statusFilter, pageIndex],
    queryFn: () =>
      api.admin.listRoles({
        pageIndex,
        pageSize: 20,
        roleName: roleNameFilter || undefined,
        roleKey: roleKeyFilter || undefined,
        status: statusFilter || undefined,
      }),
  });

  const saveMutation = useMutation({
    mutationFn: async (payload: RoleDraft) => {
      const nextMenuIds = originalRoleKey === "admin" ? lockedMenuIds : menuCheckedIds;
      const nextDeptIds = payload.dataScope === "2" ? deptCheckedIds : [];
      const nextPayload = {
        roleId: payload.roleId,
        roleName: payload.roleName,
        roleKey: payload.roleKey,
        roleSort: payload.roleSort,
        status: payload.status,
        flag: payload.flag,
        remark: payload.remark,
        admin: payload.admin,
        dataScope: payload.dataScope,
        menuIds: nextMenuIds,
        deptIds: nextDeptIds,
      };

      if (payload.roleId) {
        await api.admin.updateRole(nextPayload as { roleId: number });
        await api.admin.updateRoleDataScope({
          roleId: payload.roleId,
          dataScope: payload.dataScope,
          deptIds: nextDeptIds,
        });
        return "updated";
      }

      const roleId = await api.admin.createRole(nextPayload);
      if (!roleId) {
        throw new Error("角色已创建，但未返回 roleId");
      }
      await api.admin.updateRoleDataScope({
        roleId,
        dataScope: payload.dataScope,
        deptIds: nextDeptIds,
      });
      return "created";
    },
    onSuccess: async (mode) => {
      toast.success(mode === "created" ? "角色已创建" : "角色已更新");
      closeDialog();
      await queryClient.invalidateQueries({ queryKey: ["admin-page", "roles"] });
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "角色保存失败");
    },
  });

  const statusMutation = useMutation({
    mutationFn: async (payload: { roleId: number; status: string }) => api.admin.updateRoleStatus(payload.roleId, payload.status),
    onSuccess: async (_, payload) => {
      toast.success(payload.status === "2" ? "角色已启用" : "角色已停用");
      await queryClient.invalidateQueries({ queryKey: ["admin-page", "roles"] });
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "角色状态更新失败");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (roleId: number) => api.admin.deleteRoles({ ids: [roleId] }),
    onSuccess: async () => {
      toast.success("角色已删除");
      await queryClient.invalidateQueries({ queryKey: ["admin-page", "roles"] });
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "角色删除失败");
    },
  });

  const rows = rolesQuery.data?.list || [];
  const total = rolesQuery.data?.count || 0;
  const totalPages = Math.max(1, Math.ceil(total / 20));
  const menuTreeLocked = originalRoleKey === "admin";

  function resetDialogState() {
    setDraft(createRoleDraft());
    setMenuTree([]);
    setDeptTree([]);
    setMenuCheckedIds([]);
    setDeptCheckedIds([]);
    setLockedMenuIds([]);
    setOriginalRoleKey("");
    setDialogLoading(false);
  }

  function closeDialog() {
    setDialogOpen(false);
    resetDialogState();
  }

  async function loadPermissionTrees(roleId: number) {
    const [menuResponse, deptResponse] = await Promise.all([api.admin.getRoleMenuTree(roleId), api.admin.getRoleDeptTree(roleId)]);
    setMenuTree(menuResponse.menus || []);
    setDeptTree(deptResponse.depts || []);
    setMenuCheckedIds(menuResponse.checkedKeys || []);
    setDeptCheckedIds(deptResponse.checkedKeys || []);
    setLockedMenuIds(menuResponse.checkedKeys || []);
  }

  async function openCreateDialog() {
    setDialogTitle("新增角色");
    setDialogOpen(true);
    setDialogLoading(true);
    resetDialogState();
    try {
      await loadPermissionTrees(0);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "角色权限树加载失败");
      closeDialog();
      return;
    }
    setDialogLoading(false);
  }

  async function openEditDialog(item: SysRoleRecord) {
    setDialogTitle(`编辑角色 · ${item.roleName}`);
    setDialogOpen(true);
    setDialogLoading(true);
    try {
      const [detail] = await Promise.all([api.admin.getRole(item.roleId), loadPermissionTrees(item.roleId)]);
      setDraft(createRoleDraft(detail));
      setOriginalRoleKey(detail.roleKey);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "角色详情加载失败");
      closeDialog();
      return;
    }
    setDialogLoading(false);
  }

  async function handleStatusToggle(item: SysRoleRecord) {
    const nextStatus = item.status === "2" ? "1" : "2";
    await statusMutation.mutateAsync({ roleId: item.roleId, status: nextStatus });
  }

  return (
    <AdminPageStack>
      <PageHeader
        actions={
          <Button onClick={() => void openCreateDialog()} type="button">
            新增角色
          </Button>
        }
        description="角色页已经完全切换到统一后台模板，菜单权限、部门权限和状态变更全部走 `ui-admin` 组件编排。"
        kicker="Admin Module"
        title="角色管理"
      />

      <AdminTwoColumn>
        <FilterPanel description="角色保存时会按正确顺序提交角色主信息、菜单权限和数据权限，避免更新时丢失关联。">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <FormField label="角色名称">
              <Input
                onChange={(event) => {
                  setPageIndex(1);
                  setRoleNameFilter(event.target.value);
                }}
                placeholder="按角色名称过滤"
                value={roleNameFilter}
              />
            </FormField>
            <FormField label="角色编码">
              <Input
                onChange={(event) => {
                  setPageIndex(1);
                  setRoleKeyFilter(event.target.value);
                }}
                placeholder="按 roleKey 过滤"
                value={roleKeyFilter}
              />
            </FormField>
            <FormField label="状态">
              <Select onValueChange={(value) => {
                setPageIndex(1);
                setStatusFilter(value);
              }} options={statusOptions} placeholder="选择状态" value={statusFilter} />
            </FormField>
          </div>
          <Toolbar>
            <Button onClick={() => void queryClient.invalidateQueries({ queryKey: ["admin-page", "roles"] })} type="button" variant="outline">
              刷新数据
            </Button>
          </Toolbar>
        </FilterPanel>

        <FilterPanel description="本页不做旧样式兼容，后续新增角色相关能力也必须继续沿用这套表单和树面板。" title="收口说明">
          <div className="space-y-2 text-sm leading-7 text-muted-foreground">
            <p>编辑角色时会同时拉取角色详情、菜单树和部门树，确保提交总是带完整权限集合。</p>
            <p>`admin` 角色的菜单权限保持锁定，只展示当前已绑定结果，避免误清空核心权限。</p>
            <p>仅在“自定数据权限”下展示部门树选择，其他权限范围不再渲染多余结构。</p>
          </div>
        </FilterPanel>
      </AdminTwoColumn>

      <DataTableSection description={`当前共 ${total} 条角色记录。`} title="角色列表">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>角色名称</TableHead>
              <TableHead>角色编码</TableHead>
              <TableHead>排序</TableHead>
              <TableHead>数据权限</TableHead>
              <TableHead>状态</TableHead>
              <TableHead>备注</TableHead>
              <TableHead>操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.roleId}>
                <TableCell>
                  <div className="space-y-1">
                    <div className="font-medium text-foreground">{row.roleName}</div>
                    <div className="text-xs text-muted-foreground">{row.admin ? "系统管理员角色" : `角色 ID: ${row.roleId}`}</div>
                  </div>
                </TableCell>
                <TableCell>{row.roleKey}</TableCell>
                <TableCell>{row.roleSort}</TableCell>
                <TableCell>{dataScopeLabels[row.dataScope] || row.dataScope || "-"}</TableCell>
                <TableCell>
                  <StatusBadge status={statusLabels[row.status] || row.status} />
                </TableCell>
                <TableCell>{row.remark || "-"}</TableCell>
                <TableCell>
                  <RowActions>
                    <Button onClick={() => void openEditDialog(row)} size="sm" type="button" variant="outline">
                      编辑
                    </Button>
                    <Button onClick={() => setStatusTarget(row)} size="sm" type="button" variant="outline">
                      {row.status === "2" ? "停用" : "启用"}
                    </Button>
                    {row.roleKey !== "admin" ? (
                      <Button onClick={() => setDeleteTarget(row)} size="sm" type="button" variant="destructive">
                        删除
                      </Button>
                    ) : null}
                  </RowActions>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <Pagination onNext={() => setPageIndex((current) => current + 1)} onPrevious={() => setPageIndex((current) => current - 1)} page={pageIndex} totalPages={totalPages} />
      </DataTableSection>

      <FormDialog
        description="角色弹层统一承载基础字段、菜单权限和部门权限，不再使用页面自带 modal 结构。"
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) {
            resetDialogState();
          }
        }}
        open={dialogOpen}
        title={dialogTitle}
      >
        {dialogLoading ? (
          <div className="flex flex-1 items-center py-6 text-sm text-muted-foreground">正在加载角色权限树...</div>
        ) : (
          <div className="flex min-h-0 flex-1 flex-col">
            <div className="min-h-0 flex-1 overflow-y-auto pr-1">
              <div className="grid gap-6">
                <FormSection description="字段直接对应后端 DTO，不额外引入兼容层。" title="基础信息">
                  <div className="grid gap-4 md:grid-cols-2">
                    <FormField label="角色名称">
                      <Input onChange={(event) => setDraft((current) => ({ ...current, roleName: event.target.value }))} value={draft.roleName} />
                    </FormField>
                    <FormField label="角色编码">
                      <Input onChange={(event) => setDraft((current) => ({ ...current, roleKey: event.target.value }))} value={draft.roleKey} />
                    </FormField>
                    <FormField label="角色排序">
                      <Input
                        onChange={(event) => setDraft((current) => ({ ...current, roleSort: Number(event.target.value) }))}
                        type="number"
                        value={String(draft.roleSort)}
                      />
                    </FormField>
                    <FormField label="状态">
                      <Select
                        onValueChange={(value) => setDraft((current) => ({ ...current, status: value }))}
                        options={statusOptions.filter((item) => item.value)}
                        value={draft.status}
                      />
                    </FormField>
                    <FormField label="数据权限">
                      <Select onValueChange={(value) => setDraft((current) => ({ ...current, dataScope: value }))} options={dataScopeOptions} value={draft.dataScope} />
                    </FormField>
                    <FormField label="标记">
                      <Input onChange={(event) => setDraft((current) => ({ ...current, flag: event.target.value }))} value={draft.flag} />
                    </FormField>
                    <FormField className="md:col-span-2" label="备注">
                      <Textarea onChange={(event) => setDraft((current) => ({ ...current, remark: event.target.value }))} rows={4} value={draft.remark} />
                    </FormField>
                  </div>
                </FormSection>

                <div className="grid gap-6 xl:grid-cols-2">
                  <TreeSelectorPanel
                    checkedIds={menuCheckedIds}
                    description={menuTreeLocked ? "admin 角色菜单权限已锁定，仅展示已绑定结果。" : "勾选结果将随角色一起提交。"}
                    disabled={menuTreeLocked}
                    nodes={menuTree}
                    onChange={setMenuCheckedIds}
                    title="菜单权限"
                  />
                  <TreeSelectorPanel
                    checkedIds={deptCheckedIds}
                    description={draft.dataScope === "2" ? "仅在“自定数据权限”时生效。" : "当前数据权限范围无需单独选择部门。"}
                    disabled={draft.dataScope !== "2"}
                    nodes={deptTree}
                    onChange={setDeptCheckedIds}
                    title="部门权限"
                  />
                </div>
              </div>
            </div>
            <FormActions className="mt-4 shrink-0 border-t border-border pt-4">
              <AsyncActionButton
                disabled={!draft.roleName.trim() || !draft.roleKey.trim()}
                loading={saveMutation.isPending}
                onClick={() => saveMutation.mutate(draft)}
                type="button"
              >
                保存角色
              </AsyncActionButton>
              <Button onClick={closeDialog} type="button" variant="outline">
                取消
              </Button>
            </FormActions>
          </div>
        )}
      </FormDialog>

      <ConfirmDialog
        description={statusTarget ? `角色「${statusTarget.roleName}」的状态将被更新。` : ""}
        onConfirm={async () => {
          if (!statusTarget) {
            return;
          }
          await handleStatusToggle(statusTarget);
          setStatusTarget(null);
        }}
        open={statusTarget !== null}
        setOpen={(open) => {
          if (!open) {
            setStatusTarget(null);
          }
        }}
        title={statusTarget?.status === "2" ? "确认停用该角色？" : "确认启用该角色？"}
      />

      <ConfirmDialog
        description={deleteTarget ? `删除角色「${deleteTarget.roleName}」后不可恢复。` : ""}
        onConfirm={async () => {
          if (!deleteTarget) {
            return;
          }
          await deleteMutation.mutateAsync(deleteTarget.roleId);
          setDeleteTarget(null);
        }}
        open={deleteTarget !== null}
        setOpen={(open) => {
          if (!open) {
            setDeleteTarget(null);
          }
        }}
        title="确认删除该角色？"
      />
    </AdminPageStack>
  );
}
