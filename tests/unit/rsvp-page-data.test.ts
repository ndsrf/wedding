/**
 * Unit tests for RSVP Page Data Fetching
 * Tests caching, validation, and data assembly for guest RSVP pages
 */

import { getRSVPPageData } from '@/lib/guests/rsvp';
import { prisma } from '@/lib/db/prisma';
import { validateMagicLinkLite } from '@/lib/auth/magic-link';
import { getWeddingPageCache, setWeddingPageCache } from '@/lib/cache/rsvp-page';

// Mock dependencies
jest.mock('@/lib/db/prisma', () => ({
  prisma: {
    wedding: {
      findUnique: jest.fn(),
    },
    invitationTemplate: {
      findUnique: jest.fn(),
    },
  },
}));

jest.mock('@/lib/auth/magic-link', () => ({
  validateMagicLinkLite: jest.fn(),
}));

jest.mock('@/lib/cache/rsvp-page', () => ({
  getWeddingPageCache: jest.fn(),
  setWeddingPageCache: jest.fn(),
}));

jest.mock('@/lib/tracking/events', () => ({
  trackLinkOpened: jest.fn(),
}));

describe('RSVP Page Data', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Valid Token Scenarios', () => {
    it('should return success with valid token and cached data', async () => {
      const mockFamily = {
        id: 'family1',
        name: 'Smith Family',
        email: 'smith@example.com',
        members: [
          {
            id: 'member1',
            name: 'John Smith',
            attending: null,
            created_at: new Date(),
          },
        ],
      };

      const mockCachedData = {
        wedding: {
          id: 'wedding1',
          couple_names: 'John & Jane',
          wedding_date: '2024-06-15T00:00:00.000Z',
          wedding_time: '16:00',
          location: 'Grand Ballroom',
          rsvp_cutoff_date: '2024-05-31T00:00:00.000Z',
          dress_code: 'Formal',
          additional_info: null,
          allow_guest_additions: true,
          default_language: 'EN',
          payment_tracking_mode: 'NONE',
          gift_iban: null,
          transportation_question_enabled: false,
          transportation_question_text: null,
          dietary_restrictions_enabled: true,
          extra_question_1_enabled: false,
          extra_question_1_text: null,
          extra_question_2_enabled: false,
          extra_question_2_text: null,
          extra_question_3_enabled: false,
          extra_question_3_text: null,
          extra_info_1_enabled: false,
          extra_info_1_label: null,
          extra_info_2_enabled: false,
          extra_info_2_label: null,
          extra_info_3_enabled: false,
          extra_info_3_label: null,
        },
        theme: {
          id: 'theme1',
          planner_id: null,
          name: 'Default Theme',
          description: 'Default theme',
          is_default: true,
          is_system_theme: true,
          config: {
            colors: {
              primary: '#4F46E5',
              secondary: '#EC4899',
              accent: '#F59E0B',
              background: '#FFFFFF',
              text: '#1F2937',
            },
            fonts: {
              heading: 'Georgia, serif',
              body: 'system-ui, sans-serif',
            },
            styles: {
              buttonRadius: '0.5rem',
              cardShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
              spacing: '1rem',
            },
          },
          preview_image_url: null,
          created_at: new Date(),
          updated_at: new Date(),
        },
      };

      (validateMagicLinkLite as jest.Mock).mockResolvedValue({
        valid: true,
        family: mockFamily,
        weddingId: 'wedding1',
      });

      (getWeddingPageCache as jest.Mock).mockReturnValue(mockCachedData);

      const result = await getRSVPPageData('valid-token');

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data!.family.name).toBe('Smith Family');
      expect(result.data!.wedding.couple_names).toBe('John & Jane');
    });

    it('should fetch and cache wedding data on cache miss', async () => {
      const mockFamily = {
        id: 'family1',
        name: 'Smith Family',
        members: [],
      };

      const mockWedding = {
        id: 'wedding1',
        couple_names: 'John & Jane',
        wedding_date: new Date('2024-06-15'),
        wedding_time: '16:00',
        location: 'Grand Ballroom',
        rsvp_cutoff_date: new Date('2024-05-31'),
        dress_code: 'Formal',
        additional_info: null,
        allow_guest_additions: true,
        default_language: 'EN',
        payment_tracking_mode: 'NONE',
        gift_iban: null,
        transportation_question_enabled: false,
        transportation_question_text: null,
        dietary_restrictions_enabled: true,
        extra_question_1_enabled: false,
        extra_question_1_text: null,
        extra_question_2_enabled: false,
        extra_question_2_text: null,
        extra_question_3_enabled: false,
        extra_question_3_text: null,
        extra_info_1_enabled: false,
        extra_info_1_label: null,
        extra_info_2_enabled: false,
        extra_info_2_label: null,
        extra_info_3_enabled: false,
        extra_info_3_label: null,
        invitation_template_id: null,
        theme: null,
      };

      (validateMagicLinkLite as jest.Mock).mockResolvedValue({
        valid: true,
        family: mockFamily,
        weddingId: 'wedding1',
      });

      (getWeddingPageCache as jest.Mock).mockReturnValue(null);
      (prisma.wedding.findUnique as jest.Mock).mockResolvedValue(mockWedding);

      const result = await getRSVPPageData('valid-token');

      expect(result.success).toBe(true);
      expect(setWeddingPageCache).toHaveBeenCalledWith('wedding1', expect.any(Object));
    });

    it('should detect RSVP cutoff has passed', async () => {
      const pastDate = new Date('2020-01-01');
      const mockFamily = {
        id: 'family1',
        name: 'Smith Family',
        members: [],
      };

      const mockCachedData = {
        wedding: {
          id: 'wedding1',
          rsvp_cutoff_date: pastDate.toISOString(),
          couple_names: 'John & Jane',
          wedding_date: '2024-06-15T00:00:00.000Z',
          wedding_time: '16:00',
          location: 'Grand Ballroom',
          dress_code: null,
          additional_info: null,
          allow_guest_additions: true,
          default_language: 'EN',
          payment_tracking_mode: 'NONE',
          gift_iban: null,
          transportation_question_enabled: false,
          transportation_question_text: null,
          dietary_restrictions_enabled: true,
          extra_question_1_enabled: false,
          extra_question_1_text: null,
          extra_question_2_enabled: false,
          extra_question_2_text: null,
          extra_question_3_enabled: false,
          extra_question_3_text: null,
          extra_info_1_enabled: false,
          extra_info_1_label: null,
          extra_info_2_enabled: false,
          extra_info_2_label: null,
          extra_info_3_enabled: false,
          extra_info_3_label: null,
        },
        theme: {
          id: 'theme1',
          planner_id: null,
          name: 'Default',
          description: '',
          is_default: true,
          is_system_theme: true,
          config: {},
          preview_image_url: null,
          created_at: new Date(),
          updated_at: new Date(),
        },
      };

      (validateMagicLinkLite as jest.Mock).mockResolvedValue({
        valid: true,
        family: mockFamily,
        weddingId: 'wedding1',
      });

      (getWeddingPageCache as jest.Mock).mockReturnValue(mockCachedData);

      const result = await getRSVPPageData('valid-token');

      expect(result.success).toBe(true);
      expect(result.data!.rsvp_cutoff_passed).toBe(true);
    });

    it('should detect if family has submitted RSVP', async () => {
      const mockFamily = {
        id: 'family1',
        name: 'Smith Family',
        members: [
          {
            id: 'member1',
            name: 'John',
            attending: true,
            created_at: new Date(),
          },
        ],
      };

      const mockCachedData = {
        wedding: {
          id: 'wedding1',
          rsvp_cutoff_date: '2024-12-31T00:00:00.000Z',
          couple_names: 'John & Jane',
          wedding_date: '2024-06-15T00:00:00.000Z',
          wedding_time: '16:00',
          location: 'Grand Ballroom',
          dress_code: null,
          additional_info: null,
          allow_guest_additions: true,
          default_language: 'EN',
          payment_tracking_mode: 'NONE',
          gift_iban: null,
          transportation_question_enabled: false,
          transportation_question_text: null,
          dietary_restrictions_enabled: true,
          extra_question_1_enabled: false,
          extra_question_1_text: null,
          extra_question_2_enabled: false,
          extra_question_2_text: null,
          extra_question_3_enabled: false,
          extra_question_3_text: null,
          extra_info_1_enabled: false,
          extra_info_1_label: null,
          extra_info_2_enabled: false,
          extra_info_2_label: null,
          extra_info_3_enabled: false,
          extra_info_3_label: null,
        },
        theme: {
          id: 'theme1',
          planner_id: null,
          name: 'Default',
          description: '',
          is_default: true,
          is_system_theme: true,
          config: {},
          preview_image_url: null,
          created_at: new Date(),
          updated_at: new Date(),
        },
      };

      (validateMagicLinkLite as jest.Mock).mockResolvedValue({
        valid: true,
        family: mockFamily,
        weddingId: 'wedding1',
      });

      (getWeddingPageCache as jest.Mock).mockReturnValue(mockCachedData);

      const result = await getRSVPPageData('valid-token');

      expect(result.success).toBe(true);
      expect(result.data!.has_submitted_rsvp).toBe(true);
    });

    it('should detect if family has NOT submitted RSVP', async () => {
      const mockFamily = {
        id: 'family1',
        name: 'Smith Family',
        members: [
          {
            id: 'member1',
            name: 'John',
            attending: null,
            created_at: new Date(),
          },
        ],
      };

      const mockCachedData = {
        wedding: {
          id: 'wedding1',
          rsvp_cutoff_date: '2024-12-31T00:00:00.000Z',
          couple_names: 'John & Jane',
          wedding_date: '2024-06-15T00:00:00.000Z',
          wedding_time: '16:00',
          location: 'Grand Ballroom',
          dress_code: null,
          additional_info: null,
          allow_guest_additions: true,
          default_language: 'EN',
          payment_tracking_mode: 'NONE',
          gift_iban: null,
          transportation_question_enabled: false,
          transportation_question_text: null,
          dietary_restrictions_enabled: true,
          extra_question_1_enabled: false,
          extra_question_1_text: null,
          extra_question_2_enabled: false,
          extra_question_2_text: null,
          extra_question_3_enabled: false,
          extra_question_3_text: null,
          extra_info_1_enabled: false,
          extra_info_1_label: null,
          extra_info_2_enabled: false,
          extra_info_2_label: null,
          extra_info_3_enabled: false,
          extra_info_3_label: null,
        },
        theme: {
          id: 'theme1',
          planner_id: null,
          name: 'Default',
          description: '',
          is_default: true,
          is_system_theme: true,
          config: {},
          preview_image_url: null,
          created_at: new Date(),
          updated_at: new Date(),
        },
      };

      (validateMagicLinkLite as jest.Mock).mockResolvedValue({
        valid: true,
        family: mockFamily,
        weddingId: 'wedding1',
      });

      (getWeddingPageCache as jest.Mock).mockReturnValue(mockCachedData);

      const result = await getRSVPPageData('valid-token');

      expect(result.success).toBe(true);
      expect(result.data!.has_submitted_rsvp).toBe(false);
    });
  });

  describe('Invalid Token Scenarios', () => {
    it('should return error for invalid token format', async () => {
      (validateMagicLinkLite as jest.Mock).mockResolvedValue({
        valid: false,
        error: 'INVALID_TOKEN_FORMAT',
      });

      const result = await getRSVPPageData('invalid-token');

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error!.code).toBe('INVALID_TOKEN_FORMAT');
      expect(result.error!.message).toContain('Invalid link format');
    });

    it('should return error for token not found', async () => {
      (validateMagicLinkLite as jest.Mock).mockResolvedValue({
        valid: false,
        error: 'TOKEN_NOT_FOUND',
      });

      const result = await getRSVPPageData('nonexistent-token');

      expect(result.success).toBe(false);
      expect(result.error!.code).toBe('TOKEN_NOT_FOUND');
      expect(result.error!.message).toContain('not valid');
    });

    it('should return error for expired token', async () => {
      (validateMagicLinkLite as jest.Mock).mockResolvedValue({
        valid: false,
        error: 'TOKEN_EXPIRED',
      });

      const result = await getRSVPPageData('expired-token');

      expect(result.success).toBe(false);
      expect(result.error!.code).toBe('TOKEN_EXPIRED');
      expect(result.error!.message).toContain('expired');
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      const mockFamily = {
        id: 'family1',
        name: 'Smith Family',
        members: [],
      };

      (validateMagicLinkLite as jest.Mock).mockResolvedValue({
        valid: true,
        family: mockFamily,
        weddingId: 'wedding1',
      });

      (getWeddingPageCache as jest.Mock).mockReturnValue(null);
      (prisma.wedding.findUnique as jest.Mock).mockRejectedValue(
        new Error('Database connection failed')
      );

      const result = await getRSVPPageData('valid-token');

      expect(result.success).toBe(false);
      expect(result.error!.code).toBe('INTERNAL_ERROR');
    });

    it('should handle missing wedding data', async () => {
      const mockFamily = {
        id: 'family1',
        name: 'Smith Family',
        members: [],
      };

      (validateMagicLinkLite as jest.Mock).mockResolvedValue({
        valid: true,
        family: mockFamily,
        weddingId: 'wedding1',
      });

      (getWeddingPageCache as jest.Mock).mockReturnValue(null);
      (prisma.wedding.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await getRSVPPageData('valid-token');

      expect(result.success).toBe(false);
      expect(result.error!.code).toBe('INTERNAL_ERROR');
    });
  });

  describe('Tracking', () => {
    it('should skip tracking when skipTracking is true', async () => {
      const trackLinkOpened = require('@/lib/tracking/events').trackLinkOpened;

      const mockFamily = {
        id: 'family1',
        name: 'Smith Family',
        members: [],
      };

      const mockCachedData = {
        wedding: {
          id: 'wedding1',
          rsvp_cutoff_date: '2024-12-31T00:00:00.000Z',
          couple_names: 'John & Jane',
          wedding_date: '2024-06-15T00:00:00.000Z',
          wedding_time: '16:00',
          location: 'Grand Ballroom',
          dress_code: null,
          additional_info: null,
          allow_guest_additions: true,
          default_language: 'EN',
          payment_tracking_mode: 'NONE',
          gift_iban: null,
          transportation_question_enabled: false,
          transportation_question_text: null,
          dietary_restrictions_enabled: true,
          extra_question_1_enabled: false,
          extra_question_1_text: null,
          extra_question_2_enabled: false,
          extra_question_2_text: null,
          extra_question_3_enabled: false,
          extra_question_3_text: null,
          extra_info_1_enabled: false,
          extra_info_1_label: null,
          extra_info_2_enabled: false,
          extra_info_2_label: null,
          extra_info_3_enabled: false,
          extra_info_3_label: null,
        },
        theme: {
          id: 'theme1',
          planner_id: null,
          name: 'Default',
          description: '',
          is_default: true,
          is_system_theme: true,
          config: {},
          preview_image_url: null,
          created_at: new Date(),
          updated_at: new Date(),
        },
      };

      (validateMagicLinkLite as jest.Mock).mockResolvedValue({
        valid: true,
        family: mockFamily,
        weddingId: 'wedding1',
      });

      (getWeddingPageCache as jest.Mock).mockReturnValue(mockCachedData);

      await getRSVPPageData('valid-token', null, true);

      expect(trackLinkOpened).not.toHaveBeenCalled();
    });
  });
});
