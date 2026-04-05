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
  lastActive: string | null
  status: StatusType
  note: string
}

function getWeekStarts(): string[] {
  const now = new Date()
  const day = now.getDay()
  const diff = day === 0 ? -6 : 1 - day
  const monday = new Date(now)
  monday.setDate(now.getDate() + diff)
  monday.setHours(0, 0, 0, 0)

  const starts: string[] = []
  for (let i = 0; i < 4; i++) {
    const d = new Date(monday)
    d.setDate(monday.getDate() - i * 7)
    starts.push(d.toISOString().split('T')[0])
  }
  return starts
}

function isWednesdayOrLater(): boolean {
  return new Date().getDay() >= 3
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

      // This week hours
      const thisWeekMinutes = rows
        .filter(r => r.week_start === currentWeekStart)
        .reduce((sum, r) => sum + (r.time_spent ?? 0), 0)
      const thisWeekHours = (thisWeekMinutes / 60).toFixed(1)

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
        lastActive,
        status,
        note,
      }
    })
  )

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
      </main>
    </div>
  )
}
