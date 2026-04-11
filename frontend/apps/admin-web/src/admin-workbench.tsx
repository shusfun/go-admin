import { Suspense, lazy, useEffect, type ReactNode } from "react";
import { BrowserRouter, Route, Routes, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";

import { createApiClient, toUserFacingErrorMessage } from "@go-admin/api";
import { adaptMenuTree, findMenuByPath } from "@go-admin/core";
import { useI18n } from "@go-admin/i18n";
import { AdminAppShell, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Error404, Error500, Loading } from "@go-admin/ui-admin";
import type { AppMenuNode, InfoResponse, ProfileResponse } from "@go-admin/types";

import { AdminLocaleToggle } from "./components/admin-locale-toggle";
import { resolveAdminDocumentTitle, type AdminBranding } from "./lib/app-branding";

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
        <div className="flex min-h-full min-w-0 flex-1 flex-col [&>*]:h-full [&>*]:min-h-full">{children}</div>
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

function ShellContent({
  api,
  branding,
  info,
  menuTree,
  onLogout,
  profile,
  tenantCode,
}: {
  api: ReturnType<typeof createApiClient>;
  branding: AdminBranding;
  info: InfoResponse;
  menuTree: AppMenuNode[];
  onLogout: () => Promise<void>;
  profile: ProfileResponse;
  tenantCode: string;
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
      tenantCode={tenantCode}
      topbarActions={<AdminLocaleToggle />}
      userName={info.name || info.userName}
      userRole={info.roles.join(" / ")}
    >
      <Suspense fallback={<LoadingScreen />}>
        <Routes>
          <Route
            element={<DashboardPage info={info} menuTree={menuTree} profile={profile} tenantCode={tenantCode} />}
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

export function AdminWorkbench({
  api,
  branding,
  onLogout,
  tenantCode,
}: {
  api: ReturnType<typeof createApiClient>;
  branding: AdminBranding;
  onLogout: () => Promise<void>;
  tenantCode: string;
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
        tenantCode={tenantCode}
      />
    </BrowserRouter>
  );
}
