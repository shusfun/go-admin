// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  buildRememberedLoginDefaults,
  clearRememberedLogin,
  readRememberedLogin,
  REMEMBERED_LOGIN_COOKIE_NAME,
  REMEMBERED_LOGIN_MAX_AGE_SECONDS,
  writeRememberedLogin,
} from "./remembered-login";

let lastCookieWrite = "";
let originalCookieDescriptor: PropertyDescriptor | undefined;

function installCookieMock() {
  const cookieStore = new Map<string, string>();

  Object.defineProperty(document, "cookie", {
    configurable: true,
    get() {
      return Array.from(cookieStore.entries())
        .map(([name, value]) => `${name}=${value}`)
        .join("; ");
    },
    set(value: string) {
      lastCookieWrite = value;

      const [nameValuePart] = value.split(";");
      const separatorIndex = nameValuePart.indexOf("=");
      const name = nameValuePart.slice(0, separatorIndex);
      const cookieValue = nameValuePart.slice(separatorIndex + 1);
      const maxAgeMatch = value.match(/Max-Age=(-?\d+)/);
      const maxAge = maxAgeMatch ? Number(maxAgeMatch[1]) : null;

      if (maxAge !== null && maxAge <= 0) {
        cookieStore.delete(name);
        return;
      }

      cookieStore.set(name, cookieValue);
    },
  });
}

describe("remembered-login", () => {
  beforeEach(() => {
    originalCookieDescriptor = Object.getOwnPropertyDescriptor(document, "cookie");
    lastCookieWrite = "";
    installCookieMock();
  });

  afterEach(() => {
    if (originalCookieDescriptor) {
      Object.defineProperty(document, "cookie", originalCookieDescriptor);
    }
  });

  it("写入 30 天记住登录 cookie 并能读回", () => {
    writeRememberedLogin({
      password: "admin123",
      username: "admin",
    });

    expect(lastCookieWrite).toContain(`${REMEMBERED_LOGIN_COOKIE_NAME}=`);
    expect(lastCookieWrite).toContain(`Max-Age=${REMEMBERED_LOGIN_MAX_AGE_SECONDS}`);
    expect(lastCookieWrite).toContain("SameSite=Lax");
    expect(readRememberedLogin()).toEqual({
      password: "admin123",
      remember: true,
      username: "admin",
    });
  });

  it("清理后不再返回已记住账号", () => {
    writeRememberedLogin({
      password: "admin123",
      username: "admin",
    });

    clearRememberedLogin();

    expect(lastCookieWrite).toContain("Max-Age=0");
    expect(readRememberedLogin()).toBeNull();
  });

  it("损坏的 cookie 会被丢弃并回退为空默认值", () => {
    document.cookie = `${REMEMBERED_LOGIN_COOKIE_NAME}=not-json`;

    expect(readRememberedLogin()).toBeNull();
    expect(buildRememberedLoginDefaults(readRememberedLogin())).toEqual({
      password: "",
      remember: false,
      username: "",
    });
  });
});
