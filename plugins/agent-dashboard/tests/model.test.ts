// Unit tests for the dashboard's pure logic: parsing, status inference, progress, action planning.
import { describe, expect, test } from 'claude-code/testing'

import type { AgentView, SessionView } from '../types'
import {
  STALE_MS,
  agentStatusFromTail,
  appleScriptFor,
  dashboardCommand,
  bar,
  cleanLabel,
  dedupeSessions,
  fromAgentInfo,
  groupByCodebase,
  orderTree,
  parseLivePids,
  parseRegistry,
  planAction,
  progressOf,
  shellQuote,
  shortPath,
  slugOf,
  toggleLabel,
  visibleAgents,
} from '../hooks/model'

const REG = {
  pid: 27340,
  sessionId: '48446ea0-5575-43b6-810d-590b78e33428',
  cwd: '/Users/admin/Codes/auto-test',
  startedAt: 1791225385505,
  name: 'auto-test-e7',
  status: 'idle',
  kind: 'interactive',
}

const agent = (over: Partial<AgentView>): AgentView => ({
  id: 'a1',
  label: 'task',
  type: 'general-purpose',
  status: 'running',
  depth: 1,
  isOwn: false,
  ...over,
})

const session = (over: Partial<SessionView>): SessionView => ({
  pid: 1,
  sessionId: 's1',
  name: 'one',
  cwd: '/Users/admin/Codes/x',
  status: 'idle',
  isSelf: false,
  agents: [],
  ...over,
})

const line = (o: unknown) => JSON.stringify(o)

describe('slugOf', () => {
  test('maps every non-alphanumeric to a dash, as the projects folder does', () => {
    expect(slugOf('/Users/admin/.claude-mem/observer-sessions')).toBe(
      '-Users-admin--claude-mem-observer-sessions',
    )
    expect(slugOf('/Users/admin/Codes-2')).toBe('-Users-admin-Codes-2')
  })
})

describe('parseRegistry', () => {
  test('reads a well-formed registry file', () => {
    const r = parseRegistry(JSON.stringify(REG))
    expect(r?.pid).toBe(27340)
    expect(r?.status).toBe('idle')
  })
  test('rejects malformed JSON, missing fields and wrong types', () => {
    expect(parseRegistry('{not json')).toBeUndefined()
    expect(parseRegistry(JSON.stringify({ ...REG, pid: 'x' }))).toBeUndefined()
    expect(parseRegistry(JSON.stringify({ ...REG, sessionId: undefined }))).toBeUndefined()
    expect(parseRegistry('null')).toBeUndefined()
  })
  test('treats an unknown status as idle and a missing name as the cwd tail', () => {
    const r = parseRegistry(JSON.stringify({ ...REG, status: 'weird', name: undefined }))
    expect(r?.status).toBe('idle')
    expect(r?.name).toBe('auto-test')
  })
})

describe('parseLivePids', () => {
  test('keeps only pids whose command is claude', () => {
    const out = '  27340 claude\n 14497 /Users/admin/.local/bin/claude\n  999 node\n garbage\n'
    const live = parseLivePids(out)
    expect(live.has(27340)).toBe(true)
    expect(live.has(14497)).toBe(true)
    expect(live.has(999)).toBe(false)
    expect(live.size).toBe(2)
  })
  test('empty output is no live pids', () => {
    expect(parseLivePids('').size).toBe(0)
  })
})

