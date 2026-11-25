import { createClient } from "@supabase/supabase-js";
const url = import.meta.env.VITE_SUPABASE_URL?.trim();
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim();
function publicKey(value: string | undefined) {
  if (!value || value.startsWith("sb_secret_")) return false;
  if (value.startsWith("sb_publishable_")) return true;
  try {
    return (
      JSON.parse(
        atob(value.split(".")[1].replaceAll("-", "+").replaceAll("_", "/")),
      ).role === "anon"
    );
  } catch {
    return false;
  }
}
export const configured =
  !!url &&
  (/^https:\/\/[a-z0-9.-]+(?::\d+)?$/.test(url) ||
    (import.meta.env.DEV &&
      /^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(url))) &&
  publicKey(key);
export const supabase = configured
  ? createClient(url!, key!, {
      auth: {
        flowType: "pkce",
        detectSessionInUrl: false,
        persistSession: true,
        autoRefreshToken: true,
      },
    })
  : null;
export function db() {
  if (!supabase)
    throw new Error(
      "Configure o Supabase seguindo o README para ativar o CMS.",
    );
  return supabase;
}
export function userError(error: unknown): string {
  if (error instanceof Error && error.message.startsWith("Configure"))
    return error.message;
  const code = (error as { code?: string })?.code;
  if (code === "23505")
    return "Este endereço (slug) já está em uso. Escolha outro.";
  if (code === "40001")
    return "Este conteúdo foi alterado em outra aba. Recarregue antes de salvar.";
  if (code === "42501" || code === "PGRST301")
    return "A sessão expirou ou não tem permissão para esta operação. Entre novamente.";
  if (code === "23503")
    return "Este conteúdo está em uso. Remova os vínculos antes de excluir.";
  if (code === "23514" || code === "22023")
    return "Confira os campos obrigatórios e as referências de mídia antes de publicar.";
  return "Não foi possível concluir. Verifique sua conexão e tente novamente.";
}
