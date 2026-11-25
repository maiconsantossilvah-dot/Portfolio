import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  return {
    base: env.VITE_BASE_PATH || "/",
    server: {
      watch: {
        ignored: [
          "**/playwright-report/**",
          "**/test-results/**",
          "**/work/**",
        ],
      },
    },
    plugins: [
      react(),
      tailwindcss(),
      {
        name: "portfolio-csp",
        transformIndexHtml() {
          const dev = mode !== "production";
          const supabase =
            /^https:\/\/[a-z0-9.-]+(?::\d+)?$/.test(
              env.VITE_SUPABASE_URL || "",
            ) ||
            (dev &&
              /^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(
                env.VITE_SUPABASE_URL || "",
              ))
              ? env.VITE_SUPABASE_URL
              : "https://*.supabase.co";
          const policy = `default-src 'self'; script-src 'self'${dev ? " 'unsafe-inline'" : ""}; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https:; media-src 'self' blob: https:; font-src 'self'; connect-src 'self' ${supabase} ${supabase.replace("https:", "wss:")}${dev ? " ws://127.0.0.1:* ws://localhost:*" : ""}; frame-src https:; object-src 'none'; base-uri 'self'; form-action 'self'`;
          return [
            {
              tag: "meta",
              attrs: {
                "http-equiv": "Content-Security-Policy",
                content: policy,
              },
              injectTo: "head-prepend",
            },
          ];
        },
      },
    ],
    build: { sourcemap: false },
    test: {
      environment: "jsdom",
      setupFiles: ["./tests/setup.ts"],
      include: ["tests/**/*.test.{ts,tsx}"],
      testTimeout: 30000,
      maxWorkers: 2,
    },
  };
});
