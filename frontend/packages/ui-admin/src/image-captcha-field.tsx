import { useImageCaptcha, type ImageCaptchaPayload } from "@go-admin/auth";
import type { ComponentProps } from "react";

import { cn } from "./lib/utils";
import { Input } from "./primitives/form-controls";

export type ImageCaptchaFieldProps = {
  buttonClassName?: string;
  debounceMs?: number;
  getCaptcha: () => Promise<ImageCaptchaPayload>;
  gridClassName?: string;
  imageAlt: string;
  inputProps?: ComponentProps<typeof Input>;
  onCaptchaChange?: (payload: ImageCaptchaPayload | null) => void;
  refreshLabel: string;
  refreshToken?: number | string;
};

export function ImageCaptchaField({
  buttonClassName,
  debounceMs,
  getCaptcha,
  gridClassName,
  imageAlt,
  inputProps,
  onCaptchaChange,
  refreshLabel,
  refreshToken,
}: ImageCaptchaFieldProps) {
  const { image, loading, refresh } = useImageCaptcha(getCaptcha, {
    debounceMs,
    onChange: onCaptchaChange,
    refreshToken,
  });

  return (
    <div className={cn("grid gap-3 sm:grid-cols-[minmax(0,1fr)_148px]", gridClassName)}>
      <Input {...inputProps} />
      <button
        aria-busy={loading}
        className={cn(
          "grid h-10 place-items-center overflow-hidden rounded-xl border border-border bg-background disabled:cursor-not-allowed disabled:opacity-60",
          buttonClassName,
        )}
        disabled={loading}
        onClick={() => void refresh()}
        type="button"
      >
        {image ? <img alt={imageAlt} className="h-full w-full object-cover" src={image} /> : refreshLabel}
      </button>
    </div>
  );
}
