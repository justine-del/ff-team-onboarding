/**
 * Client-side fire-and-forget audit logger. The task sheet calls this after
 * a successful Supabase mutation so we get an HR-grade trail of edits.
 *
 * Never throws and never awaits the network response in the calling code —
 * a slow audit log must not slow the user-facing save path.
 */

export interface ClientAuditPayload {
  targetUserId: string
  entityType: 'task_completions' | 'va_custom_tasks'
  entityId: string
  action: 'create' | 'update' | 'delete'
  before?: Record<string, unknown> | null
  after?: Record<string, unknown> | null
  context?: Record<string, unknown>
}

export function fireAuditLog(payload: ClientAuditPayload): void {
  // No await — intentionally fire-and-forget.
  void fetch('/api/audit-log', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    keepalive: true,
  }).catch((e) => {
    console.warn('[audit] client log failed:', e)
  })
}
