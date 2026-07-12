#!/usr/bin/env node
// [project-sites] ONE builder for THREE self-contained, offline, single-file site types —
// docs · tracker · tutorial — all skinned with the ONE canonical RXD/Nebula stylesheet
// (assets/tailwind.css) so they read as one product. Zero dependencies (node: builtins only).
//
// USAGE
//   node build.mjs <docs|tracker|tutorial> <in.json> <out.html> [options]
//
// OPTIONS
//   --project-css <path|url>   Use the HOST PROJECT's stylesheet, cascading OVER the skill's
//                              sheet (a local path is inlined; a URL is <link>ed). The skill's
//                              semantic classes are still emitted; the project CSS wins by
//                              cascade order, so a project re-skins by overriding the --lp-*
//                              tokens (or any class). The skill sheet is the FALLBACK only.
//   --project-css-only         Ship NO default skill sheet — inherit the host app's global CSS
//                              (for embedding the site as a route inside an app). Combine with
//                              --project-css to inline/link a specific sheet; omit it to inherit
//                              whatever CSS the surrounding app already loads.
//   --project-theme <light|dark|auto>  Honor the project's default theme and DROP the standalone
//                              light/dark toggle. `auto` follows prefers-color-scheme. Omit to
//                              keep the standalone RXD light+dark toggle (the default).
//   --no-fonts                 Do not emit the Google Fonts link (degrade to system fonts /
//                              inherit the app's fonts). Implied by --project-css-only.
//   --title "…"                Override the document <title> / heading.
//   --lock [passcode]          Wrap the finished page in a client-side AES-256-GCM gate
//                              (decrypts in-browser; needs HTTPS/localhost). Pass the passcode
//                              inline (`--lock 'my passcode'`) or omit it to be prompted.
//   --lock-title/--lock-kicker/--lock-hint/--iter   Lock gate copy + PBKDF2 cost (default 600000).
//
// SECURITY: every author string is HTML-escaped (tracker/docs render client-side with
// textContent; tutorial escapes server-side). Colours are whitelisted; URLs scheme-checked.
// No raw HTML from the data ever reaches the output.

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { randomBytes, pbkdf2Sync, createCipheriv } from 'node:crypto';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createInterface } from 'node:readline';

const HERE = dirname(fileURLToPath(import.meta.url));
const SKILL = resolve(HERE, '..');
const ASSETS = resolve(SKILL, 'assets');

// ── arg parsing: positional [type, in, out] + flags ────────────────────────────────────
function parseArgs(argv) {
  const o = { _: [] };
  const VALUE_FLAGS = new Set(['project-css', 'project-theme', 'title', 'lock-title', 'lock-kicker', 'lock-hint', 'iter', 'template', 'css']);
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const key = a.slice(2);
      if (key === 'lock') { // optional value
        o.lock = (argv[i + 1] && !argv[i + 1].startsWith('--')) ? argv[++i] : true;
      } else if (VALUE_FLAGS.has(key)) {
        o[key] = (argv[i + 1] && !argv[i + 1].startsWith('--')) ? argv[++i] : true;
      } else {
        o[key] = true; // boolean flag (project-css-only, no-fonts, …)
      }
    } else o._.push(a);
  }
  return o;
}
const A = parseArgs(process.argv.slice(2));
function die(msg) { console.error('✗ ' + msg); process.exit(1); }

