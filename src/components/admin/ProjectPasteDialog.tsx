import { useState } from "react";
import { Copy } from "lucide-react";
import { blockLabels } from "../../config/defaults";
import promptText from "../../config/project-draft-prompt.txt?raw";
import {
  draftInputLimit,
  prepareProjectDraft,
} from "../../services/projectDraft";
import type { Project, SiteData } from "../../types/content";
import { Field, Modal } from "../ui";

export default function ProjectPasteDialog({
  project,
  taxonomy,
  replacesEdits,
  onApply,
  onClose,
}: {
  project: Project;
  taxonomy: Pick<SiteData, "categories" | "technologies">;
  replacesEdits: boolean;
  onApply: (project: Project) => void;
  onClose: () => void;
}) {
  const [response, setResponse] = useState("");
  const [result, setResult] = useState<ReturnType<
    typeof prepareProjectDraft
  > | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [copyStatus, setCopyStatus] = useState("");
  const prompt = [
    promptText.trim(),
    "OPÇÕES CADASTRADAS NO MEU PAINEL",
    `Categorias: ${taxonomy.categories.map((item) => item.name).join("; ") || "confira os nomes quando disponíveis"}.`,
    `Tecnologias: ${taxonomy.technologies.map((item) => item.name).join("; ") || "confira os nomes quando disponíveis"}.`,
  ].join("\n\n");
  const data = result?.data;

  async function copyPrompt() {
    try {
      await navigator.clipboard.writeText(prompt);
      setCopyStatus("Prompt copiado.");
    } catch {
      setShowPrompt(true);
      setCopyStatus("Selecione e copie o prompt abaixo.");
    }
  }

  return (
    <Modal title="Colar conteúdo do projeto" onClose={onClose}>
      <p>
        Envie o prompt e seus textos ou a PDP ao ChatGPT. Cole a resposta aqui
        para conferir os campos e blocos antes de preencher.
      </p>
      <div className="inline-actions">
        <button
          className="button secondary small-button"
          type="button"
          onClick={() => void copyPrompt()}
        >
          <Copy size={16} aria-hidden="true" /> Copiar prompt
        </button>
        <button
          className="text-button"
          type="button"
          aria-expanded={showPrompt}
          onClick={() => setShowPrompt(!showPrompt)}
        >
          {showPrompt ? "Ocultar prompt" : "Ver prompt"}
        </button>
        <span className="small muted" role="status">
          {copyStatus}
        </span>
      </div>
      {showPrompt && (
        <Field label="Prompt para o ChatGPT">
          <textarea
            className="draft-paste-text"
            rows={7}
            value={prompt}
            readOnly
          />
        </Field>
      )}
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (data) onApply(data.project);
          else setResult(prepareProjectDraft(response, project, taxonomy));
        }}
      >
        <Field
          label="Resposta do ChatGPT"
          hint="Pode colar a resposta inteira se houver um único bloco JSON."
        >
          <textarea
            className="draft-paste-text"
            rows={8}
            spellCheck={false}
            maxLength={draftInputLimit}
            value={response}
            onChange={(event) => {
              setResponse(event.target.value);
              setResult(null);
            }}
          />
        </Field>
        {result?.errors && (
          <div className="notice error" role="alert">
            <div>
              <strong>Confira a resposta antes de preencher.</strong>
              <ul>
                {result.errors.slice(0, 8).map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
              {result.errors.length > 8 && (
                <p>Há mais campos a conferir no JSON.</p>
              )}
            </div>
          </div>
        )}
        {data && (
          <div className="notice" role="status" aria-live="polite">
            <div>
              <strong>{data.project.title}</strong>
              <p>{data.project.excerpt}</p>
              <p>
                {data.project.blocks.length}{" "}
                {data.project.blocks.length === 1 ? "bloco" : "blocos"} ·{" "}
                {data.project.category_ids.length}{" "}
                {data.project.category_ids.length === 1
                  ? "categoria encontrada"
                  : "categorias encontradas"}
              </p>
              {data.project.blocks.length > 0 && (
                <ol className="draft-paste-blocks">
                  {data.project.blocks.map((block) => (
                    <li key={block.id}>
                      {blockLabels[block.block_type]}
                      {block.content.title ? ` — ${block.content.title}` : ""}
                    </li>
                  ))}
                </ol>
              )}
              {data.unmatchedCategories.length > 0 && (
                <p>
                  Categorias para escolher no painel:{" "}
                  {data.unmatchedCategories.join(", ")}.
                </p>
              )}
              {data.unmatchedTechnologies.length > 0 && (
                <p>
                  Tecnologias para escolher no painel:{" "}
                  {data.unmatchedTechnologies.join(", ")}.
                </p>
              )}
              <p>
                Depois, selecione a capa
                {data.blocksWaitingForImages > 0
                  ? ` e adicione as imagens em ${data.blocksWaitingForImages} ${data.blocksWaitingForImages === 1 ? "bloco" : "blocos"}`
                  : ""}
                .
              </p>
              {replacesEdits && (
                <p>
                  Preencher vai substituir o conteúdo que você já digitou neste
                  novo projeto.
                </p>
              )}
            </div>
          </div>
        )}
        <div className="modal-actions">
          <button className="button secondary" type="button" onClick={onClose}>
            Cancelar
          </button>
          <button
            className="button primary"
            type="submit"
            disabled={!response.trim()}
          >
            {data ? "Preencher rascunho" : "Conferir conteúdo"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
