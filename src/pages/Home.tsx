import { useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowDownRight, ArrowRight, ArrowUpRight } from "lucide-react";
import { useSite } from "../hooks/SiteContext";
import { useMetadata } from "../hooks/useMetadata";
import { useAsync } from "../hooks/useAsync";
import { safeUrl } from "../lib/validation";
import { listPublicProjects } from "../repositories/publicProjects";
import { Empty, ErrorState, Loading } from "../components/ui";
import { ProjectCard } from "../components/public/ProjectCard";
import { MediaImage } from "../components/MediaImage";

export default function Home() {
  const { data, error, reload } = useSite();
  const { profile, settings } = data;
  const visible = (id: string) =>
    settings.sections.some((section) => section.id === id && section.visible);
  const projects = useAsync(listPublicProjects, []);
  const [params] = useSearchParams();
  useMetadata(
    `${profile.name} — ${settings.hero_title}`,
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

  const contacts = profile.contacts.filter((contact) =>
    safeUrl(contact.url, true),
  );
  const primaryContact = contacts[0];
  const services = data.services.filter((service) => service.active);
  const featured = projects.data.filter((project) => project.featured);
  const [lead, ...otherFeatured] = featured;
  const sections = {
    projects: (
      <section
        id="projects"
        className="section projects-section container"
        aria-labelledby="selected-work"
      >
        <div className="work-heading">
          <h2 id="selected-work">Trabalhos selecionados</h2>
          <Link className="editorial-link" to="/projetos">
            Todos os projetos <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </div>
        {projects.loading ? (
          <Loading />
        ) : projects.error ? (
          <ErrorState error={projects.error} retry={projects.reload} />
        ) : lead ? (
          <>
            <ProjectCard project={lead} lead />
            {otherFeatured.length > 0 && (
              <div className="project-grid featured-grid">
                {otherFeatured.map((project) => (
                  <ProjectCard key={project.id} project={project} />
                ))}
              </div>
            )}
          </>
        ) : (
          <p className="work-empty">Novos estudos de caso em breve.</p>
        )}
      </section>
    ),
    services: (
      <section
        id="services"
        className="section editorial-section container"
        aria-labelledby="service-heading"
      >
        <h2 id="service-heading">Serviços</h2>
        {services.length ? (
          <ul className="service-list">
            {services.map((service) => (
              <li className="service-row" key={service.id}>
                <h3>{service.title}</h3>
                <div className="service-detail">
                  <p>{service.description}</p>
                  {service.price && <p className="price">{service.price}</p>}
                </div>
                {primaryContact && (
                  <a
                    className="editorial-link service-cta"
                    href={safeUrl(primaryContact.url, true)}
                    aria-label={`Solicitar orçamento para ${service.title}`}
                    rel="noopener noreferrer"
                  >
                    Solicitar orçamento{" "}
                    <ArrowUpRight size={15} aria-hidden="true" />
                  </a>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <Empty title="Novos serviços em breve" />
        )}
      </section>
    ),
    about: (
      <section
        id="about"
        className="section editorial-section container"
        aria-labelledby="about-heading"
      >
        <h2 id="about-heading">Sobre mim</h2>
        <div className="about-grid">
          <div className="about-identity">
            {profile.photo_media_id && (
              <MediaImage
                id={profile.photo_media_id}
                alt={profile.full_name}
                className="profile-photo"
              />
            )}
            <p className="about-name">{profile.full_name}</p>
            <p className="about-role">{profile.role}</p>
          </div>
          <div className="about-copy">
            {profile.bio.split("\n\n").map((paragraph, index) => (
              <p key={index}>{paragraph}</p>
            ))}
            {profile.author_note && (
              <p className="about-note">{profile.author_note}</p>
            )}
          </div>
        </div>
      </section>
    ),
    contact: (
      <section
        id="contact"
        className="section contact-section container"
        aria-labelledby="contact-heading"
      >
        <h2 id="contact-heading">{settings.contact_title}</h2>
        <div className="contact-bottom">
          <p>{settings.contact_description}</p>
          <div className="contact-links">
            {contacts.map((contact, index) => (
              <a
                href={safeUrl(contact.url, true)}
                key={`${contact.label}-${index}`}
                className="editorial-link"
                target={contact.url.startsWith("https:") ? "_blank" : undefined}
                rel="noopener noreferrer"
              >
                {contact.label} <ArrowUpRight size={15} aria-hidden="true" />
              </a>
            ))}
            {!contacts.length && (
              <p>Os canais de contato serão disponibilizados em breve.</p>
            )}
          </div>
        </div>
      </section>
    ),
  };

  return (
    <main id="main-content" className="editorial-home">
      <section className="hero container" aria-labelledby="home-heading">
        <div className="hero-title">
          {settings.available && (
            <p className="availability">
              <span aria-hidden="true" />
              {settings.availability_text}
            </p>
          )}
          <h1 id="home-heading">{settings.hero_title}</h1>
        </div>
        <div className="hero-aside">
          <p className="hero-description">{settings.hero_description}</p>
          <div className="hero-actions">
            <Link className="editorial-link" to="/projetos">
              Explorar projetos <ArrowRight size={17} aria-hidden="true" />
            </Link>
            {visible("contact") && (
              <Link className="editorial-link" to="/?sec=contact">
                Entrar em contato{" "}
                <ArrowDownRight size={17} aria-hidden="true" />
              </Link>
            )}
          </div>
        </div>
      </section>
      {!!error && (
        <div className="container">
          <ErrorState error={error} retry={reload} />
        </div>
      )}
      {settings.sections
        .filter((section) => section.visible)
        .map((section) => (
          <div key={section.id}>{sections[section.id]}</div>
        ))}
    </main>
  );
}
