import { createClient } from '@supabase/supabase-js'
import { NextResponse, type NextRequest } from 'next/server'

export async function POST(request: NextRequest) {
  const { email, first_name, last_name, job_role, start_date, role } = await request.json()
  if (!email) return NextResponse.json({ error: 'Missing email' }, { status: 400 })

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  // Look up user in auth by email
  const { data: { users }, error: listError } = await supabase.auth.admin.listUsers()
  if (listError) return NextResponse.json({ error: listError.message }, { status: 500 })

  const authUser = users.find(u => u.email?.toLowerCase() === email.toLowerCase())
  if (!authUser) return NextResponse.json({ error: 'No auth account found for this email. Use Invite instead.' }, { status: 404 })

  // Upsert the profile row
  const { error: upsertError } = await supabase.from('profiles').upsert({
    id: authUser.id,
    email: authUser.email,
    first_name: first_name || '',
    last_name: last_name || '',
    role: role || 'member',
    job_role: job_role || null,
    start_date: start_date || null,
  }, { onConflict: 'id' })

  if (upsertError) return NextResponse.json({ error: upsertError.message }, { status: 500 })

  return NextResponse.json({ success: true, user_id: authUser.id })
}
