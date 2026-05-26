import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

const env = Object.fromEntries(
  readFileSync('.env.local', 'utf8')
    .split('\n')
    .filter(l => l.includes('='))
    .map(l => { const [k, ...v] = l.split('='); return [k.trim(), v.join('=').trim().replace(/^["']|["']$/g, '')] })
)

const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
})

// Step 1: probe whether columns already exist.
const probe = await sb.from('va_custom_tasks').select('created_week_start, deactivated_week_start').limit(1)
const colsExist = !probe.error
console.log(`columns present already? ${colsExist} (${probe.error?.message ?? 'ok'})`)

if (!colsExist) {
  console.log('\n⚠ Columns missing. Apply the SQL migration via Supabase SQL editor first:')
  console.log('   supabase/va-custom-tasks-week-scope.sql')
  console.log('\nThis script can only do the data backfill — it cannot run DDL via PostgREST.')
  process.exit(1)
}

// Step 2: backfill — for inactive rows missing deactivated_week_start, compute it from completions.
// We do this in JS because PostgREST can't run the WITH/UPDATE query directly.
const { data: inactive } = await sb
  .from('va_custom_tasks')
  .select('id, user_id, task_name, created_week_start, deactivated_week_start')
  .eq('active', false)
  .is('deactivated_week_start', null)

console.log(`\nInactive rows needing backfill: ${inactive?.length ?? 0}`)

let revived = 0
let zeroed = 0
for (const t of inactive ?? []) {
  const customTaskId = t.id + 10000
  const { data: comps } = await sb
    .from('task_completions')
    .select('week_start')
    .eq('user_id', t.user_id)
    .eq('task_id', customTaskId)
    .gt('time_spent', 0)
    .order('week_start', { ascending: false })
    .limit(1)

  let deactivatedAt
  if (comps && comps.length > 0) {
    // First week the task is no longer alive = Monday after the last logged week.
    const lastWeek = new Date(comps[0].week_start + 'T00:00:00Z')
    lastWeek.setUTCDate(lastWeek.getUTCDate() + 7)
    deactivatedAt = lastWeek.toISOString().split('T')[0]
    revived++
  } else {
    // No completions ever — leave it hidden everywhere.
    deactivatedAt = t.created_week_start
    zeroed++
  }

  const { error } = await sb
    .from('va_custom_tasks')
    .update({ deactivated_week_start: deactivatedAt })
    .eq('id', t.id)
  if (error) console.error(`  update failed id=${t.id}: ${error.message}`)
}

console.log(`\nDone. Revived for past weeks: ${revived}. Hidden (no data): ${zeroed}.`)
