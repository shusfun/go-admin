import ReactDOM from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { ThemeProvider, initializeTheme } from "@go-admin/design-tokens";
import { I18nProvider } from "@go-admin/i18n";
import { ToastViewport } from "@go-admin/ui-admin";

import { App } from "./app";
import { adminMessages } from "./i18n/admin";
import "@go-admin/ui-admin/theme.css";
import "./admin-host-theme.css";
import "./styles.css";

const queryClient = new QueryClient();
initializeTheme();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <I18nProvider messages={adminMessages} storageKey="go-admin:admin:locale">
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <App />
        <ToastViewport />
      </QueryClientProvider>
    </ThemeProvider>
  </I18nProvider>,
);
