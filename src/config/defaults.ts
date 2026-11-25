import type { Profile, Settings, Service } from "../types/content";
export const defaultProfile: Profile = {
  id: 1,
  name: "Maicon Santos",
  full_name: "Maicon Santos Silva",
  role: "Conteúdo, design & desenvolvimento",
  photo_media_id: null,
  author_note:
    "Também crio o FastSEO, ferramenta autoral para estruturar, auditar e produzir conteúdo para e-commerce.",
  bio: "Sou profissional especializado em criação e otimização de conteúdo para e-commerce, com experiência prática na produção de materiais visuais, comerciais e técnicos para páginas de produtos.\n\nMinha atuação combina design, inteligência artificial, SEO, organização de informações e desenvolvimento web, buscando soluções que valorizem os produtos e melhorem a experiência de compra.\n\nTambém desenvolvo ferramentas de automação voltadas à produção de conteúdo, unindo tecnologia e criatividade para otimizar processos e entregas.\n\nEstou disponível para projetos pontuais, demandas recorrentes e parcerias com agências e operações de e-commerce.",
  contacts: [
    { label: "E-mail", url: "mailto:maiconsantossilvah@gmail.com" },
    { label: "WhatsApp", url: "https://wa.me/qr/R6ER3ERGXMGQC1" },
    {
      label: "LinkedIn",
      url: "https://www.linkedin.com/in/maicon-santos-silva-3ba402346",
    },
    { label: "GitHub", url: "https://github.com/maiconsantossilvah-dot" },
  ],
};
export const defaultSettings: Settings = {
  id: 1,
  hero_title: "Design, conteúdo e tecnologia para e-commerce.",
  hero_description:
    "Transformo informações de produtos em experiências digitais comerciais, combinando criatividade, SEO, inteligência artificial e desenvolvimento web.",
  available: true,
  availability_text: "Disponível para projetos freelance",
  contact_title: "Vamos trabalhar juntos?",
  contact_description:
    "Disponível para demandas pontuais, projetos personalizados e parcerias recorrentes.",
  accent: "blue",
  sections: ["projects", "services", "about", "contact"].map((id) => ({
    id,
    visible: true,
  })) as Settings["sections"],
  share_media_id: null,
  institutional_text: "Conteúdo bem pensado. Produtos bem apresentados.",
};
const serviceContent = [
  [
    "Conteúdo rico para PDPs",
    "Páginas que traduzem características em argumentos de compra, com hierarquia visual e informação clara.",
    "layout",
  ],
  [
    "Imagens comerciais com IA",
    "Ambientações que apresentam o produto em contexto e dão forma à direção criativa.",
    "sparkles",
  ],
  [
    "Tratamento de imagens",
    "Recorte, correção e otimização com atenção à qualidade, à legibilidade e ao desempenho.",
    "image",
  ],
  [
    "Banners e infográficos",
    "Peças comerciais que organizam benefícios, especificações e campanhas com clareza.",
    "pen",
  ],
  [
    "SEO e conteúdo",
    "Descrições comerciais, meta descriptions, FAQ e fichas técnicas consistentes.",
    "search",
  ],
  [
    "Catálogo de produtos",
    "Cadastro e organização das informações para operações de e-commerce e marketplaces.",
    "layers",
  ],
  [
    "Desenvolvimento web",
    "Páginas responsivas com HTML, CSS e JavaScript para experiências comerciais.",
    "code",
  ],
  [
    "Automação de processos",
    "Ferramentas e integrações com APIs de IA para padronizar e simplificar rotinas.",
    "workflow",
  ],
];
export const defaultServices: Service[] = serviceContent.map(
  ([title, description, icon], sort_order) => ({
    id: `initial-${sort_order}`,
    title,
    description,
    icon,
    price: "",
    active: true,
    sort_order,
  }),
);
export const blockLabels = {
  heading: "Título",
  subheading: "Subtítulo",
  paragraph: "Parágrafo",
  rich_text: "Texto formatado",
  image: "Imagem",
  gallery: "Galeria",
  image_grid: "Grid de imagens",
  comparison: "Antes e depois",
  banner: "Banner",
  video: "Vídeo",
  embed: "Demonstração externa",
  features: "Características",
  technologies: "Tecnologias",
  specs: "Especificações",
  faq: "FAQ",
  process: "Processo",
  code: "Código",
  link: "Botão / link",
  metric: "Resultado",
  divider: "Separador",
  spacer: "Espaçamento",
  pdp: "PDP desktop / mobile",
} as const;
export const statusLabels = {
  draft: "Rascunho",
  published: "Publicado",
  archived: "Arquivado",
};
