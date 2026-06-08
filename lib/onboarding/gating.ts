/**
 * Sequential onboarding gating — the single source of truth for which phases a
 * member has unlocked. Used by the dashboard (to lock cards) and by the phase
 * route pages (to block direct URL access). Each phase unlocks only when the
 * prior step is complete; admins/super_admins bypass gating.
 *
 * Order: Phase 0 (Guide / Getting Started) → Phase 1 → Phase 2 → SOPs.
 */
import { PHASE_TOTALS } from '@/lib/constants'

/**
 * Phase 1 row statuses that count as "actioned" for progress + gating. A
 * Founder task marked N/A (`not_needed`) is just as resolved as one marked
 * done — both should let the member proceed. Member tasks only ever hold
 * `'done'` or `'pending'`, so the same rule works for them too.
 */
export const PHASE1_COUNTED_STATUSES = ['done', 'not_needed'] as const

export function isPhase1Counted(status: string | null | undefined): boolean {
  return status === 'done' || status === 'not_needed'
}

export type PhaseCounts = {
  /** Phase 0 (Guide) acknowledged. */
  guideDone: boolean
  /** Phase 1 tasks with status 'done'. */
  phase1Done: number
  /** Phase 2 lessons completed. */
  phase2Done: number
  /** SOPs acknowledged/completed. */
  sopsDone: number
}

export type PhaseGates = {
  /** Guide acknowledged. */
  guideComplete: boolean
  /** Phase 1 reachable (guide done, or any Phase 1 progress already exists). */
  phase1Unlocked: boolean
  /** Phase 1 checklist fully done — gates Phase 2's "complete" status. */
  phase1Complete: boolean
  /** Phase 2 reachable (Phase 1 complete, or any Phase 2 progress already exists). */
  phase2Unlocked: boolean
  /** Phase 2 checklist fully done — gates SOPs' "complete" status. */
  phase2Complete: boolean
  /** SOPs reachable (Phase 2 complete, or any SOP progress already exists). */
  sopsUnlocked: boolean
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
    return {
      guideComplete: true,
      phase1Unlocked: true,
      phase1Complete: true,
      phase2Unlocked: true,
      phase2Complete: true,
      sopsUnlocked: true,
      sopComplete: true,
    }
  }
  const guideComplete = counts.guideDone
  // "Unlocked" = the user can REACH the page. Either the prior phase is done,
  // or they already have progress here (grandfathered from before gating).
  const phase1Unlocked = guideComplete || counts.phase1Done > 0
  // "Complete" = the phase's checklist is fully done (gates the NEXT phase).
  const phase1Complete = counts.phase1Done >= PHASE_TOTALS.phase1
  const phase2Unlocked = phase1Complete || counts.phase2Done > 0
  const phase2Complete = counts.phase2Done >= PHASE_TOTALS.phase2
  const sopsUnlocked = phase2Complete || counts.sopsDone > 0
  const sopComplete = counts.sopsDone >= PHASE_TOTALS.sops
  return { guideComplete, phase1Unlocked, phase1Complete, phase2Unlocked, phase2Complete, sopsUnlocked, sopComplete }
}
