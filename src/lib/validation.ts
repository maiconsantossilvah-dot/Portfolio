import { z } from "zod";
import { blockTypes } from "../types/content";

export function safeUrl(value: string, contact = false): string | undefined {
  if (
    !value ||
    [...value].some((c) => c.charCodeAt(0) <= 32 || c.charCodeAt(0) === 127)
  )
    return undefined;
  try {
    const parsed = new URL(value);
    if (parsed.username || parsed.password) return undefined;
    if (
      ["https:", ...(contact ? ["mailto:", "tel:"] : [])].includes(
        parsed.protocol,
      )
    )
      return value;
  } catch {
    /* Invalid URLs are omitted, never injected into href/src. */
  }
  return undefined;
}
export const slugify = (text: string) =>
  text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
const id = z.uuid();
const optionalUrl = z
  .string()
  .max(2000)
  .refine(
    (v) => !v || !!safeUrl(v),
    "Use uma URL HTTPS válida, sem credenciais.",
  );
const text = z.string().max(100000);
export const contentSchema = z
  .object({
    title: text.optional(),
    text: text.optional(),
    url: optionalUrl.optional(),
    label: text.optional(),
    after_label: text.optional(),
    media_ids: z.array(id).max(100).optional(),
    desktop_ids: z.array(id).max(100).optional(),
    mobile_ids: z.array(id).max(100).optional(),
    items: z
      .array(
        z.object({ title: z.string().max(2000), text: z.string().max(10000) }),
      )
      .max(200)
      .optional(),
    caption: text.optional(),
    alt: text.optional(),
    width: z.enum(["normal", "wide", "full"]).optional(),
    align: z.enum(["left", "center"]).optional(),
    spacing: z.enum(["small", "medium", "large"]).optional(),
    columns: z.union([z.literal(2), z.literal(3)]).optional(),
    language: z.string().max(40).optional(),
  })
  .strict();
export const blockSchema = z.object({
  id,
  block_type: z.enum(blockTypes),
  content: contentSchema,
  sort_order: z.number().int().min(0),
});
export const projectSchema = z
  .object({
    id,
    title: z
      .string()
      .trim()
      .min(3, "Informe um título com pelo menos 3 caracteres.")
      .max(180),
    slug: z
      .string()
      .regex(
        /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
        "Use letras minúsculas, números e hífens.",
      )
      .max(200),
    excerpt: z.string().max(500),
    description: text,
    project_type: z.enum(["case", "pdp", "images", "app"]),
    cover_media_id: id.nullable(),
    status: z.enum(["draft", "published", "archived"]),
    featured: z.boolean(),
    sort_order: z.number().int().min(0),
    client_name: z.string().max(200),
    brand_name: z.string().max(200),
    contribution: text,
    external_url: optionalUrl,
    demo_url: optionalUrl,
    project_date: z.union([z.iso.date(), z.null()]),
    seo_title: z.string().max(180),
    seo_description: z.string().max(500),
    created_at: z.string(),
    updated_at: z.string(),
    published_at: z.string().nullable(),
    product_name: z.string().max(200),
    authorship: text,
    blocks: z.array(blockSchema).max(200),
    category_ids: z.array(id).max(50),
    technology_ids: z.array(id).max(50),
  })
  .superRefine((p, ctx) => {
    if (p.status === "published") {
      if (!p.excerpt.trim())
        ctx.addIssue({
          code: "custom",
          path: ["excerpt"],
          message: "Adicione um resumo antes de publicar.",
        });
      if (!p.cover_media_id)
        ctx.addIssue({
          code: "custom",
          path: ["cover_media_id"],
          message: "Selecione uma capa antes de publicar.",
        });
      if (!p.category_ids.length)
        ctx.addIssue({
          code: "custom",
          path: ["category_ids"],
          message: "Selecione ao menos uma categoria.",
        });
      p.blocks.forEach((b, i) => {
        const media = b.content.media_ids || [];
        if (
          ["image", "gallery", "image_grid", "banner"].includes(b.block_type) &&
          !media.length
        )
          ctx.addIssue({
            code: "custom",
            path: ["blocks", i],
            message: "Selecione imagens nos blocos de mídia.",
          });
        if (b.block_type === "comparison" && media.length !== 2)
          ctx.addIssue({
            code: "custom",
            path: ["blocks", i],
            message: "O comparador precisa de duas imagens.",
          });
        if (["embed", "video", "link"].includes(b.block_type) && !b.content.url)
          ctx.addIssue({
            code: "custom",
            path: ["blocks", i],
            message: "Adicione a URL do bloco.",
          });
        if (
          b.block_type === "pdp" &&
          !b.content.desktop_ids?.length &&
          !b.content.mobile_ids?.length
        )
          ctx.addIssue({
            code: "custom",
            path: ["blocks", i],
            message: "Selecione as capturas da PDP.",
          });
      });
    }
  });
export function mediaReferences(
  project: Pick<z.infer<typeof projectSchema>, "cover_media_id" | "blocks">,
) {
  return [
    ...new Set(
      [
        project.cover_media_id,
        ...project.blocks.flatMap((b) => [
          ...(b.content.media_ids || []),
          ...(b.content.desktop_ids || []),
          ...(b.content.mobile_ids || []),
        ]),
      ].filter((x): x is string => !!x),
    ),
  ];
}
export function moveItem<T>(items: T[], from: number, to: number): T[] {
  if (from < 0 || to < 0 || from >= items.length || to >= items.length)
    return items;
  const next = [...items];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}
