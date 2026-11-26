import { configured } from "../lib/supabase";
import type { Project } from "../types/content";
import { getProject, listProjects } from "./content";

type CaseCapture = {
  src: string;
  alt: string;
  width: number;
  height: number;
  caption: string;
};

export type PublicProject = Project & {
  sample?: {
    category: string;
    cover: CaseCapture;
    captures: CaseCapture[];
  };
};

const asset = `${import.meta.env.BASE_URL}trabalhos/salon-line/`;

// Editorial content for deployments that have not connected a CMS yet.
const salonLine: PublicProject = {
  id: "salon-line-liso-ostentacao",
  slug: "salon-line-liso-ostentacao",
  title: "Salon Line — Liso Ostentação",
  excerpt:
    "Conteúdo rico para a página de uma máscara capilar, com benefícios em abas e perguntas sobre o uso do produto.",
  description:
    "A PDP apresenta o produto e seu benefício principal antes de entrar nos detalhes. Em seguida, duas abas separam selagem e efeito liso de hidratação intensa. O FAQ reúne dúvidas de aplicação e tempo de ação no fim da página.",
  project_type: "pdp",
  cover_media_id: null,
  status: "published",
  featured: true,
  sort_order: 0,
  client_name: "",
  brand_name: "Salon Line",
  contribution:
    "Estruturação do conteúdo e implementação da PDP em HTML e CSS.",
  external_url: "",
  demo_url: "",
  project_date: null,
  seo_title: "",
  seo_description: "",
  created_at: "",
  updated_at: "",
  published_at: null,
  product_name: "Máscara Meu Liso Topcoat Liso Ostentação 300g",
  authorship: "",
  blocks: [],
  category_ids: [],
  technology_ids: [],
  sample: {
    category: "Conteúdo rico / PDP",
    cover: {
      src: `${asset}capa.webp`,
      alt: "PDP da Salon Line com o título da máscara, imagem do produto e destaque para o efeito liso.",
      width: 1440,
      height: 900,
      caption: "Recorte da PDP em desktop.",
    },
    captures: [
      {
        src: `${asset}beneficios.webp`,
        alt: "Aba de hidratação intensa, com uma ilustração e o texto sobre o benefício.",
        width: 1440,
        height: 864,
        caption: "Desktop: segunda aba do módulo de benefícios.",
      },
      {
        src: `${asset}mobile.webp`,
        alt: "Na versão mobile, a imagem do produto e os benefícios são organizados verticalmente.",
        width: 420,
        height: 875,
        caption: "Mobile: apresentação do produto e módulo de benefícios.",
      },
    ],
  },
};

export async function listPublicProjects(): Promise<PublicProject[]> {
  return configured ? listProjects() : [salonLine];
}

export async function getPublicProject(
  slug: string,
): Promise<PublicProject | null> {
  if (configured) return getProject(slug);
  return slug === salonLine.slug ? salonLine : null;
}
