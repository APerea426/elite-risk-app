import Anthropic from '@anthropic-ai/sdk';
import { createClient as createSupabaseClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export const maxDuration = 60; // allow up to 60s for Claude to process large PDFs

const EXTRACT_PROMPT = `You are an insurance data extraction assistant. The attached document is a commercial insurance loss run report.

Extract ALL policy years and ALL lines of coverage present in this document. For each combination return a JSON object.

Rules:
- "year" = the 4-digit START year of the policy period (e.g. 2023 for "2023-2024" or "07/01/2023 to 07/01/2024")
- "line_of_coverage" must be one of: "AL", "APD", "GL", "MTC", "WC", or "Other"
  AL  = Auto Liability / Commercial Auto Liability
  APD = Auto Physical Damage / Physical Damage / Collision / Comprehensive
  GL  = General Liability / Commercial General Liability
  MTC = Motor Truck Cargo / Cargo
  WC  = Workers Compensation
- "losses" = total INCURRED losses for that year+line (paid + reserves). Use net figure if subrogation is shown.
- "premium" = written premium for that year+line if shown, otherwise 0
- "carrier" = carrier/insurer name
- "policy_number" = policy number

If a single policy covers multiple lines (e.g. a PKG policy with AL + APD), return a separate object for each line.
If a year has no losses for a line but the line is listed, include it with losses: 0.
If the document covers multiple policy years, return a row for each year+line combination.

Respond ONLY with valid JSON — an array of objects, no markdown, no explanation:
[
  {
    "year": 2023,
    "line_of_coverage": "AL",
    "losses": 45000.00,
    "premium": 120000.00,
    "carrier": "Canal Insurance",
    "policy_number": "CT12345"
  }
]`;

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createSupabaseClient();

    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: profile } = await supabase
      .from('users')
      .select('id, full_name')
      .eq('auth_id', authUser.id)
      .single();
    if (!profile) return NextResponse.json({ error: 'User not found' }, { status: 403 });

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) return NextResponse.json({ error: 'ANTHROPIC_API_KEY not configured on server' }, { status: 500 });

    // Parse multipart form
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 });

    const allowedTypes = ['application/pdf', 'image/png', 'image/jpeg', 'image/tiff', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: 'File must be a PDF or image (PNG, JPEG, TIFF)' }, { status: 400 });
    }
    if (file.size > 20 * 1024 * 1024) {
      return NextResponse.json({ error: 'File must be under 20 MB' }, { status: 400 });
    }

    // Upload to Supabase Storage
    const fileBuffer = await file.arrayBuffer();
    const storagePath = `${id}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;

    const { error: uploadError } = await supabase.storage
      .from('loss-runs')
      .upload(storagePath, fileBuffer, { contentType: file.type, upsert: false });

    if (uploadError) {
      // Non-fatal — still try to extract even if storage fails
      console.warn('Storage upload failed:', uploadError.message);
    } else {
      // Record the upload
      await supabase.from('loss_run_uploads').insert({
        client_id: id,
        storage_path: storagePath,
        file_name: file.name,
        uploaded_by: profile.id,
      });
    }

    // Send to Claude for extraction
    const anthropic = new Anthropic({ apiKey });
    const base64 = Buffer.from(fileBuffer).toString('base64');

    const isPdf = file.type === 'application/pdf';

    let message;
    if (isPdf) {
      message = await anthropic.messages.create({
        model: 'claude-opus-4-8',
        max_tokens: 4096,
        messages: [{
          role: 'user',
          content: [
            { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: base64 } },
            { type: 'text', text: EXTRACT_PROMPT },
          ],
        }],
      });
    } else {
      const imgType = file.type as 'image/png' | 'image/jpeg' | 'image/gif' | 'image/webp';
      message = await anthropic.messages.create({
        model: 'claude-opus-4-8',
        max_tokens: 4096,
        messages: [{
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: imgType, data: base64 } },
            { type: 'text', text: EXTRACT_PROMPT },
          ],
        }],
      });
    }

    const raw = message.content[0].type === 'text' ? message.content[0].text.trim() : '';

    // Strip markdown code fences if Claude added them
    const json = raw.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();

    let extracted: {
      year: number;
      line_of_coverage: string;
      losses: number;
      premium: number;
      carrier: string;
      policy_number: string;
    }[];

    try {
      extracted = JSON.parse(json);
    } catch {
      return NextResponse.json(
        { error: 'Claude returned unparseable data. The PDF may be too complex or scanned without OCR.', raw },
        { status: 422 }
      );
    }

    if (!Array.isArray(extracted) || extracted.length === 0) {
      return NextResponse.json(
        { error: 'No loss run data found in this document.', raw },
        { status: 422 }
      );
    }

    // Normalise and validate each row
    const VALID_LINES = ['AL', 'APD', 'GL', 'MTC', 'WC', 'Other'];
    const rows = extracted.map(r => ({
      year: Number(r.year),
      line_of_coverage: VALID_LINES.includes(r.line_of_coverage) ? r.line_of_coverage : 'Other',
      losses: Math.max(0, Number(r.losses) || 0),
      premium: Math.max(0, Number(r.premium) || 0),
      carrier: String(r.carrier ?? '').trim(),
      policy_number: String(r.policy_number ?? '').trim(),
    })).filter(r => r.year >= 2000 && r.year <= 2099);

    return NextResponse.json({ rows, file_name: file.name, storage_path: storagePath });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
