// [project-sites] Builder tests: escaping, per-type blocks, project-css / project-theme
// override, and the optional-lock round-trip. Run: node --test tests/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { pbkdf2Sync, createDecipheriv } from 'node:crypto';

const HERE = dirname(fileURLToPath(import.meta.url));
const SKILL = resolve(HERE, '..');
const BUILD = resolve(SKILL, 'scripts/build.mjs');
const TMP = mkdtempSync(join(tmpdir(), 'ps-build-'));

function build(args) {
  const r = spawnSync('node', [BUILD, ...args], { encoding: 'utf8' });
  return { code: r.status, out: r.stdout + r.stderr };
}
function writeJSON(name, obj) { const p = join(TMP, name); writeFileSync(p, JSON.stringify(obj)); return p; }

// ── XSS / escaping ──────────────────────────────────────────────────────────────────────
test('tracker: a </script> in data cannot break out of the JSON island', () => {
  const inp = writeJSON('t1.json', { title: 'X', stats: [{ value: '</script><img src=x onerror=alert(1)>', label: 'evil' }] });
  const out = join(TMP, 't1.html');
  assert.equal(build(['tracker', inp, out]).code, 0);
  const html = readFileSync(out, 'utf8');
  // the raw closing tag must be neutralised inside the embedded JSON
  assert.ok(!html.includes('</script><img'), 'raw </script> must be escaped in the payload');
  assert.ok(html.includes('<\\/script>'), 'the </ boundary is escaped as <\\/');
});

test('docs: a </script> in data is neutralised', () => {
  const inp = writeJSON('d1.json', { title: 'D', sections: [{ id: 's', title: '</script><b>x', blocks: [{ type: 'prose', text: 'ok' }] }] });
  const out = join(TMP, 'd1.html');
  assert.equal(build(['docs', inp, out]).code, 0);
  const html = readFileSync(out, 'utf8');
  assert.ok(!html.includes('</script><b>x'), 'raw </script> must not appear verbatim');
});

test('tutorial: server-rendered author text is HTML-escaped', () => {
  const inp = writeJSON('u1.json', { title: 'U', sections: [{ id: 'a', title: 'A', blocks: [{ type: 'prose', text: '<script>alert(1)</script> & <b>' }] }] });
  const out = join(TMP, 'u1.html');
  assert.equal(build(['tutorial', inp, out]).code, 0);
  const html = readFileSync(out, 'utf8');
  assert.ok(html.includes('&lt;script&gt;alert(1)&lt;\\/script&gt;') || html.includes('&lt;script&gt;alert(1)&lt;/script&gt;'), 'script tag escaped');
  assert.ok(!/<script>alert\(1\)<\/script>/.test(html), 'no live injected script');
});

// ── per-type blocks & mermaid inlining ────────────────────────────────────────────────────
test('docs: diagram block inlines mermaid; no diagram stays lean', () => {
  const withD = writeJSON('d2.json', { title: 'D', sections: [{ id: 's', title: 'S', blocks: [{ type: 'diagram', code: 'flowchart LR\n A-->B' }] }] });
  const noD = writeJSON('d3.json', { title: 'D', sections: [{ id: 's', title: 'S', blocks: [{ type: 'prose', text: 'hi' }] }] });
  const o1 = join(TMP, 'd2.html'), o2 = join(TMP, 'd3.html');
  build(['docs', withD, o1]); build(['docs', noD, o2]);
  assert.ok(readFileSync(o1, 'utf8').includes('mermaid'), 'diagram → mermaid present');
  const lean = readFileSync(o2, 'utf8');
  assert.ok(lean.length < 200000, 'no-diagram docs stays lean (mermaid not inlined)');
});

test('tutorial: renders every block type without error', () => {
  const inp = writeJSON('u2.json', {
    title: 'U', highlight: 'U', kicker: 'k', brand: 'b', subtitle: 's',
    legend: [['green', 'g']], stats: [{ n: '1', label: 'x', color: 'blue' }],
    sections: [{ id: 'a', title: 'A', blocks: [
      { type: 'prose', text: '`c` **b** *e* [l](https://x.com)' }, { type: 'heading', text: 'H' },
      { type: 'list', items: ['i'] }, { type: 'callout', kind: 'amber', title: 'T', body: 'b' },
      { type: 'kv-table', rows: [['k', 'v']] }, { type: 'table', headers: ['h'], rows: [['c']] },
      { type: 'code', title: 't', code: 'x=1' }, { type: 'diagram', code: 'flowchart LR\n A-->B' },
    ] }],
  });
  const out = join(TMP, 'u2.html');
  assert.equal(build(['tutorial', inp, out]).code, 0);
  const html = readFileSync(out, 'utf8');
  for (const cls of ['hero', 'legend', 'statbar', 'callout', 'kv', 'data', 'codewrap', 'mermaid'])
    assert.ok(html.includes(cls), 'contains .' + cls);
  assert.ok(html.includes('<a href="https://x.com">'), 'safe link rendered');
});

