import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

type StatusType = 'active' | 'inconsistent' | 'needs-attention'

type MemberStat = {
  id: string
  email: string
  first_name: string
  last_name: string
  job_role: string | null
  consistency: number
  thisWeekHours: string
  lastWeekHours: string
  delta: number
  lastActive: string | null
  status: StatusType
  note: string
}

function getWeekStarts(n = 4): string[] {
  // Must match the client-side getMonday() in the tasks page exactly.
  // Members are in PHT (UTC+8). The client calls monday.setHours(0,0,0,0) in local PHT
  // time, then takes monday.toISOString().split('T')[0]. Because PHT midnight = 4pm UTC the
  // previous day, the stored date string is the Sunday before the PHT Monday (e.g. the PHT
  // week of April 6 is stored as "2026-04-05"). We replicate that here server-side.
  const PHT = 8 * 60 * 60 * 1000
  const phtNow = new Date(Date.now() + PHT) // PHT time expressed as a UTC-shifted value
  const day = phtNow.getUTCDay()
  const hour = phtNow.getUTCHours()
  // Mondays before 6pm PHT still belong to the previous week (grace period for EOW reports)
  const stillLastWeek = day === 1 && hour < 18

  const diff = day === 0 ? -6 : 1 - day
  const mondayPHT = new Date(phtNow)
  mondayPHT.setUTCDate(phtNow.getUTCDate() + diff + (stillLastWeek ? -7 : 0))
  mondayPHT.setUTCHours(0, 0, 0, 0) // midnight PHT in our shifted representation

  // Subtract 8 h to get the actual UTC timestamp for PHT midnight (= Sunday 4pm UTC)
  const mondayAsUTC = new Date(mondayPHT.getTime() - PHT)

  const starts: string[] = []
  for (let i = 0; i < n; i++) {
    const d = new Date(mondayAsUTC)
    d.setUTCDate(mondayAsUTC.getUTCDate() - i * 7)
    starts.push(d.toISOString().split('T')[0])
  }
  return starts
}

function isWednesdayOrLater(): boolean {
  // Use PHT day of week, not server UTC
  const phtNow = new Date(Date.now() + 8 * 60 * 60 * 1000)
  return phtNow.getUTCDay() >= 3
}

const STATUS_ORDER: Record<StatusType, number> = {
  'needs-attention': 0,
  'inconsistent': 1,
  'active': 2,
}

