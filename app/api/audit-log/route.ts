import { createClient as createAdminClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { logTaskChange } from '@/lib/audit/logTaskChange'

/**
 * Member-side audit endpoint. The task sheet calls this fire-and-forget after
 * a time-entry mutation (task_completions upsert) so we have an HR-grade
 * trail of "what was edited, when, from what to what".
 *
 * Per Peter (Section XI): if a VA changes 3:48 AM → 5:00 AM, we need to see it.
 *
 * Security:
 *  - Caller must be authenticated.
 *  - Caller can only log changes where target_user_id = their own id, OR
 *    they are admin/super_admin (covers the rare case of admin client-side
 *    surfaces in the future).
 *  - Service role is used for the actual insert so the row isn't subject to
 *    member-write RLS (we deliberately have no member insert policy).
 */

interface Body {
  targetUserId: string
  entityType: 'task_completions' | 'va_custom_tasks'
  entityId: string
  action: 'create' | 'update' | 'delete'
  before?: Record<string, unknown> | null
  after?: Record<string, unknown> | null
  context?: Record<string, unknown>
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = (await req.json()) as Body
  if (!body?.targetUserId || !body?.entityType || !body?.entityId || !body?.action) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  const isAdmin = ['admin', 'super_admin'].includes(profile?.role ?? '')
  if (!isAdmin && user.id !== body.targetUserId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  )

  await logTaskChange({
    admin,
    actorId: user.id,
    actorRole: profile?.role ?? null,
    targetUserId: body.targetUserId,
    entityType: body.entityType,
    entityId: body.entityId,
    action: body.action,
    before: body.before ?? null,
    after: body.after ?? null,
    context: { ...(body.context ?? {}), source: body.context?.source ?? 'client' },
  })

  return NextResponse.json({ ok: true })
}
