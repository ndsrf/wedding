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
