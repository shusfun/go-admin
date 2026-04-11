export type AdminBranding = {
  description: string;
  kicker: string;
  logo: string;
  name: string;
};

export const DEFAULT_ADMIN_BRANDING: AdminBranding = {
  description: "后台管理系统",
  kicker: "管理后台",
  logo: "",
  name: "统一后台工作台",
};

export function resolveAdminBranding(config?: Record<string, string> | null): AdminBranding {
  const configuredName = String(config?.sys_app_name || "").trim();
  const configuredLogo = String(config?.sys_app_logo || "").trim();

  return {
    ...DEFAULT_ADMIN_BRANDING,
    logo: configuredLogo,
    name: configuredName || DEFAULT_ADMIN_BRANDING.name,
  };
}

export function resolveAdminDocumentTitle(pageTitle: string | null | undefined, brandName: string) {
  const normalizedBrandName = brandName.trim() || DEFAULT_ADMIN_BRANDING.name;
  const normalizedPageTitle = String(pageTitle || "").trim();

  if (!normalizedPageTitle) {
    return normalizedBrandName;
  }

  return `${normalizedPageTitle} - ${normalizedBrandName}`;
}
