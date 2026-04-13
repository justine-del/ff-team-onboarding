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

async function generateLoginLink(email: string): Promise<string | null> {
  const res = await fetch('/api/resend-invite', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  })
  const result = await res.json()
  return result.invite_link ?? null
}

function ResetPasswordButton({ email, onLink }: { email: string; onLink: (link: string) => void }) {
  const [loading, setLoading] = useState(false)

  async function handle() {
    setLoading(true)
    const link = await generateLoginLink(email)
    if (link) onLink(link)
    setLoading(false)
  }

  return (
    <button
      onClick={handle}
      disabled={loading}
      className="text-xs bg-gray-700 hover:bg-gray-600 disabled:opacity-50 text-white px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap"
    >
      {loading ? 'Generating...' : 'Reset Link'}
    </button>
  )
}

const DEFAULT_PASSWORD = 'CyborgVA2026!'

function SetDefaultPasswordButton({ email, onDone }: { email: string; onDone: (msg: string) => void }) {
  const [loading, setLoading] = useState(false)

  async function handle() {
    if (!confirm(`Set password to "${DEFAULT_PASSWORD}" for ${email}?`)) return
    setLoading(true)
    const res = await fetch('/api/set-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: DEFAULT_PASSWORD }),
    })
    const result = await res.json()
    if (result.error) {
      onDone(`Error: ${result.error}`)
    } else {
      onDone(`Password set to: ${DEFAULT_PASSWORD}`)
    }
    setLoading(false)
  }

  return (
    <button
      onClick={handle}
      disabled={loading}
      className="text-xs bg-indigo-700 hover:bg-indigo-600 disabled:opacity-50 text-white px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap"
    >
      {loading ? 'Setting...' : 'Set Default Password'}
    </button>
  )
}

