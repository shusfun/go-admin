import { useImageCaptcha, type ImageCaptchaPayload } from "@go-admin/auth";
import type { ComponentProps } from "react";

export type MobileImageCaptchaFieldProps = {
  debounceMs?: number;
  getCaptcha: () => Promise<ImageCaptchaPayload>;
  imageAlt: string;
  inputProps?: ComponentProps<"input">;
  onCaptchaChange?: (payload: ImageCaptchaPayload | null) => void;
  refreshLabel: string;
  refreshToken?: number | string;
};

export function MobileImageCaptchaField({
  debounceMs,
  getCaptcha,
  imageAlt,
  inputProps,
  onCaptchaChange,
  refreshLabel,
  refreshToken,
}: MobileImageCaptchaFieldProps) {
  const { image, loading, refresh } = useImageCaptcha(getCaptcha, {
    debounceMs,
    onChange: onCaptchaChange,
    refreshToken,
  });

  return (
    <div className="mobile-image-captcha">
      <input {...inputProps} />
      <button
        aria-busy={loading}
        className="mobile-image-captcha__preview"
        disabled={loading}
        onClick={() => void refresh()}
        type="button"
      >
        {image ? <img alt={imageAlt} src={image} /> : refreshLabel}
      </button>
    </div>
  );
}
