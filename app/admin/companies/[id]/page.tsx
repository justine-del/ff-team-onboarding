'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

type Profile = {
  id: string
  email: string
  first_name: string
  last_name: string
  job_role: string | null
  start_date: string | null
  role: string
}

type MemberWithProgress = Profile & {
  phase1Done: number
  phase2Done: number
  sopsD: number
}

type Company = {
  id: string
  name: string
  slug: string
  created_at: string
  is_active: boolean
}

type InviteRole = 'admin' | 'member'

const BLANK_INVITE = { first_name: '', last_name: '', email: '', job_role: '', start_date: '' }

export default function CompanyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: companyId } = use(params)

  const [company, setCompany] = useState<Company | null>(null)
  const [admins, setAdmins] = useState<Profile[]>([])
  const [members, setMembers] = useState<MemberWithProgress[]>([])
  const [loading, setLoading] = useState(true)
  const [inviteRole, setInviteRole] = useState<InviteRole | null>(null)
  const [form, setForm] = useState(BLANK_INVITE)
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState('')
  const [inviteLink, setInviteLink] = useState('')
  const router = useRouter()

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      if (profile?.role !== 'super_admin') { router.push('/admin'); return }

      await fetchData()
    }
    load()
  }, [companyId, router])

  async function fetchData() {
    const supabase = createClient()

    const [companyRes, profilesRes] = await Promise.all([
      supabase.from('companies').select('*').eq('id', companyId).single(),
      supabase.from('profiles').select('*').eq('company_id', companyId).order('created_at', { ascending: true }),
    ])

    if (companyRes.data) setCompany(companyRes.data)

    const allProfiles = profilesRes.data ?? []
    const adminProfiles = allProfiles.filter(p => p.role === 'admin' || p.role === 'super_admin')
    const memberProfiles = allProfiles.filter(p => p.role === 'member')

    setAdmins(adminProfiles)

    if (memberProfiles.length === 0) {
      setMembers([])
      setLoading(false)
      return
    }

    const ids = memberProfiles.map(m => m.id)
    const [p1, p2, sops] = await Promise.all([
      supabase.from('phase1_completion').select('user_id').eq('status', 'done').in('user_id', ids),
      supabase.from('lesson_completion').select('user_id').eq('completed', true).in('user_id', ids),
      supabase.from('sop_completion').select('user_id').eq('completed', true).in('user_id', ids),
    ])

    const count = (data: { user_id: string }[] | null, uid: string) =>
      data?.filter(r => r.user_id === uid).length ?? 0

    setMembers(memberProfiles.map(m => ({
      ...m,
      phase1Done: count(p1.data, m.id),
      phase2Done: count(p2.data, m.id),
      sopsD: count(sops.data, m.id),
    })))
    setLoading(false)
  }

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault()
    if (!inviteRole) return
    setSubmitting(true)
    setMessage('')
    setInviteLink('')

    const res = await fetch('/api/invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, company_id: companyId, role: inviteRole }),
    })

    const result = await res.json()
    if (result.error) {
      setMessage(`Error: ${result.error}`)
    } else {
      setInviteLink(result.invite_link ?? '')
      setMessage(`${inviteRole === 'admin' ? 'Admin' : 'Member'} invited successfully.`)
      setForm(BLANK_INVITE)
      setInviteRole(null)
      await fetchData()
    }
    setSubmitting(false)
  }

  if (loading) return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center text-gray-400">
      Loading...
    </div>
  )

  const inputClass = 'w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <nav className="border-b border-gray-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/admin/companies" className="text-gray-400 hover:text-white text-sm">← All Clients</Link>
          <div>
            <h1 className="text-lg font-bold">{company?.name ?? 'Company'}</h1>
            <p className="text-xs text-gray-500">
              Created {company ? new Date(company.created_at).toLocaleDateString() : ''}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => { setInviteRole('admin'); setForm(BLANK_INVITE); setMessage(''); setInviteLink('') }}
            className="text-sm bg-purple-700 hover:bg-purple-600 text-white px-4 py-2 rounded-lg transition-colors"
          >
            + Invite Admin
          </button>
          <button
            onClick={() => { setInviteRole('member'); setForm(BLANK_INVITE); setMessage(''); setInviteLink('') }}
            className="text-sm bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            + Invite Member
          </button>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-4 py-8 space-y-8">

        {/* Status / invite link feedback */}
        {message && (
          <div className={`p-3 rounded-lg text-sm ${message.startsWith('Error') ? 'bg-red-900/40 border border-red-700 text-red-300' : 'bg-green-900/40 border border-green-700 text-green-300'}`}>
            {message}
          </div>
        )}

        {inviteLink && (
          <div className="p-4 rounded-xl bg-blue-900/30 border border-blue-700 text-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-blue-300 font-medium">Share this login link:</span>
              <button
                onClick={() => { navigator.clipboard.writeText(inviteLink); setMessage('Link copied!') }}
                className="text-xs bg-blue-700 hover:bg-blue-600 text-white px-3 py-1 rounded transition-colors"
              >
                Copy
              </button>
            </div>
            <p className="text-gray-400 break-all text-xs">{inviteLink}</p>
            <p className="text-gray-500 text-xs mt-2">One-time link — share via Slack. Expires when used.</p>
          </div>
        )}

        {/* Invite Form */}
        {inviteRole && (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <h3 className="font-semibold mb-4">
              Invite New {inviteRole === 'admin' ? 'Admin' : 'Member'}
              <span className="ml-2 text-xs text-gray-500 font-normal">for {company?.name}</span>
            </h3>
            <form onSubmit={handleInvite} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">First Name</label>
                <input required value={form.first_name} onChange={e => setForm(p => ({ ...p, first_name: e.target.value }))} className={inputClass} />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Last Name</label>
                <input required value={form.last_name} onChange={e => setForm(p => ({ ...p, last_name: e.target.value }))} className={inputClass} />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Email</label>
                <input required type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} className={inputClass} />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Job Role (optional)</label>
                <input value={form.job_role} onChange={e => setForm(p => ({ ...p, job_role: e.target.value }))} className={inputClass} placeholder="e.g. Video Editor" />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Start Date (optional)</label>
                <input type="date" value={form.start_date} onChange={e => setForm(p => ({ ...p, start_date: e.target.value }))} className={inputClass} />
              </div>
              <div className="sm:col-span-2 flex gap-3">
                <button type="submit" disabled={submitting}
                  className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-5 py-2 rounded-lg text-sm transition-colors">
                  {submitting ? 'Sending...' : 'Send Invite'}
                </button>
                <button type="button" onClick={() => setInviteRole(null)}
                  className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg text-sm transition-colors">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Admins Section */}
        <section>
          <h2 className="text-base font-semibold text-gray-300 mb-3">
            Admins <span className="text-gray-500 font-normal text-sm">({admins.length})</span>
          </h2>
          {admins.length === 0 ? (
            <p className="text-sm text-gray-500 py-4">No admins yet. Invite one above.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-800 text-left">
                    <th className="py-2 pr-6 text-gray-500 font-medium text-xs uppercase tracking-wide">Name</th>
                    <th className="py-2 pr-6 text-gray-500 font-medium text-xs uppercase tracking-wide">Email</th>
                    <th className="py-2 text-gray-500 font-medium text-xs uppercase tracking-wide">Joined</th>
                  </tr>
                </thead>
                <tbody>
                  {admins.map(a => (
                    <tr key={a.id} className="border-b border-gray-800/40 hover:bg-gray-900/30">
                      <td className="py-2.5 pr-6">
                        <div className="flex items-center gap-2">
                          <span>{a.first_name || a.last_name ? `${a.first_name} ${a.last_name}`.trim() : '—'}</span>
                          <span className={`text-xs px-1.5 py-0.5 rounded ${a.role === 'super_admin' ? 'bg-purple-900/60 text-purple-300' : 'bg-gray-700 text-gray-300'}`}>
                            {a.role === 'super_admin' ? 'super admin' : 'admin'}
                          </span>
                        </div>
                      </td>
                      <td className="py-2.5 pr-6 text-gray-400">{a.email}</td>
                      <td className="py-2.5 text-gray-500 text-xs">
                        {a.start_date ? new Date(a.start_date).toLocaleDateString() : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Members Section */}
        <section>
          <h2 className="text-base font-semibold text-gray-300 mb-3">
            Members <span className="text-gray-500 font-normal text-sm">({members.length})</span>
          </h2>
          {members.length === 0 ? (
            <p className="text-sm text-gray-500 py-4">No members yet. Invite one above.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-800 text-left">
                    <th className="py-2 pr-4 text-gray-500 font-medium text-xs uppercase tracking-wide">Name</th>
                    <th className="py-2 pr-4 text-gray-500 font-medium text-xs uppercase tracking-wide">Job Role</th>
                    <th className="py-2 pr-4 text-gray-500 font-medium text-xs uppercase tracking-wide">Phase 1</th>
                    <th className="py-2 pr-4 text-gray-500 font-medium text-xs uppercase tracking-wide">Phase 2</th>
                    <th className="py-2 text-gray-500 font-medium text-xs uppercase tracking-wide">SOPs</th>
                  </tr>
                </thead>
                <tbody>
                  {members.map(m => (
                    <tr key={m.id} className="border-b border-gray-800/40 hover:bg-gray-900/30">
                      <td className="py-2.5 pr-4">
                        <p className="font-medium">{m.first_name || m.last_name ? `${m.first_name} ${m.last_name}`.trim() : '—'}</p>
                        <p className="text-xs text-gray-500">{m.email}</p>
                      </td>
                      <td className="py-2.5 pr-4 text-gray-400">{m.job_role ?? '—'}</td>
                      <td className="py-2.5 pr-4">
                        <span className={m.phase1Done === 18 ? 'text-green-400' : 'text-gray-300'}>{m.phase1Done}/18</span>
                      </td>
                      <td className="py-2.5 pr-4">
                        <span className={m.phase2Done === 17 ? 'text-green-400' : 'text-gray-300'}>{m.phase2Done}/17</span>
                      </td>
                      <td className="py-2.5">
                        <span className={m.sopsD === 10 ? 'text-green-400' : 'text-gray-300'}>{m.sopsD}/10</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

      </main>
    </div>
  )
}
