import { describe, expect, it } from "vitest";
import { backupSchema } from "../src/services/backup";
import { defaultProfile, defaultSettings } from "../src/config/defaults";
const backup = () => ({
  version: 1,
  exported_at: new Date().toISOString(),
  projects: [],
  media: [],
  categories: [],
  technologies: [],
  services: [],
  profile: defaultProfile,
  settings: defaultSettings,
});
describe("Validação e portabilidade de backup", () => {
  it("aceita conteúdo inicial sem credenciais e rejeita versões não suportadas", () => {
    expect(backupSchema.safeParse(backup()).success).toBe(true);
    expect(backupSchema.safeParse({ ...backup(), version: 99 }).success).toBe(
      false,
    );
  });
  it("rejeita canais perigosos e seções repetidas", () => {
    expect(
      backupSchema.safeParse({
        ...backup(),
        profile: {
          ...defaultProfile,
          contacts: [{ label: "Ataque", url: "javascript:alert(1)" }],
        },
      }).success,
    ).toBe(false);
    expect(
      backupSchema.safeParse({
        ...backup(),
        settings: {
          ...defaultSettings,
          sections: Array(4).fill({ id: "projects", visible: true }),
        },
      }).success,
    ).toBe(false);
  });
  it("remove campos estranhos como tokens em vez de exportá-los", () => {
    const result = backupSchema.parse({
      ...backup(),
      access_token: "NUNCA_EXPORTAR",
      profile: { ...defaultProfile, password: "NUNCA_EXPORTAR" },
    });
    expect(JSON.stringify(result)).not.toContain("NUNCA_EXPORTAR");
  });
});