// ── image blocks / figures (FigJam embeds) ──────────────────────────────────────────────
const DATA_PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';

test('docs: image block renders a figure with a data: src, width cap and caption link', () => {
  const inp = writeJSON('img-d.json', { title: 'D', sections: [{ id: 's', title: 'S', blocks: [
    { type: 'image', src: DATA_PNG, alt: 'diagram', width: 1200, caption: 'a figure [drawn in FigJam →](https://www.figma.com/board/X)' },
  ] }] });
  const out = join(TMP, 'img-d.html');
  assert.equal(build(['docs', inp, out]).code, 0);
  const html = readFileSync(out, 'utf8');
  // the image renderer + its style class must be present in the client template
  assert.ok(html.includes("case 'image'"), 'docs client template handles the image block');
  assert.ok(html.includes('safeImgSrc'), 'docs image uses the data:-aware src guard');
  assert.ok(html.includes('.dp-figure'), 'dp-figure class shipped from tailwind.css');
  // the data URI + caption live in the embedded JSON island
  assert.ok(html.includes(DATA_PNG.slice(0, 40)), 'data: image embedded');
  assert.ok(html.includes('drawn in FigJam'), 'caption embedded');
  // a docs page with NO diagram block must NOT inline the mermaid LIBRARY (stays lean)
  assert.ok(html.length < 300000, 'image-only docs does not inline the mermaid lib (stays lean)');
});

test('tracker: figure field renders under the milestones (data:-aware, figma link)', () => {
  const inp = writeJSON('fig-t.json', { title: 'T',
    figure: { src: DATA_PNG, alt: 'map', width: 1200, caption: 'program map', figma: 'https://www.figma.com/board/X' } });
  const out = join(TMP, 'fig-t.html');
  assert.equal(build(['tracker', inp, out]).code, 0);
  const html = readFileSync(out, 'utf8');
  assert.ok(html.includes('tk-figure'), 'tk-figure element present');
  assert.ok(html.includes('.tk-figma-link'), 'figma-link class shipped');
  assert.ok(html.includes('DATA.figure'), 'tracker template reads DATA.figure');
  assert.ok(html.includes(DATA_PNG.slice(0, 40)), 'figure data: image embedded');
});

test('tutorial: image block honors the width cap (server-rendered figure)', () => {
  const inp = writeJSON('img-u.json', { title: 'U', sections: [{ id: 'a', title: 'A', blocks: [
    { type: 'image', src: DATA_PNG, alt: 'x', width: 1200, caption: 'cap [drawn in FigJam →](https://www.figma.com/board/X)' },
  ] }] });
  const out = join(TMP, 'img-u.html');
  assert.equal(build(['tutorial', inp, out]).code, 0);
  const html = readFileSync(out, 'utf8');
  assert.ok(html.includes('max-width:1200px'), 'figure capped to half-intrinsic width');
  assert.ok(html.includes('<figure class="figure"'), 'server-rendered figure');
  assert.ok(html.includes('<a href="https://www.figma.com/board/X">'), 'FigJam link rendered');
});

test('tracker: embeds the archive section data', () => {
  const inp = writeJSON('t2.json', { title: 'T', archive: { files: [{ file: 'worklog.md', entries: [{ date: '2026-07-10', heading: 'h', content: 'line1\nline2', hash: 'abc' }] }] } });
  const out = join(TMP, 't2.html');
  build(['tracker', inp, out]);
  assert.ok(readFileSync(out, 'utf8').includes('worklog.md'), 'archive file name embedded');
});

// ── the `$` corruption regression (mermaid/data with $&, $`, $') ──────────────────────────
test('regression: a $` / $& / $\\x27 in data does not corrupt output', () => {
  const inp = writeJSON('r1.json', { title: 'R', subtitle: 'has $` and $& and $\' and $$ tokens', sections: [{ id: 'a', title: 'A', blocks: [{ type: 'prose', text: 'x' }] }] });
  const out = join(TMP, 'r1.html');
  build(['tutorial', inp, out]);
  const html = readFileSync(out, 'utf8');
  assert.equal((html.match(/<title>/g) || []).length, 1, 'head not duplicated by $-pattern corruption');
});

// ── project-css / project-theme overrides ─────────────────────────────────────────────────
test('project-css (local path) cascades AFTER the skill sheet', () => {
  const inp = writeJSON('p1.json', { title: 'P', sections: [{ id: 'a', title: 'A', blocks: [] }] });
  const pcss = join(TMP, 'proj.css'); writeFileSync(pcss, ':root{--lp-accent:#C026D3}');
  const out = join(TMP, 'p1.html'); build(['docs', inp, out, '--project-css', pcss]);
  const html = readFileSync(out, 'utf8');
  const iSkill = html.indexOf('--lp-accent:#316ADD'), iProj = html.indexOf('data-project-css');
  assert.ok(iSkill >= 0 && iProj > iSkill, 'project <style> comes after the skill sheet');
});

