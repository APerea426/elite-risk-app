'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import type { Client, ProgramType } from '@/types/database';
import ProgramTypePicker, {
  computeProgramType,
  parseProgramType,
  type BaseType,
  type PickerCarrier,
} from './program-type-picker';

const PROGRAM_TYPE_LABELS: Record<ProgramType, string> = {
  captive_only: 'Captive Only',
  ottawa_victoria_captive: 'OV + Captive',
  ottawa_victoria_only: 'OV Only',
  fronted: 'Fronted',
  fronted_captive: 'Fronted + Captive',
};

const PROGRAM_TYPE_COLORS: Record<ProgramType, string> = {
  captive_only: 'bg-blue-100 text-blue-700',
  ottawa_victoria_captive: 'bg-purple-100 text-purple-700',
  ottawa_victoria_only: 'bg-purple-100 text-purple-700',
  fronted: 'bg-amber-100 text-amber-700',
  fronted_captive: 'bg-amber-100 text-amber-700',
};

type FilterType = 'all' | 'captive' | 'ov' | 'fronted';

const FILTER_TABS: { id: FilterType; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'captive', label: 'Captive Only' },
  { id: 'ov', label: 'Ottawa / Victoria' },
  { id: 'fronted', label: 'Fronted' },
];

const blankForm = {
  company_name: '',
  contact_name: '',
  contact_email: '',
  contact_phone: '',
  engagement_letter_date: '',
  notes: '',
};

interface Props {
  clients: Client[];
}

export default function ClientsClient({ clients: initialClients }: Props) {
  const router = useRouter();
  const [clients, setClients] = useState(initialClients);
  const [typeFilter, setTypeFilter] = useState<FilterType>('all');
  const [search, setSearch] = useState('');
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState(blankForm);
  const [pickerBase, setPickerBase] = useState<BaseType>('captive');
  const [pickerCarrier, setPickerCarrier] = useState<PickerCarrier>('ottawa');
  const [pickerAddCaptive, setPickerAddCaptive] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const filtered = useMemo(() => {
    return clients
      .filter(c => {
        if (typeFilter === 'captive') return c.program_type === 'captive_only';
        if (typeFilter === 'ov') return c.program_type.startsWith('ottawa');
        if (typeFilter === 'fronted') return c.program_type.startsWith('fronted');
        return true;
      })
      .filter(c => {
        if (!search) return true;
        const q = search.toLowerCase();
        return c.company_name.toLowerCase().includes(q) || (c.contact_name ?? '').toLowerCase().includes(q);
      });
  }, [clients, typeFilter, search]);

  const counts = useMemo(() => ({
    all: clients.length,
    captive: clients.filter(c => c.program_type === 'captive_only').length,
    ov: clients.filter(c => c.program_type.startsWith('ottawa')).length,
    fronted: clients.filter(c => c.program_type.startsWith('fronted')).length,
  }), [clients]);

  function handlePickerChange(base: BaseType, carrier: PickerCarrier, addCaptive: boolean) {
    setPickerBase(base);
    setPickerCarrier(carrier);
    setPickerAddCaptive(addCaptive);
  }

  function resetAddForm() {
    setForm(blankForm);
    setPickerBase('captive');
    setPickerCarrier('ottawa');
    setPickerAddCaptive(false);
    setFormError('');
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setFormError('');

    const { program_type, carrier } = computeProgramType(pickerBase, pickerCarrier, pickerAddCaptive);

    const res = await fetch('/api/clients', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, program_type, carrier }),
    });

    const data = await res.json();
    if (!res.ok) {
      setFormError(data.error ?? 'Failed to add client.');
      setSaving(false);
      return;
    }

    setClients(prev => [data, ...prev]);
    resetAddForm();
    setAddOpen(false);
    setSaving(false);
  }

  const filterTabClass = (id: FilterType) =>
    `px-3 py-1.5 text-sm rounded-md transition-colors ${
      typeFilter === id ? 'bg-indigo-700 text-white' : 'text-slate-600 hover:bg-slate-100'
    }`;

  return (
    <>
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {/* Toolbar */}
        <div className="px-6 py-4 border-b border-slate-100 flex flex-wrap items-center gap-3 justify-between">
          <div className="flex items-center gap-1">
            {FILTER_TABS.map(tab => (
              <button key={tab.id} onClick={() => setTypeFilter(tab.id)} className={filterTabClass(tab.id)}>
                {tab.label}
                <span className="ml-1.5 text-xs opacity-70">({counts[tab.id]})</span>
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
              onClick={() => { resetAddForm(); setAddOpen(true); }}
              className="bg-indigo-700 hover:bg-indigo-800 text-white text-sm px-4 py-2 rounded-lg transition-colors"
            >
              Add Client
            </button>
          </div>
        </div>

        {/* Table */}
        {filtered.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            {search || typeFilter !== 'all' ? 'No clients match your filters.' : 'No clients yet. Add one to get started.'}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide">
              <tr>
                <th className="px-6 py-3 text-left">Company</th>
                <th className="px-6 py-3 text-left">Contact</th>
                <th className="px-6 py-3 text-left">Program Type</th>
                <th className="px-6 py-3 text-left">Carrier</th>
                <th className="px-6 py-3 text-left">Added</th>
                <th className="px-6 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map(client => (
                <tr
                  key={client.id}
                  className="hover:bg-slate-50 cursor-pointer"
                  onClick={() => router.push(`/clients/${client.id}`)}
                >
                  <td className="px-6 py-4 font-medium text-slate-800">{client.company_name}</td>
                  <td className="px-6 py-4 text-slate-600">{client.contact_name ?? '—'}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${PROGRAM_TYPE_COLORS[client.program_type]}`}>
                      {PROGRAM_TYPE_LABELS[client.program_type]}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-slate-600 capitalize">{client.carrier === 'none' ? '—' : client.carrier}</td>
                  <td className="px-6 py-4 text-slate-500">{new Date(client.created_at).toLocaleDateString()}</td>
                  <td className="px-6 py-4 text-slate-400 text-right">→</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Add Client Modal */}
      {addOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-start justify-center z-50 overflow-y-auto py-8">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6 m-4">
            <h2 className="text-lg font-semibold text-slate-800 mb-4">Add Client</h2>
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
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Phone</label>
                  <input
                    type="tel"
                    value={form.contact_phone}
                    onChange={e => setForm(f => ({ ...f, contact_phone: e.target.value }))}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Engagement Letter Date</label>
                <input
                  type="date"
                  value={form.engagement_letter_date}
                  onChange={e => setForm(f => ({ ...f, engagement_letter_date: e.target.value }))}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="border border-slate-200 rounded-lg p-4 bg-slate-50">
                <ProgramTypePicker
                  base={pickerBase}
                  carrier={pickerCarrier}
                  addCaptive={pickerAddCaptive}
                  onChange={handlePickerChange}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
                <textarea
                  value={form.notes}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  rows={2}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {formError && <p className="text-sm text-red-600">{formError}</p>}
              <div className="flex gap-3 justify-end pt-2">
                <button type="button" onClick={() => setAddOpen(false)} className="text-sm text-slate-500 hover:text-slate-700">Cancel</button>
                <button
                  type="submit"
                  disabled={saving}
                  className="bg-indigo-700 hover:bg-indigo-800 text-white text-sm px-4 py-2 rounded-lg disabled:opacity-50"
                >
                  {saving ? 'Adding…' : 'Add Client'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
