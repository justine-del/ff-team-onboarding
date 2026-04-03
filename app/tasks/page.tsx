'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const TIME_OPTIONS = [0, 5, 10, 15, 30, 60, 90, 120, 180, 240, 300, 360]

const DEFAULT_TASKS = [
  { id: 1, sop_number: '1',     name: 'Understanding Your Core Sheet',    description: 'Review and understand the updates in your core tracking sheet',            days: ['Mon','Tue','Wed','Thu','Fri'], time_window: '8 PM EST', est_time: '10 mins', is_eow: false, loom_link: 'https://www.loom.com/share/6407bed964d14db8a26374c028bc4970',    doc_link: 'https://docs.google.com/document/d/1NpFOIAjPa_pKZ8o6L7qfyCj4XSpAwv_St1H1GfsCuSQ/edit?tab=t.0',                                                                                    form_link: null },
  { id: 2, sop_number: '2',     name: 'Daily and Weekly SOP Creation',    description: 'Create and update your daily and weekly standard operating procedures',     days: ['Mon','Tue','Wed','Thu','Fri'], time_window: '8 PM EST', est_time: '10 mins', is_eow: false, loom_link: 'https://www.loom.com/share/6ae36b6a3e074b5e8c525e2d79b88572',    doc_link: 'https://docs.google.com/document/d/10RIeXKvyUjhCyMcR2ERnsTyuntfhBkPSe6SW9fvuQMw/edit?tab=t.tkyxfcvf5q4m',                                                                          form_link: null },
  { id: 3, sop_number: 'EOW-1', name: 'EOW SOP Solidification',           description: 'Review and solidify all SOPs created during the week',                      days: ['Fri'],                        time_window: '5 PM EST', est_time: '1 hr',    is_eow: true,  loom_link: 'https://www.loom.com/share/803db3b5261647dc8eab7b966992d33e',    doc_link: 'https://docs.google.com/document/d/1zM-mbToha4scwgM5f4RZOwRPNwzvsstrMYgI8o8tlP4/edit?tab=t.2tixycp0z60y#heading=h.i1sai7oqo0os',                                                   form_link: null },
  { id: 4, sop_number: 'EOW-2', name: 'EOW VA Clear Out and Restart',     description: 'Clear your workspace and prepare for the new week',                         days: ['Fri'],                        time_window: '5 PM EST', est_time: '10 mins', is_eow: true,  loom_link: 'https://www.loom.com/share/0f1c078502d147038bd619e2b4e5bc4c',    doc_link: 'https://docs.google.com/document/d/1dgN71db7r0vbT3pvwyF_5fSs4f-VnmkWNwBvVv1IE7A/edit?tab=t.0#heading=h.el8shvjenf8a',                                                              form_link: null },
  { id: 5, sop_number: 'EOW-3', name: 'EOW FF Support Form Submission',   description: 'Submit the Funnel Futurist end-of-week support form',                       days: ['Fri'],                        time_window: '5 PM EST', est_time: '10 mins', is_eow: true,  loom_link: 'https://www.loom.com/share/62ac21c700f54d65bdf81751408d5103',    doc_link: 'https://docs.google.com/document/d/1cGWMOvOnSrd0xfhQKe2ctPYP9ZaXHkIcuWJf9iIOkNY/edit?tab=t.0#heading=h.vzbhezazyyz1',                                                             form_link: 'https://k0tk16hntji.typeform.com/to/P2Taxt4X' },
]

function formatTime(mins: number): string {
  if (!mins) return '—'
  if (mins < 60) return `${mins}m`
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return m > 0 ? `${h}h${m}m` : `${h}h`
}

function timeBadgeClass(mins: number): string {
  if (!mins) return 'bg-gray-800/50 border-gray-700 text-gray-600'
  if (mins <= 30) return 'bg-yellow-900/40 border-yellow-700/50 text-yellow-300'
  if (mins <= 90) return 'bg-blue-900/40 border-blue-700/50 text-blue-300'
  if (mins <= 240) return 'bg-green-900/40 border-green-700/50 text-green-300'
  return 'bg-purple-900/40 border-purple-700/50 text-purple-300'
}

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

