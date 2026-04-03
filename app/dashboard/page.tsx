import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { redirect } from 'next/navigation'
import Link from 'next/link'

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

  // Fetch completion counts
  const [phase1, phase2, sops, tasks] = await Promise.all([
    supabase.from('phase1_completion').select('status').eq('user_id', user.id),
    supabase.from('lesson_completion').select('completed').eq('user_id', user.id).eq('completed', true),
    supabase.from('sop_completion').select('completed').eq('user_id', user.id).eq('completed', true),
    supabase.from('task_completions').select('completed').eq('user_id', user.id).eq('completed', true),
  ])

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
  const phase1Complete = phase1Done >= phase1Total
  const phase2Complete = phase2Done >= phase2Total

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <nav className="border-b border-gray-800 px-6 py-4 flex items-center justify-between">
        <h1 className="text-lg font-bold">Cyborg VA Portal</h1>
        <div className="flex items-center gap-4">
          {profile?.role === 'admin' && (
            <Link href="/admin" className="text-sm text-blue-400 hover:text-blue-300">Admin</Link>
          )}
          <form action="/auth/signout" method="post">
            <button className="text-sm text-gray-400 hover:text-white">Sign out</button>
          </form>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {isNewUser ? (
          /* Welcome screen for brand new users */
          <div className="mb-10">
            <h2 className="text-3xl font-bold mb-2">Welcome, {firstName}! 🎉</h2>
            <p className="text-gray-400 mb-8">
              We&apos;re excited to have you on the team. Start by watching the intro video below, then jump into Phase 1 to get your tools set up.
            </p>

            {/* Intro Video / Expectations */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 mb-8">
              <h3 className="font-semibold text-lg mb-1">Intro Video / Expectations</h3>
              <p className="text-sm text-gray-400 mb-4">Watch this before you get started — it covers what to expect and how to succeed here.</p>
              <div style={{ position: 'relative', paddingBottom: '62.5%', height: 0 }}>
                <iframe
                  src="https://www.loom.com/embed/9fb584dd8d5e4b6c8dc01e1b1cc462f3"
                  frameBorder={0}
                  allowFullScreen
                  style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
                />
              </div>
            </div>

            <p className="text-sm text-gray-400 mb-4">Ready? Start with Phase 1 below ↓</p>
          </div>
        ) : (
          /* Progress header for returning users */
          <div className="mb-8">
            <h2 className="text-2xl font-bold mb-1">Hi {firstName}! Here&apos;s your onboarding progress.</h2>
            <div className="mt-4">
              <div className="flex items-center justify-between text-sm text-gray-400 mb-1">
                <span>Overall Progress</span>
                <span>{overallPct}%</span>
              </div>
              <div className="w-full bg-gray-800 rounded-full h-3">
                <div
                  className="bg-blue-500 h-3 rounded-full transition-all"
                  style={{ width: `${overallPct}%` }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Phase cards — progressively unlocked */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Phase 1 — always unlocked */}
          <Link
            href="/onboarding/phase1"
            className="bg-gray-900 border border-gray-800 rounded-xl p-5 hover:border-gray-600 transition-colors"
          >
            <div className="flex items-center gap-3 mb-3">
              <span className="text-2xl">🔧</span>
              <h3 className="font-semibold">Phase 1: System Access</h3>
            </div>
            <div className="text-sm text-gray-400 mb-2">{phase1Done} / {phase1Total} complete</div>
            <div className="w-full bg-gray-800 rounded-full h-2">
              <div
                className="bg-green-500 h-2 rounded-full"
                style={{ width: `${Math.round((phase1Done / phase1Total) * 100)}%` }}
              />
            </div>
          </Link>

          {/* Phase 2 — locked until Phase 1 complete */}
          {phase1Complete ? (
            <Link
              href="/onboarding/phase2"
              className="bg-gray-900 border border-gray-800 rounded-xl p-5 hover:border-gray-600 transition-colors"
            >
              <div className="flex items-center gap-3 mb-3">
                <span className="text-2xl">🎓</span>
                <h3 className="font-semibold">Phase 2: Foundations</h3>
              </div>
              <div className="text-sm text-gray-400 mb-2">{phase2Done} / {phase2Total} complete</div>
              <div className="w-full bg-gray-800 rounded-full h-2">
                <div
                  className="bg-green-500 h-2 rounded-full"
                  style={{ width: `${Math.round((phase2Done / phase2Total) * 100)}%` }}
                />
              </div>
            </Link>
          ) : (
            <div className="bg-gray-900/50 border border-gray-800/50 rounded-xl p-5 opacity-60 cursor-not-allowed">
              <div className="flex items-center gap-3 mb-3">
                <span className="text-2xl">🔒</span>
                <h3 className="font-semibold text-gray-500">Phase 2: Foundations</h3>
              </div>
              <p className="text-xs text-gray-600">Complete Phase 1 to unlock</p>
            </div>
          )}

          {/* SOPs (Phase 2.1) — locked until Phase 2 complete */}
          {phase2Complete ? (
            <Link
              href="/onboarding/sops"
              className="bg-gray-900 border border-gray-800 rounded-xl p-5 hover:border-gray-600 transition-colors"
            >
              <div className="flex items-center gap-3 mb-3">
                <span className="text-2xl">📋</span>
                <h3 className="font-semibold">Phase 2.1: FF Core SOPs</h3>
              </div>
              <div className="text-sm text-gray-400 mb-2">{sopsD} / {sopsTotal} complete</div>
              <div className="w-full bg-gray-800 rounded-full h-2">
                <div
                  className="bg-green-500 h-2 rounded-full"
                  style={{ width: `${Math.round((sopsD / sopsTotal) * 100)}%` }}
                />
              </div>
            </Link>
          ) : (
            <div className="bg-gray-900/50 border border-gray-800/50 rounded-xl p-5 opacity-60 cursor-not-allowed">
              <div className="flex items-center gap-3 mb-3">
                <span className="text-2xl">🔒</span>
                <h3 className="font-semibold text-gray-500">Phase 2.1: FF Core SOPs</h3>
              </div>
              <p className="text-xs text-gray-600">Complete Phase 2 to unlock</p>
            </div>
          )}

          {/* Task Sheet — unlocked after Phase 1 complete */}
          {phase1Complete ? (
            <Link
              href="/tasks"
              className="bg-gray-900 border border-gray-800 rounded-xl p-5 hover:border-gray-600 transition-colors"
            >
              <div className="flex items-center gap-3 mb-3">
                <span className="text-2xl">✅</span>
                <h3 className="font-semibold">My Task Sheet</h3>
              </div>
              <div className="text-sm text-gray-400">{tasks.data?.length ?? 0} tasks checked off this week</div>
            </Link>
          ) : (
            <div className="bg-gray-900/50 border border-gray-800/50 rounded-xl p-5 opacity-60 cursor-not-allowed">
              <div className="flex items-center gap-3 mb-3">
                <span className="text-2xl">🔒</span>
                <h3 className="font-semibold text-gray-500">My Task Sheet</h3>
              </div>
              <p className="text-xs text-gray-600">Complete Phase 1 to unlock</p>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
