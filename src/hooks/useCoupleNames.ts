'use client';

import { useState, useEffect } from 'react';

// Module-level in-memory cache — persists for the lifetime of the browser tab
const cache = new Map<string, string>();

/**
 * Stores couple names in the cache (call from pages that already fetch full wedding data).
 */
export function cacheCoupleName(weddingId: string, name: string): void {
  if (weddingId && name) cache.set(weddingId, name);
}

/**
 * Returns the couple names for a planner wedding, cached after the first fetch.
 */
export function useCoupleNames(weddingId: string | null | undefined): string {
  const [coupleNames, setCoupleNames] = useState<string>(() =>
    weddingId ? (cache.get(weddingId) ?? '') : ''
  );

  useEffect(() => {
    if (!weddingId) return;
    if (cache.has(weddingId)) {
      setCoupleNames(cache.get(weddingId)!);
      return;
    }
    fetch(`/api/planner/weddings/${weddingId}`)
      .then(r => r.json())
      .then(data => {
        if (data.success && data.data?.couple_names) {
          cache.set(weddingId, data.data.couple_names);
          setCoupleNames(data.data.couple_names);
        }
      })
      .catch(() => {});
  }, [weddingId]);

  return coupleNames;
}
