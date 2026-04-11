import { useEffect, useState } from "react";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import { useI18n } from "@go-admin/i18n";
import {
  AuthLayout,
  AuthPanel,
  Button,
  Checkbox,
  FormField,
  ImageCaptchaField,
  InlineNotice,
  Input,
} from "@go-admin/ui-admin";
import { toUserFacingErrorMessage } from "@go-admin/api";

import { AdminLocaleToggle } from "../components/admin-locale-toggle";

type LoginFormValues = {
  code?: string;
  password: string;
  remember: boolean;
  username: string;
};

type LoginPageNotice = {
  message: string;
  tone?: "danger" | "warning";
};

type LoginPageProps = {
  brandLogo?: string;
  brandName?: string;
  initialValues?: Pick<LoginFormValues, "password" | "remember" | "username">;
  notice?: LoginPageNotice | null;
  tenantCode: string;
  onSubmit: (values: LoginFormValues & { uuid?: string }) => Promise<void>;
  getCaptcha: () => Promise<{ image: string; uuid: string }>;
};

export function LoginPage({ brandLogo = "", brandName, initialValues, notice, tenantCode, onSubmit, getCaptcha }: LoginPageProps) {
  const { t } = useI18n();
  const [captchaId, setCaptchaId] = useState("");
  const [captchaRefreshToken, setCaptchaRefreshToken] = useState(0);
  const [errorMessage, setErrorMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const resolvedBrandName = brandName?.trim() || t("admin.login.title");
  const loginSchema = z.object({
    username: z.string().min(1, t("admin.login.username.required")),
    password: z.string().min(1, t("admin.login.password.required")),
    code: z.string().optional(),
    remember: z.boolean(),
  });
  const form = useForm<LoginFormValues>({
    defaultValues: {
      username: initialValues?.username ?? "",
      password: initialValues?.password ?? "",
      remember: initialValues?.remember ?? false,
      code: "",
    },
    resolver: zodResolver(loginSchema),
  });

  useEffect(() => {
    form.reset({
      code: "",
      password: initialValues?.password ?? "",
      remember: initialValues?.remember ?? false,
      username: initialValues?.username ?? "",
    });
  }, [form, initialValues?.password, initialValues?.remember, initialValues?.username]);

  return (
    <>
      <div className="absolute right-6 top-6 z-50">
        <AdminLocaleToggle />
      </div>
      <AuthLayout
        aside={
          <div className="max-w-md rounded-[2rem] border border-border/70 bg-background/72 p-6 shadow-[var(--shadow-soft)] backdrop-blur">
            <div className="grid gap-5">
              <div className="flex items-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-[1.35rem] border border-border/70 bg-card/90 p-2 shadow-sm">
                {brandLogo ? (
                    <img alt={resolvedBrandName} className="h-full w-full object-contain" src={brandLogo} />
                ) : (
                    <span className="text-lg font-semibold tracking-tight text-primary">{resolvedBrandName.replace(/\s+/g, "").slice(0, 2) || "GA"}</span>
                  )}
                </div>
                <div className="grid gap-1">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">管理系统</p>
                  <p className="text-lg font-semibold text-foreground">{resolvedBrandName}</p>
                  <p className="text-sm leading-6 text-muted-foreground">统一的后台登录入口，用于访问工作台、权限与系统配置。</p>
                </div>
              </div>
              <div className="grid gap-2 rounded-[1.35rem] border border-border/60 bg-secondary/30 px-4 py-3 text-sm leading-6 text-muted-foreground">
                <p>请使用具备权限的后台账号登录。</p>
                <p>登录后可进入工作台并管理系统菜单、角色、接口与运行参数。</p>
              </div>
            </div>
          </div>
        }
        description={t("admin.login.description")}
        kicker={t("admin.login.kicker", undefined, { tenantCode })}
        title={resolvedBrandName}
      >
        <AuthPanel description={t("admin.login.authDescription")} kicker={t("admin.login.authKicker")} title={t("admin.login.authTitle")}>
        <form
          className="grid gap-5"
          onSubmit={form.handleSubmit(async (values) => {
            setSubmitting(true);
            setErrorMessage("");
            try {
              await onSubmit({
                ...values,
                uuid: captchaId || undefined,
              });
            } catch (error) {
              setErrorMessage(toUserFacingErrorMessage(error, t("admin.login.fallbackError")));
              setCaptchaRefreshToken((current) => current + 1);
            } finally {
              setSubmitting(false);
            }
          })}
        >
          <FormField error={form.formState.errors.username?.message} label={t("admin.login.username.label")}>
            <Input {...form.register("username")} autoComplete="username" placeholder={t("admin.login.username.placeholder")} />
          </FormField>
          <FormField error={form.formState.errors.password?.message} label={t("admin.login.password.label")}>
            <Input {...form.register("password")} autoComplete="current-password" placeholder={t("admin.login.password.placeholder")} type="password" />
          </FormField>
          <FormField label={t("admin.login.captcha.label")}>
            <ImageCaptchaField
              getCaptcha={getCaptcha}
              imageAlt={t("admin.login.captcha.alt")}
              inputProps={{ ...form.register("code"), placeholder: t("admin.login.captcha.empty") }}
              onCaptchaChange={(payload) => setCaptchaId(payload?.uuid ?? "")}
              refreshLabel={t("admin.login.captcha.refresh")}
              refreshToken={captchaRefreshToken}
            />
          </FormField>
          <label className="flex items-center gap-3 text-sm text-foreground">
            <Checkbox
              checked={form.watch("remember")}
              onCheckedChange={(checked) => form.setValue("remember", checked === true, { shouldDirty: true })}
            />
            <span>{t("admin.login.remember.label")}</span>
          </label>
          {notice?.message ? (
            <InlineNotice tone={notice.tone ?? "warning"} title={t("admin.login.notice.title")}>
              {notice.message}
            </InlineNotice>
          ) : null}
          {errorMessage ? (
            <InlineNotice tone="danger">
              <span className="font-medium mr-2">{t("admin.login.error.title")}</span>
              {errorMessage}
            </InlineNotice>
          ) : null}
          <Button className="w-full" disabled={submitting} size="lg" type="submit">
            {submitting ? t("admin.login.submitting") : t("admin.login.submit")}
          </Button>
        </form>
        </AuthPanel>
      </AuthLayout>
    </>
  );
}
