'use client'

import React, { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import QuickNav from '@/components/QuickNav'

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

function buildSemanticHtml(reportText: string): string {
  let html = ''
  let inTable = false
  let headerCells: string[] = []

  for (const line of reportText.split('\n')) {
    const t = line.trim()
    if (!t) {
      if (inTable) { html += '</tbody></table>'; inTable = false }
      html += '<br>'; continue
    }
    const bold = (s: string) => s.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    if (t.startsWith('|') && t.endsWith('|')) {
      if (/^\|[\s\-|]+\|$/.test(t)) continue
      const cells = t.slice(1, -1).split('|').map(c => c.trim())
      if (!inTable) {
        headerCells = cells
        html += '<table><thead><tr>' + cells.map(c => `<th>${c}</th>`).join('') + '</tr></thead><tbody>'
        inTable = true
      } else {
        html += '<tr>' + cells.map(c => `<td>${c}</td>`).join('') + '</tr>'
      }
      continue
    }
    if (inTable) { html += '</tbody></table>'; inTable = false }
    const hm = t.match(/^\*\*(.*?)\*\*$/)
    if (hm) {
      const text = hm[1]
      html += text.toLowerCase().includes('eow performance') ? `<h1>${text}</h1>` : `<h2>${text}</h2>`
      continue
    }
    if (t.startsWith('- ') || t.startsWith('• ')) { html += `<li>${bold(t.slice(2))}</li>`; continue }
    if (t.startsWith('  - ') || t.startsWith('  • ')) { html += `<li>${bold(t.slice(4))}</li>`; continue }
    html += `<p>${bold(t)}</p>`
  }
  if (inTable) html += '</tbody></table>'
  // suppress unused warning
  void headerCells
  return html
}

function buildReportHtml(reportText: string, memberName: string, weekOf: string): string {
  const lines = reportText.split('\n')
  let body = ''
  let inList = false
  let inTable = false
  let firstRow = true

  for (const line of lines) {
    const t = line.trim()
    if (!t) {
      if (inList) { body += '</ul>'; inList = false }
      if (inTable) { body += '</tbody></table>'; inTable = false; firstRow = true }
      body += '<br>'; continue
    }
    if (t.startsWith('|') && t.endsWith('|')) {
      if (/^\|[\s\-|]+\|$/.test(t)) continue
      const cells = t.slice(1, -1).split('|').map(c => c.trim())
      if (firstRow) {
        if (inList) { body += '</ul>'; inList = false }
        body += '<table><thead><tr>' + cells.map(c => `<th>${c}</th>`).join('') + '</tr></thead><tbody>'
        inTable = true; firstRow = false; continue
      }
      body += '<tr>' + cells.map(c => `<td>${c}</td>`).join('') + '</tr>'; continue
    }
    if (inTable) { body += '</tbody></table>'; inTable = false; firstRow = true }
    const bold = (s: string) => s.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    const hm = t.match(/^\*\*(.*?)\*\*$/)
    if (hm) {
      if (inList) { body += '</ul>'; inList = false }
      body += hm[1].toLowerCase().includes('eow') ? `<h1>${bold(hm[1])}</h1>` : `<h2>${bold(hm[1])}</h2>`
      continue
    }
    if (t.startsWith('- ') || t.startsWith('• ')) {
      if (!inList) { body += '<ul>'; inList = true }
      body += `<li>${bold(t.slice(2))}</li>`; continue
    }
    if (inList) { body += '</ul>'; inList = false }
    body += `<p>${bold(t)}</p>`
  }
  if (inList) body += '</ul>'
  if (inTable) body += '</tbody></table>'

  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>EOW Report — ${memberName}</title><style>
    body{font-family:Arial,sans-serif;max-width:820px;margin:40px auto;color:#111;line-height:1.6;padding:0 20px}
    h1{font-size:20px;border-bottom:3px solid #1a1a2e;padding-bottom:8px;color:#1a1a2e}
    h2{font-size:14px;text-transform:uppercase;letter-spacing:.5px;color:#1a1a2e;margin-top:28px}
    table{border-collapse:collapse;width:100%;margin:12px 0;font-size:13px}
    th{background:#1a1a2e;color:#fff;padding:8px 12px;text-align:left}
    td{padding:7px 12px;border-bottom:1px solid #e0e0e0}
    tr:nth-child(even) td{background:#f9f9f9}
    ul{padding-left:20px}li{margin:4px 0;font-size:13px}
    p{margin:5px 0;font-size:13px}
    footer{margin-top:40px;border-top:1px solid #ddd;padding-top:8px;font-size:11px;color:#aaa}
  </style></head><body>${body}
  <footer>Generated via Cyborg VA Portal · ${memberName} · ${weekOf}</footer>
  </body></html>`
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
  const day = now.getDay()   // local day of week (PHT for PH-based members)
  const hour = now.getHours() // local hour
  // Mondays before 6pm PHT still belong to last week — members have until 5:59pm to log
  const stillLastWeek = day === 1 && hour < 18
  const diff = day === 0 ? -6 : 1 - day
  const monday = new Date(now)
  monday.setDate(now.getDate() + diff + (stillLastWeek ? -7 : 0))
  monday.setHours(0, 0, 0, 0)
  return monday
}

type Member = { id: string; first_name: string; last_name: string; email: string }

type NoteSectionProps = {
  taskKey: string
  taskId: number
  expandedNote: string | null
  setExpandedNote: (key: string | null) => void
  taskNotes: Record<string, string>
  setTaskNotes: React.Dispatch<React.SetStateAction<Record<string, string>>>
  saveTaskNote: (taskId: number, note: string) => void
  disabled: boolean
}

function NoteSection({ taskKey, taskId, expandedNote, setExpandedNote, taskNotes, setTaskNotes, saveTaskNote, disabled }: NoteSectionProps) {
  const isOpen = expandedNote === taskKey
  const note = taskNotes[taskKey] ?? ''
  const hasNote = !!note.trim()

  return (
    <div className="mt-1">
      <button
        onClick={() => setExpandedNote(isOpen ? null : taskKey)}
        className={`text-xs flex items-center gap-1 transition-colors ${hasNote ? 'text-amber-400 hover:text-amber-300' : 'text-gray-500 hover:text-gray-400'}`}
      >
        📝 {hasNote ? 'Notes' : 'Add note'}
      </button>
      {isOpen && (
        <div className="mt-1.5">
          <textarea
            value={note}
            onChange={e => setTaskNotes(prev => ({ ...prev, [taskKey]: e.target.value }))}
            onBlur={e => saveTaskNote(taskId, e.target.value)}
            disabled={disabled}
            placeholder="Flag priority, blockers, or context for your EOW report — e.g. 'Main priority this week', 'Blocked on client response', 'Skipped — meeting overran'"
            rows={2}
            className="w-full bg-gray-800/60 border border-gray-700 rounded px-2 py-1.5 text-xs text-white placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-amber-500/50 resize-none"
          />
        </div>
      )}
    </div>
  )
}

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
  const [memberName, setMemberName] = useState<string>('')
  const [isAdmin, setIsAdmin] = useState(false)
  const [members, setMembers] = useState<Member[]>([])
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [showReport, setShowReport] = useState(false)
  const [reportText, setReportText] = useState('')
  const [generatingReport, setGeneratingReport] = useState(false)
  const [copied, setCopied] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [savingCell, setSavingCell] = useState<string | null>(null)
  const [reportMeta, setReportMeta] = useState<{ name: string; weekOf: string }>({ name: '', weekOf: '' })
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})
  const toggleSection = (key: string) => setCollapsed(p => ({ ...p, [key]: !p[key] }))
  const [taskNotes, setTaskNotes] = useState<Record<string, string>>({})
  const [expandedNote, setExpandedNote] = useState<string | null>(null)
  const [pastReports, setPastReports] = useState<{id: number; week_of: string; report_text: string}[]>([])
  const [selectedReportId, setSelectedReportId] = useState<number | null>(null)
  const [showExport, setShowExport] = useState(false)
  const [exportFrom, setExportFrom] = useState('')
  const [exportTo, setExportTo] = useState('')
  const [exporting, setExporting] = useState(false)

  const [viewingMonday, setViewingMonday] = useState<Date>(() => getMonday())
  const currentMonday = getMonday()
  const lastMonday = new Date(currentMonday); lastMonday.setDate(currentMonday.getDate() - 7)
  const isCurrentWeek = viewingMonday.toISOString().split('T')[0] === currentMonday.toISOString().split('T')[0]
  const isLastWeek = viewingMonday.toISOString().split('T')[0] === lastMonday.toISOString().split('T')[0]
  const isEditableWeek = isCurrentWeek || isLastWeek
  const monday = viewingMonday
  const weekStart = monday.toISOString().split('T')[0]
  const today = new Date().toLocaleDateString('en-US', { weekday: 'short' })

  function goToPrevWeek() {
    setViewingMonday(d => { const p = new Date(d); p.setDate(d.getDate() - 7); return p })
  }
  function goToNextWeek() {
    if (isCurrentWeek) return
    setViewingMonday(d => { const n = new Date(d); n.setDate(d.getDate() + 7); return n })
  }

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

      const { data: profile } = await supabase.from('profiles').select('role, first_name, last_name').eq('id', user.id).single()
      const admin = profile?.role === 'admin'
      setIsAdmin(admin)
      setMemberName(`${profile?.first_name ?? ''} ${profile?.last_name ?? ''}`.trim())

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
      let completions: { task_id: number; day: string; completed: boolean; time_spent: number }[] = []
      let customTasksData: CustomTask[] = []
      let vaLinksData: VALink[] = []
      let dayOffsData: { day: string; type: string }[] = []
      let taskNotesData: { task_id: number; note: string }[] = []

      if (selectedMemberId) {
        // Admin viewing a member — use service-role API to bypass RLS
        const res = await fetch(`/api/admin/member-tasks?memberId=${selectedMemberId}&weekStart=${weekStart}`)
        if (res.ok) {
          const json = await res.json()
          completions = json.completions
          customTasksData = json.customTasks
          vaLinksData = json.vaLinks
          dayOffsData = json.dayOffs
          taskNotesData = json.taskNotes ?? []
        }
      } else {
        // Member viewing their own data — direct client queries (RLS: auth.uid() = user_id)
        const supabase = createClient()
        const [completionData, linkData, customData, dayOffData, noteData] = await Promise.all([
          supabase.from('task_completions').select('task_id, day, completed, time_spent').eq('user_id', viewingId).eq('week_start', weekStart),
          supabase.from('va_task_links').select('task_id, loom_link, sop_doc_link').eq('user_id', viewingId),
          supabase.from('va_custom_tasks').select('*').eq('user_id', viewingId).eq('active', true),
          supabase.from('day_off').select('day, type').eq('user_id', viewingId).eq('week_start', weekStart),
          supabase.from('va_task_notes').select('task_id, note').eq('user_id', viewingId).eq('week_start', weekStart),
        ])
        completions = completionData.data ?? []
        customTasksData = customData.data ?? []
        vaLinksData = linkData.data ?? []
        dayOffsData = dayOffData.data ?? []
        taskNotesData = noteData.data ?? []
      }

      const map: Record<string, number> = {}
      completions.forEach(row => {
        const mins = row.time_spent ?? (row.completed ? 30 : 0)
        if (row.task_id > 10000) {
          map[`custom-${row.task_id - 10000}-${row.day}`] = mins
        } else {
          map[`${row.task_id}-${row.day}`] = mins
        }
      })
      setCompletions(map)

      const dayOffMap: Record<string, string> = {}
      dayOffsData.forEach(row => { dayOffMap[row.day] = row.type })
      setDayOffs(dayOffMap)

      const links: Record<number, VALink> = {}
      vaLinksData.forEach(row => { links[row.task_id] = row })
      setVALinks(links)

      const drafts: Record<number, { loom: string, sop: string }> = {}
      vaLinksData.forEach(row => { drafts[row.task_id] = { loom: row.loom_link ?? '', sop: row.sop_doc_link ?? '' } })
      setLinkDraft(drafts)

      setCustomTasks(customTasksData)

      const notesMap: Record<string, string> = {}
      taskNotesData.forEach(row => {
        if (row.task_id > 10000) {
          notesMap[`custom-${row.task_id - 10000}`] = row.note ?? ''
        } else {
          notesMap[String(row.task_id)] = row.note ?? ''
        }
      })
      setTaskNotes(notesMap)
    }
    loadData()
  }, [viewingId, weekStart, selectedMemberId])

  async function setTaskTime(taskId: number, day: string, minutes: number) {
    if (!userId || !!selectedMemberId || !isEditableWeek) return
    const supabase = createClient()
    const key = taskId > 10000 ? `custom-${taskId - 10000}-${day}` : `${taskId}-${day}`
    const prev = completions[key] ?? 0
    setSavingCell(key)
    setCompletions(c => ({ ...c, [key]: minutes }))
    const { error } = await supabase.from('task_completions').upsert({
      user_id: userId, task_id: taskId, week_start: weekStart, day,
      time_spent: minutes, completed: minutes > 0,
      completed_at: minutes > 0 ? new Date().toISOString() : null
    }, { onConflict: 'user_id,task_id,week_start,day' })
    if (error) {
      setCompletions(c => ({ ...c, [key]: prev }))
      setSaveError(`Failed to save (${day}): ${error.message}`)
      setTimeout(() => setSaveError(null), 5000)
    }
    setSavingCell(null)
  }

  // EOW tasks use binary toggle
  async function toggleEOWTask(taskId: number, day: string) {
    if (!userId || !!selectedMemberId || !isEditableWeek) return
    const supabase = createClient()
    const key = `${taskId}-${day}`
    const current = completions[key] ?? 0
    const newVal = current > 0 ? 0 : 30
    setCompletions(c => ({ ...c, [key]: newVal }))
    const { error } = await supabase.from('task_completions').upsert({
      user_id: userId, task_id: taskId, week_start: weekStart, day,
      time_spent: newVal, completed: newVal > 0,
      completed_at: newVal > 0 ? new Date().toISOString() : null
    }, { onConflict: 'user_id,task_id,week_start,day' })
    if (error) {
      setCompletions(c => ({ ...c, [key]: current }))
      setSaveError(`Failed to save (${day}): ${error.message}`)
      setTimeout(() => setSaveError(null), 5000)
    }
  }

  async function toggleDayOff(day: string) {
    if (!userId || !!selectedMemberId || !isEditableWeek) return
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

  async function saveTaskNote(taskId: number, note: string) {
    if (!userId || !!selectedMemberId || !isEditableWeek) return
    const supabase = createClient()
    if (note.trim()) {
      await supabase.from('va_task_notes').upsert(
        { user_id: userId, task_id: taskId, week_start: weekStart, note, updated_at: new Date().toISOString() },
        { onConflict: 'user_id,task_id,week_start' }
      )
    } else {
      await supabase.from('va_task_notes').delete()
        .eq('user_id', userId).eq('task_id', taskId).eq('week_start', weekStart)
    }
  }

  async function generateReport() {
    setGeneratingReport(true)
    setShowReport(true)
    setReportText('')

    const allTasks = [
      ...DEFAULT_TASKS.filter(t => !t.is_eow).map(t => ({
        name: t.name,
        days: t.days,
        loggedDays: Object.fromEntries(t.days.map(d => [d, completions[`${t.id}-${d}`] ?? 0])),
        totalMins: t.days.reduce((sum, d) => sum + (completions[`${t.id}-${d}`] ?? 0), 0),
      })),
      ...customTasks.map(t => ({
        name: t.task_name,
        days: t.days,
        loggedDays: Object.fromEntries(t.days.map(d => [d, completions[`custom-${t.id}-${d}`] ?? 0])),
        totalMins: t.days.reduce((sum, d) => sum + (completions[`custom-${t.id}-${d}`] ?? 0), 0),
      })),
    ]

    const name = selectedMemberId
      ? members.find(m => m.id === selectedMemberId)?.first_name + ' ' + members.find(m => m.id === selectedMemberId)?.last_name
      : memberName

    const weekOf = monday.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    const resolvedName = name.trim() || 'Team Member'
    setReportMeta({ name: resolvedName, weekOf })

    const notesContext = Object.entries(taskNotes)
      .filter(([, note]) => note.trim())
      .map(([key, note]) => {
        if (key.startsWith('custom-')) {
          const id = parseInt(key.slice(7))
          const t = customTasks.find(x => x.id === id)
          return t ? `- ${t.task_name}: "${note.trim()}"` : null
        }
        const id = parseInt(key)
        const t = DEFAULT_TASKS.find(x => x.id === id)
        return t ? `- ${t.name}: "${note.trim()}"` : null
      })
      .filter(Boolean) as string[]

    try {
      const res = await fetch('/api/eow-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          memberName: resolvedName,
          weekOf,
          tasks: allTasks,
          weeklyHours,
          dayOffs,
          userId: selectedMemberId ?? userId,
          taskNotes: notesContext,
        }),
      })
      const data = await res.json()
      setReportText(data.report ?? data.error ?? 'Error generating report.')
      setSelectedReportId(null)
    } catch {
      setReportText('Error generating report. Check your API key in Vercel.')
    }
    setGeneratingReport(false)
    // Refresh past reports list so the new one appears
    await loadPastReports(selectedMemberId ?? userId)
  }

  async function loadPastReports(targetId: string | null) {
    if (!targetId) return
    const supabase = createClient()
    const { data } = await supabase
      .from('eow_reports')
      .select('id, week_of, report_text')
      .eq('user_id', targetId)
      .order('created_at', { ascending: false })
      .limit(12)
    setPastReports(data ?? [])
  }

  async function handleExportCSV() {
    if (!viewingId || !exportFrom || !exportTo) return
    setExporting(true)

    // Snap a YYYY-MM-DD string to its Monday as a local-midnight Date object.
    // Must NOT use toISOString() here — that converts to UTC and shifts the date for PHT users.
    function toLocalMonday(s: string): Date {
      const [y, mo, d] = s.split('-').map(Number)
      const date = new Date(y, mo - 1, d) // local midnight, no timezone shift
      const day = date.getDay()
      date.setDate(date.getDate() + (day === 0 ? -6 : 1 - day))
      date.setHours(0, 0, 0, 0)
      return date
    }

    const startDate = toLocalMonday(exportFrom)
    const endDate = toLocalMonday(exportTo)

    // Collect week_starts using the same method as getMonday() in this file:
    // local Monday midnight → toISOString() → split T[0] (gives Sunday UTC for PHT users,
    // which is exactly what the DB stores).
    const weekStarts: string[] = []
    const cur = new Date(startDate)
    while (cur <= endDate) {
      weekStarts.push(cur.toISOString().split('T')[0])
      cur.setDate(cur.getDate() + 7)
    }

    const supabase = createClient()
    const { data } = await supabase
      .from('task_completions')
      .select('task_id, day, time_spent, week_start')
      .eq('user_id', viewingId)
      .in('week_start', weekStarts)
      .gt('time_spent', 0)
    const rows = data ?? []

    const allTasks = [
      ...DEFAULT_TASKS.map(t => ({ key: String(t.id), name: t.name, sop: t.sop_number, days: t.days.join('/'), timeWindow: t.time_window, estTime: t.est_time })),
      ...customTasks.map(t => ({ key: `custom-${t.id}`, name: t.task_name, sop: 'Custom', days: t.days?.join('/') ?? 'Mon–Fri', timeWindow: t.time_window ?? '', estTime: t.est_time ?? '' })),
    ]

    const resolvedName = selectedMemberId
      ? `${members.find(m => m.id === selectedMemberId)?.first_name ?? ''} ${members.find(m => m.id === selectedMemberId)?.last_name ?? ''}`.trim()
      : memberName

    // Format a local-midnight Date as "MMM D" (e.g. "Mar 16")
    const fmtShort = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    const fmtFull = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    const toLocalStr = (d: Date) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
    const startStr = toLocalStr(startDate)
    const endStr = toLocalStr(endDate)

    // Title
    const lines: string[] = [
      `${resolvedName.toUpperCase()} — FULL TASK LOG  |  ${fmtFull(startDate)} – ${fmtFull(endDate)}`,
      '',
      ['Week', 'SOP #', 'Task Name', 'Schedule', 'Time Window', 'Est. Time', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun', 'Total (mins)', 'Total (hrs)'].join(','),
    ]

    let grandTotal = 0

    // One block per week
    for (let wi = 0; wi < weekStarts.length; wi++) {
      const ws = weekStarts[wi]
      // Derive Monday date from week_start (which is Sunday UTC for PHT = Monday local)
      const monDate = new Date(startDate)
      monDate.setDate(startDate.getDate() + wi * 7)
      const sunDate = new Date(monDate)
      sunDate.setDate(monDate.getDate() + 6)
      const weekLabel = `${fmtShort(monDate)}–${fmtShort(sunDate)}`

      // Calculate week total
      const weekRows = rows.filter(r => r.week_start === ws)
      const weekTotal = weekRows.reduce((s, r) => s + (r.time_spent ?? 0), 0)

      // Week header row
      lines.push(`${weekLabel}  |  Total: ${(weekTotal / 60).toFixed(1)} hrs`)

      const dTotals = new Array(7).fill(0)

      for (const task of allTasks) {
        const tid = task.key.startsWith('custom-') ? 10000 + parseInt(task.key.replace('custom-', '')) : parseInt(task.key)
        const dMins = DAYS.map(d => rows.find(r => r.task_id === tid && r.week_start === ws && r.day === d)?.time_spent ?? 0)
        const total = dMins.reduce((a, b) => a + b, 0)
        if (!total) continue
        dMins.forEach((m, i) => { dTotals[i] += m })
        lines.push([
          weekLabel,
          task.sop,
          `"${task.name}"`,
          `"${task.days}"`,
          task.timeWindow,
          task.estTime,
          ...dMins.map(m => m || ''),
          total,
          (total / 60).toFixed(1),
        ].join(','))
      }

      // Week subtotal row
      lines.push(['', '', 'WEEK TOTAL', '', '', '', ...dTotals.map(m => m ? (m / 60).toFixed(1) : ''), (weekTotal / 60).toFixed(1), (weekTotal / 60).toFixed(1)].join(','))
      lines.push('') // blank row between weeks

      grandTotal += weekTotal
    }

    lines.push(['', '', 'GRAND TOTAL', '', '', '', '', '', '', '', '', '', '', grandTotal, (grandTotal / 60).toFixed(1)].join(','))

    const csv = '\ufeff' + lines.join('\n') // BOM for Excel
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `tasksheet-${resolvedName.replace(/\s+/g, '-')}-${startStr}-to-${endStr}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    setExporting(false)
    setShowExport(false)
  }

  async function openPastReports() {
    const targetId = selectedMemberId ?? userId
    setShowReport(true)
    setReportText('')
    setSelectedReportId(null)
    setGeneratingReport(true)
    await loadPastReports(targetId)
    setGeneratingReport(false)
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
    <>
    <div className="min-h-screen bg-gray-950 text-white">
      <nav className="border-b border-gray-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard" className="text-gray-400 hover:text-white text-sm">← Dashboard</Link>
          <h1 className="text-lg font-bold">My Task Sheet</h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => { setShowExport(v => !v); setExportFrom(''); setExportTo('') }}
            className="text-sm bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors"
          >
            Export CSV
          </button>
          <button
            onClick={generateReport}
            className="text-sm bg-purple-700 hover:bg-purple-600 text-white px-4 py-2 rounded-lg transition-colors"
          >
            Generate EOW Report
          </button>
        </div>
      </nav>

      {showExport && (
        <div className="bg-gray-900 border-b border-gray-800 px-6 py-4">
          <div className="max-w-5xl mx-auto">
            <p className="text-xs text-gray-400 mb-3">Select the date range to export. Includes all tasks with logged time.</p>
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-2">
                <label className="text-xs text-gray-400 whitespace-nowrap">From week of</label>
                <input
                  type="date"
                  value={exportFrom}
                  onChange={e => setExportFrom(e.target.value)}
                  className="bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-xs text-gray-400 whitespace-nowrap">To week of</label>
                <input
                  type="date"
                  value={exportTo}
                  onChange={e => setExportTo(e.target.value)}
                  className="bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <button
                onClick={handleExportCSV}
                disabled={!exportFrom || !exportTo || exporting}
                className="text-sm bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white px-4 py-2 rounded-lg"
              >
                {exporting ? 'Downloading...' : 'Download CSV'}
              </button>
              <button onClick={() => setShowExport(false)} className="text-xs text-gray-500 hover:text-gray-400">Cancel</button>
            </div>
          </div>
        </div>
      )}

      <QuickNav />

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

        {/* Save error toast */}
        {saveError && (
          <div className="mb-4 p-3 bg-red-900/50 border border-red-700 rounded-xl text-sm text-red-300 flex items-center justify-between">
            <span>{saveError}</span>
            <button onClick={() => setSaveError(null)} className="ml-4 text-red-400 hover:text-white">✕</button>
          </div>
        )}

        {/* Week Navigator */}
        <div className="flex items-center justify-between bg-gray-800/50 border border-gray-700/50 rounded-xl px-4 py-2.5 mb-4">
          <button onClick={goToPrevWeek} className="text-gray-400 hover:text-white px-2 py-1 rounded transition-colors text-lg leading-none">←</button>
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-gray-200">
              Week of {monday.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
            </span>
            {!isCurrentWeek && (
              <>
                {!isEditableWeek && (
                  <span className="text-xs bg-amber-900/40 text-amber-300 border border-amber-700/40 px-2 py-0.5 rounded-full">Read-only</span>
                )}
                <button onClick={() => setViewingMonday(getMonday())} className="text-xs text-purple-400 hover:text-purple-300 transition-colors">Back to current week</button>
              </>
            )}
          </div>
          <button onClick={goToNextWeek} disabled={isCurrentWeek} className={`px-2 py-1 rounded transition-colors text-lg leading-none ${isCurrentWeek ? 'text-gray-700 cursor-not-allowed' : 'text-gray-400 hover:text-white'}`}>→</button>
        </div>

        {/* Guidelines (collapsible) */}
        <div className="mb-4">
          <button
            onClick={() => toggleSection('guidelines')}
            className="w-full flex items-center justify-between bg-gray-800/60 border border-gray-700/60 rounded-xl px-4 py-2.5 hover:bg-gray-800 transition-colors"
          >
            <div className="flex items-center gap-2.5">
              <span className="text-sm font-semibold text-gray-200">Guidelines</span>
              <span className="text-xs font-medium bg-red-900/50 text-red-300 border border-red-700/40 px-2 py-0.5 rounded-full">Must Read</span>
            </div>
            <span className="text-gray-500 text-sm">{collapsed['guidelines'] ? '▲' : '▼'}</span>
          </button>

          {collapsed['guidelines'] && (
            <div className="mt-2 space-y-2">
              <div className="bg-blue-900/30 border border-blue-700/50 rounded-xl p-4">
                <h3 className="font-semibold text-blue-300 mb-2">The Core 4 Rules</h3>
                <ol className="space-y-1">
                  {[
                    'Tasks are your full responsibility unless stated otherwise.',
                    'Complete tasks within the time windows (8am–12pm, 1pm–6pm PHT). Use World Time Buddy.',
                    "If you can't complete a task, message the Founder or Manager immediately.",
                    'Anything less than the stated process is grounds for performance review.',
                  ].map((rule, i) => (
                    <li key={i} className="text-sm text-blue-200/80 flex gap-2">
                      <span className="font-bold">{i + 1}.</span><span>{rule}</span>
                    </li>
                  ))}
                </ol>
              </div>

              <div className="bg-yellow-900/20 border border-yellow-700/40 rounded-xl p-3">
                <p className="text-sm text-yellow-200/80">
                  <span className="font-semibold text-yellow-300">Task Completion Clarity:</span> A task is only complete after the Communication Text has been sent (if one is required). Failure to send = grounds for performance review.
                </p>
              </div>

              {!selectedMemberId && (
                <div className="bg-teal-900/20 border border-teal-700/40 rounded-xl p-3 flex gap-3 items-start">
                  <span className="text-teal-400 text-base mt-0.5">🗓</span>
                  <p className="text-sm text-teal-200/80 leading-relaxed">
                    <span className="font-semibold text-teal-300">This sheet resets every Monday at 6pm PHT.</span>{' '}
                    You can still log last week&apos;s tasks until 5:59pm — after that it starts fresh.{' '}
                    <span className="font-semibold text-teal-300">EOW reports must be submitted by Monday 5:59pm PHT.</span>{' '}
                    Reports submitted after the reset will not be counted for the previous week.
                  </p>
                </div>
              )}
            </div>
          )}
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


        {/* ── MORNING TASKS ── */}
        <div className="mb-6">
          <button onClick={() => toggleSection('morning')} className="w-full flex items-center justify-between px-4 py-2.5 bg-blue-950/40 border border-blue-800/50 rounded-xl mb-3 hover:bg-blue-950/60 transition-colors">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-400 flex-shrink-0"></span>
              <span className="font-semibold text-blue-300 text-sm">Morning Tasks</span>
              <span className="text-xs text-blue-400/60">{regularTasks.length} tasks · daily</span>
            </div>
            <span className="text-blue-400 text-xs">{collapsed.morning ? '▼ Show' : '▲ Hide'}</span>
          </button>

          {!collapsed.morning && (
            <div>
            {!selectedMemberId && (
              <p className="text-xs text-gray-500 mb-2 px-1">
                Taking a day off or half day? Click the day header to mark as <span className="text-red-400 font-medium">OFF</span> → click again for <span className="text-yellow-400 font-medium">½ Day</span> → click again to clear.
              </p>
            )}
            <div className="overflow-x-auto border border-blue-900/40 rounded-xl">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-blue-900/40 bg-blue-950/20">
                    <th className="text-left py-2 pr-4 pl-4 text-blue-400/70 font-medium w-8">#</th>
                    <th className="text-left py-2 pr-4 text-blue-400/70 font-medium">Task</th>
                    <th className="text-left py-2 pr-4 text-blue-400/70 font-medium hidden md:table-cell">Window</th>
                    <th className="text-left py-2 pr-4 text-blue-400/70 font-medium hidden md:table-cell">Est.</th>
                    {DAYS.map(d => {
                      const isOff = dayOffs[d] === 'off'
                      const isHalf = dayOffs[d] === 'half'
                      return (
                        <th key={d} className="text-center py-1 px-1 font-medium w-12">
                          {!selectedMemberId ? (
                            <button onClick={() => toggleDayOff(d)} title="Click to mark day off / half day"
                              className={`w-full rounded-lg px-1 py-1.5 transition-colors ${isOff ? 'bg-red-900/50 text-red-400' : isHalf ? 'bg-yellow-900/50 text-yellow-400' : d === today ? 'text-blue-400 hover:bg-gray-800' : 'text-gray-400 hover:bg-gray-800'}`}>
                              <div className="font-medium">{d}</div>
                              <div className="text-[10px] mt-0.5">{isOff ? 'OFF' : isHalf ? '½' : ''}</div>
                            </button>
                          ) : (
                            <div className={`text-[10px] ${isOff ? 'text-red-400' : isHalf ? 'text-yellow-400' : 'text-transparent'}`}>{isOff ? 'OFF' : isHalf ? '½' : '·'}</div>
                          )}
                        </th>
                      )
                    })}
                  </tr>
                </thead>
                <tbody>
                  {regularTasks.map(task => (
                    <tr key={task.id} className="border-b border-blue-900/20 last:border-0">
                      <td className="py-3 pr-4 pl-4 text-blue-400/50 align-top">{task.sop_number}</td>
                      <td className="py-3 pr-4 align-top">
                        <p className="font-medium">{task.name}</p>
                        <p className="text-xs text-gray-400 hidden sm:block">{task.description}</p>
                        <div className="flex items-center gap-3 mt-1 flex-wrap">
                          {task.loom_link && <a href={task.loom_link} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-400 hover:text-blue-300">Watch tutorial →</a>}
                          {task.doc_link && <a href={task.doc_link} target="_blank" rel="noopener noreferrer" className="text-xs text-purple-400 hover:text-purple-300">View SOP →</a>}
                          {task.form_link && <a href={task.form_link} target="_blank" rel="noopener noreferrer" className="text-xs text-green-400 hover:text-green-300">Submit form →</a>}
                        </div>
                        <LinkSection taskId={task.id} />
                        <NoteSection taskKey={String(task.id)} taskId={task.id} expandedNote={expandedNote} setExpandedNote={setExpandedNote} taskNotes={taskNotes} setTaskNotes={setTaskNotes} saveTaskNote={saveTaskNote} disabled={!!selectedMemberId} />
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
                              <select value={mins} onChange={e => setTaskTime(task.id, d, parseInt(e.target.value))} disabled={!!selectedMemberId}
                                className={`text-xs rounded px-1 py-0.5 border focus:outline-none w-14 ${timeBadgeClass(mins)}`}>
                                {TIME_OPTIONS.map(t => <option key={t} value={t} className="bg-gray-900 text-white">{formatTime(t)}</option>)}
                              </select>
                            ) : <span className="text-gray-700 text-xs">—</span>}
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            </div>
          )}
        </div>

        {/* ── CUSTOM TASKS ── */}
        <div className="mb-6">
          <button onClick={() => toggleSection('custom')} className="w-full flex items-center justify-between px-4 py-2.5 bg-teal-950/40 border border-teal-800/50 rounded-xl mb-3 hover:bg-teal-950/60 transition-colors">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-teal-400 flex-shrink-0"></span>
              <span className="font-semibold text-teal-300 text-sm">My Custom Tasks</span>
              <span className="text-xs text-teal-400/60">{customTasks.length} tasks</span>
            </div>
            <div className="flex items-center gap-2">
              {!selectedMemberId && (
                <button onClick={e => { e.stopPropagation(); setShowAddForm(!showAddForm) }}
                  className="text-xs bg-teal-800/60 hover:bg-teal-700/60 text-teal-300 px-2.5 py-1 rounded-lg transition-colors">
                  + Add
                </button>
              )}
              <span className="text-teal-400 text-xs">{collapsed.custom ? '▼ Show' : '▲ Hide'}</span>
            </div>
          </button>

          {!collapsed.custom && (
            <div>

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
                        <NoteSection taskKey={`custom-${task.id}`} taskId={task.id + 10000} expandedNote={expandedNote} setExpandedNote={setExpandedNote} taskNotes={taskNotes} setTaskNotes={setTaskNotes} saveTaskNote={saveTaskNote} disabled={!!selectedMemberId} />
                      </td>
                      <td className="py-3 pr-4 text-gray-400 hidden md:table-cell align-top text-xs">{task.est_time}</td>
                      {DAYS.map(d => {
                        const isTaskDay = task.days.includes(d)
                        const isOff = dayOffs[d] === 'off'
                        const key = `custom-${task.id}-${d}`
                        const mins = completions[key] ?? 0
                        const isSaving = savingCell === key
                        return (
                          <td key={d} className={`text-center py-3 px-1 align-top ${isOff ? 'opacity-25' : ''}`}>
                            {isTaskDay && !isOff ? (
                              <select
                                value={mins}
                                onChange={e => setTaskTime(task.id + 10000, d, parseInt(e.target.value))}
                                disabled={!!selectedMemberId || isSaving}
                                className={`text-xs rounded px-1 py-0.5 border focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer w-14 ${isSaving ? 'opacity-50' : ''} ${timeBadgeClass(mins)} ${selectedMemberId ? 'cursor-default' : ''}`}
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
          )}
        </div>

        {/* ── EOW TASKS ── */}
        <div className="mb-6">
          <button onClick={() => toggleSection('eow')} className="w-full flex items-center justify-between px-4 py-2.5 bg-purple-950/40 border border-purple-800/50 rounded-xl mb-3 hover:bg-purple-950/60 transition-colors">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-purple-400 flex-shrink-0"></span>
              <span className="font-semibold text-purple-300 text-sm">End of Week Tasks</span>
              <span className="text-xs text-purple-400/60">{eowTasks.length} tasks · Fridays</span>
            </div>
            <span className="text-purple-400 text-xs">{collapsed.eow ? '▼ Show' : '▲ Hide'}</span>
          </button>

          {!collapsed.eow && (
            <div className="overflow-x-auto border border-purple-900/40 rounded-xl">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-purple-900/40 bg-purple-950/20">
                    <th className="text-left py-2 pr-4 pl-4 text-purple-400/70 font-medium w-8">#</th>
                    <th className="text-left py-2 pr-4 text-purple-400/70 font-medium">Task</th>
                    <th className="text-left py-2 pr-4 text-purple-400/70 font-medium hidden md:table-cell">Window</th>
                    <th className="text-left py-2 pr-4 text-purple-400/70 font-medium hidden md:table-cell">Est.</th>
                    {DAYS.map(d => (
                      <th key={d} className={`text-center py-2 px-1 font-medium w-12 ${d === 'Fri' ? 'text-purple-400' : 'text-gray-600'}`}>{d}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {eowTasks.map(task => (
                    <tr key={task.id} className="border-b border-purple-900/20 last:border-0">
                      <td className="py-3 pr-4 pl-4 text-purple-400/50 align-top">{task.sop_number}</td>
                      <td className="py-3 pr-4 align-top">
                        <p className="font-medium">{task.name}</p>
                        <p className="text-xs text-gray-400 hidden sm:block">{task.description}</p>
                        <div className="flex items-center gap-3 mt-1 flex-wrap">
                          {task.loom_link && <a href={task.loom_link} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-400 hover:text-blue-300">Watch tutorial →</a>}
                          {task.doc_link && <a href={task.doc_link} target="_blank" rel="noopener noreferrer" className="text-xs text-purple-400 hover:text-purple-300">View SOP →</a>}
                          {task.form_link && <a href={task.form_link} target="_blank" rel="noopener noreferrer" className="text-xs text-green-400 hover:text-green-300">Submit form →</a>}
                        </div>
                        <NoteSection taskKey={String(task.id)} taskId={task.id} expandedNote={expandedNote} setExpandedNote={setExpandedNote} taskNotes={taskNotes} setTaskNotes={setTaskNotes} saveTaskNote={saveTaskNote} disabled={!!selectedMemberId} />
                      </td>
                      <td className="py-3 pr-4 text-gray-400 hidden md:table-cell align-top text-xs">{task.time_window}</td>
                      <td className="py-3 pr-4 text-gray-400 hidden md:table-cell align-top text-xs">{task.est_time}</td>
                      {DAYS.map(d => {
                        const isTaskDay = task.days.includes(d)
                        const isOff = dayOffs[d] === 'off'
                        const key = `${task.id}-${d}`
                        const checked = (completions[key] ?? 0) > 0
                        return (
                          <td key={d} className={`text-center py-3 px-1 align-top ${isOff ? 'opacity-25' : ''}`}>
                            {isTaskDay && !isOff ? (
                              <button
                                onClick={() => toggleEOWTask(task.id, d)}
                                disabled={!!selectedMemberId}
                                className={`w-6 h-6 rounded border-2 transition-colors ${checked ? 'bg-purple-600 border-purple-500' : 'border-gray-600 hover:border-purple-500'}`}
                              >
                                {checked && <span className="text-white text-xs">✓</span>}
                              </button>
                            ) : <span className="text-gray-700 text-xs">—</span>}
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* EOW Report Button */}
        {isFriday && (
          <div className="bg-purple-950/30 border border-purple-800/40 rounded-xl p-4 mb-6 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-purple-300">It&apos;s Friday!</p>
              <p className="text-xs text-purple-400/70">Generate your end-of-week performance report.</p>
            </div>
            <button onClick={generateReport} className="text-sm bg-purple-700 hover:bg-purple-600 text-white px-4 py-2 rounded-lg transition-colors">
              Generate Report
            </button>
          </div>
        )}
      </main>
    </div>

      {/* EOW Report Modal */}
      {showReport && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
              <h2 className="font-semibold text-lg">EOW Performance Report</h2>
              <div className="flex items-center gap-2">
                {reportText && !generatingReport && (
                  <>
                    <button
                      onClick={async () => {
                        try {
                          const html = buildSemanticHtml(reportText)
                          await navigator.clipboard.write([
                            new ClipboardItem({
                              'text/html': new Blob([html], { type: 'text/html' }),
                              'text/plain': new Blob([reportText], { type: 'text/plain' }),
                            })
                          ])
                        } catch {
                          await navigator.clipboard.writeText(reportText)
                        }
                        setCopied(true)
                        setTimeout(() => setCopied(false), 2000)
                      }}
                      className="text-sm bg-gray-700 hover:bg-gray-600 text-white px-3 py-1.5 rounded-lg transition-colors"
                    >
                      {copied ? 'Copied!' : 'Copy for Google Docs'}
                    </button>
                  </>
                )}
                <button
                  onClick={() => setShowReport(false)}
                  className="text-gray-400 hover:text-white text-lg px-2"
                >✕</button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-4">
              {generatingReport ? (
                <div className="flex items-center gap-3 text-gray-400 py-8 justify-center">
                  <div className="w-4 h-4 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
                  <span>Generating report...</span>
                </div>
              ) : (
                <div className="text-sm text-gray-200 leading-relaxed select-all">
                  {reportText.split('\n').map((line, i) => {
                    const t = line.trim()
                    if (!t) return <br key={i} />
                    const bold = (s: string) => s.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                    const headerMatch = t.match(/^\*\*(.*?)\*\*$/)
                    if (headerMatch) {
                      const text = headerMatch[1]
                      return text.toLowerCase().includes('eow performance') || text.toLowerCase().includes('week of')
                        ? <h2 key={i} className="text-base font-bold text-white mt-4 mb-1 border-b border-gray-700 pb-1" dangerouslySetInnerHTML={{ __html: bold(text) }} />
                        : <h3 key={i} className="text-sm font-bold text-purple-300 uppercase tracking-wide mt-4 mb-1" dangerouslySetInnerHTML={{ __html: bold(text) }} />
                    }
                    if (t.startsWith('|') && t.endsWith('|')) {
                      if (/^\|[\s\-|]+\|$/.test(t)) return null
                      const cells = t.slice(1, -1).split('|').map(c => c.trim())
                      return (
                        <div key={i} className="grid gap-px mb-px" style={{ gridTemplateColumns: `repeat(${cells.length}, 1fr)` }}>
                          {cells.map((c, j) => (
                            <span key={j} className="bg-gray-800 px-2 py-1 text-xs text-gray-200 border border-gray-700">{c}</span>
                          ))}
                        </div>
                      )
                    }
                    if (t.startsWith('- ') || t.startsWith('• ')) {
                      return <p key={i} className="ml-4 before:content-['•'] before:mr-2 before:text-purple-400" dangerouslySetInnerHTML={{ __html: bold(t.slice(2)) }} />
                    }
                    if (t.startsWith('  - ')) {
                      return <p key={i} className="ml-8 text-gray-400 before:content-['–'] before:mr-2" dangerouslySetInnerHTML={{ __html: bold(t.slice(4)) }} />
                    }
                    return <p key={i} className="mb-1" dangerouslySetInnerHTML={{ __html: bold(t) }} />
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
