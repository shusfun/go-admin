import ReactDOM from "react-dom/client";

import { ThemeProvider, initializeTheme } from "@suiyuan/design-tokens";
import { ToastViewport } from "@suiyuan/ui-admin";

import { App } from "./app";
import "@suiyuan/design-tokens/theme.css";
import "./styles.css";

initializeTheme();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <ThemeProvider>
    <App />
    <ToastViewport />
  </ThemeProvider>,
);
