import { useState } from "react";
import { Link, NavLink, Outlet } from "react-router-dom";
import {
  Archive,
  Blocks,
  Folder,
  Home,
  Image,
  LayoutDashboard,
  LogOut,
  Menu,
  Settings,
  ShieldCheck,
  Tags,
  User,
  X,
  Mail,
} from "lucide-react";
import { AuthProvider, useAuth } from "../../auth/AuthContext";
import Login from "../../auth/Login";
import MfaChallenge from "../../auth/MfaChallenge";
import { Loading, SkipLink, useToast } from "../ui";
import { userError } from "../../lib/supabase";
import { useMetadata } from "../../hooks/useMetadata";
const links = [
  ["", "Visão geral", LayoutDashboard],
  ["projetos", "Projetos", Folder],
  ["categorias", "Categorias & tecnologias", Tags],
  ["midia", "Biblioteca de mídia", Image],
  ["servicos", "Serviços", Blocks],
  ["sobre", "Sobre mim", User],
  ["inicio", "Página inicial", Home],
  ["contatos", "Contatos", Mail],
  ["configuracoes", "Configurações", Settings],
  ["seguranca", "Segurança", ShieldCheck],
] as const;
function GuardedLayout() {
  const { status, logout, refresh, session } = useAuth();
  const [open, setOpen] = useState(false);
  const toast = useToast();
  useMetadata(
    "Administração — Maicon Santos",
    "Área administrativa privada.",
    true,
  );
  if (status === "loading")
    return (
      <div className="auth-page">
        <Loading label="Verificando sessão e permissões…" />
      </div>
    );
  if (status === "anonymous") return <Login />;
  if (status === "mfa") return <MfaChallenge />;
  if (status === "denied" || status === "error")
    return (
      <main className="auth-page">
        <div className="auth-card">
          <ShieldCheck size={32} />
          <h1>
            {status === "denied"
              ? "Acesso restrito."
              : "Não foi possível verificar sua sessão."}
          </h1>
          <p>
            {status === "denied"
              ? "Esta conta não está autorizada a administrar o portfólio. A autorização é concedida pelo proprietário no banco de dados."
              : "Verifique a conexão e tente novamente."}
          </p>
          <button className="button secondary" onClick={refresh}>
            Verificar novamente
          </button>
          <button
            className="text-button"
            onClick={() =>
              void logout().catch((e) => toast(userError(e), true))
            }
          >
            Sair da conta
          </button>
        </div>
      </main>
    );
  return (
    <div className="admin-app">
      <SkipLink target="admin-main" />
      <header className="admin-mobile-header">
        <Link to="/admin" className="brand">
          m. <span>Estúdio</span>
        </Link>
        <button
          className="icon-button"
          aria-expanded={open}
          aria-controls="admin-sidebar"
          aria-label="Menu administrativo"
          onClick={() => setOpen(!open)}
        >
          {open ? <X /> : <Menu />}
        </button>
      </header>
      <aside
        id="admin-sidebar"
        className={`admin-sidebar ${open ? "is-open" : ""}`}
      >
        <Link to="/admin" className="brand">
          <span className="brand-mark">
            m<span>.</span>
          </span>
          <span>
            Estúdio<small>GERENCIADOR DE CONTEÚDO</small>
          </span>
        </Link>
        <nav aria-label="Administração">
          {links.map(([path, label, Icon]) => (
            <NavLink
              key={path}
              to={`/admin${path ? `/${path}` : ""}`}
              end={path === ""}
              onClick={() => setOpen(false)}
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <Link to="/" target="_blank" rel="noopener noreferrer">
            <Archive size={17} /> Ver portfólio
          </Link>
          <span className="sidebar-email" title={session?.user.email}>
            {session?.user.email}
          </span>
          <button
            onClick={() =>
              void logout().catch((e) => toast(userError(e), true))
            }
          >
            <LogOut size={17} />
            Sair
          </button>
        </div>
      </aside>
      <main id="admin-main" className="admin-main">
        <Outlet />
      </main>
    </div>
  );
}
export default function AdminLayout() {
  return (
    <AuthProvider>
      <GuardedLayout />
    </AuthProvider>
  );
}
