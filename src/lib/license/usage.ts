import { prisma } from '@/lib/db/prisma';
import { ResourceType, Language } from '@prisma/client';
import { getTranslations } from '@/lib/i18n/server';

/**
 * Formats a localized error message based on the user's role and the limit reached.
 */
export async function formatLimitError(params: {
  resourceType: string;
  limit: number;
  used: number;
  role: 'planner' | 'wedding_admin';
  language?: Language;
}): Promise<string> {
  const { resourceType, limit, used, role, language = 'ES' } = params;
  const { t } = await getTranslations(language.toLowerCase());

  const resourceName = t(`common.errors.license.resources.${resourceType}` as Parameters<typeof t>[0]);

  if (role === 'planner') {
    return t('common.errors.license.limitReachedPlanner', {
      resource: resourceName,
      limit: String(limit),
      used: String(used),
    });
  } else {
    return t('common.errors.license.limitReachedCouple', {
      resource: resourceName,
    });
  }
}

/**
 * Records resource consumption for a planner/wedding.
 * This should be called after a successful operation.
 */
export async function recordResourceUsage(params: {
  plannerId: string;
  weddingId?: string | null;
  type: ResourceType;
  quantity?: number;
}) {
  const { plannerId, weddingId, type, quantity = 1 } = params;

  try {
    await prisma.resourceUsage.create({
      data: {
        planner_id: plannerId,
        wedding_id: weddingId,
        type,
        quantity,
      },
    });
  } catch (error) {
    console.error(`[USAGE_TRACKING] Failed to record usage for planner ${plannerId}:`, error);
    // Don't throw - we don't want to block the actual operation if tracking fails
  }
}

/**
 * Checks if a planner has reached their license limits for a specific resource.
 * Returns true if allowed, false if limit reached.
 */
export async function checkResourceLimit(params: {
  plannerId: string;
  weddingId?: string | null;
  type: ResourceType;
}): Promise<{ allowed: boolean; error?: string; limit?: number; used?: number; resourceType?: string }> {
  const { plannerId, weddingId, type } = params;

  const license = await prisma.plannerLicense.findUnique({
    where: { planner_id: plannerId },
  });

  // Default limits if no license record exists
  const limits = {
    WHATSAPP: license?.max_whatsapp_per_month ?? 100,
    WHATSAPP_WEDDING: license?.max_whatsapp_per_wedding_per_month ?? 100,
    AI_STANDARD: license?.max_standard_ai_calls ?? 100,
    AI_PREMIUM: license?.max_premium_ai_calls ?? 50,
    EMAIL: license?.max_emails_per_month ?? 1000,
    CONTRACT: license?.max_contracts_per_month ?? 100,
  };

  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  // 1. Check Global Planner Limit
  const globalLimit = limits[type as keyof typeof limits] as number | null;
  if (globalLimit !== null) {
    const usage = await prisma.resourceUsage.aggregate({
      where: {
        planner_id: plannerId,
        type,
        timestamp: { gte: startOfMonth },
      },
      _sum: { quantity: true },
    });

    const totalUsed = usage._sum.quantity || 0;
    if (totalUsed >= globalLimit) {
      return {
        allowed: false,
        limit: globalLimit,
        used: totalUsed,
        resourceType: type,
        error: `Monthly limit for ${type} reached (${totalUsed}/${globalLimit}).`,
      };
    }
  }

  // 2. Check Per-Wedding Limit (only for WhatsApp)
  if (type === ResourceType.WHATSAPP && weddingId && limits.WHATSAPP_WEDDING !== null) {
    const weddingUsage = await prisma.resourceUsage.aggregate({
      where: {
        wedding_id: weddingId,
        type: ResourceType.WHATSAPP,
        timestamp: { gte: startOfMonth },
      },
      _sum: { quantity: true },
    });

    const weddingUsed = weddingUsage._sum.quantity || 0;
    if (weddingUsed >= limits.WHATSAPP_WEDDING) {
      return {
        allowed: false,
        limit: limits.WHATSAPP_WEDDING,
        used: weddingUsed,
        resourceType: 'WHATSAPP_WEDDING',
        error: `Monthly WhatsApp limit for this wedding reached (${weddingUsed}/${limits.WHATSAPP_WEDDING}).`,
      };
    }
  }

  return { allowed: true };
}
