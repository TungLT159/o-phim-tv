const fs = require('fs');
const path = require('path');
const assert = require('assert');

const root = path.resolve(__dirname, '..');
const appScss = fs.readFileSync(path.join(root, 'src', 'App.scss'), 'utf8');
const indexHtml = fs.readFileSync(path.join(root, 'public', 'index.html'), 'utf8');

assert(
  !/@import\s+(?:url\(\s*)?['"]?https:\/\/fonts\.googleapis\.com\//i.test(appScss),
  'src/App.scss must not load Google Fonts with CSS @import'
);

function getLinkTags(html) {
  return html.match(/<link\b[^>]*>/gi) || [];
}

function getAttributes(tag) {
  const attributes = {};
  const attributePattern = /([^\s"'<>\/=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;
  let match;

  while ((match = attributePattern.exec(tag)) !== null) {
    const [, name, doubleQuotedValue, singleQuotedValue, unquotedValue] = match;

    if (name.toLowerCase() === 'link') {
      continue;
    }

    attributes[name.toLowerCase()] = doubleQuotedValue ?? singleQuotedValue ?? unquotedValue ?? true;
  }

  return attributes;
}

function hasRel(attributes, rel) {
  return typeof attributes.rel === 'string' && attributes.rel.toLowerCase().split(/\s+/).includes(rel);
}

function hasPreconnectTo(href, requiresCrossorigin = false) {
  return getLinkTags(indexHtml).some((tag) => {
    const attributes = getAttributes(tag);

    return hasRel(attributes, 'preconnect') &&
      attributes.href === href &&
      (!requiresCrossorigin || Object.prototype.hasOwnProperty.call(attributes, 'crossorigin'));
  });
}

function isMontserratStylesheet(href) {
  if (typeof href !== 'string') {
    return false;
  }

  try {
    const fontUrl = new URL(href.replace(/&amp;/g, '&'));

    return fontUrl.origin === 'https://fonts.googleapis.com' &&
      fontUrl.pathname === '/css2' &&
      fontUrl.searchParams.get('family') === 'Montserrat:wght@400;500;600;700;800;900' &&
      fontUrl.searchParams.get('display') === 'swap';
  } catch {
    return false;
  }
}

function hasMontserratStylesheet() {
  return getLinkTags(indexHtml).some((tag) => {
    const attributes = getAttributes(tag);

    return hasRel(attributes, 'stylesheet') && isMontserratStylesheet(attributes.href);
  });
}

assert(
  hasPreconnectTo('https://fonts.googleapis.com'),
  'public/index.html must preconnect to fonts.googleapis.com'
);

assert(
  hasPreconnectTo('https://fonts.gstatic.com', true),
  'public/index.html must preconnect to fonts.gstatic.com with crossorigin'
);

assert(
  hasMontserratStylesheet(),
  'public/index.html must load Montserrat with display=swap'
);

console.log('Font loading checks passed.');
