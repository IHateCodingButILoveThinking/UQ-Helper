import React from "react";
import ReactDOM from "react-dom/client";
import "react-toastify/dist/ReactToastify.css";

import App from "./App";
import "./styles.css";
import "./styles/navigation.css";
import "./styles/ferry.css";
import "./styles/food.css";
import "./styles/live-board-header.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
