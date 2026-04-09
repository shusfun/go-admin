import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { AdminPageStack, AdminThreeColumn, Button, DetailGrid, FormActions, FormField, PageHeader, SectionCard, Textarea, toast } from "@suiyuan/ui-admin";
import { createApiClient } from "@suiyuan/api";

export function SetConfigPage({ api }: { api: ReturnType<typeof createApiClient> }) {
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [feedback, setFeedback] = useState<string>("");
  const configQuery = useQuery({
    queryKey: ["admin-page", "set-config"],
    queryFn: () => api.admin.getSetConfig(),
  });
  const saveMutation = useMutation({
    mutationFn: (payload: Array<{ configKey: string; configValue: string }>) => api.admin.updateSetConfig(payload),
    onSuccess: async () => {
      setFeedback("系统设置已保存");
      toast.success("系统设置已保存");
      await queryClient.invalidateQueries({ queryKey: ["admin-page", "set-config"] });
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : "系统设置保存失败";
      setFeedback(message);
      toast.error(message);
    },
  });
  const changedEntries = useMemo(() => {
    const base = configQuery.data || {};
    return Object.entries(draft).filter(([key, value]) => base[key] !== value);
  }, [configQuery.data, draft]);

  useEffect(() => {
    if (configQuery.data) {
      setDraft(configQuery.data);
    }
  }, [configQuery.data]);

  return (
    <AdminPageStack>
      <PageHeader description="这一页对应旧后台 `set-config`，用键值卡片直接编辑当前系统设置。" kicker="Admin Module" title="参数设置" />
      <AdminThreeColumn>
        <SectionCard title="配置项" description="界面设置型参数先保留简洁编辑方式，不拆复杂表单。">
          <div className="grid gap-4">
            {Object.entries(draft).map(([key, value]) => (
              <FormField key={key} label={key}>
                <Textarea
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      [key]: event.target.value,
                    }))
                  }
                  value={value}
                />
              </FormField>
            ))}
          </div>
          <FormActions className="justify-start">
            <Button
              disabled={saveMutation.isPending || changedEntries.length === 0}
              onClick={() =>
                void saveMutation.mutateAsync(
                  Object.entries(draft).map(([configKey, configValue]) => ({
                    configKey,
                    configValue,
                  })),
                )
              }
              type="button"
            >
              {saveMutation.isPending ? "保存中..." : "保存设置"}
            </Button>
            <Button
              onClick={() => {
                setDraft(configQuery.data || {});
                setFeedback("");
              }}
              type="button"
              variant="outline"
            >
              恢复当前服务端值
            </Button>
          </FormActions>
          {feedback ? <p className="text-sm text-primary">{feedback}</p> : null}
        </SectionCard>
        <SectionCard title="联调状态" description="这里用于确认 set-config 接口已真正形成前后端闭环。">
          <DetailGrid
            items={[
              { label: "配置项总数", value: Object.keys(draft).length },
              { label: "待保存项", value: changedEntries.length },
              { label: "加载状态", value: configQuery.isLoading ? "加载中" : "已加载" },
              { label: "保存状态", value: saveMutation.isPending ? "保存中" : "空闲" },
            ]}
          />
          <div className="mt-4 space-y-2 text-sm leading-7 text-muted-foreground">
            <p>这一页聚合的是运行中的系统设置，不等同于参数管理列表页。</p>
            <p>只有存在改动时才允许提交，避免空保存掩盖真实联调结果。</p>
          </div>
        </SectionCard>
      </AdminThreeColumn>
    </AdminPageStack>
  );
}
