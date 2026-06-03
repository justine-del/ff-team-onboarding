'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const TABS = [
  { href: '/dashboard',         label: 'Home' },
  { href: '/onboarding/phase1', label: 'Phase 1' },
  { href: '/onboarding/phase2', label: 'Phase 2' },
  { href: '/onboarding/sops',   label: 'SOPs' },
  { href: '/tasks',             label: 'Task Sheet' },
  { href: '/resources',         label: 'Resources' },
]

export default function QuickNav() {
  const pathname = usePathname()

  return (
    <nav className="border-b border-gray-800 px-6 flex gap-1 overflow-x-auto">
      {TABS.map(tab => {
        const active = pathname === tab.href || pathname.startsWith(tab.href + '/')
        return active ? (
          <span
            key={tab.href}
            className="text-sm font-medium text-white px-4 py-3 border-b-2 border-white whitespace-nowrap flex-shrink-0"
          >
            {tab.label}
          </span>
        ) : (
          <Link
            key={tab.href}
            href={tab.href}
            className="text-sm font-medium text-gray-400 hover:text-white px-4 py-3 border-b-2 border-transparent hover:border-gray-600 whitespace-nowrap flex-shrink-0 transition-colors"
          >
            {tab.label}
          </Link>
        )
      })}
    </nav>
  )
}
