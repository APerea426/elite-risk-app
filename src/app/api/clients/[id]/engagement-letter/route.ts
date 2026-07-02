import { createClient } from '@/lib/supabase/server';
import { logActivity } from '@/lib/activity-log';
import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';
import AdmZip from 'adm-zip';

function xmlEscape(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function fillTemplate(templatePath: string, replacements: Record<string, string>): Buffer {
  const zip = new AdmZip(templatePath);
  const docEntry = zip.getEntry('word/document.xml');
  if (!docEntry) throw new Error('Invalid docx: missing word/document.xml');

  let xml = docEntry.getData().toString('utf8');

  for (const [placeholder, value] of Object.entries(replacements)) {
    xml = xml.split(placeholder).join(xmlEscape(value));
  }

  zip.updateFile('word/document.xml', Buffer.from(xml, 'utf8'));
  return zip.toBuffer();
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: clientId } = await params;
    const supabase = await createClient();
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: profile } = await supabase
      .from('users')
      .select('id, full_name')
      .eq('auth_id', authUser.id)
      .single();
    if (!profile) return NextResponse.json({ error: 'User not found' }, { status: 403 });

    const body = await request.json();
    const {
      letter_type,         // 'cell' | 'standalone'
      date,                // e.g. "July 2, 2026"
      client_name,         // salutation name
      company_name,
      carrier_name,
      policy_description,
      management_fee,      // number, e.g. 45000
      set_engagement_date, // boolean — update client.engagement_letter_date
    } = body;

    if (!letter_type || !['cell', 'standalone'].includes(letter_type)) {
      return NextResponse.json({ error: 'letter_type must be "cell" or "standalone"' }, { status: 400 });
    }
    if (!company_name?.trim()) return NextResponse.json({ error: 'Company name required' }, { status: 400 });

    const { data: client } = await supabase.from('clients').select('company_name').eq('id', clientId).single();
    if (!client) return NextResponse.json({ error: 'Client not found' }, { status: 404 });

    const templateFile = letter_type === 'cell' ? 'cell-captive.docx' : 'standalone-captive.docx';
    const templatePath = path.join(process.cwd(), 'templates', templateFile);
    if (!fs.existsSync(templatePath)) {
      return NextResponse.json({ error: `Template file not found: ${templateFile}` }, { status: 500 });
    }

    // Format fee as "$   45,000" to match template's table cell format (3 spaces after $)
    const defaultFee = letter_type === 'cell' ? 45000 : 55000;
    const feeValue = typeof management_fee === 'number' && management_fee > 0 ? management_fee : defaultFee;
    const feeFormatted = `$   ${feeValue.toLocaleString('en-US')}`;
    const templateFee = letter_type === 'cell' ? '$   45,000' : '$   55,000';

    const replacements: Record<string, string> = {
      'DATE': date || new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
      'Client Name': (client_name ?? '').trim() || company_name.trim(),
      '(Company Name)': company_name.trim(),
      '(Carrier Name)': carrier_name?.trim() || 'Victoria Corporate Ltd',
      '(Captive Policy Description)': policy_description?.trim() || '',
      [templateFee]: feeFormatted,
    };

    const buffer = fillTemplate(templatePath, replacements);

    if (set_engagement_date) {
      const today = new Date().toISOString().split('T')[0];
      await supabase.from('clients').update({ engagement_letter_date: today, updated_at: new Date().toISOString() }).eq('id', clientId);
    }

    const typeLabel = letter_type === 'cell' ? 'Cell Captive' : 'Stand-Alone Captive';
    await logActivity({
      userId: profile.id,
      actionType: 'engagement_letter_generated',
      recordType: 'client',
      recordId: clientId,
      recordLabel: client.company_name,
      description: `${profile.full_name} generated a ${typeLabel} engagement letter for ${client.company_name}`,
    });

    const safeCompany = company_name.trim().replace(/[^a-z0-9]/gi, '-').toLowerCase();
    const filename = `engagement-letter-${safeCompany}.docx`;

    return new Response(new Uint8Array(buffer) as BodyInit, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
