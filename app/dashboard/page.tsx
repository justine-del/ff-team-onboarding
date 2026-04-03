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
    </>
  )

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
