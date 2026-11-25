import { useCallback, useState, type FormEvent } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { z } from "zod";
import { useAsync } from "../../hooks/useAsync";
import { useSite } from "../../hooks/SiteContext";
import {
  getSiteData,
  removeRecord,
  updateRecord,
} from "../../repositories/content";
import { userError } from "../../lib/supabase";
import { slugify } from "../../lib/validation";
import type { Category, Service, Technology } from "../../types/content";
import {
  Empty,
  ErrorState,
  Field,
  Loading,
  Modal,
  useToast,
} from "../../components/ui";
type Kind = "categories" | "technologies" | "services";
type Row = {
  id: string;
  name?: string;
  title?: string;
  slug?: string;
  description?: string;
  sort_order?: number;
  icon?: string | null;
  price?: string;
  active?: boolean;
};
const titles = {
  categories: "Categorias",
  technologies: "Tecnologias",
  services: "Serviços",
};
const schema = z.object({
  title: z.string().trim().min(1, "Informe um nome.").max(180),
  slug: z
    .string()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Endereço inválido.")
    .optional(),
});
export default function Collections({ kind }: { kind: Kind }) {
  const loader = useCallback(
    async () =>
      (await getSiteData())[kind] as (Category | Technology | Service)[],
    [kind],
  );
  const state = useAsync(loader, []);
  const [edit, setEdit] = useState<Row | null>(null);
  const [deleting, setDeleting] = useState<Row | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const toast = useToast();
  const site = useSite();
  const create = () => {
    setError("");
    setEdit({
      id: crypto.randomUUID(),
      ...(kind === "services"
        ? {
            title: "",
            description: "",
            icon: "layout",
            price: "",
            active: true,
            sort_order: state.data.length,
          }
        : kind === "categories"
          ? {
              name: "",
              slug: "",
              description: "",
              sort_order: state.data.length,
            }
          : { name: "", slug: "", icon: null }),
    });
  };
  const save = async (e: FormEvent) => {
    e.preventDefault();
    if (!edit) return;
    const parsed = schema.safeParse({
      title: edit.title || edit.name || "",
      ...(kind !== "services" ? { slug: edit.slug } : {}),
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0].message);
      return;
    }
    setBusy(true);
    try {
      await updateRecord(kind, edit);
      toast("Conteúdo salvo.");
      setEdit(null);
      state.reload();
      site.reload();
    } catch (e) {
      setError(userError(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <section>
      <div className="admin-heading">
        <div>
          <p className="eyebrow">Organização e apresentação</p>
          <h1>{titles[kind]}</h1>
          <p>
            {kind === "services"
              ? "Apresente suas entregas e facilite pedidos de orçamento."
              : "Organize o catálogo sem alterar o código."}
          </p>
        </div>
        <button className="button primary" onClick={create}>
          <Plus size={17} />
          Adicionar
        </button>
      </div>
      {state.loading ? (
        <Loading />
      ) : state.error ? (
        <ErrorState error={state.error} retry={state.reload} />
      ) : !state.data.length ? (
        <Empty title="Nenhum item cadastrado" />
      ) : (
        <div className="collection-list">
          {(state.data as Row[]).map((row) => (
            <article key={row.id} className="panel collection-row">
              <div>
                <h2>{row.title || row.name}</h2>
                <p>{row.description || row.slug}</p>
                {row.active === false && (
                  <span className="badge archived">Oculto</span>
                )}
                {row.price && <span className="badge">{row.price}</span>}
              </div>
              <div className="inline-actions">
                <button
                  className="icon-button"
                  aria-label={`Editar ${row.title || row.name}`}
                  onClick={() => {
                    setEdit(row);
                    setError("");
                  }}
                >
                  <Pencil size={17} />
                </button>
                <button
                  className="icon-button danger"
                  aria-label={`Excluir ${row.title || row.name}`}
                  onClick={() => setDeleting(row)}
                >
                  <Trash2 size={17} />
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
      {edit && (
        <Modal
          title={`Editar ${kind === "services" ? "serviço" : kind === "categories" ? "categoria" : "tecnologia"}`}
          onClose={() => setEdit(null)}
        >
          <form onSubmit={save}>
            <Field label="Nome *">
              <input
                required
                maxLength={
                  kind === "services" ? 180 : kind === "categories" ? 120 : 100
                }
                value={edit.title ?? edit.name ?? ""}
                onChange={(e) =>
                  setEdit({
                    ...edit,
                    ...(kind === "services"
                      ? { title: e.target.value }
                      : {
                          name: e.target.value,
                          ...(!state.data.some((x) => x.id === edit.id)
                            ? { slug: slugify(e.target.value) }
                            : {}),
                        }),
                  })
                }
              />
            </Field>
            {kind !== "services" && (
              <Field label="Endereço (slug) *">
                <input
                  required
                  value={edit.slug || ""}
                  onChange={(e) => setEdit({ ...edit, slug: e.target.value })}
                />
              </Field>
            )}
            {kind !== "technologies" && (
              <>
                <Field label="Descrição">
                  <textarea
                    rows={4}
                    value={edit.description || ""}
                    onChange={(e) =>
                      setEdit({ ...edit, description: e.target.value })
                    }
                  />
                </Field>
                <Field label="Ordem">
                  <input
                    type="number"
                    min={0}
                    value={edit.sort_order || 0}
                    onChange={(e) =>
                      setEdit({ ...edit, sort_order: Number(e.target.value) })
                    }
                  />
                </Field>
              </>
            )}
            {kind === "services" && (
              <>
                <Field label="Ícone">
                  <select
                    value={edit.icon || "layout"}
                    onChange={(e) => setEdit({ ...edit, icon: e.target.value })}
                  >
                    {[
                      ["layout", "Layout"],
                      ["image", "Imagem"],
                      ["sparkles", "IA"],
                      ["pen", "Design"],
                      ["search", "SEO"],
                      ["layers", "Catálogo"],
                      ["code", "Código"],
                      ["workflow", "Automação"],
                    ].map(([id, name]) => (
                      <option key={id} value={id}>
                        {name}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Preço (opcional)">
                  <input
                    placeholder="Deixe vazio para solicitar orçamento"
                    value={edit.price || ""}
                    onChange={(e) =>
                      setEdit({ ...edit, price: e.target.value })
                    }
                  />
                </Field>
                <label className="checkbox">
                  <input
                    type="checkbox"
                    checked={edit.active}
                    onChange={(e) =>
                      setEdit({ ...edit, active: e.target.checked })
                    }
                  />
                  Exibir no site
                </label>
              </>
            )}
            {error && (
              <p className="notice error" role="alert">
                {error}
              </p>
            )}
            <div className="modal-actions">
              <button className="button primary" disabled={busy}>
                Salvar
              </button>
            </div>
          </form>
        </Modal>
      )}
      {deleting && (
        <Modal title="Excluir conteúdo?" onClose={() => setDeleting(null)}>
          <p>
            Excluir <strong>{deleting.title || deleting.name}</strong>?
            Categorias e tecnologias vinculadas a projetos não podem ser
            excluídas.
          </p>
          <div className="modal-actions">
            <button
              className="button secondary"
              onClick={() => setDeleting(null)}
            >
              Cancelar
            </button>
            <button
              className="button danger-button"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  await removeRecord(kind, deleting.id);
                  setDeleting(null);
                  toast("Conteúdo excluído.");
                  state.reload();
                  site.reload();
                } catch (e) {
                  toast(userError(e), true);
                } finally {
                  setBusy(false);
                }
              }}
            >
              Excluir
            </button>
          </div>
        </Modal>
      )}
    </section>
  );
}
