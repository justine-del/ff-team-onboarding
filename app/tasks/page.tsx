'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

const TASKS = [
  {
    id: 1,
    sop_number: '1',
    name: 'Understanding Your Core Sheet',
    description: 'Review and understand the updates in your core tracking sheet',
    days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
    time_window: '8 PM EST',
    est_time: '10 mins',
    loom_link: '#',
    sop_doc_link: '#',
    is_eow: false,
  },
  {
    id: 2,
    sop_number: '2',
    name: 'Daily and Weekly SOP Creation',
    description: 'Create and update your daily and weekly standard operating procedures',
    days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
    time_window: '8 PM EST',
    est_time: '10 mins',
    loom_link: '#',
    sop_doc_link: '#',
    is_eow: false,
  },
  {
    id: 3,
    sop_number: 'EOW-1',
    name: 'EOW SOP Solidification',
    description: 'Review and solidify all SOPs created during the week',
    days: ['Fri'],
    time_window: '5 PM EST',
    est_time: '1 hr',
    loom_link: '#',
    sop_doc_link: '#',
    is_eow: true,
  },
  {
    id: 4,
    sop_number: 'EOW-2',
    name: 'EOW VA Clear Out and Restart',
    description: 'Clear your workspace and prepare for the new week',
    days: ['Fri'],
    time_window: '5 PM EST',
    est_time: '10 mins',
    loom_link: '#',
    sop_doc_link: '#',
    is_eow: true,
  },
  {
    id: 5,
    sop_number: 'EOW-3',
    name: 'EOW FF Support Form Submission',
    description: 'Submit the Funnel Futurist end-of-week support form',
    days: ['Fri'],
    time_window: '5 PM EST',
    est_time: '10 mins',
    loom_link: '#',
    sop_doc_link: '#',
    is_eow: true,
  },
]

function getWeekDates() {
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
  const [userId, setUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const monday = getWeekDates()
  const weekStart = monday.toISOString().split('T')[0]
  const today = new Date().toLocaleDateString('en-US', { weekday: 'short' })

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setUserId(user.id)

      const { data } = await supabase
        .from('task_completions')
        .select('task_id, day, completed')
        .eq('user_id', user.id)
        .eq('week_start', weekStart)

      const map: Record<string, boolean> = {}
      data?.forEach(row => { map[`${row.task_id}-${row.day}`] = row.completed })
      setCompletions(map)
      setLoading(false)
    }
    load()
  }, [weekStart])

  async function toggleTask(taskId: number, day: string) {
    if (!userId) return
    const supabase = createClient()
    const key = `${taskId}-${day}`
    const newVal = !completions[key]

    await supabase.from('task_completions').upsert({
      user_id: userId,
      task_id: taskId,
      week_start: weekStart,
      day,
      completed: newVal,
      completed_at: newVal ? new Date().toISOString() : null,
    }, { onConflict: 'user_id,task_id,week_start,day' })

    setCompletions(prev => ({ ...prev, [key]: newVal }))
  }

  const isFriday = today === 'Fri'
  const regularTasks = TASKS.filter(t => !t.is_eow)
  const eowTasks = TASKS.filter(t => t.is_eow)

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

        {/* Week header */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800">
                <th className="text-left py-2 pr-4 text-gray-400 font-medium w-8">#</th>
                <th className="text-left py-2 pr-4 text-gray-400 font-medium">Task</th>
                <th className="text-left py-2 pr-4 text-gray-400 font-medium hidden md:table-cell">Time</th>
                <th className="text-left py-2 pr-4 text-gray-400 font-medium hidden md:table-cell">Est.</th>
                {DAYS.map(d => (
                  <th key={d} className={`text-center py-2 px-2 font-medium w-10 ${d === today ? 'text-blue-400' : 'text-gray-400'}`}>
                    {d}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {regularTasks.map(task => (
                <tr key={task.id} className="border-b border-gray-800/50">
                  <td className="py-3 pr-4 text-gray-500">{task.sop_number}</td>
                  <td className="py-3 pr-4">
                    <p className="font-medium">{task.name}</p>
                    <p className="text-xs text-gray-400 hidden sm:block">{task.description}</p>
                  </td>
                  <td className="py-3 pr-4 text-gray-400 hidden md:table-cell">{task.time_window}</td>
                  <td className="py-3 pr-4 text-gray-400 hidden md:table-cell">{task.est_time}</td>
                  {DAYS.map((d) => {
                    const isTaskDay = task.days.includes(d)
                    const key = `${task.id}-${d}`
                    const done = completions[key] ?? false
                    return (
                      <td key={d} className="text-center py-3 px-2">
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

        {/* EOW Tasks - only show on Fridays */}
        {isFriday && (
          <div className="mt-8">
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
                    <div>
                      <p className="font-medium text-sm">{task.name}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{task.description}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{task.time_window} · {task.est_time}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
