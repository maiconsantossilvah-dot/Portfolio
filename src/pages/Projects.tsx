import { useMemo, useState } from "react";
import { Search, X } from "lucide-react";
import { useSite } from "../hooks/SiteContext";
import { useAsync } from "../hooks/useAsync";
import { useMetadata } from "../hooks/useMetadata";
import { listPublicProjects } from "../repositories/publicProjects";
import { Empty, ErrorState, Loading } from "../components/ui";
import { ProjectCard } from "../components/public/ProjectCard";
export default function Projects() {
  const { data } = useSite();
  const state = useAsync(listPublicProjects, []);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [technology, setTechnology] = useState("");
  const [sort, setSort] = useState("editorial");
  const [page, setPage] = useState(1);
  useMetadata(
    `Projetos — ${data.profile.name}`,
    "Conteúdo rico, imagens comerciais, SEO, desenvolvimento e automações para e-commerce.",
  );
  const filtered = useMemo(
    () =>
      state.data
        .filter(
          (p) =>
            `${p.title} ${p.excerpt} ${p.description}`
              .toLocaleLowerCase("pt-BR")
              .includes(query.toLocaleLowerCase("pt-BR")) &&
            (!category || p.category_ids.includes(category)) &&
            (!technology || p.technology_ids.includes(technology)),
        )
        .sort((a, b) =>
          sort === "recent"
            ? b.created_at.localeCompare(a.created_at)
            : sort === "title"
              ? a.title.localeCompare(b.title, "pt-BR")
              : Number(b.featured) - Number(a.featured) ||
                a.sort_order - b.sort_order,
        ),
    [state.data, query, category, technology, sort],
  );
  const reset = () => {
    setQuery("");
    setCategory("");
    setTechnology("");
    setPage(1);
  };
  return (
    <main id="main-content" className="container catalog section">
      <h1>Projetos</h1>
      <div className="catalog-controls">
        <label className="search-field">
          <Search size={18} />
          <span className="sr-only">Pesquisar projetos</span>
          <input
            type="search"
            placeholder="Encontre um projeto…"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(1);
            }}
          />
        </label>
        <label className="sr-only" htmlFor="tech">
          Filtrar por tecnologia
        </label>
        <select
          id="tech"
          value={technology}
          onChange={(e) => {
            setTechnology(e.target.value);
            setPage(1);
          }}
        >
          <option value="">Todas as tecnologias</option>
          {data.technologies.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
        <label className="sr-only" htmlFor="sort">
          Ordenar projetos
        </label>
        <select
          id="sort"
          value={sort}
          onChange={(e) => setSort(e.target.value)}
        >
          <option value="editorial">Seleção editorial</option>
          <option value="recent">Mais recentes</option>
          <option value="title">Título A–Z</option>
        </select>
      </div>
      <div className="filter-chips" aria-label="Filtrar por categoria">
        <button
          aria-pressed={!category}
          className={!category ? "selected" : ""}
          onClick={() => {
            setCategory("");
            setPage(1);
          }}
        >
          Todos
        </button>
        {data.categories.map((c) => (
          <button
            key={c.id}
            aria-pressed={category === c.id}
            className={category === c.id ? "selected" : ""}
            onClick={() => {
              setCategory(c.id);
              setPage(1);
            }}
          >
            {c.name}
          </button>
        ))}
      </div>
      {state.loading ? (
        <Loading />
      ) : state.error ? (
        <ErrorState error={state.error} retry={state.reload} />
      ) : filtered.length ? (
        <>
          <p className="result-count" aria-live="polite">
            {filtered.length} {filtered.length === 1 ? "projeto" : "projetos"}
          </p>
          <div className="project-grid">
            {filtered.slice(0, page * 12).map((p) => (
              <ProjectCard key={p.id} project={p} />
            ))}
          </div>
          {filtered.length > page * 12 && (
            <button
              className="button secondary load-more"
              onClick={() => setPage((p) => p + 1)}
            >
              Carregar mais projetos
            </button>
          )}
        </>
      ) : (
        <Empty
          title={
            state.data.length
              ? "Nenhum projeto encontrado"
              : "Novos estudos de caso em breve"
          }
        >
          {state.data.length ? (
            <>
              <span>Experimente outra pesquisa ou categoria.</span>
              <button className="text-button" onClick={reset}>
                <X size={15} /> Limpar filtros
              </button>
            </>
          ) : (
            "Os trabalhos serão apresentados aqui assim que estiverem prontos para publicação."
          )}
        </Empty>
      )}
    </main>
  );
}
