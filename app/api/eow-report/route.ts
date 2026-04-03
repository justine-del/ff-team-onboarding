import Anthropic from '@anthropic-ai/sdk'
import { NextRequest, NextResponse } from 'next/server'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: NextRequest) {
  try {
    const { memberName, weekOf, tasks, weeklyHours, dayOffs } = await req.json()

    const taskLines = tasks
      .filter((t: { totalMins: number; name: string; days: string[]; loggedDays: Record<string, number> }) => t.totalMins > 0 || t.days.length > 0)
      .map((t: { name: string; days: string[]; loggedDays: Record<string, number>; totalMins: number }) => {
        const daySummary = t.days
          .map((d: string) => `${d}: ${t.loggedDays[d] ? formatTime(t.loggedDays[d]) : '—'}`)
          .join(', ')
        return `- ${t.name} | ${daySummary} | Total: ${formatTime(t.totalMins)}`
      })
      .join('\n')

    const offDays = Object.entries(dayOffs as Record<string, string>)
      .map(([day, type]) => `${day} (${type === 'half' ? 'half day' : 'day off'})`)
      .join(', ')

    const prompt = `You are writing a professional end-of-week performance report for a virtual assistant named ${memberName}.

Week of: ${weekOf}
Total hours logged: ${weeklyHours}h
${offDays ? `Days off/half days: ${offDays}` : ''}

Task breakdown:
${taskLines || 'No tasks logged this week.'}

Write a concise, professional EOW report in this format:

**EOW Performance Report — ${memberName} — Week of ${weekOf}**

**Summary**
2-3 sentences summarizing the week's output and overall performance.

**Tasks Completed**
Bullet list of tasks that had time logged, with time spent.

**Hours Breakdown**
Total: ${weeklyHours}h logged across the week.

**Highlights**
1-2 things done well or notable this week.

**Notes / Blockers**
Any days off or anything worth flagging. If no blockers, write "None."

**Message to Founder**
A short, professional 2-3 sentence personal message from ${memberName} to their founder. Should reflect on the week, express commitment, flag anything they want the founder to know, and close positively.

Keep it professional, clear, and under 350 words. Do not add extra commentary outside the report format.`

    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    })

    const report = message.content[0].type === 'text' ? message.content[0].text : ''
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
