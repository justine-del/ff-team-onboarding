'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import QuickNav from '@/components/QuickNav'

const MOODS = [
  { value: 1, emoji: '😰', label: 'Struggling', ring: 'border-red-500',    bg: 'bg-red-950/40'    },
  { value: 2, emoji: '😔', label: 'Low',        ring: 'border-orange-500', bg: 'bg-orange-950/40' },
  { value: 3, emoji: '😐', label: 'Okay',       ring: 'border-yellow-500', bg: 'bg-yellow-950/40' },
  { value: 4, emoji: '🙂', label: 'Good',       ring: 'border-blue-500',   bg: 'bg-blue-950/40'   },
  { value: 5, emoji: '🤩', label: 'Amazing',    ring: 'border-green-500',  bg: 'bg-green-950/40'  },
]

export default function WellnessPage() {
  const [mood, setMood] = useState<number | null>(null)
  const [note, setNote] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [reply, setReply] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const [memberName, setMemberName] = useState('')

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return
      setUserId(user.id)
      const { data: profile } = await supabase
        .from('profiles')
        .select('first_name')
        .eq('id', user.id)
        .single()
      if (profile?.first_name) {
        setMemberName(profile.first_name)
      }
    })
  }, [])

  async function handleSubmit() {
    if (!mood || !userId) return
    setSubmitting(true)
    try {
      const res = await fetch('/api/wellness', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mood, note, userId, memberName: memberName || 'there' }),
      })
      const data = await res.json()
      setReply(data.reply ?? '')
      setSubmitted(true)
    } finally {
      setSubmitting(false)
    }
  }

  function handleReset() {
    setMood(null)
    setNote('')
    setReply('')
    setSubmitted(false)
  }

  const selectedMood = MOODS.find((m) => m.value === mood)

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col">
      <nav className="border-b border-gray-800 px-6 py-4 flex items-center gap-4">
        <Link href="/dashboard" className="text-gray-400 hover:text-white text-sm">← Dashboard</Link>
        <h1 className="text-lg font-bold">Wellness Check</h1>
      </nav>
      <QuickNav />
      <div className="flex flex-col items-center px-4 py-10">
      <div className="w-full max-w-lg">

        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8">
          {/* Header */}
          <div className="flex items-center gap-2 mb-8">
            <span className="text-2xl">💙</span>
            <h1 className="text-xl font-bold">How are you feeling today?</h1>
          </div>

          {!submitted ? (
            <>
              {/* Mood buttons */}
              <div className="flex gap-2 justify-between mb-8">
                {MOODS.map((m) => {
                  const isSelected = mood === m.value
                  return (
                    <button
                      key={m.value}
                      onClick={() => setMood(m.value)}
                      className={[
                        'flex flex-col items-center gap-1.5 flex-1 rounded-xl py-3 px-1 border-2 transition-all',
                        isSelected
                          ? `${m.ring} ${m.bg}`
                          : 'border-transparent hover:border-gray-600 hover:bg-gray-800',
                      ].join(' ')}
                    >
                      <span className="text-3xl leading-none">{m.emoji}</span>
                      <span
                        className={[
                          'text-xs font-medium',
                          isSelected ? 'text-white' : 'text-gray-400',
                        ].join(' ')}
                      >
                        {m.label}
                      </span>
                    </button>
                  )
                })}
              </div>

              {/* Optional note */}
              <div className="mb-6">
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Anything on your mind? (optional)"
                  rows={3}
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 resize-none focus:outline-none focus:border-gray-500 transition-colors"
                />
              </div>

              {/* Submit */}
              <button
                onClick={handleSubmit}
                disabled={!mood || submitting}
                className="w-full bg-white text-gray-900 font-semibold rounded-xl py-3 text-sm disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-100 transition-colors flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <>
                    <span className="inline-block w-4 h-4 border-2 border-gray-400 border-t-gray-900 rounded-full animate-spin" />
                    Sending...
                  </>
                ) : (
                  'Check In'
                )}
              </button>
            </>
          ) : (
            <>
              {/* Reply card */}
              <div className="mb-6">
                {selectedMood && (
                  <div className="flex items-center gap-2 mb-4">
                    <span className="text-2xl">{selectedMood.emoji}</span>
                    <span className="text-sm text-gray-400">
                      You checked in as <span className="text-white font-medium">{selectedMood.label}</span>
                    </span>
                  </div>
                )}
                <div className="bg-gray-800 border border-gray-700 rounded-xl p-5">
                  <p className="text-gray-200 text-sm leading-relaxed">
                    <span className="mr-1">💙</span>
                    {reply}
                  </p>
                </div>
              </div>

              {/* Check in again */}
              <button
                onClick={handleReset}
                className="w-full border border-gray-700 text-gray-300 font-medium rounded-xl py-3 text-sm hover:border-gray-500 hover:text-white transition-colors"
              >
                Check in again
              </button>
            </>
          )}
        </div>
      </div>
      </div>
    </div>
  )
}
