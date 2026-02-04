/**
 * WhatsApp Links Utility
 *
 * Generates wa.me URLs for the LINKS sending mode.
 * Instead of sending via Twilio, these URLs are returned to the frontend
 * so the admin can open them in a new browser tab.
 */

/**
 * Strip all non-digit characters from a phone number and return digits only.
 * wa.me expects E.164 digits without the leading '+'.
 */
function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, '');
}

/**
 * Build a wa.me URL for the given phone number and message text.
 *
 * @param phone - Phone number in any common format (+34 612 345 678, etc.)
 * @param message - Plain-text message body (will be URL-encoded)
 * @returns Full wa.me URL, e.g. https://wa.me/34612345678?text=Hello
 */
export function buildWhatsAppLink(phone: string, message: string): string {
  const digits = normalizePhone(phone);
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}
