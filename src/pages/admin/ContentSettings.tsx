import { useState, type FormEvent } from "react";
import { ArrowDown, ArrowUp, Plus, Save, Trash2 } from "lucide-react";
import { z } from "zod";
import { useSite } from "../../hooks/SiteContext";
import { useAsync } from "../../hooks/useAsync";
import { getSiteData, updateRecord } from "../../repositories/content";
import { moveItem, safeUrl } from "../../lib/validation";
import { userError } from "../../lib/supabase";
import type { SiteData } from "../../types/content";
import { ErrorState, Field, Loading, useToast } from "../../components/ui";
import MediaPicker from "../../components/admin/MediaPicker";
import BackupPanel from "../../components/admin/BackupPanel";
type Kind = "about" | "home" | "contacts" | "settings";
const names = {
  about: "Sobre mim",
  home: "Página inicial",
  contacts: "Contatos",
  settings: "Configurações",
};
export default function ContentSettings({ kind }: { kind: Kind }) {
  const state = useAsync(getSiteData, null);
  if (state.loading) return <Loading />;
  if (state.error)
    return <ErrorState error={state.error} retry={state.reload} />;
  return state.data ? (
    <SettingsForm key={kind} kind={kind} initial={state.data} />
  ) : null;
}
function SettingsForm({ kind, initial }: { kind: Kind; initial: SiteData }) {
  const [profile, setProfile] = useState(initial.profile);
  const [settings, setSettings] = useState(initial.settings);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const toast = useToast();
  const site = useSite();
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    const contactSchema = z
      .array(
        z.object({
          label: z.string().trim().min(1),
          url: z.string().refine((url) => !!safeUrl(url, true)),
        }),
      )
      .max(20);
    if (
      (kind === "contacts" &&
        !contactSchema.safeParse(profile.contacts).success) ||
      !profile.name.trim() ||
      !settings.hero_title.trim()
    ) {
      setError(
        "Preencha os nomes e utilize contatos HTTPS, mailto: ou tel: válidos.",
      );
      return;
    }
    setBusy(true);
    try {
      await updateRecord(
        kind === "about" || kind === "contacts"
          ? "public_profile"
          : "site_settings",
        kind === "about" || kind === "contacts" ? profile : settings,
      );
      site.reload();
      toast("Alterações salvas. O site já pode carregar o novo conteúdo.");
    } catch (e) {
      setError(userError(e));
    } finally {
      setBusy(false);
    }
  };
  const sectionNames = {
    projects: "Projetos",
    services: "Serviços",
    about: "Sobre mim",
    contact: "Contato",
  };
  return (
    <>
      <div className="admin-heading">
        <div>
          <p className="eyebrow">Conteúdo sempre atualizado</p>
          <h1>{names[kind]}</h1>
          <p>Altere pelo painel. Sem commits ou novo deployment.</p>
        </div>
      </div>
      <form onSubmit={submit} className="settings-form panel">
        <fieldset disabled={busy}>
          {kind === "about" && (
            <>
              <div className="form-row">
                <Field label="Nome profissional *">
                  <input
                    required
                    value={profile.name}
                    onChange={(e) =>
                      setProfile({ ...profile, name: e.target.value })
                    }
                  />
                </Field>
                <Field label="Nome completo *">
                  <input
                    required
                    value={profile.full_name}
                    onChange={(e) =>
                      setProfile({ ...profile, full_name: e.target.value })
                    }
                  />
                </Field>
              </div>
              <Field label="Título profissional">
                <input
                  value={profile.role}
                  onChange={(e) =>
                    setProfile({ ...profile, role: e.target.value })
                  }
                />
              </Field>
              <Field label="Biografia">
                <textarea
                  rows={12}
                  value={profile.bio}
                  onChange={(e) =>
                    setProfile({ ...profile, bio: e.target.value })
                  }
                />
              </Field>
              <Field label="Nota sobre projetos autorais">
                <textarea
                  value={profile.author_note}
                  onChange={(e) =>
                    setProfile({ ...profile, author_note: e.target.value })
                  }
                />
              </Field>
              <Field label="Foto">
                <MediaPicker
                  multiple={false}
                  value={profile.photo_media_id ? [profile.photo_media_id] : []}
                  onChange={(ids) =>
                    setProfile({ ...profile, photo_media_id: ids[0] || null })
                  }
                />
              </Field>
            </>
          )}
          {kind === "home" && (
            <>
              <Field label="Título principal *">
                <textarea
                  required
                  rows={3}
                  value={settings.hero_title}
                  onChange={(e) =>
                    setSettings({ ...settings, hero_title: e.target.value })
                  }
                />
              </Field>
              <Field label="Descrição">
                <textarea
                  rows={4}
                  value={settings.hero_description}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      hero_description: e.target.value,
                    })
                  }
                />
              </Field>
              <label className="checkbox">
                <input
                  type="checkbox"
                  checked={settings.available}
                  onChange={(e) =>
                    setSettings({ ...settings, available: e.target.checked })
                  }
                />
                Disponível para projetos
              </label>
              <Field label="Texto de disponibilidade">
                <input
                  value={settings.availability_text}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      availability_text: e.target.value,
                    })
                  }
                />
              </Field>
              <Field label="Chamada de contato">
                <input
                  value={settings.contact_title}
                  onChange={(e) =>
                    setSettings({ ...settings, contact_title: e.target.value })
                  }
                />
              </Field>
              <Field label="Descrição do contato">
                <textarea
                  value={settings.contact_description}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      contact_description: e.target.value,
                    })
                  }
                />
              </Field>
            </>
          )}
          {kind === "contacts" && (
            <>
              <p className="muted">
                Somente os canais cadastrados aparecem no site. O primeiro canal
                é usado para solicitar orçamento.
              </p>
              {profile.contacts.map((contact, i) => (
                <div className="contact-editor" key={i}>
                  <Field label={`Nome do canal ${i + 1}`}>
                    <input
                      required
                      value={contact.label}
                      placeholder="E-mail, WhatsApp, LinkedIn…"
                      onChange={(e) =>
                        setProfile({
                          ...profile,
                          contacts: profile.contacts.map((c, n) =>
                            n === i ? { ...c, label: e.target.value } : c,
                          ),
                        })
                      }
                    />
                  </Field>
                  <Field label="Endereço">
                    <input
                      required
                      value={contact.url}
                      placeholder="https://… ou mailto:…"
                      onChange={(e) =>
                        setProfile({
                          ...profile,
                          contacts: profile.contacts.map((c, n) =>
                            n === i ? { ...c, url: e.target.value } : c,
                          ),
                        })
                      }
                    />
                  </Field>
                  <div className="inline-actions">
                    <button
                      type="button"
                      className="icon-button"
                      disabled={!i}
                      aria-label={`Mover contato ${i + 1} para cima`}
                      onClick={() =>
                        setProfile({
                          ...profile,
                          contacts: moveItem(profile.contacts, i, i - 1),
                        })
                      }
                    >
                      <ArrowUp size={17} />
                    </button>
                    <button
                      type="button"
                      className="icon-button danger"
                      aria-label={`Excluir contato ${i + 1}`}
                      onClick={() =>
                        setProfile({
                          ...profile,
                          contacts: profile.contacts.filter((_, n) => n !== i),
                        })
                      }
                    >
                      <Trash2 size={17} />
                    </button>
                  </div>
                </div>
              ))}
              <button
                className="button secondary"
                type="button"
                disabled={profile.contacts.length >= 20}
                onClick={() =>
                  setProfile({
                    ...profile,
                    contacts: [...profile.contacts, { label: "", url: "" }],
                  })
                }
              >
                <Plus size={17} />
                Adicionar canal
              </button>
            </>
          )}
          {kind === "settings" && (
            <>
              <Field label="Cor de destaque">
                <select
                  value={settings.accent}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      accent: e.target.value as typeof settings.accent,
                    })
                  }
                >
                  <option value="blue">Azul</option>
                  <option value="violet">Violeta</option>
                  <option value="teal">Turquesa</option>
                </select>
              </Field>
              <Field label="Texto institucional / rodapé">
                <input
                  value={settings.institutional_text}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      institutional_text: e.target.value,
                    })
                  }
                />
              </Field>
              <Field label="Imagem de compartilhamento">
                <MediaPicker
                  multiple={false}
                  value={
                    settings.share_media_id ? [settings.share_media_id] : []
                  }
                  onChange={(ids) =>
                    setSettings({ ...settings, share_media_id: ids[0] || null })
                  }
                />
              </Field>
              <h2>Ordem e visibilidade das seções</h2>
              <div className="section-order">
                {settings.sections.map((section, i) => (
                  <div key={section.id}>
                    <label className="checkbox">
                      <input
                        type="checkbox"
                        checked={section.visible}
                        onChange={(e) =>
                          setSettings({
                            ...settings,
                            sections: settings.sections.map((s, n) =>
                              n === i ? { ...s, visible: e.target.checked } : s,
                            ),
                          })
                        }
                      />
                      {sectionNames[section.id]}
                    </label>
                    <div>
                      <button
                        type="button"
                        className="icon-button"
                        aria-label={`Mover ${sectionNames[section.id]} para cima`}
                        disabled={!i}
                        onClick={() =>
                          setSettings({
                            ...settings,
                            sections: moveItem(settings.sections, i, i - 1),
                          })
                        }
                      >
                        <ArrowUp size={17} />
                      </button>
                      <button
                        type="button"
                        className="icon-button"
                        aria-label={`Mover ${sectionNames[section.id]} para baixo`}
                        disabled={i === settings.sections.length - 1}
                        onClick={() =>
                          setSettings({
                            ...settings,
                            sections: moveItem(settings.sections, i, i + 1),
                          })
                        }
                      >
                        <ArrowDown size={17} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <p className="small muted">
                Metadados de páginas SPA têm limitações em crawlers sociais. A
                imagem é renovada por URL assinada; consulte o README.
              </p>
            </>
          )}
          {error && (
            <p role="alert" className="notice error">
              {error}
            </p>
          )}
          <div className="form-actions">
            <button className="button primary" disabled={busy}>
              <Save size={17} />
              {busy ? "Salvando…" : "Salvar alterações"}
            </button>
          </div>
        </fieldset>
      </form>
      {kind === "settings" && <BackupPanel />}
    </>
  );
}
