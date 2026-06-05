/**
 * App-wide constants. Centralised here so magic numbers that were previously
 * inlined across pages have one source of truth.
 */
import { brand } from '@/config/brand'

/** Hours east of UTC used for week-boundary math and "work hours" copy (PHT = +8). */
export const TIMEZONE_OFFSET_HOURS = brand.timezoneOffsetHours
export const TIMEZONE_OFFSET_MS = TIMEZONE_OFFSET_HOURS * 60 * 60 * 1000

/** How many weeks of task history the dashboard charts load. */
export const WEEKS_OF_HISTORY = 8

/**
 * Custom (VA-authored) tasks reuse the task_completions table keyed by task_id.
 * To avoid colliding with the seeded task_definitions IDs, custom task IDs are
 * offset by this amount. See va_task_links / va_custom_tasks.
 */
export const CUSTOM_TASK_ID_OFFSET = 10000

/**
 * Checklist totals each onboarding phase is measured against. These mirror the
 * counts the dashboard displays and the thresholds phase gating enforces.
 * A template owner should set these to match their seeded content.
 */
export const PHASE_TOTALS = {
  phase1: 24,
  phase2: 17,
  sops: 10,
} as const