export default async function PerformancePage() {
  // Auth check using user-scoped client
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') redirect('/dashboard')

  // Fetch members with admin client (bypasses RLS)
  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const { data: members } = await admin
    .from('profiles')
    .select('id, email, first_name, last_name, job_role')
    .eq('role', 'member')
    .order('created_at', { ascending: false })

  const weekStarts = getWeekStarts()
  const currentWeekStart = weekStarts[0]
  const wednesdayOrLater = isWednesdayOrLater()
  const workdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']

  const memberStats: MemberStat[] = await Promise.all(
    (members ?? []).map(async (member) => {
      const { data: completions } = await admin
        .from('task_completions')
        .select('week_start, day, time_spent')
        .eq('user_id', member.id)
        .in('week_start', weekStarts)
        .gt('time_spent', 0)

      const rows = completions ?? []

      // Count unique (week_start, day) pairs for workdays only
      const uniquePairs = new Set(
        rows
          .filter(r => workdays.includes(r.day))
          .map(r => `${r.week_start}|${r.day}`)
      )
      const activeDays = uniquePairs.size
      const consistency = Math.round(activeDays / 20 * 100)

      // This week + last week hours
      const thisWeekMinutes = rows
        .filter(r => r.week_start === currentWeekStart)
        .reduce((sum, r) => sum + (r.time_spent ?? 0), 0)
      const thisWeekHours = (thisWeekMinutes / 60).toFixed(1)
      const lastWeekMinutes = rows
        .filter(r => r.week_start === weekStarts[1])
        .reduce((sum, r) => sum + (r.time_spent ?? 0), 0)
      const lastWeekHours = (lastWeekMinutes / 60).toFixed(1)
      const delta = Math.round((thisWeekMinutes - lastWeekMinutes) / 60 * 10) / 10

      // Last active: most recent week_start with any completion
      const weeksWithActivity = [...new Set(rows.map(r => r.week_start))].sort().reverse()
      const lastActive = weeksWithActivity[0] ?? null

      // Status
      let status: StatusType
      if (consistency >= 70) status = 'active'
      else if (consistency >= 30) status = 'inconsistent'
      else status = 'needs-attention'

      // Note
      const noteMap: Record<StatusType, string> = {
        active: 'Consistently logging tasks — great work!',
        inconsistent: 'Some gaps in task logging — check in with them',
        'needs-attention': 'Low activity — may need follow-up',
      }
      let note = noteMap[status]
      if (thisWeekMinutes === 0 && wednesdayOrLater) {
        note += ' · No tasks logged yet this week'
      }

      return {
        id: member.id,
        email: member.email,
        first_name: member.first_name,
        last_name: member.last_name,
        job_role: member.job_role,
        consistency,
        thisWeekHours,
        lastWeekHours,
        delta,
        lastActive,
        status,
        note,
      }
    })
  )

  // Wellness data
  const oneWeekAgo = new Date()
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)

  const { data: flaggedCheckins } = await admin
    .from('wellness_checkins')
    .select('user_id, mood, note, ai_response, created_at')
    .eq('flagged', true)
    .gte('created_at', oneWeekAgo.toISOString())
    .order('created_at', { ascending: false })

  const { data: recentCheckins } = await admin
    .from('wellness_checkins')
    .select('user_id, mood, created_at')
    .gte('created_at', oneWeekAgo.toISOString())

  // Build mood summary per user
  const moodByUser: Record<string, number[]> = {}
  for (const c of recentCheckins ?? []) {
    if (!moodByUser[c.user_id]) moodByUser[c.user_id] = []
    moodByUser[c.user_id].push(c.mood)
  }

  // Build name lookup from members
  const memberNameMap: Record<string, string> = {}
  for (const m of members ?? []) {
    memberNameMap[m.id] = `${m.first_name} ${m.last_name}`.trim() || m.email
  }

  // Sort: needs-attention → inconsistent → active
  const sorted = [...memberStats].sort(
    (a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status]
  )

  const countActive = sorted.filter(m => m.status === 'active').length
  const countInconsistent = sorted.filter(m => m.status === 'inconsistent').length
  const countNeedsAttention = sorted.filter(m => m.status === 'needs-attention').length

  const badgeClasses: Record<StatusType, string> = {
    active: 'bg-green-900/50 text-green-300 border border-green-700/50',
    inconsistent: 'bg-yellow-900/50 text-yellow-300 border border-yellow-700/50',
    'needs-attention': 'bg-red-900/50 text-red-300 border border-red-700/50',
  }

  const badgeLabels: Record<StatusType, string> = {
    active: 'Active',
    inconsistent: 'Inconsistent',
    'needs-attention': 'Needs Attention',
  }

  const barColors: Record<StatusType, string> = {
    active: 'bg-green-500',
    inconsistent: 'bg-yellow-500',
    'needs-attention': 'bg-red-500',
  }

  function formatWeekStart(dateStr: string | null): string {
    if (!dateStr) return '—'
    const d = new Date(dateStr + 'T00:00:00')
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <nav className="border-b border-gray-800 px-6 py-4 flex items-center gap-4">
        <Link href="/admin" className="text-gray-400 hover:text-white text-sm transition-colors">
          ← Admin
        </Link>
        <h1 className="text-lg font-bold">Team Performance</h1>
      </nav>

      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Summary row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <p className="text-xs text-gray-400 mb-1">Total Members</p>
            <p className="text-2xl font-bold">{sorted.length}</p>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <p className="text-xs text-green-400 mb-1">Active</p>
            <p className="text-2xl font-bold text-green-300">{countActive}</p>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <p className="text-xs text-yellow-400 mb-1">Inconsistent</p>
            <p className="text-2xl font-bold text-yellow-300">{countInconsistent}</p>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <p className="text-xs text-red-400 mb-1">Needs Attention</p>
            <p className="text-2xl font-bold text-red-300">{countNeedsAttention}</p>
          </div>
        </div>

        {sorted.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <p className="text-lg mb-2">No team members yet.</p>
            <Link href="/admin/users" className="text-blue-400 hover:text-blue-300 text-sm transition-colors">
              Invite your first member →
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-gray-800">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800 bg-gray-900/60">
                  <th className="text-left py-3 px-4 text-gray-400 font-medium">Member</th>
                  <th className="text-left py-3 px-4 text-gray-400 font-medium">Status</th>
                  <th className="text-left py-3 px-4 text-gray-400 font-medium">Consistency (4 wks)</th>
                  <th className="text-left py-3 px-4 text-gray-400 font-medium">This Week</th>
                  <th className="text-left py-3 px-4 text-gray-400 font-medium">vs Last Week</th>
                  <th className="text-left py-3 px-4 text-gray-400 font-medium">Last Active</th>
                  <th className="text-left py-3 px-4 text-gray-400 font-medium">Note</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((member, idx) => (
                  <tr
                    key={member.id}
                    className={`border-b border-gray-800/50 hover:bg-gray-900/40 transition-colors ${
                      idx === sorted.length - 1 ? 'border-b-0' : ''
                    }`}
                  >
                    {/* Member */}
                    <td className="py-3 px-4">
                      <p className="font-medium">
                        {member.first_name} {member.last_name}
                      </p>
                      <p className="text-xs text-gray-400">{member.email}</p>
                      {member.job_role && (
                        <p className="text-xs text-gray-500">{member.job_role}</p>
                      )}
                    </td>

                    {/* Status badge */}
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${badgeClasses[member.status]}`}>
                        {badgeLabels[member.status]}
                      </span>
                    </td>

                    {/* Consistency bar */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2 min-w-[100px]">
                        <div className="flex-1 bg-gray-800 rounded-full h-1.5 overflow-hidden">
                          <div
                            className={`h-1.5 rounded-full transition-all ${barColors[member.status]}`}
                            style={{ width: `${Math.min(member.consistency, 100)}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-300 tabular-nums w-8 text-right">
                          {member.consistency}%
                        </span>
                      </div>
                    </td>

                    {/* This week hours */}
                    <td className="py-3 px-4 tabular-nums text-gray-300">
                      {member.thisWeekHours}h
                    </td>

                    {/* vs Last week */}
                    <td className="py-3 px-4 tabular-nums text-xs">
                      <span className={member.delta > 0 ? 'text-green-400' : member.delta < 0 ? 'text-red-400' : 'text-gray-500'}>
                        {member.delta > 0 ? `↑ +${member.delta}h` : member.delta < 0 ? `↓ ${member.delta}h` : '— same'}
                      </span>
                      <span className="block text-gray-600">{member.lastWeekHours}h last wk</span>
                    </td>

                    {/* Last active */}
                    <td className="py-3 px-4 text-gray-400 text-xs whitespace-nowrap">
                      {formatWeekStart(member.lastActive)}
                    </td>

                    {/* Note */}
                    <td className="py-3 px-4 text-xs text-gray-400 max-w-xs">
                      {member.note}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {/* Wellness Recap */}
        <div className="mt-10">
          <h2 className="text-base font-semibold text-gray-200 mb-4">💙 Wellness Recap (Last 7 Days)</h2>

          {/* Flagged check-ins */}
          {(flaggedCheckins ?? []).length > 0 && (
            <div className="mb-6 bg-red-950/40 border border-red-800/50 rounded-xl p-4">
              <p className="text-sm font-semibold text-red-300 mb-3">⚠️ Flagged Check-ins (Mood 1–2)</p>
              <div className="space-y-3">
                {(flaggedCheckins ?? []).map((c, i) => (
                  <div key={i} className="border-t border-red-800/30 pt-3 first:border-0 first:pt-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium text-white">
                        {memberNameMap[c.user_id] ?? c.user_id}
                      </span>
                      <span className="text-xs bg-red-900/60 text-red-300 px-2 py-0.5 rounded-full">
                        Mood {c.mood}/5
                      </span>
                      <span className="text-xs text-gray-500 ml-auto">
                        {new Date(c.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                      </span>
                    </div>
                    {c.note && (
                      <p className="text-xs text-gray-300 italic ml-0">"{c.note}"</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Per-member mood summary */}
          {Object.keys(moodByUser).length > 0 ? (
            <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-800 bg-gray-900/60">
                    <th className="text-left py-3 px-4 text-gray-400 font-medium">Member</th>
                    <th className="text-left py-3 px-4 text-gray-400 font-medium">Check-ins</th>
                    <th className="text-left py-3 px-4 text-gray-400 font-medium">Avg Mood</th>
                    <th className="text-left py-3 px-4 text-gray-400 font-medium">Trend</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(moodByUser).map(([uid, moods], idx, arr) => {
                    const avg = moods.reduce((a, b) => a + b, 0) / moods.length
                    const moodEmoji = avg >= 4 ? '😊' : avg >= 3 ? '🙂' : avg >= 2 ? '😐' : '😟'
                    const avgColor = avg >= 4 ? 'text-green-300' : avg >= 3 ? 'text-yellow-300' : 'text-red-300'
                    const dots = moods.slice(-5).map(m => {
                      const c = m >= 4 ? '🟢' : m >= 3 ? '🟡' : '🔴'
                      return c
                    }).join(' ')
                    return (
                      <tr key={uid} className={`border-b border-gray-800/50 ${idx === arr.length - 1 ? 'border-b-0' : ''}`}>
                        <td className="py-3 px-4 font-medium">{memberNameMap[uid] ?? uid}</td>
                        <td className="py-3 px-4 text-gray-400">{moods.length}</td>
                        <td className={`py-3 px-4 font-semibold ${avgColor}`}>{moodEmoji} {avg.toFixed(1)}</td>
                        <td className="py-3 px-4 text-base">{dots}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-gray-500">No wellness check-ins in the past 7 days.</p>
          )}
        </div>
      </main>
    </div>
  )
}
