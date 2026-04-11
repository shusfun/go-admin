import { useI18n } from "@go-admin/i18n";

import { Button, Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@go-admin/ui-admin";

function LanguageIcon() {
  return (
    <svg aria-hidden="true" height="1.2em" viewBox="0 0 24 24" width="1.2em">
      <path
        d="m18.5 10l4.4 11h-2.155l-1.201-3h-4.09l-1.199 3h-2.154L16.5 10zM10 2v2h6v2h-1.968a18.2 18.2 0 0 1-3.62 6.301a15 15 0 0 0 2.335 1.707l-.75 1.878A17 17 0 0 1 9 13.725a16.7 16.7 0 0 1-6.201 3.548l-.536-1.929a14.7 14.7 0 0 0 5.327-3.042A18 18 0 0 1 4.767 8h2.24A16 16 0 0 0 9 10.877a16.2 16.2 0 0 0 2.91-4.876L2 6V4h6V2zm7.5 10.885L16.253 16h2.492z"
        fill="currentColor"
      />
    </svg>
  );
}

export function AdminLocaleToggle() {
  const { locale, setLocale, t } = useI18n();

  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            aria-label={t("admin.shell.localeAria")}
            className="admin-locale-toggle"
            onClick={() => setLocale(locale === "zh-CN" ? "en-US" : "zh-CN")}
            size="icon"
            type="button"
            variant="ghost"
          >
            <LanguageIcon />
            <span className="sr-only">{t("admin.language.switch")}</span>
          </Button>
        </TooltipTrigger>
        <TooltipContent>点击切换语言</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
