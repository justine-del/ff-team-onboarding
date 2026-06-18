import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

/**
 * Estimate-vs-actual benchmarking view (Section XI of the master task doc).
 * For each member/task pairing where the task has est_minutes set, compares
 * average actual time_spent against the estimate over the last N weeks.
 *
 * Flags overruns at 1.5x estimate. Read-only; no mutations.
 *
 * Tasks without est_minutes show in a separate "Unbenchmarked" bucket so
 * the admin can see which custom tasks still need numeric estimates.
 */

type Row = {
  user_id: string
  member_name: string
  task_id: number
  task_name: string
  est_minutes: number | null
  avg_actual: number
  total_logged_minutes: number
  sessions: number
  ratio: number | null
}

function getRecentWeekStarts(n = 4): string[] {
  const PHT = 8 * 60 * 60 * 1000
  const phtNow = new Date(Date.now() + PHT)
  const day = phtNow.getUTCDay()
  const diff = day === 0 ? -6 : 1 - day
  const mondayPHT = new Date(phtNow)
  mondayPHT.setUTCDate(phtNow.getUTCDate() + diff)
  mondayPHT.setUTCHours(0, 0, 0, 0)
  const mondayAsUTC = new Date(mondayPHT.getTime() - PHT)
  const starts: string[] = []
  for (let i = 0; i < n; i++) {
    const d = new Date(mondayAsUTC)
    d.setUTCDate(mondayAsUTC.getUTCDate() - i * 7)
    starts.push(d.toISOString().split('T')[0])
  }
  return starts
}

