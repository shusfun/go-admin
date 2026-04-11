import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { CrudDataPage } from "../components/crud-data-page";
import { Button, ConfirmDialog, SectionCard, toast } from "@go-admin/ui-admin";
import { createApiClient, toUserFacingErrorMessage } from "@go-admin/api";
import type { SysJobRecord } from "@go-admin/types";

const jobGroupOptions = [
  { label: "默认", value: "DEFAULT" },
  { label: "系统", value: "SYSTEM" },
];

const jobTypeOptions = [
  { label: "HTTP", value: 1 },
  { label: "函数调用", value: 2 },
];

const misfirePolicyOptions = [
  { label: "立即执行", value: 1 },
  { label: "执行一次", value: 2 },
  { label: "放弃执行", value: 3 },
];

const concurrentOptions = [
  { label: "允许并发", value: 1 },
  { label: "禁止并发", value: 2 },
];

const statusOptions = [
  { label: "正常", value: 2 },
  { label: "停用", value: 1 },
];

export function ScheduleJobsPage({ api }: { api: ReturnType<typeof createApiClient> }) {
  const queryClient = useQueryClient();
  const [pendingAction, setPendingAction] = useState<{ action: "start" | "remove"; item: SysJobRecord } | null>(null);
  const serviceMutation = useMutation({
    mutationFn: async (payload: { action: "start" | "remove"; jobId: number }) => {
      if (payload.action === "start") {
        return api.jobs.startJob(payload.jobId);
      }
      return api.jobs.removeJob(payload.jobId);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin-page", "schedule-jobs"] });
    },
  });

  async function handleServiceAction(action: "start" | "remove", item: SysJobRecord) {
    try {
      await serviceMutation.mutateAsync({ action, jobId: item.jobId });
      toast.success(action === "start" ? "任务已启动调度服务" : "任务已从调度服务移除");
    } catch (error) {
      toast.error(toUserFacingErrorMessage(error, "任务服务操作失败"));
    }
  }

  return (
    <>
      <CrudDataPage<SysJobRecord>
        columns={[
          { label: "任务名称", render: (row) => row.jobName },
          { label: "分组", render: (row) => row.jobGroup || "-" },
          { label: "类型", render: (row) => (row.jobType === 2 ? "函数调用" : "HTTP") },
          { label: "Cron", render: (row) => row.cronExpression || "-" },
          { label: "调用目标", render: (row) => row.invokeTarget || "-" },
          { label: "状态", render: (row) => (row.status === 2 ? "正常" : "停用") },
          { label: "服务 EntryId", render: (row) => String(row.entryId || 0) },
        ]}
        createDraft={() => ({
          jobName: "",
          jobGroup: "DEFAULT",
          jobType: 1,
          cronExpression: "0/30 * * * * *",
          invokeTarget: "",
          args: "",
          misfirePolicy: 1,
          concurrent: 1,
          status: 2,
          entryId: 0,
        })}
        createItem={(payload) => api.jobs.createJob(payload)}
        deleteItem={(payload) => api.jobs.deleteJobs(payload)}
        description="管理定时任务及其调度状态。"
        fetcher={(params) => api.jobs.listJobs(params)}
        formFields={[
          { key: "jobName", label: "任务名称" },
          { key: "jobGroup", label: "任务分组", type: "select", options: jobGroupOptions },
          { key: "jobType", label: "任务类型", type: "select", options: jobTypeOptions },
          { key: "cronExpression", label: "Cron 表达式" },
          { key: "invokeTarget", label: "调用目标" },
          { key: "args", label: "参数", type: "textarea" },
          { key: "misfirePolicy", label: "执行策略", type: "select", options: misfirePolicyOptions },
          { key: "concurrent", label: "并发策略", type: "select", options: concurrentOptions },
          { key: "status", label: "状态", type: "select", options: statusOptions },
        ]}
        getRowId={(item) => item.jobId}
        queryKey="schedule-jobs"
        renderAside={() => (
        <SectionCard title="调度说明" description="任务调度状态说明">
          <div className="space-y-2 text-sm leading-7 text-muted-foreground">
            <p>`状态` 字段决定任务是否允许被启动，`EntryId` 大于 0 代表当前已挂到调度服务。</p>
            <p>`启动调度服务` 和 `从调度服务移除` 只操作运行中的调度注册，不影响任务编辑。</p>
          </div>
        </SectionCard>
        )}
        rowActions={(item) => (
          <>
            <Button
              disabled={serviceMutation.isPending || item.status !== 2}
              onClick={() => setPendingAction({ action: "start", item })}
              size="sm"
              type="button"
              variant="outline"
            >
              启动服务
            </Button>
            <Button
              disabled={serviceMutation.isPending || item.entryId <= 0}
              onClick={() => setPendingAction({ action: "remove", item })}
              size="sm"
              type="button"
              variant="destructive"
            >
              移除服务
            </Button>
          </>
        )}
        searchFields={[
          { key: "jobName", label: "任务名称", placeholder: "按任务名称过滤" },
          { key: "jobGroup", label: "任务分组", placeholder: "如 DEFAULT" },
          { key: "status", label: "状态", placeholder: "输入 1 或 2" },
        ]}
        title="定时任务"
        toDraft={(item) => ({ ...item })}
        updateItem={(payload) => api.jobs.updateJob(payload as { jobId: number })}
      />
      <ConfirmDialog
        actionLabel={pendingAction?.action === "start" ? "确认启动" : "确认移除"}
        description={
          pendingAction
            ? `任务「${pendingAction.item.jobName}」将执行${pendingAction.action === "start" ? "启动调度服务" : "从调度服务移除"}。`
            : ""
        }
        onConfirm={async () => {
          if (!pendingAction) {
            return;
          }
          await handleServiceAction(pendingAction.action, pendingAction.item);
          setPendingAction(null);
        }}
        open={pendingAction !== null}
        setOpen={(open) => {
          if (!open) {
            setPendingAction(null);
          }
        }}
        title={pendingAction?.action === "start" ? "确认启动调度服务？" : "确认移除调度服务？"}
      />
    </>
  );
}
