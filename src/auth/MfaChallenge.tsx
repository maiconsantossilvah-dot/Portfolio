import { useState, type FormEvent } from "react";
import { db } from "../lib/supabase";
import { useAuth } from "./AuthContext";
import { Field } from "../components/ui";
export default function MfaChallenge() {
  const { refresh, logout } = useAuth();
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const { data, error } = await db().auth.mfa.listFactors();
      if (error || !data.totp[0]) throw error;
      const result = await db().auth.mfa.challengeAndVerify({
        factorId: data.totp[0].id,
        code,
      });
      if (result.error) throw result.error;
      refresh();
    } catch {
      setError("Código inválido ou expirado. Tente novamente.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <main className="auth-page">
      <form className="auth-card" onSubmit={submit}>
        <p className="eyebrow">Segunda etapa</p>
        <h1>Confirme seu acesso.</h1>
        <Field label="Código do autenticador">
          <input
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9]{6}"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value)}
            required
          />
        </Field>
        {error && <p role="alert">{error}</p>}
        <button className="button primary" disabled={busy}>
          Verificar código
        </button>
        <button
          type="button"
          className="text-button"
          onClick={() => void logout()}
        >
          Sair
        </button>
      </form>
    </main>
  );
}
