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

  // Create user without sending any email
  const { data: createData, error: createError } = await supabase.auth.admin.createUser({
    email,
    email_confirm: true,
  })
  if (createError) {
    return NextResponse.json({ error: createError.message }, { status: 400 })
  }

  await supabase.from('profiles').insert({
    id: createData.user.id,
    email,
    first_name,
    last_name,
    role: 'member',
    job_role: job_role || null,
    start_date: start_date || null,
  })

  // Generate a password-setup link (no email sent — we return it to admin)
  const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
    type: 'recovery',
    email,
    options: { redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? 'https://ff-team-onboarding.vercel.app'}/update-password` },
  })

  const invite_link = linkError ? null : linkData.properties.action_link

  return NextResponse.json({ success: true, invite_link })
}
