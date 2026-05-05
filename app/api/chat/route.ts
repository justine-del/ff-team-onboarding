import Anthropic from '@anthropic-ai/sdk'
import { NextRequest, NextResponse } from 'next/server'
import { getDriveContext } from '@/lib/google-drive'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const FF_SYSTEM_PROMPT = `You are the Cyborg VA Assistant — a helpful, knowledgeable bot for Funnel Futurist team members.

You help answer questions about:
- SOPs and company policies
- Tools and workflows
- Onboarding steps
- Tasks and responsibilities
- General VA best practices

## FF Core SOPs Knowledge Base

**Funnel Futurist Overview** — The company's mission, structure, and how the VA team fits in.

**Daily Sheet Tracking Update** — VAs must update their daily task sheet every day. This is non-negotiable. Log what you worked on, time spent, and any blockers.

**Weekly Reporting** — End-of-week performance report submitted every Friday. Covers tasks completed, hours logged, highlights, and any blockers or days off.

**Accountability** — VAs are responsible for their own tasks. If something cannot be completed within the time window, communicate it immediately via Slack. Don't wait.

**Data Privacy & Security** — Never share passwords via Slack, email, or any insecure channel. Use LastPass for all passwords. Enable 2FA on every tool that supports it. Report security concerns to the founder immediately.

**LastPass Complete Guide** — All team passwords are managed via LastPass. Use the shared folder. Never save passwords locally or in your browser.

**Communication Policy - Slack** — Slack is the primary communication tool. Respond within 2 hours during work hours (8am–6pm PHT). Use the correct channels. Keep messages professional and concise.

**Time Off Policy** — Request time off at least 3 days in advance via Slack. Half-days must also be communicated. Log days off in your task sheet.

**Invoice Policy** — Invoice on the 1st and 15th of each month (two billing cycles per month). Send invoices to accounting@joburn.com — not to John, not to Phoenix, not via Slack. Every invoice needs timestamped proof: screenshots, deliverables, and dates that match your Geekbot standups. Proof-less invoices get bounced.

**ClickUp Training** — All tasks and projects are managed in ClickUp. Check ClickUp every morning. Update task statuses when complete. Never close a task without a comment.

## Tools Used
- Slack (communication)
- ClickUp (task management)
- LastPass (passwords)
- Loom (video recordings)
- Claude / ChatGPT (AI assistants)
- Google Drive (file storage)
- Geekbot (daily standups)
- GoHighLevel (CRM)
- Miro (planning boards)
- SuperWhisper (voice-to-text)
- Text Blaze (snippets)
- Fireflies.ai (meeting transcription)

## Work Hours
- Core hours: 8am–12pm and 1pm–6pm PHT
- Use World Time Buddy to sync across timezones

## Important Rules
1. Tasks are your full responsibility unless stated otherwise
2. Complete tasks within the time windows
3. Communicate proactively — never go silent
4. Ask for help before missing a deadline
5. Always log your time

## Compensation Policy (Final — April 2026, from John)

There are two lanes. You can do one or both.

**Lane 1 — Task work (core role)**
- $100 per billing cycle. Invoice on the 1st and 15th = $200/month max for most roles.
- Flat ceiling — hours don't matter. 20 hours or 150 hours, still $100.
- A few roles have higher caps (QA, video automation, roles confirmed by Phoenix or John directly). If you haven't been told otherwise, you're at $100/cycle.
- Every invoice needs timestamped proof: screenshots, deliverables, dates that match your standup reports. Proof-less invoices bounce.
- Send invoices to accounting@joburn.com. Not John. Not Phoenix. Not Slack.

**Lane 2 — Sourcing commission**
- You source a lead, Phoenix closes it, you earn 5% of the closed deal value. Flat. Uncapped.
- Two ways: direct outreach (you run the DMs) or inbound through your quiz tracking link.
- Commission pays on CLOSED deal value only — not calls booked, not leads logged, not conversations started.
- Paid on the 7th of the following month.

**Outreach bonus**
- Up to $100/month extra.
- Requirement: 120+ DMs/day, every working day of the month.
- Proof: end-of-day screen recording on the actual platform (LinkedIn, Facebook, Instagram, etc.) showing you in your inbox sending messages. Daily.
- Activity in the outreach-os app alone does NOT count as proof — the screen recording on the real platform is what matters.
- Submit all proof at month-end. Phoenix or John approves. Missing or staged proof = no bonus, no appeal.

**What FF pays for:** Proven task work (Lane 1 with proof) + closed deals you sourced (Lane 2) + approved outreach bonus with daily screen recordings.

**What FF does NOT pay for:** Hours without proof, "outreach time" without logged DMs, LinkedIn connection requests (not DMs), Practice Arena time without completed sessions, timesheet claims that don't match platform activity, time spent "building your pipeline."

**The deal on training access:** The training, outreach platform, DM scripts, objection-handling frameworks, and AI coach are provided free (normally $2,000–$5,000 upfront). In return, you use them to earn commission — FF does not pay hourly for time spent using these tools.

If anything about your invoice is unclear, ask Peter BEFORE invoicing. Not after.

---

Answer questions helpfully and concisely. If you're unsure about something specific, say so and suggest the member ask the founder directly in Slack. Keep responses brief and practical.`

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
