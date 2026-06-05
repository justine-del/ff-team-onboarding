import Link from 'next/link'
import QuickNav from '@/components/nav/QuickNav'

/**
 * Clean "this phase is locked" screen, rendered by a phase layout when the
 * prerequisite isn't met — instead of redirecting (which felt like a glitch).
 * Shows the lock state plainly with a link to the step that unlocks it.
 */
export default function LockedPhase({
  phaseLabel,
  prereqLabel,
  prereqHref,
  lockedPaths,
}: {
  phaseLabel: string
  prereqLabel: string
  prereqHref: string
  lockedPaths?: string[]
}) {
  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <QuickNav lockedPaths={lockedPaths} />
      <main className="max-w-xl mx-auto px-4 py-24 text-center">
        <div className="text-5xl mb-4">🔒</div>
        <h1 className="text-2xl font-bold mb-2">{phaseLabel} is locked</h1>
        <p className="text-gray-400 mb-6">
          Complete <span className="text-white font-medium">{prereqLabel}</span> first to unlock this phase.
        </p>
        <Link
          href={prereqHref}
          className="inline-block bg-green-600 hover:bg-green-500 text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-colors"
        >
          Go to {prereqLabel} →
        </Link>
      </main>
    </div>
  )
}
