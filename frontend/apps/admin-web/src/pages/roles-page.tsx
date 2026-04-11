import { useState } from "react";
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
} from "@go-admin/ui-admin";
import { createApiClient, toUserFacingErrorMessage } from "@go-admin/api";
import type { SysRoleRecord, TreeOptionNode } from "@go-admin/types";

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
        throw new Error("角色已创建，请刷新列表确认结果");
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
      toast.error(toUserFacingErrorMessage(error, "角色保存失败"));
    },
  });

  const statusMutation = useMutation({
    mutationFn: async (payload: { roleId: number; status: string }) => api.admin.updateRoleStatus(payload.roleId, payload.status),
    onSuccess: async (_, payload) => {
      toast.success(payload.status === "2" ? "角色已启用" : "角色已停用");
      await queryClient.invalidateQueries({ queryKey: ["admin-page", "roles"] });
    },
    onError: (error) => {
      toast.error(toUserFacingErrorMessage(error, "角色状态更新失败"));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (roleId: number) => api.admin.deleteRoles({ ids: [roleId] }),
    onSuccess: async () => {
      toast.success("角色已删除");
      await queryClient.invalidateQueries({ queryKey: ["admin-page", "roles"] });
    },
    onError: (error) => {
      toast.error(toUserFacingErrorMessage(error, "角色删除失败"));
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
      toast.error(toUserFacingErrorMessage(error, "角色权限树加载失败"));
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
      toast.error(toUserFacingErrorMessage(error, "角色详情加载失败"));
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
        description="管理角色及其菜单权限与数据权限。"
        kicker="管理台"
        title="角色管理"
      />

      <FilterPanel>
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

      <DataTableSection description={`当前共 ${total} 条角色记录。`} title="角色列表">
        <div className="flex flex-wrap items-center gap-2 rounded-[1.25rem] border border-border/70 bg-secondary/20 px-4 py-3 text-sm text-muted-foreground">
          <Badge tone="muted">共 {total} 条</Badge>
          <Badge tone="primary">角色主信息前置</Badge>
          <Badge tone="info">中小屏自动换成卡片列表</Badge>
        </div>

        <div className="hidden xl:block">
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
        </div>

        <div className="xl:hidden">
          <AppVirtualList
            className="max-h-[34rem]"
            contentClassName="grid"
            empty={<div className="px-4 py-8 text-sm text-muted-foreground">暂无角色记录。</div>}
            estimatedItemSize={172}
            getItemKey={(item) => item.roleId}
            items={rows}
            overscan={4}
          >
            {(row) => (
              <Card className="rounded-none border-x-0 border-t-0 shadow-none first:rounded-t-[1.25rem] last:rounded-b-[1.25rem] last:border-b">
                <CardContent className="grid gap-4 px-4 py-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="grid gap-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-base font-semibold text-foreground">{row.roleName}</span>
                        {row.admin ? <Badge tone="primary">系统角色</Badge> : null}
                      </div>
                      <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                        <span>{row.roleKey}</span>
                        <span>排序 {row.roleSort}</span>
                        <span>ID {row.roleId}</span>
                      </div>
                    </div>
                    <StatusBadge status={statusLabels[row.status] || row.status} />
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="grid gap-1">
                      <span className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">数据权限</span>
                      <span className="text-sm leading-6 text-foreground">{dataScopeLabels[row.dataScope] || row.dataScope || "-"}</span>
                    </div>
                    <div className="grid gap-1">
                      <span className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">备注</span>
                      <span className="text-sm leading-6 text-foreground">{row.remark || "-"}</span>
                    </div>
                  </div>
                  <RowActions className="justify-end border-t border-border/70 pt-3">
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
                </CardContent>
              </Card>
            )}
          </AppVirtualList>
        </div>
        <Pagination onNext={() => setPageIndex((current) => current + 1)} onPrevious={() => setPageIndex((current) => current - 1)} page={pageIndex} totalPages={totalPages} />
      </DataTableSection>

      <FormDialog
        description="全屏编辑角色基础信息、菜单权限和数据权限，适合处理节点较多的复杂角色。"
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) {
            resetDialogState();
          }
        }}
        open={dialogOpen}
        size="fullscreen"
        title={dialogTitle}
      >
        {dialogLoading ? (
          <div className="flex flex-1 items-center py-6 text-sm text-muted-foreground">正在加载角色权限树...</div>
        ) : (
          <div className="flex min-h-0 flex-1 flex-col">
            <div className="grid min-h-0 flex-1 gap-6 xl:grid-cols-[minmax(22rem,26rem)_minmax(0,1fr)]">
              <AppScrollbar className="min-h-0 xl:h-full" viewportClassName="pr-1">
                <div className="grid gap-6 pb-1">
                  <FormSection title="基础信息">
                    <div className="grid gap-4">
                      <FormField label="角色名称">
                        <Input onChange={(event) => setDraft((current) => ({ ...current, roleName: event.target.value }))} value={draft.roleName} />
                      </FormField>
                      <FormField label="角色编码">
                        <Input onChange={(event) => setDraft((current) => ({ ...current, roleKey: event.target.value }))} value={draft.roleKey} />
                      </FormField>
                      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
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
                      </div>
                      <FormField label="数据权限">
                        <Select onValueChange={(value) => setDraft((current) => ({ ...current, dataScope: value }))} options={dataScopeOptions} value={draft.dataScope} />
                      </FormField>
                      <FormField label="标记">
                        <Input onChange={(event) => setDraft((current) => ({ ...current, flag: event.target.value }))} value={draft.flag} />
                      </FormField>
                      <FormField label="备注">
                        <Textarea onChange={(event) => setDraft((current) => ({ ...current, remark: event.target.value }))} rows={6} value={draft.remark} />
                      </FormField>
                    </div>
                  </FormSection>

                  <div className="grid gap-3 rounded-[1.25rem] border border-border/70 bg-secondary/20 px-4 py-4 text-sm text-muted-foreground">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone="primary">{draft.roleName.trim() || "未命名角色"}</Badge>
                      <Badge tone="muted">{draft.roleKey.trim() || "未设置 roleKey"}</Badge>
                    </div>
                    <div>数据权限：{dataScopeLabels[draft.dataScope] || draft.dataScope || "-"}</div>
                    <div>菜单已选 {menuTreeLocked ? lockedMenuIds.length : menuCheckedIds.length} 项，部门已选 {deptCheckedIds.length} 项。</div>
                  </div>
                </div>
              </AppScrollbar>

              <div className="grid min-h-0 gap-6">
                <div className="flex flex-wrap items-center gap-2 rounded-[1.25rem] border border-border/70 bg-secondary/20 px-4 py-3 text-sm text-muted-foreground">
                  <Badge tone={menuTreeLocked ? "warning" : "success"}>{menuTreeLocked ? "菜单权限锁定" : "菜单权限可编辑"}</Badge>
                  <Badge tone={draft.dataScope === "2" ? "primary" : "muted"}>{draft.dataScope === "2" ? "部门权限可编辑" : "部门权限当前不生效"}</Badge>
                  <span>全屏模式下可连续查看更深层级的权限树。</span>
                </div>

                <div className="grid min-h-0 gap-6 2xl:grid-cols-2">
                  <TreeSelectorPanel
                    checkedIds={menuCheckedIds}
                    className="min-h-0"
                    description={menuTreeLocked ? "admin 角色菜单权限已锁定，仅展示已绑定结果。" : "勾选结果将随角色一起提交。"}
                    disabled={menuTreeLocked}
                    nodes={menuTree}
                    onChange={setMenuCheckedIds}
                    scrollClassName="max-h-none"
                    title="菜单权限"
                  />
                  <TreeSelectorPanel
                    checkedIds={deptCheckedIds}
                    className="min-h-0"
                    description={draft.dataScope === "2" ? "仅在“自定数据权限”时生效。" : "当前数据权限范围无需单独选择部门。"}
                    disabled={draft.dataScope !== "2"}
                    nodes={deptTree}
                    onChange={setDeptCheckedIds}
                    scrollClassName="max-h-none"
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
