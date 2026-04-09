import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  AdminPageStack,
  AdminTwoColumn,
  AsyncActionButton,
  Button,
  Checkbox,
  ConfirmDialog,
  FilterPanel,
  FormActions,
  FormDialog,
  FormField,
  FormSection,
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
import type { SysApiRecord, SysMenuRecord } from "@suiyuan/types";

type FlatMenuRecord = SysMenuRecord & { level: number };

type MenuDraft = {
  menuId?: number;
  parentId: number;
  menuName: string;
  title: string;
  icon: string;
  path: string;
  menuType: string;
  action: string;
  permission: string;
  component: string;
  sort: number;
  visible: string;
  isFrame: string;
  noCache: boolean;
  breadcrumb: string;
  apis: number[];
};

const menuTypeLabels: Record<string, string> = {
  M: "目录",
  C: "菜单",
  F: "按钮",
};

const visibleOptions = [
  { value: "", label: "全部状态" },
  { value: "0", label: "显示" },
  { value: "1", label: "隐藏" },
];

const menuTypeOptions = [
  { value: "M", label: "目录" },
  { value: "C", label: "菜单" },
  { value: "F", label: "按钮" },
];

const actionOptions = [
  { value: "GET", label: "GET" },
  { value: "POST", label: "POST" },
  { value: "PUT", label: "PUT" },
  { value: "DELETE", label: "DELETE" },
];

const binaryOptions = [
  { value: "1", label: "否" },
  { value: "0", label: "是" },
];

function createMenuDraft(parentId = 0, source?: Partial<SysMenuRecord>): MenuDraft {
  return {
    menuId: source?.menuId,
    parentId: source?.parentId ?? parentId,
    menuName: source?.menuName || "",
    title: source?.title || "",
    icon: source?.icon || "",
    path: source?.path || "",
    menuType: source?.menuType || "M",
    action: source?.action || "GET",
    permission: source?.permission || "",
    component: source?.component || "",
    sort: source?.sort ?? 0,
    visible: source?.visible || "0",
    isFrame: source?.isFrame || "1",
    noCache: source?.noCache ?? false,
    breadcrumb: source?.breadcrumb || "",
    apis: source?.apis || source?.sysApi?.map((item) => item.id) || [],
  };
}

