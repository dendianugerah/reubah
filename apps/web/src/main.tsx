import React from "react";
import ReactDOM from "react-dom/client";

import { AppRouter } from "./routes";
import "./styles.css";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <AppRouter />
  </React.StrictMode>,
);
