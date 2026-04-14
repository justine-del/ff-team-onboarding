'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

type VA = {
  id: string; email: string; first_name: string; last_name: string
  job_role: string | null; start_date: string | null; role: string
}

type KpiData = {
  phase1Done: number; totalHours: number; weeksActive: number; customTasks: string[]
}

const emptyForm = {
  last_day: '', reason: 'contract_end', offboard_notes: '',
  last_project: '', sops_used: '',
  kpi_summary: '', kpi_phase1: '', kpi_hours: '', kpi_weeks: '',
  invoice_period: '', invoice_amount: '', invoice_status: 'pending', invoice_notes: '',
  slack_removed: false, drive_removed: false, email_deactivated: false,
  ghl_removed: false, notion_removed: false, geekbot_removed: false,
  onepw_removed: false, other_tools: '',
  handoff_tasks: '', handoff_docs: '', replacement_needed: false,
  notify_stakeholders: false, final_notes: '',
}

type Form = typeof emptyForm

const REASONS: Record<string, string> = {
  contract_end: 'Contract End', performance: 'Performance',
  voluntary: 'Voluntary Resignation', other: 'Other'
}

const INV_STATUS: Record<string, string> = {
  pending: 'Pending', sent: 'Sent to Accounting', paid: 'Paid'
}

function calcTenure(start: string | null, end: string): string {
  if (!start || !end) return '—'
  const weeks = Math.floor((new Date(end).getTime() - new Date(start).getTime()) / (1000 * 60 * 60 * 24 * 7))
  if (weeks < 4) return `${weeks} week${weeks !== 1 ? 's' : ''}`
  const months = Math.floor(weeks / 4.33)
  return `~${months} month${months !== 1 ? 's' : ''}`
}

function today() {
  return new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
}

function Check({ checked }: { checked: boolean }) {
  return <span className={checked ? 'text-green-600 font-bold' : 'text-red-500'}>{checked ? '✓' : '✗'}</span>
}

