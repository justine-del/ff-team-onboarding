/**
 * Sequential onboarding gating — the single source of truth for which phases a
 * member has unlocked. Used by the dashboard (to lock cards) and by the phase
 * route pages (to block direct URL access). Each phase unlocks only when the
 * prior phase's checklist is fully complete; admins/super_admins bypass gating.
 */
import { PHASE_TOTALS } from '@/lib/constants'

export type PhaseCounts = {
  /** Phase 1 tasks with status 'done'. */
  phase1Done: number
  /** Phase 2 lessons completed. */
  phase2Done: number
  /** SOPs acknowledged/completed. */
  sopsDone: number
}

export type PhaseGates = {
  /** Phase 1 finished → Phase 2 is unlocked. */
  phase1Complete: boolean
  /** Phase 1 AND Phase 2 finished → SOPs are unlocked. */
  phase2Complete: boolean
  /** Everything finished. */
  sopComplete: boolean
}

/** Roles that skip gating entirely (they manage/preview all phases). */
export function bypassesGating(role: string | null | undefined): boolean {
  return role === 'admin' || role === 'super_admin'
}

export function computePhaseGates(
  counts: PhaseCounts,
  role?: string | null,
): PhaseGates {
  if (bypassesGating(role)) {
    return { phase1Complete: true, phase2Complete: true, sopComplete: true }
  }
  const phase1Complete = counts.phase1Done >= PHASE_TOTALS.phase1
  const phase2Complete = phase1Complete && counts.phase2Done >= PHASE_TOTALS.phase2
  const sopComplete = phase2Complete && counts.sopsDone >= PHASE_TOTALS.sops
  return { phase1Complete, phase2Complete, sopComplete }
}
