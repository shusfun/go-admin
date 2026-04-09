import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { CrudDataPage } from "../components/crud-data-page";
import { Button, ConfirmDialog, FormActions, FormDialog, Input, SectionCard, toast } from "@suiyuan/ui-admin";
import { createApiClient } from "@suiyuan/api";
import type { SysDeptRecord, SysPostRecord, SysRoleRecord, SysUserRecord } from "@suiyuan/types";

type SelectOption = {
  label: string;
  value: number;
};

type FlattenedDeptOption = {
  deptId: number;
  title: string;
};

export function UsersPage({ api }: { api: ReturnType<typeof createApiClient> }) {
  const queryClient = useQueryClient();
  const [passwordTarget, setPasswordTarget] = useState<SysUserRecord | null>(null);
  const [nextPassword, setNextPassword] = useState("");
  const [statusTarget, setStatusTarget] = useState<SysUserRecord | null>(null);
  const rolesQuery = useQuery({
    queryKey: ["admin-page", "role-options"],
    queryFn: async () => {
      const result = await api.admin.listRoles({ pageIndex: 1, pageSize: 100 });
      return result.list.map((item: SysRoleRecord): SelectOption => ({
        label: item.roleName,
        value: item.roleId,
      }));
    },
  });
  const postsQuery = useQuery({
    queryKey: ["admin-page", "post-options"],
    queryFn: async () => {
      const result = await api.admin.listPosts({ pageIndex: 1, pageSize: 100 });
      return result.list.map((item: SysPostRecord): SelectOption => ({
        label: item.postName,
        value: item.postId,
      }));
    },
  });
  const deptQuery = useQuery({
    queryKey: ["admin-page", "dept-options"],
    queryFn: async () => {
      const result = await api.admin.getDeptTree();
      return flattenDepts(result).map((item: FlattenedDeptOption): SelectOption => ({
        label: item.title,
        value: item.deptId,
      }));
    },
  });
  const roleMap = useMemo(
    () => new Map((rolesQuery.data || []).map((item) => [item.value, item.label])),
    [rolesQuery.data],
  );
  const postMap = useMemo(
    () => new Map((postsQuery.data || []).map((item) => [item.value, item.label])),
    [postsQuery.data],
  );
  const deptMap = useMemo(
    () =>
      new Map(
        (deptQuery.data || []).map((item) => [
          item.value,
          item.label.replaceAll("　", "").trim(),
        ]),
      ),
    [deptQuery.data],
  );
  const statusMutation = useMutation({
    mutationFn: async (payload: { userId: number; status: string }) => api.admin.updateUserStatus(payload.userId, payload.status),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin-page", "users"] });
    },
  });
  const passwordMutation = useMutation({
    mutationFn: async (payload: { userId: number; password: string }) => api.admin.resetUserPassword(payload.userId, payload.password),
    onSuccess: async () => {
      setPasswordTarget(null);
      setNextPassword("");
      await queryClient.invalidateQueries({ queryKey: ["admin-page", "users"] });
    },
  });

  async function handleStatusToggle(item: SysUserRecord) {
    const nextStatus = item.status === "2" ? "1" : "2";
    try {
      await statusMutation.mutateAsync({ userId: item.userId, status: nextStatus });
      toast.success(`用户「${item.username}」状态已更新`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "用户状态更新失败");
    }
  }

  async function handleResetPassword() {
    if (!passwordTarget) {
      return;
    }
    if (!nextPassword.trim()) {
      toast.error("请输入新密码");
      return;
    }

    try {
      await passwordMutation.mutateAsync({ userId: passwordTarget.userId, password: nextPassword.trim() });
      toast.success(`用户「${passwordTarget.username}」密码已重置`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "密码重置失败");
    }
  }

  return (
    <>
      <CrudDataPage<SysUserRecord>
        columns={[
        { label: "账号", render: (row) => row.username as string },
        { label: "昵称", render: (row) => row.nickName as string },
        { label: "手机号", render: (row) => row.phone as string },
        { label: "邮箱", render: (row) => row.email as string },
        { label: "角色", render: (row) => roleMap.get(row.roleId) || String(row.roleId ?? "-") },
        { label: "部门", render: (row) => deptMap.get(row.deptId) || String(row.deptId ?? "-") },
        { label: "岗位", render: (row) => postMap.get(row.postId) || String(row.postId ?? "-") },
        { label: "状态", render: (row) => (row.status === "2" ? "正常" : "停用") },
      ]}
        createDraft={() => ({
        username: "",
        password: "",
        nickName: "",
        phone: "",
        email: "",
        roleId: "",
        deptId: "",
        postId: "",
        sex: "0",
        status: "2",
        remark: "",
        })}
        createItem={(payload) => api.admin.createUser(payload)}
        deleteItem={(payload) => api.admin.deleteUsers(payload)}
        description="用户管理已经进入第二阶段，补齐状态切换、密码重置和名称映射，优先打通真实操作链路。"
        fetcher={(params) => api.admin.listUsers(params)}
        formFields={[
        { key: "username", label: "账号" },
        { key: "password", label: "密码", type: "password" },
        { key: "nickName", label: "昵称" },
        { key: "phone", label: "手机号" },
        { key: "email", label: "邮箱" },
        { key: "roleId", label: "角色", type: "select", options: rolesQuery.data || [] },
        { key: "deptId", label: "部门", type: "select", options: deptQuery.data || [] },
        { key: "postId", label: "岗位", type: "select", options: postsQuery.data || [] },
        {
          key: "sex",
          label: "性别",
          type: "select",
          options: [
            { label: "未知", value: "0" },
            { label: "男", value: "1" },
            { label: "女", value: "2" },
          ],
        },
        {
          key: "status",
          label: "状态",
          type: "select",
          options: [
            { label: "正常", value: "2" },
            { label: "停用", value: "1" },
          ],
        },
        { key: "remark", label: "备注", type: "textarea" },
        ]}
        getRowId={(item) => Number(item.userId)}
        queryKey="users"
        renderAside={() => (
        <SectionCard title="迁移说明" description="这一页对应官方 sys-user，沿用原后端字段，不在第一阶段重塑权限分配交互。">
          <div className="space-y-2 text-sm leading-7 text-muted-foreground">
            <p>角色、部门、岗位列已经使用后台选项映射为名称，不再只显示 ID。</p>
            <p>状态切换和密码重置已接入真实接口，仍不做批量操作。</p>
            <p>角色权限分配仍保持原后端规则，不在这一轮扩展成复杂授权器。</p>
          </div>
        </SectionCard>
        )}
        rowActions={(item) => (
          <>
            <Button disabled={statusMutation.isPending} onClick={() => setStatusTarget(item)} size="sm" type="button" variant="outline">
              {item.status === "2" ? "停用" : "启用"}
            </Button>
            <Button
              onClick={() => {
                setPasswordTarget(item);
                setNextPassword("");
              }}
              size="sm"
              type="button"
              variant="outline"
            >
              重置密码
            </Button>
          </>
        )}
        searchFields={[
        { key: "username", label: "账号", placeholder: "按账号过滤" },
        { key: "phone", label: "手机号", placeholder: "按手机号过滤" },
        { key: "status", label: "状态", placeholder: "输入 1 或 2" },
        ]}
        title="用户管理"
        toDraft={(item) => ({ ...item, password: "" })}
        updateItem={(payload) => api.admin.updateUser(payload as { userId: number })}
      />
      <FormDialog
        description={passwordTarget ? `当前用户：${passwordTarget.username}` : undefined}
        onOpenChange={(open) => {
          if (!open) {
            setPasswordTarget(null);
            setNextPassword("");
          }
        }}
        open={passwordTarget !== null}
        title="重置密码"
      >
        <div className="grid gap-4">
          <Input onChange={(event) => setNextPassword(event.target.value)} type="password" value={nextPassword} />
          <FormActions>
            <Button disabled={passwordMutation.isPending} onClick={() => void handleResetPassword()} type="button">
              {passwordMutation.isPending ? "提交中..." : "确认重置"}
            </Button>
            <Button
              onClick={() => {
                setPasswordTarget(null);
                setNextPassword("");
              }}
              type="button"
              variant="outline"
            >
              取消
            </Button>
          </FormActions>
        </div>
      </FormDialog>
      <ConfirmDialog
        actionLabel={statusTarget?.status === "2" ? "确认停用" : "确认启用"}
        description={statusTarget ? `用户「${statusTarget.username}」的状态将被更新。` : ""}
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
        title={statusTarget?.status === "2" ? "确认停用该用户？" : "确认启用该用户？"}
      />
    </>
  );
}

function flattenDepts(items: SysDeptRecord[], level = 0): FlattenedDeptOption[] {
  return items.flatMap((item) => [
    {
      deptId: item.deptId,
      title: `${"　".repeat(level)}${item.deptName}`,
    },
    ...flattenDepts(item.children || [], level + 1),
  ]);
}
