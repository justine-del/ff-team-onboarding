import Anthropic from '@anthropic-ai/sdk'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { NextResponse, type NextRequest } from 'next/server'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(request: NextRequest) {
  const authClient = await createServerClient()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await authClient
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!['admin', 'super_admin'].includes(profile?.role ?? '')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { transcript, loom_url } = await request.json()
  if (!transcript?.trim()) return NextResponse.json({ error: 'Transcript required' }, { status: 400 })

  const message = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 300,
    messages: [{
      role: 'user',
      content: `Based on this Loom video transcript, generate metadata for a resource library entry.

Transcript:
${transcript.trim()}

Respond with ONLY valid JSON (no markdown, no explanation):
{
  "title": "concise title (max 8 words, action-oriented)",
  "description": "1-2 sentence summary of what this video covers and who it's useful for",
  "category": "one category label (e.g. GoHighLevel, Onboarding, AI Tools, SOPs, Ads, etc.)"
}`,
    }],
  })

  const raw = (message.content[0] as { type: string; text: string }).text.trim()

  try {
    const parsed = JSON.parse(raw)
    return NextResponse.json({ title: parsed.title, description: parsed.description, category: parsed.category })
  } catch {
    return NextResponse.json({ error: 'Failed to parse AI response' }, { status: 500 })
  }
}
