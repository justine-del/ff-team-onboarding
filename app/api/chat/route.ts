import Anthropic from '@anthropic-ai/sdk'
import { NextRequest, NextResponse } from 'next/server'
import { getDriveContext } from '@/lib/google-drive'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { FF_SYSTEM_PROMPT } from '@/config/chat-prompt'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

type SopRow = {
  document_name: string
  link: string | null
  priority: string
  est_minutes: number | null
}

function buildGenericPrompt(companyName: string, sops: SopRow[]): string {
  const intro = `You are the VA Assistant — a helpful bot for ${companyName} team members. You answer questions about the company's SOPs, policies, tools, and workflows.`

  if (sops.length === 0) {
    return `${intro}\n\nThe company hasn't added any SOPs yet. For any question, tell the member to ask in their Slack channel. Keep responses brief.`
  }

  const sopList = sops
    .map(s => {
      const parts = [`- **${s.document_name}** (${s.priority})`]
      if (s.link) parts.push(`  Link: ${s.link}`)
      if (s.est_minutes) parts.push(`  ~${s.est_minutes} min read`)
      return parts.join('\n')
    })
    .join('\n')

  return `${intro}

## ${companyName} SOPs

${sopList}

## How to answer

1. If the answer is in one of the SOPs above, give a concise answer and point the member to the relevant SOP link.
2. If the answer is NOT in the SOPs above, do not guess. Tell the member: "I don't have that in the SOPs yet — please ask in your Slack channel."
3. Keep responses brief and practical.`
}

function serviceClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export async function POST(req: NextRequest) {
  try {
    const { messages } = await req.json()

    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('company_id, companies(name, slug)')
      .eq('id', user.id)
      .single<{ company_id: string | null; companies: { name: string; slug: string } | null }>()

    const slug = profile?.companies?.slug
    const companyName = profile?.companies?.name ?? 'the company'

    let system: string
    if (slug === 'funnel-futurist') {
      const driveContext = await getDriveContext()
      console.log('[chat] FF drive context loaded:', driveContext ? `${driveContext.length} chars` : 'null (using built-in)')
      system = driveContext
        ? `${FF_SYSTEM_PROMPT}\n\n## Live SOP Documents (from Google Drive)\n\n${driveContext}`
        : FF_SYSTEM_PROMPT
    } else if (profile?.company_id) {
      const svc = serviceClient()
      const { data: sops } = await svc
        .from('sop_documents')
        .select('document_name, link, priority, est_minutes')
        .eq('company_id', profile.company_id)
        .order('sort_order', { ascending: true })
      system = buildGenericPrompt(companyName, (sops ?? []) as SopRow[])
      console.log(`[chat] generic prompt for "${companyName}" with ${sops?.length ?? 0} SOPs`)
    } else {
      return NextResponse.json({ error: 'No company assigned' }, { status: 400 })
    }

    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      system,
      messages,
    })

    const text = response.content[0].type === 'text' ? response.content[0].text : ''
    return NextResponse.json({ message: text })
  } catch (err) {
    console.error('Chat error:', err)
    if (err instanceof Error) {
      const msg = err.message.toLowerCase()
      if (msg.includes('rate limit') || msg.includes('usage limit') || msg.includes('overloaded')) {
        return NextResponse.json(
          { error: "I'm temporarily unavailable due to high demand. Please try again in a few minutes." },
          { status: 503 }
        )
      }
    }
    return NextResponse.json({ error: 'Failed to get response' }, { status: 500 })
  }
}
