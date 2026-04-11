import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

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
  ConfirmDialog,
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
  toast,
} from "@go-admin/ui-admin";
import { createApiClient, toUserFacingErrorMessage } from "@go-admin/api";
import type { SysOperaLogRecord } from "@go-admin/types";

const statusOptions = [
  { value: "", label: "全部状态" },
  { value: "1", label: "正常" },
  { value: "2", label: "关闭" },
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
  return new Date(value).toLocaleString("zh-CN", { hour12: false });
}

function toRangeParams(range?: DateRangePickerValue) {
  return {
    beginTime: typeof range?.[0] === "string" ? range[0] : undefined,
    endTime: typeof range?.[1] === "string" ? range[1] : undefined,
  };
}

function getOperaStatusLabel(status?: string | number) {
  return String(status) === "1" ? "正常" : "关闭";
}

export function OperaLogsPage({ api }: { api: ReturnType<typeof createApiClient> }) {
  const queryClient = useQueryClient();
  const [pageIndex, setPageIndex] = useState(1);
  const [title, setTitle] = useState("");
  const [operUrl, setOperUrl] = useState("");
  const [status, setStatus] = useState("");
  const [dateRange, setDateRange] = useState<DateRangePickerValue>();
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<SysOperaLogRecord | null>(null);

  const listQuery = useQuery({
    queryKey: ["admin-page", "opera-logs", title, operUrl, status, dateRange?.[0], dateRange?.[1], pageIndex],
    queryFn: () =>
      api.admin.listOperaLogs({
        pageIndex,
        pageSize: 20,
        title: title || undefined,
        operUrl: operUrl || undefined,
        status: status ? Number(status) : undefined,
        ...toRangeParams(dateRange),
      }),
  });

  const rows = listQuery.data?.list || [];
  const total = listQuery.data?.count || 0;
  const totalPages = Math.max(1, Math.ceil(total / 20));

  useEffect(() => {
    if (!rows.length) {
      setSelectedId(null);
      return;
    }

    if (!rows.some((row) => row.id === selectedId)) {
      setSelectedId(rows[0].id);
    }
  }, [rows, selectedId]);

  const detailQuery = useQuery({
    enabled: selectedId !== null,
    queryKey: ["admin-page", "opera-log-detail", selectedId],
    queryFn: () => api.admin.getOperaLog(selectedId as number),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => api.admin.deleteOperaLogs({ ids: [id] }),
    onSuccess: async () => {
      toast.success("操作日志已删除");
      await queryClient.invalidateQueries({ queryKey: ["admin-page", "opera-logs"] });
    },
    onError: (error) => {
      toast.error(toUserFacingErrorMessage(error, "操作日志删除失败"));
    },
  });

  const selectedRow = useMemo(() => rows.find((row) => row.id === selectedId) ?? null, [rows, selectedId]);
  const detail = detailQuery.data;

  return (
    <AdminPageStack>
      <PageHeader
        kicker="管理台"
        title="操作日志"
      />

      <FilterPanel>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <FormField label="模块">
            <Input
              onChange={(event) => {
                setPageIndex(1);
                setTitle(event.target.value);
              }}
              placeholder="按模块过滤"
              value={title}
            />
          </FormField>
          <FormField label="访问地址">
            <Input
              onChange={(event) => {
                setPageIndex(1);
                setOperUrl(event.target.value);
              }}
              placeholder="按访问地址过滤"
              value={operUrl}
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
          <FormField label="操作时间">
            <DateRangePicker
              defaultTime={RANGE_DEFAULT_TIME}
              onChange={(value) => {
                setPageIndex(1);
                setDateRange(value);
              }}
              shortcuts={createCommonShortcuts()}
              value={dateRange}
              valueFormat="YYYY-MM-DD HH:mm:ss"
            />
          </FormField>
        </div>
        <Toolbar>
          <Button onClick={() => void queryClient.invalidateQueries({ queryKey: ["admin-page", "opera-logs"] })} type="button" variant="outline">
            刷新数据
          </Button>
        </Toolbar>
      </FilterPanel>

      <MasterDetailLayout className="items-start xl:grid-cols-[minmax(0,1.18fr)_minmax(360px,0.82fr)]">
        <ListPane>
          <Card className="border-border/70 bg-card">
            <CardHeader className="gap-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="space-y-1">
                  <CardTitle className="text-base">摘要列表</CardTitle>
                  <CardDescription>左侧概览近期关键操作记录。</CardDescription>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge tone="muted">共 {total} 条</Badge>
                  <Badge tone="success">虚拟化开启</Badge>
                  <Badge tone="info">参数外移</Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="grid gap-4">
              <AppVirtualList
                className="max-h-[34rem]"
                contentClassName="grid"
                empty={<EmptyBlock description="当前筛选条件下没有操作日志。" title="暂无记录" />}
                estimatedItemSize={124}
                getItemKey={(item) => item.id}
                items={rows}
                overscan={5}
              >
                {(row) => {
                  const selected = row.id === selectedId;
                  return (
                    <button
                      className={[
                        "grid w-full gap-3 border-b border-border/80 px-4 py-4 text-left transition-colors",
                        "md:grid-cols-[minmax(0,1.6fr)_104px_minmax(0,1fr)] xl:grid-cols-[minmax(0,1.8fr)_104px_118px_172px]",
                        selected ? "bg-primary/7 hover:bg-primary/9" : "bg-card hover:bg-secondary/55",
                      ].join(" ")}
                      data-opera-log-id={row.id}
                      onClick={() => setSelectedId(row.id)}
                      type="button"
                    >
                      <div className="grid gap-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-medium text-foreground">{row.title || "-"}</span>
                          <Badge size="small" tone="muted">
                            {row.requestMethod || "-"}
                          </Badge>
                        </div>
                        <div className="line-clamp-2 text-xs leading-6 text-muted-foreground">{row.operUrl || "-"}</div>
                        <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs leading-6 text-muted-foreground">
                          <span>{row.operName || "-"}</span>
                          <span>{row.operIp || "-"}</span>
                          <span>{formatDateTime(row.operTime as string)}</span>
                        </div>
                      </div>
                      <div className="flex items-start md:justify-center xl:justify-start">
                        <StatusBadge status={getOperaStatusLabel(row.status)} />
                      </div>
                      <div className="grid gap-1 text-sm text-muted-foreground">
                        <span className="font-medium text-foreground">请求概览</span>
                        <span>{row.requestMethod || "-"}</span>
                        <span>{row.latencyTime || "-"} ms</span>
                      </div>
                      <div className="hidden xl:grid gap-1 text-sm text-muted-foreground">
                        <span className="font-medium text-foreground">最近操作</span>
                        <span>{formatDateTime(row.operTime as string)}</span>
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
                    <StatusBadge status={getOperaStatusLabel(selectedRow.status)} />
                    <Badge tone="muted">{selectedRow.requestMethod || "-"}</Badge>
                    <Badge tone="info">{selectedRow.operName || "-"}</Badge>
                  </div>
                  <div className="space-y-1">
                    <CardTitle>{selectedRow.title || "操作日志详情"}</CardTitle>
                    <CardDescription>查看选中记录的完整请求报文与处理结果。</CardDescription>
                  </div>
                </>
              ) : (
                <>
                  <CardTitle>操作日志详情</CardTitle>
                  <CardDescription>请选择一条日志查看详情。</CardDescription>
                </>
              )}
            </CardHeader>
            <CardContent className="grid gap-4">
              {detail ? (
                <>
                  <DetailGrid
                    items={[
                      { label: "请求地址", value: detail.operUrl || "-" },
                      { label: "登录信息", value: `${detail.operName || "-"} / ${detail.operIp || "-"} / ${detail.operLocation || "-"}` },
                      { label: "请求方式", value: detail.requestMethod || "-" },
                      { label: "耗时", value: `${detail.latencyTime || "-"} ms` },
                      { label: "操作状态", value: getOperaStatusLabel(detail.status) },
                      { label: "操作时间", value: formatDateTime(detail.operTime as string) },
                      { label: "部门", value: detail.deptName || "-" },
                      { label: "UA", value: detail.userAgent || "-" },
                    ]}
                  />
                  <ReadonlyCodeBlock title="请求参数">{detail.operParam || "-"}</ReadonlyCodeBlock>
                  <ReadonlyCodeBlock title="返回结果">{detail.jsonResult || "-"}</ReadonlyCodeBlock>
                  <div className="flex flex-wrap justify-end gap-2">
                    <Button onClick={() => setDeleteTarget(detail)} size="small" type="button" variant="destructive">
                      删除当前日志
                    </Button>
                  </div>
                </>
              ) : selectedRow ? (
                <div className="py-4 text-sm text-muted-foreground">正在加载详情...</div>
              ) : (
                <div className="py-4 text-sm text-muted-foreground">请选择一条日志查看详情。</div>
              )}
            </CardContent>
          </Card>
        </DetailPane>
      </MasterDetailLayout>

      <ConfirmDialog
        description={deleteTarget ? `操作日志「${deleteTarget.title || "-"}」将被删除。` : ""}
        onConfirm={async () => {
          if (!deleteTarget) {
            return;
          }
          await deleteMutation.mutateAsync(deleteTarget.id);
          setDeleteTarget(null);
        }}
        open={deleteTarget !== null}
        setOpen={(open) => {
          if (!open) {
            setDeleteTarget(null);
          }
        }}
        title="确认删除该操作日志？"
      />
    </AdminPageStack>
  );
}
