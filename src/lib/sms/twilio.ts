/**
 * Twilio SMS and WhatsApp Service
 * Handles transactional messaging via SMS and WhatsApp
 */

import twilio from 'twilio';

// Initialize Twilio client lazily to avoid build-time API key requirement
let twilioClient: ReturnType<typeof twilio> | null = null;

function getTwilioClient() {
  if (!twilioClient) {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;

    if (!accountSid || !authToken) {
      throw new Error('Missing credentials');
    }

    twilioClient = twilio(accountSid, authToken);
  }
  return twilioClient;
}

// Twilio configuration
const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER;
const TWILIO_WHATSAPP_NUMBER = process.env.TWILIO_WHATSAPP_NUMBER || 'whatsapp:+14155238886'; // Twilio Sandbox default

export enum MessageType {
  SMS = 'SMS',
  WHATSAPP = 'WHATSAPP',
}

export interface MessageOptions {
  to: string;
  body: string;
  type: MessageType;
  mediaUrl?: string;
}

export interface ContentTemplateOptions {
  to: string;
  contentSid: string;
  contentVariables: Record<string, string>;
}

interface MessageResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

interface TwilioMessageParams {
  body: string;
  from: string;
  to: string;
  mediaUrl?: string[];
  statusCallback?: string;
}

/**
 * Validate phone number format (basic validation)
 */
function isValidPhoneNumber(phone: string): boolean {
  // Remove whatsapp: prefix if present
  const cleanPhone = phone.replace('whatsapp:', '').trim();
  // Basic validation: starts with + and has at least 10 digits
  const phoneRegex = /^\+[1-9]\d{9,14}$/;
  return phoneRegex.test(cleanPhone);
}

/**
 * Format phone number for Twilio
 */
function formatPhoneNumber(phone: string, type: MessageType): string {
  // Remove any whitespace
  let formattedPhone = phone.trim();

  // Add + if not present
  if (!formattedPhone.startsWith('+')) {
    formattedPhone = '+' + formattedPhone;
  }

  // Add whatsapp: prefix for WhatsApp messages
  if (type === MessageType.WHATSAPP && !formattedPhone.startsWith('whatsapp:')) {
    formattedPhone = 'whatsapp:' + formattedPhone;
  }

  return formattedPhone;
}

/**
 * Send a single message via SMS or WhatsApp with retry logic
 */
export async function sendMessage(
  options: MessageOptions,
  retries = 3
): Promise<MessageResult> {
  try {
    const { to, body, type, mediaUrl } = options;

    // Validate phone number
    if (!isValidPhoneNumber(to)) {
      return {
        success: false,
        error: `Invalid phone number format: ${to}`,
      };
    }

    // Get appropriate from number
    const fromNumber = type === MessageType.WHATSAPP
      ? TWILIO_WHATSAPP_NUMBER
      : TWILIO_PHONE_NUMBER;

    if (!fromNumber) {
      const envVar = type === MessageType.WHATSAPP
        ? 'TWILIO_WHATSAPP_NUMBER'
        : 'TWILIO_PHONE_NUMBER';
      return {
        success: false,
        error: `${envVar} environment variable is not set`,
      };
    }

    // Format phone numbers
    const formattedTo = formatPhoneNumber(to, type);
    const formattedFrom = type === MessageType.WHATSAPP && !fromNumber.startsWith('whatsapp:')
      ? 'whatsapp:' + fromNumber
      : fromNumber;

    // Prepare message params
    const messageParams: TwilioMessageParams = {
      body,
      from: formattedFrom,
      to: formattedTo,
    };

    // Add media URL if provided (for WhatsApp)
    if (mediaUrl && type === MessageType.WHATSAPP) {
      messageParams.mediaUrl = [mediaUrl];
    }

    // Add status callback URL for delivery and read receipts (only if webhook is enabled)
    const appUrl = process.env.APP_URL || 'http://localhost:3000';
    const webhookEnabled = process.env.TWILIO_WEBHOOK_ENABLED !== 'false';
    const isLocalhost = appUrl.includes('localhost') || appUrl.includes('127.0.0.1');

    if (webhookEnabled && !isLocalhost) {
      messageParams.statusCallback = `${appUrl}/api/webhooks/twilio/status`;
    }

    // Send message
    const client = getTwilioClient();
    console.log('[TWILIO] Sending message with params:', {
      from: messageParams.from,
      to: messageParams.to,
      bodyLength: messageParams.body.length,
      accountSid: process.env.TWILIO_ACCOUNT_SID?.slice(0, 10) + '...',
    });
    const message = await client.messages.create(messageParams);

    console.log(`✅ ${type} message sent successfully:`, {
      messageId: message.sid,
      to: formattedTo,
      status: message.status,
    });

    return {
      success: true,
      messageId: message.sid,
    };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`❌ Failed to send ${options.type} message:`, error);

    // Retry logic
    if (retries > 0) {
      console.log(`⏳ Retrying... (${retries} attempts remaining)`);
      await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
      return sendMessage(options, retries - 1);
    }

    return {
      success: false,
      error: errorMessage || 'Failed to send message',
    };
  }
}

