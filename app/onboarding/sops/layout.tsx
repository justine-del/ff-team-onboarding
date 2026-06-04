import { redirect } from 'next/navigation'
import { getPhaseContext } from '@/lib/onboarding/server'
import LockedPhase from '@/components/onboarding/LockedPhase'

// Server-side gate: SOPs are locked until Phase 1 AND Phase 2 are complete.
// Admins/super_admins bypass (handled in computePhaseGates).
export default async function SopsLayout({ children }: { children: React.ReactNode }) {
  const { userId, gates } = await getPhaseContext()
  if (!userId) redirect('/login')
  if (!gates.phase2Complete) {
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
