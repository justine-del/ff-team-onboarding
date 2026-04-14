'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import QuickNav from '@/components/QuickNav'

type SOP = {
  id: number
  priority: string
  document_name: string
  link: string | null
  est_minutes: number | null
  sort_order: number
  company_id: string
}

type CompletionData = { completed: boolean; completed_at: string | null }

const BLANK_FORM = { document_name: '', link: '', priority: 'HIGH', est_minutes: '' }

function formatCompletedAt(ts: string): string {
  return new Date(ts).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
}

export default function SOPsPage() {
  const [sops, setSops] = useState<SOP[]>([])
  const [completions, setCompletions] = useState<Record<number, CompletionData>>({})
  const [userId, setUserId] = useState<string | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)

  // Add / Edit state
  const [showAddForm, setShowAddForm] = useState(false)
  const [addForm, setAddForm] = useState(BLANK_FORM)
  const [addLoading, setAddLoading] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editForm, setEditForm] = useState(BLANK_FORM)
  const [editLoading, setEditLoading] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState<number | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      setUserId(user.id)

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      const adminUser = profile?.role === 'admin' || profile?.role === 'super_admin'
      setIsAdmin(adminUser)

      // Load company SOPs from DB
      const { data: sopData } = await supabase
        .from('sop_documents')
        .select('*')
        .order('sort_order', { ascending: true })

      setSops(sopData ?? [])

      // Load completions
      const { data: compData } = await supabase
        .from('sop_completion')
        .select('sop_id, completed, completed_at')
        .eq('user_id', user.id)

      const map: Record<number, CompletionData> = {}
      compData?.forEach(row => { map[row.sop_id] = { completed: row.completed, completed_at: row.completed_at } })
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

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    setAddLoading(true)
    setError('')
    const res = await fetch('/api/sops', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(addForm),
    })
    const result = await res.json()
    if (result.error) {
      setError(result.error)
    } else {
      setSops(prev => [...prev, result.sop])
      setAddForm(BLANK_FORM)
      setShowAddForm(false)
    }
    setAddLoading(false)
  }

  function startEdit(sop: SOP) {
    setEditingId(sop.id)
    setEditForm({
      document_name: sop.document_name,
      link: sop.link ?? '',
      priority: sop.priority,
      est_minutes: sop.est_minutes?.toString() ?? '',
    })
    setError('')
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault()
    if (!editingId) return
    setEditLoading(true)
    setError('')
    const res = await fetch('/api/sops', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: editingId, ...editForm }),
    })
    const result = await res.json()
    if (result.error) {
      setError(result.error)
    } else {
      setSops(prev => prev.map(s => s.id === editingId ? result.sop : s))
      setEditingId(null)
    }
    setEditLoading(false)
  }

  async function handleDelete(sopId: number) {
    if (!confirm('Delete this SOP? This also removes all member completions for it.')) return
    setDeleteLoading(sopId)
    setError('')
    const res = await fetch('/api/sops', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: sopId }),
    })
    const result = await res.json()
    if (result.error) {
      setError(result.error)
    } else {
      setSops(prev => prev.filter(s => s.id !== sopId))
      setCompletions(prev => { const c = { ...prev }; delete c[sopId]; return c })
    }
    setDeleteLoading(null)
  }

  const totalDone = sops.filter(s => completions[s.id]?.completed).length
  const allDone = sops.length > 0 && totalDone === sops.length
  const criticals = sops.filter(s => s.priority === 'CRITICAL')
  const highs = sops.filter(s => s.priority === 'HIGH')

  const inputClass = 'bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-full'

  function SOPForm({ form, setForm, onSubmit, loading, onCancel, submitLabel }: {
    form: typeof BLANK_FORM
    setForm: (f: typeof BLANK_FORM) => void
    onSubmit: (e: React.FormEvent) => void
    loading: boolean
    onCancel: () => void
    submitLabel: string
  }) {
    return (
      <form onSubmit={onSubmit} className="bg-gray-900 border border-gray-800 rounded-xl p-4 mt-2">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
          <div className="sm:col-span-2">
            <label className="block text-xs text-gray-400 mb-1">Document Name</label>
            <input required value={form.document_name} onChange={e => setForm({ ...form, document_name: e.target.value })} className={inputClass} placeholder="e.g. Communication Policy" />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs text-gray-400 mb-1">Link (Google Doc, Notion, etc.)</label>
            <input value={form.link} onChange={e => setForm({ ...form, link: e.target.value })} className={inputClass} placeholder="https://..." />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Priority</label>
            <select value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })} className={inputClass}>
              <option value="CRITICAL">CRITICAL</option>
              <option value="HIGH">HIGH</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Est. minutes to read</label>
            <input type="number" min="1" value={form.est_minutes} onChange={e => setForm({ ...form, est_minutes: e.target.value })} className={inputClass} placeholder="e.g. 20" />
          </div>
        </div>
        <div className="flex gap-2">
          <button type="submit" disabled={loading} className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-4 py-1.5 rounded-lg text-sm transition-colors">
            {loading ? 'Saving...' : submitLabel}
          </button>
          <button type="button" onClick={onCancel} className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-1.5 rounded-lg text-sm transition-colors">
            Cancel
          </button>
        </div>
      </form>
    )
  }

  if (loading) return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center text-gray-400">Loading...</div>
  )

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <nav className="border-b border-gray-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard" className="text-gray-400 hover:text-white text-sm">← Dashboard</Link>
          <h1 className="text-lg font-bold">SOPs</h1>
        </div>
        {isAdmin && (
          <button
            onClick={() => { setShowAddForm(!showAddForm); setError('') }}
            className="text-sm bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            + Add SOP
          </button>
        )}
      </nav>

      <QuickNav />

      <main className="max-w-4xl mx-auto px-4 py-8">
        {error && (
          <div className="mb-4 p-3 bg-red-900/40 border border-red-700 rounded-lg text-red-300 text-sm">{error}</div>
        )}

        {sops.length === 0 && !showAddForm ? (
          <div className="text-center py-16 text-gray-400">
            <p className="text-lg mb-2">No SOPs yet</p>
            {isAdmin
              ? <p className="text-sm">Click &ldquo;+ Add SOP&rdquo; to add your first company SOP.</p>
              : <p className="text-sm">Your admin hasn&apos;t added any SOPs yet.</p>
            }
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-6">
              <p className="text-gray-400 text-sm">{totalDone} of {sops.length} documents reviewed</p>
              <div className="w-48 bg-gray-800 rounded-full h-2">
                <div
                  className="bg-yellow-500 h-2 rounded-full transition-all"
                  style={{ width: sops.length ? `${Math.round((totalDone / sops.length) * 100)}%` : '0%' }}
                />
              </div>
            </div>

            {showAddForm && (
              <div className="mb-6">
                <p className="text-sm font-medium text-blue-300 mb-1">New SOP</p>
                <SOPForm
                  form={addForm} setForm={setAddForm}
                  onSubmit={handleAdd} loading={addLoading}
                  onCancel={() => { setShowAddForm(false); setError('') }}
                  submitLabel="Add SOP"
                />
              </div>
            )}

            {[{ label: 'CRITICAL', items: criticals, color: 'red' }, { label: 'HIGH', items: highs, color: 'yellow' }].map(group => (
              group.items.length === 0 ? null : (
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

                      if (editingId === sop.id) {
                        return (
                          <div key={sop.id}>
                            <SOPForm
                              form={editForm} setForm={setEditForm}
                              onSubmit={handleEdit} loading={editLoading}
                              onCancel={() => { setEditingId(null); setError('') }}
                              submitLabel="Save Changes"
                            />
                          </div>
                        )
                      }

                      return (
                        <div key={sop.id} className={`flex items-start gap-3 p-4 rounded-xl border transition-colors ${done ? 'bg-green-900/20 border-green-800/50' : 'bg-gray-900 border-gray-800'}`}>
                          <button
                            onClick={() => toggleSOP(sop.id)}
                            className={`mt-0.5 w-5 h-5 rounded flex-shrink-0 border-2 flex items-center justify-center cursor-pointer transition-colors ${done ? 'bg-green-500 border-green-500' : 'border-gray-600 hover:border-green-400'}`}
                          >
                            {done && <span className="text-white text-xs">✓</span>}
                          </button>
                          <div className="flex-1">
                            <p className="font-medium text-sm">{sop.document_name}</p>
                            <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                              {sop.link && (
                                <a href={sop.link} target="_blank" rel="noopener noreferrer" className="text-xs text-purple-400 hover:text-purple-300">
                                  View SOP →
                                </a>
                              )}
                              {sop.est_minutes && <span className="text-xs text-gray-500">~{sop.est_minutes} mins</span>}
                              {done && data?.completed_at && (
                                <span className="text-xs text-green-500">✓ {formatCompletedAt(data.completed_at)}</span>
                              )}
                            </div>
                          </div>
                          {isAdmin && (
                            <div className="flex gap-1.5 shrink-0">
                              <button
                                onClick={() => startEdit(sop)}
                                className="text-xs bg-gray-700 hover:bg-gray-600 text-white px-2 py-1 rounded transition-colors"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleDelete(sop.id)}
                                disabled={deleteLoading === sop.id}
                                className="text-xs bg-red-900/60 hover:bg-red-900 disabled:opacity-50 text-red-300 px-2 py-1 rounded transition-colors"
                              >
                                {deleteLoading === sop.id ? '...' : 'Delete'}
                              </button>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            ))}
          </>
        )}

        {allDone && (
          <div className="mt-6 p-6 bg-green-900/30 border border-green-700/50 rounded-xl text-center">
            <p className="text-2xl mb-2">🎉</p>
            <p className="font-bold text-green-300">All SOPs reviewed!</p>
          </div>
        )}
      </main>
    </div>
  )
}
