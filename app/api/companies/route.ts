import { createClient as createServiceClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { NextResponse, type NextRequest } from 'next/server'

function serviceClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

// GET /api/companies — list all companies with admin + member counts
export async function GET() {
  // Verify caller is super_admin
  const authClient = await createServerClient()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await authClient
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'super_admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const supabase = serviceClient()

  const { data: companies, error } = await supabase
    .from('companies')
    .select('*')
    .order('created_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Fetch all profiles to compute per-company counts
  const { data: profiles } = await supabase
    .from('profiles')
    .select('company_id, role')

  const enriched = (companies ?? []).map(c => {
    const members = (profiles ?? []).filter(
      p => p.company_id === c.id && p.role === 'member'
    ).length
    const admins = (profiles ?? []).filter(
      p => p.company_id === c.id && p.role === 'admin'
    ).length
    const superAdmins = (profiles ?? []).filter(
      p => p.company_id === c.id && p.role === 'super_admin'
    ).length
    return { ...c, member_count: members, admin_count: admins + superAdmins }
  })

  return NextResponse.json({ companies: enriched })
}

// POST /api/companies — create company and invite its first admin(s)
export async function POST(request: NextRequest) {
  // Verify caller is super_admin
  const authClient = await createServerClient()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await authClient
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'super_admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await request.json()
  const { name, admin_emails } = body as { name: string; admin_emails: string[] }

  if (!name?.trim()) {
    return NextResponse.json({ error: 'Company name is required' }, { status: 400 })
  }

  const supabase = serviceClient()

  // Generate slug from name
  const slug = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

  // Create the company
  const { data: company, error: companyError } = await supabase
    .from('companies')
    .insert({ name: name.trim(), slug })
    .select()
    .single()

  if (companyError) {
    const msg = companyError.message.includes('unique')
      ? `A company with that name already exists.`
      : companyError.message
    return NextResponse.json({ error: msg }, { status: 400 })
  }

  // Invite each admin email
  const invite_links: { email: string; link: string | null }[] = []

  for (const email of (admin_emails ?? []).filter(e => e.trim())) {
    // Check if auth user already exists
    const { data: { users: allUsers } } = await supabase.auth.admin.listUsers()
    const existing = allUsers.find(u => u.email?.toLowerCase() === email.trim().toLowerCase())

    let userId: string

    if (existing) {
      userId = existing.id
      await supabase.auth.admin.updateUserById(userId, { ban_duration: 'none' })
      await supabase.from('profiles').upsert({
        id: userId,
        email: email.trim(),
        first_name: '',
        last_name: '',
        role: 'admin',
        company_id: company.id,
      }, { onConflict: 'id' })
    } else {
      const { data: createData, error: createError } = await supabase.auth.admin.createUser({
        email: email.trim(),
        email_confirm: true,
      })
      if (createError) {
        invite_links.push({ email: email.trim(), link: null })
        continue
      }
      userId = createData.user.id
      await supabase.from('profiles').upsert({
        id: userId,
        email: email.trim(),
        first_name: '',
        last_name: '',
        role: 'admin',
        company_id: company.id,
      }, { onConflict: 'id' })
    }

    const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
      type: 'recovery',
      email: email.trim(),
      options: {
        redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? 'https://ff-team-onboarding.vercel.app'}/update-password`,
      },
    })

    invite_links.push({
      email: email.trim(),
      link: linkError ? null : linkData.properties.action_link,
    })
  }

  return NextResponse.json({ success: true, company, invite_links })
}
