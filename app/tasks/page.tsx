'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

const DEFAULT_TASKS = [
  { id: 1, sop_number: '1', name: 'Understanding Your Core Sheet', description: 'Review and understand the updates in your core tracking sheet', days: ['Mon','Tue','Wed','Thu','Fri'], time_window: '8 PM EST', est_time: '10 mins', is_eow: false },
  { id: 2, sop_number: '2', name: 'Daily and Weekly SOP Creation', description: 'Create and update your daily and weekly standard operating procedures', days: ['Mon','Tue','Wed','Thu','Fri'], time_window: '8 PM EST', est_time: '10 mins', is_eow: false },
  { id: 3, sop_number: 'EOW-1', name: 'EOW SOP Solidification', description: 'Review and solidify all SOPs created during the week', days: ['Fri'], time_window: '5 PM EST', est_time: '1 hr', is_eow: true },
  { id: 4, sop_number: 'EOW-2', name: 'EOW VA Clear Out and Restart', description: 'Clear your workspace and prepare for the new week', days: ['Fri'], time_window: '5 PM EST', est_time: '10 mins', is_eow: true },
  { id: 5, sop_number: 'EOW-3', name: 'EOW FF Support Form Submission', description: 'Submit the Funnel Futurist end-of-week support form', days: ['Fri'], time_window: '5 PM EST', est_time: '10 mins', is_eow: true },
]

type CustomTask = {
  id: number
  task_name: string
  description: string
  days: string[]
  time_window: string
  est_time: string
  loom_link: string
  sop_doc_link: string
}

type VALink = {
  task_id: number
  loom_link: string
  sop_doc_link: string
}

function getMonday() {
  const now = new Date()
  const day = now.getDay()
  const diff = day === 0 ? -6 : 1 - day
  const monday = new Date(now)
  monday.setDate(now.getDate() + diff)
  monday.setHours(0, 0, 0, 0)
  return monday
}

