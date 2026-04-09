import ReactDOM from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { ThemeProvider, initializeTheme } from "@suiyuan/design-tokens";
import { I18nProvider } from "@suiyuan/i18n";
import { ToastViewport } from "@suiyuan/ui-admin";

import { App } from "./app";
import { adminMessages } from "./i18n/admin";
import "@suiyuan/design-tokens/base.css";
import "./admin-host-theme.css";
import "./styles.css";

const queryClient = new QueryClient();
initializeTheme();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <I18nProvider messages={adminMessages} storageKey="suiyuan:admin:locale">
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <App />
        <ToastViewport />
      </QueryClientProvider>
    </ThemeProvider>
  </I18nProvider>,
);
