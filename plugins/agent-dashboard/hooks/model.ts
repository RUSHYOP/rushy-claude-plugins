// Pure logic for agent-dashboard: no `$`, so every function here is unit-tested directly.
import type { AgentInfo } from 'claude-code'

import type { AgentView, RowStatus, SessionView } from '../types'

/** An open agent turn with no transcript write for this long is shown as stalled. */
export const STALE_MS = 10 * 60 * 1000

/** One `~/.claude/sessions/<pid>.json` record, validated. */
export type SessionRecord = {
  pid: number
  sessionId: string
  cwd: string
  startedAt: number
  name: string
  status: 'busy' | 'idle'
}

/** The projects folder name Claude Code derives from a cwd. */
export const slugOf = (cwd: string): string => cwd.replace(/[^a-zA-Z0-9]/g, '-')

const lastSegment = (path: string): string => path.split('/').filter(Boolean).at(-1) ?? path

/** Labels come from disk: strip control characters and collapse whitespace so a row stays one line. */
export const cleanLabel = (s: string): string =>
  s.replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim()

/** Above any real pid on macOS/Linux; a larger value is a corrupt registry file. */
const MAX_PID = 4_194_304

/** Parses a session registry file; undefined for anything malformed. */
export function parseRegistry(text: string): SessionRecord | undefined {
  let raw: unknown
  try {
    raw = JSON.parse(text)
  } catch {
    return undefined
  }
  if (typeof raw !== 'object' || raw === null) return undefined
  const r = raw as Record<string, unknown>
  if (typeof r.pid !== 'number' || !Number.isInteger(r.pid) || r.pid <= 0 || r.pid > MAX_PID) return undefined
  // Pre-warmed background workers hold no conversation yet.
  if (r.spare === true) return undefined
  if (typeof r.sessionId !== 'string' || r.sessionId === '') return undefined
  if (typeof r.cwd !== 'string' || r.cwd === '') return undefined
  return {
    pid: r.pid,
    sessionId: r.sessionId,
    cwd: r.cwd,
    startedAt: typeof r.startedAt === 'number' ? r.startedAt : 0,
    name: cleanLabel(typeof r.name === 'string' && r.name !== '' ? r.name : lastSegment(r.cwd)) || r.sessionId,
    // Only `busy` means a turn is running; anything else is treated as idle.
    status: r.status === 'busy' ? 'busy' : 'idle',
  }
}

/**
 * Reads `ps -axo pid=,comm=` output; keeps pids that are Claude Code (guards against pid reuse).
 * Seen on macOS: `claude`, `/…/bin/claude`, `claude bg-spare` (retitled), `/…/claude/versions/2.1.294`.
 */
export function parseLivePids(psOut: string): Set<number> {
  const live = new Set<number>()
  for (const row of psOut.split('\n')) {
    const m = /^\s*(\d+)\s+(.+?)\s*$/.exec(row)
    if (m === null) continue
    const comm = m[2]!
    const exe = comm.split(/\s+/)[0]!
    const isClaude = lastSegment(exe) === 'claude' || /\/claude\/versions\/[^/\s]+$/.test(comm)
    if (isClaude) live.add(Number(m[1]))
  }
  return live
}

/**
 * One record per session id, live pids only (this session always kept): a resumed session can leave
 * a stale file with the same id, and two rows would share keys. Prefers a live pid, then the newest.
 */
export function dedupeSessions(records: readonly SessionRecord[], live: ReadonlySet<number>, selfId: string): SessionRecord[] {
  const best = new Map<string, SessionRecord>()
  for (const r of records) {
    const isLive = live.has(r.pid)
    if (!isLive && r.sessionId !== selfId) continue
    const prev = best.get(r.sessionId)
    const prevLive = prev !== undefined && live.has(prev.pid)
    if (prev === undefined || (isLive && !prevLive) || (isLive === prevLive && r.startedAt > prev.startedAt)) {
      best.set(r.sessionId, r)
    }
  }
  return [...best.values()]
}

/** True when a transcript tail's last user/assistant row is an assistant `end_turn` (the agent finished). */
export function tailIsDone(tail: string): boolean {
  const rows = tail.split('\n')
  for (let i = rows.length - 1; i >= 0; i--) {
    const text = rows[i]!.trim()
    if (text === '') continue
    let row: { type?: unknown; message?: { stop_reason?: unknown } }
    try {
      row = JSON.parse(text)
    } catch {
      continue // a byte tail starts mid-line
    }
    if (row.type === 'assistant') return row.message?.stop_reason === 'end_turn'
    if (row.type === 'user') return false
  }
  return false
}

/** A foreign subagent's status: done, else running or stalled by how long its transcript has been quiet. */
export const statusFrom = (isDone: boolean, mtimeMs: number, now: number): RowStatus =>
  isDone ? 'done' : now - mtimeMs > STALE_MS ? 'stalled' : 'running'

