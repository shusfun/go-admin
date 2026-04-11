// @vitest-environment jsdom
import { act, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AppScrollbar, AppVirtualList, Backtop, buildImageVariantSource, DatePicker, DateRangePicker, Form, ImageCaptchaField, Input, Textarea, type DateRangePickerValue } from "./index";

let host: HTMLDivElement;
let root: Root;

function applyTextValue(element: HTMLInputElement, value: string) {
  const descriptor = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value");
  descriptor?.set?.call(element, value);
  element.dispatchEvent(new Event("input", { bubbles: true }));
}

function findButtonByText(text: string) {
  return Array.from(document.querySelectorAll("button")).find((item) => item.textContent?.trim() === text) as HTMLButtonElement | undefined;
}

async function flushAct(rounds = 3) {
  for (let index = 0; index < rounds; index += 1) {
    await act(async () => {
      await Promise.resolve();
    });
  }
}

beforeEach(() => {
  (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  (
    globalThis as typeof globalThis & {
      ResizeObserver?: new (callback: ResizeObserverCallback) => ResizeObserver;
    }
  ).ResizeObserver = class ResizeObserver {
    disconnect() {}

    observe() {}

    unobserve() {}
  } as typeof ResizeObserver;
  (globalThis as typeof globalThis & { PointerEvent?: typeof MouseEvent }).PointerEvent = MouseEvent as typeof PointerEvent;
  document.documentElement.lang = "zh-CN";
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

function InputTabCompletionDemo() {
  const [value, setValue] = useState("ops");

  return (
    <Input
      completePlaceholderOnTab
      onChange={(event) => setValue(event.target.value)}
      placeholder="ops-worker"
      value={value}
    />
  );
}

function TextareaTabCompletionDemo() {
  const [value, setValue] = useState("请在变更窗口内");

  return (
    <Textarea
      completePlaceholderOnTab
      onChange={(event) => setValue(event.target.value)}
      placeholder="请在变更窗口内完成灰度、观测与回滚预案确认。"
      rows={4}
      value={value}
    />
  );
}

function PasswordToggleDemo() {
  return <Input defaultValue="admin123" type="password" />;
}

function PasswordToggleDisabledDemo() {
  return <Input defaultValue="admin123" passwordToggle={false} type="password" />;
}

function DatePickerFormatDemo() {
  const [value, setValue] = useState<string | undefined>("2026-04-09");

  return (
    <div>
      <DatePicker onChange={(next) => setValue(typeof next === "string" ? next : undefined)} value={value} valueFormat="YYYY-MM-DD" />
      <div data-value>{value ?? "empty"}</div>
    </div>
  );
}

function DatePickerImmediateSelectDemo() {
  const [value, setValue] = useState<string | undefined>();

  return (
    <div>
      <DatePicker onChange={(next) => setValue(typeof next === "string" ? next : undefined)} value={value} valueFormat="YYYY-MM-DD" />
      <div data-picked>{value ?? "empty"}</div>
    </div>
  );
}

function DateRangePickerFormatDemo() {
  const [value, setValue] = useState<DateRangePickerValue>();

  return (
    <div>
      <DateRangePicker
        defaultTime={[new Date(2000, 0, 1, 0, 0, 0), new Date(2000, 0, 1, 23, 59, 59)]}
        onChange={setValue}
        value={value}
        valueFormat="YYYY-MM-DD HH:mm:ss"
      />
      <div data-range>{value ? JSON.stringify(value) : "empty"}</div>
    </div>
  );
}

function DateRangePickerLongRangeDemo() {
  const [value, setValue] = useState<DateRangePickerValue>();

  return (
    <div>
      <DateRangePicker onChange={setValue} value={value} valueFormat="YYYY-MM-DD" />
      <div data-long-range>{value ? JSON.stringify(value) : "empty"}</div>
    </div>
  );
}

function VirtualListAnchorDemo() {
  const [expanded, setExpanded] = useState(false);
  const rows = [
    { id: "row-a", height: expanded ? 120 : 40, label: "alpha" },
    { id: "row-b", height: 40, label: "bravo" },
    { id: "row-c", height: 40, label: "charlie" },
    { id: "row-d", height: 40, label: "delta" },
    { id: "row-e", height: 40, label: "echo" },
  ];

  return (
    <div>
      <button onClick={() => setExpanded(true)} type="button">
        expand-anchor
      </button>
      <AppVirtualList
        contentProps={{ id: "anchor-virtual-content" }}
        estimatedItemSize={40}
        getItemKey={(item) => item.id}
        items={rows}
        overscan={1}
        rootSlot={<section className="h-32 rounded-xl border" data-kind="anchor-virtual-root" />}
      >
        {(item) => (
          <article className="anchor-row" style={{ height: `${item.height}px` }}>
            {item.label}
          </article>
        )}
      </AppVirtualList>
    </div>
  );
}

describe("ui-admin primitives", () => {
  it("Input 在启用 completePlaceholderOnTab 时按 Tab 用 placeholder 补全", async () => {
    await act(async () => {
      root.render(<InputTabCompletionDemo />);
    });

    const input = document.querySelector("input");
    expect(input).toBeTruthy();

    input?.setSelectionRange(input.value.length, input.value.length);

    await act(async () => {
      input?.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, cancelable: true, key: "Tab" }));
    });

    expect(input?.value).toBe("ops-worker");
  });

  it("Textarea 在启用 completePlaceholderOnTab 时按 Tab 用 placeholder 补全", async () => {
    await act(async () => {
      root.render(<TextareaTabCompletionDemo />);
    });

    const textarea = document.querySelector("textarea");
    expect(textarea).toBeTruthy();

    textarea?.setSelectionRange(textarea.value.length, textarea.value.length);

    await act(async () => {
      textarea?.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, cancelable: true, key: "Tab" }));
    });

    expect(textarea?.value).toBe("请在变更窗口内完成灰度、观测与回滚预案确认。");
  });

  it("Input 在 password 类型下默认支持明文切换", async () => {
    await act(async () => {
      root.render(<PasswordToggleDemo />);
    });

    const input = document.querySelector("input") as HTMLInputElement | null;
    const toggle = document.querySelector("button[aria-label='显示密码']") as HTMLButtonElement | null;

    expect(input?.type).toBe("password");
    expect(toggle).toBeTruthy();
    expect(toggle?.getAttribute("aria-pressed")).toBe("false");

    await act(async () => {
      toggle?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(input?.type).toBe("text");
    expect(toggle?.getAttribute("aria-label")).toBe("隐藏密码");
    expect(toggle?.getAttribute("aria-pressed")).toBe("true");
  });

  it("Input 将尺寸类挂载到外层容器，避免在 grid 拉伸时壳子与输入区高度脱节", async () => {
    await act(async () => {
      root.render(<Input placeholder="请输入验证码" />);
    });

    const input = document.querySelector("input") as HTMLInputElement | null;
    const shell = input?.parentElement as HTMLDivElement | null;

    expect(shell).toBeTruthy();
    expect(shell?.className).toContain("h-10");
    expect(shell?.className).toContain("text-sm");
    expect(input?.className).not.toContain("h-10");
  });

  it("Input 可关闭 password 明文切换能力", async () => {
    await act(async () => {
      root.render(<PasswordToggleDisabledDemo />);
    });

    const input = document.querySelector("input") as HTMLInputElement | null;
    const toggle = document.querySelector("button[aria-label='显示密码']");

    expect(input?.type).toBe("password");
    expect(toggle).toBeNull();
  });

  it("ImageCaptchaField 在短时间重复点击时只发起一条刷新请求，并在冷却后允许再次刷新", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-10T16:30:00+08:00"));

    let resolveRefresh: ((value: { image: string; uuid: string }) => void) | undefined;
    const getCaptcha = vi
      .fn<() => Promise<{ image: string; uuid: string }>>()
      .mockResolvedValueOnce({ image: "data:image/png;base64,first", uuid: "first" })
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveRefresh = resolve;
          }),
      )
      .mockResolvedValue({ image: "data:image/png;base64,third", uuid: "third" });

    try {
      await act(async () => {
        root.render(
          <ImageCaptchaField
            getCaptcha={getCaptcha}
            imageAlt="captcha"
            inputProps={{ placeholder: "请输入验证码" }}
            refreshLabel="刷新验证码"
          />,
        );
      });
      await flushAct();

      const button = host.querySelector("button") as HTMLButtonElement | null;
      expect(button).toBeTruthy();
      expect(getCaptcha).toHaveBeenCalledTimes(1);

      await act(async () => {
        vi.advanceTimersByTime(801);
      });

      await act(async () => {
        button?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
        button?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
        button?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      });

      expect(getCaptcha).toHaveBeenCalledTimes(2);

      await act(async () => {
        resolveRefresh?.({ image: "data:image/png;base64,second", uuid: "second" });
      });
      await flushAct();

      await act(async () => {
        button?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      });
      expect(getCaptcha).toHaveBeenCalledTimes(2);

      await act(async () => {
        vi.advanceTimersByTime(801);
      });

      await act(async () => {
        button?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      });
      expect(getCaptcha).toHaveBeenCalledTimes(3);
    } finally {
      vi.useRealTimers();
    }
  });

  it("Form 根据 layout 输出对应布局类名", async () => {
    await act(async () => {
      root.render(
        <div>
          <Form data-kind="vertical">
            <div>vertical</div>
          </Form>
          <Form data-kind="inline" layout="inline">
            <div>inline</div>
          </Form>
        </div>,
      );
    });

    const verticalForm = document.querySelector("form[data-kind='vertical']");
    const inlineForm = document.querySelector("form[data-kind='inline']");

    expect(verticalForm?.className).toContain("grid");
    expect(inlineForm?.className).toContain("flex");
  });

  it("AppScrollbar 输出统一滚动容器结构", async () => {
    await act(async () => {
      root.render(
        <AppScrollbar className="max-h-24" viewportClassName="pr-1" viewportProps={{ className: "pl-2", id: "test-scroll-root" }}>
          <div style={{ height: "240px" }}>scroll content</div>
        </AppScrollbar>,
      );
    });

    const scrollRoot = host.firstElementChild as HTMLElement | null;
    const viewport = host.querySelector("[data-radix-scroll-area-viewport]");
    expect(scrollRoot?.className).toContain("max-h-24");
    expect(viewport?.className).toContain("pr-1");
    expect(viewport?.className).toContain("pl-2");
    expect((viewport as HTMLElement | null)?.id).toBe("test-scroll-root");
    expect(host.textContent).toContain("scroll content");
  });

  it("AppScrollbar 支持根节点 slot", async () => {
    await act(async () => {
      root.render(
        <AppScrollbar
          className="max-h-24"
          rootSlot={<section data-kind="slot-root" />}
          viewportProps={{ id: "slot-viewport" }}
        >
          <div>slot content</div>
        </AppScrollbar>,
      );
    });

    const scrollRoot = host.querySelector("section[data-kind='slot-root']") as HTMLElement | null;
    const viewport = host.querySelector("#slot-viewport");

    expect(scrollRoot?.className).toContain("max-h-24");
    expect(viewport).toBeTruthy();
    expect(scrollRoot?.textContent).toContain("slot content");
  });

  it("AppVirtualList 仅渲染当前视口附近的项目并保留 slot 容器", async () => {
    const rows = Array.from({ length: 40 }, (_, index) => ({ id: `row-${index}`, label: `row-${index}` }));

    await act(async () => {
      root.render(
        <AppVirtualList
          contentProps={{ id: "virtual-content" }}
          estimatedItemSize={40}
          getItemKey={(item) => item.id}
          itemClassName="virtual-item"
          items={rows}
          overscan={1}
          rootSlot={<section className="h-32 rounded-xl border" data-kind="virtual-root" />}
        >
          {(item, index) => (
            <article className="row-entry" data-row-index={index}>
              {item.label}
            </article>
          )}
        </AppVirtualList>,
      );
    });

    const rootSection = host.querySelector("section[data-kind='virtual-root']") as HTMLElement | null;
    const viewport = host.querySelector("[data-radix-scroll-area-viewport]") as HTMLDivElement | null;
    const content = host.querySelector("#virtual-content") as HTMLDivElement | null;

    expect(rootSection).toBeTruthy();
    expect(viewport).toBeTruthy();
    expect(content).toBeTruthy();
    expect(rootSection?.className).toContain("h-32");
    expect(content?.style.height).toBe("1600px");

    if (viewport) {
      Object.defineProperty(viewport, "clientHeight", { configurable: true, value: 120 });
    }

    await act(async () => {
      if (viewport) {
        viewport.scrollTop = 200;
        viewport.dispatchEvent(new Event("scroll"));
      }
    });

    expect(host.querySelector("[data-row-index='0']")).toBeFalsy();
    expect(host.querySelector("[data-row-index='4']")).toBeTruthy();
    expect(host.querySelector("[data-row-index='8']")).toBeTruthy();
    expect(host.querySelector("[data-row-index='12']")).toBeFalsy();
    expect(host.querySelector("[data-virtual-index='4']")?.className).toContain("virtual-item");
    expect(host.querySelector("[data-row-index='4']")?.className).toContain("row-entry");
  });

  it("AppVirtualList 支持由内容撑开单项高度", async () => {
    const rows = [
      { id: "a", height: 48, label: "alpha" },
      { id: "b", height: 92, label: "bravo" },
      { id: "c", height: 64, label: "charlie" },
    ];

    await act(async () => {
      root.render(
        <AppVirtualList
          contentProps={{ id: "dynamic-virtual-content" }}
          estimatedItemSize={32}
          getItemKey={(item) => item.id}
          items={rows}
          overscan={1}
          rootSlot={<section className="h-48 rounded-xl border" data-kind="dynamic-virtual-root" />}
        >
          {(item, index) => (
            <article className="dynamic-row" data-dynamic-index={index} style={{ height: `${item.height}px` }}>
              {item.label}
            </article>
          )}
        </AppVirtualList>,
      );
    });

    await flushAct();

    const content = host.querySelector("#dynamic-virtual-content") as HTMLDivElement | null;
    const secondWrapper = host.querySelector("[data-virtual-index='1']") as HTMLDivElement | null;

    expect(content?.style.height).toBe("204px");
    expect(secondWrapper?.style.transform).toBe("translateY(48px)");
    expect(host.querySelector("[data-dynamic-index='1']")?.textContent).toContain("bravo");
  });

  it("AppVirtualList 在视口上方项目高度变化时保持锚点位置稳定", async () => {
    await act(async () => {
      root.render(<VirtualListAnchorDemo />);
    });

    await flushAct();

    const viewport = host.querySelector("[data-radix-scroll-area-viewport]") as HTMLDivElement | null;
    const expandButton = Array.from(document.querySelectorAll("button")).find((item) => item.textContent?.trim() === "expand-anchor");

    expect(viewport).toBeTruthy();
    expect(expandButton).toBeTruthy();

    if (viewport) {
      Object.defineProperty(viewport, "clientHeight", { configurable: true, value: 120 });
    }

    await act(async () => {
      if (viewport) {
        viewport.scrollTop = 50;
        viewport.dispatchEvent(new Event("scroll"));
      }
    });

    await act(async () => {
      expandButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    await flushAct();

    expect(viewport?.scrollTop).toBe(130);
    expect(host.querySelector("[data-virtual-index='1']")?.textContent).toContain("bravo");
  });

  it("Backtop 监听 content 容器滚动并限制纵向拖拽边界", async () => {
    await act(async () => {
      root.render(
        <div id="test-backtop-pane" style={{ height: "120px", overflowY: "auto", position: "relative" }}>
          <div style={{ height: "480px" }}>scroll content</div>
          <Backtop draggable maxDragOffset={300} target="#test-backtop-pane" visibilityHeight={120} />
        </div>,
      );
    });

    const pane = document.getElementById("test-backtop-pane") as HTMLDivElement | null;
    const button = document.querySelector("button[aria-hidden]") as HTMLButtonElement | null;
    expect(pane).toBeTruthy();
    expect(button).toBeTruthy();
    expect(button?.tabIndex).toBe(-1);

    if (button) {
      Object.defineProperty(button, "offsetHeight", { configurable: true, value: 44 });
    }

    await act(async () => {
      if (pane) {
        pane.scrollTop = 160;
        pane.dispatchEvent(new Event("scroll"));
      }
    });

    expect(button?.tabIndex).toBe(0);

    await act(async () => {
      button?.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, clientY: 320, pointerId: 1 }));
      window.dispatchEvent(new PointerEvent("pointermove", { bubbles: true, clientY: -200, pointerId: 1 }));
      window.dispatchEvent(new PointerEvent("pointerup", { bubbles: true, clientY: -200, pointerId: 1 }));
    });

    expect(button?.style.bottom).toBe("332px");

    await act(async () => {
      button?.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, clientY: 180, pointerId: 2 }));
      window.dispatchEvent(new PointerEvent("pointermove", { bubbles: true, clientY: 620, pointerId: 2 }));
      window.dispatchEvent(new PointerEvent("pointerup", { bubbles: true, clientY: 620, pointerId: 2 }));
    });

    expect(button?.style.bottom).toBe("8px");
  });

  it("DatePicker 在 valueFormat 模式下提交格式化字符串", async () => {
    await act(async () => {
      root.render(<DatePickerFormatDemo />);
    });

    const input = document.querySelector("input");
    expect(input).toBeTruthy();

    await act(async () => {
      input?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    await flushAct();

    await act(async () => {
      if (input) {
        applyTextValue(input, "2026-04-15");
      }
    });

    await act(async () => {
      input?.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, cancelable: true, key: "Enter" }));
    });
    await flushAct();

    expect(document.querySelector("[data-value]")?.textContent).toBe("2026-04-15");
  });

  it("DatePicker 支持随 lang 属性切换中英文文案", async () => {
    await act(async () => {
      root.render(<DatePicker />);
    });

    const input = document.querySelector("input") as HTMLInputElement | null;
    expect(input?.placeholder).toBe("请选择日期");

    await act(async () => {
      input?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    await flushAct();

    expect(findButtonByText("确定")).toBeFalsy();

    await act(async () => {
      document.documentElement.lang = "en-US";
    });
    await flushAct();

    expect(input?.placeholder).toBe("Select date");
    expect(findButtonByText("OK")).toBeFalsy();
  });

  it("DatePicker 支持单独切换年份和月份面板", async () => {
    await act(async () => {
      root.render(<DatePicker value="2026-04-09" valueFormat="YYYY-MM-DD" />);
    });

    const input = document.querySelector("input") as HTMLInputElement | null;
    await act(async () => {
      input?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    await flushAct();

    const yearToggle = Array.from(document.querySelectorAll("button")).find((item) => item.getAttribute("aria-label") === "切换年份面板");
    expect(yearToggle).toBeTruthy();

    await act(async () => {
      yearToggle?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    await flushAct();

    expect(document.body.textContent).toContain("2020 - 2029");

    const year2028 = findButtonByText("2028");
    expect(year2028).toBeTruthy();

    await act(async () => {
      year2028?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    await flushAct();

    const monthToggle = Array.from(document.querySelectorAll("button")).find((item) => item.getAttribute("aria-label") === "切换月份面板");
    expect(monthToggle?.textContent).toBe("四月");

    await act(async () => {
      monthToggle?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    await flushAct();

    const juneButton = findButtonByText("6月");
    expect(juneButton).toBeTruthy();

    await act(async () => {
      juneButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    await flushAct();

    const updatedMonthToggle = Array.from(document.querySelectorAll("button")).find((item) => item.getAttribute("aria-label") === "切换月份面板");
    expect(updatedMonthToggle?.textContent).toBe("六月");
  });

  it("DatePicker 点击日期后直接完成提交", async () => {
    await act(async () => {
      root.render(<DatePickerImmediateSelectDemo />);
    });

    const input = document.querySelector("input") as HTMLInputElement | null;
    await act(async () => {
      input?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    await flushAct();

    const dayButton = Array.from(document.querySelectorAll(".rdp-day_button")).find((item) => item.textContent?.trim() === "9") as HTMLButtonElement | undefined;
    expect(dayButton).toBeTruthy();
    expect(findButtonByText("确定")).toBeFalsy();

    await act(async () => {
      dayButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    await flushAct();

    expect(document.querySelector("[data-picked]")?.textContent).toBe("2026-04-09");
  });

  it("DateRangePicker 使用 defaultTime 输出闭区间字符串", async () => {
    await act(async () => {
      root.render(<DateRangePickerFormatDemo />);
    });

    const inputs = Array.from(document.querySelectorAll("input"));
    expect(inputs).toHaveLength(2);

    await act(async () => {
      inputs[0]?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    await flushAct();

    await act(async () => {
      if (inputs[0]) {
        applyTextValue(inputs[0], "2026-04-01");
      }
      if (inputs[1]) {
        applyTextValue(inputs[1], "2026-04-08");
      }
    });

    const confirmButton = findButtonByText("确定");
    expect(confirmButton).toBeTruthy();

    await act(async () => {
      confirmButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    await flushAct();

    expect(document.querySelector("[data-range]")?.textContent).toContain("2026-04-01 00:00:00");
    expect(document.querySelector("[data-range]")?.textContent).toContain("2026-04-08 23:59:59");
  });

  it("DateRangePicker 在已打开时切换输入焦点不会重置跨年范围草稿", async () => {
    await act(async () => {
      root.render(<DateRangePickerLongRangeDemo />);
    });

    const inputs = Array.from(document.querySelectorAll("input")) as HTMLInputElement[];
    expect(inputs).toHaveLength(2);

    await act(async () => {
      inputs[0]?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    await flushAct();

    await act(async () => {
      applyTextValue(inputs[0], "2020-01-01");
    });

    await act(async () => {
      inputs[1]?.dispatchEvent(new FocusEvent("focus", { bubbles: true }));
    });
    await flushAct();

    expect(inputs[0]?.value).toBe("2020-01-01");

    await act(async () => {
      applyTextValue(inputs[1], "2026-01-01");
    });

    const confirmButton = findButtonByText("确定");
    expect(confirmButton).toBeTruthy();

    await act(async () => {
      confirmButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    await flushAct();

    expect(document.querySelector("[data-long-range]")?.textContent).toContain("2020-01-01");
    expect(document.querySelector("[data-long-range]")?.textContent).toContain("2026-01-01");
  });

  it("DateRangePicker 左右面板可以独立切换月份", async () => {
    await act(async () => {
      root.render(<DateRangePicker />);
    });

    const inputs = Array.from(document.querySelectorAll("input")) as HTMLInputElement[];
    await act(async () => {
      inputs[0]?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    await flushAct();

    const monthToggles = Array.from(document.querySelectorAll("button")).filter((item) => item.getAttribute("aria-label") === "切换月份面板");
    expect(monthToggles).toHaveLength(2);
    expect(monthToggles[0]?.textContent).toBe("四月");
    expect(monthToggles[1]?.textContent).toBe("五月");

    await act(async () => {
      monthToggles[1]?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    await flushAct();

    const augustButton = findButtonByText("8月");
    expect(augustButton).toBeTruthy();

    await act(async () => {
      augustButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    await flushAct();

    const updatedMonthToggles = Array.from(document.querySelectorAll("button")).filter((item) => item.getAttribute("aria-label") === "切换月份面板");
    expect(updatedMonthToggles[0]?.textContent).toBe("四月");
    expect(updatedMonthToggles[1]?.textContent).toBe("八月");
  });

  it("Image 资源对象会按目标尺寸选择最合适的变体路径", () => {
    const source = {
      path: "/static/uploadfile/avatar/demo.webp",
      size: 512,
      variants: [
        { path: "/static/uploadfile/avatar/demo@64.webp", size: 64 },
        { path: "/static/uploadfile/avatar/demo@128.webp", size: 128 },
        { path: "/static/uploadfile/avatar/demo@256.webp", size: 256 },
      ],
    };

    expect(buildImageVariantSource(source, 128)).toBe("/static/uploadfile/avatar/demo@128.webp");
    expect(buildImageVariantSource(source, 512)).toBe("/static/uploadfile/avatar/demo.webp");
  });
});
