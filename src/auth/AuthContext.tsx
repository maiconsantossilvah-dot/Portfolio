import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { Session } from "@supabase/supabase-js";
import { db, supabase } from "../lib/supabase";
import { clearMediaCache } from "../components/MediaImage";
export type AuthState =
  "loading" | "anonymous" | "authorized" | "denied" | "mfa" | "error";
const AuthContext = createContext({
  session: null as Session | null,
  status: "loading" as AuthState,
  refresh: () => {},
  logout: async () => {},
});
export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [status, setStatus] = useState<AuthState>("loading");
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    if (!supabase) {
      setStatus("anonymous");
      return;
    }
    let active = true;
    supabase.auth.getSession().then(({ data, error }) => {
      if (active) {
        setSession(data.session);
        if (error) setStatus("error");
        else if (!data.session) setStatus("anonymous");
      }
    });
    const { data } = supabase.auth.onAuthStateChange((_event, value) => {
      if (active) {
        clearMediaCache();
        setSession(value);
        if (!value) setStatus("anonymous");
      }
    });
    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, []);
  useEffect(() => {
    if (!session) return;
    let active = true;
    setStatus("loading");
    const authorize = async () => {
      const { data, error } = await db().rpc("is_admin");
      if (error) throw error;
      if (data) return "authorized" as const;
      const { data: aal } =
        await db().auth.mfa.getAuthenticatorAssuranceLevel();
      return aal?.nextLevel === "aal2" && aal.currentLevel !== "aal2"
        ? ("mfa" as const)
        : ("denied" as const);
    };
    authorize()
      .then((result) => {
        if (active) setStatus(result);
      })
      .catch(() => {
        if (active) setStatus("error");
      });
    return () => {
      active = false;
    };
  }, [session, revision]);
  const logout = async () => {
    const { error } = await db().auth.signOut();
    if (error) throw error;
    clearMediaCache();
    setSession(null);
    setStatus("anonymous");
  };
  return (
    <AuthContext.Provider
      value={{
        session,
        status,
        refresh: () => setRevision((n) => n + 1),
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
export const useAuth = () => useContext(AuthContext);

export async function completeAuthRedirect() {
  const params = new URLSearchParams(location.search);
  const code = params.get("code");
  if (!code || !supabase) return;
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  const destination = error ? "#/admin?recuperacao=erro" : "#/admin/seguranca";
  window.history.replaceState(
    window.history.state,
    "",
    `${location.pathname}${destination}`,
  );
  window.dispatchEvent(
    new PopStateEvent("popstate", { state: window.history.state }),
  );
}
