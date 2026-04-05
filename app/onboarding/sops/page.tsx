'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import QuickNav from '@/components/QuickNav'

const SOPS = [
  { id: 1,  priority: 'CRITICAL', name: 'Funnel Futurist Overview',        est_minutes: 45, doc_link: 'https://docs.google.com/document/d/1-w9XLBzLirHQuicHnScLaAhVEHhV21PyRRVR8mLy0zo/edit?pli=1&tab=t.gtqrj7ku20p4' },
  { id: 2,  priority: 'CRITICAL', name: 'Daily Sheet Tracking Update',     est_minutes: 30, doc_link: 'https://docs.google.com/document/d/14mB6RywUjrdX0ZsNSLMIKD16eDFv6i_nLlhrZ-138z0/edit?tab=t.ncr9g63k9qqu#heading=h.yisnceh2al87' },
  { id: 3,  priority: 'CRITICAL', name: 'Weekly Reporting',                est_minutes: 30, doc_link: 'https://docs.google.com/document/d/14mB6RywUjrdX0ZsNSLMIKD16eDFv6i_nLlhrZ-138z0/edit?tab=t.gwffa3gfippg' },
  { id: 4,  priority: 'CRITICAL', name: 'Accountability',                  est_minutes: 20, doc_link: 'https://docs.google.com/document/d/14mB6RywUjrdX0ZsNSLMIKD16eDFv6i_nLlhrZ-138z0/edit?tab=t.vf3ywukchg7k#heading=h.oj7uvula8pw9' },
  { id: 5,  priority: 'CRITICAL', name: 'Data Privacy & Security',         est_minutes: 10, doc_link: 'https://docs.google.com/document/d/14mB6RywUjrdX0ZsNSLMIKD16eDFv6i_nLlhrZ-138z0/edit?tab=t.l48nut1f9s1v#heading=h.1839bfphqn1f' },
  { id: 6,  priority: 'CRITICAL', name: 'LastPass Complete Guide',         est_minutes: 20, doc_link: 'https://docs.google.com/document/d/14mB6RywUjrdX0ZsNSLMIKD16eDFv6i_nLlhrZ-138z0/edit?tab=t.l48nut1f9s1v#heading=h.cq5dxg6tgbo9' },
  { id: 7,  priority: 'HIGH',     name: 'Communication Policy - Slack',    est_minutes: 30, doc_link: 'https://docs.google.com/document/d/14mB6RywUjrdX0ZsNSLMIKD16eDFv6i_nLlhrZ-138z0/edit?tab=t.vo7m77jnvd96' },
  { id: 8,  priority: 'HIGH',     name: 'Time Off Policy',                 est_minutes: 15, doc_link: 'https://docs.google.com/document/d/14mB6RywUjrdX0ZsNSLMIKD16eDFv6i_nLlhrZ-138z0/edit?tab=t.vo7m77jnvd96#heading=h.1aab3yccu4dr' },
  { id: 9,  priority: 'HIGH',     name: 'Invoice Policy',                  est_minutes: 10, doc_link: 'https://docs.google.com/document/d/14mB6RywUjrdX0ZsNSLMIKD16eDFv6i_nLlhrZ-138z0/edit?tab=t.deqnt61hseb7#heading=h.91k1s8vt8v7h' },
  { id: 10, priority: 'HIGH',     name: 'ClickUp Training',                est_minutes: 20, doc_link: 'https://docs.google.com/document/d/14mB6RywUjrdX0ZsNSLMIKD16eDFv6i_nLlhrZ-138z0/edit?tab=t.8yg4y9ikur76#heading=h.r006pmpy0wwk' },
]

type CompletionData = { completed: boolean; completed_at: string | null }

function formatCompletedAt(ts: string): string {
  return new Date(ts).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
}

export default function SOPsPage() {
  const [completions, setCompletions] = useState<Record<number, CompletionData>>({})
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
        .select('sop_id, completed, completed_at')
        .eq('user_id', user.id)

      const map: Record<number, CompletionData> = {}
      data?.forEach(row => { map[row.sop_id] = { completed: row.completed, completed_at: row.completed_at } })
      setCompletions(map)
      setLoading(false)
    }
    load()
  }, [])

  async function toggleSOP(sopId: number) {
    if (!userId) return
    const supabase = createClient()
    const current = completions[sopId]
    const newVal = !(current?.completed ?? false)
    const now = new Date().toISOString()

    await supabase.from('sop_completion').upsert({
      user_id: userId,
      sop_id: sopId,
      completed: newVal,
      completed_at: newVal ? now : null,
    }, { onConflict: 'user_id,sop_id' })

    setCompletions(prev => ({ ...prev, [sopId]: { completed: newVal, completed_at: newVal ? now : null } }))
  }

  const totalDone = SOPS.filter(s => completions[s.id]?.completed).length
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

      <QuickNav />

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
                const data = completions[sop.id]
                const done = data?.completed ?? false
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
                      <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                        <a
                          href={sop.doc_link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-purple-400 hover:text-purple-300"
                        >
                          View SOP →
                        </a>
                        <span className="text-xs text-gray-500">~{sop.est_minutes} mins</span>
                        {done && data?.completed_at && (
                          <span className="text-xs text-green-500">✓ {formatCompletedAt(data.completed_at)}</span>
                        )}
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
