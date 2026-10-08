// agent-dashboard: a full-height pane over every Claude session, agent and subagent on this machine.
import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register, Timer } from 'claude-code'

import type { AgentView, RowStatus, SessionView, Snapshot } from '../types'
import {
  STATUS_RANK,
  appleScriptFor,
  bar,
  fromAgentInfo,
  groupByCodebase,
  parseLivePids,
  parseMeta,
  parseRegistry,
  planAction,
  progressOf,
  shortPath,
  slugOf,
  statusFrom,
  tailIsDone,
  toggleLabel,
  visibleAgents,
} from './model'
import type { Plan, SessionRecord } from './model'

type Engine = EngineInterface
type Action = 'toggle' | 'parallelise'

const PANE = 'agent-dashboard'
const REFRESH_MS = 3000
const TAIL_BYTES = 65536
const MAX_AGENTS_PER_SESSION = 200
const READ_CONCURRENCY = 8
const LOG_MAX_BYTES = 2 * 1024 * 1024

const snapshot = atom({ plugin: 'agent-dashboard', key: 'snapshot' } as const, { sessions: [], refreshedAt: 0 })
const expanded = atom({ plugin: 'agent-dashboard', key: 'expanded' } as const, [])
const turnRef = atom({ plugin: 'agent-dashboard', key: 'turnId' } as const, '')

// Module state: caches and the poll timer, rebuilt on reload (drawn state lives in $.state).
let timer: Timer | undefined
let isRefreshing = false
let hasRefreshed = false
let lastError = ''
let logChain: Promise<void> = Promise.resolve()
const metaCache = new Map<string, ReturnType<typeof parseMeta>>()
const doneCache = new Map<string, { mtimeMs: number; isDone: boolean }>()

const errText = (err: unknown) => (err instanceof Error ? err.message : String(err))

// Structured JSONL log under <plugin>/logs/, one file per day, appended in call order.
function log($: Engine, event: string, fields: Record<string, unknown> = {}) {
  const now = new Date()
  const entry = JSON.stringify({ ts: now.toISOString(), event, ...fields })
  const path = `${$.plugin.root}/logs/dashboard-${now.toISOString().slice(0, 10)}.jsonl`
  logChain = logChain
    .then(() => appendLog($, path, entry))
    .catch(err => $.ui.log(`agent-dashboard: log write failed: ${errText(err)}`, { to: 'debug' }))
}

async function appendLog($: Engine, path: string, entry: string) {
  let prior = ''
  if (await $.fs.exists(path)) {
    prior = await $.fs.read(path)
    // Bounded file: drop the oldest half once it passes the cap.
    if (prior.length > LOG_MAX_BYTES) prior = prior.slice(prior.indexOf('\n', prior.length / 2) + 1)
  }
  await $.fs.write(path, `${prior}${entry}\n`)
}

// Runs `fn` over `items` with at most `limit` in flight (bounded disk/process load).
async function mapLimited<T, R>(items: readonly T[], limit: number, fn: (t: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length)
  let next = 0
  const worker = async () => {
    while (next < items.length) {
      const i = next++
      out[i] = await fn(items[i]!)
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker))
  return out
}

const sortAgents = (agents: AgentView[]) => [...agents].sort((a, b) => STATUS_RANK[a.status] - STATUS_RANK[b.status])

// This session: agents straight from the engine, with real statuses and parent links.
// Falls back to the transcript folder when the engine refuses agent.list (e.g. from a timer, no bound session).
async function ownView($: Engine, home: string, r: SessionRecord, now: number): Promise<SessionView> {
  try {
    const infos = await $.agent.list()
    return { ...r, isSelf: true, agents: sortAgents(infos.map(i => fromAgentInfo(i, infos))) }
  } catch {
    const view = await foreignView($, home, r, now)
    // Still ours: TaskStop takes these ids, so keep hard controls.
    return { ...view, isSelf: true, agents: view.agents.map(a => ({ ...a, isOwn: true })) }
  }
}

