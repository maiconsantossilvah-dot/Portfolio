import { Link } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";
import type { PublicProject } from "../../repositories/publicProjects";
import { useSite } from "../../hooks/SiteContext";
import { MediaImage } from "../MediaImage";
export function ProjectCard({
  project,
  lead = false,
}: {
  project: PublicProject;
  lead?: boolean;
}) {
  const { data } = useSite();
  const cover = project.sample?.cover;
  return (
    <Link
      className={lead ? "project-card project-lead" : "project-card"}
      to={`/projetos/${project.slug}`}
    >
      {(project.cover_media_id || cover) && (
        <div className="project-cover">
          {cover ? (
            <img
              src={cover.src}
              alt=""
              width={cover.width}
              height={cover.height}
              loading={lead ? "eager" : "lazy"}
              decoding="async"
            />
          ) : (
            project.cover_media_id && (
              <MediaImage
                id={project.cover_media_id}
                thumbnail={!lead}
                eager={lead}
              />
            )
          )}
        </div>
      )}
      <div className="project-caption">
        <div className="project-categories">
          {project.sample && <span>{project.sample.category}</span>}
          {data.categories
            .filter((c) => project.category_ids.includes(c.id))
            .map((c) => (
              <span key={c.id}>{c.name}</span>
            ))}
        </div>
        <div className="project-title">
          <h3>{project.title}</h3>
          <ArrowUpRight size={22} aria-hidden="true" />
        </div>
        <p>{project.excerpt}</p>
        <div className="tags">
          {data.technologies
            .filter((t) => project.technology_ids.includes(t.id))
            .map((t) => (
              <span key={t.id}>{t.name}</span>
            ))}
        </div>
      </div>
    </Link>
  );
}
