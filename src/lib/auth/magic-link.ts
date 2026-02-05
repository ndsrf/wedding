/**
 * Magic Link Generation and Validation
 *
 * Provides secure, password-free authentication for guests using magic links.
 * Tokens are cryptographically secure UUID v4 tokens that remain valid until the wedding date.
 */

import { randomUUID } from 'crypto';
import { prisma } from '@/lib/db/prisma';
import type { Family, FamilyMember, Wedding, Theme } from '@prisma/client';
import type { Channel } from '@/types/models';
import { getShortUrlPath } from '@/lib/short-url';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface FamilyWithMembers extends Family {
  members: FamilyMember[];
}

export interface MagicLinkValidationResult {
  valid: boolean;
  family?: FamilyWithMembers;
  wedding?: Wedding;
  theme?: Theme;
  error?: string;
}

export interface MagicLinkOptions {
  channel?: Channel;
  baseUrl?: string;
}

// ============================================================================
// MAGIC LINK GENERATION
// ============================================================================

/**
 * Generate a secure magic link for a family
 * Creates a cryptographically secure UUID v4 token and stores it in the database
 *
 * @param family_id - The family ID to generate a magic link for
 * @param options - Optional channel tracking and base URL
 * @returns The complete magic link URL
 */
export async function generateMagicLink(
  family_id: string,
  options: MagicLinkOptions = {}
): Promise<string> {
  const { channel, baseUrl = process.env.APP_URL || 'http://localhost:3000' } = options;

  // Generate cryptographically secure UUID v4 token
  const token = randomUUID();

  // Update family record with new magic token
  await prisma.family.update({
    where: { id: family_id },
    data: {
      magic_token: token,
    },
  });

  // Build short magic link URL (/{INITIALS}/{CODE})
  const shortPath = await getShortUrlPath(family_id);
  const url = new URL(shortPath, baseUrl);

  // Add channel parameter for tracking if provided
  if (channel) {
    url.searchParams.set('channel', channel.toLowerCase());
  }

  return url.toString();
}

/**
 * Generate magic links for multiple families
 * Useful for bulk operations like sending reminders
 *
 * @param family_ids - Array of family IDs
 * @param options - Optional channel tracking and base URL
 * @returns Map of family_id to magic link URL
 */
export async function generateMagicLinks(
  family_ids: string[],
  options: MagicLinkOptions = {}
): Promise<Map<string, string>> {
  const links = new Map<string, string>();

  // Generate links sequentially to avoid race conditions
  for (const family_id of family_ids) {
    try {
      const link = await generateMagicLink(family_id, options);
      links.set(family_id, link);
    } catch (error) {
      console.error(`Failed to generate magic link for family ${family_id}:`, error);
      // Continue with other families even if one fails
    }
  }

  return links;
}

// ============================================================================
// MAGIC LINK VALIDATION
// ============================================================================

/**
 * Validate a magic link token and return family data
 * Checks token format, database existence, and wedding date validity
 *
 * @param token - The magic link token to validate
 * @returns Validation result with family, wedding, and theme data if valid
 */
export async function validateMagicLink(token: string): Promise<MagicLinkValidationResult> {
  // Validate token format (UUID v4)
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(token)) {
    return {
      valid: false,
      error: 'INVALID_TOKEN_FORMAT',
    };
  }

  try {
    // Find family by magic token
    const family = await prisma.family.findFirst({
      where: {
        magic_token: token,
      },
      include: {
        members: {
          orderBy: {
            created_at: 'asc',
          },
        },
        wedding: {
          include: {
            theme: true,
          },
        },
      },
    });

    if (!family) {
      return {
        valid: false,
        error: 'TOKEN_NOT_FOUND',
      };
    }

    // Check if wedding date has passed
    const wedding = family.wedding;
    const weddingDate = new Date(wedding.wedding_date);
    const now = new Date();

    if (weddingDate < now) {
      // Token expires after wedding date
      return {
        valid: false,
        error: 'TOKEN_EXPIRED',
      };
    }

    // Return valid result with all necessary data
    return {
      valid: true,
      family: family as FamilyWithMembers,
      wedding,
      theme: wedding.theme || undefined,
    };
  } catch (error) {
    console.error('Magic link validation error:', error);
    return {
      valid: false,
      error: 'VALIDATION_ERROR',
    };
  }
}

/**
 * Regenerate magic token for a family
 * Useful when a token needs to be invalidated and a new one issued
 *
 * @param family_id - The family ID to regenerate token for
 * @returns The new magic token
 */
export async function regenerateMagicToken(family_id: string): Promise<string> {
  const token = randomUUID();

  await prisma.family.update({
    where: { id: family_id },
    data: {
      magic_token: token,
    },
  });

  return token;
}

/**
 * Invalidate a magic token for a family
 * Sets the token to null, preventing further access
 *
 * @param family_id - The family ID to invalidate token for
 */
export async function invalidateMagicToken(family_id: string): Promise<void> {
  await prisma.family.update({
    where: { id: family_id },
    data: {
      // Type assertion needed: schema requires String but logic needs nullable
      magic_token: null as unknown as string,
    },
  });
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Check if a family has a valid magic token
 *
 * @param family_id - The family ID to check
 * @returns true if family has a magic token, false otherwise
 */
export async function hasMagicToken(family_id: string): Promise<boolean> {
  const family = await prisma.family.findUnique({
    where: { id: family_id },
    select: { magic_token: true },
  });

  return family?.magic_token !== null && family?.magic_token !== undefined;
}

/**
 * Extract channel from magic link URL
 * Parses the channel query parameter from a magic link URL
 *
 * @param url - The magic link URL or just the token
 * @returns The channel if present in URL, undefined otherwise
 */
export function extractChannelFromUrl(url: string): Channel | undefined {
  try {
    // Handle both full URLs and just tokens
    const urlObj = url.includes('://') ? new URL(url) : new URL(`http://dummy.com?${url.split('?')[1] || ''}`);
    const channel = urlObj.searchParams.get('channel');

    if (channel) {
      const channelUpper = channel.toUpperCase();
      if (['WHATSAPP', 'EMAIL', 'SMS'].includes(channelUpper)) {
        return channelUpper as Channel;
      }
    }

    return undefined;
  } catch {
    return undefined;
  }
}
