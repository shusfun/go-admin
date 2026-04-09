import { AdminPageStack, AdminTwoColumn, DetailGrid, PageHeader, SectionCard } from "@suiyuan/ui-admin";
import type { AppMenuNode } from "@suiyuan/types";

export function ModulePage({ currentMenu }: { currentMenu: AppMenuNode | undefined }) {
  if (!currentMenu) {
    return (
      <AdminPageStack>
        <PageHeader description="当前路径已经进入新的后台壳子，但还没有绑定具体业务页面。" kicker="Route" title="页面未映射" />
      </AdminPageStack>
    );
  }

  return (
    <AdminPageStack>
      <PageHeader
        description="该菜单已经完成动态路由接入。下一步只需要把原模块逻辑迁入这个路径，不需要再重复处理鉴权、导航和租户上下文。"
        kicker="Module"
        title={currentMenu.title}
      />

      <AdminTwoColumn>
        <SectionCard title="当前路由上下文" description="用于逐模块迁移时快速确认挂载信息。">
          <DetailGrid
            items={[
              { label: "完整路径", value: currentMenu.fullPath },
              { label: "菜单类型", value: currentMenu.menuType },
              { label: "权限标识", value: currentMenu.permission || "未配置" },
              { label: "组件标识", value: currentMenu.component || "未配置" },
            ]}
          />
        </SectionCard>
        <SectionCard title="迁移建议" description="把旧页面功能按模块注入到这里，不再回到旧前端架构。">
          <div className="space-y-2 text-sm leading-7 text-muted-foreground">
            <p>先接真实查询与提交接口，再替换占位说明。</p>
            <p>有子菜单时继续拆成独立页面组件，不要堆在单页里。</p>
            <p>如果模块是工作流型页面，优先用卡片和状态分区，不要退回传统大表格布局。</p>
          </div>
        </SectionCard>
      </AdminTwoColumn>
    </AdminPageStack>
  );
}
