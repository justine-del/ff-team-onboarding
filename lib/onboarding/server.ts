/**
 * Server-side phase gating. Resolves the current user's completion counts and
 * role, then computes which phases are unlocked. Used by the onboarding phase
 * layouts to block direct URL access (a member can't skip ahead by typing the
 * URL) and is the server counterpart to computePhaseGates().
 */
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { computePhaseGates, type PhaseGates } from '@/lib/onboarding/gating'

const LOCKED_GATES: PhaseGates = {
  phase1Complete: false,
  phase2Complete: false,
  sopComplete: false,
}

export type PhaseContext = {
  userId: string | null
  role: string | null
  gates: PhaseGates
}

export async function getPhaseContext(): Promise<PhaseContext> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { userId: null, role: null, gates: LOCKED_GATES }

  // Service role mirrors the dashboard's profile read (avoids RLS recursion).
  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  )

  const [profileRes, p1, p2, sops] = await Promise.all([
    admin.from('profiles').select('role').eq('id', user.id).single(),
    admin.from('phase1_completion').select('status').eq('user_id', user.id).eq('status', 'done'),
    admin.from('lesson_completion').select('completed').eq('user_id', user.id).eq('completed', true),
    admin.from('sop_completion').select('completed').eq('user_id', user.id).eq('completed', true),
  ])

  const role = profileRes.data?.role ?? null
  const gates = computePhaseGates(
    {
      phase1Done: p1.data?.length ?? 0,
      phase2Done: p2.data?.length ?? 0,
      sopsDone: sops.data?.length ?? 0,
    },
    role,
  )

  return { userId: user.id, role, gates }
}
