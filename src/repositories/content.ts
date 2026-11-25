import { db } from "../lib/supabase";
import { projectSchema } from "../lib/validation";
import type {
  Block,
  Category,
  MediaAsset,
  Profile,
  Project,
  Service,
  Settings,
  SiteData,
  Technology,
} from "../types/content";
import { defaultProfile, defaultSettings } from "../config/defaults";

function check<T>({
  data,
  error,
}: {
  data: T;
  error: unknown;
}): NonNullable<T> {
  if (error) throw error;
  return data as NonNullable<T>;
}
export async function pagedRows<T>(
  load: (
    start: number,
    end: number,
  ) => PromiseLike<{ data: unknown[] | null; error: unknown }>,
): Promise<T[]> {
  const rows: T[] = [];
  for (let start = 0; ; start += 250) {
    const batch = check(await load(start, start + 249)) as T[];
    rows.push(...batch);
    if (batch.length < 250) return rows;
  }
}
type RawProject = Omit<
  Project,
  "blocks" | "category_ids" | "technology_ids"
> & {
  project_categories: { category_id: string }[];
  project_technologies: { technology_id: string }[];
};
export async function getSiteData(): Promise<SiteData> {
  const client = db();
  const [profile, settings, categories, technologies, services] =
    await Promise.all([
      client.from("public_profile").select("*").eq("id", 1).single(),
      client.from("site_settings").select("*").eq("id", 1).single(),
      client.from("categories").select("*").order("sort_order"),
      client.from("technologies").select("*").order("name"),
      client.from("services").select("*").order("sort_order"),
    ]);
  return {
    profile: (check(profile) || defaultProfile) as Profile,
    settings: (check(settings) || defaultSettings) as Settings,
    categories: check(categories) as Category[],
    technologies: check(technologies) as Technology[],
    services: check(services) as Service[],
  };
}
export async function listProjects(admin = false): Promise<Project[]> {
  const rows = await pagedRows<RawProject>((start, end) => {
    let query = db()
      .from("projects")
      .select(
        "*, project_categories(category_id), project_technologies(technology_id)",
      )
      .order("sort_order")
      .order("created_at", { ascending: false })
      .order("id")
      .range(start, end);
    if (!admin) query = query.eq("status", "published");
    return query;
  });
  return rows.map((row) => ({
    ...row,
    blocks: [],
    category_ids: row.project_categories.map(
      (x: { category_id: string }) => x.category_id,
    ),
    technology_ids: row.project_technologies.map(
      (x: { technology_id: string }) => x.technology_id,
    ),
  }));
}
export async function getProject(
  slugOrId: string,
  admin = false,
): Promise<Project | null> {
  let query = db()
    .from("projects")
    .select(
      "*, project_categories(category_id), project_technologies(technology_id)",
    )
    .eq(admin ? "id" : "slug", slugOrId);
  if (!admin) query = query.eq("status", "published");
  const row = check(await query.maybeSingle()) as RawProject | null;
  if (!row) return null;
  const blocks = check(
    await db()
      .from("project_blocks")
      .select("id, block_type, content, sort_order")
      .eq("project_id", row.id)
      .order("sort_order"),
  ) as Block[];
  return {
    ...row,
    blocks,
    category_ids: row.project_categories.map(
      (x: { category_id: string }) => x.category_id,
    ),
    technology_ids: row.project_technologies.map(
      (x: { technology_id: string }) => x.technology_id,
    ),
  } as Project;
}
export async function saveProject(project: Project): Promise<Project> {
  const parsed = projectSchema.parse(project);
  const updatedAt = check(
    await db().rpc("save_project", {
      payload: parsed,
      expected_updated_at: project.updated_at || null,
    }),
  ) as string;
  return { ...parsed, updated_at: updatedAt };
}
export async function changeStatus(
  project: Project,
  status: Project["status"],
) {
  const full = await getProject(project.id, true);
  if (!full) throw new Error("Projeto não encontrado.");
  return saveProject({ ...full, status });
}
export async function duplicateProject(project: Project) {
  const full = await getProject(project.id, true);
  if (!full) throw new Error("Projeto não encontrado.");
  const newId = crypto.randomUUID();
  return saveProject({
    ...full,
    id: newId,
    title: `${full.title.slice(0, 172)} (cópia)`,
    slug: `${full.slug.slice(0, 180).replace(/-$/, "")}-copia-${newId.slice(0, 6)}`,
    status: "draft",
    featured: false,
    updated_at: "",
    published_at: null,
    blocks: full.blocks.map((b) => ({ ...b, id: crypto.randomUUID() })),
  });
}
export async function deleteProject(id: string) {
  check(await db().from("projects").delete().eq("id", id));
}
export async function reorderProjects(ids: string[]) {
  check(await db().rpc("reorder_projects", { ordered_ids: ids }));
}
export async function listMedia(): Promise<MediaAsset[]> {
  return pagedRows<MediaAsset>((start, end) =>
    db()
      .from("media_assets")
      .select("*")
      .order("created_at", { ascending: false })
      .order("id")
      .range(start, end),
  );
}
export async function getMedia(ids: string[]): Promise<MediaAsset[]> {
  if (!ids.length) return [];
  return check(
    await db().from("media_assets").select("*").in("id", ids),
  ) as MediaAsset[];
}
export async function signedMedia(path: string): Promise<string> {
  return check(
    await db().storage.from("portfolio-media").createSignedUrl(path, 120),
  ).signedUrl;
}
export async function updateRecord<T extends { id: string | number }>(
  table:
    | "categories"
    | "technologies"
    | "services"
    | "public_profile"
    | "site_settings"
    | "media_assets"
    | "admin_settings",
  value: T,
) {
  check(
    await (table === "media_assets"
      ? db().from(table).update(value).eq("id", value.id)
      : db().from(table).upsert(value)),
  );
}
export async function removeRecord(
  table: "categories" | "technologies" | "services",
  id: string,
) {
  check(await db().from(table).delete().eq("id", id));
}
export async function mediaUsage(id: string) {
  const refs = check(
    await db()
      .from("project_media")
      .select("project_id, projects(title)")
      .eq("media_id", id),
  );
  const [profile, settings] = await Promise.all([
    db().from("public_profile").select("id").eq("photo_media_id", id),
    db().from("site_settings").select("id").eq("share_media_id", id),
  ]);
  check(profile);
  check(settings);
  return {
    projects: refs,
    publicUse: !!profile.data?.length || !!settings.data?.length,
    count:
      refs.length + (profile.data?.length || 0) + (settings.data?.length || 0),
  };
}
export async function getAutosavePreference(): Promise<boolean> {
  return check(
    await db().from("admin_settings").select("autosave").eq("id", 1).single(),
  ).autosave;
}
