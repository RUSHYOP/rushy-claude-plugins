// Type contract for agent-dashboard: the values it keeps in $.state.

/** Where one session or agent stands, as the dashboard draws it. */
export type RowStatus = 'running' | 'idle' | 'done' | 'stalled' | 'failed' | 'stopped'

/** One subagent (or teammate) under a session. */
export type AgentView = {
  id: string
  label: string
  type: string
  model?: string
  status: RowStatus
  /** Nesting depth: 1 for an agent the main loop spawned. */
  depth: number
  /** The spawning agent's id, when known (this session's agents only). */
  parentId?: string
  /** True when this session owns it, so hard controls (TaskStop) apply. */
  isOwn: boolean
}

/** One running Claude Code process on this machine. */
export type SessionView = {
  pid: number
  sessionId: string
  name: string
  cwd: string
  status: 'busy' | 'idle'
  /** The session this dashboard runs in. */
  isSelf: boolean
  agents: AgentView[]
  /** Why the agent list may be incomplete (transcript not found, read failed). */
  note?: string
}

/** What one refresh found. */
export type Snapshot = {
  sessions: SessionView[]
  refreshedAt: number
  error?: string
}

declare module 'claude-code' {
  interface PluginState {
    'agent-dashboard': {
      snapshot: Snapshot
      /** Session ids whose finished agents are shown. */
      expanded: string[]
      /** The main loop's running turn, for Stop on this session. */
      turnId: string
    }
  }
}
