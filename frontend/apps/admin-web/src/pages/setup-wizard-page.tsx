import { useState } from "react";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import { useI18n } from "@suiyuan/i18n";
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

function createDbSchema(t: ReturnType<typeof useI18n>["t"]) {
  return z.object({
    host: z.string().min(1, t("admin.setup.db.host.required")),
    port: z.number().min(1).max(65535, t("admin.setup.db.port.invalid")),
    user: z.string().min(1, t("admin.setup.db.user.required")),
    password: z.string(),
    dbname: z.string().min(1, t("admin.setup.db.dbname.required")),
  });
}

function createRedisSchema(t: ReturnType<typeof useI18n>["t"]) {
  return z.object({
    host: z.string().min(1, t("admin.setup.redis.host.required")),
    port: z.number().min(1).max(65535, t("admin.setup.redis.port.invalid")),
    password: z.string(),
    db: z.number().min(0).max(15, t("admin.setup.redis.db.invalid")),
  });
}

function createAdminSchema(t: ReturnType<typeof useI18n>["t"]) {
  return z
    .object({
      username: z.string().min(1, t("admin.setup.admin.username.required")),
      password: z.string().min(6, t("admin.setup.admin.password.min")),
      confirmPassword: z.string().min(6, t("admin.setup.admin.confirm.required")),
      email: z.string().email(t("admin.setup.admin.email.invalid")).or(z.literal("")),
      phone: z.string(),
    })
    .refine((data) => data.password === data.confirmPassword, {
      message: t("admin.setup.schema.confirmMismatch"),
      path: ["confirmPassword"],
    });
}

const STEPS = ["database", "redis", "admin", "complete"] as const;
type Step = (typeof STEPS)[number];

type SetupStepLabels = Record<Step, string>;

function getStepLabels(t: ReturnType<typeof useI18n>["t"]): SetupStepLabels {
  return {
    database: t("admin.setup.db.step"),
    redis: t("admin.setup.redis.step"),
    admin: t("admin.setup.admin.step"),
    complete: t("admin.setup.complete.step"),
  };
}

type DBFormValues = z.infer<ReturnType<typeof createDbSchema>>;
type RedisFormValues = z.infer<ReturnType<typeof createRedisSchema>>;
type AdminFormValues = z.infer<ReturnType<typeof createAdminSchema>>;

type SetupWizardPageProps = {
  initialStatus: SetupStatus;
  setupApi: SetupApi;
  onComplete: () => void;
};

type SetupStatus = Awaited<ReturnType<SetupApi["getStatus"]>>;

