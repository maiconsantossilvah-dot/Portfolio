import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
test("acessibilidade automatizada nos temas e cores permitidas", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await expect(
    page.getByRole("heading", {
      name: "Design, conteúdo e tecnologia para e-commerce.",
    }),
  ).toBeVisible();
  for (const theme of ["dark", "light"]) {
    if (theme === "light")
      await page.getByRole("button", { name: "Ativar tema claro" }).click();
    for (const accent of ["blue", "violet", "teal"]) {
      await page.evaluate((color) => {
        document.documentElement.dataset.accent = color;
      }, accent);
      const result = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
        .analyze();
      expect(
        result.violations.map((v) => ({
          theme,
          accent,
          id: v.id,
          nodes: v.nodes.map((n) => n.target),
        })),
      ).toEqual([]);
    }
  }
});