// ── shared security primitives ──────────────────────────────────────────────────────────
function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
function jsonScript(obj) { return JSON.stringify(obj).replaceAll('</', '<\\/'); } // inert in <script>
// Single-pass template fill. A FUNCTION replacer is mandatory: replacement values (mermaid
// lib, CSS, user data) can contain `$&`/`` $` ``/`$'`/`$$`, which String.replace would
// interpret as special patterns and corrupt the output. A function replacer inserts the
// value verbatim, and a single pass never re-scans inserted text for further tokens.
function fillTemplate(tpl, map) {
  return tpl.replace(/%%[A-Z]+%%/g, (m) => (Object.prototype.hasOwnProperty.call(map, m) ? map[m] : m));
}
function isUrl(s) { return /^https?:\/\//i.test(String(s || '')); }
function safeUrl(u, allowData) {
  const s = String(u == null ? '' : u).trim();
  if (/^(#|\/|\.\/|\.\.\/)/.test(s)) return s;
  if (/^https?:\/\//i.test(s) || /^mailto:/i.test(s)) return s;
  if (allowData && /^data:image\//i.test(s)) return s;
  return '';
}

// ── shared <head> assembly (project-css / project-theme / fonts / CSP / config) ─────────
const FONTS_HTML =
  '<link rel="preconnect" href="https://fonts.googleapis.com">\n' +
  '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n' +
  '<link href="https://fonts.googleapis.com/css2?family=Inter+Tight:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;700&display=swap" rel="stylesheet">';

function assembleHead({ extraConfig }) {
  const projectCss = typeof A['project-css'] === 'string' ? A['project-css'] : null;
  const projectCssOnly = !!A['project-css-only'];
  const noFonts = !!A['no-fonts'] || projectCssOnly;
  let projectTheme = typeof A['project-theme'] === 'string' ? A['project-theme'] : null;
  if (projectTheme && !['light', 'dark', 'auto'].includes(projectTheme)) die('--project-theme must be light|dark|auto');

  const themeToggle = !projectTheme;                       // standalone → toggle on
  const theme = projectTheme || 'light';                   // config default; boot resolves 'auto'
  const htmlTheme = (theme === 'dark') ? 'dark' : 'light'; // valid pre-paint attr; boot fixes 'auto'

  // ── stylehead: skill sheet (fallback) + project css cascading OVER it ──
  const styleParts = [];
  if (!projectCssOnly) {
    const skillCss = readFileSync(resolve(ASSETS, 'tailwind.css'), 'utf8');
    styleParts.push('<style>' + skillCss + '</style>');
  }
  if (projectCss) {
    if (isUrl(projectCss)) styleParts.push('<link rel="stylesheet" href="' + esc(projectCss) + '">');
    else {
      let pc; try { pc = readFileSync(resolve(String(projectCss)), 'utf8'); }
      catch (e) { die('cannot read --project-css file: ' + e.message); }
      styleParts.push('<style data-project-css>' + pc + '</style>');
    }
  }
  const stylehead = styleParts.join('\n');

  // ── fonts ──
  const fonts = noFonts ? '' : FONTS_HTML;

  // ── CSP: strict + self-contained. Embedded (project-css-only) drops CSP (host controls). ──
  let csp = '';
  if (!projectCssOnly) {
    let styleSrc = "'unsafe-inline'";
    if (!noFonts) styleSrc += ' https://fonts.googleapis.com';
    if (projectCss && isUrl(projectCss)) {
      try { styleSrc += ' ' + new URL(projectCss).origin; } catch (e) { /* leave as-is */ }
    }
    const fontSrc = noFonts ? "'none'" : 'https://fonts.gstatic.com';
    csp = '<meta http-equiv="Content-Security-Policy" content="default-src \'none\'; ' +
      "script-src 'unsafe-inline'; style-src " + styleSrc + '; ' +
      'font-src ' + fontSrc + "; img-src 'self' data:; connect-src 'none'; " +
      "base-uri 'none'; form-action 'none'\"/>";
  }

  const config = Object.assign({ theme, themeToggle, lsKey: 'ps-theme' }, extraConfig || {});
  return { theme: htmlTheme, csp, fonts, stylehead, configJson: jsonScript(config) };
}

function mermaidScriptTag() {
  const lib = readFileSync(resolve(ASSETS, 'mermaid.min.js'), 'utf8');
  return '<script>' + lib.replaceAll('<\/script>', '<\\/script>') + '<\/script>';
}
function hasDiagram(sections) {
  return (sections || []).some((s) => (s && s.blocks || []).some((b) => b && b.type === 'diagram'));
}

// ════════════════════════════════════════════════════════════════════════════════════════
// TRACKER
// ════════════════════════════════════════════════════════════════════════════════════════
function buildTracker(data, title) {
  if (A.title) data.title = String(A.title);
  const warn = (m) => console.warn('  ! ' + m);
  if (!data.title) warn('no "title" — the dashboard will show a generic heading.');
  if (data.milestones && !Array.isArray(data.milestones)) warn('"milestones" should be an array; ignoring.');
  (data.milestones || []).forEach((m, i) => {
    if (typeof m.pct === 'number' && (m.pct < 0 || m.pct > 100)) warn(`milestone[${i}].pct=${m.pct} outside 0–100 (clamped).`);
  });
  const head = assembleHead({ extraConfig: {} });
  const template = readFileSync(resolve(ASSETS, 'tracker.template.html'), 'utf8');
  return fillTemplate(template, {
    '%%THEME%%': head.theme, '%%CSP%%': head.csp,
    '%%TITLE%%': esc(title || data.title || 'Status Tracker'),
    '%%CONFIG%%': head.configJson, '%%FONTS%%': head.fonts,
    '%%STYLEHEAD%%': head.stylehead, '%%DATA%%': jsonScript(data),
  });
}

// ════════════════════════════════════════════════════════════════════════════════════════
// DOCS
// ════════════════════════════════════════════════════════════════════════════════════════
function buildDocs(data, title) {
  if (A.title) data.title = String(A.title);
  if (!data.title) console.warn('  ! no "title" — the docs site will show a generic heading.');
  if (data.sections && !Array.isArray(data.sections)) die('"sections" must be an array.');
  const head = assembleHead({ extraConfig: { search: data.search !== false } });
  const template = readFileSync(resolve(ASSETS, 'docs.template.html'), 'utf8');
  const mermaid = hasDiagram(data.sections) ? mermaidScriptTag() : '';
  return fillTemplate(template, {
    '%%THEME%%': head.theme, '%%CSP%%': head.csp,
    '%%TITLE%%': esc(title || data.title || 'Documentation'),
    '%%CONFIG%%': head.configJson, '%%FONTS%%': head.fonts,
    '%%STYLEHEAD%%': head.stylehead, '%%DATA%%': jsonScript(data), '%%MERMAID%%': mermaid,
  });
}

// ════════════════════════════════════════════════════════════════════════════════════════
// TUTORIAL (server-rendered component library — every author string HTML-escaped)
// ════════════════════════════════════════════════════════════════════════════════════════
const COLOR_TOKEN = {
  green: '--lp-ok', blue: '--lp-info', amber: '--lp-warn', violet: '--lp-new', red: '--lp-danger',
  accent: '--lp-accent', text: '--lp-text', muted: '--lp-muted', faint: '--lp-faint',
};
const COLORS = new Set(Object.keys(COLOR_TOKEN));
function cssVar(c) { return 'var(' + (COLOR_TOKEN[c] || '--lp-text') + ')'; }
function inline(s) {
  let out = esc(s);
  out = out.replace(/`([^`]+)`/g, (_, c) => '<code>' + c + '</code>');
  out = out.replace(/\*\*([^*]+)\*\*/g, (_, b) => '<strong>' + b + '</strong>');
  out = out.replace(/\*([^*]+)\*/g, (_, e) => '<em>' + e + '</em>');
  out = out.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (m, txt, url) => {
    const u = safeUrl(url);
    return u ? '<a href="' + esc(u) + '">' + txt + '</a>' : txt;
  });
  return out;
}
function elHero(title, kicker, subtitle, highlight) {
  let h1 = esc(title);
  if (highlight) {
    const hi = esc(highlight);
    const idx = h1.indexOf(hi);
    if (idx >= 0) h1 = h1.slice(0, idx) + '<span class="g">' + hi + '</span>' + h1.slice(idx + hi.length);
  }
  const k = kicker ? '<div class="kicker">' + esc(kicker) + '</div>' : '';
  const sub = subtitle ? '<p class="sub">' + inline(subtitle) + '</p>' : '';
  return '<header class="hero">' + k + '<h1>' + h1 + '</h1>' + sub + '</header>';
}
function elLegend(items) {
  const lis = (items || []).map(([color, name]) =>
    '<div class="li"><span class="dot" style="background:' + cssVar(color) + '"></span><b>' + esc(name) + '</b></div>'
  ).join('');
  return '<div class="legend">' + lis + '</div>';
}
function elStatRow(stats) {
  const cells = (stats || []).map((s) =>
    '<div class="stat"><div class="stat-n" style="color:' + cssVar(s.color) + '">' + esc(s.n) +
    '</div><div class="stat-l">' + esc(s.label) + '</div></div>'
  ).join('');
  return '<div class="statbar">' + cells + '</div>';
}
function elCards(items) {
  const out = (items || []).map((c) => {
    const href = c.href ? safeUrl(c.href) : '';
    const tag = href ? 'a' : 'div';
    const attr = href ? ' href="' + esc(href) + '"' : '';
    const n = c.n != null ? '<div class="n">' + esc(c.n) + '</div>' : '';
    const go = href ? '<span class="go">&#8594;</span>' : '';
    return '<' + tag + ' class="card"' + attr + '>' + n + '<h3>' + esc(c.title) + '</h3>' +
      '<p>' + inline(c.desc || '') + '</p>' + go + '</' + tag + '>';
  }).join('');
  return '<div class="cards">' + out + '</div>';
}
function elCallout(body, kind, title) {
  const k = COLORS.has(kind) ? kind : 'green';
  const ct = title ? '<div class="callout-title" style="color:' + cssVar(k) + '">' + esc(title) + '</div>' : '';
  return '<div class="callout" style="border-left-color:' + cssVar(k) + '">' + ct + '<p>' + inline(body) + '</p></div>';
}
function elKv(rows) {
  const body = (rows || []).map(([k, v]) =>
    '<div class="kv-k">' + esc(k) + '</div><div class="kv-v">' + inline(v) + '</div>'
  ).join('');
  return '<div class="kv">' + body + '</div>';
}
function elTable(headers, rows) {
  const th = (headers || []).map((h) => '<th>' + esc(h) + '</th>').join('');
  const body = (rows || []).map((r) =>
    '<tr>' + (r || []).map((c) => '<td>' + inline(c) + '</td>').join('') + '</tr>'
  ).join('');
  return '<table class="data"><thead><tr>' + th + '</tr></thead><tbody>' + body + '</tbody></table>';
}
function elCode(codeStr, title, color) {
  const c = COLORS.has(color) ? color : 'green';
  const head = title ? '<div class="codehead" style="color:' + cssVar(c) + '">' + esc(title) + '</div>' : '';
  return '<div class="codewrap">' + head + '<pre><code>' + esc(codeStr) + '</code></pre></div>';
}
function elImage(src, alt, caption, width) {
  const u = safeUrl(src, true);
  if (!u) return '';
  // `width` (px) caps the figure to ~half the image's intrinsic width for crisp 2× rendering;
  // the .figure img rule keeps max-width:100% for responsiveness.
  const style = (typeof width === 'number' && width > 0) ? ' style="max-width:' + width + 'px"' : '';
  // No loading="lazy": the src is an inline data URI (no network fetch to defer), and lazy
  // loading leaves below-the-fold figures blank in print / screenshots / no-scroll views.
  const img = '<img src="' + esc(u) + '" alt="' + esc(alt || '') + '" decoding="async"/>';
  const cap = caption ? '<figcaption>' + inline(caption) + '</figcaption>' : '';
  return '<figure class="figure"' + style + '>' + img + cap + '</figure>';
}
function elList(items) {
  return '<ul>' + (items || []).map((it) => '<li>' + inline(it) + '</li>').join('') + '</ul>';
}
function elDiagram(src, caption) {
  const cap = caption ? '<figcaption>' + inline(caption) + '</figcaption>' : '';
  return '<figure class="figure diagram-fig"><pre class="mermaid">' + esc(src || '') + '</pre>' + cap + '</figure>';
}
function elProse(text, variant) {
  if (variant === 'lede') return '<p class="lede">' + inline(text) + '</p>';
  if (variant === 'note') return '<p class="note">' + inline(text) + '</p>';
  if (variant === 'framing') return '<p class="framing">' + inline(text) + '</p>';
  return '<p>' + inline(text) + '</p>';
}
function elEyebrow(text) { return '<div class="eyebrow"><span class="tick"></span>' + esc(text) + '</div>'; }
function renderBlock(b) {
  if (!b || typeof b !== 'object') return '';
  switch (b.type) {
    case 'prose': return elProse(b.text, b.variant);
    case 'heading': return '<h3>' + esc(b.text) + '</h3>';
    case 'eyebrow': return elEyebrow(b.text);
    case 'list': return elList(b.items);
    case 'stat-row': return elStatRow(b.stats);
    case 'cards': return elCards(b.items);
    case 'callout': return elCallout(b.body, b.kind, b.title);
    case 'kv-table': return elKv(b.rows);
    case 'table': return elTable(b.headers, b.rows);
    case 'legend': return elLegend(b.items);
    case 'code': return elCode(b.code, b.title, b.color);
    case 'image': return elImage(b.src, b.alt, b.caption, b.width);
    case 'diagram': return elDiagram(b.code || b.mermaid, b.caption);
    default: console.warn('  (skip) unknown block type: ' + JSON.stringify(b.type)); return '';
  }
}
function pad2(n) { return String(n).padStart(2, '0'); }
function firstProse(section) {
  const p = (section.blocks || []).find((b) => b && b.type === 'prose' && b.text);
  if (!p) return '';
  return p.text.length > 120 ? p.text.slice(0, 117) + '…' : p.text;
}
function homeView(data, order) {
  const parts = ['<section id="view-home" class="view">'];
  parts.push(elHero(data.title, data.kicker, data.subtitle, data.highlight));
  if (Array.isArray(data.legend) && data.legend.length) parts.push(elLegend(data.legend));
  for (const b of (data.intro || [])) parts.push(renderBlock(b));
  if (Array.isArray(data.stats) && data.stats.length) parts.push(elStatRow(data.stats));
  if (order.length) {
    parts.push('<div class="cards-title">Read it in order &mdash; or jump to any topic</div>');
    const cards = order.map((s, i) => ({ href: '#' + s.id, n: pad2(i + 1), title: s.title, desc: s.summary || (firstProse(s) || '') }));
    parts.push(elCards(cards));
  }
  parts.push('</section>');
  return parts.join('');
}
function sectionView(section, num, prev, next) {
  const eyebrow = '<div class="eyebrow"><span class="tick"></span>' + pad2(num) + ' &middot; ' + esc(section.eyebrow || section.title) + '</div>';
  const body = (section.blocks || []).map(renderBlock).join('');
  let nav = '<div class="viewnav">';
  nav += prev ? '<a href="#' + esc(prev.id) + '"><span class="lbl">&#8592; previous</span>' + esc(prev.title) + '</a>' : '<span></span>';
  nav += next ? '<a class="nx" href="#' + esc(next.id) + '"><span class="lbl">next &#8594;</span>' + esc(next.title) + '</a>' : '<span></span>';
  nav += '</div>';
  return '<section id="view-' + esc(section.id) + '" class="view" hidden>' +
    '<div class="viewhead"><a class="backlink" href="#home">&#8592; all topics</a>' + eyebrow + '<h2>' + esc(section.title) + '</h2></div>' +
    '<div class="block">' + body + '</div>' + nav + '</section>';
}
function buildTutorial(data, title) {
  if (!data || typeof data !== 'object') die('content JSON must be an object');
  if (A.title) data.title = String(A.title);
  if (!data.title) die('tutorial JSON is missing the required "title" field');
  const sections = Array.isArray(data.sections) ? data.sections.filter((s) => s && s.id && s.title) : [];
  const byId = new Map(sections.map((s) => [s.id, s]));
  const order = []; const seen = new Set();
  for (const id of (Array.isArray(data.nav) ? data.nav : [])) if (byId.has(id) && !seen.has(id)) { order.push(byId.get(id)); seen.add(id); }
  for (const s of sections) if (!seen.has(s.id)) { order.push(s); seen.add(s.id); }

  const views = [homeView(data, order)];
  order.forEach((s, i) => views.push(sectionView(s, i + 1, order[i - 1] || null, order[i + 1] || null)));

  const footer = data.footer
    ? '<footer><p>' + inline(data.footer) + '</p></footer>'
    : '<footer><p><b>' + esc(data.title) + '</b></p></footer>';
  const brand = data.brand
    ? '<a class="brand" href="#home">&#9642; ' + inline(data.brand) + '</a>'
    : '<a class="brand" href="#home">&#9642; ' + esc(data.title) + '</a>';

  const head = assembleHead({ extraConfig: {} });
  const mermaid = hasDiagram(order) ? mermaidScriptTag() : '';
  const template = readFileSync(resolve(ASSETS, 'tutorial.template.html'), 'utf8');
  return fillTemplate(template, {
    '%%THEME%%': head.theme, '%%CSP%%': head.csp, '%%TITLE%%': esc(title || data.title),
    '%%CONFIG%%': head.configJson, '%%FONTS%%': head.fonts, '%%STYLEHEAD%%': head.stylehead,
    '%%BRAND%%': brand, '%%BODY%%': views.join('\n') + '\n' + footer, '%%MERMAID%%': mermaid,
  });
}

// ════════════════════════════════════════════════════════════════════════════════════════
// OPTIONAL LOCK (AES-256-GCM gate; Web-Crypto-compatible envelope)
// ════════════════════════════════════════════════════════════════════════════════════════
function promptHidden(label) {
  return new Promise((res) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    rl.question(label, (a) => { rl.close(); process.stdout.write('\n'); res(a); });
    rl._writeToOutput = () => process.stdout.write('*');
  });
}
async function getPasscode() {
  if (typeof A.lock === 'string' && A.lock) return A.lock;
  const p1 = await promptHidden('Passcode (hidden): ');
  if (!p1) die('empty passcode');
  const p2 = await promptHidden('Confirm passcode: ');
  if (p1 !== p2) die('passcodes do not match');
  return p1;
}
async function lockHtml(plaintext, title) {
  const iter = Number(A.iter) || 600000;
  if (!Number.isInteger(iter) || iter < 100000) die('--iter must be an integer >= 100000');
  const template = readFileSync(resolve(ASSETS, 'gate.template.html'), 'utf8');
  const css = readFileSync(resolve(ASSETS, 'gate.css'), 'utf8');
  const passcode = await getPasscode();
  const salt = randomBytes(16), iv = randomBytes(12);
  const key = pbkdf2Sync(passcode.normalize('NFKC'), salt, iter, 32, 'sha256');
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const enc = Buffer.concat([cipher.update(Buffer.from(plaintext, 'utf8')), cipher.final()]);
  const ct = Buffer.concat([enc, cipher.getAuthTag()]);  // Web Crypto wants the tag appended
  const envelope = { v: 1, kdf: 'PBKDF2-SHA256', iter, salt: salt.toString('base64'), iv: iv.toString('base64'), ct: ct.toString('base64') };
  const lockTitle = String(A['lock-title'] || title || 'Protected page');
  const lockKicker = String(A['lock-kicker'] || 'Encrypted · client-side');
  const lockHint = String(A['lock-hint'] || 'This page is encrypted. Enter the passcode to decrypt and view it in your browser.');
  return {
    html: fillTemplate(template, {
      '%%TITLE%%': esc(lockTitle), '%%KICKER%%': esc(lockKicker), '%%HINT%%': esc(lockHint),
      '%%STYLESHEET%%': css, '%%PAYLOAD%%': jsonScript(envelope),
    }),
    iter,
  };
}

// ════════════════════════════════════════════════════════════════════════════════════════
// MAIN
// ════════════════════════════════════════════════════════════════════════════════════════
async function main() {
  const [type, inPath, outPath] = A._;
  if (!type || !['docs', 'tracker', 'tutorial'].includes(type)) die('usage: node build.mjs <docs|tracker|tutorial> <in.json> <out.html> [options]');
  if (!inPath) die('missing <in.json>');
  if (!outPath) die('missing <out.html>');

  let data;
  try { data = JSON.parse(readFileSync(resolve(String(inPath)), 'utf8')); }
  catch (e) { die('cannot read/parse <in.json>: ' + e.message); }
  if (!data || typeof data !== 'object') die('<in.json> must be a JSON object');

  const titleOverride = typeof A.title === 'string' ? A.title : null;
  let html;
  if (type === 'tracker') html = buildTracker(data, titleOverride);
  else if (type === 'docs') html = buildDocs(data, titleOverride);
  else html = buildTutorial(data, titleOverride);

  let locked = false, iterUsed = 0;
  if (A.lock) {
    const r = await lockHtml(html, titleOverride || data.title);
    html = r.html; locked = true; iterUsed = r.iter;
  }

  const out = resolve(String(outPath));
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, html, 'utf8');
  const kb = (Buffer.byteLength(html) / 1024).toFixed(0);
  if (locked) {
    console.log(`✓ wrote ${outPath} (${kb} KB) — ${type}, LOCKED: AES-256-GCM, PBKDF2-SHA256 ×${iterUsed.toLocaleString()}`);
    console.log('  passcode was not stored anywhere; keep it safe (there is no recovery). Needs HTTPS/localhost to decrypt.');
  } else {
    console.log(`✓ wrote ${outPath} (${kb} KB) — ${type} site, self-contained (inlined CSS + embedded data).`);
  }
}
main().catch((e) => die(e.message));
