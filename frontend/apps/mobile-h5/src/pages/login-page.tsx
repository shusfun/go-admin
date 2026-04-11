import { useState } from "react";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toUserFacingErrorMessage } from "@go-admin/api";
import { MobileImageCaptchaField } from "@go-admin/ui-mobile";

const loginSchema = z.object({
  username: z.string().min(1, "请输入账号"),
  password: z.string().min(1, "请输入密码"),
  code: z.string().optional(),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export function LoginPage({
  getCaptcha,
  onSubmit,
  tenantCode,
}: {
  getCaptcha: () => Promise<{ image: string; uuid: string }>;
  onSubmit: (values: LoginFormValues & { uuid?: string }) => Promise<void>;
  tenantCode: string;
}) {
  const [captchaId, setCaptchaId] = useState("");
  const [captchaRefreshToken, setCaptchaRefreshToken] = useState(0);
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

  return (
    <div className="mobile-auth">
      <section className="mobile-auth-card">
        <small>当前租户 {tenantCode}</small>
        <h1>用户登录</h1>
        <p>请输入账号和密码。</p>
        <form
          className="mobile-auth-form"
          onSubmit={form.handleSubmit(async (values) => {
            setSubmitting(true);
            setErrorMessage("");
            try {
              await onSubmit({
                ...values,
                uuid: captchaId || undefined,
              });
            } catch (error) {
              setErrorMessage(toUserFacingErrorMessage(error, "登录失败"));
              setCaptchaRefreshToken((current) => current + 1);
            } finally {
              setSubmitting(false);
            }
          })}
        >
          <label>
            <span>账号</span>
            <input {...form.register("username")} placeholder="请输入移动端账号" />
          </label>
          <label>
            <span>密码</span>
            <input {...form.register("password")} placeholder="请输入密码" type="password" />
          </label>
          <label>
            <span>验证码</span>
            <MobileImageCaptchaField
              getCaptcha={getCaptcha}
              imageAlt="captcha"
              inputProps={{ ...form.register("code"), placeholder: "请输入验证码" }}
              onCaptchaChange={(payload) => setCaptchaId(payload?.uuid ?? "")}
              refreshLabel="刷新"
              refreshToken={captchaRefreshToken}
            />
          </label>
          {errorMessage ? <div className="mobile-auth-error">{errorMessage}</div> : null}
          <button className="mobile-primary" disabled={submitting} type="submit">
            {submitting ? "正在进入..." : "进入移动端"}
          </button>
        </form>
      </section>
    </div>
  );
}
