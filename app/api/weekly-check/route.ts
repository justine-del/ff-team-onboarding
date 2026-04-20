import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

// Monday of the current week in PHT (UTC+8), returned as YYYY-MM-DD.
// Mondays before 6pm PHT (10am UTC) are still treated as last week —
// members have until 5:59pm PHT to log and submit their EOW report.
function getWeekStartPHT(offsetWeeks = 0): string {
  const phtNow = new Date(Date.now() + 8 * 60 * 60 * 1000) // shift to PHT
  const day = phtNow.getUTCDay()   // 0=Sun, 1=Mon, …
  const diffToMonday = day === 0 ? -6 : 1 - day
  const monday = new Date(phtNow)
  monday.setUTCDate(phtNow.getUTCDate() + diffToMonday + offsetWeeks * 7)
  monday.setUTCHours(0, 0, 0, 0)
  return monday.toISOString().split('T')[0]
}

export async function GET(req: NextRequest) {
  // Protect with optional secret — set WEEKLY_CHECK_SECRET in env to lock it down
  const secret = process.env.WEEKLY_CHECK_SECRET
  if (secret) {
    const auth = req.headers.get('authorization')
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const issues: string[] = []
  const details: Record<string, unknown> = {}

  const thisWeek = getWeekStartPHT(0)
  const lastWeek = getWeekStartPHT(-1)
  details.current_week_start_pht = thisWeek
  details.last_week_start_pht = lastWeek
  details.checked_at = new Date().toISOString()

  // ── 1. Supabase connectivity ─────────────────────────────────────────────
  const { error: connErr } = await supabase.from('profiles').select('id').limit(1)
  details.supabase_connection = connErr ? `FAIL — ${connErr.message}` : 'OK'
  if (connErr) issues.push(`Supabase connection failed: ${connErr.message}`)

  // ── 2. Env vars required for core features ───────────────────────────────
  const missingEnv: string[] = []
  if (!process.env.ANTHROPIC_API_KEY) missingEnv.push('ANTHROPIC_API_KEY')
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) missingEnv.push('NEXT_PUBLIC_SUPABASE_URL')
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) missingEnv.push('SUPABASE_SERVICE_ROLE_KEY')
  details.env_vars = missingEnv.length === 0 ? 'OK' : `MISSING: ${missingEnv.join(', ')}`
  if (missingEnv.length > 0) issues.push(`Missing env vars — EOW report generation will fail: ${missingEnv.join(', ')}`)

  // ── 3. Active members ────────────────────────────────────────────────────
  const { data: members, error: membersErr } = await supabase
    .from('profiles')
    .select('id, first_name, last_name, email')
    .eq('role', 'member')

  if (membersErr) {
    issues.push(`Could not fetch members: ${membersErr.message}`)
    details.active_members = `FAIL — ${membersErr.message}`
  } else {
    details.active_members_count = members?.length ?? 0
  }

  const memberList = members ?? []

  // ── 4. Week start calculation sanity check ───────────────────────────────
  // Verify the week_start used in completions matches what we calculated
  if (memberList.length > 0) {
    const { data: recentLogs } = await supabase
      .from('task_completions')
      .select('week_start')
      .order('completed_at', { ascending: false })
      .limit(20)

    const recentWeeks = [...new Set((recentLogs ?? []).map(r => r.week_start))].slice(0, 3)
    details.recent_week_starts_in_db = recentWeeks
    const weekStartOk = recentWeeks.includes(thisWeek) || recentWeeks.length === 0
    details.week_start_alignment = weekStartOk ? 'OK' : `WARNING — latest DB week (${recentWeeks[0]}) differs from expected (${thisWeek})`
    if (!weekStartOk) issues.push(`Week start mismatch: DB has ${recentWeeks[0]}, expected ${thisWeek} — members may not be logging to the current week`)
  }

  // ── 5. Task sheet activity — who hasn't logged this week ─────────────────
  if (memberList.length > 0) {
    const { data: thisWeekLogs, error: logsErr } = await supabase
      .from('task_completions')
      .select('user_id')
      .eq('week_start', thisWeek)
      .gt('time_spent', 0)

    if (logsErr) {
      issues.push(`Could not check this week's logs: ${logsErr.message}`)
    } else {
      const activeIds = new Set((thisWeekLogs ?? []).map(r => r.user_id))
      const notLogged = memberList.filter(m => !activeIds.has(m.id))
      details.members_logged_this_week = activeIds.size
      details.members_not_logged_this_week = notLogged.map(m => `${m.first_name} ${m.last_name} (${m.email})`)
      if (notLogged.length > 0) {
        issues.push(`${notLogged.length} member(s) have zero time logged this week: ${notLogged.map(m => m.first_name).join(', ')}`)
      }
    }
  }

  // ── 6. EOW reports — who didn't submit last week ─────────────────────────
  if (memberList.length > 0) {
    // EOW reports window: last Friday through end of Sunday (before the new Monday resets the sheet).
    const lastMon = new Date(lastWeek)
    const lastFri = new Date(lastMon); lastFri.setUTCDate(lastMon.getUTCDate() + 4)
    // Cutoff = this Monday at 00:00 UTC
    const thisMon = new Date(thisWeek); thisMon.setUTCHours(0, 0, 0, 0)

    const { data: lastWeekReports, error: reportsErr } = await supabase
      .from('eow_reports')
      .select('user_id, member_name, created_at')
      .gte('created_at', lastFri.toISOString())
      .lt('created_at', thisMon.toISOString())

    if (reportsErr) {
      issues.push(`Could not check EOW reports: ${reportsErr.message}`)
    } else {
      const reportIds = new Set((lastWeekReports ?? []).map(r => r.user_id))
      const noReport = memberList.filter(m => !reportIds.has(m.id))
      details.eow_reports_submitted_last_week = reportIds.size
      details.members_missing_eow_report_last_week = noReport.map(m => `${m.first_name} ${m.last_name}`)
      if (noReport.length > 0) {
        issues.push(`${noReport.length} member(s) did not submit an EOW report last week: ${noReport.map(m => m.first_name).join(', ')}`)
      }
    }
  }

  // ── 7. Performance stats integrity — completed/time_spent consistency ─────
  const { data: statsRows, error: statsErr } = await supabase
    .from('task_completions')
    .select('user_id, task_id, week_start, day, time_spent, completed')
    .eq('week_start', thisWeek)

  if (statsErr) {
    issues.push(`Performance stats query failed: ${statsErr.message}`)
    details.performance_stats_integrity = `FAIL — ${statsErr.message}`
  } else {
    const inconsistent = (statsRows ?? []).filter(
      r => (r.completed && (r.time_spent ?? 0) === 0) || (!r.completed && (r.time_spent ?? 0) > 0)
    )
    details.performance_stats_integrity = inconsistent.length === 0 ? 'OK' : `${inconsistent.length} inconsistent record(s)`
    if (inconsistent.length > 0) {
      issues.push(`${inconsistent.length} task_completion row(s) have mismatched completed/time_spent — performance stats may be inaccurate`)
    }
  }

  // ── 8. Wellness — flagged check-ins from the past week ───────────────────
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
  const { data: flagged, error: wellnessErr } = await supabase
    .from('wellness_checkins')
    .select('id, user_id, mood, created_at')
    .eq('flagged', true)
    .gte('created_at', sevenDaysAgo)

  if (wellnessErr) {
    details.flagged_wellness_checkins = `FAIL — ${wellnessErr.message}`
  } else {
    details.flagged_wellness_checkins_past_7_days = flagged?.length ?? 0
    if ((flagged?.length ?? 0) > 0) {
      issues.push(`${flagged!.length} flagged wellness check-in(s) in the past 7 days — review in admin dashboard`)
    }
  }

  // ── Summary ──────────────────────────────────────────────────────────────
  const status = issues.length === 0 ? 'healthy' : 'issues_found'

  console.log(`[weekly-check] ${status.toUpperCase()} — ${issues.length} issue(s)`)
  if (issues.length > 0) {
    issues.forEach((issue, i) => console.warn(`  [${i + 1}] ${issue}`))
  }

  return NextResponse.json({ status, issues, details }, { status: 200 })
}
