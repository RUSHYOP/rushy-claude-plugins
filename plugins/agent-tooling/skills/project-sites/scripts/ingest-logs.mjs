#!/usr/bin/env node
// [project-sites] Ingest a project's journal markdown (mistakes.md / learnings.md /
// worklog.md, or any files you name) into a tracker data JSON as a dated `archive` section.
// The tracker template renders the archive as an expandable, dated, per-file log. Because the
// tracker then holds the canonical dated originals, the source .md files MAY be deleted
// afterwards (this script does NOT delete them). Zero dependencies (node: builtins only).
//
// DATED ENTRIES: each file is split on `##` / `###` headings whose text contains a date
// (ISO YYYY-MM-DD, or "9 Jul 2026" / "Jul 9, 2026" style) into one entry per date. A file
// with no dated headings is stored as ONE snapshot dated to TODAY (local date via new Date()).
// Content is preserved VERBATIM (escaped at render time — never innerHTML).
//
// IDEMPOTENT: entries are keyed by (file, date). Re-ingesting UNCHANGED content is a no-op
// (same date + same content-hash → skipped). CHANGED content for the same date updates that
// dated entry; a new date (e.g. a next-day snapshot of a changed file) is appended as a new
// dated snapshot. So running this on a schedule never duplicates unchanged history.
//
// USAGE
//   node ingest-logs.mjs --data tracker.json                       # auto-discover in CWD
//   node ingest-logs.mjs --data tracker.json --dir /path/to/project
//   node ingest-logs.mjs --data tracker.json --file notes/worklog.md --file CHANGELOG.md
//   node ingest-logs.mjs --data tracker.json --today 2026-07-10    # override "today"
//   # then: node build.mjs tracker tracker.json dashboard.html
//
// OPTIONS
//   --data <f>        tracker data JSON to edit in place (required).
//   --dir <d>         directory to auto-discover the default journal files in (default: CWD).
//   --file <f>        an explicit file to ingest; repeat for multiple. Disables auto-discovery.
//   --note "…"        set the archive section's intro note.
//   --today YYYY-MM-DD  override the snapshot date (default: local date from new Date()).

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve, basename, join } from 'node:path';
import { pathToFileURL } from 'node:url';

// Run-as-main guard: importing this module (e.g. a unit test importing `redact`) must NOT
// execute the CLI (which would exit on a missing --data). The CLI body runs only when this
// file is the process entry point.
const IS_MAIN = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

function parseArgs(argv) {
  const o = { file: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith('--')) continue;
    const key = a.slice(2);
    const val = (argv[i + 1] && !argv[i + 1].startsWith('--')) ? argv[++i] : true;
    if (key === 'file') o.file.push(String(val));
    else o[key] = val;
  }
  return o;
}
const A = parseArgs(process.argv.slice(2));
function die(m) { console.error('✗ ' + m); process.exit(1); }

// TODAY — local date (this runs in Node, so new Date() is the real local date).
function localToday() {
  if (typeof A.today === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(A.today)) return A.today;
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
}
const TODAY = localToday();

const MON = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 };
function pad2(n) { return String(n).padStart(2, '0'); }
// Extract a normalised YYYY-MM-DD from a heading's text, if it carries a date.
function dateFromHeading(text) {
  const iso = /(\d{4})-(\d{2})-(\d{2})/.exec(text);
  if (iso) return iso[1] + '-' + iso[2] + '-' + iso[3];
  // "9 Jul 2026" / "9 July 2026"
  let m = /\b(\d{1,2})\s+([A-Za-z]{3,})\.?\s+(\d{4})\b/.exec(text);
  if (m && MON[m[2].slice(0, 3).toLowerCase()]) return m[3] + '-' + pad2(MON[m[2].slice(0, 3).toLowerCase()]) + '-' + pad2(+m[1]);
  // "Jul 9, 2026" / "July 9 2026"
  m = /\b([A-Za-z]{3,})\.?\s+(\d{1,2}),?\s+(\d{4})\b/.exec(text);
  if (m && MON[m[1].slice(0, 3).toLowerCase()]) return m[3] + '-' + pad2(MON[m[1].slice(0, 3).toLowerCase()]) + '-' + pad2(+m[2]);
  return null;
}
function sha(s) { return createHash('sha256').update(s, 'utf8').digest('hex'); }

// [ERP-3] REDACTION PASS. The tracker archive embeds journal markdown VERBATIM and is now
// served on an OPEN (no-login) route, so any credential/secret that ever lands in a log MUST
// be masked at ingest time. Applied to every entry's heading + content BEFORE hashing, so a
// re-ingest of previously-unredacted content updates it (the mask changes the hash). Ordered
// most-specific → generic so a broad rule never eats a token a narrower rule would mask first.
const REDACTED = '[REDACTED]';
export function redact(input) {
  let s = String(input == null ? '' : input);
  // 1. sshpass inline password: sshpass -p 'secret' | "secret" | bareword
  s = s.replace(/(sshpass\s+-p\s+)('([^']*)'|"([^"]*)"|\S+)/gi, `$1'${REDACTED}'`);
  // 2. PEM private-key blocks (any key type), whole block incl. delimiters
  s = s.replace(/-----BEGIN [A-Z0-9 ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z0-9 ]*PRIVATE KEY-----/g, REDACTED);
  // 3. GitHub personal-access / OAuth tokens
  s = s.replace(/\b(?:ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9]{20,}/g, REDACTED);
  // 4. The two real project credentials (server root pw + the app-login password), verbatim.
  s = s.replace(/root\$\$123/g, REDACTED);
  s = s.replace(/erpbrainvisualization!@7338/g, REDACTED);
  // 5. Generic `password: value` / `password = value` — keep the label, mask the value only.
  s = s.replace(/(password\s*[:=]\s*)(\S+)/gi, `$1${REDACTED}`);
  return s;
}

