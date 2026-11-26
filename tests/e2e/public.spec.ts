import { expect, test } from "@playwright/test";
test("navegação pública, temas, estados vazios e rota administrativa", async ({
  page,
  isMobile,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect(
    page.getByRole("heading", {
      name: "Design, conteúdo e tecnologia para e-commerce.",
    }),
  ).toBeVisible();
  await page.keyboard.press("Tab");
  await expect(
    page.getByRole("link", { name: "Pular para o conteúdo" }),
  ).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator("#main-content")).toBeFocused();
  await expect(page).not.toHaveURL(/#main-content/);
  await page.getByRole("button", { name: "Ativar tema claro" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await page.getByRole("button", { name: "Ativar tema escuro" }).click();
  await page
    .getByRole("link", { name: "Explorar projetos", exact: true })
    .click();
  await expect(page).toHaveURL(/#\/projetos/);
  await expect(
    page.getByRole("heading", { name: "Salon Line — Liso Ostentação" }),
  ).toBeVisible();
  await page.getByRole("searchbox", { name: "Pesquisar projetos" }).fill("PDP");
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Projetos", exact: true }),
  ).toBeVisible();
  if (isMobile) {
    await page.getByRole("button", { name: "Abrir menu" }).click();
    await expect(
      page.getByRole("navigation", { name: "Navegação principal" }),
    ).toBeVisible();
  }
  await expect(
    page
      .getByRole("navigation", { name: "Navegação principal" })
      .getByRole("link", { name: /admin/i }),
  ).toHaveCount(0);
  await page.goto("/#/admin");
  await expect(
    page.getByRole("heading", { name: "Bom ter você aqui." }),
  ).toBeVisible();
  await expect(
    page.getByText("Configure a URL e a chave pública"),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: /cadastrar|registrar/i }),
  ).toHaveCount(0);
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
    "content",
    "noindex, nofollow",
  );
  expect(errors).toEqual([]);
});
test("layout sem overflow, contato real e navegação de seções", async ({
  page,
}, testInfo) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", {
      name: "Design, conteúdo e tecnologia para e-commerce.",
    }),
  ).toBeVisible();
  await expect
    .poll(() =>
      page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    )
    .toBe(true);
  await page
    .getByRole("link", { name: "Entrar em contato", exact: true })
    .click();
  await expect(page.locator("#contact")).toBeInViewport();
  await expect(
    page.getByRole("link", { name: "E-mail", exact: true }),
  ).toHaveAttribute("href", "mailto:maiconsantossilvah@gmail.com");
  await page.goto("/");
  await expect(
    page.getByRole("heading", {
      name: "Design, conteúdo e tecnologia para e-commerce.",
    }),
  ).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({
    path: `work/home-${testInfo.project.name}.png`,
    fullPage: true,
  });
});
test("rota inexistente e projeto privado não vazam conteúdo", async ({
  page,
}) => {
  await page.goto("/#/projetos/nao-publicado");
  await expect(
    page.getByRole("heading", { name: "Projeto indisponível" }),
  ).toBeVisible();
  await page.goto("/#/nao-existe");
  await expect(
    page.getByRole("heading", { name: "Esta página não existe." }),
  ).toBeVisible();
});
