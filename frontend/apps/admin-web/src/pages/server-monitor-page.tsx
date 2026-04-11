import { useQuery } from "@tanstack/react-query";

import { AdminPageStack, MetricCard, MetricGrid, PageHeader, ReadonlyCodeBlock, SectionCard } from "@go-admin/ui-admin";
import { createApiClient } from "@go-admin/api";

export function ServerMonitorPage({ api }: { api: ReturnType<typeof createApiClient> }) {
  const monitorQuery = useQuery({
    queryKey: ["admin-page", "server-monitor"],
    queryFn: () => api.admin.getServerMonitor(),
    refetchInterval: 15000,
  });

  const metrics = monitorQuery.data || {};

  return (
    <AdminPageStack>
      <PageHeader description="服务器资源实时概览，每 15 秒自动刷新。" kicker="管理台" title="服务监控" />
      <MetricGrid>
        <MetricCard detail="服务器主机名" label="主机名" value={String(metrics.hostName || "-")} />
        <MetricCard detail="服务器 IP 地址" label="IP" value={String(metrics.ip || "-")} />
        <MetricCard detail="当前 CPU 占用率" label="CPU 使用率" value={String(metrics.cpuUsed || "-")} />
        <MetricCard detail="当前内存占用率" label="内存使用率" value={String(metrics.memUsed || "-")} />
      </MetricGrid>
      <SectionCard title="监控详情" description="查看当前监控数据快照">
        <ReadonlyCodeBlock>{JSON.stringify(metrics, null, 2)}</ReadonlyCodeBlock>
      </SectionCard>
    </AdminPageStack>
  );
}
