import { redirect } from 'next/navigation'
import { getPhaseContext } from '@/lib/onboarding/server'

// Server-side gate: SOPs are locked until Phase 1 AND Phase 2 are complete.
// Admins/super_admins bypass (handled in computePhaseGates).
export default async function SopsLayout({ children }: { children: React.ReactNode }) {
  const { userId, gates } = await getPhaseContext()
  if (!userId) redirect('/login')
  if (!gates.phase2Complete) redirect('/dashboard')
  return <>{children}</>
}
