/**
 * Unit Tests for Invitation Service
 * Tests invitation sending logic with various channels and modes
 */

import { sendInvitation, sendInvitationsBulk } from '@/lib/notifications/invitation';
import { prisma } from '@/lib/db/prisma';
import { getTemplateForSending } from '@/lib/templates/crud';
import { sendDynamicEmail } from '@/lib/email/resend';
import { sendDynamicMessage } from '@/lib/sms/twilio';
import { buildWhatsAppLink } from '@/lib/notifications/whatsapp-links';

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
  formatDateByLanguage: jest.fn((date: Date) => date.toISOString().split('T')[0]),
}));

jest.mock('@/lib/short-url', () => ({
  getShortUrlPath: jest.fn(() => Promise.resolve('/s/ABC123')),
}));

jest.mock('@/lib/notifications/whatsapp-links', () => ({
  buildWhatsAppLink: jest.fn((phone, message) => `https://wa.me/${phone}?text=${message}`),
}));

describe('Invitation Service - Send Invitation', () => {
  const mockFamily = {
    id: 'family1',
    name: 'Smith Family',
    email: 'smith@example.com',
    phone: '+34612345678',
    whatsapp_number: '+34612345678',
    preferred_language: 'EN',
    channel_preference: 'EMAIL',
    reference_code: 'REF123',
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
        created_at: new Date(),
      },
    ],
  };

  const mockTemplate = {
    id: 'template1',
    subject: 'Wedding Invitation - {{coupleNames}}',
    body: `Dear {{familyName}},

You are invited to {{coupleNames}} wedding on {{weddingDate}}.

RSVP: {{magicLink}}`,
    type: 'INVITATION',
    channel: 'EMAIL',
    image_url: null,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.APP_URL = 'https://wedding.com';
  });

  describe('Email Channel', () => {
    it('should send email invitation successfully', async () => {
      (prisma.family.findUnique as jest.Mock).mockResolvedValue(mockFamily);
      (getTemplateForSending as jest.Mock).mockResolvedValue(mockTemplate);
      (sendDynamicEmail as jest.Mock).mockResolvedValue({
        success: true,
        messageId: 'email-123',
      });

      const result = await sendInvitation({
        family_id: 'family1',
        wedding_id: 'wedding1',
        admin_id: 'admin1',
      });

      expect(result.success).toBe(true);
      expect(result.messageId).toBe('email-123');
      expect(sendDynamicEmail).toHaveBeenCalled();
    });

    it('should replace template variables in email', async () => {
      (prisma.family.findUnique as jest.Mock).mockResolvedValue(mockFamily);
      (getTemplateForSending as jest.Mock).mockResolvedValue(mockTemplate);
      (sendDynamicEmail as jest.Mock).mockImplementation((_to, subject, body) => {
        expect(subject).toContain('John & Jane');
        expect(body).toContain('Smith Family');
        expect(body).not.toContain('{{familyName}}');
        expect(body).not.toContain('{{coupleNames}}');
        return Promise.resolve({ success: true, messageId: 'email-123' });
      });

      await sendInvitation({
        family_id: 'family1',
        wedding_id: 'wedding1',
        admin_id: 'admin1',
      });

      expect(sendDynamicEmail).toHaveBeenCalled();
    });

    it('should return error when family has no email', async () => {
      const familyWithoutEmail = { ...mockFamily, email: null };
      (prisma.family.findUnique as jest.Mock).mockResolvedValue(familyWithoutEmail);
      (getTemplateForSending as jest.Mock).mockResolvedValue(mockTemplate);

      const result = await sendInvitation({
        family_id: 'family1',
        wedding_id: 'wedding1',
        admin_id: 'admin1',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('no email');
    });
  });

  describe('SMS Channel', () => {
    it('should send SMS invitation successfully', async () => {
      const smsFamily = { ...mockFamily, channel_preference: 'SMS' };
      const smsTemplate = { ...mockTemplate, channel: 'SMS' };

      (prisma.family.findUnique as jest.Mock).mockResolvedValue(smsFamily);
      (getTemplateForSending as jest.Mock).mockResolvedValue(smsTemplate);
      (sendDynamicMessage as jest.Mock).mockResolvedValue({
        success: true,
        messageId: 'sms-123',
      });

      const result = await sendInvitation({
        family_id: 'family1',
        wedding_id: 'wedding1',
        admin_id: 'admin1',
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

      const result = await sendInvitation({
        family_id: 'family1',
        wedding_id: 'wedding1',
        admin_id: 'admin1',
      });

      expect(result.success).toBe(true);
      expect(sendDynamicEmail).toHaveBeenCalled();
      expect(sendDynamicMessage).not.toHaveBeenCalled();
    });
  });

  describe('WhatsApp Channel - Business Mode', () => {
    it('should send WhatsApp invitation in business mode', async () => {
      const whatsappFamily = {
        ...mockFamily,
        channel_preference: 'WHATSAPP',
      };
      const whatsappTemplate = { ...mockTemplate, channel: 'WHATSAPP' };

      (prisma.family.findUnique as jest.Mock).mockResolvedValue(whatsappFamily);
      (getTemplateForSending as jest.Mock).mockResolvedValue(whatsappTemplate);
      (sendDynamicMessage as jest.Mock).mockResolvedValue({
        success: true,
        messageId: 'whatsapp-123',
      });

      const result = await sendInvitation({
        family_id: 'family1',
        wedding_id: 'wedding1',
        admin_id: 'admin1',
      });

      expect(result.success).toBe(true);
      expect(sendDynamicMessage).toHaveBeenCalled();
    });

    it('should fallback to email when no whatsapp number', async () => {
      const familyWithoutWhatsApp = {
        ...mockFamily,
        channel_preference: 'WHATSAPP',
        whatsapp_number: null,
      };

      (prisma.family.findUnique as jest.Mock).mockResolvedValue(familyWithoutWhatsApp);
      (getTemplateForSending as jest.Mock).mockResolvedValue(mockTemplate);
      (sendDynamicEmail as jest.Mock).mockResolvedValue({
        success: true,
        messageId: 'email-123',
      });

      const result = await sendInvitation({
        family_id: 'family1',
        wedding_id: 'wedding1',
        admin_id: 'admin1',
      });

      expect(result.success).toBe(true);
      expect(sendDynamicEmail).toHaveBeenCalled();
    });
  });

  describe('WhatsApp Channel - Links Mode', () => {
    it('should generate wa.me link in LINKS mode', async () => {
      const whatsappFamily = {
        ...mockFamily,
        channel_preference: 'WHATSAPP',
        wedding: {
          ...mockFamily.wedding,
          whatsapp_mode: 'LINKS',
        },
      };
      const whatsappTemplate = { ...mockTemplate, channel: 'WHATSAPP' };

      (prisma.family.findUnique as jest.Mock).mockResolvedValue(whatsappFamily);
      (getTemplateForSending as jest.Mock).mockResolvedValue(whatsappTemplate);

      const result = await sendInvitation({
        family_id: 'family1',
        wedding_id: 'wedding1',
        admin_id: 'admin1',
      });

      expect(result.success).toBe(true);
      expect(result.waLink).toBeDefined();
      expect(buildWhatsAppLink).toHaveBeenCalled();
      expect(sendDynamicMessage).not.toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should return error when family not found', async () => {
      (prisma.family.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await sendInvitation({
        family_id: 'invalid',
        wedding_id: 'wedding1',
        admin_id: 'admin1',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Family not found');
    });

    it('should return error when template not found', async () => {
      (prisma.family.findUnique as jest.Mock).mockResolvedValue(mockFamily);
      (getTemplateForSending as jest.Mock).mockResolvedValue(null);

      const result = await sendInvitation({
        family_id: 'family1',
        wedding_id: 'wedding1',
        admin_id: 'admin1',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Template not found');
    });

    it('should handle email send failure', async () => {
      (prisma.family.findUnique as jest.Mock).mockResolvedValue(mockFamily);
      (getTemplateForSending as jest.Mock).mockResolvedValue(mockTemplate);
      (sendDynamicEmail as jest.Mock).mockResolvedValue({
        success: false,
        error: 'SMTP error',
      });

      const result = await sendInvitation({
        family_id: 'family1',
        wedding_id: 'wedding1',
        admin_id: 'admin1',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to send');
    });

    it('should handle database errors gracefully', async () => {
      (prisma.family.findUnique as jest.Mock).mockRejectedValue(
        new Error('Database connection failed')
      );

      const result = await sendInvitation({
        family_id: 'family1',
        wedding_id: 'wedding1',
        admin_id: 'admin1',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });
});

describe('Invitation Service - Bulk Send', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should send invitations to multiple families', async () => {
    const mockFamily1 = {
      id: 'family1',
      name: 'Smith Family',
      email: 'smith@example.com',
      preferred_language: 'EN',
      channel_preference: 'EMAIL',
      wedding: { id: 'wedding1', couple_names: 'John & Jane', wedding_date: new Date(), wedding_time: '16:00', location: 'Location', rsvp_cutoff_date: new Date(), whatsapp_mode: 'BUSINESS' },
      members: [],
    };

    const mockFamily2 = {
      id: 'family2',
      name: 'Jones Family',
      email: 'jones@example.com',
      preferred_language: 'EN',
      channel_preference: 'EMAIL',
      wedding: { id: 'wedding1', couple_names: 'John & Jane', wedding_date: new Date(), wedding_time: '16:00', location: 'Location', rsvp_cutoff_date: new Date(), whatsapp_mode: 'BUSINESS' },
      members: [],
    };

    const mockTemplate = {
      id: 'template1',
      subject: 'Invitation',
      body: 'You are invited',
      type: 'INVITATION',
      channel: 'EMAIL',
    };

    (prisma.family.findUnique as jest.Mock)
      .mockResolvedValueOnce(mockFamily1)
      .mockResolvedValueOnce(mockFamily2);
    (getTemplateForSending as jest.Mock).mockResolvedValue(mockTemplate);
    (sendDynamicEmail as jest.Mock).mockResolvedValue({
      success: true,
      messageId: 'email-123',
    });

    const result = await sendInvitationsBulk([
      { family_id: 'family1', wedding_id: 'wedding1', admin_id: 'admin1' },
      { family_id: 'family2', wedding_id: 'wedding1', admin_id: 'admin1' },
    ]);

    expect(result.total).toBe(2);
    expect(result.successful).toBe(2);
    expect(result.failed).toBe(0);
  });

  it('should handle partial failures', async () => {
    const mockFamily = {
      id: 'family1',
      name: 'Smith Family',
      email: 'smith@example.com',
      preferred_language: 'EN',
      channel_preference: 'EMAIL',
      wedding: { id: 'wedding1', couple_names: 'John & Jane', wedding_date: new Date(), wedding_time: '16:00', location: 'Location', rsvp_cutoff_date: new Date(), whatsapp_mode: 'BUSINESS' },
      members: [],
    };

    const mockTemplate = {
      id: 'template1',
      subject: 'Invitation',
      body: 'You are invited',
      type: 'INVITATION',
      channel: 'EMAIL',
    };

    (prisma.family.findUnique as jest.Mock)
      .mockResolvedValueOnce(mockFamily)
      .mockResolvedValueOnce(null);
    (getTemplateForSending as jest.Mock).mockResolvedValue(mockTemplate);
    (sendDynamicEmail as jest.Mock).mockResolvedValue({
      success: true,
      messageId: 'email-123',
    });

    const result = await sendInvitationsBulk([
      { family_id: 'family1', wedding_id: 'wedding1', admin_id: 'admin1' },
      { family_id: 'invalid', wedding_id: 'wedding1', admin_id: 'admin1' },
    ]);

    expect(result.total).toBe(2);
    expect(result.successful).toBe(1);
    expect(result.failed).toBe(1);
    expect(result.errors).toHaveLength(1);
  });

  it('should collect wa.me links for LINKS mode', async () => {
    const whatsappFamily = {
      id: 'family1',
      name: 'Smith Family',
      whatsapp_number: '+34612345678',
      preferred_language: 'EN',
      channel_preference: 'WHATSAPP',
      wedding: {
        id: 'wedding1',
        couple_names: 'John & Jane',
        wedding_date: new Date(),
        wedding_time: '16:00',
        location: 'Location',
        rsvp_cutoff_date: new Date(),
        whatsapp_mode: 'LINKS',
      },
      members: [],
    };

    const mockTemplate = {
      id: 'template1',
      subject: 'Invitation',
      body: 'You are invited',
      type: 'INVITATION',
      channel: 'WHATSAPP',
    };

    (prisma.family.findUnique as jest.Mock).mockResolvedValue(whatsappFamily);
    (getTemplateForSending as jest.Mock).mockResolvedValue(mockTemplate);

    const result = await sendInvitationsBulk([
      { family_id: 'family1', wedding_id: 'wedding1', admin_id: 'admin1' },
    ]);

    expect(result.waLinks).toHaveLength(1);
    expect(result.waLinks[0].family_id).toBe('family1');
    expect(result.waLinks[0].waLink).toBeDefined();
  });
});
