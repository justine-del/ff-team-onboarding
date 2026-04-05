import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import MemberStats from '@/components/MemberStats'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // Use service role to bypass RLS for profile read
  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
  const { data: profile } = await admin
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  // Fetch completion counts + 8-week stats for charts
  function getWeekStarts(n: number) {
    const now = new Date()
    const day = now.getDay()
    const diff = day === 0 ? -6 : 1 - day
    const monday = new Date(now)
    monday.setDate(now.getDate() + diff)
    monday.setHours(0, 0, 0, 0)
    return Array.from({ length: n }, (_, i) => {
      const d = new Date(monday)
      d.setDate(monday.getDate() - i * 7)
      return d.toISOString().split('T')[0]
    })
  }
  const weekStarts8 = getWeekStarts(8)
  const currentWeek = weekStarts8[0]

  const isAdminUser = profile?.role === 'admin'

  const [phase1, phase2, sops, tasks, weeklyStats, allMembers] = await Promise.all([
    supabase.from('phase1_completion').select('status').eq('user_id', user.id),
    supabase.from('lesson_completion').select('completed').eq('user_id', user.id).eq('completed', true),
    supabase.from('sop_completion').select('completed').eq('user_id', user.id).eq('completed', true),
    supabase.from('task_completions').select('completed').eq('user_id', user.id).eq('completed', true),
    supabase.from('task_completions').select('week_start, day, time_spent').eq('user_id', user.id).in('week_start', weekStarts8),
    isAdminUser
      ? admin.from('profiles').select('id').eq('role', 'member')
      : Promise.resolve({ data: [] }),
  ])

  // Admin: fetch this week's activity summary for all members
  let teamStats: { active: number; inconsistent: number; needsAttention: number; noActivity: number } | null = null
  if (isAdminUser && allMembers.data && allMembers.data.length > 0) {
    const memberIds = allMembers.data.map((m: { id: string }) => m.id)
    const { data: thisWeekRows } = await admin
      .from('task_completions')
      .select('user_id, time_spent')
      .in('user_id', memberIds)
      .eq('week_start', currentWeek)
      .gt('time_spent', 0)

    const { data: lastWeekRows } = await admin
      .from('task_completions')
      .select('user_id, time_spent')
      .in('user_id', memberIds)
      .eq('week_start', weekStarts8[1])
      .gt('time_spent', 0)

    const thisWeekActive = new Set(thisWeekRows?.map(r => r.user_id) ?? [])
    const lastWeekActive = new Set(lastWeekRows?.map(r => r.user_id) ?? [])

    let active = 0, inconsistent = 0, needsAttention = 0, noActivity = 0
    for (const id of memberIds) {
      if (thisWeekActive.has(id)) active++
      else if (lastWeekActive.has(id)) inconsistent++
      else noActivity++
    }
    inconsistent = inconsistent
    needsAttention = memberIds.length - active - inconsistent - noActivity
    teamStats = { active, inconsistent, needsAttention, noActivity }
  }

  const phase1Done = phase1.data?.filter(t => t.status === 'done').length ?? 0
  const phase1Total = 18
  const phase2Done = phase2.data?.length ?? 0
  const phase2Total = 17
  const sopsD = sops.data?.length ?? 0
  const sopsTotal = 10

  const totalDone = phase1Done + phase2Done + sopsD
  const totalItems = phase1Total + phase2Total + sopsTotal
  const overallPct = totalItems > 0 ? Math.round((totalDone / totalItems) * 100) : 0

  const firstName = profile?.first_name ?? 'there'

  const isNewUser = phase1Done === 0 && phase2Done === 0 && sopsD === 0

  // Maki and Josua must complete phases in order; everyone else gets all unlocked
  const LOCKED_MEMBERS = ['maki@joburn.com', 'josua@joburn.com']
  const isLocked = LOCKED_MEMBERS.includes(profile?.email ?? '')
  const phase1Complete = isLocked ? phase1Done >= phase1Total : true
  const phase2Complete = isLocked ? phase2Done >= phase2Total : true

  const cardClass = "bg-gray-900 border border-gray-800 rounded-xl p-4 hover:border-gray-600 transition-colors"

  const phaseCards = (
    <>
      <Link href="/onboarding/phase1" className={cardClass}>
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xl">🔧</span>
          <h3 className="font-semibold text-sm">Phase 1: System Access</h3>
        </div>
        <div className="text-xs text-gray-400 mb-1.5">{phase1Done} / {phase1Total} complete</div>
        <div className="w-full bg-gray-800 rounded-full h-1.5">
          <div className="bg-green-500 h-1.5 rounded-full" style={{ width: `${Math.round((phase1Done / phase1Total) * 100)}%` }} />
        </div>
      </Link>

      {phase1Complete ? (
        <Link href="/onboarding/phase2" className={cardClass}>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xl">🎓</span>
            <h3 className="font-semibold text-sm">Phase 2: Foundations</h3>
          </div>
          <div className="text-xs text-gray-400 mb-1.5">{phase2Done} / {phase2Total} complete</div>
          <div className="w-full bg-gray-800 rounded-full h-1.5">
            <div className="bg-green-500 h-1.5 rounded-full" style={{ width: `${Math.round((phase2Done / phase2Total) * 100)}%` }} />
          </div>
        </Link>
      ) : (
        <div className="bg-gray-900/50 border border-gray-800/50 rounded-xl p-4 opacity-60 cursor-not-allowed">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xl">🔒</span>
            <h3 className="font-semibold text-sm text-gray-500">Phase 2: Foundations</h3>
          </div>
          <p className="text-xs text-gray-600">Complete Phase 1 to unlock</p>
        </div>
      )}

      {phase2Complete ? (
        <Link href="/onboarding/sops" className={cardClass}>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xl">📋</span>
            <h3 className="font-semibold text-sm">Phase 2.1: FF Core SOPs</h3>
          </div>
          <div className="text-xs text-gray-400 mb-1.5">{sopsD} / {sopsTotal} complete</div>
          <div className="w-full bg-gray-800 rounded-full h-1.5">
            <div className="bg-green-500 h-1.5 rounded-full" style={{ width: `${Math.round((sopsD / sopsTotal) * 100)}%` }} />
          </div>
        </Link>
      ) : (
        <div className="bg-gray-900/50 border border-gray-800/50 rounded-xl p-4 opacity-60 cursor-not-allowed">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xl">🔒</span>
            <h3 className="font-semibold text-sm text-gray-500">Phase 2.1: FF Core SOPs</h3>
          </div>
          <p className="text-xs text-gray-600">Complete Phase 2 to unlock</p>
        </div>
      )}

      <Link href="/tasks" className={cardClass}>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xl">✅</span>
          <h3 className="font-semibold text-sm">My Task Sheet</h3>
        </div>
        <div className="text-xs text-gray-400">{tasks.data?.length ?? 0} tasks checked off this week</div>
      </Link>

      <Link href="/chat" className={cardClass}>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xl">🤖</span>
          <h3 className="font-semibold text-sm">VA Assistant</h3>
        </div>
        <div className="text-xs text-gray-400">Ask anything about SOPs & policies</div>
      </Link>

      <Link href="/wellness" className={cardClass}>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xl">💙</span>
          <h3 className="font-semibold text-sm">Wellness Check</h3>
        </div>
        <div className="text-xs text-gray-400">How are you feeling today?</div>
      </Link>
    </>
  )

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <nav className="border-b border-gray-800 px-6 py-4 flex items-center justify-between">
        <h1 className="text-lg font-bold">Cyborg VA Portal</h1>
        <div className="flex items-center gap-4">
          {profile?.role === 'admin' && (
            <>
              <Link href="/admin" className="text-sm text-blue-400 hover:text-blue-300">Admin</Link>
              <Link href="/admin/performance" className="text-sm text-purple-400 hover:text-purple-300">📊 Performance</Link>
            </>
          )}
          <form action="/auth/signout" method="post">
            <button className="text-sm text-gray-400 hover:text-white">Sign out</button>
          </form>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-4 py-8">
        {isNewUser ? (
          /* Welcome screen — video + cards side by side */
          <div>
            <h2 className="text-3xl font-bold mb-1">Welcome, {firstName}! 🎉</h2>
            <p className="text-gray-400 mb-6">
              We&apos;re excited to have you on the team. Watch the intro video, then jump into your phases.
            </p>
            <div className="flex flex-col lg:flex-row gap-5">
              {/* Video */}
              <div className="flex-1 bg-gray-900 border border-gray-800 rounded-xl p-5">
                <h3 className="font-semibold text-lg mb-1">Intro Video / Expectations</h3>
                <p className="text-sm text-gray-400 mb-4">Watch this before you get started — covers what to expect and how to succeed here.</p>
                <div style={{ position: 'relative', paddingBottom: '62.5%', height: 0 }}>
                  <iframe
                    src="https://www.loom.com/embed/9fb584dd8d5e4b6c8dc01e1b1cc462f3"
                    frameBorder={0}
                    allowFullScreen
                    style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
                  />
                </div>
              </div>
              {/* Cards sidebar */}
              <div className="lg:w-72 flex flex-col gap-3">
                <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold">Your onboarding</p>
                {phaseCards}
              </div>
            </div>
          </div>
        ) : (
          /* Returning user — progress + cards */
          <div>
            {/* Admin: team performance overview */}
            {isAdminUser && teamStats && (
              <div className="mb-6 bg-gray-900 border border-gray-800 rounded-xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-semibold text-base">Team Performance This Week</h3>
                    <p className="text-xs text-gray-500 mt-0.5">{allMembers.data?.length ?? 0} members total</p>
                  </div>
                  <Link href="/admin/performance" className="text-xs text-purple-400 hover:text-purple-300 transition-colors">
                    View full report →
                  </Link>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-green-950/40 border border-green-800/40 rounded-lg p-3 text-center">
                    <div className="text-2xl font-bold text-green-400">{teamStats.active}</div>
                    <div className="text-xs text-green-500 mt-0.5">Logged this week</div>
                  </div>
                  <div className="bg-yellow-950/40 border border-yellow-800/40 rounded-lg p-3 text-center">
                    <div className="text-2xl font-bold text-yellow-400">{teamStats.inconsistent}</div>
                    <div className="text-xs text-yellow-500 mt-0.5">Active last week only</div>
                  </div>
                  <div className="bg-red-950/40 border border-red-800/40 rounded-lg p-3 text-center">
                    <div className="text-2xl font-bold text-red-400">{teamStats.noActivity}</div>
                    <div className="text-xs text-red-500 mt-0.5">No recent activity</div>
                  </div>
                  <div className="bg-gray-800/40 border border-gray-700/40 rounded-lg p-3 text-center">
                    <div className="text-2xl font-bold text-gray-300">{allMembers.data?.length ?? 0}</div>
                    <div className="text-xs text-gray-500 mt-0.5">Total members</div>
                  </div>
                </div>
              </div>
            )}

            {/* Personal stats + charts — all users */}
            <MemberStats
              rows={weeklyStats.data ?? []}
              currentWeek={currentWeek}
              memberName={firstName}
            />

            <div className="mb-8">
              <h2 className="text-2xl font-bold mb-1">Hi {firstName}! Here&apos;s your onboarding progress.</h2>
              <div className="mt-4">
                <div className="flex items-center justify-between text-sm text-gray-400 mb-1">
                  <span>Overall Progress</span>
                  <span>{overallPct}%</span>
                </div>
                <div className="w-full bg-gray-800 rounded-full h-3">
                  <div className="bg-blue-500 h-3 rounded-full transition-all" style={{ width: `${overallPct}%` }} />
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {phaseCards}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
