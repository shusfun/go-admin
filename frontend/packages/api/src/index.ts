import axios, { AxiosError, type AxiosInstance, type AxiosResponse, type InternalAxiosRequestConfig } from "axios";
import { fetchEventSource } from "@microsoft/fetch-event-source";

import { isSessionExpired, toAuthorizationToken } from "@suiyuan/auth";
import type {
  ApiEnvelope,
  AppSession,
  CaptchaResponse,
  ClientType,
  CreateOpsTaskPayload,
  DeletePayload,
  InfoResponse,
  LoginPayload,
  LoginResult,
  OpsDoneEvent,
  OpsEnvironmentItem,
  OpsErrorEvent,
  OpsLogEvent,
  OpsStatusEvent,
  OpsTaskCancelResult,
  OpsTaskDetail,
  OpsTaskIdResult,
  OpsTaskListItem,
  PagePayload,
  ProfileResponse,
  QueryPayload,
  RoleDeptTreeResponse,
  RoleMenuTreeResponse,
  RawMenuItem,
  ServerMonitorInfo,
  SysApiRecord,
  SysConfigRecord,
  SysDeptRecord,
  SysDictDataRecord,
  SysDictTypeRecord,
  SysJobRecord,
  SysJobLogRecord,
  SysLoginLogRecord,
  SysMenuRecord,
  SysOperaLogRecord,
  SysPostRecord,
  SysRoleRecord,
  SysUserRecord,
} from "@suiyuan/types";

export class ApiError extends Error {
  code: number;

  constructor(message: string, code = 500) {
    super(message);
    this.name = "ApiError";
    this.code = code;
  }
}

type SessionManager = {
  read: () => AppSession | null;
  write: (session: AppSession) => void;
  clear: () => void;
};

type ClientOptions = {
  baseURL: string;
  clientType: ClientType;
  tenantCode: string;
  sessionManager: SessionManager;
  onUnauthorized?: () => void;
};

type StreamTaskOptions = {
  lastLogOffset?: number;
  onStatus?: (payload: OpsStatusEvent) => void;
  onLog?: (payload: OpsLogEvent) => void;
  onDone?: (payload: OpsDoneEvent) => void;
  onError?: (payload: OpsErrorEvent) => void;
  onTransportError?: (error: Error) => void;
};

type PlainBody = {
  code: number;
  msg?: string;
};

function getApiPrefix(clientType: ClientType) {
  return clientType === "admin" ? "/admin-api/v1" : "/app-api/v1";
}

async function refreshSession(instance: AxiosInstance, options: ClientOptions) {
  const session = options.sessionManager.read();
  if (!session) {
    throw new ApiError("登录状态不存在", 401);
  }

  const response = await instance.get<LoginResult>(`${getApiPrefix(options.clientType)}/refresh_token`, {
    headers: {
      Authorization: toAuthorizationToken(session),
      "X-Client-Type": options.clientType,
      "X-Tenant-Code": options.tenantCode,
    },
  });

  if (!response.data?.token) {
    throw new ApiError("刷新登录态失败", 401);
  }

  const nextSession: AppSession = {
    ...session,
    token: response.data.token,
    expireAt: response.data.expire,
  };

  options.sessionManager.write(nextSession);
  return nextSession;
}

function applyHeaders(config: InternalAxiosRequestConfig, options: ClientOptions) {
  const session = options.sessionManager.read();
  config.headers.set("X-Client-Type", options.clientType);
  config.headers.set("X-Tenant-Code", options.tenantCode);

  if (session?.token) {
    config.headers.set("Authorization", toAuthorizationToken(session));
  }

  return config;
}

async function unwrapPlain<T extends PlainBody>(
  request: () => Promise<AxiosResponse<T>>,
  options: ClientOptions,
  allowRefresh = true,
): Promise<T> {
  try {
    const response = await request();
    const body = response.data;

    if (body.code === 401 && allowRefresh) {
      await refreshSession(axios.create({ baseURL: options.baseURL }), options);
      return unwrapPlain(request, options, false);
    }

    if (body.code !== 200) {
      throw new ApiError(body.msg || "请求失败", body.code);
    }

    return body;
  } catch (error) {
    if (error instanceof AxiosError && error.response?.status === 401) {
      options.sessionManager.clear();
      options.onUnauthorized?.();
    }

    throw error;
  }
}

