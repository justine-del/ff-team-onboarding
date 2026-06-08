import { redirect } from 'next/navigation'
import { getPhaseContext } from '@/lib/onboarding/server'
import LockedPhase from '@/components/onboarding/LockedPhase'

// Server-side gate: SOPs are locked until Phase 2 is complete — unless the
// member already has SOP progress (grandfathered from before gating).
// Admins/super_admins bypass (handled in computePhaseGates).
export default async function SopsLayout({ children }: { children: React.ReactNode }) {
  const { userId, gates } = await getPhaseContext()
  if (!userId) redirect('/login')
  if (!gates.sopsUnlocked) {
    return (
      <LockedPhase
        phaseLabel="Phase 2.1: Core SOPs"
        prereqLabel="Phase 2"
        prereqHref="/onboarding/phase2"
        lockedPaths={['/onboarding/sops']}
      />
    )
  }
  return <>{children}</>
}
