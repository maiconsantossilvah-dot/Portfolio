import { useRef, useState, type DragEvent } from "react";
import { Expand, ImagePlus, Pencil, Trash2, Upload } from "lucide-react";
import {
  listMedia,
  mediaUsage,
  updateRecord,
} from "../../repositories/content";
import { deleteMedia, uploadImage } from "../../services/media";
import { useAsync } from "../../hooks/useAsync";
import { userError } from "../../lib/supabase";
import type { MediaAsset } from "../../types/content";
import { clearMediaCache, MediaImage } from "../../components/MediaImage";
import { ImageViewer } from "../../components/blocks/ImageViewer";
import {
  Empty,
  ErrorState,
  Field,
  Loading,
  Modal,
  useToast,
} from "../../components/ui";
export default function MediaLibrary() {
  const state = useAsync(listMedia, []);
  const [query, setQuery] = useState("");
  const [preserve, setPreserve] = useState(true);
  const [quality, setQuality] = useState(0.92);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState("");
  const [edit, setEdit] = useState<MediaAsset | null>(null);
  const [view, setView] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<MediaAsset | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const toast = useToast();
  const upload = async (files: File[]) => {
    if (busy || !files.length) return;
    if (files.length > 20) {
      toast("Envie até 20 imagens por vez.", true);
      return;
    }
    setBusy(true);
    let count = 0;
    for (const [i, file] of files.entries()) {
      setProgress(`Enviando ${i + 1} de ${files.length}: ${file.name}`);
      try {
        await uploadImage(file, preserve, quality);
        count++;
      } catch (e) {
        toast(
          `${file.name}: ${e instanceof Error && !("code" in e) ? e.message : userError(e)}`,
          true,
        );
      }
    }
    setProgress(`${count} de ${files.length} imagens enviadas.`);
    setBusy(false);
    state.reload();
    if (fileInput.current) fileInput.current.value = "";
  };
  const drop = (e: DragEvent) => {
    e.preventDefault();
    void upload([...e.dataTransfer.files]);
  };
  const save = async () => {
    if (!edit) return;
    setBusy(true);
    try {
      await updateRecord("media_assets", {
        id: edit.id,
        file_name: edit.file_name,
        alt_text: edit.alt_text,
        caption: edit.caption,
        tag: edit.tag,
      });
      clearMediaCache();
      setEdit(null);
      toast("Informações da imagem atualizadas.");
      state.reload();
    } catch (e) {
      toast(userError(e), true);
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <div className="admin-heading">
        <div>
          <p className="eyebrow">Seus recursos visuais</p>
          <h1>Biblioteca de mídia</h1>
          <p>Imagens organizadas, reutilizáveis e protegidas.</p>
        </div>
        <button
          className="button primary"
          disabled={busy}
          onClick={() => fileInput.current?.click()}
        >
          <ImagePlus size={18} />
          Enviar imagens
        </button>
      </div>
      <input
        ref={fileInput}
        hidden
        type="file"
        accept="image/jpeg,image/png,image/webp,image/avif"
        multiple
        onChange={(e) => void upload([...(e.target.files || [])])}
      />
      <div
        className={`upload-zone ${busy ? "busy" : ""}`}
        onDragOver={(e) => e.preventDefault()}
        onDrop={drop}
      >
        <Upload size={25} />
        <p>
          Arraste imagens para cá ou{" "}
          <button
            className="text-button"
            disabled={busy}
            onClick={() => fileInput.current?.click()}
          >
            escolha arquivos
          </button>
        </p>
        <span className="small muted">
          JPEG, PNG, WebP e AVIF · até 25 MB por imagem
        </span>
      </div>
      <div className="upload-options">
        <label className="checkbox">
          <input
            type="checkbox"
            checked={preserve}
            onChange={(e) => setPreserve(e.target.checked)}
            disabled={busy}
          />
          Preservar original (recomendado para PDPs e textos pequenos)
        </label>
        {!preserve && (
          <Field label={`Qualidade WebP: ${Math.round(quality * 100)}%`}>
            <input
              type="range"
              min={0.7}
              max={1}
              step={0.01}
              value={quality}
              onChange={(e) => setQuality(Number(e.target.value))}
            />
          </Field>
        )}
      </div>
      {progress && (
        <p className="notice" role="status">
          {progress}
        </p>
      )}
      <label className="field">
        <span>Pesquisar por nome, texto alternativo ou categoria</span>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Pesquisar imagens…"
        />
      </label>
      {state.loading ? (
        <Loading />
      ) : state.error ? (
        <ErrorState error={state.error} retry={state.reload} />
      ) : !state.data.length ? (
        <Empty title="Espaço para suas próximas criações">
          Envie imagens para começar a montar seus projetos.
        </Empty>
      ) : (
        <div className="media-library-grid">
          {state.data
            .filter((m) =>
              `${m.file_name} ${m.alt_text} ${m.tag}`
                .toLowerCase()
                .includes(query.toLowerCase()),
            )
            .map((m) => (
              <article className="media-card" key={m.id}>
                <button
                  className="media-card-image"
                  aria-label={`Ampliar ${m.file_name}`}
                  onClick={() => setView(m.id)}
                >
                  <MediaImage
                    id={m.id}
                    thumbnail
                    alt={m.alt_text || m.file_name}
                  />
                  <Expand size={20} />
                </button>
                <div>
                  <h2 title={m.file_name}>{m.file_name}</h2>
                  <p>
                    {m.width} × {m.height} · {(m.size / 1024 / 1024).toFixed(2)}{" "}
                    MB
                  </p>
                  {!m.alt_text && (
                    <span className="badge draft">Sem texto alternativo</span>
                  )}
                  <div className="inline-actions">
                    <button className="text-button" onClick={() => setEdit(m)}>
                      <Pencil size={15} />
                      Editar
                    </button>
                    <button
                      className="icon-button danger"
                      disabled={busy}
                      aria-label={`Excluir ${m.file_name}`}
                      onClick={() => setDeleting(m)}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </article>
            ))}
        </div>
      )}
      {view && <ImageViewer ids={[view]} onClose={() => setView(null)} />}
      {edit && (
        <Modal title="Informações da imagem" onClose={() => setEdit(null)}>
          <Field label="Nome do arquivo">
            <input
              value={edit.file_name}
              maxLength={255}
              onChange={(e) => setEdit({ ...edit, file_name: e.target.value })}
            />
          </Field>
          <Field
            label="Texto alternativo"
            hint="Descreva o conteúdo visual para quem usa leitor de tela."
          >
            <textarea
              value={edit.alt_text}
              onChange={(e) => setEdit({ ...edit, alt_text: e.target.value })}
            />
          </Field>
          <Field label="Legenda">
            <input
              value={edit.caption}
              onChange={(e) => setEdit({ ...edit, caption: e.target.value })}
            />
          </Field>
          <Field label="Categoria / tag">
            <input
              value={edit.tag}
              onChange={(e) => setEdit({ ...edit, tag: e.target.value })}
            />
          </Field>
          <div className="modal-actions">
            <button
              className="button primary"
              disabled={busy || !edit.file_name.trim()}
              onClick={() => void save()}
            >
              Salvar informações
            </button>
          </div>
        </Modal>
      )}
      {deleting && (
        <DeleteDialog
          asset={deleting}
          onClose={() => setDeleting(null)}
          onDeleted={() => {
            setDeleting(null);
            clearMediaCache();
            state.reload();
          }}
        />
      )}
    </>
  );
}
function DeleteDialog({
  asset,
  onClose,
  onDeleted,
}: {
  asset: MediaAsset;
  onClose: () => void;
  onDeleted: () => void;
}) {
  const load = useRef(() => mediaUsage(asset.id));
  const usage = useAsync(load.current, null);
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  return (
    <Modal title="Excluir imagem?" onClose={onClose}>
      {usage.loading ? (
        <Loading />
      ) : usage.error ? (
        <ErrorState error={usage.error} retry={usage.reload} />
      ) : usage.data?.count ? (
        <>
          <p>
            Esta imagem possui {usage.data.count} vínculos e está protegida
            contra exclusão.
          </p>
          <ul>
            {usage.data.projects.map((p) => (
              <li key={p.project_id}>
                {(p.projects as unknown as { title: string })?.title ||
                  "Projeto"}
              </li>
            ))}
            {usage.data.publicUse && (
              <li>Perfil ou imagem de compartilhamento</li>
            )}
          </ul>
          <p>Remova os vínculos nos conteúdos antes de excluir.</p>
        </>
      ) : (
        <p>
          Excluir <strong>{asset.file_name}</strong> e sua miniatura
          permanentemente?
        </p>
      )}
      <div className="modal-actions">
        <button className="button secondary" disabled={busy} onClick={onClose}>
          Cancelar
        </button>
        <button
          className="button danger-button"
          disabled={
            busy || usage.loading || !!usage.error || !!usage.data?.count
          }
          onClick={async () => {
            setBusy(true);
            try {
              await deleteMedia(asset);
              toast("Imagem excluída.");
              onDeleted();
            } catch (e) {
              toast(userError(e), true);
            } finally {
              setBusy(false);
            }
          }}
        >
          Excluir imagem
        </button>
      </div>
    </Modal>
  );
}
