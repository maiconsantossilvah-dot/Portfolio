import { useEffect, useState, type FormEvent } from "react";
import { ShieldCheck } from "lucide-react";
import { db } from "../../lib/supabase";
import { useAuth } from "../../auth/AuthContext";
import { Field, useToast } from "../../components/ui";
export default function Security() {
  const { session } = useAuth();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [factor, setFactor] = useState<{ id: string; qr: string } | null>(null);
  const [verified, setVerified] = useState<string[]>([]);
  const toast = useToast();
  const loadFactors = () =>
    db()
      .auth.mfa.listFactors()
      .then(({ data }) =>
        setVerified(
          data?.totp.filter((f) => f.status === "verified").map((f) => f.id) ||
            [],
        ),
      );
  useEffect(() => {
    void loadFactors();
  }, []);
  const changePassword = async (e: FormEvent) => {
    e.preventDefault();
    if (password.length < 12 || password !== confirm) {
      toast("Use pelo menos 12 caracteres e confirme a mesma senha.", true);
      return;
    }
    setBusy(true);
    try {
      const { error } = await db().auth.updateUser({ password });
      if (error) throw error;
      setPassword("");
      setConfirm("");
      toast("Senha atualizada.");
    } catch {
      toast(
        "Não foi possível alterar a senha. Entre novamente ou solicite recuperação.",
        true,
      );
    } finally {
      setBusy(false);
    }
  };
  const enroll = async () => {
    setBusy(true);
    try {
      const { data: existing } = await db().auth.mfa.listFactors();
      for (const old of existing?.all.filter(
        (f) => f.factor_type === "totp" && f.status === "unverified",
      ) || [])
        await db().auth.mfa.unenroll({ factorId: old.id });
      const { data, error } = await db().auth.mfa.enroll({
        factorType: "totp",
        friendlyName: "Portfólio Maicon",
      });
      if (error) throw error;
      setFactor({ id: data.id, qr: data.totp.qr_code });
    } catch {
      toast("Não foi possível iniciar a configuração do autenticador.", true);
    } finally {
      setBusy(false);
    }
  };
  const verify = async (e: FormEvent) => {
    e.preventDefault();
    if (!factor) return;
    setBusy(true);
    try {
      const { error } = await db().auth.mfa.challengeAndVerify({
        factorId: factor.id,
        code,
      });
      if (error) throw error;
      setFactor(null);
      setCode("");
      await loadFactors();
      toast(
        "Autenticador confirmado. Consulte a orientação abaixo para exigir MFA no banco.",
      );
    } catch {
      toast("Código inválido ou expirado.", true);
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <div className="admin-heading">
        <div>
          <p className="eyebrow">Acesso e proteção</p>
          <h1>Segurança</h1>
          <p>A autorização de administrador é definida pelo UUID no banco.</p>
        </div>
        <ShieldCheck size={30} />
      </div>
      <div className="settings-form">
        <section className="panel">
          <h2>Sua conta</h2>
          <p>{session?.user.email}</p>
          <p className="small muted">
            UUID: <code>{session?.user.id}</code>
          </p>
          <p className="small muted">
            Não há cadastro público. Somente o proprietário pode conceder ou
            remover a autorização via SQL.
          </p>
        </section>
        <form className="panel" onSubmit={changePassword}>
          <h2>Alterar senha</h2>
          <Field label="Nova senha (mínimo 12 caracteres)">
            <input
              required
              minLength={12}
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </Field>
          <Field label="Confirmar nova senha">
            <input
              required
              minLength={12}
              type="password"
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
            />
          </Field>
          <button className="button primary" disabled={busy}>
            Atualizar senha
          </button>
        </form>
        <section className="panel">
          <h2>Autenticação em duas etapas</h2>
          <p>
            {verified.length
              ? "Autenticador TOTP configurado."
              : "Adicione um autenticador para proteger sua conta."}
          </p>
          {!verified.length && !factor && (
            <button
              className="button secondary"
              disabled={busy}
              onClick={() => void enroll()}
            >
              Configurar autenticador
            </button>
          )}
          {factor && (
            <form onSubmit={verify}>
              <img
                className="mfa-qr"
                src={factor.qr}
                alt="QR code para configurar o autenticador"
              />
              <Field label="Código de 6 dígitos">
                <input
                  required
                  pattern="[0-9]{6}"
                  maxLength={6}
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                />
              </Field>
              <button className="button primary" disabled={busy}>
                Confirmar autenticador
              </button>
            </form>
          )}
          <div className="notice">
            <p>
              Para exigir a segunda etapa também nas políticas RLS, após
              verificar o autenticador execute no SQL Editor:{" "}
              <code>
                update private.admin_users set require_mfa = true where user_id
                = 'SEU_UUID';
              </code>{" "}
              Guarde o acesso ao painel Supabase para recuperação. Nenhuma
              permissão administrativa pode ser atribuída por esta tela.
            </p>
          </div>
        </section>
      </div>
    </>
  );
}
