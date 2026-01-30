/**
 * Twilio Webhook Signature Validator
 * Validates webhook requests from Twilio using HMAC-SHA1
 *
 * Reference: https://www.twilio.com/docs/usage/webhooks/webhooks-security
 */

import crypto from 'crypto';

/**
 * Validate Twilio webhook request signature
 *
 * @param url - The full URL of the webhook endpoint (including query parameters)
 * @param params - Form parameters sent by Twilio
 * @param signature - The X-Twilio-Signature header value
 * @param authToken - Your Twilio AUTH_TOKEN
 * @returns true if signature is valid, false otherwise
 */
export function validateTwilioSignature(
  url: string,
  params: Record<string, string | string[]>,
  signature: string,
  authToken: string
): boolean {
  try {
    // Build the data string for validation
    // Sort parameters by key and append them to the URL
    const keys = Object.keys(params).sort();
    let data = url;

    for (const key of keys) {
      const value = params[key];
      // Handle both single values and arrays
      const strValue = Array.isArray(value) ? value[0] : value;
      data += key + strValue;
    }

    // Compute HMAC-SHA1 signature
    const computedSignature = crypto
      .createHmac('sha1', authToken)
      .update(data, 'utf-8')
      .digest('base64');

    // Compare signatures using constant-time comparison to prevent timing attacks
    return crypto.timingSafeEqual(
      Buffer.from(signature || ''),
      Buffer.from(computedSignature)
    );
  } catch (error) {
    // Log and return false on any error (including signature mismatch)
    console.error('[TWILIO_VALIDATOR] Validation error:', error);
    return false;
  }
}

/**
 * Extract Twilio message status from webhook parameters
 */
export type MessageStatus = 'queued' | 'failed' | 'sent' | 'delivered' | 'undelivered' | 'read';

/**
 * Map Twilio message status to our EventType
 */
export function mapTwilioStatusToEventType(
  status: string
): 'MESSAGE_DELIVERED' | 'MESSAGE_READ' | 'MESSAGE_FAILED' | null {
  switch (status) {
    case 'delivered':
      return 'MESSAGE_DELIVERED';
    case 'read':
      return 'MESSAGE_READ';
    case 'failed':
    case 'undelivered':
      return 'MESSAGE_FAILED';
    default:
      // Ignore queued and sent statuses
      return null;
  }
}
