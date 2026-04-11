import { Suspense, lazy, useState } from "react";

import { ApiError, createApiClient } from "@go-admin/api";
import { createSessionManager } from "@go-admin/auth";
import { deriveTenantCode } from "@go-admin/core";
import type { AppSession } from "@go-admin/types";

const tenant = deriveTenantCode(window.location.hostname, import.meta.env.VITE_TENANT_CODE || "local");
const sessionManager = createSessionManager("mobile-user");
const LoginPage = lazy(async () => ({ default: (await import("./pages/login-page")).LoginPage }));
const MobileWorkbench = lazy(async () => ({ default: (await import("./mobile-workbench")).MobileWorkbench }));

function useMobileApi(setAuthenticated: (value: boolean) => void) {
  return createApiClient({
    baseURL: import.meta.env.VITE_API_BASE_URL || "",
    clientType: "mobile-user",
    tenantCode: tenant.tenantCode,
    sessionManager,
    onUnauthorized: () => {
      sessionManager.clear();
      setAuthenticated(false);
    },
  });
}

function MobileLoadingFallback({
  description,
  title,
}: {
  description: string;
  title: string;
}) {
  return (
    <div className="mobile-auth">
      <section className="mobile-auth-card">
        <small>正在准备</small>
        <h1>{title}</h1>
        <p>{description}</p>
      </section>
    </div>
  );
}

export function App() {
  const [authenticated, setAuthenticated] = useState(Boolean(sessionManager.read()?.token));
  const api = useMobileApi(setAuthenticated);

  async function handleLogin(payload: { username: string; password: string; code?: string; uuid?: string }) {
    const result = await api.auth.login(payload);
    const nextSession: AppSession = {
      token: result.token,
      expireAt: result.expire,
      tenantCode: tenant.tenantCode,
      clientType: "mobile-user",
    };
    sessionManager.write(nextSession);
    setAuthenticated(true);
  }

  async function handleLogout() {
    try {
      await api.auth.logout();
    } finally {
      sessionManager.clear();
      setAuthenticated(false);
    }
  }

  if (!authenticated) {
    return (
      <Suspense fallback={<MobileLoadingFallback description="正在加载登录表单与验证码能力。" title="正在进入移动端" />}>
        <LoginPage
          getCaptcha={async () => {
            const captcha = await api.auth.getCaptcha();
            return {
              image: captcha.data,
              uuid: captcha.id,
            };
          }}
          onSubmit={async (values) => {
            try {
              await handleLogin(values);
            } catch (error) {
              if (error instanceof ApiError) {
                throw error;
              }
              throw new Error("移动端登录失败");
            }
          }}
          tenantCode={tenant.tenantCode}
        />
      </Suspense>
    );
  }

  return (
    <Suspense fallback={<MobileLoadingFallback description="正在加载工作台与页面导航。" title="正在打开工作台" />}>
      <MobileWorkbench api={api} onLogout={handleLogout} tenantCode={tenant.tenantCode} />
    </Suspense>
  );
}
