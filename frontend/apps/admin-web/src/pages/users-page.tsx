import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { CrudDataPage } from "../components/crud-data-page";
import { Button, ConfirmDialog, FormActions, FormDialog, Input, SectionCard, toast } from "@go-admin/ui-admin";
import { createApiClient, toUserFacingErrorMessage } from "@go-admin/api";
import type { SysDeptRecord, SysPostRecord, SysRoleRecord, SysUserRecord } from "@go-admin/types";

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
      toast.error(toUserFacingErrorMessage(error, "用户状态更新失败"));
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
      toast.error(toUserFacingErrorMessage(error, "密码重置失败"));
    }
  }

  return (
    <>
      <CrudDataPage<SysUserRecord>
        columns={[
          { key: "username", label: "账号", render: (row) => row.username as string, alwaysVisible: true },
          { key: "nickName", label: "昵称", render: (row) => row.nickName as string },
          { key: "phone", label: "手机号", render: (row) => row.phone as string },
          { key: "email", label: "邮箱", render: (row) => row.email as string },
          { key: "role", label: "角色", render: (row) => roleMap.get(row.roleId) || String(row.roleId ?? "-") },
          { key: "dept", label: "部门", render: (row) => deptMap.get(row.deptId) || String(row.deptId ?? "-") },
          { key: "post", label: "岗位", render: (row) => postMap.get(row.postId) || String(row.postId ?? "-") },
          { key: "status", label: "状态", render: (row) => (row.status === "2" ? "正常" : "停用") },
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
        description="管理系统用户账号、角色与状态。"
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
        labels={{
          createAction: "新建用户",
          createTitle: "新建用户",
          editTitle: "编辑用户",
          createSuccess: "用户已创建",
          updateSuccess: "用户已更新",
          saveError: "用户保存失败",
          deleteSuccess: "用户已删除",
          deleteError: "用户删除失败",
        }}
        queryKey="users"

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
        viewPresets={[
          {
            key: "overview",
            label: "主视图",
            description: "保留账号、昵称、角色、部门和状态，适合权限与组织关系排查。",
            columnKeys: ["username", "nickName", "role", "dept", "status"],
          },
          {
            key: "contact",
            label: "联系方式",
            description: "突出手机号、邮箱和部门信息，适合联络与通知场景。",
            columnKeys: ["username", "phone", "email", "dept", "status"],
          },
          {
            key: "staffing",
            label: "任职信息",
            description: "突出角色、部门、岗位与状态，适合组织编制核对。",
            columnKeys: ["username", "role", "dept", "post", "status"],
          },
        ]}
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
