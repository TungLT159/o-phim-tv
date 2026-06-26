const fs = require('fs');
const path = require('path');

const read = (relativePath) => fs.readFileSync(path.join(__dirname, '..', relativePath), 'utf8');

describe('TV focus styling', () => {
  test('uses white instead of orange for global TV focus accents', () => {
    const files = [
      'scss/tv-focus.scss',
      'pages/tv-search.scss',
      'components/header/tv-sidebar.scss',
      'App.scss',
    ];

    files.forEach((file) => {
      const contents = read(file);
      expect(contents).not.toMatch(/#ff6b35|255,\s*107,\s*53/i);
    });
  });

  test('keeps movie card focus on the card wrapper instead of the poster', () => {
    const contents = read('scss/tv-focus.scss');

    expect(contents).toMatch(/\.content-row__card:focus-visible/);
    expect(contents).not.toMatch(/\.content-row__card:focus-visible[\s\S]*\.content-row__poster\s*\{/);
  });

  test('keeps search focus on the outer search bar and card wrappers', () => {
    const contents = read('pages/tv-search.scss');

    expect(contents).toMatch(/&:focus-within\s*\{[^}]*border-color:\s*#fff/i);
    expect(contents).toMatch(/&--focused\s*\{[\s\S]*box-shadow:\s*0 0 0 3px #fff/i);
    expect(contents).not.toMatch(/&--focused\s*\{[\s\S]*\.tv-search-card__poster\s*\{/);
  });

  test('does not draw focus borders on known child controls', () => {
    const globalFocus = read('scss/tv-focus.scss');
    const heroFocus = read('components/tv-hero/tv-hero.scss');

    expect(globalFocus).not.toMatch(/^\s*\*:focus-visible\s*\{/m);
    expect(globalFocus).not.toMatch(/button:focus-visible|\.btn:focus-visible/);
    expect(heroFocus).not.toMatch(/&__play-btn[\s\S]*&:focus-visible/);
    expect(heroFocus).not.toMatch(/&:focus-visible\s+&__play-btn/);
  });

  test('keeps episode sidebar focus borders stronger than global button reset', () => {
    const contents = read('components/video-player/episode-sidebar/episode-sidebar.scss');

    expect(contents).toMatch(/&--focused\s*\{[\s\S]*border:\s*4px solid \$tv-focus-border-color !important/i);
  });

  test('uses high-contrast dual-ring focus for white or icon-only buttons', () => {
    const sidebar = read('components/video-player/episode-sidebar/episode-sidebar.scss');
    const detail = read('pages/detail/tv-detail.scss');

    expect(sidebar).toMatch(/&__close[\s\S]*&--focused::after\s*\{[\s\S]*box-shadow:\s*0 0 0 2px #000,\s*0 0 0 7px #fff/i);
    expect(detail).toMatch(/&__play-btn[\s\S]*&--focused\s*\{[\s\S]*box-shadow:\s*0 0 0 3px #000,\s*0 0 0 8px #fff/i);
  });

  test('draws the episode sidebar close focus as a circular ring around the X button', () => {
    const sidebar = read('components/video-player/episode-sidebar/episode-sidebar.scss');

    expect(sidebar).toMatch(/&__close\s*\{[\s\S]*position:\s*relative/i);
    expect(sidebar).toMatch(/&__close\s*\{[\s\S]*&::after\s*\{[\s\S]*border-radius:\s*50%/i);
    expect(sidebar).toMatch(/&--focused::after\s*\{[\s\S]*opacity:\s*1/i);
    expect(sidebar).toMatch(/&--focused::after\s*\{[\s\S]*box-shadow:\s*0 0 0 2px #000,\s*0 0 0 7px #fff/i);
  });

  test('hides player scrollbars for TV playback chrome', () => {
    const player = read('components/video-player/custom-video-player.scss');
    const sidebar = read('components/video-player/episode-sidebar/episode-sidebar.scss');

    expect(player).toMatch(/\.custom-video-player\s*\{[\s\S]*overflow:\s*hidden/i);
    expect(sidebar).toMatch(/&__list\s*\{[\s\S]*scrollbar-width:\s*none/i);
    expect(sidebar).toMatch(/&::-webkit-scrollbar\s*\{[\s\S]*display:\s*none/i);
  });

  test('reserves vertical breathing room for scaled content row cards', () => {
    const contents = read('components/content-row/content-row.scss');

    expect(contents).toMatch(/\$content-row-focus-bleed:\s*\d/);
    expect(contents).toMatch(/padding:\s*\$content-row-focus-bleed\s+2rem\s+calc\(0\.75rem \+ \$content-row-focus-bleed\)/);
    expect(contents).toMatch(/\.tv-layout[\s\S]*padding:\s*\$content-row-focus-bleed\s+2\.5rem\s+calc\(1rem \+ \$content-row-focus-bleed\)/);
  });
});
