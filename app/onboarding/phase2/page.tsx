'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

const LESSONS = [
  // Orientation - Video
  { id: 1, category: 'Orientation - Video', name: 'START HERE', description: 'Watch this first — overview of the Cyborg VA program and what to expect', loom_link: '#', benchmark_mins: 10 },
  { id: 2, category: 'Orientation - Video', name: 'The Cyborg VA Roles', description: 'Understand the different VA roles and responsibilities within the team', loom_link: '#', benchmark_mins: 15 },
  { id: 3, category: 'Orientation - Video', name: 'Claude brain / GPT brain', description: 'How to use Claude and ChatGPT as your AI thinking partners', loom_link: '#', benchmark_mins: 20 },
  { id: 4, category: 'Orientation - Video', name: 'Business Fundamentals', description: 'Core business concepts you need to understand to succeed in this role', loom_link: '#', benchmark_mins: 25 },
  { id: 5, category: 'Orientation - Video', name: 'Customer Journey', description: 'Map the client experience from lead to loyal customer', loom_link: '#', benchmark_mins: 20 },
  { id: 6, category: 'Orientation - Video', name: 'Elite values & Mindset', description: 'The mindset and values that define elite performance at Funnel Futurist', loom_link: '#', benchmark_mins: 15 },
  // Ramp - Video
  { id: 7, category: 'Ramp - Video', name: 'Core Skills', description: 'Essential skills every Cyborg VA must master', loom_link: '#', benchmark_mins: 30 },
  { id: 8, category: 'Ramp - Video', name: 'Core Tools', description: "Deep dive into the tools you'll use every day", loom_link: '#', benchmark_mins: 30 },
  { id: 9, category: 'Ramp - Video', name: '3D Framework', description: 'The 3D Framework for delivering exceptional work', loom_link: '#', benchmark_mins: 20 },
  { id: 10, category: 'Ramp - Video', name: '2-min Intro Loom', description: 'Create your introduction Loom video for the team', loom_link: '#', benchmark_mins: 10 },
  { id: 11, category: 'Ramp - Video', name: 'Daily/Weekly SOP', description: 'Learn your daily and weekly standard operating procedures', loom_link: '#', benchmark_mins: 20 },
  { id: 12, category: 'Ramp - Video', name: 'AI Essentials - Mastery', description: 'Master the AI tools that power your work as a Cyborg VA', loom_link: '#', benchmark_mins: 45 },
  { id: 13, category: 'Ramp - Video', name: 'Gemini for Document Creation', description: 'Use Gemini AI to create professional documents faster', loom_link: '#', benchmark_mins: 30 },
  { id: 14, category: 'Ramp - Video', name: 'The Omnipresent Organic Authority System', description: 'Build and manage omnipresent organic content systems', loom_link: '#', benchmark_mins: 45 },
  { id: 15, category: 'Ramp - Video', name: 'Complete Go Highlevel Guide', description: 'Full training on Go HighLevel CRM and marketing automation', loom_link: '#', benchmark_mins: 60 },
  { id: 16, category: 'Ramp - Video', name: 'Omnipresent Authority Ads Training', description: 'Learn to run and manage authority-building ad campaigns', loom_link: '#', benchmark_mins: 45 },
  // Quiz
  { id: 17, category: 'Quiz', name: 'ORIENTATION QUIZ', description: "Complete the orientation quiz to confirm you've absorbed the fundamentals", loom_link: '#', benchmark_mins: 15 },
]

const CATEGORIES = ['Orientation - Video', 'Ramp - Video', 'Quiz']

export default function Phase2Page() {
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
        .from('lesson_completion')
        .select('lesson_id, completed')
        .eq('user_id', user.id)

      const map: Record<number, boolean> = {}
      data?.forEach(row => { map[row.lesson_id] = row.completed })
      setCompletions(map)
      setLoading(false)
    }
    load()
  }, [])

  async function toggleLesson(lessonId: number) {
    if (!userId) return
    const supabase = createClient()
    const newVal = !completions[lessonId]

    await supabase.from('lesson_completion').upsert({
      user_id: userId,
      lesson_id: lessonId,
      completed: newVal,
      completed_at: newVal ? new Date().toISOString() : null,
    }, { onConflict: 'user_id,lesson_id' })

    setCompletions(prev => ({ ...prev, [lessonId]: newVal }))
  }

  const totalDone = LESSONS.filter(l => completions[l.id]).length

  if (loading) {
    return <div className="min-h-screen bg-gray-950 flex items-center justify-center text-gray-400">Loading...</div>
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <nav className="border-b border-gray-800 px-6 py-4 flex items-center gap-4">
        <Link href="/dashboard" className="text-gray-400 hover:text-white text-sm">← Dashboard</Link>
        <h1 className="text-lg font-bold">Phase 2: Cyborg VA Incubator — Foundations</h1>
      </nav>

      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <p className="text-gray-400 text-sm">{totalDone} of {LESSONS.length} lessons complete</p>
          <div className="w-48 bg-gray-800 rounded-full h-2">
            <div
              className="bg-purple-500 h-2 rounded-full transition-all"
              style={{ width: `${Math.round((totalDone / LESSONS.length) * 100)}%` }}
            />
          </div>
        </div>

        <div className="space-y-8">
          {CATEGORIES.map(category => {
            const lessons = LESSONS.filter(l => l.category === category)
            const catDone = lessons.filter(l => completions[l.id]).length

            return (
              <div key={category}>
                <div className="flex items-center gap-3 mb-3">
                  <h2 className="font-semibold text-gray-200">{category}</h2>
                  <span className="text-xs text-gray-500">{catDone}/{lessons.length}</span>
                </div>
                <div className="space-y-2">
                  {lessons.map(lesson => {
                    const done = completions[lesson.id] ?? false
                    return (
                      <div key={lesson.id} className={`flex items-start gap-3 p-4 rounded-xl border transition-colors ${done ? 'bg-green-900/20 border-green-800/50' : 'bg-gray-900 border-gray-800'}`}>
                        <button
                          onClick={() => toggleLesson(lesson.id)}
                          className={`mt-0.5 w-5 h-5 rounded flex-shrink-0 border-2 flex items-center justify-center cursor-pointer transition-colors ${done ? 'bg-green-500 border-green-500' : 'border-gray-600 hover:border-green-400'}`}
                        >
                          {done && <span className="text-white text-xs">✓</span>}
                        </button>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm">{lesson.name}</p>
                          <p className="text-xs text-gray-400 mt-0.5">{lesson.description}</p>
                          <div className="flex items-center gap-3 mt-2">
                            {lesson.loom_link !== '#' && (
                              <a
                                href={lesson.loom_link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-blue-400 hover:text-blue-300"
                              >
                                Watch video →
                              </a>
                            )}
                            <span className="text-xs text-gray-500">~{lesson.benchmark_mins} mins</span>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      </main>
    </div>
  )
}
