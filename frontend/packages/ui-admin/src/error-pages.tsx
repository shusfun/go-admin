import { Compass, RefreshCcw, Search } from "lucide-react";
import type { HTMLAttributes, ReactNode } from "react";

import notFoundIllustration from "../../svgs/oops-404-error-with-a-broken-robot-animate.svg";
import serverErrorIllustration from "../../svgs/500-internal-server-error-animate.svg";
import { cn } from "./lib/utils";
import { Badge } from "./primitives";

export type ErrorPageProps = Omit<HTMLAttributes<HTMLDivElement>, "title"> & {
  action?: ReactNode;
  badge?: ReactNode;
  code?: ReactNode;
  compact?: boolean;
  description?: ReactNode;
  footer?: ReactNode;
  illustrationAlt: string;
  illustrationClassName?: string;
  illustrationSrc: string;
  secondaryAction?: ReactNode;
  title?: ReactNode;
};

type ErrorVariantProps = Omit<ErrorPageProps, "illustrationAlt" | "illustrationSrc">;

const default404Badge = (
  <Badge effect="light" tone="warning">
    <Search className="mr-1 h-3.5 w-3.5" />
    地址失效
  </Badge>
);

const default404Footer = (
  <div className="grid gap-2">
    <div className="text-sm font-semibold text-foreground">建议下一步</div>
    <div className="text-sm leading-7 text-muted-foreground">优先给用户一个明确去向，比如返回首页、回到上一级或直接重新搜索。</div>
  </div>
);

const default500Badge = (
  <Badge effect="light" tone="danger">
    <RefreshCcw className="mr-1 h-3.5 w-3.5" />
    服务异常
  </Badge>
);

const default500Footer = (
  <div className="grid gap-2">
    <div className="text-sm font-semibold text-foreground">排查建议</div>
    <div className="text-sm leading-7 text-muted-foreground">界面层至少保留重试入口；如果有监控或工单系统，也应该提供一个明确的查看路径。</div>
  </div>
);

// 仅在调用方未传值时回退默认内容；显式传入 null 应视为覆盖默认值。
function withDefault<T>(value: T | undefined, fallback: T) {
  return value !== undefined ? value : fallback;
}

