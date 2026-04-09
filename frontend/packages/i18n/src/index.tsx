import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from "react";

export const supportedLocales = ["zh-CN", "en-US"] as const;

export type Locale = (typeof supportedLocales)[number];
export type I18nParams = Record<string, number | string>;
export type MessageDictionary = Record<string, string>;
export type LocaleMessages<L extends string = Locale> = Record<L, MessageDictionary>;
export type Translator = (key: string, fallback?: string, params?: I18nParams) => string;

const I18N_QUERY_KEY = "lang";

type I18nContextValue = {
  formatDate: (value: Date | number | string, options?: Intl.DateTimeFormatOptions) => string;
  formatNumber: (value: number, options?: Intl.NumberFormatOptions) => string;
  has: (key: string) => boolean;
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: Translator;
};

const I18nContext = createContext<I18nContextValue | null>(null);

function normalizeLocaleCandidate(value?: string | null) {
  if (!value) {
    return null;
  }

  const normalized = value.trim().toLowerCase();
  if (!normalized) {
    return null;
  }

  if (normalized.startsWith("zh")) {
    return "zh-CN";
  }

  if (normalized.startsWith("en")) {
    return "en-US";
  }

  return null;
}

function formatTemplate(template: string, params?: I18nParams) {
  if (!params) {
    return template;
  }

  return template.replace(/\{(\w+)\}/g, (_, key: string) => String(params[key] ?? ""));
}

export function resolveLocale(value?: string | null, fallback: Locale = "zh-CN"): Locale {
  const normalized = normalizeLocaleCandidate(value);
  return normalized ?? fallback;
}

export function detectLocale({
  fallback = "zh-CN",
  storageKey = "suiyuan:locale",
}: {
  fallback?: Locale;
  storageKey?: string;
} = {}): Locale {
  if (typeof window === "undefined") {
    return fallback;
  }

  const url = new URL(window.location.href);
  const fromQuery = resolveLocale(url.searchParams.get(I18N_QUERY_KEY), fallback);
  if (url.searchParams.has(I18N_QUERY_KEY)) {
    return fromQuery;
  }

  const fromStorage = resolveLocale(window.localStorage.getItem(storageKey), fallback);
  if (window.localStorage.getItem(storageKey)) {
    return fromStorage;
  }

  return resolveLocale(window.navigator.language, fallback);
}

export function getMessage<L extends string>(messages: LocaleMessages<L>, locale: L, key: string, fallback?: string, params?: I18nParams) {
  const template = messages[locale]?.[key] ?? fallback ?? key;
  return formatTemplate(template, params);
}

export function I18nProvider({
  children,
  fallbackLocale = "zh-CN",
  initialLocale,
  messages,
  storageKey = "suiyuan:locale",
}: PropsWithChildren<{
  fallbackLocale?: Locale;
  initialLocale?: Locale;
  messages: LocaleMessages;
  storageKey?: string;
}>) {
  const [locale, setLocale] = useState<Locale>(() => initialLocale ?? detectLocale({ fallback: fallbackLocale, storageKey }));

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(storageKey, locale);
    document.documentElement.lang = locale;

    const url = new URL(window.location.href);
    url.searchParams.set(I18N_QUERY_KEY, locale);
    window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
  }, [locale, storageKey]);

  const value = useMemo<I18nContextValue>(
    () => ({
      formatDate: (input, options) => {
        const value = input instanceof Date ? input : new Date(input);
        return new Intl.DateTimeFormat(locale, options).format(value);
      },
      formatNumber: (input, options) => new Intl.NumberFormat(locale, options).format(input),
      has: (key) => key in (messages[locale] ?? {}),
      locale,
      setLocale,
      t: (key, fallback, params) => getMessage(messages, locale, key, fallback, params),
    }),
    [locale, messages],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error("useI18n 必须在 I18nProvider 内使用");
  }
  return context;
}
