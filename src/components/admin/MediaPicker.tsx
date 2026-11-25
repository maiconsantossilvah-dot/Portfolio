import { useState } from "react";
import { Check, ImagePlus, X } from "lucide-react";
import { listMedia } from "../../repositories/content";
import { useAsync } from "../../hooks/useAsync";
import { MediaImage } from "../MediaImage";
import { Empty, ErrorState, Loading, Modal } from "../ui";
export default function MediaPicker({
  value,
  onChange,
  multiple = true,
  label = "Selecionar imagens",
}: {
  value: string[];
  onChange: (ids: string[]) => void;
  multiple?: boolean;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="media-picker">
      <div className="selected-media">
        {value.map((id, i) => (
          <div key={`${id}-${i}`}>
            <MediaImage id={id} thumbnail />
            <button
              type="button"
              className="icon-button"
              aria-label={`Remover imagem ${i + 1}`}
              onClick={() => onChange(value.filter((_, n) => n !== i))}
            >
              <X size={15} />
            </button>
            <span>{i + 1}</span>
          </div>
        ))}
      </div>
      <button
        type="button"
        className="button secondary small-button"
        onClick={() => setOpen(true)}
      >
        <ImagePlus size={17} />
        {label}
      </button>
      {open && (
        <PickerDialog
          selected={value}
          multiple={multiple}
          onApply={(ids) => {
            onChange(ids);
            setOpen(false);
          }}
          onClose={() => setOpen(false)}
        />
      )}
    </div>
  );
}
function PickerDialog({
  selected,
  multiple,
  onApply,
  onClose,
}: {
  selected: string[];
  multiple: boolean;
  onApply: (ids: string[]) => void;
  onClose: () => void;
}) {
  const state = useAsync(listMedia, []);
  const [selection, setSelection] = useState(selected);
  const [query, setQuery] = useState("");
  return (
    <Modal title="Biblioteca de mídia" wide onClose={onClose}>
      <label className="field">
        <span>Pesquisar imagem</span>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </label>
      {state.loading ? (
        <Loading />
      ) : state.error ? (
        <ErrorState error={state.error} retry={state.reload} />
      ) : state.data.length ? (
        <div className="picker-grid">
          {state.data
            .filter((m) =>
              `${m.file_name} ${m.alt_text} ${m.tag}`
                .toLowerCase()
                .includes(query.toLowerCase()),
            )
            .map((m) => (
              <button
                type="button"
                key={m.id}
                aria-pressed={selection.includes(m.id)}
                onClick={() =>
                  setSelection((prev) =>
                    multiple
                      ? prev.includes(m.id)
                        ? prev.filter((id) => id !== m.id)
                        : [...prev, m.id]
                      : [m.id],
                  )
                }
              >
                <MediaImage
                  id={m.id}
                  thumbnail
                  alt={m.alt_text || m.file_name}
                />
                <span>{m.file_name}</span>
                {selection.includes(m.id) && (
                  <i>
                    <Check size={18} />
                    {selection.indexOf(m.id) + 1}
                  </i>
                )}
              </button>
            ))}
        </div>
      ) : (
        <Empty title="A biblioteca está vazia">
          Envie imagens na Biblioteca de mídia antes de selecioná-las.
        </Empty>
      )}
      <div className="modal-actions">
        <span className="small muted">
          A ordem da seleção define a ordem das imagens.
        </span>
        <button
          type="button"
          className="button primary"
          onClick={() => onApply(selection)}
        >
          Usar {selection.length}{" "}
          {selection.length === 1 ? "imagem" : "imagens"}
        </button>
      </div>
    </Modal>
  );
}
