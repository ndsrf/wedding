/**
 * Unit tests for Confirmation Notification Service
 * Tests automatic confirmation email/SMS sending after RSVP submission
 */

import { sendConfirmation } from '@/lib/notifications/confirmation';
import { prisma } from '@/lib/db/prisma';
import { getTemplateForSending } from '@/lib/templates/crud';
import { sendDynamicEmail } from '@/lib/email/resend';
import { sendDynamicMessage } from '@/lib/sms/twilio';

// Mock dependencies
jest.mock('@/lib/db/prisma', () => ({
  prisma: {
    family: {
      findUnique: jest.fn(),
    },
  },
}));

jest.mock('@/lib/templates/crud', () => ({
  getTemplateForSending: jest.fn(),
}));

jest.mock('@/lib/email/resend', () => ({
  sendDynamicEmail: jest.fn(),
}));

jest.mock('@/lib/sms/twilio', () => ({
  sendDynamicMessage: jest.fn(),
  MessageType: {
    SMS: 'SMS',
    WHATSAPP: 'WHATSAPP',
  },
}));

jest.mock('@/lib/tracking/events', () => ({
  trackEvent: jest.fn(),
}));

jest.mock('@/lib/date-formatter', () => ({
  formatDateByLanguage: jest.fn((date: Date) => date.toISOString()),
}));

jest.mock('@/lib/short-url', () => ({
  getShortUrlPath: jest.fn(() => Promise.resolve('/rsvp/token123')),
}));

