'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

type Company = {
  id: string
  name: string
  slug: string
  created_at: string
  is_active: boolean
  member_count: number
  admin_count: number
}

type AdminEmail = { value: string }

export default function CompaniesPage() {
  const [companies, setCompanies] = useState<Company[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [companyName, setCompanyName] = useState('')
  const [adminEmails, setAdminEmails] = useState<AdminEmail[]>([{ value: '' }])
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState('')
  const [inviteLinks, setInviteLinks] = useState<{ email: string; link: string | null }[]>([])
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

      if (profile?.role !== 'super_admin') {
        router.push('/admin')
        return
      }

      await fetchCompanies()
    }
    load()
  }, [router])

  async function fetchCompanies() {
    const res = await fetch('/api/companies')
    if (res.ok) {
      const data = await res.json()
      setCompanies(data.companies ?? [])
    }
    setLoading(false)
  }

  function addEmailRow() {
    setAdminEmails(prev => [...prev, { value: '' }])
  }

  function removeEmailRow(i: number) {
    setAdminEmails(prev => prev.filter((_, idx) => idx !== i))
  }

  function updateEmail(i: number, value: string) {
    setAdminEmails(prev => prev.map((e, idx) => idx === i ? { value } : e))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!companyName.trim()) { setMessage('Company name is required.'); return }
    setSubmitting(true)
    setMessage('')
    setInviteLinks([])

    const emails = adminEmails.map(e => e.value.trim()).filter(Boolean)

    const res = await fetch('/api/companies', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: companyName.trim(), admin_emails: emails }),
    })

    const result = await res.json()
    if (result.error) {
      setMessage(`Error: ${result.error}`)
      setSubmitting(false)
      return
    }

    setInviteLinks(result.invite_links ?? [])
    setMessage(`"${result.company.name}" created successfully.`)
    setCompanyName('')
    setAdminEmails([{ value: '' }])
    setShowForm(false)
    await fetchCompanies()
    setSubmitting(false)
  }

  if (loading) return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center text-gray-400">
      Loading...
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <nav className="border-b border-gray-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/admin" className="text-gray-400 hover:text-white text-sm">← Admin</Link>
          <h1 className="text-lg font-bold">All Clients</h1>
        </div>
        <button
          onClick={() => { setShowForm(!showForm); setMessage(''); setInviteLinks([]) }}
          className="text-sm bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
        >
          + Add Company
        </button>
      </nav>

      <main className="max-w-5xl mx-auto px-4 py-8">

        {/* Invite links from last action */}
        {inviteLinks.length > 0 && (
          <div className="mb-6 p-4 bg-blue-900/30 border border-blue-700 rounded-xl space-y-3">
            <p className="text-blue-300 font-medium text-sm">Admin invite links — share these via Slack:</p>
            {inviteLinks.map(({ email, link }) => (
              <div key={email} className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-400 mb-0.5">{email}</p>
                  {link
                    ? <p className="text-xs text-gray-300 break-all">{link}</p>
                    : <p className="text-xs text-red-400">Failed to generate link</p>
                  }
                </div>
                {link && (
                  <button
                    onClick={() => navigator.clipboard.writeText(link)}
                    className="text-xs bg-blue-700 hover:bg-blue-600 text-white px-2 py-1 rounded transition-colors whitespace-nowrap shrink-0"
                  >
                    Copy
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {message && (
          <div className={`mb-4 p-3 rounded-lg text-sm ${message.startsWith('Error') ? 'bg-red-900/40 border border-red-700 text-red-300' : 'bg-green-900/40 border border-green-700 text-green-300'}`}>
            {message}
          </div>
        )}

        {/* Add Company Form */}
        {showForm && (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-6">
            <h3 className="font-semibold mb-5">New Client Company</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Company Name</label>
                <input
                  required
                  value={companyName}
                  onChange={e => setCompanyName(e.target.value)}
                  placeholder="e.g. Acme Corp"
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-2">Admin Email(s)</label>
                <div className="space-y-2">
                  {adminEmails.map((entry, i) => (
                    <div key={i} className="flex gap-2">
                      <input
                        type="email"
                        value={entry.value}
                        onChange={e => updateEmail(i, e.target.value)}
                        placeholder="admin@clientcompany.com"
                        className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      {adminEmails.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeEmailRow(i)}
                          className="text-xs text-red-400 hover:text-red-300 px-2"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={addEmailRow}
                  className="mt-2 text-xs text-blue-400 hover:text-blue-300 transition-colors"
                >
                  + Add another admin
                </button>
              </div>

              <div className="flex gap-3 pt-1">
                <button
                  type="submit"
                  disabled={submitting}
                  className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-5 py-2 rounded-lg text-sm transition-colors"
                >
                  {submitting ? 'Creating...' : 'Create Company'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg text-sm transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Companies Table */}
        {companies.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <p className="text-lg mb-2">No clients yet</p>
            <p className="text-sm">Click "Add Company" to onboard your first client.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800 text-left">
                  <th className="py-3 pr-6 text-gray-400 font-medium">Company</th>
                  <th className="py-3 pr-6 text-gray-400 font-medium">Admins</th>
                  <th className="py-3 pr-6 text-gray-400 font-medium">Members</th>
                  <th className="py-3 pr-6 text-gray-400 font-medium">Created</th>
                  <th className="py-3 pr-6 text-gray-400 font-medium">Status</th>
                  <th className="py-3 text-gray-400 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {companies.map(company => (
                  <tr key={company.id} className="border-b border-gray-800/50 hover:bg-gray-900/50">
                    <td className="py-3 pr-6">
                      <p className="font-medium">{company.name}</p>
                      <p className="text-xs text-gray-500">{company.slug}</p>
                    </td>
                    <td className="py-3 pr-6 text-gray-300">{company.admin_count}</td>
                    <td className="py-3 pr-6 text-gray-300">{company.member_count}</td>
                    <td className="py-3 pr-6 text-gray-400">
                      {new Date(company.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-3 pr-6">
                      <span className={`text-xs px-2 py-0.5 rounded ${company.is_active ? 'bg-green-900/60 text-green-300' : 'bg-gray-700 text-gray-400'}`}>
                        {company.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="py-3">
                      <Link
                        href={`/admin/companies/${company.id}`}
                        className="text-xs bg-gray-700 hover:bg-gray-600 text-white px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap"
                      >
                        View →
                      </Link>
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
