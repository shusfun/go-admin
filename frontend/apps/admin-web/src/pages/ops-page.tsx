import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  AdminPageStack,
  AppVirtualList,
  AsyncActionButton,
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CommitList,
  ConfirmActionDialog,
  DataTableSection,
  DetailPane,
  EmptyBlock,
  InlineNotice,
  Input,
  ListPane,
  LogViewer,
  MasterDetailLayout,
  PageHeader,
  ProgressSteps,
  RowActions,
  SectionCard,
  StatStrip,
  StatusBadge,
  TaskStatusCard,
  toast,
} from "@go-admin/ui-admin";
import { createApiClient, toUserFacingErrorMessage } from "@go-admin/api";
import type {
  CommitInfo,
  CreateOpsTaskPayload,
  OpsDoneEvent,
  OpsEnvironmentItem,
  OpsErrorEvent,
  OpsTaskDetail,
  OpsTaskStatus,
  OpsTaskType,
} from "@go-admin/types";

const actionMeta: Record<OpsTaskType, { label: string; variant: "default" | "outline" }> = {
  deploy_backend: { label: "更新后端", variant: "outline" },
  deploy_frontend: { label: "更新前端", variant: "outline" },
  deploy_all: { label: "全部更新", variant: "default" },
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
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);
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
    enabled: selectedTaskId !== null,
    queryKey: ["admin", "ops", "task", selectedTaskId],
    queryFn: () => api.ops.getTask(selectedTaskId!),
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
      setSelectedTaskId(result.id);
      setConfirmState(null);
      setConfirmValue("");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["admin", "ops", "environments"] }),
        queryClient.invalidateQueries({ queryKey: ["admin", "ops", "tasks"] }),
      ]);
    },
    onError: (error) => {
      toast.error(toUserFacingErrorMessage(error, "任务创建失败"));
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
      toast.error(toUserFacingErrorMessage(error, "任务取消失败"));
    },
  });

  const taskRows = tasksQuery.data?.list || [];
  const selectedTaskRow = taskRows.find((item) => item.id === selectedTaskId) || null;

  useEffect(() => {
    if (!taskRows.length) {
      setSelectedTaskId(null);
      return;
    }
    if (!taskRows.some((item) => item.id === selectedTaskId)) {
      setSelectedTaskId(taskRows[0].id);
    }
  }, [selectedTaskId, taskRows]);

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
          log: `${current?.log || task.log}\n[stream] ${toUserFacingErrorMessage(error, "任务流连接中断，请稍后重试")}\n`,
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
    } catch {
      return;
    }
  }

  const task = taskDetailQuery.data;
  const live = streamState;
  const environments = environmentsQuery.data || [];
  const hasEnvironments = environments.length > 0;

  return (
    <AdminPageStack>
      <PageHeader
        description="管理各环境的更新与重启任务，执行完成后系统会自动继续必要的检查流程。"
        kicker="运维中心"
        title="运维服务"
      />

      <StatStrip
        items={[
          { label: "已加载环境", value: environments.length },
          { label: "运行中任务", value: countRunningTasks(environments) },
          { label: "后端待更新提交", value: countPendingCommits(environments, "backend") },
          { label: "前端待更新提交", value: countPendingCommits(environments, "frontend") },
        ]}
      />

      {environmentsQuery.isError ? (
        <InlineNotice tone="danger" title="环境查询失败">
          {toUserFacingErrorMessage(environmentsQuery.error, "环境加载失败")}
        </InlineNotice>
      ) : null}

      {hasEnvironments ? (
        <div className="grid gap-6 xl:grid-cols-2">
          {environments.map((env) => {
            const running = Boolean(env.runningTask);
            return (
              <SectionCard
                description={`最近一次：${env.lastDeploy ? `${actionMeta[env.lastDeploy.type].label} · ${statusText[env.lastDeploy.status]} · ${formatDateTime(env.lastDeploy.finishedAt)}` : "尚未更新"}`}
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
                      <Button onClick={() => setSelectedTaskId(env.runningTask!.id)} size="sm" type="button" variant="outline">
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
                      description={`共 ${env.pendingCommits.backend.count} 条后端待更新提交`}
                      title="后端提交"
                    />
                    <CommitList
                      commits={env.pendingCommits.frontend.recent}
                      description={`共 ${env.pendingCommits.frontend.count} 条前端待更新提交`}
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
      ) : environmentsQuery.isLoading ? (
        <Card className="border-border/70 bg-card">
          <CardContent className="py-10 text-sm text-muted-foreground">正在加载运维环境...</CardContent>
        </Card>
      ) : (
        <EmptyBlock
          description="当前还没有接入可管理的环境，完成环境接入后这里会显示环境状态、待更新提交和执行入口。"
          title="当前未配置运维环境"
        />
      )}

      <DataTableSection title="最近任务">
        <MasterDetailLayout className="items-start xl:grid-cols-[minmax(0,1.12fr)_minmax(360px,0.88fr)]">
          <ListPane>
            <Card className="border-border/70 bg-card">
              <CardHeader className="gap-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="space-y-1">
                    <CardTitle className="text-base">任务摘要列表</CardTitle>
                    <CardDescription>左侧概览近期的运维任务状态。</CardDescription>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Badge tone="muted">共 {taskRows.length} 条</Badge>
                    <Badge tone="success">虚拟化开启</Badge>
                    <Badge tone="info">中小屏上下布局</Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="grid gap-4">
                {tasksQuery.isLoading ? (
                  <div className="py-4 text-sm text-muted-foreground">正在加载任务列表...</div>
                ) : tasksQuery.isError ? (
                  <EmptyBlock description={toUserFacingErrorMessage(tasksQuery.error, "任务列表加载失败")} title="任务列表不可用" />
                ) : (
                  <AppVirtualList
                    className="max-h-[36rem]"
                    contentClassName="grid"
                    empty={<EmptyBlock description="当前没有最近任务记录。" title="暂无任务" />}
                    estimatedItemSize={176}
                    getItemKey={(item) => item.id}
                    items={taskRows}
                    overscan={4}
                  >
                    {(item) => {
                      const selected = item.id === selectedTaskId;
                      const running = item.status === "queued" || item.status === "running";
                      return (
                        <div
                          className={[
                            "grid gap-4 border-b border-border/80 px-4 py-4 transition-colors",
                            selected ? "bg-primary/7" : "bg-card hover:bg-secondary/55",
                          ].join(" ")}
                          data-ops-task-id={item.id}
                        >
                          <button className="grid gap-3 text-left" onClick={() => setSelectedTaskId(item.id)} type="button">
                            <div className="flex flex-wrap items-start justify-between gap-3">
                              <div className="grid gap-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="text-base font-semibold text-foreground">{findEnvByKey(environments, item.env)?.name || item.env}</span>
                                  <Badge size="small" tone="muted">
                                    #{item.id}
                                  </Badge>
                                  <Badge size="small" tone="info">
                                    {actionMeta[item.type].label}
                                  </Badge>
                                </div>
                                <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs leading-6 text-muted-foreground">
                                  <span>{formatTaskProgress(item.step, item.totalSteps, item.stepName)}</span>
                                  <span>{formatDateTime(item.finishedAt || item.startedAt || item.createdAt)}</span>
                                </div>
                                <div className="line-clamp-2 text-xs leading-6 text-muted-foreground">
                                  {item.summary || item.errMsg || item.suggestion || item.stepName || "等待任务推进"}
                                </div>
                              </div>
                              <div className="flex items-start">
                                <StatusBadge status={statusText[item.status]} />
                              </div>
                            </div>
                            <div className="grid gap-3 md:grid-cols-2">
                              <div className="grid gap-1 text-sm text-muted-foreground">
                                <span className="font-medium text-foreground">时间线</span>
                                <span>创建于 {formatDateTime(item.createdAt)}</span>
                                <span>开始于 {formatDateTime(item.startedAt)}</span>
                              </div>
                              <div className="grid gap-1 text-sm text-muted-foreground">
                                <span className="font-medium text-foreground">异常建议</span>
                                <span>{item.suggestion || item.errMsg || "当前无异常提示"}</span>
                              </div>
                            </div>
                          </button>
                          <RowActions className="justify-end border-t border-border/70 pt-3">
                            <Button onClick={() => setSelectedTaskId(item.id)} size="sm" type="button" variant="outline">
                              查看日志
                            </Button>
                            {running ? (
                              <AsyncActionButton loading={cancelTaskMutation.isPending} onClick={() => void cancelTaskMutation.mutateAsync(item.id)} size="sm" type="button" variant="outline">
                                取消任务
                              </AsyncActionButton>
                            ) : null}
                          </RowActions>
                        </div>
                      );
                    }}
                  </AppVirtualList>
                )}
              </CardContent>
            </Card>
          </ListPane>

          <DetailPane>
            <Card className="border-border/70 bg-card">
              <CardHeader className="gap-3">
                {selectedTaskRow ? (
                  <>
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusBadge status={statusText[task?.status || selectedTaskRow.status]} />
                      <Badge tone="muted">{selectedTaskRow.env}</Badge>
                      <Badge tone="info">{actionMeta[selectedTaskRow.type].label}</Badge>
                    </div>
                    <div className="space-y-1">
                      <CardTitle>{findEnvByKey(environments, selectedTaskRow.env)?.name || selectedTaskRow.env}</CardTitle>
                      <CardDescription>查看选中任务的实时运行日志与配置变更。</CardDescription>
                    </div>
                  </>
                ) : (
                  <>
                    <CardTitle>任务详情</CardTitle>
                    <CardDescription>请选择一条任务记录查看详情。</CardDescription>
                  </>
                )}
              </CardHeader>
              <CardContent className="grid gap-4">
                {taskDetailQuery.isError ? (
                  <InlineNotice tone="danger" title="任务详情加载失败">
                    {toUserFacingErrorMessage(taskDetailQuery.error, "任务详情加载失败")}
                  </InlineNotice>
                ) : null}

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

                    <ProgressSteps items={buildStepStates(task, live).map((stepItem) => ({
                      label: `${stepItem.index}/${stepItem.total} ${stepItem.label}`,
                      meta: stepItem.state === "running" ? "当前执行步骤" : undefined,
                      state: stepItem.state,
                    }))} />

                    <LogViewer description={live?.stepName || task.stepName || "等待任务推进"} log={live?.log || task.log} title="实时日志" />

                    <div className="grid gap-4 lg:grid-cols-2">
                      <CommitList commits={task.commits.backend} title="后端提交" />
                      <CommitList commits={task.commits.frontend} title="前端提交" />
                    </div>
                  </div>
                ) : (
                  <EmptyBlock description="左侧选择一条任务后，这里会展示完整状态、日志和提交信息。" title="尚未选择任务" />
                )}
              </CardContent>
            </Card>
          </DetailPane>
        </MasterDetailLayout>
      </DataTableSection>

      <ConfirmActionDialog
        actionLabel="确认更新"
        description={confirmState ? `请先核对提交列表，再输入环境标识 ${confirmState.env.key} 完成确认。任务开始后，系统会继续执行对应检查。` : ""}
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
              <InlineNotice tone="danger">{toUserFacingErrorMessage(createTaskMutation.error, "任务创建失败")}</InlineNotice>
            ) : null}
          </div>
        ) : null}
      </ConfirmActionDialog>

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
  deploy_frontend: ["拉取代码", "安装依赖", "构建项目", "同步文件", "重载 Nginx"],
  deploy_all: ["拉取代码", "构建镜像", "重启服务", "健康检查", "拉取代码", "安装依赖", "构建项目", "同步文件", "重载 Nginx"],
  restart_backend: ["重启服务", "健康检查"],
};

function countRunningTasks(list?: OpsEnvironmentItem[]) {
  return (list || []).filter((item) => item.runningTask).length;
}

function countPendingCommits(list: OpsEnvironmentItem[] | undefined, target: "backend" | "frontend") {
  return (list || []).reduce((sum, item) => sum + item.pendingCommits[target].count, 0);
}

function formatTaskProgress(step?: number, totalSteps?: number, stepName?: string) {
  const currentStep = step || 0;
  const currentTotal = totalSteps || 0;
  if (!stepName) {
    return `步骤 ${currentStep}/${currentTotal}`;
  }
  return `步骤 ${currentStep}/${currentTotal} · ${stepName}`;
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
