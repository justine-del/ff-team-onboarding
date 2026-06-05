/**
 * Shared domain types. Pages historically declared these inline (or used `any`).
 * New code should import from here; existing inline copies can be migrated
 * incrementally.
 */

/** Roles stored on profiles.role (see supabase/multi-tenant.sql). */
export type Role = 'super_admin' | 'admin' | 'member' | 'offboarding' | 'offboarded'

/** A row from the profiles table. */
export type Profile = {
  id: string
  email: string
  first_name: string | null
  last_name: string | null
  role: Role
  job_role: string | null
  start_date: string | null
  company_id: string | null
  created_at?: string
}

/** A team member as listed in admin views. */
export type Member = Pick<
  Profile,
  'id' | 'email' | 'first_name' | 'last_name' | 'job_role' | 'role'
> & { start_date?: string | null }

/** A company / tenant (see supabase/multi-tenant.sql). */
export type Company = {
  id: string
  name: string
  slug: string
  is_active: boolean
  created_at?: string
}

/** Phase 1 task completion status. */
export type Phase1Status = 'done' | 'not_needed' | 'pending'

/** A recurring weekly task definition (task_definitions). */
export type TaskDefinition = {
  id: number
  sop_number: string
  task_name: string
  description: string | null
  days: string[]
  time_window: string | null
  est_time: string | null
  loom_link: string | null
  sop_doc_link: string | null
  is_eow: boolean
  active: boolean
}

/** A company SOP document (sop_documents). */
export type SopDocument = {
  id: number
  company_id: string
  priority: string
  document_name: string
  link: string | null
  est_minutes: number | null
  sort_order: number
}
