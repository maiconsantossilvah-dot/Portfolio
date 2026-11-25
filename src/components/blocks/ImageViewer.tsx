import { useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Expand,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { Modal } from "../ui";
import { MediaImage } from "../MediaImage";
export function ImageViewer({
  ids,
  start = 0,
  onClose,
}: {
  ids: string[];
  start?: number;
  onClose: () => void;
}) {
  const [index, setIndex] = useState(start);
  const [zoom, setZoom] = useState(1);
  const change = (offset: number) => {
    setIndex((i) => (i + offset + ids.length) % ids.length);
    setZoom(1);
  };
  return (
    <Modal title="Visualizador de imagens" onClose={onClose} wide>
      <div
        className="viewer"
        onKeyDown={(e) => {
          if (e.key === "ArrowRight") {
            e.preventDefault();
            change(1);
          }
          if (e.key === "ArrowLeft") {
            e.preventDefault();
            change(-1);
          }
        }}
      >
        <div className="viewer-toolbar">
          <span aria-live="polite">
            Imagem {index + 1} de {ids.length}
          </span>
          <div>
            <button
              className="icon-button"
              aria-label="Imagem anterior"
              disabled={ids.length < 2}
              onClick={() => change(-1)}
            >
              <ChevronLeft />
            </button>
            <button
              className="icon-button"
              aria-label="Próxima imagem"
              disabled={ids.length < 2}
              onClick={() => change(1)}
            >
              <ChevronRight />
            </button>
            <button
              className="icon-button"
              aria-label="Diminuir zoom"
              disabled={zoom <= 0.5}
              onClick={() => setZoom((z) => Math.max(0.5, z - 0.25))}
            >
              <ZoomOut />
            </button>
            <span className="mono">{Math.round(zoom * 100)}%</span>
            <button
              className="icon-button"
              aria-label="Aumentar zoom"
              disabled={zoom >= 3}
              onClick={() => setZoom((z) => Math.min(3, z + 0.25))}
            >
              <ZoomIn />
            </button>
            <button
              className="icon-button"
              aria-label="Tela cheia"
              onClick={(e) => {
                const dialog = e.currentTarget.closest("dialog");
                if (document.fullscreenElement)
                  void document.exitFullscreen().catch(() => {});
                else void dialog?.requestFullscreen?.().catch(() => {});
              }}
            >
              <Expand />
            </button>
          </div>
        </div>
        <div
          className="viewer-scroll"
          tabIndex={0}
          aria-label="Área rolável da imagem"
        >
          <MediaImage
            key={ids[index]}
            id={ids[index]}
            style={{
              width: `${zoom * 100}%`,
              maxWidth: "none",
              height: "auto",
            }}
            eager
          />
        </div>
      </div>
    </Modal>
  );
}
export function Gallery({
  ids,
  grid = false,
  columns = 2,
  caption,
}: {
  ids: string[];
  grid?: boolean;
  columns?: number;
  caption?: string;
}) {
  const [selected, setSelected] = useState<number | null>(null);
  if (!ids.length) return null;
  return (
    <figure>
      <div
        className={`block-gallery ${grid ? "gallery-grid" : ""}`}
        style={{ "--columns": columns } as React.CSSProperties}
      >
        {ids.map((id, i) => (
          <button
            key={`${id}-${i}`}
            className="gallery-item"
            onClick={() => setSelected(i)}
            aria-label={`Ampliar imagem ${i + 1}`}
          >
            <MediaImage id={id} />
            <span>
              <Expand size={17} />
              Ampliar
            </span>
          </button>
        ))}
      </div>
      {caption && <figcaption>{caption}</figcaption>}
      {selected !== null && (
        <ImageViewer
          ids={ids}
          start={selected}
          onClose={() => setSelected(null)}
        />
      )}
    </figure>
  );
}