// One subagent transcript of another session: meta (cached once) and done-ness (cached per mtime).
async function foreignAgent($: Engine, subDir: string, name: string, mtimeMs: number, now: number): Promise<AgentView> {
  const id = name.slice('agent-'.length, -'.jsonl'.length)
  const path = `${subDir}/${name}`
  let meta = metaCache.get(path)
  if (meta === undefined) {
    const text = await $.fs.read(`${subDir}/agent-${id}.meta.json`).catch(() => undefined)
    meta = parseMeta(text)
    metaCache.set(path, meta)
  }
  let cached = doneCache.get(path)
  if (cached === undefined || cached.mtimeMs !== mtimeMs) {
    // Transcripts reach many MB (over $.fs.read's 4 MiB cap), so read only the tail.
    const tail = await $.process.run(['tail', '-c', String(TAIL_BYTES), path]).catch(() => undefined)
    cached = { mtimeMs, isDone: tail !== undefined && tail.exitCode === 0 && tailIsDone(tail.stdout) }
    doneCache.set(path, cached)
  }
  return {
    id,
    label: meta.label ?? id,
    type: meta.type,
    model: meta.model,
    status: statusFrom(cached.isDone, mtimeMs, now),
    depth: 1,
    isOwn: false,
  }
}

// Another session: subagents from its transcript folder, limited to this process's lifetime.
async function foreignView($: Engine, home: string, r: SessionRecord, now: number): Promise<SessionView> {
  const base: SessionView = { ...r, isSelf: false, agents: [] }
  const projectDir = `${home}/.claude/projects/${slugOf(r.cwd)}`
  const subDir = `${projectDir}/${r.sessionId}/subagents`
  let entries: Awaited<ReturnType<Engine['fs']['list']>>
  try {
    entries = await $.fs.list(subDir)
  } catch {
    // No subagents folder is normal; no transcript at all means the cwd moved (/cd) and agents are unknown.
    const hasTranscript = await $.fs.exists(`${projectDir}/${r.sessionId}.jsonl`)
    return hasTranscript ? base : { ...base, note: 'transcript not found (cwd changed?)' }
  }
  const since = r.startedAt - 60_000
  const files = entries
    .filter(e => e.kind === 'file' && e.name.startsWith('agent-') && e.name.endsWith('.jsonl') && e.mtimeMs >= since)
    .sort((a, b) => b.mtimeMs - a.mtimeMs)
    .slice(0, MAX_AGENTS_PER_SESSION)
  const agents = await mapLimited(files, READ_CONCURRENCY, f => foreignAgent($, subDir, f.name, f.mtimeMs, now))
  return { ...base, agents: sortAgents(agents) }
}

async function readRecords($: Engine, regDir: string): Promise<SessionRecord[]> {
  const names = (await $.fs.list(regDir)).filter(e => e.kind === 'file' && e.name.endsWith('.json'))
  const parsed = await mapLimited(names, READ_CONCURRENCY, e =>
    $.fs.read(`${regDir}/${e.name}`).then(parseRegistry, () => undefined),
  )
  return parsed.filter((r): r is SessionRecord => r !== undefined)
}

// One pass over ~/.claude/sessions: live claude pids only, each with its agents.
async function refresh($: Engine) {
  if (isRefreshing) return
  isRefreshing = true
  try {
    const home = (await $.env.get('HOME')) ?? ''
    const records = await readRecords($, `${home}/.claude/sessions`)
    const ps = records.length
      ? await $.process.run(['ps', '-p', records.map(r => r.pid).join(','), '-o', 'pid=,comm='])
      : { stdout: '' }
    const live = parseLivePids(ps.stdout)
    const selfId = await $.session.id()
    const now = await $.clock.now()
    const liveRecords = records.filter(r => live.has(r.pid) || r.sessionId === selfId)
    // A session that writes no registry file (headless) still lists itself.
    if (!liveRecords.some(r => r.sessionId === selfId)) {
      const cwd = await $.session.cwd()
      liveRecords.push({ pid: 0, sessionId: selfId, cwd, startedAt: now, name: 'this session', status: 'busy' })
    }
    const sessions = await Promise.all(
      liveRecords.map(r => (r.sessionId === selfId ? ownView($, home, r, now) : foreignView($, home, r, now))),
    )
    await update($, snapshot, () => ({ sessions, refreshedAt: now }))
    // Log the first good pass after open/error (not every poll) with its cost, for diagnosis.
    if (!hasRefreshed || lastError !== '') {
      const agents = sessions.reduce((n, s) => n + s.agents.length, 0)
      log($, 'refresh.ok', { ms: (await $.clock.now()) - now, sessions: sessions.length, agents })
    }
    hasRefreshed = true
    lastError = ''
  } catch (err) {
    const message = errText(err)
    if (message !== lastError) log($, 'refresh.error', { message })
    lastError = message
    await update($, snapshot, s => ({ ...s, error: message }))
  } finally {
    isRefreshing = false
  }
}

