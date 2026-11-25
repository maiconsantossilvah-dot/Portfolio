import { loadEnv } from "vite";
const env = { ...loadEnv("production", process.cwd(), ""), ...process.env };
const url = env.VITE_SUPABASE_URL?.trim();
const key = env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim();
if (url || key) {
  let valid = !!key?.startsWith("sb_publishable_");
  if (key && !valid) {
    try {
      valid =
        JSON.parse(Buffer.from(key.split(".")[1], "base64url").toString())
          .role === "anon";
    } catch {
      valid = false;
    }
  }
  if (
    !url ||
    !/^https:\/\/[a-z0-9.-]+(?::\d+)?$/.test(url) ||
    !valid ||
    key?.startsWith("sb_secret_")
  )
    throw new Error(
      "Build recusado: use URL Supabase HTTPS e chave pública publishable/anon. Nunca use service_role ou sb_secret_.",
    );
}
if (
  env.VITE_SITE_URL &&
  !/^https:\/\/[a-z0-9.-]+(?::\d+)?(?:\/[^<>"\s]*)?$/i.test(env.VITE_SITE_URL)
)
  throw new Error("VITE_SITE_URL deve ser uma URL pública HTTPS válida.");
if (env.VITE_BASE_PATH && !/^\/(?:[^?#\s]*\/)?$/.test(env.VITE_BASE_PATH))
  throw new Error(
    "VITE_BASE_PATH deve começar e terminar com barra, sem query/fragmento.",
  );
