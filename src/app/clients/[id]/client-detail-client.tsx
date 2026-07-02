'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { Client, Coverage, PremiumLossHistory, ProgramType } from '@/types/database';
import ProgramTypePicker, {
  computeProgramType,
  parseProgramType,
  type BaseType,
  type PickerCarrier,
} from '../program-type-picker';

const PROGRAM_TYPE_LABELS: Record<ProgramType, string> = {
  captive_only: 'Captive Only',
  ottawa_victoria_captive: 'Ottawa/Victoria + Captive',
  ottawa_victoria_only: 'Ottawa/Victoria Only',
  fronted: 'Fronted Program',
  fronted_captive: 'Fronted Program + Captive',
};

const PROGRAM_TYPE_COLORS: Record<ProgramType, string> = {
  captive_only: 'bg-blue-100 text-blue-700',
  ottawa_victoria_captive: 'bg-purple-100 text-purple-700',
  ottawa_victoria_only: 'bg-purple-100 text-purple-700',
  fronted: 'bg-amber-100 text-amber-700',
  fronted_captive: 'bg-amber-100 text-amber-700',
};

const fmt = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);

const lossRatio = (losses: number, premium: number) =>
  premium > 0 ? ((losses / premium) * 100).toFixed(1) + '%' : '—';

type TabId = 'overview' | 'coverages' | 'history' | 'commissions' | 'invoices' | 'engagement' | 'structure' | 'profitability' | 'comments';

const TABS: { id: TabId; label: string; module?: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'coverages', label: 'Coverages' },
  { id: 'history', label: 'History' },
  { id: 'commissions', label: 'Commissions', module: '5' },
  { id: 'invoices', label: 'Invoices', module: '6' },
  { id: 'engagement', label: 'Engagement Letters', module: '6' },
  { id: 'structure', label: 'Program Structure', module: '7' },
  { id: 'profitability', label: 'Profitability', module: '7' },
  { id: 'comments', label: 'Comments', module: '9' },
];

const COMMON_COVERAGES = [
  'General Liability (GL)',
  'Commercial Auto',
  "Workers' Compensation (WC)",
  'Commercial Property',
  'Umbrella / Excess',
  'Professional Liability (E&O)',
  'Cyber Liability',
  'Directors & Officers (D&O)',
];

interface Props {
  client: Client;
  coverages: Coverage[];
  history: PremiumLossHistory[];
}

