import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getSignedPdfUrl } from '@/lib/signing/dropbox-sign';

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get('content-type') ?? '';
    let event: Record<string, unknown>;

    if (contentType.includes('application/json')) {
      event = await request.json();
    } else {
      // Dropbox Sign sends as form data
      const formData = await request.formData();
      const json = formData.get('json');
      if (!json) return NextResponse.json({ error: 'No payload' }, { status: 400 });
      event = JSON.parse(String(json));
    }

    const eventType = (event.event as { event_type?: string })?.event_type;

    if (eventType === 'signature_request_signed') {
      const signatureRequest = (event.signature_request as { signature_request_id?: string; is_complete?: boolean }) ?? {};
      const signatureRequestId = signatureRequest.signature_request_id;

      if (signatureRequestId) {
        const contract = await prisma.contract.findFirst({
          where: { signing_request_id: signatureRequestId },
        });

        if (contract) {
          const signedPdfUrl = await getSignedPdfUrl(signatureRequestId);
          await prisma.contract.update({
            where: { id: contract.id },
            data: {
              status: 'SIGNED',
              signed_at: new Date(),
              signed_pdf_url: signedPdfUrl ?? null,
            },
          });
        }
      }
    }

    // Dropbox Sign requires this exact response
    return new NextResponse('Hello API Event Received', { status: 200 });
  } catch (error) {
    console.error('Dropbox Sign webhook error:', error);
    // Still return 200 to prevent retries for application errors
    return new NextResponse('Hello API Event Received', { status: 200 });
  }
}
