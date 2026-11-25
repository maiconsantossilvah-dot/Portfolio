import { createRoot } from "react-dom/client";
import "@fontsource/inter/latin-400.css";
import "@fontsource/inter/latin-500.css";
import "@fontsource/inter/latin-600.css";
import "@fontsource/space-grotesk/latin-400.css";
import "@fontsource/space-grotesk/latin-500.css";
import "@fontsource/space-grotesk/latin-600.css";
import "@fontsource/space-grotesk/latin-700.css";
import "@fontsource/jetbrains-mono/latin-400.css";
import "./styles.css";
import App from "./App";
import { completeAuthRedirect } from "./auth/AuthContext";
async function start() {
  await completeAuthRedirect().catch(() => {
    history.replaceState(
      null,
      "",
      `${location.pathname}#/admin?recuperacao=erro`,
    );
  });
  createRoot(document.getElementById("root")!).render(<App />);
}
void start();
