/**
 * Within-phase sequential task gating. A checklist item is only actionable once
 * every item before it is complete — so VAs can't skip ahead or leave gaps.
 * Used by the Phase 1 member checklist, Phase 2 lessons, and SOPs pages.
 *
 * This is the task-level counterpart to lib/onboarding/gating.ts (which gates at
 * the phase level). Ordering is whatever order the caller passes items in
 * (array order / sort_order).
 */

export type TaskState = 'done' | 'active' | 'locked'

/**
 * Given an ordered list of item ids and a predicate for "is this id complete",
 * return a map of id -> state. The first not-done item is `active`; everything
 * after it is `locked`; completed items are `done`. Once all are done, none are
 * active.
 */
export function computeTaskStates<T extends string | number>(
  orderedIds: T[],
  isDone: (id: T) => boolean,
): Record<string, TaskState> {
  const states: Record<string, TaskState> = {}
  let reachedActive = false
  for (const id of orderedIds) {
    if (isDone(id)) {
      states[String(id)] = 'done'
    } else if (!reachedActive) {
      states[String(id)] = 'active'
      reachedActive = true
    } else {
      states[String(id)] = 'locked'
    }
  }
  return states
}

/** Convenience: is a single item actionable (done or active, i.e. not locked)? */
export function isActionable(state: TaskState | undefined): boolean {
  return state === 'done' || state === 'active'
}