async function unwrapEnvelope<T>(
  request: () => Promise<AxiosResponse<ApiEnvelope<T>>>,
  options: ClientOptions,
  allowRefresh = true,
): Promise<T> {
  try {
    const response = await request();
    const body = response.data;

    if (body.code === 401 && allowRefresh) {
      await refreshSession(axios.create({ baseURL: options.baseURL }), options);
      return unwrapEnvelope(request, options, false);
    }

    if (body.code !== 200) {
      throw new ApiError(body.msg || "请求失败", body.code);
    }

    return body.data;
  } catch (error) {
    if (error instanceof AxiosError && error.response?.status === 401) {
      options.sessionManager.clear();
      options.onUnauthorized?.();
    }

    throw error;
  }
}

function buildURL(baseURL: string, path: string, params?: Record<string, string | number | undefined>) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params || {})) {
    if (value === undefined || value === null || value === "") {
      continue;
    }
    query.set(key, String(value));
  }
  const suffix = query.toString();
  const nextPath = suffix ? `${path}?${suffix}` : path;
  if (!baseURL) {
    return nextPath;
  }
  return new URL(nextPath, baseURL).toString();
}

export function createApiClient(options: ClientOptions) {
  const apiPrefix = getApiPrefix(options.clientType);
  const adminPrefix = "/admin-api/v1";
  const instance = axios.create({
    baseURL: options.baseURL,
    timeout: 10000,
  });

  instance.interceptors.request.use(async (config) => {
    const session = options.sessionManager.read();
    if (session && isSessionExpired(session) && !config.url?.includes("/refresh_token")) {
      try {
        await refreshSession(instance, options);
      } catch {
        options.sessionManager.clear();
        options.onUnauthorized?.();
      }
    }

    return applyHeaders(config, options);
  });

  return {
    auth: {
      async login(payload: LoginPayload) {
        return unwrapPlain<LoginResult>(() => instance.post<LoginResult>(`${apiPrefix}/login`, payload), options);
      },
      async logout() {
        return unwrapEnvelope<null>(() => instance.post<ApiEnvelope<null>>(`${apiPrefix}/logout`), options);
      },
      async getCaptcha() {
        return unwrapPlain<CaptchaResponse>(() => instance.get<CaptchaResponse>(`${apiPrefix}/captcha`), options);
      },
    },
    system: {
      async getInfo() {
        return unwrapEnvelope<InfoResponse>(() => instance.get<ApiEnvelope<InfoResponse>>(`${apiPrefix}/getinfo`), options);
      },
      async getProfile() {
        return unwrapEnvelope<ProfileResponse>(() => instance.get<ApiEnvelope<ProfileResponse>>(`${apiPrefix}/user/profile`), options);
      },
      async getMenuRole() {
        return unwrapEnvelope<RawMenuItem[]>(() => instance.get<ApiEnvelope<RawMenuItem[]>>(`${apiPrefix}/menurole`), options);
      },
    },
    admin: {
      async listUsers(params: QueryPayload) {
        return unwrapEnvelope<PagePayload<SysUserRecord>>(
          () => instance.get<ApiEnvelope<PagePayload<SysUserRecord>>>(`${adminPrefix}/sys-user`, { params }),
          options,
        );
      },
      async createUser(payload: Partial<SysUserRecord> & { password?: string }) {
        return unwrapEnvelope<number>(() => instance.post<ApiEnvelope<number>>(`${adminPrefix}/sys-user`, payload), options);
      },
      async updateUser(payload: Partial<SysUserRecord> & { userId: number }) {
        return unwrapEnvelope<number>(() => instance.put<ApiEnvelope<number>>(`${adminPrefix}/sys-user`, payload), options);
      },
      async deleteUsers(payload: DeletePayload) {
        return unwrapEnvelope<number>(() => instance.delete<ApiEnvelope<number>>(`${adminPrefix}/sys-user`, { data: payload }), options);
      },
      async resetUserPassword(userId: number, password: string) {
        return unwrapEnvelope<null>(() => instance.put<ApiEnvelope<null>>(`${adminPrefix}/user/pwd/reset`, { userId, password }), options);
      },
      async updateUserStatus(userId: number, status: string) {
        return unwrapEnvelope<null>(() => instance.put<ApiEnvelope<null>>(`${adminPrefix}/user/status`, { userId, status }), options);
      },
      async listRoles(params: QueryPayload) {
        return unwrapEnvelope<PagePayload<SysRoleRecord>>(
          () => instance.get<ApiEnvelope<PagePayload<SysRoleRecord>>>(`${adminPrefix}/role`, { params }),
          options,
        );
      },
      async getRole(roleId: number) {
        return unwrapEnvelope<SysRoleRecord>(() => instance.get<ApiEnvelope<SysRoleRecord>>(`${adminPrefix}/role/${roleId}`), options);
      },
      async createRole(payload: Partial<SysRoleRecord>) {
        return unwrapEnvelope<number>(() => instance.post<ApiEnvelope<number>>(`${adminPrefix}/role`, payload), options);
      },
      async updateRole(payload: Partial<SysRoleRecord> & { roleId: number }) {
        return unwrapEnvelope<number>(() => instance.put<ApiEnvelope<number>>(`${adminPrefix}/role/${payload.roleId}`, payload), options);
      },
      async deleteRoles(payload: DeletePayload) {
        return unwrapEnvelope<number>(() => instance.delete<ApiEnvelope<number>>(`${adminPrefix}/role`, { data: payload }), options);
      },
      async updateRoleStatus(roleId: number, status: string) {
        return unwrapEnvelope<null>(() => instance.put<ApiEnvelope<null>>(`${adminPrefix}/role-status`, { roleId, status }), options);
      },
      async updateRoleDataScope(payload: { roleId: number; dataScope: string; deptIds: number[] }) {
        return unwrapEnvelope<null>(() => instance.put<ApiEnvelope<null>>(`${adminPrefix}/roledatascope`, payload), options);
      },
      async getRoleMenuTree(roleId: number) {
        return unwrapEnvelope<RoleMenuTreeResponse>(
          () => instance.get<ApiEnvelope<RoleMenuTreeResponse>>(`${adminPrefix}/roleMenuTreeselect/${roleId}`),
          options,
        );
      },
      async getRoleDeptTree(roleId: number) {
        return unwrapEnvelope<RoleDeptTreeResponse>(
          () => instance.get<ApiEnvelope<RoleDeptTreeResponse>>(`${adminPrefix}/roleDeptTreeselect/${roleId}`),
          options,
        );
      },
      async listPosts(params: QueryPayload) {
        return unwrapEnvelope<PagePayload<SysPostRecord>>(
          () => instance.get<ApiEnvelope<PagePayload<SysPostRecord>>>(`${adminPrefix}/post`, { params }),
          options,
        );
      },
      async createPost(payload: Partial<SysPostRecord>) {
        return unwrapEnvelope<number>(() => instance.post<ApiEnvelope<number>>(`${adminPrefix}/post`, payload), options);
      },
      async updatePost(payload: Partial<SysPostRecord> & { postId: number }) {
        return unwrapEnvelope<number>(() => instance.put<ApiEnvelope<number>>(`${adminPrefix}/post/${payload.postId}`, payload), options);
      },
      async deletePosts(payload: DeletePayload) {
        return unwrapEnvelope<number>(() => instance.delete<ApiEnvelope<number>>(`${adminPrefix}/post`, { data: payload }), options);
      },
      async listMenus(params: QueryPayload) {
        return unwrapEnvelope<SysMenuRecord[]>(
          () => instance.get<ApiEnvelope<SysMenuRecord[]>>(`${adminPrefix}/menu`, { params }),
          options,
        );
      },
      async getMenu(menuId: number) {
        return unwrapEnvelope<SysMenuRecord>(() => instance.get<ApiEnvelope<SysMenuRecord>>(`${adminPrefix}/menu/${menuId}`), options);
      },
      async createMenu(payload: Partial<SysMenuRecord> & { apis?: number[] }) {
        return unwrapEnvelope<number>(() => instance.post<ApiEnvelope<number>>(`${adminPrefix}/menu`, payload), options);
      },
      async updateMenu(payload: Partial<SysMenuRecord> & { menuId: number; apis?: number[] }) {
        return unwrapEnvelope<number>(() => instance.put<ApiEnvelope<number>>(`${adminPrefix}/menu/${payload.menuId}`, payload), options);
      },
      async deleteMenus(payload: DeletePayload) {
        return unwrapEnvelope<number>(() => instance.delete<ApiEnvelope<number>>(`${adminPrefix}/menu`, { data: payload }), options);
      },
      async listDepts(params: QueryPayload) {
        return unwrapEnvelope<SysDeptRecord[]>(() => instance.get<ApiEnvelope<SysDeptRecord[]>>(`${adminPrefix}/dept`, { params }), options);
      },
      async getDept(deptId: number) {
        return unwrapEnvelope<SysDeptRecord>(() => instance.get<ApiEnvelope<SysDeptRecord>>(`${adminPrefix}/dept/${deptId}`), options);
      },
      async createDept(payload: Partial<SysDeptRecord>) {
        return unwrapEnvelope<number>(() => instance.post<ApiEnvelope<number>>(`${adminPrefix}/dept`, payload), options);
      },
      async updateDept(payload: Partial<SysDeptRecord> & { deptId: number }) {
        return unwrapEnvelope<number>(() => instance.put<ApiEnvelope<number>>(`${adminPrefix}/dept/${payload.deptId}`, payload), options);
      },
      async deleteDepts(payload: DeletePayload) {
        return unwrapEnvelope<number>(() => instance.delete<ApiEnvelope<number>>(`${adminPrefix}/dept`, { data: payload }), options);
      },
      async getDeptTree() {
        return unwrapEnvelope<SysDeptRecord[]>(() => instance.get<ApiEnvelope<SysDeptRecord[]>>(`${adminPrefix}/deptTree`), options);
      },
      async listDictTypes(params: QueryPayload) {
        return unwrapEnvelope<PagePayload<SysDictTypeRecord>>(
          () => instance.get<ApiEnvelope<PagePayload<SysDictTypeRecord>>>(`${adminPrefix}/dict/type`, { params }),
          options,
        );
      },
      async createDictType(payload: Partial<SysDictTypeRecord>) {
        return unwrapEnvelope<number>(() => instance.post<ApiEnvelope<number>>(`${adminPrefix}/dict/type`, payload), options);
      },
      async updateDictType(payload: Partial<SysDictTypeRecord> & { id: number }) {
        return unwrapEnvelope<number>(() => instance.put<ApiEnvelope<number>>(`${adminPrefix}/dict/type/${payload.id}`, payload), options);
      },
      async deleteDictTypes(payload: DeletePayload) {
        return unwrapEnvelope<number>(() => instance.delete<ApiEnvelope<number>>(`${adminPrefix}/dict/type`, { data: payload }), options);
      },
      async listDictData(params: QueryPayload) {
        return unwrapEnvelope<PagePayload<SysDictDataRecord>>(
          () => instance.get<ApiEnvelope<PagePayload<SysDictDataRecord>>>(`${adminPrefix}/dict/data`, { params }),
          options,
        );
      },
      async createDictData(payload: Partial<SysDictDataRecord>) {
        return unwrapEnvelope<number>(() => instance.post<ApiEnvelope<number>>(`${adminPrefix}/dict/data`, payload), options);
      },
      async updateDictData(payload: Partial<SysDictDataRecord> & { dictCode: number }) {
        return unwrapEnvelope<number>(() => instance.put<ApiEnvelope<number>>(`${adminPrefix}/dict/data/${payload.dictCode}`, payload), options);
      },
      async deleteDictData(payload: DeletePayload) {
        return unwrapEnvelope<number>(() => instance.delete<ApiEnvelope<number>>(`${adminPrefix}/dict/data`, { data: payload }), options);
      },
      async listConfigs(params: QueryPayload) {
        return unwrapEnvelope<PagePayload<SysConfigRecord>>(
          () => instance.get<ApiEnvelope<PagePayload<SysConfigRecord>>>(`${adminPrefix}/config`, { params }),
          options,
        );
      },
      async createConfig(payload: Partial<SysConfigRecord>) {
        return unwrapEnvelope<number>(() => instance.post<ApiEnvelope<number>>(`${adminPrefix}/config`, payload), options);
      },
      async updateConfig(payload: Partial<SysConfigRecord> & { id: number }) {
        return unwrapEnvelope<number>(() => instance.put<ApiEnvelope<number>>(`${adminPrefix}/config/${payload.id}`, payload), options);
      },
      async deleteConfigs(payload: DeletePayload) {
        return unwrapEnvelope<number>(() => instance.delete<ApiEnvelope<number>>(`${adminPrefix}/config`, { data: payload }), options);
      },
      async getSetConfig() {
        return unwrapEnvelope<Record<string, string>>(() => instance.get<ApiEnvelope<Record<string, string>>>(`${adminPrefix}/set-config`), options);
      },
      async updateSetConfig(payload: Array<{ configKey: string; configValue: string }>) {
        return unwrapEnvelope<null>(() => instance.put<ApiEnvelope<null>>(`${adminPrefix}/set-config`, payload), options);
      },
      async listApis(params: QueryPayload) {
        return unwrapEnvelope<PagePayload<SysApiRecord>>(
          () => instance.get<ApiEnvelope<PagePayload<SysApiRecord>>>(`${adminPrefix}/sys-api`, { params }),
          options,
        );
      },
      async updateApi(payload: Partial<SysApiRecord> & { id: number }) {
        return unwrapEnvelope<number>(() => instance.put<ApiEnvelope<number>>(`${adminPrefix}/sys-api/${payload.id}`, payload), options);
      },
      async listLoginLogs(params: QueryPayload) {
        return unwrapEnvelope<PagePayload<SysLoginLogRecord>>(
          () => instance.get<ApiEnvelope<PagePayload<SysLoginLogRecord>>>(`${adminPrefix}/sys-login-log`, { params }),
          options,
        );
      },
      async getLoginLog(id: number) {
        return unwrapEnvelope<SysLoginLogRecord>(
          () => instance.get<ApiEnvelope<SysLoginLogRecord>>(`${adminPrefix}/sys-login-log/${id}`),
          options,
        );
      },
      async deleteLoginLogs(payload: DeletePayload) {
        return unwrapEnvelope<number>(() => instance.delete<ApiEnvelope<number>>(`${adminPrefix}/sys-login-log`, { data: payload }), options);
      },
      async listOperaLogs(params: QueryPayload) {
        return unwrapEnvelope<PagePayload<SysOperaLogRecord>>(
          () => instance.get<ApiEnvelope<PagePayload<SysOperaLogRecord>>>(`${adminPrefix}/sys-opera-log`, { params }),
          options,
        );
      },
      async getOperaLog(id: number) {
        return unwrapEnvelope<SysOperaLogRecord>(
          () => instance.get<ApiEnvelope<SysOperaLogRecord>>(`${adminPrefix}/sys-opera-log/${id}`),
          options,
        );
      },
      async deleteOperaLogs(payload: DeletePayload) {
        return unwrapEnvelope<number>(() => instance.delete<ApiEnvelope<number>>(`${adminPrefix}/sys-opera-log`, { data: payload }), options);
      },
      async getServerMonitor() {
        return unwrapEnvelope<ServerMonitorInfo>(() => instance.get<ApiEnvelope<ServerMonitorInfo>>(`${adminPrefix}/server-monitor`), options);
      },
    },
    jobs: {
      async listJobs(params: QueryPayload) {
        return unwrapEnvelope<PagePayload<SysJobRecord>>(
          () => instance.get<ApiEnvelope<PagePayload<SysJobRecord>>>(`${adminPrefix}/sysjob`, { params }),
          options,
        );
      },
      async createJob(payload: Partial<SysJobRecord>) {
        return unwrapEnvelope<number>(() => instance.post<ApiEnvelope<number>>(`${adminPrefix}/sysjob`, payload), options);
      },
      async updateJob(payload: Partial<SysJobRecord> & { jobId: number }) {
        return unwrapEnvelope<number>(() => instance.put<ApiEnvelope<number>>(`${adminPrefix}/sysjob`, payload), options);
      },
      async deleteJobs(payload: DeletePayload) {
        return unwrapEnvelope<number>(() => instance.delete<ApiEnvelope<number>>(`${adminPrefix}/sysjob`, { data: payload }), options);
      },
      async startJob(jobId: number) {
        return unwrapEnvelope<null>(() => instance.get<ApiEnvelope<null>>(`${adminPrefix}/job/start/${jobId}`), options);
      },
      async removeJob(jobId: number) {
        return unwrapEnvelope<null>(() => instance.get<ApiEnvelope<null>>(`${adminPrefix}/job/remove/${jobId}`), options);
      },
      async listJobLogs(params: QueryPayload) {
        return unwrapEnvelope<PagePayload<SysJobLogRecord>>(
          () => instance.get<ApiEnvelope<PagePayload<SysJobLogRecord>>>(`${adminPrefix}/sysjob-log`, { params }),
          options,
        );
      },
      async getJobLog(id: number) {
        return unwrapEnvelope<SysJobLogRecord>(() => instance.get<ApiEnvelope<SysJobLogRecord>>(`${adminPrefix}/sysjob-log/${id}`), options);
      },
    },
    ops: {
      async getEnvironments() {
        return unwrapEnvelope<OpsEnvironmentItem[]>(
          () => instance.get<ApiEnvelope<OpsEnvironmentItem[]>>(`${adminPrefix}/ops/environments`),
          options,
        );
      },
      async createTask(payload: CreateOpsTaskPayload) {
        return unwrapEnvelope<OpsTaskIdResult>(
          () => instance.post<ApiEnvelope<OpsTaskIdResult>>(`${adminPrefix}/ops/tasks`, payload),
          options,
        );
      },
      async getTasks(params: { env?: string; type?: string; status?: string; pageIndex?: number; pageSize?: number }) {
        return unwrapEnvelope<PagePayload<OpsTaskListItem>>(
          () => instance.get<ApiEnvelope<PagePayload<OpsTaskListItem>>>(`${adminPrefix}/ops/tasks`, { params }),
          options,
        );
      },
      async getTask(id: number) {
        return unwrapEnvelope<OpsTaskDetail>(() => instance.get<ApiEnvelope<OpsTaskDetail>>(`${adminPrefix}/ops/tasks/${id}`), options);
      },
      async cancelTask(id: number) {
        return unwrapEnvelope<OpsTaskCancelResult>(
          () => instance.post<ApiEnvelope<OpsTaskCancelResult>>(`${adminPrefix}/ops/tasks/${id}/cancel`),
          options,
        );
      },
      connectTaskStream(taskId: number, streamOptions: StreamTaskOptions) {
        const controller = new AbortController();
        const session = options.sessionManager.read();
        const headers: Record<string, string> = {
          "X-Client-Type": options.clientType,
          "X-Tenant-Code": options.tenantCode,
        };
        if (session?.token) {
          headers.Authorization = toAuthorizationToken(session);
        }
        const url = buildURL(options.baseURL, `${adminPrefix}/ops/tasks/${taskId}/stream`, {
          lastLogOffset: streamOptions.lastLogOffset,
        });
        void fetchEventSource(url, {
          headers,
          signal: controller.signal,
          async onopen(response) {
            if (response.ok) {
              return;
            }
            if (response.status === 401) {
              options.sessionManager.clear();
              options.onUnauthorized?.();
            }
            throw new ApiError("连接任务流失败", response.status || 500);
          },
          onmessage(event) {
            if (!event.data) {
              return;
            }
            const payload = JSON.parse(event.data);
            if (event.event === "status") {
              streamOptions.onStatus?.(payload as OpsStatusEvent);
            }
            if (event.event === "log") {
              streamOptions.onLog?.(payload as OpsLogEvent);
            }
            if (event.event === "done") {
              streamOptions.onDone?.(payload as OpsDoneEvent);
              controller.abort();
            }
            if (event.event === "error") {
              streamOptions.onError?.(payload as OpsErrorEvent);
              controller.abort();
            }
          },
        }).catch((error: unknown) => {
          if (controller.signal.aborted) {
            return;
          }
          streamOptions.onTransportError?.(error instanceof Error ? error : new Error("任务流连接失败"));
        });
        return () => controller.abort();
      },
    },
  };
}

