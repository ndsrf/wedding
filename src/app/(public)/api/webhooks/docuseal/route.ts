import { NextRequest, NextResponse } from 'next/server';
import { createHmac } from 'crypto';
import { prisma } from '@/lib/db/prisma';

/**
 * Verify the DocuSeal webhook HMAC-SHA256 signature (optional).
 * Set DOCUSEAL_WEBHOOK_SECRET in env to enable verification.
 */
function verifySignature(body: string, signatureHeader: string | null): boolean {
  const secret = process.env.DOCUSEAL_WEBHOOK_SECRET;
  if (!secret) return true; // skip verification when secret not configured
  if (!signatureHeader) return false;
  const expected = createHmac('sha256', secret).update(body).digest('hex');
  return signatureHeader === expected;
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

  let event: Record<string, unknown>;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const eventType = event.event_type as string | undefined;
  const data = event.data as Record<string, unknown> | undefined;

  try {
    if (eventType === 'submission.completed' && data) {
      // All signers on a submission have signed
      const submissionId = data.id as number | undefined;
      const documents = (data.documents as Array<{ url?: string }> | undefined) ?? [];
      await handleSubmissionCompleted(submissionId, documents[0]?.url ?? null);
    } else if (eventType === 'form.completed' && data) {
      // Individual submitter has completed signing
      const submissionId = data.submission_id as number | undefined;
      const submission = data.submission as Record<string, unknown> | undefined;
      const documents =
        (submission?.documents as Array<{ url?: string }> | undefined) ?? [];
      await handleSubmissionCompleted(submissionId, documents[0]?.url ?? null);
    }
  } catch (error) {
    console.error('DocuSeal webhook processing error:', error);
    // Still return 200 to prevent retries for application errors
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

  await prisma.contract.update({
    where: { id: contract.id },
    data: {
      status: 'SIGNED',
      signed_at: new Date(),
      signed_pdf_url: signedPdfUrl ?? null,
    },
  });
}
