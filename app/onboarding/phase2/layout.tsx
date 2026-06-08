import { redirect } from 'next/navigation'
import { getPhaseContext } from '@/lib/onboarding/server'
import LockedPhase from '@/components/onboarding/LockedPhase'

// Server-side gate: Phase 2 is locked until Phase 1's checklist is complete —
// unless the member already has Phase 2 progress (grandfathered from before
// gating). Admins/super_admins bypass (handled in computePhaseGates).
export default async function Phase2Layout({ children }: { children: React.ReactNode }) {
  const { userId, gates } = await getPhaseContext()
  if (!userId) redirect('/login')
  if (!gates.phase2Unlocked) {
    return (
      <LockedPhase
        phaseLabel="Phase 2: Foundations"
        prereqLabel="Phase 1"
        prereqHref="/onboarding/phase1"
        lockedPaths={['/onboarding/phase2', '/onboarding/sops']}
      />
    )
  }
  return <>{children}</>
}
