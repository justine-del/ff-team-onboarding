import { createClient as createAdminClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!['admin', 'super_admin'].includes(profile?.role ?? '')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { searchParams } = new URL(req.url)
  const memberId = searchParams.get('memberId')
  const weekStartsParam = searchParams.get('weekStarts')
  if (!memberId || !weekStartsParam) return NextResponse.json({ error: 'Missing params' }, { status: 400 })

  const weekStarts = weekStartsParam.split(',').filter(Boolean)
  if (weekStarts.length === 0) return NextResponse.json({ completions: [] })

  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const { data } = await admin
    .from('task_completions')
    .select('week_start, day, time_spent')
    .eq('user_id', memberId)
    .in('week_start', weekStarts)
    .gt('time_spent', 0)

  return NextResponse.json({ completions: data ?? [] })
}
