import { useEffect, useState } from "react";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import {
  AuthLayout,
  AuthPanel,
  Button,
  FormField,
  InlineNotice,
  Input,
} from "@suiyuan/ui-admin";

const loginSchema = z.object({
  username: z.string().min(1, "请输入账号"),
  password: z.string().min(1, "请输入密码"),
  code: z.string().optional(),
});

type LoginFormValues = z.infer<typeof loginSchema>;

type LoginPageProps = {
  tenantCode: string;
  onSubmit: (values: LoginFormValues & { uuid?: string }) => Promise<void>;
  getCaptcha: () => Promise<{ image: string; uuid: string }>;
};

export function LoginPage({ tenantCode, onSubmit, getCaptcha }: LoginPageProps) {
  const [captchaImage, setCaptchaImage] = useState("");
  const [captchaId, setCaptchaId] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
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
    <AuthLayout
      aside={
        <div className="grid max-w-xl gap-4 rounded-[2rem] border border-border/70 bg-card/80 p-6 shadow-[var(--shadow-card)]">
          <p className="text-sm font-semibold text-foreground">本次重构目标</p>
          <div className="space-y-2 text-sm leading-7 text-muted-foreground">
            <p>统一后台页面骨架、表格、弹层、筛选区和反馈语义。</p>
            <p>支持 `light / dark / system` 三态主题切换。</p>
            <p>不再维护旧 CSS 双轨样式体系。</p>
          </div>
        </div>
      }
      description="登录后将进入新的后台壳层、统一组件体系和主题系统，继续复用现有登录、权限和动态菜单链路。"
      kicker={`Tenant ${tenantCode}`}
      title="统一后台工作台已经切到新的设计底座"
    >
      <AuthPanel description="使用当前后台账号登录，系统会继续沿用现有验证码、权限和菜单接口。" kicker="Admin Access" title="进入后台">
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
              setErrorMessage(error instanceof Error ? error.message : "登录失败");
              await refreshCaptcha();
            } finally {
              setSubmitting(false);
            }
          })}
        >
          <FormField error={form.formState.errors.username?.message} label="账号">
            <Input {...form.register("username")} placeholder="请输入后台账号" />
          </FormField>
          <FormField error={form.formState.errors.password?.message} label="密码">
            <Input {...form.register("password")} placeholder="请输入密码" type="password" />
          </FormField>
          <FormField label="验证码">
            <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_148px]">
              <Input {...form.register("code")} placeholder="开发环境可留空" />
              {captchaImage ? (
                <button
                  className="grid min-h-10 place-items-center overflow-hidden rounded-xl border border-border bg-background"
                  onClick={() => void refreshCaptcha()}
                  type="button"
                >
                  <img alt="captcha" className="h-full w-full object-cover" src={captchaImage} />
                </button>
              ) : (
                <button
                  className="rounded-xl border border-dashed border-border bg-secondary/40 px-3 text-sm text-muted-foreground"
                  onClick={() => void refreshCaptcha()}
                  type="button"
                >
                  刷新验证码
                </button>
              )}
            </div>
          </FormField>
          {errorMessage ? (
            <InlineNotice tone="danger" title="登录失败">
              {errorMessage}
            </InlineNotice>
          ) : null}
          <Button className="w-full" disabled={submitting} size="lg" type="submit">
            {submitting ? "正在进入工作台..." : "进入后台"}
          </Button>
        </form>
      </AuthPanel>
    </AuthLayout>
  );
}
