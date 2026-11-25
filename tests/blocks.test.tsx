import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import BlockRenderer, {
  FormattedText,
  SafeEmbed,
} from "../src/components/blocks/BlockRenderer";
import Comparison from "../src/components/blocks/Comparison";
vi.mock("../src/components/MediaImage", () => ({
  MediaImage: ({ id, alt }: { id: string; alt?: string }) => (
    <img src={`https://images.test/${id}`} alt={alt || ""} />
  ),
  resolveMedia: async () => ({ asset: { width: 1600, height: 1200 } }),
}));
describe("Blocos públicos e isolamento", () => {
  it("renderiza texto formatado sem executar HTML ou protocolos perigosos", () => {
    const { container } = render(
      <FormattedText
        text={
          "<img src=x onerror=alert(1)> **Fato** [Ataque](javascript:alert) [Fonte](https://example.com)"
        }
      />,
    );
    expect(container.querySelector("img")).toBeNull();
    expect(container.querySelector("strong")).toHaveTextContent("Fato");
    expect(screen.getByRole("link", { name: "Fonte" })).toHaveAttribute(
      "rel",
      "noopener noreferrer",
    );
    expect(screen.queryByRole("link", { name: "Ataque" })).toBeNull();
  });
  it("isola demos sem scripts, mesma origem ou acesso ao contexto", () => {
    render(<SafeEmbed url="https://demo.example.com" />);
    fireEvent.click(
      screen.getByRole("button", { name: "Carregar prévia isolada" }),
    );
    const iframe = screen.getByTitle("Abrir demonstração");
    expect(iframe).toHaveAttribute("sandbox", "");
    expect(iframe).toHaveAttribute("referrerpolicy", "no-referrer");
  });
  it("não incorpora URLs da própria aplicação", () => {
    render(<SafeEmbed url={`${location.origin}/admin`} />);
    expect(
      screen.queryByRole("button", { name: "Carregar prévia isolada" }),
    ).toBeNull();
  });
  it("omite URL insegura", () => {
    const { container } = render(<SafeEmbed url="javascript:alert(1)" />);
    expect(container).toBeEmptyDOMElement();
  });
  it("ordena blocos e mantém código inerte", () => {
    const { container } = render(
      <BlockRenderer
        blocks={[
          {
            id: "b",
            block_type: "code",
            sort_order: 1,
            content: { text: "<script>evil()</script>", language: "html" },
          },
          {
            id: "a",
            block_type: "heading",
            sort_order: 0,
            content: { text: "Contexto" },
          },
        ]}
      />,
    );
    expect(container.querySelector(".content-block")?.textContent).toBe(
      "Contexto",
    );
    expect(container.querySelector("script")).toBeNull();
    expect(container.querySelector("code")).toHaveTextContent(
      "<script>evil()</script>",
    );
  });
  it("expande FAQ com controles nativos", () => {
    render(
      <BlockRenderer
        blocks={[
          {
            id: "a",
            block_type: "faq",
            sort_order: 0,
            content: {
              items: [
                { title: "Como funciona?", text: "Com dados verificados." },
              ],
            },
          },
        ]}
      />,
    );
    expect(screen.getByText("Como funciona?").tagName).toBe("SUMMARY");
  });
  it("atualiza comparador acessível mantendo proporções", () => {
    const { container } = render(
      <Comparison ids={["before", "after"]} before="Original" after="Final" />,
    );
    const slider = screen.getByRole("slider");
    expect(slider).toHaveAccessibleName(
      "Posição da comparação entre Original e Final",
    );
    fireEvent.change(slider, { target: { value: "75" } });
    expect(slider).toHaveValue("75");
    expect(container.querySelector(".comparison-after")).toHaveStyle({
      clipPath: "inset(0 25% 0 0)",
    });
  });
});
