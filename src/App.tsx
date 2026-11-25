import { lazy, Suspense } from "react";
import { createHashRouter, Link, RouterProvider } from "react-router-dom";
import { SiteProvider } from "./hooks/SiteContext";
import { Loading, ToastProvider } from "./components/ui";
const PublicLayout = lazy(() => import("./components/public/Layout"));
const Home = lazy(() => import("./pages/Home"));
const Projects = lazy(() => import("./pages/Projects"));
const CaseStudy = lazy(() => import("./pages/CaseStudy"));
const AdminLayout = lazy(() => import("./components/admin/Layout"));
const Dashboard = lazy(() => import("./pages/admin/Dashboard"));
const ProjectList = lazy(() => import("./pages/admin/ProjectList"));
const ProjectEditor = lazy(() => import("./pages/admin/ProjectEditor"));
const MediaLibrary = lazy(() => import("./pages/admin/MediaLibrary"));
const Taxonomy = lazy(() => import("./pages/admin/Taxonomy"));
const Collections = lazy(() => import("./pages/admin/Collections"));
const ContentSettings = lazy(() => import("./pages/admin/ContentSettings"));
const Security = lazy(() => import("./pages/admin/Security"));
function RouteError() {
  return (
    <main className="container section">
      <h1>Não foi possível abrir esta página.</h1>
      <p>Tente recarregar a página ou voltar ao início.</p>
      <Link className="button secondary" to="/">
        Voltar ao início
      </Link>
    </main>
  );
}
const router = createHashRouter([
  {
    path: "/",
    element: <PublicLayout />,
    errorElement: <RouteError />,
    children: [
      { index: true, element: <Home /> },
      { path: "projetos", element: <Projects /> },
      { path: "projetos/:slug", element: <CaseStudy /> },
      {
        path: "*",
        element: (
          <main id="main-content" className="container section">
            <p className="eyebrow">404</p>
            <h1>Esta página não existe.</h1>
            <Link className="button secondary" to="/">
              Voltar ao início
            </Link>
          </main>
        ),
      },
    ],
  },
  {
    path: "/admin",
    element: <AdminLayout />,
    errorElement: <RouteError />,
    children: [
      { index: true, element: <Dashboard /> },
      { path: "projetos", element: <ProjectList /> },
      { path: "projetos/:id", element: <ProjectEditor /> },
      { path: "midia", element: <MediaLibrary /> },
      { path: "categorias", element: <Taxonomy /> },
      { path: "servicos", element: <Collections kind="services" /> },
      { path: "sobre", element: <ContentSettings kind="about" /> },
      { path: "inicio", element: <ContentSettings kind="home" /> },
      { path: "contatos", element: <ContentSettings kind="contacts" /> },
      { path: "configuracoes", element: <ContentSettings kind="settings" /> },
      { path: "seguranca", element: <Security /> },
    ],
  },
]);
export default function App() {
  return (
    <ToastProvider>
      <SiteProvider>
        <Suspense fallback={<Loading />}>
          <RouterProvider router={router} />
        </Suspense>
      </SiteProvider>
    </ToastProvider>
  );
}
