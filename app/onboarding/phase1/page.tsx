'use client'

import { Suspense, useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import QuickNav from '@/components/nav/QuickNav'
import { computeTaskStates } from '@/lib/onboarding/taskGating'

const SECURITY_NOTICES = [
  'Use LastPass or 1Password for all passwords',
  'Enable 2FA on every tool that supports it',
  'Never share credentials via Slack, email, or any insecure channel',
  'Log out of shared devices when done',
  'Report any security concerns to the Founder immediately',
]

const FOUNDER_TASKS = [
  { id: 1,  name: 'Get Team Member Email',            description: 'Collect and verify company email for new member',                   login_type: 'Admin setup',                  doc_link: 'https://docs.google.com/document/d/1wG7u-4XwndawIFuB7MMyNkHMeP2l5LZKjk5lmGhzcew/edit?tab=t.n30b78xkijsr#heading=h.cvxucb1jfemh' },
  { id: 2,  name: 'Add to Slack Workspace',           description: 'Invite team member to the company Slack workspace',                  login_type: "Add Team Member's company email", doc_link: 'https://docs.google.com/document/d/1wG7u-4XwndawIFuB7MMyNkHMeP2l5LZKjk5lmGhzcew/edit?tab=t.6ctgkupa0yoq#heading=h.qjntr1phu5r3' },
  { id: 3,  name: 'VA Geekbot Access Set Up',         description: 'Configure Geekbot standup access for the member',                   login_type: 'Geekbot admin setup',          doc_link: 'https://docs.google.com/document/d/1wG7u-4XwndawIFuB7MMyNkHMeP2l5LZKjk5lmGhzcew/edit?tab=t.opbbwoo0we39' },
  { id: 4,  name: 'Add to All Slack Channels',        description: 'Add member to all relevant Slack channels',                         login_type: 'Slack admin',                  doc_link: 'https://docs.google.com/document/d/1wG7u-4XwndawIFuB7MMyNkHMeP2l5LZKjk5lmGhzcew/edit?tab=t.k2gcv1tduarl' },
  { id: 5,  name: 'Loom',                             description: 'Grant Loom workspace access',                                       login_type: "Add Team Member's company email", doc_link: 'https://docs.google.com/document/d/1wG7u-4XwndawIFuB7MMyNkHMeP2l5LZKjk5lmGhzcew/edit?tab=t.zgbynw4cta3z' },
  { id: 6,  name: 'Claude (Anthropic)',               description: 'Set up Claude AI access for the member',                            login_type: "Add Team Member's company email", doc_link: 'https://docs.google.com/document/d/1wG7u-4XwndawIFuB7MMyNkHMeP2l5LZKjk5lmGhzcew/edit?tab=t.3cquobmyk4ma#heading=h.sxsljhuzei6a' },
  { id: 7,  name: 'ChatGPT',                          description: 'Set up ChatGPT account access',                                     login_type: "Add Team Member's company email", doc_link: 'https://docs.google.com/document/d/1wG7u-4XwndawIFuB7MMyNkHMeP2l5LZKjk5lmGhzcew/edit?tab=t.ejq8uo9sgmen#heading=h.gsbww79izop7' },
  { id: 8,  name: 'Notebook LM Brain',                description: 'Share Notebook LM brain/project with member',                      login_type: 'Share via Google account',     doc_link: 'https://docs.google.com/document/d/18N5ftr0w9x3w5bZ4ToRAdsfhvhAdZ0vVy8MtWBuu5hU/edit?tab=t.ic5bl665fgit#heading=h.ea7yote2xzmv' },
  { id: 9,  name: 'Google Drive Access',              description: 'Grant access to company Google Drive folders',                      login_type: "Add Team Member's company email", doc_link: 'https://docs.google.com/document/d/1wG7u-4XwndawIFuB7MMyNkHMeP2l5LZKjk5lmGhzcew/edit?tab=t.1vdq29z1lmdu#heading=h.aahamopeb9lt' },
  { id: 10, name: 'Text Blaze / AI Blaze Access Setup', description: 'Set up Text Blaze snippet access',                               login_type: 'Team Member creates account',  doc_link: 'https://docs.google.com/document/d/1wG7u-4XwndawIFuB7MMyNkHMeP2l5LZKjk5lmGhzcew/edit?tab=t.crj2sf8xfk3n#heading=h.d2g3cypwbai7' },
  { id: 11, name: 'Fireflies.ai',                     description: 'Add team member to Fireflies workspace',                            login_type: "Add Team Member's company email", doc_link: 'https://docs.google.com/document/d/1wG7u-4XwndawIFuB7MMyNkHMeP2l5LZKjk5lmGhzcew/edit?tab=t.khh9rfhgnkze' },
  { id: 12, name: 'Create & Send Onboarding Sheet',   description: 'Create personalized onboarding tracker and share with member',     login_type: 'Google Sheets',               doc_link: 'https://docs.google.com/document/d/18N5ftr0w9x3w5bZ4ToRAdsfhvhAdZ0vVy8MtWBuu5hU/edit?tab=t.2i9j0x7oka28' },
  { id: 13, name: 'Send Phase 1 Completion Message',  description: 'Send confirmation message when Phase 1 setup is complete',         login_type: 'Slack message',               doc_link: 'https://docs.google.com/document/d/18N5ftr0w9x3w5bZ4ToRAdsfhvhAdZ0vVy8MtWBuu5hU/edit?tab=t.1irsfvkfem0f' },
  { id: 14, name: 'Miro Account Access',              description: 'Add team member to Miro workspace',                                login_type: "Add Team Member's company email", doc_link: null },
  { id: 15, name: 'Miro Template Library Access',     description: 'Share Miro template library with member',                          login_type: 'Miro workspace',              doc_link: 'https://miro.com/app/board/uXjVJj8jhss=/' },
  { id: 16, name: 'Outreach Platform Access',         description: 'Set up access to outreach platform',                               login_type: 'Platform-specific setup',     doc_link: null },
  { id: 17, name: 'Outreach Templates & Scripts',     description: 'Share outreach templates and scripts folder',                      login_type: 'Google Drive share',          doc_link: null },
  { id: 18, name: 'Target List / Lead Source',        description: 'Provide access to target lists and lead sources',                  login_type: 'Google Sheets / CRM access',  doc_link: null },
]

const MEMBER_TASKS = [
  { id: 19, name: 'Intro Video / Expectations',              description: 'Watch the welcome video to understand your next steps',                doc_link: 'https://docs.google.com/document/d/1VDFbrsRWthk3XkN3Vn8zCtX3ZR9MA6au7Ov4jXvnp5Q/edit?tab=t.0' },
  { id: 20, name: 'System Access — Category A & B',          description: 'Review tool categories, confirm access, and bookmark login pages',     doc_link: 'https://docs.google.com/document/d/1D9Sim0UE3P5FMkvqlGs9JyRkgv5TpM6Y8Xi5-pEdfeM/edit?tab=t.m4wmyannxwdd#heading=h.j1225gd0vh8m' },
  { id: 21, name: 'Slack Workspace',                         description: 'Accept Slack invite and set up your profile',                          doc_link: 'https://docs.google.com/document/d/18N5ftr0w9x3w5bZ4ToRAdsfhvhAdZ0vVy8MtWBuu5hU/edit?tab=t.2lbndwppj2og' },
  { id: 22, name: 'SuperWhisper',                            description: 'Sign up, download the app, and configure your hotkey',                 doc_link: 'https://docs.google.com/document/d/18N5ftr0w9x3w5bZ4ToRAdsfhvhAdZ0vVy8MtWBuu5hU/edit?tab=t.i7i4b5p7oleg' },
  { id: 23, name: 'Google Drive',                            description: 'Accept the Google Drive invite and confirm folder access',             doc_link: 'https://docs.google.com/document/d/1fSEr9f_WGQnKeiBesDOBe1jiSjQg1cfcM9rLq6-F_Uw/edit?tab=t.1jfs3ed6vpyv' },
  { id: 24, name: 'Send Final Phase 2 Completion Message',   description: 'Post your completion message in the ramp-up thread with time taken',  doc_link: 'https://docs.google.com/document/d/1wG7u-4XwndawIFuB7MMyNkHMeP2l5LZKjk5lmGhzcew/edit?tab=t.oml35f2gtczx#heading=h.k0lg2gbadewb' },
]

type Member = { id: string; first_name: string; last_name: string; email: string }

export default function Phase1Page() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-950 flex items-center justify-center text-gray-400">Loading...</div>}>
      <Phase1PageInner />
    </Suspense>
  )
}