type Member = { id: string; first_name: string; last_name: string; email: string }

export default function TasksPage() {
  const [completions, setCompletions] = useState<Record<string, number>>({})
  const [dayOffs, setDayOffs] = useState<Record<string, string>>({})
  const [vaLinks, setVALinks] = useState<Record<number, VALink>>({})
  const [expandedLinks, setExpandedLinks] = useState<number | null>(null)
  const [customTasks, setCustomTasks] = useState<CustomTask[]>([])
  const [showAddForm, setShowAddForm] = useState(false)
  const [newTask, setNewTask] = useState({ task_name: '', description: '', days: ['Mon','Tue','Wed','Thu','Fri'], time_window: '', est_time: '' })
  const [savingLink, setSavingLink] = useState<number | null>(null)
  const [linkDraft, setLinkDraft] = useState<Record<number, { loom: string, sop: string }>>({})
  const [userId, setUserId] = useState<string | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [members, setMembers] = useState<Member[]>([])
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const monday = getMonday()
  const weekStart = monday.toISOString().split('T')[0]
  const today = new Date().toLocaleDateString('en-US', { weekday: 'short' })

  const viewingId = selectedMemberId ?? userId

  // Weekly hours calculation
  const weeklyMinutes = Object.entries(completions).reduce((sum, [, mins]) => sum + (mins || 0), 0)
  const weeklyHours = (weeklyMinutes / 60).toFixed(1)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setUserId(user.id)

      const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
      const admin = profile?.role === 'admin'
      setIsAdmin(admin)

      if (admin) {
        const { data: allMembers } = await supabase.from('profiles').select('id, first_name, last_name, email').eq('role', 'member').order('first_name')
        setMembers(allMembers ?? [])
      }

      setLoading(false)
    }
    load()
  }, [])

  useEffect(() => {
    if (!viewingId) return
    async function loadData() {
      const supabase = createClient()
      const [completionData, linkData, customData, dayOffData] = await Promise.all([
        supabase.from('task_completions').select('task_id, day, completed, time_spent').eq('user_id', viewingId).eq('week_start', weekStart),
        supabase.from('va_task_links').select('task_id, loom_link, sop_doc_link').eq('user_id', viewingId),
        supabase.from('va_custom_tasks').select('*').eq('user_id', viewingId).eq('active', true),
        supabase.from('day_off').select('day, type').eq('user_id', viewingId).eq('week_start', weekStart),
      ])

      const map: Record<string, number> = {}
      completionData.data?.forEach(row => {
        const mins = row.time_spent ?? (row.completed ? 30 : 0)
        if (row.task_id > 10000) {
          map[`custom-${row.task_id - 10000}-${row.day}`] = mins
        } else {
          map[`${row.task_id}-${row.day}`] = mins
        }
      })
      setCompletions(map)

      const dayOffMap: Record<string, string> = {}
      dayOffData.data?.forEach(row => { dayOffMap[row.day] = row.type })
      setDayOffs(dayOffMap)

      const links: Record<number, VALink> = {}
      linkData.data?.forEach(row => { links[row.task_id] = row })
      setVALinks(links)

      const drafts: Record<number, { loom: string, sop: string }> = {}
      linkData.data?.forEach(row => { drafts[row.task_id] = { loom: row.loom_link ?? '', sop: row.sop_doc_link ?? '' } })
      setLinkDraft(drafts)

      setCustomTasks(customData.data ?? [])
    }
    loadData()
  }, [viewingId, weekStart])

  async function setTaskTime(taskId: number, day: string, minutes: number) {
    if (!userId || !!selectedMemberId) return
    const supabase = createClient()
    const key = taskId > 10000 ? `custom-${taskId - 10000}-${day}` : `${taskId}-${day}`
    await supabase.from('task_completions').upsert({
      user_id: userId, task_id: taskId, week_start: weekStart, day,
      time_spent: minutes, completed: minutes > 0,
      completed_at: minutes > 0 ? new Date().toISOString() : null
    }, { onConflict: 'user_id,task_id,week_start,day' })
    setCompletions(prev => ({ ...prev, [key]: minutes }))
  }

  // EOW tasks use binary toggle
  async function toggleEOWTask(taskId: number, day: string) {
    if (!userId || !!selectedMemberId) return
    const supabase = createClient()
    const key = `${taskId}-${day}`
    const current = completions[key] ?? 0
    const newVal = current > 0 ? 0 : 30
    await supabase.from('task_completions').upsert({
      user_id: userId, task_id: taskId, week_start: weekStart, day,
      time_spent: newVal, completed: newVal > 0,
      completed_at: newVal > 0 ? new Date().toISOString() : null
    }, { onConflict: 'user_id,task_id,week_start,day' })
    setCompletions(prev => ({ ...prev, [key]: newVal }))
  }

  async function toggleDayOff(day: string) {
    if (!userId || !!selectedMemberId) return
    const supabase = createClient()
    const current = dayOffs[day]
    let next: string | null = null
    if (!current) next = 'off'
    else if (current === 'off') next = 'half'
    else next = null

    if (next) {
      await supabase.from('day_off').upsert({ user_id: userId, week_start: weekStart, day, type: next }, { onConflict: 'user_id,week_start,day' })
      setDayOffs(prev => ({ ...prev, [day]: next! }))
    } else {
      await supabase.from('day_off').delete().eq('user_id', userId).eq('week_start', weekStart).eq('day', day)
      setDayOffs(prev => { const n = { ...prev }; delete n[day]; return n })
    }
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
        {/* Admin member selector */}
        {isAdmin && (
          <div className="bg-blue-950/40 border border-blue-800/50 rounded-xl p-4 mb-6">
            <p className="text-xs text-blue-300 font-semibold mb-2 uppercase tracking-wide">Admin — View Member Task Sheet</p>
            {members.length === 0 ? (
              <p className="text-sm text-gray-400">No members yet.</p>
            ) : (
              <div className="flex items-center gap-3">
                <select
                  value={selectedMemberId ?? ''}
                  onChange={e => setSelectedMemberId(e.target.value || null)}
                  className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">— Select a member to view their sheet —</option>
                  {members.map(m => (
                    <option key={m.id} value={m.id}>{m.first_name} {m.last_name} ({m.email})</option>
                  ))}
                </select>
                {selectedMemberId && <span className="text-xs text-yellow-400 flex-shrink-0">Read-only view</span>}
              </div>
            )}
          </div>
        )}

        {/* Core 4 Banner */}
        <div className="bg-blue-900/30 border border-blue-700/50 rounded-xl p-4 mb-4">
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
        <div className="bg-yellow-900/20 border border-yellow-700/40 rounded-xl p-3 mb-4">
          <p className="text-sm text-yellow-200/80">
            <span className="font-semibold text-yellow-300">Task Completion Clarity:</span> A task is only complete after the Communication Text has been sent (if one is required). Failure to send = grounds for performance review.
          </p>
        </div>

        {/* Weekly Hours Summary */}
        <div className="flex items-center justify-between bg-gray-900 border border-gray-800 rounded-xl px-4 py-3 mb-6">
          <div className="text-sm text-gray-400">
            Week of {monday.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">Hours logged:</span>
              <span className={`text-sm font-semibold ${weeklyMinutes > 0 ? 'text-green-400' : 'text-gray-600'}`}>
                {weeklyHours}h
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-gray-600">
              <span className="w-2 h-2 rounded-full bg-yellow-500/60 inline-block"></span><span>≤30m</span>
              <span className="w-2 h-2 rounded-full bg-blue-500/60 inline-block ml-1"></span><span>≤90m</span>
              <span className="w-2 h-2 rounded-full bg-green-500/60 inline-block ml-1"></span><span>≤4h</span>
              <span className="w-2 h-2 rounded-full bg-purple-500/60 inline-block ml-1"></span><span>4h+</span>
            </div>
          </div>
        </div>

        {/* Day off legend */}
        {!selectedMemberId && (
          <p className="text-xs text-gray-600 mb-3">Click a day header to mark as <span className="text-red-400">OFF</span> → click again for <span className="text-yellow-400">½ day</span> → click again to clear.</p>
        )}

        {/* Default Tasks Table */}
        <div className="overflow-x-auto mb-8">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800">
                <th className="text-left py-2 pr-4 text-gray-400 font-medium w-8">#</th>
                <th className="text-left py-2 pr-4 text-gray-400 font-medium">Task</th>
                <th className="text-left py-2 pr-4 text-gray-400 font-medium hidden md:table-cell">Window</th>
                <th className="text-left py-2 pr-4 text-gray-400 font-medium hidden md:table-cell">Est.</th>
                {DAYS.map(d => {
                  const isOff = dayOffs[d] === 'off'
                  const isHalf = dayOffs[d] === 'half'
                  return (
                    <th key={d} className={`text-center py-2 px-1 font-medium w-12 ${d === today ? 'text-blue-400' : 'text-gray-400'}`}>
                      <div>{d}</div>
                      {!selectedMemberId ? (
                        <button
                          onClick={() => toggleDayOff(d)}
                          title="Click to mark day off / half day"
                          className={`text-[10px] mt-0.5 px-1.5 py-0.5 rounded transition-colors w-full ${
                            isOff ? 'bg-red-900/50 text-red-400 hover:bg-red-900/70' :
                            isHalf ? 'bg-yellow-900/50 text-yellow-400 hover:bg-yellow-900/70' :
                            'text-gray-700 hover:text-gray-500 hover:bg-gray-800'
                          }`}
                        >
                          {isOff ? 'OFF' : isHalf ? '½' : '·'}
                        </button>
                      ) : (
                        <div className={`text-[10px] mt-0.5 ${isOff ? 'text-red-400' : isHalf ? 'text-yellow-400' : 'text-transparent'}`}>
                          {isOff ? 'OFF' : isHalf ? '½' : '·'}
                        </div>
                      )}
                    </th>
                  )
                })}
              </tr>
            </thead>
            <tbody>
              {regularTasks.map(task => (
                <tr key={task.id} className="border-b border-gray-800/50">
                  <td className="py-3 pr-4 text-gray-500 align-top">{task.sop_number}</td>
                  <td className="py-3 pr-4 align-top">
                    <p className="font-medium">{task.name}</p>
                    <p className="text-xs text-gray-400 hidden sm:block">{task.description}</p>
                    <div className="flex items-center gap-3 mt-1 flex-wrap">
                      {task.loom_link && <a href={task.loom_link} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-400 hover:text-blue-300">Watch tutorial →</a>}
                      {task.doc_link && <a href={task.doc_link} target="_blank" rel="noopener noreferrer" className="text-xs text-purple-400 hover:text-purple-300">View SOP →</a>}
                      {task.form_link && <a href={task.form_link} target="_blank" rel="noopener noreferrer" className="text-xs text-green-400 hover:text-green-300">Submit form →</a>}
                    </div>
                    <LinkSection taskId={task.id} />
                  </td>
                  <td className="py-3 pr-4 text-gray-400 hidden md:table-cell align-top text-xs">{task.time_window}</td>
                  <td className="py-3 pr-4 text-gray-400 hidden md:table-cell align-top text-xs">{task.est_time}</td>
                  {DAYS.map(d => {
                    const isTaskDay = task.days.includes(d)
                    const isOff = dayOffs[d] === 'off'
                    const key = `${task.id}-${d}`
                    const mins = completions[key] ?? 0
                    return (
                      <td key={d} className={`text-center py-3 px-1 align-top ${isOff ? 'opacity-25' : ''}`}>
                        {isTaskDay && !isOff ? (
                          <select
                            value={mins}
                            onChange={e => setTaskTime(task.id, d, parseInt(e.target.value))}
                            disabled={!!selectedMemberId}
                            className={`text-xs rounded px-1 py-0.5 border focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer w-14 ${timeBadgeClass(mins)} ${selectedMemberId ? 'cursor-default' : ''}`}
                          >
                            {TIME_OPTIONS.map(t => (
                              <option key={t} value={t} className="bg-gray-900 text-white">{formatTime(t)}</option>
                            ))}
                          </select>
                        ) : (
                          <span className="text-gray-700 text-xs">—</span>
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
                const done = (completions[key] ?? 0) > 0
                return (
                  <div key={task.id} className={`flex items-start gap-3 p-4 rounded-xl border ${done ? 'bg-green-900/20 border-green-800/50' : 'bg-gray-900 border-gray-800'}`}>
                    <button
                      onClick={() => toggleEOWTask(task.id, 'Fri')}
                      disabled={!!selectedMemberId}
                      className={`mt-0.5 w-5 h-5 rounded flex-shrink-0 border-2 flex items-center justify-center cursor-pointer transition-colors ${done ? 'bg-green-500 border-green-500' : 'border-gray-600 hover:border-green-400'} ${selectedMemberId ? 'cursor-default' : ''}`}
                    >
                      {done && <span className="text-white text-xs">✓</span>}
                    </button>
                    <div className="flex-1">
                      <p className="font-medium text-sm">{task.name}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{task.description}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{task.time_window} · {task.est_time}</p>
                      <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                        {task.loom_link && <a href={task.loom_link} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-400 hover:text-blue-300">Watch tutorial →</a>}
                        {task.doc_link && <a href={task.doc_link} target="_blank" rel="noopener noreferrer" className="text-xs text-purple-400 hover:text-purple-300">View SOP →</a>}
                        {task.form_link && <a href={task.form_link} target="_blank" rel="noopener noreferrer" className="text-xs text-green-400 hover:text-green-300">Submit form →</a>}
                      </div>
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
            {!selectedMemberId && (
              <button
                onClick={() => setShowAddForm(!showAddForm)}
                className="text-sm bg-gray-700 hover:bg-gray-600 text-white px-3 py-1.5 rounded-lg transition-colors"
              >
                + Add Task
              </button>
            )}
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
            <p className="text-sm text-gray-500 py-4">No custom tasks yet. Click &quot;+ Add Task&quot; to create one.</p>
          )}

          {customTasks.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-800">
                    <th className="text-left py-2 pr-4 text-gray-400 font-medium">Task</th>
                    <th className="text-left py-2 pr-4 text-gray-400 font-medium hidden md:table-cell">Est.</th>
                    {DAYS.map(d => (
                      <th key={d} className={`text-center py-2 px-1 font-medium w-12 ${d === today ? 'text-blue-400' : 'text-gray-400'}`}>{d}</th>
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
                      <td className="py-3 pr-4 text-gray-400 hidden md:table-cell align-top text-xs">{task.est_time}</td>
                      {DAYS.map(d => {
                        const isTaskDay = task.days.includes(d)
                        const isOff = dayOffs[d] === 'off'
                        const key = `custom-${task.id}-${d}`
                        const mins = completions[key] ?? 0
                        return (
                          <td key={d} className={`text-center py-3 px-1 align-top ${isOff ? 'opacity-25' : ''}`}>
                            {isTaskDay && !isOff ? (
                              <select
                                value={mins}
                                onChange={e => setTaskTime(task.id + 10000, d, parseInt(e.target.value))}
                                disabled={!!selectedMemberId}
                                className={`text-xs rounded px-1 py-0.5 border focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer w-14 ${timeBadgeClass(mins)} ${selectedMemberId ? 'cursor-default' : ''}`}
                              >
                                {TIME_OPTIONS.map(t => (
                                  <option key={t} value={t} className="bg-gray-900 text-white">{formatTime(t)}</option>
                                ))}
                              </select>
                            ) : (
                              <span className="text-gray-700 text-xs">—</span>
                            )}
                          </td>
                        )
                      })}
                      <td className="py-3 align-top">
                        {!selectedMemberId && (
                          <button onClick={() => deleteCustomTask(task.id)} className="text-gray-600 hover:text-red-400 text-xs transition-colors">✕</button>
                        )}
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
