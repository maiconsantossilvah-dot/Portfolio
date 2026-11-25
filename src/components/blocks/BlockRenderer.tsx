import { Fragment, useState } from "react";
import { ExternalLink, Monitor, Smartphone } from "lucide-react";
import type { Block } from "../../types/content";
import { safeUrl } from "../../lib/validation";
import { Gallery } from "./ImageViewer";
import Comparison from "./Comparison";
export function FormattedText({ text }: { text: string }) {
  return (
    <div className="formatted-text">
      {text.split("\n").map((line, i) => (
        <p key={i}>
          {line.split(/(\*\*[^*]+\*\*|\[[^\]]+\]\([^)]+\))/g).map((part, j) => {
            if (part.startsWith("**") && part.endsWith("**"))
              return <strong key={j}>{part.slice(2, -2)}</strong>;
            const link = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
            if (link)
              return safeUrl(link[2]) ? (
                <a
                  key={j}
                  href={safeUrl(link[2])}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {link[1]}
                </a>
              ) : (
                <Fragment key={j}>{link[1]}</Fragment>
              );
            return <Fragment key={j}>{part}</Fragment>;
          })}
        </p>
      ))}
    </div>
  );
}
export function SafeEmbed({
  url,
  label = "Abrir demonstração",
}: {
  url: string;
  label?: string;
}) {
  const [loaded, setLoaded] = useState(false);
  const safe = safeUrl(url);
  let isolated = false;
  if (safe) {
    const origin = new URL(safe).origin;
    isolated =
      origin !== location.origin &&
      origin !== import.meta.env.VITE_SUPABASE_URL;
  }
  if (!safe) return null;
  return (
    <div className="embed-block">
      {loaded && isolated && (
        <iframe
          title={label}
          src={safe}
          sandbox=""
          referrerPolicy="no-referrer"
          loading="lazy"
          allow=""
        />
      )}
      <div className="embed-actions">
        {!loaded && isolated && (
          <button className="button secondary" onClick={() => setLoaded(true)}>
            Carregar prévia isolada
          </button>
        )}
        <a
          className="button secondary"
          href={safe}
          target="_blank"
          rel="noopener noreferrer"
        >
          {label}
          <ExternalLink size={16} />
        </a>
      </div>
      <p className="muted small">
        A prévia usa um ambiente sem scripts e sem acesso à sessão. Se o site
        bloquear a incorporação ou precisar de JavaScript, abra a demonstração
        em outra aba.
      </p>
    </div>
  );
}
function PdpViewer({
  desktop,
  mobile,
  caption,
}: {
  desktop: string[];
  mobile: string[];
  caption?: string;
}) {
  const [mode, setMode] = useState<"desktop" | "mobile">(
    desktop.length ? "desktop" : "mobile",
  );
  const ids = mode === "desktop" ? desktop : mobile;
  return (
    <div className="pdp-viewer">
      <div className="pdp-toolbar">
        <span>Conteúdo rico · visualização completa</span>
        {desktop.length > 0 && mobile.length > 0 && (
          <div className="segmented" role="group" aria-label="Formato da PDP">
            <button
              aria-pressed={mode === "desktop"}
              onClick={() => setMode("desktop")}
            >
              <Monitor size={16} />
              Desktop
            </button>
            <button
              aria-pressed={mode === "mobile"}
              onClick={() => setMode("mobile")}
            >
              <Smartphone size={16} />
              Mobile
            </button>
          </div>
        )}
      </div>
      <div
        className={`pdp-scroll ${mode}`}
        tabIndex={0}
        aria-label={`Conteúdo da PDP ${mode}, role para explorar`}
      >
        <Gallery ids={ids} caption={caption} />
      </div>
      <p className="small muted">
        Role para explorar. Selecione uma imagem para ampliar, usar zoom ou
        navegar pelo teclado.
      </p>
    </div>
  );
}
function RenderBlock({ block }: { block: Block }) {
  const c = block.content;
  const ids = c.media_ids || [];
  const items = c.items || [];
  switch (block.block_type) {
    case "heading":
      return <h2>{c.text}</h2>;
    case "subheading":
      return <h3>{c.text}</h3>;
    case "paragraph":
      return <p className="block-paragraph">{c.text}</p>;
    case "rich_text":
      return <FormattedText text={c.text || ""} />;
    case "image":
    case "banner":
      return <Gallery ids={ids.slice(0, 1)} caption={c.caption} />;
    case "gallery":
    case "image_grid":
      return (
        <Gallery
          ids={ids}
          grid={block.block_type === "image_grid"}
          columns={c.columns}
          caption={c.caption}
        />
      );
    case "comparison":
      return (
        <>
          <Comparison
            ids={ids}
            before={c.label || "Original"}
            after={c.after_label || "Ambientada"}
          />
          {c.caption && <p className="small muted">{c.caption}</p>}
        </>
      );
    case "pdp":
      return (
        <PdpViewer
          desktop={c.desktop_ids || []}
          mobile={c.mobile_ids || []}
          caption={c.caption}
        />
      );
    case "video":
      return safeUrl(c.url || "") ? (
        <figure>
          <video
            src={safeUrl(c.url!)}
            controls
            preload="metadata"
            playsInline
            aria-label={c.title || "Vídeo do projeto"}
          />
          {c.caption && <figcaption>{c.caption}</figcaption>}
        </figure>
      ) : null;
    case "embed":
      return <SafeEmbed url={c.url || ""} label={c.label} />;
    case "features":
      return (
        <ul className="feature-list">
          {items.map((item, i) => (
            <li key={i}>
              <strong>{item.title}</strong>
              {item.text && <p>{item.text}</p>}
            </li>
          ))}
        </ul>
      );
    case "technologies":
      return (
        <div className="tags large">
          {items.map((item, i) => (
            <span key={i}>{item.title}</span>
          ))}
        </div>
      );
    case "specs":
      return (
        <dl className="spec-list">
          {items.map((item, i) => (
            <div key={i}>
              <dt>{item.title}</dt>
              <dd>{item.text}</dd>
            </div>
          ))}
        </dl>
      );
    case "faq":
      return (
        <div className="faq-list">
          {items.map((item, i) => (
            <details key={i}>
              <summary>{item.title}</summary>
              <p>{item.text}</p>
            </details>
          ))}
        </div>
      );
    case "process":
      return (
        <ol className="process-list">
          {items.map((item, i) => (
            <li key={i}>
              <span className="process-node" />
              <h3>{item.title}</h3>
              <p>{item.text}</p>
            </li>
          ))}
        </ol>
      );
    case "code":
      return (
        <figure className="code-block">
          {c.language && <figcaption>{c.language}</figcaption>}
          <pre>
            <code>{c.text}</code>
          </pre>
        </figure>
      );
    case "link":
      return safeUrl(c.url || "") ? (
        <a
          className="button primary"
          href={safeUrl(c.url!)}
          target="_blank"
          rel="noopener noreferrer"
        >
          {c.label || "Saiba mais"}
          <ExternalLink size={16} />
        </a>
      ) : null;
    case "metric":
      return (
        <div className="metric-block">
          <strong>{c.title}</strong>
          <p>{c.text}</p>
        </div>
      );
    case "divider":
      return <hr />;
    case "spacer":
      return (
        <div
          className={`block-spacer ${c.spacing || "medium"}`}
          aria-hidden="true"
        />
      );
  }
}
export default function BlockRenderer({ blocks }: { blocks: Block[] }) {
  return (
    <div className="case-blocks">
      {[...blocks]
        .sort((a, b) => a.sort_order - b.sort_order)
        .map((b) => (
          <section
            key={b.id}
            className={`content-block block-${b.block_type} width-${b.content.width || "normal"} align-${b.content.align || "left"} space-${b.content.spacing || "medium"}`}
          >
            {b.content.title && b.block_type !== "metric" && (
              <h2>{b.content.title}</h2>
            )}
            <RenderBlock block={b} />
          </section>
        ))}
    </div>
  );
}
