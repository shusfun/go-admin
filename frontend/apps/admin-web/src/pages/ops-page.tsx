import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  AdminPageStack,
  AsyncActionButton,
  Button,
  CommitList,
  ConfirmActionDialog,
  DataTableSection,
  DetailDialog,
  InlineNotice,
  Input,
  LogViewer,
  PageHeader,
  ProgressSteps,
  RowActions,
  SectionCard,
  StatStrip,
  StatusBadge,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TaskStatusCard,
  toast,
} from "@suiyuan/ui-admin";
import { ApiError, createApiClient } from "@suiyuan/api";
import type {
  CommitInfo,
  CreateOpsTaskPayload,
  OpsDoneEvent,
  OpsEnvironmentItem,
  OpsErrorEvent,
  OpsTaskDetail,
  OpsTaskStatus,
  OpsTaskType,
} from "@suiyuan/types";

const actionMeta: Record<OpsTaskType, { label: string; variant: "default" | "outline" }> = {
  deploy_backend: { label: "发布后端", variant: "outline" },
  deploy_frontend: { label: "发布前端", variant: "outline" },
  deploy_all: { label: "全部发布", variant: "default" },
  restart_backend: { label: "重启后端", variant: "outline" },
};

const statusText: Record<OpsTaskStatus, string> = {
  queued: "排队中",
  running: "执行中",
  success: "成功",
  failed: "失败",
  cancelled: "已取消",
};

const envStatusText = {
  healthy: "环境健康",
  unhealthy: "健康检查失败",
  disabled: "环境已禁用",
};

type ConfirmState = {
  env: OpsEnvironmentItem;
  type: OpsTaskType;
};

type StreamSnapshot = {
  status: OpsTaskStatus;
  step: number;
  totalSteps: number;
  stepName: string;
  log: string;
  lastOffset: number;
  done?: OpsDoneEvent;
  error?: OpsErrorEvent;
};

