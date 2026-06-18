'use client'

import React, { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import QuickNav from '@/components/nav/QuickNav'
import { brand } from '@/config/brand'
import { fireAuditLog } from '@/lib/audit/clientLog'

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

const DEFAULT_TASKS = [
  { id: 1, sop_number: '1',     name: 'Understanding Your Core Sheet',    description: 'Review and understand the updates in your core tracking sheet',            days: ['Mon','Tue','Wed','Thu','Fri'], time_window: '8 PM EST', est_time: '10 mins', is_eow: false, is_onetime: true,  loom_link: 'https://www.loom.com/share/6407bed964d14db8a26374c028bc4970',    doc_link: 'https://docs.google.com/document/d/1NpFOIAjPa_pKZ8o6L7qfyCj4XSpAwv_St1H1GfsCuSQ/edit?tab=t.0',                                                                                    form_link: null },
  { id: 2, sop_number: '2',     name: 'Daily and Weekly SOP Creation',    description: 'Create and update your daily and weekly standard operating procedures',     days: ['Mon','Tue','Wed','Thu','Fri'], time_window: '8 PM EST', est_time: '10 mins', is_eow: false, is_onetime: true,  loom_link: 'https://www.loom.com/share/6ae36b6a3e074b5e8c525e2d79b88572',    doc_link: 'https://docs.google.com/document/d/10RIeXKvyUjhCyMcR2ERnsTyuntfhBkPSe6SW9fvuQMw/edit?tab=t.tkyxfcvf5q4m',                                                                          form_link: null },
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

// One calm style: empty vs filled. (Dropped the 4-color yellow/blue/green/purple
// tiers — they were visual noise; the number + time label convey the amount.)
function timeBadgeClass(mins: number): string {
  if (!mins) return 'bg-gray-800/40 border-gray-700/60 text-gray-600'
  return 'bg-green-900/25 border-green-800/50 text-green-200'
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
  <footer>Generated via ${brand.productName} · ${memberName} · ${weekOf}</footer>
  </body></html>`
}

type CustomTask = {
  id: number
  task_name: string
  description: string
  days: string[]
  time_window: string
  est_time: string
  est_minutes?: number | null
  loom_link: string
  sop_doc_link: string
  is_role?: boolean
  parent_id?: number | null
}

type VALink = {
  task_id: number
  loom_link: string
  sop_doc_link: string
}

function getMonday() {
  // Anchor to PHT so the computed week_start matches the server and DB
  // regardless of the viewer's browser timezone.
  const PHT = 8 * 60 * 60 * 1000
  const phtNow = new Date(Date.now() + PHT)
  const day = phtNow.getUTCDay()
  const diff = day === 0 ? -6 : 1 - day
  phtNow.setUTCDate(phtNow.getUTCDate() + diff)
  phtNow.setUTCHours(0, 0, 0, 0)
  return new Date(phtNow.getTime() - PHT)
}

type Member = { id: string; first_name: string; last_name: string; email: string }

function TimerCell({ mins, disabled, onSave, completionKey }: {
  mins: number
  disabled: boolean
  onSave: (mins: number) => void
  completionKey: string
}) {
  const storageKey = `timer-${completionKey}`
  const [inputVal, setInputVal] = useState(mins > 0 ? String(mins) : '')
  const [timerStart, setTimerStart] = useState<number | null>(null)
  const [elapsed, setElapsed] = useState(0)
  // Mode: 'manual' = user types minutes; 'timer' = stopwatch. Default 'manual'
  // (most VAs log a known duration). The toggle is just affordance; the timer
  // button still works in either mode if visible.
  const [mode, setMode] = useState<'manual' | 'timer'>('manual')

  useEffect(() => { setInputVal(mins > 0 ? String(mins) : '') }, [mins])

  // Restore timer from localStorage on mount (survives page reload). If a
  // timer is already running for this cell, force the mode to 'timer'.
  useEffect(() => {
    const saved = localStorage.getItem(storageKey)
    if (saved) {
      const start = parseInt(saved)
      setTimerStart(start)
      setElapsed(Math.floor((Date.now() - start) / 1000))
      setMode('timer')
    }
  }, [storageKey])

  useEffect(() => {
    if (!timerStart) return
    const iv = setInterval(() => setElapsed(Math.floor((Date.now() - timerStart) / 1000)), 1000)
    return () => clearInterval(iv)
  }, [timerStart])

  function commit(val: string) {
    onSave(parseInt(val) || 0)
  }

  function startTimer() {
    const now = Date.now()
    localStorage.setItem(storageKey, String(now))
    setTimerStart(now)
    setElapsed(0)
    setMode('timer')
  }

  function stopTimer() {
    if (!timerStart) return
    const addedMins = Math.max(1, Math.round((Date.now() - timerStart) / 60000))
    localStorage.removeItem(storageKey)
    setTimerStart(null)
    setElapsed(0)
    const newMins = mins + addedMins
    setInputVal(String(newMins))
    onSave(newMins)
  }

  const elapsedDisplay = `${Math.floor(elapsed / 60)}:${String(elapsed % 60).padStart(2, '0')}`

  return (
    <div className="flex flex-col items-center gap-0.5">
      {!disabled && (
        <div className="flex items-center gap-0 text-[9px] leading-none mb-0.5 rounded border border-gray-800 overflow-hidden">
          <button
            type="button"
            onClick={() => setMode('manual')}
            disabled={!!timerStart}
            className={`px-1.5 py-0.5 transition-colors ${mode === 'manual' ? 'bg-gray-700 text-white' : 'text-gray-500 hover:text-gray-300'} ${timerStart ? 'opacity-40 cursor-not-allowed' : ''}`}
            title="Manual entry: type minutes directly"
          >Manual</button>
          <button
            type="button"
            onClick={() => setMode('timer')}
            className={`px-1.5 py-0.5 transition-colors ${mode === 'timer' ? 'bg-gray-700 text-white' : 'text-gray-500 hover:text-gray-300'}`}
            title="Timer: start a stopwatch"
          >Timer</button>
        </div>
      )}
      <input
        type="number"
        min="0"
        value={inputVal}
        placeholder="—"
        onChange={e => setInputVal(e.target.value)}
        onBlur={() => commit(inputVal)}
        onKeyDown={e => { if (e.key === 'Enter') { commit(inputVal); (e.target as HTMLInputElement).blur() } }}
        disabled={disabled || !!timerStart}
        className={`w-14 text-center text-sm rounded-md px-1 py-1 border focus:outline-none focus:ring-1 focus:ring-blue-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${timeBadgeClass(mins)} ${disabled || timerStart ? 'opacity-70 cursor-default' : ''}`}
      />
      {mins > 0 && <span className="text-[9px] text-gray-500 leading-none">{formatTime(mins)}</span>}
      {!disabled && mode === 'timer' && (
        timerStart ? (
          <button onClick={stopTimer} title="Stop timer" className="text-[10px] text-red-400 hover:text-red-300 font-mono leading-none transition-colors">
            ■ {elapsedDisplay}
          </button>
        ) : (
          <button onClick={startTimer} title="Start timer" className="text-[10px] text-gray-600 hover:text-green-400 leading-none transition-colors">
            ▶ track
          </button>
        )
      )}
    </div>
  )
}

type NoteSectionProps = {
  taskKey: string
  taskId: number
  expandedNote: string | null
  setExpandedNote: (key: string | null) => void
  taskNotes: Record<string, string>
  setTaskNotes: React.Dispatch<React.SetStateAction<Record<string, string>>>
  saveTaskNote: (taskId: number, note: string) => Promise<string | null>
  disabled: boolean
}

function NoteSection({ taskKey, taskId, expandedNote, setExpandedNote, taskNotes, setTaskNotes, saveTaskNote, disabled }: NoteSectionProps) {
  const isOpen = expandedNote === taskKey
  const note = taskNotes[taskKey] ?? ''
  const hasNote = !!note.trim()
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | string>('idle')

  async function doSave(value: string) {
    setSaveStatus('saving')
    const err = await saveTaskNote(taskId, value)
    setSaveStatus(err ?? 'saved')
    if (!err) setTimeout(() => setSaveStatus('idle'), 2000)
  }

  function handleChange(value: string) {
    setTaskNotes(prev => ({ ...prev, [taskKey]: value }))
    setSaveStatus('idle')
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => doSave(value), 800)
  }

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
            onChange={e => handleChange(e.target.value)}
            onBlur={e => doSave(e.target.value)}
            disabled={disabled}
            placeholder="Flag priority, blockers, or context for your EOW report — e.g. 'Main priority this week', 'Blocked on client response', 'Skipped — meeting overran'"
            rows={2}
            className="w-full bg-gray-800/60 border border-gray-700 rounded px-2 py-1.5 text-xs text-white placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-amber-500/50 resize-none"
          />
          {saveStatus === 'saving' && <p className="text-xs text-gray-500 mt-0.5">Saving...</p>}
          {saveStatus === 'saved' && <p className="text-xs text-green-500 mt-0.5">Saved ✓</p>}
          {saveStatus !== 'idle' && saveStatus !== 'saving' && saveStatus !== 'saved' && (
            <p className="text-xs text-red-400 mt-0.5">Error: {saveStatus}</p>
          )}
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
  // What the add form is creating: a plain task, a role, or a sub-task under a role.
  const [addContext, setAddContext] = useState<{ is_role?: boolean; parent_id?: number | null }>({})
  const [expandedRoles, setExpandedRoles] = useState<Set<number>>(new Set())
  const [newTask, setNewTask] = useState({ task_name: '', description: '', days: ['Mon','Tue','Wed','Thu','Fri'], time_window: '', est_time: '', est_minutes: '' })
  const [editingTaskId, setEditingTaskId] = useState<number | null>(null)
  const [editDraft, setEditDraft] = useState({ task_name: '', description: '', days: [] as string[], time_window: '', est_time: '' })
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
  // Reference month for the invoice-period quick-pick buttons. Defaults to
  // the previous month if today is in the first half of the month (typical
  // case: invoicing on the 1st-15th for the month that just ended); current
  // month otherwise. Use PHT-anchored "today" so VAs/admins land on the
  // expected month no matter the browser TZ.
  const [presetMonth, setPresetMonth] = useState<string>(() => {
    const phtNow = new Date(Date.now() + 8 * 60 * 60 * 1000)
    const y = phtNow.getUTCFullYear()
    const m = phtNow.getUTCMonth() + 1 // 1..12
    const d = phtNow.getUTCDate()
    const refY = d <= 15 && m === 1 ? y - 1 : y
    const refM = d <= 15 ? (m === 1 ? 12 : m - 1) : m
    return `${refY}-${String(refM).padStart(2, '0')}`
  })
  const [recentDays, setRecentDays] = useState<Array<{ date: string; day: string; mins: number }>>([])

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
      const { data: { session } } = await supabase.auth.getSession()
      const user = session?.user ?? null
      if (!user) return
      setUserId(user.id)

      const { data: profile } = await supabase.from('profiles').select('role, first_name, last_name').eq('id', user.id).single()
      const admin = profile?.role === 'admin' || profile?.role === 'super_admin'
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
        const [completionData, linkData, customData, dayOffData, noteData, onetimeData] = await Promise.all([
          supabase.from('task_completions').select('task_id, day, completed, time_spent').eq('user_id', viewingId).eq('week_start', weekStart),
          supabase.from('va_task_links').select('task_id, loom_link, sop_doc_link').eq('user_id', viewingId),
          supabase.from('va_custom_tasks').select('*').eq('user_id', viewingId)
          .lte('created_week_start', weekStart)
          .or(`deactivated_week_start.is.null,deactivated_week_start.gt.${weekStart}`),
          supabase.from('day_off').select('day, type').eq('user_id', viewingId).eq('week_start', weekStart),
          supabase.from('va_task_notes').select('task_id, note').eq('user_id', viewingId).eq('week_start', weekStart),
          supabase.from('task_completions').select('task_id, day, completed, time_spent').eq('user_id', viewingId).eq('week_start', '1970-01-01'),
        ])
        completions = [...(completionData.data ?? []), ...(onetimeData.data ?? [])]
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

  // Load last 5 working days (PHT, excludes today, any day-of-week with logged time)
  useEffect(() => {
    if (!viewingId) return
    async function loadRecentDays() {
      const PHT = 8 * 60 * 60 * 1000
      const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
      const phtNow = new Date(Date.now() + PHT)

      // Walk back from yesterday over a 28-day window (newest → oldest)
      const candidates: Array<{ date: Date; weekStart: string; dayName: string }> = []
      const cursor = new Date(phtNow)
      cursor.setUTCHours(0, 0, 0, 0)
      cursor.setUTCDate(cursor.getUTCDate() - 1)
      for (let i = 0; i < 28; i++) {
        const dow = cursor.getUTCDay()
        const monday = new Date(cursor)
        monday.setUTCDate(cursor.getUTCDate() + (dow === 0 ? -6 : 1 - dow))
        // Convert PHT-Monday-midnight back to actual UTC instant (matches DB week_start convention)
        const weekStartDate = new Date(monday.getTime() - PHT)
        candidates.push({
          date: new Date(cursor),
          weekStart: weekStartDate.toISOString().split('T')[0],
          dayName: DAY_NAMES[dow],
        })
        cursor.setUTCDate(cursor.getUTCDate() - 1)
      }

      const weekStarts = Array.from(new Set(candidates.map(t => t.weekStart)))

      let rows: Array<{ week_start: string; day: string; time_spent: number }> = []
      if (selectedMemberId) {
        const res = await fetch(`/api/admin/member-recent-hours?memberId=${selectedMemberId}&weekStarts=${weekStarts.join(',')}`)
        if (res.ok) {
          const json = await res.json()
          rows = json.completions ?? []
        }
      } else {
        const supabase = createClient()
        const { data } = await supabase
          .from('task_completions')
          .select('week_start, day, time_spent')
          .eq('user_id', viewingId)
          .in('week_start', weekStarts)
          .gt('time_spent', 0)
        rows = data ?? []
      }

      const sums: Record<string, number> = {}
      rows.forEach(r => {
        const key = `${r.week_start}-${r.day}`
        sums[key] = (sums[key] ?? 0) + (r.time_spent ?? 0)
      })

      // Pick 5 most recent days with logged time, then reverse to oldest → newest for display
      const worked = candidates.filter(t => (sums[`${t.weekStart}-${t.dayName}`] ?? 0) > 0).slice(0, 5).reverse()

      setRecentDays(worked.map(t => ({
        date: t.date.toISOString().split('T')[0],
        day: t.dayName,
        mins: sums[`${t.weekStart}-${t.dayName}`] ?? 0,
      })))
    }
    loadRecentDays()
    // NB: intentionally NOT keyed on `completions` — loadRecentDays issues its
    // own query and never reads completion state. Depending on it serialized
    // this load behind the main fetch (a waterfall) and re-ran it on every time
    // entry. Keyed only on the member/week so it runs in parallel with loadData.
  }, [viewingId, selectedMemberId])

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
    } else if (prev !== minutes) {
      // HR audit trail (Section XI). Only log meaningful changes; ignore no-ops.
      fireAuditLog({
        targetUserId: userId,
        entityType: 'task_completions',
        entityId: `${taskId}:${weekStart}:${day}`,
        action: prev === 0 ? 'create' : (minutes === 0 ? 'delete' : 'update'),
        before: { time_spent: prev },
        after: { time_spent: minutes },
        context: { task_id: taskId, week_start: weekStart, day },
      })
    }
    setSavingCell(null)
  }

  async function toggleOnetimeTask(taskId: number) {
    if (!userId || !!selectedMemberId) return
    const supabase = createClient()
    const key = `${taskId}-done`
    const current = (completions[key] ?? 0) > 0
    const newVal = current ? 0 : 1
    setCompletions(c => ({ ...c, [key]: newVal }))
    const { error } = await supabase.from('task_completions').upsert({
      user_id: userId, task_id: taskId, week_start: '1970-01-01', day: 'done',
      time_spent: newVal, completed: newVal > 0,
      completed_at: newVal > 0 ? new Date().toISOString() : null
    }, { onConflict: 'user_id,task_id,week_start,day' })
    if (error) {
      setCompletions(c => ({ ...c, [key]: current ? 1 : 0 }))
      setSaveError(`Failed to save: ${error.message}`)
      setTimeout(() => setSaveError(null), 5000)
    }
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
    const { error } = await supabase.from('va_task_links').upsert({ user_id: userId, task_id: taskId, loom_link: draft.loom, sop_doc_link: draft.sop, updated_at: new Date().toISOString() }, { onConflict: 'user_id,task_id' })
    setSavingLink(null)
    if (error) {
      alert(`Could not save link: ${error.message}`)
      return
    }
    setVALinks(prev => ({ ...prev, [taskId]: { task_id: taskId, loom_link: draft.loom, sop_doc_link: draft.sop } }))
    setExpandedLinks(null)
  }

  async function addCustomTask() {
    if (!userId || !newTask.task_name.trim()) return

    // Parse the optional numeric est_minutes; keep undefined if blank or invalid
    // so the DB column stays NULL rather than 0 (0 would skew benchmarks).
    const parsedEstMin = newTask.est_minutes.trim() === '' ? undefined : Number(newTask.est_minutes)
    const estMinutes = Number.isFinite(parsedEstMin) && (parsedEstMin as number) > 0 ? (parsedEstMin as number) : undefined

    let data: CustomTask | null = null
    if (selectedMemberId) {
      // Admin creating a task for another member — go through service-role API.
      const res = await fetch('/api/admin/member-custom-tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          memberId: selectedMemberId,
          task_name: newTask.task_name,
          description: newTask.description,
          days: newTask.days,
          time_window: newTask.time_window,
          est_time: newTask.est_time,
          est_minutes: estMinutes,
          is_role: addContext.is_role ?? false,
          parent_id: addContext.parent_id ?? null,
          created_week_start: weekStart,
        }),
      })
      if (res.ok) data = (await res.json()).task ?? null
    } else {
      const supabase = createClient()
      const insertRow: Record<string, unknown> = {
        user_id: userId,
        task_name: newTask.task_name,
        description: newTask.description,
        days: newTask.days,
        time_window: newTask.time_window,
        est_time: newTask.est_time,
        loom_link: '',
        sop_doc_link: '',
        created_week_start: weekStart,
      }
      // Only set the role columns when creating a role/sub-task, so plain-task
      // creation keeps working even before the is_role/parent_id migration is run.
      if (addContext.is_role) insertRow.is_role = true
      if (addContext.parent_id) insertRow.parent_id = addContext.parent_id
      if (estMinutes !== undefined) insertRow.est_minutes = estMinutes
      const inserted = await supabase.from('va_custom_tasks').insert(insertRow).select().single()
      data = inserted.data
    }

    if (data) setCustomTasks(prev => [...prev, data!])
    // Keep a newly-created role expanded so its sub-tasks are visible.
    if (data?.is_role) setExpandedRoles(prev => new Set(prev).add(data!.id))
    setNewTask({ task_name: '', description: '', days: ['Mon','Tue','Wed','Thu','Fri'], time_window: '', est_time: '', est_minutes: '' })
    setShowAddForm(false)
    setAddContext({})
  }

  // Open the add form pre-set to create a plain task, a role, or a sub-task.
  function openAdd(context: { is_role?: boolean; parent_id?: number | null }) {
    setAddContext(context)
    setShowAddForm(true)
  }

  function toggleRole(roleId: number) {
    setExpandedRoles(prev => {
      const next = new Set(prev)
      if (next.has(roleId)) next.delete(roleId); else next.add(roleId)
      return next
    })
  }

  // Ordered rows for the custom-tasks table: each role, followed by its sub-tasks
  // when expanded, then plain custom tasks. Roles and sub-tasks are both ordinary
  // va_custom_tasks rows, so they reuse the same time-tracking row below.
  function buildCustomRows(): { task: CustomTask; indent: boolean; isRole: boolean }[] {
    const roles = customTasks.filter(t => t.is_role && !t.parent_id)
    const plain = customTasks.filter(t => !t.is_role && !t.parent_id)
    const rows: { task: CustomTask; indent: boolean; isRole: boolean }[] = []
    for (const role of roles) {
      rows.push({ task: role, indent: false, isRole: true })
      if (expandedRoles.has(role.id)) {
        for (const st of customTasks.filter(t => t.parent_id === role.id)) {
          rows.push({ task: st, indent: true, isRole: false })
        }
      }
    }
    for (const t of plain) rows.push({ task: t, indent: false, isRole: false })
    return rows
  }

  async function updateCustomTask(id: number, fields: Partial<Pick<CustomTask, 'task_name' | 'description' | 'days' | 'time_window' | 'est_time'>>) {
    if (!userId) return
    if (selectedMemberId) {
      const res = await fetch('/api/admin/member-custom-tasks', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memberId: selectedMemberId, id, fields }),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        alert(`Could not save: ${j.error ?? res.statusText}`)
        return
      }
    } else {
      const supabase = createClient()
      const { error } = await supabase.from('va_custom_tasks').update(fields).eq('id', id)
      if (error) {
        alert(`Could not save: ${error.message}`)
        return
      }
    }
    setCustomTasks(prev => prev.map(t => t.id === id ? { ...t, ...fields } : t))
  }

  async function deleteCustomTask(id: number) {
    if (!userId) return
    if (selectedMemberId) {
      const res = await fetch('/api/admin/member-custom-tasks', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memberId: selectedMemberId, id, weekStart }),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        alert(`Could not delete: ${j.error ?? res.statusText}`)
        return
      }
    } else {
      const supabase = createClient()
      // Mark deactivated from the viewed week onward. Past weeks keep showing
      // this task and its logged time; current/future weeks hide it.
      await supabase.from('va_custom_tasks')
        .update({ active: false, deactivated_week_start: weekStart })
        .eq('id', id)
    }
    setCustomTasks(prev => prev.filter(t => t.id !== id))
  }

  async function saveTaskNote(taskId: number, note: string): Promise<string | null> {
    if (!userId || !!selectedMemberId || !isEditableWeek) return null
    const supabase = createClient()
    if (note.trim()) {
      const { error } = await supabase.from('va_task_notes').upsert(
        { user_id: userId, task_id: taskId, week_start: weekStart, note },
        { onConflict: 'user_id,task_id,week_start' }
      )
      return error?.message ?? null
    } else {
      const { error } = await supabase.from('va_task_notes').delete()
        .eq('user_id', userId).eq('task_id', taskId).eq('week_start', weekStart)
      return error?.message ?? null
    }
  }

  async function generateReport() {
    setGeneratingReport(true)
    setShowReport(true)
    setReportText('')

    const allTasks = [
      ...DEFAULT_TASKS.filter(t => !t.is_eow && !t.is_onetime).map(t => ({
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
    ].filter(t => t.totalMins > 0)

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
    if (exportFrom > exportTo) { setExporting(false); return }
    setExporting(true)

    // Snap a YYYY-MM-DD string to its PHT Monday. Returns the actual UTC instant
    // of PHT-Monday-midnight, whose toISOString().split('T')[0] matches the DB.
    function toLocalMonday(s: string): Date {
      const [y, mo, d] = s.split('-').map(Number)
      const PHT = 8 * 60 * 60 * 1000
      const phtDate = new Date(Date.UTC(y, mo - 1, d))
      const day = phtDate.getUTCDay()
      phtDate.setUTCDate(phtDate.getUTCDate() + (day === 0 ? -6 : 1 - day))
      phtDate.setUTCHours(0, 0, 0, 0)
      return new Date(phtDate.getTime() - PHT)
    }

    // Walk weeks of the range. We still iterate by week_start because that's
    // how completions are keyed in the DB, but each cell is filtered by its
    // actual calendar date so partial weeks (e.g. May 16-17 inside the May 11
    // week_start) only contribute the days inside the requested range.
    const firstMonday = toLocalMonday(exportFrom)
    const lastMonday = toLocalMonday(exportTo)
    const weekStarts: string[] = []
    const cur = new Date(firstMonday)
    while (cur <= lastMonday) {
      weekStarts.push(cur.toISOString().split('T')[0])
      cur.setDate(cur.getDate() + 7)
    }

    // For a given week_start string (Sun UTC = Mon PHT) and 0..6 day index,
    // return the YYYY-MM-DD of that PHT calendar day. We add (dayIndex + 1)
    // to the stored week_start: +1 to step from Sun UTC to Mon PHT, then the
    // remaining offset to walk Mon→Tue→…→Sun.
    function dayDateYMD(weekStart: string, dayIndex: number): string {
      const [y, mo, d] = weekStart.split('-').map(Number)
      const dt = new Date(Date.UTC(y, mo - 1, d + 1 + dayIndex))
      return dt.toISOString().split('T')[0]
    }

    const isInRange = (ymd: string) => ymd >= exportFrom && ymd <= exportTo

    const supabase = createClient()
    const { data } = await supabase
      .from('task_completions')
      .select('task_id, day, time_spent, week_start')
      .eq('user_id', viewingId)
      .in('week_start', weekStarts)
      .gt('time_spent', 0)
    const rows = data ?? []

    // Fetch every custom task that overlaps the export range — not just the
    // ones active in the currently viewed week. Without this, completions for
    // tasks created before or deactivated during the range show up in the
    // weekly total but their per-task rows are silently dropped.
    let rangeCustomTasks: CustomTask[] = []
    if (selectedMemberId) {
      const res = await fetch(`/api/admin/member-custom-tasks?memberId=${selectedMemberId}`)
      if (res.ok) {
        const json = await res.json()
        rangeCustomTasks = json.customTasks ?? []
      }
    } else {
      const { data: customData } = await supabase
        .from('va_custom_tasks')
        .select('*')
        .eq('user_id', viewingId)
      rangeCustomTasks = customData ?? []
    }

    const allTasks = [
      ...DEFAULT_TASKS.filter(t => !t.is_onetime).map(t => ({ key: String(t.id), name: t.name, sop: t.sop_number, days: t.days.join('/'), timeWindow: t.time_window, estTime: t.est_time })),
      ...rangeCustomTasks.map(t => ({ key: `custom-${t.id}`, name: t.task_name, sop: 'Custom', days: t.days?.join('/') ?? 'Mon–Fri', timeWindow: t.time_window ?? '', estTime: t.est_time ?? '' })),
    ]

    const resolvedName = selectedMemberId
      ? `${members.find(m => m.id === selectedMemberId)?.first_name ?? ''} ${members.find(m => m.id === selectedMemberId)?.last_name ?? ''}`.trim()
      : memberName

    // Format a YYYY-MM-DD string for display. We avoid `new Date(ymd)` parsing
    // and explicit local-TZ paths because cells get filtered by exact date —
    // any TZ drift here would mislabel weeks at the range boundary.
    const fmtShortYMD = (ymd: string) => {
      const [y, mo, d] = ymd.split('-').map(Number)
      return new Date(Date.UTC(y, mo - 1, d)).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })
    }
    const fmtFullYMD = (ymd: string) => {
      const [y, mo, d] = ymd.split('-').map(Number)
      return new Date(Date.UTC(y, mo - 1, d)).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' })
    }

    // ExcelJS is heavy (~250KB) so it's loaded only when the export runs.
    const ExcelJS = (await import('exceljs')).default
    const wb = new ExcelJS.Workbook()
    wb.creator = brand.productName
    wb.created = new Date()
    const sheet = wb.addWorksheet('Tasksheet', {
      views: [{ state: 'frozen', ySplit: 3 }], // keep the column header visible while scrolling
      properties: { defaultRowHeight: 18 },
    })

    // Fixed column widths — chosen empirically so the longest expected values
    // fit without wrapping. Day columns are uniform so blocks line up cleanly.
    sheet.columns = [
      { key: 'week', width: 16 },
      { key: 'sop', width: 9 },
      { key: 'name', width: 52 },
      { key: 'schedule', width: 22 },
      { key: 'window', width: 13 },
      { key: 'est', width: 10 },
      { key: 'mon', width: 11 },
      { key: 'tue', width: 11 },
      { key: 'wed', width: 11 },
      { key: 'thu', width: 11 },
      { key: 'fri', width: 11 },
      { key: 'sat', width: 11 },
      { key: 'sun', width: 11 },
      { key: 'mins', width: 12 },
      { key: 'hrs', width: 11 },
    ]

    // Palette — restrained navy + soft grays so it reads like a financial
    // document, not a marketing brochure.
    const C = {
      titleFill: 'FF1A1A2E', titleText: 'FFFFFFFF',
      colHeaderFill: 'FF2E2E48', colHeaderText: 'FFFFFFFF',
      weekFill: 'FF3E5C8A', weekText: 'FFFFFFFF',
      dateRowFill: 'FFEEF1F7', dateRowText: 'FF2E2E48',
      zebra: 'FFFAFAFC',
      weekTotalFill: 'FFE3E7F0',
      grandTotalFill: 'FF1A1A2E', grandTotalText: 'FFFFFFFF',
      border: 'FFCED4DC',
    }
    const thinBorder = { style: 'thin' as const, color: { argb: C.border } }
    const allBorders = { top: thinBorder, left: thinBorder, bottom: thinBorder, right: thinBorder }

    // Row 1 — Title (merged across all columns)
    sheet.mergeCells(1, 1, 1, 15)
    const titleCell = sheet.getCell(1, 1)
    titleCell.value = `${resolvedName.toUpperCase()} — FULL TASK LOG`
    titleCell.font = { name: 'Calibri', size: 14, bold: true, color: { argb: C.titleText } }
    titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.titleFill } }
    titleCell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 }
    sheet.getRow(1).height = 28

    // Row 2 — Date range subtitle
    sheet.mergeCells(2, 1, 2, 15)
    const subCell = sheet.getCell(2, 1)
    subCell.value = `${fmtFullYMD(exportFrom)}  –  ${fmtFullYMD(exportTo)}`
    subCell.font = { name: 'Calibri', size: 11, italic: true, color: { argb: 'FF666666' } }
    subCell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 }
    sheet.getRow(2).height = 20

    // Row 3 — Column headers (frozen)
    const headerLabels = ['Week', 'SOP #', 'Task Name', 'Schedule', 'Time Window', 'Est. Time', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun', 'Total (mins)', 'Total (hrs)']
    const colHeader = sheet.getRow(3)
    colHeader.values = headerLabels
    colHeader.height = 24
    colHeader.eachCell({ includeEmpty: true }, cell => {
      cell.font = { bold: true, color: { argb: C.colHeaderText }, size: 11 }
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.colHeaderFill } }
      cell.alignment = { vertical: 'middle', horizontal: 'center' }
      cell.border = allBorders
    })

    let grandTotal = 0

    // One block per week — but each cell is gated on whether its calendar
    // date is inside [exportFrom, exportTo]. Partial weeks at either end of
    // the range only contribute their in-range days, so an invoice for
    // May 16-31 doesn't get inflated by hours logged May 11-15.
    for (const ws of weekStarts) {
      const inRange = [0, 1, 2, 3, 4, 5, 6].map(i => isInRange(dayDateYMD(ws, i)))
      let firstIn = -1
      let lastIn = -1
      for (let i = 0; i < 7; i++) {
        if (inRange[i]) {
          if (firstIn === -1) firstIn = i
          lastIn = i
        }
      }
      if (firstIn === -1) continue

      const weekLabel = `${fmtShortYMD(dayDateYMD(ws, firstIn))}–${fmtShortYMD(dayDateYMD(ws, lastIn))}`
      const weekRows = rows.filter(r => {
        if (r.week_start !== ws) return false
        const idx = DAYS.indexOf(r.day)
        return idx !== -1 && inRange[idx]
      })
      const weekTotal = weekRows.reduce((s, r) => s + (r.time_spent ?? 0), 0)
      if (weekTotal === 0) continue

      // Week banner — merged across all columns
      const weekHeaderRow = sheet.addRow([`${weekLabel}    Total: ${(weekTotal / 60).toFixed(2)} hrs`])
      const weekRowNum = weekHeaderRow.number
      sheet.mergeCells(weekRowNum, 1, weekRowNum, 15)
      const wb1 = sheet.getCell(weekRowNum, 1)
      wb1.font = { bold: true, size: 12, color: { argb: C.weekText } }
      wb1.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.weekFill } }
      wb1.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 }
      weekHeaderRow.height = 24

      // Per-week day-date sub-header: "Mon" on line 1, "May 18" on line 2
      const dateRow = sheet.addRow(['', '', '', '', '', '',
        ...DAYS.map((d, i) => inRange[i] ? `${d}\n${fmtShortYMD(dayDateYMD(ws, i))}` : ''),
        '', '',
      ])
      dateRow.height = 30
      dateRow.eachCell({ includeEmpty: true }, (cell, col) => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.dateRowFill } }
        cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true }
        cell.font = { size: 10, color: { argb: C.dateRowText }, bold: true }
        if (col >= 7 && col <= 13) cell.border = allBorders
      })

      const dTotals = new Array(7).fill(0)
      let zebra = false

      for (const task of allTasks) {
        const tid = task.key.startsWith('custom-') ? 10000 + parseInt(task.key.replace('custom-', '')) : parseInt(task.key)
        const dMins = DAYS.map((d, i) => inRange[i]
          ? (rows.find(r => r.task_id === tid && r.week_start === ws && r.day === d)?.time_spent ?? 0)
          : 0)
        const total = dMins.reduce((a, b) => a + b, 0)
        if (!total) continue
        dMins.forEach((m, i) => { dTotals[i] += m })

        const row = sheet.addRow([
          weekLabel,
          task.sop,
          task.name,
          task.days,
          task.timeWindow,
          task.estTime,
          ...dMins.map((m, i) => inRange[i] && m ? m : null),
          total,
          Number((total / 60).toFixed(2)),
        ])
        row.height = 18
        row.eachCell({ includeEmpty: true }, (cell, col) => {
          if (zebra) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.zebra } }
          cell.border = allBorders
          if (col === 3) cell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true }
          else if (col >= 7 && col <= 15) cell.alignment = { vertical: 'middle', horizontal: 'center' }
          else cell.alignment = { vertical: 'middle', horizontal: 'left' }
        })
        row.getCell(15).numFmt = '0.00'
        zebra = !zebra
      }

      // WEEK TOTAL row — light fill, bold, totals only in numeric columns
      const totalRow = sheet.addRow(['', '', 'WEEK TOTAL', '', '', '',
        ...dTotals.map((m, i) => inRange[i] && m ? m : null),
        weekTotal,
        Number((weekTotal / 60).toFixed(2)),
      ])
      totalRow.height = 20
      totalRow.eachCell({ includeEmpty: true }, (cell, col) => {
        cell.font = { bold: true }
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.weekTotalFill } }
        cell.border = allBorders
        if (col >= 7 && col <= 15) cell.alignment = { vertical: 'middle', horizontal: 'center' }
        else cell.alignment = { vertical: 'middle', horizontal: 'left' }
      })
      totalRow.getCell(15).numFmt = '0.00'

      sheet.addRow([]) // visual gap between weeks

      grandTotal += weekTotal
    }

    // GRAND TOTAL row — dark fill matching the title
    const gtRow = sheet.addRow(['', '', 'GRAND TOTAL', '', '', '', '', '', '', '', '', '', '',
      grandTotal,
      Number((grandTotal / 60).toFixed(2)),
    ])
    gtRow.height = 24
    gtRow.eachCell({ includeEmpty: true }, (cell, col) => {
      cell.font = { bold: true, color: { argb: C.grandTotalText }, size: 12 }
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.grandTotalFill } }
      cell.border = allBorders
      if (col >= 7 && col <= 15) cell.alignment = { vertical: 'middle', horizontal: 'center' }
      else cell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 }
    })
    gtRow.getCell(15).numFmt = '0.00'

    const buf = await wb.xlsx.writeBuffer()
    const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `tasksheet-${resolvedName.replace(/\s+/g, '-')}-${exportFrom}-to-${exportTo}.xlsx`
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
  const regularTasks = DEFAULT_TASKS.filter(t => !t.is_eow && !t.is_onetime)
  const eowTasks = DEFAULT_TASKS.filter(t => t.is_eow)
  const onetimeTasks = DEFAULT_TASKS.filter(t => t.is_onetime)

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
      <QuickNav />

      {showExport && (() => {
        const [pY, pM] = presetMonth.split('-').map(Number)
        const pad = (n: number) => String(n).padStart(2, '0')
        const lastDay = pY && pM ? new Date(pY, pM, 0).getDate() : 30
        const applyPreset = (kind: '1-15' | '16-end' | 'full' | '15-15') => {
          if (!pY || !pM) return
          if (kind === '1-15') {
            setExportFrom(`${pY}-${pad(pM)}-01`)
            setExportTo(`${pY}-${pad(pM)}-15`)
          } else if (kind === '16-end') {
            setExportFrom(`${pY}-${pad(pM)}-16`)
            setExportTo(`${pY}-${pad(pM)}-${pad(lastDay)}`)
          } else if (kind === 'full') {
            setExportFrom(`${pY}-${pad(pM)}-01`)
            setExportTo(`${pY}-${pad(pM)}-${pad(lastDay)}`)
          } else {
            // 15th of selected month → 15th of next month
            const nextM = pM === 12 ? 1 : pM + 1
            const nextY = pM === 12 ? pY + 1 : pY
            setExportFrom(`${pY}-${pad(pM)}-15`)
            setExportTo(`${nextY}-${pad(nextM)}-15`)
          }
        }
        const presetBtn = "text-xs bg-gray-800 hover:bg-gray-700 text-gray-200 px-2.5 py-1.5 rounded border border-gray-700 transition-colors"
        return (
        <div className="bg-gray-900 border-b border-gray-800 px-6 py-4">
          <div className="max-w-5xl mx-auto">
            <p className="text-xs text-gray-400 mb-3">Select the date range to export. Includes all tasks with logged time.</p>
            <div className="flex items-center gap-2 flex-wrap mb-3">
              <label className="text-xs text-gray-400 whitespace-nowrap">Quick pick</label>
              <input
                type="month"
                value={presetMonth}
                onChange={e => setPresetMonth(e.target.value)}
                className="bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <button type="button" onClick={() => applyPreset('1-15')} className={presetBtn} title="Biweekly: 1st – 15th">1–15</button>
              <button type="button" onClick={() => applyPreset('16-end')} className={presetBtn} title={`Biweekly: 16th – ${lastDay}th`}>16–{lastDay}</button>
              <button type="button" onClick={() => applyPreset('full')} className={presetBtn} title={`Full month: 1st – ${lastDay}th`}>Full month</button>
              <button type="button" onClick={() => applyPreset('15-15')} className={presetBtn} title="15th → 15th of next month">15 → 15</button>
            </div>
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-2">
                <label className="text-xs text-gray-400 whitespace-nowrap">From date</label>
                <input
                  type="date"
                  value={exportFrom}
                  onChange={e => setExportFrom(e.target.value)}
                  className="bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-xs text-gray-400 whitespace-nowrap">To date</label>
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
                {exporting ? 'Downloading...' : 'Download Sheet'}
              </button>
              <button onClick={() => setShowExport(false)} className="text-xs text-gray-500 hover:text-gray-400">Cancel</button>
            </div>
          </div>
        </div>
        )
      })()}

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8 gap-3 flex-wrap">
          <h1 className="text-2xl font-bold">My Task Sheet</h1>
          <div className="flex items-center gap-2">
            <button
              onClick={() => { setShowExport(v => !v); setExportFrom(''); setExportTo('') }}
              className="text-sm bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors"
            >
              Export Sheet
            </button>
            <button
              onClick={generateReport}
              className="text-sm bg-purple-700 hover:bg-purple-600 text-white px-4 py-2 rounded-lg transition-colors"
            >
              Generate EOW Report
            </button>
          </div>
        </div>
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
                {selectedMemberId && <span className="text-xs text-yellow-400 flex-shrink-0">Editing custom tasks · time logs read-only</span>}
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

        <div className="flex flex-col lg:flex-row gap-6 items-start">
        {/* ── SIDEBAR ── */}
        <div className="w-full lg:w-64 flex-shrink-0 flex flex-col gap-4 lg:sticky lg:top-4 order-first lg:order-last">
          {/* Hours This Week */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl px-4 py-3">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs text-gray-400">Hours this week</span>
              <span className={`text-sm font-bold ${weeklyMinutes > 0 ? 'text-green-400' : 'text-gray-600'}`}>{weeklyHours}h</span>
            </div>
            <p className="text-xs text-gray-600">Minutes logged per task per day. Use <span className="text-gray-400">▶ track</span> to time it live.</p>
          </div>

          {/* Daily Avg (last 5 working days) */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl px-4 py-3">
            <p className="text-xs text-gray-400 mb-2">Daily avg (last 5 working days)</p>
            <div className="space-y-1 mb-2">
              {recentDays.map(d => {
                const hours = d.mins / 60
                const dateLabel = new Date(d.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                return (
                  <div key={d.date} className="flex items-center justify-between text-xs">
                    <span className="text-gray-500">{d.day}, {dateLabel}</span>
                    <span className={hours > 0 ? 'text-gray-200 font-medium' : 'text-gray-600'}>
                      {hours.toFixed(2)}h
                    </span>
                  </div>
                )
              })}
              {recentDays.length === 0 && (
                <p className="text-xs text-gray-600">No data yet.</p>
              )}
            </div>
            {recentDays.length > 0 && (() => {
              const avgHours = recentDays.reduce((s, d) => s + d.mins, 0) / 60 / recentDays.length
              return (
                <div className="flex items-center justify-between border-t border-gray-800 pt-2">
                  <span className="text-xs text-gray-400">Current avg</span>
                  <span className={`text-sm font-bold ${avgHours > 0 ? 'text-green-400' : 'text-gray-600'}`}>
                    {avgHours.toFixed(2)}h
                  </span>
                </div>
              )
            })()}
          </div>

          {/* Guidelines (Must Read — surfaced above the optional Watch & Learn) */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <h3 className="text-sm font-semibold text-gray-200">Guidelines</h3>
              <span className="text-xs font-medium bg-red-900/50 text-red-300 border border-red-700/40 px-1.5 py-0.5 rounded-full ml-auto">Must Read</span>
            </div>
            <ol className="space-y-2 mb-3">
              {[
                'Tasks are your full responsibility unless stated otherwise.',
                'Complete tasks within the time windows.',
                "If you can't complete a task, message the Founder or Manager immediately.",
                'Anything less than the stated process is grounds for performance review.',
              ].map((rule, i) => (
                <li key={i} className="text-xs text-gray-400 flex gap-2">
                  <span className="font-bold text-gray-300 flex-shrink-0">{i + 1}.</span><span>{rule}</span>
                </li>
              ))}
            </ol>
            <p className="text-xs text-yellow-200/70 border-t border-gray-800 pt-3">
              <span className="font-semibold text-yellow-300">Completion:</span> Only done after sending the Communication Text (if required).
            </p>
          </div>

          {/* Watch & Learn (optional one-time) */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="w-2 h-2 rounded-full bg-green-400 flex-shrink-0"></span>
              <h3 className="text-sm font-semibold text-green-300">Watch & Learn</h3>
              <span className="text-xs text-green-500/60 ml-auto">one-time</span>
            </div>
            <div className="space-y-2">
              {onetimeTasks.map(task => {
                const done = (completions[`${task.id}-done`] ?? 0) > 0
                return (
                  <div key={task.id} className={`flex items-start gap-2.5 p-2.5 rounded-lg transition-colors ${done ? 'opacity-50' : 'hover:bg-gray-800/50'}`}>
                    <button
                      onClick={() => toggleOnetimeTask(task.id)}
                      disabled={!!selectedMemberId}
                      className={`mt-0.5 w-4 h-4 flex-shrink-0 rounded border-2 transition-colors flex items-center justify-center ${done ? 'bg-green-600 border-green-500' : 'border-gray-600 hover:border-green-500'}`}
                    >
                      {done && <span className="text-white text-[9px] leading-none">✓</span>}
                    </button>
                    <div>
                      <p className={`text-xs font-medium leading-snug ${done ? 'line-through text-gray-500' : 'text-gray-200'}`}>{task.name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        {task.loom_link && <a href={task.loom_link} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-400 hover:text-blue-300">Watch →</a>}
                        {task.doc_link && <a href={task.doc_link} target="_blank" rel="noopener noreferrer" className="text-xs text-purple-400 hover:text-purple-300">SOP →</a>}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* ── MAIN CONTENT ── */}
        <div className="flex-1 min-w-0">

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


        {/* ── DAY OFF ROW ── */}
        {!selectedMemberId && isEditableWeek && (
          <div className="flex items-center gap-2 mb-4 px-1">
            <span className="text-xs text-gray-500 flex-shrink-0">Day off:</span>
            <div className="flex gap-1.5">
              {DAYS.map(d => {
                const status = dayOffs[d]
                return (
                  <button
                    key={d}
                    onClick={() => toggleDayOff(d)}
                    title={status === 'off' ? `${d}: Full day off (click to mark half day)` : status === 'half' ? `${d}: Half day off (click to clear)` : `${d}: Working (click to mark day off)`}
                    className={`text-xs px-2 py-1 rounded transition-colors font-medium min-w-[36px] ${
                      status === 'off'
                        ? 'bg-red-900/60 text-red-300 border border-red-700/60 hover:bg-red-800/60'
                        : status === 'half'
                        ? 'bg-amber-900/60 text-amber-300 border border-amber-700/60 hover:bg-amber-800/60'
                        : 'bg-gray-800/60 text-gray-500 border border-gray-700/40 hover:text-gray-300 hover:border-gray-600'
                    }`}
                  >
                    {d}
                    {status === 'off' && <span className="block text-[9px] leading-none mt-0.5 opacity-80">off</span>}
                    {status === 'half' && <span className="block text-[9px] leading-none mt-0.5 opacity-80">½</span>}
                  </button>
                )
              })}
            </div>
            <span className="text-xs text-gray-600">click to cycle: off → ½ day → clear</span>
          </div>
        )}

        {/* ── CUSTOM TASKS ── */}
        <div className="mb-6">
          <button onClick={() => toggleSection('custom')} className="w-full flex items-center justify-between px-4 py-2.5 bg-teal-950/40 border border-teal-800/50 rounded-xl mb-3 hover:bg-teal-950/60 transition-colors">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-teal-400 flex-shrink-0"></span>
              <span className="font-semibold text-teal-300 text-sm">My Custom Tasks &amp; Projects</span>
              <span className="text-xs text-teal-400/60">{customTasks.length} items</span>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={e => { e.stopPropagation(); openAdd({}) }}
                className="text-xs bg-teal-800/60 hover:bg-teal-700/60 text-teal-300 px-2.5 py-1 rounded-lg transition-colors">
                + Task
              </button>
              <button title="A project groups related tasks (e.g. Finance with sub-tasks Reconciliation, Payroll)" onClick={e => { e.stopPropagation(); openAdd({ is_role: true }) }}
                className="text-xs bg-teal-800/60 hover:bg-teal-700/60 text-teal-300 px-2.5 py-1 rounded-lg transition-colors">
                + Project
              </button>
              <span className="text-teal-400 text-xs">{collapsed.custom ? '▼ Show' : '▲ Hide'}</span>
            </div>
          </button>

          {!collapsed.custom && (
            <div>

          {showAddForm && (
            <div className="bg-gray-900 border border-gray-700 rounded-xl p-4 mb-4">
              <h4 className="text-sm font-medium mb-3">{addContext.is_role ? 'New Project' : addContext.parent_id ? 'New Sub-task' : 'New Custom Task'}</h4>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">{addContext.is_role ? 'Project Name *' : 'Task Name *'}</label>
                  <input required value={newTask.task_name} onChange={e => setNewTask(p => ({ ...p, task_name: e.target.value }))}
                    placeholder={addContext.is_role ? 'e.g. Finance' : 'e.g. Bank reconciliation'}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Description</label>
                  <textarea value={newTask.description} onChange={e => setNewTask(p => ({ ...p, description: e.target.value }))}
                    rows={3}
                    placeholder="What does this task involve? Add SOP context, prerequisites, gotchas a future-you would forget..."
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y" />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Time Window</label>
                    <input value={newTask.time_window} onChange={e => setNewTask(p => ({ ...p, time_window: e.target.value }))} placeholder="e.g. 8 PM EST"
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Est. Time (label)</label>
                    <input value={newTask.est_time} onChange={e => setNewTask(p => ({ ...p, est_time: e.target.value }))} placeholder="e.g. 15 mins"
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1" title="Numeric benchmark in minutes. Used to flag tasks that consistently run over estimate.">Est. Minutes</label>
                    <input type="number" min="0" step="5" value={newTask.est_minutes}
                      onChange={e => setNewTask(p => ({ ...p, est_minutes: e.target.value }))}
                      placeholder="e.g. 15"
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
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
                  <button onClick={addCustomTask} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm transition-colors">{addContext.is_role ? 'Add Project' : addContext.parent_id ? 'Add Sub-task' : 'Add Task'}</button>
                  <button onClick={() => { setShowAddForm(false); setAddContext({}) }} className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg text-sm transition-colors">Cancel</button>
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
                  {buildCustomRows().map(({ task, indent, isRole }) => {
                    const isEditing = editingTaskId === task.id
                    if (isEditing) {
                      return (
                        <tr key={task.id} className="border-b border-gray-800/50 bg-gray-900/40">
                          <td colSpan={DAYS.length + 3} className="py-3 px-3">
                            <div className="space-y-3">
                              <div>
                                <label className="block text-xs text-gray-400 mb-1">Task Name *</label>
                                <input value={editDraft.task_name} onChange={e => setEditDraft(p => ({ ...p, task_name: e.target.value }))}
                                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
                              </div>
                              <div>
                                <label className="block text-xs text-gray-400 mb-1">Description</label>
                                <input value={editDraft.description} onChange={e => setEditDraft(p => ({ ...p, description: e.target.value }))}
                                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
                              </div>
                              <div className="grid grid-cols-2 gap-3">
                                <div>
                                  <label className="block text-xs text-gray-400 mb-1">Time Window</label>
                                  <input value={editDraft.time_window} onChange={e => setEditDraft(p => ({ ...p, time_window: e.target.value }))} placeholder="e.g. 8 PM EST"
                                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
                                </div>
                                <div>
                                  <label className="block text-xs text-gray-400 mb-1">Est. Time</label>
                                  <input value={editDraft.est_time} onChange={e => setEditDraft(p => ({ ...p, est_time: e.target.value }))} placeholder="e.g. 15 mins"
                                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
                                </div>
                              </div>
                              <div>
                                <label className="block text-xs text-gray-400 mb-2">Days</label>
                                <div className="flex gap-2 flex-wrap">
                                  {DAYS.map(d => (
                                    <button key={d} type="button"
                                      onClick={() => setEditDraft(p => ({ ...p, days: p.days.includes(d) ? p.days.filter(x => x !== d) : [...p.days, d] }))}
                                      className={`px-2 py-1 rounded text-xs transition-colors ${editDraft.days.includes(d) ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-400'}`}
                                    >{d}</button>
                                  ))}
                                </div>
                              </div>
                              <div className="flex gap-2">
                                <button
                                  onClick={async () => {
                                    if (!editDraft.task_name.trim()) return
                                    await updateCustomTask(task.id, editDraft)
                                    setEditingTaskId(null)
                                  }}
                                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm transition-colors"
                                >Save</button>
                                <button onClick={() => setEditingTaskId(null)} className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg text-sm transition-colors">Cancel</button>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )
                    }
                    return (
                    <tr key={task.id} className={`border-b border-gray-800/50 ${isRole ? 'bg-teal-950/20' : ''}`}>
                      <td className="py-3 pr-4 align-top" style={indent ? { paddingLeft: '1.75rem' } : undefined}>
                        <div className="flex items-center gap-1.5">
                          {isRole && (
                            <button onClick={() => toggleRole(task.id)} title="Show/hide sub-tasks" className="text-gray-500 hover:text-white text-xs w-4 flex-shrink-0">
                              {expandedRoles.has(task.id) ? '▾' : '▸'}
                            </button>
                          )}
                          <p className="font-medium">{indent ? <span className="text-gray-600">└ </span> : ''}{task.task_name}</p>
                          {isRole && <span className="text-[10px] uppercase tracking-wide text-teal-400/70 border border-teal-800/60 rounded px-1.5 py-0.5">Project</span>}
                        </div>
                        {task.description && <p className="text-xs text-gray-400 mt-0.5">{task.description}</p>}
                        <LinkSection taskId={task.id + 10000} />
                        <NoteSection taskKey={`custom-${task.id}`} taskId={task.id + 10000} expandedNote={expandedNote} setExpandedNote={setExpandedNote} taskNotes={taskNotes} setTaskNotes={setTaskNotes} saveTaskNote={saveTaskNote} disabled={!!selectedMemberId} />
                        {isRole && expandedRoles.has(task.id) && (
                          <button onClick={() => openAdd({ parent_id: task.id })} className="text-xs text-teal-400 hover:text-teal-300 mt-1.5 transition-colors">+ sub-task</button>
                        )}
                      </td>
                      <td className="py-3 pr-4 text-gray-400 hidden md:table-cell align-top text-xs">{task.est_time}</td>
                      {DAYS.map(d => {
                        const isTaskDay = task.days.includes(d)
                        const dayStatus = dayOffs[d]
                        const isOff = dayStatus === 'off'
                        const isHalf = dayStatus === 'half'
                        const key = `custom-${task.id}-${d}`
                        const mins = completions[key] ?? 0
                        const isSaving = savingCell === key
                        // Preserve historical logs: if minutes were logged for this day, show the
                        // cell even if the task's day-set has since been edited to exclude it.
                        const showCell = (isTaskDay || mins > 0) && !isOff
                        return (
                          <td key={d} className={`text-center py-3 px-1 align-top ${isOff ? 'opacity-25' : isHalf ? 'opacity-60' : ''}`}>
                            {showCell ? (
                              <TimerCell
                                mins={mins}
                                disabled={!!selectedMemberId || isSaving}
                                onSave={m => setTaskTime(task.id + 10000, d, m)}
                                completionKey={key}
                              />
                            ) : (
                              <span className="text-gray-700 text-xs">—</span>
                            )}
                          </td>
                        )
                      })}
                      <td className="py-3 align-top">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              setEditDraft({
                                task_name: task.task_name,
                                description: task.description ?? '',
                                days: [...(task.days ?? [])],
                                time_window: task.time_window ?? '',
                                est_time: task.est_time ?? '',
                              })
                              setEditingTaskId(task.id)
                            }}
                            title="Edit task"
                            className="text-gray-600 hover:text-blue-400 text-xs transition-colors"
                          >✎</button>
                          <button onClick={() => deleteCustomTask(task.id)} title="Delete task" className="text-gray-600 hover:text-red-400 text-xs transition-colors">✕</button>
                        </div>
                      </td>
                    </tr>
                    )
                  })}
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
                        const dayStatus = dayOffs[d]
                        const isOff = dayStatus === 'off'
                        const isHalf = dayStatus === 'half'
                        const key = `${task.id}-${d}`
                        const checked = (completions[key] ?? 0) > 0
                        return (
                          <td key={d} className={`text-center py-3 px-1 align-top ${isOff ? 'opacity-25' : isHalf ? 'opacity-60' : ''}`}>
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
        </div>{/* end main content */}
        </div>{/* end flex wrapper */}
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
