/**
 * Forest is the only theme. The root layout sets `data-theme="dark"` on <html>,
 * which the globals.css forest palette targets. This wrapper is intentionally a
 * pass-through (the old light/nightlight toggle was removed).
 */
export default function ThemeProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
