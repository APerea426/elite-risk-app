'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { Prospect, Client, Coverage, PremiumLossHistory, Commission, Invoice, ProgramStructure, ProfitabilityProjection, BrokerFee, IndividualLoss } from '@/types/database';
import ClientDetailClient from '../../clients/[id]/client-detail-client';

type ProspectStatus = 'active' | 'inactive' | 'converted';

const STATUS_LABELS: Record<ProspectStatus, string> = {
  active: 'Active Prospect',
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
  client: Client;
  coverages: Coverage[];
  history: PremiumLossHistory[];
  commissions: Commission[];
  invoices: Invoice[];
  effectiveRate: number;
  programStructure: ProgramStructure | null;
  latestProjection: ProfitabilityProjection | null;
  brokerFees: BrokerFee[];
  individualLosses: IndividualLoss[];
}

export default function ProspectFullProfile({
  prospect: initialProspect,
  client,
  coverages,
  history,
  commissions,
  invoices,
  effectiveRate,
  programStructure,
  latestProjection,
  brokerFees,
  individualLosses,
}: Props) {
  const router = useRouter();
  const [prospect, setProspect] = useState(initialProspect);
  const [converting, setConverting] = useState(false);
  const [statusChanging, setStatusChanging] = useState(false);
  const [convertOpen, setConvertOpen] = useState(false);
  const [actionError, setActionError] = useState('');

  async function handleStatusChange(newStatus: 'active' | 'inactive') {
    setStatusChanging(true);
    const res = await fetch(`/api/prospects/${prospect.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    });
    if (res.ok) {
      const data = await res.json();
      setProspect(data);
    }
    setStatusChanging(false);
  }

  async function handleConvert() {
    setConverting(true);
    setActionError('');
    const res = await fetch(`/api/prospects/${prospect.id}/convert`, { method: 'POST' });
    const data = await res.json();
    if (!res.ok) { setActionError(data.error); setConverting(false); return; }
    // Redirect to the client page — shadow client is now promoted
    router.push(`/clients/${data.clientId}`);
  }

  return (
    <>
      {/* Prospect status bar */}
      <div className="mb-6">
        <Link href="/prospects" className="text-sm text-indigo-600 hover:underline">
          ← Back to Prospects
        </Link>
        <div className="mt-3 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-800">{client.company_name}</h1>
            <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-semibold ${STATUS_CLASSES[prospect.status]}`}>
              {STATUS_LABELS[prospect.status]}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {prospect.status === 'active' && (
              <>
                <button
                  onClick={() => handleStatusChange('inactive')}
                  disabled={statusChanging}
                  className="text-sm border border-slate-300 hover:bg-slate-50 text-slate-700 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                >
                  Mark Inactive
                </button>
                <button
                  onClick={() => setConvertOpen(true)}
                  className="text-sm bg-green-700 hover:bg-green-800 text-white px-4 py-1.5 rounded-lg transition-colors"
                >
                  Convert to Client →
                </button>
              </>
            )}
            {prospect.status === 'inactive' && (
              <button
                onClick={() => handleStatusChange('active')}
                disabled={statusChanging}
                className="text-sm border border-slate-300 hover:bg-slate-50 text-slate-700 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
              >
                Mark Active
              </button>
            )}
            {prospect.status === 'converted' && prospect.converted_to_client_id && (
              <Link
                href={`/clients/${prospect.converted_to_client_id}`}
                className="text-sm bg-indigo-700 hover:bg-indigo-800 text-white px-4 py-1.5 rounded-lg transition-colors"
              >
                View Client Record →
              </Link>
            )}
          </div>
        </div>
        {actionError && <p className="mt-2 text-sm text-red-600">{actionError}</p>}
        <div className="mt-3 h-px bg-slate-200" />
      </div>

      {/* Full client profile — all tabs available */}
      <ClientDetailClient
        client={client}
        coverages={coverages}
        history={history}
        commissions={commissions}
        invoices={invoices}
        effectiveRate={effectiveRate}
        programStructure={programStructure}
        latestProjection={latestProjection}
        brokerFees={brokerFees}
        individualLosses={individualLosses}
      />

      {/* Convert confirmation modal */}
      {convertOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6">
            <h2 className="text-lg font-semibold text-slate-800 mb-2">Convert to Client</h2>
            <p className="text-sm text-slate-600 mb-6">
              Convert <strong>{client.company_name}</strong> to a client? All data you&apos;ve entered (coverages, history, commissions, etc.) will transfer automatically. This cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setConvertOpen(false)} className="text-sm text-slate-500 hover:text-slate-700">Cancel</button>
              <button
                onClick={handleConvert}
                disabled={converting}
                className="bg-green-700 hover:bg-green-800 text-white text-sm px-4 py-2 rounded-lg disabled:opacity-50"
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
