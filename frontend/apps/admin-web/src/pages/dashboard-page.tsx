import { countLeafMenus, countVisibleMenus, flattenMenuTree } from "@suiyuan/core";
import { useI18n } from "@suiyuan/i18n";
import { AdminPageStack, AdminTwoColumn, MetricCard, MetricGrid, PageHeader, SectionCard } from "@suiyuan/ui-admin";
import type { AppMenuNode, InfoResponse, ProfileResponse } from "@suiyuan/types";

export function DashboardPage({
  info,
  menuTree,
  profile,
  tenantCode,
}: {
  info: InfoResponse;
  menuTree: AppMenuNode[];
  profile: ProfileResponse;
  tenantCode: string;
}) {
  const { t } = useI18n();
  const flattened = flattenMenuTree(menuTree);
  const displayName = info.name || info.userName;

  return (
    <AdminPageStack>
      <PageHeader
        description={t("admin.dashboard.description", undefined, { tenantCode })}
        kicker={t("admin.dashboard.kicker")}
        title={t("admin.dashboard.title", undefined, { name: displayName })}
      />

      <MetricGrid>
        <MetricCard label={t("admin.dashboard.metric.visible.label")} value={String(countVisibleMenus(menuTree))} detail={t("admin.dashboard.metric.visible.detail")} />
        <MetricCard label={t("admin.dashboard.metric.leaf.label")} value={String(countLeafMenus(menuTree))} detail={t("admin.dashboard.metric.leaf.detail")} />
        <MetricCard label={t("admin.dashboard.metric.permissions.label")} value={String(info.permissions.length)} detail={t("admin.dashboard.metric.permissions.detail")} />
        <MetricCard label={t("admin.dashboard.metric.posts.label")} value={String(profile.posts.length)} detail={t("admin.dashboard.metric.posts.detail")} />
      </MetricGrid>

      <AdminTwoColumn>
        <SectionCard title={t("admin.dashboard.quick.title")} description={t("admin.dashboard.quick.description")}>
          <div className="flex flex-wrap gap-3">
            {flattened.slice(0, 6).map((node) => (
              <span className="rounded-full bg-secondary px-4 py-2 text-sm text-secondary-foreground" key={node.id}>
                {node.title}
              </span>
            ))}
          </div>
        </SectionCard>
        <SectionCard title={t("admin.dashboard.modules.title")} description={t("admin.dashboard.modules.description")}>
          <div className="flex flex-wrap gap-3">
            {flattened.slice(6, 12).map((node) => (
              <span className="rounded-full bg-secondary px-4 py-2 text-sm text-secondary-foreground" key={node.id}>
                {node.title}
              </span>
            ))}
          </div>
        </SectionCard>
      </AdminTwoColumn>
    </AdminPageStack>
  );
}
