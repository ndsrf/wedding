/**
 * RSVP Page Revalidation Utilities
 *
 * Handles on-demand revalidation of RSVP pages when templates are updated.
 * Works in conjunction with Next.js ISR to ensure guests see fresh content.
 */

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/db/prisma';

/**
 * Revalidates all RSVP pages for a specific wedding
 *
 * This function:
 * 1. Fetches all families for the wedding
 * 2. Revalidates each family's RSVP page using their magic link token
 * 3. Runs in the background to avoid blocking API responses
 *
 * @param weddingId - The wedding ID to revalidate pages for
 */
export async function revalidateWeddingRSVPPages(weddingId: string): Promise<void> {
  try {
    // Fetch all families with their magic tokens for this wedding
    const families = await prisma.family.findMany({
      where: { wedding_id: weddingId },
      select: { magic_token: true },
    });

    // Revalidate each family's RSVP page
    // This tells Next.js to regenerate these pages on next request
    for (const family of families) {
      if (family.magic_token) {
        revalidatePath(`/rsvp/${family.magic_token}`);
      }
    }

    console.log(`[Revalidation] Successfully revalidated ${families.length} RSVP pages for wedding ${weddingId}`);
  } catch (error) {
    console.error(`[Revalidation] Failed to revalidate RSVP pages for wedding ${weddingId}:`, error);
    // Don't throw - revalidation failures shouldn't break the main request
  }
}

/**
 * Revalidates a single RSVP page by token
 *
 * @param token - The magic link token
 */
export function revalidateRSVPPage(token: string): void {
  try {
    revalidatePath(`/rsvp/${token}`);
    console.log(`[Revalidation] Successfully revalidated RSVP page for token ${token}`);
  } catch (error) {
    console.error(`[Revalidation] Failed to revalidate RSVP page for token ${token}:`, error);
  }
}
