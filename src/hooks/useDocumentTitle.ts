'use client';

import { useEffect } from 'react';

/**
 * Sets the browser tab title (document.title) reactively.
 * Only updates when the title string is non-empty.
 */
export function useDocumentTitle(title: string) {
  useEffect(() => {
    if (title) {
      document.title = title;
    }
  }, [title]);
}

/**
 * Builds a consistent "Nupci - [coupleNames] - pageTitle" or
 * "Nupci - pageTitle" string for use with useDocumentTitle.
 */
export function buildNupciTitle(pageTitle: string, coupleNames?: string): string {
  return coupleNames ? `Nupci - ${coupleNames} - ${pageTitle}` : `Nupci - ${pageTitle}`;
}
