import { z } from "zod";
import { blockLabels } from "../config/defaults";
import { contentSchema, projectSchema, slugify } from "../lib/validation";
import {
  blockTypes,
  type BlockType,
  type Project,
  type SiteData,
} from "../types/content";

const fields = projectSchema.shape;
const names = z.array(z.string().trim().min(1).max(120)).max(50).default([]);
const draftFields = z.strictObject({
  title: fields.title,
  slug: z.string().trim().max(200).optional(),
  excerpt: fields.excerpt.trim().min(1, "Informe um resumo."),
  description: fields.description.default(""),
  project_type: fields.project_type.default("case"),
  featured: fields.featured.default(false),
  sort_order: fields.sort_order.optional(),
  client_name: fields.client_name.default(""),
  brand_name: fields.brand_name.default(""),
  contribution: fields.contribution.default(""),
  external_url: fields.external_url.default(""),
  demo_url: fields.demo_url.default(""),
  project_date: fields.project_date.default(null),
  seo_title: fields.seo_title.default(""),
  seo_description: fields.seo_description.default(""),
  product_name: fields.product_name.default(""),
  authorship: fields.authorship.default(""),
  categories: names,
  technologies: names,
});

const content = contentSchema.omit({
  alt: true,
  media_ids: true,
  desktop_ids: true,
  mobile_ids: true,
});
const layout = { width: true, align: true, spacing: true } as const;
const requiredText = content.shape.text
  .unwrap()
  .trim()
  .min(1, "Informe o texto do bloco.");
const items = z
  .array(
    z
      .object({
        title: z.string().trim().min(1, "Informe o título do item.").max(2000),
        text: z.string().max(10000).default(""),
      })
      .strict(),
  )
  .min(1, "Adicione ao menos um item ao bloco.")
  .max(200);

const textBlock = content
  .pick({ ...layout, title: true })
  .extend({ text: requiredText });
const heading = content.pick(layout).extend({ text: requiredText });
const media = content.pick({ ...layout, title: true, caption: true });
const listBlock = content.pick({ ...layout, title: true }).extend({ items });
const link = content.pick({ ...layout, title: true, label: true }).extend({
  url: content.shape.url.unwrap().refine(Boolean, "Informe a URL do bloco."),
});
const blockContent = {
  heading,
  subheading: heading,
  paragraph: textBlock,
  rich_text: textBlock,
  image: media,
  gallery: media,
  image_grid: media.extend({ columns: content.shape.columns }),
  comparison: media.extend({
    label: content.shape.label,
    after_label: content.shape.after_label,
  }),
  banner: media,
  video: link.extend({ caption: content.shape.caption }),
  embed: link,
  features: listBlock,
  technologies: listBlock,
  specs: listBlock,
  faq: listBlock,
  process: listBlock,
  code: textBlock.extend({ language: content.shape.language }),
  link,
  metric: textBlock.extend({ title: requiredText }),
  divider: content.pick(layout),
  spacer: content.pick({ spacing: true }),
  pdp: media,
} satisfies Record<BlockType, z.ZodType>;

const draftInput = z.strictObject({
  version: z.literal(1),
  project: draftFields,
  blocks: z
    .array(
      z.strictObject({
        block_type: z.enum(blockTypes),
        content: z.unknown(),
      }),
    )
    .max(200),
});

const mediaBlocks = new Set<BlockType>([
  "image",
  "gallery",
  "image_grid",
  "comparison",
  "banner",
  "pdp",
]);
export const draftInputLimit = 250_000;

type DraftTaxonomy = Pick<SiteData, "categories" | "technologies">;

function readJson(text: string) {
  const input = text.trim();
  try {
    return JSON.parse(input) as unknown;
  } catch {
    const fences = [
      ...input.matchAll(
        /^[ \t]*```(?:json)?[ \t]*\r?\n([\s\S]*?)\r?\n[ \t]*```[ \t]*$/gim,
      ),
    ];
    if (fences.length !== 1) throw new Error("Esperado um bloco JSON.");
    return JSON.parse(fences[0][1]) as unknown;
  }
}