// Polls only while the pane is open; the first pass runs from a timer so a draw never writes state.
function startPolling($: Engine) {
  if (timer !== undefined) return
  timer = $.clock.every(REFRESH_MS, () => void refresh($))
  $.clock.after(0, () => void refresh($))
}

function stopPolling() {
  timer?.cancel()
  timer = undefined
}

async function openPane($: Engine) {
  await $.ui.open({ id: PANE, title: 'Agent dashboard', focus: true, rows: 200, columns: 400 })
  startPolling($)
  log($, 'pane.open')
}

// Opens a new terminal window running the dashboard in its own session.
async function openWindow($: Engine): Promise<string> {
  const which = await $.process.run(['/usr/bin/which', 'claude'])
  const bin = which.exitCode === 0 && which.stdout.trim() !== '' ? which.stdout.trim() : 'claude'
  // An installed plugin lives under ~/.claude/plugins; any other root is a dev folder the new session must load.
  const isInstalled = $.plugin.root.includes('/.claude/plugins/')
  const command = isInstalled ? `${bin} /dashboard` : `${bin} --plugin-dir ${$.plugin.root} /dashboard`
  const term = await $.env.get('TERM_PROGRAM')
  const run = await $.process.run(['/usr/bin/osascript', '-e', appleScriptFor(term, command)])
  log($, 'window.open', { term, command, exitCode: run.exitCode, stderr: run.stderr.slice(0, 500) })
  return run.exitCode === 0
    ? `Opened the dashboard in a new ${term === 'iTerm.app' ? 'iTerm' : 'Terminal'} window.`
    : `Could not open a new window: ${run.stderr.trim() || `osascript exited ${run.exitCode}`}`
}

// TaskStop for one of this session's agents; if the tool is unavailable or refused, ask the agent instead.
async function stopOwnAgent($: Engine, agentId: string): Promise<string> {
  try {
    await $.tool.call({ tool: 'TaskStop', task_id: agentId })
    return `Stopped agent ${agentId}.`
  } catch (err) {
    const sent = await $.session.send({ to: { agentId }, text: 'Please stop after your current step.' })
    return sent.isDelivered
      ? `TaskStop failed (${errText(err)}); asked the agent to stop instead.`
      : `Could not stop: ${sent.reason}`
  }
}

// Carries out a planned press and says what happened.
async function execute($: Engine, plan: Plan): Promise<string> {
  switch (plan.kind) {
    case 'none':
      return plan.reason
    case 'abort-turn':
      await $.turn.abort({ turnId: plan.turnId })
      return 'Stopped this session’s running turn.'
    case 'submit':
      await $.prompt.submit({ text: plan.text })
      return 'Queued in this session.'
    case 'task-stop':
      return stopOwnAgent($, plan.agentId)
    case 'send': {
      const sent = await $.session.send({ to: plan.to, text: plan.text })
      return sent.isDelivered ? 'Message delivered.' : `Not delivered: ${sent.reason}`
    }
  }
}

