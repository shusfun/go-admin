import { Component, Suspense, lazy, useEffect, useRef, useState, type ErrorInfo, type PropsWithChildren, type ReactNode } from "react";
import { BrowserRouter, Route, Routes, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";

import { createApiClient, ApiError, createSetupApi, toUserFacingErrorMessage } from "@go-admin/api";
import type { SetupApi, SetupStatus } from "@go-admin/api";
import { createSessionManager } from "@go-admin/auth";
import { adaptMenuTree, deriveTenantCode, findMenuByPath } from "@go-admin/core";
import { useI18n } from "@go-admin/i18n";
import { AdminAppShell, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Error404, Error500, Loading } from "@go-admin/ui-admin";
import type { AppMenuNode, AppSession, InfoResponse, ProfileResponse } from "@go-admin/types";

import { AdminLocaleToggle } from "./components/admin-locale-toggle";
import {
  buildRememberedLoginDefaults,
  clearRememberedLogin,
  readRememberedLogin,
  writeRememberedLogin,
} from "./lib/remembered-login";
import { resolveAdminBranding, resolveAdminDocumentTitle, type AdminBranding } from "./lib/app-branding";
import type { SetupCompletionPayload } from "./pages/setup-wizard-page";

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
const ScheduleJobsPage = lazy(async () => ({ default: (await import("./pages/schedule-jobs-page")).ScheduleJobsPage }));
const ScheduleLogsPage = lazy(async () => ({ default: (await import("./pages/schedule-logs-page")).ScheduleLogsPage }));
const OpsPage = lazy(async () => ({ default: (await import("./pages/ops-page")).OpsPage }));
const ProfilePage = lazy(async () => ({ default: (await import("./pages/profile-page")).ProfilePage }));
const ModulePage = lazy(async () => ({ default: (await import("./pages/module-page")).ModulePage }));

const tenant = deriveTenantCode(window.location.hostname, import.meta.env.VITE_TENANT_CODE || "local");
const sessionManager = createSessionManager("admin");
const setupApi = createSetupApi(import.meta.env.VITE_API_BASE_URL || "");

function goToAdminHome() {
  window.location.assign("/");
}

function goBackOrHome() {
  if (window.history.length > 1) {
    window.history.back();
    return;
  }

  goToAdminHome();
}

function getErrorMessage(error: unknown) {
  return toUserFacingErrorMessage(error, "页面暂时无法打开，请稍后重试");
}

function ErrorScreenFrame({
  children,
  fullscreen = false,
}: {
  children: ReactNode;
  fullscreen?: boolean;
}) {
  return (
    <div
      className={[
        "overflow-hidden bg-background px-4 py-4 md:px-6 md:py-6",
        fullscreen ? "h-[100dvh]" : "min-h-full",
      ].join(" ")}
    >
      <div className="mx-auto flex h-full min-h-full max-w-[1600px] flex-col">
        <div className="flex flex-1 min-h-full min-w-0 flex-col [&>*]:h-full [&>*]:min-h-full">{children}</div>
      </div>
    </div>
  );
}

function AdminNotFoundPage() {
  const { t } = useI18n();
  const location = useLocation();

  return (
    <ErrorScreenFrame>
      <Error404
        action={
          <Button onClick={goToAdminHome} type="button">
            {t("admin.error.404.home")}
          </Button>
        }
        description={t("admin.error.404.description")}
        footer={
          <div className="grid gap-2">
            <div className="text-sm font-semibold text-foreground">{t("admin.error.404.footerTitle")}</div>
            <div className="text-sm leading-7 text-muted-foreground">{location.pathname}</div>
          </div>
        }
        secondaryAction={
          <Button onClick={goBackOrHome} type="button" variant="outline">
            {t("admin.error.404.back")}
          </Button>
        }
        title={t("admin.error.404.title")}
      />
    </ErrorScreenFrame>
  );
}

function AdminServerErrorPage({
  description,
  error,
  fullscreen = false,
  onRetry,
  title,
}: {
  description?: string;
  error?: unknown;
  fullscreen?: boolean;
  onRetry?: () => void;
  title?: string;
}) {
  const { t } = useI18n();
  const errorMessage = getErrorMessage(error);

  return (
    <ErrorScreenFrame fullscreen={fullscreen}>
      <Error500
        action={
          <Button onClick={onRetry ?? (() => window.location.reload())} type="button">
            {t("admin.error.500.retry")}
          </Button>
        }
        description={description ?? t("admin.error.500.description")}
        footer={
          <div className="grid gap-2">
            <div className="text-sm font-semibold text-foreground">{t("admin.error.500.footerTitle")}</div>
            <div className="text-sm leading-7 text-muted-foreground">{errorMessage ?? t("admin.error.500.footerFallback")}</div>
          </div>
        }
        secondaryAction={
          <Button onClick={goToAdminHome} type="button" variant="outline">
            {t("admin.error.500.home")}
          </Button>
        }
        title={title ?? t("admin.error.500.title")}
      />
    </ErrorScreenFrame>
  );
}

class AdminAppErrorBoundaryInner extends Component<
  PropsWithChildren<{
    fallback: (error: Error) => ReactNode;
  }>,
  { error: Error | null }
> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(_error: Error, _errorInfo: ErrorInfo) {}

  render() {
    if (this.state.error) {
      return this.props.fallback(this.state.error);
    }

    return this.props.children;
  }
}

