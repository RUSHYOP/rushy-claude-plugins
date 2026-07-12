// [project-sites] Maintenance-script tests: add-day idempotency + ingest-logs idempotency
// and date-parsing. Run: node --test tests/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { redact } from '../scripts/ingest-logs.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const SKILL = resolve(HERE, '..');
const ADD_DAY = resolve(SKILL, 'scripts/add-day.mjs');
const INGEST = resolve(SKILL, 'scripts/ingest-logs.mjs');
const TMP = mkdtempSync(join(tmpdir(), 'ps-maint-'));

function run(script, args) { return spawnSync('node', [script, ...args], { encoding: 'utf8' }); }
function load(p) { return JSON.parse(readFileSync(p, 'utf8')); }

// ── add-day ───────────────────────────────────────────────────────────────────────────────
test('add-day is idempotent per date and supports --append-bullets', () => {
  const p = join(TMP, 'trk.json'); writeFileSync(p, JSON.stringify({ title: 'T' }));
  run(ADD_DAY, ['--data', p, '--date', '2026-07-10', '--bullet', 'one', '--today']);
  run(ADD_DAY, ['--data', p, '--date', '2026-07-10', '--bullet', 'one']); // re-run same date
  let d = load(p);
  assert.equal(d.days.length, 1, 'same date is updated, not duplicated');
  assert.deepEqual(d.days[0].bullets, ['one'], 'bullets replaced, still single');
  assert.equal(d.today, '2026-07-10');
  run(ADD_DAY, ['--data', p, '--date', '2026-07-10', '--bullet', 'two', '--append-bullets']);
  d = load(p);
  assert.deepEqual(d.days[0].bullets, ['one', 'two'], 'append-bullets adds');
  run(ADD_DAY, ['--data', p, '--date', '2026-07-11', '--bullet', 'next']);
  d = load(p);
  assert.equal(d.days.length, 2, 'a new date appends a new day');
  assert.deepEqual(d.days.map((x) => x.date), ['2026-07-10', '2026-07-11'], 'kept sorted oldest→newest');
});

// ── ingest-logs ─────────────────────────────────────────────────────────────────────────────
function writeLogs(dir, worklog, mistakes) {
  writeFileSync(join(dir, 'worklog.md'), worklog);
  if (mistakes != null) writeFileSync(join(dir, 'mistakes.md'), mistakes);
}

test('ingest-logs: parses dated ## headings and is idempotent', () => {
  const dir = mkdtempSync(join(TMP, 'proj-'));
  const p = join(dir, 'trk.json'); writeFileSync(p, JSON.stringify({ title: 'T' }));
  writeLogs(dir, '# Worklog\n\n## 2026-07-08 — a\n- x\n\n## 2026-07-09 — b\n- y\n', 'no dated headings here\n');
  const r1 = run(INGEST, ['--data', p, '--dir', dir, '--today', '2026-07-10']);
  assert.match(r1.stdout, /3 added · 0 updated · 0 unchanged/);
  const r2 = run(INGEST, ['--data', p, '--dir', dir, '--today', '2026-07-10']);
  assert.match(r2.stdout, /0 added · 0 updated · 3 unchanged/, 're-ingest unchanged = no-op');
  const d = load(p);
  const wl = d.archive.files.find((f) => f.file === 'worklog.md');
  assert.deepEqual(wl.entries.map((e) => e.date), ['2026-07-08', '2026-07-09'], 'two dated entries');
  const ms = d.archive.files.find((f) => f.file === 'mistakes.md');
  assert.equal(ms.entries.length, 1, 'undated file → one snapshot');
  assert.equal(ms.entries[0].date, '2026-07-10', 'snapshot dated to --today');
  assert.ok(wl.entries[1].content.includes('## 2026-07-09'), 'content preserved verbatim');
});

test('ingest-logs: changed content updates the dated entry; a new date is appended', () => {
  const dir = mkdtempSync(join(TMP, 'proj-'));
  const p = join(dir, 'trk.json'); writeFileSync(p, JSON.stringify({ title: 'T' }));
  writeLogs(dir, '## 2026-07-08 — a\n- x\n\n## 2026-07-09 — b\n- y\n', null);
  run(INGEST, ['--data', p, '--dir', dir, '--today', '2026-07-10']);
  // change the 07-09 body AND add a new 07-10 heading
  writeFileSync(join(dir, 'worklog.md'), '## 2026-07-08 — a\n- x\n\n## 2026-07-09 — b\n- y\n- CHANGED\n\n## 2026-07-10 — c\n- z\n');
  const r = run(INGEST, ['--data', p, '--dir', dir, '--today', '2026-07-10']);
  assert.match(r.stdout, /1 added · 1 updated · 1 unchanged/);
  const d = load(p);
  const wl = d.archive.files.find((f) => f.file === 'worklog.md');
  assert.deepEqual(wl.entries.map((e) => e.date), ['2026-07-08', '2026-07-09', '2026-07-10']);
  assert.ok(wl.entries[1].content.includes('CHANGED'), 'changed entry updated in place');
});

