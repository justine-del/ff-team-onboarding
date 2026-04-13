import { createClient } from '@supabase/supabase-js'
import { NextResponse, type NextRequest } from 'next/server'

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { first_name, last_name, email, job_role, start_date, company_id, role } = body

  if (!company_id) {
    return NextResponse.json({ error: 'company_id is required' }, { status: 400 })
  }

  const inviteRole = role === 'admin' ? 'admin' : 'member'

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  // Check if auth user already exists (e.g. previously offboarded)
  const { data: { users } } = await supabase.auth.admin.listUsers()
  const existing = users.find(u => u.email?.toLowerCase() === email.toLowerCase())

  let userId: string

  if (existing) {
    // Unban and reactivate
    userId = existing.id
    await supabase.auth.admin.updateUserById(userId, { ban_duration: 'none' })
    await supabase.from('profiles').upsert({
      id: userId,
      email,
      first_name,
      last_name,
      role: inviteRole,
      job_role: job_role || null,
      start_date: start_date || null,
      company_id,
    }, { onConflict: 'id' })
  } else {
    // New user — create auth account
    const { data: createData, error: createError } = await supabase.auth.admin.createUser({
      email,
      email_confirm: true,
      user_metadata: { first_name, last_name },
    })
    if (createError) {
      return NextResponse.json({ error: createError.message }, { status: 400 })
    }
    userId = createData.user.id

    // Upsert the profile (trigger may have already created a partial one)
    await supabase.from('profiles').upsert({
      id: userId,
      email,
      first_name,
      last_name,
      role: inviteRole,
      job_role: job_role || null,
      start_date: start_date || null,
      company_id,
    }, { onConflict: 'id' })
  }

  // Generate a one-time password-setup link (returned to admin, not emailed)
  const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
    type: 'recovery',
    email,
    options: { redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? 'https://ff-team-onboarding.vercel.app'}/update-password` },
  })

  const invite_link = linkError ? null : linkData.properties.action_link

  return NextResponse.json({ success: true, invite_link })
}
