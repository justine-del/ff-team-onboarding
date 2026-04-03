'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

type Member = {
  id: string
  email: string
  first_name: string
  last_name: string
  job_role: string | null
  start_date: string | null
  role: string
}

export default function AdminPage() {
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
      if (profile?.role !== 'admin') { router.push('/dashboard'); return }

      const { data: allMembers } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'member')
        .order('created_at', { ascending: false })

      setMembers(allMembers ?? [])
      setLoading(false)
    }
    load()
  }, [router])

  if (loading) return <div className="min-h-screen bg-gray-950 flex items-center justify-center text-gray-400">Loading...</div>

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

        {!members.length ? (
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
                </tr>
              </thead>
              <tbody>
                {members.map(member => (
                  <tr key={member.id} className="border-b border-gray-800/50 hover:bg-gray-900/50">
                    <td className="py-3 pr-4">
                      <p className="font-medium">{member.first_name} {member.last_name}</p>
                      <p className="text-xs text-gray-400">{member.email}</p>
                    </td>
                    <td className="py-3 pr-4 text-gray-400">{member.job_role ?? '—'}</td>
                    <td className="py-3 pr-4 text-gray-400">
                      {member.start_date ? new Date(member.start_date).toLocaleDateString() : '—'}
                    </td>
                    <td className="py-3 pr-4 text-gray-300">—/18</td>
                    <td className="py-3 pr-4 text-gray-300">—/17</td>
                    <td className="py-3 pr-4 text-gray-300">—/10</td>
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
