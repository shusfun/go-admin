import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { AdminPageStack, AdminThreeColumn, Button, DetailGrid, FormActions, FormField, PageHeader, SectionCard, Textarea, toast } from "@go-admin/ui-admin";
import { createApiClient, toUserFacingErrorMessage } from "@go-admin/api";

type ConfigMeta = {
  description: string;
  label: string;
  rows?: number;
  valueLabels?: Record<string, string>;
};

const CONFIG_META: Record<string, ConfigMeta> = {
  sys_app_logo: {
    description: "配置系统品牌图标地址，前后台公共品牌位会优先读取这里。",
    label: "系统 Logo",
    rows: 3,
  },
  sys_app_name: {
    description: "配置系统名称，用于页面标题、品牌区和前台公共展示。",
    label: "系统名称",
  },
  sys_index_sideTheme: {
    description: "配置后台侧栏主题风格。",
    label: "侧栏主题",
    valueLabels: {
      "theme-dark": "深色主题",
      "theme-light": "浅色主题",
    },
  },
  sys_index_skinName: {
    description: "配置后台默认皮肤色。",
    label: "皮肤样式",
    valueLabels: {
      "skin-blue": "蓝色皮肤",
      "skin-green": "绿色皮肤",
      "skin-purple": "紫色皮肤",
      "skin-red": "红色皮肤",
      "skin-yellow": "黄色皮肤",
    },
  },
  sys_user_initPassword: {
    description: "新建账号时使用的默认初始密码，请按安全要求定期调整。",
    label: "初始密码",
  },
};

const CONFIG_ORDER = ["sys_app_logo", "sys_app_name", "sys_index_sideTheme", "sys_index_skinName", "sys_user_initPassword"];

function getConfigMeta(key: string): ConfigMeta {
  return CONFIG_META[key] || {
    description: "未配置专用说明，保存时将按原始配置键提交。",
    label: key,
  };
}

function getConfigDescription(key: string, value: string) {
  const meta = getConfigMeta(key);
  const segments = [meta.description, `配置键：${key}`];
  const mappedValue = meta.valueLabels?.[value];

  if (mappedValue) {
    segments.push(`当前值含义：${mappedValue}（${value}）`);
  }

  return segments.join(" ");
}

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
      const message = toUserFacingErrorMessage(error, "系统设置保存失败");
      setFeedback(message);
      toast.error(message);
    },
  });
  const changedEntries = useMemo(() => {
    const base = configQuery.data || {};
    return Object.entries(draft).filter(([key, value]) => base[key] !== value);
  }, [configQuery.data, draft]);
  const orderedEntries = useMemo(() => {
    const orderMap = new Map(CONFIG_ORDER.map((key, index) => [key, index]));

    return Object.entries(draft).sort(([leftKey], [rightKey]) => {
      const leftOrder = orderMap.get(leftKey);
      const rightOrder = orderMap.get(rightKey);

      if (leftOrder !== undefined && rightOrder !== undefined) {
        return leftOrder - rightOrder;
      }

      if (leftOrder !== undefined) {
        return -1;
      }

      if (rightOrder !== undefined) {
        return 1;
      }

      return leftKey.localeCompare(rightKey, "zh-CN");
    });
  }, [draft]);

  useEffect(() => {
    if (configQuery.data) {
      setDraft(configQuery.data);
    }
  }, [configQuery.data]);

  return (
    <AdminPageStack>
      <PageHeader description="管理系统当前运行中的参数配置。" kicker="管理台" title="参数设置" />
      <AdminThreeColumn>
        <SectionCard title="配置项" description="在这里调整系统正在使用的配置内容。">
          <div className="grid gap-4">
            {orderedEntries.map(([key, value]) => {
              const meta = getConfigMeta(key);

              return (
              <FormField key={key} description={getConfigDescription(key, value)} label={meta.label}>
                <Textarea
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      [key]: event.target.value,
                    }))
                  }
                  rows={meta.rows ?? 2}
                  value={value}
                />
              </FormField>
              );
            })}
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
              恢复当前配置
            </Button>
          </FormActions>
          {feedback ? <p className="text-sm text-primary">{feedback}</p> : null}
        </SectionCard>
        <SectionCard title="配置状态" description="当前配置加载与保存状态。">
          <DetailGrid
            items={[
              { label: "配置项总数", value: Object.keys(draft).length },
              { label: "待保存项", value: changedEntries.length },
              { label: "加载状态", value: configQuery.isLoading ? "加载中" : "已加载" },
              { label: "保存状态", value: saveMutation.isPending ? "保存中" : "空闲" },
            ]}
          />
        </SectionCard>
      </AdminThreeColumn>
    </AdminPageStack>
  );
}