function matchNames(
  requested: string[],
  available: { id: string; name: string; slug: string }[],
) {
  const ids = new Set<string>();
  const unmatched = new Set<string>();
  for (const name of requested) {
    const normalized = slugify(name);
    const matches = available.filter(
      (item) => item.slug === normalized || slugify(item.name) === normalized,
    );
    if (matches.length === 1) ids.add(matches[0].id);
    else unmatched.add(name);
  }
  return { ids: [...ids], unmatched: [...unmatched] };
}

const fieldLabels: Record<string, string> = {
  project: "Projeto",
  title: "Título",
  slug: "Endereço (slug)",
  excerpt: "Resumo",
  description: "Descrição / contexto",
  project_type: "Tipo de projeto",
  project_date: "Data de realização",
  external_url: "Link do projeto",
  demo_url: "Link da demonstração",
  seo_title: "Título SEO",
  seo_description: "Descrição SEO",
  categories: "Categorias",
  technologies: "Tecnologias",
  blocks: "Blocos",
  block_type: "Tipo de bloco",
  text: "Texto",
  items: "Itens",
  url: "URL",
};

function explainErrors(error: z.ZodError, prefix?: string) {
  return error.issues.map((issue) => {
    const path = issue.path
      .map((part) =>
        typeof part === "number"
          ? part + 1
          : fieldLabels[String(part)] || String(part),
      )
      .join(" → ");
    let message = issue.message;
    if (issue.code === "unrecognized_keys")
      message = `Remova os campos que não fazem parte do prompt: ${issue.keys.join(", ")}.`;
    if (issue.code === "invalid_type")
      message =
        "Campo ausente ou em formato incorreto. Confira o modelo do prompt.";
    if (issue.code === "invalid_value")
      message = `Use uma das opções do prompt: ${issue.values.join(", ")}.`;
    return [prefix, path, message].filter(Boolean).join(" · ");
  });
}

export type DraftImport = {
  project: Project;
  unmatchedCategories: string[];
  unmatchedTechnologies: string[];
  blocksWaitingForImages: number;
};

export function prepareProjectDraft(
  text: string,
  base: Project,
  taxonomy: DraftTaxonomy,
): { data: DraftImport; errors?: never } | { errors: string[]; data?: never } {
  if (text.length > draftInputLimit)
    return {
      errors: ["A resposta é grande demais. Peça ao ChatGPT para encurtá-la."],
    };

  let value: unknown;
  try {
    value = readJson(text);
  } catch {
    return {
      errors: [
        "Cole a resposta completa do ChatGPT com um único bloco JSON válido.",
      ],
    };
  }

  const parsed = draftInput.safeParse(value);
  if (!parsed.success) return { errors: explainErrors(parsed.error) };

  const errors: string[] = [];
  const blocks: Project["blocks"] = [];
  for (const [index, block] of parsed.data.blocks.entries()) {
    const parsedContent = blockContent[block.block_type].safeParse(
      block.content,
    );
    if (parsedContent.success) {
      blocks.push({
        id: crypto.randomUUID(),
        block_type: block.block_type,
        content: parsedContent.data,
        sort_order: index,
      });
    } else {
      errors.push(
        ...explainErrors(
          parsedContent.error,
          `Bloco ${index + 1} (${blockLabels[block.block_type]})`,
        ),
      );
    }
  }
  if (errors.length) return { errors };

  const { slug, categories, technologies, ...incoming } = parsed.data.project;
  const matchedCategories = matchNames(categories, taxonomy.categories);
  const matchedTechnologies = matchNames(technologies, taxonomy.technologies);
  const project = projectSchema.safeParse({
    ...base,
    ...incoming,
    slug: slugify(slug || incoming.title),
    sort_order: incoming.sort_order ?? base.sort_order,
    status: "draft",
    cover_media_id: null,
    category_ids: matchedCategories.ids,
    technology_ids: matchedTechnologies.ids,
    blocks,
  });
  if (!project.success) return { errors: explainErrors(project.error) };

  return {
    data: {
      project: project.data,
      unmatchedCategories: matchedCategories.unmatched,
      unmatchedTechnologies: matchedTechnologies.unmatched,
      blocksWaitingForImages: blocks.filter((block) =>
        mediaBlocks.has(block.block_type),
      ).length,
    },
  };
}
