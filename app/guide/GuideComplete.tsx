'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

/**
 * Phase 0 completion control. Members click "Mark complete" to acknowledge the
 * Getting Started guide, which unlocks Phase 1.
 * - variant="top": an inline button shown near the top of the guide.
 * - variant="bottom": a sticky bar at the bottom (with right padding so its
 *   button never sits under the floating chat bubble).
 * Admins bypass gating, so they see a subtle note instead of the button.
 */
export default function GuideComplete({
  alreadyComplete,
  isAdmin,
  variant = 'bottom',
}: {
  alreadyComplete: boolean
  isAdmin: boolean
  variant?: 'top' | 'bottom'
}) {
  const [done, setDone] = useState(alreadyComplete)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  if (isAdmin) {
    if (variant === 'bottom') return null
    return (
      <p className="text-xs text-gray-500 mb-4">Admin view — all phases are unlocked for you.</p>
    )
  }

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

  const button = done ? (
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
      {saving ? 'Saving…' : '✓ Mark complete & continue'}
    </button>
  )

  if (variant === 'top') {
    return (
      <div className="flex items-center gap-3 mb-6 flex-wrap">
        {button}
        <span className="text-xs text-gray-400">
          {done ? 'Getting Started complete — Phase 1 is unlocked.' : 'Read the guide, then mark it complete to unlock Phase 1.'}
        </span>
        {error && <span className="text-xs text-amber-400">{error}</span>}
      </div>
    )
  }

  // Sticky bottom bar. The inner container has extra right padding so the button
  // never sits under the floating chat bubble (fixed bottom-right).
  return (
    <div className="fixed bottom-0 inset-x-0 z-50 border-t border-gray-800 bg-gray-950/95 backdrop-blur">
      <div className="max-w-5xl mx-auto pl-4 pr-20 py-3 flex items-center justify-between gap-4">
        <p className="text-sm text-gray-400">
          {done
            ? '✓ You’ve completed Getting Started — Phase 1 is unlocked.'
            : 'Read through this guide, then mark it complete to unlock Phase 1.'}
        </p>
        <div className="flex items-center gap-3">
          {error && <span className="text-xs text-amber-400">{error}</span>}
          {button}
        </div>
      </div>
    </div>
  )
}
