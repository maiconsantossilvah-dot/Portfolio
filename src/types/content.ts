export type Status = "draft" | "published" | "archived";
export const blockTypes = [
  "heading",
  "subheading",
  "paragraph",
  "rich_text",
  "image",
  "gallery",
  "image_grid",
  "comparison",
  "banner",
  "video",
  "embed",
  "features",
  "technologies",
  "specs",
  "faq",
  "process",
  "code",
  "link",
  "metric",
  "divider",
  "spacer",
  "pdp",
] as const;
export type BlockType = (typeof blockTypes)[number];
export type BlockContent = {
  title?: string;
  text?: string;
  url?: string;
  label?: string;
  after_label?: string;
  media_ids?: string[];
  desktop_ids?: string[];
  mobile_ids?: string[];
  items?: { title: string; text: string }[];
  caption?: string;
  alt?: string;
  width?: "normal" | "wide" | "full";
  align?: "left" | "center";
  spacing?: "small" | "medium" | "large";
  columns?: 2 | 3;
  language?: string;
};
export type Block = {
  id: string;
  block_type: BlockType;
  content: BlockContent;
  sort_order: number;
};
export type Category = {
  id: string;
  name: string;
  slug: string;
  description: string;
  sort_order: number;
};
export type Technology = {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
};
export type Project = {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  description: string;
  project_type: "case" | "pdp" | "images" | "app";
  cover_media_id: string | null;
  status: Status;
  featured: boolean;
  sort_order: number;
  client_name: string;
  brand_name: string;
  contribution: string;
  external_url: string;
  demo_url: string;
  project_date: string | null;
  seo_title: string;
  seo_description: string;
  created_at: string;
  updated_at: string;
  published_at: string | null;
  product_name: string;
  authorship: string;
  blocks: Block[];
  category_ids: string[];
  technology_ids: string[];
};
export type MediaAsset = {
  id: string;
  storage_path: string;
  thumbnail_path: string | null;
  file_name: string;
  mime_type: string;
  size: number;
  width: number;
  height: number;
  alt_text: string;
  caption: string;
  tag: string;
  created_at: string;
};
export type Service = {
  id: string;
  title: string;
  description: string;
  icon: string;
  price: string;
  active: boolean;
  sort_order: number;
};
export type Contact = { label: string; url: string };
export type Profile = {
  id: number;
  name: string;
  full_name: string;
  role: string;
  bio: string;
  author_note: string;
  photo_media_id: string | null;
  contacts: Contact[];
};
export type Section = {
  id: "projects" | "services" | "about" | "contact";
  visible: boolean;
};
export type Settings = {
  id: number;
  hero_title: string;
  hero_description: string;
  available: boolean;
  availability_text: string;
  contact_title: string;
  contact_description: string;
  accent: "blue" | "violet" | "teal";
  sections: Section[];
  share_media_id: string | null;
  institutional_text: string;
};
export type SiteData = {
  profile: Profile;
  settings: Settings;
  categories: Category[];
  technologies: Technology[];
  services: Service[];
};
export type Backup = SiteData & {
  version: 1;
  exported_at: string;
  projects: Project[];
  media: MediaAsset[];
};
