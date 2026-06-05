/**
 * Full-page skeleton shown via route-level loading.tsx while a server route
 * fetches. Mirrors the common nav + cards layout so navigation feels instant
 * instead of blank.
 */
export default function LoadingScreen() {
  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="border-b border-gray-800 px-6 py-4 flex items-center justify-between">
        <div className="h-5 w-40 bg-gray-800 rounded animate-pulse" />
        <div className="h-4 w-48 bg-gray-800 rounded animate-pulse" />
      </div>
      <main className="max-w-5xl mx-auto px-4 py-8">
        <div className="h-8 w-64 bg-gray-800 rounded animate-pulse mb-6" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-gray-900 border border-gray-800 rounded-xl p-4 h-24 animate-pulse" />
          ))}
        </div>
      </main>
    </div>
  )
}