function Phase1PageInner() {
  const searchParams = useSearchParams()
  const memberParam = searchParams.get('member')
  const [completions, setCompletions] = useState<Record<number, string>>({})
  const [memberCompletions, setMemberCompletions] = useState<Record<number, boolean>>({})
  const [userId, setUserId] = useState<string | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(memberParam)
  const [members, setMembers] = useState<Member[]>([])
  const [activeTab, setActiveTab] = useState<'founder' | 'member'>(memberParam ? 'founder' : 'member')
  const [loading, setLoading] = useState(true)

  const MEMBER_TASK_IDS = new Set(MEMBER_TASKS.map(t => t.id))

  // First mount: resolve the logged-in user, their role, and the member list.
  // We don't load completions here — that's the second effect, which keys off
  // the user being viewed (admin's selected member, or the logged-in user).
  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      const user = session?.user ?? null
      if (!user) return
      setUserId(user.id)

      const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
      const admin = profile?.role === 'admin' || profile?.role === 'super_admin'
      setIsAdmin(admin)

      if (admin) {
        const { data: allMembers } = await supabase
          .from('profiles')
          .select('id, first_name, last_name, email')
          .in('role', ['member', 'offboarding'])
          .order('first_name')
        setMembers(allMembers ?? [])
      }
    }
    load()
  }, [])

  // Load both founder + member completions for the user being VIEWED. Single
  // source of truth: if an admin has picked a member, that member's data;
  // otherwise the logged-in user's. Prevents the old race where the admin's
  // own data leaked into the member view.
  useEffect(() => {
    if (!userId) return
    const viewedUserId = isAdmin && selectedMemberId ? selectedMemberId : userId
    async function loadCompletions() {
      const supabase = createClient()
      const { data } = await supabase
        .from('phase1_completion')
        .select('task_id, status')
        .eq('user_id', viewedUserId)

      const founderMap: Record<number, string> = {}
      const memberMap: Record<number, boolean> = {}
      data?.forEach(row => {
        if (MEMBER_TASK_IDS.has(row.task_id)) {
          memberMap[row.task_id] = row.status === 'done'
        } else {
          founderMap[row.task_id] = row.status
        }
      })
      setCompletions(founderMap)
      setMemberCompletions(memberMap)
      setLoading(false)
    }
    loadCompletions()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, isAdmin, selectedMemberId])

  async function toggleMemberTask(taskId: number) {
    if (!userId) return
    const current = memberCompletions[taskId] ?? false
    const next = !current
    setMemberCompletions(prev => ({ ...prev, [taskId]: next }))
    const supabase = createClient()
    const { error } = await supabase.from('phase1_completion').upsert({
      user_id: userId,
      task_id: taskId,
      status: next ? 'done' : 'pending',
      completed_at: next ? new Date().toISOString() : null,
    }, { onConflict: 'user_id,task_id' })
    if (error) {
      setMemberCompletions(prev => ({ ...prev, [taskId]: current }))
    }
  }

  async function toggleFounderTask(taskId: number, currentStatus: string) {
    if (!isAdmin || !selectedMemberId) return
    const supabase = createClient()
    const newStatus = currentStatus === 'done' ? 'pending' : 'done'

    await supabase.from('phase1_completion').upsert({
      user_id: selectedMemberId,
      task_id: taskId,
      status: newStatus,
      completed_at: newStatus === 'done' ? new Date().toISOString() : null,
    }, { onConflict: 'user_id,task_id' })

    setCompletions(prev => ({ ...prev, [taskId]: newStatus }))
  }

  async function markNotNeeded(taskId: number) {
    if (!isAdmin || !selectedMemberId) return
    const supabase = createClient()
    const current = completions[taskId]
    const newStatus = current === 'not_needed' ? 'pending' : 'not_needed'

    await supabase.from('phase1_completion').upsert({
      user_id: selectedMemberId,
      task_id: taskId,
      status: newStatus,
      completed_at: null,
    }, { onConflict: 'user_id,task_id' })

    setCompletions(prev => ({ ...prev, [taskId]: newStatus }))
  }

  const founderDone = FOUNDER_TASKS.filter(t => completions[t.id] === 'done').length
  const memberDone = MEMBER_TASKS.filter(t => memberCompletions[t.id]).length

  // Sequential gating for the member checklist: each step unlocks the next.
  const memberTaskStates = computeTaskStates(MEMBER_TASKS.map(t => t.id), id => memberCompletions[id] ?? false)

  if (loading) {
    return <div className="min-h-screen bg-gray-950 flex items-center justify-center text-gray-400">Loading...</div>
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <QuickNav />

      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Admin member selector */}
        {isAdmin && (
          <div className="bg-blue-950/40 border border-blue-800/50 rounded-xl p-4 mb-6">
            <p className="text-xs text-blue-300 font-semibold mb-2 uppercase tracking-wide">Admin — Select Team Member</p>
            {members.length === 0 ? (
              <p className="text-sm text-gray-400">
                No members found. <Link href="/admin/users" className="text-blue-400 hover:text-blue-300 underline">Invite members first →</Link>
              </p>
            ) : (
              <div className="flex items-center gap-3">
                <select
                  value={selectedMemberId ?? ''}
                  onChange={e => setSelectedMemberId(e.target.value || null)}
                  className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">— Select a team member —</option>
                  {members.map(m => (
                    <option key={m.id} value={m.id}>
                      {m.first_name} {m.last_name} ({m.email})
                    </option>
                  ))}
                </select>
                {selectedMemberId && (
                  <span className="text-xs text-green-400 flex-shrink-0">Editing their progress</span>
                )}
              </div>
            )}
          </div>
        )}

        {/* Security Notice */}
        <div className="bg-yellow-900/30 border border-yellow-700/50 rounded-xl p-4 mb-6">
          <h3 className="font-semibold text-yellow-300 mb-2">🔒 Security Requirements</h3>
          <ul className="space-y-1">
            {SECURITY_NOTICES.map((n, i) => (
              <li key={i} className="text-sm text-yellow-200/80 flex gap-2">
                <span>•</span><span>{n}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab('member')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'member' ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'}`}
          >
            Your Checklist ({memberDone}/{MEMBER_TASKS.length})
          </button>
          <button
            onClick={() => setActiveTab('founder')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'founder' ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'}`}
          >
            Founder Setup ({founderDone}/{FOUNDER_TASKS.length})
          </button>
        </div>

        {activeTab === 'founder' && (
          <div className="space-y-2">
            <p className="text-sm text-gray-400 mb-4">
              {isAdmin ? 'Select a team member above, then mark items done or N/A.' : 'The Founder sets these up for you. You can see the status below.'}
            </p>
            {isAdmin && !selectedMemberId && (
              <div className="p-3 bg-yellow-900/30 border border-yellow-700/50 rounded-lg text-yellow-300 text-sm mb-4">
                Select a team member from the dropdown above to edit their progress.
              </div>
            )}
            {FOUNDER_TASKS.map(task => {
              const status = completions[task.id] ?? 'pending'
              const isDone = status === 'done'
              const isNA = status === 'not_needed'
              return (
                <div key={task.id} className={`flex items-start gap-3 p-4 rounded-xl border transition-colors ${isDone ? 'bg-green-900/20 border-green-800/50' : isNA ? 'bg-gray-800/50 border-gray-700/50' : 'bg-gray-900 border-gray-800'}`}>
                  <button
                    onClick={() => toggleFounderTask(task.id, status)}
                    disabled={!isAdmin || !selectedMemberId || isNA}
                    className={`mt-0.5 w-5 h-5 rounded flex-shrink-0 border-2 flex items-center justify-center transition-colors ${isDone ? 'bg-green-500 border-green-500' : 'border-gray-600'} ${isAdmin && selectedMemberId && !isNA ? 'cursor-pointer hover:border-green-400' : 'cursor-not-allowed opacity-40'}`}
                  >
                    {isDone && <span className="text-white text-xs">✓</span>}
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className={`font-medium text-sm ${isNA ? 'line-through text-gray-500' : ''}`}>{task.name}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{task.description}</p>
                    <div className="flex items-center gap-3 mt-1.5">
                      <p className="text-xs text-blue-400/70">Access type: {task.login_type}</p>
                      {task.doc_link && (
                        <a href={task.doc_link} target="_blank" rel="noopener noreferrer" className="text-xs text-purple-400 hover:text-purple-300">
                          View SOP →
                        </a>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {isAdmin && selectedMemberId && (
                      <button
                        onClick={() => markNotNeeded(task.id)}
                        className={`text-xs px-2 py-0.5 rounded border transition-colors ${isNA ? 'bg-gray-600 border-gray-500 text-gray-300' : 'border-gray-600 text-gray-500 hover:border-gray-400 hover:text-gray-300'}`}
                      >
                        {isNA ? 'undo N/A' : 'N/A'}
                      </button>
                    )}
                    {isNA && <span className="text-xs text-gray-500">Not needed</span>}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {activeTab === 'member' && (
          <div className="space-y-2">
            <p className="text-sm text-gray-400 mb-4">Complete these after the Founder has finished Phase 1 setup.</p>
            {MEMBER_TASKS.map(task => {
              const state = memberTaskStates[String(task.id)] ?? 'locked'
              const done = state === 'done'
              // Admins view the member checklist read-only — don't lock it for them.
              const locked = state === 'locked' && !isAdmin
              return (
                <div key={task.id} className={`p-4 rounded-xl border transition-colors ${done ? 'bg-green-900/20 border-green-800/50' : locked ? 'bg-gray-900/40 border-gray-800/50 opacity-60' : 'bg-gray-900 border-gray-700'}`}>
                  <div className="flex items-start gap-3">
                    <span className={`mt-0.5 w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center text-[11px] ${done ? 'bg-green-500 text-white' : locked ? 'bg-gray-800 text-gray-500' : 'border-2 border-gray-600'}`}>
                      {done ? '✓' : locked ? '🔒' : ''}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className={`font-medium text-sm ${locked ? 'text-gray-500' : ''}`}>{task.name}</p>
                      {locked ? (
                        <p className="text-xs text-gray-600 mt-0.5">Complete the previous step to unlock</p>
                      ) : (
                        <>
                          <p className="text-xs text-gray-400 mt-0.5">{task.description}</p>
                          {task.doc_link && (
                            <a
                              href={task.doc_link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-purple-400 hover:text-purple-300 mt-1.5 inline-block"
                            >
                              📄 Open document →
                            </a>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                  {!locked && (
                    <div className="mt-3 pt-3 border-t border-gray-800 flex items-center justify-between gap-3">
                      {done ? (
                        <>
                          <span className="text-xs text-green-500">✓ Completed</span>
                          {!isAdmin && (
                            <button onClick={() => toggleMemberTask(task.id)} className="text-xs text-gray-500 hover:text-gray-300 transition-colors">Reopen</button>
                          )}
                        </>
                      ) : (
                        <button
                          onClick={() => toggleMemberTask(task.id)}
                          disabled={isAdmin}
                          className="ml-auto text-sm font-medium bg-green-600 hover:bg-green-500 disabled:opacity-40 disabled:cursor-not-allowed text-white px-4 py-1.5 rounded-lg transition-colors"
                        >
                          Mark as complete
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
