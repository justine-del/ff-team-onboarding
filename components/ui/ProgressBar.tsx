/** Thin progress bar. Track + accent fill; width is value/total clamped to 100%. */
export default function ProgressBar({
  value,
  total,
  className = '',
}: {
  value: number
  total: number
  className?: string
}) {
  const pct = total > 0 ? Math.min(100, Math.round((value / total) * 100)) : 0
  return (
    <div className={`w-full bg-gray-800 rounded-full h-1.5 ${className}`}>
      <div className="bg-green-500 h-1.5 rounded-full transition-all" style={{ width: `${pct}%` }} />
    </div>
  )
}