describe('agentStatusFromTail', () => {
  const now = 10_000_000
  const endTurn = line({ type: 'assistant', message: { stop_reason: 'end_turn', content: [] } })
  const toolUse = line({ type: 'assistant', message: { stop_reason: 'tool_use', content: [] } })
  const userRow = line({ type: 'user', message: { content: [] } })
  const attachment = line({ type: 'attachment', attachment: { type: 'hook_success' } })

  test('an end_turn reply followed only by attachments is done', () => {
    expect(agentStatusFromTail(`${endTurn}\n${attachment}\n`, now - STALE_MS * 5, now)).toBe('done')
  })
  test('an open turn written recently is running', () => {
    expect(agentStatusFromTail(`${toolUse}\n${userRow}\n`, now - 1000, now)).toBe('running')
  })
  test('an open turn quiet past the stale window is stalled', () => {
    expect(agentStatusFromTail(`${toolUse}\n`, now - STALE_MS - 1, now)).toBe('stalled')
  })
  test('a resumed agent (user row after end_turn) is open again', () => {
    expect(agentStatusFromTail(`${endTurn}\n${userRow}\n`, now - 10, now)).toBe('running')
  })
  test('a partial first line from a byte tail is ignored', () => {
    expect(agentStatusFromTail(`ial":true}\n${endTurn}\n`, now, now)).toBe('done')
  })
  test('nothing parseable falls back to time alone', () => {
    expect(agentStatusFromTail('', now - 10, now)).toBe('running')
    expect(agentStatusFromTail('', now - STALE_MS - 1, now)).toBe('stalled')
  })
})

describe('fromAgentInfo', () => {
  test('maps engine statuses and computes depth from the parent chain', () => {
    const all = [
      { id: 'p', description: 'parent', type: 'Explore', status: 'running' as const },
      { id: 'c', description: 'child', type: 'Plan', status: 'completed' as const, parentId: 'p' },
    ]
    const p = fromAgentInfo(all[0]!, all)
    const c = fromAgentInfo(all[1]!, all)
    expect(p.status).toBe('running')
    expect(p.depth).toBe(1)
    expect(c.status).toBe('done')
    expect(c.depth).toBe(2)
    expect(c.isOwn).toBe(true)
  })
  test('maps waiting/pending to running, killed to stopped, failed to failed, idle to idle', () => {
    const base = { id: 'x', description: 'd', type: 't' }
    expect(fromAgentInfo({ ...base, status: 'waiting' }, []).status).toBe('running')
    expect(fromAgentInfo({ ...base, status: 'pending' }, []).status).toBe('running')
    expect(fromAgentInfo({ ...base, status: 'killed' }, []).status).toBe('stopped')
    expect(fromAgentInfo({ ...base, status: 'failed' }, []).status).toBe('failed')
    expect(fromAgentInfo({ ...base, status: 'idle' }, []).status).toBe('idle')
  })
  test('a parent cycle does not loop forever', () => {
    const all = [
      { id: 'a', description: 'a', type: 't', status: 'running' as const, parentId: 'b' },
      { id: 'b', description: 'b', type: 't', status: 'running' as const, parentId: 'a' },
    ]
    expect(fromAgentInfo(all[0]!, all).depth).toBeLessThan(10)
  })
})

describe('progressOf and bar', () => {
  test('counts finished agents over all agents', () => {
    const p = progressOf([agent({ status: 'done' }), agent({ status: 'running' }), agent({ status: 'done' }), agent({ status: 'failed' })])
    expect(p).toEqual({ done: 2, total: 4, pct: 50 })
  })
  test('no agents means no percentage', () => {
    expect(progressOf([])).toEqual({ done: 0, total: 0, pct: undefined })
  })
  test('bar fills proportionally and clamps', () => {
    expect(bar(50, 10)).toBe('█████░░░░░')
    expect(bar(0, 4)).toBe('░░░░')
    expect(bar(100, 4)).toBe('████')
    expect(bar(250, 4)).toBe('████')
    expect(bar(undefined, 4)).toBe('····')
  })
})

