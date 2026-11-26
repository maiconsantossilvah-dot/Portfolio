import { useEffect, useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { Menu, Moon, Sun, X } from "lucide-react";
import { useSite } from "../../hooks/SiteContext";
import { SkipLink } from "../ui";
export default function PublicLayout() {
  const { data } = useSite();
  const visible = (id: string) =>
    data.settings.sections.some((s) => s.id === id && s.visible);
  const [open, setOpen] = useState(false);
  const [theme, setTheme] = useState(() => {
    try {
      return localStorage.getItem("portfolio-theme") || "dark";
    } catch {
      return "dark";
    }
  });
  const location = useLocation();
  useEffect(() => {
    setOpen(false);
  }, [location]);
  useEffect(() => {
    if (!location.search) window.scrollTo({ top: 0, behavior: "instant" });
  }, [location.pathname, location.search]);
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem("portfolio-theme", theme);
    } catch {
      /* Browsing remains usable without persistence. */
    }
  }, [theme]);
  return (
    <>
      <SkipLink target="main-content" />
      <header className="site-header">
        <div className="container header-inner">
          <Link to="/" className="brand">
            <span>{data.profile.name}</span>
          </Link>
          <nav
            id="public-nav"
            className={`public-nav ${open ? "is-open" : ""}`}
            aria-label="Navegação principal"
          >
            <NavLink to="/" end>
              Início
            </NavLink>
            <NavLink to="/projetos">Projetos</NavLink>
            {visible("services") && <Link to="/?sec=services">Serviços</Link>}
            {visible("about") && <Link to="/?sec=about">Sobre</Link>}
            {visible("contact") && <Link to="/?sec=contact">Contato</Link>}
          </nav>
          <div className="header-tools">
            <button
              className="icon-button theme-toggle"
              aria-label={
                theme === "dark" ? "Ativar tema claro" : "Ativar tema escuro"
              }
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            >
              {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <button
              className="icon-button menu-toggle"
              aria-label={open ? "Fechar menu" : "Abrir menu"}
              aria-expanded={open}
              aria-controls="public-nav"
              onClick={() => setOpen(!open)}
            >
              {open ? <X /> : <Menu />}
            </button>
          </div>
        </div>
      </header>
      <Outlet />
      <footer className="site-footer container">
        <Link to="/" className="brand">
          {data.profile.name}
        </Link>
        <p>{data.settings.institutional_text}</p>
        <span>© {new Date().getFullYear()}</span>
      </footer>
    </>
  );
}