function ErrorPage({
  action,
  badge,
  className,
  code,
  compact = false,
  description,
  footer,
  illustrationAlt,
  illustrationClassName,
  illustrationSrc,
  secondaryAction,
  title,
  ...props
}: ErrorPageProps) {
  return (
    <section
      className={cn(
        "relative overflow-hidden bg-[linear-gradient(160deg,hsl(var(--background))_0%,color-mix(in_srgb,hsl(var(--card))_88%,white)_42%,color-mix(in_srgb,hsl(var(--primary))_10%,hsl(var(--card)))_100%)] text-foreground dark:bg-[linear-gradient(160deg,color-mix(in_srgb,hsl(var(--background))_92%,#020617)_0%,color-mix(in_srgb,hsl(var(--card))_72%,#020617)_46%,color-mix(in_srgb,hsl(var(--primary))_24%,#020617)_100%)]",
        compact ? "min-h-0 rounded-[2rem] border border-border/70 shadow-[0_24px_80px_-48px_rgba(15,23,42,0.55)]" : "h-full min-h-full rounded-none border-0 shadow-none",
        className,
      )}
      {...props}
    >
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-[-12%] top-[-18%] h-64 w-64 rounded-full bg-primary/12 blur-3xl dark:bg-primary/18" />
        <div className="absolute bottom-[-14%] right-[-10%] h-72 w-72 rounded-full bg-amber-500/12 blur-3xl dark:bg-amber-400/14" />
        <div className="absolute inset-x-8 top-8 h-px bg-gradient-to-r from-transparent via-border/80 to-transparent" />
      </div>

      <div
        className={cn(
          "relative grid gap-8 px-6 py-6 md:gap-10 md:px-8 md:py-8",
          compact
            ? "xl:grid-cols-[minmax(0,0.95fr)_minmax(20rem,1.05fr)] xl:items-center"
            : "min-h-full content-center lg:grid-cols-[minmax(0,0.94fr)_minmax(22rem,1.06fr)] lg:items-center lg:px-10 lg:py-10 xl:grid-cols-[minmax(0,0.88fr)_minmax(26rem,1.12fr)] xl:px-12 xl:py-12",
        )}
      >
        <div className="min-w-0 grid gap-6">
          <div className="flex flex-wrap items-center gap-3">
            {badge}
            {code ? (
              <span className="inline-flex items-center rounded-full border border-primary/18 bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-primary">
                {code}
              </span>
            ) : null}
          </div>

          <div className="grid gap-4">
            {title ? <h1 className="max-w-[14ch] text-3xl font-semibold tracking-tight text-balance text-foreground md:text-5xl">{title}</h1> : null}
            {description ? <div className="max-w-2xl text-sm leading-7 text-muted-foreground md:text-base md:leading-8">{description}</div> : null}
          </div>

          {action || secondaryAction ? (
            <div className="flex flex-wrap items-center gap-3">
              {action}
              {secondaryAction}
            </div>
          ) : null}

          {footer ? (
            <div className="grid gap-3 rounded-[1.5rem] border border-border/70 bg-background/70 px-4 py-4 backdrop-blur dark:bg-background/35">
              {footer}
            </div>
          ) : null}
        </div>

        <div
          className={cn(
            "relative flex min-w-0 items-center justify-center",
            compact ? "min-h-[20rem]" : "min-h-[16rem] sm:min-h-[20rem] lg:min-h-[22rem] xl:min-h-[30rem]",
          )}
        >
          <div className="absolute inset-0 rounded-[2rem] border border-white/35 bg-white/55 shadow-inner dark:border-white/10 dark:bg-white/5" />
          <div className="absolute inset-x-6 top-6 h-px bg-gradient-to-r from-transparent via-white/75 to-transparent dark:via-white/20" />
          <img
            alt={illustrationAlt}
            className={cn(
              "relative z-10 max-h-[20rem] w-full max-w-[34rem] object-contain drop-shadow-[0_20px_60px_rgba(15,23,42,0.16)] dark:brightness-110 dark:contrast-110 dark:drop-shadow-[0_28px_80px_rgba(2,6,23,0.72)]",
              compact ? "md:max-h-[22rem]" : "md:max-h-[24rem] xl:max-h-[30rem]",
              illustrationClassName,
            )}
            draggable={false}
            src={illustrationSrc}
          />
        </div>
      </div>
    </section>
  );
}

export function Error404({
  action,
  badge,
  compact,
  code,
  description,
  footer,
  secondaryAction,
  title,
  ...props
}: ErrorVariantProps) {
  return (
    <ErrorPage
      action={action}
      badge={withDefault(badge, default404Badge)}
      code={withDefault(code, "404")}
      compact={withDefault(compact, false)}
      description={withDefault(description, "当前地址不存在，可能已经迁移、删除，或者你输入了一个过期链接。")}
      footer={withDefault(footer, default404Footer)}
      illustrationAlt="404 页面未找到插画"
      illustrationSrc={notFoundIllustration}
      secondaryAction={secondaryAction}
      title={withDefault(title, "页面没有找到")}
      {...props}
    />
  );
}

export function Error500({
  action,
  badge,
  compact,
  code,
  description,
  footer,
  secondaryAction,
  title,
  ...props
}: ErrorVariantProps) {
  return (
    <ErrorPage
      action={action}
      badge={withDefault(badge, default500Badge)}
      code={withDefault(code, "500")}
      compact={withDefault(compact, false)}
      description={withDefault(description, "服务暂时不可用，问题通常来自请求链路、依赖服务或后端内部异常。")}
      footer={withDefault(footer, default500Footer)}
      illustrationAlt="500 服务异常插画"
      illustrationSrc={serverErrorIllustration}
      secondaryAction={secondaryAction}
      title={withDefault(title, "服务暂时不可用")}
      {...props}
    />
  );
}

export function ErrorActions({
  primary,
  secondary,
}: {
  primary?: ReactNode;
  secondary?: ReactNode;
}) {
  if (!primary && !secondary) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      {primary}
      {secondary}
    </div>
  );
}

export function ErrorFooterLink({
  children,
  className,
  icon = <Compass className="h-4 w-4" />,
}: {
  children: ReactNode;
  className?: string;
  icon?: ReactNode;
}) {
  return (
    <div className={cn("inline-flex items-center gap-2 text-sm text-muted-foreground", className)}>
      <span className="text-primary">{icon}</span>
      <span>{children}</span>
    </div>
  );
}
