import { z } from "zod";
import { db } from "../lib/supabase";
import { projectSchema, safeUrl } from "../lib/validation";
import {
  getSiteData,
  listMedia,
  listProjects,
  pagedRows,
} from "../repositories/content";
import type { Backup, Block } from "../types/content";
const uuid = z.uuid();
const text = z.string();
const order = z.number().int();
export const backupSchema = z.object({
  version: z.literal(1),
  exported_at: z.iso.datetime({ offset: true }),
  projects: z.array(projectSchema).max(5000),
  categories: z.array(
    z.object({
      id: uuid,
      name: text.min(1).max(120),
      slug: text.regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
      description: text,
      sort_order: order,
    }),
  ),
  technologies: z.array(
    z.object({
      id: uuid,
      name: text.min(1).max(100),
      slug: text.regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
      icon: text.nullable(),
    }),
  ),
  services: z.array(
    z.object({
      id: uuid,
      title: text.min(1).max(180),
      description: text,
      icon: text,
      price: text,
      active: z.boolean(),
      sort_order: order,
    }),
  ),
  media: z.array(
    z.object({
      id: uuid,
      storage_path: text.regex(
        /^images\/[a-f0-9-]{36}\/original\.(jpg|png|webp|avif)$/,
      ),
      thumbnail_path: text
        .regex(/^images\/[a-f0-9-]{36}\/thumb\.webp$/)
        .nullable(),
      file_name: text.min(1).max(255),
      mime_type: z.enum([
        "image/jpeg",
        "image/png",
        "image/webp",
        "image/avif",
      ]),
      size: z.number().int().positive().max(30000000),
      width: z.number().int().positive(),
      height: z.number().int().positive(),
      alt_text: text,
      caption: text,
      tag: text,
      created_at: text,
    }),
  ),
  profile: z.object({
    id: z.literal(1),
    name: text.min(1),
    full_name: text.min(1),
    role: text,
    bio: text,
    author_note: text,
    photo_media_id: uuid.nullable(),
    contacts: z
      .array(
        z.object({
          label: text.min(1),
          url: text.refine((v) => !!safeUrl(v, true)),
        }),
      )
      .max(20),
  }),
  settings: z.object({
    id: z.literal(1),
    hero_title: text.min(1),
    hero_description: text,
    available: z.boolean(),
    availability_text: text,
    contact_title: text,
    contact_description: text,
    accent: z.enum(["blue", "violet", "teal"]),
    sections: z
      .array(
        z.object({
          id: z.enum(["projects", "services", "about", "contact"]),
          visible: z.boolean(),
        }),
      )
      .length(4)
      .refine((s) => new Set(s.map((x) => x.id)).size === 4),
    share_media_id: uuid.nullable(),
    institutional_text: text,
  }),
});
export async function exportBackup(): Promise<Backup> {
  const [site, media, projects, blocks] = await Promise.all([
    getSiteData(),
    listMedia(),
    listProjects(true),
    pagedRows<Block & { project_id: string }>((start, end) =>
      db()
        .from("project_blocks")
        .select("*")
        .order("project_id")
        .order("sort_order")
        .order("id")
        .range(start, end),
    ),
  ]);
  return backupSchema.parse({
    ...site,
    media,
    version: 1,
    exported_at: new Date().toISOString(),
    projects: projects.map((p) => ({
      ...p,
      blocks: blocks
        .filter((b) => b.project_id === p.id)
        .map(({ id, block_type, content, sort_order }) => ({
          id,
          block_type,
          content,
          sort_order,
        })),
    })),
  });
}
export async function importBackup(backup: Backup) {
  const { error } = await db().rpc("import_content", {
    payload: backupSchema.parse(backup),
  });
  if (error) throw error;
}
export function downloadJson(value: Backup) {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(value, null, 2)], { type: "application/json" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = `portfolio-backup-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