export default function ClientDetailClient({ client: initialClient, coverages: initialCoverages, history: initialHistory }: Props) {
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [client, setClient] = useState(initialClient);
  const [coverages, setCoverages] = useState(initialCoverages);
  const [history, setHistory] = useState(initialHistory);
  const [error, setError] = useState('');

  // Overview edit state
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    company_name: initialClient.company_name,
    contact_name: initialClient.contact_name ?? '',
    contact_email: initialClient.contact_email ?? '',
    contact_phone: initialClient.contact_phone ?? '',
    engagement_letter_date: initialClient.engagement_letter_date ?? '',
    notes: initialClient.notes ?? '',
  });
  const parsed = parseProgramType(initialClient.program_type, initialClient.carrier);
  const [pickerBase, setPickerBase] = useState<BaseType>(parsed.base);
  const [pickerCarrier, setPickerCarrier] = useState<PickerCarrier>(parsed.pickerCarrier);
  const [pickerAddCaptive, setPickerAddCaptive] = useState(parsed.addCaptive);
  const [editSaving, setEditSaving] = useState(false);

  // Coverage state
  const [coverageForm, setCoverageForm] = useState({ coverage_type: '', policy_limit: '', notes: '' });
  const [coverageSaving, setCoverageSaving] = useState(false);
  const [coverageError, setCoverageError] = useState('');
  const [addCoverageOpen, setAddCoverageOpen] = useState(false);
  const [deletingCoverageId, setDeletingCoverageId] = useState<string | null>(null);

  // History state
  const [historyOpen, setHistoryOpen] = useState(false);
  const [editingHistory, setEditingHistory] = useState<PremiumLossHistory | null>(null);
  const [historyForm, setHistoryForm] = useState({ year: '', premium: '', losses: '' });
  const [historySaving, setHistorySaving] = useState(false);
  const [historyError, setHistoryError] = useState('');
  const [deletingHistoryId, setDeletingHistoryId] = useState<string | null>(null);

  function openEditOverview() {
    const p = parseProgramType(client.program_type, client.carrier);
    setPickerBase(p.base);
    setPickerCarrier(p.pickerCarrier);
    setPickerAddCaptive(p.addCaptive);
    setEditForm({
      company_name: client.company_name,
      contact_name: client.contact_name ?? '',
      contact_email: client.contact_email ?? '',
      contact_phone: client.contact_phone ?? '',
      engagement_letter_date: client.engagement_letter_date ?? '',
      notes: client.notes ?? '',
    });
    setError('');
    setEditOpen(true);
  }

  async function handleEditSave(e: React.FormEvent) {
    e.preventDefault();
    setEditSaving(true);
    setError('');
    const { program_type, carrier } = computeProgramType(pickerBase, pickerCarrier, pickerAddCaptive);
    const res = await fetch(`/api/clients/${client.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        company_name: editForm.company_name.trim(),
        contact_name: editForm.contact_name || null,
        contact_email: editForm.contact_email || null,
        contact_phone: editForm.contact_phone || null,
        engagement_letter_date: editForm.engagement_letter_date || null,
        notes: editForm.notes || null,
        program_type,
        carrier,
      }),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error); setEditSaving(false); return; }
    setClient(data);
    setEditOpen(false);
    setEditSaving(false);
  }

  async function handleAddCoverage(e: React.FormEvent) {
    e.preventDefault();
    setCoverageSaving(true);
    setCoverageError('');
    const res = await fetch(`/api/clients/${client.id}/coverages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        coverage_type: coverageForm.coverage_type,
        policy_limit: coverageForm.policy_limit ? Number(coverageForm.policy_limit) : null,
        notes: coverageForm.notes || null,
      }),
    });
    const data = await res.json();
    if (!res.ok) { setCoverageError(data.error); setCoverageSaving(false); return; }
    setCoverages(prev => [...prev, data]);
    setCoverageForm({ coverage_type: '', policy_limit: '', notes: '' });
    setAddCoverageOpen(false);
    setCoverageSaving(false);
  }

  async function handleDeleteCoverage(coverageId: string) {
    setDeletingCoverageId(coverageId);
    const res = await fetch(`/api/clients/${client.id}/coverages/${coverageId}`, { method: 'DELETE' });
    if (res.ok) {
      setCoverages(prev => prev.filter(c => c.id !== coverageId));
    }
    setDeletingCoverageId(null);
  }

  function openAddHistory() {
    setEditingHistory(null);
    setHistoryForm({ year: String(new Date().getFullYear()), premium: '', losses: '' });
    setHistoryError('');
    setHistoryOpen(true);
  }

  function openEditHistory(row: PremiumLossHistory) {
    setEditingHistory(row);
    setHistoryForm({ year: String(row.year), premium: String(row.premium), losses: String(row.losses) });
    setHistoryError('');
    setHistoryOpen(true);
  }

  async function handleSaveHistory(e: React.FormEvent) {
    e.preventDefault();
    setHistorySaving(true);
    setHistoryError('');
    const res = await fetch(`/api/clients/${client.id}/history`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        year: Number(historyForm.year),
        premium: Number(historyForm.premium),
        losses: Number(historyForm.losses),
      }),
    });
    const data = await res.json();
    if (!res.ok) { setHistoryError(data.error); setHistorySaving(false); return; }
    setHistory(prev => {
      const without = prev.filter(r => r.year !== data.year);
      return [...without, data].sort((a, b) => b.year - a.year);
    });
    setHistoryOpen(false);
    setHistorySaving(false);
  }

  async function handleDeleteHistory(historyId: string) {
    setDeletingHistoryId(historyId);
    const res = await fetch(`/api/clients/${client.id}/history/${historyId}`, { method: 'DELETE' });
    if (res.ok) {
      setHistory(prev => prev.filter(r => r.id !== historyId));
    }
    setDeletingHistoryId(null);
  }

  const tabClass = (id: TabId) =>
    `px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
      activeTab === id
        ? 'border-indigo-700 text-indigo-700'
        : 'border-transparent text-slate-500 hover:text-slate-700'
    }`;

  return (
    <>
      {/* Header */}
      <div className="mb-6">
        <Link href="/clients" className="text-sm text-indigo-600 hover:underline">← Back to Clients</Link>
        <div className="flex items-center gap-3 mt-2">
          <h1 className="text-2xl font-bold text-slate-800">{client.company_name}</h1>
          <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-medium ${PROGRAM_TYPE_COLORS[client.program_type]}`}>
            {PROGRAM_TYPE_LABELS[client.program_type]}
          </span>
        </div>
      </div>

      {/* Tab Nav */}
      <div className="flex border-b border-slate-200 mb-6 overflow-x-auto">
        {TABS.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={tabClass(tab.id)}>
            {tab.label}
            {tab.module && <span className="ml-1 text-xs opacity-50">(M{tab.module})</span>}
          </button>
        ))}
      </div>

      {/* Tab: Overview */}
      {activeTab === 'overview' && (
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">Client Details</h2>
            <button onClick={openEditOverview} className="text-sm text-indigo-600 hover:underline">Edit</button>
          </div>
          <dl className="grid grid-cols-2 gap-x-8 gap-y-4 text-sm">
            <div>
              <dt className="text-slate-500 mb-0.5">Company Name</dt>
              <dd className="text-slate-800 font-medium">{client.company_name}</dd>
            </div>
            <div>
              <dt className="text-slate-500 mb-0.5">Contact Name</dt>
              <dd className="text-slate-800">{client.contact_name ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-slate-500 mb-0.5">Email</dt>
              <dd className="text-slate-800">
                {client.contact_email
                  ? <a href={`mailto:${client.contact_email}`} className="text-indigo-600 hover:underline">{client.contact_email}</a>
                  : '—'}
              </dd>
            </div>
            <div>
              <dt className="text-slate-500 mb-0.5">Phone</dt>
              <dd className="text-slate-800">{client.contact_phone ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-slate-500 mb-0.5">Program Type</dt>
              <dd className="text-slate-800">{PROGRAM_TYPE_LABELS[client.program_type]}</dd>
            </div>
            <div>
              <dt className="text-slate-500 mb-0.5">Carrier</dt>
              <dd className="text-slate-800 capitalize">{client.carrier === 'none' ? '—' : client.carrier}</dd>
            </div>
            <div>
              <dt className="text-slate-500 mb-0.5">Engagement Letter Date</dt>
              <dd className="text-slate-800">
                {client.engagement_letter_date
                  ? new Date(client.engagement_letter_date + 'T00:00:00').toLocaleDateString()
                  : '—'}
              </dd>
            </div>
            <div>
              <dt className="text-slate-500 mb-0.5">Added</dt>
              <dd className="text-slate-800">{new Date(client.created_at).toLocaleDateString()}</dd>
            </div>
            <div className="col-span-2">
              <dt className="text-slate-500 mb-0.5">Notes</dt>
              <dd className="text-slate-800 whitespace-pre-wrap">{client.notes ?? '—'}</dd>
            </div>
          </dl>
        </div>
      )}

      {/* Tab: Coverages */}
      {activeTab === 'coverages' && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-700">Coverage Lines</h2>
              <button
                onClick={() => { setCoverageForm({ coverage_type: '', policy_limit: '', notes: '' }); setCoverageError(''); setAddCoverageOpen(true); }}
                className="bg-indigo-700 hover:bg-indigo-800 text-white text-sm px-3 py-1.5 rounded-lg transition-colors"
              >
                Add Coverage
              </button>
            </div>
            {coverages.length === 0 ? (
              <div className="p-10 text-center text-slate-400 text-sm">No coverage lines added yet.</div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide">
                  <tr>
                    <th className="px-6 py-3 text-left">Coverage Type</th>
                    <th className="px-6 py-3 text-left">Policy Limit</th>
                    <th className="px-6 py-3 text-left">Notes</th>
                    <th className="px-6 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {coverages.map(cov => (
                    <tr key={cov.id}>
                      <td className="px-6 py-4 font-medium text-slate-800">{cov.coverage_type}</td>
                      <td className="px-6 py-4 text-slate-600">{cov.policy_limit != null ? fmt(cov.policy_limit) : '—'}</td>
                      <td className="px-6 py-4 text-slate-500">{cov.notes ?? '—'}</td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => handleDeleteCoverage(cov.id)}
                          disabled={deletingCoverageId === cov.id}
                          className="text-xs text-red-500 hover:text-red-700 disabled:opacity-40"
                        >
                          {deletingCoverageId === cov.id ? 'Removing…' : 'Remove'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* Tab: History */}
      {activeTab === 'history' && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-slate-700">Premium & Loss History</h2>
              <p className="text-xs text-slate-400 mt-0.5">5 years of historical data for profitability analysis</p>
            </div>
            <button
              onClick={openAddHistory}
              className="bg-indigo-700 hover:bg-indigo-800 text-white text-sm px-3 py-1.5 rounded-lg transition-colors"
            >
              Add Year
            </button>
          </div>
          {history.length === 0 ? (
            <div className="p-10 text-center text-slate-400 text-sm">No history data yet. Add a year to get started.</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide">
                <tr>
                  <th className="px-6 py-3 text-left">Year</th>
                  <th className="px-6 py-3 text-right">Total Premium</th>
                  <th className="px-6 py-3 text-right">Total Losses</th>
                  <th className="px-6 py-3 text-right">Loss Ratio</th>
                  <th className="px-6 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {history.map(row => (
                  <tr key={row.id}>
                    <td className="px-6 py-4 font-medium text-slate-800">{row.year}</td>
                    <td className="px-6 py-4 text-right text-slate-700">{fmt(row.premium)}</td>
                    <td className="px-6 py-4 text-right text-slate-700">{fmt(row.losses)}</td>
                    <td className="px-6 py-4 text-right">
                      <span className={`font-medium ${(row.losses / row.premium) > 0.7 ? 'text-red-600' : 'text-green-700'}`}>
                        {lossRatio(row.losses, row.premium)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center gap-3 justify-end">
                        <button onClick={() => openEditHistory(row)} className="text-xs text-indigo-600 hover:underline">Edit</button>
                        <button
                          onClick={() => handleDeleteHistory(row.id)}
                          disabled={deletingHistoryId === row.id}
                          className="text-xs text-red-500 hover:text-red-700 disabled:opacity-40"
                        >
                          {deletingHistoryId === row.id ? 'Deleting…' : 'Delete'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
              {history.length > 1 && (
                <tfoot className="bg-slate-50 border-t border-slate-200">
                  <tr>
                    <td className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase">5-Yr Avg</td>
                    <td className="px-6 py-3 text-right text-xs font-medium text-slate-700">
                      {fmt(history.reduce((s, r) => s + r.premium, 0) / history.length)}
                    </td>
                    <td className="px-6 py-3 text-right text-xs font-medium text-slate-700">
                      {fmt(history.reduce((s, r) => s + r.losses, 0) / history.length)}
                    </td>
                    <td className="px-6 py-3 text-right text-xs font-medium text-slate-700">
                      {lossRatio(
                        history.reduce((s, r) => s + r.losses, 0),
                        history.reduce((s, r) => s + r.premium, 0)
                      )}
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              )}
            </table>
          )}
        </div>
      )}

      {/* Stub tabs */}
      {['commissions', 'invoices', 'engagement', 'structure', 'profitability', 'comments'].includes(activeTab) && (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-400">
          <p className="text-sm">Coming in Module {TABS.find(t => t.id === activeTab)?.module}.</p>
        </div>
      )}

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

      {/* Edit Overview Modal */}
      {editOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-start justify-center z-50 overflow-y-auto py-8">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6 m-4">
            <h2 className="text-lg font-semibold text-slate-800 mb-4">Edit Client</h2>
            <form onSubmit={handleEditSave} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Company Name <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  required
                  value={editForm.company_name}
                  onChange={e => setEditForm(f => ({ ...f, company_name: e.target.value }))}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Contact Name</label>
                <input
                  type="text"
                  value={editForm.contact_name}
                  onChange={e => setEditForm(f => ({ ...f, contact_name: e.target.value }))}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={editForm.contact_email}
                    onChange={e => setEditForm(f => ({ ...f, contact_email: e.target.value }))}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Phone</label>
                  <input
                    type="tel"
                    value={editForm.contact_phone}
                    onChange={e => setEditForm(f => ({ ...f, contact_phone: e.target.value }))}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Engagement Letter Date</label>
                <input
                  type="date"
                  value={editForm.engagement_letter_date}
                  onChange={e => setEditForm(f => ({ ...f, engagement_letter_date: e.target.value }))}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="border border-slate-200 rounded-lg p-4 bg-slate-50">
                <ProgramTypePicker
                  base={pickerBase}
                  carrier={pickerCarrier}
                  addCaptive={pickerAddCaptive}
                  onChange={(b, c, a) => { setPickerBase(b); setPickerCarrier(c); setPickerAddCaptive(a); }}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
                <textarea
                  value={editForm.notes}
                  onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))}
                  rows={3}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {error && <p className="text-sm text-red-600">{error}</p>}
              <div className="flex gap-3 justify-end pt-2">
                <button type="button" onClick={() => setEditOpen(false)} className="text-sm text-slate-500 hover:text-slate-700">Cancel</button>
                <button
                  type="submit"
                  disabled={editSaving}
                  className="bg-indigo-700 hover:bg-indigo-800 text-white text-sm px-4 py-2 rounded-lg disabled:opacity-50"
                >
                  {editSaving ? 'Saving…' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Coverage Modal */}
      {addCoverageOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-lg font-semibold text-slate-800 mb-4">Add Coverage Line</h2>
            <form onSubmit={handleAddCoverage} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Coverage Type <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  required
                  list="coverage-types"
                  value={coverageForm.coverage_type}
                  onChange={e => setCoverageForm(f => ({ ...f, coverage_type: e.target.value }))}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="e.g. General Liability (GL)"
                />
                <datalist id="coverage-types">
                  {COMMON_COVERAGES.map(c => <option key={c} value={c} />)}
                </datalist>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Policy Limit ($)</label>
                <input
                  type="number"
                  min="0"
                  step="1000"
                  value={coverageForm.policy_limit}
                  onChange={e => setCoverageForm(f => ({ ...f, policy_limit: e.target.value }))}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="1000000"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
                <input
                  type="text"
                  value={coverageForm.notes}
                  onChange={e => setCoverageForm(f => ({ ...f, notes: e.target.value }))}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              {coverageError && <p className="text-sm text-red-600">{coverageError}</p>}
              <div className="flex gap-3 justify-end pt-2">
                <button type="button" onClick={() => setAddCoverageOpen(false)} className="text-sm text-slate-500 hover:text-slate-700">Cancel</button>
                <button
                  type="submit"
                  disabled={coverageSaving}
                  className="bg-indigo-700 hover:bg-indigo-800 text-white text-sm px-4 py-2 rounded-lg disabled:opacity-50"
                >
                  {coverageSaving ? 'Adding…' : 'Add Coverage'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add/Edit History Modal */}
      {historyOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6">
            <h2 className="text-lg font-semibold text-slate-800 mb-4">
              {editingHistory ? `Edit ${editingHistory.year} Data` : 'Add Year'}
            </h2>
            <form onSubmit={handleSaveHistory} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Year <span className="text-red-500">*</span></label>
                <input
                  type="number"
                  required
                  min="2000"
                  max="2099"
                  value={historyForm.year}
                  onChange={e => setHistoryForm(f => ({ ...f, year: e.target.value }))}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Total Premium ($) <span className="text-red-500">*</span></label>
                <input
                  type="number"
                  required
                  min="0"
                  step="0.01"
                  value={historyForm.premium}
                  onChange={e => setHistoryForm(f => ({ ...f, premium: e.target.value }))}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="500000"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Total Losses ($) <span className="text-red-500">*</span></label>
                <input
                  type="number"
                  required
                  min="0"
                  step="0.01"
                  value={historyForm.losses}
                  onChange={e => setHistoryForm(f => ({ ...f, losses: e.target.value }))}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="180000"
                />
              </div>
              {historyError && <p className="text-sm text-red-600">{historyError}</p>}
              <div className="flex gap-3 justify-end pt-2">
                <button type="button" onClick={() => setHistoryOpen(false)} className="text-sm text-slate-500 hover:text-slate-700">Cancel</button>
                <button
                  type="submit"
                  disabled={historySaving}
                  className="bg-indigo-700 hover:bg-indigo-800 text-white text-sm px-4 py-2 rounded-lg disabled:opacity-50"
                >
                  {historySaving ? 'Saving…' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
