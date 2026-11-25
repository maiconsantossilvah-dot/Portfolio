import { useState, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { LockKeyhole } from "lucide-react";
import { configured, db } from "../lib/supabase";
import { Field } from "../components/ui";
export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [recovery, setRecovery] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [params] = useSearchParams();
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setMessage("");
    try {
      if (recovery) {
        const { error } = await db().auth.resetPasswordForEmail(email, {
          redirectTo: `${location.origin}${import.meta.env.BASE_URL}?auth=recovery`,
        });
        if (error) throw error;
        setMessage(
          "Se esta conta existir, você receberá um link de recuperação. Abra-o neste mesmo navegador.",
        );
      } else {
        const { error } = await db().auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
      }
    } catch {
      setMessage(
        recovery
          ? "Não foi possível solicitar a recuperação. Tente novamente em instantes."
          : "Não foi possível entrar. Confira seus dados e tente novamente.",
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="auth-page">
      <Link to="/" className="brand">
        <span className="brand-mark">
          m<span>.</span>
        </span>
        Maicon Santos
      </Link>
      <div className="auth-card">
        <LockKeyhole size={28} className="accent-text" />
        <p className="eyebrow">Espaço de trabalho</p>
        <h1>{recovery ? "Recuperar acesso" : "Bom ter você aqui."}</h1>
        <p>
          {recovery
            ? "Informe o e-mail da sua conta administrativa."
            : "Entre para cuidar dos seus projetos e conteúdos."}
        </p>
        {!configured ? (
          <div className="notice">
            Configure a URL e a chave pública do Supabase no arquivo .env para
            ativar a administração. Consulte o README do projeto.
          </div>
        ) : (
          <form onSubmit={submit}>
            <Field label="E-mail">
              <input
                autoComplete="username"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </Field>
            {!recovery && (
              <Field label="Senha">
                <input
                  autoComplete="current-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </Field>
            )}
            <button className="button primary" disabled={busy}>
              {busy
                ? "Aguarde…"
                : recovery
                  ? "Enviar link de recuperação"
                  : "Entrar no painel"}
            </button>
            <button
              type="button"
              className="text-button"
              onClick={() => {
                setRecovery(!recovery);
                setMessage("");
              }}
            >
              {recovery ? "Voltar para o login" : "Esqueci minha senha"}
            </button>
          </form>
        )}
        {(message || params.get("recuperacao") === "erro") && (
          <p role="status" className="notice">
            {message ||
              "O link de recuperação expirou ou foi aberto em outro navegador. Solicite um novo link."}
          </p>
        )}
      </div>
      <Link className="text-link" to="/">
        Voltar ao portfólio
      </Link>
    </div>
  );
}
