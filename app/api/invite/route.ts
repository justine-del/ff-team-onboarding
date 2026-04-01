import { createClient } from '@supabase/supabase-js'
import { NextResponse, type NextRequest } from 'next/server'

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { first_name, last_name, email, job_role, start_date } = body

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const { data, error } = await supabase.auth.admin.inviteUserByEmail(email)
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  await supabase.from('profiles').insert({
    id: data.user.id,
    email,
    first_name,
    last_name,
    role: 'member',
    job_role: job_role || null,
    start_date: start_date || null,
  })

  return NextResponse.json({ success: true })
}
