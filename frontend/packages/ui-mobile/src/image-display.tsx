import {
  forwardRef,
  useEffect,
  useRef,
  useState,
  type ImgHTMLAttributes,
} from "react";
import type { ImageAsset } from "@go-admin/types";

const DEFAULT_IMAGE_VARIANT_SIZES = [64, 128, 256, 512];

export type ImageSource = string | ImageAsset | null | undefined;

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

type ImageProps = Omit<ImgHTMLAttributes<HTMLImageElement>, "src"> & {
  src?: ImageSource;
  variantSizes?: number[];
  fallbackSrc?: string;
};

export const Image = forwardRef<HTMLImageElement, ImageProps>(function Image(
  { src, variantSizes, fallbackSrc, onError, ...props },
  ref,
) {
  const localRef = useRef<HTMLImageElement | null>(null);
  const [displaySize, setDisplaySize] = useState(0);
  const [resolvedOverride, setResolvedOverride] = useState("");
  const normalizedSource = normalizeImageSource(src);
  const masterSource = typeof normalizedSource === "string" ? normalizedSource : normalizedSource?.path ?? "";
  const sizes = extractVariantSizes(src, variantSizes);
  const preferredSource = buildImageVariantSource(
    src,
    resolveImageVariantSize(displaySize, typeof window === "undefined" ? 1 : window.devicePixelRatio || 1, sizes),
    sizes,
  );
  const normalizedFallbackSource = normalizePathValue(fallbackSrc);

  useEffect(() => {
    setResolvedOverride("");
  }, [masterSource, normalizedFallbackSource]);

  useEffect(() => {
    const element = localRef.current;
    if (!element) {
      return;
    }

    const updateDisplaySize = (nextSize: number) => {
      if (!Number.isFinite(nextSize) || nextSize <= 0) {
        return;
      }
      setDisplaySize(nextSize);
    };

    updateDisplaySize(Math.max(element.clientWidth, element.clientHeight));

    if (typeof ResizeObserver === "undefined") {
      return;
    }

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) {
        return;
      }
      updateDisplaySize(Math.max(entry.contentRect.width, entry.contentRect.height));
    });

    observer.observe(element);
    return () => observer.disconnect();
  }, [masterSource]);

  const resolvedSource = resolvedOverride || preferredSource || masterSource || normalizedFallbackSource;

  if (!resolvedSource) {
    return null;
  }

  return (
    <img
      {...props}
      onError={(event) => {
        if (resolvedSource && resolvedSource !== masterSource && masterSource) {
          setResolvedOverride(masterSource);
        } else if (resolvedSource && resolvedSource !== normalizedFallbackSource && normalizedFallbackSource) {
          setResolvedOverride(normalizedFallbackSource);
        }
        onError?.(event);
      }}
      ref={(node) => {
        localRef.current = node;
        if (typeof ref === "function") {
          ref(node);
          return;
        }
        if (ref) {
          ref.current = node;
        }
      }}
      src={resolvedSource}
    />
  );
});
