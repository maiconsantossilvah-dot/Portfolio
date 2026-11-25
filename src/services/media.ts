import { db } from "../lib/supabase";
import type { MediaAsset } from "../types/content";
export const MAX_IMAGE_BYTES = 25 * 1024 * 1024;
export async function validateImage(file: File) {
  if (file.size > MAX_IMAGE_BYTES || file.size === 0)
    throw new Error("Cada imagem deve ter entre 1 byte e 25 MB.");
  const bytes = new Uint8Array(await file.slice(0, 64).arrayBuffer());
  const str = new TextDecoder("ascii").decode(bytes);
  const type =
    bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff
      ? "image/jpeg"
      : bytes[0] === 0x89 &&
          str.slice(1, 4) === "PNG" &&
          bytes[4] === 13 &&
          bytes[5] === 10 &&
          bytes[6] === 26 &&
          bytes[7] === 10
        ? "image/png"
        : str.startsWith("RIFF") && str.slice(8, 12) === "WEBP"
          ? "image/webp"
          : str.slice(4, 8) === "ftyp" && /avif|avis/.test(str.slice(8, 40))
            ? "image/avif"
            : null;
  if (!type || type !== file.type)
    throw new Error(
      "Envie JPEG, PNG, WebP ou AVIF válidos. SVG e HTML não são aceitos.",
    );
  return type;
}
function canvasBlob(bitmap: ImageBitmap, maxSide: number, quality: number) {
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const ctx = canvas.getContext("2d");
  if (!ctx)
    throw new Error("Seu navegador não suporta processamento de imagens.");
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return new Promise<{ blob: Blob; width: number; height: number }>(
    (resolve, reject) =>
      canvas.toBlob(
        (blob) =>
          blob?.type === "image/webp"
            ? resolve({ blob, width: canvas.width, height: canvas.height })
            : reject(new Error("Conversão WebP indisponível neste navegador.")),
        "image/webp",
        quality,
      ),
  );
}
export async function uploadImage(
  file: File,
  preserveOriginal = true,
  quality = 0.92,
): Promise<MediaAsset> {
  const mime = await validateImage(file);
  const bitmap = await createImageBitmap(file);
  if (bitmap.width * bitmap.height > 100_000_000) {
    bitmap.close();
    throw new Error(
      "Imagem muito grande: limite de 100 megapixels. Divida conteúdos longos em partes.",
    );
  }
  let original: { blob: Blob; width: number; height: number };
  let thumbnail: { blob: Blob; width: number; height: number };
  try {
    original = preserveOriginal
      ? { blob: file, width: bitmap.width, height: bitmap.height }
      : await canvasBlob(bitmap, 5000, quality);
    thumbnail = await canvasBlob(bitmap, 960, 0.85);
  } finally {
    bitmap.close();
  }
  const extension = preserveOriginal
    ? {
        "image/jpeg": "jpg",
        "image/png": "png",
        "image/webp": "webp",
        "image/avif": "avif",
      }[mime]
    : "webp";
  const id = crypto.randomUUID();
  const path = `images/${id}/original.${extension}`;
  const thumbPath = `images/${id}/thumb.webp`;
  const bucket = db().storage.from("portfolio-media");
  const uploaded: string[] = [];
  try {
    const full = await bucket.upload(path, original.blob, {
      contentType: original.blob.type,
      upsert: false,
      cacheControl: "120",
    });
    if (full.error) throw full.error;
    uploaded.push(path);
    const thumb = await bucket.upload(thumbPath, thumbnail.blob, {
      contentType: "image/webp",
      upsert: false,
      cacheControl: "120",
    });
    if (thumb.error) throw thumb.error;
    uploaded.push(thumbPath);
    const asset: MediaAsset = {
      id,
      storage_path: path,
      thumbnail_path: thumbPath,
      file_name: file.name,
      mime_type: original.blob.type,
      size: original.blob.size + thumbnail.blob.size,
      width: original.width,
      height: original.height,
      alt_text: "",
      caption: "",
      tag: "",
      created_at: new Date().toISOString(),
    };
    const { error } = await db().from("media_assets").insert(asset);
    if (error) throw error;
    return asset;
  } catch (error) {
    if (uploaded.length) await bucket.remove(uploaded);
    throw error;
  }
}
export async function deleteMedia(asset: MediaAsset) {
  const prepared = await db().rpc("prepare_media_delete", {
    asset_id: asset.id,
  });
  if (prepared.error) throw prepared.error;
  const paths = [asset.storage_path, asset.thumbnail_path].filter(
    (x): x is string => !!x,
  );
  const removed = await db().storage.from("portfolio-media").remove(paths);
  if (removed.error) throw removed.error;
  const { error } = await db().from("media_assets").delete().eq("id", asset.id);
  if (error) throw error;
}
