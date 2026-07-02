'use client';

import { useState } from 'react';
import Link from 'next/link';
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

interface Props {
  prospect: Prospect;
}

export default function ProspectDetailClient({ prospect: initial }: Props) {
  const router = useRouter();
  const [prospect, setProspect] = useState(initial);
  const [editOpen, setEditOpen] = useState(false);
  const [convertOpen, setConvertOpen] = useState(false);
  const [form, setForm] = useState({
    company_name: initial.company_name,
    contact_name: initial.contact_name ?? '',
    contact_email: initial.contact_email ?? '',
    contact_phone: initial.contact_phone ?? '',
    notes: initial.notes ?? '',
  });
  const [saving, setSaving] = useState(false);
  const [converting, setConverting] = useState(false);
  const [error, setError] = useState('');

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    const res = await fetch(`/api/prospects/${prospect.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        company_name: form.company_name,
        contact_name: form.contact_name || null,
        contact_email: form.contact_email || null,
        contact_phone: form.contact_phone || null,
        notes: form.notes || null,
      }),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error); setSaving(false); return; }
    setProspect(data);
    setEditOpen(false);
    setSaving(false);
  }

  async function handleStatusChange(newStatus: 'active' | 'inactive') {
    const res = await fetch(`/api/prospects/${prospect.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    });
    if (res.ok) {
      const data = await res.json();
      setProspect(data);
    }
  }

  async function handleConvert() {
    setConverting(true);
    setError('');
    const res = await fetch(`/api/prospects/${prospect.id}/convert`, { method: 'POST' });
    const data = await res.json();
    if (!res.ok) { setError(data.error); setConverting(false); return; }
    setProspect(prev => ({ ...prev, status: 'converted', converted_to_client_id: data.clientId }));
    setConvertOpen(false);
    setConverting(false);
  }

  return (
    <>
      {/* Header */}
      <div className="mb-6">
        <Link href="/prospects" className="text-sm text-indigo-600 hover:underline">← Back to Prospects</Link>
        <div className="flex items-center gap-3 mt-2">
          <h1 className="text-2xl font-bold text-slate-800">{prospect.company_name}</h1>
          <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_CLASSES[prospect.status]}`}>
            {STATUS_LABELS[prospect.status]}
          </span>
        </div>
      </div>

      {/* Info Card */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 mb-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">Details</h2>
          {prospect.status !== 'converted' && (
            <button
              onClick={() => { setForm({ company_name: prospect.company_name, contact_name: prospect.contact_name ?? '', contact_email: prospect.contact_email ?? '', contact_phone: prospect.contact_phone ?? '', notes: prospect.notes ?? '' }); setEditOpen(true); }}
              className="text-sm text-indigo-600 hover:underline"
            >
              Edit
            </button>
          )}
        </div>
        <dl className="grid grid-cols-2 gap-x-8 gap-y-4 text-sm">
          <div>
            <dt className="text-slate-500 mb-0.5">Company Name</dt>
            <dd className="text-slate-800 font-medium">{prospect.company_name}</dd>
          </div>
          <div>
            <dt className="text-slate-500 mb-0.5">Contact Name</dt>
            <dd className="text-slate-800">{prospect.contact_name ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-slate-500 mb-0.5">Email</dt>
            <dd className="text-slate-800">{prospect.contact_email ? <a href={`mailto:${prospect.contact_email}`} className="text-indigo-600 hover:underline">{prospect.contact_email}</a> : '—'}</dd>
          </div>
          <div>
            <dt className="text-slate-500 mb-0.5">Phone</dt>
            <dd className="text-slate-800">{prospect.contact_phone ?? '—'}</dd>
          </div>
          <div className="col-span-2">
            <dt className="text-slate-500 mb-0.5">Notes</dt>
            <dd className="text-slate-800 whitespace-pre-wrap">{prospect.notes ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-slate-500 mb-0.5">Added</dt>
            <dd className="text-slate-800">{new Date(prospect.created_at).toLocaleDateString()}</dd>
          </div>
          <div>
            <dt className="text-slate-500 mb-0.5">Last Updated</dt>
            <dd className="text-slate-800">{new Date(prospect.updated_at).toLocaleDateString()}</dd>
          </div>
        </dl>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3">
        {prospect.status === 'active' && (
          <>
            <button
              onClick={() => handleStatusChange('inactive')}
              className="text-sm border border-slate-300 hover:bg-slate-50 text-slate-700 px-4 py-2 rounded-lg transition-colors"
            >
              Mark as Inactive
            </button>
            <button
              onClick={() => setConvertOpen(true)}
              className="text-sm bg-indigo-700 hover:bg-indigo-800 text-white px-4 py-2 rounded-lg transition-colors"
            >
              Convert to Client →
            </button>
          </>
        )}
        {prospect.status === 'inactive' && (
          <button
            onClick={() => handleStatusChange('active')}
            className="text-sm border border-slate-300 hover:bg-slate-50 text-slate-700 px-4 py-2 rounded-lg transition-colors"
          >
            Mark as Active
          </button>
        )}
        {prospect.status === 'converted' && prospect.converted_to_client_id && (
          <Link
            href={`/clients/${prospect.converted_to_client_id}`}
            className="text-sm bg-indigo-700 hover:bg-indigo-800 text-white px-4 py-2 rounded-lg transition-colors"
          >
            View Client Record →
          </Link>
        )}
      </div>

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      {/* Edit Modal */}
      {editOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-lg font-semibold text-slate-800 mb-4">Edit Prospect</h2>
            <form onSubmit={handleEdit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Company Name <span className="text-red-500">*</span></label>
                <input type="text" required value={form.company_name} onChange={e => setForm(f => ({ ...f, company_name: e.target.value }))} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Contact Name</label>
                <input type="text" value={form.contact_name} onChange={e => setForm(f => ({ ...f, contact_name: e.target.value }))} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                  <input type="email" value={form.contact_email} onChange={e => setForm(f => ({ ...f, contact_email: e.target.value }))} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Phone</label>
                  <input type="tel" value={form.contact_phone} onChange={e => setForm(f => ({ ...f, contact_phone: e.target.value }))} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
                <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={3} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              {error && <p className="text-sm text-red-600">{error}</p>}
              <div className="flex gap-3 justify-end pt-2">
                <button type="button" onClick={() => setEditOpen(false)} className="text-sm text-slate-500 hover:text-slate-700">Cancel</button>
                <button type="submit" disabled={saving} className="bg-indigo-700 hover:bg-indigo-800 text-white text-sm px-4 py-2 rounded-lg disabled:opacity-50">
                  {saving ? 'Saving…' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Convert to Client Modal */}
      {convertOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6">
            <h2 className="text-lg font-semibold text-slate-800 mb-2">Convert to Client</h2>
            <p className="text-sm text-slate-600 mb-6">
              Convert <strong>{prospect.company_name}</strong> to a client? A client record will be created and this prospect will be marked as Converted. This cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setConvertOpen(false)} className="text-sm text-slate-500 hover:text-slate-700">Cancel</button>
              <button
                onClick={handleConvert}
                disabled={converting}
                className="bg-indigo-700 hover:bg-indigo-800 text-white text-sm px-4 py-2 rounded-lg disabled:opacity-50"
              >
                {converting ? 'Converting…' : 'Convert to Client'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
