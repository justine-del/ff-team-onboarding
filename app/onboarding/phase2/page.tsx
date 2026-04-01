'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

const BASE = 'https://docs.google.com/document/d/1ipxjN1qkppZCttHQ8JNJqhy5EJafdN830INj01BosK4/edit'

const LESSONS = [
  // Orientation - Video
  { id: 1,  category: 'Orientation - Video', name: 'START HERE',                              description: 'Discover the two types of VAs and how to become an elite Cyborg VA',                                     doc_link: `${BASE}?tab=t.0#heading=h.vaae8ia5t4k0`,                      loom_link: null,                                                                benchmark_mins: 4  },
  { id: 2,  category: 'Orientation - Video', name: 'The Cyborg VA Roles',                     description: 'Learn to function as a founder\'s operational right hand across different VA roles',                    doc_link: `${BASE}?tab=t.ha46dxvgs0z8`,                                  loom_link: null,                                                                benchmark_mins: 6  },
  { id: 3,  category: 'Orientation - Video', name: 'Claude brain / GPT brain',                description: 'Understand your client\'s AI-powered assistant systems for maximum productivity',                       doc_link: `${BASE}?tab=t.9ct01zs2q8f`,                                   loom_link: null,                                                                benchmark_mins: 20 },
  { id: 4,  category: 'Orientation - Video', name: 'Business Fundamentals',                   description: 'Understand the three core pillars of any business and how every role contributes',                      doc_link: `${BASE}?tab=t.96rhlqmc6lh8`,                                  loom_link: null,                                                                benchmark_mins: 10 },
  { id: 5,  category: 'Orientation - Video', name: 'Customer Journey',                        description: 'Masterclass on the customer transformation framework that represents the entire business strategy',      doc_link: `${BASE}?tab=t.rn4nb3a00vp8`,                                  loom_link: null,                                                                benchmark_mins: 10 },
  { id: 6,  category: 'Orientation - Video', name: 'Elite values & Mindset',                  description: 'The three core Cyborg VA values that shape everything you do and make you stand out',                  doc_link: `${BASE}?tab=t.b1vk02hgxdv1`,                                  loom_link: null,                                                                benchmark_mins: 30 },
  // Ramp - Video
  { id: 7,  category: 'Ramp - Video',        name: 'Core Skills',                             description: 'Master essential VA skills to excel in competitive situations',                                          doc_link: `${BASE}?tab=t.aolgg0h2jdw2`,                                  loom_link: null,                                                                benchmark_mins: 10 },
  { id: 8,  category: 'Ramp - Video',        name: 'Core Tools',                              description: 'Get trained on all essential tools that Cyborg VAs use for maximum productivity',                       doc_link: `${BASE}?tab=t.yn4yejxkms6n`,                                  loom_link: null,                                                                benchmark_mins: 20 },
  { id: 9,  category: 'Ramp - Video',        name: '3D Framework',                            description: 'Command center document to level up fast, stay aligned, and turn tasks into systems',                  doc_link: `${BASE}?tab=t.djgqv1e9z8nh`,                                  loom_link: null,                                                                benchmark_mins: 20 },
  { id: 10, category: 'Ramp - Video',        name: '2-min Intro Loom',                        description: 'Create an engaging 2-minute introduction video showcasing your value as a Cyborg VA',                  doc_link: `${BASE}?tab=t.xv3o6in48tlj`,                                  loom_link: null,                                                                benchmark_mins: 10 },
  { id: 11, category: 'Ramp - Video',        name: 'Daily/Weekly SOP',                        description: 'Learn the protocol for creating SOPs that document your workflows and processes',                       doc_link: `${BASE}?tab=t.1aaxnscwwzc7`,                                  loom_link: null,                                                                benchmark_mins: 20 },
  { id: 12, category: 'Ramp - Video',        name: 'AI Essentials - Mastery',                 description: 'Distilled wisdom from 3+ years of AI implementation to master AI tools in real business',             doc_link: `${BASE}?tab=t.wz7bx2jerije#heading=h.trfrgx7vpyp5`,          loom_link: null,                                                                benchmark_mins: 30 },
  { id: 13, category: 'Ramp - Video',        name: 'Gemini for Document Creation',            description: 'Use Google Gemini instead of Claude to create, edit, and export well-formatted Google Docs',           doc_link: `${BASE}?tab=t.j42odyozdaw6`,                                  loom_link: 'https://youtu.be/v9CZ8vFQ_bo',                                     benchmark_mins: 30 },
  { id: 14, category: 'Ramp - Video',        name: 'The Omnipresent Organic Authority System',description: 'Learn the 5-step Omnipresent Authority Funnel strategy for organic attention and content distribution', doc_link: `${BASE}?tab=t.hzamsm4x2v9g#heading=h.kxb3w18tsxtf`,          loom_link: 'https://youtu.be/8JD6BkoFQdU',                                     benchmark_mins: 45 },
  { id: 15, category: 'Ramp - Video',        name: 'Complete Go Highlevel Guide',             description: 'Comprehensive training on managing CRM systems and sales operations in HighLevel',                      doc_link: `${BASE}?tab=t.m1zhfslk00di`,                                  loom_link: 'https://www.loom.com/share/2c53daff890148ef973cc29e6ae19350',      benchmark_mins: 60 },
  { id: 16, category: 'Ramp - Video',        name: 'Omnipresent Authority Ads Training',      description: 'Learn the paid advertising strategy and campaign launch process for maximum reach and conversions',     doc_link: `${BASE}?tab=t.k23m2sw1bvjs#heading=h.xurx1ggqgh3f`,          loom_link: 'https://youtu.be/AM9PIxlNPK8',                                     benchmark_mins: 55 },
  // Quiz
  { id: 17, category: 'Quiz',                name: 'ORIENTATION QUIZ',                        description: 'Complete this certification exam to demonstrate your understanding of core training modules',            doc_link: null,                                                          loom_link: 'https://k0tk16hntji.typeform.com/to/nCnNhiUH',                     benchmark_mins: 7  },
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
                          <div className="flex items-center gap-3 mt-2 flex-wrap">
                            {lesson.doc_link && (
                              <a href={lesson.doc_link} target="_blank" rel="noopener noreferrer" className="text-xs text-purple-400 hover:text-purple-300">
                                View resource →
                              </a>
                            )}
                            {lesson.loom_link && (
                              <a href={lesson.loom_link} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-400 hover:text-blue-300">
                                {lesson.id === 17 ? 'Take quiz →' : 'Watch video →'}
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
