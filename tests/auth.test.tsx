import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Session } from "@supabase/supabase-js";
import { MemoryRouter } from "react-router-dom";
const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  rpc: vi.fn(),
  signOut: vi.fn(),
  signInWithPassword: vi.fn(),
  resetPasswordForEmail: vi.fn(),
  getAuthenticatorAssuranceLevel: vi.fn(),
  listener: null as null | ((_event: string, session: Session | null) => void),
}));
vi.mock("../src/lib/supabase", () => {
  const client = {
    rpc: mocks.rpc,
    auth: {
      getSession: mocks.getSession,
      signOut: mocks.signOut,
      signInWithPassword: mocks.signInWithPassword,
      resetPasswordForEmail: mocks.resetPasswordForEmail,
      mfa: {
        getAuthenticatorAssuranceLevel: mocks.getAuthenticatorAssuranceLevel,
      },
      onAuthStateChange: (callback: typeof mocks.listener) => {
        mocks.listener = callback;
        return { data: { subscription: { unsubscribe: vi.fn() } } };
      },
    },
  };
  return { configured: true, supabase: client, db: () => client };
});
vi.mock("../src/components/MediaImage", () => ({ clearMediaCache: vi.fn() }));
import { AuthProvider, useAuth } from "../src/auth/AuthContext";
import Login from "../src/auth/Login";
function Consumer() {
  const auth = useAuth();
  return (
    <>
      <span>{auth.status}</span>
      <button onClick={() => void auth.logout()}>Sair</button>
    </>
  );
}
beforeEach(() => {
  vi.clearAllMocks();
  mocks.getSession.mockResolvedValue({
    data: { session: { user: { id: "owner" } } },
    error: null,
  });
  mocks.rpc.mockResolvedValue({ data: false, error: null });
  mocks.getAuthenticatorAssuranceLevel.mockResolvedValue({
    data: { currentLevel: "aal1", nextLevel: "aal1" },
  });
  mocks.signOut.mockResolvedValue({ error: null });
  mocks.signInWithPassword.mockResolvedValue({ error: null });
  mocks.resetPasswordForEmail.mockResolvedValue({ error: null });
});
describe("Sessão e autorização da interface (políticas são verificadas separadamente no banco)", () => {
  it("não confunde sessão válida com autorização", async () => {
    render(
      <AuthProvider>
        <Consumer />
      </AuthProvider>,
    );
    expect(await screen.findByText("denied")).toBeVisible();
    expect(mocks.rpc).toHaveBeenCalledWith("is_admin");
  });
  it("aceita proprietário confirmado pelo banco e trata logout", async () => {
    mocks.rpc.mockResolvedValue({ data: true, error: null });
    render(
      <AuthProvider>
        <Consumer />
      </AuthProvider>,
    );
    expect(await screen.findByText("authorized")).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Sair" }));
    expect(await screen.findByText("anonymous")).toBeVisible();
    expect(mocks.signOut).toHaveBeenCalledOnce();
  });
  it("sessão expirada remove a área autorizada", async () => {
    mocks.rpc.mockResolvedValue({ data: true, error: null });
    render(
      <AuthProvider>
        <Consumer />
      </AuthProvider>,
    );
    await screen.findByText("authorized");
    act(() => mocks.listener?.("SIGNED_OUT", null));
    expect(await screen.findByText("anonymous")).toBeVisible();
  });
  it("falha de rede na autorização falha de modo fechado", async () => {
    mocks.rpc.mockResolvedValue({ data: null, error: new Error("connection") });
    render(
      <AuthProvider>
        <Consumer />
      </AuthProvider>,
    );
    expect(await screen.findByText("error")).toBeVisible();
  });
  it("exige desafio quando a autorização depende de aal2", async () => {
    mocks.getAuthenticatorAssuranceLevel.mockResolvedValue({
      data: { currentLevel: "aal1", nextLevel: "aal2" },
    });
    render(
      <AuthProvider>
        <Consumer />
      </AuthProvider>,
    );
    expect(await screen.findByText("mfa")).toBeVisible();
  });
  it("login envia credenciais ao Auth, sem registro público", async () => {
    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>,
    );
    fireEvent.change(screen.getByLabelText("E-mail"), {
      target: { value: "owner@example.com" },
    });
    fireEvent.change(screen.getByLabelText("Senha"), {
      target: { value: "uma-senha-longa" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Entrar no painel" }));
    await waitFor(() =>
      expect(mocks.signInWithPassword).toHaveBeenCalledWith({
        email: "owner@example.com",
        password: "uma-senha-longa",
      }),
    );
    expect(screen.queryByText(/criar conta|cadastre-se/i)).toBeNull();
  });
  it("recuperação usa destino fixo e mensagem sem enumerar contas", async () => {
    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>,
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Esqueci minha senha" }),
    );
    fireEvent.change(screen.getByLabelText("E-mail"), {
      target: { value: "owner@example.com" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Enviar link de recuperação" }),
    );
    expect(await screen.findByText(/Se esta conta existir/)).toBeVisible();
    expect(mocks.resetPasswordForEmail).toHaveBeenCalledWith(
      "owner@example.com",
      { redirectTo: `${location.origin}/?auth=recovery` },
    );
  });
});
