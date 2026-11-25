// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { readFileSync, readdirSync } from "node:fs";
import type { Project } from "../src/types/content";
const admin = "10000000-0000-4000-8000-000000000001";
const ordinary = "10000000-0000-4000-8000-000000000002";
let pg: PGlite;
async function role<T>(
  name: "anon" | "authenticated",
  user: string,
  action: () => Promise<T>,
  aal = "aal1",
) {
  await pg.exec(`set role ${name}`);
  await pg.query(
    "select set_config('request.jwt.claim.sub',$1,false),set_config('request.jwt.claims',$2,false)",
    [user, JSON.stringify({ sub: user, aal })],
  );
  try {
    return await action();
  } finally {
    await pg.exec("reset role");
  }
}
function draft(): Project {
  const id = crypto.randomUUID();
  return {
    id,
    title: "Segurança verificável",
    slug: `teste-${id}`,
    excerpt: "Conteúdo real de teste.",
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
async function save(p: Project, expected: string | null = null) {
  const { rows } = await pg.query<{ stamp: string }>(
    "select public.save_project($1::jsonb,$2::timestamptz)::text as stamp",
    [JSON.stringify(p), expected],
  );
  return rows[0].stamp;
}
async function createMedia() {
  const id = crypto.randomUUID();
  const path = `images/${id}/original.webp`;
  await pg.query(
    "insert into storage.objects(bucket_id,name) values('portfolio-media',$1)",
    [path],
  );
  await pg.query(
    "insert into public.media_assets(id,storage_path,file_name,mime_type,size,width,height) values($1,$2,'teste.webp','image/webp',5000,100,100)",
    [id, path],
  );
  return { id, path };
}
beforeAll(async () => {
  pg = new PGlite();
  await pg.exec(`
    create role anon nologin; create role authenticated nologin;
    create schema auth; create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    create function auth.jwt() returns jsonb language sql stable as $$ select coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb $$;
    create schema storage; create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
    create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text references storage.buckets(id),name text);
    alter table storage.objects enable row level security;
    grant usage on schema public,auth,storage to anon,authenticated;
    grant select on storage.objects to anon; grant select,insert,update,delete on storage.objects to authenticated;
    insert into auth.users values('${admin}'),('${ordinary}');
  `);
  for (const file of readdirSync("supabase/migrations").sort())
    await pg.exec(readFileSync(`supabase/migrations/${file}`, "utf8"));
  await pg.query("insert into private.admin_users(user_id) values($1)", [
    admin,
  ]);
}, 60000);
afterAll(async () => {
  await pg?.close();
});
describe("RLS real no PostgreSQL (Auth/Storage representados por schemas de teste)", () => {
  it("todas as tabelas de conteúdo e administradores possuem RLS", async () => {
    const result = await pg.query<{ relname: string }>(
      "select relname from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname in ('public','private') and c.relkind='r' and not c.relrowsecurity",
    );
    expect(result.rows).toEqual([]);
  });
  it("visitantes não inserem, atualizam nem excluem conteúdo", async () => {
    await role("anon", "", async () => {
      await expect(
        pg.exec(
          "insert into public.categories(name,slug) values('Ataque','ataque')",
        ),
      ).rejects.toThrow();
      await expect(
        pg.exec("update public.public_profile set name='Ataque'"),
      ).rejects.toThrow();
      await expect(pg.exec("delete from public.projects")).rejects.toThrow();
    });
  });
  it("não administradores não escrevem via tabela ou RPC e não leem configurações privadas", async () => {
    await role("authenticated", ordinary, async () => {
      await expect(
        pg.exec(
          "insert into public.categories(name,slug) values('Ataque','ataque')",
        ),
      ).rejects.toThrow();
      const changed = await pg.query(
        "update public.public_profile set name='Ataque' returning id",
      );
      expect(changed.rows).toEqual([]);
      const deleted = await pg.query(
        "delete from public.projects returning id",
      );
      expect(deleted.rows).toEqual([]);
      expect(
        (await pg.query("select * from public.admin_settings")).rows,
      ).toEqual([]);
      await expect(save(draft())).rejects.toThrow();
    });
  });
  it("usuários comuns não se promovem, mesmo com UUID conhecido", async () => {
    await role("authenticated", ordinary, async () => {
      await expect(
        pg.query("insert into private.admin_users(user_id) values($1)", [
          ordinary,
        ]),
      ).rejects.toThrow();
      await expect(
        pg.exec("select * from private.admin_users"),
      ).rejects.toThrow();
      expect(
        (
          await pg.query<{ allowed: boolean }>(
            "select public.is_admin() as allowed",
          )
        ).rows[0].allowed,
      ).toBe(false);
    });
  });
  it("admin cria e edita rascunho; anon e usuário comum não o veem", async () => {
    const p = draft();
    const stamp = await role("authenticated", admin, () => save(p));
    await role("authenticated", admin, () =>
      save({ ...p, title: "Título atualizado" }, stamp),
    );
    for (const [r, sub] of [
      ["anon", ""],
      ["authenticated", ordinary],
    ] as const)
      await role(r, sub, async () =>
        expect(
          (await pg.query("select * from public.projects where id=$1", [p.id]))
            .rows,
        ).toEqual([]),
      );
  });
  it("valida mídia, publica, expõe somente referências autorizadas e revoga ao despublicar", async () => {
    const category = (
      await pg.query<{ id: string }>("select id from public.categories limit 1")
    ).rows[0].id;
    const cover = await createMedia();
    const secret = await createMedia();
    const p = {
      ...draft(),
      status: "published" as const,
      cover_media_id: cover.id,
      category_ids: [category],
      blocks: [
        {
          id: crypto.randomUUID(),
          block_type: "paragraph" as const,
          content: { text: "Bloco público" },
          sort_order: 0,
        },
      ],
    };
    const stamp = await role("authenticated", admin, () => save(p));
    await role("anon", "", async () => {
      expect(
        (await pg.query("select id from public.projects where id=$1", [p.id]))
          .rows,
      ).toHaveLength(1);
      expect(
        (
          await pg.query(
            "select id from public.project_blocks where project_id=$1",
            [p.id],
          )
        ).rows,
      ).toHaveLength(1);
      expect(
        (
          await pg.query("select id from storage.objects where name=$1", [
            cover.path,
          ])
        ).rows,
      ).toHaveLength(1);
      expect(
        (
          await pg.query("select id from storage.objects where name=$1", [
            secret.path,
          ])
        ).rows,
      ).toHaveLength(0);
      expect(
        (
          await pg.query("select id from public.media_assets where id=$1", [
            secret.id,
          ])
        ).rows,
      ).toHaveLength(0);
    });
    await role("authenticated", admin, () =>
      save({ ...p, status: "draft" }, stamp),
    );
    await role("anon", "", async () => {
      expect(
        (
          await pg.query("select id from storage.objects where name=$1", [
            cover.path,
          ])
        ).rows,
      ).toHaveLength(0);
      expect(
        (
          await pg.query(
            "select id from public.project_blocks where project_id=$1",
            [p.id],
          )
        ).rows,
      ).toHaveLength(0);
    });
  });
  it("falha transacional não deixa projeto ou blocos parcialmente gravados", async () => {
    const p = draft();
    const stamp = await role("authenticated", admin, () => save(p));
    const invalid = {
      ...p,
      title: "Não deve persistir",
      blocks: [
        {
          id: crypto.randomUUID(),
          block_type: "unknown",
          content: {},
          sort_order: 0,
        },
      ],
    };
    await role("authenticated", admin, async () => {
      await expect(save(invalid as Project, stamp)).rejects.toThrow();
      const row = await pg.query<{ title: string }>(
        "select title from public.projects where id=$1",
        [p.id],
      );
      expect(row.rows[0].title).toBe(p.title);
    });
  });
  it("detecta conflito de atualização entre abas", async () => {
    const p = draft();
    const stamp = await role("authenticated", admin, () => save(p));
    await role("authenticated", admin, () =>
      save({ ...p, title: "Outra aba" }, stamp),
    );
    await role("authenticated", admin, async () => {
      await expect(
        save({ ...p, title: "Edição antiga" }, stamp),
      ).rejects.toThrow("Stale edit");
    });
  });
  it("bloqueia exclusão de imagem vinculada e permite limpar imagem livre", async () => {
    const media = await createMedia();
    const p = { ...draft(), cover_media_id: media.id };
    await role("authenticated", admin, () => save(p));
    await role("authenticated", admin, async () => {
      await expect(
        pg.query("select public.prepare_media_delete($1)", [media.id]),
      ).rejects.toThrow();
      expect(
        (
          await pg.query(
            "delete from storage.objects where name=$1 returning id",
            [media.path],
          )
        ).rows,
      ).toHaveLength(0);
      await pg.query("delete from public.projects where id=$1", [p.id]);
      await pg.query("select public.prepare_media_delete($1)", [media.id]);
      expect(
        (
          await pg.query(
            "delete from storage.objects where name=$1 returning id",
            [media.path],
          )
        ).rows,
      ).toHaveLength(1);
      await pg.query("delete from public.media_assets where id=$1", [media.id]);
    });
  });
  it("MFA obrigatório é aplicado pelo banco, não por um botão", async () => {
    await pg.query(
      "update private.admin_users set require_mfa=true where user_id=$1",
      [admin],
    );
    await role("authenticated", admin, async () => {
      expect(
        (
          await pg.query<{ allowed: boolean }>(
            "select public.is_admin() as allowed",
          )
        ).rows[0].allowed,
      ).toBe(false);
      await expect(save(draft())).rejects.toThrow();
    });
    await role(
      "authenticated",
      admin,
      async () => {
        expect(
          (
            await pg.query<{ allowed: boolean }>(
              "select public.is_admin() as allowed",
            )
          ).rows[0].allowed,
        ).toBe(true);
        await save(draft());
      },
      "aal2",
    );
    await pg.query(
      "update private.admin_users set require_mfa=false where user_id=$1",
      [admin],
    );
  });
  it("também rejeita URLs perigosas em requisições diretas ao banco", async () => {
    await role("authenticated", admin, async () => {
      await expect(
        save({ ...draft(), demo_url: "javascript:alert(1)" }),
      ).rejects.toThrow();
    });
  });
  it("reordena projetos atomicamente somente com autorização", async () => {
    const a = draft();
    const b = draft();
    await role("authenticated", admin, async () => {
      await save(a);
      await save(b);
      await pg.query("select public.reorder_projects($1::uuid[])", [
        [b.id, a.id],
      ]);
      const rows = await pg.query<{ id: string }>(
        "select id from public.projects where id=any($1::uuid[]) order by sort_order",
        [[a.id, b.id]],
      );
      expect(rows.rows.map((r) => r.id)).toEqual([b.id, a.id]);
    });
    await role("authenticated", ordinary, async () => {
      await expect(
        pg.query("select public.reorder_projects($1::uuid[])", [[a.id, b.id]]),
      ).rejects.toThrow();
    });
  });
  it("importa perfil/blocos em transação e reverte alterações se um item falhar", async () => {
    const profile = (
      await pg.query<Record<string, unknown>>(
        "select * from public.public_profile where id=1",
      )
    ).rows[0];
    const settings = (
      await pg.query("select * from public.site_settings where id=1")
    ).rows[0];
    const serviceId = crypto.randomUUID();
    const payload = {
      version: 1,
      categories: [],
      technologies: [],
      media: [],
      services: [
        {
          id: serviceId,
          title: "Serviço importado",
          description: "",
          icon: "code",
          price: "",
          active: true,
          sort_order: 0,
        },
      ],
      projects: [],
      profile: { ...profile, author_note: "Nota editável importada." },
      settings,
    };
    await role("authenticated", admin, async () => {
      await pg.query("select public.import_content($1::jsonb)", [
        JSON.stringify(payload),
      ]);
      expect(
        (
          await pg.query<{ author_note: string }>(
            "select author_note from public.public_profile where id=1",
          )
        ).rows[0].author_note,
      ).toBe("Nota editável importada.");
      const invalid = {
        ...payload,
        services: [{ ...payload.services[0], title: "Não deve persistir" }],
        projects: [{ ...draft(), demo_url: "javascript:alert(1)" }],
      };
      await expect(
        pg.query("select public.import_content($1::jsonb)", [
          JSON.stringify(invalid),
        ]),
      ).rejects.toThrow();
      expect(
        (
          await pg.query<{ title: string }>(
            "select title from public.services where id=$1",
            [serviceId],
          )
        ).rows[0].title,
      ).toBe("Serviço importado");
    });
    await role("authenticated", ordinary, async () => {
      await expect(
        pg.query("select public.import_content($1::jsonb)", [
          JSON.stringify(payload),
        ]),
      ).rejects.toThrow();
    });
  });
});
