import { AdminPageStack, AdminTwoColumn, DetailGrid, PageHeader, SectionCard } from "@go-admin/ui-admin";
import type { AppMenuNode } from "@go-admin/types";

export function ModulePage({ currentMenu }: { currentMenu: AppMenuNode | undefined }) {
  if (!currentMenu) {
    return (
      <AdminPageStack>
        <PageHeader description="这个入口对应的页面还在整理中，稍后会开放。" kicker="功能状态" title="页面准备中" />
      </AdminPageStack>
    );
  }

  return (
    <AdminPageStack>
      <PageHeader
        description={currentMenu.fullPath}
        kicker="菜单详情"
        title={currentMenu.title}
      />

      <AdminTwoColumn>
        <SectionCard title="页面信息" description="当前菜单对应的访问路径与展示配置">
          <DetailGrid
            items={[
              { label: "完整路径", value: currentMenu.fullPath },
              { label: "菜单类型", value: currentMenu.menuType },
              { label: "权限标识", value: currentMenu.permission || "未配置" },
              { label: "页面标识", value: currentMenu.component || "未配置" },
            ]}
          />
        </SectionCard>
      </AdminTwoColumn>
    </AdminPageStack>
  );
}
