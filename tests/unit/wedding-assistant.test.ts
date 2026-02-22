/**
 * Unit tests for the AI Wedding Assistant service
 *
 * Tests prompt construction, provider selection, language handling,
 * and graceful degradation when API keys are missing.
 */

// ─── Mock AI SDKs before importing the module under test ────────────────────
// jest.mock is hoisted, so factories must not reference variables declared
// in this file. We expose the inner jest.fn() through module-level state
// that the factories close over.

const mockOpenAICreate = jest.fn();
const mockGeminiGenerateContent = jest.fn();

jest.mock('openai', () => {
  const MockOpenAI = jest.fn().mockImplementation(() => ({
    chat: { completions: { create: mockOpenAICreate } },
  }));
  return { default: MockOpenAI, __esModule: true };
});

jest.mock('@google/generative-ai', () => {
  const MockGoogleGenerativeAI = jest.fn().mockImplementation(() => ({
    getGenerativeModel: jest.fn().mockReturnValue({
      generateContent: mockGeminiGenerateContent,
    }),
  }));
  return { GoogleGenerativeAI: MockGoogleGenerativeAI };
});

// ─── Imports (after mocks) ───────────────────────────────────────────────────

import { generateWeddingReply } from '@/lib/ai/wedding-assistant';

// ─── Fixtures ────────────────────────────────────────────────────────────────

const baseWedding = {
  id: 'wedding-1',
  planner_id: 'planner-1',
  theme_id: null,
  invitation_template_id: null,
  couple_names: 'Alice & Bob',
  wedding_date: new Date('2026-09-15T00:00:00Z'),
  wedding_time: '16:00',
  location: 'Villa Sunset, Marbella',
  rsvp_cutoff_date: new Date('2026-08-01T00:00:00Z'),
  dress_code: 'Black Tie',
  additional_info: 'Ceremony starts promptly at 16:00',
  payment_tracking_mode: 'MANUAL' as const,
  allow_guest_additions: true,
  default_language: 'EN' as const,
  wedding_country: 'ES',
  status: 'ACTIVE' as const,
  created_at: new Date(),
  created_by: 'admin',
  updated_at: new Date(),
  updated_by: null,
  transportation_question_enabled: false,
  transportation_question_text: null,
  dietary_restrictions_enabled: true,
  save_the_date_enabled: false,
  whatsapp_mode: 'BUSINESS' as const,
  short_url_initials: null,
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
  deleted_at: null,
  deleted_by: null,
  disabled_at: null,
  disabled_by: null,
  is_disabled: false,
  gift_iban: 'ES91 2100 0418 4502 0005 1332',
  couple_table_id: null,
  main_event_location_id: null,
  wizard_completed: false,
  wizard_current_step: null,
  wizard_completed_at: null,
  wizard_skipped: false,
  google_photos_album_id: null,
  google_photos_album_url: null,
  google_photos_share_url: null,
  google_photos_refresh_token: null,
  google_photos_access_token: null,
  google_photos_token_expiry: null,
};

