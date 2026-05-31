/**
 * Wedding Disruption Alerts Generator
 *
 * Uses AI to identify the 3 most important location/date-specific risks
 * that could disrupt a wedding (e.g. local holidays, weather, price surges).
 * Called once at wedding creation time; results are added to the checklist.
 *
 * Uses the shared getChatModel() provider and generateObject() for type-safe
 * structured output — no JSON parsing or text extraction required.
 */

import { generateObject } from 'ai';
import { z } from 'zod';
import { getChatModel } from './provider';

export interface DisruptionAlert {
  title: string;
  description: string;
}

export interface WeddingAlertContext {
  coupleNames: string;
  weddingDate: string; // ISO date YYYY-MM-DD
  location?: string | null;
  language?: string | null; // Language enum: ES | EN | FR | IT | DE
}

const LANGUAGE_NAMES: Record<string, string> = {
  ES: 'Spanish',
  EN: 'English',
  FR: 'French',
  IT: 'Italian',
  DE: 'German',
};

const alertsSchema = z.object({
  alerts: z.array(
    z.object({
      title: z.string(),
      description: z.string(),
    })
  ).length(3),
});

// The stored title is "[AI] " + title, which must fit within the 200-char DB limit.
const TITLE_MAX = 195;
// Description DB limit is 2000 chars; a generous ceiling that lets sentences complete naturally.
const DESCRIPTION_MAX = 500;

/**
 * Generate 3 disruption-risk alerts for a wedding based on its location and date.
 * Returns null if AI is not configured or generation fails (non-critical).
 */
export async function generateDisruptionAlerts(
  ctx: WeddingAlertContext
): Promise<DisruptionAlert[] | null> {
  const [year, month, day] = ctx.weddingDate.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  const dateStr = date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const responseLang = (ctx.language && LANGUAGE_NAMES[ctx.language]) || 'English';

  console.log('[DISRUPTION_ALERTS] Generating alerts', {
    location: ctx.location,
    weddingDate: ctx.weddingDate,
    language: responseLang,
  });

  try {
    const { object } = await generateObject({
      model: getChatModel(),
      schema: alertsSchema,
      prompt: `You are an expert wedding planner. Given the wedding details below, identify the 3 most important potential disruptions or risks the couple and planner should be aware of and act on proactively.

Write all text in ${responseLang}.

Wedding details:
- Couple: ${ctx.coupleNames}
- Date: ${dateStr}
- Location: ${ctx.location || 'Not specified'}

Consider: local public holidays or festivals that affect vendor pricing/availability, seasonal weather risks, major local events causing traffic or accommodation shortages, transport price surges (e.g. Christmas, Easter), school holiday periods, seasonal demand spikes, etc.

Keep each title short (a few words). Keep each description to 1-2 complete sentences.`,
    });

    return object.alerts.map((a) => ({
      title: a.title.slice(0, TITLE_MAX),
      description: a.description.slice(0, DESCRIPTION_MAX),
    }));
  } catch (error) {
    console.error('[DISRUPTION_ALERTS] Failed:', error);
    return null;
  }
}
