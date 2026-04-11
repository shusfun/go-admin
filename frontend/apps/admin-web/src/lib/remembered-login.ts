export const REMEMBERED_LOGIN_COOKIE_NAME = "go_admin_admin_login";
export const REMEMBERED_LOGIN_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;

export type RememberedLogin = {
  password: string;
  remember: true;
  username: string;
};

type RememberedLoginCookiePayload = {
  password: string;
  username: string;
  version: 1;
};

function canUseDocument() {
  return typeof document !== "undefined";
}

function readCookie(name: string) {
  if (!canUseDocument()) {
    return null;
  }

  const prefix = `${name}=`;
  const cookie = document.cookie
    .split(";")
    .map((item) => item.trim())
    .find((item) => item.startsWith(prefix));

  if (!cookie) {
    return null;
  }

  return cookie.slice(prefix.length);
}

function writeCookie(name: string, value: string, maxAgeSeconds: number) {
  if (!canUseDocument()) {
    return;
  }

  const expires = new Date(Date.now() + maxAgeSeconds * 1000).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(value)}; Path=/; Max-Age=${maxAgeSeconds}; Expires=${expires}; SameSite=Lax`;
}

function deleteCookie(name: string) {
  if (!canUseDocument()) {
    return;
  }

  document.cookie = `${name}=; Path=/; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax`;
}

export function buildRememberedLoginDefaults(remembered: RememberedLogin | null) {
  return {
    password: remembered?.password ?? "",
    remember: remembered?.remember ?? false,
    username: remembered?.username ?? "",
  };
}

export function readRememberedLogin(): RememberedLogin | null {
  const raw = readCookie(REMEMBERED_LOGIN_COOKIE_NAME);
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(decodeURIComponent(raw)) as Partial<RememberedLoginCookiePayload>;
    if (parsed.version !== 1 || typeof parsed.username !== "string" || typeof parsed.password !== "string") {
      deleteCookie(REMEMBERED_LOGIN_COOKIE_NAME);
      return null;
    }

    return {
      password: parsed.password,
      remember: true,
      username: parsed.username,
    };
  } catch {
    deleteCookie(REMEMBERED_LOGIN_COOKIE_NAME);
    return null;
  }
}

export function writeRememberedLogin(input: Pick<RememberedLogin, "password" | "username">) {
  writeCookie(
    REMEMBERED_LOGIN_COOKIE_NAME,
    JSON.stringify({
      password: input.password,
      username: input.username,
      version: 1,
    } satisfies RememberedLoginCookiePayload),
    REMEMBERED_LOGIN_MAX_AGE_SECONDS,
  );
}

export function clearRememberedLogin() {
  deleteCookie(REMEMBERED_LOGIN_COOKIE_NAME);
}
