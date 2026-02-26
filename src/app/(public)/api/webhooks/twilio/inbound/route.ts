/**
 * Twilio Inbound WhatsApp Webhook
 *
 * Receives incoming WhatsApp messages sent by guests, records them as
 * MESSAGE_RECEIVED tracking events, and auto-replies with an AI-generated
 * response using the wedding's context.
 *
 * POST /api/webhooks/twilio/inbound
 *
 * Setup: In the Twilio console, set this URL as the "When a message comes in"
 * webhook for your WhatsApp sender (Messaging → Senders → WhatsApp).
 * The URL must be publicly accessible (not localhost).
 *
 * The response uses TwiML so Twilio sends the AI reply directly to the guest.
 * AI calls typically complete in 2–5 s; Twilio's webhook timeout is 15 s.
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { validateTwilioSignature } from '@/lib/webhooks/twilio-validator';
import { generateWeddingReply, type InvitationTemplateContext } from '@/lib/ai/wedding-assistant';
import { getShortUrlPath } from '@/lib/short-url';
import { isWeddingDay } from '@/lib/date-formatter';
import type { TemplateDesign } from '@/types/invitation-template';
import { uploadFile, deleteFile, generateUniqueFilename } from '@/lib/storage';
import { uploadToWeddingGooglePhotos } from '@/lib/google-photos/upload-helper';

export const runtime = 'nodejs';

// ============================================================================
// TWIML HELPERS
// ============================================================================

/** Escape special XML characters in a string */
function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/** TwiML with no outbound message (acknowledge only) */
function emptyTwiML(): NextResponse {
  return new NextResponse('<?xml version="1.0" encoding="UTF-8"?><Response></Response>', {
    status: 200,
    headers: { 'Content-Type': 'text/xml' },
  });
}

/** TwiML that sends a WhatsApp reply back to the sender */
function messageTwiML(text: string): NextResponse {
  const xml = `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${escapeXml(text)}</Message></Response>`;
  return new NextResponse(xml, {
    status: 200,
    headers: { 'Content-Type': 'text/xml' },
  });
}

// ============================================================================
// PHONE NORMALISATION
// ============================================================================

/**
 * Strip the "whatsapp:" prefix and any surrounding whitespace.
 * Returns the E.164 phone number (e.g. "+34612345678").
 */
function extractPhone(raw: string): string {
  return raw.replace(/^whatsapp:/i, '').trim();
}

// ============================================================================
// RETRY LOGIC FOR DATABASE OPERATIONS
// ============================================================================

/**
 * Retry a database operation with exponential backoff.
 * Useful for handling transient connection timeouts.
 *
 * @param operation - Async function to retry
 * @param maxRetries - Maximum number of retry attempts (default: 2)
 * @param baseDelay - Base delay in milliseconds (default: 100ms)
 * @returns Result of the operation
 */
async function retryDbOperation<T>(
  operation: () => Promise<T>,
  maxRetries = 2,
  baseDelay = 100
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;

      // Check if error is a connection timeout that's worth retrying
      const errorMessage = error instanceof Error ? error.message : String(error);
      const isRetryable = errorMessage.includes('timeout') ||
                          errorMessage.includes('Connection terminated');

      if (attempt < maxRetries && isRetryable) {
        // Exponential backoff: 100ms, 200ms, 400ms, etc.
        const delay = baseDelay * Math.pow(2, attempt);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }

      // If not retryable or max retries reached, throw the error
      throw error;
    }
  }

  throw lastError;
}

