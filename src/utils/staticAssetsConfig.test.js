import fs from "fs";
import path from "path";

const rootDir = path.resolve(__dirname, "../..");

const readProjectFile = (relativePath) =>
  fs.readFileSync(path.join(rootDir, relativePath), "utf8");

test("favicon is declared once in the app shell, not per page", () => {
  const indexHtml = readProjectFile("public/index.html");
  const catalog = readProjectFile("src/pages/Catalog.jsx");
  const detailSeo = readProjectFile("src/pages/detail/DetailSeo.jsx");

  expect(indexHtml).toContain('rel="icon"');
  expect(indexHtml).toContain('href="%PUBLIC_URL%/favicon.ico"');
  expect(catalog).not.toContain('rel="icon"');
  expect(detailSeo).not.toContain('rel="icon"');
});

test("Netlify caches static icon assets aggressively", () => {
  const headers = readProjectFile("public/_headers");

  expect(headers).toContain("/favicon.ico");
  expect(headers).toContain("/logo192.png");
  expect(headers).toContain("/logo512.png");
  expect(headers).toContain("Cache-Control: public, max-age=31536000, immutable");
});
