'use client'

import { useState } from 'react'

type Existing = {
  last_project: string | null
  sops_used: string | null
  reason: string | null
  invoice_period: string | null
  invoice_amount: string | null
  invoice_notes: string | null
  va_submitted: boolean | null
} | null

const REASONS: Record<string, string> = {
  contract_end: 'Contract End',
  performance: 'Performance',
  voluntary: 'Voluntary Resignation',
  other: 'Other',
}

export default function VAOffboardingForm({ firstName, existing }: { firstName: string; existing: Existing }) {
  const [form, setForm] = useState({
    last_project: existing?.last_project ?? '',
    sops_used: existing?.sops_used ?? '',
    reason: existing?.reason ?? 'contract_end',
    invoice_period: existing?.invoice_period ?? '',
    invoice_amount: existing?.invoice_amount ?? '',
    invoice_notes: existing?.invoice_notes ?? '',
  })
  const [submitted, setSubmitted] = useState(existing?.va_submitted ?? false)
  const [saving, setSaving] = useState(false)
  const [savedAt, setSavedAt] = useState<string | null>(null)

  function setField(field: string, val: string) {
    setForm(f => ({ ...f, [field]: val }))
    setSavedAt(null)
  }

  async function handleSave(submit = false) {
    setSaving(true)
    const res = await fetch('/api/offboard/va-submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, submitted: submit }),
    })
    if (res.ok) {
      setSavedAt(new Date().toLocaleTimeString())
      if (submit) setSubmitted(true)
    }
    setSaving(false)
  }

  const inputClass = 'w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed'
  const labelClass = 'block text-xs text-gray-400 mb-1'

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <nav className="border-b border-gray-800 px-6 py-4 flex items-center justify-between">
        <h1 className="text-lg font-bold">Cyborg VA Portal</h1>
        <form action="/auth/signout" method="post">
          <button className="text-sm text-gray-400 hover:text-white">Sign out</button>
        </form>
      </nav>

      <main className="max-w-lg mx-auto px-4 py-8">
        <div className="mb-6">
          <div className="inline-flex items-center gap-2 bg-orange-950/40 border border-orange-800/40 text-orange-400 text-xs px-3 py-1.5 rounded-full mb-3">
            <span className="w-1.5 h-1.5 rounded-full bg-orange-400"></span>
            Offboarding in progress
          </div>
          <h2 className="text-2xl font-bold mb-1">Your Offboarding Form</h2>
          <p className="text-sm text-gray-400">Hey {firstName} — fill out your sections below. You can save a draft and come back, or submit when you&apos;re ready to hand off to admin.</p>
        </div>

        {submitted && (
          <div className="bg-green-950/40 border border-green-800/40 rounded-xl p-5 mb-6 flex items-start gap-3">
            <span className="text-green-400 text-xl flex-shrink-0">✓</span>
            <div>
              <p className="font-semibold text-green-400 text-sm">Submitted to Admin</p>
              <p className="text-xs text-gray-400 mt-0.5">Your admin is reviewing. You can still edit and re-save below if needed.</p>
            </div>
          </div>
        )}

        {/* Your Info */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-4">
          <p className="text-sm font-semibold text-gray-300 uppercase tracking-wide mb-4">Your Info</p>
          <div className="space-y-4">
            <div>
              <label className={labelClass}>Last Project Worked On</label>
              <input
                className={inputClass}
                value={form.last_project}
                onChange={e => setField('last_project', e.target.value)}
                placeholder="e.g. Podcast editing for Episode 42"
              />
            </div>
            <div>
              <label className={labelClass}>SOP(s) Used</label>
              <input
                className={inputClass}
                value={form.sops_used}
                onChange={e => setField('sops_used', e.target.value)}
                placeholder="e.g. Podcast SOP, Social Media SOP"
              />
            </div>
            <div>
              <label className={labelClass}>Reason for Leaving</label>
              <select
                className={inputClass}
                value={form.reason}
                onChange={e => setField('reason', e.target.value)}
              >
                {Object.entries(REASONS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* Invoice */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-6">
          <p className="text-sm font-semibold text-gray-300 uppercase tracking-wide mb-1">Final Invoice</p>
          <p className="text-xs text-gray-500 mb-4">
            Calculate your pay based on deliverables actually completed (not just what was reported). Cross-check against your Geekbot standups, then prepare the invoice using the Cyborg VA Invoice Template and send it to{' '}
            <span className="text-white font-mono">accounting@joburn.com</span>. Fill in the summary below.
          </p>
          <div className="space-y-4">
            <div>
              <label className={labelClass}>Period Covered</label>
              <input
                className={inputClass}
                value={form.invoice_period}
                onChange={e => setField('invoice_period', e.target.value)}
                placeholder="e.g. Mar 1 – Mar 23, 2026"
              />
            </div>
            <div>
              <label className={labelClass}>Amount (USD)</label>
              <input
                className={inputClass}
                value={form.invoice_amount}
                onChange={e => setField('invoice_amount', e.target.value)}
                placeholder="e.g. 200"
              />
            </div>
            <div>
              <label className={labelClass}>Notes</label>
              <textarea
                className={inputClass}
                rows={2}
                value={form.invoice_notes}
                onChange={e => setField('invoice_notes', e.target.value)}
                placeholder="Any adjustments, based on deliverables..."
              />
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 pb-8">
          <button
            onClick={() => handleSave(false)}
            disabled={saving}
            className="flex-1 text-sm bg-gray-800 hover:bg-gray-700 disabled:opacity-50 text-white px-4 py-2.5 rounded-lg border border-gray-700"
          >
            {saving ? 'Saving...' : savedAt ? `Saved at ${savedAt}` : 'Save Draft'}
          </button>
          <button
            onClick={() => handleSave(true)}
            disabled={saving}
            className="flex-1 text-sm bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-4 py-2.5 rounded-lg font-medium"
          >
            {saving ? 'Submitting...' : submitted ? 'Re-submit to Admin' : 'Submit to Admin →'}
          </button>
        </div>
      </main>
    </div>
  )
}
