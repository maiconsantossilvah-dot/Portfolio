import { useCallback } from "react";
import { Link, useParams } from "react-router-dom";
import { ExternalLink } from "lucide-react";
import {
  getPublicProject,
  type PublicProject,
} from "../repositories/publicProjects";
import { useAsync } from "../hooks/useAsync";
import { useSite } from "../hooks/SiteContext";
import { useMetadata } from "../hooks/useMetadata";
import { safeUrl } from "../lib/validation";
import { Empty, ErrorState, Loading } from "../components/ui";
import { MediaImage } from "../components/MediaImage";
import BlockRenderer, { SafeEmbed } from "../components/blocks/BlockRenderer";
export function CaseContent({
  project,
  preview = false,
}: {
  project: PublicProject;
  preview?: boolean;
}) {
  const { data } = useSite();
  const sample = project.sample;
  const facts = [
    ["Produto", project.product_name],
    ["Marca", project.brand_name],
    ["Contexto / empresa", project.client_name],
    [
      "Data",
      project.project_date
        ? new Date(`${project.project_date}T12:00:00`).toLocaleDateString(
            "pt-BR",
          )
        : "",
    ],
    ["Minha contribuição", project.contribution],
    ["Autoria e divulgação", project.authorship],
  ];
  return (
    <article className="case-study">
      <div className="container case-heading">
        {preview && (
          <p className="notice">
            Pré-visualização privada. Alterações ainda não publicadas.
          </p>
        )}
        <p className="eyebrow">
          {sample?.category ||
            data.categories
              .filter((c) => project.category_ids.includes(c.id))
              .map((c) => c.name)
              .join(" / ") ||
            "Estudo de caso"}
        </p>
        <h1>{project.title}</h1>
        {project.excerpt && <p className="case-excerpt">{project.excerpt}</p>}
        <div className="tags">
          {data.technologies
            .filter((t) => project.technology_ids.includes(t.id))
            .map((t) => (
              <span key={t.id}>{t.name}</span>
            ))}
        </div>
      </div>
      {sample ? (
        <figure className="container case-cover">
          <img
            src={sample.cover.src}
            alt={sample.cover.alt}
            width={sample.cover.width}
            height={sample.cover.height}
          />
          <figcaption>{sample.cover.caption}</figcaption>
        </figure>
      ) : (
        project.cover_media_id && (
          <div className="container case-cover">
            <MediaImage id={project.cover_media_id} eager />
          </div>
        )
      )}
      <div className="container case-overview">
        {project.description && (
          <p className="case-description">{project.description}</p>
        )}
        {facts.some(([, value]) => value) && (
          <dl className="case-facts">
            {facts
              .filter(([, value]) => value)
              .map(([label, value]) => (
                <div key={label}>
                  <dt>{label}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
          </dl>
        )}
      </div>
      {sample && (
        <section
          className="container case-captures"
          aria-labelledby="case-captures-heading"
        >
          <h2 id="case-captures-heading">A PDP em desktop e mobile</h2>
          <div className="case-capture-grid">
            {sample.captures.map((capture) => (
              <figure key={capture.src}>
                <img
                  src={capture.src}
                  alt={capture.alt}
                  width={capture.width}
                  height={capture.height}
                  loading="lazy"
                />
                <figcaption>{capture.caption}</figcaption>
              </figure>
            ))}
          </div>
        </section>
      )}
      <BlockRenderer blocks={project.blocks} />
      {(project.external_url || project.demo_url) && (
        <div className="container case-links">
          {safeUrl(project.external_url) && (
            <a
              className="button primary"
              href={safeUrl(project.external_url)}
              target="_blank"
              rel="noopener noreferrer"
            >
              Ver projeto publicado
              <ExternalLink size={16} />
            </a>
          )}
          {safeUrl(project.demo_url) && <SafeEmbed url={project.demo_url} />}
        </div>
      )}
    </article>
  );
}
export default function CaseStudy() {
  const { slug = "" } = useParams();
  const loader = useCallback(() => getPublicProject(slug), [slug]);
  const state = useAsync(loader, null);
  const { data } = useSite();
  useMetadata(
    state.data
      ? `${state.data.seo_title || state.data.title} — ${data.profile.name}`
      : `Estudo de caso — ${data.profile.name}`,
    state.data?.seo_description ||
      state.data?.excerpt ||
      "Conheça meus projetos para e-commerce.",
  );
  return (
    <main id="main-content">
      {state.loading ? (
        <Loading />
      ) : state.error ? (
        <div className="container section">
          <ErrorState error={state.error} retry={state.reload} />
        </div>
      ) : !state.data ? (
        <div className="container section">
          <Empty title="Projeto indisponível">
            Este projeto não foi encontrado ou ainda não foi publicado.
          </Empty>
          <Link to="/projetos" className="button secondary">
            Explorar projetos
          </Link>
        </div>
      ) : (
        <>
          <CaseContent project={state.data} />
          <div className="container case-back">
            <Link className="button secondary" to="/projetos">
              Continuar explorando
            </Link>
          </div>
        </>
      )}
    </main>
  );
}
