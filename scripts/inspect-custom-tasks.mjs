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

// 1) All custom tasks (active + inactive), grouped by user
const { data: tasks, error: e1 } = await sb
  .from('va_custom_tasks')
  .select('id, user_id, task_name, active, created_at')
  .order('user_id')
  .order('id')

if (e1) { console.error('tasks err:', e1); process.exit(1) }

console.log(`\n=== va_custom_tasks rows: ${tasks.length} (active: ${tasks.filter(t=>t.active).length}, inactive: ${tasks.filter(t=>!t.active).length}) ===\n`)

// 2) Profiles for names
const userIds = [...new Set(tasks.map(t => t.user_id))]
const { data: profiles } = await sb.from('profiles').select('id, first_name, last_name').in('id', userIds)
const nameOf = Object.fromEntries((profiles ?? []).map(p => [p.id, `${p.first_name} ${p.last_name}`.trim()]))

// 3) For each task, count completions across weeks
for (const t of tasks) {
  const customTaskId = t.id + 10000
  const { data: comps } = await sb
    .from('task_completions')
    .select('week_start, day, time_spent')
    .eq('user_id', t.user_id)
    .eq('task_id', customTaskId)
    .gt('time_spent', 0)

  const weeks = [...new Set((comps ?? []).map(c => c.week_start))].sort()
  const totalMins = (comps ?? []).reduce((s, c) => s + (c.time_spent ?? 0), 0)
  const flag = !t.active && weeks.length > 0 ? '  ⚠ DELETED but has prior data' : ''
  console.log(`[${nameOf[t.user_id] ?? t.user_id.slice(0,8)}] ${t.active ? '✓' : '✗'} #${t.id} "${t.task_name}" — weeks=${weeks.length} mins=${totalMins}${flag}`)
  if (weeks.length > 0) console.log(`    weeks: ${weeks.join(', ')}`)
}

// 4) Check schema — does va_custom_tasks have week_start columns yet?
const { data: cols } = await sb.rpc('exec', { sql: "select column_name from information_schema.columns where table_name='va_custom_tasks' and table_schema='public'" }).catch(() => ({ data: null }))
console.log('\n=== columns (if rpc available) ===')
console.log(cols ?? '(no rpc; checked by attempting select)')

// fallback: try selecting these columns
const probe = await sb.from('va_custom_tasks').select('created_week_start, deactivated_week_start').limit(1)
console.log('probe created_week_start:', probe.error ? `MISSING (${probe.error.message})` : 'PRESENT')
