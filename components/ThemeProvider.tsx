'use client'

import { useEffect, useState } from 'react'

type Theme = 'dark' | 'light' | 'nightlight'

const THEMES: Theme[] = ['dark', 'light', 'nightlight']

const ICONS: Record<Theme, string> = {
  dark: '🌑',
  light: '☀️',
  nightlight: '🌙',
}

const LABELS: Record<Theme, string> = {
  dark: 'Dark',
  light: 'Light',
  nightlight: 'Night',
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
          title={`Theme: ${LABELS[theme]} — click to switch`}
          className="fixed bottom-4 right-4 z-50 flex items-center gap-1.5 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-300 hover:text-white text-xs px-3 py-2 rounded-full shadow-lg transition-colors"
        >
          <span>{ICONS[theme]}</span>
          <span>{LABELS[theme]}</span>
        </button>
      )}
    </>
  )
}
