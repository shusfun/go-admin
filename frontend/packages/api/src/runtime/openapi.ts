import axios, {
  AxiosError,
  type AxiosInstance,
  type AxiosRequestConfig,
  type InternalAxiosRequestConfig,
} from "axios";

import { isSessionExpired, toAuthorizationToken } from "@suiyuan/auth";
import type { AppSession, ClientType, LoginResult } from "@suiyuan/types";

type SessionManager = {
  read: () => AppSession | null;
  write: (session: AppSession) => void;
  clear: () => void;
};

type ConfigureGeneratedApiClientOptions = {
  baseURL?: string;
  clientType?: ClientType;
  tenantCode?: string;
  sessionManager?: SessionManager;
  onUnauthorized?: () => void;
};

type MaybeEnvelope = {
  code?: number;
  data?: unknown;
  msg?: string;
};

type CancelablePromise<T> = Promise<T> & {
  cancel?: () => void;
};

const generatedApiInstance = axios.create({
  timeout: 10000,
});

let generatedApiOptions: ConfigureGeneratedApiClientOptions = {
  baseURL: "",
};
let requestInterceptorReady = false;

function getApiPrefix(clientType: ClientType) {
  return clientType === "admin" ? "/admin-api/v1" : "/app-api/v1";
}

function isEnvelopeBody(value: unknown): value is MaybeEnvelope {
  return Boolean(value) && typeof value === "object" && ("code" in (value as Record<string, unknown>) || "msg" in (value as Record<string, unknown>));
}

function applyHeaders(config: InternalAxiosRequestConfig) {
  const { clientType, tenantCode, sessionManager } = generatedApiOptions;
  const session = sessionManager?.read();

  if (clientType) {
    config.headers.set("X-Client-Type", clientType);
  }

  if (tenantCode) {
    config.headers.set("X-Tenant-Code", tenantCode);
  }

  if (session?.token) {
    config.headers.set("Authorization", toAuthorizationToken(session));
  }

  return config;
}

function handleUnauthorized() {
  generatedApiOptions.sessionManager?.clear();
  generatedApiOptions.onUnauthorized?.();
}

async function refreshSession(instance: AxiosInstance) {
  const { baseURL = "", clientType, sessionManager } = generatedApiOptions;
  const session = sessionManager?.read();

  if (!clientType || !sessionManager || !session) {
    throw new Error("未配置生成客户端登录态");
  }

  const response = await instance.get<LoginResult>(`${getApiPrefix(clientType)}/refresh_token`, {
    headers: {
      Authorization: toAuthorizationToken(session),
      "X-Client-Type": clientType,
      "X-Tenant-Code": generatedApiOptions.tenantCode || "",
    },
    baseURL,
  });

  if (!response.data?.token) {
    throw new Error("刷新登录态失败");
  }

  const nextSession: AppSession = {
    ...session,
    token: response.data.token,
    expireAt: response.data.expire,
  };

  sessionManager.write(nextSession);
  return nextSession;
}

async function requestWithRefresh<T>(
  config: AxiosRequestConfig,
  options?: AxiosRequestConfig,
  allowRefresh = true,
): Promise<T> {
  const session = generatedApiOptions.sessionManager?.read();

  try {
    const response = await generatedApiInstance.request<T>({
      ...config,
      ...options,
      headers: {
        ...(config.headers || {}),
        ...(options?.headers || {}),
      },
    });

    const body = response.data;
    if (
      allowRefresh &&
      session &&
      !String(config.url || "").includes("/refresh_token") &&
      isEnvelopeBody(body) &&
      body.code === 401
    ) {
      await refreshSession(axios.create({ timeout: 10000 }));
      return requestWithRefresh<T>(config, options, false);
    }

    return body;
  } catch (error) {
    if (
      allowRefresh &&
      session &&
      error instanceof AxiosError &&
      error.response?.status === 401 &&
      !String(config.url || "").includes("/refresh_token")
    ) {
      try {
        await refreshSession(axios.create({ timeout: 10000 }));
        return requestWithRefresh<T>(config, options, false);
      } catch (refreshError) {
        handleUnauthorized();
        throw refreshError;
      }
    }

    if (error instanceof AxiosError && error.response?.status === 401) {
      handleUnauthorized();
    }

    throw error;
  }
}

function ensureRequestInterceptor() {
  if (requestInterceptorReady) {
    return;
  }

  generatedApiInstance.interceptors.request.use(async (config) => {
    const session = generatedApiOptions.sessionManager?.read();

    if (session && isSessionExpired(session) && !String(config.url || "").includes("/refresh_token")) {
      try {
        await refreshSession(axios.create({ timeout: 10000 }));
      } catch {
        handleUnauthorized();
      }
    }

    return applyHeaders(config);
  });

  requestInterceptorReady = true;
}

export function configureGeneratedApiClient(options: ConfigureGeneratedApiClientOptions) {
  generatedApiOptions = {
    ...generatedApiOptions,
    ...options,
  };
  generatedApiInstance.defaults.baseURL = generatedApiOptions.baseURL || "";
  ensureRequestInterceptor();
}

export function resetGeneratedApiClient() {
  generatedApiOptions = {
    baseURL: "",
  };
  generatedApiInstance.defaults.baseURL = "";
}

export function customInstance<T>(config: AxiosRequestConfig, options?: AxiosRequestConfig): CancelablePromise<T> {
  ensureRequestInterceptor();

  const source = axios.CancelToken.source();
  const promise = requestWithRefresh<T>(
    {
      ...config,
      cancelToken: source.token,
    },
    options,
  ) as CancelablePromise<T>;

  promise.cancel = () => {
    source.cancel("OpenAPI 请求已取消");
  };

  return promise;
}
