import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
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

  const cards = [
    {
      title: 'Phase 1: System Access',
      href: '/onboarding/phase1',
      done: phase1Done,
      total: phase1Total,
      color: 'blue',
      icon: '🔧',
    },
    {
      title: 'Phase 2: Foundations',
      href: '/onboarding/phase2',
      done: phase2Done,
      total: phase2Total,
      color: 'purple',
      icon: '🎓',
    },
    {
      title: 'FF Core SOPs',
      href: '/onboarding/sops',
      done: sopsD,
      total: sopsTotal,
      color: 'yellow',
      icon: '📋',
    },
    {
      title: 'My Task Sheet',
      href: '/tasks',
      done: tasks.data?.length ?? 0,
      total: null,
      color: 'green',
      icon: '✅',
    },
  ]

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

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {cards.map(card => (
            <Link
              key={card.href}
              href={card.href}
              className="bg-gray-900 border border-gray-800 rounded-xl p-5 hover:border-gray-600 transition-colors"
            >
              <div className="flex items-center gap-3 mb-3">
                <span className="text-2xl">{card.icon}</span>
                <h3 className="font-semibold">{card.title}</h3>
              </div>
              {card.total !== null ? (
                <>
                  <div className="text-sm text-gray-400 mb-2">
                    {card.done} / {card.total} complete
                  </div>
                  <div className="w-full bg-gray-800 rounded-full h-2">
                    <div
                      className="bg-green-500 h-2 rounded-full"
                      style={{ width: `${Math.round((card.done / card.total) * 100)}%` }}
                    />
                  </div>
                </>
              ) : (
                <div className="text-sm text-gray-400">{card.done} tasks checked off this week</div>
              )}
            </Link>
          ))}
        </div>
      </main>
    </div>
  )
}
