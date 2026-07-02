'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import type { Prospect, ProspectStatus } from '@/types/database';

const STATUS_LABELS: Record<ProspectStatus, string> = {
  active: 'Active',
  inactive: 'Inactive',
  converted: 'Converted',
};

const STATUS_CLASSES: Record<ProspectStatus, string> = {
  active: 'bg-green-100 text-green-700',
  inactive: 'bg-slate-100 text-slate-600',
  converted: 'bg-indigo-100 text-indigo-700',
};

interface ProspectsClientProps {
  prospects: Prospect[];
}

export default function ProspectsClient({ prospects: initialProspects }: ProspectsClientProps) {
  const router = useRouter();
  const [prospects, setProspects] = useState(initialProspects);
  const [statusFilter, setStatusFilter] = useState<ProspectStatus | 'all'>('all');
  const [search, setSearch] = useState('');
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState({ company_name: '', contact_name: '', contact_email: '', contact_phone: '', notes: '' });
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const filtered = useMemo(() => {
    return prospects.filter(p => {
      if (statusFilter !== 'all' && p.status !== statusFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        return p.company_name.toLowerCase().includes(q) || (p.contact_name ?? '').toLowerCase().includes(q);
      }
      return true;
    });
  }, [prospects, statusFilter, search]);

  const counts = useMemo(() => ({
    all: prospects.length,
    active: prospects.filter(p => p.status === 'active').length,
    inactive: prospects.filter(p => p.status === 'inactive').length,
    converted: prospects.filter(p => p.status === 'converted').length,
  }), [prospects]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setFormError('');

    const res = await fetch('/api/prospects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });

    const data = await res.json();
    if (!res.ok) {
      setFormError(data.error ?? 'Failed to add prospect.');
      setSaving(false);
      return;
    }

    setProspects(prev => [data, ...prev]);
    setForm({ company_name: '', contact_name: '', contact_email: '', contact_phone: '', notes: '' });
    setAddOpen(false);
    setSaving(false);
  }

  const filterTabClass = (tab: ProspectStatus | 'all') =>
    `px-3 py-1.5 text-sm rounded-md transition-colors ${
      statusFilter === tab
        ? 'bg-indigo-700 text-white'
        : 'text-slate-600 hover:bg-slate-100'
    }`;

  return (
    <>
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {/* Toolbar */}
        <div className="px-6 py-4 border-b border-slate-100 flex flex-wrap items-center gap-3 justify-between">
          <div className="flex items-center gap-1">
            {(['all', 'active', 'inactive', 'converted'] as const).map(tab => (
              <button key={tab} onClick={() => setStatusFilter(tab)} className={filterTabClass(tab)}>
                {tab === 'all' ? 'All' : STATUS_LABELS[tab]}
                <span className="ml-1.5 text-xs opacity-70">({counts[tab]})</span>
              </button>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <input
              type="text"
              placeholder="Search by name…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 w-48"
            />
            <button
              onClick={() => setAddOpen(true)}
              className="bg-indigo-700 hover:bg-indigo-800 text-white text-sm px-4 py-2 rounded-lg transition-colors"
            >
              Add Prospect
            </button>
          </div>
        </div>

        {/* Table */}
        {filtered.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            {search || statusFilter !== 'all' ? 'No prospects match your filters.' : 'No prospects yet. Add one to get started.'}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide">
              <tr>
                <th className="px-6 py-3 text-left">Company</th>
                <th className="px-6 py-3 text-left">Contact</th>
                <th className="px-6 py-3 text-left">Email</th>
                <th className="px-6 py-3 text-left">Status</th>
                <th className="px-6 py-3 text-left">Added</th>
                <th className="px-6 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map(prospect => (
                <tr
                  key={prospect.id}
                  className="hover:bg-slate-50 cursor-pointer"
                  onClick={() => router.push(`/prospects/${prospect.id}`)}
                >
                  <td className="px-6 py-4 font-medium text-slate-800">{prospect.company_name}</td>
                  <td className="px-6 py-4 text-slate-600">{prospect.contact_name ?? '—'}</td>
                  <td className="px-6 py-4 text-slate-600">{prospect.contact_email ?? '—'}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${STATUS_CLASSES[prospect.status]}`}>
                      {STATUS_LABELS[prospect.status]}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-slate-500">{new Date(prospect.created_at).toLocaleDateString()}</td>
                  <td className="px-6 py-4 text-slate-400 text-right">→</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Add Prospect Modal */}
      {addOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-lg font-semibold text-slate-800 mb-4">Add Prospect</h2>
            <form onSubmit={handleAdd} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Company Name <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  required
                  value={form.company_name}
                  onChange={e => setForm(f => ({ ...f, company_name: e.target.value }))}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Acme Corp"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Contact Name</label>
                <input
                  type="text"
                  value={form.contact_name}
                  onChange={e => setForm(f => ({ ...f, contact_name: e.target.value }))}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Jane Smith"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={form.contact_email}
                    onChange={e => setForm(f => ({ ...f, contact_email: e.target.value }))}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="jane@acme.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Phone</label>
                  <input
                    type="tel"
                    value={form.contact_phone}
                    onChange={e => setForm(f => ({ ...f, contact_phone: e.target.value }))}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="555-000-0000"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
                <textarea
                  value={form.notes}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  rows={3}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Initial notes about this prospect…"
                />
              </div>
              {formError && <p className="text-sm text-red-600">{formError}</p>}
              <div className="flex gap-3 justify-end pt-2">
                <button type="button" onClick={() => setAddOpen(false)} className="text-sm text-slate-500 hover:text-slate-700">
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="bg-indigo-700 hover:bg-indigo-800 text-white text-sm px-4 py-2 rounded-lg disabled:opacity-50"
                >
                  {saving ? 'Adding…' : 'Add Prospect'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
