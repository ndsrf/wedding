export type StatsFilterType = 'all' | 'this_year' | 'this_month' | 'custom';

export interface StatsFilterValue {
  type: StatsFilterType;
  startDate?: string; // YYYY-MM-DD
  endDate?: string;   // YYYY-MM-DD
}

export const STATS_FILTER_COOKIE = 'quotes_stats_filter';

export function parseCookieFilter(cookieValue: string | null | undefined): StatsFilterValue {
  if (!cookieValue) return { type: 'this_year' };

  if (cookieValue.startsWith('custom|')) {
    const parts = cookieValue.split('|');
    return {
      type: 'custom',
      startDate: parts[1] || undefined,
      endDate: parts[2] || undefined,
    };
  }

  if (['all', 'this_year', 'this_month'].includes(cookieValue)) {
    return { type: cookieValue as StatsFilterType };
  }

  return { type: 'this_year' };
}

export function serializeFilterForCookie(filter: StatsFilterValue): string {
  if (filter.type === 'custom') {
    return `custom|${filter.startDate ?? ''}|${filter.endDate ?? ''}`;
  }
  return filter.type;
}

/** Parse a YYYY-MM-DD string as a local date (avoids UTC midnight ambiguity). */
function parseLocalDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function computeDateRange(filter: StatsFilterValue): { start?: Date; end?: Date } {
  const now = new Date();

  switch (filter.type) {
    case 'all':
      return {};

    case 'this_year': {
      const start = new Date(now.getFullYear(), 0, 1);
      const end = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
      return { start, end };
    }

    case 'this_month': {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      return { start, end };
    }

    case 'custom': {
      const result: { start?: Date; end?: Date } = {};
      if (filter.startDate) {
        result.start = parseLocalDate(filter.startDate);
      }
      if (filter.endDate) {
        const end = parseLocalDate(filter.endDate);
        end.setHours(23, 59, 59, 999);
        result.end = end;
      }
      return result;
    }
  }
}

/** Build a Prisma `created_at` where-clause fragment from an optional date range. */
export function buildPrismaDateFilter(start?: Date, end?: Date) {
  if (!start && !end) return {};
  return {
    created_at: {
      ...(start ? { gte: start } : {}),
      ...(end ? { lte: end } : {}),
    },
  };
}
