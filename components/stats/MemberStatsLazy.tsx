'use client'

import dynamic from 'next/dynamic'

/**
 * Client-side lazy wrapper for MemberStats. Recharts is heavy; loading it with
 * `ssr: false` keeps it out of the server render and the initial bundle so the
 * dashboard shell paints immediately, with a skeleton until the chart hydrates.
 */
const MemberStats = dynamic(() => import('./MemberStats'), {
  ssr: false,
  loading: () => (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 mb-6 h-64 animate-pulse" />
  ),
})

export default MemberStats