// Split a markdown file into dated entries. If any `##`/`###` heading carries a date, we
// segment the file at those dated headings (content between one dated heading and the next).
// Any preamble before the first dated heading is attached to a TODAY snapshot. If NO heading
// is dated, the whole file becomes one TODAY snapshot.
function parseFile(name, text) {
  const lines = text.split('\n');
  // find dated headings and their line indices
  const marks = [];
  for (let i = 0; i < lines.length; i++) {
    const hm = /^(#{2,3})\s+(.*\S)\s*$/.exec(lines[i]);
    if (hm) { const d = dateFromHeading(hm[2]); if (d) marks.push({ i, date: d, heading: hm[2].trim() }); }
  }
  if (!marks.length) {
    const content = redact(text.replace(/\s+$/, ''));
    if (!content) return [];
    return [{ date: TODAY, heading: 'Snapshot — ' + TODAY, content, hash: sha(content) }];
  }
  const entries = [];
  // preamble before the first dated heading → TODAY snapshot, but ONLY if it has substantive
  // body (not just a lone `# Title` line), so a title heading doesn't collide with a real
  // same-day entry. Entries are keyed by (file, date): at most one entry per date per file.
  const preLines = lines.slice(0, marks[0].i);
  const pre = redact(preLines.join('\n').trim());
  const preBody = preLines.filter((l) => !/^#{1,6}\s/.test(l)).join('\n').trim();
  if (pre && preBody) entries.push({ date: TODAY, heading: 'Preamble — ' + TODAY, content: pre, hash: sha(pre) });
  for (let k = 0; k < marks.length; k++) {
    const start = marks[k].i;
    const end = k + 1 < marks.length ? marks[k + 1].i : lines.length;
    const content = redact(lines.slice(start, end).join('\n').replace(/\s+$/, ''));
    entries.push({ date: marks[k].date, heading: redact(marks[k].heading), content, hash: sha(content) });
  }
  return entries;
}

// ── CLI (runs only when invoked directly; import-safe for tests) ─────────────────────────
if (IS_MAIN) {
if (!A.data) die('missing --data <tracker.json>');

// Resolve which files to ingest.
const DEFAULT_FILES = ['mistakes.md', 'learnings.md', 'worklog.md'];
let targets = [];
if (A.file.length) {
  targets = A.file.map((f) => resolve(String(f)));
} else {
  const dir = A.dir ? resolve(String(A.dir)) : process.cwd();
  targets = DEFAULT_FILES.map((f) => join(dir, f)).filter((p) => existsSync(p));
}
if (!targets.length) { console.log('  (nothing to ingest — no journal files found; archive left unchanged.)'); process.exit(0); }

// Load the tracker JSON.
const dataPath = resolve(String(A.data));
let data;
try { data = JSON.parse(readFileSync(dataPath, 'utf8')); }
catch (e) { die('cannot read/parse --data: ' + e.message); }
if (!data.archive || typeof data.archive !== 'object') data.archive = { files: [] };
if (!Array.isArray(data.archive.files)) data.archive.files = [];
if (typeof A.note === 'string') data.archive.note = A.note;

let added = 0, updated = 0, noop = 0, skippedMissing = 0;
for (const path of targets) {
  if (!existsSync(path)) { skippedMissing++; continue; }
  const name = basename(path);
  const text = readFileSync(path, 'utf8');
  const parsed = parseFile(name, text);
  if (!parsed.length) continue;

  let fileRec = data.archive.files.find((f) => f && f.file === name);
  if (!fileRec) { fileRec = { file: name, entries: [] }; data.archive.files.push(fileRec); }
  if (!Array.isArray(fileRec.entries)) fileRec.entries = [];

  for (const ent of parsed) {
    const ex = fileRec.entries.find((e) => e && e.date === ent.date);
    if (!ex) { fileRec.entries.push(ent); added++; }
    else if (ex.hash === ent.hash) { noop++; }               // (file,date,hash) all equal → no-op
    else { ex.heading = ent.heading; ex.content = ent.content; ex.hash = ent.hash; updated++; }
  }
  // keep entries oldest→newest in the file (the viewer sorts newest-first for display)
  fileRec.entries.sort((a, b) => String(a.date || '').localeCompare(String(b.date || '')));
}

writeFileSync(dataPath, JSON.stringify(data, null, 2) + '\n', 'utf8');
console.log(`✓ ingested ${targets.length} file(s) into ${A.data} — ${added} added · ${updated} updated · ${noop} unchanged`);
console.log('  now run: node build.mjs tracker ' + A.data + ' <out.html>');
} // end IS_MAIN
