'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import QuickNav from '@/components/QuickNav'

type Resource = {
  id: number
  title: string
  description: string | null
  loom_url: string | null
  category: string
  sort_order: number
  created_at: string
}

function getLoomEmbedUrl(url: string): string | null {
  const match = url.match(/loom\.com\/share\/([a-zA-Z0-9]+)/)
  if (match) return `https://www.loom.com/embed/${match[1]}`
  return null
}

const BLANK_FORM = { title: '', description: '', loom_url: '', category: 'General' }

export default function ResourcesPage() {
  const [resources, setResources] = useState<Resource[]>([])
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [selected, setSelected] = useState<Resource | null>(null)
  const [categoryFilter, setCategoryFilter] = useState('All')

  const [showAddForm, setShowAddForm] = useState(false)
  const [form, setForm] = useState(BLANK_FORM)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')

  const [editingId, setEditingId] = useState<number | null>(null)
  const [editForm, setEditForm] = useState(BLANK_FORM)
  const [editSaving, setEditSaving] = useState(false)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      setIsAdmin(['admin', 'super_admin'].includes(profile?.role ?? ''))

      const res = await fetch('/api/resources')
      const json = await res.json()
      setResources(json.resources ?? [])
      setLoading(false)
    }
    load()
  }, [])

  const categories = ['All', ...Array.from(new Set(resources.map(r => r.category))).sort()]
  const filtered = categoryFilter === 'All'
    ? resources
    : resources.filter(r => r.category === categoryFilter)

  async function handleAdd() {
    if (!form.title.trim()) return
    setSaving(true)
    setSaveError('')
    const res = await fetch('/api/resources', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const json = await res.json()
    if (!res.ok) { setSaveError(json.error ?? 'Failed to save'); setSaving(false); return }
    setResources(prev => [...prev, json.resource])
    setForm(BLANK_FORM)
    setShowAddForm(false)
    setSaving(false)
  }

  async function handleEdit(r: Resource) {
    setEditingId(r.id)
    setEditForm({ title: r.title, description: r.description ?? '', loom_url: r.loom_url ?? '', category: r.category })
  }

  async function handleEditSave() {
    if (!editingId) return
    setEditSaving(true)
    const res = await fetch('/api/resources', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: editingId, ...editForm }),
    })
    const json = await res.json()
    if (res.ok) {
      setResources(prev => prev.map(r => r.id === editingId ? json.resource : r))
      if (selected?.id === editingId) setSelected(json.resource)
    }
    setEditingId(null)
    setEditSaving(false)
  }

  async function handleDelete(id: number) {
    if (!confirm('Delete this resource?')) return
    await fetch('/api/resources', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    setResources(prev => prev.filter(r => r.id !== id))
    if (selected?.id === id) setSelected(null)
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <QuickNav />

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">Resources</h1>
            <p className="text-sm text-gray-400 mt-1">Looms, walkthroughs, and references</p>
          </div>
          {isAdmin && !showAddForm && (
            <button
              onClick={() => setShowAddForm(true)}
              className="bg-white text-black text-sm font-medium px-4 py-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              + Add Resource
            </button>
          )}
        </div>

        {/* Add form */}
        {isAdmin && showAddForm && (
          <div className="bg-gray-900 border border-gray-700 rounded-xl p-5 mb-6">
            <h2 className="text-sm font-semibold text-white mb-4">New Resource</h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Title *</label>
                <input
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-gray-500"
                  placeholder="e.g. GHL Custom Fields Setup"
                  value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Category</label>
                <input
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-gray-500"
                  placeholder="e.g. GoHighLevel"
                  value={form.category}
                  onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                />
              </div>
              <div className="sm:col-span-2">
                <label className="text-xs text-gray-400 mb-1 block">Loom URL</label>
                <input
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-gray-500"
                  placeholder="https://www.loom.com/share/..."
                  value={form.loom_url}
                  onChange={e => setForm(f => ({ ...f, loom_url: e.target.value }))}
                />
              </div>
              <div className="sm:col-span-2">
                <label className="text-xs text-gray-400 mb-1 block">Description</label>
                <textarea
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-gray-500 resize-none"
                  rows={3}
                  placeholder="What is this resource about?"
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                />
              </div>
            </div>
            {saveError && <p className="text-red-400 text-xs mt-2">{saveError}</p>}
            <div className="flex gap-2 mt-4">
              <button
                onClick={handleAdd}
                disabled={saving || !form.title.trim()}
                className="bg-white text-black text-sm font-medium px-4 py-2 rounded-lg hover:bg-gray-100 disabled:opacity-40 transition-colors"
              >
                {saving ? 'Saving…' : 'Save'}
              </button>
              <button
                onClick={() => { setShowAddForm(false); setForm(BLANK_FORM); setSaveError('') }}
                className="text-sm text-gray-400 hover:text-white px-4 py-2 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Category filter */}
        {!loading && categories.length > 1 && (
          <div className="flex gap-2 flex-wrap mb-5">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => { setCategoryFilter(cat); setSelected(null) }}
                className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                  categoryFilter === cat
                    ? 'bg-white text-black border-white'
                    : 'border-gray-700 text-gray-400 hover:text-white hover:border-gray-500'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        )}

        {/* Main content: two-panel */}
        {loading ? (
          <div className="text-gray-500 text-sm py-16 text-center">Loading resources…</div>
        ) : filtered.length === 0 ? (
          <div className="text-gray-500 text-sm py-16 text-center">No resources yet.</div>
        ) : (
          <div className="flex gap-4 items-start">
            {/* Resource list */}
            <div className={`flex flex-col gap-2 flex-shrink-0 ${selected ? 'w-72' : 'w-full max-w-2xl'}`}>
              {filtered.map(r => {
                const isSelected = selected?.id === r.id
                const isEditing = editingId === r.id

                if (isEditing) {
                  return (
                    <div key={r.id} className="bg-gray-900 border border-gray-600 rounded-xl p-4">
                      <div className="grid grid-cols-1 gap-2">
                        <input
                          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-gray-500"
                          value={editForm.title}
                          onChange={e => setEditForm(f => ({ ...f, title: e.target.value }))}
                          placeholder="Title"
                        />
                        <input
                          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-gray-500"
                          value={editForm.category}
                          onChange={e => setEditForm(f => ({ ...f, category: e.target.value }))}
                          placeholder="Category"
                        />
                        <input
                          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-gray-500"
                          value={editForm.loom_url}
                          onChange={e => setEditForm(f => ({ ...f, loom_url: e.target.value }))}
                          placeholder="Loom URL"
                        />
                        <textarea
                          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-gray-500 resize-none"
                          rows={2}
                          value={editForm.description}
                          onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))}
                          placeholder="Description"
                        />
                      </div>
                      <div className="flex gap-2 mt-3">
                        <button
                          onClick={handleEditSave}
                          disabled={editSaving}
                          className="text-xs bg-white text-black px-3 py-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-40"
                        >
                          {editSaving ? 'Saving…' : 'Save'}
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="text-xs text-gray-400 hover:text-white px-3 py-1.5"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )
                }

                return (
                  <div
                    key={r.id}
                    onClick={() => setSelected(isSelected ? null : r)}
                    className={`group cursor-pointer rounded-xl border p-4 transition-all ${
                      isSelected
                        ? 'bg-gray-800 border-gray-500'
                        : 'bg-gray-900 border-gray-800 hover:border-gray-600 hover:bg-gray-850'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="text-xs text-gray-500 bg-gray-800 border border-gray-700 px-2 py-0.5 rounded-full">
                            {r.category}
                          </span>
                          {r.loom_url && (
                            <span className="text-xs text-purple-400">▶ Loom</span>
                          )}
                        </div>
                        <p className="text-sm font-medium text-white truncate">{r.title}</p>
                        {r.description && !isSelected && (
                          <p className="text-xs text-gray-400 mt-1 line-clamp-2">{r.description}</p>
                        )}
                      </div>
                      {isAdmin && (
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" onClick={e => e.stopPropagation()}>
                          <button
                            onClick={() => handleEdit(r)}
                            className="text-xs text-gray-400 hover:text-white px-2 py-1 rounded hover:bg-gray-700"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(r.id)}
                            className="text-xs text-red-400 hover:text-red-300 px-2 py-1 rounded hover:bg-gray-700"
                          >
                            Del
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Loom embed panel */}
            {selected && (
              <div className="flex-1 bg-gray-900 border border-gray-800 rounded-xl overflow-hidden sticky top-4">
                <div className="p-5 border-b border-gray-800">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <span className="text-xs text-gray-500 bg-gray-800 border border-gray-700 px-2 py-0.5 rounded-full">
                        {selected.category}
                      </span>
                      <h2 className="text-base font-semibold text-white mt-2">{selected.title}</h2>
                      {selected.description && (
                        <p className="text-sm text-gray-400 mt-1 leading-relaxed">{selected.description}</p>
                      )}
                    </div>
                    <button
                      onClick={() => setSelected(null)}
                      className="text-gray-500 hover:text-white text-lg leading-none flex-shrink-0"
                    >
                      ×
                    </button>
                  </div>
                </div>

                {selected.loom_url && getLoomEmbedUrl(selected.loom_url) ? (
                  <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
                    <iframe
                      src={getLoomEmbedUrl(selected.loom_url)!}
                      className="absolute inset-0 w-full h-full"
                      frameBorder="0"
                      allowFullScreen
                      allow="autoplay; fullscreen"
                    />
                  </div>
                ) : selected.loom_url ? (
                  <div className="p-5">
                    <a
                      href={selected.loom_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-400 hover:text-blue-300 underline"
                    >
                      Open resource ↗
                    </a>
                  </div>
                ) : (
                  <div className="p-5 text-sm text-gray-500">No video attached.</div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
