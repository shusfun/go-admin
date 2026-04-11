import { ArrowUp, ChevronLeft, ChevronRight, LoaderCircle, TriangleAlert, UserRound, type LucideIcon } from "lucide-react";
import {
  forwardRef,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type HTMLAttributes,
  type ImgHTMLAttributes,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
  type TdHTMLAttributes,
  type ThHTMLAttributes,
} from "react";
import type { ImageAsset } from "@go-admin/types";

import { cn } from "../lib/utils";
import { Button } from "./button";
import { Input, Select } from "./form-controls";
import { AppScrollbar } from "./scroll-area";
import { type ControlSize } from "./shared";

function clampPercentage(value: number) {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.min(100, Math.max(0, value));
}

const BACKTOP_DRAG_THRESHOLD = 6;
const DEFAULT_IMAGE_VARIANT_SIZES = [64, 128, 256, 512];
type ImageSource = string | ImageAsset | null | undefined;

function normalizeVariantSizes(variantSizes?: number[]) {
  const sizes = (variantSizes ?? DEFAULT_IMAGE_VARIANT_SIZES).filter((value) => Number.isFinite(value) && value > 0);
  return Array.from(new Set(sizes)).sort((left, right) => left - right);
}

function normalizePathValue(source: string | null | undefined) {
  const value = source?.trim() ?? "";
  if (!value) {
    return "";
  }
  if (value.startsWith("static/")) {
    return `/${value}`;
  }
  return value;
}

export function normalizeImageSource(source: ImageSource) {
  if (typeof source === "string" || source == null) {
    return normalizePathValue(source);
  }

  return {
    ...source,
    path: normalizePathValue(source.path),
    variants: (source.variants ?? []).map((item) => ({
      ...item,
      path: normalizePathValue(item.path),
    })),
  } satisfies ImageAsset;
}

function isAbsoluteHttpUrl(source: string) {
  return source.startsWith("http://") || source.startsWith("https://");
}

function isSameOriginSource(source: string) {
  if (!isAbsoluteHttpUrl(source)) {
    return source.startsWith("/");
  }
  if (typeof window === "undefined") {
    return false;
  }
  try {
    return new URL(source).origin === window.location.origin;
  } catch {
    return false;
  }
}

export function resolveImageVariantSize(displaySize: number, devicePixelRatio = 1, variantSizes?: number[]) {
  const sizes = normalizeVariantSizes(variantSizes);
  if (sizes.length === 0) {
    return null;
  }

  const requiredPixels = Math.max(1, Math.ceil(displaySize * Math.max(1, devicePixelRatio)));
  return sizes.find((size) => size >= requiredPixels) ?? sizes[sizes.length - 1];
}

function extractVariantSizes(source: ImageSource, variantSizes?: number[]) {
  const normalized = normalizeImageSource(source);
  if (typeof normalized !== "object" || normalized == null) {
    return normalizeVariantSizes(variantSizes);
  }

  const sizes = [
    ...(typeof normalized.size === "number" && normalized.size > 0 ? [normalized.size] : []),
    ...(normalized.variants ?? []).map((item) => item.size),
    ...(variantSizes ?? []),
  ];
  return Array.from(new Set(sizes.filter((value) => Number.isFinite(value) && value > 0))).sort((left, right) => left - right);
}

export function buildImageVariantSource(source: ImageSource, variantSize: number | null, variantSizes?: number[]) {
  const normalized = normalizeImageSource(source);
  if (!normalized || !variantSize) {
    return typeof normalized === "string" ? normalized : normalized?.path ?? "";
  }

  if (typeof normalized === "object") {
    const matched = (normalized.variants ?? []).find((item) => item.size === variantSize);
    if (matched?.path) {
      return matched.path;
    }
    return normalized.path;
  }

  const sizes = extractVariantSizes(source, variantSizes);
  const largest = sizes[sizes.length - 1];
  if (!largest || variantSize >= largest) {
    return normalized;
  }

  if (!isSameOriginSource(normalized)) {
    return normalized;
  }

  const buildPath = (pathname: string) => {
    const matched = pathname.match(/^(.*?)(@\d+)?(\.[^.\/]+)$/);
    if (!matched) {
      return pathname;
    }
    const [, basePath, , ext] = matched;
    if (ext.toLowerCase() !== ".webp") {
      return pathname;
    }
    return `${basePath}@${variantSize}${ext}`;
  };

  if (isAbsoluteHttpUrl(normalized)) {
    try {
      const url = new URL(normalized);
      url.pathname = buildPath(url.pathname);
      return url.toString();
    } catch {
      return normalized;
    }
  }

  const [pathname, search = ""] = normalized.split("?");
  return `${buildPath(pathname)}${search ? `?${search}` : ""}`;
}

function getAvatarInitials(name?: string) {
  if (!name) {
    return "";
  }

  const normalized = name.trim();
  if (!normalized) {
    return "";
  }

  const segments = normalized.split(/\s+/).filter(Boolean);
  if (segments.length === 1) {
    return normalized.slice(0, 2).toUpperCase();
  }

  return segments
    .slice(0, 2)
    .map((segment) => segment[0])
    .join("")
    .toUpperCase();
}

