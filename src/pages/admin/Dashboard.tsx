import { Link } from "react-router-dom";
import {
  Plus,
  FolderOpen,
  HardDrive,
  CircleCheck,
  FileEdit,
  Archive,
  Star,
  Tags,
} from "lucide-react";
import { useAsync } from "../../hooks/useAsync";
import {
  getSiteData,
  listMedia,
  listProjects,
} from "../../repositories/content";
import { Empty, ErrorState, Loading } from "../../components/ui";
import { statusLabels } from "../../config/defaults";
const load = async () => {
  const [projects, media, site] = await Promise.all([
    listProjects(true),
    listMedia(),
    getSiteData(),
  ]);
  return { projects, media, site };
};
export default function Dashboard() {
  const state = useAsync(load, null);
  if (state.loading) return <Loading />;
  if (state.error)
    return <ErrorState error={state.error} retry={state.reload} />;
  if (!state.data) return null;
  const { projects, media, site } = state.data;
  const stats = [
    ["Todos os projetos", projects.length, FolderOpen],
    [
      "Publicados",
      projects.filter((p) => p.status === "published").length,
      CircleCheck,
    ],
    [
      "Rascunhos",
      projects.filter((p) => p.status === "draft").length,
      FileEdit,
    ],
    [
      "Arquivados",
      projects.filter((p) => p.status === "archived").length,
      Archive,
    ],
    ["Em destaque", projects.filter((p) => p.featured).length, Star],
    ["Categorias", site.categories.length, Tags],
  ] as const;
  return (
    <>
      <div className="admin-heading">
        <div>
          <p className="eyebrow">Seu espaço criativo</p>
          <h1>Visão geral</h1>
          <p>Transforme suas entregas em boas histórias.</p>
        </div>
        <Link className="button primary" to="/admin/projetos/novo">
          <Plus size={18} />
          Novo projeto
        </Link>
      </div>
      <div className="stats-grid">
        {stats.map(([label, value, Icon]) => (
          <article className="stat-card" key={label}>
            <Icon size={20} />
            <strong>{value}</strong>
            <span>{label}</span>
          </article>
        ))}
      </div>
      <div className="dashboard-columns">
        <section className="panel">
          <div className="panel-heading">
            <h2>Últimas alterações</h2>
            <Link className="text-link" to="/admin/projetos">
              Ver todos
            </Link>
          </div>
          {projects.length ? (
            <div className="recent-list">
              {[...projects]
                .sort((a, b) => b.updated_at.localeCompare(a.updated_at))
                .slice(0, 6)
                .map((p) => (
                  <Link key={p.id} to={`/admin/projetos/${p.id}`}>
                    <div>
                      <strong>{p.title}</strong>
                      <small>
                        {new Date(p.updated_at).toLocaleString("pt-BR")}
                      </small>
                    </div>
                    <span className={`badge ${p.status}`}>
                      {statusLabels[p.status]}
                    </span>
                  </Link>
                ))}
            </div>
          ) : (
            <Empty title="Tudo começa com um projeto">
              Cadastre seu primeiro estudo de caso.
            </Empty>
          )}
        </section>
        <section className="panel storage-panel">
          <HardDrive size={25} />
          <h2>Biblioteca de mídia</h2>
          <strong>
            {(media.reduce((sum, m) => sum + m.size, 0) / 1024 / 1024).toFixed(
              1,
            )}{" "}
            <small>MB</small>
          </strong>
          <p>
            {media.length} arquivos cadastrados. Estimativa dos originais e
            miniaturas registrados; confira a cota total no Supabase.
          </p>
          <Link className="button secondary" to="/admin/midia">
            Gerenciar arquivos
          </Link>
        </section>
      </div>
    </>
  );
}
