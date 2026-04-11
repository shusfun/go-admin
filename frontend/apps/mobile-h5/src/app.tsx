import { useState } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";

import { ApiError, createApiClient } from "@go-admin/api";
import { createSessionManager } from "@go-admin/auth";
import { deriveTenantCode } from "@go-admin/core";
import { BottomTabBar, MobileShell, SurfaceCard } from "@go-admin/ui-mobile";
import type { AppSession } from "@go-admin/types";

import { HomePage } from "./pages/home-page";
import { LoginPage } from "./pages/login-page";
import { ProfilePage } from "./pages/profile-page";
import { StatusPage } from "./pages/status-page";

const tenant = deriveTenantCode(window.location.hostname, import.meta.env.VITE_TENANT_CODE || "local");
const sessionManager = createSessionManager("mobile-user");

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

function MobileWorkbench({
  api,
  onLogout,
}: {
  api: ReturnType<typeof createApiClient>;
  onLogout: () => Promise<void>;
}) {
  const infoQuery = useQuery({
    queryKey: ["mobile", "info"],
    queryFn: () => api.system.getInfo(),
  });
  const profileQuery = useQuery({
    queryKey: ["mobile", "profile"],
    queryFn: () => api.system.getProfile(),
  });

  if (infoQuery.isLoading || profileQuery.isLoading || !infoQuery.data || !profileQuery.data) {
    return (
      <div className="mobile-auth">
        <section className="mobile-auth-card">
          <small>正在准备</small>
          <h1>正在进入移动端</h1>
          <p>系统正在同步用户资料和移动端上下文。</p>
        </section>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <MobileShell>
        <Routes>
          <Route element={<HomePage info={infoQuery.data} profile={profileQuery.data} tenantCode={tenant.tenantCode} />} path="/" />
          <Route element={<StatusPage />} path="/status" />
          <Route element={<ProfilePage info={infoQuery.data} profile={profileQuery.data} />} path="/profile" />
        </Routes>
        <SurfaceCard description="移动端与后台可分别更新，互不影响日常使用。" title="当前环境">
          <div className="mobile-inline">
            <span>租户 {tenant.tenantCode}</span>
            <button className="mobile-link-button" onClick={() => void onLogout()} type="button">
              退出
            </button>
          </div>
        </SurfaceCard>
      </MobileShell>
      <BottomTabBar
        tabs={[
          { label: "首页", to: "/" },
          { label: "状态", to: "/status" },
          { label: "我的", to: "/profile" },
        ]}
      />
    </BrowserRouter>
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
    );
  }

  return <MobileWorkbench api={api} onLogout={handleLogout} />;
}
