import fs from "fs";
import path from "path";

const css = fs.readFileSync(
  path.join(__dirname, "hero-slide.scss"),
  "utf8",
);

const expectHeroHeightsToMatch = (scope, expectedHeight) => {
  expect(scope).toMatch(
    new RegExp(`\\.hero-slide\\s*\\{[\\s\\S]*?min-height:\\s*${expectedHeight}`),
  );
  expect(scope).toMatch(
    new RegExp(`\\.hero-slide__item\\s*\\{[\\s\\S]*?min-height:\\s*${expectedHeight}`),
  );
};

test("reserves the same hero height as each slide breakpoint", () => {
  expectHeroHeightsToMatch(css, "85vh");

  const largeScreen = css.match(/@media \(min-width: 1920px\) \{[\s\S]*?\/\* ================= DESKTOP/)?.[0] || "";
  expectHeroHeightsToMatch(largeScreen, "90vh");

  const tabletPortrait = css.match(/@media \(min-width: 600px\) and \(max-width: 767px\) \{[\s\S]*?\/\* ================= MOBILE SMALL/)?.[0] || "";
  expectHeroHeightsToMatch(tabletPortrait, "65vh");

  const mobileSmall = css.match(/@media \(max-width: 479px\) \{[\s\S]*$/)?.[0] || "";
  expectHeroHeightsToMatch(mobileSmall, "55vh");
});

test("reserves hero height before slide data loads", () => {
  const css = fs.readFileSync(
    path.join(__dirname, "hero-slide.scss"),
    "utf8",
  );
  const heroSlideRule = css.match(/\.hero-slide\s*\{[\s\S]*?\n\}/)?.[0] || "";

  expect(heroSlideRule).toContain("min-height: 85vh");
  expect(heroSlideRule).toMatch(/@include tablet \{[\s\S]*?min-height: 70vh/);
  expect(heroSlideRule).toMatch(/@include mobile \{[\s\S]*?min-height: 60vh/);
});
