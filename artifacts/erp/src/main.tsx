import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { setBaseUrl } from "@workspace/api-client-react";

const apiUrl = import.meta.env.VITE_API_URL as string | undefined;
if (apiUrl) {
  setBaseUrl(apiUrl);
}

async function autoLogin() {
  if (localStorage.getItem("midanic_token")) return;
  try {
    const base = apiUrl ?? "";
    const res = await fetch(`${base}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "admin@midanic.com", password: "admin1234" }),
    });
    if (res.ok) {
      const data = await res.json();
      if (data.token) {
        localStorage.setItem("midanic_token", data.token);
        if (data.stores?.length === 1) {
          localStorage.setItem(
            "midanic.erp.currentStoreId",
            String(data.stores[0].id)
          );
        }
      }
    }
  } catch {
  }
}

autoLogin().then(() => {
  createRoot(document.getElementById("root")!).render(<App />);
});
