import ReactDOM from "react-dom/client";
import { BrowserRouter, HashRouter } from "react-router-dom";

import { ThemeProvider, initializeTheme } from "@go-admin/design-tokens";
import { I18nProvider } from "@go-admin/i18n";
import { ToastViewport } from "@go-admin/ui-admin";

import { showcaseMessages } from "./i18n/showcase";
import { App } from "./app";
import "@go-admin/ui-admin/theme.css";
import "./styles.css";

initializeTheme();

function resolveRouterMode() {
  const configuredMode = import.meta.env.VITE_SHOWCASE_ROUTER_MODE;
  if (configuredMode === "browser" || configuredMode === "hash") {
    return configuredMode;
  }

  return import.meta.env.PROD ? "hash" : "browser";
}

function resolveBrowserBasename() {
  const baseUrl = import.meta.env.BASE_URL || "/";

  try {
    const pathname = new URL(baseUrl, window.location.origin).pathname;
    if (pathname === "/") {
      return undefined;
    }

    return pathname.endsWith("/") ? pathname.slice(0, -1) : pathname;
  } catch {
    return undefined;
  }
}

const routerMode = resolveRouterMode();
const browserBasename = resolveBrowserBasename();
const Router = routerMode === "hash" ? HashRouter : BrowserRouter;
const routerProps = routerMode === "browser" && browserBasename ? { basename: browserBasename } : {};

ReactDOM.createRoot(document.getElementById("root")!).render(
  <Router {...routerProps}>
    <I18nProvider messages={showcaseMessages} storageKey="go-admin:showcase:locale">
      <ThemeProvider>
        <App />
        <ToastViewport />
      </ThemeProvider>
    </I18nProvider>
  </Router>,
);
