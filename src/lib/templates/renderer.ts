/**
 * Template renderer - handles placeholder replacement
 * Supports: {{familyName}}, {{coupleNames}}, {{weddingDate}}, {{magicLink}}, etc.
 */

export interface TemplateVariables {
  familyName?: string;
  coupleNames?: string;
  weddingDate?: string;
  weddingTime?: string;
  location?: string;
  magicLink?: string;
  rsvpCutoffDate?: string;
  referenceCode?: string;
  [key: string]: string | undefined;
}

/**
 * Replace placeholders in template text with actual values
 * Format: {{placeholder}}
 *
 * @example
 * renderTemplate("Hello {{familyName}}", { familyName: "Smith" })
 * // => "Hello Smith"
 */
export function renderTemplate(
  template: string,
  variables: TemplateVariables
): string {
  let rendered = template;

  // Replace all {{placeholder}} patterns
  rendered = rendered.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    return variables[key] ?? match; // Return original if variable not found
  });

  return rendered;
}

/**
 * Get list of all placeholder names used in a template
 *
 * @example
 * getPlaceholders("Hello {{familyName}}, you're invited to {{coupleNames}}'s wedding")
 * // => ["familyName", "coupleNames"]
 */
export function getPlaceholders(template: string): string[] {
  const matches = template.match(/\{\{(\w+)\}\}/g) ?? [];
  const uniquePlaceholders = new Set<string>();

  matches.forEach((match) => {
    const key = match.replace(/\{\{|\}\}/g, "");
    uniquePlaceholders.add(key);
  });

  return Array.from(uniquePlaceholders);
}

/**
 * Validate that all required placeholders are present in template
 * Returns false if required placeholders are missing
 */
export function hasAllPlaceholders(
  template: string,
  requiredPlaceholders: string[]
): boolean {
  const found = getPlaceholders(template);
  return requiredPlaceholders.every((required) => found.includes(required));
}

/**
 * Get all placeholder definitions available for templates
 * Used by the admin UI to show available placeholders
 */
export function getAvailablePlaceholders(): Array<{
  key: string;
  label: string;
  description: string;
  example: string;
}> {
  return [
    {
      key: "familyName",
      label: "Family Name",
      description: "The family name of the guest",
      example: "Smith",
    },
    {
      key: "coupleNames",
      label: "Couple Names",
      description: "The names of the couple getting married",
      example: "John & Jane Smith",
    },
    {
      key: "weddingDate",
      label: "Wedding Date",
      description: "The date of the wedding",
      example: "Saturday, June 15, 2024",
    },
    {
      key: "weddingTime",
      label: "Wedding Time",
      description: "The time of the wedding ceremony",
      example: "4:00 PM",
    },
    {
      key: "location",
      label: "Location",
      description: "The venue and location of the wedding",
      example: "Grand Ballroom, Downtown Hotel, New York, NY",
    },
    {
      key: "magicLink",
      label: "Magic Link",
      description: "The RSVP link for the guest",
      example: "https://wedding.com/rsvp/abc123def456",
    },
    {
      key: "rsvpCutoffDate",
      label: "RSVP Cutoff Date",
      description: "The deadline to RSVP",
      example: "Friday, May 31, 2024",
    },
    {
      key: "referenceCode",
      label: "Reference Code",
      description: "Payment reference code (if applicable)",
      example: "REF-12345-67890",
    },
  ];
}
