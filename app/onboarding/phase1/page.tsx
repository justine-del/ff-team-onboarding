'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

const SECURITY_NOTICES = [
  'Use LastPass or 1Password for all passwords',
  'Enable 2FA on every tool that supports it',
  'Never share credentials via Slack, email, or any insecure channel',
  'Log out of shared devices when done',
  'Report any security concerns to the Founder immediately',
]

const FOUNDER_TASKS = [
  { id: 1, name: 'Get Team Member Email', description: 'Collect and verify company email for new member', login_type: 'Admin setup' },
  { id: 2, name: 'Add to Slack Workspace', description: 'Invite team member to the company Slack workspace', login_type: "Add Team Member's company email" },
  { id: 3, name: 'VA Geekbot Access Set Up', description: 'Configure Geekbot standup access for the member', login_type: 'Geekbot admin setup' },
  { id: 4, name: 'Add to All Slack Channels', description: 'Add member to all relevant Slack channels', login_type: 'Slack admin' },
  { id: 5, name: 'Loom', description: 'Grant Loom workspace access', login_type: "Add Team Member's company email" },
  { id: 6, name: 'Claude (Anthropic)', description: 'Set up Claude AI access for the member', login_type: "Add Team Member's company email" },
  { id: 7, name: 'ChatGPT', description: 'Set up ChatGPT account access', login_type: "Add Team Member's company email" },
  { id: 8, name: 'Notebook LM Brain', description: 'Share Notebook LM brain/project with member', login_type: 'Share via Google account' },
  { id: 9, name: 'Google Drive Access', description: 'Grant access to company Google Drive folders', login_type: "Add Team Member's company email" },
  { id: 10, name: 'Text Blaze / AI Blaze Access Setup', description: 'Set up Text Blaze snippet access', login_type: 'Team Member creates account' },
  { id: 11, name: 'Fireflies.ai', description: 'Add team member to Fireflies workspace', login_type: "Add Team Member's company email" },
  { id: 12, name: 'Create & Send Onboarding Sheet', description: 'Create personalized onboarding tracker and share with member', login_type: 'Google Sheets' },
  { id: 13, name: 'Send Phase 1 Completion Message', description: 'Send confirmation message when Phase 1 setup is complete', login_type: 'Slack message' },
  { id: 14, name: 'Miro Account Access', description: 'Add team member to Miro workspace', login_type: "Add Team Member's company email" },
  { id: 15, name: 'Miro Template Library Access', description: 'Share Miro template library with member', login_type: 'Miro workspace' },
  { id: 16, name: 'Outreach Platform Access', description: 'Set up access to outreach platform', login_type: 'Platform-specific setup' },
  { id: 17, name: 'Outreach Templates & Scripts', description: 'Share outreach templates and scripts folder', login_type: 'Google Drive share' },
  { id: 18, name: 'Target List / Lead Source', description: 'Provide access to target lists and lead sources', login_type: 'Google Sheets / CRM access' },
]

const MEMBER_TASKS = [
  { id: 101, name: 'Watch intro video in Phase 2 section', description: 'Watch the START HERE orientation video before continuing' },
  { id: 102, name: 'Check access to each tool listed above', description: 'Verify you can log in to all tools the Founder set up' },
  { id: 103, name: 'Check company email for invitations', description: 'Check your company email inbox for any pending invitations' },
  { id: 104, name: 'Accept all invitations and set up accounts', description: 'Accept every invitation and complete account setup with secure passwords' },
]

