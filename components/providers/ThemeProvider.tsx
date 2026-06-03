'use client'

import { useEffect, useState } from 'react'

type Theme = 'dark' | 'light' | 'nightlight'

const THEMES: Theme[] = ['dark', 'light', 'nightlight']

const ICONS: Record<Theme, string> = {
  dark: '🌑',
  light: '☀️',
  nightlight: '🌙',
}

export default function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>('dark')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem('theme') as Theme | null
    if (saved && THEMES.includes(saved)) {
      setTheme(saved)
      document.documentElement.setAttribute('data-theme', saved)
    }
    setMounted(true)
  }, [])

  function cycleTheme() {
    const next = THEMES[(THEMES.indexOf(theme) + 1) % THEMES.length]
    setTheme(next)
    localStorage.setItem('theme', next)
    document.documentElement.setAttribute('data-theme', next)
  }

  return (
    <>
      {children}
      {mounted && (
        <button
          onClick={cycleTheme}
          title="Switch theme"
          className="fixed bottom-4 left-4 z-40 w-8 h-8 flex items-center justify-center bg-gray-800/80 backdrop-blur border border-gray-700/60 rounded-full shadow text-sm hover:bg-gray-700 transition-colors"
        >
          {ICONS[theme]}
        </button>
      )}
    </>
  )
}
