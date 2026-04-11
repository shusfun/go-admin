import { useCallback, useEffect, useRef, useState } from "react";
import type { AppSession, ClientType } from "@go-admin/types";

const SESSION_PREFIX = "go-admin:session";

function readStorage() {
  if (typeof window === "undefined") {
    return null;
  }

  return window.localStorage;
}

export function createSessionManager(clientType: ClientType) {
  const storageKey = `${SESSION_PREFIX}:${clientType}`;

  return {
    read() {
      const storage = readStorage();
      if (!storage) {
        return null;
      }

      const raw = storage.getItem(storageKey);
      if (!raw) {
        return null;
      }

      try {
        return JSON.parse(raw) as AppSession;
      } catch {
        storage.removeItem(storageKey);
        return null;
      }
    },
    write(session: AppSession) {
      const storage = readStorage();
      storage?.setItem(storageKey, JSON.stringify(session));
    },
    clear() {
      const storage = readStorage();
      storage?.removeItem(storageKey);
    },
  };
}

export function isSessionExpired(session: AppSession | null) {
  if (!session?.expireAt) {
    return true;
  }

  return Number(new Date(session.expireAt)) <= Date.now();
}

export function toAuthorizationToken(session: AppSession | null) {
  if (!session?.token) {
    return "";
  }

  return `Bearer ${session.token}`;
}

export type ImageCaptchaPayload = {
  image: string;
  uuid: string;
};

type UseImageCaptchaOptions = {
  autoLoad?: boolean;
  debounceMs?: number;
  onChange?: (payload: ImageCaptchaPayload | null) => void;
  refreshToken?: number | string;
};

export function useImageCaptcha(
  loader: () => Promise<ImageCaptchaPayload>,
  {
    autoLoad = true,
    debounceMs = 800,
    onChange,
    refreshToken,
  }: UseImageCaptchaOptions = {},
) {
  const [captcha, setCaptcha] = useState<ImageCaptchaPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const loaderRef = useRef(loader);
  const onChangeRef = useRef(onChange);
  const debounceMsRef = useRef(debounceMs);
  const inFlightRef = useRef(false);
  const lastTriggerAtRef = useRef(0);
  const requestIdRef = useRef(0);
  const captchaRef = useRef<ImageCaptchaPayload | null>(null);
  const refreshTokenRef = useRef(refreshToken);

  useEffect(() => {
    loaderRef.current = loader;
  }, [loader]);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    debounceMsRef.current = debounceMs;
  }, [debounceMs]);

  const syncCaptcha = useCallback((nextCaptcha: ImageCaptchaPayload | null) => {
    captchaRef.current = nextCaptcha;
    setCaptcha(nextCaptcha);
    onChangeRef.current?.(nextCaptcha);
  }, []);

  const refresh = useCallback(async (force = false) => {
    const now = Date.now();
    if (inFlightRef.current) {
      return captchaRef.current;
    }

    if (!force && now - lastTriggerAtRef.current < debounceMsRef.current) {
      return captchaRef.current;
    }

    lastTriggerAtRef.current = now;
    inFlightRef.current = true;
    setLoading(true);
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;

    try {
      const nextCaptcha = await loaderRef.current();
      if (requestId !== requestIdRef.current) {
        return captchaRef.current;
      }
      syncCaptcha(nextCaptcha);
      return nextCaptcha;
    } catch {
      if (requestId === requestIdRef.current) {
        syncCaptcha(null);
      }
      return null;
    } finally {
      if (requestId === requestIdRef.current) {
        inFlightRef.current = false;
        setLoading(false);
      }
    }
  }, [syncCaptcha]);

  useEffect(() => {
    if (!autoLoad) {
      return;
    }
    void refresh(true);
  }, [autoLoad, refresh]);

  useEffect(() => {
    if (refreshTokenRef.current === refreshToken) {
      return;
    }
    refreshTokenRef.current = refreshToken;
    void refresh(true);
  }, [refresh, refreshToken]);

  return {
    captcha,
    image: captcha?.image ?? "",
    loading,
    refresh,
    uuid: captcha?.uuid ?? "",
  };
}