test('project-css (URL) is <link>ed and added to the CSP style-src', () => {
  const inp = writeJSON('p2.json', { title: 'P', sections: [] });
  const out = join(TMP, 'p2.html'); build(['docs', inp, out, '--project-css', 'https://cdn.example.com/app.css']);
  const html = readFileSync(out, 'utf8');
  assert.ok(html.includes('<link rel="stylesheet" href="https://cdn.example.com/app.css">'), 'url linked');
  assert.ok(html.includes('style-src') && html.includes('https://cdn.example.com'), 'origin in CSP');
});

test('project-css-only ships NO skill sheet and NO CSP (inherit host app)', () => {
  const inp = writeJSON('p3.json', { title: 'P', sections: [] });
  const pcss = join(TMP, 'proj2.css'); writeFileSync(pcss, '.x{color:red}');
  const out = join(TMP, 'p3.html'); build(['docs', inp, out, '--project-css-only', '--project-css', pcss]);
  const html = readFileSync(out, 'utf8');
  assert.ok(!html.includes('--lp-accent:#316ADD'), 'skill sheet dropped');
  assert.ok(!html.includes('Content-Security-Policy'), 'CSP dropped (host controls)');
  assert.ok(html.includes('.x{color:red}'), 'project sheet inlined');
});

test('project-theme dark disables the toggle and sets the theme', () => {
  const inp = writeJSON('p4.json', { title: 'P', sections: [] });
  const out = join(TMP, 'p4.html'); build(['docs', inp, out, '--project-theme', 'dark']);
  const html = readFileSync(out, 'utf8');
  assert.ok(html.includes('data-theme="dark"'), 'html theme dark');
  assert.ok(html.includes('"themeToggle":false'), 'toggle disabled');
});

test('no-fonts drops the font link and font-origins from CSP', () => {
  const inp = writeJSON('p5.json', { title: 'P', sections: [] });
  const out = join(TMP, 'p5.html'); build(['tracker', inp, out, '--no-fonts']);
  const html = readFileSync(out, 'utf8');
  assert.ok(!html.includes('<link href="https://fonts.googleapis'), 'no font stylesheet link');
  assert.ok(!html.includes('fonts.googleapis.com') && !html.includes('gstatic'), 'no font origins anywhere');
});

// ── optional lock round-trip (decrypt with node:crypto = Web-Crypto-compatible envelope) ──
test('lock: AES-256-GCM envelope round-trips back to the tutorial', () => {
  const inp = writeJSON('l1.json', { title: 'Secret Course', sections: [{ id: 'a', title: 'A', blocks: [{ type: 'prose', text: 'body' }] }] });
  const out = join(TMP, 'l1.html');
  const r = build(['tutorial', inp, out, '--lock', 'correct horse battery staple', '--iter', '150000']);
  assert.equal(r.code, 0);
  const html = readFileSync(out, 'utf8');
  assert.ok(html.includes('AES-256-GCM'), 'gate emitted');
  const m = /<script id="lp-payload" type="application\/json">([\s\S]*?)<\/script>/.exec(html);
  assert.ok(m, 'payload island present');
  const env = JSON.parse(m[1].replaceAll('<\\/', '</'));
  const key = pbkdf2Sync('correct horse battery staple'.normalize('NFKC'), Buffer.from(env.salt, 'base64'), env.iter, 32, 'sha256');
  const ct = Buffer.from(env.ct, 'base64');
  const data = ct.subarray(0, ct.length - 16), tag = ct.subarray(ct.length - 16);
  const dec = createDecipheriv('aes-256-gcm', key, Buffer.from(env.iv, 'base64'));
  dec.setAuthTag(tag);
  const plain = Buffer.concat([dec.update(data), dec.final()]).toString('utf8');
  assert.ok(plain.includes('Secret Course') && plain.includes('body'), 'decrypts to the tutorial');
  // wrong passcode fails the auth tag
  const badKey = pbkdf2Sync('wrong', Buffer.from(env.salt, 'base64'), env.iter, 32, 'sha256');
  const bad = createDecipheriv('aes-256-gcm', badKey, Buffer.from(env.iv, 'base64'));
  bad.setAuthTag(tag);
  assert.throws(() => { bad.update(data); bad.final(); }, 'wrong passcode fails auth');
});

// ── CLI guardrails ────────────────────────────────────────────────────────────────────────
test('rejects an unknown site type', () => {
  const inp = writeJSON('g1.json', { title: 'G' });
  const r = build(['website', inp, join(TMP, 'g1.html')]);
  assert.notEqual(r.code, 0);
  assert.ok(/docs\|tracker\|tutorial/.test(r.out));
});
