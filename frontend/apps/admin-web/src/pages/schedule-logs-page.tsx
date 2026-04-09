import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import {
  AdminPageStack,
  Button,
  DataTableSection,
  type DateRange,
  DateRangePicker,
  DetailDialog,
  DetailGrid,
  FilterPanel,
  FormField,
  Input,
  PageHeader,
  Pagination,
  ReadonlyCodeBlock,
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
} from "@suiyuan/ui-admin";
import { createApiClient } from "@suiyuan/api";

const statusOptions = [
  { value: "", label: "全部状态" },
  { value: "2", label: "成功" },
  { value: "1", label: "失败" },
];

function formatDateTime(value?: string) {
  if (!value) {
    return "-";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString("zh-CN", { hour12: false });
}

function isInRange(value: string | undefined, range?: DateRange) {
  if (!range?.from) {
    return true;
  }
  if (!value) {
    return false;
  }
  const current = new Date(value).getTime();
  const start = new Date(range.from).setHours(0, 0, 0, 0);
  const end = range.to ? new Date(range.to).setHours(23, 59, 59, 999) : new Date(range.from).setHours(23, 59, 59, 999);
  return current >= start && current <= end;
}

export function ScheduleLogsPage({ api }: { api: ReturnType<typeof createApiClient> }) {
  const [pageIndex, setPageIndex] = useState(1);
  const [jobName, setJobName] = useState("");
  const [jobGroup, setJobGroup] = useState("");
  const [status, setStatus] = useState("");
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [detailId, setDetailId] = useState<number | null>(null);

  const listQuery = useQuery({
    queryKey: ["admin-page", "schedule-job-logs", jobName, jobGroup, status, pageIndex],
    queryFn: () =>
      api.jobs.listJobLogs({
        pageIndex,
        pageSize: 20,
        jobName: jobName || undefined,
        jobGroup: jobGroup || undefined,
        status: status ? Number(status) : undefined,
      }),
  });
  const detailQuery = useQuery({
    enabled: detailId !== null,
    queryKey: ["admin-page", "schedule-log-detail", detailId],
    queryFn: () => api.jobs.getJobLog(detailId as number),
  });

  const filteredRows = useMemo(
    () => (listQuery.data?.list || []).filter((item) => isInRange(item.startTime, dateRange)),
    [dateRange, listQuery.data],
  );
  const total = filteredRows.length;
  const totalPages = Math.max(1, listQuery.data ? Math.ceil((listQuery.data.count || 0) / 20) : 1);
  const detail = detailQuery.data;

  return (
    <AdminPageStack>
      <PageHeader description="查询定时任务执行日志。" kicker="Admin Module" title="调度日志" />

      <FilterPanel description="时间筛选在客户端对已加载数据过滤（后端暂不支持时间范围参数）。">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <FormField label="任务名称">
            <Input onChange={(event) => {
              setPageIndex(1);
              setJobName(event.target.value);
            }} placeholder="按任务名称过滤" value={jobName} />
          </FormField>
          <FormField label="任务分组">
            <Input onChange={(event) => {
              setPageIndex(1);
              setJobGroup(event.target.value);
            }} placeholder="如 DEFAULT" value={jobGroup} />
          </FormField>
          <FormField label="状态">
            <Select onValueChange={(value) => {
              setPageIndex(1);
              setStatus(value);
            }} options={statusOptions} value={status} />
          </FormField>
          <FormField label="开始时间">
            <DateRangePicker onChange={setDateRange} value={dateRange} />
          </FormField>
        </div>
        <Toolbar>
          <Button onClick={() => listQuery.refetch()} type="button" variant="outline">
            刷新数据
          </Button>
        </Toolbar>
      </FilterPanel>

      <DataTableSection description={`当前页展示 ${total} 条记录。`} title="日志列表">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>任务名称</TableHead>
              <TableHead>分组</TableHead>
              <TableHead>类型</TableHead>
              <TableHead>调用目标</TableHead>
              <TableHead>状态</TableHead>
              <TableHead>耗时</TableHead>
              <TableHead>开始时间</TableHead>
              <TableHead>结束时间</TableHead>
              <TableHead>操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredRows.map((row) => (
              <TableRow key={row.id}>
                <TableCell>{row.jobName || "-"}</TableCell>
                <TableCell>{row.jobGroup || "-"}</TableCell>
                <TableCell>{row.jobType === 2 ? "函数调用" : "HTTP"}</TableCell>
                <TableCell>{row.invokeTarget || "-"}</TableCell>
                <TableCell>
                  <StatusBadge status={row.status === 2 ? "成功" : "失败"} />
                </TableCell>
                <TableCell>{`${row.durationMs || 0} ms`}</TableCell>
                <TableCell>{formatDateTime(row.startTime)}</TableCell>
                <TableCell>{formatDateTime(row.endTime)}</TableCell>
                <TableCell>
                  <RowActions>
                    <Button onClick={() => setDetailId(row.id)} size="sm" type="button" variant="outline">
                      详情
                    </Button>
                  </RowActions>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <Pagination onNext={() => setPageIndex((current) => current + 1)} onPrevious={() => setPageIndex((current) => current - 1)} page={pageIndex} totalPages={totalPages} />
      </DataTableSection>

      <DetailDialog description="单次调度执行的结果、调用目标和完整消息都统一放到详情弹层中。" onOpenChange={(open) => !open && setDetailId(null)} open={detailId !== null} title={detail?.jobName || "调度日志详情"}>
        {detail ? (
          <div className="grid gap-4">
            <DetailGrid
              items={[
                { label: "任务名称", value: detail.jobName || "-" },
                { label: "任务分组", value: detail.jobGroup || "-" },
                { label: "任务类型", value: detail.jobType === 2 ? "函数调用" : "HTTP" },
                { label: "执行状态", value: detail.status === 2 ? "成功" : "失败" },
                { label: "执行耗时", value: `${detail.durationMs || 0} ms` },
                { label: "EntryId", value: detail.entryId || 0 },
                { label: "开始时间", value: formatDateTime(detail.startTime) },
                { label: "结束时间", value: formatDateTime(detail.endTime) },
                { label: "Cron", value: detail.cronExpression || "-" },
                { label: "调用目标", value: detail.invokeTarget || "-" },
              ]}
            />
            <ReadonlyCodeBlock title="完整消息">{detail.message || "无消息"}</ReadonlyCodeBlock>
          </div>
        ) : (
          <div className="py-4 text-sm text-muted-foreground">正在加载日志详情...</div>
        )}
      </DetailDialog>
    </AdminPageStack>
  );
}
