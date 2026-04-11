import { Component, Suspense, lazy, useEffect, useRef, useState, type ErrorInfo, type PropsWithChildren, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";

import { ApiError, createApiClient, createSetupApi, toUserFacingErrorMessage } from "@go-admin/api";
import type { SetupApi, SetupStatus } from "@go-admin/api";
import { createSessionManager } from "@go-admin/auth";
import { deriveTenantCode } from "@go-admin/core";
import { useI18n } from "@go-admin/i18n";
import type { AppSession } from "@go-admin/types";

import {
  buildRememberedLoginDefaults,
  clearRememberedLogin,
  readRememberedLogin,
  writeRememberedLogin,
} from "./lib/remembered-login";
import { resolveAdminBranding, resolveAdminDocumentTitle } from "./lib/app-branding";
import type { SetupCompletionPayload } from "./pages/setup-wizard-page";

const LoginPage = lazy(async () => ({ default: (await import("./pages/login-page")).LoginPage }));
const SetupWizardPage = lazy(async () => ({ default: (await import("./pages/setup-wizard-page")).SetupWizardPage }));
const AdminWorkbench = lazy(async () => ({ default: (await import("./admin-workbench")).AdminWorkbench }));

const tenant = deriveTenantCode(window.location.hostname, import.meta.env.VITE_TENANT_CODE || "local");
const sessionManager = createSessionManager("admin");
const setupApi = createSetupApi(import.meta.env.VITE_API_BASE_URL || "");

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

function AdminLoadingFallback({
  description,
  title,
}: {
  description: string;
  title: string;
}) {
  return (
    <div className="min-h-[100dvh] bg-background px-6 py-6">
      <div className="mx-auto grid max-w-xl gap-4 rounded-3xl border border-border/70 bg-card/95 p-6 shadow-sm">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">Go Admin</p>
          <h1 className="text-2xl font-semibold text-foreground">{title}</h1>
          <p className="text-sm leading-7 text-muted-foreground">{description}</p>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-muted">
          <div className="h-full w-2/5 animate-pulse rounded-full bg-primary/70" />
        </div>
      </div>
    </div>
  );
}

function AdminCrashFallback({ error }: { error: Error }) {
  const { t } = useI18n();

  return (
    <div className="min-h-[100dvh] bg-background px-6 py-6">
      <div className="mx-auto grid max-w-xl gap-4 rounded-3xl border border-destructive/20 bg-card/95 p-6 shadow-sm">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-destructive/80">Go Admin</p>
          <h1 className="text-2xl font-semibold text-foreground">{t("admin.error.500.boundaryTitle")}</h1>
          <p className="text-sm leading-7 text-muted-foreground">{t("admin.error.500.boundaryDescription")}</p>
        </div>
        <div className="rounded-2xl border border-border/70 bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
          {toUserFacingErrorMessage(error, t("admin.error.500.footerFallback"))}
        </div>
        <button
          className="inline-flex w-fit items-center justify-center rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90"
          onClick={() => window.location.reload()}
          type="button"
        >
          {t("admin.error.500.retry")}
        </button>
      </div>
    </div>
  );
}

function AdminAppErrorBoundary({ children }: PropsWithChildren) {
  return (
    <AdminAppErrorBoundaryInner
      fallback={(error) => <AdminCrashFallback error={error} />}
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

function shouldAutoLoginAfterSetup(payload: SetupCompletionPayload) {
  if (payload.autoLogin) {
    return true;
  }

  const host = window.location.hostname.trim().toLowerCase();
  return host === "localhost" || host === "127.0.0.1" || host === "::1";
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
    enabled: needsSetup === false,
    retry: false,
    staleTime: 5 * 60 * 1000,
  });
  const branding = resolveAdminBranding(appConfigQuery.data);

  useEffect(() => {
    document.title = resolveAdminDocumentTitle(needsSetup ? "系统初始化配置" : undefined, branding.name);
  }, [branding.name, needsSetup]);

  useEffect(() => {
    if (checkedRef.current) return;
    checkedRef.current = true;

    setupApiClient
      .getStatus()
      .then((status) => {
        setSetupStatus(status);
        setNeedsSetup(status.needs_setup);
      })
      .catch(() => setNeedsSetup(false));
  }, [setupApiClient]);

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

    if (!shouldAutoLoginAfterSetup(payload)) {
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

  if (needsSetup === null) {
    return <AdminLoadingFallback description="正在检测系统初始化状态并同步品牌配置。" title={t("admin.loading.title")} />;
  }

  if (needsSetup && setupStatus) {
    return (
      <Suspense fallback={<AdminLoadingFallback description="正在加载初始化向导与安装步骤。" title="正在准备初始化向导" />}>
        <SetupWizardPage initialStatus={setupStatus} onComplete={handleSetupComplete} setupApi={setupApiClient} />
      </Suspense>
    );
  }

  if (!authenticated) {
    return (
      <Suspense fallback={<AdminLoadingFallback description="正在加载登录页、验证码与登录表单能力。" title="正在准备登录工作台" />}>
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

  return (
    <Suspense fallback={<AdminLoadingFallback description="正在加载后台导航、菜单与业务页面模块。" title="正在打开管理后台" />}>
      <AdminWorkbench api={api} branding={branding} onLogout={handleLogout} tenantCode={tenant.tenantCode} />
    </Suspense>
  );
}

export function App() {
  return (
    <AdminAppErrorBoundary>
      <AppContent />
    </AdminAppErrorBoundary>
  );
}
