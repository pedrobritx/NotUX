import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { applyTheme, getInitialTheme } from "@notux/ui";
import App from "./App";
import "@notux/ui/styles.css";
import "./styles.css";

// Set <html data-theme> before the first paint so themed tokens apply with no
// flash (stored preference → OS preference).
applyTheme(getInitialTheme());

const root = document.getElementById("root");
if (!root) throw new Error("Root element missing");

ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
);
