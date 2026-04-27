import { createClient as createAdminClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  // Verify requester is admin
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!['admin', 'super_admin'].includes(profile?.role ?? '')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { searchParams } = new URL(req.url)
  const memberId = searchParams.get('memberId')
  const weekStart = searchParams.get('weekStart')
  if (!memberId || !weekStart) return NextResponse.json({ error: 'Missing params' }, { status: 400 })

  // Use service role to bypass RLS
  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const [completions, onetimeCompletions, customTasks, vaLinks, dayOffs, taskNotes] = await Promise.all([
    admin.from('task_completions').select('task_id, day, completed, time_spent').eq('user_id', memberId).eq('week_start', weekStart),
    admin.from('task_completions').select('task_id, day, completed, time_spent').eq('user_id', memberId).eq('week_start', '1970-01-01'),
    admin.from('va_custom_tasks').select('*').eq('user_id', memberId).eq('active', true),
    admin.from('va_task_links').select('task_id, loom_link, sop_doc_link').eq('user_id', memberId),
    admin.from('day_off').select('day, type').eq('user_id', memberId).eq('week_start', weekStart),
    admin.from('va_task_notes').select('task_id, note').eq('user_id', memberId).eq('week_start', weekStart),
  ])

  return NextResponse.json({
    completions: [...(completions.data ?? []), ...(onetimeCompletions.data ?? [])],
    customTasks: customTasks.data ?? [],
    vaLinks: vaLinks.data ?? [],
    dayOffs: dayOffs.data ?? [],
    taskNotes: taskNotes.data ?? [],
  })
}