describe('grouping and paths', () => {
  test('groups sessions by cwd, busy codebases first', () => {
    const groups = groupByCodebase([
      session({ sessionId: 'a', cwd: '/b' }),
      session({ sessionId: 'b', cwd: '/a', status: 'busy' }),
      session({ sessionId: 'c', cwd: '/b' }),
    ])
    expect(groups.map(g => g.cwd)).toEqual(['/a', '/b'])
    expect(groups[1]!.sessions.length).toBe(2)
  })
  test('shortPath abbreviates the home folder', () => {
    expect(shortPath('/Users/admin/Codes/x', '/Users/admin')).toBe('~/Codes/x')
    expect(shortPath('/Users/admin', '/Users/admin')).toBe('~')
    expect(shortPath('/opt/x', '/Users/admin')).toBe('/opt/x')
    expect(shortPath('/Users/adminX/y', '/Users/admin')).toBe('/Users/adminX/y')
  })
  test('visibleAgents hides finished agents unless expanded', () => {
    const s = session({ agents: [agent({ id: '1', status: 'done' }), agent({ id: '2', status: 'running' })] })
    expect(visibleAgents(s, false).shown.map(a => a.id)).toEqual(['2'])
    expect(visibleAgents(s, false).hidden).toBe(1)
    expect(visibleAgents(s, true).shown.length).toBe(2)
  })
})

describe('toggleLabel', () => {
  test('Stop while working, Resume otherwise', () => {
    expect(toggleLabel('running')).toBe('Stop')
    expect(toggleLabel('busy')).toBe('Stop')
    expect(toggleLabel('idle')).toBe('Resume')
    expect(toggleLabel('done')).toBe('Resume')
    expect(toggleLabel('stalled')).toBe('Resume')
  })
})

describe('planAction', () => {
  test('this session: Stop aborts the running turn, Resume submits a prompt', () => {
    const self = session({ isSelf: true, status: 'busy' })
    expect(planAction({ session: self }, 'toggle', 't-1')).toEqual({ kind: 'abort-turn', turnId: 't-1' })
    const idle = session({ isSelf: true, status: 'idle' })
    expect(planAction({ session: idle }, 'toggle', '').kind).toBe('submit')
    expect(planAction({ session: idle }, 'parallelise', '').kind).toBe('submit')
  })
  test('this session’s own agent: Stop is TaskStop, Resume/Parallelise message the agent', () => {
    const s = session({ isSelf: true })
    const run = agent({ id: 'ag', isOwn: true, status: 'running' })
    expect(planAction({ session: s, agent: run }, 'toggle', '')).toEqual({ kind: 'task-stop', agentId: 'ag' })
    const done = agent({ id: 'ag', isOwn: true, status: 'done' })
    const resume = planAction({ session: s, agent: done }, 'toggle', '')
    expect(resume.kind).toBe('send')
    expect(resume.kind === 'send' && resume.to).toEqual({ agentId: 'ag' })
    const par = planAction({ session: s, agent: run }, 'parallelise', '')
    expect(par.kind === 'send' && par.to).toEqual({ agentId: 'ag' })
  })
  test('another session: every action is a message to that session', () => {
    const other = session({ sessionId: 'other', status: 'busy' })
    const stop = planAction({ session: other }, 'toggle', '')
    expect(stop.kind === 'send' && stop.to).toEqual({ sessionId: 'other' })
    expect(stop.kind === 'send' && /stop/i.test(stop.text)).toBe(true)
    const sub = planAction({ session: other, agent: agent({ id: 'zz', label: 'build api' }) }, 'parallelise', '')
    expect(sub.kind === 'send' && sub.to).toEqual({ sessionId: 'other' })
    expect(sub.kind === 'send' && sub.text.includes('zz')).toBe(true)
  })
})

describe('appleScriptFor', () => {
  test('targets iTerm or Terminal and escapes quotes and backslashes', () => {
    const it = appleScriptFor('iTerm.app', '/a "b"\\c')
    expect(it.includes('iTerm')).toBe(true)
    expect(it.includes('\\"b\\"')).toBe(true)
    expect(it.includes('\\\\c')).toBe(true)
    expect(appleScriptFor('Apple_Terminal', '/x').includes('"Terminal"')).toBe(true)
    expect(appleScriptFor(undefined, '/x').includes('"Terminal"')).toBe(true)
  })
  test('iTerm runs the line through the shell with write text', () => {
    expect(appleScriptFor('iTerm.app', 'x').includes('write text "x"')).toBe(true)
  })
})

