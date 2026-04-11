import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import {
  AdminPageStack,
  AppVirtualList,
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  DateRangePicker,
  type DateRangePickerValue,
  DetailGrid,
  DetailPane,
  EmptyBlock,
  FilterPanel,
  FormField,
  Input,
  ListPane,
  MasterDetailLayout,
  PageHeader,
  Pagination,
  ReadonlyCodeBlock,
  Select,
  StatusBadge,
  Toolbar,
} from "@go-admin/ui-admin";
import { createApiClient } from "@go-admin/api";

const statusOptions = [
  { value: "", label: "全部状态" },
  { value: "2", label: "成功" },
  { value: "1", label: "失败" },
];

const RANGE_DEFAULT_TIME: [Date, Date] = [new Date(2000, 0, 1, 0, 0, 0), new Date(2000, 0, 1, 23, 59, 59)];

function addDays(value: Date, amount: number) {
  const next = new Date(value);
  next.setDate(next.getDate() + amount);
  return next;
}

function startOfMonth(value: Date) {
  return new Date(value.getFullYear(), value.getMonth(), 1);
}

function createCommonShortcuts() {
  const today = new Date();
  return [
    { text: "今天", value: [today, today] as [Date, Date] },
    { text: "最近 7 天", value: [addDays(today, -6), today] as [Date, Date] },
    { text: "最近 30 天", value: [addDays(today, -29), today] as [Date, Date] },
    { text: "本月", value: [startOfMonth(today), today] as [Date, Date] },
  ];
}

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

function isInRange(value: string | undefined, range?: DateRangePickerValue) {
  if (!range?.[0]) {
    return true;
  }
  if (!value) {
    return false;
  }
  const current = new Date(value).getTime();
  const start = new Date(String(range[0])).getTime();
  const end = range[1] ? new Date(String(range[1])).getTime() : start;
  return current >= start && current <= end;
}

function getScheduleStatusLabel(status?: number) {
  return status === 2 ? "成功" : "失败";
}

function getJobTypeLabel(jobType?: number) {
  return jobType === 2 ? "函数调用" : "HTTP";
}

