import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowDown,
  ArrowUp,
  Archive,
  Copy,
  Eye,
  EyeOff,
  GripVertical,
  Pencil,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import {
  changeStatus,
  deleteProject,
  duplicateProject,
  listProjects,
  reorderProjects,
} from "../../repositories/content";
import { useAsync } from "../../hooks/useAsync";
import { moveItem } from "../../lib/validation";
import { userError } from "../../lib/supabase";
import { statusLabels } from "../../config/defaults";
import type { Project } from "../../types/content";
import {
  Empty,
  ErrorState,
  Loading,
  Modal,
  useToast,
} from "../../components/ui";
import { MediaImage } from "../../components/MediaImage";
const load = () => listProjects(true);
export default function ProjectList() {
  const state = useAsync(load, []);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [sort, setSort] = useState("order");
  const [deleting, setDeleting] = useState<Project | null>(null);
  const [busy, setBusy] = useState(false);
  const [drag, setDrag] = useState<number | null>(null);
  const toast = useToast();
  const rows = useMemo(
    () =>
      state.data
        .filter(
          (p) =>
            p.title.toLowerCase().includes(query.toLowerCase()) &&
            (!status || p.status === status),
        )
        .sort((a, b) =>
          sort === "title"
            ? a.title.localeCompare(b.title, "pt-BR")
            : sort === "recent"
              ? b.updated_at.localeCompare(a.updated_at)
              : a.sort_order - b.sort_order,
        ),
    [state.data, query, status, sort],
  );
  const perform = async (action: () => Promise<unknown>, message: string) => {
    setBusy(true);
    try {
      await action();
      toast(message);
      state.reload();
    } catch (e) {
      toast(userError(e), true);
    } finally {
      setBusy(false);
    }
  };
  const reorder = async (from: number, to: number) => {
    const next = moveItem(state.data, from, to);
    await perform(
      () => reorderProjects(next.map((p) => p.id)),
      "Ordem atualizada.",
    );
  };
  const canReorder = !query && !status && sort === "order";
  return (
    <>
      <div className="admin-heading">
        <div>
          <p className="eyebrow">Seu trabalho, bem apresentado</p>
          <h1>Projetos</h1>
          <p>Crie, organize e publique seus estudos de caso.</p>
        </div>
        <Link className="button primary" to="/admin/projetos/novo">
          <Plus size={18} />
          Novo projeto
        </Link>
      </div>
      <div className="admin-filters">
        <label className="search-field">
          <Search size={17} />
          <span className="sr-only">Pesquisar projetos</span>
          <input
            type="search"
            placeholder="Pesquisar projetos…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        <select
          aria-label="Filtrar por status"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="">Todos os status</option>
          {Object.entries(statusLabels).map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>
        <select
          aria-label="Ordenar projetos"
          value={sort}
          onChange={(e) => setSort(e.target.value)}
        >
          <option value="order">Ordem de exibição</option>
          <option value="recent">Última alteração</option>
          <option value="title">Título A–Z</option>
        </select>
      </div>
      {state.loading ? (
        <Loading />
      ) : state.error ? (
        <ErrorState error={state.error} retry={state.reload} />
      ) : !rows.length ? (
        <Empty title="Nenhum projeto por aqui">
          Crie um novo projeto ou ajuste sua pesquisa.
        </Empty>
      ) : (
        <div className="admin-project-list">
          {rows.map((p, i) => (
            <article
              className="admin-project-row"
              key={p.id}
              onDragOver={(e) => {
                if (canReorder) e.preventDefault();
              }}
              onDrop={(e) => {
                e.preventDefault();
                if (drag !== null && canReorder && !busy) void reorder(drag, i);
                setDrag(null);
              }}
            >
              <span
                className="drag-handle"
                draggable={canReorder && !busy}
                onDragStart={() => setDrag(i)}
                onDragEnd={() => setDrag(null)}
              >
                <GripVertical size={18} />
              </span>
              <div className="row-cover">
                {p.cover_media_id ? (
                  <MediaImage id={p.cover_media_id} thumbnail alt="" />
                ) : (
                  <FolderPlaceholder />
                )}
              </div>
              <div className="row-project-info">
                <Link to={`/admin/projetos/${p.id}`}>
                  <h2>{p.title}</h2>
                </Link>
                <p>
                  {new Date(p.updated_at).toLocaleDateString("pt-BR")}
                  {p.featured && " · Em destaque"}
                </p>
                <span className={`badge ${p.status}`}>
                  {statusLabels[p.status]}
                </span>
              </div>
              <div className="row-actions">
                <button
                  className="icon-button"
                  disabled={busy || !canReorder || !i}
                  aria-label={`Mover ${p.title} para cima`}
                  onClick={() => void reorder(i, i - 1)}
                >
                  <ArrowUp size={16} />
                </button>
                <button
                  className="icon-button"
                  disabled={busy || !canReorder || i === rows.length - 1}
                  aria-label={`Mover ${p.title} para baixo`}
                  onClick={() => void reorder(i, i + 1)}
                >
                  <ArrowDown size={16} />
                </button>
                <Link
                  className="icon-button"
                  aria-label={`Editar ${p.title}`}
                  to={`/admin/projetos/${p.id}`}
                >
                  <Pencil size={16} />
                </Link>
                <button
                  className="icon-button"
                  aria-label={`Duplicar ${p.title}`}
                  disabled={busy}
                  onClick={() =>
                    void perform(
                      () => duplicateProject(p),
                      "Cópia criada como rascunho.",
                    )
                  }
                >
                  <Copy size={16} />
                </button>
                <button
                  className="icon-button"
                  aria-label={
                    p.status === "published"
                      ? `Despublicar ${p.title}`
                      : `Publicar ${p.title}`
                  }
                  disabled={busy}
                  onClick={() =>
                    void perform(
                      () =>
                        changeStatus(
                          p,
                          p.status === "published" ? "draft" : "published",
                        ),
                      p.status === "published"
                        ? "Projeto despublicado."
                        : "Projeto publicado.",
                    )
                  }
                >
                  {p.status === "published" ? (
                    <EyeOff size={16} />
                  ) : (
                    <Eye size={16} />
                  )}
                </button>
                <button
                  className="icon-button"
                  aria-label={`Arquivar ${p.title}`}
                  disabled={busy || p.status === "archived"}
                  onClick={() =>
                    void perform(
                      () => changeStatus(p, "archived"),
                      "Projeto arquivado.",
                    )
                  }
                >
                  <Archive size={16} />
                </button>
                <button
                  className="icon-button danger"
                  aria-label={`Excluir ${p.title}`}
                  disabled={busy}
                  onClick={() => setDeleting(p)}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
      {deleting && (
        <Modal title="Excluir projeto?" onClose={() => setDeleting(null)}>
          <p>
            O projeto <strong>{deleting.title}</strong> e seus blocos serão
            excluídos. Os arquivos da biblioteca serão preservados.
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
              onClick={() =>
                void perform(async () => {
                  await deleteProject(deleting.id);
                  setDeleting(null);
                }, "Projeto excluído.")
              }
            >
              Excluir projeto
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
function FolderPlaceholder() {
  return <span aria-hidden="true">✳</span>;
}
