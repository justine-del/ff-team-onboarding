import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: NextRequest) {
  try {
    const { memberName, weekOf, tasks, weeklyHours, dayOffs, userId } = await req.json()

    type Task = { name: string; days: string[]; loggedDays: Record<string, number>; totalMins: number }
    const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

    // Build per-day stats
    const dayStats = DAYS.map(day => {
      const scheduledTasks = (tasks as Task[]).filter(t => t.days.includes(day))
      const completedTasks = scheduledTasks.filter(t => (t.loggedDays[day] ?? 0) > 0)
      const rate = scheduledTasks.length > 0
        ? ((completedTasks.length / scheduledTasks.length) * 100).toFixed(1)
        : '—'
      const isOff = dayOffs?.[day]
      return {
        day,
        total: scheduledTasks.length,
        completed: completedTasks.length,
        rate,
        isOff,
        missedTasks: scheduledTasks.filter(t => (t.loggedDays[day] ?? 0) === 0).map(t => t.name),
      }
    })

    const tableText = dayStats
      .map(d => `${d.day} | ${d.total} | ${d.completed} | ${d.isOff ? `(${d.isOff === 'half' ? 'Half Day Off' : 'Day Off'})` : d.rate + '%'}`)
      .join('\n')

    const missedByDay = dayStats
      .filter(d => d.missedTasks.length > 0 && !d.isOff)
      .map(d => `  - ${d.day}: ${d.missedTasks.join(', ')}`)
      .join('\n')

    const goodDays = dayStats.filter(d => d.rate === '100.0' && !d.isOff).map(d => d.day)
    const badDays = dayStats.filter(d => d.completed < d.total && d.total > 0 && !d.isOff).map(d => d.day)

    const offDays = Object.entries(dayOffs as Record<string, string>)
      .map(([day, type]) => `${day} (${type === 'half' ? 'half day' : 'day off'})`)
      .join(', ')

    const prompt = `You are writing a professional end-of-week performance report in the FIRST PERSON (I/me/my) as if ${memberName} is writing it themselves. Never use third-person ("she", "he", "they", "${memberName} completed..."). Always write as "I completed...", "I worked on...", "My focus was...", etc.

Week of: ${weekOf}
Total hours logged: ${weeklyHours}h
${offDays ? `Days off/half days: ${offDays}` : ''}

Daily completion data:
Day | Total Tasks | Completed | Rate
${tableText}

Days with 100% completion: ${goodDays.join(', ') || 'None'}
Days with missed tasks: ${badDays.join(', ') || 'None'}
${missedByDay ? `Missed tasks by day:\n${missedByDay}` : ''}

Write a professional EOW report using EXACTLY this format and structure:

**EOW Performance Report — ${memberName} — Week of ${weekOf}**

**1. Daily Task Completion Table**

| Day | Total Tasks | Completed Tasks | Completion Rate (%) |
|---|---|---|---|
[Fill in each row using the data provided above. For days off, write the day off type in the Completion Rate column instead of a percentage.]

**2. Key Takeaways**

- Days Performed Well: [List days with 100% or strong completion. Be specific.]
- Days with Issues:
  [For each day with missed tasks, list which specific tasks were missed.]
- Patterns Noticed:
  [1-2 observations about patterns in completion across the week.]

**3. Recommendations**

[2-3 specific, actionable bullet points based on the week's performance.]

**4. Message to Founder (Slack)**

[Write this as a Slack message — casual but professional, no subject line, no "Best regards" sign-off. Start with a greeting like "Hey [Founder's name]!" then 2-3 sentences: briefly summarize the week's overall performance in first person (I/me), mention anything notable or flag anything that needs attention, and close with a short forward-looking note for next week. Keep it conversational like a real Slack message.]

Keep the tone professional and honest. Use only the data provided. Do not invent tasks or numbers.`

    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1500,
      messages: [{ role: 'user', content: prompt }],
    })

    const report = message.content[0].type === 'text' ? message.content[0].text : ''

    if (userId) {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { autoRefreshToken: false, persistSession: false } }
      )
      await supabase.from('eow_reports').insert({
        user_id: userId,
        member_name: memberName,
        week_of: weekOf,
        report_text: report,
      })
    }

    return NextResponse.json({ report })
  } catch (err) {
    console.error('EOW report error:', err)
    return NextResponse.json({ error: 'Failed to generate report' }, { status: 500 })
  }
}

function formatTime(mins: number): string {
  if (!mins) return '0m'
  if (mins < 60) return `${mins}m`
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return m > 0 ? `${h}h${m}m` : `${h}h`
}

// suppress unused warning
void formatTime
