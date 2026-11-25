import { expect, test } from "@playwright/test";
test("sandbox bloqueia execução e acesso ao armazenamento e ao contexto principal", async ({
  page,
}) => {
  await page.route("https://sandbox-fixture.invalid/demo", (route) =>
    route.fulfill({
      contentType: "text/html",
      body: '<!doctype html><html><body><script>document.body.dataset.executed="yes"; parent.localStorage.getItem("sandbox-test-sentinel");</script><p>Documento de teste carregado</p></body></html>',
    }),
  );
  await page.goto("/");
  await expect(
    page.getByRole("heading", {
      name: "Design, conteúdo e tecnologia para e-commerce.",
    }),
  ).toBeVisible();
  // O renderer é verificado em blocks.test.tsx. Aqui a mesma política é exercitada pelo navegador.
  await page.evaluate(() => {
    localStorage.setItem("sandbox-test-sentinel", "fixture-sem-credenciais");
    const iframe = document.createElement("iframe");
    iframe.title = "Sandbox de teste";
    iframe.setAttribute("sandbox", "");
    iframe.referrerPolicy = "no-referrer";
    iframe.src = "https://sandbox-fixture.invalid/demo";
    document.body.append(iframe);
  });
  await expect(
    page
      .frameLocator('iframe[title="Sandbox de teste"]')
      .getByText("Documento de teste carregado"),
  ).toBeVisible();
  const frame = page.frame({ url: "https://sandbox-fixture.invalid/demo" })!;
  expect(await frame.locator("body").getAttribute("data-executed")).toBeNull();
  expect(
    await frame.evaluate(() => {
      try {
        return parent.localStorage.getItem("sandbox-test-sentinel");
      } catch {
        return "acesso-bloqueado";
      }
    }),
  ).toBe("acesso-bloqueado");
  expect(
    await frame.evaluate(() => {
      try {
        return localStorage.length;
      } catch {
        return "origem-opaca";
      }
    }),
  ).toBe("origem-opaca");
  await page.evaluate(() => localStorage.removeItem("sandbox-test-sentinel"));
});
