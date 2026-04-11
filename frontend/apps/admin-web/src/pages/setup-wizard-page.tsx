import { type ReactNode, useState } from "react";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import { useI18n } from "@go-admin/i18n";
import {
  AsyncActionButton,
  AuthLayout,
  Button,
  Card,
  CardContent,
  FormActions,
  FormField,
  InlineNotice,
  Input,
} from "@go-admin/ui-admin";
import { toUserFacingErrorMessage, type SetupApi } from "@go-admin/api";

function createDbSchema(t: ReturnType<typeof useI18n>["t"]) {
  return z.object({
    host: z.string().min(1, t("admin.setup.db.host.required")),
    port: z.number().min(1).max(65535, t("admin.setup.db.port.invalid")),
    user: z.string().min(1, t("admin.setup.db.user.required")),
    password: z.string(),
    dbname: z.string().min(1, t("admin.setup.db.dbname.required")),
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

const STEPS = ["database", "admin", "complete"] as const;
type Step = (typeof STEPS)[number];

type SetupStepLabels = Record<Step, string>;

function getStepLabels(t: ReturnType<typeof useI18n>["t"]): SetupStepLabels {
  return {
    database: t("admin.setup.db.step"),
    admin: t("admin.setup.admin.step"),
    complete: t("admin.setup.complete.step"),
  };
}

type DBFormValues = z.infer<ReturnType<typeof createDbSchema>>;
type AdminFormValues = z.infer<ReturnType<typeof createAdminSchema>>;

export type SetupCompletionPayload = {
  autoLogin: boolean;
  password: string;
  username: string;
};

type SetupWizardPageProps = {
  initialStatus: SetupStatus;
  setupApi: SetupApi;
  onComplete: (payload: SetupCompletionPayload) => Promise<void>;
};

type SetupStatus = Awaited<ReturnType<SetupApi["getStatus"]>>;

export function SetupWizardPage({ initialStatus, setupApi, onComplete }: SetupWizardPageProps) {
  const { t } = useI18n();
  const defaults = initialStatus.defaults;
  const [currentStep, setCurrentStep] = useState<Step>("database");
  const [dbValues, setDbValues] = useState<DBFormValues | null>(() => defaults.database);
  const [installing, setInstalling] = useState(false);
  const [installError, setInstallError] = useState("");
  const [completionHint, setCompletionHint] = useState("");

  const stepLabels = getStepLabels(t);
  const stepIndex = STEPS.indexOf(currentStep);
  const environmentLabel = getEnvironmentLabel(defaults.environment, t);

  async function handleAdminComplete(values: AdminFormValues) {
    if (!dbValues) {
      return;
    }
    if (!initialStatus.hasServerDefaults) {
      setInstallError(t("admin.setup.serverDefaultsMissing"));
      return;
    }

    setInstalling(true);
    setInstallError("");
    setCompletionHint("");
    try {
      await setupApi.install({
        environment: defaults.environment,
        database: dbValues,
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
        await onComplete({
          autoLogin: defaults.environment !== "prod",
          password: values.password,
          username: values.username,
        });
        return;
      }

      setCompletionHint(t("admin.setup.hint"));
    } catch (error) {
      setInstallError(toUserFacingErrorMessage(error, t("admin.setup.fallbackError")));
    } finally {
      setInstalling(false);
    }
  }

  return (
    <AuthLayout
      aside={<SetupAside defaults={defaults} environmentLabel={environmentLabel} />}
      description={t("admin.setup.description")}
      kicker={t("admin.setup.layout.title")}
      title={t("admin.setup.title")}
    >
      <SetupSurface
        currentStep={currentStep}
        defaults={defaults}
        environmentLabel={environmentLabel}
        hasServerDefaults={initialStatus.hasServerDefaults}
        stepLabels={stepLabels}
        stepStatusText={t("admin.setup.step.description", undefined, { current: stepIndex + 1, total: STEPS.length, label: stepLabels[currentStep] })}
      >
        {currentStep === "database" ? (
          <DatabaseStep defaultValues={dbValues} onComplete={(values) => {
            setDbValues(values);
            setCurrentStep("admin");
          }} setupApi={setupApi} />
        ) : null}
        {currentStep === "admin" ? (
          <AdminStep
            defaultValues={defaults.admin}
            installError={installError}
            installing={installing}
            onBack={() => setCurrentStep("database")}
            onComplete={handleAdminComplete}
          />
        ) : null}
        {currentStep === "complete" ? <CompleteStep hint={completionHint} /> : null}
      </SetupSurface>
    </AuthLayout>
  );
}

function SetupAside({
  defaults,
  environmentLabel,
}: {
  defaults: SetupStatus["defaults"];
  environmentLabel: string;
}) {
  const { t } = useI18n();

  return (
    <div className="grid gap-5">
      <div className="grid gap-4 rounded-[2rem] border border-border/70 bg-card/85 p-6 shadow-[var(--shadow-card)] backdrop-blur">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-muted-foreground">{t("admin.setup.aside.profile.kicker")}</p>
          <h2 className="text-2xl font-semibold tracking-tight text-foreground">{environmentLabel}</h2>
          <p className="text-sm leading-7 text-muted-foreground">{t("admin.setup.aside.profile.description")}</p>
        </div>
        <div className="grid gap-3 rounded-[1.5rem] border border-border/60 bg-background/80 p-4">
          <SetupFact label={t("admin.setup.fact.databaseAddress")} value={`${defaults.database.host}:${defaults.database.port}`} />
          <SetupFact label={t("admin.setup.fact.databaseName")} value={defaults.database.dbname} />
          <SetupFact label={t("admin.setup.fact.databaseUser")} value={defaults.database.user} />
          <SetupFact label={t("admin.setup.fact.adminUsername")} value={defaults.admin.username || "admin"} />
        </div>
      </div>
      <div className="grid gap-3 rounded-[2rem] border border-primary/12 bg-primary/6 p-6">
        <p className="text-sm font-semibold text-foreground">{t("admin.setup.aside.process.title")}</p>
        <div className="space-y-2 text-sm leading-7 text-muted-foreground">
          <p>1. {t("admin.setup.aside.process.first")}</p>
          <p>2. {t("admin.setup.aside.process.second")}</p>
          <p>3. {t("admin.setup.aside.process.third")}</p>
        </div>
      </div>
    </div>
  );
}

function SetupSurface({
  children,
  currentStep,
  defaults,
  environmentLabel,
  hasServerDefaults,
  stepLabels,
  stepStatusText,
}: {
  children: ReactNode;
  currentStep: Step;
  defaults: SetupStatus["defaults"];
  environmentLabel: string;
  hasServerDefaults: boolean;
  stepLabels: SetupStepLabels;
  stepStatusText: string;
}) {
  const { t } = useI18n();
  const currentIndex = STEPS.indexOf(currentStep);

  return (
    <Card className="w-full max-w-3xl overflow-hidden border-border/70 bg-card/95 shadow-[var(--shadow-card)]">
      <CardContent className="grid gap-0 p-0">
        <div className="relative overflow-hidden border-b border-border/70 bg-[radial-gradient(circle_at_top_left,rgba(47,84,235,0.14),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(16,185,129,0.12),transparent_30%)] px-6 py-6 md:px-8 md:py-7">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/45 to-transparent" />
          <div className="grid gap-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-muted-foreground">{t("admin.setup.surface.kicker")}</p>
                <div className="space-y-1">
                  <h2 className="text-2xl font-semibold tracking-tight text-foreground">{stepLabels[currentStep]}</h2>
                  <p className="text-sm leading-6 text-muted-foreground">{stepStatusText}</p>
                </div>
              </div>
              <div className="inline-flex items-center rounded-full border border-border/70 bg-background/85 px-3 py-1.5 text-xs font-medium text-foreground shadow-sm">
                {t("admin.setup.surface.environment", undefined, { environment: environmentLabel })}
              </div>
            </div>
            <SetupStepRail currentIndex={currentIndex} stepLabels={stepLabels} />
            {!hasServerDefaults ? (
              <InlineNotice title={t("admin.setup.notice.serverDefaultsMissing.title")} type="warning">
                {t("admin.setup.notice.serverDefaultsMissing.description")}
              </InlineNotice>
            ) : null}
            <div className="grid gap-3 rounded-[1.5rem] border border-border/60 bg-background/75 p-4 lg:hidden">
              <SetupFact label={t("admin.setup.fact.databaseAddress")} value={`${defaults.database.host}:${defaults.database.port}`} />
              <SetupFact label={t("admin.setup.fact.databaseName")} value={defaults.database.dbname} />
              <SetupFact label={t("admin.setup.fact.adminUsername")} value={defaults.admin.username || "admin"} />
            </div>
          </div>
        </div>
        <div className="px-6 py-6 md:px-8 md:py-8">{children}</div>
      </CardContent>
    </Card>
  );
}

function SetupStepRail({
  currentIndex,
  stepLabels,
}: {
  currentIndex: number;
  stepLabels: SetupStepLabels;
}) {
  const { t } = useI18n();

  return (
    <div className="grid gap-4">
      <div className="grid grid-cols-[repeat(var(--step-count),minmax(0,1fr))] gap-2" style={{ ["--step-count" as string]: String(STEPS.length) }}>
        {STEPS.map((step, index) => (
          <div className="grid gap-2" key={step}>
            <div className={`h-1.5 rounded-full transition-colors ${index <= currentIndex ? "bg-primary" : "bg-secondary"}`} />
          </div>
        ))}
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        {STEPS.map((step, index) => {
          const completed = index < currentIndex;
          const active = index === currentIndex;

          return (
            <div
              className={[
                "grid gap-2 rounded-[1.25rem] border px-4 py-3 transition-colors",
                active ? "border-primary/30 bg-primary/10" : completed ? "border-emerald-500/20 bg-emerald-500/10" : "border-border/70 bg-secondary/20",
              ].join(" ")}
              key={step}
            >
              <div className="flex items-center gap-3">
                <span
                  className={[
                    "inline-flex h-7 w-7 items-center justify-center rounded-full border text-xs font-semibold",
                    active
                      ? "border-primary/30 bg-primary text-primary-foreground"
                      : completed
                        ? "border-emerald-500/30 bg-emerald-600 text-white"
                        : "border-border bg-background text-muted-foreground",
                  ].join(" ")}
                >
                  {completed ? "✓" : index + 1}
                </span>
                <p className="text-sm font-semibold text-foreground">{stepLabels[step]}</p>
              </div>
              <p className="text-xs leading-6 text-muted-foreground">
                {step === "database"
                  ? t("admin.setup.rail.database")
                  : step === "admin"
                    ? t("admin.setup.rail.admin")
                    : t("admin.setup.rail.complete")}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SetupFact({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-border/50 pb-3 text-sm last:border-b-0 last:pb-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium text-foreground">{value}</span>
    </div>
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
      setTestResult({ ok: false, msg: toUserFacingErrorMessage(error, t("admin.setup.testFailed")) });
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
    <div className="grid gap-6 py-4">
      <div className="mx-auto inline-flex h-16 w-16 items-center justify-center rounded-full border border-emerald-500/20 bg-emerald-500/12 text-3xl font-semibold text-emerald-700 dark:text-emerald-300">
        ✓
      </div>
      <div className="space-y-3 text-center">
        <h2 className="text-2xl font-semibold text-foreground">{t("admin.setup.complete.title")}</h2>
        <p className="text-sm leading-7 text-muted-foreground">{t("admin.setup.complete.description")}</p>
      </div>
      <div className="grid gap-3 rounded-[1.5rem] border border-border/70 bg-secondary/20 p-4 text-sm leading-7 text-muted-foreground">
        <p>{t("admin.setup.complete.note.restart")}</p>
        <p>{t("admin.setup.complete.note.followup")}</p>
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