export function MenusPage({ api }: { api: ReturnType<typeof createApiClient> }) {
  const queryClient = useQueryClient();
  const [titleFilter, setTitleFilter] = useState("");
  const [visibleFilter, setVisibleFilter] = useState("");
  const [dialogTitle, setDialogTitle] = useState("新增菜单");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogLoading, setDialogLoading] = useState(false);
  const [draft, setDraft] = useState<MenuDraft>(createMenuDraft());
  const [deleteTarget, setDeleteTarget] = useState<FlatMenuRecord | null>(null);

  const menusQuery = useQuery({
    queryKey: ["admin-page", "menus-tree", titleFilter, visibleFilter],
    queryFn: () =>
      api.admin.listMenus({
        title: titleFilter || undefined,
        visible: visibleFilter || undefined,
      }),
  });
  const apiOptionsQuery = useQuery({
    queryKey: ["admin-page", "menu-api-options"],
    queryFn: () => api.admin.listApis({ pageIndex: 1, pageSize: 500, type: "BUS" }),
  });

  const saveMutation = useMutation({
    mutationFn: async (payload: MenuDraft) => {
      const nextPayload = {
        menuId: payload.menuId,
        parentId: payload.parentId,
        menuName: payload.menuName,
        title: payload.title,
        icon: payload.icon,
        path: payload.path,
        menuType: payload.menuType,
        action: payload.action,
        permission: payload.permission,
        component: payload.component,
        sort: payload.sort,
        visible: payload.visible,
        isFrame: payload.isFrame,
        noCache: payload.noCache,
        breadcrumb: payload.breadcrumb,
        apis: payload.apis,
      };
      if (payload.menuId) {
        await api.admin.updateMenu(nextPayload as { menuId: number; apis?: number[] });
        return "updated";
      }
      await api.admin.createMenu(nextPayload);
      return "created";
    },
    onSuccess: async (mode) => {
      toast.success(mode === "created" ? "菜单已创建" : "菜单已更新");
      closeDialog();
      await queryClient.invalidateQueries({ queryKey: ["admin-page", "menus-tree"] });
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "菜单保存失败");
    },
  });
  const deleteMutation = useMutation({
    mutationFn: async (menuId: number) => api.admin.deleteMenus({ ids: [menuId] }),
    onSuccess: async () => {
      toast.success("菜单已删除");
      await queryClient.invalidateQueries({ queryKey: ["admin-page", "menus-tree"] });
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "菜单删除失败");
    },
  });

  const rows = useMemo(() => flattenMenus(menusQuery.data || []), [menusQuery.data]);
  const parentOptions = useMemo(() => {
    const root: FlatMenuRecord = {
      menuId: 0,
      menuName: "root",
      title: "主类目",
      icon: "",
      path: "",
      paths: "/0",
      menuType: "M",
      action: "",
      permission: "",
      parentId: 0,
      noCache: false,
      breadcrumb: "",
      component: "Layout",
      sort: 0,
      visible: "0",
      isFrame: "1",
      level: 0,
    };
    return [root, ...rows]
      .filter((item) => {
        if (!draft.menuId || item.menuId === 0) {
          return true;
        }
        return item.menuId !== draft.menuId && !item.paths.includes(`/${draft.menuId}/`);
      })
      .map((item) => ({
        value: String(item.menuId),
        label: `${"　".repeat(item.level)}${item.title}`,
      }));
  }, [draft.menuId, rows]);

  function closeDialog() {
    setDialogOpen(false);
    setDialogLoading(false);
    setDraft(createMenuDraft());
  }

  function openCreateDialog(parent?: FlatMenuRecord) {
    setDialogTitle(parent ? `新增子菜单 · ${parent.title}` : "新增菜单");
    setDraft(createMenuDraft(parent?.menuId || 0));
    setDialogOpen(true);
  }

  async function openEditDialog(item: FlatMenuRecord) {
    setDialogOpen(true);
    setDialogLoading(true);
    try {
      const detail = await api.admin.getMenu(item.menuId);
      setDialogTitle(`编辑菜单 · ${detail.title}`);
      setDraft(createMenuDraft(detail.parentId, detail));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "菜单详情加载失败");
      closeDialog();
      return;
    }
    setDialogLoading(false);
  }

  function toggleApi(apiId: number, checked: boolean) {
    setDraft((current) => ({
      ...current,
      apis: checked ? Array.from(new Set([...current.apis, apiId])) : current.apis.filter((item) => item !== apiId),
    }));
  }

  return (
    <AdminPageStack>
      <PageHeader
        actions={
          <Button onClick={() => openCreateDialog()} type="button">
            新增菜单
          </Button>
        }
        description="菜单页已经统一到树表模板、表单弹层和确认流，目录、菜单、按钮节点共享同一套后台编辑器。"
        kicker="Admin Module"
        title="菜单管理"
      />

      <AdminTwoColumn>
        <FilterPanel description="菜单更新时会保留现有关联 API，避免误清空权限绑定关系。">
          <div className="grid gap-4 md:grid-cols-2">
            <FormField label="菜单名称">
              <Input onChange={(event) => setTitleFilter(event.target.value)} placeholder="按标题过滤" value={titleFilter} />
            </FormField>
            <FormField label="显示状态">
              <Select onValueChange={setVisibleFilter} options={visibleOptions} value={visibleFilter} />
            </FormField>
          </div>
          <Toolbar>
            <Button onClick={() => void queryClient.invalidateQueries({ queryKey: ["admin-page", "menus-tree"] })} type="button" variant="outline">
              刷新数据
            </Button>
          </Toolbar>
        </FilterPanel>

        <FilterPanel description="这页只处理树结构管理与权限绑定，不在本轮扩展图标库或路由设计器。" title="收口说明">
          <div className="space-y-2 text-sm leading-7 text-muted-foreground">
            <p>目录、菜单、按钮三类节点共享一套表单，字段按后端 DTO 原样提交。</p>
            <p>编辑时先拉取详情再回填 API 关联，避免 `sys_menu_api_rule` 被意外清空。</p>
            <p>树结构展示和新增子级都统一走当前页模板，不再保留页面级按钮 class 和 modal 结构。</p>
          </div>
        </FilterPanel>
      </AdminTwoColumn>

      <TreeTableSection description={`当前共 ${rows.length} 个菜单节点。`} title="菜单树">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>菜单名称</TableHead>
              <TableHead>路径 / 组件</TableHead>
              <TableHead>类型</TableHead>
              <TableHead>权限标识</TableHead>
              <TableHead>显示状态</TableHead>
              <TableHead>关联 API</TableHead>
              <TableHead>操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.menuId}>
                <TableCell>
                  <div className="space-y-1">
                    <div className="font-medium text-foreground">{`${"　".repeat(row.level)}${row.title}`}</div>
                    <div className="text-xs text-muted-foreground">{row.menuName || "-"}</div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="space-y-1">
                    <div>{row.path || "-"}</div>
                    <div className="text-xs text-muted-foreground">{row.component || "-"}</div>
                  </div>
                </TableCell>
                <TableCell>{menuTypeLabels[row.menuType] || row.menuType}</TableCell>
                <TableCell>{row.permission || "-"}</TableCell>
                <TableCell>
                  <StatusBadge status={row.visible === "0" ? "显示" : "隐藏"} />
                </TableCell>
                <TableCell>{row.sysApi?.length || 0}</TableCell>
                <TableCell>
                  <RowActions>
                    <Button onClick={() => void openEditDialog(row)} size="sm" type="button" variant="outline">
                      编辑
                    </Button>
                    {row.menuType !== "F" ? (
                      <Button onClick={() => openCreateDialog(row)} size="sm" type="button" variant="outline">
                        新增子级
                      </Button>
                    ) : null}
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
        description="菜单表单直接对应后端字段，提交后刷新整棵菜单树。"
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
          <div className="flex flex-1 items-center py-6 text-sm text-muted-foreground">正在加载菜单详情...</div>
        ) : (
          <div className="flex min-h-0 flex-1 flex-col">
            <div className="min-h-0 flex-1 overflow-y-auto pr-1">
              <div className="grid gap-6">
                <FormSection description="目录、菜单、按钮的核心字段统一在这里维护。" title="基础信息">
                  <div className="grid gap-4 md:grid-cols-2">
                    <FormField label="上级菜单">
                      <Select
                        onValueChange={(value) => setDraft((current) => ({ ...current, parentId: Number(value) }))}
                        options={parentOptions}
                        value={String(draft.parentId)}
                      />
                    </FormField>
                    <FormField label="菜单类型">
                      <Select onValueChange={(value) => setDraft((current) => ({ ...current, menuType: value }))} options={menuTypeOptions} value={draft.menuType} />
                    </FormField>
                    <FormField label="菜单标题">
                      <Input onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))} value={draft.title} />
                    </FormField>
                    <FormField label="路由名称">
                      <Input onChange={(event) => setDraft((current) => ({ ...current, menuName: event.target.value }))} value={draft.menuName} />
                    </FormField>
                    <FormField label="菜单图标">
                      <Input onChange={(event) => setDraft((current) => ({ ...current, icon: event.target.value }))} value={draft.icon} />
                    </FormField>
                    <FormField label="显示排序">
                      <Input onChange={(event) => setDraft((current) => ({ ...current, sort: Number(event.target.value) }))} type="number" value={String(draft.sort)} />
                    </FormField>
                    {draft.menuType !== "F" ? (
                      <FormField label="路由地址">
                        <Input onChange={(event) => setDraft((current) => ({ ...current, path: event.target.value }))} value={draft.path} />
                      </FormField>
                    ) : null}
                    {draft.menuType !== "F" ? (
                      <FormField label="组件路径">
                        <Input onChange={(event) => setDraft((current) => ({ ...current, component: event.target.value }))} value={draft.component} />
                      </FormField>
                    ) : null}
                    {draft.menuType !== "F" ? (
                      <FormField label="显示状态">
                        <Select onValueChange={(value) => setDraft((current) => ({ ...current, visible: value }))} options={visibleOptions.filter((item) => item.value)} value={draft.visible} />
                      </FormField>
                    ) : null}
                    {draft.menuType !== "F" ? (
                      <FormField label="是否外链">
                        <Select onValueChange={(value) => setDraft((current) => ({ ...current, isFrame: value }))} options={binaryOptions} value={draft.isFrame} />
                      </FormField>
                    ) : null}
                    {draft.menuType !== "M" ? (
                      <FormField label="权限标识">
                        <Input onChange={(event) => setDraft((current) => ({ ...current, permission: event.target.value }))} value={draft.permission} />
                      </FormField>
                    ) : null}
                    {draft.menuType !== "M" ? (
                      <FormField label="请求方式">
                        <Select onValueChange={(value) => setDraft((current) => ({ ...current, action: value }))} options={actionOptions} value={draft.action} />
                      </FormField>
                    ) : null}
                  </div>
                </FormSection>

                {draft.menuType !== "M" ? (
                  <FormSection description="接口权限绑定统一走复选列表，不再使用旧页面样式容器。" title="关联 API">
                    <div className="grid gap-3 md:grid-cols-2">
                      {(apiOptionsQuery.data?.list || []).map((item: SysApiRecord) => {
                        const checked = draft.apis.includes(item.id);
                        return (
                          <label className="flex items-start gap-3 rounded-2xl border border-border/70 bg-secondary/20 px-4 py-3" key={item.id}>
                            <Checkbox checked={checked} onCheckedChange={(value) => toggleApi(item.id, value === true)} />
                            <div className="space-y-1">
                              <div className="text-sm font-medium text-foreground">{item.title || "未命名接口"}</div>
                              <div className="text-xs text-muted-foreground">{`${item.action} ${item.path}`}</div>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </FormSection>
                ) : null}
              </div>
            </div>
            <FormActions className="mt-4 shrink-0 border-t border-border pt-4">
              <AsyncActionButton disabled={!draft.title.trim()} loading={saveMutation.isPending} onClick={() => saveMutation.mutate(draft)} type="button">
                保存菜单
              </AsyncActionButton>
              <Button onClick={closeDialog} type="button" variant="outline">
                取消
              </Button>
            </FormActions>
          </div>
        )}
      </FormDialog>

      <ConfirmDialog
        description={deleteTarget ? `删除菜单「${deleteTarget.title}」后不可恢复。` : ""}
        onConfirm={async () => {
          if (!deleteTarget) {
            return;
          }
          await deleteMutation.mutateAsync(deleteTarget.menuId);
          setDeleteTarget(null);
        }}
        open={deleteTarget !== null}
        setOpen={(open) => {
          if (!open) {
            setDeleteTarget(null);
          }
        }}
        title="确认删除该菜单？"
      />
    </AdminPageStack>
  );
}

function flattenMenus(items: SysMenuRecord[], level = 0): FlatMenuRecord[] {
  return items.flatMap((item) => [{ ...item, level }, ...flattenMenus(item.children || [], level + 1)]);
}