export default function TasksPage() {
  const [completions, setCompletions] = useState<Record<string, boolean>>({})
  const [vaLinks, setVALinks] = useState<Record<number, VALink>>({})
  const [expandedLinks, setExpandedLinks] = useState<number | null>(null)
  const [customTasks, setCustomTasks] = useState<CustomTask[]>([])
  const [showAddForm, setShowAddForm] = useState(false)
  const [newTask, setNewTask] = useState({ task_name: '', description: '', days: ['Mon','Tue','Wed','Thu','Fri'], time_window: '', est_time: '' })
  const [savingLink, setSavingLink] = useState<number | null>(null)
  const [linkDraft, setLinkDraft] = useState<Record<number, { loom: string, sop: string }>>({})
  const [userId, setUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const monday = getMonday()
  const weekStart = monday.toISOString().split('T')[0]
  const today = new Date().toLocaleDateString('en-US', { weekday: 'short' })

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setUserId(user.id)

      const [completionData, linkData, customData] = await Promise.all([
        supabase.from('task_completions').select('task_id, day, completed').eq('user_id', user.id).eq('week_start', weekStart),
        supabase.from('va_task_links').select('task_id, loom_link, sop_doc_link').eq('user_id', user.id),
        supabase.from('va_custom_tasks').select('*').eq('user_id', user.id).eq('active', true),
      ])

      const map: Record<string, boolean> = {}
      completionData.data?.forEach(row => { map[`${row.task_id}-${row.day}`] = row.completed })
      setCompletions(map)

      const links: Record<number, VALink> = {}
      linkData.data?.forEach(row => { links[row.task_id] = row })
      setVALinks(links)

      const drafts: Record<number, { loom: string, sop: string }> = {}
      linkData.data?.forEach(row => { drafts[row.task_id] = { loom: row.loom_link ?? '', sop: row.sop_doc_link ?? '' } })
      setLinkDraft(drafts)

      setCustomTasks(customData.data ?? [])
      setLoading(false)
    }
    load()
  }, [weekStart])

  async function toggleTask(taskId: number, day: string) {
    if (!userId) return
    const supabase = createClient()
    const key = `${taskId}-${day}`
    const newVal = !completions[key]
    await supabase.from('task_completions').upsert({ user_id: userId, task_id: taskId, week_start: weekStart, day, completed: newVal, completed_at: newVal ? new Date().toISOString() : null }, { onConflict: 'user_id,task_id,week_start,day' })
    setCompletions(prev => ({ ...prev, [key]: newVal }))
  }

  async function saveVALink(taskId: number) {
    if (!userId) return
    setSavingLink(taskId)
    const supabase = createClient()
    const draft = linkDraft[taskId] ?? { loom: '', sop: '' }
    await supabase.from('va_task_links').upsert({ user_id: userId, task_id: taskId, loom_link: draft.loom, sop_doc_link: draft.sop, updated_at: new Date().toISOString() }, { onConflict: 'user_id,task_id' })
    setVALinks(prev => ({ ...prev, [taskId]: { task_id: taskId, loom_link: draft.loom, sop_doc_link: draft.sop } }))
    setSavingLink(null)
    setExpandedLinks(null)
  }

  async function addCustomTask() {
    if (!userId || !newTask.task_name.trim()) return
    const supabase = createClient()
    const { data } = await supabase.from('va_custom_tasks').insert({ user_id: userId, task_name: newTask.task_name, description: newTask.description, days: newTask.days, time_window: newTask.time_window, est_time: newTask.est_time, loom_link: '', sop_doc_link: '' }).select().single()
    if (data) setCustomTasks(prev => [...prev, data])
    setNewTask({ task_name: '', description: '', days: ['Mon','Tue','Wed','Thu','Fri'], time_window: '', est_time: '' })
    setShowAddForm(false)
  }

  async function deleteCustomTask(id: number) {
    if (!userId) return
    const supabase = createClient()
    await supabase.from('va_custom_tasks').update({ active: false }).eq('id', id)
    setCustomTasks(prev => prev.filter(t => t.id !== id))
  }

  const isFriday = today === 'Fri'
  const regularTasks = DEFAULT_TASKS.filter(t => !t.is_eow)
  const eowTasks = DEFAULT_TASKS.filter(t => t.is_eow)

  function LinkSection({ taskId }: { taskId: number }) {
    const isOpen = expandedLinks === taskId
    const draft = linkDraft[taskId] ?? { loom: '', sop: '' }
    const hasLinks = vaLinks[taskId]?.loom_link || vaLinks[taskId]?.sop_doc_link

    return (
      <div className="mt-1">
        <button
          onClick={() => setExpandedLinks(isOpen ? null : taskId)}
          className={`text-xs flex items-center gap-1 transition-colors ${hasLinks ? 'text-blue-400 hover:text-blue-300' : 'text-gray-500 hover:text-gray-400'}`}
        >
          🔗 {hasLinks ? 'My Links' : 'Add my links'}
        </button>
        {isOpen && (
          <div className="mt-2 p-3 bg-gray-800/60 rounded-lg border border-gray-700 space-y-2">
            <div>
              <label className="block text-xs text-gray-400 mb-1">My Loom Tutorial</label>
              <input
                type="url"
                value={draft.loom}
                onChange={e => setLinkDraft(prev => ({ ...prev, [taskId]: { ...prev[taskId] ?? { loom: '', sop: '' }, loom: e.target.value } }))}
                placeholder="https://www.loom.com/share/..."
                className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">My SOP Document</label>
              <input
                type="url"
                value={draft.sop}
                onChange={e => setLinkDraft(prev => ({ ...prev, [taskId]: { ...prev[taskId] ?? { loom: '', sop: '' }, sop: e.target.value } }))}
                placeholder="https://docs.google.com/..."
                className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <button
              onClick={() => saveVALink(taskId)}
              disabled={savingLink === taskId}
              className="text-xs bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-3 py-1.5 rounded transition-colors"
            >
              {savingLink === taskId ? 'Saving...' : 'Save'}
            </button>
          </div>
        )}
      </div>
    )
  }

  if (loading) {
    return <div className="min-h-screen bg-gray-950 flex items-center justify-center text-gray-400">Loading...</div>
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <nav className="border-b border-gray-800 px-6 py-4 flex items-center gap-4">
        <Link href="/dashboard" className="text-gray-400 hover:text-white text-sm">← Dashboard</Link>
        <h1 className="text-lg font-bold">My Task Sheet</h1>
      </nav>

      <main className="max-w-5xl mx-auto px-4 py-8">
        {/* Core 4 Banner */}
        <div className="bg-blue-900/30 border border-blue-700/50 rounded-xl p-4 mb-6">
          <h3 className="font-semibold text-blue-300 mb-2">The Core 4 Rules</h3>
          <ol className="space-y-1">
            {[
              'Tasks are your full responsibility unless stated otherwise.',
              "Complete tasks within the time windows (8am–12pm, 1pm–6pm PHT). Use World Time Buddy.",
              "If you can't complete a task, message the Founder or Manager immediately.",
              'Anything less than the stated process is grounds for performance review.',
            ].map((rule, i) => (
              <li key={i} className="text-sm text-blue-200/80 flex gap-2">
                <span className="font-bold">{i + 1}.</span><span>{rule}</span>
              </li>
            ))}
          </ol>
        </div>

        {/* Task Completion Clarity */}
        <div className="bg-yellow-900/20 border border-yellow-700/40 rounded-xl p-3 mb-6">
          <p className="text-sm text-yellow-200/80">
            <span className="font-semibold text-yellow-300">Task Completion Clarity:</span> A task is only complete after the Communication Text has been sent (if one is required). Failure to send = grounds for performance review.
          </p>
        </div>

        {/* Default Tasks Table */}
        <div className="overflow-x-auto mb-8">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800">
                <th className="text-left py-2 pr-4 text-gray-400 font-medium w-8">#</th>
                <th className="text-left py-2 pr-4 text-gray-400 font-medium">Task</th>
                <th className="text-left py-2 pr-4 text-gray-400 font-medium hidden md:table-cell">Time</th>
                <th className="text-left py-2 pr-4 text-gray-400 font-medium hidden md:table-cell">Est.</th>
                {DAYS.map(d => (
                  <th key={d} className={`text-center py-2 px-2 font-medium w-10 ${d === today ? 'text-blue-400' : 'text-gray-400'}`}>{d}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {regularTasks.map(task => (
                <tr key={task.id} className="border-b border-gray-800/50">
                  <td className="py-3 pr-4 text-gray-500 align-top">{task.sop_number}</td>
                  <td className="py-3 pr-4 align-top">
                    <p className="font-medium">{task.name}</p>
                    <p className="text-xs text-gray-400 hidden sm:block">{task.description}</p>
                    <LinkSection taskId={task.id} />
                  </td>
                  <td className="py-3 pr-4 text-gray-400 hidden md:table-cell align-top">{task.time_window}</td>
                  <td className="py-3 pr-4 text-gray-400 hidden md:table-cell align-top">{task.est_time}</td>
                  {DAYS.map(d => {
                    const isTaskDay = task.days.includes(d)
                    const key = `${task.id}-${d}`
                    const done = completions[key] ?? false
                    return (
                      <td key={d} className="text-center py-3 px-2 align-top">
                        {isTaskDay ? (
                          <button
                            onClick={() => toggleTask(task.id, d)}
                            className={`w-6 h-6 rounded border-2 flex items-center justify-center mx-auto transition-colors ${done ? 'bg-green-500 border-green-500' : d === today ? 'border-blue-500 hover:border-green-400' : 'border-gray-600 hover:border-green-400'}`}
                          >
                            {done && <span className="text-white text-xs">✓</span>}
                          </button>
                        ) : (
                          <span className="text-gray-700">—</span>
                        )}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* EOW Tasks */}
        {isFriday && (
          <div className="mb-8">
            <h3 className="font-semibold text-gray-300 mb-3">End of Week Tasks (Friday)</h3>
            <div className="space-y-2">
              {eowTasks.map(task => {
                const key = `${task.id}-Fri`
                const done = completions[key] ?? false
                return (
                  <div key={task.id} className={`flex items-start gap-3 p-4 rounded-xl border ${done ? 'bg-green-900/20 border-green-800/50' : 'bg-gray-900 border-gray-800'}`}>
                    <button
                      onClick={() => toggleTask(task.id, 'Fri')}
                      className={`mt-0.5 w-5 h-5 rounded flex-shrink-0 border-2 flex items-center justify-center cursor-pointer transition-colors ${done ? 'bg-green-500 border-green-500' : 'border-gray-600 hover:border-green-400'}`}
                    >
                      {done && <span className="text-white text-xs">✓</span>}
                    </button>
                    <div className="flex-1">
                      <p className="font-medium text-sm">{task.name}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{task.description}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{task.time_window} · {task.est_time}</p>
                      <LinkSection taskId={task.id} />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Custom Tasks Section */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-300">My Custom Tasks</h3>
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="text-sm bg-gray-700 hover:bg-gray-600 text-white px-3 py-1.5 rounded-lg transition-colors"
            >
              + Add Task
            </button>
          </div>

          {showAddForm && (
            <div className="bg-gray-900 border border-gray-700 rounded-xl p-4 mb-4">
              <h4 className="text-sm font-medium mb-3">New Custom Task</h4>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Task Name *</label>
                  <input required value={newTask.task_name} onChange={e => setNewTask(p => ({ ...p, task_name: e.target.value }))}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Description</label>
                  <input value={newTask.description} onChange={e => setNewTask(p => ({ ...p, description: e.target.value }))}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Time Window</label>
                    <input value={newTask.time_window} onChange={e => setNewTask(p => ({ ...p, time_window: e.target.value }))} placeholder="e.g. 8 PM EST"
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Est. Time</label>
                    <input value={newTask.est_time} onChange={e => setNewTask(p => ({ ...p, est_time: e.target.value }))} placeholder="e.g. 15 mins"
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-2">Days</label>
                  <div className="flex gap-2 flex-wrap">
                    {DAYS.map(d => (
                      <button key={d} type="button"
                        onClick={() => setNewTask(p => ({ ...p, days: p.days.includes(d) ? p.days.filter(x => x !== d) : [...p.days, d] }))}
                        className={`px-2 py-1 rounded text-xs transition-colors ${newTask.days.includes(d) ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-400'}`}
                      >{d}</button>
                    ))}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={addCustomTask} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm transition-colors">Add Task</button>
                  <button onClick={() => setShowAddForm(false)} className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg text-sm transition-colors">Cancel</button>
                </div>
              </div>
            </div>
          )}

          {customTasks.length === 0 && !showAddForm && (
            <p className="text-sm text-gray-500 py-4">No custom tasks yet. Click "+ Add Task" to create one.</p>
          )}

          {customTasks.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-800">
                    <th className="text-left py-2 pr-4 text-gray-400 font-medium">Task</th>
                    <th className="text-left py-2 pr-4 text-gray-400 font-medium hidden md:table-cell">Time</th>
                    {DAYS.map(d => (
                      <th key={d} className={`text-center py-2 px-2 font-medium w-10 ${d === today ? 'text-blue-400' : 'text-gray-400'}`}>{d}</th>
                    ))}
                    <th className="w-8"></th>
                  </tr>
                </thead>
                <tbody>
                  {customTasks.map(task => (
                    <tr key={task.id} className="border-b border-gray-800/50">
                      <td className="py-3 pr-4 align-top">
                        <p className="font-medium">{task.task_name}</p>
                        {task.description && <p className="text-xs text-gray-400">{task.description}</p>}
                        <LinkSection taskId={task.id + 10000} />
                      </td>
                      <td className="py-3 pr-4 text-gray-400 hidden md:table-cell align-top">{task.time_window}</td>
                      {DAYS.map(d => {
                        const isTaskDay = task.days.includes(d)
                        const key = `custom-${task.id}-${d}`
                        const done = completions[key] ?? false
                        return (
                          <td key={d} className="text-center py-3 px-2 align-top">
                            {isTaskDay ? (
                              <button
                                onClick={() => setCompletions(prev => ({ ...prev, [key]: !done }))}
                                className={`w-6 h-6 rounded border-2 flex items-center justify-center mx-auto transition-colors ${done ? 'bg-green-500 border-green-500' : d === today ? 'border-blue-500 hover:border-green-400' : 'border-gray-600 hover:border-green-400'}`}
                              >
                                {done && <span className="text-white text-xs">✓</span>}
                              </button>
                            ) : (
                              <span className="text-gray-700">—</span>
                            )}
                          </td>
                        )
                      })}
                      <td className="py-3 align-top">
                        <button onClick={() => deleteCustomTask(task.id)} className="text-gray-600 hover:text-red-400 text-xs transition-colors">✕</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
