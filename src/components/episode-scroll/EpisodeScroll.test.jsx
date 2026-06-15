import fs from "fs";
import path from "path";

const rootDir = path.resolve(__dirname, "../../..");
const readProjectFile = (relativePath) =>
  fs.readFileSync(path.join(rootDir, relativePath), "utf8");

const episodeScrollScss = () =>
  readProjectFile("src/components/episode-scroll/episode-scroll.scss");

test("episode numbers display full multi-digit labels", () => {
  const scss = episodeScrollScss();

  expect(scss).toMatch(
    /&__number\s*\{[\s\S]*?white-space:\s*normal;[\s\S]*?overflow:\s*visible;[\s\S]*?text-overflow:\s*clip;/,
  );
});

test("episode buttons keep a uniform height while centering wrapped labels", () => {
  const scss = episodeScrollScss();

  expect(scss).toMatch(
    /\.episode-btn\s*\{[\s\S]*?height:\s*60px;[\s\S]*?align-items:\s*center;[\s\S]*?justify-content:\s*center;/,
  );
  expect(scss).toMatch(
    /@media \(max-width: 767px\)[\s\S]*?\.episode-btn\s*\{[\s\S]*?height:\s*48px;/,
  );
});
