import { useQuery } from "@tanstack/react-query";

import { AdminPageStack, MetricCard, MetricGrid, PageHeader, ReadonlyCodeBlock, SectionCard } from "@suiyuan/ui-admin";
import { createApiClient } from "@suiyuan/api";

export function ServerMonitorPage({ api }: { api: ReturnType<typeof createApiClient> }) {
  const monitorQuery = useQuery({
    queryKey: ["admin-page", "server-monitor"],
    queryFn: () => api.admin.getServerMonitor(),
    refetchInterval: 15000,
  });

  const metrics = monitorQuery.data || {};

  return (
    <AdminPageStack>
      <PageHeader description="这一页先保留关键指标与完整 JSON 观察视图，后续再升级成图形化监控面板。" kicker="Admin Module" title="服务监控" />
      <MetricGrid>
        <MetricCard detail="当前监控接口返回的主机名。" label="主机名" value={String(metrics.hostName || "-")} />
        <MetricCard detail="当前环境出口或内网地址。" label="IP" value={String(metrics.ip || "-")} />
        <MetricCard detail="当前只做数值观察，不做趋势图。" label="CPU 使用率" value={String(metrics.cpuUsed || "-")} />
        <MetricCard detail="来自现有服务监控接口。" label="内存使用率" value={String(metrics.memUsed || "-")} />
      </MetricGrid>
      <SectionCard title="完整响应" description="便于确认接口字段，后续可按真实结构拆成单独卡片。">
        <ReadonlyCodeBlock>{JSON.stringify(metrics, null, 2)}</ReadonlyCodeBlock>
      </SectionCard>
    </AdminPageStack>
  );
}
