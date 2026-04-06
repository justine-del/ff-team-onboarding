'use client'

import { useState, useEffect } from 'react'
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

export default function UsersPage() {
  const [members, setMembers] = useState<Member[]>([])
  const [showInviteForm, setShowInviteForm] = useState(false)
  const [form, setForm] = useState({ first_name: '', last_name: '', email: '', job_role: '', start_date: '' })
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [inviteLink, setInviteLink] = useState('')

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data } = await supabase.from('profiles').select('*').order('created_at', { ascending: false })
      setMembers(data ?? [])
    }
    load()
  }, [])

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    const allowedDomains = ['funnelfuturist.com', 'joburn.com']
    const emailDomain = form.email.split('@')[1]
    if (!allowedDomains.includes(emailDomain)) {
      setMessage(`Email must be a @funnelfuturist.com or @joburn.com address.`)
      setLoading(false)
      return
    }

    const res = await fetch('/api/invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })

    const result = await res.json()
    if (result.error) {
      setMessage(`Error: ${result.error}`)
    } else {
      setInviteLink(result.invite_link)
      setForm({ first_name: '', last_name: '', email: '', job_role: '', start_date: '' })
      setShowInviteForm(false)
      // Reload members
      const supabase = createClient()
      const { data } = await supabase.from('profiles').select('*').order('created_at', { ascending: false })
      setMembers(data ?? [])
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <nav className="border-b border-gray-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/admin" className="text-gray-400 hover:text-white text-sm">← Admin</Link>
          <h1 className="text-lg font-bold">Manage Team Members</h1>
        </div>
        <button
          onClick={() => setShowInviteForm(!showInviteForm)}
          className="text-sm bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
        >
          + Invite New Member
        </button>
      </nav>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {message && (
          <div className={`mb-4 p-3 rounded-lg text-sm ${message.startsWith('Error') ? 'bg-red-900/40 border border-red-700 text-red-300' : 'bg-green-900/40 border border-green-700 text-green-300'}`}>
            {message}
          </div>
        )}

        {inviteLink && (
          <div className="mb-4 p-4 rounded-lg bg-blue-900/40 border border-blue-700 text-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-blue-300 font-medium">Member added! Share this invite link:</span>
              <button
                onClick={() => { navigator.clipboard.writeText(inviteLink); setMessage('Link copied!') }}
                className="text-xs bg-blue-700 hover:bg-blue-600 text-white px-3 py-1 rounded transition-colors"
              >
                Copy Link
              </button>
            </div>
            <p className="text-gray-400 break-all text-xs">{inviteLink}</p>
            <p className="text-gray-500 text-xs mt-2">This link lets them set their password and log in. Share via Slack or email.</p>
          </div>
        )}

        {showInviteForm && (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-6">
            <h3 className="font-semibold mb-4">Invite New Member</h3>
            <form onSubmit={handleInvite} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">First Name</label>
                <input required value={form.first_name} onChange={e => setForm(p => ({ ...p, first_name: e.target.value }))}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Last Name</label>
                <input required value={form.last_name} onChange={e => setForm(p => ({ ...p, last_name: e.target.value }))}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Company Email</label>
                <input required type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Role (e.g. Video Editor)</label>
                <input value={form.job_role} onChange={e => setForm(p => ({ ...p, job_role: e.target.value }))}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Start Date</label>
                <input type="date" value={form.start_date} onChange={e => setForm(p => ({ ...p, start_date: e.target.value }))}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="sm:col-span-2 flex gap-3">
                <button type="submit" disabled={loading}
                  className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm transition-colors">
                  {loading ? 'Sending...' : 'Send Invite'}
                </button>
                <button type="button" onClick={() => setShowInviteForm(false)}
                  className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg text-sm transition-colors">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="space-y-2">
          {members.map(member => (
            <div key={member.id} className="flex items-center gap-4 bg-gray-900 border border-gray-800 rounded-xl p-4">
              <div className="flex-1">
                <p className="font-medium">{member.first_name} {member.last_name}</p>
                <p className="text-sm text-gray-400">{member.email}</p>
                {member.job_role && <p className="text-xs text-gray-500">{member.job_role}</p>}
              </div>
              <span className={`px-2 py-0.5 rounded text-xs ${member.role === 'admin' ? 'bg-purple-900/60 text-purple-300' : 'bg-gray-700 text-gray-300'}`}>
                {member.role}
              </span>
              {member.start_date && (
                <span className="text-xs text-gray-500">
                  Started {new Date(member.start_date).toLocaleDateString()}
                </span>
              )}
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}
