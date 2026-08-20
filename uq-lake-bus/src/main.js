import React from "react";
import ReactDOM from "react-dom/client";
import "react-toastify/dist/ReactToastify.css";

import App from "./App";
import "./styles.css";
import "./styles/navigation.css";
import "./styles/ferry.css";
import "./styles/food.css";
import "./styles/exam-countdown.css";
import "./styles/live-board-header.css";
import "./styles/home-live-info.css";
import "./styles/transport-modes.css";
import "./styles/travel.css";
import "./styles/pwa-install.css";
import "./styles/shout-outs.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

if ("serviceWorker" in navigator) {
  if (import.meta.env.PROD) {
    window.addEventListener("load", () => {
      navigator.serviceWorker
        .register("/sw.js", { updateViaCache: "none" })
        .then((registration) => {
          const checkForUpdate = () => {
            if (document.visibilityState === "visible") {
              registration.update().catch(() => {});
            }
          };
          document.addEventListener("visibilitychange", checkForUpdate);
          window.setInterval(checkForUpdate, 60 * 60 * 1000);
        })
        .catch((error) => {
          console.error("Service worker registration failed:", error);
        });
    });
  } else {
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      registrations.forEach((registration) => registration.unregister());
    });
  }
}
