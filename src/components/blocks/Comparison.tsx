import { useEffect, useId, useState } from "react";
import { GripVertical } from "lucide-react";
import { MediaImage, resolveMedia } from "../MediaImage";
export default function Comparison({
  ids,
  before = "Original",
  after = "Ambientada",
}: {
  ids: string[];
  before?: string;
  after?: string;
}) {
  const [position, setPosition] = useState(50);
  const [ratio, setRatio] = useState("4 / 3");
  const inputId = useId();
  useEffect(() => {
    let active = true;
    if (ids[0])
      void resolveMedia(ids[0])
        .then(({ asset }) => {
          if (active) setRatio(`${asset.width} / ${asset.height}`);
        })
        .catch(() => {});
    return () => {
      active = false;
    };
  }, [ids]);
  if (ids.length !== 2) return null;
  return (
    <figure className="comparison">
      <div className="comparison-images" style={{ aspectRatio: ratio }}>
        <MediaImage id={ids[0]} alt={before} />
        <div
          className="comparison-after"
          style={{ clipPath: `inset(0 ${100 - position}% 0 0)` }}
        >
          <MediaImage id={ids[1]} alt={after} />
        </div>
        <span className="comparison-label before">{after}</span>
        <span className="comparison-label after">{before}</span>
        <span className="comparison-line" style={{ left: `${position}%` }}>
          <GripVertical size={20} />
        </span>
      </div>
      <label htmlFor={inputId} className="sr-only">
        Posição da comparação entre {before} e {after}
      </label>
      <input
        id={inputId}
        type="range"
        min={0}
        max={100}
        value={position}
        onChange={(e) => setPosition(Number(e.target.value))}
        aria-valuetext={`${position}% ${after}`}
      />
      <figcaption>
        Arraste o controle ou use as setas do teclado para comparar.
      </figcaption>
    </figure>
  );
}
