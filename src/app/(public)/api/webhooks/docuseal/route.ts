import { NextRequest, NextResponse } from 'next/server';
import { timingSafeEqual } from 'crypto';
import { z } from 'zod';
import { prisma } from '@/lib/db/prisma';
import { uploadFile } from '@/lib/storage';

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
 * Fetch signed PDF URL and audit log URL from the DocuSeal API.
 * Used when the webhook payload doesn't include documents (e.g. form.completed
 * fires before PDF generation completes) and to get the audit_log_url.
 */
async function fetchSubmissionFromApi(
  submissionId: number
): Promise<{ signedPdfUrl: string | null; auditLogUrl: string | null }> {
  const apiBase = (process.env.DOCUSEAL_API_URL ?? 'https://api.docuseal.com').replace(/\/$/, '');
  const apiKey = process.env.DOCUSEAL_API_KEY;
  if (!apiKey) return { signedPdfUrl: null, auditLogUrl: null };
  try {
    const res = await fetch(`${apiBase}/submissions/${submissionId}`, {
      headers: { 'X-Auth-Token': apiKey },
    });
    if (!res.ok) return { signedPdfUrl: null, auditLogUrl: null };
    const data = await res.json() as {
      documents?: Array<{ url?: string }>;
      audit_log_url?: string;
    };
    return {
      signedPdfUrl: data.documents?.[0]?.url ?? null,
      auditLogUrl: data.audit_log_url ?? null,
    };
  } catch {
    return { signedPdfUrl: null, auditLogUrl: null };
  }
}

/** Download a URL and return its content as a Buffer. Returns null on failure. */
async function downloadBuffer(url: string): Promise<Buffer | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return Buffer.from(await res.arrayBuffer());
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

  // Always fetch from the API so we get the audit_log_url too. If the payload
  // already included a signed PDF URL we use that, otherwise take it from the API.
  const { signedPdfUrl: apiPdfUrl, auditLogUrl } = await fetchSubmissionFromApi(submissionId);
  const resolvedDocusealPdfUrl = signedPdfUrl ?? apiPdfUrl;

  if (!resolvedDocusealPdfUrl) {
    console.warn(`DocuSeal webhook: signed PDF URL not available for submission ${submissionId}`);
  }

  // Download both PDFs from DocuSeal and re-upload to our own storage so the
  // stored links remain valid independently of DocuSeal URL expiry.
  const [signedBuffer, auditBuffer] = await Promise.all([
    resolvedDocusealPdfUrl ? downloadBuffer(resolvedDocusealPdfUrl) : Promise.resolve(null),
    auditLogUrl ? downloadBuffer(auditLogUrl) : Promise.resolve(null),
  ]);

  const storagePath = `contracts/${contract.id}/signed`;

  const [signedUpload, auditUpload] = await Promise.all([
    signedBuffer
      ? uploadFile(`${storagePath}/signed-contract.pdf`, signedBuffer, {
          contentType: 'application/pdf',
          access: 'public',
          allowOverwrite: true,
        })
      : Promise.resolve(null),
    auditBuffer
      ? uploadFile(`${storagePath}/audit.pdf`, auditBuffer, {
          contentType: 'application/pdf',
          access: 'public',
          allowOverwrite: true,
        })
      : Promise.resolve(null),
  ]);

  if (signedUpload) {
    console.log(`DocuSeal webhook: signed PDF stored at ${signedUpload.url} for contract ${contract.id}`);
  }
  if (auditUpload) {
    console.log(`DocuSeal webhook: audit PDF stored at ${auditUpload.url} for contract ${contract.id}`);
  }

  await prisma.contract.update({
    where: { id: contract.id },
    data: {
      status: 'SIGNED',
      signed_at: new Date(),
      // Use our own storage URL; fall back to DocuSeal URL if upload failed
      signed_pdf_url: signedUpload?.url ?? resolvedDocusealPdfUrl ?? null,
      audit_url: auditUpload?.url ?? auditLogUrl ?? null,
    },
  });
}
