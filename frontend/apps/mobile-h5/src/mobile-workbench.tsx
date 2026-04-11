import { Suspense, lazy } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";

import { createApiClient } from "@go-admin/api";
import { BottomTabBar, MobileShell, SurfaceCard } from "@go-admin/ui-mobile";

const HomePage = lazy(async () => ({ default: (await import("./pages/home-page")).HomePage }));
const ProfilePage = lazy(async () => ({ default: (await import("./pages/profile-page")).ProfilePage }));
const StatusPage = lazy(async () => ({ default: (await import("./pages/status-page")).StatusPage }));

function MobileWorkbenchFallback() {
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

export function MobileWorkbench({
  api,
  onLogout,
  tenantCode,
}: {
  api: ReturnType<typeof createApiClient>;
  onLogout: () => Promise<void>;
  tenantCode: string;
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
    return <MobileWorkbenchFallback />;
  }

  return (
    <BrowserRouter>
      <MobileShell>
        <Suspense fallback={<MobileWorkbenchFallback />}>
          <Routes>
            <Route element={<HomePage info={infoQuery.data} profile={profileQuery.data} tenantCode={tenantCode} />} path="/" />
            <Route element={<StatusPage />} path="/status" />
            <Route element={<ProfilePage info={infoQuery.data} profile={profileQuery.data} />} path="/profile" />
          </Routes>
        </Suspense>
        <SurfaceCard description="移动端与后台可分别更新，互不影响日常使用。" title="当前环境">
          <div className="mobile-inline">
            <span>租户 {tenantCode}</span>
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
