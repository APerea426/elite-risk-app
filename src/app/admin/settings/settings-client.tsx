'use client';

import { useState } from 'react';

interface Props {
  currentRate: number;
}

export default function SettingsClient({ currentRate }: Props) {
  const [rateInput, setRateInput] = useState(String(Math.round(currentRate * 100)));
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSaved(false);

    const rate = Number(rateInput) / 100;
    if (isNaN(rate) || rate <= 0 || rate > 1) {
      setError('Enter a percentage between 1 and 100.');
      setSaving(false);
      return;
    }

    const res = await fetch('/api/admin/settings/commission', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rate }),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error); setSaving(false); return; }

    setSaved(true);
    setSaving(false);
    setTimeout(() => setSaved(false), 3000);
  }

  return (
    <div className="max-w-md">
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-4">Commission Rate</h2>
        <p className="text-sm text-slate-600 mb-4">
          The global default commission rate applied to all clients unless overridden.
        </p>
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Base Commission Rate
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="1"
                max="100"
                step="0.1"
                required
                value={rateInput}
                onChange={e => setRateInput(e.target.value)}
                className="w-28 border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <span className="text-slate-500 text-sm">%</span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Currently: {Math.round(currentRate * 100)}% — affects all new commissions
            </p>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          {saved && <p className="text-sm text-green-600">Rate updated successfully.</p>}
          <button
            type="submit"
            disabled={saving}
            className="bg-indigo-700 hover:bg-indigo-800 text-white text-sm px-4 py-2 rounded-lg disabled:opacity-50 transition-colors"
          >
            {saving ? 'Saving…' : 'Save Rate'}
          </button>
        </form>
      </div>
    </div>
  );
}
