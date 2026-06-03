import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import MemberStats from '@/components/stats/MemberStatsLazy'
import VAOffboardingForm from '@/components/offboarding/VAOffboardingForm'
import { PHASE_TOTALS, WEEKS_OF_HISTORY, TIMEZONE_OFFSET_MS } from '@/lib/constants'
import { computePhaseGates } from '@/lib/onboarding/gating'
import { CARD_CLASS } from '@/lib/ui'
import ProgressBar from '@/components/ui/ProgressBar'
import QuickNav from '@/components/nav/QuickNav'

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
    .select('role, first_name, guide_completed')
    .eq('id', user.id)
    .single()

  // Fetch completion counts + 8-week stats for charts.
  // Must match the client-side getMonday() in tasks page: PHT (UTC+8) users store week_start
  // as the ISO date of Monday midnight PHT expressed in UTC, which is the previous day (Sunday).
  function getWeekStarts(n: number) {
    const PHT = TIMEZONE_OFFSET_MS
    const phtNow = new Date(Date.now() + PHT)
    const day = phtNow.getUTCDay()
    const diff = day === 0 ? -6 : 1 - day
    const mondayPHT = new Date(phtNow)
    mondayPHT.setUTCDate(phtNow.getUTCDate() + diff)
    mondayPHT.setUTCHours(0, 0, 0, 0)
    const mondayAsUTC = new Date(mondayPHT.getTime() - PHT) // midnight PHT = 4pm UTC prev day
    return Array.from({ length: n }, (_, i) => {
      const d = new Date(mondayAsUTC)
      d.setUTCDate(mondayAsUTC.getUTCDate() - i * 7)
      return d.toISOString().split('T')[0]
    })
  }
  const weekStarts8 = getWeekStarts(WEEKS_OF_HISTORY)
  const currentWeek = weekStarts8[0]

  // VA is in the offboarding process — show their fillable form
  if (profile?.role === 'offboarding') {
    const { data: offboardingData } = await admin
      .from('va_offboarding')
      .select('last_project, sops_used, reason, invoice_period, invoice_amount, invoice_notes, va_submitted')
      .eq('user_id', user.id)
      .maybeSingle()
    return <VAOffboardingForm firstName={profile?.first_name ?? 'there'} existing={offboardingData} />
  }

  const isAdminUser = profile?.role === 'super_admin'
  const hasAdminNav = profile?.role === 'admin' || profile?.role === 'super_admin'

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
    // One query for both weeks (was two sequential round-trips), split in memory.
    const lastWeekStart = weekStarts8[1]
    const { data: weekRows } = await admin
      .from('task_completions')
      .select('user_id, week_start, time_spent')
      .in('user_id', memberIds)
      .in('week_start', [currentWeek, lastWeekStart])
      .gt('time_spent', 0)

    const thisWeekActive = new Set((weekRows ?? []).filter(r => r.week_start === currentWeek).map(r => r.user_id))
    const lastWeekActive = new Set((weekRows ?? []).filter(r => r.week_start === lastWeekStart).map(r => r.user_id))

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
  const phase1Total = PHASE_TOTALS.phase1
  const phase2Done = phase2.data?.length ?? 0
  const phase2Total = PHASE_TOTALS.phase2
  const sopsD = sops.data?.length ?? 0
  const sopsTotal = PHASE_TOTALS.sops

  const totalDone = phase1Done + phase2Done + sopsD
  const totalItems = phase1Total + phase2Total + sopsTotal
  const overallPct = totalItems > 0 ? Math.round((totalDone / totalItems) * 100) : 0

  const firstName = profile?.first_name ?? 'there'

  const isNewUser = phase1Done === 0 && phase2Done === 0 && sopsD === 0

  // Sequential gating for everyone: Phase 0 (Guide) → Phase 1 → Phase 2 → SOPs.
  // Each unlocks only when the prior step is done. Admins/super_admins bypass.
  const { guideComplete, phase1Unlocked, phase1Complete, phase2Complete } = computePhaseGates(
    { guideDone: profile?.guide_completed ?? false, phase1Done, phase2Done, sopsDone: sopsD },
    profile?.role,
  )

  const cardClass = CARD_CLASS

  const phaseCards = (
    <>
      <Link href="/guide" className={cardClass}>
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xl">📖</span>
          <h3 className="font-semibold text-sm">Phase 0: Getting Started</h3>
        </div>
        <div className="text-xs text-gray-400">
          {guideComplete ? '✓ Guide complete' : 'Read the guide, then mark it complete'}
        </div>
      </Link>

      {phase1Unlocked ? (
        <Link href="/onboarding/phase1" className={cardClass}>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xl">🔧</span>
            <h3 className="font-semibold text-sm">Phase 1: System Access</h3>
          </div>
          <div className="text-xs text-gray-400 mb-1.5">{phase1Done} / {phase1Total} complete</div>
          <ProgressBar value={phase1Done} total={phase1Total} />
        </Link>
      ) : (
        <div className="bg-gray-900/50 border border-gray-800/50 rounded-xl p-4 opacity-60 cursor-not-allowed">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xl">🔒</span>
            <h3 className="font-semibold text-sm text-gray-500">Phase 1: System Access</h3>
          </div>
          <p className="text-xs text-gray-600">Complete Getting Started to unlock</p>
        </div>
      )}

      {phase1Complete ? (
        <Link href="/onboarding/phase2" className={cardClass}>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xl">🎓</span>
            <h3 className="font-semibold text-sm">Phase 2: Foundations</h3>
          </div>
          <div className="text-xs text-gray-400 mb-1.5">{phase2Done} / {phase2Total} complete</div>
          <ProgressBar value={phase2Done} total={phase2Total} />
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
            <h3 className="font-semibold text-sm">Phase 2.1: Core SOPs</h3>
          </div>
          <div className="text-xs text-gray-400 mb-1.5">{sopsD} / {sopsTotal} complete</div>
          <ProgressBar value={sopsD} total={sopsTotal} />
        </Link>
      ) : (
        <div className="bg-gray-900/50 border border-gray-800/50 rounded-xl p-4 opacity-60 cursor-not-allowed">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xl">🔒</span>
            <h3 className="font-semibold text-sm text-gray-500">Phase 2.1: Core SOPs</h3>
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
    </>
  )

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <QuickNav isAdmin={hasAdminNav} />

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
