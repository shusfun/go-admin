import { useEffect, useState } from "react";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import { useI18n } from "@suiyuan/i18n";
import {
  AuthLayout,
  AuthPanel,
  Button,
  FormField,
  InlineNotice,
  Input,
} from "@suiyuan/ui-admin";

import { AdminLocaleToggle } from "../components/admin-locale-toggle";
type LoginFormValues = {
  code?: string;
  password: string;
  username: string;
};

type LoginPageProps = {
  tenantCode: string;
  onSubmit: (values: LoginFormValues & { uuid?: string }) => Promise<void>;
  getCaptcha: () => Promise<{ image: string; uuid: string }>;
};

export function LoginPage({ tenantCode, onSubmit, getCaptcha }: LoginPageProps) {
  const { t } = useI18n();
  const [captchaImage, setCaptchaImage] = useState("");
  const [captchaId, setCaptchaId] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const loginSchema = z.object({
    username: z.string().min(1, t("admin.login.username.required")),
    password: z.string().min(1, t("admin.login.password.required")),
    code: z.string().optional(),
  });
  const form = useForm<LoginFormValues>({
    defaultValues: {
      username: "admin",
      password: "123456",
      code: "",
    },
    resolver: zodResolver(loginSchema),
  });

  async function refreshCaptcha() {
    try {
      const captcha = await getCaptcha();
      setCaptchaImage(captcha.image);
      setCaptchaId(captcha.uuid);
    } catch {
      setCaptchaImage("");
      setCaptchaId("");
    }
  }

  useEffect(() => {
    void refreshCaptcha();
  }, []);

  return (
    <>
      <AdminLocaleToggle />
      <AuthLayout
        aside={null}
        description={t("admin.login.description")}
        kicker={t("admin.login.kicker", undefined, { tenantCode })}
        title={t("admin.login.title")}
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
              setErrorMessage(error instanceof Error ? error.message : t("admin.login.fallbackError"));
              await refreshCaptcha();
            } finally {
              setSubmitting(false);
            }
          })}
        >
          <FormField error={form.formState.errors.username?.message} label={t("admin.login.username.label")}>
            <Input {...form.register("username")} placeholder={t("admin.login.username.placeholder")} />
          </FormField>
          <FormField error={form.formState.errors.password?.message} label={t("admin.login.password.label")}>
            <Input {...form.register("password")} placeholder={t("admin.login.password.placeholder")} type="password" />
          </FormField>
          <FormField label={t("admin.login.captcha.label")}>
            <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_148px]">
              <Input {...form.register("code")} placeholder={t("admin.login.captcha.empty")} />
              {captchaImage ? (
                <button
                  className="grid min-h-10 place-items-center overflow-hidden rounded-xl border border-border bg-background"
                  onClick={() => void refreshCaptcha()}
                  type="button"
                >
                  <img alt={t("admin.login.captcha.alt")} className="h-full w-full object-cover" src={captchaImage} />
                </button>
              ) : (
                <button
                  className="rounded-xl border border-dashed border-border bg-secondary/40 px-3 text-sm text-muted-foreground"
                  onClick={() => void refreshCaptcha()}
                  type="button"
                >
                  {t("admin.login.captcha.refresh")}
                </button>
              )}
            </div>
          </FormField>
          {errorMessage ? (
            <InlineNotice tone="danger" title={t("admin.login.error.title")}>
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
