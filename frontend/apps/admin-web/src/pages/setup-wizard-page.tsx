import { useState } from "react";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import type { SetupApi } from "@suiyuan/api";

// ─── Schema 定义 ───

const dbSchema = z.object({
  host: z.string().min(1, "请输入主机地址"),
  port: z.number().min(1).max(65535, "端口范围 1-65535"),
  user: z.string().min(1, "请输入用户名"),
  password: z.string(),
  dbname: z.string().min(1, "请输入数据库名"),
  sslmode: z.string(),
});

const redisSchema = z.object({
  host: z.string().min(1, "请输入主机地址"),
  port: z.number().min(1).max(65535, "端口范围 1-65535"),
  password: z.string(),
  db: z.number().min(0).max(15, "数据库编号 0-15"),
});

const adminSchema = z
  .object({
    username: z.string().min(1, "请输入用户名"),
    password: z.string().min(6, "密码至少 6 位"),
    confirmPassword: z.string().min(6, "请确认密码"),
    email: z.string().email("邮箱格式无效").or(z.literal("")),
    phone: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "两次密码不一致",
    path: ["confirmPassword"],
  });

type DBFormValues = z.infer<typeof dbSchema>;
type RedisFormValues = z.infer<typeof redisSchema>;
type AdminFormValues = z.infer<typeof adminSchema>;

// ─── 步骤常量 ───

const STEPS = ["database", "redis", "admin", "complete"] as const;
type Step = (typeof STEPS)[number];

const STEP_LABELS: Record<Step, string> = {
  database: "数据库配置",
  redis: "Redis 配置",
  admin: "管理员账号",
  complete: "安装完成",
};

// ─── 主组件 ───

type SetupWizardPageProps = {
  setupApi: SetupApi;
  onComplete: () => void;
};

type SetupStatus = Awaited<ReturnType<SetupApi["getStatus"]>>;

export function SetupWizardPage({ setupApi, onComplete }: SetupWizardPageProps) {
  const [currentStep, setCurrentStep] = useState<Step>("database");
  const [dbValues, setDbValues] = useState<DBFormValues | null>(null);
  const [redisValues, setRedisValues] = useState<RedisFormValues | null>(null);
  const [installing, setInstalling] = useState(false);
  const [installError, setInstallError] = useState("");
  const [completionHint, setCompletionHint] = useState("");

  const stepIndex = STEPS.indexOf(currentStep);

  function handleDbComplete(values: DBFormValues) {
    setDbValues(values);
    setCurrentStep("redis");
  }

  function handleRedisComplete(values: RedisFormValues) {
    setRedisValues(values);
    setCurrentStep("admin");
  }

  async function handleAdminComplete(values: AdminFormValues) {
    if (!dbValues || !redisValues) return;
    setInstalling(true);
    setInstallError("");
    setCompletionHint("");
    try {
      await setupApi.install({
        database: dbValues,
        redis: redisValues,
        admin: {
          username: values.username,
          password: values.password,
          email: values.email || "",
          phone: values.phone || "",
        },
      });
      setCurrentStep("complete");

      const ready = await waitForSetupCompletion(() => setupApi.getStatus());
      if (ready) {
        onComplete();
        return;
      }

      setCompletionHint("服务可能已重启，请刷新页面或检查后端状态。");
    } catch (error) {
      setInstallError(error instanceof Error ? error.message : "安装失败");
    } finally {
      setInstalling(false);
    }
  }

  return (
    <div className="auth-layout">
      <section className="auth-card" style={{ maxWidth: 640 }}>
        <small className="auth-kicker">Setup Wizard</small>
        <h1 style={{ fontSize: "clamp(28px, 4vw, 42px)" }}>系统初始化配置</h1>
        <p>首次使用需要配置数据库和 Redis 连接，创建管理员账号。</p>

        {/* 步骤指示器 */}
        <div className="setup-steps" style={{ display: "flex", gap: 8, marginTop: 24 }}>
          {STEPS.map((step, idx) => (
            <div
              key={step}
              style={{
                flex: 1,
                height: 4,
                borderRadius: 2,
                background: idx <= stepIndex ? "var(--color-accent, #0f766e)" : "rgba(18,19,26,0.1)",
                transition: "background 0.3s",
              }}
            />
          ))}
        </div>
        <div style={{ marginTop: 8, color: "var(--color-muted)", fontSize: 13 }}>
          步骤 {stepIndex + 1} / {STEPS.length}：{STEP_LABELS[currentStep]}
        </div>

        {/* 步骤内容 */}
        <div style={{ marginTop: 24 }}>
          {currentStep === "database" && (
            <DatabaseStep setupApi={setupApi} defaultValues={dbValues} onComplete={handleDbComplete} />
          )}
          {currentStep === "redis" && (
            <RedisStep
              setupApi={setupApi}
              defaultValues={redisValues}
              onBack={() => setCurrentStep("database")}
              onComplete={handleRedisComplete}
            />
          )}
          {currentStep === "admin" && (
            <AdminStep
              installing={installing}
              installError={installError}
              onBack={() => setCurrentStep("redis")}
              onComplete={handleAdminComplete}
            />
          )}
          {currentStep === "complete" && <CompleteStep hint={completionHint} />}
        </div>
      </section>
    </div>
  );
}

