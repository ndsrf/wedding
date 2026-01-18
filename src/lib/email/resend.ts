/**
 * Resend Email Service
 * Handles transactional emails with multi-language support
 */

import { Resend } from 'resend';
import { Language } from '../i18n/config';
import { PlannerInvitationEmail } from './templates/planner-invitation';
import { AdminInvitationEmail } from './templates/admin-invitation';
import { RSVPReminderEmail } from './templates/rsvp-reminder';
import { RSVPConfirmationEmail } from './templates/rsvp-confirmation';
import { PaymentConfirmationEmail } from './templates/payment-confirmation';

// Initialize Resend client
const resend = new Resend(process.env.RESEND_API_KEY);

// Email sender configuration
const FROM_EMAIL = process.env.EMAIL_FROM || 'noreply@weddingapp.com';
const FROM_NAME = process.env.EMAIL_FROM_NAME || 'Wedding Management Platform';

export enum EmailTemplate {
  PLANNER_INVITATION = 'planner_invitation',
  ADMIN_INVITATION = 'admin_invitation',
  RSVP_REMINDER = 'rsvp_reminder',
  RSVP_CONFIRMATION = 'rsvp_confirmation',
  PAYMENT_CONFIRMATION = 'payment_confirmation',
}

export interface EmailOptions {
  to: string;
  template: EmailTemplate;
  language: Language;
  variables: Record<string, string>;
}

interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Validate email address format
 */
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Get email template component based on template type
 */
function getTemplateComponent(
  template: EmailTemplate,
  language: Language,
  variables: Record<string, string>
): React.ReactElement {
  const props = { language, ...variables };
  
  switch (template) {
    case EmailTemplate.PLANNER_INVITATION:
      return PlannerInvitationEmail(props as Parameters<typeof PlannerInvitationEmail>[0]);
    case EmailTemplate.ADMIN_INVITATION:
      return AdminInvitationEmail(props as Parameters<typeof AdminInvitationEmail>[0]);
    case EmailTemplate.RSVP_REMINDER:
      return RSVPReminderEmail(props as Parameters<typeof RSVPReminderEmail>[0]);
    case EmailTemplate.RSVP_CONFIRMATION:
      return RSVPConfirmationEmail(props as Parameters<typeof RSVPConfirmationEmail>[0]);
    case EmailTemplate.PAYMENT_CONFIRMATION:
      return PaymentConfirmationEmail(props as Parameters<typeof PaymentConfirmationEmail>[0]);
    default:
      throw new Error(`Unknown email template: ${template}`);
  }
}

/**
 * Get email subject based on template and language
 */
function getEmailSubject(template: EmailTemplate, language: Language): string {
  const subjects: Record<EmailTemplate, Record<Language, string>> = {
    [EmailTemplate.PLANNER_INVITATION]: {
      es: 'Invitación a la Plataforma de Gestión de Bodas',
      en: 'Invitation to Wedding Management Platform',
      fr: 'Invitation à la Plateforme de Gestion de Mariages',
      it: 'Invito alla Piattaforma di Gestione Matrimoni',
      de: 'Einladung zur Hochzeitsverwaltungsplattform',
    },
    [EmailTemplate.ADMIN_INVITATION]: {
      es: 'Invitación para Administrar tu Boda',
      en: 'Invitation to Manage Your Wedding',
      fr: 'Invitation à Gérer Votre Mariage',
      it: 'Invito a Gestire il Tuo Matrimonio',
      de: 'Einladung zur Verwaltung Ihrer Hochzeit',
    },
    [EmailTemplate.RSVP_REMINDER]: {
      es: 'Recordatorio: Confirma tu Asistencia',
      en: 'Reminder: Confirm Your Attendance',
      fr: 'Rappel: Confirmez Votre Présence',
      it: 'Promemoria: Conferma la Tua Presenza',
      de: 'Erinnerung: Bestätigen Sie Ihre Teilnahme',
    },
    [EmailTemplate.RSVP_CONFIRMATION]: {
      es: '¡Gracias por Confirmar tu Asistencia!',
      en: 'Thank You for Confirming Your Attendance!',
      fr: 'Merci d\'Avoir Confirmé Votre Présence!',
      it: 'Grazie per Aver Confermato la Tua Presenza!',
      de: 'Vielen Dank für Ihre Bestätigung!',
    },
    [EmailTemplate.PAYMENT_CONFIRMATION]: {
      es: 'Confirmación de Pago Recibido',
      en: 'Payment Received Confirmation',
      fr: 'Confirmation de Paiement Reçu',
      it: 'Conferma di Pagamento Ricevuto',
      de: 'Zahlungsbestätigung Erhalten',
    },
  };

  return subjects[template][language];
}

/**
 * Send a single email with retry logic
 */
