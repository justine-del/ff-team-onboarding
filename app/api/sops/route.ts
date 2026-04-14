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

async function getCallerProfile() {
  const authClient = await createServerClient()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) return null

  const { data: profile } = await authClient
    .from('profiles')
    .select('role, company_id')
    .eq('id', user.id)
    .single()

  return profile
}

// POST /api/sops — create a SOP for caller's company
export async function POST(request: NextRequest) {
  const profile = await getCallerProfile()
  if (!profile) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!['admin', 'super_admin'].includes(profile.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  if (!profile.company_id) {
    return NextResponse.json({ error: 'No company assigned' }, { status: 400 })
  }

  const { document_name, link, priority, est_minutes } = await request.json()
  if (!document_name?.trim()) {
    return NextResponse.json({ error: 'Document name is required' }, { status: 400 })
  }

  const supabase = serviceClient()

  // Get next sort_order for this company
  const { data: existing } = await supabase
    .from('sop_documents')
    .select('sort_order')
    .eq('company_id', profile.company_id)
    .order('sort_order', { ascending: false })
    .limit(1)

  const sort_order = existing?.[0]?.sort_order != null ? existing[0].sort_order + 1 : 1

  const { data, error } = await supabase
    .from('sop_documents')
    .insert({
      document_name: document_name.trim(),
      link: link?.trim() || null,
      priority: priority || 'HIGH',
      est_minutes: est_minutes ? Number(est_minutes) : null,
      sort_order,
      company_id: profile.company_id,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ sop: data })
}

// PATCH /api/sops — update a SOP
export async function PATCH(request: NextRequest) {
  const profile = await getCallerProfile()
  if (!profile) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!['admin', 'super_admin'].includes(profile.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id, document_name, link, priority, est_minutes } = await request.json()
  if (!id) return NextResponse.json({ error: 'SOP id required' }, { status: 400 })

  const supabase = serviceClient()

  // Confirm SOP belongs to caller's company
  const { data: existing } = await supabase
    .from('sop_documents')
    .select('company_id')
    .eq('id', id)
    .single()

  if (existing?.company_id !== profile.company_id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { data, error } = await supabase
    .from('sop_documents')
    .update({
      document_name: document_name?.trim(),
      link: link?.trim() || null,
      priority,
      est_minutes: est_minutes ? Number(est_minutes) : null,
    })
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ sop: data })
}

// DELETE /api/sops — delete a SOP and its completions
export async function DELETE(request: NextRequest) {
  const profile = await getCallerProfile()
  if (!profile) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!['admin', 'super_admin'].includes(profile.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await request.json()
  if (!id) return NextResponse.json({ error: 'SOP id required' }, { status: 400 })

  const supabase = serviceClient()

  // Confirm SOP belongs to caller's company
  const { data: existing } = await supabase
    .from('sop_documents')
    .select('company_id')
    .eq('id', id)
    .single()

  if (existing?.company_id !== profile.company_id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Delete completions first (FK constraint), then the SOP
  await supabase.from('sop_completion').delete().eq('sop_id', id)
  const { error } = await supabase.from('sop_documents').delete().eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
