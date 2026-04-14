import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'
import { NextResponse, type NextRequest } from 'next/server'

export async function POST(request: NextRequest) {
  const serverSupabase = await createServerClient()
  const { data: { user } } = await serverSupabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const { last_project, sops_used, reason, invoice_period, invoice_amount, invoice_notes, submitted } = await request.json()

  const record: Record<string, unknown> = {
    user_id: user.id,
    last_project, sops_used, reason,
    invoice_period, invoice_amount, invoice_notes,
    updated_at: new Date().toISOString(),
  }

  if (submitted) {
    record.va_submitted = true
    record.va_submitted_at = new Date().toISOString()
  }

  const { error } = await admin.from('va_offboarding').upsert(record, { onConflict: 'user_id' })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