export default function Phase1Page() {
  const [completions, setCompletions] = useState<Record<number, string>>({})
  const [memberCompletions, setMemberCompletions] = useState<Record<number, boolean>>({})
  const [isAdmin, setIsAdmin] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'founder' | 'member'>('founder')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setUserId(user.id)

      const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
      setIsAdmin(profile?.role === 'admin')

      const { data: phase1Data } = await supabase
        .from('phase1_completion')
        .select('task_id, status')
        .eq('user_id', user.id)

      const map: Record<number, string> = {}
      phase1Data?.forEach(row => { map[row.task_id] = row.status })
      setCompletions(map)

      setLoading(false)
    }
    load()
  }, [])

  async function toggleFounderTask(taskId: number, currentStatus: string) {
    if (!isAdmin || !userId) return
    const supabase = createClient()
    const newStatus = currentStatus === 'done' ? 'pending' : 'done'

    await supabase.from('phase1_completion').upsert({
      user_id: userId,
      task_id: taskId,
      status: newStatus,
      completed_at: newStatus === 'done' ? new Date().toISOString() : null,
    }, { onConflict: 'user_id,task_id' })

    setCompletions(prev => ({ ...prev, [taskId]: newStatus }))
  }

  const founderDone = FOUNDER_TASKS.filter(t => completions[t.id] === 'done').length
  const memberDone = MEMBER_TASKS.filter(t => memberCompletions[t.id]).length

  if (loading) {
    return <div className="min-h-screen bg-gray-950 flex items-center justify-center text-gray-400">Loading...</div>
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <nav className="border-b border-gray-800 px-6 py-4 flex items-center gap-4">
        <Link href="/dashboard" className="text-gray-400 hover:text-white text-sm">← Dashboard</Link>
        <h1 className="text-lg font-bold">Phase 1: System Access Setup</h1>
      </nav>

      <main className="max-w-4xl mx-auto px-4 py-8">
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
            onClick={() => setActiveTab('founder')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'founder' ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'}`}
          >
            Founder Setup ({founderDone}/{FOUNDER_TASKS.length})
          </button>
          <button
            onClick={() => setActiveTab('member')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'member' ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'}`}
          >
            Your Checklist ({memberDone}/{MEMBER_TASKS.length})
          </button>
        </div>

        {activeTab === 'founder' && (
          <div className="space-y-2">
            <p className="text-sm text-gray-400 mb-4">
              {isAdmin ? 'As admin, you can mark these items done for each team member.' : 'The Founder sets these up for you. You can see the status below.'}
            </p>
            {FOUNDER_TASKS.map(task => {
              const status = completions[task.id] ?? 'pending'
              const isDone = status === 'done'
              return (
                <div key={task.id} className={`flex items-start gap-3 p-4 rounded-xl border transition-colors ${isDone ? 'bg-green-900/20 border-green-800/50' : 'bg-gray-900 border-gray-800'}`}>
                  <button
                    onClick={() => toggleFounderTask(task.id, status)}
                    disabled={!isAdmin}
                    className={`mt-0.5 w-5 h-5 rounded flex-shrink-0 border-2 flex items-center justify-center transition-colors ${isDone ? 'bg-green-500 border-green-500' : 'border-gray-600'} ${isAdmin ? 'cursor-pointer hover:border-green-400' : 'cursor-not-allowed'}`}
                  >
                    {isDone && <span className="text-white text-xs">✓</span>}
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{task.name}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{task.description}</p>
                    <p className="text-xs text-blue-400/70 mt-0.5">Access type: {task.login_type}</p>
                  </div>
                  <span className="text-xs text-gray-500 flex-shrink-0">Founder</span>
                </div>
              )
            })}
          </div>
        )}

        {activeTab === 'member' && (
          <div className="space-y-2">
            <p className="text-sm text-gray-400 mb-4">Complete these after the Founder has finished Phase 1 setup.</p>
            {MEMBER_TASKS.map(task => {
              const isDone = memberCompletions[task.id] ?? false
              return (
                <div key={task.id} className={`flex items-start gap-3 p-4 rounded-xl border transition-colors ${isDone ? 'bg-green-900/20 border-green-800/50' : 'bg-gray-900 border-gray-800'}`}>
                  <button
                    onClick={() => setMemberCompletions(prev => ({ ...prev, [task.id]: !isDone }))}
                    className={`mt-0.5 w-5 h-5 rounded flex-shrink-0 border-2 flex items-center justify-center transition-colors cursor-pointer ${isDone ? 'bg-green-500 border-green-500' : 'border-gray-600 hover:border-green-400'}`}
                  >
                    {isDone && <span className="text-white text-xs">✓</span>}
                  </button>
                  <div>
                    <p className="font-medium text-sm">{task.name}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{task.description}</p>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
