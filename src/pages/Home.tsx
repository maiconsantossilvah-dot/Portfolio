import { useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  Code2,
  Image,
  Layers,
  LayoutTemplate,
  PenTool,
  Search,
  Sparkles,
  Workflow,
  Plus,
  Mail,
} from "lucide-react";
import { useSite } from "../hooks/SiteContext";
import { useMetadata } from "../hooks/useMetadata";
import { useAsync } from "../hooks/useAsync";
import { configured } from "../lib/supabase";
import { safeUrl } from "../lib/validation";
import { listProjects } from "../repositories/content";
import type { Project } from "../types/content";
import { Empty, ErrorState, Loading } from "../components/ui";
import { ProjectCard } from "../components/public/ProjectCard";
import { MediaImage } from "../components/MediaImage";
const load = () =>
  configured ? listProjects() : Promise.resolve([] as Project[]);
const icons = {
  layout: LayoutTemplate,
  image: Image,
  layers: Layers,
  pen: PenTool,
  search: Search,
  sparkles: Sparkles,
  code: Code2,
  workflow: Workflow,
};
export default function Home() {
  const { data, error, reload } = useSite();
  const { profile, settings } = data;
  const visible = (id: string) =>
    settings.sections.some((s) => s.id === id && s.visible);
  const projects = useAsync(load, []);
  const [params] = useSearchParams();
  useMetadata(
    `${profile.name} — Design, conteúdo e tecnologia para e-commerce`,
    settings.hero_description,
  );
  useEffect(() => {
    const target = params.get("sec");
    if (target)
      requestAnimationFrame(() =>
        document.getElementById(target)?.scrollIntoView({
          behavior: matchMedia("(prefers-reduced-motion: reduce)").matches
            ? "instant"
            : "smooth",
        }),
      );
  }, [params]);
  const contact = profile.contacts.find((c) => safeUrl(c.url, true));
  const featured = projects.data.filter((p) => p.featured);
  const sections = {
    projects: (
      <section id="projects" className="section projects-section container">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Portfólio selecionado</p>
            <h2>
              Ideias que ganham
              <br />
              <span className="muted">forma e função.</span>
            </h2>
          </div>
          <Link className="button secondary" to="/projetos">
            Todos os projetos <Plus size={16} />
          </Link>
        </div>
        {projects.loading ? (
          <Loading />
        ) : projects.error ? (
          <ErrorState error={projects.error} retry={projects.reload} />
        ) : featured.length ? (
          <div className="project-grid">
            {featured.map((p) => (
              <ProjectCard key={p.id} project={p} />
            ))}
          </div>
        ) : (
          <div className="work-empty">
            <div className="work-empty-art" aria-hidden="true">
              <span>
                EM
                <br />
                CONSTRUÇÃO
                <br />
                <i>contínua.</i>
              </span>
              <span className="asterisk">✳</span>
            </div>
            <div>
              <p className="eyebrow">Cada projeto tem uma história</p>
              <h3>
                O próximo capítulo
                <br />
                começa aqui.
              </h3>
              <p>
                Os estudos de caso estão sendo preparados. Enquanto isso,
                conheça as possibilidades para o seu próximo projeto.
              </p>
              {visible("services") && (
                <Link className="text-link" to="/?sec=services">
                  Explorar serviços
                </Link>
              )}
            </div>
          </div>
        )}
      </section>
    ),
    services: (
      <section id="services" className="section services-section">
        <div className="container">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Do conceito à entrega</p>
              <h2>
                O que podemos
                <br />
                <span className="muted">construir juntos.</span>
              </h2>
            </div>
            <p className="section-intro">
              Uma visão integrada de conteúdo, imagem e tecnologia para o seu
              e-commerce.
            </p>
          </div>
          <div className="service-grid">
            {data.services
              .filter((s) => s.active)
              .map((service) => {
                const Icon =
                  icons[service.icon as keyof typeof icons] || LayoutTemplate;
                return (
                  <article className="service-card" key={service.id}>
                    <Icon size={24} strokeWidth={1.4} />
                    <h3>{service.title}</h3>
                    <p>{service.description}</p>
                    {service.price && (
                      <span className="price">{service.price}</span>
                    )}
                    {contact && (
                      <a
                        className="service-cta"
                        href={safeUrl(contact.url, true)}
                        rel="noopener noreferrer"
                      >
                        Solicitar orçamento <Plus size={15} />
                      </a>
                    )}
                  </article>
                );
              })}
          </div>
          {!data.services.some((s) => s.active) && (
            <Empty title="Novos serviços em breve" />
          )}
        </div>
      </section>
    ),
    about: (
      <section id="about" className="section about-section container">
        <div className="about-identity">
          {profile.photo_media_id ? (
            <MediaImage
              id={profile.photo_media_id}
              alt={profile.full_name}
              className="profile-photo"
            />
          ) : (
            <div className="identity-art" aria-hidden="true">
              <span>
                criatividade
                <br />
                <i>encontra</i>
                <br />
                tecnologia<span className="identity-dot">.</span>
              </span>
            </div>
          )}
          <p className="mono">
            {profile.full_name}
            <br />
            <span className="muted">{profile.role}</span>
          </p>
        </div>
        <div className="about-copy">
          <p className="eyebrow">Prazer, {profile.name.split(" ")[0]}.</p>
          <h2>
            Um olhar criativo.
            <br />
            <span className="muted">Uma base técnica.</span>
          </h2>
          {profile.bio.split("\n\n").map((p, i) => (
            <p key={i}>{p}</p>
          ))}
          {profile.author_note && (
            <div className="about-note">
              <Code2 size={20} />
              <p>{profile.author_note}</p>
            </div>
          )}
        </div>
      </section>
    ),
    contact: (
      <section id="contact" className="section contact-section container">
        <p className="eyebrow">Seu próximo projeto</p>
        <div className="contact-heading">
          <h2>{settings.contact_title}</h2>
          <span aria-hidden="true">✳</span>
        </div>
        <div className="contact-bottom">
          <p>{settings.contact_description}</p>
          <div className="contact-links">
            {profile.contacts
              .filter((c) => safeUrl(c.url, true))
              .map((c, i) => (
                <a
                  href={safeUrl(c.url, true)}
                  key={`${c.label}-${i}`}
                  className={i === 0 ? "button primary" : "text-link"}
                  target={c.url.startsWith("https:") ? "_blank" : undefined}
                  rel="noopener noreferrer"
                >
                  {i === 0 && <Mail size={17} />}
                  {c.label}
                </a>
              ))}
            {!profile.contacts.length && (
              <p>Os canais de contato serão disponibilizados em breve.</p>
            )}
          </div>
        </div>
      </section>
    ),
  };
  return (
    <main id="main-content">
      <section className="hero container">
        <div className="hero-topline">
          <p className="eyebrow">PORTFÓLIO · DESIGN & TECNOLOGIA</p>
          {settings.available && (
            <span className="availability">
              <i />
              {settings.availability_text}
            </span>
          )}
        </div>
        <div className="hero-grid">
          <div className="hero-copy">
            <h1>
              {settings.hero_title.endsWith("para e-commerce.")
                ? settings.hero_title.slice(0, -"para e-commerce.".length)
                : settings.hero_title}
              {settings.hero_title.endsWith("para e-commerce.") && (
                <span className="accent-text">para e-commerce.</span>
              )}
            </h1>
            <p className="hero-description">{settings.hero_description}</p>
            <div className="hero-actions">
              <Link className="button primary" to="/projetos">
                Explorar projetos <Plus size={17} />
              </Link>
              {visible("contact") && (
                <Link className="text-link" to="/?sec=contact">
                  Entrar em contato
                </Link>
              )}
            </div>
          </div>
          <div
            className="hero-art"
            aria-label="Composição editorial: conteúdo, imagem e tecnologia"
          >
            <div className="art-grid" />
            <div className="art-orbit" />
            <div className="art-type">
              e<span>com</span>
              <br />
              <i>merce</i>
              <b>✳</b>
            </div>
            <div className="art-label">
              <span className="mono">IDEIA → EXPERIÊNCIA</span>
              <span>
                Conteúdo que apresenta.
                <br />
                Tecnologia que conecta.
              </span>
            </div>
            <div className="art-sticker">
              <Code2 size={18} />
              <span>
                Feito de criatividade.
                <br />
                Construído com código.
              </span>
            </div>
          </div>
        </div>
        <div className="hero-bottom">
          <span>ESTRATÉGIA + EXECUÇÃO</span>
          <div>
            <span>Conteúdo rico</span>
            <i>✳</i>
            <span>Design comercial</span>
            <i>✳</i>
            <span>Inteligência artificial</span>
            <i>✳</i>
            <span>Desenvolvimento</span>
          </div>
        </div>
      </section>
      {!!error && (
        <div className="container">
          <ErrorState error={error} retry={reload} />
        </div>
      )}
      {settings.sections
        .filter((s) => s.visible)
        .map((s) => (
          <div key={s.id}>{sections[s.id]}</div>
        ))}
    </main>
  );
}
