import { useState } from "react";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import {
  AsyncActionButton,
  AuthLayout,
  Button,
  FormActions,
  FormField,
  InlineNotice,
  Input,
  WizardLayout,
} from "@suiyuan/ui-admin";
import type { SetupApi } from "@suiyuan/api";

const dbSchema = z.object({
  host: z.string().min(1, "请输入主机地址"),
  port: z.number().min(1).max(65535, "端口范围 1-65535"),
  user: z.string().min(1, "请输入用户名"),
  password: z.string(),
  dbname: z.string().min(1, "请输入数据库名"),
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

const STEPS = ["database", "redis", "admin", "complete"] as const;
type Step = (typeof STEPS)[number];

const STEP_LABELS: Record<Step, string> = {
  database: "数据库配置",
  redis: "Redis 配置",
  admin: "管理员账号",
  complete: "安装完成",
};

type SetupWizardPageProps = {
  initialStatus: SetupStatus;
  setupApi: SetupApi;
  onComplete: () => void;
};

type SetupStatus = Awaited<ReturnType<SetupApi["getStatus"]>>;

export function SetupWizardPage({ initialStatus, setupApi, onComplete }: SetupWizardPageProps) {
  const defaults = initialStatus.defaults;
  const [currentStep, setCurrentStep] = useState<Step>("database");
  const [dbValues, setDbValues] = useState<DBFormValues | null>(() => defaults.database);
  const [redisValues, setRedisValues] = useState<RedisFormValues | null>(() => defaults.redis);
  const [installing, setInstalling] = useState(false);
  const [installError, setInstallError] = useState("");
  const [completionHint, setCompletionHint] = useState("");

  const stepIndex = STEPS.indexOf(currentStep);
  const environmentLabel = getEnvironmentLabel(defaults.environment);

  async function handleAdminComplete(values: AdminFormValues) {
    if (!dbValues || !redisValues) {
      return;
    }

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
    <AuthLayout
      aside={
        <div className="grid max-w-xl gap-4 rounded-[2rem] border border-border/70 bg-card/80 p-6 shadow-[var(--shadow-card)]">
          <p className="text-sm font-semibold text-foreground">初始化说明</p>
          <div className="space-y-2 text-sm leading-7 text-muted-foreground">
            <p>已按当前{environmentLabel}预填连接参数，你可以直接测试，也可以按实际部署环境修改。</p>
            <p>安装成功后系统会自动重启，页面会在探测到安装完成后跳回登录态。</p>
          </div>
        </div>
      }
      description="首次使用需要配置数据库和 Redis 连接，并创建管理员账号。所有步骤都已切换到统一向导组件。"
      kicker="Setup Wizard"
      title="系统初始化配置"
    >
      <WizardLayout
        currentStep={stepIndex}
        description={`步骤 ${stepIndex + 1} / ${STEPS.length}：${STEP_LABELS[currentStep]}`}
        steps={STEPS.map((step) => ({ label: STEP_LABELS[step] }))}
        title="安装向导"
      >
        {currentStep === "database" ? (
          <DatabaseStep defaultValues={dbValues} onComplete={(values) => {
            setDbValues(values);
            setCurrentStep("redis");
          }} setupApi={setupApi} />
        ) : null}
        {currentStep === "redis" ? (
          <RedisStep
            defaultValues={redisValues}
            onBack={() => setCurrentStep("database")}
            onComplete={(values) => {
              setRedisValues(values);
              setCurrentStep("admin");
            }}
            setupApi={setupApi}
          />
        ) : null}
        {currentStep === "admin" ? (
          <AdminStep
            defaultValues={defaults.admin}
            installError={installError}
            installing={installing}
            onBack={() => setCurrentStep("redis")}
            onComplete={handleAdminComplete}
          />
        ) : null}
        {currentStep === "complete" ? <CompleteStep hint={completionHint} /> : null}
      </WizardLayout>
    </AuthLayout>
  );
}

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
    },
    resolver: zodResolver(dbSchema),
  });

  async function handleTest() {
    const valid = await form.trigger();
    if (!valid) {
      return;
    }
    setTesting(true);
    setTestResult(null);
    try {
      await setupApi.testDatabase(form.getValues());
      setTestResult({ ok: true, msg: "数据库连接成功" });
    } catch (error) {
      setTestResult({ ok: false, msg: error instanceof Error ? error.message : "连接失败" });
    } finally {
      setTesting(false);
    }
  }

  return (
    <form
      className="grid gap-5"
      onSubmit={form.handleSubmit((values) => {
        if (!testResult?.ok) {
          setTestResult({ ok: false, msg: "请先测试连接" });
          return;
        }
        onComplete(values);
      })}
    >
      <div className="grid gap-4 md:grid-cols-2">
        <FormField error={form.formState.errors.host?.message} label="主机地址">
          <Input {...form.register("host")} placeholder="127.0.0.1" />
        </FormField>
        <FormField error={form.formState.errors.port?.message} label="端口">
          <Input {...form.register("port", { valueAsNumber: true })} placeholder="5432" type="number" />
        </FormField>
        <FormField error={form.formState.errors.user?.message} label="用户名">
          <Input {...form.register("user")} placeholder="postgres" />
        </FormField>
        <FormField error={form.formState.errors.password?.message} label="密码">
          <Input {...form.register("password")} placeholder="数据库密码" type="password" />
        </FormField>
      </div>
      <FormField error={form.formState.errors.dbname?.message} label="数据库名">
        <Input {...form.register("dbname")} placeholder="go_admin" />
      </FormField>
      {testResult ? <InlineNotice tone={testResult.ok ? "success" : "danger"}>{testResult.msg}</InlineNotice> : null}
      <FormActions>
        <Button disabled={testing} onClick={() => void handleTest()} type="button" variant="outline">
          {testing ? "测试中..." : "测试连接"}
        </Button>
        <Button type="submit">下一步</Button>
      </FormActions>
    </form>
  );
}

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
    if (!valid) {
      return;
    }
    setTesting(true);
    setTestResult(null);
    try {
      await setupApi.testRedis(form.getValues());
      setTestResult({ ok: true, msg: "Redis 连接成功" });
    } catch (error) {
      setTestResult({ ok: false, msg: error instanceof Error ? error.message : "连接失败" });
    } finally {
      setTesting(false);
    }
  }

  return (
    <form
      className="grid gap-5"
      onSubmit={form.handleSubmit((values) => {
        if (!testResult?.ok) {
          setTestResult({ ok: false, msg: "请先测试连接" });
          return;
        }
        onComplete(values);
      })}
    >
      <div className="grid gap-4 md:grid-cols-2">
        <FormField error={form.formState.errors.host?.message} label="主机地址">
          <Input {...form.register("host")} placeholder="127.0.0.1" />
        </FormField>
        <FormField error={form.formState.errors.port?.message} label="端口">
          <Input {...form.register("port", { valueAsNumber: true })} placeholder="6379" type="number" />
        </FormField>
        <FormField error={form.formState.errors.password?.message} label="密码（可选）">
          <Input {...form.register("password")} placeholder="Redis 密码" type="password" />
        </FormField>
        <FormField error={form.formState.errors.db?.message} label="数据库编号">
          <Input {...form.register("db", { valueAsNumber: true })} max={15} min={0} placeholder="0" type="number" />
        </FormField>
      </div>
      {testResult ? <InlineNotice tone={testResult.ok ? "success" : "danger"}>{testResult.msg}</InlineNotice> : null}
      <FormActions>
        <Button onClick={onBack} type="button" variant="ghost">
          上一步
        </Button>
        <Button disabled={testing} onClick={() => void handleTest()} type="button" variant="outline">
          {testing ? "测试中..." : "测试连接"}
        </Button>
        <Button type="submit">下一步</Button>
      </FormActions>
    </form>
  );
}

