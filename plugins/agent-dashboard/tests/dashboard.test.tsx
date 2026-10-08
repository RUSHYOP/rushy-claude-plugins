// Integration test: the pane drawn over a fake ~/.claude, and its buttons' effects, on the terminal surface.
import { expect, mock, test } from 'claude-code/testing'

const NOW = 1_800_000_000_000
const HOME = '/h'
const line = (o: unknown) => JSON.stringify(o)
const reg = (pid: number, sessionId: string, cwd: string, status: string, name: string) =>
  line({ pid, sessionId, cwd, startedAt: NOW - 3_600_000, name, status })

// The fake disk: registry files, one foreign session's subagents, and transcript tails.
const FILES: Record<string, string> = {
  [`${HOME}/.claude/sessions/100.json`]: reg(100, 'self', `${HOME}/Codes/self`, 'idle', 'self-session'),
  [`${HOME}/.claude/sessions/200.json`]: reg(200, 's200', `${HOME}/Codes/app`, 'busy', 'app-session'),
  [`${HOME}/.claude/sessions/300.json`]: reg(300, 'dead', `${HOME}/Codes/gone`, 'busy', 'dead-session'),
  [`${HOME}/.claude/sessions/bad.json`]: '{oops',
  [`${HOME}/.claude/sessions/400.json`]: line({ pid: 400, sessionId: 'spare', cwd: `${HOME}/x`, startedAt: NOW, status: 'idle', spare: true }),
  [`${HOME}/.claude/sessions/101.json`]: reg(101, 'self', `${HOME}/Codes/self`, 'idle', 'stale-self'),
  [`${HOME}/.claude/projects/-h-Codes-app/s200/subagents/agent-aaa.meta.json`]: line({ agentType: 'general-purpose', description: 'build api', model: 'sonnet' }),
  [`${HOME}/.claude/projects/-h-Codes-app/s200/subagents/agent-bbb.meta.json`]: line({ agentType: 'Explore', description: 'scan docs' }),
}
const TAILS: Record<string, string> = {
  [`${HOME}/.claude/projects/-h-Codes-app/s200/subagents/agent-aaa.jsonl`]: line({ type: 'assistant', message: { stop_reason: 'tool_use' } }),
  [`${HOME}/.claude/projects/-h-Codes-app/s200/subagents/agent-bbb.jsonl`]: line({ type: 'assistant', message: { stop_reason: 'end_turn' } }),
}
const file = (name: string, mtimeMs: number) => ({ name, kind: 'file' as const, size: 10, mtimeMs, isLink: false })
const LISTS: Record<string, ReturnType<typeof file>[]> = {
  [`${HOME}/.claude/sessions`]: [
    file('100.json', NOW), file('100.abc.key', NOW), file('200.json', NOW), file('300.json', NOW), file('bad.json', NOW), file('400.json', NOW), file('101.json', NOW),
  ],
  [`${HOME}/.claude/projects/-h-Codes-app/s200/subagents`]: [
    file('agent-aaa.jsonl', NOW - 1000),
    file('agent-aaa.meta.json', NOW - 1000),
    file('agent-bbb.jsonl', NOW - 2000),
    file('agent-bbb.meta.json', NOW - 2000),
    file('agent-old.jsonl', NOW - 10 * 3_600_000), // before the session started: excluded
  ],
}

const PANE_PROPS = {
  title: 'Agent dashboard',
  isFocused: true,
  bodyColumns: 140,
  placement: 'dock' as const,
  scroll: { offset: 0, bodyRows: 40, contentRows: 40 },
  view: {},
}

