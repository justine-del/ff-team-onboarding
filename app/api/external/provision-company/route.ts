import { createClient as createServiceClient } from '@supabase/supabase-js'
import { NextResponse, type NextRequest } from 'next/server'

function serviceClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

// POST /api/external/provision-company
// Service-to-service endpoint for ff-client-portal to spawn a new company
// + first admin from an approved client application.
//
// Auth: Authorization: Bearer ${PROVISION_SECRET}
// Body: { companyName, adminFirstName, adminLastName, adminEmail }
// Returns: { companyId, adminUserId, magicLinkUrl }
export async function POST(request: NextRequest) {
  const expected = process.env.PROVISION_SECRET
  if (!expected) {
    return NextResponse.json({ error: 'PROVISION_SECRET not configured' }, { status: 500 })
  }
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${expected}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json().catch(() => null) as {
    companyName?: string
    adminFirstName?: string
    adminLastName?: string
    adminEmail?: string
  } | null

  if (!body || !body.companyName?.trim() || !body.adminEmail?.trim()) {
    return NextResponse.json(
      { error: 'companyName and adminEmail are required' },
      { status: 400 }
    )
  }

  const companyName = body.companyName.trim()
  const adminEmail = body.adminEmail.trim().toLowerCase()
  const adminFirstName = body.adminFirstName?.trim() ?? ''
  const adminLastName = body.adminLastName?.trim() ?? ''

  const supabase = serviceClient()

  // Refuse if email already has a profile — prevents accidentally moving an existing
  // VA/admin into a newly-provisioned company.
  const { data: existingProfile } = await supabase
    .from('profiles')
    .select('id')
    .ilike('email', adminEmail)
    .maybeSingle()

  if (existingProfile) {
    return NextResponse.json(
      { error: 'An account with this email already exists', code: 'EMAIL_EXISTS' },
      { status: 409 }
    )
  }

  const slug = companyName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

  const { data: company, error: companyError } = await supabase
    .from('companies')
    .insert({ name: companyName, slug })
    .select()
    .single()

  if (companyError) {
    const isDupe = companyError.message.includes('unique') || companyError.message.includes('duplicate')
    return NextResponse.json(
      {
        error: isDupe ? 'A company with that name already exists' : companyError.message,
        code: isDupe ? 'COMPANY_EXISTS' : 'COMPANY_CREATE_FAILED',
      },
      { status: isDupe ? 409 : 500 }
    )
  }

  const { data: createData, error: createError } = await supabase.auth.admin.createUser({
    email: adminEmail,
    email_confirm: true,
  })

  if (createError || !createData.user) {
    // Roll back the orphan company so admin doesn't have to clean up.
    await supabase.from('companies').delete().eq('id', company.id)
    return NextResponse.json(
      { error: `Failed to create auth user: ${createError?.message ?? 'unknown'}` },
      { status: 500 }
    )
  }

  const userId = createData.user.id

  const { error: profileError } = await supabase.from('profiles').insert({
    id: userId,
    email: adminEmail,
    first_name: adminFirstName,
    last_name: adminLastName,
    role: 'admin',
    company_id: company.id,
  })

  if (profileError) {
    await supabase.auth.admin.deleteUser(userId)
    await supabase.from('companies').delete().eq('id', company.id)
    return NextResponse.json(
      { error: `Failed to create profile: ${profileError.message}` },
      { status: 500 }
    )
  }

  const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
    type: 'recovery',
    email: adminEmail,
    options: {
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? 'https://ff-team-onboarding.vercel.app'}/update-password`,
    },
  })

  if (linkError) {
    // Records exist; surface IDs so the caller can re-issue a link via /api/resend-invite if needed.
    return NextResponse.json(
      {
        error: `Failed to generate magic link: ${linkError.message}`,
        companyId: company.id,
        adminUserId: userId,
      },
      { status: 500 }
    )
  }

  return NextResponse.json({
    companyId: company.id,
    adminUserId: userId,
    magicLinkUrl: linkData.properties.action_link,
  })
}
