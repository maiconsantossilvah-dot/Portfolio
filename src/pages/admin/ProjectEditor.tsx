import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useBlocker, useNavigate, useParams } from "react-router-dom";
import { ClipboardPaste, Eye, Save } from "lucide-react";
import {
  getAutosavePreference,
  getProject,
  saveProject,
  updateRecord,
} from "../../repositories/content";
import { useSite } from "../../hooks/SiteContext";
import { userError } from "../../lib/supabase";
import { projectSchema, slugify } from "../../lib/validation";
import type { Project } from "../../types/content";
import { statusLabels } from "../../config/defaults";
import {
  Empty,
  ErrorState,
  Field,
  Loading,
  Modal,
  useToast,
} from "../../components/ui";
import MediaPicker from "../../components/admin/MediaPicker";
import ProjectPasteDialog from "../../components/admin/ProjectPasteDialog";
import BlockEditor from "../../components/editors/BlockEditor";
import { CaseContent } from "../CaseStudy";
function blank(): Project {
  const id = crypto.randomUUID();
  return {
    id,
    title: "",
    slug: "",
    excerpt: "",
    description: "",
    project_type: "case",
    cover_media_id: null,
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
    created_at: new Date().toISOString(),
    updated_at: "",
    published_at: null,
    product_name: "",
    authorship: "",
    blocks: [],
    category_ids: [],
    technology_ids: [],
  };
}
function fingerprint(p: Project) {
  const { updated_at, created_at, published_at, ...content } = p;
  void updated_at;
  void created_at;
  void published_at;
  return JSON.stringify(content);
}
export default function ProjectEditor() {
  const { id = "novo" } = useParams();
  const [project, setProject] = useState<Project | null>(null);
  const [baseline, setBaseline] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState(false);
  const [pasting, setPasting] = useState(false);
  const [validation, setValidation] = useState<string[]>([]);
  const [autosave, setAutosave] = useState(true);
  const [savedText, setSavedText] = useState("");
  const saveLock = useRef(false);
  const attempt = useRef("");
  const savedNavigation = useRef(false);
  const { data } = useSite();
  const toast = useToast();
  const navigate = useNavigate();
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    const load =
      id === "novo" ? Promise.resolve(blank()) : getProject(id, true);
    load
      .then((p) => {
        if (active) {
          setProject(p);
          setBaseline(p ? fingerprint(p) : "");
        }
      })
      .catch((e) => {
        if (active) setError(e);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [id]);
  useEffect(() => {
    void getAutosavePreference()
      .then(setAutosave)
      .catch(() => {});
  }, []);
  const dirty = !!project && fingerprint(project) !== baseline;
  const blocker = useBlocker(() => dirty && !savedNavigation.current);
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  const save = useCallback(
    async (status?: Project["status"], automatic = false) => {
      if (!project || saveLock.current) return;
      const snapshot = { ...project, status: status || project.status };
      const result = projectSchema.safeParse(snapshot);
      if (!result.success) {
        if (!automatic)
          setValidation(result.error.issues.map((x) => x.message));
        return;
      }
      saveLock.current = true;
      setBusy(true);
      setValidation([]);
      attempt.current = fingerprint(snapshot);
      try {
        const saved = await saveProject(snapshot);
        setProject(saved);
        setBaseline(fingerprint(saved));
        setSavedText(
          `Salvo às ${new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`,
        );
        if (!automatic)
          toast(
            status === "published"
              ? "Projeto publicado. Já está disponível no portfólio."
              : "Projeto salvo.",
          );
        if (id === "novo") {
          savedNavigation.current = true;
          navigate(`/admin/projetos/${saved.id}`, { replace: true });
          queueMicrotask(() => {
            savedNavigation.current = false;
          });
        }
      } catch (e) {
        setSavedText("Falha ao salvar. Suas alterações continuam nesta tela.");
        toast(userError(e), true);
      } finally {
        saveLock.current = false;
        setBusy(false);
      }
    },
    [project, toast, id, navigate],
  );
  useEffect(() => {
    if (
      !autosave ||
      !dirty ||
      busy ||
      pasting ||
      !project ||
      project.status !== "draft" ||
      attempt.current === fingerprint(project)
    )
      return;
    const timer = setTimeout(() => {
      void save(undefined, true);
    }, 2200);
    return () => clearTimeout(timer);
  }, [autosave, dirty, busy, pasting, project, save]);
  const update = (patch: Partial<Project>) =>
    setProject((p) => (p ? { ...p, ...patch } : p));
  if (loading) return <Loading />;
  if (error)
    return <ErrorState error={error} retry={() => location.reload()} />;
  if (!project) return <Empty title="Projeto não encontrado" />;
  return (
    <>
      <div className="editor-topbar">
        <div>
          <Link className="text-link small" to="/admin/projetos">
            Projetos
          </Link>
          <h1>{id === "novo" ? "Novo projeto" : "Editar projeto"}</h1>
          <span className={`badge ${project.status}`}>
            {statusLabels[project.status]}
          </span>
          <span className="save-status" role="status">
            {busy ? "Salvando…" : dirty ? "Alterações não salvas" : savedText}
          </span>
        </div>
        <div className="editor-actions">
          {id === "novo" && (
            <button
              className="button secondary"
              disabled={busy}
              onClick={() => setPasting(true)}
            >
              <ClipboardPaste size={17} aria-hidden="true" />
              Colar conteúdo
            </button>
          )}
          <button className="button secondary" onClick={() => setPreview(true)}>
            <Eye size={17} />
            Prévia
          </button>
          <button
            className="button secondary"
            disabled={busy}
            onClick={() => void save()}
          >
            <Save size={17} />
            Salvar
          </button>
          {project.status === "published" ? (
            <button
              className="button primary"
              disabled={busy}
              onClick={() => void save("draft")}
            >
              Despublicar
            </button>
          ) : (
            <button
              className="button primary"
              disabled={busy}
              onClick={() => void save("published")}
            >
              Publicar
            </button>
          )}
        </div>
      </div>
      {validation.length > 0 && (
        <div className="notice error" role="alert">
          <div>
            <strong>Confira antes de salvar:</strong>
            <ul>
              {[...new Set(validation)].map((x) => (
                <li key={x}>{x}</li>
              ))}
            </ul>
          </div>
        </div>
      )}
      <fieldset className="editor-fieldset" disabled={busy}>
        <div className="editor-layout">
          <div>
            <section className="panel">
              <h2>Informações do projeto</h2>
              <Field label="Título *">
                <input
                  value={project.title}
                  maxLength={180}
                  onChange={(e) =>
                    update({
                      title: e.target.value,
                      ...(!project.updated_at
                        ? { slug: slugify(e.target.value) }
                        : {}),
                    })
                  }
                />
              </Field>
              <Field label="Endereço (slug) *">
                <input
                  value={project.slug}
                  onChange={(e) => update({ slug: e.target.value })}
                />
              </Field>
              <Field
                label="Resumo *"
                hint="Até 500 caracteres; aparece nos cards."
              >
                <textarea
                  rows={3}
                  maxLength={500}
                  value={project.excerpt}
                  onChange={(e) => update({ excerpt: e.target.value })}
                />
              </Field>
              <Field label="Descrição / contexto">
                <textarea
                  rows={5}
                  value={project.description}
                  onChange={(e) => update({ description: e.target.value })}
                />
              </Field>
              <div className="form-row">
                <Field label="Tipo">
                  <select
                    value={project.project_type}
                    onChange={(e) =>
                      update({
                        project_type: e.target.value as Project["project_type"],
                      })
                    }
                  >
                    <option value="case">Estudo de caso</option>
                    <option value="pdp">Conteúdo rico / PDP</option>
                    <option value="images">Imagens e design</option>
                    <option value="app">Aplicação autoral</option>
                  </select>
                </Field>
                <Field label="Data de realização">
                  <input
                    type="date"
                    value={project.project_date || ""}
                    onChange={(e) =>
                      update({ project_date: e.target.value || null })
                    }
                  />
                </Field>
              </div>
            </section>
            <section className="panel">
              <h2>Contexto e autoria</h2>
              <div className="form-row">
                <Field label="Produto">
                  <input
                    value={project.product_name}
                    onChange={(e) => update({ product_name: e.target.value })}
                  />
                </Field>
                <Field label="Marca">
                  <input
                    value={project.brand_name}
                    onChange={(e) => update({ brand_name: e.target.value })}
                  />
                </Field>
              </div>
              <Field label="Empresa ou contexto">
                <input
                  value={project.client_name}
                  onChange={(e) => update({ client_name: e.target.value })}
                />
              </Field>
              <Field
                label="Minha contribuição"
                hint="Diferencie seu conteúdo do desenvolvimento integral da PDP ou do site."
              >
                <textarea
                  value={project.contribution}
                  onChange={(e) => update({ contribution: e.target.value })}
                />
              </Field>
              <Field label="Observações sobre autoria / autorização">
                <textarea
                  value={project.authorship}
                  onChange={(e) => update({ authorship: e.target.value })}
                />
              </Field>
            </section>
            <BlockEditor
              blocks={project.blocks}
              onChange={(blocks) => update({ blocks })}
            />
            <section className="panel">
              <h2>Links e busca</h2>
              <Field label="Projeto publicado (HTTPS)">
                <input
                  type="url"
                  value={project.external_url}
                  onChange={(e) => update({ external_url: e.target.value })}
                />
              </Field>
              <Field label="Demonstração autorizada (HTTPS)">
                <input
                  type="url"
                  value={project.demo_url}
                  onChange={(e) => update({ demo_url: e.target.value })}
                />
              </Field>
              <Field label="Título SEO">
                <input
                  maxLength={180}
                  value={project.seo_title}
                  onChange={(e) => update({ seo_title: e.target.value })}
                />
              </Field>
              <Field label="Descrição SEO">
                <textarea
                  maxLength={500}
                  value={project.seo_description}
                  onChange={(e) => update({ seo_description: e.target.value })}
                />
              </Field>
            </section>
          </div>
          <aside className="editor-sidebar">
            <section className="panel">
              <h2>Imagem de capa *</h2>
              <MediaPicker
                multiple={false}
                value={project.cover_media_id ? [project.cover_media_id] : []}
                onChange={(ids) => update({ cover_media_id: ids[0] || null })}
                label="Selecionar capa"
              />
              <p className="small muted">
                Salve o rascunho e envie as imagens pela{" "}
                <Link className="text-link" to="/admin/midia">
                  Biblioteca de mídia
                </Link>
                . O texto alternativo é editado na biblioteca.
              </p>
            </section>
            <section className="panel">
              <h2>Organização</h2>
              <fieldset className="field">
                <legend>Categorias *</legend>
                <div className="checkbox-list">
                  {data.categories.map((c) => (
                    <label key={c.id}>
                      <input
                        type="checkbox"
                        checked={project.category_ids.includes(c.id)}
                        onChange={(e) =>
                          update({
                            category_ids: e.target.checked
                              ? [...project.category_ids, c.id]
                              : project.category_ids.filter(
                                  (id) => id !== c.id,
                                ),
                          })
                        }
                      />
                      {c.name}
                    </label>
                  ))}
                </div>
              </fieldset>
              <fieldset className="field">
                <legend>Tecnologias</legend>
                <div className="checkbox-list">
                  {data.technologies.map((t) => (
                    <label key={t.id}>
                      <input
                        type="checkbox"
                        checked={project.technology_ids.includes(t.id)}
                        onChange={(e) =>
                          update({
                            technology_ids: e.target.checked
                              ? [...project.technology_ids, t.id]
                              : project.technology_ids.filter(
                                  (id) => id !== t.id,
                                ),
                          })
                        }
                      />
                      {t.name}
                    </label>
                  ))}
                </div>
              </fieldset>
              <label className="checkbox">
                <input
                  type="checkbox"
                  checked={project.featured}
                  onChange={(e) => update({ featured: e.target.checked })}
                />
                Destacar na página inicial
              </label>
              <Field label="Ordem de exibição">
                <input
                  type="number"
                  min={0}
                  value={project.sort_order}
                  onChange={(e) =>
                    update({ sort_order: Math.max(0, Number(e.target.value)) })
                  }
                />
              </Field>
              <label className="checkbox">
                <input
                  type="checkbox"
                  checked={autosave}
                  onChange={(e) => {
                    const enabled = e.target.checked;
                    setAutosave(enabled);
                    void updateRecord("admin_settings", {
                      id: 1,
                      autosave: enabled,
                    }).catch((err) => toast(userError(err), true));
                  }}
                />
                Autosave de rascunhos
              </label>
              <p className="small muted">
                Projetos publicados usam salvamento explícito. A publicação
                exige capa, resumo, categoria e referências válidas.
              </p>
            </section>
          </aside>
        </div>
      </fieldset>
      {pasting && id === "novo" && (
        <ProjectPasteDialog
          project={project}
          taxonomy={data}
          replacesEdits={dirty}
          onClose={() => setPasting(false)}
          onApply={(draft) => {
            setProject(draft);
            setValidation([]);
            setPasting(false);
            toast(
              "Rascunho preenchido. Confira os campos e selecione as imagens.",
            );
          }}
        />
      )}
      {preview && (
        <Modal
          title="Pré-visualização privada"
          wide
          onClose={() => setPreview(false)}
        >
          <CaseContent project={project} preview />
        </Modal>
      )}
      {blocker.state === "blocked" && (
        <Modal title="Alterações não salvas" onClose={() => blocker.reset()}>
          <p>
            Há alterações que ainda não foram salvas. Deseja sair e
            descartá-las?
          </p>
          <div className="modal-actions">
            <button
              className="button secondary"
              onClick={() => blocker.reset()}
            >
              Continuar editando
            </button>
            <button
              className="button danger-button"
              onClick={() => blocker.proceed()}
            >
              Descartar e sair
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
