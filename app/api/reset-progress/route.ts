import { createClient as createServiceClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { NextResponse, type NextRequest } from 'next/server'

export async function POST(request: NextRequest) {
  // Verify caller is admin or super_admin
  const authClient = await createServerClient()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: callerProfile } = await authClient
    .from('profiles')
    .select('role, company_id')
    .eq('id', user.id)
    .single()

  if (!callerProfile || !['admin', 'super_admin'].includes(callerProfile.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { user_id } = await request.json()
  if (!user_id) return NextResponse.json({ error: 'user_id is required' }, { status: 400 })

  const supabase = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  // Verify target user belongs to the same company (company admins can't reset other companies' members)
  const { data: targetProfile } = await supabase
    .from('profiles')
    .select('company_id, role')
    .eq('id', user_id)
    .single()

  if (!targetProfile) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  if (
    callerProfile.role !== 'super_admin' &&
    targetProfile.company_id !== callerProfile.company_id
  ) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Clear all onboarding progress for the target user
  await Promise.all([
    supabase.from('phase1_completion').delete().eq('user_id', user_id),
    supabase.from('lesson_completion').delete().eq('user_id', user_id),
    supabase.from('sop_completion').delete().eq('user_id', user_id),
    supabase.from('task_completions').delete().eq('user_id', user_id),
  ])

  return NextResponse.json({ success: true })
}
