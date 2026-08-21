import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { AuthProvider } from "./contexts/AuthContext";
import { FamilyProvider } from "./contexts/FamilyContext";
import "./styles.css";
import "./rpg.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <FamilyProvider>
          <App />
        </FamilyProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