export function OpsPage({ api }: { api: ReturnType<typeof createApiClient> }) {
  const queryClient = useQueryClient();
  const [confirmState, setConfirmState] = useState<ConfirmState | null>(null);
  const [confirmValue, setConfirmValue] = useState("");
  const [viewerTaskId, setViewerTaskId] = useState<number | null>(null);
  const [streamState, setStreamState] = useState<StreamSnapshot | null>(null);

  const environmentsQuery = useQuery({
    queryKey: ["admin", "ops", "environments"],
    queryFn: () => api.ops.getEnvironments(),
    refetchInterval: (query) => {
      const list = query.state.data as OpsEnvironmentItem[] | undefined;
      return list?.some((item) => item.runningTask) ? 5000 : 30000;
    },
  });

  const tasksQuery = useQuery({
    queryKey: ["admin", "ops", "tasks", "recent"],
    queryFn: () => api.ops.getTasks({ pageIndex: 1, pageSize: 20 }),
    refetchInterval: 30000,
  });

  const taskDetailQuery = useQuery({
    enabled: viewerTaskId !== null,
    queryKey: ["admin", "ops", "task", viewerTaskId],
    queryFn: () => api.ops.getTask(viewerTaskId!),
    refetchInterval: (query) => {
      const task = query.state.data as OpsTaskDetail | undefined;
      if (!task) {
        return false;
      }
      return task.status === "queued" || task.status === "running" ? 5000 : false;
    },
  });

  const createTaskMutation = useMutation({
    mutationFn: (payload: CreateOpsTaskPayload) => api.ops.createTask(payload),
    onSuccess: async (result) => {
      toast.success("运维任务已创建");
      setViewerTaskId(result.id);
      setConfirmState(null);
      setConfirmValue("");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["admin", "ops", "environments"] }),
        queryClient.invalidateQueries({ queryKey: ["admin", "ops", "tasks"] }),
      ]);
    },
    onError: (error) => {
      toast.error(toErrorMessage(error));
    },
  });

  const cancelTaskMutation = useMutation({
    mutationFn: (taskId: number) => api.ops.cancelTask(taskId),
    onSuccess: async (_, taskId) => {
      toast.success("任务取消请求已提交");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["admin", "ops", "environments"] }),
        queryClient.invalidateQueries({ queryKey: ["admin", "ops", "tasks"] }),
        queryClient.invalidateQueries({ queryKey: ["admin", "ops", "task", taskId] }),
      ]);
    },
    onError: (error) => {
      toast.error(toErrorMessage(error));
    },
  });

  useEffect(() => {
    const task = taskDetailQuery.data;
    if (!task) {
      return;
    }
    setStreamState({
      status: task.status,
      step: task.step,
      totalSteps: task.totalSteps,
      stepName: task.stepName,
      log: task.log,
      lastOffset: Array.from(task.log).length,
      done:
        task.status === "success"
          ? {
              status: task.status,
              summary: task.summary,
              duration: formatDuration(task.startedAt, task.finishedAt),
              domain: findEnvByKey(environmentsQuery.data, task.env)?.domain || "",
            }
          : undefined,
      error:
        task.status === "failed" || task.status === "cancelled"
          ? {
              status: task.status,
              step: task.step,
              stepName: task.stepName,
              errMsg: task.errMsg,
              suggestion: task.suggestion,
            }
          : undefined,
    });
    if (task.status !== "queued" && task.status !== "running") {
      return;
    }
    const disconnect = api.ops.connectTaskStream(task.id, {
      lastLogOffset: Array.from(task.log).length,
      onStatus: (payload) => {
        setStreamState((current) => ({
          status: payload.status,
          step: payload.step,
          totalSteps: payload.totalSteps,
          stepName: payload.stepName,
          log: current?.log || task.log,
          lastOffset: current?.lastOffset ?? Array.from(task.log).length,
          done: current?.done,
          error: current?.error,
        }));
      },
      onLog: (payload) => {
        setStreamState((current) => ({
          status: current?.status || task.status,
          step: current?.step ?? task.step,
          totalSteps: current?.totalSteps ?? task.totalSteps,
          stepName: current?.stepName || task.stepName,
          log: `${current?.log || task.log}${payload.line}`,
          lastOffset: payload.offset,
          done: current?.done,
          error: current?.error,
        }));
      },
      onDone: async (payload) => {
        setStreamState((current) => ({
          status: payload.status,
          step: current?.totalSteps ?? task.totalSteps,
          totalSteps: current?.totalSteps ?? task.totalSteps,
          stepName: current?.stepName || task.stepName,
          log: current?.log || task.log,
          lastOffset: current?.lastOffset ?? Array.from(task.log).length,
          done: payload,
          error: undefined,
        }));
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ["admin", "ops", "environments"] }),
          queryClient.invalidateQueries({ queryKey: ["admin", "ops", "tasks"] }),
          queryClient.invalidateQueries({ queryKey: ["admin", "ops", "task", task.id] }),
        ]);
      },
      onError: async (payload) => {
        setStreamState((current) => ({
          status: payload.status,
          step: payload.step,
          totalSteps: current?.totalSteps ?? task.totalSteps,
          stepName: payload.stepName,
          log: current?.log || task.log,
          lastOffset: current?.lastOffset ?? Array.from(task.log).length,
          done: undefined,
          error: payload,
        }));
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ["admin", "ops", "environments"] }),
          queryClient.invalidateQueries({ queryKey: ["admin", "ops", "tasks"] }),
          queryClient.invalidateQueries({ queryKey: ["admin", "ops", "task", task.id] }),
        ]);
      },
      onTransportError: (error) => {
        setStreamState((current) => ({
          status: current?.status || task.status,
          step: current?.step ?? task.step,
          totalSteps: current?.totalSteps ?? task.totalSteps,
          stepName: current?.stepName || task.stepName,
          log: `${current?.log || task.log}\n[stream] ${error.message}\n`,
          lastOffset: current?.lastOffset ?? Array.from(task.log).length,
          done: current?.done,
          error: current?.error,
        }));
      },
    });
    return disconnect;
  }, [api.ops, environmentsQuery.data, queryClient, taskDetailQuery.data]);

  async function handleCreateTask(env: OpsEnvironmentItem, type: OpsTaskType, confirmName?: string) {
    try {
      await createTaskMutation.mutateAsync({
        env: env.key,
        type,
        confirmName,
      });
    } catch (error) {
      if (!(error instanceof ApiError)) {
        throw error;
      }
    }
  }

  const task = taskDetailQuery.data;
  const live = streamState;
  const environments = environmentsQuery.data || [];

  return (
    <AdminPageStack>
      <PageHeader
        description="运维页已经彻底切到统一组件体系，环境卡片、提交流、确认弹层、实时日志和任务状态都不再依赖旧 `ops-*` 样式。"
        kicker="Ops Service"
        title="一页完成发布、重启与实时观察"
      />

      <StatStrip
        items={[
          { label: "已加载环境", value: environments.length },
          { label: "运行中任务", value: countRunningTasks(environments) },
          { label: "后端待发布提交", value: countPendingCommits(environments, "backend") },
          { label: "前端待发布提交", value: countPendingCommits(environments, "frontend") },
        ]}
      />

      {environmentsQuery.isError ? (
        <InlineNotice tone="danger" title="环境查询失败">
          {toErrorMessage(environmentsQuery.error)}
        </InlineNotice>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-2">
        {environments.map((env) => {
          const running = Boolean(env.runningTask);
          return (
            <SectionCard
              description={`最近一次：${env.lastDeploy ? `${actionMeta[env.lastDeploy.type].label} · ${statusText[env.lastDeploy.status]} · ${formatDateTime(env.lastDeploy.finishedAt)}` : "从未发布"}`}
              key={env.key}
              title={env.name}
            >
              <div className="grid gap-4">
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge status={running ? "运行中" : envStatusText[env.status]} />
                  <StatusBadge status={env.enabled ? "正常" : "停用"} />
                  <span className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">{env.key}</span>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <Button asChild size="sm" type="button" variant="outline">
                    <a href={env.domain} rel="noreferrer" target="_blank">
                      打开环境
                    </a>
                  </Button>
                  {env.runningTask ? (
                    <Button onClick={() => setViewerTaskId(env.runningTask!.id)} size="sm" type="button" variant="outline">
                      查看运行中任务
                    </Button>
                  ) : null}
                </div>

                {env.runningTask ? (
                  <InlineNotice tone="info" title="当前环境有任务正在执行">
                    {`${actionMeta[env.runningTask.type].label} · 步骤 ${env.runningTask.step}/${env.runningTask.totalSteps} ${env.runningTask.stepName || "处理中"}`}
                  </InlineNotice>
                ) : null}

                <div className="grid gap-4 lg:grid-cols-2">
                  <CommitList
                    commits={env.pendingCommits.backend.recent}
                    description={`共 ${env.pendingCommits.backend.count} 条后端待发布提交`}
                    title="后端提交"
                  />
                  <CommitList
                    commits={env.pendingCommits.frontend.recent}
                    description={`共 ${env.pendingCommits.frontend.count} 条前端待发布提交`}
                    title="前端提交"
                  />
                </div>

                <RowActions className="gap-3">
                  {env.actions.map((type) => (
                    <Button
                      disabled={!env.enabled || running || createTaskMutation.isPending}
                      key={type}
                      onClick={() => {
                        if (env.confirmName) {
                          setConfirmState({ env, type });
                          setConfirmValue("");
                          return;
                        }
                        void handleCreateTask(env, type);
                      }}
                      type="button"
                      variant={actionMeta[type].variant}
                    >
                      {actionMeta[type].label}
                    </Button>
                  ))}
                </RowActions>
              </div>
            </SectionCard>
          );
        })}
      </div>

      <DataTableSection description="列表接口不返回实时日志，点击详情后再拉取任务详情与流式状态。" title="最近任务">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>环境</TableHead>
              <TableHead>类型</TableHead>
              <TableHead>状态</TableHead>
              <TableHead>时间</TableHead>
              <TableHead>操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(tasksQuery.data?.list || []).map((item) => (
              <TableRow key={item.id}>
                <TableCell>#{item.id}</TableCell>
                <TableCell>{item.env}</TableCell>
                <TableCell>{actionMeta[item.type].label}</TableCell>
                <TableCell>
                  <StatusBadge status={statusText[item.status]} />
                </TableCell>
                <TableCell>{formatDateTime(item.finishedAt || item.startedAt || item.createdAt)}</TableCell>
                <TableCell>
                  <Button onClick={() => setViewerTaskId(item.id)} size="sm" type="button" variant="outline">
                    查看日志
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </DataTableSection>

      <ConfirmActionDialog
        actionLabel="确认发布"
        description={confirmState ? `必须先核对提交列表，再输入环境标识 ${confirmState.env.key} 完成确认。` : ""}
        onConfirm={async () => {
          if (!confirmState) {
            return;
          }
          if (confirmValue !== confirmState.env.key) {
            toast.error(`请输入 ${confirmState.env.key} 完成确认`);
            return;
          }
          await handleCreateTask(confirmState.env, confirmState.type, confirmValue);
        }}
        open={confirmState !== null}
        setOpen={(open) => {
          if (!open) {
            setConfirmState(null);
            setConfirmValue("");
          }
        }}
        title={confirmState ? `确认执行 ${actionMeta[confirmState.type].label} · ${confirmState.env.name}` : "确认操作"}
      >
        {confirmState ? (
          <div className="grid gap-4">
            <div className="grid gap-4 lg:grid-cols-2">
              <CommitList commits={pickConfirmCommits(confirmState.env, confirmState.type, "backend")} title="后端提交" />
              <CommitList commits={pickConfirmCommits(confirmState.env, confirmState.type, "frontend")} title="前端提交" />
            </div>
            <FormFieldLike label={`请输入 ${confirmState.env.key} 确认`}>
              <Input onChange={(event) => setConfirmValue(event.target.value)} value={confirmValue} />
            </FormFieldLike>
            {createTaskMutation.isError ? (
              <InlineNotice tone="danger">{toErrorMessage(createTaskMutation.error)}</InlineNotice>
            ) : null}
          </div>
        ) : null}
      </ConfirmActionDialog>

      <DetailDialog
        description={task ? `${actionMeta[task.type].label} · ${task.env}` : "任务详情"}
        onOpenChange={(open) => {
          if (!open) {
            setViewerTaskId(null);
            setStreamState(null);
          }
        }}
        open={viewerTaskId !== null}
        title={task ? `${actionMeta[task.type].label} 执行详情` : "任务详情"}
      >
        {taskDetailQuery.isLoading ? (
          <div className="py-4 text-sm text-muted-foreground">正在拉取任务详情...</div>
        ) : task ? (
          <div className="grid gap-6">
            {live?.error ? (
              <InlineNotice tone="danger" title={live.error.errMsg || "任务失败"}>
                {live.error.suggestion || "请检查实时日志后重试"}
              </InlineNotice>
            ) : null}

            <TaskStatusCard
              actions={
                live?.status === "queued" || live?.status === "running" || task.status === "queued" || task.status === "running" ? (
                  <AsyncActionButton loading={cancelTaskMutation.isPending} onClick={() => void cancelTaskMutation.mutateAsync(task.id)} size="sm" type="button" variant="outline">
                    取消任务
                  </AsyncActionButton>
                ) : null
              }
              description={live?.done ? `执行完成，耗时 ${live.done.duration || "未记录"}` : live?.stepName || task.stepName || task.summary || "正在同步任务状态"}
              items={[
                { label: "环境", value: task.env },
                { label: "状态", value: statusText[live?.status || task.status] },
                { label: "当前步骤", value: `${live?.step || task.step}/${live?.totalSteps || task.totalSteps}` },
                { label: "开始时间", value: formatDateTime(task.startedAt) },
                { label: "结束时间", value: formatDateTime(task.finishedAt) },
                { label: "摘要", value: task.summary || "-" },
              ]}
              status={statusText[live?.status || task.status]}
              title="任务状态"
            />

            <ProgressSteps items={buildStepStates(task, live).map((item) => ({
              label: `${item.index}/${item.total} ${item.label}`,
              meta: item.state === "running" ? "当前执行步骤" : undefined,
              state: item.state,
            }))} />

            <LogViewer description={live?.stepName || task.stepName || "等待任务推进"} log={live?.log || task.log} title="实时日志" />

            <div className="grid gap-4 lg:grid-cols-2">
              <CommitList commits={task.commits.backend} title="后端提交" />
              <CommitList commits={task.commits.frontend} title="前端提交" />
            </div>
          </div>
        ) : null}
      </DetailDialog>
    </AdminPageStack>
  );
}

function FormFieldLike({ children, label }: { children: React.ReactNode; label: string }) {
  return (
    <div className="grid gap-2">
      <p className="text-sm font-medium text-foreground">{label}</p>
      {children}
    </div>
  );
}

function buildStepStates(task: OpsTaskDetail, live: StreamSnapshot | null) {
  const labels = stepLabels[task.type];
  const currentStep = live?.step || task.step;
  const totalSteps = live?.totalSteps || task.totalSteps || labels.length;
  const currentStatus = live?.status || task.status;
  return labels.map((label, index) => {
    const step = index + 1;
    if (currentStatus === "success") {
      return { index: step, label, total: totalSteps, state: "success" as const };
    }
    if ((currentStatus === "failed" || currentStatus === "cancelled") && step === currentStep) {
      return { index: step, label, total: totalSteps, state: "failed" as const };
    }
    if ((currentStatus === "failed" || currentStatus === "cancelled") && step > currentStep) {
      return { index: step, label, total: totalSteps, state: "skipped" as const };
    }
    if (step < currentStep) {
      return { index: step, label, total: totalSteps, state: "success" as const };
    }
    if (step === currentStep && (currentStatus === "running" || currentStatus === "queued")) {
      return { index: step, label, total: totalSteps, state: "running" as const };
    }
    return { index: step, label, total: totalSteps, state: "pending" as const };
  });
}

const stepLabels: Record<OpsTaskType, string[]> = {
  deploy_backend: ["拉取代码", "构建镜像", "重启服务", "健康检查"],
  deploy_frontend: ["拉取代码", "安装依赖", "构建项目", "发布文件", "重载 Nginx"],
  deploy_all: ["拉取代码", "构建镜像", "重启服务", "健康检查", "拉取代码", "安装依赖", "构建项目", "发布文件", "重载 Nginx"],
  restart_backend: ["重启服务", "健康检查"],
};

function countRunningTasks(list?: OpsEnvironmentItem[]) {
  return (list || []).filter((item) => item.runningTask).length;
}

function countPendingCommits(list: OpsEnvironmentItem[] | undefined, target: "backend" | "frontend") {
  return (list || []).reduce((sum, item) => sum + item.pendingCommits[target].count, 0);
}

function formatDateTime(value?: string) {
  if (!value) {
    return "未记录";
  }
  return new Date(value).toLocaleString("zh-CN", {
    hour12: false,
  });
}

function formatDuration(startedAt?: string, finishedAt?: string) {
  if (!startedAt || !finishedAt) {
    return "";
  }
  const delta = Math.max(new Date(finishedAt).getTime() - new Date(startedAt).getTime(), 0);
  const seconds = Math.round(delta / 1000);
  const minutes = Math.floor(seconds / 60);
  if (minutes === 0) {
    return `${seconds}s`;
  }
  return `${minutes}m${seconds % 60}s`;
}

function findEnvByKey(list: OpsEnvironmentItem[] | undefined, key: string) {
  return (list || []).find((item) => item.key === key);
}

function pickConfirmCommits(env: OpsEnvironmentItem, type: OpsTaskType, target: "backend" | "frontend"): CommitInfo[] {
  if (type === "restart_backend") {
    return [];
  }
  if (type === "deploy_backend" && target === "frontend") {
    return [];
  }
  if (type === "deploy_frontend" && target === "backend") {
    return [];
  }
  return env.pendingCommits[target].commits;
}

function toErrorMessage(error: unknown) {
  if (error instanceof ApiError) {
    return error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return "请求失败";
}
