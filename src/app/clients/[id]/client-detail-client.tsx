'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { Client, Coverage, PremiumLossHistory, ProgramType, Commission, Invoice, ProgramStructure, ProfitabilityProjection } from '@/types/database';
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
  commissions: Commission[];
  invoices: Invoice[];
  effectiveRate: number;
  programStructure: ProgramStructure | null;
  latestProjection: ProfitabilityProjection | null;
}

const fmt2 = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(n);

function EngagementTab({ clientId, client }: { clientId: string; client: Client }) {
  const carrierDefault =
    client.carrier === 'victoria' ? 'Victoria Corporate Ltd' :
    client.carrier === 'ottawa' ? 'Ottawa Insurance Ltd' : '';

  const [letterType, setLetterType] = useState<'cell' | 'standalone'>('cell');
  const [form, setForm] = useState({
    date: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
    client_name: client.contact_name ?? '',
    company_name: client.company_name,
    carrier_name: carrierDefault,
    policy_description: '',
    management_fee: '45000',
    set_engagement_date: true,
  });

  function switchLetterType(type: 'cell' | 'standalone') {
    setLetterType(type);
    setForm(f => ({ ...f, management_fee: type === 'cell' ? '45000' : '55000' }));
  }
  const [downloading, setDownloading] = useState(false);
  const [engError, setEngError] = useState('');
  const [success, setSuccess] = useState(false);

  async function handleDownload(e: React.FormEvent) {
    e.preventDefault();
    setDownloading(true);
    setEngError('');
    setSuccess(false);
    const res = await fetch(`/api/clients/${clientId}/engagement-letter`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ letter_type: letterType, ...form, management_fee: Number(form.management_fee) }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({ error: 'Unknown error' }));
      setEngError(data.error);
      setDownloading(false);
      return;
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `engagement-letter-${client.company_name.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.docx`;
    a.click();
    URL.revokeObjectURL(url);
    setSuccess(true);
    setDownloading(false);
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6">
      <div className="mb-6">
        <h2 className="text-sm font-semibold text-slate-700">Generate Engagement Letter</h2>
        <p className="text-xs text-slate-400 mt-0.5">Downloads a filled Word document (.docx) ready to send</p>
      </div>

      <form onSubmit={handleDownload} className="space-y-5">
        {/* Letter type */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Letter Type <span className="text-red-500">*</span></label>
          <div className="flex gap-2">
            {([
              { value: 'cell', label: 'Cell Captive', sub: '$25k formation · $50k capitalization · $45k/yr mgmt' },
              { value: 'standalone', label: 'Stand-Alone Captive', sub: '$60k formation · $250k capitalization · $55k/yr mgmt' },
            ] as const).map(opt => (
              <button
                key={opt.value}
                type="button"
                onClick={() => switchLetterType(opt.value)}
                className={`flex-1 text-left px-4 py-3 rounded-lg border transition-colors ${
                  letterType === opt.value
                    ? 'bg-indigo-50 border-indigo-600 text-indigo-800'
                    : 'border-slate-300 text-slate-600 hover:border-indigo-300'
                }`}
              >
                <div className="text-sm font-medium">{opt.label}</div>
                <div className="text-xs text-slate-400 mt-0.5">{opt.sub}</div>
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Letter Date <span className="text-red-500">*</span></label>
            <input
              type="text"
              required
              value={form.date}
              onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="July 2, 2026"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Client Name <span className="text-xs text-slate-400">(salutation)</span></label>
            <input
              type="text"
              value={form.client_name}
              onChange={e => setForm(f => ({ ...f, client_name: e.target.value }))}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Name that appears after 'Dear'"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Company Name <span className="text-red-500">*</span></label>
            <input
              type="text"
              required
              value={form.company_name}
              onChange={e => setForm(f => ({ ...f, company_name: e.target.value }))}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Carrier Name</label>
            <input
              type="text"
              value={form.carrier_name}
              onChange={e => setForm(f => ({ ...f, carrier_name: e.target.value }))}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Victoria Corporate Ltd"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Management Fee ($)</label>
            <input
              type="number"
              min="0"
              step="1000"
              value={form.management_fee}
              onChange={e => setForm(f => ({ ...f, management_fee: e.target.value }))}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <p className="text-xs text-slate-400 mt-1">Applies to both Year 1 and ongoing management fee lines</p>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Captive Policy Description</label>
          <textarea
            value={form.policy_description}
            onChange={e => setForm(f => ({ ...f, policy_description: e.target.value }))}
            rows={3}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="Describe the captive policy coverage…"
          />
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="set-eng-date"
            checked={form.set_engagement_date}
            onChange={e => setForm(f => ({ ...f, set_engagement_date: e.target.checked }))}
            className="rounded border-slate-300 text-indigo-600"
          />
          <label htmlFor="set-eng-date" className="text-sm text-slate-600">
            Set today as the Engagement Letter Date on this client record
          </label>
        </div>

        {engError && <p className="text-sm text-red-600">{engError}</p>}
        {success && (
          <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3 text-sm text-green-700">
            Letter downloaded successfully.
          </div>
        )}

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={downloading}
            className="bg-indigo-700 hover:bg-indigo-800 text-white text-sm px-5 py-2 rounded-lg disabled:opacity-50"
          >
            {downloading ? 'Preparing…' : 'Download Letter (.docx)'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default function ClientDetailClient({ client: initialClient, coverages: initialCoverages, history: initialHistory, commissions: initialCommissions, invoices: initialInvoices, effectiveRate, programStructure: initialProgramStructure, latestProjection: initialLatestProjection }: Props) {
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [client, setClient] = useState(initialClient);
  const [coverages, setCoverages] = useState(initialCoverages);
  const [history, setHistory] = useState(initialHistory);
  const [commissions, setCommissions] = useState(initialCommissions);
  const [invoices, setInvoices] = useState(initialInvoices);
  const [error, setError] = useState('');

  // Commission form state
  const [commOpen, setCommOpen] = useState(false);
  const [commForm, setCommForm] = useState({
    policy_period: '',
    premium_amount: '',
    base_commission_rate: String(Math.round(effectiveRate * 100)),
    mga_fee: '0',
    due_date: '',
    notes: '',
  });
  const [commSaving, setCommSaving] = useState(false);
  const [commError, setCommError] = useState('');
  const [lastInvoiceNum, setLastInvoiceNum] = useState<number | null>(null);

  // Invoice state
  const [markingPaidId, setMarkingPaidId] = useState<string | null>(null);

  // Invoice tracking modal state
  const [trackingInv, setTrackingInv] = useState<Invoice | null>(null);
  const [trackingForm, setTrackingForm] = useState({ date_sent: '', base_commission_received: '', mga_fee_received: '', date_received: '' });
  const [trackingSaving, setTrackingSaving] = useState(false);
  const [trackingError, setTrackingError] = useState('');

  function openTracking(inv: Invoice) {
    setTrackingForm({
      date_sent: inv.date_sent ?? '',
      base_commission_received: inv.base_commission_received != null ? String(inv.base_commission_received) : '',
      mga_fee_received: inv.mga_fee_received != null ? String(inv.mga_fee_received) : '',
      date_received: inv.date_received ?? '',
    });
    setTrackingError('');
    setTrackingInv(inv);
  }

  async function handleSaveTracking(e: React.FormEvent) {
    e.preventDefault();
    if (!trackingInv) return;
    setTrackingSaving(true);
    setTrackingError('');
    const res = await fetch(`/api/invoices/${trackingInv.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        date_sent: trackingForm.date_sent || null,
        base_commission_received: trackingForm.base_commission_received !== '' ? Number(trackingForm.base_commission_received) : null,
        mga_fee_received: trackingForm.mga_fee_received !== '' ? Number(trackingForm.mga_fee_received) : null,
        date_received: trackingForm.date_received || null,
      }),
    });
    const data = await res.json();
    if (!res.ok) { setTrackingError(data.error); setTrackingSaving(false); return; }
    setInvoices(prev => prev.map(i => i.id === data.id ? data : i));
    setTrackingInv(null);
    setTrackingSaving(false);
  }

  // Program structure state
  const [programStructure, setProgramStructure] = useState<ProgramStructure | null>(initialProgramStructure);
  const [structureMode, setStructureMode] = useState<'view' | 'edit'>(initialProgramStructure ? 'view' : 'edit');
  const [structureForm, setStructureForm] = useState({
    carrier: (initialProgramStructure?.carrier ?? 'victoria') as 'victoria' | 'ottawa',
    captive_retention: initialProgramStructure ? String(initialProgramStructure.captive_retention) : '',
    excess_layer: initialProgramStructure ? String(initialProgramStructure.excess_layer) : '',
    captive_premium_pct: initialProgramStructure ? String(Math.round(initialProgramStructure.captive_premium_pct * 100)) : '40',
    new_annual_premium: initialProgramStructure ? String(initialProgramStructure.new_annual_premium) : '',
    annual_expenses: initialProgramStructure ? String(initialProgramStructure.annual_expenses) : '',
    notes: initialProgramStructure?.notes ?? '',
  });
  const [structureSaving, setStructureSaving] = useState(false);
  const [structureError, setStructureError] = useState('');

  // Profitability state
  const [latestProjection, setLatestProjection] = useState<ProfitabilityProjection | null>(initialLatestProjection);
  const [projecting, setProjecting] = useState(false);
  const [projectionError, setProjectionError] = useState('');
  const [pdfLoading, setPdfLoading] = useState(false);

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

  function openNewComm() {
    const due = new Date();
    due.setDate(due.getDate() + 30);
    setCommForm({
      policy_period: '',
      premium_amount: '',
      base_commission_rate: String(Math.round(effectiveRate * 100)),
      mga_fee: '0',
      due_date: due.toISOString().split('T')[0],
      notes: '',
    });
    setCommError('');
    setLastInvoiceNum(null);
    setCommOpen(true);
  }

  async function handleGenerateInvoice(e: React.FormEvent) {
    e.preventDefault();
    setCommSaving(true);
    setCommError('');
    const res = await fetch(`/api/clients/${client.id}/commissions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        premium_amount: Number(commForm.premium_amount),
        base_commission_rate: Number(commForm.base_commission_rate) / 100,
        mga_fee: Number(commForm.mga_fee) || 0,
        policy_period: commForm.policy_period || null,
        due_date: commForm.due_date || null,
        notes: commForm.notes || null,
      }),
    });
    const data = await res.json();
    if (!res.ok) { setCommError(data.error); setCommSaving(false); return; }
    setCommissions(prev => [data.commission, ...prev]);
    setInvoices(prev => [data.invoice, ...prev]);
    setLastInvoiceNum(data.invoice.invoice_number);
    setCommOpen(false);
    setCommSaving(false);
  }

  async function handleMarkPaid(invoiceId: string) {
    setMarkingPaidId(invoiceId);
    const res = await fetch(`/api/invoices/${invoiceId}/paid`, { method: 'PATCH' });
    const data = await res.json();
    if (res.ok) {
      setInvoices(prev => prev.map(inv => inv.id === invoiceId ? data : inv));
    }
    setMarkingPaidId(null);
  }

  function openEditStructure() {
    if (programStructure) {
      setStructureForm({
        carrier: programStructure.carrier,
        captive_retention: String(programStructure.captive_retention),
        excess_layer: String(programStructure.excess_layer),
        captive_premium_pct: String(Math.round(programStructure.captive_premium_pct * 100)),
        new_annual_premium: String(programStructure.new_annual_premium),
        annual_expenses: String(programStructure.annual_expenses),
        notes: programStructure.notes ?? '',
      });
    }
    setStructureError('');
    setStructureMode('edit');
  }

  async function handleSaveStructure(e: React.FormEvent) {
    e.preventDefault();
    setStructureSaving(true);
    setStructureError('');
    const res = await fetch(`/api/clients/${client.id}/program-structure`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        carrier: structureForm.carrier,
        captive_retention: Number(structureForm.captive_retention),
        excess_layer: Number(structureForm.excess_layer),
        captive_premium_pct: Number(structureForm.captive_premium_pct) / 100,
        new_annual_premium: Number(structureForm.new_annual_premium),
        annual_expenses: Number(structureForm.annual_expenses),
        notes: structureForm.notes || null,
      }),
    });
    const data = await res.json();
    if (!res.ok) { setStructureError(data.error); setStructureSaving(false); return; }
    setProgramStructure(data);
    setStructureMode('view');
    setStructureSaving(false);
  }

  async function handleGenerateProjection() {
    if (!programStructure) return;
    setProjecting(true);
    setProjectionError('');
    const res = await fetch(`/api/clients/${client.id}/projections`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ program_structure_id: programStructure.id }),
    });
    const data = await res.json();
    if (!res.ok) { setProjectionError(data.error); setProjecting(false); return; }
    setLatestProjection(data);
    setProjecting(false);
  }

  async function handleDownloadPdf() {
    if (!latestProjection) return;
    setPdfLoading(true);
    const res = await fetch(`/api/clients/${client.id}/projections/${latestProjection.id}/pdf`);
    if (!res.ok) { setPdfLoading(false); return; }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `profitability-report-${client.company_name.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
    setPdfLoading(false);
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

      {/* Tab: Commissions */}
      {activeTab === 'commissions' && (
        <div className="space-y-4">
          {lastInvoiceNum && (
            <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3 text-sm text-green-700">
              Invoice #{lastInvoiceNum} generated successfully.
            </div>
          )}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-700">Commission Records</h2>
              <button
                onClick={openNewComm}
                className="bg-indigo-700 hover:bg-indigo-800 text-white text-sm px-3 py-1.5 rounded-lg transition-colors"
              >
                New Commission
              </button>
            </div>
            {commissions.length === 0 ? (
              <div className="p-10 text-center text-slate-400 text-sm">No commissions yet.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide">
                    <tr>
                      <th className="px-4 py-3 text-left whitespace-nowrap">Policy Period</th>
                      <th className="px-4 py-3 text-right whitespace-nowrap">Premium</th>
                      <th className="px-4 py-3 text-right whitespace-nowrap">Rate</th>
                      <th className="px-4 py-3 text-right whitespace-nowrap">Base Comm.</th>
                      <th className="px-4 py-3 text-right whitespace-nowrap">Base Received</th>
                      <th className="px-4 py-3 text-right whitespace-nowrap">MGA Fee</th>
                      <th className="px-4 py-3 text-right whitespace-nowrap">MGA Received</th>
                      <th className="px-4 py-3 text-right whitespace-nowrap">Total</th>
                      <th className="px-4 py-3 text-left whitespace-nowrap">Invoice</th>
                      <th className="px-4 py-3 text-left whitespace-nowrap">Date Sent</th>
                      <th className="px-4 py-3 text-left whitespace-nowrap">Date Received</th>
                      <th className="px-4 py-3"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {commissions.map(comm => {
                      const inv = invoices.find(i => i.commission_id === comm.id);
                      return (
                        <tr key={comm.id}>
                          <td className="px-4 py-3 text-slate-700 whitespace-nowrap">{comm.policy_period ?? '—'}</td>
                          <td className="px-4 py-3 text-right text-slate-700 whitespace-nowrap">{fmt(comm.premium_amount)}</td>
                          <td className="px-4 py-3 text-right text-slate-500">{(comm.base_commission_rate * 100).toFixed(1)}%</td>
                          <td className="px-4 py-3 text-right text-slate-700 whitespace-nowrap">{fmt(comm.base_commission_amount)}</td>
                          <td className="px-4 py-3 text-right whitespace-nowrap">
                            {inv?.base_commission_received != null
                              ? <span className="text-green-700 font-medium">{fmt(inv.base_commission_received)}</span>
                              : <span className="text-slate-300">—</span>}
                          </td>
                          <td className="px-4 py-3 text-right text-slate-700 whitespace-nowrap">{comm.mga_fee > 0 ? fmt(comm.mga_fee) : '—'}</td>
                          <td className="px-4 py-3 text-right whitespace-nowrap">
                            {inv?.mga_fee_received != null
                              ? <span className="text-green-700 font-medium">{fmt(inv.mga_fee_received)}</span>
                              : <span className="text-slate-300">—</span>}
                          </td>
                          <td className="px-4 py-3 text-right font-medium text-slate-800 whitespace-nowrap">{fmt(comm.total_commission)}</td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            {inv ? (
                              <span className={`text-xs font-medium px-2 py-0.5 rounded ${inv.status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                                #{inv.invoice_number} {inv.status === 'paid' ? '✓' : '· Outstanding'}
                              </span>
                            ) : '—'}
                          </td>
                          <td className="px-4 py-3 text-slate-500 whitespace-nowrap text-xs">
                            {inv?.date_sent ? new Date(inv.date_sent + 'T00:00:00').toLocaleDateString() : <span className="text-slate-300">—</span>}
                          </td>
                          <td className="px-4 py-3 text-slate-500 whitespace-nowrap text-xs">
                            {inv?.date_received ? new Date(inv.date_received + 'T00:00:00').toLocaleDateString() : <span className="text-slate-300">—</span>}
                          </td>
                          <td className="px-4 py-3 text-right">
                            {inv && (
                              <button
                                onClick={() => openTracking(inv)}
                                className="text-xs text-indigo-600 hover:underline whitespace-nowrap"
                              >
                                Log
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab: Invoices */}
      {activeTab === 'invoices' && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100">
            <h2 className="text-sm font-semibold text-slate-700">Invoices</h2>
          </div>
          {invoices.length === 0 ? (
            <div className="p-10 text-center text-slate-400 text-sm">No invoices yet. Generate one from the Commissions tab.</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide">
                <tr>
                  <th className="px-6 py-3 text-left">Invoice #</th>
                  <th className="px-6 py-3 text-left">Date Issued</th>
                  <th className="px-6 py-3 text-left">Due Date</th>
                  <th className="px-6 py-3 text-right">Amount Due</th>
                  <th className="px-6 py-3 text-left">Status</th>
                  <th className="px-6 py-3 text-left">Paid</th>
                  <th className="px-6 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {invoices.map(inv => (
                  <tr key={inv.id}>
                    <td className="px-6 py-4 font-medium text-slate-800">#{inv.invoice_number}</td>
                    <td className="px-6 py-4 text-slate-600">{new Date(inv.date_issued).toLocaleDateString()}</td>
                    <td className="px-6 py-4 text-slate-600">{inv.due_date ? new Date(inv.due_date + 'T00:00:00').toLocaleDateString() : '—'}</td>
                    <td className="px-6 py-4 text-right font-medium text-slate-800">{fmt(inv.amount_due)}</td>
                    <td className="px-6 py-4">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded ${inv.status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                        {inv.status === 'paid' ? 'Paid' : 'Outstanding'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-500 text-xs">
                      {inv.paid_at ? new Date(inv.paid_at).toLocaleString() : '—'}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {inv.status === 'outstanding' && (
                        <button
                          onClick={() => handleMarkPaid(inv.id)}
                          disabled={markingPaidId === inv.id}
                          className="text-xs bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded-md disabled:opacity-50"
                        >
                          {markingPaidId === inv.id ? 'Marking…' : 'Mark Paid'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Tab: Program Structure */}
      {activeTab === 'structure' && (
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-sm font-semibold text-slate-700">Program Structure</h2>
              <p className="text-xs text-slate-400 mt-0.5">Defines the captive structure used to generate profitability projections</p>
            </div>
            {structureMode === 'view' && (
              <button onClick={openEditStructure} className="text-sm text-indigo-600 hover:underline">
                Update Structure
              </button>
            )}
          </div>

          {structureMode === 'view' && programStructure ? (
            <dl className="grid grid-cols-3 gap-x-8 gap-y-5 text-sm">
              <div>
                <dt className="text-slate-500 mb-0.5">Carrier</dt>
                <dd className="text-slate-800 font-medium capitalize">{programStructure.carrier}</dd>
              </div>
              <div>
                <dt className="text-slate-500 mb-0.5">Captive Retention (Deductible)</dt>
                <dd className="text-slate-800 font-medium">{fmt(programStructure.captive_retention)}</dd>
              </div>
              <div>
                <dt className="text-slate-500 mb-0.5">Excess Layer</dt>
                <dd className="text-slate-800 font-medium">{fmt(programStructure.excess_layer)}</dd>
              </div>
              <div>
                <dt className="text-slate-500 mb-0.5">Captive Premium Split</dt>
                <dd className="text-slate-800 font-medium">{Math.round(programStructure.captive_premium_pct * 100)}%</dd>
              </div>
              <div>
                <dt className="text-slate-500 mb-0.5">New Annual Premium</dt>
                <dd className="text-slate-800 font-medium">{fmt(programStructure.new_annual_premium)}</dd>
              </div>
              <div>
                <dt className="text-slate-500 mb-0.5">Annual Expenses</dt>
                <dd className="text-slate-800 font-medium">{fmt(programStructure.annual_expenses)}</dd>
              </div>
              {programStructure.notes && (
                <div className="col-span-3">
                  <dt className="text-slate-500 mb-0.5">Notes</dt>
                  <dd className="text-slate-800">{programStructure.notes}</dd>
                </div>
              )}
              <div className="col-span-3 text-xs text-slate-400">
                Last saved {new Date(programStructure.created_at).toLocaleString()}
              </div>
            </dl>
          ) : (
            <form onSubmit={handleSaveStructure} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Carrier <span className="text-red-500">*</span></label>
                <div className="flex gap-2">
                  {(['victoria', 'ottawa'] as const).map(c => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setStructureForm(f => ({ ...f, carrier: c }))}
                      className={`px-5 py-2 rounded-lg border text-sm font-medium transition-colors capitalize ${
                        structureForm.carrier === c
                          ? 'bg-indigo-700 border-indigo-700 text-white'
                          : 'border-slate-300 text-slate-600 hover:border-indigo-400'
                      }`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Captive Retention / Deductible ($) <span className="text-red-500">*</span></label>
                  <input
                    type="number" required min="0" step="1000"
                    placeholder="500000"
                    value={structureForm.captive_retention}
                    onChange={e => setStructureForm(f => ({ ...f, captive_retention: e.target.value }))}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Excess Layer ($) <span className="text-red-500">*</span></label>
                  <input
                    type="number" required min="0" step="1000"
                    placeholder="1000000"
                    value={structureForm.excess_layer}
                    onChange={e => setStructureForm(f => ({ ...f, excess_layer: e.target.value }))}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Captive Premium Split (%) <span className="text-red-500">*</span></label>
                  <div className="flex items-center gap-1">
                    <input
                      type="number" required min="1" max="100" step="1"
                      value={structureForm.captive_premium_pct}
                      onChange={e => setStructureForm(f => ({ ...f, captive_premium_pct: e.target.value }))}
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <span className="text-slate-400 text-sm">%</span>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">New Annual Premium ($) <span className="text-red-500">*</span></label>
                  <input
                    type="number" required min="0" step="1000"
                    placeholder="600000"
                    value={structureForm.new_annual_premium}
                    onChange={e => setStructureForm(f => ({ ...f, new_annual_premium: e.target.value }))}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Annual Expenses ($) <span className="text-red-500">*</span></label>
                  <input
                    type="number" required min="0" step="100"
                    placeholder="25000"
                    value={structureForm.annual_expenses}
                    onChange={e => setStructureForm(f => ({ ...f, annual_expenses: e.target.value }))}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
                <textarea
                  value={structureForm.notes}
                  onChange={e => setStructureForm(f => ({ ...f, notes: e.target.value }))}
                  rows={2}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {structureError && <p className="text-sm text-red-600">{structureError}</p>}
              <div className="flex gap-3 justify-end">
                {programStructure && (
                  <button type="button" onClick={() => setStructureMode('view')} className="text-sm text-slate-500 hover:text-slate-700">Cancel</button>
                )}
                <button
                  type="submit"
                  disabled={structureSaving}
                  className="bg-indigo-700 hover:bg-indigo-800 text-white text-sm px-4 py-2 rounded-lg disabled:opacity-50"
                >
                  {structureSaving ? 'Saving…' : 'Save Structure'}
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* Tab: Profitability */}
      {activeTab === 'profitability' && (
        <div className="space-y-6">
          {history.length === 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-700">
              Add premium &amp; loss history in the History tab before generating a projection.
            </div>
          )}
          {history.length > 0 && !programStructure && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-700">
              Save a program structure in the Program Structure tab before generating a projection.
            </div>
          )}

          {history.length > 0 && programStructure && (
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-slate-700">Profitability Analysis</h2>
                {latestProjection && (
                  <p className="text-xs text-slate-400 mt-0.5">
                    Last generated {new Date(latestProjection.created_at).toLocaleString()}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-3">
                {latestProjection && (
                  <button
                    onClick={handleDownloadPdf}
                    disabled={pdfLoading}
                    className="text-sm text-indigo-600 hover:underline disabled:opacity-50"
                  >
                    {pdfLoading ? 'Preparing PDF…' : 'Download PDF'}
                  </button>
                )}
                <button
                  onClick={handleGenerateProjection}
                  disabled={projecting}
                  className="bg-indigo-700 hover:bg-indigo-800 text-white text-sm px-4 py-2 rounded-lg disabled:opacity-50"
                >
                  {projecting ? 'Generating…' : latestProjection ? 'Regenerate Report' : 'Generate Report'}
                </button>
              </div>
            </div>
          )}

          {projectionError && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">{projectionError}</div>
          )}

          {latestProjection && (() => {
            const { historical, projection, summary, structure } = latestProjection.projection_data;
            return (
              <>
                {/* Summary cards */}
                <div className="grid grid-cols-4 gap-4">
                  {[
                    { label: 'Avg Historical Loss Rate', value: (summary.avg_historical_loss_rate * 100).toFixed(1) + '%' },
                    { label: 'Captive Premium / yr', value: fmt(structure.new_annual_premium * structure.captive_premium_pct) },
                    { label: 'Avg Annual Profit', value: fmt2(summary.avg_annual_projected_profit), pos: summary.avg_annual_projected_profit >= 0 },
                    { label: '5-Year Total Profit', value: fmt2(summary.total_5yr_projected_profit), pos: summary.total_5yr_projected_profit >= 0 },
                  ].map(({ label, value, pos }) => (
                    <div key={label} className="bg-white rounded-xl border border-slate-200 p-4">
                      <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">{label}</p>
                      <p className={`text-lg font-bold ${pos === undefined ? 'text-slate-800' : pos ? 'text-green-700' : 'text-red-600'}`}>{value}</p>
                    </div>
                  ))}
                </div>

                {/* Historical table */}
                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                  <div className="px-6 py-4 border-b border-slate-100">
                    <h3 className="text-sm font-semibold text-slate-700">Historical Analysis</h3>
                  </div>
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide">
                      <tr>
                        <th className="px-4 py-3 text-left">Year</th>
                        <th className="px-4 py-3 text-right">Total Premium</th>
                        <th className="px-4 py-3 text-right">Captive Premium</th>
                        <th className="px-4 py-3 text-right">Total Losses</th>
                        <th className="px-4 py-3 text-right">Captive Losses</th>
                        <th className="px-4 py-3 text-right">Excess Losses</th>
                        <th className="px-4 py-3 text-right">Loss Ratio</th>
                        <th className="px-4 py-3 text-right">Client P&amp;L</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {historical.map((row, idx) => (
                        <tr key={row.year} className={idx % 2 === 1 ? 'bg-slate-50' : ''}>
                          <td className="px-4 py-3 font-medium text-slate-800">{row.year}</td>
                          <td className="px-4 py-3 text-right text-slate-700">{fmt(row.premium)}</td>
                          <td className="px-4 py-3 text-right text-slate-700">{fmt(row.captive_premium)}</td>
                          <td className="px-4 py-3 text-right text-slate-700">{fmt(row.losses)}</td>
                          <td className="px-4 py-3 text-right text-slate-700">{fmt(row.captive_losses)}</td>
                          <td className="px-4 py-3 text-right text-slate-700">{fmt(row.excess_losses)}</td>
                          <td className="px-4 py-3 text-right">
                            <span className={row.captive_loss_ratio > 0.7 ? 'text-red-600 font-medium' : 'text-slate-700'}>
                              {(row.captive_loss_ratio * 100).toFixed(1)}%
                            </span>
                          </td>
                          <td className={`px-4 py-3 text-right font-medium ${row.client_pl >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                            {fmt2(row.client_pl)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Projection table */}
                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                  <div className="px-6 py-4 border-b border-slate-100">
                    <h3 className="text-sm font-semibold text-slate-700">5-Year Forward Projection</h3>
                    <p className="text-xs text-slate-400 mt-0.5">Based on {summary.years_of_history} {summary.years_of_history === 1 ? 'year' : 'years'} of history · avg loss rate {(summary.avg_historical_loss_rate * 100).toFixed(1)}%</p>
                  </div>
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide">
                      <tr>
                        <th className="px-4 py-3 text-left">Year</th>
                        <th className="px-4 py-3 text-right">Captive Premium</th>
                        <th className="px-4 py-3 text-right">Projected Losses</th>
                        <th className="px-4 py-3 text-right">Captive Losses</th>
                        <th className="px-4 py-3 text-right">Expenses</th>
                        <th className="px-4 py-3 text-right">Net Profit</th>
                        <th className="px-4 py-3 text-right">Cumulative Profit</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {projection.map((row, idx) => (
                        <tr key={row.year} className={idx % 2 === 1 ? 'bg-slate-50' : ''}>
                          <td className="px-4 py-3 font-medium text-slate-800">Year {row.year}</td>
                          <td className="px-4 py-3 text-right text-slate-700">{fmt(row.captive_premium)}</td>
                          <td className="px-4 py-3 text-right text-slate-700">{fmt(row.projected_total_losses)}</td>
                          <td className="px-4 py-3 text-right text-slate-700">{fmt(row.projected_captive_losses)}</td>
                          <td className="px-4 py-3 text-right text-slate-700">{fmt(row.expenses)}</td>
                          <td className={`px-4 py-3 text-right font-medium ${row.net_profit >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                            {fmt2(row.net_profit)}
                          </td>
                          <td className={`px-4 py-3 text-right font-medium ${row.cumulative_profit >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                            {fmt2(row.cumulative_profit)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            );
          })()}
        </div>
      )}

      {/* Tab: Engagement Letters */}
      {activeTab === 'engagement' && (() => {
        return <EngagementTab clientId={client.id} client={client} />;
      })()}

      {/* Invoice Tracking Modal */}
      {trackingInv && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-lg font-semibold text-slate-800 mb-1">Log Invoice #{trackingInv.invoice_number}</h2>
            <p className="text-xs text-slate-400 mb-5">Track when this invoice was sent and when payment was received</p>
            <form onSubmit={handleSaveTracking} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Date Invoice Sent</label>
                  <input
                    type="date"
                    value={trackingForm.date_sent}
                    onChange={e => setTrackingForm(f => ({ ...f, date_sent: e.target.value }))}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Date Commission Received</label>
                  <input
                    type="date"
                    value={trackingForm.date_received}
                    onChange={e => setTrackingForm(f => ({ ...f, date_received: e.target.value }))}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Base Commission Received ($)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder={String(trackingInv.amount_due)}
                    value={trackingForm.base_commission_received}
                    onChange={e => setTrackingForm(f => ({ ...f, base_commission_received: e.target.value }))}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">MGA Fee Received ($)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={trackingForm.mga_fee_received}
                    onChange={e => setTrackingForm(f => ({ ...f, mga_fee_received: e.target.value }))}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
              {trackingError && <p className="text-sm text-red-600">{trackingError}</p>}
              <div className="flex gap-3 justify-end pt-2">
                <button type="button" onClick={() => setTrackingInv(null)} className="text-sm text-slate-500 hover:text-slate-700">Cancel</button>
                <button
                  type="submit"
                  disabled={trackingSaving}
                  className="bg-indigo-700 hover:bg-indigo-800 text-white text-sm px-4 py-2 rounded-lg disabled:opacity-50"
                >
                  {trackingSaving ? 'Saving…' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Stub tabs */}
      {['comments'].includes(activeTab) && (
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

      {/* New Commission Modal */}
      {commOpen && (() => {
        const premAmt = Number(commForm.premium_amount) || 0;
        const rate = Number(commForm.base_commission_rate) / 100;
        const mgaFee = Number(commForm.mga_fee) || 0;
        const baseComm = premAmt * rate;
        const total = baseComm + mgaFee;
        return (
          <div className="fixed inset-0 bg-black/40 flex items-start justify-center z-50 overflow-y-auto py-8">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6 m-4">
              <h2 className="text-lg font-semibold text-slate-800 mb-4">New Commission & Invoice</h2>
              <form onSubmit={handleGenerateInvoice} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Policy Period</label>
                    <input
                      type="text"
                      placeholder="e.g. 2025-2026"
                      value={commForm.policy_period}
                      onChange={e => setCommForm(f => ({ ...f, policy_period: e.target.value }))}
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Due Date</label>
                    <input
                      type="date"
                      value={commForm.due_date}
                      onChange={e => setCommForm(f => ({ ...f, due_date: e.target.value }))}
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Premium Amount ($) <span className="text-red-500">*</span></label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="0.01"
                    placeholder="500000"
                    value={commForm.premium_amount}
                    onChange={e => setCommForm(f => ({ ...f, premium_amount: e.target.value }))}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Commission Rate (%)</label>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        required
                        min="0"
                        max="100"
                        step="0.1"
                        value={commForm.base_commission_rate}
                        onChange={e => setCommForm(f => ({ ...f, base_commission_rate: e.target.value }))}
                        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                      <span className="text-slate-400 text-sm">%</span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">MGA Fee ($)</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={commForm.mga_fee}
                      onChange={e => setCommForm(f => ({ ...f, mga_fee: e.target.value }))}
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                {/* Live calculation */}
                {premAmt > 0 && (
                  <div className="bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-sm space-y-1">
                    <div className="flex justify-between text-slate-600">
                      <span>Base ({(rate * 100).toFixed(1)}%)</span>
                      <span>{fmt(baseComm)}</span>
                    </div>
                    {mgaFee > 0 && (
                      <div className="flex justify-between text-slate-600">
                        <span>MGA Fee</span>
                        <span>{fmt(mgaFee)}</span>
                      </div>
                    )}
                    <div className="flex justify-between font-semibold text-slate-800 border-t border-slate-200 pt-1 mt-1">
                      <span>Total Commission</span>
                      <span>{fmt(total)}</span>
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
                  <textarea
                    value={commForm.notes}
                    onChange={e => setCommForm(f => ({ ...f, notes: e.target.value }))}
                    rows={2}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                {commError && <p className="text-sm text-red-600">{commError}</p>}
                <div className="flex gap-3 justify-end pt-2">
                  <button type="button" onClick={() => setCommOpen(false)} className="text-sm text-slate-500 hover:text-slate-700">Cancel</button>
                  <button
                    type="submit"
                    disabled={commSaving || premAmt <= 0}
                    className="bg-indigo-700 hover:bg-indigo-800 text-white text-sm px-4 py-2 rounded-lg disabled:opacity-50"
                  >
                    {commSaving ? 'Generating…' : 'Generate Invoice'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        );
      })()}

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
