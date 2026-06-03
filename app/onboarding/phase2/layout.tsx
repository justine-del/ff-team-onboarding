import { redirect } from 'next/navigation'
import { getPhaseContext } from '@/lib/onboarding/server'

// Server-side gate: Phase 2 is locked until Phase 1's checklist is complete.
// Admins/super_admins bypass (handled in computePhaseGates).
export default async function Phase2Layout({ children }: { children: React.ReactNode }) {
  const { userId, gates } = await getPhaseContext()
  if (!userId) redirect('/login')
  if (!gates.phase1Complete) redirect('/dashboard')
  return <>{children}</>
}