describe('Confirmation Notification Service', () => {
  const mockFamily = {
    id: 'family1',
    name: 'Smith Family',
    email: 'smith@example.com',
    phone: '+34612345678',
    whatsapp_number: '+34612345678',
    preferred_language: 'EN',
    channel_preference: 'EMAIL',
    wedding: {
      id: 'wedding1',
      couple_names: 'John & Jane',
      wedding_date: new Date('2024-06-15'),
      wedding_time: '16:00',
      location: 'Grand Ballroom',
      rsvp_cutoff_date: new Date('2024-05-31'),
      whatsapp_mode: 'BUSINESS',
    },
    members: [
      {
        id: 'member1',
        name: 'John Smith',
        attending: true,
        created_at: new Date(),
      },
    ],
  };

  const mockTemplate = {
    id: 'template1',
    subject: 'RSVP Confirmation - {{coupleNames}} Wedding',
    body: `Dear {{familyName}},

Thank you for your RSVP to {{coupleNames}} wedding on {{weddingDate}}.

Your response has been recorded successfully.

Best regards`,
    type: 'CONFIRMATION',
    channel: 'EMAIL',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.APP_URL = 'https://wedding.com';
  });

  describe('Email Confirmations', () => {
    it('should send email confirmation successfully', async () => {
      (prisma.family.findUnique as jest.Mock).mockResolvedValue(mockFamily);
      (getTemplateForSending as jest.Mock).mockResolvedValue(mockTemplate);
      (sendDynamicEmail as jest.Mock).mockResolvedValue({
        success: true,
        messageId: 'email-123',
      });

      const result = await sendConfirmation({
        family_id: 'family1',
        wedding_id: 'wedding1',
      });

      expect(result.success).toBe(true);
      expect(result.messageId).toBe('email-123');
      expect(sendDynamicEmail).toHaveBeenCalled();
    });

    it('should return error when family not found', async () => {
      (prisma.family.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await sendConfirmation({
        family_id: 'invalid',
        wedding_id: 'wedding1',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Family not found');
    });

    it('should return error when template not found', async () => {
      (prisma.family.findUnique as jest.Mock).mockResolvedValue(mockFamily);
      (getTemplateForSending as jest.Mock).mockResolvedValue(null);

      const result = await sendConfirmation({
        family_id: 'family1',
        wedding_id: 'wedding1',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Template not found');
    });

    it('should return error when family has no email', async () => {
      const familyWithoutEmail = { ...mockFamily, email: null };
      (prisma.family.findUnique as jest.Mock).mockResolvedValue(familyWithoutEmail);
      (getTemplateForSending as jest.Mock).mockResolvedValue(mockTemplate);

      const result = await sendConfirmation({
        family_id: 'family1',
        wedding_id: 'wedding1',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('no email');
    });
  });

  describe('SMS Confirmations', () => {
    it('should send SMS confirmation successfully', async () => {
      const smsFamily = {
        ...mockFamily,
        channel_preference: 'SMS',
      };

      const smsTemplate = {
        ...mockTemplate,
        channel: 'SMS',
      };

      (prisma.family.findUnique as jest.Mock).mockResolvedValue(smsFamily);
      (getTemplateForSending as jest.Mock).mockResolvedValue(smsTemplate);
      (sendDynamicMessage as jest.Mock).mockResolvedValue({
        success: true,
        messageId: 'sms-123',
      });

      const result = await sendConfirmation({
        family_id: 'family1',
        wedding_id: 'wedding1',
      });

      expect(result.success).toBe(true);
      expect(sendDynamicMessage).toHaveBeenCalled();
    });

    it('should fallback to email when no phone number', async () => {
      const familyWithoutPhone = {
        ...mockFamily,
        channel_preference: 'SMS',
        phone: null,
      };

      (prisma.family.findUnique as jest.Mock).mockResolvedValue(familyWithoutPhone);
      (getTemplateForSending as jest.Mock).mockResolvedValue(mockTemplate);
      (sendDynamicEmail as jest.Mock).mockResolvedValue({
        success: true,
        messageId: 'email-123',
      });

      const result = await sendConfirmation({
        family_id: 'family1',
        wedding_id: 'wedding1',
      });

      expect(result.success).toBe(true);
      expect(sendDynamicEmail).toHaveBeenCalled();
      expect(sendDynamicMessage).not.toHaveBeenCalled();
    });
  });

  describe('WhatsApp Confirmations - Business Mode', () => {
    it('should send WhatsApp confirmation in business mode', async () => {
      const whatsappFamily = {
        ...mockFamily,
        channel_preference: 'WHATSAPP',
      };

      const whatsappTemplate = {
        ...mockTemplate,
        channel: 'WHATSAPP',
      };

      (prisma.family.findUnique as jest.Mock).mockResolvedValue(whatsappFamily);
      (getTemplateForSending as jest.Mock).mockResolvedValue(whatsappTemplate);
      (sendDynamicMessage as jest.Mock).mockResolvedValue({
        success: true,
        messageId: 'whatsapp-123',
      });

      const result = await sendConfirmation({
        family_id: 'family1',
        wedding_id: 'wedding1',
      });

      expect(result.success).toBe(true);
      expect(sendDynamicMessage).toHaveBeenCalled();
    });

    it('should skip WhatsApp in LINKS mode (no browser context)', async () => {
      const whatsappFamily = {
        ...mockFamily,
        channel_preference: 'WHATSAPP',
        wedding: {
          ...mockFamily.wedding,
          whatsapp_mode: 'LINKS',
        },
      };

      const whatsappTemplate = {
        ...mockTemplate,
        channel: 'WHATSAPP',
      };

      (prisma.family.findUnique as jest.Mock).mockResolvedValue(whatsappFamily);
      (getTemplateForSending as jest.Mock).mockResolvedValue(whatsappTemplate);

      await sendConfirmation({
        family_id: 'family1',
        wedding_id: 'wedding1',
      });

      // Should fallback to email or skip entirely
      expect(sendDynamicMessage).not.toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        'WHATSAPP',
        expect.anything()
      );
    });
  });

  describe('Template Variable Substitution', () => {
    it('should replace all template variables', async () => {
      (prisma.family.findUnique as jest.Mock).mockResolvedValue(mockFamily);
      (getTemplateForSending as jest.Mock).mockResolvedValue(mockTemplate);
      (sendDynamicEmail as jest.Mock).mockImplementation((_to, _subject, body) => {
        expect(body).toContain('Smith Family');
        expect(body).toContain('John & Jane');
        expect(body).not.toContain('{{familyName}}');
        expect(body).not.toContain('{{coupleNames}}');
        return Promise.resolve({ success: true, messageId: 'email-123' });
      });

      await sendConfirmation({
        family_id: 'family1',
        wedding_id: 'wedding1',
      });

      expect(sendDynamicEmail).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should handle email send failure', async () => {
      (prisma.family.findUnique as jest.Mock).mockResolvedValue(mockFamily);
      (getTemplateForSending as jest.Mock).mockResolvedValue(mockTemplate);
      (sendDynamicEmail as jest.Mock).mockResolvedValue({
        success: false,
        error: 'SMTP error',
      });

      const result = await sendConfirmation({
        family_id: 'family1',
        wedding_id: 'wedding1',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to send');
    });

    it('should handle database errors gracefully', async () => {
      (prisma.family.findUnique as jest.Mock).mockRejectedValue(
        new Error('Database connection failed')
      );

      const result = await sendConfirmation({
        family_id: 'family1',
        wedding_id: 'wedding1',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should handle missing wedding data', async () => {
      const familyWithoutWedding = {
        ...mockFamily,
        wedding: null,
      };

      (prisma.family.findUnique as jest.Mock).mockResolvedValue(familyWithoutWedding);

      const result = await sendConfirmation({
        family_id: 'family1',
        wedding_id: 'wedding1',
      });

      expect(result.success).toBe(false);
    });
  });
});