export default function OffboardingPage() {
  const [vas, setVAs] = useState<VA[]>([])
  const [selectedVA, setSelectedVA] = useState<VA | null>(null)
  const [kpi, setKpi] = useState<KpiData | null>(null)
  const [kpiLoading, setKpiLoading] = useState(false)
  const [form, setForm] = useState<Form>(emptyForm)
  const [view, setView] = useState<'form' | 'report'>('form')
  const [completing, setCompleting] = useState(false)
  const [completed, setCompleted] = useState(false)
  const [saving, setSaving] = useState(false)
  const [savedAt, setSavedAt] = useState<string | null>(null)
  const [vaSubmitted, setVASubmitted] = useState(false)
  const router = useRouter()

  const initiated = selectedVA?.role === 'offboarding'
  // Step: 1 = admin hasn't saved yet, 2 = VA's turn, 3 = done
  const currentStep = !selectedVA ? 0 : completed ? 3 : initiated ? (vaSubmitted ? 3 : 2) : 1

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data: profile } = await supabase.from('profiles').select('role, company_id').eq('id', user.id).single()
      if (profile?.role !== 'admin' && profile?.role !== 'super_admin') { router.push('/dashboard'); return }
      const { data } = await supabase.from('profiles').select('*')
        .eq('company_id', profile?.company_id)
        .in('role', ['member', 'offboarding'])
        .order('first_name')
      setVAs(data ?? [])
    }
    load()
  }, [router])

  async function selectVA(va: VA) {
    setSelectedVA(va)
    setKpi(null)
    setCompleted(false)
    setVASubmitted(false)
    setSavedAt(null)
    setForm(emptyForm)
    setKpiLoading(true)

    const supabase = createClient()
    const [p1res, tcres, ctres, offboardRes] = await Promise.all([
      supabase.from('phase1_completion').select('id').eq('user_id', va.id).eq('status', 'done'),
      supabase.from('task_completions').select('week_start, time_spent').eq('user_id', va.id),
      supabase.from('va_custom_tasks').select('task_name').eq('user_id', va.id).eq('active', true),
      supabase.from('va_offboarding').select('*').eq('user_id', va.id).maybeSingle(),
    ])

    const tcRows = tcres.data ?? []
    const weeksActive = new Set(tcRows.filter(r => (r.time_spent ?? 0) > 0).map(r => r.week_start)).size
    const totalHours = Math.round(tcRows.reduce((s, r) => s + (r.time_spent ?? 0), 0) / 60 * 10) / 10
    const kpiData: KpiData = {
      phase1Done: p1res.data?.length ?? 0,
      totalHours, weeksActive,
      customTasks: (ctres.data ?? []).map(r => r.task_name),
    }
    setKpi(kpiData)

    const ob = offboardRes.data
    if (ob) {
      setVASubmitted(ob.va_submitted ?? false)
      setForm({
        last_day: ob.last_day ?? '',
        reason: ob.reason ?? 'contract_end',
        offboard_notes: ob.offboard_notes ?? '',
        last_project: ob.last_project ?? '',
        sops_used: ob.sops_used ?? '',
        kpi_summary: ob.kpi_summary ?? '',
        kpi_phase1: ob.kpi_phase1 || String(kpiData.phase1Done),
        kpi_hours: ob.kpi_hours || String(kpiData.totalHours),
        kpi_weeks: ob.kpi_weeks || String(kpiData.weeksActive),
        invoice_period: ob.invoice_period ?? '',
        invoice_amount: ob.invoice_amount ?? '',
        invoice_status: ob.invoice_status ?? 'pending',
        invoice_notes: ob.invoice_notes ?? '',
        slack_removed: ob.slack_removed ?? false,
        drive_removed: ob.drive_removed ?? false,
        email_deactivated: ob.email_deactivated ?? false,
        ghl_removed: ob.ghl_removed ?? false,
        notion_removed: ob.notion_removed ?? false,
        geekbot_removed: ob.geekbot_removed ?? false,
        onepw_removed: ob.onepw_removed ?? false,
        other_tools: ob.other_tools ?? '',
        handoff_tasks: ob.handoff_tasks ?? '',
        handoff_docs: ob.handoff_docs ?? '',
        replacement_needed: ob.replacement_needed ?? false,
        notify_stakeholders: ob.notify_stakeholders ?? false,
        final_notes: ob.final_notes ?? '',
      })
    } else {
      setForm(f => ({
        ...f,
        kpi_phase1: String(kpiData.phase1Done),
        kpi_hours: String(kpiData.totalHours),
        kpi_weeks: String(kpiData.weeksActive),
      }))
    }

    setKpiLoading(false)
  }

  function set(field: keyof Form, val: string | boolean) {
    setForm(f => ({ ...f, [field]: val }))
    setSavedAt(null)
  }

  async function handleSave() {
    if (!selectedVA) return
    setSaving(true)
    const res = await fetch('/api/offboard/save', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: selectedVA.id, ...form }),
    })
    const data = await res.json()
    if (data.success) {
      setSavedAt(new Date().toLocaleTimeString())
      // If VA was still 'member', update local state to reflect they're now notified
      if (selectedVA.role === 'member') {
        const updated = { ...selectedVA, role: 'offboarding' }
        setSelectedVA(updated)
        setVAs(vas.map(v => v.id === selectedVA.id ? updated : v))
      }
    }
    setSaving(false)
  }

  async function handleComplete() {
    if (!selectedVA) return
    setCompleting(true)
    // Save latest form state first
    await fetch('/api/offboard/save', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: selectedVA.id, ...form }),
    })
    // Disable login
    const res = await fetch('/api/offboard', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: selectedVA.id }),
    })
    const data = await res.json()
    if (data.success) setCompleted(true)
    setCompleting(false)
  }

  const inputClass = 'w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'
  const labelClass = 'block text-xs text-gray-400 mb-1'
  const cardClass = 'bg-gray-900 border border-gray-800 rounded-xl p-6 mb-4'

  if (view === 'report' && selectedVA) {
    const va = selectedVA
    const tenure = calcTenure(va.start_date, form.last_day)
    return (
      <div className="min-h-screen bg-gray-100 text-gray-900">
        <style>{`@media print { .no-print { display: none !important; } body { background: white !important; } }`}</style>
        <div className="no-print bg-gray-900 text-white px-6 py-3 flex items-center gap-4 sticky top-0 z-10">
          <button onClick={() => setView('form')} className="text-sm text-gray-400 hover:text-white">← Edit Form</button>
          <button onClick={() => window.print()} className="text-sm bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg">Print / Save PDF</button>
          {!completed ? (
            <button onClick={handleComplete} disabled={completing} className="text-sm bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg ml-auto">
              {completing ? 'Completing...' : 'Complete Offboarding'}
            </button>
          ) : (
            <span className="text-green-400 text-sm ml-auto">✓ Offboarding complete</span>
          )}
        </div>
        <div className="max-w-4xl mx-auto px-8 py-10 bg-white shadow-lg my-6">
          <div className="border-b-2 border-teal-700 pb-4 mb-6">
            <div className="bg-teal-700 text-white px-4 py-2 rounded-t text-lg font-bold">CYBORG VA — OFFBOARDING REPORT</div>
            <div className="mt-3 flex flex-wrap gap-6 text-sm text-gray-600">
              <span><strong>Prepared:</strong> {today()}</span>
              <span><strong>Processed by:</strong> Justine</span>
              <span><strong>Status:</strong> {completed ? '🔴 Login Disabled' : '🟡 In Progress'}</span>
            </div>
          </div>

          <section className="mb-6">
            <h2 className="font-bold text-teal-700 border-b border-teal-200 pb-1 mb-3">1. VA INFORMATION</h2>
            <table className="w-full text-sm border-collapse">
              <tbody>
                {[
                  ['VA Full Name', `${va.first_name} ${va.last_name}`],
                  ['Email', va.email],
                  ['Role / Position', va.job_role ?? '—'],
                  ['Start Date', va.start_date ? new Date(va.start_date).toLocaleDateString('en-US', {year:'numeric',month:'long',day:'numeric'}) : '—'],
                  ['Last Working Day', form.last_day ? new Date(form.last_day).toLocaleDateString('en-US', {year:'numeric',month:'long',day:'numeric'}) : '—'],
                  ['Total Tenure', tenure],
                  ['Last Project Worked On', form.last_project || '—'],
                  ['SOP(s) Used', form.sops_used || '—'],
                  ['Reason for Offboarding', REASONS[form.reason] ?? form.reason],
                ].map(([label, val]) => (
                  <tr key={label} className="border-b border-gray-100">
                    <td className="py-2 pr-4 text-gray-500 font-medium w-48">{label}</td>
                    <td className="py-2 text-gray-900">{val}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {form.offboard_notes && <p className="mt-3 text-sm text-gray-600 bg-gray-50 p-3 rounded"><strong>Notes:</strong> {form.offboard_notes}</p>}
          </section>

          <section className="mb-6">
            <h2 className="font-bold text-teal-700 border-b border-teal-200 pb-1 mb-3">2. KPI & WORK REVIEW</h2>
            <table className="w-full text-sm border-collapse mb-3">
              <thead><tr className="bg-teal-700 text-white"><th className="text-left py-2 px-3">Metric</th><th className="text-left py-2 px-3">Result</th></tr></thead>
              <tbody>
                {[
                  ['Phase 1 Tasks Completed', `${form.kpi_phase1} / 18`],
                  ['Total Hours Logged in Portal', `${form.kpi_hours} hrs`],
                  ['Weeks Active in Portal', `${form.kpi_weeks} weeks`],
                ].map(([label, val]) => (
                  <tr key={label} className="border-b border-gray-100">
                    <td className="py-2 px-3 text-gray-600 w-64">{label}</td>
                    <td className="py-2 px-3 text-gray-900 font-medium">{val}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {kpi?.customTasks.length ? <p className="text-sm text-gray-600 mb-3"><strong>Custom Tasks:</strong> {kpi.customTasks.join(', ')}</p> : null}
            {form.kpi_summary && <div className="bg-gray-50 border border-gray-200 rounded p-3 text-sm"><strong className="block mb-1">Performance Summary</strong><p className="text-gray-700">{form.kpi_summary}</p></div>}
          </section>

          <section className="mb-6">
            <h2 className="font-bold text-teal-700 border-b border-teal-200 pb-1 mb-3">3. FINAL INVOICE</h2>
            <table className="w-full text-sm border-collapse">
              <tbody>
                {[
                  ['Period Covered', form.invoice_period || '—'],
                  ['Invoice Amount', form.invoice_amount ? `$${form.invoice_amount} USD` : '—'],
                  ['Payment Status', INV_STATUS[form.invoice_status] ?? form.invoice_status],
                  ['Send To', 'accounting@joburn.com'],
                  ['Approved By', 'Justine'],
                ].map(([label, val]) => (
                  <tr key={label} className="border-b border-gray-100">
                    <td className="py-2 pr-4 text-gray-500 font-medium w-48">{label}</td>
                    <td className="py-2 text-gray-900">{val}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {form.invoice_notes && <p className="mt-3 text-sm text-gray-600 bg-gray-50 p-3 rounded"><strong>Notes:</strong> {form.invoice_notes}</p>}
          </section>

          <section className="mb-6">
            <h2 className="font-bold text-teal-700 border-b border-teal-200 pb-1 mb-3">4. TOOL ACCESS REVOCATION</h2>
            <table className="w-full text-sm border-collapse">
              <tbody>
                {([
                  ['Slack', form.slack_removed],
                  ['Google Drive / Shared Folders', form.drive_removed],
                  ['Email Deactivated', form.email_deactivated],
                  ['GoHighLevel (GHL)', form.ghl_removed],
                  ['Notion', form.notion_removed],
                  ['Geekbot', form.geekbot_removed],
                  ['1Password', form.onepw_removed],
                  ['Portal Login', completed],
                ] as [string, boolean][]).map(([label, val]) => (
                  <tr key={label} className="border-b border-gray-100">
                    <td className="py-2 pr-4 text-gray-600 w-64">{label}</td>
                    <td className="py-2"><Check checked={val} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
            {form.other_tools && <p className="mt-3 text-sm text-gray-600 bg-gray-50 p-3 rounded"><strong>Other:</strong> {form.other_tools}</p>}
          </section>

          <section className="mb-6">
            <h2 className="font-bold text-teal-700 border-b border-teal-200 pb-1 mb-3">5. HANDOFF & CLOSE OUT</h2>
            <table className="w-full text-sm border-collapse">
              <tbody>
                {[
                  ['Replacement VA Needed', form.replacement_needed ? 'Yes' : 'No'],
                  ['Stakeholders Notified', form.notify_stakeholders ? 'Yes — John Coburn + Phoenix Bohannon' : 'No'],
                  ['Handoff Docs', form.handoff_docs || '—'],
                ].map(([label, val]) => (
                  <tr key={label} className="border-b border-gray-100">
                    <td className="py-2 pr-4 text-gray-500 font-medium w-48">{label}</td>
                    <td className="py-2 text-gray-900">{val}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {form.handoff_tasks && <p className="mt-3 text-sm text-gray-600 bg-gray-50 p-3 rounded"><strong>Tasks Reassigned:</strong> {form.handoff_tasks}</p>}
            {form.final_notes && <p className="mt-3 text-sm text-gray-600 bg-gray-50 p-3 rounded"><strong>Final Notes:</strong> {form.final_notes}</p>}
          </section>

          <div className="border-t-2 border-teal-700 pt-4 text-xs text-gray-400 flex justify-between">
            <span>Cyborg VA — Confidential Internal Record</span>
            <span>Send invoice to: accounting@joburn.com</span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <nav className="border-b border-gray-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/admin" className="text-gray-400 hover:text-white text-sm">← Admin</Link>
          <h1 className="text-lg font-bold">Offboard VA</h1>
        </div>
        {selectedVA && (
          <div className="flex items-center gap-3">
            <button
              onClick={handleSave}
              disabled={saving}
              className="text-sm bg-gray-700 hover:bg-gray-600 disabled:opacity-50 text-white px-4 py-2 rounded-lg"
            >
              {saving ? 'Saving...' : savedAt ? `Saved ${savedAt}` : 'Save Progress'}
            </button>
            {initiated && !completed && (
              <button onClick={handleComplete} disabled={completing} className="text-sm bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg">
                {completing ? 'Completing...' : 'Complete Offboarding'}
              </button>
            )}
            {completed && <span className="text-green-400 text-sm">✓ Done</span>}
            <button onClick={() => setView('report')} className="text-sm bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg">
              Preview Report →
            </button>
          </div>
        )}
      </nav>

      <main className="max-w-3xl mx-auto px-4 py-8">

        {/* VA Selector */}
        <div className={cardClass}>
          <p className="text-sm font-semibold text-gray-300 mb-4 uppercase tracking-wide">Select VA to Offboard</p>
          <select
            className={inputClass}
            value={selectedVA?.id ?? ''}
            onChange={e => {
              const va = vas.find(v => v.id === e.target.value)
              if (va) selectVA(va)
            }}
          >
            <option value="">— Choose a team member —</option>
            {vas.map(va => (
              <option key={va.id} value={va.id}>
                {va.first_name} {va.last_name} ({va.email}){va.role === 'offboarding' ? ' — In Progress' : ''}
              </option>
            ))}
          </select>
        </div>

        {selectedVA && (
          <>
            {/* Step Indicator */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 mb-4">
              <div className="flex items-center">
                {/* Step 1 */}
                <div className={`flex items-center gap-2 ${currentStep === 1 ? 'text-white' : currentStep > 1 ? 'text-green-400' : 'text-gray-600'}`}>
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${currentStep === 1 ? 'bg-blue-600' : 'bg-green-600'}`}>
                    {currentStep > 1 ? '✓' : '1'}
                  </span>
                  <span className="text-sm font-medium whitespace-nowrap">Admin Saves</span>
                </div>
                <div className="flex-1 h-px bg-gray-700 mx-3" />
                {/* Step 2 */}
                <div className={`flex items-center gap-2 ${currentStep === 2 ? 'text-white' : currentStep > 2 ? 'text-green-400' : 'text-gray-600'}`}>
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${currentStep === 2 ? 'bg-blue-600' : currentStep > 2 ? 'bg-green-600' : 'bg-gray-800'}`}>
                    {currentStep > 2 ? '✓' : '2'}
                  </span>
                  <span className="text-sm font-medium whitespace-nowrap">VA Submits</span>
                </div>
                <div className="flex-1 h-px bg-gray-700 mx-3" />
                {/* Step 3 */}
                <div className={`flex items-center gap-2 ${currentStep === 3 ? 'text-green-400' : 'text-gray-600'}`}>
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${currentStep === 3 ? 'bg-green-600' : 'bg-gray-800'}`}>
                    {currentStep === 3 ? '✓' : '3'}
                  </span>
                  <span className="text-sm font-medium whitespace-nowrap">Admin Finalizes</span>
                </div>
              </div>

              <div className="mt-3 pt-3 border-t border-gray-800 text-xs">
                {currentStep === 1 && (
                  <p className="text-gray-400">Fill in the admin sections below, then click <strong className="text-white">Save Progress</strong>. This will notify the VA to fill out their portion on their dashboard.</p>
                )}
                {currentStep === 2 && !vaSubmitted && (
                  <p className="text-yellow-400/80">VA has been notified and can see their form. Waiting for them to submit their portion. You can continue filling in the admin sections below.</p>
                )}
                {currentStep === 2 && vaSubmitted && (
                  <p className="text-green-400">VA has submitted their portion. Review the form below, then click <strong>Complete Offboarding</strong> to disable their login.</p>
                )}
                {currentStep === 3 && (
                  <p className="text-green-400">Offboarding complete. Login has been disabled.</p>
                )}
              </div>
            </div>

            {/* 1. VA Information */}
            <div className={cardClass}>
              <div className="flex items-center gap-2 mb-4">
                <p className="text-sm font-semibold text-gray-300 uppercase tracking-wide">1. VA Information</p>
                <span className="text-xs bg-teal-900/60 text-teal-400 border border-teal-800/60 px-2 py-0.5 rounded">ADMIN</span>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                <div><span className="text-gray-400">Name:</span> <span>{selectedVA.first_name} {selectedVA.last_name}</span></div>
                <div><span className="text-gray-400">Email:</span> <span>{selectedVA.email}</span></div>
                <div><span className="text-gray-400">Role:</span> <span>{selectedVA.job_role ?? '—'}</span></div>
                <div><span className="text-gray-400">Start Date:</span> <span>{selectedVA.start_date ? new Date(selectedVA.start_date).toLocaleDateString() : '—'}</span></div>
              </div>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className={labelClass}>Last Working Day</label>
                  <input type="date" className={inputClass} value={form.last_day} onChange={e => set('last_day', e.target.value)} />
                </div>
                <div>
                  <label className={labelClass}>Reason for Offboarding</label>
                  <select className={inputClass} value={form.reason} onChange={e => set('reason', e.target.value)}>
                    {Object.entries(REASONS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className={labelClass}>Offboarding Notes</label>
                <textarea className={inputClass} rows={2} value={form.offboard_notes} onChange={e => set('offboard_notes', e.target.value)} placeholder="Context, red flags, additional details..." />
              </div>

              {/* VA fields — admin editable but labelled */}
              <div className="border-t border-gray-800 pt-4 mt-4">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xs bg-yellow-900/60 text-yellow-400 border border-yellow-800/60 px-2 py-0.5 rounded">FROM VA</span>
                  <span className="text-xs text-gray-500">VA fills this on their dashboard — you can also edit here</span>
                </div>
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className={labelClass}>Last Project Worked On</label>
                    <input className={inputClass} value={form.last_project} onChange={e => set('last_project', e.target.value)} placeholder="e.g. Podcast editing for Episode 42" />
                  </div>
                  <div>
                    <label className={labelClass}>SOP(s) Used</label>
                    <input className={inputClass} value={form.sops_used} onChange={e => set('sops_used', e.target.value)} placeholder="e.g. Podcast SOP, Social Media SOP" />
                  </div>
                </div>
              </div>
            </div>

            {/* 2. KPI */}
            <div className={cardClass}>
              <div className="flex items-center gap-2 mb-4">
                <p className="text-sm font-semibold text-gray-300 uppercase tracking-wide">2. KPI & Work Review</p>
                <span className="text-xs bg-teal-900/60 text-teal-400 border border-teal-800/60 px-2 py-0.5 rounded">ADMIN</span>
              </div>
              {kpiLoading ? (
                <p className="text-gray-400 text-sm">Loading portal data...</p>
              ) : (
                <>
                  <div className="grid grid-cols-3 gap-4 mb-4">
                    <div>
                      <label className={labelClass}>Phase 1 Tasks Done (/ 18)</label>
                      <input className={inputClass} value={form.kpi_phase1} onChange={e => set('kpi_phase1', e.target.value)} />
                    </div>
                    <div>
                      <label className={labelClass}>Total Hours Logged</label>
                      <input className={inputClass} value={form.kpi_hours} onChange={e => set('kpi_hours', e.target.value)} />
                    </div>
                    <div>
                      <label className={labelClass}>Weeks Active in Portal</label>
                      <input className={inputClass} value={form.kpi_weeks} onChange={e => set('kpi_weeks', e.target.value)} />
                    </div>
                  </div>
                  {kpi?.customTasks.length ? (
                    <div className="mb-4">
                      <label className={labelClass}>Custom Tasks Assigned</label>
                      <div className="flex flex-wrap gap-2">
                        {kpi.customTasks.map(t => <span key={t} className="bg-gray-800 text-gray-300 text-xs px-2 py-1 rounded">{t}</span>)}
                      </div>
                    </div>
                  ) : null}
                  <div>
                    <label className={labelClass}>Performance Summary</label>
                    <textarea className={inputClass} rows={4} value={form.kpi_summary} onChange={e => set('kpi_summary', e.target.value)} placeholder="Summarize overall performance, key issues, and reason for decision..." />
                  </div>
                </>
              )}
            </div>

            {/* 3. Invoice */}
            <div className={cardClass}>
              <div className="flex items-center gap-2 mb-4">
                <p className="text-sm font-semibold text-gray-300 uppercase tracking-wide">3. Final Invoice</p>
                <span className="text-xs bg-yellow-900/60 text-yellow-400 border border-yellow-800/60 px-2 py-0.5 rounded">FROM VA</span>
              </div>
              <div className="bg-yellow-950/30 border border-yellow-900/40 rounded-lg p-3 mb-4 text-sm text-yellow-300/80">
                VA prepares their invoice based on deliverables completed and sends it to <strong className="text-yellow-300">accounting@joburn.com</strong>. The details below are filled by the VA and synced here.
              </div>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className={labelClass}>Period Covered</label>
                  <input className={inputClass} value={form.invoice_period} onChange={e => set('invoice_period', e.target.value)} placeholder="e.g. Mar 1 – Mar 23, 2026" />
                </div>
                <div>
                  <label className={labelClass}>Amount (USD)</label>
                  <input className={inputClass} value={form.invoice_amount} onChange={e => set('invoice_amount', e.target.value)} placeholder="e.g. 200" />
                </div>
                <div>
                  <label className={labelClass}>Payment Status</label>
                  <select className={inputClass} value={form.invoice_status} onChange={e => set('invoice_status', e.target.value)}>
                    {Object.entries(INV_STATUS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
              </div>
              <label className={labelClass}>Invoice Notes</label>
              <textarea className={inputClass} rows={2} value={form.invoice_notes} onChange={e => set('invoice_notes', e.target.value)} placeholder="Payment adjustments, notes from accounting..." />
            </div>

            {/* 4. Tool Access */}
            <div className={cardClass}>
              <div className="flex items-center gap-2 mb-4">
                <p className="text-sm font-semibold text-gray-300 uppercase tracking-wide">4. Tool Access Revocation</p>
                <span className="text-xs bg-teal-900/60 text-teal-400 border border-teal-800/60 px-2 py-0.5 rounded">ADMIN</span>
              </div>
              <div className="grid grid-cols-2 gap-3 mb-4">
                {([
                  ['slack_removed', 'Slack'],
                  ['drive_removed', 'Google Drive'],
                  ['email_deactivated', 'Email Deactivated'],
                  ['ghl_removed', 'GoHighLevel (GHL)'],
                  ['notion_removed', 'Notion'],
                  ['geekbot_removed', 'Geekbot'],
                  ['onepw_removed', '1Password'],
                ] as [keyof Form, string][]).map(([field, label]) => (
                  <label key={field} className="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" checked={form[field] as boolean} onChange={e => set(field, e.target.checked)} className="w-4 h-4 rounded accent-blue-500" />
                    <span className="text-sm text-gray-300">{label}</span>
                  </label>
                ))}
              </div>
              <label className={labelClass}>Other Tools</label>
              <input className={inputClass} value={form.other_tools} onChange={e => set('other_tools', e.target.value)} placeholder="Specify any others..." />
            </div>

            {/* 5. Handoff */}
            <div className={cardClass}>
              <div className="flex items-center gap-2 mb-4">
                <p className="text-sm font-semibold text-gray-300 uppercase tracking-wide">5. Handoff & Close Out</p>
                <span className="text-xs bg-teal-900/60 text-teal-400 border border-teal-800/60 px-2 py-0.5 rounded">ADMIN</span>
              </div>
              <div className="mb-4">
                <label className={labelClass}>Tasks Reassigned To</label>
                <textarea className={inputClass} rows={2} value={form.handoff_tasks} onChange={e => set('handoff_tasks', e.target.value)} placeholder="e.g. Pending podcast edits → Shannon" />
              </div>
              <div className="mb-4">
                <label className={labelClass}>Handoff Docs Link</label>
                <input className={inputClass} value={form.handoff_docs} onChange={e => set('handoff_docs', e.target.value)} placeholder="Google Doc, Notion, etc." />
              </div>
              <div className="grid grid-cols-2 gap-3 mb-4">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" checked={form.replacement_needed} onChange={e => set('replacement_needed', e.target.checked)} className="w-4 h-4 rounded accent-blue-500" />
                  <span className="text-sm text-gray-300">Replacement VA needed</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" checked={form.notify_stakeholders} onChange={e => set('notify_stakeholders', e.target.checked)} className="w-4 h-4 rounded accent-blue-500" />
                  <span className="text-sm text-gray-300">Notified John Coburn + Phoenix Bohannon</span>
                </label>
              </div>
              <label className={labelClass}>Final Notes & Observations</label>
              <textarea className={inputClass} rows={3} value={form.final_notes} onChange={e => set('final_notes', e.target.value)} placeholder="Anything worth documenting for records..." />
            </div>

            <div className="flex justify-end gap-3 pb-8">
              <button onClick={handleSave} disabled={saving} className="text-sm bg-gray-700 hover:bg-gray-600 disabled:opacity-50 text-white px-6 py-2.5 rounded-lg border border-gray-600">
                {saving ? 'Saving...' : savedAt ? `Saved ${savedAt}` : 'Save Progress'}
              </button>
              {initiated && !completed && (
                <button onClick={handleComplete} disabled={completing} className="text-sm bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white px-6 py-2.5 rounded-lg">
                  {completing ? 'Completing...' : 'Complete Offboarding'}
                </button>
              )}
              {completed && <span className="text-green-400 text-sm flex items-center">✓ Offboarding complete</span>}
              <button onClick={() => setView('report')} className="text-sm bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg">
                Preview Report →
              </button>
            </div>
          </>
        )}
      </main>
    </div>
  )
}
