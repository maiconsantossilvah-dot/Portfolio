import { Link } from "react-router-dom";
import type { Project } from "../../types/content";
import { useSite } from "../../hooks/SiteContext";
import { MediaImage } from "../MediaImage";
export function ProjectCard({ project }: { project: Project }) {
  const { data } = useSite();
  return (
    <Link
      className={`project-card project-${project.project_type}`}
      to={`/projetos/${project.slug}`}
    >
      <div className="project-cover">
        {project.cover_media_id ? (
          <MediaImage id={project.cover_media_id} thumbnail />
        ) : (
          <span className="project-cover-type">
            {project.project_type === "app" ? "{ }" : "✳"}
          </span>
        )}
        <span className="project-open">Ver projeto</span>
      </div>
      <div className="project-caption">
        <div className="project-categories">
          {data.categories
            .filter((c) => project.category_ids.includes(c.id))
            .map((c) => (
              <span key={c.id}>{c.name}</span>
            ))}
        </div>
        <h3>{project.title}</h3>
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