export function SetupWizardPage({ initialStatus, setupApi, onComplete }: SetupWizardPageProps) {
  const { t } = useI18n();
  const defaults = initialStatus.defaults;
  const [currentStep, setCurrentStep] = useState<Step>("database");
  const [dbValues, setDbValues] = useState<DBFormValues | null>(() => defaults.database);
  const [redisValues, setRedisValues] = useState<RedisFormValues | null>(() => defaults.redis);
  const [installing, setInstalling] = useState(false);
  const [installError, setInstallError] = useState("");
  const [completionHint, setCompletionHint] = useState("");

  const stepLabels = getStepLabels(t);
  const stepIndex = STEPS.indexOf(currentStep);
  const environmentLabel = getEnvironmentLabel(defaults.environment, t);

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

      setCompletionHint(t("admin.setup.hint"));
    } catch (error) {
      setInstallError(error instanceof Error ? error.message : t("admin.setup.fallbackError"));
    } finally {
      setInstalling(false);
    }
  }

  return (
    <AuthLayout
      aside={
        <div className="grid max-w-xl gap-4 rounded-[2rem] border border-border/70 bg-card/80 p-6 shadow-[var(--shadow-card)]">
          <p className="text-sm font-semibold text-foreground">{t("admin.setup.summary.title")}</p>
          <div className="space-y-2 text-sm leading-7 text-muted-foreground">
            <p>{t("admin.setup.summary.description", undefined, { environment: environmentLabel })}</p>
            <p>{t("admin.setup.summary.note")}</p>
          </div>
        </div>
      }
      description={t("admin.setup.description")}
      kicker="Setup Wizard"
      title={t("admin.setup.title")}
    >
      <WizardLayout
        currentStep={stepIndex}
        description={t("admin.setup.step.description", undefined, { current: stepIndex + 1, total: STEPS.length, label: stepLabels[currentStep] })}
        steps={STEPS.map((step) => ({ label: stepLabels[step] }))}
        title={t("admin.setup.layout.title")}
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
  const { t } = useI18n();
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
    resolver: zodResolver(createDbSchema(t)),
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
      setTestResult({ ok: true, msg: t("admin.setup.db.success") });
    } catch (error) {
      setTestResult({ ok: false, msg: error instanceof Error ? error.message : t("admin.setup.testFailed") });
    } finally {
      setTesting(false);
    }
  }

  return (
    <form
      className="grid gap-5"
      onSubmit={form.handleSubmit((values) => {
        if (!testResult?.ok) {
          setTestResult({ ok: false, msg: t("admin.setup.step.testFirst") });
          return;
        }
        onComplete(values);
      })}
    >
      <div className="grid gap-4 md:grid-cols-2">
        <FormField error={form.formState.errors.host?.message} label={t("admin.setup.db.host.label")}>
          <Input {...form.register("host")} placeholder="127.0.0.1" />
        </FormField>
        <FormField error={form.formState.errors.port?.message} label={t("admin.setup.db.port.label")}>
          <Input {...form.register("port", { valueAsNumber: true })} placeholder="5432" type="number" />
        </FormField>
        <FormField error={form.formState.errors.user?.message} label={t("admin.setup.db.user.label")}>
          <Input {...form.register("user")} placeholder={t("admin.setup.db.user.placeholder")} />
        </FormField>
        <FormField error={form.formState.errors.password?.message} label={t("admin.setup.db.password.label")}>
          <Input {...form.register("password")} placeholder={t("admin.setup.db.password.placeholder")} type="password" />
        </FormField>
      </div>
      <FormField error={form.formState.errors.dbname?.message} label={t("admin.setup.db.dbname.label")}>
        <Input {...form.register("dbname")} placeholder={t("admin.setup.db.dbname.placeholder")} />
      </FormField>
      {testResult ? <InlineNotice tone={testResult.ok ? "success" : "danger"}>{testResult.msg}</InlineNotice> : null}
      <FormActions>
        <Button disabled={testing} onClick={() => void handleTest()} type="button" variant="outline">
          {testing ? t("admin.setup.db.testing") : t("admin.setup.db.test")}
        </Button>
        <Button type="submit">{t("admin.setup.next")}</Button>
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
  const { t } = useI18n();
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; msg: string } | null>(null);

  const form = useForm<RedisFormValues>({
    defaultValues: defaultValues ?? {
      host: "127.0.0.1",
      port: 6379,
      password: "",
      db: 0,
    },
    resolver: zodResolver(createRedisSchema(t)),
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
      setTestResult({ ok: true, msg: t("admin.setup.redis.success") });
    } catch (error) {
      setTestResult({ ok: false, msg: error instanceof Error ? error.message : t("admin.setup.testFailed") });
    } finally {
      setTesting(false);
    }
  }

  return (
    <form
      className="grid gap-5"
      onSubmit={form.handleSubmit((values) => {
        if (!testResult?.ok) {
          setTestResult({ ok: false, msg: t("admin.setup.step.testFirst") });
          return;
        }
        onComplete(values);
      })}
    >
      <div className="grid gap-4 md:grid-cols-2">
        <FormField error={form.formState.errors.host?.message} label={t("admin.setup.redis.host.label")}>
          <Input {...form.register("host")} placeholder="127.0.0.1" />
        </FormField>
        <FormField error={form.formState.errors.port?.message} label={t("admin.setup.redis.port.label")}>
          <Input {...form.register("port", { valueAsNumber: true })} placeholder="6379" type="number" />
        </FormField>
        <FormField error={form.formState.errors.password?.message} label={t("admin.setup.redis.password.label")}>
          <Input {...form.register("password")} placeholder={t("admin.setup.redis.password.placeholder")} type="password" />
        </FormField>
        <FormField error={form.formState.errors.db?.message} label={t("admin.setup.redis.db.label")}>
          <Input {...form.register("db", { valueAsNumber: true })} max={15} min={0} placeholder="0" type="number" />
        </FormField>
      </div>
      {testResult ? <InlineNotice tone={testResult.ok ? "success" : "danger"}>{testResult.msg}</InlineNotice> : null}
      <FormActions>
        <Button onClick={onBack} type="button" variant="ghost">
          {t("admin.setup.back")}
        </Button>
        <Button disabled={testing} onClick={() => void handleTest()} type="button" variant="outline">
          {testing ? t("admin.setup.db.testing") : t("admin.setup.db.test")}
        </Button>
        <Button type="submit">{t("admin.setup.next")}</Button>
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
  const { t } = useI18n();
  const form = useForm<AdminFormValues>({
    defaultValues: {
      username: defaultValues.username || "admin",
      password: "",
      confirmPassword: "",
      email: defaultValues.email || "",
      phone: defaultValues.phone || "",
    },
    resolver: zodResolver(createAdminSchema(t)),
  });

  return (
    <form className="grid gap-5" onSubmit={form.handleSubmit(onComplete)}>
      <FormField error={form.formState.errors.username?.message} label={t("admin.setup.admin.username.label")}>
        <Input {...form.register("username")} placeholder="admin" />
      </FormField>
      <div className="grid gap-4 md:grid-cols-2">
        <FormField error={form.formState.errors.password?.message} label={t("admin.setup.admin.password.label")}>
          <Input {...form.register("password")} placeholder={t("admin.setup.admin.password.placeholder")} type="password" />
        </FormField>
        <FormField error={form.formState.errors.confirmPassword?.message} label={t("admin.setup.admin.confirm.label")}>
          <Input {...form.register("confirmPassword")} placeholder={t("admin.setup.admin.confirm.placeholder")} type="password" />
        </FormField>
        <FormField error={form.formState.errors.email?.message} label={t("admin.setup.admin.email.label")}>
          <Input {...form.register("email")} placeholder={t("admin.setup.admin.email.placeholder")} type="email" />
        </FormField>
        <FormField error={form.formState.errors.phone?.message} label={t("admin.setup.admin.phone.label")}>
          <Input {...form.register("phone")} placeholder={t("admin.setup.admin.phone.placeholder")} />
        </FormField>
      </div>
      {installError ? <InlineNotice tone="danger">{installError}</InlineNotice> : null}
      <FormActions>
        <Button disabled={installing} onClick={onBack} type="button" variant="ghost">
          {t("admin.setup.back")}
        </Button>
        <AsyncActionButton loading={installing} loadingLabel={t("admin.setup.installing")} type="submit">
          {t("admin.setup.install")}
        </AsyncActionButton>
      </FormActions>
    </form>
  );
}

function CompleteStep({ hint }: { hint: string }) {
  const { t } = useI18n();

  return (
    <div className="grid gap-4 py-6 text-center">
      <div className="text-5xl text-primary">✓</div>
      <div className="space-y-2">
        <h2 className="text-2xl font-semibold text-foreground">{t("admin.setup.complete.title")}</h2>
        <p className="text-sm leading-7 text-muted-foreground">{t("admin.setup.complete.description")}</p>
      </div>
      {hint ? <InlineNotice tone="warning">{hint}</InlineNotice> : null}
    </div>
  );
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getEnvironmentLabel(environment: string, t: ReturnType<typeof useI18n>["t"]) {
  switch (environment) {
    case "prod":
      return t("admin.setup.environment.prod");
    case "test":
      return t("admin.setup.environment.test");
    default:
      return t("admin.setup.environment.dev");
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
