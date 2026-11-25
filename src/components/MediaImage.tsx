import { useEffect, useState, type CSSProperties } from "react";
import { getMedia, signedMedia } from "../repositories/content";
import type { MediaAsset } from "../types/content";
const assets = new Map<string, MediaAsset>();
const urls = new Map<string, { value: string; expires: number }>();
export function clearMediaCache() {
  assets.clear();
  urls.clear();
}
export async function resolveMedia(id: string, thumbnail = false) {
  let asset = assets.get(id);
  if (!asset) {
    asset = (await getMedia([id]))[0];
    if (!asset) throw new Error("Mídia indisponível.");
    assets.set(id, asset);
  }
  const path =
    thumbnail && asset.thumbnail_path
      ? asset.thumbnail_path
      : asset.storage_path;
  let url = urls.get(path);
  if (!url || url.expires < Date.now()) {
    // Reutilização curta + renovação em 60s mantém margem dentro do TTL de 120s.
    url = { value: await signedMedia(path), expires: Date.now() + 30_000 };
    urls.set(path, url);
  }
  return { asset, url: url.value };
}
export function MediaImage({
  id,
  thumbnail = false,
  alt,
  className = "",
  style,
  eager = false,
}: {
  id: string;
  thumbnail?: boolean;
  alt?: string;
  className?: string;
  style?: CSSProperties;
  eager?: boolean;
}) {
  const [state, setState] = useState<{ asset: MediaAsset; url: string } | null>(
    null,
  );
  const [error, setError] = useState(false);
  useEffect(() => {
    let active = true;
    setState(null);
    setError(false);
    const load = () =>
      resolveMedia(id, thumbnail)
        .then((s) => {
          if (active) {
            setState(s);
            setError(false);
          }
        })
        .catch(() => {
          if (active) {
            setError(true);
            setState(null);
          }
        });
    void load();
    const interval = setInterval(() => {
      assets.delete(id);
      void load();
    }, 60_000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [id, thumbnail]);
  if (error)
    return (
      <span
        className={`media-fallback ${className}`}
        role="img"
        aria-label={alt || "Imagem indisponível"}
      >
        Imagem indisponível
      </span>
    );
  if (!state)
    return (
      <span
        className={`media-skeleton ${className}`}
        aria-label="Carregando imagem"
      />
    );
  return (
    <img
      src={state.url}
      alt={alt ?? state.asset.alt_text}
      width={state.asset.width}
      height={state.asset.height}
      loading={eager ? "eager" : "lazy"}
      decoding="async"
      className={className}
      style={style}
      onError={() => setError(true)}
    />
  );
}