/** Infers a foreign subagent's status from the tail of its transcript and its last write time. */
export const agentStatusFromTail = (tail: string, mtimeMs: number, now: number): RowStatus =>
  statusFrom(tailIsDone(tail), mtimeMs, now)

const ENGINE_STATUS: Record<AgentInfo['status'], RowStatus> = {
  pending: 'running',
  running: 'running',
  waiting: 'running',
  idle: 'idle',
  completed: 'done',
  failed: 'failed',
  killed: 'stopped',
}

/** Maps one of this session's agents (from `$.agent.list()`) to a dashboard row. */
export function fromAgentInfo(
  info: Pick<AgentInfo, 'id' | 'description' | 'type' | 'status' | 'parentId' | 'name'>,
  all: ReadonlyArray<Pick<AgentInfo, 'id' | 'parentId'>>,
): AgentView {
  // Depth from the parent chain, bounded so a malformed cycle cannot loop.
  let depth = 1
  let parent = info.parentId
  const seen = new Set<string>([info.id])
  while (parent !== undefined && !seen.has(parent) && depth < 8) {
    seen.add(parent)
    depth++
    parent = all.find(a => a.id === parent)?.parentId
  }
  return {
    id: info.id,
    label: cleanLabel(info.description || info.name || '') || info.id,
    type: info.type,
    status: ENGINE_STATUS[info.status] ?? 'idle',
    depth,
    parentId: info.parentId,
    isOwn: true,
  }
}

/** Finished agents over all agents: the stand-in for "tasks done" (no session uses task tools). */
export function progressOf(agents: readonly AgentView[]): { done: number; total: number; pct: number | undefined } {
  const total = agents.length
  const done = agents.filter(a => a.status === 'done').length
  // Floor so 199/200 reads 99%, not a green 100%.
  return { done, total, pct: total === 0 ? undefined : Math.floor((done / total) * 100) }
}

/** A text progress bar; dots when there is nothing to measure. */
export function bar(pct: number | undefined, width: number): string {
  if (pct === undefined) return '·'.repeat(width)
  const filled = Math.round((Math.min(100, Math.max(0, pct)) / 100) * width)
  return '█'.repeat(filled) + '░'.repeat(width - filled)
}

/** Sessions grouped by codebase (cwd); codebases with a busy session first, then by path. */
export function groupByCodebase(sessions: readonly SessionView[]): Array<{ cwd: string; sessions: SessionView[] }> {
  const map = new Map<string, SessionView[]>()
  for (const s of sessions) map.set(s.cwd, [...(map.get(s.cwd) ?? []), s])
  const isBusy = (list: SessionView[]) => list.some(s => s.status === 'busy')
  return [...map.entries()]
    .map(([cwd, list]) => ({ cwd, sessions: list }))
    .sort((a, b) => Number(isBusy(b.sessions)) - Number(isBusy(a.sessions)) || a.cwd.localeCompare(b.cwd))
}

/** `~`-abbreviated path, only at a folder boundary. */
export function shortPath(path: string, home: string | undefined): string {
  if (home === undefined || home === '') return path
  if (path === home) return '~'
  return path.startsWith(`${home}/`) ? `~${path.slice(home.length)}` : path
}

/** The agents a session row lists: finished ones folded away unless expanded. */
export function visibleAgents(s: SessionView, isExpanded: boolean): { shown: AgentView[]; hidden: number } {
  if (isExpanded) return { shown: s.agents, hidden: 0 }
  const shown = s.agents.filter(a => a.status !== 'done')
  return { shown, hidden: s.agents.length - shown.length }
}

/** The single start/stop/resume button's label. */
export const toggleLabel = (status: RowStatus | 'busy'): 'Stop' | 'Resume' =>
  status === 'running' || status === 'busy' ? 'Stop' : 'Resume'

/** What a button press does, decided without side effects. */
export type Plan =
  | { kind: 'abort-turn'; turnId: string }
  | { kind: 'submit'; text: string }
  | { kind: 'task-stop'; agentId: string }
  | { kind: 'send'; to: { sessionId: string } | { agentId: string }; text: string }
  | { kind: 'none'; reason: string }

const SIGN = '(Sent from the Claude dashboard.)'

export const TEXT = {
  stop: `Please stop after your current step and wait for further instructions. ${SIGN}`,
  resume: `Please continue where you left off. ${SIGN}`,
  parallelise:
    'Split your remaining work into independent tasks and run them in parallel with background subagents ' +
    '(one subagent per independent task; keep dependent steps sequential), then integrate and verify the results. ' +
    SIGN,
  aboutAgent: (a: AgentView, ask: string) =>
    `About your subagent "${a.label}" (agent id ${a.id}): ${ask} ${SIGN}`,
} as const

/**
 * Plans a press. This session's main loop and own agents get real controls; another
 * session (and its subagents, which only it can reach) gets a message it acts on.
 */