function AdminStep({
  defaultValues,
  installing,
  installError,
  onBack,
  onComplete,
}: {
  defaultValues: Pick<AdminFormValues, "username" | "email" | "phone">;
  installing: boolean;
  installError: string;
  onBack: () => void;
  onComplete: (values: AdminFormValues) => void;
}) {
  const form = useForm<AdminFormValues>({
    defaultValues: {
      username: defaultValues.username || "admin",
      password: "",
      confirmPassword: "",
      email: defaultValues.email || "",
      phone: defaultValues.phone || "",
    },
    resolver: zodResolver(adminSchema),
  });

  return (
    <form className="grid gap-5" onSubmit={form.handleSubmit(onComplete)}>
      <FormField error={form.formState.errors.username?.message} label="管理员用户名">
        <Input {...form.register("username")} placeholder="admin" />
      </FormField>
      <div className="grid gap-4 md:grid-cols-2">
        <FormField error={form.formState.errors.password?.message} label="密码">
          <Input {...form.register("password")} placeholder="至少 6 位" type="password" />
        </FormField>
        <FormField error={form.formState.errors.confirmPassword?.message} label="确认密码">
          <Input {...form.register("confirmPassword")} placeholder="再次输入密码" type="password" />
        </FormField>
        <FormField error={form.formState.errors.email?.message} label="邮箱（可选）">
          <Input {...form.register("email")} placeholder="admin@example.com" type="email" />
        </FormField>
        <FormField error={form.formState.errors.phone?.message} label="手机号（可选）">
          <Input {...form.register("phone")} placeholder="手机号码" />
        </FormField>
      </div>
      {installError ? <InlineNotice tone="danger">{installError}</InlineNotice> : null}
      <FormActions>
        <Button disabled={installing} onClick={onBack} type="button" variant="ghost">
          上一步
        </Button>
        <AsyncActionButton loading={installing} loadingLabel="正在安装..." type="submit">
          开始安装
        </AsyncActionButton>
      </FormActions>
    </form>
  );
}

function CompleteStep({ hint }: { hint: string }) {
  return (
    <div className="grid gap-4 py-6 text-center">
      <div className="text-5xl text-primary">✓</div>
      <div className="space-y-2">
        <h2 className="text-2xl font-semibold text-foreground">安装完成</h2>
        <p className="text-sm leading-7 text-muted-foreground">系统正在重启中，请稍候。重启完成后将自动跳转到登录页面。</p>
      </div>
      {hint ? <InlineNotice tone="warning">{hint}</InlineNotice> : null}
    </div>
  );
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getEnvironmentLabel(environment: string) {
  switch (environment) {
    case "prod":
      return "生产环境";
    case "test":
      return "测试环境";
    default:
      return "开发环境";
  }
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