function EditMemberRow({ member, onSave, onCancel }: {
  member: Member
  onSave: (updated: Member) => void
  onCancel: () => void
}) {
  const [form, setForm] = useState({
    first_name: member.first_name,
    last_name: member.last_name,
    job_role: member.job_role ?? '',
    start_date: member.start_date ?? '',
    role: member.role,
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleSave() {
    setSaving(true)
    setError('')
    const supabase = createClient()
    const { error: err } = await supabase
      .from('profiles')
      .update({
        first_name: form.first_name,
        last_name: form.last_name,
        job_role: form.job_role || null,
        start_date: form.start_date || null,
        role: form.role,
      })
      .eq('id', member.id)

    if (err) {
      setError(err.message)
      setSaving(false)
      return
    }
    onSave({ ...member, ...form, job_role: form.job_role || null, start_date: form.start_date || null })
    setSaving(false)
  }

  const inputClass = 'bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-full'

  return (
    <div className="bg-gray-900 border border-blue-700/50 rounded-xl p-4">
      <p className="text-xs text-blue-300 font-semibold mb-3 uppercase tracking-wide">Editing — {member.email}</p>
      {error && <p className="text-xs text-red-400 mb-3">{error}</p>}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-3">
        <div>
          <label className="block text-xs text-gray-400 mb-1">First Name</label>
          <input value={form.first_name} onChange={e => setForm(p => ({ ...p, first_name: e.target.value }))} className={inputClass} />
        </div>
        <div>
          <label className="block text-xs text-gray-400 mb-1">Last Name</label>
          <input value={form.last_name} onChange={e => setForm(p => ({ ...p, last_name: e.target.value }))} className={inputClass} />
        </div>
        <div>
          <label className="block text-xs text-gray-400 mb-1">Job Role</label>
          <input value={form.job_role} onChange={e => setForm(p => ({ ...p, job_role: e.target.value }))} className={inputClass} placeholder="e.g. Video Editor" />
        </div>
        <div>
          <label className="block text-xs text-gray-400 mb-1">Start Date</label>
          <input type="date" value={form.start_date} onChange={e => setForm(p => ({ ...p, start_date: e.target.value }))} className={inputClass} />
        </div>
        <div>
          <label className="block text-xs text-gray-400 mb-1">Role</label>
          <select value={form.role} onChange={e => setForm(p => ({ ...p, role: e.target.value }))} className={inputClass}>
            <option value="member">member</option>
            <option value="admin">admin</option>
          </select>
        </div>
      </div>
      <div className="flex gap-2">
        <button onClick={handleSave} disabled={saving}
          className="text-sm bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-4 py-1.5 rounded-lg transition-colors">
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
        <button onClick={onCancel} className="text-sm bg-gray-700 hover:bg-gray-600 text-white px-4 py-1.5 rounded-lg transition-colors">
          Cancel
        </button>
      </div>
    </div>
  )
}

function LookupRepairPanel({ onRepaired }: { onRepaired: (m: Member, loginLink: string | null) => void }) {
  const [email, setEmail] = useState('')
  const [form, setForm] = useState({ first_name: '', last_name: '', job_role: '', start_date: '', role: 'member' })
  const [step, setStep] = useState<'input' | 'fill'>('input')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleLookup(e: React.FormEvent) {
    e.preventDefault()
    setStep('fill')
  }

  async function handleRepair(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const res = await fetch('/api/repair-profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, ...form }),
    })
    const result = await res.json()
    if (result.error) {
      setError(result.error)
      setLoading(false)
      return
    }
    // Also generate a password-reset link so she can log in right away
    const loginLink = await generateLoginLink(email)
    // Reload profile from DB
    const supabase = (await import('@/lib/supabase/client')).createClient()
    const { data } = await supabase.from('profiles').select('*').eq('email', email).single()
    if (data) onRepaired(data, loginLink)
    setEmail('')
    setForm({ first_name: '', last_name: '', job_role: '', start_date: '', role: 'member' })
    setStep('input')
    setLoading(false)
  }

  const inputClass = 'bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-full'

  return (
    <div className="bg-yellow-950/30 border border-yellow-700/50 rounded-xl p-4 mb-6">
      <p className="text-xs text-yellow-300 font-semibold mb-3 uppercase tracking-wide">Find & Repair Missing Profile</p>
      {error && <p className="text-xs text-red-400 mb-2">{error}</p>}

      {step === 'input' ? (
        <form onSubmit={handleLookup} className="flex gap-2">
          <input
            type="email" required value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="Enter member email..."
            className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500"
          />
          <button type="submit" disabled={loading}
            className="text-sm bg-yellow-700 hover:bg-yellow-600 disabled:opacity-50 text-white px-4 py-1.5 rounded-lg transition-colors whitespace-nowrap">
            Look Up
          </button>
        </form>
      ) : (
        <form onSubmit={handleRepair}>
          <p className="text-xs text-gray-400 mb-3">Filling profile for: <span className="text-white">{email}</span></p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-3">
            <div>
              <label className="block text-xs text-gray-400 mb-1">First Name</label>
              <input value={form.first_name} onChange={e => setForm(p => ({ ...p, first_name: e.target.value }))} className={inputClass} />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Last Name</label>
              <input value={form.last_name} onChange={e => setForm(p => ({ ...p, last_name: e.target.value }))} className={inputClass} />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Job Role</label>
              <input value={form.job_role} onChange={e => setForm(p => ({ ...p, job_role: e.target.value }))} className={inputClass} />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Start Date</label>
              <input type="date" value={form.start_date} onChange={e => setForm(p => ({ ...p, start_date: e.target.value }))} className={inputClass} />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Role</label>
              <select value={form.role} onChange={e => setForm(p => ({ ...p, role: e.target.value }))} className={inputClass}>
                <option value="member">member</option>
                <option value="admin">admin</option>
              </select>
            </div>
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={loading}
              className="text-sm bg-yellow-700 hover:bg-yellow-600 disabled:opacity-50 text-white px-4 py-1.5 rounded-lg transition-colors">
              {loading ? 'Saving...' : 'Create / Repair Profile'}
            </button>
            <button type="button" onClick={() => { setStep('input'); setError('') }}
              className="text-sm bg-gray-700 hover:bg-gray-600 text-white px-4 py-1.5 rounded-lg transition-colors">
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  )
}

export default function UsersPage() {
  const [members, setMembers] = useState<Member[]>([])
  const [showInviteForm, setShowInviteForm] = useState(false)
  const [form, setForm] = useState({ first_name: '', last_name: '', email: '', job_role: '', start_date: '' })
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [inviteLink, setInviteLink] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [search, setSearch] = useState('')

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
        <LookupRepairPanel onRepaired={(m, loginLink) => {
          setMembers(prev => {
            const exists = prev.find(x => x.id === m.id)
            return exists ? prev.map(x => x.id === m.id ? m : x) : [m, ...prev]
          })
          if (loginLink) setInviteLink(loginLink)
          setMessage(`Profile for ${m.email} saved. Share the login link below.`)
        }} />

        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by name or email..."
          className="w-full mb-4 bg-gray-900 border border-gray-800 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />

        {message && (
          <div className={`mb-4 p-3 rounded-lg text-sm ${message.startsWith('Error') ? 'bg-red-900/40 border border-red-700 text-red-300' : 'bg-green-900/40 border border-green-700 text-green-300'}`}>
            {message}
          </div>
        )}

        {inviteLink && (
          <div className="mb-4 p-4 rounded-lg bg-blue-900/40 border border-blue-700 text-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-blue-300 font-medium">Share this login link with the member:</span>
              <button
                onClick={() => { navigator.clipboard.writeText(inviteLink); setMessage('Link copied!') }}
                className="text-xs bg-blue-700 hover:bg-blue-600 text-white px-3 py-1 rounded transition-colors"
              >
                Copy Link
              </button>
            </div>
            <p className="text-gray-400 break-all text-xs">{inviteLink}</p>
            <p className="text-gray-500 text-xs mt-2">One-time link — when they click it, they'll land on the set-password page. Share via Slack.</p>
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
          {members.filter(m => {
            if (!search.trim()) return true
            const q = search.toLowerCase()
            return `${m.first_name} ${m.last_name}`.toLowerCase().includes(q) || m.email.toLowerCase().includes(q)
          }).map(member => (
            <div key={member.id}>
              {editingId === member.id ? (
                <EditMemberRow
                  member={member}
                  onSave={(updated) => {
                    setMembers(prev => prev.map(m => m.id === updated.id ? updated : m))
                    setEditingId(null)
                  }}
                  onCancel={() => setEditingId(null)}
                />
              ) : (
                <div className="flex items-center gap-4 bg-gray-900 border border-gray-800 rounded-xl p-4">
                  <div className="flex-1">
                    <p className="font-medium">{member.first_name} {member.last_name}</p>
                    <p className="text-sm text-gray-400">{member.email}</p>
                    {member.job_role && <p className="text-xs text-gray-500">{member.job_role}</p>}
                  </div>
                  <span className={`px-2 py-0.5 rounded text-xs ${member.role === 'admin' ? 'bg-purple-900/60 text-purple-300' : member.role === 'offboarded' ? 'bg-red-900/60 text-red-300' : 'bg-gray-700 text-gray-300'}`}>
                    {member.role}
                  </span>
                  {member.start_date && (
                    <span className="text-xs text-gray-500 whitespace-nowrap">
                      Started {new Date(member.start_date).toLocaleDateString()}
                    </span>
                  )}
                  <button
                    onClick={() => setEditingId(member.id)}
                    className="text-xs bg-gray-700 hover:bg-gray-600 text-white px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap"
                  >
                    Edit
                  </button>
                  <SetDefaultPasswordButton email={member.email} onDone={(msg) => { setMessage(msg); setInviteLink('') }} />
                  <ResetPasswordButton email={member.email} onLink={(link) => { setInviteLink(link); setMessage('') }} />
                </div>
              )}
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}
