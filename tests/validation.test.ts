import { describe, expect, it } from "vitest";
import {
  mediaReferences,
  moveItem,
  projectSchema,
  safeUrl,
  slugify,
} from "../src/lib/validation";
import type { Project } from "../src/types/content";
export function fixture(): Project {
  return {
    id: crypto.randomUUID(),
    title: "Projeto real",
    slug: "projeto-real",
    excerpt: "Conteúdo do projeto.",
    description: "",
    project_type: "case",
    cover_media_id: null,
    status: "draft",
    featured: false,
    sort_order: 0,
    client_name: "",
    brand_name: "",
    contribution: "",
    external_url: "",
    demo_url: "",
    project_date: null,
    seo_title: "",
    seo_description: "",
    created_at: "",
    updated_at: "",
    published_at: null,
    product_name: "",
    authorship: "",
    blocks: [],
    category_ids: [],
    technology_ids: [],
  };
}
describe("Validação de conteúdo", () => {
  it.each([
    "javascript:alert(1)",
    "data:text/html,hi",
    "http://example.com",
    "//example.com",
    "https://user:password@example.com",
    "https://example.com\n.evil.com",
  ])("rejeita endereço inseguro: %s", (url) =>
    expect(safeUrl(url)).toBeUndefined(),
  );
  it("permite somente os canais diretos previstos", () => {
    expect(safeUrl("mailto:owner@example.com", true)).toBeTruthy();
    expect(safeUrl("tel:+5511999999999", true)).toBeTruthy();
    expect(safeUrl("mailto:owner@example.com")).toBeUndefined();
  });
  it("gera slugs sem acentos e sem segmentos de caminho", () =>
    expect(slugify("PDPs & Automação / IA!")).toBe("pdps-automacao-ia"));
  it("exige capa e categoria na publicação mas permite rascunhos", () => {
    const p = fixture();
    expect(projectSchema.safeParse(p).success).toBe(true);
    expect(projectSchema.safeParse({ ...p, status: "published" }).success).toBe(
      false,
    );
    expect(
      projectSchema.safeParse({
        ...p,
        status: "published",
        cover_media_id: crypto.randomUUID(),
        category_ids: [crypto.randomUUID()],
      }).success,
    ).toBe(true);
  });
  it("rejeita comparadores incompletos na publicação", () => {
    const p = {
      ...fixture(),
      status: "published",
      cover_media_id: crypto.randomUUID(),
      category_ids: [crypto.randomUUID()],
      blocks: [
        {
          id: crypto.randomUUID(),
          block_type: "comparison",
          content: { media_ids: [crypto.randomUUID()] },
          sort_order: 0,
        },
      ],
    };
    expect(projectSchema.safeParse(p).success).toBe(false);
  });
  it("preserva a lista e trata limites de ordenação", () => {
    const list = ["a", "b", "c"];
    expect(moveItem(list, 2, 0)).toEqual(["c", "a", "b"]);
    expect(list).toEqual(["a", "b", "c"]);
    expect(moveItem(list, 0, -1)).toEqual(list);
  });
  it("coleta capas, galerias e capturas PDP sem duplicar referências", () => {
    const id = crypto.randomUUID();
    const other = crypto.randomUUID();
    const p = fixture();
    p.cover_media_id = id;
    p.blocks = [
      {
        id: crypto.randomUUID(),
        block_type: "pdp",
        content: { desktop_ids: [id], mobile_ids: [other] },
        sort_order: 0,
      },
    ];
    expect(mediaReferences(p)).toEqual([id, other]);
  });
});