// ─── 数据库步骤 ───

function DatabaseStep({
  setupApi,
  defaultValues,
  onComplete,
}: {
  setupApi: SetupApi;
  defaultValues: DBFormValues | null;
  onComplete: (values: DBFormValues) => void;
}) {
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; msg: string } | null>(null);

  const form = useForm<DBFormValues>({
    defaultValues: defaultValues ?? {
      host: "127.0.0.1",
      port: 5432,
      user: "postgres",
      password: "",
      dbname: "go_admin",
      sslmode: "disable",
    },
    resolver: zodResolver(dbSchema),
  });

  async function handleTest() {
    const valid = await form.trigger();
    if (!valid) return;
    setTesting(true);
    setTestResult(null);
    try {
      await setupApi.testDatabase(form.getValues());
      setTestResult({ ok: true, msg: "数据库连接成功 ✓" });
    } catch (error) {
      setTestResult({ ok: false, msg: error instanceof Error ? error.message : "连接失败" });
    } finally {
      setTesting(false);
    }
  }

  return (
    <form
      className="auth-form"
      onSubmit={form.handleSubmit((values) => {
        if (!testResult?.ok) {
          setTestResult({ ok: false, msg: "请先测试连接" });
          return;
        }
        onComplete(values);
      })}
    >
      <div className="form-grid two-columns">
        <label className="form-field">
          <span>主机地址</span>
          <input {...form.register("host")} placeholder="127.0.0.1" />
          <em>{form.formState.errors.host?.message}</em>
        </label>
        <label className="form-field">
          <span>端口</span>
          <input {...form.register("port", { valueAsNumber: true })} placeholder="5432" type="number" />
          <em>{form.formState.errors.port?.message}</em>
        </label>
      </div>
      <div className="form-grid two-columns">
        <label className="form-field">
          <span>用户名</span>
          <input {...form.register("user")} placeholder="postgres" />
          <em>{form.formState.errors.user?.message}</em>
        </label>
        <label className="form-field">
          <span>密码</span>
          <input {...form.register("password")} placeholder="数据库密码" type="password" />
          <em>{form.formState.errors.password?.message}</em>
        </label>
      </div>
      <div className="form-grid two-columns">
        <label className="form-field">
          <span>数据库名</span>
          <input {...form.register("dbname")} placeholder="go_admin" />
          <em>{form.formState.errors.dbname?.message}</em>
        </label>
        <label className="form-field">
          <span>SSL 模式</span>
          <select {...form.register("sslmode")}>
            <option value="disable">disable</option>
            <option value="require">require</option>
            <option value="verify-ca">verify-ca</option>
            <option value="verify-full">verify-full</option>
          </select>
          <em>{form.formState.errors.sslmode?.message}</em>
        </label>
      </div>

      {testResult && (
        <div className={testResult.ok ? "inline-feedback" : "inline-feedback error"}>{testResult.msg}</div>
      )}

      <div style={{ display: "flex", gap: 12 }}>
        <button className="soft-link" disabled={testing} onClick={handleTest} type="button">
          {testing ? "测试中..." : "测试连接"}
        </button>
        <button className="primary-action" style={{ flex: 1 }} type="submit">
          下一步
        </button>
      </div>
    </form>
  );
}

// ─── Redis 步骤 ───

