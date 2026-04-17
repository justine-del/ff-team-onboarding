import Groq from 'groq-sdk'
import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  if (!process.env.GROQ_API_KEY) {
    return NextResponse.json(
      { error: 'GROQ_API_KEY is not configured. Add it to Vercel environment variables.' },
      { status: 500 }
    )
  }

  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

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

TONE RULES — follow these strictly:
- Keep the overall tone balanced, honest, and professional. Do NOT frame the report as negative or self-critical.
- If task notes say a task was low priority, deprioritized, or deferred intentionally, treat those tasks as a conscious choice — NOT as a failure or missed task. Reframe them as "I intentionally deprioritized X to focus on Y" rather than "I missed X."
- Highlight what was accomplished and why. Lead with wins, then provide context for anything not completed.
- The Slack message must be upbeat and confident — not apologetic. Never say "I didn't meet my goals" or "I missed tasks."

Week of: ${weekOf}
Total hours logged: ${weeklyHours}h
${offDays ? `Days off/half days: ${offDays}` : ''}
${taskNotes?.length ? `\nTask notes from the member (CRITICAL — read these carefully before writing anything; they explain priorities, context, and intentional decisions for the week. If a note says a task was low priority or not the focus, reflect that framing throughout the report):\n${(taskNotes as string[]).join('\n')}` : ''}

Daily completion data:
Day | Total Tasks | Completed | Rate
${tableText}

Days with 100% completion: ${goodDays.join(', ') || 'None'}
Days with incomplete tasks: ${badDays.join(', ') || 'None'}
${missedByDay ? `Tasks not completed by day:\n${missedByDay}` : ''}

Write a professional EOW report using EXACTLY this format and structure:

**EOW Performance Report — ${memberName} — Week of ${weekOf}**

**1. Daily Task Completion Table**

| Day | Total Tasks | Completed Tasks | Completion Rate (%) |
|---|---|---|---|
[Fill in each row using the data provided above. For days off, write the day off type in the Completion Rate column instead of a percentage.]

**2. Key Takeaways**

- Focus This Week: [Summarize what the main priority or focus was this week, drawing from task notes. If notes explain that certain tasks were intentionally deprioritized, state that clearly and positively.]
- Strong Days: [List days with 100% or high completion. If no perfect days, highlight the best-performing day and what was accomplished.]
- Tasks Deferred or Deprioritized: [If task notes indicate tasks were intentionally skipped or made low priority, frame them as deliberate choices with the reason. Only call something an "issue" if there is no note explaining it.]
- Patterns Noticed: [1-2 balanced observations about the week. Lead with what went well.]

**3. Recommendations**

[2-3 forward-looking, constructive bullet points. Focus on what to carry into next week, not on what went wrong. If notes mention specific plans or follow-ups, reference those here.]

**4. Message to Founder (Slack)**

[Casual but professional Slack message. No subject line, no "Best regards." Start with a warm greeting. 2-3 sentences: highlight the week's main focus and what was accomplished (first person), briefly mention anything intentionally deferred and why (if relevant), then close with a positive note about next week. Tone: confident and proactive, not apologetic.]

Keep the tone professional and honest. Use only the data provided. Do not invent tasks or numbers.`

    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      max_tokens: 2000,
      messages: [{ role: 'user', content: prompt }],
    })

    const report = completion.choices[0]?.message?.content ?? ''

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
