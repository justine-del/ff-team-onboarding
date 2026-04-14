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
    { id: 'your-dashboard', label: '  Your Dashboard' },
    { id: 'phase1', label: '  Phase 1: System Access' },
    { id: 'phase2', label: '  Phase 2: Foundations' },
    { id: 'sops', label: '  Phase 2.1: SOPs' },
    { id: 'task-sheet', label: '  Task Sheet' },
    { id: 'eow-tasks', label: '  EOW Tasks (Fridays)' },
    { id: 'va-assistant', label: '  VA Assistant' },
    { id: 'wellness', label: '  Wellness Check' },
    { id: 'for-admins', label: 'For Admins' },
    { id: 'admin-dashboard', label: '  Admin Dashboard' },
    { id: 'inviting-vas', label: '  Inviting VAs' },
    { id: 'phase1-admin', label: '  Phase 1 Setup (Admin)' },
    { id: 'tracking-progress', label: '  Tracking Progress' },
    { id: 'performance-page', label: '  Performance Page' },
    { id: 'managing-sops', label: '  Managing SOPs' },
    { id: 'eow-tracking', label: '  EOW Tracking' },
    { id: 'reset-progress', label: '  Resetting Progress' },
    { id: 'offboarding', label: '  Offboarding' },
  ]

  const h3 = 'text-xl font-bold mb-1'
  const sub = 'text-xs text-gray-500 mb-4'
  const prose = 'space-y-4 text-sm text-gray-300 leading-relaxed'
  const tip = 'bg-blue-900/20 border border-blue-800/40 rounded-lg p-4'
  const warn = 'bg-yellow-900/20 border border-yellow-800/40 rounded-lg p-4'
  const danger = 'bg-red-900/20 border border-red-800/40 rounded-lg p-4'
  const card = 'bg-gray-900 border border-gray-800 rounded-xl overflow-hidden'
  const row = 'flex gap-3 px-4 py-3'
  const divider = 'h-px flex-1 bg-gray-800'

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
        <aside className="hidden lg:block w-56 shrink-0">
          <div className="sticky top-8">
            <p className="text-xs uppercase tracking-widest text-gray-500 font-semibold mb-3">Contents</p>
            <nav className="space-y-0.5">
              {sections.map(s => (
                <a
                  key={s.id}
                  href={`#${s.id}`}
                  className={`block text-sm py-1 transition-colors hover:text-white ${
                    s.label.startsWith('  ')
                      ? 'pl-3 text-gray-500 hover:text-gray-300'
                      : 'text-gray-300 font-medium'
                  }`}
                >
                  {s.label.trim()}
                </a>
              ))}
            </nav>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 max-w-3xl space-y-16 pb-24">

          {/* ── OVERVIEW ── */}
          <div id="overview" className="scroll-mt-8">
            <div className="inline-block bg-blue-600/20 border border-blue-600/30 text-blue-300 text-xs font-semibold px-3 py-1 rounded-full mb-4">
              Complete Platform Guide
            </div>
            <h2 className="text-3xl font-bold mb-4">Cyborg VA Portal — How It Works</h2>
            <p className="text-gray-400 leading-relaxed mb-6">
              This portal is the central hub for VA onboarding, weekly task logging, and end-of-week reporting.
              New VAs work through structured onboarding phases; active VAs use it every day to log work and stay accountable.
              Admins use it to monitor progress, manage content, and track team activity.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
              {[
                ['Onboarding', 'Phase 1 → Phase 2 → SOPs. Each phase unlocks the next.'],
                ['Daily work', 'Task sheet: log what you did and how long it took, every day.'],
                ['End of week', '3 EOW tasks every Friday, including a report submission.'],
              ].map(([title, desc]) => (
                <div key={title} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                  <p className="font-semibold mb-1">{title}</p>
                  <p className="text-xs text-gray-400">{desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* ── FOR VAs section divider ── */}
          <div id="for-vas" className="scroll-mt-8">
            <div className="flex items-center gap-3">
              <div className={divider} />
              <span className="text-xs uppercase tracking-widest text-gray-500 font-semibold whitespace-nowrap">For VAs</span>
              <div className={divider} />
            </div>
          </div>

          {/* Getting Started */}
          <div id="getting-started" className="scroll-mt-8">
            <h3 className={h3}>Getting Started</h3>
            <p className={sub}>Day 1 — first time logging in</p>
            <div className={prose}>
              <p>
                Your admin sent you a one-time invite link tied to your email address. Click it, set a password,
                and you&apos;ll be walked through creating your profile (name, job role, start date).
                Once that&apos;s done, you land on your dashboard and onboarding begins.
              </p>
              <div className={warn}>
                <p className="text-yellow-300 font-medium text-xs mb-1">Invite links expire after 24 hours</p>
                <p className="text-yellow-200/80 text-xs">If yours expired, contact your admin and ask them to re-invite you from the Manage Users page. They&apos;ll generate a fresh link.</p>
              </div>
              <p>
                To log in again after setup: go to the portal URL your admin shared, enter your email and password.
                If you forget your password, use the &quot;Forgot password&quot; link on the login page — a reset email will arrive in minutes.
              </p>
            </div>
          </div>

          {/* Dashboard */}
          <div id="your-dashboard" className="scroll-mt-8">
            <h3 className={h3}>Your Dashboard</h3>
            <p className={sub}>Everything in one place</p>
            <div className={prose}>
              <p>
                The dashboard is your home base. At the top is your overall onboarding progress bar.
                Below that are cards linking to each section of the portal.
              </p>
              <div className={card}>
                <div className="grid divide-y divide-gray-800">
                  {[
                    ['Phase 1: System Access', 'Tool setup tasks. Complete these first.'],
                    ['Phase 2: Foundations', 'Training content. Unlocks after Phase 1.'],
                    ['Phase 2.1: SOPs', 'Company policies to read. Unlocks after Phase 2.'],
                    ['My Task Sheet', 'Log your daily work. Use this every day.'],
                    ['VA Assistant', 'AI trained on your company SOPs. Ask it anything.'],
                    ['Wellness Check', 'Quick weekly check-in on how you\'re feeling.'],
                  ].map(([title, desc]) => (
                    <div key={title} className={row}>
                      <div className="w-44 shrink-0 text-xs font-medium text-white">{title}</div>
                      <div className="text-xs text-gray-400">{desc}</div>
                    </div>
                  ))}
                </div>
              </div>
              <div className={tip}>
                <p className="text-blue-300 font-medium text-xs mb-1">If you see a video on your dashboard</p>
                <p className="text-blue-200/80 text-xs">First-time visitors see a welcome video and intro walkthrough. Watch it before jumping in — it covers what to expect and how to succeed.</p>
              </div>
            </div>
          </div>

          {/* Phase 1 */}
          <div id="phase1" className="scroll-mt-8">
            <h3 className={h3}>Phase 1: System Access</h3>
            <p className={sub}>Tool setup — the first thing you do on day one</p>
            <div className={prose}>
              <p>
                Phase 1 gets you set up in every tool your team uses. It has two parts that happen in parallel:
                your admin does their setup tasks on their end, and you complete your confirmation tasks on yours.
              </p>
              <div className={card}>
                <div className="grid divide-y divide-gray-800">
                  <div className="px-4 py-3 bg-gray-900/60 text-xs text-gray-500 font-medium">Two sides to Phase 1</div>
                  <div className={row}>
                    <div className="w-36 shrink-0 text-xs font-medium text-white">Admin tasks</div>
                    <div className="text-xs text-gray-400">Your admin grants you access to Slack, Google Drive, ClickUp, Loom, Claude, Miro, Fireflies, and other tools. They work through their 18-item checklist while you work through yours.</div>
                  </div>
                  <div className={row}>
                    <div className="w-36 shrink-0 text-xs font-medium text-white">Your tasks</div>
                    <div className="text-xs text-gray-400">Accept invites, confirm access, and bookmark key tools. Each task has a doc link with step-by-step instructions.</div>
                  </div>
                </div>
              </div>
              <p>
                Each task row has a <strong>Doc link</strong> (instructions), a <strong>Loom link</strong> (video walkthrough), and a completion checkbox.
                Check a task off once you&apos;ve actually completed it — not just read about it.
              </p>
              <div className={warn}>
                <p className="text-yellow-300 font-medium text-xs mb-1">Blocked on access?</p>
                <p className="text-yellow-200/80 text-xs">
                  Some tasks depend on your admin completing their side first (e.g. adding you to Slack before you can accept the invite).
                  If you hit a wall, message your admin — they&apos;ll know what to do.
                </p>
              </div>
              <p>Phase 2 unlocks automatically once Phase 1 is fully complete.</p>
            </div>
          </div>

          {/* Phase 2 */}
          <div id="phase2" className="scroll-mt-8">
            <h3 className={h3}>Phase 2: Foundations</h3>
            <p className={sub}>17 lessons — how this team works</p>
            <div className={prose}>
              <p>
                Phase 2 is your core training. It covers communication standards, accountability expectations,
                time management, reporting norms, and what good work looks like.
                Each lesson is a short Loom video, a doc to read, or both.
              </p>
              <p>
                Work through them in order. Each one has a checkbox — mark it done after watching or reading the full thing.
                Progress saves automatically.
              </p>
              <div className={tip}>
                <p className="text-blue-300 font-medium text-xs mb-1">Don&apos;t rush this phase</p>
                <p className="text-blue-200/80 text-xs">
                  Phase 2 content is the foundation of how you operate on this team.
                  When you&apos;re unclear about expectations later, the answers are usually here.
                  Take notes.
                </p>
              </div>
              <p>SOPs (Phase 2.1) unlock after Phase 2 is complete.</p>
            </div>
          </div>

          {/* SOPs */}
          <div id="sops" className="scroll-mt-8">
            <h3 className={h3}>Phase 2.1: SOPs</h3>
            <p className={sub}>Your company&apos;s policies — read every one</p>
            <div className={prose}>
              <p>
                SOPs (Standard Operating Procedures) are your company&apos;s specific rules, processes, and expectations.
                Unlike Phases 1 and 2 which are the same across all teams, SOPs are set by your admin and are unique to your company.
              </p>
              <p>
                Each SOP has a link to a Google Doc, Notion page, or other document. Open it, read it fully,
                then check it off. The completion timestamp is recorded — your admin can see when you reviewed each one.
              </p>
              <div className={card}>
                <div className="grid divide-y divide-gray-800 text-xs">
                  <div className={`${row} text-gray-500 font-medium`}>Priority levels</div>
                  <div className={row}>
                    <span className="w-24 shrink-0 text-red-300 font-bold">CRITICAL</span>
                    <span className="text-gray-400">Non-negotiable. Data security, accountability, communication policy. Read these first and re-read them when in doubt.</span>
                  </div>
                  <div className={row}>
                    <span className="w-24 shrink-0 text-yellow-300 font-bold">HIGH</span>
                    <span className="text-gray-400">Important process docs. Invoicing, time off, tool-specific workflows. Read these carefully too.</span>
                  </div>
                </div>
              </div>
              <div className={warn}>
                <p className="text-yellow-300 font-medium text-xs mb-1">SOPs are living documents</p>
                <p className="text-yellow-200/80 text-xs">Your admin may update or add new SOPs over time. When they do, you&apos;ll see new unchecked items appear. Revisit the page periodically.</p>
              </div>
            </div>
          </div>

          {/* Task Sheet */}
          <div id="task-sheet" className="scroll-mt-8">
            <h3 className={h3}>Task Sheet</h3>
            <p className={sub}>Your daily work log — fill this in every single day</p>
            <div className={prose}>
              <p>
                The task sheet is where you log your work. It shows the current week (Mon–Sun) with a column for each day.
                Every week starts fresh, but the same set of tasks appears every week.
              </p>
              <p className="font-medium text-white text-xs uppercase tracking-wide">Your weekly tasks</p>
              <div className={card}>
                <div className="grid divide-y divide-gray-800 text-xs">
                  <div className="grid grid-cols-12 px-4 py-2 text-gray-500 font-medium">
                    <span className="col-span-5">Task</span>
                    <span className="col-span-4">Days</span>
                    <span className="col-span-3">Due</span>
                  </div>
                  {[
                    ['Understanding Your Core Sheet', 'Mon – Fri', '8 PM EST', 'Review and update your core tracking sheet'],
                    ['Daily and Weekly SOP Creation', 'Mon – Fri', '8 PM EST', 'Document your daily and weekly procedures'],
                    ['EOW SOP Solidification', 'Friday only', '5 PM EST', 'Review and lock in SOPs created during the week'],
                    ['EOW VA Clear Out & Restart', 'Friday only', '5 PM EST', 'Clear your workspace, prep for next week'],
                    ['EOW FF Support Form', 'Friday only', '5 PM EST', 'Submit your end-of-week report via Typeform'],
                  ].map(([name, days, due]) => (
                    <div key={name} className="grid grid-cols-12 px-4 py-2.5">
                      <span className="col-span-5 text-white font-medium">{name}</span>
                      <span className="col-span-4 text-gray-400">{days}</span>
                      <span className="col-span-3 text-gray-500">{due}</span>
                    </div>
                  ))}
                </div>
              </div>
              <p className="font-medium text-white text-xs uppercase tracking-wide mt-2">What you do per task, per day</p>
              <div className={card}>
                <div className="grid divide-y divide-gray-800">
                  {[
                    ['Check it off', 'Tap the checkbox when you\'ve completed the task for that day'],
                    ['Log time', 'Use the time dropdown to record how long the task took (5m, 15m, 30m, 1h, etc.)'],
                    ['Add a note', 'Expand the note field to add context — what you worked on, what was difficult, any blockers'],
                    ['Watch the Loom', 'Each task has a Loom video with instructions. Watch it if you\'re unsure what the task involves.'],
                    ['Open the doc', 'Each task links to a Google Doc with the full SOP or reference material'],
                  ].map(([title, desc]) => (
                    <div key={title} className={row}>
                      <div className="w-28 shrink-0 text-xs font-medium text-white">{title}</div>
                      <div className="text-xs text-gray-400">{desc}</div>
                    </div>
                  ))}
                </div>
              </div>
              <p>
                To view a previous week, use the week navigator arrows at the top of the task sheet.
                Past weeks are read-only — you can review them but not edit.
              </p>
              <div className={danger}>
                <p className="text-red-300 font-medium text-xs mb-1">Fill this in daily, not on Friday</p>
                <p className="text-red-200/80 text-xs">
                  Batch-filling your task sheet on Friday is visible in the timestamps.
                  Log your work at the end of each day while it&apos;s fresh.
                  A consistent daily log is part of the accountability standard.
                </p>
              </div>
            </div>
          </div>

          {/* EOW Tasks */}
          <div id="eow-tasks" className="scroll-mt-8">
            <h3 className={h3}>EOW Tasks (Fridays)</h3>
            <p className={sub}>Three tasks every Friday — these are your end-of-week report</p>
            <div className={prose}>
              <p>
                The last three tasks on your sheet are EOW tasks that only appear on Fridays.
                Together, they make up your end-of-week routine. Complete all three by 5 PM EST.
              </p>
              <div className={card}>
                <div className="grid divide-y divide-gray-800">
                  <div className={`${row} items-start`}>
                    <div className="w-8 shrink-0 text-xs font-bold text-gray-500 pt-0.5">1</div>
                    <div>
                      <p className="text-xs font-medium text-white">EOW SOP Solidification</p>
                      <p className="text-xs text-gray-400 mt-0.5">Review every SOP you created or updated this week. Make sure they&apos;re complete, clear, and filed correctly. Estimated 1 hour.</p>
                    </div>
                  </div>
                  <div className={`${row} items-start`}>
                    <div className="w-8 shrink-0 text-xs font-bold text-gray-500 pt-0.5">2</div>
                    <div>
                      <p className="text-xs font-medium text-white">EOW VA Clear Out & Restart</p>
                      <p className="text-xs text-gray-400 mt-0.5">Close out open tabs, clean your desktop, clear your task queue, and set up for next Monday. Takes about 10 minutes.</p>
                    </div>
                  </div>
                  <div className={`${row} items-start`}>
                    <div className="w-8 shrink-0 text-xs font-bold text-gray-500 pt-0.5">3</div>
                    <div>
                      <p className="text-xs font-medium text-white">EOW FF Support Form Submission</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        Click the &quot;Submit Form&quot; button in the task row — it opens a Typeform with your weekly EOW questions.
                        Fill it out honestly. This is what your admin reviews each week.
                        Takes about 10 minutes.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              <p>
                Once task 3 is submitted, your name will show <strong className="text-green-400">✓ Submitted</strong> in your admin&apos;s EOW tracking table.
                If it still shows &quot;Not submitted&quot; by end of day Friday, your admin will notice.
              </p>
              <div className={warn}>
                <p className="text-yellow-300 font-medium text-xs mb-1">Can&apos;t submit on Friday?</p>
                <p className="text-yellow-200/80 text-xs">
                  If you&apos;re sick, on PTO, or have an emergency — message your admin directly before Friday EOD.
                  Do not silently skip. A missing EOW without notice signals disengagement.
                </p>
              </div>
            </div>
          </div>

          {/* VA Assistant */}
          <div id="va-assistant" className="scroll-mt-8">
            <h3 className={h3}>VA Assistant</h3>
            <p className={sub}>AI trained on your company SOPs — always available</p>
            <div className={prose}>
              <p>
                Tap the chat icon in the bottom-right corner of any page. The VA Assistant is an AI
                trained on your company&apos;s SOPs and onboarding content. Ask it anything about policies, processes, or expectations.
              </p>
              <div className={card}>
                <div className="px-4 py-3 text-xs text-gray-500 font-medium bg-gray-900/60">Good questions to ask</div>
                {[
                  '"What\'s the process for requesting time off?"',
                  '"How should I communicate a delay to a client?"',
                  '"Where do I log my hours?"',
                  '"What counts as a billable task?"',
                  '"What does the accountability SOP say?"',
                ].map(q => (
                  <div key={q} className={`${row} border-t border-gray-800`}>
                    <span className="text-xs text-gray-400 italic">{q}</span>
                  </div>
                ))}
              </div>
              <p className="text-gray-500 text-xs">
                The assistant does not see your personal task data, EOW reports, or any private information.
                It only draws from company documents and onboarding content.
              </p>
            </div>
          </div>

          {/* Wellness */}
          <div id="wellness" className="scroll-mt-8">
            <h3 className={h3}>Wellness Check</h3>
            <p className={sub}>A quick weekly pulse — how are you actually doing?</p>
            <div className={prose}>
              <p>
                The Wellness Check is a short, optional check-in available from your dashboard.
                It takes under a minute and gives your admin visibility into how the team is feeling —
                not just what they&apos;re producing.
              </p>
              <p>
                There are no wrong answers. Be honest. If you&apos;re burning out, under-utilized, or dealing with
                something outside work that&apos;s affecting your output — this is a low-stakes place to flag it.
              </p>
            </div>
          </div>

          {/* ── FOR ADMINS section divider ── */}
          <div id="for-admins" className="scroll-mt-8">
            <div className="flex items-center gap-3">
              <div className={divider} />
              <span className="text-xs uppercase tracking-widest text-gray-500 font-semibold whitespace-nowrap">For Admins</span>
              <div className={divider} />
            </div>
          </div>

          {/* Admin Dashboard */}
          <div id="admin-dashboard" className="scroll-mt-8">
            <h3 className={h3}>Admin Dashboard</h3>
            <p className={sub}>Where you land when you log in</p>
            <div className={prose}>
              <p>
                When you log in as an admin, you go straight to the team dashboard — not the VA onboarding flow.
                It shows two things: the onboarding progress table and the EOW report status table.
              </p>
              <p>The top nav has four action buttons:</p>
              <div className={card}>
                <div className="grid divide-y divide-gray-800">
                  {[
                    ['Edit Links', 'Update the URLs for Phase 1 and Phase 2 tasks — point them to your own Loom videos and docs'],
                    ['Offboard VA', 'Revoke a VA\'s access when they leave the team'],
                    ['Manage Users', 'Invite new VAs, view all members, reset progress, remove accounts'],
                    ['Guide', 'This page — you can share the URL with new VAs or admins'],
                  ].map(([title, desc]) => (
                    <div key={title} className={row}>
                      <div className="w-28 shrink-0 text-xs font-medium text-white">{title}</div>
                      <div className="text-xs text-gray-400">{desc}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Inviting VAs */}
          <div id="inviting-vas" className="scroll-mt-8">
            <h3 className={h3}>Inviting VAs</h3>
            <p className={sub}>Access is invite-only — no one can self-register</p>
            <div className={prose}>
              <ol className="list-decimal list-inside space-y-3 text-gray-300">
                <li>Go to <strong>Admin → Manage Users</strong></li>
                <li>Click <strong>Invite New Member</strong> and enter their email</li>
                <li>Copy the invite link that appears and send it to your VA via Slack, email, or wherever</li>
                <li>They click the link, set a password, fill in their profile, and they&apos;re in</li>
                <li>They appear in your admin dashboard immediately after setup</li>
              </ol>
              <div className={warn}>
                <p className="text-yellow-300 font-medium text-xs mb-1">Links expire in 24 hours</p>
                <p className="text-yellow-200/80 text-xs">If a VA missed the window, go back to Manage Users and re-invite with their email. A new link will be generated.</p>
              </div>
            </div>
          </div>

          {/* Phase 1 Admin Side */}
          <div id="phase1-admin" className="scroll-mt-8">
            <h3 className={h3}>Phase 1 Setup (Admin)</h3>
            <p className={sub}>18 tool access tasks you need to complete for each new VA</p>
            <div className={prose}>
              <p>
                When a new VA joins, go to <strong>Phase 1</strong> from the main nav and switch to the <strong>Founder Tasks</strong> tab.
                This is your checklist of tools to grant access to. It runs in parallel with the VA completing their side.
              </p>
              <div className={card}>
                <div className="grid divide-y divide-gray-800 text-xs">
                  <div className="px-4 py-3 text-gray-500 font-medium">What you&apos;re setting up</div>
                  {[
                    'Company email + Slack workspace invite',
                    'Geekbot standup access',
                    'All Slack channels',
                    'Loom, Claude, ChatGPT, Notebook LM Brain',
                    'Google Drive folder access',
                    'Text Blaze, Fireflies.ai, Miro',
                    'Outreach platform + templates + target lists',
                    'Onboarding sheet creation + Phase 1 completion message',
                  ].map(item => (
                    <div key={item} className={`${row} border-t border-gray-800`}>
                      <span className="text-xs text-gray-400">→ {item}</span>
                    </div>
                  ))}
                </div>
              </div>
              <p>
                Each task has a doc link with instructions for that specific tool setup. Check it off after you&apos;ve done it.
                The VA&apos;s Phase 1 completion counter in your dashboard tracks their side — the green 18/18 means
                all founder tasks are done.
              </p>
            </div>
          </div>

          {/* Tracking Progress */}
          <div id="tracking-progress" className="scroll-mt-8">
            <h3 className={h3}>Tracking Onboarding Progress</h3>
            <p className={sub}>The progress table on your admin dashboard</p>
            <div className={prose}>
              <p>
                Each VA has a row showing their completion counts across all three onboarding phases.
                Numbers turn green when they hit the target.
              </p>
              <div className={card}>
                <div className="grid divide-y divide-gray-800 text-xs">
                  <div className="grid grid-cols-4 px-4 py-2 text-gray-500 font-medium">
                    <span>Column</span><span>Target</span><span>Turns green at</span><span>What it means</span>
                  </div>
                  {[
                    ['Phase 1', '18', '18/18', 'All tool access tasks done'],
                    ['Phase 2', '17', '17/17', 'All foundation lessons complete'],
                    ['SOPs', 'dynamic', 'all done', 'All your company SOPs reviewed'],
                  ].map(([col, target, green, means]) => (
                    <div key={col} className="grid grid-cols-4 px-4 py-2.5 text-gray-300">
                      <span>{col}</span><span>{target}</span><span className="text-green-400">{green}</span><span className="text-gray-400">{means}</span>
                    </div>
                  ))}
                </div>
              </div>
              <p>
                A VA stuck at the same count for more than 2–3 days usually means one of two things:
                they&apos;re waiting on access from your end, or they need a nudge.
                Either way — reach out before it becomes a pattern.
              </p>
            </div>
          </div>

          {/* Performance Page */}
          <div id="performance-page" className="scroll-mt-8">
            <h3 className={h3}>Performance Page</h3>
            <p className={sub}>Deep-dive team activity — Admin → Performance</p>
            <div className={prose}>
              <p>
                The Performance page (linked from the admin nav as &quot;📊 Performance&quot;) shows week-by-week activity data
                for every member. It&apos;s the right place to review effort trends, spot disengagement early, and prepare for 1:1s.
              </p>
              <div className={card}>
                <div className="grid divide-y divide-gray-800">
                  {[
                    ['Consistency', 'Percentage of weeks active over the last 4 weeks — higher is better'],
                    ['This week / Last week', 'Total hours logged in each period — shows whether activity is increasing or dropping'],
                    ['Delta', 'Hour difference week-over-week — positive means more active than last week'],
                    ['Last active', 'Most recent date the member logged any task activity'],
                    ['Status badge', 'Active (logged this week) / Inconsistent (logged last week but not this one) / Needs attention (no recent activity)'],
                  ].map(([title, desc]) => (
                    <div key={title} className={row}>
                      <div className="w-40 shrink-0 text-xs font-medium text-white">{title}</div>
                      <div className="text-xs text-gray-400">{desc}</div>
                    </div>
                  ))}
                </div>
              </div>
              <div className={tip}>
                <p className="text-blue-300 font-medium text-xs mb-1">Use this before 1:1s</p>
                <p className="text-blue-200/80 text-xs">Pull up the performance page before a check-in so you have data, not just impressions. A &quot;Needs attention&quot; badge is always worth a direct conversation.</p>
              </div>
            </div>
          </div>

          {/* Managing SOPs */}
          <div id="managing-sops" className="scroll-mt-8">
            <h3 className={h3}>Managing SOPs</h3>
            <p className={sub}>Add, edit, and remove your company&apos;s policies</p>
            <div className={prose}>
              <p>
                Go to <strong>SOPs</strong> from the main nav. As an admin you&apos;ll see Add, Edit, and Delete buttons
                that your VAs don&apos;t see.
              </p>
              <div className={card}>
                <div className="grid divide-y divide-gray-800">
                  {[
                    ['Add SOP', 'Click "+ Add SOP" → fill in document name, link (Google Doc / Notion / etc.), priority (CRITICAL or HIGH), and estimated read time in minutes'],
                    ['Edit SOP', 'Click "Edit" on any row to update any field. Changes are visible to VAs immediately.'],
                    ['Delete SOP', 'Permanently removes the SOP and clears all member completion records for it. Cannot be undone.'],
                  ].map(([title, desc]) => (
                    <div key={title} className={row}>
                      <div className="w-24 shrink-0 text-xs font-medium text-white">{title}</div>
                      <div className="text-xs text-gray-400">{desc}</div>
                    </div>
                  ))}
                </div>
              </div>
              <div className={tip}>
                <p className="text-blue-300 font-medium text-xs mb-1">Keep the list focused</p>
                <p className="text-blue-200/80 text-xs">
                  8–15 SOPs is the sweet spot. Too many and VAs rush through them.
                  Mark data privacy, communication policy, and accountability as CRITICAL.
                  Everything else is HIGH.
                </p>
              </div>
            </div>
          </div>

          {/* EOW Tracking */}
          <div id="eow-tracking" className="scroll-mt-8">
            <h3 className={h3}>EOW Report Tracking</h3>
            <p className={sub}>Who submitted this week, who hasn&apos;t</p>
            <div className={prose}>
              <p>
                Below the onboarding progress table on your admin dashboard is the EOW status table.
                It resets every Monday and shows the current week only.
              </p>
              <div className="flex gap-4 text-xs">
                <div className="flex items-center gap-2 bg-green-900/20 border border-green-800/40 rounded-lg px-3 py-2">
                  <span className="text-green-400 font-medium">✓ Submitted</span>
                  <span className="text-gray-400">— EOW form submitted this week</span>
                </div>
                <div className="flex items-center gap-2 bg-red-900/20 border border-red-800/40 rounded-lg px-3 py-2">
                  <span className="text-red-400 font-medium">✗ Not submitted</span>
                  <span className="text-gray-400">— No submission yet this week</span>
                </div>
              </div>
              <p>
                Status updates in real time — as soon as a VA submits the Typeform (EOW task 3),
                they flip to Submitted. Check this on Friday afternoon to see who still needs to send theirs.
              </p>
            </div>
          </div>

          {/* Reset Progress */}
          <div id="reset-progress" className="scroll-mt-8">
            <h3 className={h3}>Resetting a VA&apos;s Progress</h3>
            <p className={sub}>Full wipe — use intentionally</p>
            <div className={prose}>
              <p>
                Go to <strong>Admin → Manage Users</strong>, find the VA, and click <strong>Reset Progress</strong>.
                Confirm the prompt. This permanently deletes:
              </p>
              <ul className="list-disc list-inside space-y-1 text-gray-300 text-sm">
                <li>All Phase 1 task completions</li>
                <li>All Phase 2 lesson completions</li>
                <li>All SOP completion records</li>
                <li>All task sheet entries</li>
              </ul>
              <p>Their account stays active. Only the progress data is cleared.</p>
              <div className={danger}>
                <p className="text-red-300 font-medium text-xs mb-1">This cannot be undone</p>
                <p className="text-red-200/80 text-xs">
                  Tell the VA before you reset so they&apos;re not confused when they log in and see a blank slate.
                  Use this when a VA rushes through onboarding without actually reading, or when their role changes significantly.
                </p>
              </div>
            </div>
          </div>

          {/* Offboarding */}
          <div id="offboarding" className="scroll-mt-8">
            <h3 className={h3}>Offboarding a VA</h3>
            <p className={sub}>Revoking portal access when someone leaves</p>
            <div className={prose}>
              <ol className="list-decimal list-inside space-y-2 text-gray-300">
                <li>Go to <strong>Admin → Offboard VA</strong> (red button in the admin nav)</li>
                <li>Find the VA by name or email</li>
                <li>Click <strong>Offboard</strong> and confirm</li>
                <li>Their role is set to <code className="bg-gray-800 px-1 py-0.5 rounded text-xs">offboarded</code> — portal access is revoked immediately</li>
              </ol>
              <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 text-xs text-gray-400">
                Historical data (task logs, EOW reports, progress) is retained for your records. Only access is revoked, nothing is deleted.
              </div>
              <div className={warn}>
                <p className="text-yellow-300 font-medium text-xs mb-1">Offboarding the portal doesn&apos;t remove tool access</p>
                <p className="text-yellow-200/80 text-xs">
                  Also revoke the VA&apos;s access in Slack, ClickUp, Google Drive, Loom, Fireflies, Miro, and any other tools separately.
                  The portal offboard only covers this platform.
                </p>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="border-t border-gray-800 pt-8 text-center">
            <p className="text-xs text-gray-600">
              Questions not covered here? Use the VA Assistant (bottom-right chat icon) or reach out to your admin directly.
            </p>
          </div>

        </main>
      </div>
    </div>
  )
}