// ─── Setup Wizard API（不需要认证） ───

type SetupStatus = {
  needs_setup: boolean;
  step: string;
};

type TestDBPayload = {
  host: string;
  port: number;
  user: string;
  password: string;
  dbname: string;
  sslmode: string;
};

type TestRedisPayload = {
  host: string;
  port: number;
  password: string;
  db: number;
};

type InstallPayload = {
  database: TestDBPayload;
  redis: TestRedisPayload;
  admin: {
    username: string;
    password: string;
    email: string;
    phone: string;
  };
};

export function createSetupApi(baseURL: string) {
  const instance = axios.create({
    baseURL,
    timeout: 30000,
  });

  async function unwrap<T>(request: () => Promise<AxiosResponse<ApiEnvelope<T>>>): Promise<T> {
    const response = await request();
    const body = response.data;
    if (body.code !== 200) {
      throw new ApiError(body.msg || "请求失败", body.code);
    }
    return body.data;
  }

  return {
    async getStatus() {
      return unwrap<SetupStatus>(() => instance.get<ApiEnvelope<SetupStatus>>("/api/v1/setup/status"));
    },
    async testDatabase(payload: TestDBPayload) {
      return unwrap<{ message: string }>(() =>
        instance.post<ApiEnvelope<{ message: string }>>("/api/v1/setup/test-db", payload),
      );
    },
    async testRedis(payload: TestRedisPayload) {
      return unwrap<{ message: string }>(() =>
        instance.post<ApiEnvelope<{ message: string }>>("/api/v1/setup/test-redis", payload),
      );
    },
    async install(payload: InstallPayload) {
      return unwrap<{ message: string; restart: boolean }>(() =>
        instance.post<ApiEnvelope<{ message: string; restart: boolean }>>("/api/v1/setup/install", payload),
      );
    },
  };
}

export type SetupApi = ReturnType<typeof createSetupApi>;