export function ScheduleLogsPage({ api }: { api: ReturnType<typeof createApiClient> }) {
  const [pageIndex, setPageIndex] = useState(1);
  const [jobName, setJobName] = useState("");
  const [jobGroup, setJobGroup] = useState("");
  const [status, setStatus] = useState("");
  const [dateRange, setDateRange] = useState<DateRangePickerValue>();
  const [selectedId, setSelectedId] = useState<number | null>(null);

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

  const filteredRows = useMemo(
    () => (listQuery.data?.list || []).filter((item) => isInRange(item.startTime, dateRange)),
    [dateRange, listQuery.data],
  );
  const total = filteredRows.length;
  const totalPages = Math.max(1, listQuery.data ? Math.ceil((listQuery.data.count || 0) / 20) : 1);

  useEffect(() => {
    if (!filteredRows.length) {
      setSelectedId(null);
      return;
    }

    if (!filteredRows.some((row) => row.id === selectedId)) {
      setSelectedId(filteredRows[0].id);
    }
  }, [filteredRows, selectedId]);

  const detailQuery = useQuery({
    enabled: selectedId !== null,
    queryKey: ["admin-page", "schedule-log-detail", selectedId],
    queryFn: () => api.jobs.getJobLog(selectedId as number),
  });

  const selectedRow = useMemo(() => filteredRows.find((row) => row.id === selectedId) ?? null, [filteredRows, selectedId]);
  const detail = detailQuery.data;

  return (
    <AdminPageStack>
      <PageHeader
        kicker="管理台"
        title="调度日志"
      />

      <FilterPanel>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <FormField label="任务名称">
            <Input
              onChange={(event) => {
                setPageIndex(1);
                setJobName(event.target.value);
              }}
              placeholder="按任务名称过滤"
              value={jobName}
            />
          </FormField>
          <FormField label="任务分组">
            <Input
              onChange={(event) => {
                setPageIndex(1);
                setJobGroup(event.target.value);
              }}
              placeholder="如 DEFAULT"
              value={jobGroup}
            />
          </FormField>
          <FormField label="状态">
            <Select
              onValueChange={(value) => {
                setPageIndex(1);
                setStatus(value);
              }}
              options={statusOptions}
              value={status}
            />
          </FormField>
          <FormField label="开始时间">
            <DateRangePicker
              defaultTime={RANGE_DEFAULT_TIME}
              onChange={setDateRange}
              shortcuts={createCommonShortcuts()}
              value={dateRange}
              valueFormat="YYYY-MM-DD HH:mm:ss"
            />
          </FormField>
        </div>
        <Toolbar>
          <Button onClick={() => listQuery.refetch()} type="button" variant="outline">
            刷新数据
          </Button>
        </Toolbar>
      </FilterPanel>

      <MasterDetailLayout className="items-start xl:grid-cols-[minmax(0,1.15fr)_minmax(360px,0.85fr)]">
        <ListPane>
          <Card className="border-border/70 bg-card">
            <CardHeader className="gap-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="space-y-1">
                  <CardTitle className="text-base">摘要列表</CardTitle>
                  <CardDescription>左侧概览近期调度任务执行记录。</CardDescription>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge tone="muted">当前页 {total} 条</Badge>
                  <Badge tone="success">虚拟化开启</Badge>
                  <Badge tone="info">时间线外移</Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="grid gap-4">
              <AppVirtualList
                className="max-h-[34rem]"
                contentClassName="grid"
                empty={<EmptyBlock description="当前筛选条件下没有调度日志。" title="暂无记录" />}
                estimatedItemSize={124}
                getItemKey={(item) => item.id}
                items={filteredRows}
                overscan={5}
              >
                {(row) => {
                  const selected = row.id === selectedId;
                  return (
                    <button
                      className={[
                        "grid w-full gap-3 border-b border-border/80 px-4 py-4 text-left transition-colors",
                        "md:grid-cols-[minmax(0,1.6fr)_104px_minmax(0,1fr)] xl:grid-cols-[minmax(0,1.8fr)_96px_124px_164px]",
                        selected ? "bg-primary/7 hover:bg-primary/9" : "bg-card hover:bg-secondary/55",
                      ].join(" ")}
                      data-schedule-log-id={row.id}
                      onClick={() => setSelectedId(row.id)}
                      type="button"
                    >
                      <div className="grid gap-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-medium text-foreground">{row.jobName || "-"}</span>
                          <Badge size="small" tone="muted">
                            {row.jobGroup || "-"}
                          </Badge>
                        </div>
                        <div className="line-clamp-2 text-xs leading-6 text-muted-foreground">{row.invokeTarget || "-"}</div>
                        <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs leading-6 text-muted-foreground">
                          <span>{getJobTypeLabel(row.jobType)}</span>
                          <span>{`${row.durationMs || 0} ms`}</span>
                          <span>{formatDateTime(row.startTime)}</span>
                        </div>
                      </div>
                      <div className="flex items-start md:justify-center xl:justify-start">
                        <StatusBadge status={getScheduleStatusLabel(row.status)} />
                      </div>
                      <div className="grid gap-1 text-sm text-muted-foreground">
                        <span className="font-medium text-foreground">执行概览</span>
                        <span>{getJobTypeLabel(row.jobType)}</span>
                        <span>{`${row.durationMs || 0} ms`}</span>
                      </div>
                      <div className="hidden xl:grid gap-1 text-sm text-muted-foreground">
                        <span className="font-medium text-foreground">开始 / 结束</span>
                        <span>{formatDateTime(row.startTime)}</span>
                        <span>{formatDateTime(row.endTime)}</span>
                      </div>
                    </button>
                  );
                }}
              </AppVirtualList>
              <Pagination onNext={() => setPageIndex((current) => current + 1)} onPrevious={() => setPageIndex((current) => current - 1)} page={pageIndex} totalPages={totalPages} />
            </CardContent>
          </Card>
        </ListPane>

        <DetailPane>
          <Card className="border-border/70 bg-card">
            <CardHeader className="gap-3">
              {selectedRow ? (
                <>
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge status={getScheduleStatusLabel(selectedRow.status)} />
                    <Badge tone="muted">{selectedRow.jobGroup || "-"}</Badge>
                    <Badge tone="info">{getJobTypeLabel(selectedRow.jobType)}</Badge>
                  </div>
                  <div className="space-y-1">
                    <CardTitle>{selectedRow.jobName || "调度日志详情"}</CardTitle>
                    <CardDescription>查看选中记录的详细执行时间与日志。</CardDescription>
                  </div>
                </>
              ) : (
                <>
                  <CardTitle>调度日志详情</CardTitle>
                  <CardDescription>请选择一条调度日志查看详情。</CardDescription>
                </>
              )}
            </CardHeader>
            <CardContent className="grid gap-4">
              {detail ? (
                <>
                  <DetailGrid
                    items={[
                      { label: "任务名称", value: detail.jobName || "-" },
                      { label: "任务分组", value: detail.jobGroup || "-" },
                      { label: "任务类型", value: getJobTypeLabel(detail.jobType) },
                      { label: "执行状态", value: getScheduleStatusLabel(detail.status) },
                      { label: "执行耗时", value: `${detail.durationMs || 0} ms` },
                      { label: "EntryId", value: detail.entryId || 0 },
                      { label: "开始时间", value: formatDateTime(detail.startTime) },
                      { label: "结束时间", value: formatDateTime(detail.endTime) },
                      { label: "Cron", value: detail.cronExpression || "-" },
                      { label: "调用目标", value: detail.invokeTarget || "-" },
                    ]}
                  />
                  <ReadonlyCodeBlock title="完整消息">{detail.message || "无消息"}</ReadonlyCodeBlock>
                </>
              ) : selectedRow ? (
                <div className="py-4 text-sm text-muted-foreground">正在加载日志详情...</div>
              ) : (
                <div className="py-4 text-sm text-muted-foreground">请选择一条日志查看详情。</div>
              )}
            </CardContent>
          </Card>
        </DetailPane>
      </MasterDetailLayout>
    </AdminPageStack>
  );
}
