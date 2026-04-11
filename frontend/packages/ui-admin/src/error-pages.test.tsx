// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { Error404, Error500 } from "./index";

let host: HTMLDivElement;
let root: Root;

beforeEach(() => {
  (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  host = document.createElement("div");
  document.body.appendChild(host);
  root = createRoot(host);
});

afterEach(() => {
  act(() => {
    root.unmount();
  });
  host.remove();
  document.body.innerHTML = "";
});

describe("ui-admin error pages", () => {
  it("Error404 渲染默认标题、描述和插画", async () => {
    await act(async () => {
      root.render(<Error404 compact />);
    });

    expect(document.body.textContent).toContain("页面没有找到");
    expect(document.body.textContent).toContain("当前地址不存在");

    const image = document.querySelector("img");
    expect(image?.getAttribute("alt")).toBe("404 页面未找到插画");
    expect(image?.getAttribute("src")).toContain("oops-404-error-with-a-broken-robot-animate.svg");
  });

  it("Error500 支持自定义标题和操作区", async () => {
    await act(async () => {
      root.render(
        <Error500
          action={<button type="button">重试请求</button>}
          compact
          title="服务暂时抖动"
        />,
      );
    });

    expect(document.body.textContent).toContain("服务暂时抖动");
    expect(document.body.textContent).toContain("重试请求");
  });

  it("Error404 传入 null 时覆盖默认徽标和底部说明", async () => {
    await act(async () => {
      root.render(<Error404 badge={null} compact footer={null} />);
    });

    expect(document.body.textContent).not.toContain("地址失效");
    expect(document.body.textContent).not.toContain("建议下一步");
  });

  it("全屏错误页在桌面宽度断点提前切到双列布局，避免 admin-web 出现页面滚动条", async () => {
    await act(async () => {
      root.render(<Error500 />);
    });

    const content = document.querySelector("section > div.relative.grid") as HTMLDivElement | null;
    const illustrationWrap = document.querySelector("section img")?.parentElement as HTMLDivElement | null;
    const image = document.querySelector("section img") as HTMLImageElement | null;

    expect(content?.className).toContain("lg:grid-cols-[minmax(0,0.94fr)_minmax(22rem,1.06fr)]");
    expect(illustrationWrap?.className).toContain("lg:min-h-[22rem]");
    expect(image?.className).toContain("xl:max-h-[30rem]");
  });
});
