import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

const env = Object.fromEntries(
  readFileSync('.env.local', 'utf8')
    .split('\n')
    .filter(l => l.includes('='))
    .map(l => { const [k, ...v] = l.split('='); return [k.trim(), v.join('=').trim().replace(/^["']|["']$/g, '')] })
)

const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
})

const JADON = '384abf59-8612-47ca-aa13-b4875e2086f7'
const WEEK = '2026-05-03'

const tc = await sb.from('task_completions').delete({ count: 'exact' }).eq('user_id', JADON).eq('week_start', WEEK)
const off = await sb.from('day_off').delete({ count: 'exact' }).eq('user_id', JADON).eq('week_start', WEEK)
const notes = await sb.from('va_task_notes').delete({ count: 'exact' }).eq('user_id', JADON).eq('week_start', WEEK)

console.log(`Deleted from task_completions: ${tc.count} rows  (err: ${tc.error?.message ?? 'none'})`)
console.log(`Deleted from day_off:          ${off.count} rows  (err: ${off.error?.message ?? 'none'})`)
console.log(`Deleted from va_task_notes:    ${notes.count} rows  (err: ${notes.error?.message ?? 'none'})`)
