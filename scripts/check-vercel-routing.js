const fs = require('fs');
const path = require('path');
const assert = require('assert');

const root = path.resolve(__dirname, '..');
const vercelConfigPath = path.join(root, 'vercel.json');

assert(fs.existsSync(vercelConfigPath), 'vercel.json must define Vercel routing');

const config = JSON.parse(fs.readFileSync(vercelConfigPath, 'utf8'));
const spaRewrite = config.rewrites?.find((rewrite) => rewrite.destination === '/index.html');

assert(spaRewrite, 'vercel.json must rewrite SPA routes to /index.html');

const sourcePattern = new RegExp(`^${spaRewrite.source}$`);

assert(sourcePattern.test('/'), 'SPA rewrite must match the root route');
assert(sourcePattern.test('/movie/cuoc-chien-sinh-tu-ii'), 'SPA rewrite must match app routes');
assert(!sourcePattern.test('/api'), 'SPA rewrite must not match /api');
assert(!sourcePattern.test('/api/phim/cuoc-chien-sinh-tu-ii'), 'SPA rewrite must not match /api/*');

console.log('Vercel routing checks passed.');
