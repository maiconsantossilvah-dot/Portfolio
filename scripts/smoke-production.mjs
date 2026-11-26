import { spawn } from "node:child_process";
import { chromium, expect } from "@playwright/test";
import { loadEnv } from "vite";
const env = { ...loadEnv("production", process.cwd(), ""), ...process.env };
const base = env.VITE_BASE_PATH || "/";
const origin = "http://127.0.0.1:4185";
const server = spawn(
  process.execPath,
  [
    "node_modules/vite/bin/vite.js",
    "preview",
    "--host",
    "127.0.0.1",
    "--port",
    "4185",
    "--strictPort",
  ],
  {
    windowsHide: true,
    env: { ...process.env, ...env },
    stdio: ["ignore", "pipe", "pipe"],
  },
);
let serverOutput = "";
server.stdout.on("data", (chunk) => {
  serverOutput += chunk;
});
server.stderr.on("data", (chunk) => {
  serverOutput += chunk;
});
let browser;
try {
  let ready = false;
  for (let i = 0; i < 80; i++) {
    if (server.exitCode !== null)
      throw new Error(`Preview encerrou: ${serverOutput}`);
    try {
      ready = (await fetch(`${origin}${base}`)).ok;
      if (ready) break;
    } catch {
      /* Wait for the owned process to bind. */
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  if (!ready) throw new Error("Preview de produção não iniciou.");
  browser = await chromium.launch();
  const page = await browser.newPage({
    viewport: { width: 1440, height: 960 },
  });
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  await page.goto(`${origin}${base}`);
  await expect(
    page.getByRole("heading", {
      name: "Design, conteúdo e tecnologia para e-commerce.",
    }),
  ).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
  const csp = await page
    .locator('meta[http-equiv="Content-Security-Policy"]')
    .getAttribute("content");
  expect(
    csp.split(";").find((rule) => rule.includes("script-src")),
  ).not.toContain("unsafe-inline");
  await page.goto(`${origin}${base}#/projetos`);
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Projetos", exact: true }),
  ).toBeVisible();
  await page.goto(`${origin}${base}#/admin`);
  await expect(
    page.getByRole("heading", { name: "Bom ter você aqui." }),
  ).toBeVisible();
  expect(
    await page.locator('meta[name="robots"]').getAttribute("content"),
  ).toBe("noindex, nofollow");
  expect(await (await fetch(`${origin}${base}robots.txt`)).text()).toContain(
    "User-agent: *",
  );
  if (env.VITE_SITE_URL)
    expect(await (await fetch(`${origin}${base}sitemap.xml`)).text()).toContain(
      "<urlset",
    );
  expect(errors).toEqual([]);
  console.log(
    `Produção verificada: base ${base}, rotas diretas, assets, CSP, noindex, robots e sitemap configurado.`,
  );
} finally {
  await browser?.close();
  server.kill();
}
