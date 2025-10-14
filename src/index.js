import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { CartProvider } from "./contexts/index";

// bootstrap css already loaded in public/index.html, but load js for components if needed:
import "bootstrap/dist/js/bootstrap.bundle.min.js";

// optional local overrides
import "./css/style.css";

import jQuery from "jquery";
window.$ = window.jQuery = jQuery;

const root = createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <CartProvider>
      <App />
    </CartProvider>
  </React.StrictMode>
);
