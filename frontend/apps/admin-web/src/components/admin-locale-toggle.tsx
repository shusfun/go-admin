import { useI18n } from "@suiyuan/i18n";

import { Button } from "@suiyuan/ui-admin";

export function AdminLocaleToggle() {
  const { locale, setLocale, t } = useI18n();

  return (
    <Button
      aria-label={t("admin.shell.localeAria")}
      className="admin-locale-toggle"
      onClick={() => setLocale(locale === "zh-CN" ? "en-US" : "zh-CN")}
      size="sm"
      type="button"
      variant="outline"
    >
      {t("admin.language.switch")}
    </Button>
  );
}