const baseFamily = {
  name: 'The Smith Family',
  magic_token: 'token-abc123',
  preferred_language: 'EN' as const,
  members: [
    { name: 'John Smith', attending: true },
    { name: 'Jane Smith', attending: null },
  ],
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function setEnv(vars: Record<string, string | undefined>) {
  for (const [key, value] of Object.entries(vars)) {
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('generateWeddingReply', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    jest.clearAllMocks();
    // Start each test with a clean env
    setEnv({
      OPENAI_API_KEY: undefined,
      GEMINI_API_KEY: undefined,
      AI_PROVIDER: undefined,
      OPENAI_MODEL: undefined,
      GEMINI_MODEL: undefined,
      APP_URL: 'https://wedding.example.com',
    });
  });

  afterAll(() => {
    // Restore original env
    process.env = { ...originalEnv };
  });

  // ── Provider selection ─────────────────────────────────────────────────────

  describe('provider selection', () => {
    it('returns null when no AI provider key is configured', async () => {
      const result = await generateWeddingReply('Hello?', baseWedding, baseFamily, 'EN');
      expect(result).toBeNull();
    });

    it('uses OpenAI when OPENAI_API_KEY is set and AI_PROVIDER is unset', async () => {
      setEnv({ OPENAI_API_KEY: 'sk-test-key' });
      mockOpenAICreate.mockResolvedValue({
        choices: [{ message: { content: 'OpenAI reply' } }],
      });

      const result = await generateWeddingReply('Hello?', baseWedding, baseFamily, 'EN');

      expect(mockOpenAICreate).toHaveBeenCalledTimes(1);
      expect(result).toBe('OpenAI reply');
    });

    it('uses Gemini when AI_PROVIDER=gemini and GEMINI_API_KEY is set', async () => {
      setEnv({ GEMINI_API_KEY: 'gemini-key', AI_PROVIDER: 'gemini' });
      mockGeminiGenerateContent.mockResolvedValue({
        response: { text: () => 'Gemini reply' },
      });

      const result = await generateWeddingReply('Hello?', baseWedding, baseFamily, 'EN');

      expect(mockGeminiGenerateContent).toHaveBeenCalledTimes(1);
      expect(result).toBe('Gemini reply');
    });

    it('uses OpenAI when AI_PROVIDER=openai explicitly', async () => {
      setEnv({ OPENAI_API_KEY: 'sk-test-key', AI_PROVIDER: 'openai' });
      mockOpenAICreate.mockResolvedValue({
        choices: [{ message: { content: 'OpenAI explicit reply' } }],
      });

      const result = await generateWeddingReply('Hello?', baseWedding, baseFamily, 'EN');

      expect(mockOpenAICreate).toHaveBeenCalledTimes(1);
      expect(result).toBe('OpenAI explicit reply');
    });

    it('falls back to Gemini when OPENAI_API_KEY is absent but GEMINI_API_KEY is set', async () => {
      setEnv({ GEMINI_API_KEY: 'gemini-key' });
      mockGeminiGenerateContent.mockResolvedValue({
        response: { text: () => 'Gemini fallback' },
      });

      const result = await generateWeddingReply('Hello?', baseWedding, baseFamily, 'EN');

      expect(mockGeminiGenerateContent).toHaveBeenCalledTimes(1);
      expect(result).toBe('Gemini fallback');
    });
  });

  // ── Prompt content ─────────────────────────────────────────────────────────

  describe('prompt content', () => {
    beforeEach(() => {
      setEnv({ OPENAI_API_KEY: 'sk-test-key', AI_PROVIDER: 'openai' });
    });

    function captureSystemPrompt(): string {
      return (mockOpenAICreate.mock.calls[0][0].messages as { role: string; content: string }[])
        .find(m => m.role === 'system')?.content ?? '';
    }

    it('includes couple names in the system prompt', async () => {
      mockOpenAICreate.mockResolvedValue({ choices: [{ message: { content: 'ok' } }] });
      await generateWeddingReply('Who is getting married?', baseWedding, baseFamily, 'EN');
      expect(captureSystemPrompt()).toContain('Alice & Bob');
    });

    it('includes the venue/location', async () => {
      mockOpenAICreate.mockResolvedValue({ choices: [{ message: { content: 'ok' } }] });
      await generateWeddingReply('Where is the wedding?', baseWedding, baseFamily, 'EN');
      expect(captureSystemPrompt()).toContain('Villa Sunset, Marbella');
    });

    it('includes the gift IBAN', async () => {
      mockOpenAICreate.mockResolvedValue({ choices: [{ message: { content: 'ok' } }] });
      await generateWeddingReply('How do I send a gift?', baseWedding, baseFamily, 'EN');
      expect(captureSystemPrompt()).toContain('ES91 2100 0418 4502 0005 1332');
    });

    it('includes the dress code when set', async () => {
      mockOpenAICreate.mockResolvedValue({ choices: [{ message: { content: 'ok' } }] });
      await generateWeddingReply('What should I wear?', baseWedding, baseFamily, 'EN');
      expect(captureSystemPrompt()).toContain('Black Tie');
    });

    it('omits dress code section when not set', async () => {
      mockOpenAICreate.mockResolvedValue({ choices: [{ message: { content: 'ok' } }] });
      const weddingNoDressCode = { ...baseWedding, dress_code: null };
      await generateWeddingReply('What to wear?', weddingNoDressCode, baseFamily, 'EN');
      expect(captureSystemPrompt()).not.toContain('Dress Code');
    });

    it('omits IBAN section when gift_iban is null', async () => {
      mockOpenAICreate.mockResolvedValue({ choices: [{ message: { content: 'ok' } }] });
      const weddingNoIban = { ...baseWedding, gift_iban: null };
      await generateWeddingReply('Gift?', weddingNoIban, baseFamily, 'EN');
      expect(captureSystemPrompt()).not.toContain('IBAN');
    });

    it('includes the guest family name', async () => {
      mockOpenAICreate.mockResolvedValue({ choices: [{ message: { content: 'ok' } }] });
      await generateWeddingReply('Am I invited?', baseWedding, baseFamily, 'EN');
      expect(captureSystemPrompt()).toContain('The Smith Family');
    });

    it('includes the RSVP link for the family', async () => {
      mockOpenAICreate.mockResolvedValue({ choices: [{ message: { content: 'ok' } }] });
      await generateWeddingReply('How do I RSVP?', baseWedding, baseFamily, 'EN');
      expect(captureSystemPrompt()).toContain('https://wedding.example.com/rsvp/token-abc123');
    });

    it('lists attending and pending members', async () => {
      mockOpenAICreate.mockResolvedValue({ choices: [{ message: { content: 'ok' } }] });
      await generateWeddingReply('Who is confirmed?', baseWedding, baseFamily, 'EN');
      const prompt = captureSystemPrompt();
      expect(prompt).toContain('John Smith');
      expect(prompt).toContain('Jane Smith');
    });

    it('works without a family (null) — omits guest section', async () => {
      mockOpenAICreate.mockResolvedValue({ choices: [{ message: { content: 'ok' } }] });
      await generateWeddingReply('Where is the wedding?', baseWedding, null, 'EN');
      const prompt = captureSystemPrompt();
      expect(prompt).not.toContain('Guest Family');
      expect(prompt).not.toContain('RSVP Link');
    });
  });

  // ── Language handling ──────────────────────────────────────────────────────

  describe('language handling', () => {
    beforeEach(() => {
      setEnv({ OPENAI_API_KEY: 'sk-test-key', AI_PROVIDER: 'openai' });
      mockOpenAICreate.mockResolvedValue({ choices: [{ message: { content: 'reply' } }] });
    });

    function captureSystemPrompt(): string {
      return (mockOpenAICreate.mock.calls[0][0].messages as { role: string; content: string }[])
        .find(m => m.role === 'system')?.content ?? '';
    }

    it.each([
      ['EN', 'English', 'contact the couple directly'],
      ['ES', 'Spanish', 'contactar directamente con los novios'],
      ['FR', 'French', 'contacter les mariés directement'],
      ['IT', 'Italian', 'contattare direttamente gli sposi'],
      ['DE', 'German', 'Brautleute gerne direkt kontaktieren'],
    ])('language %s → instructs model to respond in %s and uses correct suffix', async (lang, langLabel, suffix) => {
      await generateWeddingReply('Hello?', baseWedding, baseFamily, lang);
      const prompt = captureSystemPrompt();
      expect(prompt).toContain(langLabel);
      expect(prompt).toContain(suffix);
    });

    it('defaults to English for unknown language codes', async () => {
      await generateWeddingReply('Hello?', baseWedding, baseFamily, 'XX');
      const prompt = captureSystemPrompt();
      expect(prompt).toContain('English');
    });
  });

  // ── Error handling ─────────────────────────────────────────────────────────

  describe('error handling', () => {
    it('returns null when OpenAI throws an error', async () => {
      setEnv({ OPENAI_API_KEY: 'sk-test-key', AI_PROVIDER: 'openai' });
      mockOpenAICreate.mockRejectedValue(new Error('OpenAI API error'));

      const result = await generateWeddingReply('Hello?', baseWedding, baseFamily, 'EN');

      expect(result).toBeNull();
    });

    it('returns null when Gemini throws an error', async () => {
      setEnv({ GEMINI_API_KEY: 'gemini-key', AI_PROVIDER: 'gemini' });
      mockGeminiGenerateContent.mockRejectedValue(new Error('Gemini API error'));

      const result = await generateWeddingReply('Hello?', baseWedding, baseFamily, 'EN');

      expect(result).toBeNull();
    });

    it('returns null when OpenAI returns an empty choices array', async () => {
      setEnv({ OPENAI_API_KEY: 'sk-test-key', AI_PROVIDER: 'openai' });
      mockOpenAICreate.mockResolvedValue({ choices: [] });

      const result = await generateWeddingReply('Hello?', baseWedding, baseFamily, 'EN');

      expect(result).toBeNull();
    });

    it('returns null when Gemini returns empty text', async () => {
      setEnv({ GEMINI_API_KEY: 'gemini-key', AI_PROVIDER: 'gemini' });
      mockGeminiGenerateContent.mockResolvedValue({
        response: { text: () => '' },
      });

      const result = await generateWeddingReply('Hello?', baseWedding, baseFamily, 'EN');

      expect(result).toBeNull();
    });
  });

  // ── OpenAI model configuration ─────────────────────────────────────────────

  describe('model configuration', () => {
    it('uses gpt-4o-mini by default for OpenAI', async () => {
      setEnv({ OPENAI_API_KEY: 'sk-test-key', AI_PROVIDER: 'openai' });
      mockOpenAICreate.mockResolvedValue({ choices: [{ message: { content: 'ok' } }] });

      await generateWeddingReply('Hello?', baseWedding, baseFamily, 'EN');

      expect(mockOpenAICreate).toHaveBeenCalledWith(
        expect.objectContaining({ model: 'gpt-4o-mini' })
      );
    });

    it('respects OPENAI_MODEL env override', async () => {
      setEnv({ OPENAI_API_KEY: 'sk-test-key', AI_PROVIDER: 'openai', OPENAI_MODEL: 'gpt-4o' });
      mockOpenAICreate.mockResolvedValue({ choices: [{ message: { content: 'ok' } }] });

      await generateWeddingReply('Hello?', baseWedding, baseFamily, 'EN');

      expect(mockOpenAICreate).toHaveBeenCalledWith(
        expect.objectContaining({ model: 'gpt-4o' })
      );
    });

    it('passes the guest message as the user role message to OpenAI', async () => {
      setEnv({ OPENAI_API_KEY: 'sk-test-key', AI_PROVIDER: 'openai' });
      mockOpenAICreate.mockResolvedValue({ choices: [{ message: { content: 'ok' } }] });

      await generateWeddingReply('What is the dress code?', baseWedding, baseFamily, 'EN');

      const messages = mockOpenAICreate.mock.calls[0][0].messages as { role: string; content: string }[];
      const userMessage = messages.find(m => m.role === 'user');
      expect(userMessage?.content).toBe('What is the dress code?');
    });
  });

  // ── Transportation and extra questions ─────────────────────────────────────

  describe('optional wedding fields', () => {
    beforeEach(() => {
      setEnv({ OPENAI_API_KEY: 'sk-test-key', AI_PROVIDER: 'openai' });
      mockOpenAICreate.mockResolvedValue({ choices: [{ message: { content: 'ok' } }] });
    });

    function captureSystemPrompt(): string {
      return (mockOpenAICreate.mock.calls[0][0].messages as { role: string; content: string }[])
        .find(m => m.role === 'system')?.content ?? '';
    }

    it('includes transportation info when enabled', async () => {
      const wedding = {
        ...baseWedding,
        transportation_question_enabled: true,
        transportation_question_text: 'Shuttle bus from Hotel Marbella at 15:00',
      };
      await generateWeddingReply('How do I get there?', wedding, baseFamily, 'EN');
      expect(captureSystemPrompt()).toContain('Shuttle bus from Hotel Marbella at 15:00');
    });

    it('omits transportation when disabled', async () => {
      await generateWeddingReply('How do I get there?', baseWedding, baseFamily, 'EN');
      expect(captureSystemPrompt()).not.toContain('Transportation');
    });

    it('includes extra questions when enabled', async () => {
      const wedding = {
        ...baseWedding,
        extra_question_1_enabled: true,
        extra_question_1_text: 'Will you need a parking space?',
      };
      await generateWeddingReply('Parking?', wedding, baseFamily, 'EN');
      expect(captureSystemPrompt()).toContain('Will you need a parking space?');
    });

    it('mentions dietary restrictions when enabled', async () => {
      await generateWeddingReply('Food options?', baseWedding, baseFamily, 'EN');
      expect(captureSystemPrompt()).toContain('Dietary restrictions');
    });

    it('mentions guest additions when allowed', async () => {
      await generateWeddingReply('Can I bring a plus one?', baseWedding, baseFamily, 'EN');
      expect(captureSystemPrompt()).toContain('additional family members');
    });
  });
});
