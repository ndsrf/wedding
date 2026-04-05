/**
 * Alert System — template renderer
 *
 * Resolves {{variable}} placeholders in alert subject/body.
 * Unknown variables are replaced with an empty string.
 */

import type { AlertTemplateVars } from './types';

/**
 * Replace all {{key}} occurrences in a template string using the provided vars.
 * Keys are case-sensitive and must be alphanumeric + underscore.
 */
export function renderAlertTemplate(
  template: string,
  vars: AlertTemplateVars,
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => vars[key] ?? '');
}

/**
 * Build template vars from an alert context + wedding data.
 * Merges dynamic metadata on top of structured fields.
 */
export function buildTemplateVars(
  metadata: Record<string, unknown>,
  extras: Partial<AlertTemplateVars> = {},
): AlertTemplateVars {
  // Flatten metadata: only string/number values become template vars
  const fromMeta: AlertTemplateVars = {};
  for (const [k, v] of Object.entries(metadata)) {
    if (v !== null && v !== undefined && typeof v !== 'object') {
      fromMeta[k] = String(v);
    }
  }
  return { ...fromMeta, ...extras };
}