// ============================================================================
// WEBHOOK HANDLER
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    // --- Parse form data -------------------------------------------------
    const formData = await request.formData();
    const params: Record<string, string> = {};
    for (const [key, value] of formData.entries()) {
      params[key] = value as string;
    }

    // --- Validate Twilio signature ----------------------------------------
    const signature = request.headers.get('x-twilio-signature');
    if (!signature) {
      console.warn('[TWILIO_INBOUND] Missing X-Twilio-Signature header');
      return NextResponse.json({ success: false }, { status: 400 });
    }

    const authToken = process.env.TWILIO_AUTH_TOKEN;
    if (!authToken) {
      console.error('[TWILIO_INBOUND] TWILIO_AUTH_TOKEN not configured');
      return emptyTwiML();
    }

    const isValid = validateTwilioSignature(request.url, params, signature, authToken);
    if (!isValid) {
      console.warn('[TWILIO_INBOUND] Invalid Twilio signature', {
        messageSid: params.MessageSid,
      });
      return NextResponse.json({ success: false }, { status: 403 });
    }

    // --- Extract message fields -------------------------------------------
    const fromPhone = extractPhone(params.From ?? '');
    const body = (params.Body ?? '').trim();
    const messageSid = params.MessageSid ?? '';
    const numMedia = parseInt(params.NumMedia ?? '0', 10);

    console.log('[TWILIO_INBOUND] Received message', {
      from: fromPhone,
      messageSid,
      bodyLength: body.length,
      numMedia,
    });

    if (!fromPhone) {
      return emptyTwiML();
    }

    // --- Handle media attachments (photos sent via WhatsApp) --------------
    if (numMedia > 0) {
      // Find the family first so we know the wedding_id
      const mediaFamily = await prisma.family.findFirst({
        where: { OR: [{ whatsapp_number: fromPhone }, { phone: fromPhone }] },
        select: { id: true, wedding_id: true, name: true },
      });

      if (mediaFamily) {
        for (let i = 0; i < numMedia; i++) {
          const mediaUrl = params[`MediaUrl${i}`];
          const mediaContentType = params[`MediaContentType${i}`] ?? 'image/jpeg';

          if (!mediaUrl || !mediaContentType.startsWith('image/')) continue;

          try {
            // Fetch the media from Twilio (requires Twilio auth)
            const accountSid = process.env.TWILIO_ACCOUNT_SID;
            const authToken = process.env.TWILIO_AUTH_TOKEN;
            const fetchRes = await fetch(mediaUrl, {
              headers: {
                Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString('base64')}`,
              },
            });

            if (!fetchRes.ok) {
              console.warn('[TWILIO_INBOUND] Failed to fetch media:', mediaUrl);
              continue;
            }

            const buffer = Buffer.from(await fetchRes.arrayBuffer());
            const ext = mediaContentType.split('/')[1]?.split(';')[0] ?? 'jpg';
            const filename = generateUniqueFilename(`whatsapp-photo.${ext}`);
            const storagePath = `gallery/${mediaFamily.wedding_id}/${filename}`;

            // Upload to blob storage as temporary holding area
            const { url: blobUrl } = await uploadFile(storagePath, buffer, {
              contentType: mediaContentType,
            });

            // Attempt to forward the photo to the wedding's Google Photos album
            let photoUrl = blobUrl;
            let thumbnailUrl: string | null = null;
            let deleteBlobUrl: string | null = blobUrl;

            try {
              const gPhotos = await uploadToWeddingGooglePhotos(
                mediaFamily.wedding_id,
                buffer,
                filename,
                mediaContentType,
                mediaFamily.name ?? undefined
              );

              if (gPhotos) {
                // Use Google Photos CDN URL for display; thumbnail is a cropped variant
                photoUrl = gPhotos.baseUrl;
                thumbnailUrl = `${gPhotos.baseUrl}=w400-h400-c`;
                console.log('[TWILIO_INBOUND] Uploaded WhatsApp photo to Google Photos', {
                  wedding_id: mediaFamily.wedding_id,
                  family: mediaFamily.name,
                });
              } else {
                // Google Photos not configured – keep blob URL, do not delete
                deleteBlobUrl = null;
              }
            } catch (gErr) {
              console.error('[TWILIO_INBOUND] Google Photos upload failed, keeping blob URL:', gErr);
              deleteBlobUrl = null;
            }

            await prisma.weddingPhoto.create({
              data: {
                wedding_id: mediaFamily.wedding_id,
                url: photoUrl,
                thumbnail_url: thumbnailUrl,
                source: 'WHATSAPP',
                sender_name: mediaFamily.name,
                approved: true,
              },
            });

            // Clean up blob now that the photo is safely in Google Photos
            if (deleteBlobUrl) {
              try {
                await deleteFile(deleteBlobUrl);
              } catch (delErr) {
                console.warn('[TWILIO_INBOUND] Failed to delete temp blob after Google Photos upload:', delErr);
              }
            }

            console.log('[TWILIO_INBOUND] Saved WhatsApp photo to gallery', {
              wedding_id: mediaFamily.wedding_id,
              family: mediaFamily.name,
              storage: deleteBlobUrl ? 'google-photos' : 'blob',
            });
          } catch (err) {
            console.error('[TWILIO_INBOUND] Error saving WhatsApp photo:', err);
          }
        }
      }

      // If the message has only media and no text body, acknowledge and return
      if (!body) {
        return messageTwiML('¡Gracias por compartir tu foto! 📸 La hemos añadido a la galería de la boda.');
      }
    }

    if (!body) {
      return emptyTwiML();
    }

    // --- Look up family by phone number -----------------------------------
    // We search both whatsapp_number and phone fields.
    // Families are uniquely tied to a wedding, so a phone number should
    // return at most one family in practice.
    const family = await prisma.family.findFirst({
      where: {
        OR: [
          { whatsapp_number: fromPhone },
          { phone: fromPhone },
        ],
      },
      include: {
        wedding: true,
        members: {
          select: { id: true, name: true, attending: true },
        },
      },
    });

    // --- Track the incoming message ---------------------------------------
    // We await creation so we can later update this event with the AI reply.
    let messageReceivedEventId: string | null = null;
    if (family) {
      try {
        const messageEvent = await prisma.trackingEvent.create({
          data: {
            family_id: family.id,
            wedding_id: family.wedding_id,
            event_type: 'MESSAGE_RECEIVED',
            channel: 'WHATSAPP',
            metadata: {
              message_sid: messageSid,
              from: fromPhone,
              body: body.substring(0, 1000),
            },
            admin_triggered: false,
          },
        });
        messageReceivedEventId = messageEvent.id;
      } catch (err) {
        console.error('[TWILIO_INBOUND] Failed to track MESSAGE_RECEIVED:', err);
      }
    } else {
      console.warn('[TWILIO_INBOUND] No family found for phone', fromPhone);
    }

    // --- Check AI provider availability ----------------------------------
    const hasOpenAI = !!process.env.OPENAI_API_KEY;
    const hasGemini = !!process.env.GEMINI_API_KEY;

    if (!hasOpenAI && !hasGemini) {
      console.warn('[TWILIO_INBOUND] No AI provider configured – skipping auto-reply');
      return emptyTwiML();
    }

    // --- Generate AI reply -----------------------------------------------
    if (!family) {
      // Cannot build a contextual reply without wedding info
      return emptyTwiML();
    }

    const language = String(family.preferred_language ?? family.wedding.default_language ?? 'EN');

    // Generate short URL for RSVP link in AI response
    const appUrl = process.env.APP_URL || 'http://localhost:3000';
    let shortRsvpUrl: string | null = null;
    try {
      const shortPath = await getShortUrlPath(family.id);
      shortRsvpUrl = `${appUrl}${shortPath}`;
    } catch (err) {
      console.warn('[TWILIO_INBOUND] Failed to generate short URL, will use long URL:', err);
    }

    // --- Fetch the active invitation template ----------------------------
    // Use the wedding-day template override on the day of the wedding,
    // otherwise use the standard invitation template.
    let invitationTemplate: InvitationTemplateContext | null = null;
    const activeTemplateId =
      isWeddingDay(family.wedding.wedding_date) && family.wedding.wedding_day_invitation_template_id
        ? family.wedding.wedding_day_invitation_template_id
        : family.wedding.invitation_template_id;

    if (activeTemplateId) {
      try {
        const template = await prisma.invitationTemplate.findUnique({
          where: { id: activeTemplateId },
          select: { design: true },
        });
        if (template) {
          invitationTemplate = { design: template.design as unknown as TemplateDesign };
        }
      } catch (err) {
        console.warn('[TWILIO_INBOUND] Failed to fetch invitation template, proceeding without it:', err);
      }
    }

    const aiReply = await generateWeddingReply(
      body,
      family.wedding,
      {
        name: family.name,
        magic_token: family.magic_token,
        preferred_language: family.preferred_language,
        members: family.members,
      },
      language,
      shortRsvpUrl,
      invitationTemplate
    );

    if (!aiReply) {
      console.warn('[TWILIO_INBOUND] AI returned no reply for family', family.id);
      return emptyTwiML();
    }

    // --- Update MESSAGE_RECEIVED event with the AI reply -----------------
    // This lets admins see the full conversation (message + reply) in one place.
    if (messageReceivedEventId) {
      try {
        await retryDbOperation(() =>
          prisma.trackingEvent.update({
            where: { id: messageReceivedEventId },
            data: {
              metadata: {
                message_sid: messageSid,
                from: fromPhone,
                body: body.substring(0, 1000),
                ai_reply: aiReply,
              },
            },
          })
        );
      } catch (err) {
        console.error('[TWILIO_INBOUND] Failed to update MESSAGE_RECEIVED with AI reply after retries:', err);
      }
    }

    // --- Track the AI reply as its own event (for engagement analytics) --
    try {
      await retryDbOperation(() =>
        prisma.trackingEvent.create({
          data: {
            family_id: family.id,
            wedding_id: family.wedding_id,
            event_type: 'AI_REPLY_SENT',
            channel: 'WHATSAPP',
            metadata: {
              message_sid: messageSid,
              reply_preview: aiReply.substring(0, 300),
            },
            admin_triggered: false,
          },
        })
      );
    } catch (err) {
      console.error('[TWILIO_INBOUND] Failed to track AI_REPLY_SENT after retries:', err);
    }

    // --- Return TwiML reply ----------------------------------------------
    return messageTwiML(aiReply);
  } catch (error) {
    console.error('[TWILIO_INBOUND] Unhandled error:', error);
    // Always return 200 + empty TwiML so Twilio does not retry
    return emptyTwiML();
  }
}
