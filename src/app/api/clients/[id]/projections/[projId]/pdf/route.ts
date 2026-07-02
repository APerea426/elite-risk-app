import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import React from 'react';
import { renderToBuffer, type DocumentProps } from '@react-pdf/renderer';
import ProfitabilityReportPDF from '@/lib/pdf/profitability-report';
import type { ReactElement, JSXElementConstructor } from 'react';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string; projId: string }> }
) {
  try {
    const { id: clientId, projId } = await params;
    const supabase = await createClient();
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: projection, error } = await supabase
      .from('profitability_projections')
      .select('*')
      .eq('id', projId)
      .eq('client_id', clientId)
      .single();

    if (error || !projection) return NextResponse.json({ error: 'Projection not found' }, { status: 404 });

    const element = React.createElement(ProfitabilityReportPDF, { data: projection.projection_data }) as ReactElement<DocumentProps, string | JSXElementConstructor<unknown>>;
    const nodeBuffer = await renderToBuffer(element);
    const buffer = new Uint8Array(nodeBuffer);

    const clientName = (projection.projection_data?.client_name ?? 'client').replace(/[^a-z0-9]/gi, '-').toLowerCase();
    const filename = `profitability-report-${clientName}.pdf`;

    return new Response(buffer as BodyInit, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
