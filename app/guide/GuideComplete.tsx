'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

/**
 * Sticky Phase 0 completion bar. Members click "Mark complete" to acknowledge
 * the Getting Started guide, which unlocks Phase 1. Hidden for admins (they
 * bypass gating) and once already completed.
 */
export default function GuideComplete({
  alreadyComplete,
  isAdmin,
}: {
  alreadyComplete: boolean
  isAdmin: boolean
}) {
  const [done, setDone] = useState(alreadyComplete)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  if (isAdmin) return null

  async function markComplete() {
    setSaving(true)
    setError('')
    const res = await fetch('/api/guide-complete', { method: 'POST' })
    if (!res.ok) {
      const j = await res.json().catch(() => ({}))
      setError(j.error ?? 'Something went wrong — try again.')
      setSaving(false)
      return
    }
    setDone(true)
    router.push('/dashboard')
    router.refresh()
  }

  return (
    <div className="fixed bottom-0 inset-x-0 z-40 border-t border-gray-800 bg-gray-950/95 backdrop-blur">
      <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
        <p className="text-sm text-gray-400">
          {done
            ? '✓ You’ve completed Getting Started — Phase 1 is unlocked.'
            : 'Read through this guide, then mark it complete to unlock Phase 1.'}
        </p>
        <div className="flex items-center gap-3">
          {error && <span className="text-xs text-amber-400">{error}</span>}
          {done ? (
            <button
              onClick={() => router.push('/dashboard')}
              className="text-sm font-medium bg-green-600 hover:bg-green-500 text-white px-5 py-2 rounded-lg transition-colors"
            >
              Go to dashboard →
            </button>
          ) : (
            <button
              onClick={markComplete}
              disabled={saving}
              className="text-sm font-medium bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white px-5 py-2 rounded-lg transition-colors"
            >
              {saving ? 'Saving…' : 'Mark complete & continue'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
