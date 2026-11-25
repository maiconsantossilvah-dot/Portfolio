import { readFileSync, writeFileSync } from "node:fs";
import { loadEnv } from "vite";
const env = { ...loadEnv("production", process.cwd(), ""), ...process.env };
const site = env.VITE_SITE_URL?.replace(/\/$/, "");
const valid =
  site && /^https:\/\/[a-z0-9.-]+(?::\d+)?(?:\/[^<>"\s]*)?$/i.test(site);
writeFileSync(
  "dist/robots.txt",
  `User-agent: *\nAllow: /\n${valid ? `Sitemap: ${site}/sitemap.xml\n` : "# Configure VITE_SITE_URL para gerar o sitemap com URL absoluta.\n"}`,
);
if (valid) {
  const escape = (text) =>
    text
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll('"', "&quot;");
  writeFileSync(
    "dist/sitemap.xml",
    `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>${escape(site)}/</loc></url></urlset>`,
  );
  const html = readFileSync("dist/index.html", "utf8").replace(
    "</head>",
    `<link rel="canonical" href="${escape(site)}/" /><meta property="og:url" content="${escape(site)}/" /></head>`,
  );
  writeFileSync("dist/index.html", html);
}
writeFileSync("dist/.nojekyll", "");
