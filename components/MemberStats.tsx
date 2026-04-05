'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
} from 'recharts'

type WeekRow = { week_start: string; day: string; time_spent: number }

type Props = {
  rows: WeekRow[]
  currentWeek: string // ISO Monday date, e.g. "2026-03-30"
  memberName: string
}

type StatusType = 'active' | 'inconsistent' | 'needs-attention'

const WORKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']

// Parse an ISO date string (YYYY-MM-DD) as local midnight to avoid UTC offset bugs
function parseLocalDate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

function toISODate(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function shortLabel(iso: string): string {
  const d = parseLocalDate(iso)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

// Get today's day abbreviation matching the workday keys (Mon, Tue, …)
function todayDayAbbr(): string {
  return new Date().toLocaleDateString('en-US', { weekday: 'short' })
}

export default function MemberStats({ rows, currentWeek, memberName }: Props) {
  // --- Derive last 8 week starts ---
  const baseDate = parseLocalDate(currentWeek)
  const weekStarts = Array.from({ length: 8 }, (_, i) =>
    toISODate(addDays(baseDate, -i * 7))
  )

  // --- Aggregate per-week data ---
  interface WeekData {
    weekStart: string
    label: string
    hours: number
    activeDays: number
  }

  const weekDataMap = new Map<string, WeekData>()
  for (const ws of weekStarts) {
    weekDataMap.set(ws, { weekStart: ws, label: shortLabel(ws), hours: 0, activeDays: 0 })
  }

  for (const row of rows) {
    const entry = weekDataMap.get(row.week_start)
    if (!entry) continue
    if (!WORKDAYS.includes(row.day)) continue
    if (row.time_spent > 0) {
      entry.hours += row.time_spent / 60
    }
  }

  // Count unique active days per week
  for (const ws of weekStarts) {
    const activeDaySet = new Set(
      rows
        .filter(r => r.week_start === ws && WORKDAYS.includes(r.day) && r.time_spent > 0)
        .map(r => r.day)
    )
    weekDataMap.get(ws)!.activeDays = activeDaySet.size
  }

  const weekData = weekStarts.map(ws => weekDataMap.get(ws)!)

  const thisWeekData = weekData[0]
  const lastWeekData = weekData[1]

  // --- Consistency (weekly) ---
  const thisWeekConsistency = Math.round((thisWeekData.activeDays / 5) * 100)
  const lastWeekConsistency = Math.round((lastWeekData.activeDays / 5) * 100)
  const consistencyDelta = thisWeekConsistency - lastWeekConsistency

  // --- Status ---
  let status: StatusType
  if (
    thisWeekConsistency >= 70 ||
    (lastWeekConsistency >= 70 && thisWeekConsistency >= 50)
  ) {
    status = 'active'
  } else if (thisWeekConsistency >= 30) {
    status = 'inconsistent'
  } else {
    status = 'needs-attention'
  }

  // --- Hours delta ---
  const hoursDelta = thisWeekData.hours - lastWeekData.hours

  // --- End of month check ---
  const today = new Date()
  const isEndOfMonth = today.getDate() >= 22
  const currentMonthStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`

  // Best week this month = week_start that begins in current month with highest hours
  const thisMonthWeeks = weekData.filter(w => w.weekStart.startsWith(currentMonthStr))
  const bestWeek =
    thisMonthWeeks.length > 0
      ? thisMonthWeeks.reduce((best, w) => (w.hours > best.hours ? w : best))
      : null

  // --- Motivational message ---
  const motivationalMessages: Record<StatusType, string> = {
    active: `Amazing month! You logged your best week of ${bestWeek ? bestWeek.hours.toFixed(1) : '0'}h. Keep the momentum going!`,
    inconsistent: "You showed up — now let's make next month even more consistent!",
    'needs-attention': "Every week is a fresh start. You've got this — let's make next month count!",
  }

  // --- Daily hours this week chart data ---
  const todayAbbr = todayDayAbbr()
  const dailyData = WORKDAYS.map(day => {
    const dayRows = rows.filter(
      r => r.week_start === currentWeek && r.day === day && r.time_spent > 0
    )
    const hours = dayRows.reduce((sum, r) => sum + r.time_spent / 60, 0)
    return { day, hours, isToday: day === todayAbbr }
  })

  // --- Weekly trend chart data (oldest → newest) ---
  const trendData = [...weekData].reverse().map(w => ({
    label: w.label,
    hours: parseFloat(w.hours.toFixed(2)),
    weekStart: w.weekStart,
  }))

  // Last week reference value for ReferenceLine
  const lastWeekHours = parseFloat(lastWeekData.hours.toFixed(2))

  // --- Badge & color config ---
  const statusConfig: Record<StatusType, { label: string; pill: string; dot: string }> = {
    active: {
      label: 'Active',
      pill: 'bg-green-900/50 text-green-300 border border-green-700/50',
      dot: 'bg-green-400',
    },
    inconsistent: {
      label: 'Inconsistent',
      pill: 'bg-yellow-900/50 text-yellow-300 border border-yellow-700/50',
      dot: 'bg-yellow-400',
    },
    'needs-attention': {
      label: 'Needs Attention',
      pill: 'bg-red-900/50 text-red-300 border border-red-700/50',
      dot: 'bg-red-400',
    },
  }

  const statusNote: Record<StatusType, string> = {
    active: 'Consistently logging tasks across the week.',
    inconsistent: 'Some gaps in daily logging — try to log each workday.',
    'needs-attention': 'Low activity detected — time to build the habit.',
  }

  const cfg = statusConfig[status]

  function barColorDaily(hours: number, isToday: boolean): string {
    if (hours > 0) return isToday ? '#4ade80' : '#22c55e'
    return isToday ? '#374151' : '#1f2937'
  }

  function barColorTrend(hours: number): string {
    if (hours >= 4) return '#22c55e'
    if (hours >= 1) return '#eab308'
    return '#374151'
  }

  // Custom tooltip for charts
  function CustomTooltip({
    active,
    payload,
    label,
  }: {
    active?: boolean
    payload?: Array<{ value: number }>
    label?: string
  }) {
    if (!active || !payload?.length) return null
    return (
      <div className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-xs text-white shadow-lg">
        <p className="text-gray-400 mb-0.5">{label}</p>
        <p className="font-semibold">{payload[0].value.toFixed(1)}h</p>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* Top stat pills */}
      <div className="flex flex-wrap gap-3">
        <div className="bg-gray-900 rounded-xl px-4 py-2.5 flex items-center gap-2">
          <span className="text-xs text-gray-400">This Week</span>
          <span className="text-sm font-semibold text-white">
            {thisWeekData.hours.toFixed(1)}h
          </span>
        </div>

        <div className="bg-gray-900 rounded-xl px-4 py-2.5 flex items-center gap-2">
          <span className="text-xs text-gray-400">vs Last Week</span>
          <span
            className={`text-sm font-semibold ${
              hoursDelta > 0
                ? 'text-green-400'
                : hoursDelta < 0
                ? 'text-red-400'
                : 'text-gray-400'
            }`}
          >
            {hoursDelta > 0 ? '+' : ''}
            {hoursDelta.toFixed(1)}h{' '}
            {hoursDelta > 0 ? '↑' : hoursDelta < 0 ? '↓' : ''}
          </span>
        </div>

        <div className="bg-gray-900 rounded-xl px-4 py-2.5 flex items-center gap-2">
          <span className="text-xs text-gray-400">Active Days</span>
          <span className="text-sm font-semibold text-white">
            {thisWeekData.activeDays}/5
          </span>
        </div>
      </div>

      {/* Status badge + note */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center gap-2">
          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${cfg.pill}`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
            {cfg.label}
          </span>
          <span className="text-xs text-gray-500 tabular-nums">
            {thisWeekConsistency}% this week
            {consistencyDelta !== 0 && (
              <span
                className={consistencyDelta > 0 ? 'text-green-500' : 'text-red-500'}
              >
                {' '}
                ({consistencyDelta > 0 ? '+' : ''}
                {consistencyDelta}%)
              </span>
            )}
          </span>
        </div>
        <p className="text-xs text-gray-500">{statusNote[status]}</p>
      </div>

      {/* End-of-month best week card */}
      {isEndOfMonth && bestWeek && (
        <div className="bg-gradient-to-r from-yellow-900/30 to-amber-900/20 border border-yellow-700/40 rounded-xl px-4 py-3">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-base">🏆</span>
            <span className="text-xs font-semibold text-yellow-300 uppercase tracking-wide">
              Best Week
            </span>
            <span className="text-xs text-yellow-500 ml-auto">{bestWeek.label}</span>
          </div>
          <p className="text-xs text-yellow-200/80">{motivationalMessages[status]}</p>
        </div>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Daily breakdown this week */}
        <div className="bg-gray-900 rounded-xl p-4">
          <p className="text-xs font-medium text-gray-400 mb-4 uppercase tracking-wide">
            Daily Breakdown — This Week
          </p>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart
              data={dailyData}
              margin={{ top: 4, right: 4, left: -24, bottom: 0 }}
              barCategoryGap="28%"
            >
              <XAxis
                dataKey="day"
                tick={{ fill: '#6b7280', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: '#6b7280', fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v: number) => `${v}h`}
              />
              <Tooltip
                content={<CustomTooltip />}
                cursor={{ fill: 'rgba(255,255,255,0.04)' }}
              />
              <Bar dataKey="hours" radius={[4, 4, 0, 0]}>
                {dailyData.map((entry, index) => (
                  <Cell
                    key={`daily-${index}`}
                    fill={barColorDaily(entry.hours, entry.isToday)}
                    opacity={entry.isToday ? 1 : 0.85}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Weekly trend (last 8 weeks) */}
        <div className="bg-gray-900 rounded-xl p-4">
          <p className="text-xs font-medium text-gray-400 mb-4 uppercase tracking-wide">
            Weekly Trend — Last 8 Weeks
          </p>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart
              data={trendData}
              margin={{ top: 4, right: 4, left: -24, bottom: 0 }}
              barCategoryGap="24%"
            >
              <XAxis
                dataKey="label"
                tick={{ fill: '#6b7280', fontSize: 10 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: '#6b7280', fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v: number) => `${v}h`}
              />
              <Tooltip
                content={<CustomTooltip />}
                cursor={{ fill: 'rgba(255,255,255,0.04)' }}
              />
              {lastWeekHours > 0 && (
                <ReferenceLine
                  y={lastWeekHours}
                  stroke="#6b7280"
                  strokeDasharray="4 3"
                  strokeWidth={1}
                  label={{
                    value: 'Last wk',
                    position: 'insideTopRight',
                    fill: '#6b7280',
                    fontSize: 10,
                  }}
                />
              )}
              <Bar dataKey="hours" radius={[4, 4, 0, 0]}>
                {trendData.map((entry, index) => (
                  <Cell
                    key={`trend-${index}`}
                    fill={barColorTrend(entry.hours)}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          {/* Legend */}
          <div className="flex items-center gap-4 mt-3 justify-end">
            <span className="flex items-center gap-1.5 text-xs text-gray-500">
              <span className="w-2 h-2 rounded-sm bg-green-500 inline-block" />
              ≥4h
            </span>
            <span className="flex items-center gap-1.5 text-xs text-gray-500">
              <span className="w-2 h-2 rounded-sm bg-yellow-500 inline-block" />
              1–4h
            </span>
            <span className="flex items-center gap-1.5 text-xs text-gray-500">
              <span className="w-2 h-2 rounded-sm bg-gray-700 inline-block" />
              0h
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
