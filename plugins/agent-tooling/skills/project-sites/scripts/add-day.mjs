#!/usr/bin/env node
// [tracker-site] Append (or update) one day in a tracker data JSON — the common periodic
// maintenance action. The data file stays the durable source of truth; run build.mjs
// afterwards to regenerate the site. Idempotent per date: re-running for the same --date
// UPDATES that day rather than duplicating it (use --append-bullets to add to, instead of
// replace, the existing bullets). Zero dependencies (node:fs only).
//
// Usage:
//   node add-day.mjs --data tracker.json --date 2026-07-10 \
//        --bullet "Shipped the API layer" --bullet "Fixed 12 eval failures" \
//        --note "Milestone 1 — day 12 of 14" --today
//   node add-day.mjs --data tracker.json --date 2026-07-10 --bullet "Late add" --append-bullets
//   # then: node build.mjs --data tracker.json --out dashboard.html
//
// Options:
//   --data <f>          tracker data JSON to edit in place (required).
//   --date YYYY-MM-DD   the day (required).
//   --bullet "…"        a bullet line; repeat the flag for multiple bullets.
//   --note "…"          optional per-day note (one line, shown under the bullets).
//   --title "…"         optional per-day sub-heading.
//   --badge "…"         optional small badge label (e.g. "Milestone 1").
//   --today             mark this date as "today" (sets data.today = this date).
//   --append-bullets    if the date already exists, append the new bullets instead of
//                       replacing that day's bullets.

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

function args(argv) {
  const o = { bullet: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith('--')) continue;
    const key = a.slice(2);
    const val = (argv[i + 1] && !argv[i + 1].startsWith('--')) ? argv[++i] : true;
    if (key === 'bullet') o.bullet.push(String(val));
    else o[key] = val;
  }
  return o;
}
const A = args(process.argv.slice(2));
function die(m) { console.error('✗ ' + m); process.exit(1); }

if (!A.data) die('missing --data <tracker.json>');
if (!A.date || A.date === true) die('missing --date YYYY-MM-DD');
if (!/^\d{4}-\d{2}-\d{2}$/.test(String(A.date))) die('--date must be YYYY-MM-DD');

const path = resolve(String(A.data));
let data;
try { data = JSON.parse(readFileSync(path, 'utf8')); }
catch (e) { die('cannot read/parse --data: ' + e.message); }
if (!Array.isArray(data.days)) data.days = [];

const bullets = A.bullet.filter(Boolean);
const existing = data.days.find((d) => d && d.date === A.date);

if (existing) {
  if (A['append-bullets']) {
    existing.bullets = (existing.bullets || []).concat(bullets);
  } else if (bullets.length) {
    existing.bullets = bullets;
  }
  if (typeof A.note === 'string') existing.note = A.note;
  if (typeof A.title === 'string') existing.title = A.title;
  if (typeof A.badge === 'string') existing.badge = A.badge;
  console.log(`✓ updated existing day ${A.date} (${(existing.bullets || []).length} bullets)`);
} else {
  const day = { date: String(A.date), bullets };
  if (typeof A.note === 'string') day.note = A.note;
  if (typeof A.title === 'string') day.title = A.title;
  if (typeof A.badge === 'string') day.badge = A.badge;
  data.days.push(day);
  console.log(`✓ added day ${A.date} (${bullets.length} bullets)`);
}

if (A.today) data.today = String(A.date);

// keep days sorted oldest→newest in the file (the viewer sorts newest-first for display)
data.days.sort((a, b) => String(a.date || '').localeCompare(String(b.date || '')));

writeFileSync(path, JSON.stringify(data, null, 2) + '\n', 'utf8');
console.log('  saved ' + A.data + ' — now run build.mjs to regenerate the site.');