function AdminAppErrorBoundary({ children }: PropsWithChildren) {
  const { t } = useI18n();

  return (
    <AdminAppErrorBoundaryInner
      fallback={(error) => (
      <AdminServerErrorPage
        description={t("admin.error.500.boundaryDescription")}
        error={error}
        fullscreen
        title={t("admin.error.500.boundaryTitle")}
      />
      )}
    >
      {children}
    </AdminAppErrorBoundaryInner>
  );
}

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
  const { t } = useI18n();

  return (
    <div className="min-h-[100dvh] bg-background px-6 py-6">
      <div className="mx-auto grid max-w-xl gap-4">
        <div className="flex justify-end">
          <AdminLocaleToggle />
        </div>
        <Card className="w-full">
          <CardHeader>
            <CardTitle>{t("admin.loading.title")}</CardTitle>
            <CardDescription>{t("admin.loading.description")}</CardDescription>
          </CardHeader>
          <CardContent>
            <Loading label={t("admin.loading.label")} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function AdminWorkbench({
  api,
  branding,
  onLogout,
}: {
  api: ReturnType<typeof createApiClient>;
  branding: AdminBranding;
  onLogout: () => Promise<void>;
}) {
  const { t } = useI18n();
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

  const bootstrapError = infoQuery.error ?? profileQuery.error ?? menuQuery.error;
  if (bootstrapError) {
    return (
      <AdminServerErrorPage
        description={t("admin.error.500.bootstrapDescription")}
        error={bootstrapError}
        fullscreen
        onRetry={() => {
          void infoQuery.refetch();
          void profileQuery.refetch();
          void menuQuery.refetch();
        }}
        title={t("admin.error.500.bootstrapTitle")}
      />
    );
  }

  if (!infoQuery.data || !profileQuery.data || !menuQuery.data) {
    return (
      <AdminServerErrorPage
        description={t("admin.error.500.bootstrapDescription")}
        fullscreen
        title={t("admin.error.500.bootstrapTitle")}
      />
    );
  }

  return (
    <BrowserRouter>
      <ShellContent
        api={api}
        branding={branding}
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
  branding,
  info,
  menuTree,
  onLogout,
  profile,
}: {
  api: ReturnType<typeof createApiClient>;
  branding: AdminBranding;
  info: InfoResponse;
  menuTree: AppMenuNode[];
  onLogout: () => Promise<void>;
  profile: ProfileResponse;
}) {
  const location = useLocation();
  const currentMenu = findMenuByPath(menuTree, location.pathname);
  const pageTitle = currentMenu?.title || (location.pathname === "/ops-service" ? "运维服务" : location.pathname === "/profile" ? "个人中心" : "控制台");

  useEffect(() => {
    document.title = resolveAdminDocumentTitle(pageTitle, branding.name);
  }, [branding.name, pageTitle]);

  return (
    <AdminAppShell
      avatar={info.avatar}
      brandLogo={branding.logo}
      brandTitle={branding.name}
      currentPath={location.pathname}
      menuTree={menuTree}
      onLogout={() => void onLogout()}
      tenantCode={tenant.tenantCode}
      topbarActions={<AdminLocaleToggle />}
      userName={info.name || info.userName}
      userRole={info.roles.join(" / ")}
    >
      <Suspense fallback={<LoadingScreen />}>
        <Routes>
          <Route
            element={<DashboardPage info={info} menuTree={menuTree} profile={profile} tenantCode={tenant.tenantCode} />}
            path="/"
          />
          <Route element={<AdminNotFoundPage />} path="/404" />
          <Route element={<AdminServerErrorPage />} path="/500" />
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
          <Route element={<ScheduleJobsPage api={api} />} path="/schedule/manage" />
          <Route element={<ScheduleLogsPage api={api} />} path="/schedule/log" />
          <Route element={<OpsPage api={api} />} path="/ops-service" />
          <Route element={<ProfilePage api={api} info={info} profile={profile} />} path="/profile" />
          <Route element={currentMenu ? <ModulePage currentMenu={currentMenu} /> : <AdminNotFoundPage />} path="*" />
        </Routes>
      </Suspense>
    </AdminAppShell>
  );
}

export function AppContent({ setupApiClient = setupApi }: { setupApiClient?: SetupApi } = {}) {
  const { t } = useI18n();
  const [needsSetup, setNeedsSetup] = useState<boolean | null>(null);
  const [setupStatus, setSetupStatus] = useState<SetupStatus | null>(null);
  const [authenticated, setAuthenticated] = useState(Boolean(sessionManager.read()?.token));
  const [loginDefaults, setLoginDefaults] = useState(() => buildRememberedLoginDefaults(readRememberedLogin()));
  const [loginNotice, setLoginNotice] = useState<{ message: string; tone?: "danger" | "warning" } | null>(null);
  const api = useAdminApi(setAuthenticated);
  const checkedRef = useRef(false);
  const appConfigQuery = useQuery({
    queryKey: ["public", "app-config"],
    queryFn: () => api.system.getAppConfig(),
    retry: false,
    staleTime: 5 * 60 * 1000,
  });
  const branding = resolveAdminBranding(appConfigQuery.data);

  useEffect(() => {
    document.title = resolveAdminDocumentTitle(needsSetup ? "系统初始化配置" : undefined, branding.name);
  }, [branding.name, needsSetup]);

  // 启动时检测后端是否处于 Setup Wizard 模式
  useEffect(() => {
    if (checkedRef.current) return;
    checkedRef.current = true;

    setupApiClient
      .getStatus()
      .then((status) => {
        setSetupStatus(status);
        setNeedsSetup(status.needs_setup);
      })
      .catch(() => setNeedsSetup(false)); // 接口不可用时视为已安装
  }, []);

  async function handleLogin(
    payload: { username: string; password: string; code?: string; uuid?: string; remember?: boolean },
    options: { syncRememberedLogin?: boolean } = {},
  ) {
    const { syncRememberedLogin = true } = options;
    const result = await api.auth.login(payload);
    const nextSession: AppSession = {
      token: result.token,
      expireAt: result.expire,
      tenantCode: tenant.tenantCode,
      clientType: "admin",
    };
    sessionManager.write(nextSession);
    if (syncRememberedLogin) {
      if (payload.remember) {
        writeRememberedLogin({
          password: payload.password,
          username: payload.username,
        });
        setLoginDefaults(
          buildRememberedLoginDefaults({
            password: payload.password,
            remember: true,
            username: payload.username,
          }),
        );
      } else {
        clearRememberedLogin();
        setLoginDefaults(buildRememberedLoginDefaults(null));
      }
    }
    setAuthenticated(true);
  }

  async function handleLogout() {
    try {
      await api.auth.logout();
    } finally {
      sessionManager.clear();
      setLoginDefaults(buildRememberedLoginDefaults(readRememberedLogin()));
      setAuthenticated(false);
    }
  }

  async function handleSetupComplete(payload: SetupCompletionPayload) {
    setLoginDefaults({
      password: payload.password,
      remember: false,
      username: payload.username,
    });

    if (!payload.autoLogin) {
      setLoginNotice({
        message: t("admin.setup.loginRequired"),
        tone: "warning",
      });
      setNeedsSetup(false);
      return;
    }

    try {
      await handleLogin(
        {
          password: payload.password,
          username: payload.username,
        },
        { syncRememberedLogin: false },
      );
      setLoginNotice(null);
    } catch (error) {
      const message = toUserFacingErrorMessage(error, t("admin.workbench.loginError"));
      setLoginNotice({
        message: t("admin.setup.autoLoginFailed", undefined, { message }),
        tone: "warning",
      });
    } finally {
      setNeedsSetup(false);
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
        <SetupWizardPage initialStatus={setupStatus} onComplete={handleSetupComplete} setupApi={setupApiClient} />
      </Suspense>
    );
  }

  // 阶段 3：未登录
  if (!authenticated) {
    return (
      <Suspense fallback={<LoadingScreen />}>
        <LoginPage
          brandLogo={branding.logo}
          brandName={branding.name}
          getCaptcha={async () => {
            const captcha = await api.auth.getCaptcha();
            return {
              image: captcha.data,
              uuid: captcha.id,
            };
          }}
          initialValues={loginDefaults}
          notice={loginNotice}
          onSubmit={async (values) => {
            setLoginNotice(null);
            try {
              await handleLogin(values);
            } catch (error) {
              if (error instanceof ApiError) {
                throw error;
              }
              throw new Error(t("admin.workbench.loginError"));
            }
          }}
          tenantCode={tenant.tenantCode}
        />
      </Suspense>
    );
  }

  // 阶段 4：已登录，进入管理后台
  return <AdminWorkbench api={api} branding={branding} onLogout={handleLogout} />;
}

export function App() {
  return (
    <AdminAppErrorBoundary>
      <AppContent />
    </AdminAppErrorBoundary>
  );
}
