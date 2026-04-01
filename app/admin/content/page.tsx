'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

type Lesson = {
  id: number
  category: string
  lesson_name: string
  loom_link: string
}

type SOP = {
  id: number
  priority: string
  document_name: string
  link: string
}

type Task = {
  id: number
  sop_number: string
  task_name: string
  loom_link: string
  sop_doc_link: string
}

export default function ContentEditorPage() {
  const [tab, setTab] = useState<'lessons' | 'sops' | 'tasks'>('lessons')
  const [lessons, setLessons] = useState<Lesson[]>([])
  const [sops, setSops] = useState<SOP[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [saving, setSaving] = useState<number | null>(null)
  const [saved, setSaved] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const [l, s, t] = await Promise.all([
        supabase.from('incubator_lessons').select('id, category, lesson_name, loom_link').order('sort_order'),
        supabase.from('sop_documents').select('id, priority, document_name, link').order('sort_order'),
        supabase.from('task_definitions').select('id, sop_number, task_name, loom_link, sop_doc_link').order('id'),
      ])
      setLessons(l.data ?? [])
      setSops(s.data ?? [])
      setTasks(t.data ?? [])
      setLoading(false)
    }
    load()
  }, [])

  async function saveLesson(lesson: Lesson) {
    setSaving(lesson.id)
    const supabase = createClient()
    await supabase.from('incubator_lessons').update({ loom_link: lesson.loom_link }).eq('id', lesson.id)
    setSaving(null)
    setSaved(lesson.id)
    setTimeout(() => setSaved(null), 2000)
  }

  async function saveSOP(sop: SOP) {
    setSaving(sop.id)
    const supabase = createClient()
    await supabase.from('sop_documents').update({ link: sop.link }).eq('id', sop.id)
    setSaving(null)
    setSaved(sop.id)
    setTimeout(() => setSaved(null), 2000)
  }

  async function saveTask(task: Task) {
    setSaving(task.id)
    const supabase = createClient()
    await supabase.from('task_definitions').update({ loom_link: task.loom_link, sop_doc_link: task.sop_doc_link }).eq('id', task.id)
    setSaving(null)
    setSaved(task.id)
    setTimeout(() => setSaved(null), 2000)
  }

  if (loading) {
    return <div className="min-h-screen bg-gray-950 flex items-center justify-center text-gray-400">Loading...</div>
  }

  const tabs = [
    { key: 'lessons', label: 'Phase 2 Lessons' },
    { key: 'sops', label: 'Core SOPs' },
    { key: 'tasks', label: 'Task Sheet' },
  ] as const

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <nav className="border-b border-gray-800 px-6 py-4 flex items-center gap-4">
        <Link href="/admin" className="text-gray-400 hover:text-white text-sm">← Admin</Link>
        <h1 className="text-lg font-bold">Edit Content Links</h1>
      </nav>

      <main className="max-w-4xl mx-auto px-4 py-8">
        <p className="text-gray-400 text-sm mb-6">Paste in Loom URLs and SOP doc links. Each row saves individually.</p>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === t.key ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'}`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Phase 2 Lessons */}
        {tab === 'lessons' && (
          <div className="space-y-3">
            {lessons.map(lesson => (
              <div key={lesson.id} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                <div className="flex items-start justify-between gap-4 mb-2">
                  <div>
                    <p className="font-medium text-sm">{lesson.lesson_name}</p>
                    <p className="text-xs text-gray-500">{lesson.category}</p>
                  </div>
                  <button
                    onClick={() => saveLesson(lesson)}
                    disabled={saving === lesson.id}
                    className={`text-xs px-3 py-1.5 rounded-lg flex-shrink-0 transition-colors ${saved === lesson.id ? 'bg-green-700 text-green-200' : 'bg-blue-600 hover:bg-blue-700 text-white'} disabled:opacity-50`}
                  >
                    {saving === lesson.id ? 'Saving...' : saved === lesson.id ? 'Saved ✓' : 'Save'}
                  </button>
                </div>
                <input
                  type="url"
                  value={lesson.loom_link}
                  onChange={e => setLessons(prev => prev.map(l => l.id === lesson.id ? { ...l, loom_link: e.target.value } : l))}
                  placeholder="https://www.loom.com/share/..."
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            ))}
          </div>
        )}

        {/* Core SOPs */}
        {tab === 'sops' && (
          <div className="space-y-3">
            {sops.map(sop => (
              <div key={sop.id} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                <div className="flex items-start justify-between gap-4 mb-2">
                  <div>
                    <p className="font-medium text-sm">{sop.document_name}</p>
                    <span className={`text-xs px-1.5 py-0.5 rounded ${sop.priority === 'CRITICAL' ? 'bg-red-900/60 text-red-300' : 'bg-yellow-900/60 text-yellow-300'}`}>
                      {sop.priority}
                    </span>
                  </div>
                  <button
                    onClick={() => saveSOP(sop)}
                    disabled={saving === sop.id}
                    className={`text-xs px-3 py-1.5 rounded-lg flex-shrink-0 transition-colors ${saved === sop.id ? 'bg-green-700 text-green-200' : 'bg-blue-600 hover:bg-blue-700 text-white'} disabled:opacity-50`}
                  >
                    {saving === sop.id ? 'Saving...' : saved === sop.id ? 'Saved ✓' : 'Save'}
                  </button>
                </div>
                <input
                  type="url"
                  value={sop.link === 'Master SOP Documentation' ? '' : sop.link}
                  onChange={e => setSops(prev => prev.map(s => s.id === sop.id ? { ...s, link: e.target.value } : s))}
                  placeholder="https://docs.google.com/..."
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            ))}
          </div>
        )}

        {/* Task Sheet */}
        {tab === 'tasks' && (
          <div className="space-y-3">
            {tasks.map(task => (
              <div key={task.id} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div>
                    <p className="font-medium text-sm">{task.task_name}</p>
                    <p className="text-xs text-gray-500">SOP #{task.sop_number}</p>
                  </div>
                  <button
                    onClick={() => saveTask(task)}
                    disabled={saving === task.id}
                    className={`text-xs px-3 py-1.5 rounded-lg flex-shrink-0 transition-colors ${saved === task.id ? 'bg-green-700 text-green-200' : 'bg-blue-600 hover:bg-blue-700 text-white'} disabled:opacity-50`}
                  >
                    {saving === task.id ? 'Saving...' : saved === task.id ? 'Saved ✓' : 'Save'}
                  </button>
                </div>
                <div className="space-y-2">
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Loom Tutorial Link</label>
                    <input
                      type="url"
                      value={task.loom_link}
                      onChange={e => setTasks(prev => prev.map(t => t.id === task.id ? { ...t, loom_link: e.target.value } : t))}
                      placeholder="https://www.loom.com/share/..."
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">SOP Document Link</label>
                    <input
                      type="url"
                      value={task.sop_doc_link}
                      onChange={e => setTasks(prev => prev.map(t => t.id === task.id ? { ...t, sop_doc_link: e.target.value } : t))}
                      placeholder="https://docs.google.com/..."
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
