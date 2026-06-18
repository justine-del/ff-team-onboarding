import { createClient as createAdminClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { logTaskChange } from '@/lib/audit/logTaskChange'

/**
 * Admin-only CRUD for another member's `va_custom_tasks` rows. Reads (GET)
 * use service role to bypass RLS; writes (POST/PATCH/DELETE) verify the
 * caller is admin/super_admin and force the target row's `user_id` to the
 * supplied memberId, so an admin can't accidentally mutate the wrong user.
 *
 * Mutations are logged to `task_audit_log` for the HR audit trail (Peter,
 * Section XI). Logging is fire-and-forget — a failed log never breaks the
 * underlying mutation.
 */

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!['admin', 'super_admin'].includes(profile?.role ?? '')) {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  }
  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  )
  return { admin, actorId: user.id, actorRole: profile?.role ?? null }
}

export async function GET(req: NextRequest) {
  const ctx = await requireAdmin()
  if (ctx.error) return ctx.error

  const { searchParams } = new URL(req.url)
  const memberId = searchParams.get('memberId')
  if (!memberId) return NextResponse.json({ error: 'Missing memberId' }, { status: 400 })

  const { data } = await ctx.admin.from('va_custom_tasks').select('*').eq('user_id', memberId)
  return NextResponse.json({ customTasks: data ?? [] })
}

export async function POST(req: NextRequest) {
  const ctx = await requireAdmin()
  if (ctx.error) return ctx.error

  const body = await req.json()
  const { memberId, task_name, description, days, time_window, est_time, est_minutes, is_role, parent_id, created_week_start } = body
  if (!memberId || !task_name?.trim()) {
    return NextResponse.json({ error: 'Missing memberId or task_name' }, { status: 400 })
  }

  const insertRow: Record<string, unknown> = {
    user_id: memberId,
    task_name,
    description: description ?? '',
    days: days ?? [],
    time_window: time_window ?? '',
    est_time: est_time ?? '',
    loom_link: '',
    sop_doc_link: '',
    created_week_start,
  }
  if (typeof est_minutes === 'number' && Number.isFinite(est_minutes)) insertRow.est_minutes = est_minutes
  if (is_role) insertRow.is_role = true
  if (parent_id) insertRow.parent_id = parent_id

  const { data, error } = await ctx.admin.from('va_custom_tasks').insert(insertRow).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await logTaskChange({
    admin: ctx.admin,
    actorId: ctx.actorId,
    actorRole: ctx.actorRole,
    targetUserId: memberId,
    entityType: 'va_custom_tasks',
    entityId: String(data.id),
    action: 'create',
    after: data,
    context: { source: 'admin-api' },
  })

  return NextResponse.json({ task: data })
}

export async function PATCH(req: NextRequest) {
  const ctx = await requireAdmin()
  if (ctx.error) return ctx.error

  const body = await req.json()
  const { memberId, id, fields } = body
  if (!memberId || !id || !fields) {
    return NextResponse.json({ error: 'Missing memberId, id, or fields' }, { status: 400 })
  }

  // Capture before-state for the audit log.
  const { data: before } = await ctx.admin.from('va_custom_tasks').select('*').eq('id', id).eq('user_id', memberId).single()

  // Defense in depth: only update if the row actually belongs to this member.
  const { data, error } = await ctx.admin.from('va_custom_tasks').update(fields).eq('id', id).eq('user_id', memberId).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await logTaskChange({
    admin: ctx.admin,
    actorId: ctx.actorId,
    actorRole: ctx.actorRole,
    targetUserId: memberId,
    entityType: 'va_custom_tasks',
    entityId: String(id),
    action: 'update',
    before,
    after: data,
    context: { source: 'admin-api', changed_fields: Object.keys(fields) },
  })

  return NextResponse.json({ task: data })
}

export async function DELETE(req: NextRequest) {
  const ctx = await requireAdmin()
  if (ctx.error) return ctx.error

  const body = await req.json()
  const { memberId, id, weekStart } = body
  if (!memberId || !id || !weekStart) {
    return NextResponse.json({ error: 'Missing memberId, id, or weekStart' }, { status: 400 })
  }

  const { data: before } = await ctx.admin.from('va_custom_tasks').select('*').eq('id', id).eq('user_id', memberId).single()

  // Match the member-side soft-delete: keep past weeks' history, hide from
  // the viewed week onward.
  const { error } = await ctx.admin.from('va_custom_tasks')
    .update({ active: false, deactivated_week_start: weekStart })
    .eq('id', id)
    .eq('user_id', memberId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await logTaskChange({
    admin: ctx.admin,
    actorId: ctx.actorId,
    actorRole: ctx.actorRole,
    targetUserId: memberId,
    entityType: 'va_custom_tasks',
    entityId: String(id),
    action: 'delete',
    before,
    after: { active: false, deactivated_week_start: weekStart },
    context: { source: 'admin-api', soft_delete: true },
  })

  return NextResponse.json({ ok: true })
}