/**
 * Send bulk messages with rate limiting
 */
export async function sendBulkMessages(
  messages: MessageOptions[],
  delayMs = 1000 // Delay between messages to avoid rate limits
): Promise<MessageResult[]> {
  const results: MessageResult[] = [];

  for (const messageOptions of messages) {
    const result = await sendMessage(messageOptions);
    results.push(result);

    // Add delay between messages if not the last one
    if (messageOptions !== messages[messages.length - 1]) {
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }

  return results;
}

/**
 * Send dynamic message from database template
 */
export async function sendDynamicMessage(
  to: string,
  body: string,
  type: MessageType,
  mediaUrl?: string
): Promise<MessageResult> {
  return sendMessage({
    to,
    body,
    type,
    mediaUrl,
  });
}

/**
 * Helper: Send SMS
 */
export async function sendSMS(
  to: string,
  body: string
): Promise<MessageResult> {
  return sendMessage({
    to,
    body,
    type: MessageType.SMS,
  });
}

/**
 * Helper: Send WhatsApp message
 */
export async function sendWhatsApp(
  to: string,
  body: string,
  mediaUrl?: string
): Promise<MessageResult> {
  return sendMessage({
    to,
    body,
    type: MessageType.WHATSAPP,
    mediaUrl,
  });
}

/**
 * Send WhatsApp message using Twilio Content Template API
 * Uses approved Meta templates with variable substitution
 */
export async function sendWhatsAppWithContentTemplate(
  to: string,
  contentSid: string,
  contentVariables: Record<string, string>,
  retries = 3
): Promise<MessageResult> {
  try {
    // Validate phone number
    if (!isValidPhoneNumber(to)) {
      return {
        success: false,
        error: `Invalid phone number format: ${to}`,
      };
    }

    // Get Twilio WhatsApp number
    const fromNumber = TWILIO_WHATSAPP_NUMBER;
    if (!fromNumber) {
      return {
        success: false,
        error: "TWILIO_WHATSAPP_NUMBER environment variable is not set",
      };
    }

    // Format phone number
    const formattedTo = formatPhoneNumber(to, MessageType.WHATSAPP);
    const formattedFrom = !fromNumber.startsWith("whatsapp:")
      ? "whatsapp:" + fromNumber
      : fromNumber;

    // Send message using Content Template API
    const client = getTwilioClient();
    console.log("[TWILIO] Sending WhatsApp message with content template:", {
      from: formattedFrom,
      to: formattedTo,
      contentSid,
      accountSid: process.env.TWILIO_ACCOUNT_SID?.slice(0, 10) + "...",
    });

    const message = await client.messages.create({
      contentSid,
      contentVariables: JSON.stringify(contentVariables),
      from: formattedFrom,
      to: formattedTo,
    });

    console.log("✅ WhatsApp message with content template sent successfully:", {
      messageId: message.sid,
      to: formattedTo,
      status: message.status,
    });

    return {
      success: true,
      messageId: message.sid,
    };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("❌ Failed to send WhatsApp content template message:", error);

    // Retry logic
    if (retries > 0) {
      console.log(`⏳ Retrying... (${retries} attempts remaining)`);
      await new Promise((resolve) => setTimeout(resolve, 1000));
      return sendWhatsAppWithContentTemplate(
        to,
        contentSid,
        contentVariables,
        retries - 1
      );
    }

    return {
      success: false,
      error: errorMessage || "Failed to send WhatsApp message",
    };
  }
}
