/**
 * Server-side phase gating. Resolves the current user's completion counts and
 * role, then computes which phases are unlocked. Used by the onboarding phase
 * layouts to block direct URL access (a member can't skip ahead by typing the
 * URL) and is the server counterpart to computePhaseGates().
 */
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { computePhaseGates, PHASE1_COUNTED_STATUSES, type PhaseGates } from '@/lib/onboarding/gating'

const LOCKED_GATES: PhaseGates = {
  guideComplete: false,
  phase1Unlocked: false,
  phase1Complete: false,
  phase2Unlocked: false,
  phase2Complete: false,
  sopsUnlocked: false,
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
    admin.from('profiles').select('role, guide_completed').eq('id', user.id).single(),
    admin.from('phase1_completion').select('status').eq('user_id', user.id).in('status', PHASE1_COUNTED_STATUSES),
    admin.from('lesson_completion').select('completed').eq('user_id', user.id).eq('completed', true),
    admin.from('sop_completion').select('completed').eq('user_id', user.id).eq('completed', true),
  ])

  const role = profileRes.data?.role ?? null
  const gates = computePhaseGates(
    {
      guideDone: profileRes.data?.guide_completed ?? false,
      phase1Done: p1.data?.length ?? 0,
      phase2Done: p2.data?.length ?? 0,
      sopsDone: sops.data?.length ?? 0,
    },
    role,
  )

  return { userId: user.id, role, gates }
}
