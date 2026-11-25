import { useRef, useState } from "react";
import { Download, Upload } from "lucide-react";
import type { Backup } from "../../types/content";
import {
  backupSchema,
  downloadJson,
  exportBackup,
  importBackup,
} from "../../services/backup";
import { userError } from "../../lib/supabase";
import { useSite } from "../../hooks/SiteContext";
import { Modal, useToast } from "../ui";
export default function BackupPanel() {
  const [busy, setBusy] = useState(false);
  const [backup, setBackup] = useState<Backup | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const [confirmed, setConfirmed] = useState(false);
  const toast = useToast();
  const site = useSite();
  const loadFile = async (file?: File) => {
    if (!file) return;
    try {
      if (file.size > 10 * 1024 * 1024)
        throw new Error("Arquivo maior que 10 MB.");
      setBackup(backupSchema.parse(JSON.parse(await file.text())));
      setConfirmed(false);
    } catch {
      toast(
        "Backup inválido. Verifique o formato, as URLs, os campos e o limite de 10 MB.",
        true,
      );
    } finally {
      if (input.current) input.current.value = "";
    }
  };
  return (
    <section className="panel settings-form backup-panel">
      <h2>Backup e portabilidade</h2>
      <p>
        Exporte conteúdos, blocos, relações e metadados. Senhas, sessões e
        credenciais não fazem parte do arquivo.
      </p>
      <p className="small muted">
        Os arquivos do Storage precisam de backup separado. Para restaurar em
        outro Supabase, copie primeiro os arquivos para os mesmos caminhos no
        bucket privado. A importação é transacional e mescla registros por UUID,
        sobrescrevendo os correspondentes; registros ausentes no backup são
        preservados.
      </p>
      <div className="inline-actions">
        <button
          className="button secondary"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            try {
              downloadJson(await exportBackup());
              toast("Backup exportado.");
            } catch (e) {
              toast(userError(e), true);
            } finally {
              setBusy(false);
            }
          }}
        >
          <Download size={17} />
          Exportar JSON
        </button>
        <button
          className="button secondary"
          disabled={busy}
          onClick={() => input.current?.click()}
        >
          <Upload size={17} />
          Importar backup
        </button>
      </div>
      <input
        hidden
        type="file"
        accept=".json,application/json"
        ref={input}
        onChange={(e) => void loadFile(e.target.files?.[0])}
      />
      {backup && (
        <Modal title="Revisar importação" onClose={() => setBackup(null)}>
          <p>
            Backup de {new Date(backup.exported_at).toLocaleString("pt-BR")}.
          </p>
          <dl className="spec-list">
            {[
              ["Projetos", backup.projects.length],
              [
                "Blocos",
                backup.projects.reduce((n, p) => n + p.blocks.length, 0),
              ],
              ["Categorias", backup.categories.length],
              ["Tecnologias", backup.technologies.length],
              ["Serviços", backup.services.length],
              ["Referências de mídia", backup.media.length],
            ].map(([key, value]) => (
              <div key={key}>
                <dt>{key}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
          <p>
            Perfil e configurações públicas também serão substituídos. Projetos
            publicados no backup voltarão a ficar públicos. Exporte o conteúdo
            atual antes de continuar.
          </p>
          <label className="checkbox">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
            />
            Revisei o resumo e confirmo a aplicação destes conteúdos.
          </label>
          <div className="modal-actions">
            <button
              className="button secondary"
              disabled={busy}
              onClick={() => setBackup(null)}
            >
              Cancelar
            </button>
            <button
              className="button primary"
              disabled={busy || !confirmed}
              onClick={async () => {
                setBusy(true);
                try {
                  await importBackup(backup);
                  setBackup(null);
                  site.reload();
                  toast("Backup importado integralmente.");
                } catch (e) {
                  toast(userError(e), true);
                } finally {
                  setBusy(false);
                }
              }}
            >
              Aplicar importação
            </button>
          </div>
        </Modal>
      )}
    </section>
  );
}
