import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import type { Project } from "../src/types/content";
import { defaultProfile, defaultSettings } from "../src/config/defaults";
const mocks = vi.hoisted(() => ({
  getProject: vi.fn(),
  saveProject: vi.fn(),
  getAutosavePreference: vi.fn(),
  updateRecord: vi.fn(),
}));
vi.mock("../src/repositories/content", () => mocks);
vi.mock("../src/hooks/SiteContext", () => ({
  useSite: () => ({
    data: {
      profile: defaultProfile,
      settings: defaultSettings,
      categories: [
        {
          id: "10000000-0000-4000-8000-000000000001",
          name: "PDP",
          slug: "pdp",
          description: "",
          sort_order: 0,
        },
      ],
      technologies: [],
      services: [],
    },
    reload: vi.fn(),
  }),
}));
vi.mock("../src/components/admin/MediaPicker", () => ({
  default: ({ onChange }: { onChange: (ids: string[]) => void }) => (
    <button
      type="button"
      onClick={() => onChange(["20000000-0000-4000-8000-000000000001"])}
    >
      Escolher capa de teste
    </button>
  ),
}));
vi.mock("../src/components/MediaImage", () => ({
  MediaImage: () => <span>Imagem</span>,
}));
import ProjectEditor from "../src/pages/admin/ProjectEditor";
import { ToastProvider } from "../src/components/ui";
function fixture(): Project {
  return {
    id: "30000000-0000-4000-8000-000000000001",
    title: "Projeto existente",
    slug: "projeto-existente",
    excerpt: "Resumo comercial",
    description: "",
    project_type: "case",
    cover_media_id: "20000000-0000-4000-8000-000000000001",
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
    created_at: "2026-11-25T10:00:00Z",
    updated_at: "2026-11-25T10:00:00Z",
    published_at: null,
    product_name: "",
    authorship: "",
    blocks: [],
    category_ids: ["10000000-0000-4000-8000-000000000001"],
    technology_ids: [],
  };
}
async function mount() {
  const router = createMemoryRouter(
    [
      { path: "/admin/projetos/:id", element: <ProjectEditor /> },
      { path: "/admin/projetos", element: <h1>Lista de projetos</h1> },
    ],
    {
      initialEntries: ["/admin/projetos/30000000-0000-4000-8000-000000000001"],
    },
  );
  render(
    <ToastProvider>
      <RouterProvider router={router} />
    </ToastProvider>,
  );
  await screen.findByDisplayValue("Projeto existente");
  return router;
}
beforeEach(() => {
  vi.clearAllMocks();
  mocks.getProject.mockResolvedValue(fixture());
  mocks.getAutosavePreference.mockResolvedValue(false);
  mocks.saveProject.mockImplementation(async (p: Project) => ({
    ...p,
    updated_at: "2026-11-25T11:00:00Z",
  }));
  mocks.updateRecord.mockResolvedValue(undefined);
  HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.close = function () {
    this.removeAttribute("open");
  };
});
describe("Editor integrado com navegação e contrato do repositório", () => {
  it("primeiro salvamento troca a URL sem bloquear a navegação para o próprio projeto", async () => {
    mocks.saveProject.mockImplementation(async (p: Project) => {
      const saved = { ...p, updated_at: "2026-11-25T11:00:00Z" };
      mocks.getProject.mockResolvedValue(saved);
      return saved;
    });
    const router = createMemoryRouter(
      [{ path: "/admin/projetos/:id", element: <ProjectEditor /> }],
      { initialEntries: ["/admin/projetos/novo"] },
    );
    render(
      <ToastProvider>
        <RouterProvider router={router} />
      </ToastProvider>,
    );
    await screen.findByLabelText("Título *");
    fireEvent.change(screen.getByLabelText("Título *"), {
      target: { value: "Primeiro projeto" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Salvar" }));
    await waitFor(() =>
      expect(router.state.location.pathname).toMatch(
        /\/admin\/projetos\/[a-f0-9-]{36}$/,
      ),
    );
    expect(
      screen.queryByRole("dialog", { name: "Alterações não salvas" }),
    ).toBeNull();
  });
  it("salva blocos editados visualmente e publica após validação", async () => {
    await mount();
    fireEvent.click(screen.getByRole("button", { name: "Adicionar bloco" }));
    fireEvent.change(screen.getByLabelText("Texto"), {
      target: { value: "Minha contribuição real." },
    });
    fireEvent.click(screen.getByRole("button", { name: "Publicar" }));
    await waitFor(() => expect(mocks.saveProject).toHaveBeenCalledOnce());
    expect(mocks.saveProject.mock.calls[0][0]).toMatchObject({
      status: "published",
      blocks: [
        {
          block_type: "paragraph",
          content: { text: "Minha contribuição real." },
          sort_order: 0,
        },
      ],
    });
    expect(
      await screen.findByText("Publicado", { selector: ".badge" }),
    ).toBeVisible();
  });
  it("impede publicação sem capa e preserva o formulário", async () => {
    mocks.getProject.mockResolvedValue({ ...fixture(), cover_media_id: null });
    await mount();
    fireEvent.click(screen.getByRole("button", { name: "Publicar" }));
    expect(
      await screen.findByText("Selecione uma capa antes de publicar."),
    ).toBeVisible();
    expect(mocks.saveProject).not.toHaveBeenCalled();
    expect(screen.getByDisplayValue("Projeto existente")).toBeVisible();
  });
  it("despublica para rascunho com salvamento explícito", async () => {
    mocks.getProject.mockResolvedValue({ ...fixture(), status: "published" });
    await mount();
    fireEvent.click(screen.getByRole("button", { name: "Despublicar" }));
    await waitFor(() =>
      expect(mocks.saveProject).toHaveBeenCalledWith(
        expect.objectContaining({ status: "draft" }),
      ),
    );
  });
  it("mantém alterações quando a rede falha", async () => {
    mocks.saveProject.mockRejectedValue(new Error("offline"));
    await mount();
    fireEvent.change(screen.getByLabelText("Título *"), {
      target: { value: "Alteração preservada" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Salvar" }));
    await screen.findByText(/Não foi possível concluir/);
    expect(screen.getByDisplayValue("Alteração preservada")).toBeVisible();
  });
  it("previne saída silenciosa com alterações não salvas", async () => {
    await mount();
    fireEvent.change(screen.getByLabelText("Título *"), {
      target: { value: "Alteração pendente" },
    });
    fireEvent.click(screen.getByRole("link", { name: "Projetos" }));
    expect(
      await screen.findByRole("dialog", { name: "Alterações não salvas" }),
    ).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Continuar editando" }));
    expect(screen.getByDisplayValue("Alteração pendente")).toBeVisible();
    fireEvent.click(screen.getByRole("link", { name: "Projetos" }));
    fireEvent.click(screen.getByRole("button", { name: "Descartar e sair" }));
    expect(
      await screen.findByRole("heading", { name: "Lista de projetos" }),
    ).toBeVisible();
  });
  it("prévia privada não grava nem publica o conteúdo", async () => {
    await mount();
    fireEvent.click(screen.getByRole("button", { name: "Prévia" }));
    expect(
      await screen.findByRole("dialog", { name: "Pré-visualização privada" }),
    ).toBeVisible();
    expect(mocks.saveProject).not.toHaveBeenCalled();
  });
  it("autosave persiste somente rascunhos e mantém alterações recuperáveis", async () => {
    mocks.getAutosavePreference.mockResolvedValue(true);
    await mount();
    await waitFor(() =>
      expect(screen.getByLabelText("Autosave de rascunhos")).toBeChecked(),
    );
    fireEvent.change(screen.getByLabelText("Título *"), {
      target: { value: "Rascunho atualizado" },
    });
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 2400));
    });
    await waitFor(() =>
      expect(mocks.saveProject).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Rascunho atualizado",
          status: "draft",
        }),
      ),
    );
  });
});
