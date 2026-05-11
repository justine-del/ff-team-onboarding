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

const MEMBER_TASKS = [
  { id: 19, task_name: 'Intro Video / Expectations',            description: 'Watch the welcome video to understand your next steps',               responsible: 'Member', login_type: 'Member task', sort_order: 19, phase: 1 },
  { id: 20, task_name: 'System Access — Category A & B',        description: 'Review tool categories, confirm access, and bookmark login pages',    responsible: 'Member', login_type: 'Member task', sort_order: 20, phase: 1 },
  { id: 21, task_name: 'Slack Workspace',                       description: 'Accept Slack invite and set up your profile',                         responsible: 'Member', login_type: 'Member task', sort_order: 21, phase: 1 },
  { id: 22, task_name: 'SuperWhisper',                          description: 'Sign up, download the app, and configure your hotkey',               responsible: 'Member', login_type: 'Member task', sort_order: 22, phase: 1 },
  { id: 23, task_name: 'Google Drive',                          description: 'Accept the Google Drive invite and confirm folder access',           responsible: 'Member', login_type: 'Member task', sort_order: 23, phase: 1 },
  { id: 24, task_name: 'Send Final Phase 2 Completion Message', description: 'Post your completion message in the ramp-up thread with time taken', responsible: 'Member', login_type: 'Member task', sort_order: 24, phase: 1 },
]

const { error, data } = await sb
  .from('phase1_tasks')
  .upsert(MEMBER_TASKS, { onConflict: 'id' })
  .select('id, task_name, responsible')

if (error) {
  console.error('Failed:', error)
  process.exit(1)
}

console.log(`Inserted/updated ${data.length} member tasks:`)
data.forEach(r => console.log(`  ${r.id}  ${r.task_name}  (${r.responsible})`))
