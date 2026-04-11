import { CrudDataPage } from "../components/crud-data-page";
import { createApiClient } from "@go-admin/api";
import type { SysApiRecord } from "@go-admin/types";

export function ApisPage({ api }: { api: ReturnType<typeof createApiClient> }) {
  return (
    <CrudDataPage<SysApiRecord>
      columns={[
        { label: "标题", render: (row) => row.title as string },
        { label: "路径", render: (row) => row.path as string },
        { label: "方法", render: (row) => row.action as string },
        { label: "处理器", render: (row) => row.handle as string },
        { label: "类型", render: (row) => (row.type as string) || "-" },
      ]}
      description="查看系统接口清单与访问方式。"
      fetcher={(params) => api.admin.listApis(params)}
      formFields={[
        { key: "title", label: "标题" },
        { key: "path", label: "路径" },
        { key: "action", label: "方法" },
        { key: "handle", label: "处理器" },
        { key: "type", label: "类型" },
      ]}
      getRowId={(item) => Number(item.id)}
      queryKey="apis"
      searchFields={[
        { key: "title", label: "标题", placeholder: "按标题过滤" },
        { key: "path", label: "路径", placeholder: "按路径过滤" },
        { key: "action", label: "方法", placeholder: "GET/POST/PUT" },
      ]}
      title="接口管理"
      updateItem={(payload) => api.admin.updateApi(payload as { id: number })}
    />
  );
}