// A press: re-find the target in the latest snapshot (the drawn one may be stale), plan, run, report.
async function press($: Engine, sessionId: string, agentId: string | undefined, action: Action) {
  const snap = await read($, snapshot)
  const s = snap.sessions.find(x => x.sessionId === sessionId)
  const a = agentId === undefined ? undefined : s?.agents.find(x => x.id === agentId)
  if (s === undefined || (agentId !== undefined && a === undefined)) {
    $.ui.toast('That session or agent is gone.')
    return
  }
  const plan = planAction({ session: s, agent: a }, action, await read($, turnRef))
  let outcome: string
  try {
    outcome = await execute($, plan)
  } catch (err) {
    outcome = `Failed: ${errText(err)}`
  }
  log($, 'action', { action, sessionId, agentId, plan: plan.kind, outcome })
  $.ui.toast(`${s.name}${a ? ` › ${a.label}` : ''}: ${outcome}`)
  void refresh($)
}

function toggleExpanded($: Engine, sessionId: string) {
  return update($, expanded, list => (list.includes(sessionId) ? list.filter(id => id !== sessionId) : [...list, sessionId]))
}

const DOT: Record<RowStatus | 'busy', { glyph: string; color?: string }> = {
  busy: { glyph: '●', color: 'green' },
  running: { glyph: '●', color: 'green' },
  idle: { glyph: '○', color: 'yellow' },
  stalled: { glyph: '◌', color: 'magenta' },
  failed: { glyph: '✗', color: 'red' },
  stopped: { glyph: '■' },
  done: { glyph: '✓' },
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'dashboard',
      description:
        'Dashboard of every Claude session, agent and subagent on this machine (`/dashboard window` opens it in a new terminal)',
      argumentHint: '[window]',
    })
    return next(e)
  })

  // `/dashboard` opens the pane here; `/dashboard window` opens it in a new terminal window.
  on('command.run', { command: 'dashboard' }, async ($, e) => {
    const arg = e.args.trim().toLowerCase()
    if (arg === 'window') return { text: await openWindow($) }
    if (arg !== '') return { text: `Unknown argument "${e.args.trim()}". Use /dashboard or /dashboard window.` }
    await openPane($)
    return { text: 'Dashboard opened.' }
  })

  // Track the main loop's running turn so Stop on this session can abort it.
  on('turn.start', async ($, e, next) => {
    const started = await next(e)
    await update($, turnRef, () => e.turnId)
    return started
  })
  on('turn.complete', async ($, e, next) => {
    if (e.agentId === undefined) await update($, turnRef, () => '')
    return next(e)
  })

  on('ui.close', async ($, e, next) => {
    if (e.id === PANE) {
      stopPolling()
      log($, 'pane.close', { origin: e.origin })
    }
    return next(e)
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const { Box, Text, Button } = $.ui.resolve(e)
    // After a reload the pane may still be open with no poller: restart it (its writes run from timers).
    if (timer === undefined) startPolling($)
    const snap: Snapshot = await read($, snapshot)
    const open = new Set(await read($, expanded))
    const home = await $.env.get('HOME')
    const cols = Math.max(40, e.props.bodyColumns)
    const barWidth = cols >= 110 ? 16 : cols >= 80 ? 10 : 6
    const isWide = cols >= 100

    const all = snap.sessions
    const busy = all.filter(s => s.status === 'busy').length
    const runningAgents = all.reduce((n, s) => n + s.agents.filter(a => a.status === 'running').length, 0)
    const updated = snap.refreshedAt ? new Date(snap.refreshedAt).toLocaleTimeString() : 'loading…'

    // One line: status dot, label and detail (truncated), then progress and the two buttons.
    const row = (o: {
      key: string
      indent: number
      status: RowStatus | 'busy'
      label: string
      detail: string
      pct: number | undefined
      count: string
      sessionId: string
      agentId?: string
      isBold?: boolean
    }) => {
      const d = DOT[o.status]
      const toggle = toggleLabel(o.status)
      return (
        <Box key={o.key} flexDirection="row" width={cols}>
          <Box flexGrow={1} flexShrink={1}>
            <Text wrap="truncate-end">
              {' '.repeat(o.indent)}
              <Text color={d.color} dimColor={d.color === undefined}>
                {d.glyph}
              </Text>{' '}
              <Text bold={o.isBold}>{o.label}</Text>
              <Text dimColor>{o.detail ? `  ${o.detail}` : ''}</Text>
            </Text>
          </Box>
          <Box flexShrink={0} flexDirection="row">
            <Text color={o.pct === 100 ? 'green' : 'cyan'}>{bar(o.pct, barWidth)}</Text>
            <Text dimColor>{` ${o.count.padStart(isWide ? 13 : 7)} `}</Text>
            <Button
              key={`t:${o.key}`}
              label={toggle}
              variant={toggle === 'Resume' ? 'primary' : undefined}
              onPress={() => press($, o.sessionId, o.agentId, 'toggle')}
            />
            <Text> </Text>
            <Button
              key={`p:${o.key}`}
              label={isWide ? 'Parallelise' : '∥'}
              onPress={() => press($, o.sessionId, o.agentId, 'parallelise')}
            />
          </Box>
        </Box>
      )
    }

    const sessionRows = (s: SessionView) => {
      const p = progressOf(s.agents)
      const isOpen = open.has(s.sessionId)
      const { shown, hidden } = visibleAgents(s, isOpen)
      const head = row({
        key: `s:${s.sessionId}`,
        indent: 2,
        status: s.status,
        label: `${s.name}${s.isSelf ? ' (this session)' : ''}`,
        detail: [s.status, s.pid ? `pid ${s.pid}` : '', s.note ?? ''].filter(Boolean).join(' · '),
        pct: p.pct,
        count: p.total ? `${p.done}/${p.total} ${p.pct}%` : 'no subagents',
        sessionId: s.sessionId,
        isBold: true,
      })
      const agentRows = shown.map(a => {
        // An agent's own bar: its children when it has any (own agents), else done-or-not.
        const kids = s.agents.filter(k => k.parentId === a.id)
        const kp = progressOf(kids)
        return row({
          key: `a:${s.sessionId}:${a.id}`,
          indent: 2 + a.depth * 2,
          status: a.status,
          label: a.label,
          detail: [a.type, a.model, a.status].filter(Boolean).join(' · '),
          pct: kids.length ? kp.pct : a.status === 'done' ? 100 : undefined,
          count: kids.length ? `${kp.done}/${kp.total} ${kp.pct}%` : a.status === 'done' ? 'done' : '',
          sessionId: s.sessionId,
          agentId: a.id,
        })
      })
      const more =
        hidden > 0 || isOpen
          ? [
              <Box key={`m:${s.sessionId}`} flexDirection="row">
                <Text>{'    '}</Text>
                <Button
                  key={`x:${s.sessionId}`}
                  plain
                  dimColor
                  label={isOpen ? '▴ hide finished' : `▾ ${hidden} finished`}
                  onPress={() => toggleExpanded($, s.sessionId)}
                />
              </Box>,
            ]
          : []
      return [head, ...agentRows, ...more]
    }

    const body = groupByCodebase(all).flatMap(group => [
      <Text key={`cb:${group.cwd}`} bold color="cyan">
        {`▸ ${shortPath(group.cwd, home)}`}
      </Text>,
      ...group.sessions.flatMap(sessionRows),
    ])

    return (
      <Box flexDirection="column" width={cols}>
        <Box flexDirection="row" justifyContent="space-between" width={cols}>
          <Text bold>Agent dashboard</Text>
          <Text dimColor>{`${all.length} sessions · ${busy} busy · ${runningAgents} agents running · ${updated}`}</Text>
        </Box>
        <Text dimColor wrap="truncate-end">
          Progress = finished subagents ÷ subagents started this session. Buttons on other sessions send them a message.
        </Text>
        {snap.error !== undefined && <Text color="red">{`Refresh failed: ${snap.error}`}</Text>}
        {all.length === 0 && snap.refreshedAt > 0 && <Text dimColor>No running Claude sessions found.</Text>}
        {body}
      </Box>
    )
  })
}
