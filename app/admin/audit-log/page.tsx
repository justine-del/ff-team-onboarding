import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

/**
 * Admin-only viewer for the task_audit_log. Surfaces time-entry edits and
 * admin task-definition changes for HR-style forensic review (Peter's ask
 * in Section XI: "if someone changes a time entry from 3:48 AM to 5:00 AM,
 * Peter can immediately see the change").
 *
 * Read-only. The audit table itself is service-role-write-only.
 */

type AuditRow = {
  id: number
  actor_id: string | null
  actor_role: string | null
  target_user_id: string | null
  entity_type: string
  entity_id: string | null
  action: string
  before_json: Record<string, unknown> | null
  after_json: Record<string, unknown> | null
  context: Record<string, unknown> | null
  created_at: string
}

interface PageProps {
  searchParams: Promise<{ memberId?: string; action?: string; entity?: string }>
}

function formatTimestamp(iso: string): string {
  const d = new Date(iso)
  // PHT (UTC+8). Match the rest of the portal which anchors everything to PHT.
  const phtMs = d.getTime() + 8 * 60 * 60 * 1000
  const p = new Date(phtMs)
  const yyyy = p.getUTCFullYear()
  const mm = String(p.getUTCMonth() + 1).padStart(2, '0')
  const dd = String(p.getUTCDate()).padStart(2, '0')
  const hh = String(p.getUTCHours()).padStart(2, '0')
  const min = String(p.getUTCMinutes()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd} ${hh}:${min} PHT`
}

function summarizeChange(row: AuditRow): string {
  // For task_completions time_spent edits, surface the before→after directly —
  // that's the Peter use case ("3:48 AM → 5:00 AM" equivalent).
  if (row.entity_type === 'task_completions') {
    const before = row.before_json?.time_spent
    const after = row.after_json?.time_spent
    if (before === undefined && after !== undefined) return `logged ${after}m`
    if (before !== undefined && after === undefined) return `cleared ${before}m`
    if (before !== undefined && after !== undefined) return `${before}m → ${after}m`
  }
  if (row.entity_type === 'va_custom_tasks') {
    const fields = (row.context?.changed_fields as string[] | undefined) ?? []
    if (row.action === 'create') return `created "${row.after_json?.task_name ?? '?'}"`
    if (row.action === 'delete') return `soft-deleted "${row.before_json?.task_name ?? '?'}"`
    if (fields.length > 0) return `edited ${fields.join(', ')}`
    return 'edited'
  }
  return row.action
}

export default async function AuditLogPage({ searchParams }: PageProps) {
  const params = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin' && profile?.role !== 'super_admin') redirect('/dashboard')

  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  )

  // Members for the filter dropdown.
  const membersRes = await admin.from('profiles').select('id, first_name, last_name').eq('role', 'member').order('first_name')
  const members = membersRes.data ?? []
  const memberName = new Map<string, string>()
  for (const m of members) memberName.set(m.id as string, `${m.first_name ?? ''} ${m.last_name ?? ''}`.trim() || 'Member')

  // Build the filtered query.
  let query = admin.from('task_audit_log').select('*').order('created_at', { ascending: false }).limit(500)
  if (params.memberId) query = query.eq('target_user_id', params.memberId)
  if (params.action) query = query.eq('action', params.action)
  if (params.entity) query = query.eq('entity_type', params.entity)
  const { data: rows } = await query
  const auditRows = (rows ?? []) as AuditRow[]

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold">Activity Log</h1>
            <p className="text-sm text-gray-400 mt-1">Forensic trail of time-entry and task changes. Showing the most recent 500 events.</p>
          </div>
          <Link href="/admin" className="text-sm text-blue-400 hover:text-blue-300">← Admin</Link>
        </div>

        <form className="flex flex-wrap gap-3 items-end bg-gray-900 border border-gray-800 rounded-xl p-4 mb-6">
          <div>
            <label className="block text-xs text-gray-400 mb-1">Member</label>
            <select name="memberId" defaultValue={params.memberId ?? ''} className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white">
              <option value="">All members</option>
              {members.map(m => (
                <option key={m.id as string} value={m.id as string}>{memberName.get(m.id as string)}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Entity</label>
            <select name="entity" defaultValue={params.entity ?? ''} className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white">
              <option value="">All</option>
              <option value="task_completions">Time entries</option>
              <option value="va_custom_tasks">Custom tasks</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Action</label>
            <select name="action" defaultValue={params.action ?? ''} className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white">
              <option value="">All</option>
              <option value="create">Create</option>
              <option value="update">Update</option>
              <option value="delete">Delete</option>
            </select>
          </div>
          <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm transition-colors">Apply</button>
          {(params.memberId || params.action || params.entity) && (
            <Link href="/admin/audit-log" className="text-sm text-gray-400 hover:text-gray-200 px-4 py-2 transition-colors">Clear</Link>
          )}
        </form>

        {auditRows.length === 0 ? (
          <p className="text-sm text-gray-500">No activity matches these filters.</p>
        ) : (
          <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-800/60 text-xs uppercase tracking-wide text-gray-400">
                <tr>
                  <th className="text-left px-4 py-2">When (PHT)</th>
                  <th className="text-left px-4 py-2">Target</th>
                  <th className="text-left px-4 py-2">Actor</th>
                  <th className="text-left px-4 py-2">Entity</th>
                  <th className="text-left px-4 py-2">Change</th>
                </tr>
              </thead>
              <tbody>
                {auditRows.map(r => {
                  const target = r.target_user_id ? memberName.get(r.target_user_id) ?? r.target_user_id.slice(0, 8) : '—'
                  const actorSelf = r.actor_id === r.target_user_id
                  const actorLabel = actorSelf
                    ? '(self)'
                    : r.actor_id
                      ? memberName.get(r.actor_id) ?? `${r.actor_role ?? 'unknown'} ${r.actor_id.slice(0, 8)}`
                      : 'system'
                  return (
                    <tr key={r.id} className="border-t border-gray-800">
                      <td className="px-4 py-2 text-gray-400 font-mono text-xs whitespace-nowrap">{formatTimestamp(r.created_at)}</td>
                      <td className="px-4 py-2">{target}</td>
                      <td className={`px-4 py-2 ${actorSelf ? 'text-gray-500' : 'text-amber-300'}`}>{actorLabel}</td>
                      <td className="px-4 py-2 text-gray-300">
                        <span className="text-xs font-mono text-gray-500">{r.entity_type}</span>
                        {r.entity_id && <span className="ml-2 text-xs text-gray-600">{r.entity_id}</span>}
                      </td>
                      <td className="px-4 py-2 text-gray-200">{summarizeChange(r)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
