import { Suspense, lazy, useEffect, useRef, useState } from "react";
import { BrowserRouter, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";

import { createApiClient, ApiError, createSetupApi } from "@suiyuan/api";
import type { SetupStatus } from "@suiyuan/api";
import { createSessionManager } from "@suiyuan/auth";
import { adaptMenuTree, deriveTenantCode, findMenuByPath } from "@suiyuan/core";
import { AdminAppShell, Card, CardContent, CardDescription, CardHeader, CardTitle, Loading } from "@suiyuan/ui-admin";
import type { AppMenuNode, AppSession, InfoResponse, ProfileResponse } from "@suiyuan/types";

const LoginPage = lazy(async () => ({ default: (await import("./pages/login-page")).LoginPage }));
const SetupWizardPage = lazy(async () => ({ default: (await import("./pages/setup-wizard-page")).SetupWizardPage }));
const DashboardPage = lazy(async () => ({ default: (await import("./pages/dashboard-page")).DashboardPage }));
const UsersPage = lazy(async () => ({ default: (await import("./pages/users-page")).UsersPage }));
const MenusPage = lazy(async () => ({ default: (await import("./pages/menus-page")).MenusPage }));
const RolesPage = lazy(async () => ({ default: (await import("./pages/roles-page")).RolesPage }));
const DeptsPage = lazy(async () => ({ default: (await import("./pages/depts-page")).DeptsPage }));
const PostsPage = lazy(async () => ({ default: (await import("./pages/posts-page")).PostsPage }));
const DictsPage = lazy(async () => ({ default: (await import("./pages/dicts-page")).DictsPage }));
const ConfigsPage = lazy(async () => ({ default: (await import("./pages/configs-page")).ConfigsPage }));
const SetConfigPage = lazy(async () => ({ default: (await import("./pages/set-config-page")).SetConfigPage }));
const ApisPage = lazy(async () => ({ default: (await import("./pages/apis-page")).ApisPage }));
const LoginLogsPage = lazy(async () => ({ default: (await import("./pages/login-logs-page")).LoginLogsPage }));
const OperaLogsPage = lazy(async () => ({ default: (await import("./pages/opera-logs-page")).OperaLogsPage }));
const ServerMonitorPage = lazy(async () => ({ default: (await import("./pages/server-monitor-page")).ServerMonitorPage }));
const SwaggerPage = lazy(async () => ({ default: (await import("./pages/swagger-page")).SwaggerPage }));
const BuildToolPage = lazy(async () => ({ default: (await import("./pages/build-tool-page")).BuildToolPage }));
const CodegenPage = lazy(async () => ({ default: (await import("./pages/codegen-page")).CodegenPage }));
const ScheduleJobsPage = lazy(async () => ({ default: (await import("./pages/schedule-jobs-page")).ScheduleJobsPage }));
const ScheduleLogsPage = lazy(async () => ({ default: (await import("./pages/schedule-logs-page")).ScheduleLogsPage }));
const OpsPage = lazy(async () => ({ default: (await import("./pages/ops-page")).OpsPage }));
const ProfilePage = lazy(async () => ({ default: (await import("./pages/profile-page")).ProfilePage }));
const ModulePage = lazy(async () => ({ default: (await import("./pages/module-page")).ModulePage }));

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
    <div className="grid min-h-[100dvh] place-items-center bg-background px-6">
      <Card className="w-full max-w-xl">
        <CardHeader>
          <CardTitle>正在同步后台上下文</CardTitle>
          <CardDescription>系统正在拉取用户信息、权限和动态菜单。</CardDescription>
        </CardHeader>
        <CardContent>
          <Loading label="正在初始化工作台" />
        </CardContent>
      </Card>
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
    <AdminAppShell
      avatar={info.avatar}
      currentPath={location.pathname}
      menuTree={menuTree}
      onLogout={() => void onLogout()}
      tenantCode={tenant.tenantCode}
      userName={info.name || info.userName}
      userRole={info.roles.join(" / ")}
    >
      <Suspense fallback={<LoadingScreen />}>
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
      </Suspense>
    </AdminAppShell>
  );
}

export function App() {
  const [needsSetup, setNeedsSetup] = useState<boolean | null>(null);
  const [setupStatus, setSetupStatus] = useState<SetupStatus | null>(null);
  const [authenticated, setAuthenticated] = useState(Boolean(sessionManager.read()?.token));
  const api = useAdminApi(setAuthenticated);
  const checkedRef = useRef(false);

  // 启动时检测后端是否处于 Setup Wizard 模式
  useEffect(() => {
    if (checkedRef.current) return;
    checkedRef.current = true;

    setupApi
      .getStatus()
      .then((status) => {
        setSetupStatus(status);
        setNeedsSetup(status.needs_setup);
      })
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
  if (needsSetup && setupStatus) {
    return (
      <Suspense fallback={<LoadingScreen />}>
        <SetupWizardPage initialStatus={setupStatus} setupApi={setupApi} onComplete={() => setNeedsSetup(false)} />
      </Suspense>
    );
  }

  // 阶段 3：未登录
  if (!authenticated) {
    return (
      <Suspense fallback={<LoadingScreen />}>
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
      </Suspense>
    );
  }

  // 阶段 4：已登录，进入管理后台
  return <AdminWorkbench api={api} onLogout={handleLogout} />;
}
