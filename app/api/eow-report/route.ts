import { GoogleGenerativeAI } from '@google/generative-ai'
import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  if (!process.env.GOOGLE_AI_API_KEY) {
    return NextResponse.json(
      { error: 'GOOGLE_AI_API_KEY is not configured. Add it to Vercel environment variables.' },
      { status: 500 }
    )
  }

  const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY)
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })

  try {
    const { memberName, weekOf, tasks, weeklyHours, dayOffs, userId, taskNotes } = await req.json()

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

    const offDays = Object.entries((dayOffs ?? {}) as Record<string, string>)
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

Keep the tone professional and honest. Use only the data provided. Do not invent tasks or numbers.
${taskNotes?.length ? `\nMember's own task notes (use as supporting context for takeaways and recommendations — do not quote verbatim):\n${(taskNotes as string[]).join('\n')}` : ''}`

    const result = await model.generateContent(prompt)
    const report = result.response.text()

    // Save report independently — never let a DB failure block report delivery
    if (userId) {
      try {
        const supabase = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!,
          { auth: { autoRefreshToken: false, persistSession: false } }
        )
        const { error: saveError } = await supabase.from('eow_reports').insert({
          user_id: userId,
          member_name: memberName,
          week_of: weekOf,
          report_text: report,
        })
        if (saveError) console.error('EOW report save failed:', saveError.message)
      } catch (saveErr) {
        console.error('EOW report save threw:', saveErr)
      }
    }

    return NextResponse.json({ report })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('EOW report generation error:', err)
    return NextResponse.json({ error: `Failed to generate report: ${message}` }, { status: 500 })
  }
}
