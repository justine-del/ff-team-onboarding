'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { brand } from '@/config/brand'

const TABS = [
  { href: '/guide',             label: 'Getting Started' },
  { href: '/dashboard',         label: 'Home' },
  { href: '/onboarding/phase1', label: 'Phase 1' },
  { href: '/onboarding/phase2', label: 'Phase 2' },
  { href: '/onboarding/sops',   label: 'SOPs' },
  { href: '/tasks',             label: 'Task Sheet' },
  { href: '/resources',         label: 'Resources' },
]

/**
 * Universal top nav: brand → tabs (incl. Getting Started) → admin links + sign
 * out. Rendered on every member page so nothing is buried. Pass `isAdmin` from
 * server pages that know the role to surface the Admin/Performance links.
 */
export default function QuickNav({ isAdmin = false, lockedPaths = [] }: { isAdmin?: boolean; lockedPaths?: string[] }) {
  const pathname = usePathname()
  const locked = new Set(lockedPaths)

  return (
    <header className="border-b border-gray-800 px-6 flex items-center gap-4 overflow-x-auto">
      <Link href="/dashboard" className="text-sm font-bold whitespace-nowrap flex-shrink-0">
        {brand.shortName}
      </Link>
      <nav className="flex gap-1 flex-1">
        {TABS.map(tab => {
          const active = pathname === tab.href || pathname.startsWith(tab.href + '/')
          const isLocked = locked.has(tab.href)
          if (isLocked) {
            return (
              <span
                key={tab.href}
                title="Complete the previous step to unlock"
                className="text-sm font-medium text-gray-600 px-3 py-3 border-b-2 border-transparent whitespace-nowrap flex-shrink-0 cursor-not-allowed flex items-center gap-1"
              >
                <span aria-hidden>🔒</span>{tab.label}
              </span>
            )
          }
          return active ? (
            <span
              key={tab.href}
              className="text-sm font-medium text-white px-3 py-3 border-b-2 border-green-500 whitespace-nowrap flex-shrink-0"
            >
              {tab.label}
            </span>
          ) : (
            <Link
              key={tab.href}
              href={tab.href}
              className="text-sm font-medium text-gray-400 hover:text-white px-3 py-3 border-b-2 border-transparent hover:border-gray-600 whitespace-nowrap flex-shrink-0 transition-colors"
            >
              {tab.label}
            </Link>
          )
        })}
      </nav>
      <div className="flex items-center gap-3 flex-shrink-0">
        {isAdmin && (
          <>
            <Link href="/admin" className="text-sm text-blue-400 hover:text-blue-300">Admin</Link>
            <Link href="/admin/performance" className="text-sm text-purple-400 hover:text-purple-300">Performance</Link>
          </>
        )}
        <form action="/auth/signout" method="post">
          <button className="text-sm text-gray-400 hover:text-white transition-colors">Sign out</button>
        </form>
      </div>
    </header>
  )
}