function RedisStep({
  setupApi,
  defaultValues,
  onBack,
  onComplete,
}: {
  setupApi: SetupApi;
  defaultValues: RedisFormValues | null;
  onBack: () => void;
  onComplete: (values: RedisFormValues) => void;
}) {
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; msg: string } | null>(null);

  const form = useForm<RedisFormValues>({
    defaultValues: defaultValues ?? {
      host: "127.0.0.1",
      port: 6379,
      password: "",
      db: 0,
    },
    resolver: zodResolver(redisSchema),
  });

  async function handleTest() {
    const valid = await form.trigger();
    if (!valid) return;
    setTesting(true);
    setTestResult(null);
    try {
      await setupApi.testRedis(form.getValues());
      setTestResult({ ok: true, msg: "Redis 连接成功 ✓" });
    } catch (error) {
      setTestResult({ ok: false, msg: error instanceof Error ? error.message : "连接失败" });
    } finally {
      setTesting(false);
    }
  }

  return (
    <form
      className="auth-form"
      onSubmit={form.handleSubmit((values) => {
        if (!testResult?.ok) {
          setTestResult({ ok: false, msg: "请先测试连接" });
          return;
        }
        onComplete(values);
      })}
    >
      <div className="form-grid two-columns">
        <label className="form-field">
          <span>主机地址</span>
          <input {...form.register("host")} placeholder="127.0.0.1" />
          <em>{form.formState.errors.host?.message}</em>
        </label>
        <label className="form-field">
          <span>端口</span>
          <input {...form.register("port", { valueAsNumber: true })} placeholder="6379" type="number" />
          <em>{form.formState.errors.port?.message}</em>
        </label>
      </div>
      <div className="form-grid two-columns">
        <label className="form-field">
          <span>密码（可选）</span>
          <input {...form.register("password")} placeholder="Redis 密码" type="password" />
          <em>{form.formState.errors.password?.message}</em>
        </label>
        <label className="form-field">
          <span>数据库编号</span>
          <input {...form.register("db", { valueAsNumber: true })} max={15} min={0} placeholder="0" type="number" />
          <em>{form.formState.errors.db?.message}</em>
        </label>
      </div>

      {testResult && (
        <div className={testResult.ok ? "inline-feedback" : "inline-feedback error"}>{testResult.msg}</div>
      )}

      <div style={{ display: "flex", gap: 12 }}>
        <button className="soft-link" onClick={onBack} type="button">
          上一步
        </button>
        <button className="soft-link" disabled={testing} onClick={handleTest} type="button">
          {testing ? "测试中..." : "测试连接"}
        </button>
        <button className="primary-action" style={{ flex: 1 }} type="submit">
          下一步
        </button>
      </div>
    </form>
  );
}

// ─── 管理员步骤 ───

function AdminStep({
  installing,
  installError,
  onBack,
  onComplete,
}: {
  installing: boolean;
  installError: string;
  onBack: () => void;
  onComplete: (values: AdminFormValues) => void;
}) {
  const form = useForm<AdminFormValues>({
    defaultValues: {
      username: "admin",
      password: "",
      confirmPassword: "",
      email: "",
      phone: "",
    },
    resolver: zodResolver(adminSchema),
  });

  return (
    <form className="auth-form" onSubmit={form.handleSubmit(onComplete)}>
      <label className="form-field">
        <span>管理员用户名</span>
        <input {...form.register("username")} placeholder="admin" />
        <em>{form.formState.errors.username?.message}</em>
      </label>
      <div className="form-grid two-columns">
        <label className="form-field">
          <span>密码</span>
          <input {...form.register("password")} placeholder="至少 6 位" type="password" />
          <em>{form.formState.errors.password?.message}</em>
        </label>
        <label className="form-field">
          <span>确认密码</span>
          <input {...form.register("confirmPassword")} placeholder="再次输入密码" type="password" />
          <em>{form.formState.errors.confirmPassword?.message}</em>
        </label>
      </div>
      <div className="form-grid two-columns">
        <label className="form-field">
          <span>邮箱（可选）</span>
          <input {...form.register("email")} placeholder="admin@example.com" type="email" />
          <em>{form.formState.errors.email?.message}</em>
        </label>
        <label className="form-field">
          <span>手机号（可选）</span>
          <input {...form.register("phone")} placeholder="手机号码" />
          <em>{form.formState.errors.phone?.message}</em>
        </label>
      </div>

      {installError && <div className="auth-error">{installError}</div>}

      <div style={{ display: "flex", gap: 12 }}>
        <button className="soft-link" disabled={installing} onClick={onBack} type="button">
          上一步
        </button>
        <button className="primary-action" disabled={installing} style={{ flex: 1 }} type="submit">
          {installing ? "正在安装..." : "开始安装"}
        </button>
      </div>
    </form>
  );
}

// ─── 完成步骤 ───

function CompleteStep({ hint }: { hint: string }) {
  return (
    <div style={{ textAlign: "center", padding: "32px 0" }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>✓</div>
      <h2 style={{ margin: "0 0 12px", fontFamily: "var(--font-display)" }}>安装完成</h2>
      <p style={{ color: "var(--color-muted)" }}>系统正在重启中，请稍候...</p>
      <p style={{ color: "var(--color-muted)", fontSize: 13 }}>重启完成后将自动跳转到登录页面。</p>
      {hint ? <p className="auth-error">{hint}</p> : null}
    </div>
  );
}

// ─── 工具函数 ───

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function waitForSetupCompletion(
  getStatus: () => Promise<SetupStatus>,
  options: {
    maxAttempts?: number;
    delayMs?: number;
    sleepFn?: (ms: number) => Promise<void>;
  } = {},
) {
  const { maxAttempts = 30, delayMs = 2000, sleepFn = sleep } = options;

  for (let i = 0; i < maxAttempts; i += 1) {
    await sleepFn(delayMs);
    try {
      const status = await getStatus();
      if (!status.needs_setup) {
        return true;
      }
    } catch {
      // 服务重启中，连接可能会失败，继续轮询
    }
  }

  return false;
}
