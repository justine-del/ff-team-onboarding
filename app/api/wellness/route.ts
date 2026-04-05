import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'

const anthropic = new Anthropic()

export async function POST(request: Request) {
  const { mood, note, userId, memberName } = await request.json()

  if (!mood || !userId || !memberName) {
    return Response.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const prompt = `You are a caring team wellness companion. A VA team member named ${memberName} just checked in.
Mood: ${mood}/5 (1=struggling, 3=okay, 5=amazing)
${note ? `They wrote: "${note}"` : "They didn't share anything specific."}

Write a warm, genuine, brief response (2-4 sentences).
- If mood is 1-2: Lead with empathy, acknowledge their feelings are valid, remind them they're not alone and the team supports them.
- If mood is 3: Acknowledge the middle ground, offer encouragement for the day.
- If mood 4-5: Celebrate with them, match their energy positively.
Never be clinical or corporate. Be human, warm, like a supportive colleague.
End with one short encouraging line for their workday.`

  const message = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 256,
    messages: [{ role: 'user', content: prompt }],
  })

  const replyBlock = message.content.find((b) => b.type === 'text')
  const reply = replyBlock && replyBlock.type === 'text' ? replyBlock.text : ''

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  await supabase.from('wellness_checkins').insert({
    user_id: userId,
    mood,
    note: note || null,
    ai_response: reply,
  })

  return Response.json({ reply })
}
