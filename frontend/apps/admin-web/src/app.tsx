import { useEffect, useRef, useState } from "react";
import { BrowserRouter, NavLink, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";

import { createApiClient, ApiError, createSetupApi } from "@suiyuan/api";
import { createSessionManager } from "@suiyuan/auth";
import { adaptMenuTree, deriveTenantCode, findMenuByPath } from "@suiyuan/core";
import { AdminShell, BrandBlock, IdentityCard, SectionCard, TreeNav } from "@suiyuan/ui-admin";
import type { AppMenuNode, AppSession, InfoResponse, ProfileResponse } from "@suiyuan/types";

import { DashboardPage } from "./pages/dashboard-page";
import { ApisPage } from "./pages/apis-page";
import { BuildToolPage } from "./pages/build-tool-page";
import { CodegenPage } from "./pages/codegen-page";
import { ConfigsPage } from "./pages/configs-page";
import { DeptsPage } from "./pages/depts-page";
import { DictsPage } from "./pages/dicts-page";
import { LoginLogsPage } from "./pages/login-logs-page";
import { LoginPage } from "./pages/login-page";
import { MenusPage } from "./pages/menus-page";
import { ModulePage } from "./pages/module-page";
import { OpsPage } from "./pages/ops-page";
import { OperaLogsPage } from "./pages/opera-logs-page";
import { PostsPage } from "./pages/posts-page";
import { ProfilePage } from "./pages/profile-page";
import { RolesPage } from "./pages/roles-page";
import { ScheduleJobsPage } from "./pages/schedule-jobs-page";
import { ScheduleLogsPage } from "./pages/schedule-logs-page";
import { ServerMonitorPage } from "./pages/server-monitor-page";
import { SetConfigPage } from "./pages/set-config-page";
import { SwaggerPage } from "./pages/swagger-page";
import { UsersPage } from "./pages/users-page";

import { SetupWizardPage } from "./pages/setup-wizard-page";

const tenant = deriveTenantCode(window.location.hostname, import.meta.env.VITE_TENANT_CODE || "local");
const sessionManager = createSessionManager("admin");
const setupApi = createSetupApi(import.meta.env.VITE_API_BASE_URL || "");

function useAdminApi(setAuthenticated: (value: boolean) => void) {
  return createApiClient({
    baseURL: import.meta.env.VITE_API_BASE_URL || "",
    clientType: "admin",
    tenantCode: tenant.tenantCode,
    sessionManager,
    onUnauthorized: () => {
      sessionManager.clear();
      setAuthenticated(false);
    },
  });
}

function LoadingScreen() {
  return (
    <div className="auth-layout">
      <section className="auth-card">
        <small className="auth-kicker">Bootstrapping</small>
        <h1>正在同步后台上下文</h1>
        <p>系统正在拉取用户信息、权限和动态菜单。</p>
      </section>
    </div>
  );
}

function AdminWorkbench({
  api,
  onLogout,
}: {
  api: ReturnType<typeof createApiClient>;
  onLogout: () => Promise<void>;
}) {
  const infoQuery = useQuery({
    queryKey: ["admin", "info"],
    queryFn: () => api.system.getInfo(),
  });
  const profileQuery = useQuery({
    queryKey: ["admin", "profile"],
    queryFn: () => api.system.getProfile(),
  });
  const menuQuery = useQuery({
    queryKey: ["admin", "menu"],
    queryFn: async () => adaptMenuTree(await api.system.getMenuRole()),
  });

  if (infoQuery.isLoading || profileQuery.isLoading || menuQuery.isLoading) {
    return <LoadingScreen />;
  }

  if (!infoQuery.data || !profileQuery.data || !menuQuery.data) {
    throw new Error("后台初始化失败");
  }

  return (
    <BrowserRouter>
      <ShellContent
        api={api}
        info={infoQuery.data}
        menuTree={menuQuery.data}
        onLogout={onLogout}
        profile={profileQuery.data}
      />
    </BrowserRouter>
  );
}

function ShellContent({
  api,
  info,
  menuTree,
  onLogout,
  profile,
}: {
  api: ReturnType<typeof createApiClient>;
  info: InfoResponse;
  menuTree: AppMenuNode[];
  onLogout: () => Promise<void>;
  profile: ProfileResponse;
}) {
  const location = useLocation();
  const navigate = useNavigate();
  const currentMenu = findMenuByPath(menuTree, location.pathname);
  const isFixedRoute = location.pathname === "/profile" || location.pathname === "/ops-service";

  useEffect(() => {
    if (location.pathname === "/" || isFixedRoute) {
      return;
    }

    if (!currentMenu && menuTree.length > 0) {
      navigate("/", { replace: true });
    }
  }, [currentMenu, isFixedRoute, location.pathname, menuTree, navigate]);

  return (
    <AdminShell
      sidebar={
        <>
          <BrandBlock />
          <IdentityCard
            avatar={info.avatar}
            name={info.name || info.userName}
            roleName={info.roles.join(" / ")}
            tenantCode={tenant.tenantCode}
          />
          <TreeNav menuTree={menuTree} />
          <SectionCard title="固定入口" description="新后台先把高频入口固定在侧栏底部。">
            <div className="inline-actions">
              <NavLink className="soft-link" to="/ops-service">
                运维服务
              </NavLink>
              <NavLink className="soft-link" to="/profile">
                个人中心
              </NavLink>
              <button className="soft-link danger" onClick={() => void onLogout()} type="button">
                退出登录
              </button>
            </div>
          </SectionCard>
        </>
      }
    >
      <Routes>
        <Route
          element={<DashboardPage info={info} menuTree={menuTree} profile={profile} tenantCode={tenant.tenantCode} />}
          path="/"
        />
        <Route element={<UsersPage api={api} />} path="/admin/sys-user" />
        <Route element={<MenusPage api={api} />} path="/admin/sys-menu" />
        <Route element={<RolesPage api={api} />} path="/admin/sys-role" />
        <Route element={<DeptsPage api={api} />} path="/admin/sys-dept" />
        <Route element={<PostsPage api={api} />} path="/admin/sys-post" />
        <Route element={<DictsPage api={api} />} path="/admin/dict" />
        <Route element={<DictsPage api={api} />} path="/admin/dict/data/:dictId" />
        <Route element={<ConfigsPage api={api} />} path="/admin/sys-config" />
        <Route element={<SetConfigPage api={api} />} path="/admin/sys-config/set" />
        <Route element={<ApisPage api={api} />} path="/admin/sys-api" />
        <Route element={<LoginLogsPage api={api} />} path="/admin/sys-login-log" />
        <Route element={<OperaLogsPage api={api} />} path="/admin/sys-oper-log" />
        <Route element={<ServerMonitorPage api={api} />} path="/sys-tools/monitor" />
        <Route element={<SwaggerPage />} path="/dev-tools/swagger" />
        <Route element={<BuildToolPage />} path="/dev-tools/build" />
        <Route element={<CodegenPage />} path="/dev-tools/gen" />
        <Route element={<CodegenPage />} path="/dev-tools/editTable" />
        <Route element={<ScheduleJobsPage api={api} />} path="/schedule/manage" />
        <Route element={<ScheduleLogsPage api={api} />} path="/schedule/log" />
        <Route element={<OpsPage api={api} />} path="/ops-service" />
        <Route element={<ProfilePage info={info} profile={profile} />} path="/profile" />
        <Route element={<ModulePage currentMenu={currentMenu} />} path="*" />
      </Routes>
    </AdminShell>
  );
}

export function App() {
  const [needsSetup, setNeedsSetup] = useState<boolean | null>(null);
  const [authenticated, setAuthenticated] = useState(Boolean(sessionManager.read()?.token));
  const api = useAdminApi(setAuthenticated);
  const checkedRef = useRef(false);

  // 启动时检测后端是否处于 Setup Wizard 模式
  useEffect(() => {
    if (checkedRef.current) return;
    checkedRef.current = true;

    setupApi
      .getStatus()
      .then((status) => setNeedsSetup(status.needs_setup))
      .catch(() => setNeedsSetup(false)); // 接口不可用时视为已安装
  }, []);

  async function handleLogin(payload: { username: string; password: string; code?: string; uuid?: string }) {
    const result = await api.auth.login(payload);
    const nextSession: AppSession = {
      token: result.token,
      expireAt: result.expire,
      tenantCode: tenant.tenantCode,
      clientType: "admin",
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

  // 阶段 1：正在检测后端状态
  if (needsSetup === null) {
    return <LoadingScreen />;
  }

  // 阶段 2：需要初始化安装
  if (needsSetup) {
    return <SetupWizardPage setupApi={setupApi} onComplete={() => setNeedsSetup(false)} />;
  }

  // 阶段 3：未登录
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
            throw new Error("登录接口调用失败");
          }
        }}
        tenantCode={tenant.tenantCode}
      />
    );
  }

  // 阶段 4：已登录，进入管理后台
  return <AdminWorkbench api={api} onLogout={handleLogout} />;
}
