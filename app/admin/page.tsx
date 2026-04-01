import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function AdminPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') redirect('/dashboard')

  const { data: members } = await supabase
    .from('profiles')
    .select('*')
    .eq('role', 'member')
    .order('created_at', { ascending: false })

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <nav className="border-b border-gray-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard" className="text-gray-400 hover:text-white text-sm">← Dashboard</Link>
          <h1 className="text-lg font-bold">Admin Dashboard</h1>
        </div>
        <div className="flex gap-2">
          <Link href="/admin/content" className="text-sm bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors">
            Edit Links
          </Link>
          <Link href="/admin/users" className="text-sm bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors">
            Manage Users
          </Link>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-4 py-8">
        <h2 className="text-xl font-semibold mb-6">Team Onboarding Progress</h2>

        {!members?.length ? (
          <div className="text-center py-12 text-gray-400">
            <p className="mb-4">No team members yet.</p>
            <Link href="/admin/users" className="text-blue-400 hover:text-blue-300">Invite your first member →</Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800 text-left">
                  <th className="py-3 pr-4 text-gray-400 font-medium">Name</th>
                  <th className="py-3 pr-4 text-gray-400 font-medium">Role</th>
                  <th className="py-3 pr-4 text-gray-400 font-medium">Start Date</th>
                  <th className="py-3 pr-4 text-gray-400 font-medium">Phase 1</th>
                  <th className="py-3 pr-4 text-gray-400 font-medium">Phase 2</th>
                  <th className="py-3 pr-4 text-gray-400 font-medium">SOPs</th>
                  <th className="py-3 pr-4 text-gray-400 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {members.map(member => (
                  <tr key={member.id} className="border-b border-gray-800/50 hover:bg-gray-900/50">
                    <td className="py-3 pr-4">
                      <Link href={`/admin/users/${member.id}`} className="font-medium hover:text-blue-400">
                        {member.first_name} {member.last_name}
                      </Link>
                      <p className="text-xs text-gray-400">{member.email}</p>
                    </td>
                    <td className="py-3 pr-4 text-gray-400">{member.job_role ?? '—'}</td>
                    <td className="py-3 pr-4 text-gray-400">
                      {member.start_date ? new Date(member.start_date).toLocaleDateString() : '—'}
                    </td>
                    <td className="py-3 pr-4">
                      <span className="text-gray-300">—/18</span>
                    </td>
                    <td className="py-3 pr-4">
                      <span className="text-gray-300">—/17</span>
                    </td>
                    <td className="py-3 pr-4">
                      <span className="text-gray-300">—/10</span>
                    </td>
                    <td className="py-3 pr-4">
                      <span className="px-2 py-0.5 rounded text-xs bg-gray-700 text-gray-300">On Track</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  )
}