function buildWatermarkDataUri({
  color,
  content,
  fontSize,
  gapX,
  gapY,
  height,
  rotate,
  width,
}: {
  color: string;
  content: string;
  fontSize: number;
  gapX: number;
  gapY: number;
  height: number;
  rotate: number;
  width: number;
}) {
  const encoded = encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width + gapX}" height="${height + gapY}" viewBox="0 0 ${width + gapX} ${height + gapY}">
      <g transform="translate(${width / 2} ${height / 2}) rotate(${rotate})">
        <text
          x="0"
          y="0"
          dominant-baseline="middle"
          text-anchor="middle"
          fill="${color}"
          font-size="${fontSize}"
          font-family="ui-sans-serif, system-ui, sans-serif"
        >${content}</text>
      </g>
    </svg>`,
  );

  return `url("data:image/svg+xml;charset=UTF-8,${encoded}")`;
}

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  active?: boolean;
  elevated?: boolean;
}

export function Card({ className, active, children, elevated = false, ...props }: CardProps) {
  return (
    <div
      data-active={active ? "true" : undefined}
      className={cn(
        "group relative overflow-hidden rounded-[1.25rem] border border-border/80 bg-card text-card-foreground transition-colors duration-200",
        elevated ? "shadow-[var(--shadow-card)]" : "shadow-sm",
        !active && "hover:bg-secondary/20",
        active && "border-primary/50 shadow-[var(--shadow-card)]",
        className,
      )}
      {...props}
    >
      {active ? (
        <div className="pointer-events-none absolute inset-0">
          <svg className="absolute inset-0 h-full w-full" xmlns="http://www.w3.org/2000/svg">
            <rect
              className="text-primary/60"
              fill="none"
              height="100%"
              rx="12"
              ry="12"
              stroke="currentColor"
              strokeDasharray="60 300"
              strokeDashoffset="0"
              strokeWidth="3"
              width="100%"
            >
              <animate attributeName="stroke-dashoffset" dur="2.5s" from="360" repeatCount="indefinite" to="0" />
            </rect>
          </svg>
        </div>
      ) : null}
      {children}
    </div>
  );
}

export function CardHeader({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex flex-col gap-1.5 border-b border-border/50 p-4", className)} {...props} />;
}

export function CardTitle({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={cn("text-base font-semibold tracking-tight text-foreground", className)} {...props} />;
}

export function CardDescription({ className, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("text-sm leading-relaxed text-muted-foreground", className)} {...props} />;
}

export function CardContent({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("p-4", className)} {...props} />;
}

export function CardFooter({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex items-center gap-3 border-t border-border/50 p-4", className)} {...props} />;
}

export function Badge({
  className,
  effect,
  size = "default",
  tone,
  type = "primary",
  variant,
  ...props
}: HTMLAttributes<HTMLSpanElement> & {
  effect?: "light" | "solid" | "plain";
  size?: "default" | "small";
  tone?: "default" | "muted" | "primary" | "success" | "warning" | "danger" | "info";
  type?: "default" | "muted" | "primary" | "success" | "warning" | "danger" | "info";
  variant?: "light" | "solid";
}) {
  const resolvedEffect = effect ?? variant ?? "light";
  const resolvedType = tone ?? type;
  const tones: Record<string, { light: string; plain: string; solid: string }> = {
    danger: {
      light: "border-destructive/20 bg-destructive/10 text-destructive",
      plain: "border-destructive/35 bg-transparent text-destructive",
      solid: "border-destructive bg-destructive text-destructive-foreground",
    },
    default: {
      light: "border-border bg-secondary/50 text-secondary-foreground",
      plain: "border-border/80 bg-transparent text-secondary-foreground",
      solid: "border-border bg-secondary text-secondary-foreground",
    },
    info: {
      light: "border-slate-400/18 bg-slate-500/10 text-slate-700 dark:text-slate-200",
      plain: "border-slate-400/35 bg-transparent text-slate-700 dark:text-slate-200",
      solid: "border-slate-500 bg-slate-600 text-white dark:bg-slate-500",
    },
    muted: {
      light: "border-border bg-secondary text-secondary-foreground",
      plain: "border-border/80 bg-transparent text-secondary-foreground",
      solid: "border-border bg-secondary text-secondary-foreground",
    },
    primary: {
      light: "border-primary/20 bg-primary/10 text-primary",
      plain: "border-primary/35 bg-transparent text-primary",
      solid: "border-primary bg-primary text-primary-foreground",
    },
    success: {
      light: "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
      plain: "border-emerald-500/35 bg-transparent text-emerald-700 dark:text-emerald-300",
      solid: "border-emerald-600 bg-emerald-600 text-white dark:bg-emerald-500",
    },
    warning: {
      light: "border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300",
      plain: "border-amber-500/35 bg-transparent text-amber-700 dark:text-amber-300",
      solid: "border-amber-500 bg-amber-500 text-amber-950",
    },
  };

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border font-medium",
        size === "small" ? "px-2 py-0.5 text-[11px]" : "px-2.5 py-1 text-xs",
        tones[resolvedType][resolvedEffect],
        className,
      )}
      {...props}
    />
  );
}

export function Skeleton({
  animated = true,
  className,
  variant = "rect",
  ...props
}: HTMLAttributes<HTMLDivElement> & {
  animated?: boolean;
  variant?: "rect" | "circle" | "text";
}) {
  return (
    <div
      className={cn("bg-secondary", animated && "animate-pulse", variant === "circle" ? "rounded-full" : variant === "text" ? "h-4 rounded-md" : "rounded-xl", className)}
      {...props}
    />
  );
}

export function Loading({
  block = false,
  className,
  label = "正在加载",
  size = "default",
}: {
  block?: boolean;
  className?: string;
  label?: string;
  size?: "default" | "large" | "small";
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 text-muted-foreground",
        block && "justify-center rounded-2xl border border-dashed border-border/70 bg-secondary/25 px-5 py-6",
        size === "large" ? "text-base" : size === "small" ? "text-xs" : "text-sm",
        className,
      )}
    >
      <LoaderCircle className={cn("animate-spin", size === "large" ? "h-5 w-5" : size === "small" ? "h-3.5 w-3.5" : "h-4 w-4")} />
      <span>{label}</span>
    </div>
  );
}

export function Progress({
  className,
  description,
  indeterminate = false,
  label,
  percentage,
  showText = true,
  status = "default",
  striped = false,
  strokeWidth,
  text,
  textInside = false,
  type = "line",
  size = "default",
}: {
  className?: string;
  description?: ReactNode;
  indeterminate?: boolean;
  label?: ReactNode;
  percentage: number;
  showText?: boolean;
  size?: "default" | "large" | "small";
  status?: "danger" | "default" | "exception" | "info" | "success" | "warning";
  striped?: boolean;
  strokeWidth?: number;
  text?: ReactNode;
  textInside?: boolean;
  type?: "circle" | "dashboard" | "line";
}) {
  const normalized = clampPercentage(percentage);
  const resolvedStatus = status === "danger" ? "exception" : status;
  const toneClass: Record<string, string> = {
    default: "bg-primary text-primary",
    exception: "bg-destructive text-destructive",
    info: "bg-slate-600 text-slate-600 dark:bg-slate-500 dark:text-slate-300",
    success: "bg-emerald-600 text-emerald-600 dark:bg-emerald-500 dark:text-emerald-400",
    warning: "bg-amber-500 text-amber-500 dark:text-amber-400",
  };
  const lineHeight = strokeWidth ?? (textInside ? 18 : size === "large" ? 10 : size === "small" ? 6 : 8);
  const circleSize = strokeWidth ? Math.max(72, strokeWidth * 6) : 132;
  const radius = (circleSize - 12) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashboardRatio = 0.75;
  const progressRatio = type === "dashboard" ? dashboardRatio : 1;
  const trackDash = circumference * progressRatio;
  const progressDash = (normalized / 100) * trackDash;
  const circleStrokeWidth = strokeWidth ?? (type === "line" ? 8 : 10);
  const rotationClass = type === "dashboard" ? "-rotate-[135deg]" : "-rotate-90";
  const progressText = text ?? (indeterminate ? "加载中" : `${Math.round(normalized)}%`);

  if (type !== "line") {
    return (
      <div className={cn("inline-flex flex-col items-center gap-3", className)}>
        <div className="relative inline-flex items-center justify-center" style={{ height: circleSize, width: circleSize }}>
          <svg className={cn("overflow-visible", rotationClass)} height={circleSize} width={circleSize}>
            <circle
              className="text-secondary"
              cx={circleSize / 2}
              cy={circleSize / 2}
              fill="none"
              r={radius}
              stroke="currentColor"
              strokeDasharray={`${trackDash} ${circumference}`}
              strokeLinecap="round"
              strokeWidth={circleStrokeWidth}
            />
            <circle
              className={cn("transition-all duration-300 ease-out", toneClass[resolvedStatus])}
              cx={circleSize / 2}
              cy={circleSize / 2}
              fill="none"
              r={radius}
              stroke="currentColor"
              strokeDasharray={`${progressDash} ${circumference}`}
              strokeLinecap="round"
              strokeWidth={circleStrokeWidth}
            />
          </svg>
          {showText ? (
            <div className="absolute inset-0 flex items-center justify-center text-sm font-semibold text-foreground">
              {progressText}
            </div>
          ) : null}
        </div>
        {label ? <div className="text-sm font-semibold text-foreground">{label}</div> : null}
        {description ? <div className="text-center text-xs leading-5 text-muted-foreground">{description}</div> : null}
      </div>
    );
  }

  return (
    <div className={cn("grid gap-2", className)}>
      {label || description ? (
        <div className="space-y-1">
          {label ? <div className="text-sm font-semibold text-foreground">{label}</div> : null}
          {description ? <div className="text-xs leading-5 text-muted-foreground">{description}</div> : null}
        </div>
      ) : null}
      <div className="flex items-center gap-3">
        <div
          aria-valuemax={100}
          aria-valuemin={0}
          aria-valuenow={Math.round(normalized)}
          className="relative min-w-0 flex-1 overflow-hidden rounded-full bg-secondary/70"
          role="progressbar"
          style={{ height: lineHeight }}
        >
          <div
            className={cn(
              "h-full rounded-full transition-[width] duration-300 ease-out",
              toneClass[resolvedStatus],
              striped && "bg-[linear-gradient(135deg,rgba(255,255,255,0.16)_25%,transparent_25%,transparent_50%,rgba(255,255,255,0.16)_50%,rgba(255,255,255,0.16)_75%,transparent_75%,transparent)] bg-[length:1rem_1rem]",
              indeterminate && "w-1/2 animate-pulse",
            )}
            style={{ width: indeterminate ? "45%" : `${normalized}%` }}
          />
          {textInside && showText ? (
            <span className="absolute inset-y-0 right-3 flex items-center text-xs font-semibold text-white">
              {progressText}
            </span>
          ) : null}
        </div>
        {showText && !textInside ? <span className="shrink-0 text-sm font-medium text-muted-foreground">{progressText}</span> : null}
      </div>
    </div>
  );
}

export function Avatar({
  alt,
  bordered = false,
  className,
  fallback,
  name,
  shape = "circle",
  size = "default",
  src,
  style,
  status,
  ...props
}: HTMLAttributes<HTMLSpanElement> & {
  alt?: string;
  bordered?: boolean;
  fallback?: ReactNode;
  name?: string;
  shape?: "circle" | "square";
  size?: "default" | "large" | "small" | number;
  src?: ImageSource;
  status?: "away" | "busy" | "offline" | "online" | "warning";
}) {
  const [broken, setBroken] = useState(false);

  useEffect(() => {
    setBroken(false);
  }, [src]);

  const resolvedSize = typeof size === "number" ? size : size === "large" ? 56 : size === "small" ? 32 : 40;
  const dimensionClass = typeof size === "number" ? "text-sm" : size === "large" ? "text-base" : size === "small" ? "text-xs" : "text-sm";
  const statusClass: Record<NonNullable<typeof status>, string> = {
    away: "bg-amber-400",
    busy: "bg-destructive",
    offline: "bg-muted-foreground/50",
    online: "bg-emerald-500",
    warning: "bg-amber-500",
  };
  const initials = getAvatarInitials(name);
  const resolvedFallback = fallback ?? (initials || <UserRound className="h-4 w-4" />);

  return (
    <span className={cn("relative inline-flex shrink-0", className)} {...props}>
      <span
        className={cn(
          "inline-flex items-center justify-center overflow-hidden border bg-secondary/40 font-semibold text-foreground",
          bordered ? "border-primary/25 shadow-sm" : "border-border/70",
          shape === "square" ? "rounded-2xl" : "rounded-full",
          dimensionClass,
        )}
        style={{ height: resolvedSize, width: resolvedSize, ...style }}
      >
        {src && !broken ? (
          <Image
            alt={alt ?? name ?? "avatar"}
            className="h-full w-full object-cover"
            onError={() => setBroken(true)}
            src={src}
          />
        ) : (
          resolvedFallback
        )}
      </span>
      {status ? (
        <span
          aria-hidden="true"
          className={cn(
            "absolute bottom-0 right-0 rounded-full border-2 border-background",
            resolvedSize >= 48 ? "h-4 w-4" : resolvedSize <= 32 ? "h-2.5 w-2.5" : "h-3 w-3",
            statusClass[status],
          )}
        />
      ) : null}
    </span>
  );
}

export const Image = forwardRef<
  HTMLImageElement,
  Omit<ImgHTMLAttributes<HTMLImageElement>, "src"> & {
    src?: ImageSource;
    variantSizes?: number[];
  }
>(function Image({ onError, src, variantSizes, ...props }, forwardedRef) {
  const imageRef = useRef<HTMLImageElement | null>(null);
  const [displaySize, setDisplaySize] = useState(0);
  const [fallbackToOriginal, setFallbackToOriginal] = useState(false);
  const normalizedSource = normalizeImageSource(src);
  const resolvedVariantSize = resolveImageVariantSize(
    displaySize,
    typeof window === "undefined" ? 1 : window.devicePixelRatio || 1,
    extractVariantSizes(src, variantSizes),
  );
  const preferredSource = useMemo(
    () => buildImageVariantSource(normalizedSource, resolvedVariantSize, variantSizes),
    [normalizedSource, resolvedVariantSize, variantSizes],
  );
  const originSource = typeof normalizedSource === "string" ? normalizedSource : normalizedSource?.path ?? "";
  const resolvedSource = fallbackToOriginal ? originSource : (preferredSource || originSource);

  useEffect(() => {
    setFallbackToOriginal(false);
  }, [normalizedSource, preferredSource]);

  useEffect(() => {
    const node = imageRef.current;
    if (!node) {
      return;
    }

    const updateSize = () => {
      const nextSize = Math.max(node.clientWidth, node.clientHeight);
      setDisplaySize((current) => (current === nextSize ? current : nextSize));
    };

    updateSize();
    if (typeof ResizeObserver === "undefined") {
      return;
    }

    const observer = new ResizeObserver(() => updateSize());
    observer.observe(node);
    return () => observer.disconnect();
  }, [normalizedSource]);

  if (!resolvedSource) {
    return null;
  }

  return (
    <img
      {...props}
      onError={(event) => {
        if (!fallbackToOriginal && preferredSource && preferredSource !== originSource) {
          setFallbackToOriginal(true);
          return;
        }
        onError?.(event);
      }}
      ref={(node) => {
        imageRef.current = node;
        if (!forwardedRef) {
          return;
        }
        if (typeof forwardedRef === "function") {
          forwardedRef(node);
          return;
        }
        forwardedRef.current = node;
      }}
      src={resolvedSource}
    />
  );
});

export function Icon({
  bordered = false,
  className,
  icon: IconNode,
  label,
  size = "default",
  strokeWidth = 1.9,
  tone = "default",
}: HTMLAttributes<HTMLSpanElement> & {
  bordered?: boolean;
  icon: LucideIcon;
  label?: string;
  size?: "default" | "large" | "small" | number;
  strokeWidth?: number;
  tone?: "danger" | "default" | "info" | "primary" | "success" | "warning";
}) {
  const resolvedSize = typeof size === "number" ? size : size === "large" ? 22 : size === "small" ? 14 : 18;
  const toneClass: Record<NonNullable<typeof tone>, string> = {
    danger: "text-destructive",
    default: "text-foreground",
    info: "text-slate-600 dark:text-slate-200",
    primary: "text-primary",
    success: "text-emerald-600 dark:text-emerald-400",
    warning: "text-amber-600 dark:text-amber-300",
  };

  return (
    <span
      aria-label={label}
      className={cn(
        "inline-flex items-center justify-center",
        bordered && "rounded-xl border border-border/70 bg-secondary/30 p-2",
        toneClass[tone],
        className,
      )}
      role={label ? "img" : undefined}
    >
      <IconNode aria-hidden={label ? undefined : true} size={resolvedSize} strokeWidth={strokeWidth} />
    </span>
  );
}

export type IconGridItem = {
  description?: ReactNode;
  icon: ReactNode;
  key: string;
  label: ReactNode;
  meta?: ReactNode;
};

export function IconGrid({
  className,
  columns = 4,
  items,
  onSelect,
  selectedKey,
}: {
  className?: string;
  columns?: 2 | 3 | 4 | 5 | 6;
  items: IconGridItem[];
  onSelect?: (item: IconGridItem) => void;
  selectedKey?: string;
}) {
  const columnsClass =
    columns === 6 ? "sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6" :
    columns === 5 ? "sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5" :
    columns === 3 ? "sm:grid-cols-2 xl:grid-cols-3" :
    columns === 2 ? "sm:grid-cols-2" :
    "sm:grid-cols-2 xl:grid-cols-4";

  return (
    <div className={cn("grid gap-3", columnsClass, className)}>
      {items.map((item) => (
        <button
          className={cn(
            "grid gap-3 rounded-2xl border border-border/70 bg-card px-4 py-4 text-left transition-colors hover:border-primary/25 hover:bg-primary/5",
            selectedKey === item.key && "border-primary/35 bg-primary/5",
          )}
          key={item.key}
          onClick={() => onSelect?.(item)}
          type="button"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="inline-flex rounded-xl border border-border/70 bg-secondary/30 p-2 text-primary">{item.icon}</div>
            {item.meta ? <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">{item.meta}</div> : null}
          </div>
          <div className="space-y-1">
            <div className="text-sm font-semibold text-foreground">{item.label}</div>
            {item.description ? <div className="text-xs leading-5 text-muted-foreground">{item.description}</div> : null}
          </div>
        </button>
      ))}
    </div>
  );
}

export function Watermark({
  children,
  className,
  color = "rgba(100, 116, 139, 0.18)",
  content = "GO ADMIN UI",
  fontSize = 15,
  gapX = 96,
  gapY = 72,
  height = 84,
  rotate = -18,
  width = 180,
}: {
  children: ReactNode;
  className?: string;
  color?: string;
  content?: string;
  fontSize?: number;
  gapX?: number;
  gapY?: number;
  height?: number;
  rotate?: number;
  width?: number;
}) {
  const overlayStyle: CSSProperties = {
    backgroundImage: buildWatermarkDataUri({ color, content, fontSize, gapX, gapY, height, rotate, width }),
    backgroundRepeat: "repeat",
    inset: 0,
    pointerEvents: "none",
    position: "absolute",
  };

  return (
    <div className={cn("relative isolate overflow-hidden", className)}>
      <div className="relative z-10">{children}</div>
      <div aria-hidden="true" style={overlayStyle} />
    </div>
  );
}

export function Backtop({
  bottom = 32,
  className,
  draggable = false,
  duration = 320,
  fixed = true,
  maxDragOffset = 300,
  right = 32,
  target,
  visibilityHeight = 240,
}: {
  bottom?: number;
  className?: string;
  draggable?: boolean;
  duration?: number;
  fixed?: boolean;
  maxDragOffset?: number;
  right?: number;
  target?: string;
  visibilityHeight?: number;
}) {
  const [visible, setVisible] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);
  const [dragging, setDragging] = useState(false);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const draggingRef = useRef<{ pointerId: number; startOffset: number; startY: number } | null>(null);
  const movedRef = useRef(false);

  function resolveTargetContainer() {
    if (typeof window === "undefined" || typeof document === "undefined") {
      return null;
    }

    if (!target) {
      return null;
    }

    const container = document.querySelector<HTMLElement>(target);
    if (!container) {
      return null;
    }

    const overflowY = window.getComputedStyle(container).overflowY;
    return /(auto|scroll|overlay)/.test(overflowY) ? container : null;
  }

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const container = resolveTargetContainer();
    const scrollElement = container ?? window;
    const readScrollTop = () => (container ? container.scrollTop : window.scrollY);
    const handleScroll = () => setVisible(readScrollTop() >= visibilityHeight);

    handleScroll();
    scrollElement.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      scrollElement.removeEventListener("scroll", handleScroll);
    };
  }, [target, visibilityHeight]);

  useEffect(() => {
    if (!draggable || typeof window === "undefined") {
      return;
    }

    function handlePointerMove(event: PointerEvent) {
      if (!draggingRef.current) {
        return;
      }

      const button = buttonRef.current;
      if (!button) {
        return;
      }

      const deltaY = draggingRef.current.startY - event.clientY;
      if (!movedRef.current && Math.abs(deltaY) < BACKTOP_DRAG_THRESHOLD) {
        return;
      }

      movedRef.current = true;
      if (!dragging) {
        setDragging(true);
      }
      const viewportHeight =
        fixed
          ? window.innerHeight
          : button.offsetParent instanceof HTMLElement
            ? button.offsetParent.clientHeight
            : window.innerHeight;
      const buttonHeight = button.offsetHeight || 44;
      const minBottom = 8;
      const maxBottom = Math.max(minBottom, viewportHeight - buttonHeight - 8);
      const minOffset = Math.max(-maxDragOffset, minBottom - bottom);
      const maxOffset = Math.min(maxDragOffset, maxBottom - bottom);
      const rawOffset = draggingRef.current.startOffset + deltaY;
      const nextOffset = Math.min(maxOffset, Math.max(minOffset, rawOffset));

      setDragOffset(nextOffset);
    }

    function handlePointerUp(event: PointerEvent) {
      if (!draggingRef.current || draggingRef.current.pointerId !== event.pointerId) {
        return;
      }

      draggingRef.current = null;
      setDragging(false);
    }

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    window.addEventListener("pointercancel", handlePointerUp);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointercancel", handlePointerUp);
    };
  }, [bottom, draggable, dragging, fixed, maxDragOffset]);

  function handlePointerDown(event: ReactPointerEvent<HTMLButtonElement>) {
    if (!draggable) {
      return;
    }

    draggingRef.current = {
      pointerId: event.pointerId,
      startOffset: dragOffset,
      startY: event.clientY,
    };
    movedRef.current = false;
    event.currentTarget.setPointerCapture?.(event.pointerId);
  }

  function handleClick(event: ReactMouseEvent<HTMLButtonElement>) {
    if (movedRef.current) {
      movedRef.current = false;
      event.preventDefault();
      return;
    }

    if (typeof window === "undefined") {
      return;
    }

    const container = resolveTargetContainer();
    if (container) {
      container.scrollTo({ behavior: duration <= 0 ? "auto" : "smooth", top: 0 });
      return;
    }

    window.scrollTo({ behavior: duration <= 0 ? "auto" : "smooth", top: 0 });
  }

  return (
    <button
      aria-hidden={!visible}
      className={cn(
        "z-40 inline-flex select-none items-center justify-center rounded-full border border-border/70 bg-card/95 p-0 text-foreground shadow-[var(--shadow-soft)] backdrop-blur transition-[opacity,color,border-color,box-shadow,transform] duration-200 hover:border-primary/35 hover:text-primary",
        fixed ? "fixed" : "absolute",
        draggable ? "touch-none cursor-grab active:cursor-grabbing" : undefined,
        dragging ? "duration-0" : undefined,
        visible ? "pointer-events-auto translate-y-0 opacity-100" : "pointer-events-none translate-y-3 opacity-0",
        className,
      )}
      onPointerDown={handlePointerDown}
      onClick={handleClick}
      ref={buttonRef}
      style={{ bottom: bottom + dragOffset, right }}
      tabIndex={visible ? 0 : -1}
      type="button"
    >
      <span className="sr-only">返回顶部</span>
      <span className="inline-flex h-11 w-11 items-center justify-center">
        <ArrowUp className="h-4 w-4" />
      </span>
    </button>
  );
}

export type AnchorItem = {
  children?: AnchorItem[];
  description?: ReactNode;
  href: string;
  title: ReactNode;
};

function flattenAnchorItems(items: AnchorItem[]): AnchorItem[] {
  return items.flatMap((item) => [item, ...(item.children ? flattenAnchorItems(item.children) : [])]);
}

function resolveScrollTarget(target?: string) {
  if (typeof document === "undefined") {
    return null;
  }

  if (!target) {
    return window;
  }

  return document.querySelector<HTMLElement>(target);
}

function isWindowTarget(target: HTMLElement | Window): target is Window {
  return target === window;
}

function getScrollTop(target: HTMLElement | Window) {
  return isWindowTarget(target) ? window.scrollY : target.scrollTop;
}

function getTargetOffsetTop(element: HTMLElement, target: HTMLElement | Window) {
  if (isWindowTarget(target)) {
    return element.getBoundingClientRect().top + window.scrollY;
  }

  const targetRect = target.getBoundingClientRect();
  return element.getBoundingClientRect().top - targetRect.top + target.scrollTop;
}

export function Anchor({
  activeHref,
  affix = true,
  bounds = 12,
  className,
  items,
  offset,
  offsetTop = 16,
  onChange,
  target,
  title = "页内导航",
}: {
  activeHref?: string;
  affix?: boolean;
  bounds?: number;
  className?: string;
  items: AnchorItem[];
  offset?: number;
  offsetTop?: number;
  onChange?: (href: string) => void;
  target?: string;
  title?: ReactNode;
}) {
  const resolvedOffsetTop = offset ?? offsetTop;
  const [internalActiveHref, setInternalActiveHref] = useState(items[0]?.href);
  const currentActiveHref = activeHref ?? internalActiveHref;

  useEffect(() => {
    const scrollTarget = resolveScrollTarget(target);
    if (!scrollTarget) {
      return;
    }

    const flatItems = flattenAnchorItems(items);
    const updateActiveHref = () => {
      let nextHref = flatItems[0]?.href;

      flatItems.forEach((item) => {
        const element = document.querySelector<HTMLElement>(item.href);
        if (!element) {
          return;
        }

        const top = getTargetOffsetTop(element, scrollTarget) - getScrollTop(scrollTarget) - resolvedOffsetTop;
        if (top <= bounds) {
          nextHref = item.href;
        }
      });

      if (activeHref === undefined) {
        setInternalActiveHref(nextHref);
      }
      if (nextHref) {
        onChange?.(nextHref);
      }
    };

    updateActiveHref();
    const listenerTarget = scrollTarget === window ? window : scrollTarget;
    listenerTarget.addEventListener("scroll", updateActiveHref, { passive: true });
    window.addEventListener("resize", updateActiveHref);

    return () => {
      listenerTarget.removeEventListener("scroll", updateActiveHref);
      window.removeEventListener("resize", updateActiveHref);
    };
  }, [activeHref, bounds, items, onChange, resolvedOffsetTop, target]);

  function handleJump(event: ReactMouseEvent<HTMLAnchorElement>, href: string) {
    event.preventDefault();

    const scrollTarget = resolveScrollTarget(target);
    const element = document.querySelector<HTMLElement>(href);
    if (!scrollTarget || !element) {
      return;
    }

    const nextTop = Math.max(0, getTargetOffsetTop(element, scrollTarget) - resolvedOffsetTop);
    if (scrollTarget === window) {
      window.scrollTo({ behavior: "smooth", top: nextTop });
    } else {
      scrollTarget.scrollTo({ behavior: "smooth", top: nextTop });
    }

    if (activeHref === undefined) {
      setInternalActiveHref(href);
    }
    onChange?.(href);
  }

  function renderItems(nodes: AnchorItem[], depth = 0): ReactNode {
    return nodes.map((item) => (
      <div className="grid gap-1" key={item.href}>
        <a
          className={cn(
            "grid gap-0.5 rounded-xl px-3 py-2 text-sm transition-colors",
            depth > 0 && "ml-4",
            currentActiveHref === item.href ? "bg-primary/10 font-medium text-primary" : "text-muted-foreground hover:bg-secondary/45 hover:text-foreground",
          )}
          href={item.href}
          onClick={(event) => handleJump(event, item.href)}
        >
          <span>{item.title}</span>
          {item.description ? <span className="text-xs leading-5 opacity-80">{item.description}</span> : null}
        </a>
        {item.children?.length ? renderItems(item.children, depth + 1) : null}
      </div>
    ));
  }

  return (
    <nav className={cn("grid gap-3 rounded-3xl border border-border/70 bg-card p-4", affix && "sticky top-4", className)}>
      <div className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">{title}</div>
      <div className="grid gap-1">{renderItems(items)}</div>
    </nav>
  );
}

export function EmptyState({
  action,
  className,
  description,
  scene = "default",
  title,
}: {
  action?: ReactNode;
  className?: string;
  description: ReactNode;
  scene?: "default" | "empty" | "error" | "search";
  title: ReactNode;
}) {
  const sceneClass: Record<string, string> = {
    default: "border-border bg-secondary/40",
    empty: "border-border bg-secondary/35",
    error: "border-destructive/20 bg-destructive/5",
    search: "border-primary/18 bg-primary/5",
  };

  return (
    <div className={cn("flex flex-col items-start gap-3 rounded-3xl border border-dashed px-6 py-8", sceneClass[scene], className)}>
      <div className="rounded-2xl bg-background p-3 text-muted-foreground shadow-sm">
        <TriangleAlert className="h-5 w-5" />
      </div>
      <div className="space-y-1">
        <h4 className="text-base font-semibold text-foreground">{title}</h4>
        <p className="text-sm leading-6 text-muted-foreground">{description}</p>
      </div>
      {action}
    </div>
  );
}

export function Table({ className, ...props }: HTMLAttributes<HTMLTableElement>) {
  return <table className={cn("w-full caption-bottom text-sm", className)} {...props} />;
}

export function TableHeader({ className, ...props }: HTMLAttributes<HTMLTableSectionElement>) {
  return <thead className={cn("[&_tr]:border-b [&_tr]:border-border", className)} {...props} />;
}

export function TableBody({ className, ...props }: HTMLAttributes<HTMLTableSectionElement>) {
  return <tbody className={cn("[&_tr:last-child]:border-0", className)} {...props} />;
}

export function TableRow({ className, ...props }: HTMLAttributes<HTMLTableRowElement>) {
  return <tr className={cn("border-b border-border transition-colors hover:bg-secondary/50", className)} {...props} />;
}

export function TableHead({ className, ...props }: ThHTMLAttributes<HTMLTableCellElement>) {
  return <th className={cn("h-11 px-4 text-left align-middle font-medium text-muted-foreground", className)} {...props} />;
}

export function TableCell({ className, ...props }: TdHTMLAttributes<HTMLTableCellElement>) {
  return <td className={cn("px-4 py-3 align-middle text-foreground", className)} {...props} />;
}

type PaginationPageToken = number | "ellipsis-leading" | "ellipsis-trailing";

function buildPaginationTokens(currentPage: number, totalPages: number, pagerCount: number) {
  const normalizedPagerCount = Math.max(5, pagerCount % 2 === 0 ? pagerCount + 1 : pagerCount);

  if (totalPages <= normalizedPagerCount) {
    return Array.from({ length: totalPages }, (_, index) => index + 1) satisfies PaginationPageToken[];
  }

  const innerSlots = normalizedPagerCount - 2;
  const sideSlots = Math.max(1, Math.floor((innerSlots - 1) / 2));
  let start = Math.max(2, currentPage - sideSlots);
  let end = Math.min(totalPages - 1, currentPage + sideSlots);

  while (end - start + 1 < innerSlots) {
    if (start > 2) {
      start -= 1;
      continue;
    }
    if (end < totalPages - 1) {
      end += 1;
      continue;
    }
    break;
  }

  const tokens: PaginationPageToken[] = [1];

  if (start > 2) {
    tokens.push("ellipsis-leading");
  }

  for (let pageNumber = start; pageNumber <= end; pageNumber += 1) {
    tokens.push(pageNumber);
  }

  if (end < totalPages - 1) {
    tokens.push("ellipsis-trailing");
  }

  tokens.push(totalPages);
  return tokens;
}

export function Pagination({
  background = false,
  className,
  disabled = false,
  onNext,
  onPageChange,
  onPageSizeChange,
  onPrevious,
  page,
  pageSize,
  pageSizes,
  pagerCount = 7,
  showPager,
  showQuickJumper = false,
  showTotal = false,
  size = "default",
  total,
  totalPages,
}: {
  background?: boolean;
  className?: string;
  disabled?: boolean;
  onNext?: () => void;
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  onPrevious?: () => void;
  page: number;
  pageSize?: number;
  pageSizes?: number[];
  pagerCount?: number;
  showPager?: boolean;
  showQuickJumper?: boolean;
  showTotal?: boolean;
  size?: Exclude<ControlSize, "icon">;
  total?: number;
  totalPages?: number;
}) {
  const resolvedPageSize = pageSize ?? pageSizes?.[0] ?? 10;
  const resolvedTotalPages = Math.max(1, totalPages ?? (typeof total === "number" ? Math.ceil(total / resolvedPageSize) : 1));
  const currentPage = Math.min(Math.max(page, 1), resolvedTotalPages);
  const pagerTokens = useMemo(() => buildPaginationTokens(currentPage, resolvedTotalPages, pagerCount), [currentPage, pagerCount, resolvedTotalPages]);
  const shouldShowSizeChanger = Boolean(pageSizes?.length && onPageSizeChange);
  const shouldShowPager = showPager ?? Boolean(onPageChange || showQuickJumper || showTotal || shouldShowSizeChanger);
  const prevDisabled = disabled || currentPage <= 1;
  const nextDisabled = disabled || currentPage >= resolvedTotalPages;
  const [jumpValue, setJumpValue] = useState("");

  function triggerPageChange(nextPage: number) {
    if (disabled) {
      return;
    }

    const normalizedPage = Math.min(Math.max(nextPage, 1), resolvedTotalPages);
    if (normalizedPage === currentPage) {
      return;
    }

    if (onPageChange) {
      onPageChange(normalizedPage);
      return;
    }

    if (normalizedPage === currentPage - 1) {
      onPrevious?.();
      return;
    }

    if (normalizedPage === currentPage + 1) {
      onNext?.();
      return;
    }

    const step = normalizedPage > currentPage ? 1 : -1;
    const handler = step > 0 ? onNext : onPrevious;
    if (!handler) {
      return;
    }

    for (let pageNumber = currentPage; pageNumber !== normalizedPage; pageNumber += step) {
      handler();
    }
  }

  function submitQuickJump() {
    const nextPage = Number(jumpValue);
    if (!Number.isFinite(nextPage)) {
      setJumpValue("");
      return;
    }
    triggerPageChange(nextPage);
    setJumpValue("");
  }

  const wrapperDensityClass =
    size === "large"
      ? "min-h-10 gap-2.5 rounded-2xl px-3 py-2"
      : size === "small"
        ? "min-h-7 gap-1.5 rounded-xl px-2 py-1"
        : "min-h-9 gap-2 rounded-xl px-2.5 py-1.5";
  const metaTextClass = size === "large" ? "text-sm" : "text-xs";
  const embeddedControlSize: Exclude<ControlSize, "icon"> = size === "large" ? "default" : "small";
  const navButtonClass = cn(
    "inline-flex items-center justify-center gap-1.5 rounded-xl border font-medium transition-all focus-visible:outline-none focus-visible:ring-4 disabled:pointer-events-none disabled:opacity-50",
    size === "large" ? "h-8 px-2.5 text-xs" : size === "small" ? "h-6 px-1.5 text-[11px]" : "h-7 px-2 text-xs",
    background ? "border-transparent bg-background/85 text-foreground hover:bg-background" : "border-border bg-background text-foreground hover:border-primary/35 hover:text-primary",
  );
  const pagerButtonClass = cn(
    "inline-flex items-center justify-center rounded-lg border font-medium transition-all focus-visible:outline-none focus-visible:ring-4 disabled:pointer-events-none disabled:opacity-50",
    size === "large" ? "h-8 min-w-8 px-2 text-xs" : size === "small" ? "h-6 min-w-6 px-1.5 text-[11px]" : "h-7 min-w-7 px-1.5 text-xs",
    background ? "border-transparent bg-background/85 text-foreground hover:bg-background" : "border-border bg-background text-foreground hover:border-primary/35 hover:text-primary",
  );

  return (
    <div className={cn("flex flex-wrap items-center justify-between border", background ? "border-transparent bg-secondary/65" : "border-border/70 bg-card/75", wrapperDensityClass, className)}>
      <div className={cn("flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-1.5 text-muted-foreground", metaTextClass)}>
        {showTotal && typeof total === "number" ? <p className="whitespace-nowrap">共 {total} 条</p> : null}
        <p className="whitespace-nowrap">第 {currentPage} / {resolvedTotalPages} 页</p>
        {shouldShowSizeChanger ? (
          <div className="min-w-[92px] sm:min-w-[104px]">
            <Select
              disabled={disabled}
              onValueChange={(nextValue) => {
                const nextPageSize = Number(nextValue);
                if (Number.isFinite(nextPageSize) && nextPageSize > 0) {
                  onPageSizeChange?.(nextPageSize);
                }
              }}
              options={(pageSizes ?? []).map((option) => ({ label: `${option} 条 / 页`, value: String(option) }))}
              size={embeddedControlSize}
              value={String(resolvedPageSize)}
            />
          </div>
        ) : null}
      </div>
      <div className="flex flex-1 flex-wrap items-center justify-end gap-1.5">
        <button className={navButtonClass} disabled={prevDisabled} onClick={() => triggerPageChange(currentPage - 1)} type="button">
          <ChevronLeft className={cn(size === "small" ? "h-3.5 w-3.5" : "h-4 w-4")} />
          <span className="hidden lg:inline">上一页</span>
        </button>
        {shouldShowPager ? (
          <div className="flex flex-wrap items-center gap-1">
            {pagerTokens.map((token) =>
              typeof token === "number" ? (
                <button
                  className={cn(
                    pagerButtonClass,
                    token === currentPage && (background ? "bg-primary text-primary-foreground shadow-sm" : "border-primary/20 bg-primary/10 text-primary shadow-sm"),
                  )}
                  disabled={disabled || token === currentPage}
                  key={token}
                  onClick={() => triggerPageChange(token)}
                  type="button"
                >
                  {token}
                </button>
              ) : (
                <span className={cn("inline-flex items-center justify-center text-muted-foreground", size === "large" ? "h-8 min-w-5 text-xs" : size === "small" ? "h-6 min-w-4 text-[11px]" : "h-7 min-w-4 text-xs")} key={token}>
                  ...
                </span>
              ),
            )}
          </div>
        ) : null}
        <button className={navButtonClass} disabled={nextDisabled} onClick={() => triggerPageChange(currentPage + 1)} type="button">
          <span className="hidden lg:inline">下一页</span>
          <ChevronRight className={cn(size === "small" ? "h-3.5 w-3.5" : "h-4 w-4")} />
        </button>
        {showQuickJumper ? (
          <div className="flex items-center gap-1.5">
            <span className={cn("hidden whitespace-nowrap text-muted-foreground md:inline", metaTextClass)}>前往</span>
            <div className="w-14 sm:w-16">
              <Input
                disabled={disabled}
                inputMode="numeric"
                onChange={(event) => setJumpValue(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    submitQuickJump();
                  }
                }}
                placeholder={String(currentPage)}
                size={embeddedControlSize}
                value={jumpValue}
              />
            </div>
            <Button disabled={disabled || jumpValue.trim().length === 0} onClick={submitQuickJump} size="small" type="button" variant="text">
              跳转
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function Breadcrumb({ items }: { items: Array<{ href?: string; label: string }> }) {
  return (
    <nav aria-label="breadcrumb">
      <ol className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
        {items.map((item, index) => (
          <li className="flex items-center gap-2" key={`${item.label}-${index}`}>
            {index > 0 ? <ChevronRight className="h-3.5 w-3.5" /> : null}
            {item.href ? (
              <a className="transition-colors hover:text-foreground" href={item.href}>
                {item.label}
              </a>
            ) : (
              <span className={index === items.length - 1 ? "font-medium text-foreground" : ""}>{item.label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

export function FormActions({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("flex flex-wrap items-center justify-end gap-3", className)}>{children}</div>;
}

export function DetailItem({ label, value }: { label: ReactNode; value: ReactNode }) {
  return (
    <div className="grid gap-1 rounded-2xl border border-border/70 bg-secondary/30 p-4">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="m-0 text-sm font-medium text-foreground">{value}</dd>
    </div>
  );
}

export function DefinitionList({
  children,
  className,
  columns = 1,
}: {
  children: ReactNode;
  className?: string;
  columns?: 1 | 2 | 3;
}) {
  const columnsClass = columns === 3 ? "md:grid-cols-2 xl:grid-cols-3" : columns === 2 ? "md:grid-cols-2" : "grid-cols-1";
  return <dl className={cn("grid gap-4", columnsClass, className)}>{children}</dl>;
}

export function DetailGrid({
  items,
  className,
  columns = 2,
}: {
  items: Array<{ label: ReactNode; value: ReactNode }>;
  className?: string;
  columns?: 1 | 2 | 3;
}) {
  return (
    <DefinitionList className={className} columns={columns}>
      {items.map((item, index) => (
        <DetailItem key={`${String(item.label)}-${index}`} label={item.label} value={item.value} />
      ))}
    </DefinitionList>
  );
}

export function KeyValueCard({
  className,
  description,
  items,
  title,
}: {
  className?: string;
  description?: ReactNode;
  items: Array<{ label: ReactNode; value: ReactNode }>;
  title: ReactNode;
}) {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description ? <CardDescription>{description}</CardDescription> : null}
      </CardHeader>
      <CardContent>
        <DetailGrid items={items} />
      </CardContent>
    </Card>
  );
}

export function ReadonlyCodeBlock({
  children,
  className,
  emptyLabel = "暂无内容",
  title,
}: {
  children?: ReactNode;
  className?: string;
  emptyLabel?: ReactNode;
  title?: ReactNode;
}) {
  const content = typeof children === "string" ? children.trim() : children;

  return (
    <div className={cn("grid gap-3 rounded-3xl border border-border bg-slate-950 px-5 py-4 text-slate-100", className)}>
      {title ? <div className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">{title}</div> : null}
      <AppScrollbar className="max-h-80">
        <pre className="whitespace-pre-wrap break-all pr-1 text-xs leading-6">{content || emptyLabel}</pre>
      </AppScrollbar>
    </div>
  );
}

export function InlineNotice({
  actions,
  children,
  className,
  effect = "light",
  tone,
  title,
  type = "info",
}: {
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  effect?: "light" | "solid";
  tone?: "info" | "success" | "warning" | "danger" | "error";
  title?: ReactNode;
  type?: "info" | "success" | "warning" | "danger" | "error";
}) {
  const resolvedType = tone ?? type;
  const toneClass: Record<string, { light: string; solid: string }> = {
    danger: {
      light: "border-destructive/20 bg-destructive/10 text-destructive",
      solid: "border-destructive bg-destructive text-destructive-foreground",
    },
    error: {
      light: "border-destructive/20 bg-destructive/10 text-destructive",
      solid: "border-destructive bg-destructive text-destructive-foreground",
    },
    info: {
      light: "border-primary/20 bg-primary/10 text-primary",
      solid: "border-primary bg-primary text-primary-foreground",
    },
    success: {
      light: "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
      solid: "border-emerald-600 bg-emerald-600 text-white dark:bg-emerald-500",
    },
    warning: {
      light: "border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300",
      solid: "border-amber-500 bg-amber-500 text-amber-950",
    },
  };

  return (
    <div className={cn("flex flex-wrap items-start justify-between gap-3 rounded-2xl border px-4 py-3", toneClass[resolvedType][effect], className)}>
      <div className="min-w-0 space-y-1">
        {title ? <p className="text-sm font-semibold">{title}</p> : null}
        <div className="text-sm leading-6">{children}</div>
      </div>
      {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export function FormSection({
  children,
  className,
  description,
  title,
}: {
  children: ReactNode;
  className?: string;
  description?: ReactNode;
  title: ReactNode;
}) {
  return (
    <div className={cn("grid gap-4 rounded-3xl border border-border/70 bg-secondary/20 p-5", className)}>
      <div className="space-y-1">
        <h3 className="text-base font-semibold text-foreground">{title}</h3>
        {description ? <p className="text-sm leading-6 text-muted-foreground">{description}</p> : null}
      </div>
      {children}
    </div>
  );
}

export function EmptyLogState({
  action,
  className,
  description = "当前没有日志输出。",
  title = "暂无日志",
}: {
  action?: ReactNode;
  className?: string;
  description?: ReactNode;
  title?: ReactNode;
}) {
  return <EmptyState action={action} className={className} description={description} scene="empty" title={title} />;
}
