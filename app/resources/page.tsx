import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import ResourcesClient, { type Resource } from './ResourcesClient'

// Server-rendered: fetch role + resources up front (parallel) so the page
// arrives with data instead of a 3-call client waterfall.
export default async function ResourcesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  )

  const [profileRes, resourcesRes] = await Promise.all([
    admin.from('profiles').select('role').eq('id', user.id).single(),
    admin.from('resources').select('*').order('sort_order', { ascending: true }),
  ])

  const isAdmin = ['admin', 'super_admin'].includes(profileRes.data?.role ?? '')

  return <ResourcesClient initialResources={(resourcesRes.data ?? []) as Resource[]} isAdmin={isAdmin} />
}