test('lists live sessions by codebase with agents, progress and working buttons', async ($, on) => {
  mock.env(on, { HOME, TERM_PROGRAM: 'iTerm.app' })
  const clock = mock.clock(on, { now: NOW })
  const sent: Array<{ to: string; text: string }> = []
  const stopped: string[] = []
  const writes: string[] = []

  on('fs.list', ($, e) => {
    const list = LISTS[e.path]
    // Op hooks answer { value } or { deny }; a deny rejects the plugin's call.
    return list === undefined ? { deny: `ENOENT ${e.path}` } : { value: list }
  })
  on('fs.read', ($, e) => {
    const text = FILES[e.path]
    return text === undefined ? { deny: `ENOENT ${e.path}` } : { value: text }
  })
  on('fs.exists', ($, e) => ({ value: e.path in FILES }))
  on('fs.write', ($, e) => {
    writes.push(e.path)
    return { value: undefined }
  })
  on('ui.log', () => ({ value: undefined }))
  on('process.run', ($, e) => {
    const run = (exitCode: number, stdout: string, stderr = '') =>
      ({ value: { exitCode, stdout, stderr, isStdoutTruncated: false, isStderrTruncated: false } })
    const ok = (stdout: string) => run(0, stdout)
    if (e.argv[0] === 'ps') return ok('  100 claude\n  200 /Users/h/.local/share/claude/versions/2.1.294\n  300 node\n  400 claude bg-spare\n')
    if (e.argv[0] === 'tail') return ok(TAILS[e.argv[3]!] ?? '')
    return run(1, '', 'unexpected')
  })
  on('session.id', () => ({ value: 'self' }))
  on('session.cwd', () => ({ value: `${HOME}/Codes/self` }))
  on('agent.list', () => ({ value: [
    { id: 'own1', description: 'refactor auth', type: 'general-purpose', status: 'running' as const },
    { id: 'own2', description: 'write tests', type: 'Plan', status: 'completed' as const, parentId: 'own1' },
  ] }))
  on('session.send', ($, e) => {
    sent.push({ to: e.to, text: e.text })
    return { isDelivered: true as const }
  })
  on('tool.call', { tool: 'TaskStop' }, ($, e) => {
    stopped.push(String((e as { task_id?: string }).task_id))
    return { result: { message: 'stopped' } } as never
  })

  const ui = await $.ui.mount({
    plugin: 'agent-dashboard',
    surface: 'terminal',
    component: 'Pane',
    requestId: 'agent-dashboard',
    props: PANE_PROPS as never,
  })
  // The first refresh runs from a timer the draw started.
  await clock.advance(1)

  // Header counts only live claude pids (300 is dead; bad.json is ignored).
  expect(await ui.find({ type: 'Text', text: /2 sessions · 1 busy/ })).toBeDefined()
  expect(await ui.find({ text: /~\/Codes\/app/ })).toBeDefined()
  expect(await ui.find({ text: /dead-session/ })).toBeUndefined()
  // Spare workers and a stale duplicate of this session are not listed.
  expect(await ui.find({ text: /stale-self/ })).toBeUndefined()
  expect(await ui.find({ text: /~\/x\b/ })).toBeUndefined()
  // Foreign agents: running one listed, finished one folded, pre-session one excluded.
  expect(await ui.find({ text: /build api/ })).toBeDefined()
  expect(await ui.find({ text: /scan docs/ })).toBeUndefined()
  expect(await ui.find({ type: 'Button', text: /1 finished/ })).toBeDefined()
  expect(await ui.find({ text: /agent-old|old/ })).toBeUndefined()
  // Progress: app session has 1 of 2 finished.
  expect(await ui.find({ text: /1\/2 50%/ })).toBeDefined()

  // Expanding shows the finished agent.
  await ui.press({ key: 'x:s200' })
  expect(await ui.find({ text: /scan docs/ })).toBeDefined()

  // Stop on a busy foreign session sends it a stop message.
  await ui.press({ key: 't:s:s200' })
  expect(sent.length).toBe(1)
  expect(sent[0]!.text).toMatch(/stop after your current step/i)

  // Parallelise on a foreign subagent asks its session, naming the agent.
  await ui.press({ key: 'p:a:s200:aaa' })
  expect(sent.length).toBe(2)
  expect(sent[1]!.text).toMatch(/aaa/)

  // Stop on this session's own running agent is a real TaskStop.
  await ui.press({ key: 't:a:self:own1' })
  expect(stopped).toEqual(['own1'])

  // Actions are logged as JSONL under the plugin's logs folder.
  expect(writes.some(p => /\/logs\/dashboard-\d{4}-\d{2}-\d{2}-self\.jsonl$/.test(p))).toBe(true)

  await ui.unmount()
})

test('a refresh failure is shown, not thrown', async ($, on) => {
  mock.env(on, { HOME })
  const clock = mock.clock(on, { now: NOW })
  on('fs.list', () => ({ deny: 'EACCES sessions' }))
  on('fs.exists', () => ({ value: false }))
  on('fs.write', () => ({ value: undefined }))
  on('ui.log', () => ({ value: undefined }))
  on('session.id', () => ({ value: 'self' }))
  const ui = await $.ui.mount({
    plugin: 'agent-dashboard',
    surface: 'terminal',
    component: 'Pane',
    requestId: 'agent-dashboard',
    props: PANE_PROPS as never,
  })
  await clock.advance(1)
  expect(await ui.find({ text: /Refresh failed:.*EACCES sessions/ })).toBeDefined()
  await ui.unmount()
})

test('a refused TaskStop falls back to asking the agent, and says so', async ($, on) => {
  mock.env(on, { HOME })
  const clock = mock.clock(on, { now: NOW })
  const sent: string[] = []
  const toasts: string[] = []
  on('fs.list', ($, e) =>
    e.path === `${HOME}/.claude/sessions` ? { value: [file('100.json', NOW)] } : { deny: `ENOENT ${e.path}` },
  )
  on('fs.read', ($, e) => (FILES[e.path] === undefined ? { deny: 'ENOENT' } : { value: FILES[e.path]! }))
  on('fs.exists', () => ({ value: true }))
  on('fs.write', () => ({ value: undefined }))
  on('ui.log', () => ({ value: undefined }))
  on('ui.toast', ($, e) => {
    toasts.push(e.text)
    return { value: undefined }
  })
  on('process.run', () => ({
    value: { exitCode: 0, stdout: '  100 claude\n', stderr: '', isStdoutTruncated: false, isStderrTruncated: false },
  }))
  on('session.id', () => ({ value: 'self' }))
  on('agent.list', () => ({ value: [{ id: 'own1', description: 'refactor', type: 'general-purpose', status: 'running' as const }] }))
  on('tool.call', { tool: 'TaskStop' }, () => ({ deny: 'not allowed' }) as never)
  on('session.send', ($, e) => {
    sent.push(e.to)
    return { isDelivered: true as const }
  })
  const ui = await $.ui.mount({
    plugin: 'agent-dashboard',
    surface: 'terminal',
    component: 'Pane',
    requestId: 'agent-dashboard',
    props: PANE_PROPS as never,
  })
  await clock.advance(1)
  await ui.press({ key: 't:a:self:own1' })
  expect(sent).toEqual(['own1'])
  expect(toasts.some(t => /TaskStop failed \(not allowed\); asked the agent/.test(t))).toBe(true)
  await ui.unmount()
})