export async function sendEmail(
  options: EmailOptions,
  retries = 3
): Promise<EmailResult> {
  const { to, template, language, variables } = options;

  console.log('[RESEND DEBUG] sendEmail called with:', { to, template, language, variables });

  // Validate email address
  if (!isValidEmail(to)) {
    console.error(`Invalid email address: ${to}`);
    return {
      success: false,
      error: 'Invalid email address',
    };
  }

  // Validate Resend API key
  if (!process.env.RESEND_API_KEY) {
    console.error('RESEND_API_KEY is not configured');
    return {
      success: false,
      error: 'Email service not configured',
    };
  }

  console.log('[RESEND DEBUG] API key present, FROM:', `${FROM_NAME} <${FROM_EMAIL}>`);

  let lastError: Error | null = null;

  // Retry logic
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const subject = getEmailSubject(template, language);
      console.log('[RESEND DEBUG] Subject:', subject);

      const react = getTemplateComponent(template, language, variables);
      console.log('[RESEND DEBUG] React component created, attempting to send...');

      const { data, error } = await resend.emails.send({
        from: `${FROM_NAME} <${FROM_EMAIL}>`,
        to: [to],
        subject,
        react,
      });

      console.log('[RESEND DEBUG] Resend API response:', { data, error });

      if (error) {
        throw new Error(error.message);
      }

      console.log(`Email sent successfully to ${to} (template: ${template}, language: ${language})`);
      return {
        success: true,
        messageId: data?.id,
      };
    } catch (error) {
      lastError = error as Error;
      console.error(`Email send attempt ${attempt}/${retries} failed:`, error);

      // Wait before retrying (exponential backoff)
      if (attempt < retries) {
        await new Promise((resolve) => setTimeout(resolve, Math.pow(2, attempt) * 1000));
      }
    }
  }

  // All retries failed
  console.error(`Failed to send email to ${to} after ${retries} attempts:`, lastError);
  return {
    success: false,
    error: lastError?.message || 'Unknown error',
  };
}

/**
 * Send bulk emails (e.g., reminders)
 * Processes emails in batches to avoid rate limits
 */
export async function sendBulkEmail(
  emails: EmailOptions[],
  batchSize = 10
): Promise<{
  total: number;
  successful: number;
  failed: number;
  results: EmailResult[];
}> {
  const results: EmailResult[] = [];
  let successful = 0;
  let failed = 0;

  console.log(`Starting bulk email send: ${emails.length} emails`);

  // Process in batches
  for (let i = 0; i < emails.length; i += batchSize) {
    const batch = emails.slice(i, i + batchSize);

    // Send batch concurrently
    const batchResults = await Promise.all(
      batch.map((emailOptions) => sendEmail(emailOptions))
    );

    // Aggregate results
    batchResults.forEach((result) => {
      results.push(result);
      if (result.success) {
        successful++;
      } else {
        failed++;
      }
    });

    // Log progress
    console.log(`Processed batch ${Math.floor(i / batchSize) + 1}: ${successful} successful, ${failed} failed`);

    // Wait between batches to respect rate limits
    if (i + batchSize < emails.length) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  console.log(`Bulk email send complete: ${successful}/${emails.length} successful`);

  return {
    total: emails.length,
    successful,
    failed,
    results,
  };
}

/**
 * Helper function to send planner invitation
 */
export async function sendPlannerInvitation(
  to: string,
  language: Language,
  plannerName: string,
  oauthLink: string
): Promise<EmailResult> {
  return sendEmail({
    to,
    template: EmailTemplate.PLANNER_INVITATION,
    language,
    variables: {
      plannerName,
      oauthLink,
    },
  });
}

/**
 * Helper function to send admin invitation
 */
export async function sendAdminInvitation(
  to: string,
  language: Language,
  adminName: string,
  coupleNames: string,
  weddingDate: string,
  oauthLink: string
): Promise<EmailResult> {
  return sendEmail({
    to,
    template: EmailTemplate.ADMIN_INVITATION,
    language,
    variables: {
      adminName,
      coupleNames,
      weddingDate,
      oauthLink,
    },
  });
}

/**
 * Helper function to send RSVP reminder
 */
export async function sendRSVPReminder(
  to: string,
  language: Language,
  familyName: string,
  coupleNames: string,
  weddingDate: string,
  magicLink: string
): Promise<EmailResult> {
  return sendEmail({
    to,
    template: EmailTemplate.RSVP_REMINDER,
    language,
    variables: {
      familyName,
      coupleNames,
      weddingDate,
      magicLink,
    },
  });
}

/**
 * Helper function to send RSVP confirmation
 */
export async function sendRSVPConfirmation(
  to: string,
  language: Language,
  familyName: string,
  coupleNames: string,
  weddingDate: string
): Promise<EmailResult> {
  return sendEmail({
    to,
    template: EmailTemplate.RSVP_CONFIRMATION,
    language,
    variables: {
      familyName,
      coupleNames,
      weddingDate,
    },
  });
}

/**
 * Helper function to send payment confirmation
 */
export async function sendPaymentConfirmation(
  to: string,
  language: Language,
  familyName: string,
  coupleNames: string,
  amount: string
): Promise<EmailResult> {
  return sendEmail({
    to,
    template: EmailTemplate.PAYMENT_CONFIRMATION,
    language,
    variables: {
      familyName,
      coupleNames,
      amount,
    },
  });
}
