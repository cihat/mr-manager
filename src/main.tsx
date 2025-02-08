import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router";
import App from "./App";
import "./index.css";
import CommitMonitor from "@/components/git-components/commit-monitor";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
      <CommitMonitor />
    </BrowserRouter>
  </React.StrictMode>
);
