// @vitest-environment node
// Opt-in: executa chamadas HTTP reais APENAS em um Supabase LOCAL descartável.
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { loadEnv } from "vite";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
const env = { ...loadEnv("security", process.cwd(), ""), ...process.env };
const enabled =
  env.TEST_ALLOW_LOCAL_MUTATIONS === "YES" &&
  !!env.TEST_SUPABASE_URL &&
  !!env.TEST_SUPABASE_KEY;
const url = env.TEST_SUPABASE_URL || "";
if (enabled && !/^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(url))
  throw new Error(
    "Suíte HTTP permite somente Supabase local. Produção e endpoints remotos são bloqueados.",
  );
const suite = enabled ? describe : describe.skip;
const pid = crypto.randomUUID();
const mid = crypto.randomUUID();
const cid = crypto.randomUUID();
const path = `images/${mid}/original.png`;
let owner: SupabaseClient;
let ordinary: SupabaseClient;
let visitor: SupabaseClient;
let stamp: string;
function project(status = "draft") {
  return {
    id: pid,
    title: "Teste HTTP descartável",
    slug: `http-${pid}`,
    excerpt: "Conteúdo exclusivo de testes.",
    description: "",
    project_type: "case",
    cover_media_id: mid,
    status,
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
    product_name: "",
    authorship: "",
    blocks: [
      {
        id: crypto.randomUUID(),
        block_type: "paragraph",
        content: { text: "Bloco HTTP" },
        sort_order: 0,
      },
    ],
    category_ids: [cid],
    technology_ids: [],
  };
}
suite("Auth, REST e Storage REAIS em Supabase local", () => {
  beforeAll(async () => {
    for (const key of [
      "TEST_ADMIN_EMAIL",
      "TEST_ADMIN_PASSWORD",
      "TEST_USER_EMAIL",
      "TEST_USER_PASSWORD",
    ])
      if (!env[key]) throw new Error(`Configure ${key} em .env.security`);
    const client = () =>
      createClient(url, env.TEST_SUPABASE_KEY!, {
        auth: { persistSession: false, autoRefreshToken: false },
      });
    owner = client();
    ordinary = client();
    visitor = client();
    const a = await owner.auth.signInWithPassword({
      email: env.TEST_ADMIN_EMAIL!,
      password: env.TEST_ADMIN_PASSWORD!,
    });
    if (a.error) throw a.error;
    const u = await ordinary.auth.signInWithPassword({
      email: env.TEST_USER_EMAIL!,
      password: env.TEST_USER_PASSWORD!,
    });
    if (u.error) throw u.error;
    expect((await owner.rpc("is_admin")).data).toBe(true);
    expect((await ordinary.rpc("is_admin")).data).toBe(false);
    const image = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9Zl1sAAAAASUVORK5CYII=",
      "base64",
    );
    const uploaded = await owner.storage
      .from("portfolio-media")
      .upload(path, image, { contentType: "image/png" });
    if (uploaded.error) throw uploaded.error;
    const metadata = await owner
      .from("media_assets")
      .insert({
        id: mid,
        storage_path: path,
        file_name: "http.png",
        mime_type: "image/png",
        size: image.length,
        width: 1,
        height: 1,
        alt_text: "Imagem de teste",
      });
    if (metadata.error) throw metadata.error;
    const category = await owner
      .from("categories")
      .insert({
        id: cid,
        name: "Teste HTTP",
        slug: `http-${cid}`,
        description: "",
        sort_order: 0,
      });
    if (category.error) throw category.error;
    const saved = await owner.rpc("save_project", {
      payload: project(),
      expected_updated_at: null,
    });
    if (saved.error) throw saved.error;
    stamp = saved.data as string;
  });
  afterAll(async () => {
    if (owner) {
      await owner.from("projects").delete().eq("id", pid);
      await owner.rpc("prepare_media_delete", { asset_id: mid });
      await owner.storage.from("portfolio-media").remove([path]);
      await owner.from("media_assets").delete().eq("id", mid);
      await owner.from("categories").delete().eq("id", cid);
      await owner.auth.signOut();
    }
    if (ordinary) await ordinary.auth.signOut();
  });
  it("anon não insere, altera, exclui ou lê rascunho e não assina mídia privada", async () => {
    expect(
      (
        await visitor
          .from("projects")
          .insert({ title: "Ataque", slug: `ataque-${pid}` })
      ).error,
    ).toBeTruthy();
    const changed = await visitor
      .from("projects")
      .update({ title: "Ataque" })
      .eq("id", pid)
      .select("id");
    expect(changed.error || !changed.data?.length).toBeTruthy();
    const deleted = await visitor
      .from("projects")
      .delete()
      .eq("id", pid)
      .select("id");
    expect(deleted.error || !deleted.data?.length).toBeTruthy();
    expect(
      (await visitor.from("projects").select("id").eq("id", pid)).data,
    ).toEqual([]);
    expect(
      (await visitor.storage.from("portfolio-media").createSignedUrl(path, 120))
        .error,
    ).toBeTruthy();
  });
  it("usuário comum não altera conteúdo ou se promove com metadados", async () => {
    expect(
      (
        await ordinary.rpc("save_project", {
          payload: project(),
          expected_updated_at: stamp,
        })
      ).error,
    ).toBeTruthy();
    expect(
      (
        await ordinary
          .from("categories")
          .insert({ name: "Ataque", slug: `ataque-${cid}` })
      ).error,
    ).toBeTruthy();
    await ordinary.auth.updateUser({ data: { admin: true, role: "admin" } });
    expect((await ordinary.rpc("is_admin")).data).toBe(false);
    expect(
      (
        await ordinary
          .from("admin_users")
          .insert({ user_id: (await ordinary.auth.getUser()).data.user!.id })
      ).error,
    ).toBeTruthy();
    await ordinary.auth.updateUser({ data: { admin: null, role: null } });
  });
  it("owner publica, visitante lê e assina; despublicar revoga novas assinaturas", async () => {
    const published = await owner.rpc("save_project", {
      payload: project("published"),
      expected_updated_at: stamp,
    });
    expect(published.error).toBeNull();
    stamp = published.data as string;
    expect(
      (await visitor.from("projects").select("id").eq("id", pid)).data,
    ).toHaveLength(1);
    expect(
      (await visitor.storage.from("portfolio-media").createSignedUrl(path, 120))
        .data?.signedUrl,
    ).toBeTruthy();
    const hidden = await owner.rpc("save_project", {
      payload: project(),
      expected_updated_at: stamp,
    });
    expect(hidden.error).toBeNull();
    stamp = hidden.data as string;
    expect(
      (await visitor.from("projects").select("id").eq("id", pid)).data,
    ).toEqual([]);
    expect(
      (await visitor.storage.from("portfolio-media").createSignedUrl(path, 120))
        .error,
    ).toBeTruthy();
  });
});
