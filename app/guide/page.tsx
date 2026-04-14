import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function GuidePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, first_name')
    .eq('id', user.id)
    .single()

  const isAdmin = profile?.role === 'admin' || profile?.role === 'super_admin'

  const sections = [
    { id: 'overview', label: 'Overview' },
    { id: 'for-vas', label: 'For VAs' },
    { id: 'getting-started', label: '  Getting Started' },
    { id: 'dashboard', label: '  Your Dashboard' },
    { id: 'phase1', label: '  Phase 1' },
    { id: 'phase2', label: '  Phase 2' },
    { id: 'sops', label: '  SOPs' },
    { id: 'task-sheet', label: '  Task Sheet' },
    { id: 'eow-report', label: '  EOW Report' },
    { id: 'va-assistant', label: '  VA Assistant' },
    { id: 'for-admins', label: 'For Admins' },
    { id: 'admin-dashboard', label: '  Admin Dashboard' },
    { id: 'inviting-vas', label: '  Inviting VAs' },
    { id: 'tracking-progress', label: '  Tracking Progress' },
    { id: 'managing-sops', label: '  Managing SOPs' },
    { id: 'eow-tracking', label: '  EOW Tracking' },
    { id: 'reset-progress', label: '  Resetting Progress' },
    { id: 'offboarding', label: '  Offboarding' },
  ]

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <nav className="border-b border-gray-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard" className="text-gray-400 hover:text-white text-sm">← Dashboard</Link>
          <h1 className="text-lg font-bold">Platform Guide</h1>
        </div>
        {isAdmin && (
          <Link href="/admin" className="text-sm text-blue-400 hover:text-blue-300">Admin →</Link>
        )}
      </nav>

      <div className="max-w-6xl mx-auto px-4 py-8 flex gap-8">
        {/* Sticky sidebar */}
        <aside className="hidden lg:block w-52 shrink-0">
          <div className="sticky top-8">
            <p className="text-xs uppercase tracking-widest text-gray-500 font-semibold mb-3">Contents</p>
            <nav className="space-y-0.5">
              {sections.map(s => (
                <a
                  key={s.id}
                  href={`#${s.id}`}
                  className={`block text-sm py-1 transition-colors hover:text-white ${s.label.startsWith('  ') ? 'pl-3 text-gray-500 hover:text-gray-300' : 'text-gray-300 font-medium'}`}
                >
                  {s.label.trim()}
                </a>
              ))}
            </nav>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 max-w-3xl space-y-16 pb-24">

          {/* Hero */}
          <div id="overview" className="scroll-mt-8">
            <div className="inline-block bg-blue-600/20 border border-blue-600/30 text-blue-300 text-xs font-semibold px-3 py-1 rounded-full mb-4">
              Complete Platform Guide
            </div>
            <h2 className="text-3xl font-bold mb-4">Cyborg VA Portal — How It Works</h2>
            <p className="text-gray-400 leading-relaxed mb-4">
              This portal is your team&apos;s central hub for onboarding, weekly task tracking, and end-of-week reporting.
              Whether you&apos;re a VA going through onboarding or a client admin managing your team — everything you need is here.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                <p className="text-sm font-semibold mb-1">For VAs</p>
                <p className="text-xs text-gray-400">Complete your onboarding phases, read your company SOPs, log your daily work, and submit your weekly report.</p>
              </div>
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                <p className="text-sm font-semibold mb-1">For Admins</p>
                <p className="text-xs text-gray-400">Invite your team, monitor onboarding progress, manage your SOPs, and track weekly EOW report submissions.</p>
              </div>
            </div>
          </div>

          {/* ── FOR VAs ── */}
          <div id="for-vas" className="scroll-mt-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="h-px flex-1 bg-gray-800" />
              <span className="text-xs uppercase tracking-widest text-gray-500 font-semibold">For VAs</span>
              <div className="h-px flex-1 bg-gray-800" />
            </div>
          </div>

          {/* Getting Started */}
          <div id="getting-started" className="scroll-mt-8">
            <h3 className="text-xl font-bold mb-1">Getting Started</h3>
            <p className="text-xs text-gray-500 mb-4">Day 1 — before anything else</p>
            <div className="space-y-4 text-sm text-gray-300 leading-relaxed">
              <p>
                Your admin sent you an invite link. That link is your one-time access to create your account —
                it&apos;s tied to your email address and can only be used once. Click it, set a password, and you&apos;re in.
              </p>
              <div className="bg-yellow-900/20 border border-yellow-800/40 rounded-lg p-4">
                <p className="text-yellow-300 font-medium text-xs mb-1">Important</p>
                <p className="text-yellow-200/80 text-xs">The invite link expires after 24 hours. If yours expired, ask your admin to resend it from the Manage Users page.</p>
              </div>
              <ol className="list-decimal list-inside space-y-2 text-gray-300">
                <li>Click the invite link from your email</li>
                <li>Set a secure password (you&apos;ll use this every time you log in)</li>
                <li>Complete the account setup form — name, job role, start date</li>
                <li>You&apos;ll land on your dashboard. Start with Phase 1.</li>
              </ol>
              <p className="text-gray-400">
                Going forward, log in at the portal URL your admin shared. Bookmark it — you&apos;ll use it every week.
              </p>
            </div>
          </div>

          {/* Dashboard */}
          <div id="dashboard" className="scroll-mt-8">
            <h3 className="text-xl font-bold mb-1">Your Dashboard</h3>
            <p className="text-xs text-gray-500 mb-4">Your home base</p>
            <div className="space-y-4 text-sm text-gray-300 leading-relaxed">
              <p>
                The dashboard shows everything at a glance — your onboarding phases, weekly task sheet,
                VA assistant, and wellness check. Your overall progress bar at the top tracks how far through onboarding you are.
              </p>
              <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
                <div className="grid grid-cols-1 divide-y divide-gray-800">
                  {[
                    ['Phase 1: System Access', 'Account setup tasks — tools, logins, and access you need from day one'],
                    ['Phase 2: Foundations', 'Core training content — how the team works, expectations, communication'],
                    ['Phase 2.1: SOPs', 'Your company\'s standard operating procedures — read and check off each one'],
                    ['My Task Sheet', 'Log your daily work and hours for the current week'],
                    ['VA Assistant', 'AI assistant trained on your SOPs — ask it anything about policies'],
                    ['Wellness Check', 'Weekly check-in on how you\'re feeling'],
                  ].map(([title, desc]) => (
                    <div key={title} className="flex gap-3 px-4 py-3">
                      <div className="w-40 shrink-0 text-xs font-medium text-white">{title}</div>
                      <div className="text-xs text-gray-400">{desc}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Phase 1 */}
          <div id="phase1" className="scroll-mt-8">
            <h3 className="text-xl font-bold mb-1">Phase 1: System Access</h3>
            <p className="text-xs text-gray-500 mb-4">18 setup tasks — complete these first</p>
            <div className="space-y-4 text-sm text-gray-300 leading-relaxed">
              <p>
                Phase 1 is purely practical. It&apos;s 18 tasks that get you set up in every tool your team uses —
                LastPass, Slack, ClickUp, Google Drive, and more. Each task has a direct link and clear instructions.
              </p>
              <p>
                Work through them in order. As you complete each one, click the checkbox to mark it done.
                Your progress saves automatically — you can close the browser and pick up where you left off.
              </p>
              <div className="bg-blue-900/20 border border-blue-800/40 rounded-lg p-4">
                <p className="text-blue-300 font-medium text-xs mb-1">Tip</p>
                <p className="text-blue-200/80 text-xs">
                  Some tasks require your admin or another team member to complete on their end
                  (e.g. adding you to a Slack workspace). Flag these tasks to your admin if you&apos;re stuck.
                </p>
              </div>
              <p>
                Phase 2 unlocks once Phase 1 is fully complete.
              </p>
            </div>
          </div>

          {/* Phase 2 */}
          <div id="phase2" className="scroll-mt-8">
            <h3 className="text-xl font-bold mb-1">Phase 2: Foundations</h3>
            <p className="text-xs text-gray-500 mb-4">17 lessons — the how and why behind everything</p>
            <div className="space-y-4 text-sm text-gray-300 leading-relaxed">
              <p>
                Phase 2 is your core training. It covers communication standards, accountability expectations,
                how to manage your time, reporting norms, and what good work looks like here.
                Each lesson is a short Loom video or document — watch/read it, then mark it done.
              </p>
              <p>
                Don&apos;t rush this. These lessons are the foundation of how this team operates.
                Understanding them well now prevents confusion later.
              </p>
              <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 text-xs text-gray-400">
                Phase 2 unlocks after Phase 1 is complete. SOPs (Phase 2.1) unlock after Phase 2 is complete.
              </div>
            </div>
          </div>

          {/* SOPs */}
          <div id="sops" className="scroll-mt-8">
            <h3 className="text-xl font-bold mb-1">Phase 2.1: SOPs</h3>
            <p className="text-xs text-gray-500 mb-4">Your company&apos;s standard operating procedures</p>
            <div className="space-y-4 text-sm text-gray-300 leading-relaxed">
              <p>
                SOPs are your company&apos;s specific rules and processes. Unlike Phases 1 and 2 which are the same
                across all teams, SOPs are unique to your company — your admin added them specifically for your team.
              </p>
              <p>
                Each SOP has a link to a Google Doc, Notion page, or other document. Open it, read it fully,
                then check it off. The completion timestamp is recorded so your admin can see when you reviewed it.
              </p>
              <p>
                SOPs are marked either <span className="text-red-300 font-medium">CRITICAL</span> or <span className="text-yellow-300 font-medium">HIGH</span> priority.
                Critical SOPs are non-negotiable — they cover data security, communication policy, and accountability.
                Read these carefully.
              </p>
              <div className="bg-yellow-900/20 border border-yellow-800/40 rounded-lg p-4">
                <p className="text-yellow-300 font-medium text-xs mb-1">Not just a checkbox</p>
                <p className="text-yellow-200/80 text-xs">
                  These documents govern how you work. When in doubt about anything — how to request time off,
                  how to handle a client file, how to communicate — come back and re-read the relevant SOP.
                </p>
              </div>
            </div>
          </div>

          {/* Task Sheet */}
          <div id="task-sheet" className="scroll-mt-8">
            <h3 className="text-xl font-bold mb-1">Task Sheet</h3>
            <p className="text-xs text-gray-500 mb-4">Your weekly work log — fill this in every day</p>
            <div className="space-y-4 text-sm text-gray-300 leading-relaxed">
              <p>
                The task sheet is where you log your work each day of the week. Think of it as your running record
                of what you did, what you completed, and how long things took.
              </p>
              <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
                <div className="grid grid-cols-1 divide-y divide-gray-800">
                  {[
                    ['What to log', 'Tasks you worked on, meetings attended, content created, research done — anything work-related'],
                    ['Time spent', 'Log your hours per task. Be honest. This data helps your admin support you and spot overload early.'],
                    ['Completed checkbox', 'Check off tasks you fully finished. Incomplete tasks stay visible so you can carry them forward.'],
                    ['When to fill it', 'Daily — ideally at end of day while it\'s fresh. Do not batch-fill on Friday.'],
                    ['Previous weeks', 'Use the week navigator (top of the task sheet) to view past weeks. Past weeks are read-only.'],
                  ].map(([title, desc]) => (
                    <div key={title} className="flex gap-3 px-4 py-3">
                      <div className="w-36 shrink-0 text-xs font-medium text-white">{title}</div>
                      <div className="text-xs text-gray-400">{desc}</div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="bg-blue-900/20 border border-blue-800/40 rounded-lg p-4">
                <p className="text-blue-300 font-medium text-xs mb-1">Why this matters</p>
                <p className="text-blue-200/80 text-xs">
                  Your task sheet is the primary record of your work. Gaps or inconsistencies are visible to your admin.
                  A complete, honest log protects you and builds trust.
                </p>
              </div>
            </div>
          </div>

          {/* EOW Report */}
          <div id="eow-report" className="scroll-mt-8">
            <h3 className="text-xl font-bold mb-1">EOW Report</h3>
            <p className="text-xs text-gray-500 mb-4">End-of-week report — due every Friday</p>
            <div className="space-y-4 text-sm text-gray-300 leading-relaxed">
              <p>
                The EOW (End of Week) report is a short written summary you submit at the end of each work week.
                It&apos;s your chance to reflect, flag blockers, and communicate your status to your admin.
              </p>
              <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
                <div className="grid grid-cols-1 divide-y divide-gray-800 text-xs">
                  <div className="px-4 py-3 text-gray-400 font-medium bg-gray-900/60">What the report typically includes</div>
                  {[
                    'What you accomplished this week',
                    'What you\'re carrying over to next week',
                    'Any blockers, challenges, or things you need help with',
                    'Your hours worked (if not already in the task sheet)',
                    'Anything your admin should know',
                  ].map(item => (
                    <div key={item} className="px-4 py-2.5 text-gray-300 flex items-start gap-2">
                      <span className="text-green-500 mt-0.5">→</span>
                      {item}
                    </div>
                  ))}
                </div>
              </div>
              <p>
                Submit the report from the task sheet page by Friday EOD. Your admin can see whether you submitted
                or not — a missing EOW is noticed.
              </p>
              <div className="bg-red-900/20 border border-red-800/40 rounded-lg p-4">
                <p className="text-red-300 font-medium text-xs mb-1">Non-negotiable</p>
                <p className="text-red-200/80 text-xs">
                  If you can&apos;t submit by Friday (e.g. you&apos;re sick), message your admin directly.
                  Do not silently skip — it signals disconnection from the team.
                </p>
              </div>
            </div>
          </div>

          {/* VA Assistant */}
          <div id="va-assistant" className="scroll-mt-8">
            <h3 className="text-xl font-bold mb-1">VA Assistant</h3>
            <p className="text-xs text-gray-500 mb-4">AI trained on your SOPs — ask it anything</p>
            <div className="space-y-4 text-sm text-gray-300 leading-relaxed">
              <p>
                The VA Assistant is an AI chat tool available throughout the portal (tap the chat icon in the bottom right).
                It&apos;s been trained on your company SOPs and onboarding content, so it can answer specific questions
                about policies, procedures, and expectations.
              </p>
              <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
                <p className="text-xs font-medium text-white mb-2">Good questions to ask</p>
                <ul className="space-y-1 text-xs text-gray-400">
                  <li>→ "What&apos;s the process for requesting time off?"</li>
                  <li>→ "Where do I log my hours?"</li>
                  <li>→ "How should I communicate delays to a client?"</li>
                  <li>→ "What counts as a billable task?"</li>
                </ul>
              </div>
              <p className="text-gray-400 text-xs">
                The assistant does not have access to your personal data, task logs, or EOW reports.
                It only draws from company policy documents and onboarding content.
              </p>
            </div>
          </div>

          {/* ── FOR ADMINS ── */}
          <div id="for-admins" className="scroll-mt-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="h-px flex-1 bg-gray-800" />
              <span className="text-xs uppercase tracking-widest text-gray-500 font-semibold">For Admins</span>
              <div className="h-px flex-1 bg-gray-800" />
            </div>
          </div>

          {/* Admin Dashboard */}
          <div id="admin-dashboard" className="scroll-mt-8">
            <h3 className="text-xl font-bold mb-1">Admin Dashboard</h3>
            <p className="text-xs text-gray-500 mb-4">Where you land when you log in</p>
            <div className="space-y-4 text-sm text-gray-300 leading-relaxed">
              <p>
                When you log in as an admin, you go straight to your team dashboard — not the VA onboarding flow.
                Your dashboard has two sections:
              </p>
              <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
                <div className="grid grid-cols-1 divide-y divide-gray-800">
                  {[
                    ['Onboarding Progress', 'A table of all your VAs showing Phase 1, Phase 2, and SOP completion counts'],
                    ['EOW Report Status', 'A live view of who submitted their end-of-week report this week and who hasn\'t'],
                  ].map(([title, desc]) => (
                    <div key={title} className="flex gap-3 px-4 py-3">
                      <div className="w-44 shrink-0 text-xs font-medium text-white">{title}</div>
                      <div className="text-xs text-gray-400">{desc}</div>
                    </div>
                  ))}
                </div>
              </div>
              <p>
                The top nav has buttons for <strong>Edit Links</strong> (update onboarding content),
                <strong>Offboard VA</strong>, and <strong>Manage Users</strong> (invite, reset, remove members).
              </p>
            </div>
          </div>

          {/* Inviting VAs */}
          <div id="inviting-vas" className="scroll-mt-8">
            <h3 className="text-xl font-bold mb-1">Inviting VAs</h3>
            <p className="text-xs text-gray-500 mb-4">How to get your team set up</p>
            <div className="space-y-4 text-sm text-gray-300 leading-relaxed">
              <p>
                Access is invite-only — nobody can sign up on their own. You create their account and send them the link.
              </p>
              <ol className="list-decimal list-inside space-y-3 text-gray-300">
                <li>
                  Go to <strong>Admin → Manage Users</strong>
                </li>
                <li>
                  Click <strong>Invite New Member</strong> and enter their email address
                </li>
                <li>
                  The system generates a one-time invite link — copy it and send to your VA via Slack, email, or wherever you communicate
                </li>
                <li>
                  When they click the link, they&apos;ll be prompted to set a password and fill in their profile (name, job role, start date)
                </li>
                <li>
                  They&apos;ll appear in your admin dashboard immediately after completing setup
                </li>
              </ol>
              <div className="bg-yellow-900/20 border border-yellow-800/40 rounded-lg p-4">
                <p className="text-yellow-300 font-medium text-xs mb-1">Invite links expire in 24 hours</p>
                <p className="text-yellow-200/80 text-xs">
                  If a VA didn&apos;t use the link in time, go back to Manage Users and re-invite them with their email.
                  A new link will be generated.
                </p>
              </div>
            </div>
          </div>

          {/* Tracking Progress */}
          <div id="tracking-progress" className="scroll-mt-8">
            <h3 className="text-xl font-bold mb-1">Tracking Onboarding Progress</h3>
            <p className="text-xs text-gray-500 mb-4">Reading the progress table</p>
            <div className="space-y-4 text-sm text-gray-300 leading-relaxed">
              <p>
                Your admin dashboard shows a row per VA with their completion counts across all three phases.
              </p>
              <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
                <div className="grid grid-cols-1 divide-y divide-gray-800 text-xs">
                  <div className="grid grid-cols-4 px-4 py-2 text-gray-500 font-medium">
                    <span>Column</span><span>Max</span><span>Green when</span><span>Means</span>
                  </div>
                  {[
                    ['Phase 1', '18', '18/18', 'All system access tasks done'],
                    ['Phase 2', '17', '17/17', 'All foundation lessons complete'],
                    ['SOPs', 'dynamic', 'all done', 'All company SOPs reviewed'],
                  ].map(([col, max, green, means]) => (
                    <div key={col} className="grid grid-cols-4 px-4 py-2.5 text-gray-300">
                      <span>{col}</span><span>{max}</span><span className="text-green-400">{green}</span><span className="text-gray-400">{means}</span>
                    </div>
                  ))}
                </div>
              </div>
              <p>
                A VA whose numbers haven&apos;t moved in a few days may need a nudge or is waiting on access from your end.
                Reach out before it becomes a pattern.
              </p>
            </div>
          </div>

          {/* Managing SOPs */}
          <div id="managing-sops" className="scroll-mt-8">
            <h3 className="text-xl font-bold mb-1">Managing SOPs</h3>
            <p className="text-xs text-gray-500 mb-4">Add, edit, and remove your company&apos;s SOPs</p>
            <div className="space-y-4 text-sm text-gray-300 leading-relaxed">
              <p>
                SOPs are fully under your control. Go to <strong>SOPs</strong> from the main nav — as an admin
                you&apos;ll see Add, Edit, and Delete buttons that your VAs don&apos;t see.
              </p>
              <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
                <div className="grid grid-cols-1 divide-y divide-gray-800">
                  {[
                    ['Add SOP', 'Click "+ Add SOP", fill in the document name, link (Google Doc / Notion / etc.), priority, and estimated read time'],
                    ['Edit SOP', 'Click "Edit" on any row to update the name, link, priority, or time estimate'],
                    ['Delete SOP', 'Removes the SOP and clears all member completion records for it — use with care'],
                    ['Priority levels', 'CRITICAL = must-read, security/compliance level. HIGH = important process docs. Set these thoughtfully.'],
                  ].map(([title, desc]) => (
                    <div key={title} className="flex gap-3 px-4 py-3">
                      <div className="w-36 shrink-0 text-xs font-medium text-white">{title}</div>
                      <div className="text-xs text-gray-400">{desc}</div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="bg-blue-900/20 border border-blue-800/40 rounded-lg p-4">
                <p className="text-blue-300 font-medium text-xs mb-1">Start with your most critical policies</p>
                <p className="text-blue-200/80 text-xs">
                  Mark data privacy, communication policy, and accountability docs as CRITICAL.
                  Everything else can be HIGH. Keep your SOP list focused — 8 to 15 documents is the sweet spot.
                </p>
              </div>
            </div>
          </div>

          {/* EOW Tracking */}
          <div id="eow-tracking" className="scroll-mt-8">
            <h3 className="text-xl font-bold mb-1">EOW Report Tracking</h3>
            <p className="text-xs text-gray-500 mb-4">Who submitted this week, who hasn&apos;t</p>
            <div className="space-y-4 text-sm text-gray-300 leading-relaxed">
              <p>
                Your admin dashboard includes an EOW Report Status table below the onboarding progress table.
                It updates in real time — as soon as a VA submits their report, the status flips to Submitted.
              </p>
              <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 text-xs">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-green-400 font-medium">✓ Submitted</span>
                  <span className="text-gray-500">— VA has submitted their EOW report for this week</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-red-400 font-medium">✗ Not submitted</span>
                  <span className="text-gray-500">— No report received yet for this week</span>
                </div>
              </div>
              <p>
                The table resets every Monday — it tracks the current week only.
                If you need to reference past submissions, check the EOW reports section in Supabase or your records.
              </p>
            </div>
          </div>

          {/* Reset Progress */}
          <div id="reset-progress" className="scroll-mt-8">
            <h3 className="text-xl font-bold mb-1">Resetting a VA&apos;s Progress</h3>
            <p className="text-xs text-gray-500 mb-4">Full wipe — use intentionally</p>
            <div className="space-y-4 text-sm text-gray-300 leading-relaxed">
              <p>
                Sometimes a VA needs to restart onboarding — they may have rushed through it without actually reading,
                or their role changed significantly and the original onboarding is no longer relevant.
              </p>
              <p>
                Go to <strong>Admin → Manage Users</strong>, find the VA, and click <strong>Reset Progress</strong>.
                You&apos;ll be asked to confirm. This permanently clears:
              </p>
              <ul className="list-disc list-inside space-y-1 text-gray-300">
                <li>All Phase 1 task completions</li>
                <li>All Phase 2 lesson completions</li>
                <li>All SOP completion records</li>
                <li>All task sheet entries</li>
              </ul>
              <div className="bg-red-900/20 border border-red-800/40 rounded-lg p-4">
                <p className="text-red-300 font-medium text-xs mb-1">This cannot be undone</p>
                <p className="text-red-200/80 text-xs">
                  The VA will start from scratch. Their account stays active — only the progress data is cleared.
                  Let the VA know before you reset so they&apos;re not confused when they log in.
                </p>
              </div>
            </div>
          </div>

          {/* Offboarding */}
          <div id="offboarding" className="scroll-mt-8">
            <h3 className="text-xl font-bold mb-1">Offboarding a VA</h3>
            <p className="text-xs text-gray-500 mb-4">Removing access when someone leaves</p>
            <div className="space-y-4 text-sm text-gray-300 leading-relaxed">
              <p>
                When a VA leaves your team, you need to revoke their portal access so they can no longer log in.
              </p>
              <ol className="list-decimal list-inside space-y-2 text-gray-300">
                <li>Go to <strong>Admin → Offboard VA</strong> (red button in the admin nav)</li>
                <li>Find the VA by name or email</li>
                <li>Click <strong>Offboard</strong> and confirm</li>
                <li>Their role is set to <code className="bg-gray-800 px-1 py-0.5 rounded text-xs">offboarded</code> — they can no longer log in or access any data</li>
              </ol>
              <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 text-xs text-gray-400">
                Their historical data (task logs, EOW reports, progress) is retained in the system for your records.
                It is not deleted — only access is revoked.
              </div>
              <p className="text-gray-400 text-sm">
                Also remember to revoke their access in your other tools separately — Slack, ClickUp, Google Drive,
                LastPass, etc. The portal offboard only covers this platform.
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="border-t border-gray-800 pt-8 text-center">
            <p className="text-xs text-gray-600">
              Questions not covered here? Use the VA Assistant or reach out to your admin directly.
            </p>
          </div>

        </main>
      </div>
    </div>
  )
}
