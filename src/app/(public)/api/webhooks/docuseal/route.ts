import { NextRequest, NextResponse } from 'next/server';
import { timingSafeEqual } from 'crypto';
import { z } from 'zod';
import { prisma } from '@/lib/db/prisma';

// ── Webhook payload schemas ───────────────────────────────────────────────────

const documentSchema = z.object({ url: z.string().optional() });

// submission.completed — the `data` object is the submission itself
// Use z.coerce.number() to handle IDs sent as strings or numbers
const submissionCompletedDataSchema = z.object({
  id: z.coerce.number(),
  documents: z.array(documentSchema).optional(),
});

// form.completed — the `data` object is the submitter; nested `submission` holds docs
const formCompletedDataSchema = z.object({
  submission_id: z.coerce.number(),
  submission: z
    .object({ documents: z.array(documentSchema).optional() })
    .optional(),
});

const webhookEventSchema = z.object({
  event_type: z.string(),
  data: z.record(z.string(), z.unknown()).optional(),
});

/**
 * Verify the DocuSeal webhook HMAC-SHA256 signature (optional).
 * Set DOCUSEAL_WEBHOOK_SECRET in env to enable verification.
 */
function verifySignature(_body: string, signatureHeader: string | null): boolean {
  const secret = process.env.DOCUSEAL_WEBHOOK_SECRET;
  if (!secret) return true; // skip verification when secret not configured
  if (!signatureHeader) return false;
  try {
    return timingSafeEqual(Buffer.from(signatureHeader), Buffer.from(secret));
  } catch {
    return false;
  }
}

/**
 * Fetch the signed PDF URL for a submission directly from DocuSeal API.
 * Used as a fallback when the webhook payload doesn't include documents
 * (e.g. form.completed fires before PDF generation completes).
 */
async function fetchSignedPdfUrlFromApi(submissionId: number): Promise<string | null> {
  const apiBase = (process.env.DOCUSEAL_API_URL ?? 'https://api.docuseal.com').replace(/\/$/, '');
  const apiKey = process.env.DOCUSEAL_API_KEY;
  if (!apiKey) return null;
  try {
    const res = await fetch(`${apiBase}/submissions/${submissionId}`, {
      headers: { 'X-Auth-Token': apiKey },
    });
    if (!res.ok) return null;
    const data = await res.json() as { documents?: Array<{ url?: string }> };
    return data.documents?.[0]?.url ?? null;
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  let rawBody: string;
  try {
    rawBody = await request.text();
  } catch {
    return NextResponse.json({ error: 'Failed to read body' }, { status: 400 });
  }

  const signature = request.headers.get('x-docuseal-signature');
  if (!verifySignature(rawBody, signature)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  let parsed: z.infer<typeof webhookEventSchema>;
  try {
    parsed = webhookEventSchema.parse(JSON.parse(rawBody));
  } catch {
    return NextResponse.json({ error: 'Invalid JSON or unexpected payload shape' }, { status: 400 });
  }

  const { event_type: eventType, data } = parsed;

  try {
    if (eventType === 'submission.completed' && data) {
      // All signers on a submission have signed — data IS the submission object
      const result = submissionCompletedDataSchema.safeParse(data);
      if (result.success) {
        const { id: submissionId, documents = [] } = result.data;
        await handleSubmissionCompleted(submissionId, documents[0]?.url ?? null);
      } else {
        console.warn('DocuSeal submission.completed: unexpected data shape', result.error.issues);
      }
    } else if (eventType === 'form.completed' && data) {
      // Individual submitter has completed signing — data IS the submitter object
      const result = formCompletedDataSchema.safeParse(data);
      if (result.success) {
        const { submission_id: submissionId, submission } = result.data;
        const documents = submission?.documents ?? [];
        await handleSubmissionCompleted(submissionId, documents[0]?.url ?? null);
      } else {
        console.warn('DocuSeal form.completed: unexpected data shape', result.error.issues);
      }
    }
  } catch (error) {
    console.error('DocuSeal webhook processing error:', error);
    // Still return 200 to prevent DocuSeal from retrying application errors
  }

  return NextResponse.json({ received: true });
}

async function handleSubmissionCompleted(
  submissionId: number | undefined,
  signedPdfUrl: string | null
): Promise<void> {
  if (!submissionId) return;

  const contract = await prisma.contract.findFirst({
    where: { signing_request_id: String(submissionId) },
  });

  if (!contract) {
    console.warn(`DocuSeal webhook: no contract found for submission ${submissionId}`);
    return;
  }

  // If the webhook payload didn't include the signed PDF URL (common for
  // form.completed events where PDF generation is still in progress),
  // fetch it directly from the DocuSeal API.
  let resolvedPdfUrl = signedPdfUrl;
  if (!resolvedPdfUrl) {
    resolvedPdfUrl = await fetchSignedPdfUrlFromApi(submissionId);
    if (resolvedPdfUrl) {
      console.log(`DocuSeal webhook: fetched signed PDF URL from API for submission ${submissionId}`);
    } else {
      console.warn(`DocuSeal webhook: signed PDF URL not available for submission ${submissionId}`);
    }
  }

  await prisma.contract.update({
    where: { id: contract.id },
    data: {
      status: 'SIGNED',
      signed_at: new Date(),
      signed_pdf_url: resolvedPdfUrl ?? null,
    },
  });
}
