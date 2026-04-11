// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { I18nProvider } from "@go-admin/i18n";

import { adminMessages } from "../i18n/admin";
import { LoginPage } from "./login-page";

let host: HTMLDivElement;
let root: Root;
let originalLocalStorage: Storage;
let originalResizeObserver: typeof globalThis.ResizeObserver | null;

function createLocalStorageMock(): Storage {
  const store = new Map<string, string>();

  return {
    clear() {
      store.clear();
    },
    getItem(key) {
      return store.has(key) ? store.get(key)! : null;
    },
    key(index) {
      return Array.from(store.keys())[index] ?? null;
    },
    get length() {
      return store.size;
    },
    removeItem(key) {
      store.delete(key);
    },
    setItem(key, value) {
      store.set(key, String(value));
    },
  };
}

function findInput(name: string) {
  return document.querySelector(`input[name="${name}"]`) as HTMLInputElement | null;
}

function findButton(label: string) {
  return Array.from(document.querySelectorAll("button")).find((item) => item.textContent?.includes(label)) ?? null;
}

function setNativeValue(input: HTMLInputElement, value: string) {
  const descriptor = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value");
  descriptor?.set?.call(input, value);
  input.dispatchEvent(new Event("input", { bubbles: true }));
  input.dispatchEvent(new Event("change", { bubbles: true }));
}

async function flushPromises(rounds = 4) {
  for (let index = 0; index < rounds; index += 1) {
    await act(async () => {
      await Promise.resolve();
    });
  }
}

describe("LoginPage", () => {
  beforeEach(() => {
    (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    originalLocalStorage = window.localStorage;
    originalResizeObserver = globalThis.ResizeObserver ?? null;
    globalThis.ResizeObserver = class ResizeObserver {
      disconnect() {}
      observe() {}
      unobserve() {}
    };
    Object.defineProperty(window, "localStorage", {
      configurable: true,
      value: createLocalStorageMock(),
    });
    host = document.createElement("div");
    document.body.appendChild(host);
    root = createRoot(host);
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    Object.defineProperty(window, "localStorage", {
      configurable: true,
      value: originalLocalStorage,
    });
    (globalThis as { ResizeObserver?: typeof ResizeObserver }).ResizeObserver = originalResizeObserver ?? undefined;
    host.remove();
    document.body.innerHTML = "";
  });

  it("会用传入的初始值回填账号密码和记住状态", async () => {
    await act(async () => {
      root.render(
        <I18nProvider initialLocale="zh-CN" messages={adminMessages}>
          <LoginPage
            getCaptcha={vi.fn().mockResolvedValue({ image: "", uuid: "" })}
            initialValues={{ password: "admin123", remember: true, username: "admin" }}
            onSubmit={vi.fn()}
            tenantCode="local"
          />
        </I18nProvider>,
      );
    });
    await flushPromises();

    expect(findInput("username")?.value).toBe("admin");
    expect(findInput("password")?.value).toBe("admin123");
    expect(document.querySelector('[role="checkbox"]')?.getAttribute("data-state")).toBe("checked");
  });

  it("提交时会把 remember 一起带上", async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);

    await act(async () => {
      root.render(
        <I18nProvider initialLocale="zh-CN" messages={adminMessages}>
          <LoginPage
            getCaptcha={vi.fn().mockResolvedValue({ image: "", uuid: "" })}
            initialValues={{ password: "", remember: false, username: "" }}
            onSubmit={onSubmit}
            tenantCode="local"
          />
        </I18nProvider>,
      );
    });
    await flushPromises();

    await act(async () => {
      setNativeValue(findInput("username")!, "admin");
      setNativeValue(findInput("password")!, "admin123");
    });

    const rememberToggle = document.querySelector('[role="checkbox"]');
    expect(rememberToggle).toBeTruthy();
    await act(async () => {
      rememberToggle?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    await act(async () => {
      findButton("进入后台")?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    await flushPromises();

    expect(onSubmit).toHaveBeenCalledWith({
      code: "",
      password: "admin123",
      remember: true,
      username: "admin",
      uuid: undefined,
    });
  });

  it("展示传入的品牌名称和 logo", async () => {
    await act(async () => {
      root.render(
        <I18nProvider initialLocale="zh-CN" messages={adminMessages}>
          <LoginPage
            brandLogo="https://example.com/brand.png"
            brandName="随缘管理台"
            getCaptcha={vi.fn().mockResolvedValue({ image: "", uuid: "" })}
            onSubmit={vi.fn()}
            tenantCode="local"
          />
        </I18nProvider>,
      );
    });
    await flushPromises();

    expect(document.body.textContent).toContain("随缘管理台");
    expect(document.querySelector('img[alt="随缘管理台"]')?.getAttribute("src")).toBe("https://example.com/brand.png");
  });
});
