import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Inserts a row into `task_audit_log`. Service-role only; the route caller
 * must already have an admin client. Failures are swallowed and logged to
 * the server console so a logging fault never breaks the user-facing action.
 *
 * Peter's HR use case (Section XI of the portal master doc): if a member
 * edits a time entry from 3:48 AM to 5:00 AM, that change needs to be
 * forensically visible. This is the write side; the admin viewer reads it.
 */

type AuditAction = 'create' | 'update' | 'delete'
type AuditEntity = 'task_completions' | 'va_custom_tasks'

export interface LogTaskChangeArgs {
  admin: SupabaseClient
  actorId: string | null
  actorRole: string | null
  targetUserId: string
  entityType: AuditEntity
  entityId: string
  action: AuditAction
  before?: Record<string, unknown> | null
  after?: Record<string, unknown> | null
  context?: Record<string, unknown>
}

export async function logTaskChange(args: LogTaskChangeArgs): Promise<void> {
  try {
    const { error } = await args.admin.from('task_audit_log').insert({
      actor_id: args.actorId,
      actor_role: args.actorRole,
      target_user_id: args.targetUserId,
      entity_type: args.entityType,
      entity_id: args.entityId,
      action: args.action,
      before_json: args.before ?? null,
      after_json: args.after ?? null,
      context: args.context ?? null,
    })
    if (error) {
      console.error('[audit] logTaskChange insert failed:', error.message)
    }
  } catch (e) {
    console.error('[audit] logTaskChange threw:', e)
  }
}
