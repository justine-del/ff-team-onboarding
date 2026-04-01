'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

const SOPS = [
  { id: 1, priority: 'CRITICAL', name: 'Funnel Futurist Overview', link: 'Master SOP Documentation', est_minutes: 45 },
  { id: 2, priority: 'CRITICAL', name: 'Daily Sheet Tracking Update', link: 'Master SOP Documentation', est_minutes: 30 },
  { id: 3, priority: 'CRITICAL', name: 'Weekly Reporting', link: 'Master SOP Documentation', est_minutes: 30 },
  { id: 4, priority: 'CRITICAL', name: 'Accountability', link: 'Master SOP Documentation', est_minutes: 20 },
  { id: 5, priority: 'CRITICAL', name: 'Data Privacy & Security', link: 'Master SOP Documentation', est_minutes: 10 },
  { id: 6, priority: 'CRITICAL', name: 'LastPass Complete Guide', link: 'Master SOP Documentation', est_minutes: 20 },
  { id: 7, priority: 'HIGH', name: 'Communication Policy - Slack', link: 'Master SOP Documentation', est_minutes: 30 },
  { id: 8, priority: 'HIGH', name: 'Time Off Policy', link: 'Master SOP Documentation', est_minutes: 15 },
  { id: 9, priority: 'HIGH', name: 'Invoice Policy', link: 'Master SOP Documentation', est_minutes: 10 },
  { id: 10, priority: 'HIGH', name: 'ClickUp Training', link: 'Master SOP Documentation', est_minutes: 20 },
]

export default function SOPsPage() {
  const [completions, setCompletions] = useState<Record<number, boolean>>({})
  const [userId, setUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setUserId(user.id)

      const { data } = await supabase
        .from('sop_completion')
        .select('sop_id, completed')
        .eq('user_id', user.id)

      const map: Record<number, boolean> = {}
      data?.forEach(row => { map[row.sop_id] = row.completed })
      setCompletions(map)
      setLoading(false)
    }
    load()
  }, [])

  async function toggleSOP(sopId: number) {
    if (!userId) return
    const supabase = createClient()
    const newVal = !completions[sopId]

    await supabase.from('sop_completion').upsert({
      user_id: userId,
      sop_id: sopId,
      completed: newVal,
      completed_at: newVal ? new Date().toISOString() : null,
    }, { onConflict: 'user_id,sop_id' })

    setCompletions(prev => ({ ...prev, [sopId]: newVal }))
  }

  const totalDone = SOPS.filter(s => completions[s.id]).length
  const allDone = totalDone === SOPS.length

  const criticals = SOPS.filter(s => s.priority === 'CRITICAL')
  const highs = SOPS.filter(s => s.priority === 'HIGH')

  if (loading) {
    return <div className="min-h-screen bg-gray-950 flex items-center justify-center text-gray-400">Loading...</div>
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <nav className="border-b border-gray-800 px-6 py-4 flex items-center gap-4">
        <Link href="/dashboard" className="text-gray-400 hover:text-white text-sm">← Dashboard</Link>
        <h1 className="text-lg font-bold">FF Core SOPs</h1>
      </nav>

      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <p className="text-gray-400 text-sm">{totalDone} of {SOPS.length} documents reviewed</p>
          <div className="w-48 bg-gray-800 rounded-full h-2">
            <div
              className="bg-yellow-500 h-2 rounded-full transition-all"
              style={{ width: `${Math.round((totalDone / SOPS.length) * 100)}%` }}
            />
          </div>
        </div>

        {[{ label: 'CRITICAL', items: criticals, color: 'red' }, { label: 'HIGH', items: highs, color: 'yellow' }].map(group => (
          <div key={group.label} className="mb-8">
            <div className="flex items-center gap-2 mb-3">
              <span className={`px-2 py-0.5 rounded text-xs font-bold ${group.color === 'red' ? 'bg-red-900/60 text-red-300' : 'bg-yellow-900/60 text-yellow-300'}`}>
                {group.label}
              </span>
            </div>
            <div className="space-y-2">
              {group.items.map(sop => {
                const done = completions[sop.id] ?? false
                return (
                  <div key={sop.id} className={`flex items-start gap-3 p-4 rounded-xl border transition-colors ${done ? 'bg-green-900/20 border-green-800/50' : 'bg-gray-900 border-gray-800'}`}>
                    <button
                      onClick={() => toggleSOP(sop.id)}
                      className={`mt-0.5 w-5 h-5 rounded flex-shrink-0 border-2 flex items-center justify-center cursor-pointer transition-colors ${done ? 'bg-green-500 border-green-500' : 'border-gray-600 hover:border-green-400'}`}
                    >
                      {done && <span className="text-white text-xs">✓</span>}
                    </button>
                    <div className="flex-1">
                      <p className="font-medium text-sm">{sop.name}</p>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-xs text-gray-500">
                          {sop.link === 'Master SOP Documentation' ? 'Link to be added by admin' : sop.link}
                        </span>
                        <span className="text-xs text-gray-500">~{sop.est_minutes} mins</span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ))}

        {allDone && (
          <div className="mt-6 p-6 bg-green-900/30 border border-green-700/50 rounded-xl text-center">
            <p className="text-2xl mb-2">🎉</p>
            <p className="font-bold text-green-300">CONGRATS! You finished the FF SOPs!</p>
          </div>
        )}
      </main>
    </div>
  )
}