describe('dashboardCommand', () => {
  test('cds into a trusted folder first and quotes every path', () => {
    expect(dashboardCommand('/Users/a/My Code', '/bin/claude')).toBe("cd '/Users/a/My Code' && '/bin/claude' /dashboard")
    expect(dashboardCommand('/w', '/bin/claude', '/p d')).toBe("cd '/w' && '/bin/claude' --plugin-dir '/p d' /dashboard")
  })
  test('shellQuote survives single quotes', () => {
    expect(shellQuote("it's")).toBe("'it'\\''s'")
  })
})

// Review fixes (2026-10-08): real ps formats, spare workers, labels, dedupe, tree order, rounding, self toggle.
describe('review fixes', () => {
  test('parseLivePids accepts versioned binaries and renamed claude processes, from ps -axo output', () => {
    const out = [
      '39892 /Users/admin/.local/share/claude/versions/2.1.294',
      '39766 claude bg-spare',
      '24913 claude',
      '82473 /Users/admin/.local/bin/claude',
      '  501 /usr/bin/claudette',
      '  502 node /x/claude.js',
      '  503 /Applications/Claude.app/Contents/MacOS/Claude',
    ].join('\n')
    expect([...parseLivePids(out)].sort()).toEqual([24913, 39766, 39892, 82473].sort())
  })
  test('parseRegistry drops pre-warmed spare workers and absurd pids, and cleans the name', () => {
    expect(parseRegistry(JSON.stringify({ ...REG, spare: true }))).toBeUndefined()
    expect(parseRegistry(JSON.stringify({ ...REG, pid: 99_999_999_999 }))).toBeUndefined()
    expect(parseRegistry(JSON.stringify({ ...REG, name: 'a\nb\u001b[31m' }))?.name).toBe('a b [31m')
  })
  test('cleanLabel strips control characters and collapses whitespace', () => {
    expect(cleanLabel('  fix\t the\r\n bug\u0007 ')).toBe('fix the bug')
  })
  test('dedupeSessions keeps one row per session id: live pid first, then newest', () => {
    const r = (pid: number, sessionId: string, startedAt: number) => ({ pid, sessionId, cwd: '/x', startedAt, name: 'n', status: 'idle' as const })
    const out = dedupeSessions([r(1, 'a', 10), r(2, 'a', 20), r(3, 'b', 5)], new Set([1, 3]), 'zzz')
    expect(out.map(x => x.pid).sort()).toEqual([1, 3])
    const self = dedupeSessions([r(7, 'me', 10), r(8, 'me', 30)], new Set(), 'me')
    expect(self.map(x => x.pid)).toEqual([8])
    expect(dedupeSessions([r(9, 'gone', 1)], new Set(), 'me')).toEqual([])
  })
  test('orderTree lists children directly under their parent, roots by status', () => {
    const t = orderTree([
      agent({ id: 'c', parentId: 'p', status: 'running', depth: 2 }),
      agent({ id: 'd', status: 'done' }),
      agent({ id: 'p', status: 'idle' }),
      agent({ id: 'r', status: 'running' }),
    ])
    expect(t.map(a => a.id)).toEqual(['r', 'p', 'c', 'd'])
  })
  test('orderTree keeps orphans (parent not listed) and survives cycles', () => {
    const t = orderTree([agent({ id: 'x', parentId: 'missing' }), agent({ id: 'y', parentId: 'z' }), agent({ id: 'z', parentId: 'y' })])
    expect(t.map(a => a.id).sort()).toEqual(['x', 'y', 'z'])
  })
  test('progress never shows 100% before everything is done', () => {
    const many = [...Array.from({ length: 199 }, () => agent({ status: 'done' })), agent({ status: 'running' })]
    expect(progressOf(many).pct).toBe(99)
  })
  test('this session: Stop only while a turn really runs, whatever the registry says', () => {
    const busy = session({ isSelf: true, status: 'busy' })
    expect(planAction({ session: busy }, 'toggle', '').kind).toBe('submit')
    const idle = session({ isSelf: true, status: 'idle' })
    expect(planAction({ session: idle }, 'toggle', 't-9')).toEqual({ kind: 'abort-turn', turnId: 't-9' })
  })
})