export default async function BenchmarksPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin' && profile?.role !== 'super_admin') redirect('/dashboard')

  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  )

  const weekStarts = getRecentWeekStarts(4)

  // Pull everyone who could be logging time (members, offboarding members, and
  // admins/super_admins who also work the task portal — per the operating
  // model, admins like Justine and Peter use the same task sheet).
  const [membersRes, customTasksRes, taskDefsRes, completionsRes] = await Promise.all([
    admin.from('profiles').select('id, first_name, last_name, role').in('role', ['member', 'offboarding', 'admin', 'super_admin']),
    admin.from('va_custom_tasks').select('id, user_id, task_name, est_minutes, is_role, parent_id, active').eq('active', true),
    admin.from('task_definitions').select('id, task_name, est_minutes'),
    admin.from('task_completions').select('user_id, task_id, time_spent, week_start, day').in('week_start', weekStarts).gt('time_spent', 0),
  ])

  const members = membersRes.data ?? []
  const customTasks = customTasksRes.data ?? []
  const taskDefs = taskDefsRes.data ?? []
  const completions = completionsRes.data ?? []

  // Build lookup tables. Admins/super_admins get an "(admin)" tag so the
  // table is unambiguous when scanning — Justine and Peter both appear here
  // because they also log time against the task portal.
  const memberName = new Map<string, string>()
  for (const m of members) {
    const base = `${m.first_name ?? ''} ${m.last_name ?? ''}`.trim() || 'User'
    const role = (m as { role?: string }).role
    const tag = role === 'admin' || role === 'super_admin' ? ' (admin)' : role === 'offboarding' ? ' (offboarding)' : ''
    memberName.set(m.id as string, `${base}${tag}`)
  }

  // Task metadata keyed by the task_id as it appears in task_completions:
  //  - reference tasks: task_id = task_definitions.id
  //  - custom tasks:    task_id = va_custom_tasks.id + 10000
  type TaskMeta = { name: string; est_minutes: number | null; ownerScope: 'member' | 'shared' }
  const taskMeta = new Map<string, TaskMeta>() // key: `${user_id}:${task_id}` for custom, `*:${task_id}` for shared
  for (const t of taskDefs) {
    taskMeta.set(`*:${t.id}`, { name: t.task_name as string, est_minutes: (t.est_minutes as number | null) ?? null, ownerScope: 'shared' })
  }
  for (const t of customTasks) {
    taskMeta.set(`${t.user_id}:${(t.id as number) + 10000}`, {
      name: t.task_name as string,
      est_minutes: (t.est_minutes as number | null) ?? null,
      ownerScope: 'member',
    })
  }

  // Aggregate completions by (user_id, task_id).
  const agg = new Map<string, { user_id: string; task_id: number; minutes: number[]; total: number }>()
  for (const c of completions) {
    const taskId = c.task_id as number
    const userId = c.user_id as string
    const minutes = (c.time_spent as number) ?? 0
    if (minutes <= 0) continue
    const key = `${userId}:${taskId}`
    const cur = agg.get(key) ?? { user_id: userId, task_id: taskId, minutes: [], total: 0 }
    cur.minutes.push(minutes)
    cur.total += minutes
    agg.set(key, cur)
  }

  // Build rows. Resolve task name via member-scoped lookup first, then shared.
  const rows: Row[] = []
  for (const [, v] of agg) {
    const memberKey = `${v.user_id}:${v.task_id}`
    const sharedKey = `*:${v.task_id}`
    const meta = taskMeta.get(memberKey) ?? taskMeta.get(sharedKey)
    if (!meta) continue
    const avg = v.minutes.length > 0 ? Math.round(v.total / v.minutes.length) : 0
    const ratio = meta.est_minutes && meta.est_minutes > 0 ? avg / meta.est_minutes : null
    rows.push({
      user_id: v.user_id,
      member_name: memberName.get(v.user_id) ?? 'Member',
      task_id: v.task_id,
      task_name: meta.name,
      est_minutes: meta.est_minutes,
      avg_actual: avg,
      total_logged_minutes: v.total,
      sessions: v.minutes.length,
      ratio,
    })
  }

  // Split into benchmarked vs unbenchmarked.
  const benchmarked = rows.filter(r => r.est_minutes && r.est_minutes > 0)
  const unbenchmarked = rows.filter(r => !r.est_minutes || r.est_minutes <= 0)

  // Sort benchmarked by ratio desc (worst overrun first).
  benchmarked.sort((a, b) => (b.ratio ?? 0) - (a.ratio ?? 0))
  unbenchmarked.sort((a, b) => b.total_logged_minutes - a.total_logged_minutes)

  const OVERRUN_THRESHOLD = 1.5

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold">Time Benchmarks</h1>
            <p className="text-sm text-gray-400 mt-1">Average actual vs. estimated minutes across the last {weekStarts.length} weeks. Overruns &gt; {OVERRUN_THRESHOLD}× the estimate are flagged.</p>
          </div>
          <Link href="/admin/performance" className="text-sm text-blue-400 hover:text-blue-300">← Performance</Link>
        </div>

        <section className="mb-10">
          <h2 className="text-sm uppercase tracking-wide text-gray-500 mb-3">Benchmarked tasks ({benchmarked.length})</h2>
          {benchmarked.length === 0 ? (
            <p className="text-sm text-gray-500">No benchmarked task activity in the window. Add Est. Minutes when creating custom tasks to populate this view.</p>
          ) : (
            <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-800/60 text-xs uppercase tracking-wide text-gray-400">
                  <tr>
                    <th className="text-left px-4 py-2">Member</th>
                    <th className="text-left px-4 py-2">Task</th>
                    <th className="text-right px-4 py-2">Est. min</th>
                    <th className="text-right px-4 py-2">Avg actual</th>
                    <th className="text-right px-4 py-2">Sessions</th>
                    <th className="text-right px-4 py-2">Ratio</th>
                    <th className="text-right px-4 py-2">Total logged</th>
                  </tr>
                </thead>
                <tbody>
                  {benchmarked.map(r => {
                    const overrun = (r.ratio ?? 0) >= OVERRUN_THRESHOLD
                    return (
                      <tr key={`${r.user_id}-${r.task_id}`} className={`border-t border-gray-800 ${overrun ? 'bg-red-950/20' : ''}`}>
                        <td className="px-4 py-2">{r.member_name}</td>
                        <td className="px-4 py-2 text-gray-200">{r.task_name}</td>
                        <td className="px-4 py-2 text-right text-gray-300">{r.est_minutes}</td>
                        <td className="px-4 py-2 text-right text-gray-300">{r.avg_actual}</td>
                        <td className="px-4 py-2 text-right text-gray-500">{r.sessions}</td>
                        <td className={`px-4 py-2 text-right font-mono ${overrun ? 'text-red-300' : 'text-gray-300'}`}>{(r.ratio ?? 0).toFixed(2)}×</td>
                        <td className="px-4 py-2 text-right text-gray-500">{r.total_logged_minutes}m</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section>
          <h2 className="text-sm uppercase tracking-wide text-gray-500 mb-3">Unbenchmarked tasks ({unbenchmarked.length})</h2>
          {unbenchmarked.length === 0 ? (
            <p className="text-sm text-gray-500">Every task with logged time has a numeric estimate. Nice.</p>
          ) : (
            <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-800/60 text-xs uppercase tracking-wide text-gray-400">
                  <tr>
                    <th className="text-left px-4 py-2">Member</th>
                    <th className="text-left px-4 py-2">Task</th>
                    <th className="text-right px-4 py-2">Sessions</th>
                    <th className="text-right px-4 py-2">Total logged</th>
                    <th className="text-right px-4 py-2">Avg actual</th>
                  </tr>
                </thead>
                <tbody>
                  {unbenchmarked.map(r => (
                    <tr key={`${r.user_id}-${r.task_id}`} className="border-t border-gray-800">
                      <td className="px-4 py-2">{r.member_name}</td>
                      <td className="px-4 py-2 text-gray-200">{r.task_name}</td>
                      <td className="px-4 py-2 text-right text-gray-500">{r.sessions}</td>
                      <td className="px-4 py-2 text-right text-gray-500">{r.total_logged_minutes}m</td>
                      <td className="px-4 py-2 text-right text-gray-300">{r.avg_actual}m</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
