import { useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  Copy,
  GripVertical,
  Plus,
  Trash2,
} from "lucide-react";
import {
  blockTypes,
  type Block,
  type BlockContent,
  type BlockType,
} from "../../types/content";
import { blockLabels } from "../../config/defaults";
import { moveItem } from "../../lib/validation";
import { Field } from "../ui";
import MediaPicker from "../admin/MediaPicker";
const mediaTypes = ["image", "gallery", "image_grid", "comparison", "banner"];
const listTypes = ["features", "technologies", "specs", "faq", "process"];
export default function BlockEditor({
  blocks,
  onChange,
}: {
  blocks: Block[];
  onChange: (blocks: Block[]) => void;
}) {
  const [type, setType] = useState<BlockType>("paragraph");
  const [drag, setDrag] = useState<number | null>(null);
  const apply = (next: Block[]) =>
    onChange(next.map((b, i) => ({ ...b, sort_order: i })));
  const update = (index: number, content: Partial<BlockContent>) =>
    apply(
      blocks.map((b, i) =>
        i === index ? { ...b, content: { ...b.content, ...content } } : b,
      ),
    );
  return (
    <section className="block-editor">
      <div className="panel-heading">
        <div>
          <h2>Conteúdo do estudo de caso</h2>
          <p className="small muted">
            Monte a história com blocos. Arraste ou use os botões para
            reorganizar.
          </p>
        </div>
        <span className="mono">{blocks.length} blocos</span>
      </div>
      {blocks.map((b, i) => (
        <section
          className="editor-block panel"
          key={b.id}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            if (drag !== null) apply(moveItem(blocks, drag, i));
            setDrag(null);
          }}
        >
          <div className="editor-block-header">
            <span
              draggable
              onDragStart={(e) => {
                e.dataTransfer.effectAllowed = "move";
                setDrag(i);
              }}
              onDragEnd={() => setDrag(null)}
              className="drag-handle"
              title="Arrastar bloco"
            >
              <GripVertical size={18} />
            </span>
            <strong>{blockLabels[b.block_type]}</strong>
            <div>
              <button
                type="button"
                className="icon-button"
                aria-label={`Mover bloco ${i + 1} para cima`}
                disabled={!i}
                onClick={() => apply(moveItem(blocks, i, i - 1))}
              >
                <ArrowUp size={16} />
              </button>
              <button
                type="button"
                className="icon-button"
                aria-label={`Mover bloco ${i + 1} para baixo`}
                disabled={i === blocks.length - 1}
                onClick={() => apply(moveItem(blocks, i, i + 1))}
              >
                <ArrowDown size={16} />
              </button>
              <button
                type="button"
                className="icon-button"
                aria-label={`Duplicar bloco ${i + 1}`}
                onClick={() => {
                  const next = [...blocks];
                  next.splice(i + 1, 0, {
                    ...structuredClone(b),
                    id: crypto.randomUUID(),
                  });
                  apply(next);
                }}
              >
                <Copy size={16} />
              </button>
              <button
                type="button"
                className="icon-button danger"
                aria-label={`Excluir bloco ${i + 1}`}
                onClick={() => apply(blocks.filter((_, n) => n !== i))}
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
          <div className="editor-block-body">
            {!["heading", "subheading", "divider", "spacer"].includes(
              b.block_type,
            ) && (
              <Field label="Título do bloco (opcional)">
                <input
                  value={b.content.title || ""}
                  onChange={(e) => update(i, { title: e.target.value })}
                />
              </Field>
            )}
            {[
              "heading",
              "subheading",
              "paragraph",
              "rich_text",
              "code",
              "metric",
            ].includes(b.block_type) && (
              <Field
                label={
                  b.block_type === "code"
                    ? "Código (exibido como texto, nunca executado)"
                    : "Texto"
                }
                hint={
                  b.block_type === "rich_text"
                    ? "Use **negrito** e [texto](https://…). HTML é exibido como texto."
                    : undefined
                }
              >
                <textarea
                  rows={b.block_type === "code" ? 8 : 4}
                  value={b.content.text || ""}
                  onChange={(e) => update(i, { text: e.target.value })}
                />
              </Field>
            )}
            {b.block_type === "code" && (
              <Field label="Linguagem">
                <input
                  value={b.content.language || ""}
                  onChange={(e) => update(i, { language: e.target.value })}
                />
              </Field>
            )}
            {mediaTypes.includes(b.block_type) && (
              <>
                <Field
                  label={
                    b.block_type === "comparison"
                      ? "Imagens: selecione primeiro a original e depois a final"
                      : "Imagens"
                  }
                >
                  <MediaPicker
                    value={b.content.media_ids || []}
                    multiple={!["image", "banner"].includes(b.block_type)}
                    onChange={(ids) => update(i, { media_ids: ids })}
                  />
                </Field>
                <Field label="Legenda">
                  <input
                    value={b.content.caption || ""}
                    onChange={(e) => update(i, { caption: e.target.value })}
                  />
                </Field>
              </>
            )}
            {b.block_type === "comparison" && (
              <div className="form-row">
                <Field label="Rótulo original">
                  <input
                    value={b.content.label || ""}
                    placeholder="Original"
                    onChange={(e) => update(i, { label: e.target.value })}
                  />
                </Field>
                <Field label="Rótulo final">
                  <input
                    value={b.content.after_label || ""}
                    placeholder="Ambientada"
                    onChange={(e) => update(i, { after_label: e.target.value })}
                  />
                </Field>
              </div>
            )}
            {b.block_type === "pdp" && (
              <>
                <Field label="Capturas desktop">
                  <MediaPicker
                    value={b.content.desktop_ids || []}
                    onChange={(ids) => update(i, { desktop_ids: ids })}
                  />
                </Field>
                <Field label="Capturas mobile">
                  <MediaPicker
                    value={b.content.mobile_ids || []}
                    onChange={(ids) => update(i, { mobile_ids: ids })}
                  />
                </Field>
                <Field label="Legenda">
                  <input
                    value={b.content.caption || ""}
                    onChange={(e) => update(i, { caption: e.target.value })}
                  />
                </Field>
              </>
            )}
            {["video", "embed", "link"].includes(b.block_type) && (
              <>
                <Field
                  label={
                    b.block_type === "video"
                      ? "URL HTTPS do arquivo de vídeo (MP4 / WebM)"
                      : "URL HTTPS"
                  }
                >
                  <input
                    type="url"
                    value={b.content.url || ""}
                    placeholder="https://"
                    onChange={(e) => update(i, { url: e.target.value })}
                  />
                </Field>
                <Field label="Texto do link / título acessível">
                  <input
                    value={b.content.label || ""}
                    onChange={(e) => update(i, { label: e.target.value })}
                  />
                </Field>
                {b.block_type === "embed" && (
                  <p className="small muted">
                    Somente links autorais e autorizados. A prévia restringe
                    scripts e acesso à sessão; incorporação depende da política
                    do destino.
                  </p>
                )}
              </>
            )}
            {listTypes.includes(b.block_type) && (
              <div className="list-editor">
                {(b.content.items || []).map((item, n) => (
                  <div key={n} className="list-editor-item">
                    <Field
                      label={
                        b.block_type === "faq"
                          ? `Pergunta ${n + 1}`
                          : `Item ${n + 1}`
                      }
                    >
                      <input
                        value={item.title}
                        onChange={(e) =>
                          update(i, {
                            items: b.content.items!.map((x, k) =>
                              k === n ? { ...x, title: e.target.value } : x,
                            ),
                          })
                        }
                      />
                    </Field>
                    {b.block_type !== "technologies" && (
                      <Field
                        label={
                          b.block_type === "faq"
                            ? "Resposta"
                            : "Descrição / valor"
                        }
                      >
                        <textarea
                          rows={2}
                          value={item.text}
                          onChange={(e) =>
                            update(i, {
                              items: b.content.items!.map((x, k) =>
                                k === n ? { ...x, text: e.target.value } : x,
                              ),
                            })
                          }
                        />
                      </Field>
                    )}
                    <div className="inline-actions">
                      <button
                        type="button"
                        className="icon-button"
                        disabled={!n}
                        aria-label={`Mover item ${n + 1} para cima`}
                        onClick={() =>
                          update(i, {
                            items: moveItem(b.content.items!, n, n - 1),
                          })
                        }
                      >
                        <ArrowUp size={15} />
                      </button>
                      <button
                        type="button"
                        className="icon-button"
                        aria-label={`Excluir item ${n + 1}`}
                        onClick={() =>
                          update(i, {
                            items: b.content.items!.filter((_, k) => k !== n),
                          })
                        }
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                ))}
                <button
                  type="button"
                  className="button secondary small-button"
                  onClick={() =>
                    update(i, {
                      items: [
                        ...(b.content.items || []),
                        { title: "", text: "" },
                      ],
                    })
                  }
                >
                  <Plus size={16} />
                  Adicionar item
                </button>
              </div>
            )}
            <details className="block-appearance">
              <summary>Layout e espaçamento</summary>
              <div className="form-row">
                <Field label="Largura">
                  <select
                    value={b.content.width || "normal"}
                    onChange={(e) =>
                      update(i, {
                        width: e.target.value as BlockContent["width"],
                      })
                    }
                  >
                    <option value="normal">Leitura</option>
                    <option value="wide">Ampla</option>
                    <option value="full">Completa</option>
                  </select>
                </Field>
                <Field label="Alinhamento">
                  <select
                    value={b.content.align || "left"}
                    onChange={(e) =>
                      update(i, {
                        align: e.target.value as BlockContent["align"],
                      })
                    }
                  >
                    <option value="left">Esquerda</option>
                    <option value="center">Centro</option>
                  </select>
                </Field>
                <Field label="Espaçamento">
                  <select
                    value={b.content.spacing || "medium"}
                    onChange={(e) =>
                      update(i, {
                        spacing: e.target.value as BlockContent["spacing"],
                      })
                    }
                  >
                    <option value="small">Pequeno</option>
                    <option value="medium">Médio</option>
                    <option value="large">Grande</option>
                  </select>
                </Field>
                {b.block_type === "image_grid" && (
                  <Field label="Colunas">
                    <select
                      value={b.content.columns || 2}
                      onChange={(e) =>
                        update(i, { columns: Number(e.target.value) as 2 | 3 })
                      }
                    >
                      <option value="2">2</option>
                      <option value="3">3</option>
                    </select>
                  </Field>
                )}
              </div>
            </details>
          </div>
        </section>
      ))}
      <div className="add-block">
        <label className="sr-only" htmlFor="block-type">
          Tipo de bloco
        </label>
        <select
          id="block-type"
          value={type}
          onChange={(e) => setType(e.target.value as BlockType)}
        >
          {blockTypes.map((t) => (
            <option key={t} value={t}>
              {blockLabels[t]}
            </option>
          ))}
        </select>
        <button
          type="button"
          className="button secondary"
          onClick={() =>
            apply([
              ...blocks,
              {
                id: crypto.randomUUID(),
                block_type: type,
                content: {},
                sort_order: blocks.length,
              },
            ])
          }
        >
          <Plus size={17} />
          Adicionar bloco
        </button>
      </div>
    </section>
  );
}
