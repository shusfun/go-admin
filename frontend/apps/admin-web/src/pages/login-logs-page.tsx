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
import type { SysLoginLogRecord } from "@go-admin/types";

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
  return new Date(value).toLocaleString("zh-CN", { hour12: false });
}

function toRangeParams(range?: DateRangePickerValue) {
  return {
    beginTime: typeof range?.[0] === "string" ? range[0] : undefined,
    endTime: typeof range?.[1] === "string" ? range[1] : undefined,
  };
}

function getLoginStatusLabel(status?: string) {
  return status === "2" ? "成功" : "失败";
}

export function LoginLogsPage({ api }: { api: ReturnType<typeof createApiClient> }) {
  const queryClient = useQueryClient();
  const [pageIndex, setPageIndex] = useState(1);
  const [username, setUsername] = useState("");
  const [ipaddr, setIpaddr] = useState("");
  const [status, setStatus] = useState("");
  const [dateRange, setDateRange] = useState<DateRangePickerValue>();
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<SysLoginLogRecord | null>(null);

  const listQuery = useQuery({
    queryKey: ["admin-page", "login-logs", username, ipaddr, status, dateRange?.[0], dateRange?.[1], pageIndex],
    queryFn: () =>
      api.admin.listLoginLogs({
        pageIndex,
        pageSize: 20,
        username: username || undefined,
        ipaddr: ipaddr || undefined,
        status: status || undefined,
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
    queryKey: ["admin-page", "login-log-detail", selectedId],
    queryFn: () => api.admin.getLoginLog(selectedId as number),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => api.admin.deleteLoginLogs({ ids: [id] }),
    onSuccess: async () => {
      toast.success("登录日志已删除");
      await queryClient.invalidateQueries({ queryKey: ["admin-page", "login-logs"] });
    },
    onError: (error) => {
      toast.error(toUserFacingErrorMessage(error, "登录日志删除失败"));
    },
  });

  const selectedRow = useMemo(() => rows.find((row) => row.id === selectedId) ?? null, [rows, selectedId]);
  const detail = detailQuery.data;

  return (
    <AdminPageStack>
      <PageHeader
        kicker="管理台"
        title="登录日志"
      />

      <FilterPanel>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <FormField label="用户名">
            <Input
              onChange={(event) => {
                setPageIndex(1);
                setUsername(event.target.value);
              }}
              placeholder="按用户名过滤"
              value={username}
            />
          </FormField>
          <FormField label="IP">
            <Input
              onChange={(event) => {
                setPageIndex(1);
                setIpaddr(event.target.value);
              }}
              placeholder="按 IP 过滤"
              value={ipaddr}
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
          <FormField label="登录时间">
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
          <Button onClick={() => void queryClient.invalidateQueries({ queryKey: ["admin-page", "login-logs"] })} type="button" variant="outline">
            刷新数据
          </Button>
        </Toolbar>
      </FilterPanel>

      <MasterDetailLayout className="items-start xl:grid-cols-[minmax(0,1.18fr)_minmax(340px,0.82fr)]">
        <ListPane>
          <Card className="border-border/70 bg-card">
            <CardHeader className="gap-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="space-y-1">
                  <CardTitle className="text-base">摘要列表</CardTitle>
                  <CardDescription>左侧概览近期登录记录。</CardDescription>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge tone="muted">共 {total} 条</Badge>
                  <Badge tone="success">虚拟化开启</Badge>
                  <Badge tone="info">中屏自动换行</Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="grid gap-4">
              <AppVirtualList
                className="max-h-[34rem]"
                contentClassName="grid"
                empty={<EmptyBlock description="当前筛选条件下没有登录日志。" title="暂无记录" />}
                estimatedItemSize={112}
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
                        "md:grid-cols-[minmax(0,1.5fr)_104px_minmax(0,1fr)] xl:grid-cols-[minmax(0,1.9fr)_96px_120px_156px]",
                        selected ? "bg-primary/7 hover:bg-primary/9" : "bg-card hover:bg-secondary/55",
                      ].join(" ")}
                      data-login-log-id={row.id}
                      onClick={() => setSelectedId(row.id)}
                      type="button"
                    >
                      <div className="grid gap-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-medium text-foreground">{row.username || "-"}</span>
                          <Badge size="small" tone="muted">
                            {row.ipaddr || "-"}
                          </Badge>
                        </div>
                        <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs leading-6 text-muted-foreground">
                          <span>{row.browser || "-"}</span>
                          <span>{row.os || "-"}</span>
                          <span>{formatDateTime(row.loginTime as string)}</span>
                        </div>
                        <div className="line-clamp-2 text-xs leading-6 text-muted-foreground">{row.msg || "无日志消息"}</div>
                      </div>
                      <div className="flex items-start md:justify-center xl:justify-start">
                        <StatusBadge status={getLoginStatusLabel(row.status)} />
                      </div>
                      <div className="grid gap-1 text-sm text-muted-foreground">
                        <span className="font-medium text-foreground">终端环境</span>
                        <span>{row.browser || "-"}</span>
                        <span>{row.os || "-"}</span>
                      </div>
                      <div className="hidden xl:grid gap-1 text-sm text-muted-foreground">
                        <span className="font-medium text-foreground">最近登录</span>
                        <span>{formatDateTime(row.loginTime as string)}</span>
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
                    <StatusBadge status={getLoginStatusLabel(selectedRow.status)} />
                    <Badge tone="muted">{selectedRow.ipaddr || "-"}</Badge>
                    <Badge tone="info">{selectedRow.browser || "-"}</Badge>
                  </div>
                  <div className="space-y-1">
                    <CardTitle>{selectedRow.username || "登录日志详情"}</CardTitle>
                    <CardDescription>查看选中记录的详细环境数据与消息。</CardDescription>
                  </div>
                </>
              ) : (
                <>
                  <CardTitle>登录日志详情</CardTitle>
                  <CardDescription>请选择一条日志查看详情。</CardDescription>
                </>
              )}
            </CardHeader>
            <CardContent className="grid gap-4">
              {detail ? (
                <>
                  <DetailGrid
                    items={[
                      { label: "用户名", value: detail.username || "-" },
                      { label: "状态", value: getLoginStatusLabel(detail.status) },
                      { label: "IP", value: detail.ipaddr || "-" },
                      { label: "归属地", value: detail.loginLocation || "-" },
                      { label: "浏览器", value: detail.browser || "-" },
                      { label: "系统", value: detail.os || "-" },
                      { label: "平台", value: detail.platform || "-" },
                      { label: "登录时间", value: formatDateTime(detail.loginTime as string) },
                      { label: "备注", value: detail.remark || "-" },
                    ]}
                  />
                  <ReadonlyCodeBlock title="日志消息">{detail.msg || "无详细消息"}</ReadonlyCodeBlock>
                  <div className="flex flex-wrap justify-end gap-2">
                    <Button onClick={() => setDeleteTarget(detail)} size="small" type="button" variant="destructive">
                      删除当前日志
                    </Button>
                  </div>
                </>
              ) : selectedRow ? (
                <div className="py-4 text-sm text-muted-foreground">正在加载详情...</div>
              ) : (
                <EmptyBlock description="请在左侧列表选择一条记录查看完整信息。" title="尚未选择日志" />
              )}
            </CardContent>
          </Card>
        </DetailPane>
      </MasterDetailLayout>

      <ConfirmDialog
        description={deleteTarget ? `登录日志「${deleteTarget.username || "-"} / ${deleteTarget.ipaddr || "-"}」将被删除。` : ""}
        onConfirm={async () => {
          if (!deleteTarget) {
            return;
          }
          await deleteMutation.mutateAsync(deleteTarget.id);
          if (selectedId === deleteTarget.id) {
            setSelectedId(null);
          }
          setDeleteTarget(null);
        }}
        open={deleteTarget !== null}
        setOpen={(open) => {
          if (!open) {
            setDeleteTarget(null);
          }
        }}
        title="确认删除该登录日志？"
      />
    </AdminPageStack>
  );
}
