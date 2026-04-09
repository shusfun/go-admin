import { AdminPageStack, AdminTwoColumn, DetailGrid, PageHeader, SectionCard } from "@suiyuan/ui-admin";
import type { InfoResponse, ProfileResponse } from "@suiyuan/types";

export function ProfilePage({ info, profile }: { info: InfoResponse; profile: ProfileResponse }) {
  return (
    <AdminPageStack>
      <PageHeader description="这里直接复用现有 `/api/v1/getinfo` 与 `/api/v1/user/profile` 数据。" kicker="Account" title="个人中心" />

      <AdminTwoColumn>
        <SectionCard title="账号信息" description="用于确认后端登录态、角色和租户上下文已经打通。">
          <DetailGrid
            items={[
              { label: "用户名", value: info.userName },
              { label: "显示名", value: info.name },
              { label: "部门 ID", value: info.deptId },
              { label: "角色", value: info.roles.join(" / ") },
            ]}
          />
        </SectionCard>
        <SectionCard title="联系与岗位" description="后续移动端和后台端都可复用这部分用户基础信息。">
          <DetailGrid
            items={[
              { label: "手机号", value: profile.user.phone || "未设置" },
              { label: "邮箱", value: profile.user.email || "未设置" },
              { label: "岗位", value: profile.posts.map((post) => post.postName).join(" / ") || "未配置" },
              { label: "备注", value: profile.user.remark || "暂无备注" },
            ]}
          />
        </SectionCard>
      </AdminTwoColumn>
    </AdminPageStack>
  );
}