test('ingest-logs: parses "9 Jul 2026" and "Jul 9, 2026" heading dates', () => {
  const dir = mkdtempSync(join(TMP, 'proj-'));
  const p = join(dir, 'trk.json'); writeFileSync(p, JSON.stringify({ title: 'T' }));
  writeFileSync(join(dir, 'worklog.md'), '## 9 Jul 2026 — long form\n- a\n\n### Jul 10, 2026 — comma form\n- b\n');
  run(INGEST, ['--data', p, '--dir', dir, '--file', join(dir, 'worklog.md')]);
  const d = load(p);
  const wl = d.archive.files.find((f) => f.file === 'worklog.md');
  assert.deepEqual(wl.entries.map((e) => e.date).sort(), ['2026-07-09', '2026-07-10']);
});

test('ingest-logs: no journal files → archive untouched (no-op, exit 0)', () => {
  const dir = mkdtempSync(join(TMP, 'empty-'));
  const p = join(dir, 'trk.json'); writeFileSync(p, JSON.stringify({ title: 'T' }));
  const r = run(INGEST, ['--data', p, '--dir', dir]);
  assert.equal(r.status, 0);
  const d = load(p);
  assert.ok(!d.archive || !(d.archive.files || []).length, 'no archive added');
});

test('ingest-logs: content is preserved VERBATIM (no HTML injection at the data layer)', () => {
  const dir = mkdtempSync(join(TMP, 'proj-'));
  const p = join(dir, 'trk.json'); writeFileSync(p, JSON.stringify({ title: 'T' }));
  writeFileSync(join(dir, 'worklog.md'), '## 2026-07-10 — x\n<script>alert(1)</script> & <b>raw</b>\n');
  run(INGEST, ['--data', p, '--dir', dir]);
  const d = load(p);
  const e = d.archive.files[0].entries[0];
  assert.ok(e.content.includes('<script>alert(1)</script>'), 'stored verbatim (escaped only at render)');
});

// ── redaction (the OPEN-route hard requirement: no secret survives ingest) ──────────────────
test('redact: masks passwords, ssh, tokens, PEM keys, generic password assignments', () => {
  const cases = [
    ["sshpass -p 'root$$123' ssh qltyadmin@h", ["root$$123"], "sshpass -p '[REDACTED]'"],
    ['login: erpuserbrainteam / erpbrainvisualization!@7338', ['erpbrainvisualization!@7338'], '[REDACTED]'],
    ['export TOKEN=ghp_ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789', ['ghp_ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'], '[REDACTED]'],
    ['db password: hunter2xyz here', ['hunter2xyz'], 'password: [REDACTED]'],
    ['POSTGRES_PASSWORD=SuperSecret123', ['SuperSecret123'], '[REDACTED]'],
    ['-----BEGIN RSA PRIVATE KEY-----\nMIIabc\n-----END RSA PRIVATE KEY-----', ['MIIabc'], '[REDACTED]'],
  ];
  for (const [input, mustBeGone, mustContain] of cases) {
    const out = redact(input);
    for (const g of mustBeGone) assert.ok(!out.includes(g), `secret leaked: ${g} in ${out}`);
    assert.ok(out.includes(mustContain), `expected ${mustContain} in ${out}`);
  }
  // a benign mention with no assignment is untouched
  assert.equal(redact('the password policy requires 12 chars'), 'the password policy requires 12 chars');
});

test('ingest-logs: redacts secrets in ingested log content (open-route safety)', () => {
  const dir = mkdtempSync(join(TMP, 'redact-'));
  const p = join(dir, 'trk.json'); writeFileSync(p, JSON.stringify({ title: 'T' }));
  writeFileSync(join(dir, 'worklog.md'),
    "## 2026-07-10 — deploy\nssh: sshpass -p 'root$$123' qltyadmin@host\napp login pw erpbrainvisualization!@7338\ntoken ghp_ZZZZZZZZZZZZZZZZZZZZZZZZZZ0\n");
  run(INGEST, ['--data', p, '--dir', dir]);
  const d = load(p);
  const c = d.archive.files[0].entries[0].content;
  assert.ok(!c.includes('root$$123'), 'server password masked');
  assert.ok(!c.includes('erpbrainvisualization!@7338'), 'app password masked');
  assert.ok(!c.includes('ghp_ZZZZZZZZZZZZZZZZZZZZZZZZZZ0'), 'gh token masked');
  assert.ok(c.includes('[REDACTED]'), 'redaction marker present');
});
