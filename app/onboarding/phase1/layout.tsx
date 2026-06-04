import { redirect } from 'next/navigation'
import { getPhaseContext } from '@/lib/onboarding/server'
import LockedPhase from '@/components/onboarding/LockedPhase'

// Server-side gate: Phase 1 is locked until the Guide (Phase 0) is marked
// complete. Admins/super_admins bypass (handled in computePhaseGates).
export default async function Phase1Layout({ children }: { children: React.ReactNode }) {
  const { userId, gates } = await getPhaseContext()
  if (!userId) redirect('/login')
  if (!gates.phase1Unlocked) {
    return (
      <LockedPhase
        phaseLabel="Phase 1: System Access"
        prereqLabel="Getting Started"
        prereqHref="/guide"
        lockedPaths={['/onboarding/phase1', '/onboarding/phase2', '/onboarding/sops']}
      />
    )
  }
  return <>{children}</>
}
