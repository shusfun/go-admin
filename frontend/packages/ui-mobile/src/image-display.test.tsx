// @vitest-environment jsdom
import { describe, expect, it } from "vitest";

import { buildImageVariantSource, normalizeImageSource, resolveImageVariantSize } from "./image-display";

describe("ui-mobile image helpers", () => {
  it("会规范化 static 相对路径并按尺寸拼接 webp 变体后缀", () => {
    expect(normalizeImageSource("static/uploadfile/avatar/demo.webp")).toBe("/static/uploadfile/avatar/demo.webp");
    expect(buildImageVariantSource("/static/uploadfile/avatar/demo.webp", 128)).toBe("/static/uploadfile/avatar/demo@128.webp");
    expect(buildImageVariantSource("/static/uploadfile/avatar/demo.webp", 512)).toBe("/static/uploadfile/avatar/demo.webp");
  });

  it("会根据展示尺寸和 dpr 选择最接近的档位", () => {
    expect(resolveImageVariantSize(28, 1)).toBe(64);
    expect(resolveImageVariantSize(40, 2)).toBe(128);
    expect(resolveImageVariantSize(140, 2)).toBe(512);
  });
});