export function planAction(
  target: { session: SessionView; agent?: AgentView },
  action: 'toggle' | 'parallelise',
  turnId: string,
): Plan {
  const { session: s, agent: a } = target
  if (a === undefined) {
    if (s.isSelf) {
      // This session's truth is its running turn; the registry's busy/idle can lag.
      if (action === 'parallelise') return { kind: 'submit', text: TEXT.parallelise }
      return turnId !== '' ? { kind: 'abort-turn', turnId } : { kind: 'submit', text: TEXT.resume }
    }
    const isStop = action === 'toggle' && toggleLabel(s.status) === 'Stop'
    const text = action === 'parallelise' ? TEXT.parallelise : isStop ? TEXT.stop : TEXT.resume
    return { kind: 'send', to: { sessionId: s.sessionId }, text }
  }
  const isStop = action === 'toggle' && toggleLabel(a.status) === 'Stop'
  if (a.isOwn) {
    if (isStop) return { kind: 'task-stop', agentId: a.id }
    return { kind: 'send', to: { agentId: a.id }, text: action === 'parallelise' ? TEXT.parallelise : TEXT.resume }
  }
  // Another session's subagent: only its session can reach it, so ask the session.
  const ask =
    action === 'parallelise'
      ? 'split its remaining work into parallel subagents.'
      : isStop
        ? 'please stop it (TaskStop) after its current step.'
        : 'please resume it where it left off.'
  return { kind: 'send', to: { sessionId: s.sessionId }, text: TEXT.aboutAgent(a, ask) }
}

const asAppleString = (s: string) => `"${s.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`

/** Parses a subagent's `.meta.json`; defaults for anything missing or malformed. */
export function parseMeta(text: string | undefined): { type: string; label?: string; model?: string } {
  try {
    const m = JSON.parse(text ?? '') as Record<string, unknown>
    return {
      type: typeof m.agentType === 'string' ? m.agentType : 'agent',
      label: typeof m.description === 'string' && cleanLabel(m.description) !== '' ? cleanLabel(m.description) : undefined,
      model: typeof m.model === 'string' ? m.model : undefined,
    }
  } catch {
    return { type: 'agent' }
  }
}

/** Status order for listing: live work first. */
export const STATUS_RANK: Record<RowStatus, number> = { running: 0, stalled: 1, idle: 2, failed: 3, stopped: 4, done: 5 }

/**
 * Tree order: roots by status (live work first), each followed by its children, recursively.
 * An agent whose parent is not listed (or sits in a cycle) is treated as a root.
 */
export function orderTree(agents: readonly AgentView[]): AgentView[] {
  const ids = new Set(agents.map(a => a.id))
  const byStatus = (a: AgentView, b: AgentView) => STATUS_RANK[a.status] - STATUS_RANK[b.status]
  const kids = new Map<string, AgentView[]>()
  for (const a of agents) {
    if (a.parentId !== undefined && ids.has(a.parentId)) kids.set(a.parentId, [...(kids.get(a.parentId) ?? []), a])
  }
  const out: AgentView[] = []
  const seen = new Set<string>()
  const visit = (a: AgentView) => {
    if (seen.has(a.id)) return
    seen.add(a.id)
    out.push(a)
    for (const k of [...(kids.get(a.id) ?? [])].sort(byStatus)) visit(k)
  }
  for (const a of agents.filter(a => a.parentId === undefined || !ids.has(a.parentId)).sort(byStatus)) visit(a)
  // Whatever a cycle left unvisited still shows.
  for (const a of [...agents].sort(byStatus)) visit(a)
  return out
}

/** POSIX single-quote shell quoting: safe for any path. */
export const shellQuote = (s: string): string => `'${s.replace(/'/g, `'\\''`)}'`

/**
 * The shell line a new dashboard window runs: cd into a folder the person already trusts (a new window
 * opens in $HOME, which may trigger the folder-trust prompt), then start Claude on /dashboard.
 */
export function dashboardCommand(cwd: string, bin: string, pluginDir?: string): string {
  const dir = pluginDir === undefined ? '' : ` --plugin-dir ${shellQuote(pluginDir)}`
  return `cd ${shellQuote(cwd)} && ${shellQuote(bin)}${dir} /dashboard`
}

/** AppleScript that opens a new terminal window running `command` (iTerm when that is the host, else Terminal). */
export function appleScriptFor(termProgram: string | undefined, command: string): string {
  if (termProgram === 'iTerm.app') {
    // `write text` runs it through the person's shell (PATH, rc files), unlike `create window ... command`.
    return `tell application "iTerm"\nactivate\nset w to (create window with default profile)\ntell current session of w to write text ${asAppleString(command)}\nend tell`
  }
  return `tell application "Terminal"\nactivate\ndo script ${asAppleString(command)}\nend tell`
}
